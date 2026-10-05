const express = require('express');
const videoController = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');
const { uploadVideoFiles } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, uploadVideoFiles, videoController.uploadVideo);
router.get('/', videoController.browseVideos);
router.get('/mine', protect, videoController.getMyVideos);
router.patch('/:id', protect, videoController.updateVideo);
router.delete('/:id', protect, videoController.deleteVideo);
router.get('/:id', protect, videoController.getVideoById);

module.exports = router;
