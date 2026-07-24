// EDRIK'S PART - Waitlist, attendance check-in, and analytics
//
// This file covers the
// rest of what he was assigned: viewing the waitlist, checking
// participants in, and the analytics page.
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const { requireOrganizer } = require("../middleware/auth");

//-------------------------------------------------//
// View the confirmed list + waitlist for one event, with a checkbox
// to mark each confirmed participant as attended
router.get("/organizer/events/:id/waitlist", requireOrganizer, (req, res) => {
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

    const peopleSql = `
      SELECT event_registrations.*, users.fullName, users.email
      FROM event_registrations
      JOIN users ON users.userId = event_registrations.user_id
      WHERE event_registrations.event_id = ?
      ORDER BY event_registrations.registeredAt ASC
    `;

    db.query(peopleSql, [eventId], (err, people) => {
      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      // Split the one list into two, based on status
      const confirmed = people.filter((p) => p.status === "confirmed");
      const waitlisted = people.filter((p) => p.status === "waitlisted");

      res.render("organizers/waitlist", {
        title: `Waitlist - ${eventRows[0].title}`,
        event: eventRows[0],
        confirmed,
        waitlisted
      });
    });
  });
});

//-------------------------------------------------//
// Mark / unmark a confirmed participant as attended
router.post("/organizer/registrations/:id/checkin", requireOrganizer, (req, res) => {
  const registrationId = req.params.id;

  // Make sure this registration belongs to an event THIS organizer owns
  const sql = `
    SELECT event_registrations.*, events.organizerId
    FROM event_registrations
    JOIN events ON events.eventId = event_registrations.event_id
    WHERE event_registrations.registrationId = ?
  `;

  db.query(sql, [registrationId], (err, rows) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (rows.length === 0 || rows[0].organizerId !== req.session.user.userId) {
      return res.send("Not found.");
    }

    const eventId = rows[0].event_id;

    db.query(
      "UPDATE event_registrations SET attended = NOT attended WHERE registrationId = ?",
      [registrationId],
      (err) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }
        res.redirect(`/organizer/events/${eventId}/waitlist`);
      }
    );
  });
});

//-------------------------------------------------//
// Analytics: participant numbers, attendance rate, popular
// categories, and monthly event stats - across all of this
// organizer's events
router.get("/organizer/analytics", requireOrganizer, (req, res) => {
  const organizerId = req.session.user.userId;

  // 1. Basic totals: how many events, how many confirmed
  //    registrations, and how many of those actually attended
  const totalsSql = `
    SELECT
      COUNT(DISTINCT events.eventId) AS totalEvents,
      SUM(event_registrations.status = 'confirmed') AS totalConfirmed,
      SUM(event_registrations.attended = 1) AS totalAttended
    FROM events
    LEFT JOIN event_registrations ON event_registrations.event_id = events.eventId
    WHERE events.organizerId = ?
  `;

  db.query(totalsSql, [organizerId], (err, totalsRows) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    const totals = totalsRows[0];
    const totalConfirmed = totals.totalConfirmed || 0;
    const totalAttended = totals.totalAttended || 0;
    const attendanceRate = totalConfirmed > 0
      ? Math.round((totalAttended / totalConfirmed) * 100)
      : 0;

    // 2. Most popular categories - how many confirmed sign-ups each
    //    category got, across all of this organizer's events
    const categorySql = `
      SELECT events.category, COUNT(event_registrations.registrationId) AS signUps
      FROM events
      LEFT JOIN event_registrations
        ON event_registrations.event_id = events.eventId
        AND event_registrations.status = 'confirmed'
      WHERE events.organizerId = ?
      GROUP BY events.category
      ORDER BY signUps DESC
    `;

    db.query(categorySql, [organizerId], (err, categoryStats) => {
      if (err) {
        console.log(err);
        return res.send("Database Error");
      }

      // 3. How many events were held each month
      const monthlySql = `
        SELECT DATE_FORMAT(eventDate, '%Y-%m') AS month, COUNT(*) AS eventCount
        FROM events
        WHERE organizerId = ?
        GROUP BY month
        ORDER BY month ASC
      `;

      db.query(monthlySql, [organizerId], (err, monthlyStats) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }

        res.render("organizers/analytics", {
          title: "Analytics",
          totalEvents: totals.totalEvents || 0,
          totalConfirmed,
          attendanceRate,
          categoryStats,
          monthlyStats
        });
      });
    });
  });
});

module.exports = router;
