import { getRooms, getRoomDetail, getRoomTasks, getRoomProgress } from '@/api/room'

// 缓存有效期（毫秒）- 5分钟
const CACHE_TTL = 5 * 60 * 1000

const state = {
  rooms: [],
  currentRoom: null,
  roomTasks: {},
  roomProgress: null,
  // 缓存时间戳
  cache: {
    rooms: null,
    roomDetails: {}, // { roomId: timestamp }
    roomTasks: {},   // { roomId: timestamp }
    roomProgress: {} // { roomId: timestamp }
  }
}

const mutations = {
  SET_ROOMS(state, rooms) {
    state.rooms = rooms
    state.cache.rooms = Date.now()
  },
  SET_CURRENT_ROOM(state, room) {
    state.currentRoom = room
    if (room && room.id) {
      state.cache.roomDetails[room.id] = Date.now()
    }
  },
  SET_ROOM_TASKS(state, { roomId, tasks }) {
    state.roomTasks = { ...state.roomTasks, [roomId]: tasks }
    state.cache.roomTasks[roomId] = Date.now()
  },
  SET_ROOM_PROGRESS(state, { roomId, progress }) {
    state.roomProgress = { ...state.roomProgress, [roomId]: progress }
    state.cache.roomProgress[roomId] = Date.now()
  },
  CLEAR_CACHE(state) {
    state.cache = {
      rooms: null,
      roomDetails: {},
      roomTasks: {},
      roomProgress: {}
    }
  }
}

const getters = {
  // 检查缓存是否有效
  isRoomsCacheValid: state => {
    return state.cache.rooms && (Date.now() - state.cache.rooms) < CACHE_TTL
  },
  isRoomDetailCacheValid: state => id => {
    const timestamp = state.cache.roomDetails[id]
    return timestamp && (Date.now() - timestamp) < CACHE_TTL
  },
  isRoomTasksCacheValid: state => id => {
    const timestamp = state.cache.roomTasks[id]
    return timestamp && (Date.now() - timestamp) < CACHE_TTL
  },
  // 获取缓存的房间任务
  getRoomTasksCache: state => id => {
    return state.roomTasks[id] || null
  },
  // 获取缓存的进度
  getRoomProgressCache: state => id => {
    return state.roomProgress?.[id] || null
  }
}

const actions = {
  async fetchRooms({ commit, state, getters }, { force = false, params = {} } = {}) {
    // 如果有缓存且未过期，直接返回
    if (!force && getters.isRoomsCacheValid && state.rooms.length > 0) {
      return { data: { list: state.rooms }, cached: true }
    }
    const res = await getRooms(params)
    commit('SET_ROOMS', res.data.list)
    return { ...res, cached: false }
  },
  async fetchRoomDetail({ commit, state, getters }, { id, force = false } = {}) {
    // 如果有缓存且未过期
    if (!force && getters.isRoomDetailCacheValid(id) && state.currentRoom?.id === id) {
      return { data: state.currentRoom, cached: true }
    }
    const res = await getRoomDetail(id)
    commit('SET_CURRENT_ROOM', res.data)
    return { ...res, cached: false }
  },
  async fetchRoomTasks({ commit, state, getters }, { id, force = false } = {}) {
    // 如果有缓存且未过期
    if (!force && getters.isRoomTasksCacheValid(id) && state.roomTasks[id]) {
      return { data: state.roomTasks[id], cached: true }
    }
    const res = await getRoomTasks(id)
    commit('SET_ROOM_TASKS', { roomId: id, tasks: res.data })
    return { ...res, cached: false }
  },
  async fetchRoomProgress({ commit, state }, { id, force = false } = {}) {
    // 如果有缓存且未过期
    if (!force && state.cache.roomProgress[id] && state.roomProgress?.[id]) {
      const elapsed = Date.now() - state.cache.roomProgress[id]
      if (elapsed < CACHE_TTL) {
        return { data: state.roomProgress[id], cached: true }
      }
    }
    const res = await getRoomProgress(id)
    commit('SET_ROOM_PROGRESS', { roomId: id, progress: res.data })
    return { ...res, cached: false }
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