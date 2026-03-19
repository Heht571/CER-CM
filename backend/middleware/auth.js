const jwt = require('jsonwebtoken');
const config = require('../config');
const { User } = require('../models');

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '请先登录'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (user.status !== 1) {
      return res.status(403).json({
        success: false,
        message: '账号已被禁用'
      });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token无效'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token已过期，请重新登录'
      });
    }
    next(error);
  }
};

module.exports = auth;