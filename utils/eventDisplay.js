// Small helper functions that turn raw database values into the nicer
// text the EJS pages show. Both the home page and the browse-events
// page need these, so they live here instead of being copy-pasted.

// Category -> Bootstrap icon shown on each event card
const CATEGORY_ICONS = {
  Workshop: "bi-tools",
  Sports: "bi-trophy",
  Charity: "bi-heart",
  Seminar: "bi-mic",
  "Club Activity": "bi-people",
  Celebration: "bi-stars"
};

function categoryIcon(category) {
  return CATEGORY_ICONS[category] || "bi-calendar-event";
}

// Turns a MySQL DATE value into something like "15 Aug 2026"
function formatDisplayDate(dateValue) {
  if (!dateValue) return "";
  const asDate = new Date(dateValue);
  return asDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Turns a MySQL TIME value ("14:30:00") into "2:30 PM"
function formatDisplayTime(timeValue) {
  if (!timeValue) return "";
  const [hoursText, minutesText] = timeValue.split(":");
  const hours = Number(hoursText);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutesText} ${period}`;
}

// Takes one raw row from the "events" table and adds the extra fields
// the views need (id, icon, displayDate, time) on top of it.
function decorateEvent(row) {
  return {
    ...row,
    id: row.eventId,
    icon: categoryIcon(row.category),
    displayDate: formatDisplayDate(row.eventDate),
    time: formatDisplayTime(row.eventTime)
  };
}

module.exports = { categoryIcon, formatDisplayDate, formatDisplayTime, decorateEvent };
