const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/profile', AuthController.authMiddleware, AuthController.getProfile);
router.post('/change-password', AuthController.authMiddleware, AuthController.changePassword);

module.exports = router;
