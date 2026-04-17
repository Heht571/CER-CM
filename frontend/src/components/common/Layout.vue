<template>
  <div class="app-layout">
    <!-- 移动端遮罩 -->
    <div
      v-if="isMobile && drawerVisible"
      class="mobile-overlay"
      @click="closeDrawer"
    ></div>

    <!-- 侧边栏 - Apple Dark Surface 风格 -->
    <aside v-if="!isMobile" class="sidebar" :class="{ collapsed: isCollapse }">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="logo-icon">
          <svg viewBox="0 0 32 32" class="logo-svg">
            <rect x="4" y="4" width="24" height="24" rx="6" fill="#0071e3"/>
            <path d="M10 16 L16 10 L22 16 L16 22 Z" fill="none" stroke="white" stroke-width="1.5"/>
            <circle cx="16" cy="16" r="2" fill="white"/>
          </svg>
        </div>
        <span v-if="!isCollapse" class="logo-text">机房监控</span>
      </div>

      <!-- 导航菜单 -->
      <nav class="sidebar-nav">
        <router-link v-if="isAdmin" to="/dashboard" class="nav-item" :class="{ active: activeMenu === '/dashboard' }">
          <div class="nav-icon">
            <i class="el-icon-s-home"></i>
          </div>
          <span v-if="!isCollapse" class="nav-label">首页</span>
        </router-link>
        <router-link to="/rooms" class="nav-item" :class="{ active: activeMenu === '/rooms' }">
          <div class="nav-icon">
            <i class="el-icon-office-building"></i>
          </div>
          <span v-if="!isCollapse" class="nav-label">机房列表</span>
        </router-link>
        <router-link to="/tasks" class="nav-item" :class="{ active: activeMenu === '/tasks' }">
          <div class="nav-icon">
            <i class="el-icon-s-check"></i>
          </div>
          <span v-if="!isCollapse" class="nav-label">我的任务</span>
        </router-link>

        <div v-if="isAdmin && !isCollapse" class="nav-divider"></div>

        <router-link v-if="isAdmin" to="/statistics" class="nav-item" :class="{ active: activeMenu === '/statistics' }">
          <div class="nav-icon">
            <i class="el-icon-s-data"></i>
          </div>
          <span v-if="!isCollapse" class="nav-label">统计分析</span>
        </router-link>
        <router-link v-if="isAdmin" to="/users" class="nav-item" :class="{ active: activeMenu === '/users' }">
          <div class="nav-icon">
            <i class="el-icon-s-custom"></i>
          </div>
          <span v-if="!isCollapse" class="nav-label">用户管理</span>
        </router-link>
        <router-link v-if="isAdmin" to="/emails" class="nav-item" :class="{ active: activeMenu === '/emails' }">
          <div class="nav-icon">
            <i class="el-icon-message"></i>
          </div>
          <span v-if="!isCollapse" class="nav-label">邮件管理</span>
        </router-link>
        <router-link v-if="isAdmin" to="/settings/email" class="nav-item" :class="{ active: activeMenu === '/settings/email' }">
          <div class="nav-icon">
            <i class="el-icon-setting"></i>
          </div>
          <span v-if="!isCollapse" class="nav-label">系统设置</span>
        </router-link>
      </nav>

      <!-- 折叠按钮 -->
      <div class="sidebar-footer">
        <div class="collapse-btn" @click="toggleCollapse">
          <i :class="isCollapse ? 'el-icon-s-unfold' : 'el-icon-s-fold'"></i>
        </div>
      </div>
    </aside>

    <!-- 移动端抽屉 -->
    <el-drawer
      v-if="isMobile"
      :visible.sync="drawerVisible"
      direction="ltr"
      :with-header="false"
      size="260px"
      custom-class="mobile-drawer"
    >
      <aside class="sidebar mobile-sidebar">
        <div class="sidebar-logo">
          <div class="logo-icon">
            <svg viewBox="0 0 32 32" class="logo-svg">
              <rect x="4" y="4" width="24" height="24" rx="6" fill="#0071e3"/>
              <path d="M10 16 L16 10 L22 16 L16 22 Z" fill="none" stroke="white" stroke-width="1.5"/>
              <circle cx="16" cy="16" r="2" fill="white"/>
            </svg>
          </div>
          <span class="logo-text">机房监控</span>
        </div>

        <nav class="sidebar-nav">
          <router-link v-if="isAdmin" to="/dashboard" class="nav-item" :class="{ active: activeMenu === '/dashboard' }" @click.native="closeDrawer">
            <div class="nav-icon">
              <i class="el-icon-s-home"></i>
            </div>
            <span class="nav-label">首页</span>
          </router-link>
          <router-link to="/rooms" class="nav-item" :class="{ active: activeMenu === '/rooms' }" @click.native="closeDrawer">
            <div class="nav-icon">
              <i class="el-icon-office-building"></i>
            </div>
            <span class="nav-label">机房列表</span>
          </router-link>
          <router-link to="/tasks" class="nav-item" :class="{ active: activeMenu === '/tasks' }" @click.native="closeDrawer">
            <div class="nav-icon">
              <i class="el-icon-s-check"></i>
            </div>
            <span class="nav-label">我的任务</span>
          </router-link>

          <div v-if="isAdmin" class="nav-divider"></div>

          <router-link v-if="isAdmin" to="/statistics" class="nav-item" :class="{ active: activeMenu === '/statistics' }" @click.native="closeDrawer">
            <div class="nav-icon">
              <i class="el-icon-s-data"></i>
            </div>
            <span class="nav-label">统计分析</span>
          </router-link>
          <router-link v-if="isAdmin" to="/users" class="nav-item" :class="{ active: activeMenu === '/users' }" @click.native="closeDrawer">
            <div class="nav-icon">
              <i class="el-icon-s-custom"></i>
            </div>
            <span class="nav-label">用户管理</span>
          </router-link>
          <router-link v-if="isAdmin" to="/emails" class="nav-item" :class="{ active: activeMenu === '/emails' }" @click.native="closeDrawer">
            <div class="nav-icon">
              <i class="el-icon-message"></i>
            </div>
            <span class="nav-label">邮件管理</span>
          </router-link>
          <router-link v-if="isAdmin" to="/settings/email" class="nav-item" :class="{ active: activeMenu === '/settings/email' }" @click.native="closeDrawer">
            <div class="nav-icon">
              <i class="el-icon-setting"></i>
            </div>
            <span class="nav-label">系统设置</span>
          </router-link>
        </nav>
      </aside>
    </el-drawer>

    <!-- 主内容区 -->
    <main class="main-content">
      <!-- 顶部栏 - Apple Glass Effect -->
      <header class="topbar">
        <div class="topbar-left">
          <!-- 移动端菜单按钮 -->
          <button v-if="isMobile" class="menu-btn" @click="openDrawer">
            <i class="el-icon-menu"></i>
          </button>
          <!-- 面包屑 -->
          <el-breadcrumb v-if="!isMobile" separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title !== '首页'">
              {{ $route.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
          <!-- 移动端标题 -->
          <h1 v-if="isMobile" class="page-title">{{ $route.meta.title || '首页' }}</h1>
        </div>

        <div class="topbar-right">
          <el-dropdown @command="handleCommand" trigger="click" class="user-dropdown">
            <div class="user-trigger">
              <div class="user-avatar">
                <i class="el-icon-user"></i>
              </div>
              <span v-if="!isMobile" class="user-name">{{ user.real_name }}</span>
              <i class="el-icon-arrow-down"></i>
            </div>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="profile">
                <i class="el-icon-user"></i> 个人中心
              </el-dropdown-item>
              <el-dropdown-item command="logout" divided>
                <i class="el-icon-switch-button"></i> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </header>

      <!-- 页面内容 -->
      <div class="page-content">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'Layout',
  data() {
    return {
      isCollapse: false,
      isMobile: false,
      drawerVisible: false
    }
  },
  computed: {
    ...mapGetters('auth', ['currentUser', 'isAdmin']),
    user() {
      return this.currentUser
    },
    activeMenu() {
      return this.$route.path
    }
  },
  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.checkMobile)
  },
  methods: {
    ...mapActions('auth', ['logout']),
    checkMobile() {
      this.isMobile = window.innerWidth < 768
      if (!this.isMobile) {
        this.drawerVisible = false
      }
    },
    toggleCollapse() {
      this.isCollapse = !this.isCollapse
    },
    openDrawer() {
      this.drawerVisible = true
    },
    closeDrawer() {
      this.drawerVisible = false
    },
    handleCommand(command) {
      if (command === 'logout') {
        this.$confirm('确定要退出登录吗?', '提示', {
          type: 'warning',
          confirmButtonText: '退出',
          cancelButtonText: '取消'
        }).then(() => {
          this.logout()
        }).catch(() => {})
      } else if (command === 'profile') {
        this.$router.push('/profile')
      }
    }
  }
}
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: #f5f5f7;
}

