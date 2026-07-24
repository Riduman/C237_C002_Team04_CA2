// RIDUMAN'S PART - Ratings & reviews
// Participants can leave a star rating + comment once the organizer
// has checked them in as attended (Edrik's check-in feature).
// Organizers can see all reviews left for their events.
//
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const { requireLogin, requireOrganizer } = require("../middleware/auth");
const { decorateEvent } = require("../utils/eventDisplay");

//-------------------------------------------------//
// Event details page: info + review list + review form
router.get("/events/:id", requireLogin, (req, res) => {
  const eventId = req.params.id;

  db.query("SELECT * FROM events WHERE eventId = ?", [eventId], (err, eventRows) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (eventRows.length === 0) {
      return res.status(404).render("404", { title: "Page Not Found" });
    }

    const event = decorateEvent(eventRows[0]);

    // Xiu Hui's part: announcements the organizer posted for this event
    const announcementSql = "SELECT * FROM announcements WHERE eventId = ? ORDER BY createdAt DESC";

    db.query(announcementSql, [eventId], (err, announcements) => {
      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      // Everyone can see the reviews other people left
      const reviewSql = `
        SELECT reviews.*, users.fullName, users.profilePicture
        FROM reviews
        JOIN users ON users.userId = reviews.userId
        WHERE reviews.eventId = ?
        ORDER BY reviews.createdAt DESC
      `;

      db.query(reviewSql, [eventId], (err, reviews) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }

        // Work out whether THIS participant is allowed to leave a review:
        // the organizer must have checked them in as "attended" at the
        // event (Edrik's check-in feature), and they must not have
        // already reviewed it.
        const userId = req.session.user.userId;

        if (req.session.user.role !== "participant") {
          return res.render("events/show", {
            title: event.title,
            event,
            reviews,
            announcements,
            canReview: false,
            alreadyReviewed: false
          });
        }

        db.query(
          "SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?",
          [userId, eventId],
          (err, registrationRows) => {
            if (err) {
              console.log(err);
              return res.send("Database Error");
            }

            const wasCheckedIn = registrationRows.length > 0 && registrationRows[0].attended === 1;

            db.query(
              "SELECT * FROM reviews WHERE userId = ? AND eventId = ?",
              [userId, eventId],
              (err, myReviewRows) => {
                if (err) {
                  console.log(err);
                  return res.send("Database Error");
                }

                res.render("events/show", {
                  title: event.title,
                  event,
                  reviews,
                  announcements,
                  canReview: wasCheckedIn && myReviewRows.length === 0,
                  alreadyReviewed: myReviewRows.length > 0
                });
              }
            );
          }
        );
      });
    });
  });
});

//-------------------------------------------------//
// Submit a rating + review
router.post("/events/:id/review", requireLogin, (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.user.userId;
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();

  if (!rating || rating < 1 || rating > 5) {
    req.session.message = { type: "danger", text: "Please choose a rating between 1 and 5 stars." };
    return res.redirect(`/events/${eventId}`);
  }

  const sql = "INSERT INTO reviews (eventId, userId, rating, comment) VALUES (?, ?, ?, ?)";

  db.query(sql, [eventId, userId, rating, comment], (err) => {
    if (err) {
      console.log(err);
      req.session.message = { type: "danger", text: "You've already reviewed this event." };
      return res.redirect(`/events/${eventId}`);
    }

    req.session.message = { type: "success", text: "Thanks for your feedback!" };
    res.redirect(`/events/${eventId}`);
  });
});

//-------------------------------------------------//
// Organizer view: all ratings/reviews left for one of their events
router.get("/organizer/events/:id/reviews", requireOrganizer, (req, res) => {
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

    const reviewSql = `
      SELECT reviews.*, users.fullName, users.email
      FROM reviews
      JOIN users ON users.userId = reviews.userId
      WHERE reviews.eventId = ?
      ORDER BY reviews.createdAt DESC
    `;

    db.query(reviewSql, [eventId], (err, reviews) => {
      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      const averageRating = reviews.length
        ? (reviews.reduce((total, r) => total + r.rating, 0) / reviews.length).toFixed(1)
        : null;

      res.render("organizers/reviews", {
        title: `Reviews - ${eventRows[0].title}`,
        event: eventRows[0],
        reviews,
        averageRating
      });
    });
  });
});

module.exports = router;
