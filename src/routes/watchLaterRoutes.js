const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const watchLaterController = require('../controllers/watchLaterController');

const router = express.Router();

router.use(protect);
router.post('/', watchLaterController.saveVideo);
router.get('/', watchLaterController.getSavedVideos);
router.delete('/:videoId', watchLaterController.removeSavedVideo);

module.exports = router;