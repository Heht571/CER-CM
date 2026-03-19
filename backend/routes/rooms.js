const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const taskController = require('../controllers/taskController');
const { isAdmin } = require('../middleware/authorize');

/**
 * @route GET /api/rooms
 * @desc 获取机房列表
 */
router.get('/', roomController.getList);

/**
 * @route POST /api/rooms
 * @desc 创建机房（管理员）
 */
router.post('/', isAdmin, roomController.create);

/**
 * @route GET /api/rooms/:id
 * @desc 获取机房详情
 */
router.get('/:id', roomController.getDetail);

/**
 * @route GET /api/rooms/:id/tasks
 * @desc 获取机房任务列表
 */
router.get('/:id/tasks', roomController.getTasks);

/**
 * @route GET /api/rooms/:id/progress
 * @desc 获取机房进度统计
 */
router.get('/:id/progress', roomController.getProgress);

/**
 * @route GET /api/rooms/:id/logs
 * @desc 获取机房所有任务的进度日志
 */
router.get('/:id/logs', taskController.getRoomLogs);

/**
 * @route PUT /api/rooms/:id
 * @desc 更新机房（管理员）
 */
router.put('/:id', isAdmin, roomController.update);

/**
 * @route DELETE /api/rooms/:id
 * @desc 删除机房（管理员）
 */
router.delete('/:id', isAdmin, roomController.remove);

/**
 * @route PUT /api/rooms/:id/assign
 * @desc 分配负责人（管理员）
 */
router.put('/:id/assign', isAdmin, roomController.assignManager);

/**
 * @route PUT /api/rooms/:id/status
 * @desc 更新机房状态（管理员）
 */
router.put('/:id/status', isAdmin, roomController.updateStatus);

module.exports = router;