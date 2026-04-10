const { User, MachineRoom, TaskProgressLog, OperationLog, sequelize } = require('../models');
const { success, fail, paginate } = require('../utils/response');
const { Op } = require('sequelize');

// 邮箱格式验证正则
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 记录操作日志
 */
const logOperation = async (userId, action, targetType, targetId, detail, ip) => {
  try {
    await OperationLog.create({
      user_id: userId,
      action,
      target_type: targetType,
      target_id: targetId,
      detail: JSON.stringify(detail),
      ip
    });
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
};

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

    // 邮箱格式验证
    if (email && !EMAIL_REGEX.test(email)) {
      return fail(res, '邮箱格式不正确');
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

    // 记录操作日志
    await logOperation(req.userId, 'create_user', 'user', user.id, {
      username,
      real_name,
      role
    }, req.ip);

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

    // 邮箱格式验证
    if (email && !EMAIL_REGEX.test(email)) {
      return fail(res, '邮箱格式不正确');
    }

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

    // 记录操作日志
    await logOperation(req.userId, 'update_user', 'user', id, {
      real_name,
      role: nextRole,
      status: nextStatus
    }, req.ip);

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
      // 记录操作日志（在删除前记录用户信息）
      await logOperation(req.userId, 'delete_user', 'user', id, {
        username: user.username,
        real_name: user.real_name,
        role: user.role
      }, req.ip);

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

    // 记录操作日志
    await logOperation(req.userId, 'reset_password', 'user', id, {
      username: user.username
    }, req.ip);

    success(res, null, '密码重置成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 批量更新用户状态
 */
const batchUpdateStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return fail(res, '请选择要操作的用户');
    }

    if (![0, 1].includes(Number(status))) {
      return fail(res, '状态值无效');
    }

    const targetStatus = Number(status);

    // 不能修改自己的状态
    if (ids.includes(req.userId)) {
      return fail(res, '不能修改自己的状态');
    }

    // 检查是否有管理员被禁用
    if (targetStatus === 0) {
      const adminIds = await User.findAll({
        where: { id: ids, role: 'admin', status: 1 },
        attributes: ['id']
      }).then(users => users.map(u => u.id));

      if (adminIds.length > 0) {
        const activeAdminCount = await User.count({ where: { role: 'admin', status: 1 } });
        if (activeAdminCount <= adminIds.length) {
          return fail(res, '至少保留一个启用状态的管理员');
        }
      }
    }

    // 检查是否有负责机房的负责人被禁用
    if (targetStatus === 0) {
      const managersWithRooms = await MachineRoom.findAll({
        where: { manager_id: ids },
        attributes: ['manager_id']
      }).then(rooms => [...new Set(rooms.map(r => r.manager_id))]);

      if (managersWithRooms.length > 0) {
        return fail(res, '部分用户仍负责机房，请先完成机房移交');
      }
    }

    await User.update(
      { status: targetStatus },
      { where: { id: ids } }
    );

    // 记录操作日志
    await logOperation(req.userId, 'batch_update_status', 'user', null, {
      ids,
      status: targetStatus,
      count: ids.length
    }, req.ip);

    success(res, null, `已${targetStatus === 1 ? '启用' : '禁用'} ${ids.length} 个用户`);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户操作历史
 */
const getUserLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;

    const user = await User.findByPk(id);
    if (!user) {
      return fail(res, '用户不存在', 404);
    }

    const { count, rows } = await OperationLog.findAndCountAll({
      where: { user_id: id },
      order: [['created_at', 'DESC']],
      offset: (page - 1) * pageSize,
      limit: parseInt(pageSize)
    });

    // 解析 detail JSON
    const logs = rows.map(log => ({
      ...log.toJSON(),
      detail: log.detail ? JSON.parse(log.detail) : null
    }));

    paginate(res, logs, count, page, pageSize);
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
  resetPassword,
  batchUpdateStatus,
  getUserLogs
};