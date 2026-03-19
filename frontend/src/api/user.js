import request from '@/utils/request'

// 获取用户列表
export function getUsers(params) {
  return request.get('/users', { params })
}

// 获取用户详情
export function getUserDetail(id) {
  return request.get(`/users/${id}`)
}

// 创建用户
export function createUser(data) {
  return request.post('/users', data)
}

// 更新用户
export function updateUser(id, data) {
  return request.put(`/users/${id}`, data)
}

// 删除用户
export function deleteUser(id) {
  return request.delete(`/users/${id}`)
}

// 获取所有负责人
export function getManagers() {
  return request.get('/users/managers')
}

// 重置密码
export function resetPassword(id, data) {
  return request.put(`/users/${id}/reset-password`, data)
}