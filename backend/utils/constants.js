/**
 * 常量定义
 */

// 用户角色
const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager'
};

// 机房状态
const ROOM_STATUS = {
  PLANNING: 'planning',      // 规划中
  IN_PROGRESS: 'in_progress', // 建设中
  COMPLETED: 'completed',    // 已完成
  PAUSED: 'paused'           // 暂停
};

// 任务状态
const TASK_STATUS = {
  NOT_STARTED: 'not_started', // 未开始
  IN_PROGRESS: 'in_progress', // 进行中
  COMPLETED: 'completed'      // 已完成
};

// 状态中文映射
const ROOM_STATUS_TEXT = {
  planning: '规划中',
  in_progress: '建设中',
  completed: '已完成',
  paused: '已暂停'
};

const TASK_STATUS_TEXT = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成'
};

const ROLE_TEXT = {
  admin: '管理员',
  manager: '机房负责人'
};

module.exports = {
  ROLES,
  ROOM_STATUS,
  TASK_STATUS,
  ROOM_STATUS_TEXT,
  TASK_STATUS_TEXT,
  ROLE_TEXT
};