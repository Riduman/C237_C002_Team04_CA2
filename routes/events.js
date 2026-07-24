// BROWSE EVENTS - shared by everyone. Reads from the real "events"
// table so it shows whatever Sumaiya's create-event page inserts.
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const { requireLogin } = require("../middleware/auth");
const { decorateEvent } = require("../utils/eventDisplay");

router.get("/events", requireLogin, (req, res) => {
  // Step 1: read the search box / dropdown filters from the URL
  const search = String(req.query.search || "").trim().toLowerCase();
  const school = String(req.query.school || "");
  const category = String(req.query.category || "");
  const sort = String(req.query.sort || "date-asc");

  // Step 2: build a WHERE clause piece by piece. We only add a
  // condition if that filter was actually used.
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(venue) LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (school) {
    conditions.push("school = ?");
    params.push(school);
  }
  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // Step 3: pick how to sort. Only these 4 exact options are allowed -
  // never build an ORDER BY straight from user input.
  const sortOptions = {
    "date-asc": "eventDate ASC, eventTime ASC",
    "date-desc": "eventDate DESC, eventTime DESC",
    "title-asc": "title ASC",
    "vacancies-desc": "vacancies DESC"
  };
  const orderBy = sortOptions[sort] || sortOptions["date-asc"];

  const sql = `SELECT * FROM events ${whereClause} ORDER BY ${orderBy}`;

  db.query(sql, params, (err, results) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    // Get the list of categories that actually have events, for the
    // "Category" filter dropdown
    db.query(
      "SELECT DISTINCT category FROM events WHERE category IS NOT NULL",
      (err, categoryRows) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }

        res.render("events/index", {
          title: "Browse Events",
          events: results.map(decorateEvent),
          categories: categoryRows.map((row) => row.category),
          filters: {
            search: req.query.search || "",
            school,
            category,
            sort
          }
        });
      }
    );
  });
});

module.exports = router;
