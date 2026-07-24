// Main entry point. This file doesn't have any routes in it - it just
// sets up Express and loads each teammate's routes from routes/.
//
// Who wrote what:
//   routes/auth.js          - Tia          (home, login, signup, settings, logout)
//   routes/events.js        - shared        (browse events page)
//   routes/bookmarks.js     - Uzair Shah    (join / cancel / bookmark / unbookmark, waitlist)
//   routes/organizer.js     - Sumaiya       (create/edit/delete events, participants)
//   routes/reviews.js       - Riduman       (event details page, ratings & reviews)
//   routes/announcements.js - Xiu Hui       (announcements, blocking participants)
//   routes/attendance.js    - Edrik         (waitlist view, check-in, analytics)

const express = require("express");
const path = require("path");
const session = require("express-session");

const { attachLocals } = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: true,
  // Session expires after 1 week of inactivity
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// Makes res.locals.user / schools / message etc. available in every view
app.use(attachLocals);

// ---- Mount every teammate's routes ----
app.use(require("./routes/auth"));
app.use(require("./routes/events"));
app.use(require("./routes/bookmarks"));
app.use(require("./routes/organizer"));
app.use(require("./routes/reviews"));
app.use(require("./routes/announcements"));
app.use(require("./routes/attendance"));

// Catch-all for any URL that didn't match a route above
app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

app.listen(PORT, () => {
  console.log(`Vybe is running at http://localhost:${PORT}`);
});
