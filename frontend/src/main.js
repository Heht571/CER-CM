import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import ElementUI, { Message } from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

Vue.config.productionTip = false
Vue.use(ElementUI)

// 解析JWT token获取过期时间
const parseJwtExp = (token) => {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded.exp ? decoded.exp * 1000 : null
  } catch (e) {
    return null
  }
}

// 检查token是否过期
const isTokenExpired = (token) => {
  const exp = parseJwtExp(token)
  if (!exp) return true
  return Date.now() > exp
}

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresAdmin = to.matched.some(record => record.meta.requiresAdmin)
  let { token, user } = store.state.auth

  // 检查token是否过期
  if (token && isTokenExpired(token)) {
    store.commit('auth/LOGOUT')
    token = ''
    user = {}
  }

  if (requiresAuth && !token) {
    next('/login')
    return
  }

  if (token && (requiresAuth || to.path === '/login')) {
    try {
      const profile = await store.dispatch('auth/refreshProfile')
      user = profile || user
      token = store.state.auth.token
    } catch (error) {
      if (!store.state.auth.token) {
        next('/login')
        return
      }
    }
  }

  if (to.path === '/login' && token) {
    next(user.role === 'admin' ? '/dashboard' : '/tasks')
    return
  }

  if (requiresAdmin && user.role !== 'admin') {
    Message.error('需要管理员权限')
    next('/tasks')
    return
  }

  next()
})

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
