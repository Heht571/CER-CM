const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

/**
 * @route GET /api/users
 * @desc 获取用户列表
 */
router.get('/', userController.getList);

/**
 * @route GET /api/users/managers
 * @desc 获取所有机房负责人
 */
router.get('/managers', userController.getManagers);

/**
 * @route GET /api/users/:id
 * @desc 获取用户详情
 */
router.get('/:id', userController.getDetail);

/**
 * @route POST /api/users
 * @desc 创建用户
 */
router.post('/', userController.create);

/**
 * @route PUT /api/users/:id
 * @desc 更新用户
 */
router.put('/:id', userController.update);

/**
 * @route DELETE /api/users/:id
 * @desc 删除用户
 */
router.delete('/:id', userController.remove);

/**
 * @route PUT /api/users/:id/reset-password
 * @desc 重置密码
 */
router.put('/:id/reset-password', userController.resetPassword);

module.exports = router;