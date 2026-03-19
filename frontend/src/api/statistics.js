import request from '@/utils/request'

// 获取总体概览
export function getOverview() {
  return request.get('/statistics/overview')
}

// 按阶段统计
export function getByPhase() {
  return request.get('/statistics/phase')
}

// 延期预警
export function getDelayed() {
  return request.get('/statistics/delayed')
}

// 机房进度排行
export function getRanking() {
  return request.get('/statistics/ranking')
}