import axios from 'axios'
import router from '@/router'

const state = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || '{}'),
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
    router.push('/login')
  }
}

const getters = {
  isLoggedIn: state => !!state.token,
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
