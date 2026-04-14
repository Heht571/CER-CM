const { Project, User, MachineRoom } = require('../models');
const { success, fail, paginate } = require('../utils/response');
const { Op } = require('sequelize');

/**
 * 获取项目列表
 */
const getList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, keyword, status } = req.query;

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { code: { [Op.like]: `%${keyword}%` } }
      ];
    }
    if (status) where.status = status;

    const { count, rows } = await Project.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'real_name']
      }],
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });

    paginate(res, rows, count, page, pageSize);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有活跃项目（用于下拉选择）
 */
const getActiveList = async (req, res, next) => {
  try {
    const projects = await Project.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });

    success(res, projects);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取项目详情
 */
const getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'real_name']
      }]
    });

    if (!project) {
      return fail(res, '项目不存在', 404);
    }

    success(res, project);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建项目
 */
const create = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    if (!name) {
      return fail(res, '项目名称不能为空');
    }

    if (code) {
      const existProject = await Project.findOne({ where: { code } });
      if (existProject) {
        return fail(res, '项目编码已存在');
      }
    }

    const project = await Project.create({
      name,
      code,
      description,
      status: 'active',
      created_by: req.userId
    });

    success(res, { id: project.id }, '创建成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 更新项目
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, status } = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      return fail(res, '项目不存在', 404);
    }

    if (code && code !== project.code) {
      const existProject = await Project.findOne({ where: { code } });
      if (existProject) {
        return fail(res, '项目编码已存在');
      }
    }

    await project.update({
      name,
      code,
      description,
      status
    });

    success(res, null, '更新成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 删除项目（归档）
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findByPk(id);
    if (!project) {
      return fail(res, '项目不存在', 404);
    }

    // 检查项目下是否有机房
    const roomCount = await MachineRoom.count({ where: { project_id: id } });
    if (roomCount > 0) {
      return fail(res, `该项目下有 ${roomCount} 个机房，无法删除。请先将机房转移或删除后再操作`);
    }

    // 归档而非删除
    await project.update({ status: 'archived' });

    success(res, null, '项目已归档');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getList,
  getActiveList,
  getDetail,
  create,
  update,
  remove
};