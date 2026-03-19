const express = require('express');
const router = express.Router();
const phaseController = require('../controllers/phaseController');

/**
 * @route GET /api/phases
 * @desc 获取所有阶段
 */
router.get('/', phaseController.getList);

/**
 * @route GET /api/phases/:id
 * @desc 获取阶段详情
 */
router.get('/:id', phaseController.getDetail);

module.exports = router;