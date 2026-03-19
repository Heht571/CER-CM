import { getRooms, getRoomDetail, getRoomTasks, getRoomProgress } from '@/api/room'

const state = {
  rooms: [],
  currentRoom: null,
  roomTasks: {},
  roomProgress: null
}

const mutations = {
  SET_ROOMS(state, rooms) {
    state.rooms = rooms
  },
  SET_CURRENT_ROOM(state, room) {
    state.currentRoom = room
  },
  SET_ROOM_TASKS(state, { roomId, tasks }) {
    state.roomTasks = { ...state.roomTasks, [roomId]: tasks }
  },
  SET_ROOM_PROGRESS(state, progress) {
    state.roomProgress = progress
  }
}

const actions = {
  async fetchRooms({ commit }, params) {
    const res = await getRooms(params)
    commit('SET_ROOMS', res.data.list)
    return res
  },
  async fetchRoomDetail({ commit }, id) {
    const res = await getRoomDetail(id)
    commit('SET_CURRENT_ROOM', res.data)
    return res
  },
  async fetchRoomTasks({ commit }, id) {
    const res = await getRoomTasks(id)
    commit('SET_ROOM_TASKS', { roomId: id, tasks: res.data })
    return res
  },
  async fetchRoomProgress({ commit }, id) {
    const res = await getRoomProgress(id)
    commit('SET_ROOM_PROGRESS', res.data)
    return res
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}