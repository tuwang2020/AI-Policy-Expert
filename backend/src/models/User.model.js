const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用户名'
  },
  email: {
    type: DataTypes.STRING(200),
    unique: true,
    comment: '邮箱'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码(加密)'
  },
  realName: {
    type: DataTypes.STRING(50),
    comment: '真实姓名'
  },
  role: {
    type: DataTypes.ENUM('admin', 'operator', 'viewer'),
    defaultValue: 'operator',
    comment: '角色: 管理员-操作员-查看者'
  },
  department: {
    type: DataTypes.STRING(100),
    comment: '部门'
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    comment: '最后登录时间'
  },
  lastLoginIp: {
    type: DataTypes.STRING(50),
    comment: '最后登录IP'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否激活'
  }
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  },
  indexes: [
    { fields: ['username'], unique: true },
    { fields: ['email'], unique: true },
    { fields: ['role'] }
  ]
});

User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
