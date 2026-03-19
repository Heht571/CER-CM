import request from '@/utils/request'

// 登录
export function login(data) {
  return request.post('/auth/login', data)
}

// 获取当前用户信息
export function getProfile() {
  return request.get('/auth/profile')
}

// 修改密码
export function changePassword(data) {
  return request.put('/auth/password', data)
}