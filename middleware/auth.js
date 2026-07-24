// Small "gatekeeper" functions. Put one of these in front of a route
// and it runs before the route's own code. If it calls next(), the
// route continues as normal. If it doesn't, the route never runs.
const { RP_SCHOOLS } = require("../config/constants");

// Blocks anyone who isn't logged in at all
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

// Blocks anyone who IS logged in but isn't an organizer
// (use this INSTEAD of requireLogin, not after it - it already checks login)
function requireOrganizer(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.role !== "organizer") {
    return res.redirect("/");
  }
  next();
}

// Turns a school code like "SOI" into its full name for display
function schoolName(code) {
  return RP_SCHOOLS.find((school) => school.code === code)?.name || code;
}

// Runs on EVERY request. Makes "user", "schools" etc. available in
// every EJS view automatically, without each route having to pass
// them in manually.
function attachLocals(req, res, next) {
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.schools = RP_SCHOOLS;
  res.locals.schoolName = schoolName;
  res.locals.message = req.session.message || null;
  delete req.session.message;
  next();
}

module.exports = { requireLogin, requireOrganizer, schoolName, attachLocals };
