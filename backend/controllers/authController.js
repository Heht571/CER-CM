const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { User, OperationLog } = require('../models');
const { success, fail } = require('../utils/response');

/**
 * 记录登录日志
 */
const logLogin = async (userId, action, ip, detail) => {
  try {
    await OperationLog.create({
      user_id: userId,
      action,
      target_type: 'auth',
      detail: JSON.stringify(detail),
      ip
    });
  } catch (error) {
    console.error('记录登录日志失败:', error);
  }
};

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
      // 记录登录失败日志（用户不存在）
      await logLogin(null, 'login_failed', req.ip, { username, reason: '用户不存在' });
      return fail(res, '用户名或密码错误', 401);
    }

    if (user.status !== 1) {
      // 记录登录失败日志（账号禁用）
      await logLogin(user.id, 'login_failed', req.ip, { username, reason: '账号已禁用' });
      return fail(res, '账号已被禁用', 403);
    }

    const isMatch = await user.validatePassword(password);
    if (!isMatch) {
      // 记录登录失败日志（密码错误）
      await logLogin(user.id, 'login_failed', req.ip, { username, reason: '密码错误' });
      return fail(res, '用户名或密码错误', 401);
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // 记录登录成功日志
    await logLogin(user.id, 'login_success', req.ip, { username });

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
    if (!req.user) {
      return fail(res, '请先登录', 401);
    }

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
    if (!user) {
      return fail(res, '用户不存在', 404);
    }

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