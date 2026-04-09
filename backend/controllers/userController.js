const { User, MachineRoom, TaskProgressLog, sequelize } = require('../models');
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
      distinct: true,
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

    if (password.length < 6) {
      return fail(res, '密码长度不能少于6位');
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
    const { real_name, role, department, phone, email, status } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return fail(res, '用户不存在', 404);
    }

    if (role !== undefined && !['admin', 'manager'].includes(role)) {
      return fail(res, '用户角色无效');
    }

    if (status !== undefined && ![0, 1].includes(Number(status))) {
      return fail(res, '用户状态无效');
    }

    const nextRole = role || user.role;
    const nextStatus = status !== undefined ? Number(status) : user.status;

    if (user.role === 'admin' && user.status === 1 && (nextRole !== 'admin' || nextStatus !== 1)) {
      const activeAdminCount = await User.count({ where: { role: 'admin', status: 1 } });
      if (activeAdminCount <= 1) {
        return fail(res, '至少保留一个启用状态的管理员');
      }
    }

    const managedRoomCount = await MachineRoom.count({ where: { manager_id: id } });
    if (managedRoomCount > 0 && (nextRole !== 'manager' || nextStatus !== 1)) {
      return fail(res, '该用户仍负责机房，请先完成机房移交');
    }

    await user.update({
      real_name,
      role: nextRole,
      department,
      phone,
      email,
      status: nextStatus
    });
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

    const transaction = await sequelize.transaction();

    try {
      await TaskProgressLog.destroy({
        where: { user_id: id },
        transaction
      });
      await user.destroy({ transaction });
      await transaction.commit();
      success(res, null, '删除成功');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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