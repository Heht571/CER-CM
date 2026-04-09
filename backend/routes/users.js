const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 获取用户列表
 *     tags: [Users]
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
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 用户名或姓名
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, manager]
 *     responses:
 *       200:
 *         description: 成功获取用户列表
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
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 */
router.get('/', userController.getList);

/**
 * @swagger
 * /users/managers:
 *   get:
 *     summary: 获取所有机房负责人
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取负责人列表
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
 *                     $ref: '#/components/schemas/User'
 */
router.get('/managers', userController.getManagers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: 获取用户详情
 *     tags: [Users]
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
 *         description: 成功获取用户详情
 */
router.get('/:id', userController.getDetail);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: 创建用户
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - real_name
 *               - role
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               real_name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager]
 *               password:
 *                 type: string
 *               department:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 *       400:
 *         description: 参数错误
 */
router.post('/', userController.create);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: 更新用户
 *     tags: [Users]
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
 *               real_name:
 *                 type: string
 *               department:
 *                 type: string
 *               phone:
 *                 type: string
 *               status:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', userController.update);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: 删除用户
 *     tags: [Users]
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
router.delete('/:id', userController.remove);

/**
 * @swagger
 * /users/{id}/reset-password:
 *   put:
 *     summary: 重置用户密码
 *     tags: [Users]
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
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: 重置成功
 */
router.put('/:id/reset-password', userController.resetPassword);

module.exports = router;