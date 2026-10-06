const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    if (file.fieldname === 'video' && file.mimetype.startsWith('video/')) {
      return callback(null, true);
    }

    if (file.fieldname === 'thumbnail' && file.mimetype.startsWith('image/')) {
      return callback(null, true);
    }

    if (file.fieldname === 'avatar' && file.mimetype.startsWith('image/')) {
      return callback(null, true);
    }

    return callback(new Error('Only video files and image thumbnails are supported'));
  },
});

// Avatars get their own, much smaller limit. The 500MB above is sized for video; letting
// a profile photo use it would allow a half-gigabyte upload to a field that needs 2MB.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    // The same three types the client accepts, so neither side surprises the other.
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return callback(null, true);
    }
    return callback(new Error('Avatar must be a JPG, PNG or WebP image'));
  },
});

module.exports = {
  uploadVideoFiles: upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  uploadAvatar: avatarUpload.single('avatar'),
};
