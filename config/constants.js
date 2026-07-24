// Fixed lists that don't change while the app is running. Kept in one
// place so every route file uses the exact same list of schools/codes.

const RP_SCHOOLS = [
  { code: "SOI", name: "School of Infocomm" },
  { code: "SAS", name: "School of Applied Science" },
  { code: "SEG", name: "School of Engineering" },
  { code: "STA", name: "School of Technology for the Arts" },
  { code: "SBZ", name: "School of Business" },
  { code: "SOH", name: "School of Hospitality" },
  { code: "SSH", name: "School of Sports, Health and Leisure" }
];

// Demo-only organizer signup codes, one per school.
const ORGANIZER_CODES = {
  SOI: "VYBE-SOI-2026",
  SAS: "VYBE-SAS-2026",
  SEG: "VYBE-SEG-2026",
  STA: "VYBE-STA-2026",
  SBZ: "VYBE-SBZ-2026",
  SOH: "VYBE-SOH-2026",
  SSH: "VYBE-SSH-2026"
};

module.exports = { RP_SCHOOLS, ORGANIZER_CODES };
