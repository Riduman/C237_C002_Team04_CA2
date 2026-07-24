// TIA'S PART - Home page, Login, Signup, Settings, Logout
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const upload = require("../config/uploads");
const { RP_SCHOOLS, ORGANIZER_CODES } = require("../config/constants");
const { requireLogin } = require("../middleware/auth");
const { decorateEvent } = require("../utils/eventDisplay");

//-------------------------------------------------//
// Home page - shows the 3 soonest upcoming events
router.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const sql = `
    SELECT * FROM events
    WHERE eventDate >= CURDATE()
    ORDER BY eventDate ASC, eventTime ASC
    LIMIT 3
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.log(err);
      // Still show the home page even if this query fails -
      // just without any featured events.
      return res.render("home", { title: "Home", featuredEvents: [] });
    }

    res.render("home", {
      title: "Home",
      featuredEvents: results.map(decorateEvent)
    });
  });
});

//-------------------------------------------------//
// Welcome / landing page for logged-out visitors
router.get("/welcome", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  res.render("welcome", { title: "Welcome" });
});

//-------------------------------------------------//
// Login Routes
router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  // Determine the role based on the query parameter,
  // defaulting to "participant" if not specified
  const role = req.query.role === "organizer" ? "organizer" : "participant";

  res.render("auth/login", {
    title: "Login",
    role,
    error: null,
    values: {}
  });
});

router.post("/login", (req, res) => {
  const { email, password, role } = req.body;

  const sql = "SELECT * FROM users WHERE email = ? AND password = SHA1(?) AND role = ?";

  db.query(sql, [email, password, role], (err, results) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (results.length === 0) {
      return res.status(401).render("auth/login", {
        title: "Login",
        role,
        error: "Invalid Email or Password",
        values: { email }
      });
    }

    req.session.user = results[0];

    // Send organizers straight to their dashboard, participants to home
    if (results[0].role === "organizer") {
      res.redirect("/organizer/dashboard");
    } else {
      res.redirect("/");
    }
  });
});

//-------------------------------------------------//
// Signup Routes
router.get("/signup", (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }

  const role = req.query.role === "organizer" ? "organizer" : "participant";

  res.render("auth/signup", {
    title: "Sign Up",
    role,
    error: null,
    values: {}
  });
});

router.post("/signup", (req, res) => {
  const { fullName, email, password, school, role, organizerCode } = req.body;

  // Kept so the form can be re-shown with what the person already typed
  const values = { fullName, email, school };

  if (!fullName || !email || !password || !school) {
    return res.status(400).render("auth/signup", {
      title: "Sign Up",
      role,
      error: "Please complete every required field.",
      values
    });
  }

  // Step 1: make sure this email isn't already registered
  db.query("SELECT * FROM users WHERE email = ?", [email.trim()], (err, results) => {
    if (err) {
      console.log(err);
      return res.send("Database Error");
    }

    if (results.length > 0) {
      return res.status(400).render("auth/signup", {
        title: "Sign Up",
        role,
        error: "Email already exists.",
        values
      });
    }

    // Step 2: organizers must type the correct code for their school
    if (role === "organizer") {
      const validCode = ORGANIZER_CODES[school];

      if (!organizerCode || organizerCode.trim() !== validCode) {
        return res.status(403).render("auth/signup", {
          title: "Sign Up",
          role,
          error: "The organizer verification code is incorrect for the selected RP school.",
          values
        });
      }
    }

    // Step 3: everything checks out - create the account
    const sql = `
      INSERT INTO users
      (fullName, email, password, school, role, profilePicture, phone, bio)
      VALUES (?, ?, SHA1(?), ?, ?, ?, ?, ?)
    `;

    db.query(
      sql,
      [
        fullName.trim(),
        email.trim(),
        password,
        school,
        role,
        "default-avatar.svg",
        "",
        role === "organizer" ? "Verified RP school organizer" : "RP event participant"
      ],
      (err) => {
        if (err) {
          console.log(err);
          return res.send("Database Error");
        }
        res.redirect(`/login?role=${role}`);
      }
    );
  });
});

//-------------------------------------------------//
// Settings page
router.get("/settings", requireLogin, (req, res) => {
  res.render("settings/index", {
    title: "Settings",
    error: null,
    success: null
  });
});

router.post(
  "/settings/profile",
  requireLogin,
  (req, res, next) => {
    upload.single("profilePicture")(req, res, (error) => {
      if (error) {
        return res.status(400).render("settings/index", {
          title: "Settings",
          error: error.message,
          success: null
        });
      }
      next();
    });
  },
  (req, res) => {
    const { fullName, email, school, phone, bio } = req.body;

    req.session.user.fullName = fullName.trim();
    req.session.user.email = email.trim();
    req.session.user.school = school;
    req.session.user.phone = phone.trim();
    req.session.user.bio = bio.trim();

    if (req.file) {
      req.session.user.profilePicture = `/uploads/${req.file.filename}`;
    }

    res.render("settings/index", {
      title: "Settings",
      error: null,
      success: "Your profile has been updated successfully."
    });
  }
);

//-------------------------------------------------//
// Logout
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
