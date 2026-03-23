import { getTasks, getTaskDetail, updateTaskStatus, updateTaskProgress } from '@/api/task'

// 缓存有效期（毫秒）- 3分钟
const CACHE_TTL = 3 * 60 * 1000

const state = {
  tasks: [],
  currentTask: null,
  // 缓存时间戳
  cache: {
    tasks: null,
    taskDetails: {}
  }
}

const mutations = {
  SET_TASKS(state, tasks) {
    state.tasks = tasks
    state.cache.tasks = Date.now()
  },
  SET_CURRENT_TASK(state, task) {
    state.currentTask = task
    if (task && task.id) {
      state.cache.taskDetails[task.id] = Date.now()
    }
  },
  UPDATE_TASK_IN_LIST(state, updatedTask) {
    const index = state.tasks.findIndex(t => t.id === updatedTask.id)
    if (index !== -1) {
      state.tasks.splice(index, 1, { ...state.tasks[index], ...updatedTask })
    }
  },
  CLEAR_CACHE(state) {
    state.cache = {
      tasks: null,
      taskDetails: {}
    }
  }
}

const getters = {
  isTasksCacheValid: state => {
    return state.cache.tasks && (Date.now() - state.cache.tasks) < CACHE_TTL
  },
  isTaskDetailCacheValid: state => id => {
    const timestamp = state.cache.taskDetails[id]
    return timestamp && (Date.now() - timestamp) < CACHE_TTL
  }
}

const actions = {
  async fetchTasks({ commit, state, getters }, { force = false, params = {} } = {}) {
    // 如果有缓存且未过期
    if (!force && getters.isTasksCacheValid && state.tasks.length > 0) {
      return { data: { list: state.tasks }, cached: true }
    }
    const res = await getTasks(params)
    commit('SET_TASKS', res.data.list)
    return { ...res, cached: false }
  },
  async fetchTaskDetail({ commit, state, getters }, { id, force = false } = {}) {
    // 如果有缓存且未过期
    if (!force && getters.isTaskDetailCacheValid(id) && state.currentTask?.id === id) {
      return { data: state.currentTask, cached: true }
    }
    const res = await getTaskDetail(id)
    commit('SET_CURRENT_TASK', res.data)
    return { ...res, cached: false }
  },
  async updateStatus({ commit, dispatch }, { id, data }) {
    const res = await updateTaskStatus(id, data)
    // 更新后清除相关缓存
    commit('CLEAR_CACHE')
    return res
  },
  async updateProgress({ commit, dispatch }, { id, data }) {
    const res = await updateTaskProgress(id, data)
    // 更新后清除相关缓存
    commit('CLEAR_CACHE')
    return res
  },
  // 清除缓存
  clearCache({ commit }) {
    commit('CLEAR_CACHE')
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions,
  getters
}