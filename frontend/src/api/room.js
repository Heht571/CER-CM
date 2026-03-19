import request from '@/utils/request'

// 获取机房列表
export function getRooms(params) {
  return request.get('/rooms', { params })
}

// 获取机房详情
export function getRoomDetail(id) {
  return request.get(`/rooms/${id}`)
}

// 创建机房
export function createRoom(data) {
  return request.post('/rooms', data)
}

// 更新机房
export function updateRoom(id, data) {
  return request.put(`/rooms/${id}`, data)
}

// 删除机房
export function deleteRoom(id) {
  return request.delete(`/rooms/${id}`)
}

// 分配负责人
export function assignManager(id, data) {
  return request.put(`/rooms/${id}/assign`, data)
}

// 更新机房状态
export function updateRoomStatus(id, data) {
  return request.put(`/rooms/${id}/status`, data)
}

// 获取机房任务列表
export function getRoomTasks(id, params) {
  return request.get(`/rooms/${id}/tasks`, { params })
}

// 获取机房进度统计
export function getRoomProgress(id) {
  return request.get(`/rooms/${id}/progress`)
}

// 获取机房进度日志
export function getRoomLogs(id, params) {
  return request.get(`/rooms/${id}/logs`, { params })
}