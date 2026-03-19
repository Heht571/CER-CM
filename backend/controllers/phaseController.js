const { ConstructionPhase, TaskTemplate } = require('../models');
const { success, fail } = require('../utils/response');

/**
 * 获取所有阶段
 */
const getList = async (req, res, next) => {
  try {
    const phases = await ConstructionPhase.findAll({
      include: [{
        model: TaskTemplate,
        as: 'templates',
        attributes: ['id', 'name', 'responsible_department', 'planned_days', 'sort_order'],
        order: [['sort_order', 'ASC']]
      }],
      order: [['phase_number', 'ASC']]
    });

    success(res, phases);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取阶段详情
 */
const getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const phase = await ConstructionPhase.findByPk(id, {
      include: [{
        model: TaskTemplate,
        as: 'templates',
        order: [['sort_order', 'ASC']]
      }]
    });

    if (!phase) {
      return fail(res, '阶段不存在', 404);
    }

    success(res, phase);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getList,
  getDetail
};