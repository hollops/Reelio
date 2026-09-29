const express = require('express');
const router = express.Router();

const historyController = require('../controllers/historyController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, historyController.saveProgress);
router.get('/', protect, historyController.getUserHistory);
router.get('/:videoId', protect, historyController.getVideoHistory);
router.delete('/:videoId', protect, historyController.deleteVideoHistory);

module.exports = router;