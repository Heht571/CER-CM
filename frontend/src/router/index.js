import Vue from 'vue'
import VueRouter from 'vue-router'
import Layout from '@/components/common/Layout.vue'

Vue.use(VueRouter)

// 解决 Vue Router 重复导航报错问题
const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
  return originalPush.call(this, location).catch(err => {
    if (err.name !== 'NavigationDuplicated') {
      throw err
    }
  })
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: Layout,
    redirect: () => {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.role === 'admin' ? '/dashboard' : '/tasks'
    },
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Dashboard.vue'),
        meta: { title: '首页', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'rooms',
        name: 'RoomList',
        component: () => import('@/views/rooms/RoomList.vue'),
        meta: { title: '机房列表', requiresAuth: true }
      },
      {
        path: 'rooms/create',
        name: 'RoomCreate',
        component: () => import('@/views/rooms/RoomCreate.vue'),
        meta: { title: '创建机房', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'rooms/:id/edit',
        name: 'RoomEdit',
        component: () => import('@/views/rooms/RoomEdit.vue'),
        meta: { title: '编辑机房', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'rooms/:id',
        name: 'RoomDetail',
        component: () => import('@/views/rooms/RoomDetail.vue'),
        meta: { title: '机房详情', requiresAuth: true }
      },
      {
        path: 'projects/:id',
        name: 'ProjectDetail',
        component: () => import('@/views/projects/ProjectDetail.vue'),
        meta: { title: '项目详情', requiresAuth: true }
      },
      {
        path: 'tasks',
        name: 'TaskList',
        component: () => import('@/views/tasks/TaskList.vue'),
        meta: { title: '我的任务', requiresAuth: true }
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/statistics/Statistics.vue'),
        meta: { title: '统计分析', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('@/views/users/UserList.vue'),
        meta: { title: '用户管理', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'users/create',
        name: 'UserCreate',
        component: () => import('@/views/users/UserForm.vue'),
        meta: { title: '创建用户', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'users/:id/edit',
        name: 'UserEdit',
        component: () => import('@/views/users/UserForm.vue'),
        meta: { title: '编辑用户', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'emails',
        name: 'EmailList',
        component: () => import('@/views/emails/EmailList.vue'),
        meta: { title: '邮件管理', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'emails/create',
        name: 'EmailCreate',
        component: () => import('@/views/emails/EmailForm.vue'),
        meta: { title: '创建邮件', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'emails/:id/edit',
        name: 'EmailEdit',
        component: () => import('@/views/emails/EmailForm.vue'),
        meta: { title: '编辑邮件', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'emails/:id',
        name: 'EmailDetail',
        component: () => import('@/views/emails/EmailForm.vue'),
        meta: { title: '邮件详情', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'settings/email',
        name: 'EmailSettings',
        component: () => import('@/views/settings/EmailSettings.vue'),
        meta: { title: '邮件设置', requiresAuth: true, requiresAdmin: true }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/Profile.vue'),
        meta: { title: '个人中心', requiresAuth: true }
      }
    ]
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router