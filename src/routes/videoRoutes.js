const express = require('express');
const videoController = require('../controllers/videoController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { uploadVideoFiles } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/', protect, uploadVideoFiles, videoController.uploadVideo);
router.get('/', videoController.browseVideos);
router.get('/mine', protect, videoController.getMyVideos);
router.patch('/:id', protect, videoController.updateVideo);
router.delete('/:id', protect, videoController.deleteVideo);
// Public, like GET / above: browsing and watching are open to everyone. optionalProtect
// reads the token WHEN there is one, so a signed-in viewer gets likedByMe answered while
// a visitor still sees the page.
router.get('/:id', optionalProtect, videoController.getVideoById);

// Comments: anyone may read them, only a signed-in person may add one.
router.get('/:id/comments', videoController.getComments);
router.post('/:id/comments', protect, videoController.addComment);

// Likes are per person, so both directions need a token.
router.post('/:id/like', protect, videoController.likeVideo);
router.delete('/:id/like', protect, videoController.unlikeVideo);

module.exports = router;
