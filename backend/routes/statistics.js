const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { isAdmin } = require('../middleware/authorize');

/**
 * @route GET /api/statistics/overview
 * @desc 总体概览统计
 */
router.get('/overview', isAdmin, statisticsController.getOverview);

/**
 * @route GET /api/statistics/phase
 * @desc 按阶段统计
 */
router.get('/phase', isAdmin, statisticsController.getByPhase);

/**
 * @route GET /api/statistics/delayed
 * @desc 延期预警
 */
router.get('/delayed', isAdmin, statisticsController.getDelayed);

/**
 * @route GET /api/statistics/ranking
 * @desc 机房进度排行
 */
router.get('/ranking', isAdmin, statisticsController.getRoomRanking);

module.exports = router;