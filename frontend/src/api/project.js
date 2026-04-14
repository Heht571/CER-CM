import request from '@/utils/request'

// 获取活跃项目列表（用于下拉选择）
export function getActiveProjects() {
  return request.get('/projects/active')
}

// 获取项目列表
export function getProjects(params) {
  return request.get('/projects', { params })
}

// 获取项目详情
export function getProjectDetail(id) {
  return request.get(`/projects/${id}`)
}

// 创建项目
export function createProject(data) {
  return request.post('/projects', data)
}

// 更新项目
export function updateProject(id, data) {
  return request.put(`/projects/${id}`, data)
}

// 归档项目
export function archiveProject(id) {
  return request.delete(`/projects/${id}`)
}