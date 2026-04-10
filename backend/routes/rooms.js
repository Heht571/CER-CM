const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const taskController = require('../controllers/taskController');
const { isAdmin } = require('../middleware/authorize');

/**
 * @swagger
 * /rooms:
 *   get:
 *     summary: 获取机房列表
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 机房名称或编码
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, in_progress, completed, paused]
 *       - in: query
 *         name: construction_type
 *         schema:
 *           type: string
 *           enum: [purchase, lease, self_build, container, reuse]
 *       - in: query
 *         name: manager_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功获取机房列表
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
 *                     list:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MachineRoom'
 *                     pagination:
 *                       type: object
 */
router.get('/', roomController.getList);

/**
 * @swagger
 * /rooms:
 *   post:
 *     summary: 创建机房
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - planned_start_date
 *               - construction_type
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               location:
 *                 type: string
 *               construction_type:
 *                 type: string
 *                 enum: [purchase, lease, self_build, container, reuse]
 *               manager_id:
 *                 type: integer
 *               planned_start_date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: 参数错误
 */
router.post('/', isAdmin, roomController.create);

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: 获取机房详情
 *     tags: [Rooms]
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
 *         description: 成功获取机房详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/MachineRoom'
 *       404:
 *         description: 机房不存在
 */
router.get('/:id', roomController.getDetail);

/**
 * @swagger
 * /rooms/{id}/tasks:
 *   get:
 *     summary: 获取机房任务列表
 *     tags: [Rooms]
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
 *         description: 成功获取任务列表
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
 *                     nodes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RoomTask'
 *                     edges:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           source:
 *                             type: integer
 *                           target:
 *                             type: integer
 */
router.get('/:id/tasks', roomController.getTasks);

/**
 * @swagger
 * /rooms/{id}/progress:
 *   get:
 *     summary: 获取机房进度统计
 *     tags: [Rooms]
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
 *         description: 成功获取进度统计
 */
router.get('/:id/progress', roomController.getProgress);

/**
 * @swagger
 * /rooms/{id}/logs:
 *   get:
 *     summary: 获取机房任务进度日志
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 成功获取日志列表
 */
router.get('/:id/logs', taskController.getRoomLogs);

/**
 * @swagger
 * /rooms/{id}:
 *   put:
 *     summary: 更新机房信息
 *     tags: [Rooms]
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
 *               code:
 *                 type: string
 *               location:
 *                 type: string
 *               construction_type:
 *                 type: string
 *                 enum: [purchase, lease, self_build, container, reuse]
 *               manager_id:
 *                 type: integer
 *               planned_start_date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', isAdmin, roomController.update);

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     summary: 删除机房
 *     tags: [Rooms]
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
 *       404:
 *         description: 机房不存在
 */
router.delete('/:id', isAdmin, roomController.remove);

/**
 * @swagger
 * /rooms/{id}/assign:
 *   put:
 *     summary: 分配负责人
 *     tags: [Rooms]
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
 *               - manager_id
 *             properties:
 *               manager_id:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 分配成功
 */
router.put('/:id/assign', isAdmin, roomController.assignManager);

/**
 * @swagger
 * /rooms/{id}/status:
 *   put:
 *     summary: 更新机房状态
 *     tags: [Rooms]
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
 *                 enum: [planning, in_progress, completed, paused]
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id/status', isAdmin, roomController.updateStatus);

/**
 * @swagger
 * /rooms/template:
 *   get:
 *     summary: 下载机房导入模板
 *     tags: [Rooms]
 *     responses:
 *       200:
 *         description: 返回CSV模板文件
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */
router.get('/template', roomController.downloadTemplate);

/**
 * @swagger
 * /rooms/import:
 *   post:
 *     summary: 批量导入机房
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     机房名称:
 *                       type: string
 *                     机房编码:
 *                       type: string
 *                     位置:
 *                       type: string
 *                     建设方式:
 *                       type: string
 *                     负责人姓名:
 *                       type: string
 *                     计划开始日期:
 *                       type: string
 *                     描述:
 *                       type: string
 *     responses:
 *       200:
 *         description: 导入结果
 */
router.post('/import', isAdmin, roomController.batchImport);

module.exports = router;