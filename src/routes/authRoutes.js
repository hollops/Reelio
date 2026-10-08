const express = require('express');
const router = express.Router();

const userController = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware');

router.post('/createuser', userController.createUser);
router.post('/loginuser', userController.loginUser);
router.get('/me', protect, userController.getMe);
router.post('/forgot-password', userController.requestPasswordReset);
router.post('/reset-password', userController.resetPassword);

module.exports = router