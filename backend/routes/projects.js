const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { isAdmin } = require('../middleware/authorize');

/**
 * @swagger
 * /projects/active:
 *   get:
 *     summary: 获取活跃项目列表（用于下拉选择）
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取活跃项目列表
 */
router.get('/active', projectController.getActiveList);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: 获取项目列表
 *     tags: [Projects]
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
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, archived]
 *     responses:
 *       200:
 *         description: 成功获取项目列表
 */
router.get('/', isAdmin, projectController.getList);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: 获取项目详情
 *     tags: [Projects]
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
 *         description: 成功获取项目详情
 */
router.get('/:id', projectController.getDetail);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: 创建项目
 *     tags: [Projects]
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
 *             properties:
 *               name:
 *                 type: string
 *               code:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: 创建成功
 */
router.post('/', isAdmin, projectController.create);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: 更新项目
 *     tags: [Projects]
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
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, archived]
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/:id', isAdmin, projectController.update);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: 归档项目
 *     tags: [Projects]
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
 *         description: 归档成功
 */
router.delete('/:id', isAdmin, projectController.remove);

module.exports = router;