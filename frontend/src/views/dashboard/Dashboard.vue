<template>
  <div class="dashboard-page">
    <!-- Hero 区 - 深色背景卡片 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">建设总览</h1>
        <p class="hero-subtitle">按项目查看机房建设进度</p>
      </div>
      <div class="hero-stats">
        <div class="stat-item">
          <div class="stat-value">{{ totalProjects }}</div>
          <div class="stat-label">项目</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ totalRooms }}</div>
          <div class="stat-label">机房</div>
        </div>
        <div class="stat-item success">
          <div class="stat-value">{{ completedRooms }}</div>
          <div class="stat-label">完成</div>
        </div>
        <div class="stat-item warning" v-if="delayedTasks.length > 0">
          <div class="stat-value">{{ delayedTasks.length }}</div>
          <div class="stat-label">延期</div>
        </div>
      </div>
    </section>

    <!-- 延期任务预警 - 可展开 -->
    <section v-if="delayedTasks.length > 0" class="delayed-section">
      <div class="delayed-card" :class="{ expanded: delayedExpanded }">
        <!-- 头部（点击展开/收起） -->
        <div class="delayed-header" @click="delayedExpanded = !delayedExpanded">
          <div class="header-left">
            <i class="el-icon-warning"></i>
            <span class="header-title">延期任务</span>
            <el-tooltip content="超过计划完成日期但尚未完成的任务" placement="top">
              <i class="el-icon-question"></i>
            </el-tooltip>
          </div>
          <div class="header-right">
            <span class="delayed-count">{{ delayedTasks.length }} 个</span>
            <i :class="delayedExpanded ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" class="expand-icon"></i>
          </div>
        </div>

        <!-- 展开的任务列表 -->
        <div v-if="delayedExpanded" class="delayed-list">
          <div
            v-for="task in delayedTasks"
            :key="task.id"
            class="delayed-item"
            @click="goToRoom(task.room?.id)"
          >
            <div class="item-left">
              <div class="task-name">{{ task.name }}</div>
              <div class="room-name">{{ task.room?.name }}</div>
            </div>
            <div class="item-right">
              <span class="delay-days">延期 {{ task.delayDays }} 天</span>
              <span class="manager">{{ task.room?.manager?.real_name || '未分配' }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 项目卡片区 -->
    <section class="projects-section" v-loading="loading">
      <el-empty v-if="projects.length === 0 && !loading" description="暂无项目数据"></el-empty>

      <div class="project-grid">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          @click="goToProject(project.id)"
        >
          <!-- 项目头部 -->
          <div class="card-header">
            <div class="project-name">{{ project.name }}</div>
            <div class="project-code" v-if="project.code">{{ project.code }}</div>
          </div>

          <!-- 进度环 -->
          <div class="progress-section">
            <div class="progress-ring">
              <el-progress
                type="circle"
                :percentage="project.progress || 0"
                :width="100"
                :stroke-width="4"
              ></el-progress>
            </div>
            <div class="progress-info">
              <div class="progress-value">{{ project.progress || 0 }}%</div>
              <div class="progress-label">整体进度</div>
            </div>
          </div>

          <!-- 统计数据 -->
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-num">{{ project.stats?.total || 0 }}</span>
              <span class="stat-text">总数</span>
            </div>
            <div class="stat-item">
              <span class="stat-num accent">{{ project.stats?.inProgress || 0 }}</span>
              <span class="stat-text">建设中</span>
            </div>
            <div class="stat-item">
              <span class="stat-num success">{{ project.stats?.completed || 0 }}</span>
              <span class="stat-text">完成</span>
            </div>
          </div>

          <!-- 操作链接 -->
          <div class="card-link">
            <span>查看详情</span>
            <i class="el-icon-arrow-right"></i>
          </div>
        </div>

        <!-- 新建项目卡片 -->
        <div v-if="isAdmin" class="project-card add-card" @click="showCreateProjectDialog">
          <div class="add-icon">
            <i class="el-icon-plus"></i>
          </div>
          <div class="add-text">新建项目</div>
        </div>
      </div>
    </section>

    <!-- 新建项目对话框 -->
    <el-dialog title="新建项目" :visible.sync="createProjectVisible" width="420px">
      <el-form :model="projectForm" :rules="projectRules" ref="projectForm" label-width="80px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name" placeholder="请输入项目名称"></el-input>
        </el-form-item>
        <el-form-item label="项目编码">
          <el-input v-model="projectForm.code" placeholder="请输入项目编码（可选）"></el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="projectForm.description" type="textarea" rows="3" placeholder="请输入项目描述"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="createProjectVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateProject">创建</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getByProject, getDelayed } from '@/api/statistics'
import { createProject } from '@/api/project'
import { mapGetters } from 'vuex'

