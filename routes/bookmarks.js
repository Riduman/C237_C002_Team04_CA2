// UZAIR SHAH'S PART - Join an event, cancel registration, save/unsave
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const { requireLogin } = require("../middleware/auth");
const { decorateEvent } = require("../utils/eventDisplay");

//-------------------------------------------------//
// MY BOOKMARKS PAGE - lists every event this person has saved
router.get("/bookmarks", requireLogin, (req, res) => {
  const userId = req.session.user.userId;

  const sql = `
    SELECT events.*
    FROM event_bookmarks
    JOIN events ON events.eventId = event_bookmarks.event_id
    WHERE event_bookmarks.user_id = ?
    ORDER BY event_bookmarks.createdAt DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    res.render("bookmarks", {
      title: "My Bookmarks",
      events: results.map(decorateEvent)
    });
  });
});

//-------------------------------------------------//
// JOIN AN EVENT
// If there's a free spot, register as "confirmed". If the event is
// full, register as "waitlisted" instead of turning them away - this
// is Edrik's waitlist idea from his app.js (his in-memory
// "attendees"/"waitlist" arrays), now stored in the database instead.
router.post("/events/:id/join", requireLogin, (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.user.userId;

  db.query("SELECT * FROM events WHERE eventId = ?", [eventId], (err, results) => {
    if (err || results.length === 0) {
      req.session.message = { type: "danger", text: "Event not found." };
      return res.redirect("/events");
    }

    const event = results[0];

    // Xiu Hui's part: don't let a blocked participant join
    db.query(
      "SELECT * FROM blocked_users WHERE organizerId = ? AND userId = ?",
      [event.organizerId, userId],
      (err, blockedRows) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }

        if (blockedRows.length > 0) {
          req.session.message = {
            type: "danger",
            text: "You've been blocked from registering for this organizer's events."
          };
          return res.redirect("/events");
        }

        // Full events go to the waitlist instead of being rejected
        const status = event.vacancies > 0 ? "confirmed" : "waitlisted";

        const joinSql = "INSERT INTO event_registrations (user_id, event_id, status) VALUES (?, ?, ?)";
        db.query(joinSql, [userId, eventId, status], (err) => {
          if (err) {
            // Duplicate key error - event_registrations has a
            // UNIQUE(user_id, event_id) rule, so this means they
            // already joined before
            req.session.message = { type: "info", text: "You have already registered for this event." };
            return res.redirect("/events");
          }

          if (status === "waitlisted") {
            req.session.message = { type: "warning", text: "This event is full - you've been added to the waitlist." };
            return res.redirect("/events");
          }

          // Confirmed spot - use up one vacancy
          db.query(
            "UPDATE events SET vacancies = vacancies - 1 WHERE eventId = ?",
            [eventId],
            (err) => {
              if (err) console.log(err);
              req.session.message = { type: "success", text: "Successfully registered for the event!" };
              res.redirect("/events");
            }
          );
        });
      }
    );
  });
});

//-------------------------------------------------//
// CANCEL EVENT REGISTRATION
// If the person cancelling had a confirmed spot, that spot opens up -
// so the longest-waiting person on the waitlist gets bumped up to
// confirmed automatically. Same idea as Edrik's
// "attendees.push(waitlist.shift())" line in his app.js.
router.post("/events/:id/cancel", requireLogin, (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.user.userId;

  db.query(
    "SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?",
    [userId, eventId],
    (err, rows) => {
      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      if (rows.length === 0) {
        req.session.message = { type: "info", text: "You were not registered for this event." };
        return res.redirect("/events");
      }

      const myRegistration = rows[0];

      db.query(
        "DELETE FROM event_registrations WHERE registrationId = ?",
        [myRegistration.registrationId],
        (err) => {
          if (err) {
            console.log(err);
            return res.send("Database Error");
          }

          // If they were only waitlisted, no spot needs to be freed up
          if (myRegistration.status === "waitlisted") {
            req.session.message = { type: "success", text: "You've been removed from the waitlist." };
            return res.redirect("/events");
          }

          // They had a confirmed spot - free it up, then see if
          // anyone is waiting for it
          db.query(
            "UPDATE events SET vacancies = vacancies + 1 WHERE eventId = ?",
            [eventId],
            (err) => {
              if (err) console.log(err);

              db.query(
                `SELECT * FROM event_registrations
                 WHERE event_id = ? AND status = 'waitlisted'
                 ORDER BY registeredAt ASC LIMIT 1`,
                [eventId],
                (err, waitlistRows) => {
                  if (err) console.log(err);

                  if (waitlistRows && waitlistRows.length > 0) {
                    const nextInLine = waitlistRows[0];

                    db.query(
                      "UPDATE event_registrations SET status = 'confirmed' WHERE registrationId = ?",
                      [nextInLine.registrationId],
                      (err) => {
                        if (err) console.log(err);
                      }
                    );

                    // Someone from the waitlist just took this spot,
                    // so use it up again
                    db.query(
                      "UPDATE events SET vacancies = vacancies - 1 WHERE eventId = ?",
                      [eventId],
                      (err) => {
                        if (err) console.log(err);
                      }
                    );
                  }

                  req.session.message = { type: "success", text: "Your registration has been cancelled." };
                  res.redirect("/events");
                }
              );
            }
          );
        }
      );
    }
  );
});

//-------------------------------------------------//
// BOOKMARK / SAVE AN EVENT
router.post("/events/:id/bookmark", requireLogin, (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.user.userId;

  const sql = "INSERT INTO event_bookmarks (user_id, event_id) VALUES (?, ?)";
  db.query(sql, [userId, eventId], (err) => {
    if (err) {
      req.session.message = { type: "info", text: "Event is already in your bookmarks!" };
      return res.redirect("/events");
    }

    req.session.message = { type: "success", text: "Event bookmarked successfully!" };
    res.redirect("/events");
  });
});

//-------------------------------------------------//
// REMOVE BOOKMARK
router.post("/events/:id/unbookmark", requireLogin, (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.user.userId;

  const sql = "DELETE FROM event_bookmarks WHERE user_id = ? AND event_id = ?";
  db.query(sql, [userId, eventId], (err) => {
    if (err) console.log(err);
    req.session.message = { type: "info", text: "Bookmark removed." };
    res.redirect(req.get("referer") || "/events");
  });
});

module.exports = router;
