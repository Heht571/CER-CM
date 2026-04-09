const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const { isAdmin } = require('../middleware/authorize');

/**
 * @swagger
 * /statistics/overview:
 *   get:
 *     summary: 总体概览统计
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取总体统计
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rooms:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         planning:
 *                           type: integer
 *                         in_progress:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         paused:
 *                           type: integer
 *                     tasks:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         inProgress:
 *                           type: integer
 *                         notStarted:
 *                           type: integer
 *                         delayed:
 *                           type: integer
 *                     managers:
 *                       type: integer
 *                     overallProgress:
 *                       type: integer
 *                     constructionTypes:
 *                       type: object
 *                       properties:
 *                         purchase:
 *                           type: integer
 *                         lease:
 *                           type: integer
 *                         self_build:
 *                           type: integer
 *                         container:
 *                           type: integer
 *                         reuse:
 *                           type: integer
 */
router.get('/overview', isAdmin, statisticsController.getOverview);

/**
 * @swagger
 * /statistics/phase:
 *   get:
 *     summary: 按阶段统计
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取阶段统计
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       phaseNumber:
 *                         type: integer
 *                       total:
 *                         type: integer
 *                       completed:
 *                         type: integer
 *                       inProgress:
 *                         type: integer
 *                       percentage:
 *                         type: integer
 */
router.get('/phase', isAdmin, statisticsController.getByPhase);

/**
 * @swagger
 * /statistics/delayed:
 *   get:
 *     summary: 延期预警
 *     description: 获取所有已延期但未完成的任务
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取延期任务列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       delayDays:
 *                         type: integer
 *                       room:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           manager:
 *                             type: object
 *                             properties:
 *                               real_name:
 *                                 type: string
 *                               phone:
 *                                 type: string
 */
router.get('/delayed', isAdmin, statisticsController.getDelayed);

/**
 * @swagger
 * /statistics/ranking:
 *   get:
 *     summary: 机房进度排行
 *     tags: [Statistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取机房排行
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       manager:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           real_name:
 *                             type: string
 *                       total:
 *                         type: integer
 *                       completed:
 *                         type: integer
 *                       progress:
 *                         type: integer
 */
router.get('/ranking', isAdmin, statisticsController.getRoomRanking);

module.exports = router;