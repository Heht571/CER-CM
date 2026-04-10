import request from '@/utils/request'

// 获取邮件配置
export function getEmailConfig() {
  return request.get('/config/email')
}

// 更新邮件配置
export function updateEmailConfig(data) {
  return request.put('/config/email', data)
}

// 获取邮件服务状态
export function getEmailStatus() {
  return request.get('/config/email/status')
}

// 测试邮件发送
export function testEmailSend(email) {
  return request.post('/config/email/test', { email })
}