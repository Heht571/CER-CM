/**
 * 权限验证中间件
 * @param {string[]} roles - 允许的角色列表
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '没有权限执行此操作'
      });
    }

    next();
  };
};

/**
 * 检查是否是管理员
 */
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
  next();
};

/**
 * 检查是否是机房负责人或管理员
 */
const isManagerOrAdmin = async (req, res, next) => {
  try {
    const roomId = req.params.roomId || req.params.id;
    const { MachineRoom } = require('../models');

    // 管理员有全部权限
    if (req.user.role === 'admin') {
      return next();
    }

    // 负责人只能操作自己负责的机房
    if (roomId) {
      const room = await MachineRoom.findByPk(roomId);
      if (!room) {
        return res.status(404).json({
          success: false,
          message: '机房不存在'
        });
      }
      if (room.manager_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: '您不是该机房的负责人'
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { authorize, isAdmin, isManagerOrAdmin };