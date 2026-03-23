/**
 * 全局常量定义
 */

// 任务状态映射
export const TASK_STATUS_MAP = {
  not_started: { text: '未开始', type: 'info' },
  in_progress: { text: '进行中', type: 'warning' },
  completed: { text: '已完成', type: 'success' }
}

// 机房状态映射
export const ROOM_STATUS_MAP = {
  planning: { text: '规划中', type: 'info' },
  in_progress: { text: '建设中', type: 'warning' },
  completed: { text: '已完成', type: 'success' },
  paused: { text: '已暂停', type: 'danger' }
}

// 建设方式映射
export const CONSTRUCTION_TYPE_MAP = {
  purchase: { text: '购置', desc: '购置类：包含收房、产权办理流程（13个节点）' },
  lease: { text: '租赁', desc: '租赁类：包含收房流程，无产权办理（12个节点）' },
  self_build: { text: '自建', desc: '自建类：包含收房流程，无产权办理（12个节点）' },
  container: { text: '一体化集装箱', desc: '一体化集装箱：方案及用地确定，无收房、无产权办理（11个节点）' },
  reuse: { text: '利旧', desc: '利旧：立项批复后设计批复需3个月，无合同签订、无收房、无产权办理（10个节点）' }
}

// 建设方式选项列表
export const CONSTRUCTION_TYPE_OPTIONS = [
  { label: '购置', value: 'purchase' },
  { label: '租赁', value: 'lease' },
  { label: '自建', value: 'self_build' },
  { label: '一体化集装箱', value: 'container' },
  { label: '利旧', value: 'reuse' }
]

// 任务状态选项列表
export const TASK_STATUS_OPTIONS = [
  { label: '未开始', value: 'not_started' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' }
]

// 机房状态选项列表
export const ROOM_STATUS_OPTIONS = [
  { label: '规划中', value: 'planning' },
  { label: '建设中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已暂停', value: 'paused' }
]