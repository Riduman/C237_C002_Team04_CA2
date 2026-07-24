// XIU HUI'S PART - Announcements & blocking participants
// Organizers can post announcements for their events, and block a
// participant (e.g. after an inappropriate review) so that person
// can't register for their future events. The block is enforced in
// routes/bookmarks.js's "join event" route.
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const { requireOrganizer } = require("../middleware/auth");

//-------------------------------------------------//
// Organizer's announcement page for one event:
// shows existing announcements + a form to add a new one
router.get("/organizer/events/:id/announcements", requireOrganizer, (req, res) => {
  const eventId = req.params.id;

  const eventSql = "SELECT * FROM events WHERE eventId = ? AND organizerId = ?";

  db.query(eventSql, [eventId, req.session.user.userId], (err, eventRows) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (eventRows.length === 0) {
      return res.send("Event not found.");
    }

    db.query(
      "SELECT * FROM announcements WHERE eventId = ? ORDER BY createdAt DESC",
      [eventId],
      (err, announcements) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }

        res.render("organizers/announcements", {
          title: `Announcements - ${eventRows[0].title}`,
          event: eventRows[0],
          announcements
        });
      }
    );
  });
});

//-------------------------------------------------//
// Post a new announcement for one of your events
router.post("/organizer/events/:id/announcements", requireOrganizer, (req, res) => {
  const eventId = req.params.id;
  const message = String(req.body.message || "").trim();

  // Make sure this event actually belongs to the organizer posting
  const eventSql = "SELECT * FROM events WHERE eventId = ? AND organizerId = ?";

  db.query(eventSql, [eventId, req.session.user.userId], (err, eventRows) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (eventRows.length === 0) {
      return res.send("Event not found.");
    }

    if (!message) {
      req.session.message = { type: "danger", text: "Announcement message can't be empty." };
      return res.redirect(`/organizer/events/${eventId}/announcements`);
    }

    db.query(
      "INSERT INTO announcements (eventId, message) VALUES (?, ?)",
      [eventId, message],
      (err) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }

        req.session.message = { type: "success", text: "Announcement posted!" };
        res.redirect(`/organizer/events/${eventId}/announcements`);
      }
    );
  });
});

//-------------------------------------------------//
// Delete an announcement
router.post("/organizer/announcements/:id/delete", requireOrganizer, (req, res) => {
  const announcementId = req.params.id;

  // Only let the organizer delete it if they own the event it belongs to
  const sql = `
    DELETE announcements FROM announcements
    JOIN events ON events.eventId = announcements.eventId
    WHERE announcements.announcementId = ? AND events.organizerId = ?
  `;

  db.query(sql, [announcementId, req.session.user.userId], (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    req.session.message = { type: "success", text: "Announcement deleted." };
    // Go back to whichever event's announcement page they were on
    res.redirect(req.get("referer") || "/organizer/dashboard");
  });
});

//-------------------------------------------------//
// Block a participant so they can't join any of your future events -
// e.g. after they left an inappropriate review.
// returnTo lets the button on the reviews page send the organizer
// back to that same page after blocking.
router.post("/organizer/participants/:userId/block", requireOrganizer, (req, res) => {
  const blockedUserId = req.params.userId;
  const reason = String(req.body.reason || "").trim();
  const returnTo = req.body.returnTo || "/organizer/dashboard";

  const sql = `
    INSERT INTO blocked_users (organizerId, userId, reason)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE reason = VALUES(reason)
  `;

  db.query(sql, [req.session.user.userId, blockedUserId, reason], (err) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    req.session.message = { type: "success", text: "That participant is now blocked from your future events." };
    res.redirect(returnTo);
  });
});

//-------------------------------------------------//
// See everyone you've blocked, with an unblock button for each
router.get("/organizer/blocked", requireOrganizer, (req, res) => {
  const sql = `
    SELECT blocked_users.*, users.fullName, users.email
    FROM blocked_users
    JOIN users ON users.userId = blocked_users.userId
    WHERE blocked_users.organizerId = ?
    ORDER BY blocked_users.createdAt DESC
  `;

  db.query(sql, [req.session.user.userId], (err, blockedParticipants) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    res.render("organizers/blocked", {
      title: "Blocked Participants",
      blockedParticipants
    });
  });
});

//-------------------------------------------------//
// Unblock a participant
router.post("/organizer/participants/:userId/unblock", requireOrganizer, (req, res) => {
  const blockedUserId = req.params.userId;

  const sql = "DELETE FROM blocked_users WHERE organizerId = ? AND userId = ?";

  db.query(sql, [req.session.user.userId, blockedUserId], (err) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    req.session.message = { type: "info", text: "Participant unblocked." };
    res.redirect("/organizer/blocked");
  });
});

module.exports = router;
