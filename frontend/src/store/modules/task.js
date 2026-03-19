import { getTasks, getTaskDetail, updateTaskStatus, updateTaskProgress } from '@/api/task'

const state = {
  tasks: [],
  currentTask: null
}

const mutations = {
  SET_TASKS(state, tasks) {
    state.tasks = tasks
  },
  SET_CURRENT_TASK(state, task) {
    state.currentTask = task
  }
}

const actions = {
  async fetchTasks({ commit }, params) {
    const res = await getTasks(params)
    commit('SET_TASKS', res.data.list)
    return res
  },
  async fetchTaskDetail({ commit }, id) {
    const res = await getTaskDetail(id)
    commit('SET_CURRENT_TASK', res.data)
    return res
  },
  async updateStatus({ dispatch }, { id, data }) {
    const res = await updateTaskStatus(id, data)
    return res
  },
  async updateProgress({ dispatch }, { id, data }) {
    const res = await updateTaskProgress(id, data)
    return res
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}