const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User.model');
const logger = require('../utils/logger');

class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '请输入用户名和密码'
        });
      }

      const user = await User.findOne({
        where: { username, isActive: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      await user.update({
        lastLoginAt: new Date(),
        lastLoginIp: req.ip
      });

      logger.info(`用户登录成功: ${username}`);

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            realName: user.realName,
            role: user.role,
            department: user.department
          }
        },
        message: '登录成功'
      });
    } catch (error) {
      logger.error('登录失败:', error);
      res.status(500).json({ success: false, message: '服务器错误' });
    }
  }

  async register(req, res) {
    try {
      const { username, password, email, realName, role = 'operator' } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码不能为空'
        });
      }

      const existingUser = await User.findOne({
        where: { [Op.or]: [{ username }, { email }] }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: '用户名或邮箱已存在'
        });
      }

      const user = await User.create({
        username,
        password,
        email,
        realName,
        role
      });

      logger.info(`新用户注册: ${username}`);

      res.status(201).json({
        success: true,
        data: { id: user.id, username: user.username },
        message: '注册成功'
      });
    } catch (error) {
      logger.error('注册失败:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
      });

      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const user = await User.findByPk(req.user.id);

      const isMatch = await user.comparePassword(oldPassword);

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: '原密码不正确'
        });
      }

      await user.update({ password: newPassword });

      res.json({ success: true, message: '密码修改成功' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未提供认证Token'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token无效或已过期'
    });
  }
}

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
}

module.exports = new AuthController();
module.exports.authMiddleware = authMiddleware;
module.exports.roleMiddleware = roleMiddleware;
