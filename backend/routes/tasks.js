const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { isAdmin } = require('../middleware/authorize');

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: 获取任务列表
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *       - in: query
 *         name: room_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: phase_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [not_started, in_progress, completed]
 *     responses:
 *       200:
 *         description: 成功获取任务列表
 */
router.get('/', taskController.getList);

/**
 * @swagger
 * /tasks/my-rooms:
 *   get:
 *     summary: 获取我的机房任务
 *     description: 按机房分组，只显示当前待处理任务（所有前置任务已完成的任务）
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取我的机房任务
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
 *                       room:
 *                         $ref: '#/components/schemas/MachineRoom'
 *                       currentTasks:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/RoomTask'
 *                       totalTasks:
 *                         type: integer
 *                       completedTasks:
 *                         type: integer
 *                       inProgressTasks:
 *                         type: integer
 *                       delayedTasks:
 *                         type: integer
 *                       overallProgress:
 *                         type: integer
 */
router.get('/my-rooms', taskController.getMyRoomTasks);

/**
 * @swagger
 * /tasks/templates:
 *   get:
 *     summary: 获取任务模板列表
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: phase_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功获取任务模板列表
 */
router.get('/templates', isAdmin, taskController.getTemplates);

/**
 * @swagger
 * /tasks/templates:
 *   post:
 *     summary: 创建任务模板
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phase_id
 *               - name
 *             properties:
 *               phase_id:
 *                 type: integer
 *               name:
 *                 type: string
 *               planned_days:
 *                 type: integer
 *               description:
 *                 type: string
 *               sort_order:
 *                 type: integer
 *               graph_level:
 *                 type: integer
 *               graph_row:
 *                 type: integer
 *               applicable_types:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/templates', isAdmin, taskController.createTemplate);

/**
 * @swagger
 * /tasks/templates/{id}:
 *   put:
 *     summary: 更新任务模板
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               planned_days:
 *                 type: integer
 *               description:
 *                 type: string
 *               sort_order:
 *                 type: integer
 *               graph_level:
 *                 type: integer
 *               graph_row:
 *                 type: integer
 *               applicable_types:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/templates/:id', isAdmin, taskController.updateTemplate);

/**
 * @swagger
 * /tasks/templates/{id}:
 *   delete:
 *     summary: 删除任务模板
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/templates/:id', isAdmin, taskController.deleteTemplate);

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: 获取任务详情
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功获取任务详情
 */
router.get('/:id', taskController.getDetail);
router.put('/:id', taskController.updateTask);

/**
 * @swagger
 * /tasks/{id}/status:
 *   put:
 *     summary: 更新任务状态
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [not_started, in_progress, completed]
 *               remark:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id/status', taskController.updateStatus);

/**
 * @swagger
 * /tasks/{id}/progress:
 *   put:
 *     summary: 更新任务进度
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - progress
 *             properties:
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *               remark:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id/progress', taskController.updateProgress);

/**
 * @swagger
 * /tasks/{id}/logs:
 *   get:
 *     summary: 获取任务进度日志
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功获取进度日志
 */
router.get('/:id/logs', taskController.getTaskLogs);

module.exports = router;