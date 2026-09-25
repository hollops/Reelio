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

    return callback(new Error('Only video files and image thumbnails are supported'));
  },
});

module.exports = {
  uploadVideoFiles: upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
};
