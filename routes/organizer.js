// SUMAIYA'S PART - Organizer dashboard, create/edit/delete events,
// view participants for an event
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const upload = require("../config/uploads");
const { requireOrganizer } = require("../middleware/auth");
const { decorateEvent } = require("../utils/eventDisplay");

//-------------------------------------------------//
// Organizer Dashboard - lists only the events THIS organizer created
router.get("/organizer/dashboard", requireOrganizer, (req, res) => {
  const sql = "SELECT * FROM events WHERE organizerId = ?";

  db.query(sql, [req.session.user.userId], (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    res.render("organizers/dashboard", {
      title: "Organizer Dashboard",
      events: result.map(decorateEvent)
    });
  });
});

//-------------------------------------------------//
// Create Event
router.get("/organizer/createEvent", requireOrganizer, (req, res) => {
  res.render("organizers/createEvent", {
    title: "Create Event"
  });
});

router.post(
  "/organizer/createEvent",
  requireOrganizer,
  // Runs multer first to grab the uploaded poster file (if any)
  // before the route below reads req.body / req.file
  (req, res, next) => {
    upload.single("posterImage")(req, res, (error) => {
      if (error) {
        return res.status(400).send(error.message);
      }
      next();
    });
  },
  (req, res) => {
    const { title, description, venue, school, category, eventDate, eventTime, capacity } = req.body;
    const posterImage = req.file ? `/uploads/${req.file.filename}` : null;

    const sql = `
      INSERT INTO events
      (organizerId, title, description, venue, school, category, eventDate, eventTime, capacity, vacancies, posterImage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        req.session.user.userId,
        title,
        description,
        venue,
        school,
        category,
        eventDate,
        eventTime,
        capacity,
        capacity, // vacancies starts out equal to capacity - nobody has joined yet
        posterImage
      ],
      (err) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }
        res.redirect("/organizer/dashboard");
      }
    );
  }
);

//-------------------------------------------------//
// Edit Event
router.get("/organizer/edit/:id", requireOrganizer, (req, res) => {
  const sql = "SELECT * FROM events WHERE eventId = ? AND organizerId = ?";

  db.query(sql, [req.params.id, req.session.user.userId], (err, result) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (result.length === 0) {
      return res.send("Event not found.");
    }

    res.render("organizers/editEvent", {
      title: "Edit Event",
      event: result[0]
    });
  });
});

router.post(
  "/organizer/edit/:id",
  requireOrganizer,
  (req, res, next) => {
    upload.single("posterImage")(req, res, (error) => {
      if (error) {
        return res.status(400).send(error.message);
      }
      next();
    });
  },
  (req, res) => {
    const { title, description, venue, school, category, eventDate, eventTime, capacity } = req.body;

    // First find the event's current poster, so if the organizer
    // didn't upload a new one we keep the old one instead of blanking it
    const findSql = "SELECT posterImage FROM events WHERE eventId = ? AND organizerId = ?";

    db.query(findSql, [req.params.id, req.session.user.userId], (err, rows) => {
      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      if (rows.length === 0) {
        return res.send("Event not found.");
      }

      const posterImage = req.file ? `/uploads/${req.file.filename}` : rows[0].posterImage;

      const sql = `
        UPDATE events
        SET title = ?, description = ?, venue = ?, school = ?, category = ?,
            eventDate = ?, eventTime = ?, capacity = ?, posterImage = ?
        WHERE eventId = ? AND organizerId = ?
      `;

      db.query(
        sql,
        [
          title,
          description,
          venue,
          school,
          category,
          eventDate,
          eventTime,
          capacity,
          posterImage,
          req.params.id,
          req.session.user.userId
        ],
        (err) => {
          if (err) {
            console.log(err);
            return res.send("Database Error");
          }
          res.redirect("/organizer/dashboard");
        }
      );
    });
  }
);

//-------------------------------------------------//
// Delete Event
// Deleting an event that still has registrations, bookmarks, reviews
// or announcements pointing at it fails with a foreign-key error -
// those rows have to be cleared out first, THEN the event itself.
router.get("/organizer/delete/:id", requireOrganizer, (req, res) => {
  const eventId = req.params.id;
  const organizerId = req.session.user.userId;

  // First make sure this organizer actually owns the event
  const checkSql = "SELECT * FROM events WHERE eventId = ? AND organizerId = ?";

  db.query(checkSql, [eventId, organizerId], (err, rows) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (rows.length === 0) {
      return res.send("Event not found.");
    }

    // Delete everything that points at this event, one table at a time
    db.query("DELETE FROM event_registrations WHERE event_id = ?", [eventId], (err) => {
      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      db.query("DELETE FROM event_bookmarks WHERE event_id = ?", [eventId], (err) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }

        db.query("DELETE FROM reviews WHERE eventId = ?", [eventId], (err) => {
          if (err) {
            console.log(err);
            return res.send("Database Error");
          }

          db.query("DELETE FROM announcements WHERE eventId = ?", [eventId], (err) => {
            if (err) {
              console.log(err);
              return res.send("Database Error");
            }

            // Now it's safe to delete the event itself
            db.query(
              "DELETE FROM events WHERE eventId = ? AND organizerId = ?",
              [eventId, organizerId],
              (err) => {
                if (err) {
                  console.log(err);
                  return res.send("Database Error");
                }
                res.redirect("/organizer/dashboard");
              }
            );
          });
        });
      });
    });
  });
});

//-------------------------------------------------//
// View Participants for one event
router.get("/organizer/participants/:id", requireOrganizer, (req, res) => {
  const eventSql = "SELECT * FROM events WHERE eventId = ? AND organizerId = ?";

  db.query(eventSql, [req.params.id, req.session.user.userId], (err, eventResult) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (eventResult.length === 0) {
      return res.send("Event not found.");
    }

    const participantSql = `
      SELECT users.fullName, users.email, users.school
      FROM event_registrations
      JOIN users ON event_registrations.user_id = users.userId
      WHERE event_registrations.event_id = ?
    `;

    db.query(participantSql, [req.params.id], (err, participantResult) => {
      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      res.render("organizers/participants", {
        title: "Participants",
        event: eventResult[0],
        participants: participantResult
      });
    });
  });
});

module.exports = router;
