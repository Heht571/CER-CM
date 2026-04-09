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

const syncUserPermissionState = async () => {
  try {
    return await store.dispatch('auth/refreshProfile')
  } catch (error) {
    return null
  }
}

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
  async error => {
    if (error.response) {
      const { status, data } = error.response
      const message = data?.message || '请求失败'

      if (status === 401) {
        Message.error('登录已过期，请重新登录')
        await store.dispatch('auth/logout')
      } else if (status === 403) {
        if (message === '账号已被禁用') {
          Message.error(message)
          await store.dispatch('auth/logout')
        } else if (message === '需要管理员权限' && store.state.auth.token) {
          const user = await syncUserPermissionState()
          if (!user) {
            Message.error('登录状态已失效，请重新登录')
            await store.dispatch('auth/logout')
          } else if (router.currentRoute.matched.some(record => record.meta.requiresAdmin) && user.role !== 'admin') {
            Message.error('当前账号权限已变更，已返回任务页')
            router.push('/tasks')
          } else {
            Message.error(message)
          }
        } else {
          Message.error(message)
        }
      } else if (status === 404) {
        Message.error('请求的资源不存在')
      } else {
        Message.error(message)
      }
    } else {
      Message.error('网络错误，请检查网络连接')
    }

    return Promise.reject(error)
  }
)

export default request
