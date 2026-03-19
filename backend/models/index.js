const sequelize = require('../config/database');
const User = require('./User');
const MachineRoom = require('./MachineRoom');
const ConstructionPhase = require('./ConstructionPhase');
const TaskTemplate = require('./TaskTemplate');
const TaskDependency = require('./TaskDependency');
const RoomTask = require('./RoomTask');
const TaskProgressLog = require('./TaskProgressLog');
const OperationLog = require('./OperationLog');

// 定义模型关联关系

// 用户 - 机房（创建人）
User.hasMany(MachineRoom, { foreignKey: 'created_by', as: 'createdRooms' });
MachineRoom.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// 用户 - 机房（负责人）
User.hasMany(MachineRoom, { foreignKey: 'manager_id', as: 'managedRooms' });
MachineRoom.belongsTo(User, { foreignKey: 'manager_id', as: 'manager' });

// 阶段 - 任务模板
ConstructionPhase.hasMany(TaskTemplate, { foreignKey: 'phase_id', as: 'templates' });
TaskTemplate.belongsTo(ConstructionPhase, { foreignKey: 'phase_id', as: 'phase' });

// 阶段 - 机房任务
ConstructionPhase.hasMany(RoomTask, { foreignKey: 'phase_id', as: 'tasks' });
RoomTask.belongsTo(ConstructionPhase, { foreignKey: 'phase_id', as: 'phase' });

// 机房 - 任务
MachineRoom.hasMany(RoomTask, { foreignKey: 'room_id', as: 'tasks' });
RoomTask.belongsTo(MachineRoom, { foreignKey: 'room_id', as: 'room' });

// 任务模板 - 机房任务
TaskTemplate.hasMany(RoomTask, { foreignKey: 'template_id', as: 'roomTasks' });
RoomTask.belongsTo(TaskTemplate, { foreignKey: 'template_id', as: 'template' });

// 任务模板 - 依赖关系（前置）
TaskTemplate.belongsToMany(TaskTemplate, {
  through: TaskDependency,
  as: 'predecessors',
  foreignKey: 'task_id',
  otherKey: 'prev_task_id'
});

// 任务模板 - 依赖关系（后继）
TaskTemplate.belongsToMany(TaskTemplate, {
  through: TaskDependency,
  as: 'successors',
  foreignKey: 'prev_task_id',
  otherKey: 'task_id'
});

// 任务 - 进度日志
RoomTask.hasMany(TaskProgressLog, { foreignKey: 'task_id', as: 'logs' });
TaskProgressLog.belongsTo(RoomTask, { foreignKey: 'task_id', as: 'task' });

// 用户 - 进度日志
User.hasMany(TaskProgressLog, { foreignKey: 'user_id', as: 'progressLogs' });
TaskProgressLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 用户 - 操作日志
User.hasMany(OperationLog, { foreignKey: 'user_id', as: 'operationLogs' });
OperationLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  MachineRoom,
  ConstructionPhase,
  TaskTemplate,
  TaskDependency,
  RoomTask,
  TaskProgressLog,
  OperationLog
};