const express = require('express');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/uploadMiddleware');

const router = express.Router();

// "me" rather than an :id: you may only edit your own profile, and a route with no id
// cannot be pointed at somebody else's. The id comes from the token, never the URL.
router.put('/me', protect, uploadAvatar, userController.updateMe);

module.exports = router;
