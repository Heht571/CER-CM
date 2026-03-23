import request from '@/utils/request'

// 获取任务列表
export function getTasks(params) {
  return request.get('/tasks', { params })
}

// 获取我的机房任务（按机房分组，只显示当前待处理任务）
export function getMyRoomTasks() {
  return request.get('/tasks/my-rooms')
}

// 获取任务详情
export function getTaskDetail(id) {
  return request.get(`/tasks/${id}`)
}

// 更新任务状态
export function updateTaskStatus(id, data) {
  return request.put(`/tasks/${id}/status`, data)
}

// 更新任务进度
export function updateTaskProgress(id, data) {
  return request.put(`/tasks/${id}/progress`, data)
}

// 获取任务模板列表
export function getTaskTemplates(params) {
  return request.get('/tasks/templates', { params })
}

// 创建任务模板
export function createTaskTemplate(data) {
  return request.post('/tasks/templates', data)
}

// 获取任务进度日志
export function getTaskLogs(id) {
  return request.get(`/tasks/${id}/logs`)
}