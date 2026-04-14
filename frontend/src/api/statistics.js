import request from '@/utils/request'

// 获取总体概览
export function getOverview(params) {
  return request.get('/statistics/overview', { params })
}

// 按阶段统计
export function getByPhase(params) {
  return request.get('/statistics/phase', { params })
}

// 延期预警
export function getDelayed(params) {
  return request.get('/statistics/delayed', { params })
}

// 机房进度排行
export function getRanking(params) {
  return request.get('/statistics/ranking', { params })
}

// 按负责人分组统计
export function getByManager(params) {
  return request.get('/statistics/by-manager', { params })
}

// 按项目分组统计
export function getByProject() {
  return request.get('/statistics/by-project')
}