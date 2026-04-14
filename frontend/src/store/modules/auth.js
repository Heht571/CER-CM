import axios from 'axios'
import router from '@/router'

// 解析JWT token获取过期时间
const parseJwtExp = (token) => {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded.exp ? decoded.exp * 1000 : null // exp是秒级时间戳，转为毫秒
  } catch (e) {
    return null
  }
}

// 检查token是否过期
const isTokenExpired = (token) => {
  const exp = parseJwtExp(token)
  if (!exp) return true // 无法解析则视为过期
  return Date.now() > exp
}

// 初始化时检查token
const storedToken = localStorage.getItem('token') || ''
const storedUser = JSON.parse(localStorage.getItem('user') || '{}')

// 如果token过期，清除存储
if (storedToken && isTokenExpired(storedToken)) {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

const state = {
  token: storedToken && !isTokenExpired(storedToken) ? storedToken : '',
  user: storedToken && !isTokenExpired(storedToken) ? storedUser : {},
  profileSyncedAt: 0
}

const mutations = {
  SET_TOKEN(state, token) {
    state.token = token
    localStorage.setItem('token', token)
  },
  SET_USER(state, user) {
    state.user = user
    localStorage.setItem('user', JSON.stringify(user))
  },
  SET_PROFILE_SYNCED_AT(state, timestamp) {
    state.profileSyncedAt = timestamp
  },
  LOGOUT(state) {
    state.token = ''
    state.user = {}
    state.profileSyncedAt = 0
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

const actions = {
  login({ commit }, { token, user }) {
    commit('SET_TOKEN', token)
    commit('SET_USER', user)
    commit('SET_PROFILE_SYNCED_AT', Date.now())
  },
  async refreshProfile({ state, commit }) {
    if (!state.token) {
      return null
    }

    // 检查token是否过期
    if (isTokenExpired(state.token)) {
      commit('LOGOUT')
      return null
    }

    try {
      const response = await axios.get('/api/auth/profile', {
        timeout: 15000,
        headers: {
          Authorization: `Bearer ${state.token}`
        }
      })
      const res = response.data

      if (!res.success) {
        throw new Error(res.message || '获取用户信息失败')
      }

      commit('SET_USER', res.data)
      commit('SET_PROFILE_SYNCED_AT', Date.now())
      return res.data
    } catch (error) {
      if (error.response && [401, 403].includes(error.response.status)) {
        commit('LOGOUT')
      }
      throw error
    }
  },
  logout({ commit }) {
    commit('LOGOUT')
    // 避免重复导航到登录页的警告
    if (router.currentRoute.path !== '/login') {
      router.push('/login')
    }
  },
  // 检查登录状态（可在应用启动时调用）
  checkAuth({ state, commit }) {
    if (state.token && isTokenExpired(state.token)) {
      commit('LOGOUT')
      return false
    }
    return !!state.token
  }
}

const getters = {
  isLoggedIn: state => !!state.token && !isTokenExpired(state.token),
  isAdmin: state => state.user.role === 'admin',
  currentUser: state => state.user
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}