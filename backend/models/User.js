const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

class User extends Model {
  async validatePassword(password) {
    return bcrypt.compare(password, this.password);
  }
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用户名'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码（加密）'
  },
  real_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '真实姓名'
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager'),
    allowNull: false,
    defaultValue: 'manager',
    comment: '角色：admin-管理员，manager-机房负责人'
  },
  department: {
    type: DataTypes.STRING(100),
    comment: '所属部门'
  },
  phone: {
    type: DataTypes.STRING(20),
    comment: '联系电话'
  },
  email: {
    type: DataTypes.STRING(100),
    comment: '邮箱'
  },
  status: {
    type: DataTypes.SMALLINT,
    defaultValue: 1,
    comment: '状态：1-启用，0-禁用'
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  }
});

module.exports = User;