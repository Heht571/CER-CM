<template>
  <el-container class="layout-container">
    <!-- 移动端遮罩 -->
    <div
      v-if="isMobile && drawerVisible"
      class="mobile-mask"
      @click="closeDrawer"
    ></div>

    <!-- 侧边栏 - PC端固定，移动端抽屉 -->
    <el-aside
      v-if="!isMobile"
      :width="isCollapse ? '64px' : '220px'"
      class="sidebar"
    >
      <div class="logo">
        <span v-if="!isCollapse">机房建设监控</span>
        <span v-else>JF</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/dashboard">
          <i class="el-icon-s-home"></i>
          <span slot="title">首页</span>
        </el-menu-item>
        <el-menu-item index="/rooms">
          <i class="el-icon-office-building"></i>
          <span slot="title">机房列表</span>
        </el-menu-item>
        <el-menu-item index="/tasks">
          <i class="el-icon-s-check"></i>
          <span slot="title">我的任务</span>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/statistics">
          <i class="el-icon-s-data"></i>
          <span slot="title">统计分析</span>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/users">
          <i class="el-icon-s-custom"></i>
          <span slot="title">用户管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 移动端抽屉菜单 -->
    <el-drawer
      v-if="isMobile"
      :visible.sync="drawerVisible"
      direction="ltr"
      :with-header="false"
      size="220px"
      custom-class="mobile-drawer"
    >
      <div class="sidebar mobile-sidebar">
        <div class="logo">机房建设监控</div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
          @select="handleMenuSelect"
        >
          <el-menu-item index="/dashboard">
            <i class="el-icon-s-home"></i>
            <span slot="title">首页</span>
          </el-menu-item>
          <el-menu-item index="/rooms">
            <i class="el-icon-office-building"></i>
            <span slot="title">机房列表</span>
          </el-menu-item>
          <el-menu-item index="/tasks">
            <i class="el-icon-s-check"></i>
            <span slot="title">我的任务</span>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/statistics">
            <i class="el-icon-s-data"></i>
            <span slot="title">统计分析</span>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/users">
            <i class="el-icon-s-custom"></i>
            <span slot="title">用户管理</span>
          </el-menu-item>
        </el-menu>
      </div>
    </el-drawer>

    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header" :class="{ 'mobile-header': isMobile }">
        <div class="header-left">
          <!-- 移动端菜单按钮 -->
          <i
            v-if="isMobile"
            class="el-icon-s-unfold collapse-btn"
            @click="openDrawer"
          ></i>
          <!-- PC端折叠按钮 -->
          <i
            v-else
            :class="isCollapse ? 'el-icon-s-unfold' : 'el-icon-s-fold'"
            class="collapse-btn"
            @click="toggleCollapse"
          ></i>
          <!-- 移动端隐藏面包屑 -->
          <el-breadcrumb v-if="!isMobile" separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title !== '首页'">
              {{ $route.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
          <!-- 移动端显示标题 -->
          <span v-else class="mobile-title">{{ $route.meta.title || '首页' }}</span>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand" trigger="click">
            <span class="user-info">
              <i class="el-icon-user-solid"></i>
              <span v-if="!isMobile">{{ user.real_name }}</span>
              <i class="el-icon-arrow-down el-icon--right"></i>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main" :class="{ 'mobile-main': isMobile }">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
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
    handleMenuSelect() {
      // 移动端选择菜单后关闭抽屉
      this.drawerVisible = false
    },
    handleCommand(command) {
      if (command === 'logout') {
        this.$confirm('确定要退出登录吗?', '提示', {
          type: 'warning'
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
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  transition: width 0.3s;
  height: 100vh;
  overflow-y: auto;
}

.mobile-sidebar {
  width: 220px;
}

.logo {
  height: 60px;
  line-height: 60px;
  text-align: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background-color: #263445;
}

.el-menu {
  border-right: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  padding: 0 20px;
  height: 60px !important;
}

.mobile-header {
  padding: 0 15px;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  margin-right: 15px;
  color: #303133;
}

.mobile-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.user-info {
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #303133;
}

.main {
  background: #f0f2f5;
  padding: 20px;
}

.mobile-main {
  padding: 10px;
}

/* 移动端遮罩 */
.mobile-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}

/* 移动端底部导航 */
.mobile-bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 15px;
  color: #909399;
  text-decoration: none;
}

.nav-item.active {
  color: #409EFF;
}

.nav-item i {
  font-size: 20px;
  margin-bottom: 4px;
}

.nav-item span {
  font-size: 12px;
}
</style>

<style>
/* 全局移动端抽屉样式 */
.mobile-drawer {
  background: #304156 !important;
}

.mobile-drawer .el-drawer__body {
  padding: 0;
  height: 100%;
}
</style>