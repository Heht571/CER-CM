const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route GET /api/auth/profile
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/profile', authController.getProfile);

/**
 * @route PUT /api/auth/password
 * @desc 修改密码
 * @access Private
 */
router.put('/password', authController.changePassword);

module.exports = router;