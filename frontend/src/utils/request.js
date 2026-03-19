import axios from 'axios'
import { Message } from 'element-ui'
import store from '@/store'
import router from '@/router'

// 创建 axios 实例
const request = axios.create({
  baseURL: '/api',
  timeout: 15000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = store.state.auth.token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  response => {
    const res = response.data

    if (!res.success) {
      Message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }

    return res
  },
  error => {
    if (error.response) {
      const { status, data } = error.response

      if (status === 401) {
        Message.error('登录已过期，请重新登录')
        store.dispatch('auth/logout')
        router.push('/login')
      } else if (status === 403) {
        Message.error('没有权限执行此操作')
      } else if (status === 404) {
        Message.error('请求的资源不存在')
      } else {
        Message.error(data?.message || '请求失败')
      }
    } else {
      Message.error('网络错误，请检查网络连接')
    }

    return Promise.reject(error)
  }
)

export default request