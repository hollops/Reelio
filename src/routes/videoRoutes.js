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
// Public, like GET / above: browsing and watching are open to everyone. Only the
// routes that change something, or that read one person's own data, need a token.
router.get('/:id', videoController.getVideoById);

module.exports = router;
