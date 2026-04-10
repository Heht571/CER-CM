const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

/**
 * @swagger
 * /emails:
 *   get:
 *     summary: 获取邮件任务列表
 *     tags: [Emails]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, scheduled, sending, sent, failed]
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功获取邮件任务列表
 */
router.get('/', emailController.getList);

/**
 * @swagger
 * /emails/recipients:
 *   get:
 *     summary: 获取可选接收人列表
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取接收人列表
 */
router.get('/recipients', emailController.getRecipients);

/**
 * @swagger
 * /emails/status:
 *   get:
 *     summary: 获取邮件服务状态
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取服务状态
 */
router.get('/status', emailController.getServiceStatus);

/**
 * @swagger
 * /emails/{id}:
 *   get:
 *     summary: 获取邮件任务详情
 *     tags: [Emails]
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
router.get('/:id', emailController.getDetail);

/**
 * @swagger
 * /emails/{id}/logs:
 *   get:
 *     summary: 获取邮件发送日志
 *     tags: [Emails]
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
 *         description: 成功获取发送日志
 */
router.get('/:id/logs', emailController.getLogs);

/**
 * @swagger
 * /emails:
 *   post:
 *     summary: 创建邮件任务
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - content
 *               - recipients
 *               - scheduled_time
 *             properties:
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *               scheduled_time:
 *                 type: string
 *                 format: date-time
 *               repeat_type:
 *                 type: string
 *                 enum: [none, daily, weekly, monthly]
 *               status:
 *                 type: string
 *                 enum: [draft, scheduled]
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', emailController.create);

/**
 * @swagger
 * /emails/{id}:
 *   put:
 *     summary: 更新邮件任务
 *     tags: [Emails]
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
 *               subject:
 *                 type: string
 *               content:
 *                 type: string
 *               recipients:
 *                 type: array
 *                 items:
 *                   type: object
 *               scheduled_time:
 *                 type: string
 *                 format: date-time
 *               repeat_type:
 *                 type: string
 *                 enum: [none, daily, weekly, monthly]
 *               status:
 *                 type: string
 *                 enum: [draft, scheduled]
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', emailController.update);

/**
 * @swagger
 * /emails/{id}:
 *   delete:
 *     summary: 删除邮件任务
 *     tags: [Emails]
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
router.delete('/:id', emailController.remove);

/**
 * @swagger
 * /emails/{id}/send:
 *   post:
 *     summary: 立即发送邮件任务
 *     tags: [Emails]
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
 *         description: 发送完成
 */
router.post('/:id/send', emailController.sendNow);

module.exports = router;