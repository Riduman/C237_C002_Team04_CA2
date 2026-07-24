// Shared file-upload settings (used for profile pictures in Tia's
// settings page). If someone later adds event posters, they can
// require() this same "upload" object instead of writing a new one.
const multer = require("multer");
const path = require("path");

const uploadStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, path.join(__dirname, "..", "public", "uploads"));
  },
  filename: (req, file, callback) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "-");
    callback(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.mimetype)) {
      return callback(new Error("Only JPG, PNG and WEBP images are accepted."));
    }
    callback(null, true);
  }
});

module.exports = upload;
