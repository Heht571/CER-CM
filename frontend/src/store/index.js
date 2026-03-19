import Vue from 'vue'
import Vuex from 'vuex'
import auth from './modules/auth'
import room from './modules/room'
import task from './modules/task'

Vue.use(Vuex)

export default new Vuex.Store({
  modules: {
    auth,
    room,
    task
  }
})