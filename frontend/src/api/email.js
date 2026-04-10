import request from '@/utils/request'

// 获取邮件任务列表
export function getEmails(params) {
  return request.get('/emails', { params })
}

// 获取邮件任务详情
export function getEmailDetail(id) {
  return request.get(`/emails/${id}`)
}

// 创建邮件任务
export function createEmail(data) {
  return request.post('/emails', data)
}

// 更新邮件任务
export function updateEmail(id, data) {
  return request.put(`/emails/${id}`, data)
}

// 删除邮件任务
export function deleteEmail(id) {
  return request.delete(`/emails/${id}`)
}

// 立即发送邮件
export function sendEmailNow(id) {
  return request.post(`/emails/${id}/send`)
}

// 获取发送日志
export function getEmailLogs(id, params) {
  return request.get(`/emails/${id}/logs`, { params })
}

// 获取邮件服务状态
export function getEmailServiceStatus() {
  return request.get('/emails/status')
}

// 获取可选接收人列表
export function getRecipients() {
  return request.get('/emails/recipients')
}