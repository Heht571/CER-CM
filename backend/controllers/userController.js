const { User, MachineRoom } = require('../models');
const { success, fail, paginate } = require('../utils/response');
const { Op } = require('sequelize');

/**
 * 获取用户列表
 */
const getList = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, keyword, role, status } = req.query;

    const where = {};
    if (keyword) {
      where[Op.or] = [
        { username: { [Op.like]: `%${keyword}%` } },
        { real_name: { [Op.like]: `%${keyword}%` } }
      ];
    }
    if (role) where.role = role;
    if (status !== undefined) where.status = status;

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [{
        model: MachineRoom,
        as: 'managedRooms',
        attributes: ['id', 'name'],
        required: false
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
 * 获取用户详情
 */
const getDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [{
        model: MachineRoom,
        as: 'managedRooms',
        attributes: ['id', 'name', 'status']
      }]
    });

    if (!user) {
      return fail(res, '用户不存在', 404);
    }

    success(res, user);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建用户
 */
const create = async (req, res, next) => {
  try {
    const { username, password, real_name, role, department, phone, email } = req.body;

    if (!username || !password || !real_name) {
      return fail(res, '用户名、密码和姓名不能为空');
    }

    const existUser = await User.findOne({ where: { username } });
    if (existUser) {
      return fail(res, '用户名已存在');
    }

    const user = await User.create({
      username,
      password,
      real_name,
      role: role || 'manager',
      department,
      phone,
      email
    });

    success(res, { id: user.id }, '创建成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 更新用户
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { real_name, department, phone, email, status } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return fail(res, '用户不存在', 404);
    }

    await user.update({ real_name, department, phone, email, status });
    success(res, null, '更新成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 删除用户
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.userId) {
      return fail(res, '不能删除自己');
    }

    const user = await User.findByPk(id);
    if (!user) {
      return fail(res, '用户不存在', 404);
    }

    // 检查是否有机房分配给该用户
    const roomCount = await MachineRoom.count({ where: { manager_id: id } });
    if (roomCount > 0) {
      return fail(res, '该用户负责的机房未移交，无法删除');
    }

    await user.destroy();
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有机房负责人列表
 */
const getManagers = async (req, res, next) => {
  try {
    const managers = await User.findAll({
      where: { role: 'manager', status: 1 },
      attributes: ['id', 'real_name', 'department', 'phone']
    });
    success(res, managers);
  } catch (error) {
    next(error);
  }
};

/**
 * 重置密码
 */
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return fail(res, '新密码长度不能少于6位');
    }

    const user = await User.findByPk(id);
    if (!user) {
      return fail(res, '用户不存在', 404);
    }

    user.password = newPassword;
    await user.save();

    success(res, null, '密码重置成功');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getList,
  getDetail,
  create,
  update,
  remove,
  getManagers,
  resetPassword
};