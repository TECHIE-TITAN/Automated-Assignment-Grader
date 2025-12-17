const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes (no authentication required)
router.post('/student/login', authController.studentLogin);
router.post('/teacher/login', authController.teacherLogin);
router.post('/teacher/register', authController.teacherRegister);

// Protected routes (authentication required)
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;
