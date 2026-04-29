const express = require('express');
const router = express.Router();
const { login, getProfile, googleLogin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.post('/google', googleLogin);
router.get('/profile', protect, getProfile);

module.exports = router;
