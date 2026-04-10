const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');

/**
 * @swagger
 * /config/email:
 *   get:
 *     summary: 获取邮件配置
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取邮件配置
 */
router.get('/email', configController.getEmailConfig);

/**
 * @swagger
 * /config/email:
 *   put:
 *     summary: 更新邮件配置
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               secure:
 *                 type: boolean
 *               user:
 *                 type: string
 *               pass:
 *                 type: string
 *               from_name:
 *                 type: string
 *               from_address:
 *                 type: string
 *     responses:
 *       200:
 *         description: 配置保存成功
 */
router.put('/email', configController.updateEmailConfig);

/**
 * @swagger
 * /config/email/status:
 *   get:
 *     summary: 获取邮件服务状态
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取服务状态
 */
router.get('/email/status', configController.getEmailStatus);

/**
 * @swagger
 * /config/email/test:
 *   post:
 *     summary: 测试邮件发送
 *     tags: [Config]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: 测试邮件已发送
 */
router.post('/email/test', configController.testEmail);

module.exports = router;