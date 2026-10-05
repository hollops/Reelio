const express = require('express');
const adminController = require('../controllers/adminController');
const videoController = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect, authorize('admin'));
router.get('/users', adminController.getAllUsers);
router.get('/videos', videoController.getAllVideos);
router.patch('/videos/:id', videoController.updateVideo);
router.delete('/videos/:id', videoController.deleteVideo);

module.exports = router;
