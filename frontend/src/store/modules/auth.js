import router from '@/router'

const state = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || '{}')
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
  LOGOUT(state) {
    state.token = ''
    state.user = {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

const actions = {
  login({ commit }, { token, user }) {
    commit('SET_TOKEN', token)
    commit('SET_USER', user)
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