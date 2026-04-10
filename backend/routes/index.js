const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/authorize');

const authRoutes = require('./auth');
const userRoutes = require('./users');
const roomRoutes = require('./rooms');
const taskRoutes = require('./tasks');
const phaseRoutes = require('./phases');
const statisticsRoutes = require('./statistics');
const emailRoutes = require('./emails');
const configRoutes = require('./config');
const roomController = require('../controllers/roomController');

// 公开路由
router.use('/auth', authRoutes);

// 机房导入模板下载（公开）
router.get('/rooms/template', roomController.downloadTemplate);

// 需要登录的路由
router.use('/users', auth, isAdmin, userRoutes);
router.use('/rooms', auth, roomRoutes);
router.use('/tasks', auth, taskRoutes);
router.use('/phases', auth, phaseRoutes);
router.use('/statistics', auth, statisticsRoutes);
router.use('/emails', auth, isAdmin, emailRoutes);
router.use('/config', auth, isAdmin, configRoutes);

module.exports = router;