/* 侧边栏 - Apple Dark Surface 风格 */
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: #1d1d1f;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: relative;
}

.sidebar.collapsed {
  width: 72px;
}

.mobile-sidebar {
  width: 240px;
}

/* Logo */
.sidebar-logo {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 20px;
}

.logo-icon {
  width: 32px;
  height: 32px;
}

.logo-svg {
  width: 100%;
  height: 100%;
}

.logo-text {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.374px;
  color: #ffffff;
}

/* 导航 */
.sidebar-nav {
  flex: 1;
  padding: 8px 12px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.15s ease;
  border-radius: 8px;
  margin-bottom: 4px;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-item.active {
  background: rgba(0, 113, 227, 0.24);
  color: #ffffff;
}

.nav-item.active .nav-icon {
  color: #2997ff;
}

.nav-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.6);
}

.nav-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(255, 255, 255, 0.8);
}

.nav-item.active .nav-label {
  color: #ffffff;
}

.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.12);
  margin: 12px 8px;
}

/* 底部折叠 */
.sidebar-footer {
  padding: 12px;
}

.collapse-btn {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.48);
  transition: all 0.15s ease;
  border-radius: 8px;
}

.collapse-btn:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.08);
}

/* 主内容 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* 顶部栏 - Apple Glass Effect */
.topbar {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #ffffff;
  cursor: pointer;
  font-size: 18px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.menu-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.page-title {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.374px;
  color: #ffffff;
}

.topbar-right {
  display: flex;
  align-items: center;
}

/* 用户下拉 */
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.user-trigger:hover {
  background: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0071e3;
  border-radius: 50%;
  color: #ffffff;
  font-size: 14px;
}

.user-name {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 12px;
  letter-spacing: normal;
  color: #ffffff;
}

.user-trigger .el-icon-arrow-down {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
}

/* 面包屑样式覆盖 */
.topbar .el-breadcrumb__inner,
.topbar .el-breadcrumb__inner a,
.topbar .el-breadcrumb__separator {
  color: rgba(255, 255, 255, 0.6);
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 12px;
  letter-spacing: normal;
}

.topbar .el-breadcrumb__inner.is-link:hover {
  color: #2997ff;
}

/* 页面内容 */
.page-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f5f5f7;
}

/* 移动端遮罩 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .topbar {
    height: 48px;
    padding: 0 12px;
  }

  .page-content {
    padding: 16px;
  }

  .sidebar-logo {
    height: 48px;
    padding: 0 16px;
  }
}
</style>

<style>
/* 移动端抽屉样式 */
.mobile-drawer {
  background: #1d1d1f !important;
}

.mobile-drawer .el-drawer__body {
  padding: 0;
  height: 100%;
  overflow: hidden;
}
</style>