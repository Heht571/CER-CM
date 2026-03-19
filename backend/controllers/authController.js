const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { User } = require('../models');
const { success, fail } = require('../utils/response');

/**
 * 用户登录
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return fail(res, '用户名和密码不能为空');
    }

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return fail(res, '用户名或密码错误', 401);
    }

    if (user.status !== 1) {
      return fail(res, '账号已被禁用', 403);
    }

    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      return fail(res, '用户名或密码错误', 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        real_name: user.real_name,
        role: user.role,
        department: user.department
      }
    }, '登录成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户信息
 */
const getProfile = async (req, res, next) => {
  try {
    success(res, req.user);
  } catch (error) {
    next(error);
  }
};

/**
 * 修改密码
 */
const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return fail(res, '请填写旧密码和新密码');
    }

    if (newPassword.length < 6) {
      return fail(res, '新密码长度不能少于6位');
    }

    const user = await User.findByPk(req.userId);
    const isMatch = await user.validatePassword(oldPassword);

    if (!isMatch) {
      return fail(res, '旧密码错误', 400);
    }

    user.password = newPassword;
    await user.save();

    success(res, null, '密码修改成功');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getProfile,
  changePassword
};