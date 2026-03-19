import request from '@/utils/request'

// 获取所有阶段
export function getPhases() {
  return request.get('/phases')
}

// 获取阶段详情
export function getPhaseDetail(id) {
  return request.get(`/phases/${id}`)
}