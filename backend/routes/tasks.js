const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { isAdmin } = require('../middleware/authorize');

/**
 * @route GET /api/tasks
 * @desc 获取任务列表
 */
router.get('/', taskController.getList);

/**
 * @route GET /api/tasks/templates
 * @desc 获取任务模板列表（管理员）
 */
router.get('/templates', isAdmin, taskController.getTemplates);

/**
 * @route POST /api/tasks/templates
 * @desc 创建任务模板（管理员）
 */
router.post('/templates', isAdmin, taskController.createTemplate);

/**
 * @route PUT /api/tasks/templates/:id
 * @desc 更新任务模板（管理员）
 */
router.put('/templates/:id', isAdmin, taskController.updateTemplate);

/**
 * @route DELETE /api/tasks/templates/:id
 * @desc 删除任务模板（管理员）
 */
router.delete('/templates/:id', isAdmin, taskController.deleteTemplate);

/**
 * @route GET /api/tasks/:id
 * @desc 获取任务详情
 */
router.get('/:id', taskController.getDetail);

/**
 * @route PUT /api/tasks/:id/status
 * @desc 更新任务状态
 */
router.put('/:id/status', taskController.updateStatus);

/**
 * @route PUT /api/tasks/:id/progress
 * @desc 更新任务进度
 */
router.put('/:id/progress', taskController.updateProgress);

/**
 * @route GET /api/tasks/:id/logs
 * @desc 获取任务进度日志
 */
router.get('/:id/logs', taskController.getTaskLogs);

module.exports = router;