export default {
  name: 'Dashboard',
  data() {
    return {
      loading: false,
      projects: [],
      delayedTasks: [],
      delayedExpanded: false,
      creating: false,
      projectForm: {
        name: '',
        code: '',
        description: ''
      },
      projectRules: {
        name: [
          { required: true, message: '请输入项目名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapGetters('auth', ['isAdmin']),
    totalProjects() {
      return this.projects.length
    },
    totalRooms() {
      return this.projects.reduce((sum, p) => sum + (p.stats?.total || 0), 0)
    },
    completedRooms() {
      return this.projects.reduce((sum, p) => sum + (p.stats?.completed || 0), 0)
    }
  },
  created() {
    this.loadProjects()
    this.loadDelayedTasks()
  },
  methods: {
    async loadProjects() {
      this.loading = true
      try {
        const res = await getByProject()
        this.projects = res.data
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    async loadDelayedTasks() {
      try {
        const res = await getDelayed()
        this.delayedTasks = res.data
      } catch (error) {
        console.error(error)
      }
    },
    goToProject(projectId) {
      this.$router.push(`/projects/${projectId}`)
    },
    goToRoom(roomId) {
      this.$router.push(`/rooms/${roomId}`)
    },
    showCreateProjectDialog() {
      this.projectForm = { name: '', code: '', description: '' }
      this.createProjectVisible = true
    },
    async handleCreateProject() {
      this.$refs.projectForm.validate(async valid => {
        if (!valid) return

        this.creating = true
        try {
          await createProject(this.projectForm)
          this.$message.success('项目创建成功')
          this.createProjectVisible = false
          this.loadProjects()
        } catch (error) {
          console.error(error)
        } finally {
          this.creating = false
        }
      })
    }
  }
}
</script>

<style scoped>
.dashboard-page {
  min-height: 100%;
}

/* Hero 区 - 深色背景卡片 */
.hero-section {
  background: #000000;
  padding: 48px 32px;
  margin: 0 0 24px 0;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 48px;
  font-weight: 600;
  letter-spacing: -0.28px;
  line-height: 1.08;
  color: #ffffff;
  margin: 0 0 8px 0;
}

.hero-subtitle {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 21px;
  font-weight: 400;
  letter-spacing: 0.231px;
  line-height: 1.19;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.hero-stats {
  display: flex;
  gap: 32px;
}

.hero-stats .stat-item {
  text-align: center;
}

.hero-stats .stat-value {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 48px;
  font-weight: 600;
  letter-spacing: -0.28px;
  line-height: 1.08;
  color: #ffffff;
}

.hero-stats .stat-item.success .stat-value {
  color: #34c759;
}

.hero-stats .stat-item.warning .stat-value {
  color: #ff9500;
}

.hero-stats .stat-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 17px;
  letter-spacing: -0.374px;
  color: rgba(255, 255, 255, 0.6);
}

/* 延期任务区 */
.delayed-section {
  margin-bottom: 24px;
}

.delayed-card {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

.delayed-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.delayed-header:hover {
  background: rgba(0, 113, 227, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left .el-icon-warning {
  color: #ff9500;
  font-size: 20px;
}

.header-title {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.231px;
  line-height: 1.19;
  color: #1d1d1f;
}

.header-left .el-icon-question {
  color: rgba(0, 0, 0, 0.48);
  font-size: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.delayed-count {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 17px;
  letter-spacing: -0.374px;
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.12);
  padding: 4px 12px;
  border-radius: 980px;
}

.expand-icon {
  color: rgba(0, 0, 0, 0.45);
  font-size: 14px;
}

/* 延期任务列表 */
.delayed-list {
  padding: 8px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.delayed-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 149, 0, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.delayed-item:hover {
  background: rgba(255, 149, 0, 0.16);
}

.item-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-name {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 17px;
  font-weight: 500;
  letter-spacing: -0.374px;
  color: #1d1d1f;
}

.room-name {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.item-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.delay-days {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: #ff3b30;
  font-weight: 500;
}

.manager {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

/* 项目区 */
.projects-section {
  background: #f5f5f7;
  padding: 48px 24px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

/* 项目卡片 - Apple 无边框风格 */
.project-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.project-card:hover {
  transform: scale(1.02);
}

.card-header {
  margin-bottom: 20px;
}

.project-name {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.231px;
  line-height: 1.19;
  color: #1d1d1f;
}

.project-code {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
  margin-top: 4px;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.progress-ring {
  flex-shrink: 0;
}

.progress-info {
  flex: 1;
}

.progress-value {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.28px;
  line-height: 1.14;
  color: #1d1d1f;
}

.progress-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.stats-row {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
}

.stats-row .stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-row .stat-num {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 21px;
  font-weight: 600;
  letter-spacing: 0.231px;
  color: #1d1d1f;
}

.stats-row .stat-num.accent {
  color: #0071e3;
}

.stats-row .stat-num.success {
  color: #34c759;
}

.stats-row .stat-text {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.card-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 17px;
  letter-spacing: -0.374px;
  color: #0066cc;
  border-radius: 980px;
  padding: 6px 12px;
  transition: all 0.15s ease;
}

.card-link:hover {
  color: #0071e3;
  background: rgba(0, 113, 227, 0.08);
}

.card-link i {
  font-size: 12px;
}

/* 新建项目卡片 */
.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.add-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.add-icon i {
  font-size: 24px;
  color: #0071e3;
}

.add-text {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 17px;
  letter-spacing: -0.374px;
  color: rgba(0, 0, 0, 0.8);
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding: 32px 16px;
    gap: 24px;
  }

  .hero-title {
    font-size: 32px;
    letter-spacing: -0.28px;
    line-height: 1.14;
  }

  .hero-subtitle {
    font-size: 17px;
    letter-spacing: -0.374px;
    line-height: 1.47;
  }

  .hero-stats {
    justify-content: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .hero-stats .stat-value {
    font-size: 32px;
    letter-spacing: -0.28px;
    line-height: 1.14;
  }

  .hero-stats .stat-label {
    font-size: 14px;
    letter-spacing: -0.224px;
  }

  .delayed-header {
    padding: 16px;
  }

  .header-title {
    font-size: 17px;
    letter-spacing: -0.374px;
  }

  .delayed-list {
    padding: 8px 16px 12px;
  }

  .delayed-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
  }

  .item-right {
    width: 100%;
    justify-content: flex-start;
    gap: 12px;
  }

  .projects-section {
    padding: 24px 16px;
  }

  .project-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .project-card {
    padding: 20px;
  }
}
</style>