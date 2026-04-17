<template>
  <div class="project-detail-page">
    <!-- Hero 区 - 深色背景卡片 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">{{ project.name }}</h1>
        <p class="hero-subtitle" v-if="project.code">{{ project.code }}</p>
      </div>
      <div class="hero-stats">
        <div class="stat-item">
          <div class="stat-value">{{ projectStats.total || 0 }}</div>
          <div class="stat-label">机房</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ projectStats.progress || 0 }}%</div>
          <div class="stat-label">进度</div>
        </div>
        <div class="stat-item warning" v-if="delayedTasks.length > 0">
          <div class="stat-value">{{ delayedTasks.length }}</div>
          <div class="stat-label">延期</div>
        </div>
      </div>
      <div class="hero-actions" v-if="isAdmin">
        <el-button type="primary" class="hero-btn" @click="goToCreateRoom">新建机房</el-button>
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

    <!-- 负责人分组 -->
    <section class="managers-section" v-loading="loading">
      <el-empty v-if="managerStats.length === 0 && !loading" description="该项目暂无机房"></el-empty>

      <div class="manager-list">
        <div
          v-for="manager in managerStats"
          :key="manager.id || 'unassigned'"
          class="manager-card"
          :class="{ expanded: expandedManager === manager.id }"
        >
          <!-- 负责人头部 -->
          <div class="manager-header" @click="toggleExpand(manager.id)">
            <div class="manager-left">
              <div class="manager-avatar">
                <i class="el-icon-user"></i>
              </div>
              <div class="manager-meta">
                <div class="manager-name">{{ manager.name }}</div>
                <div class="manager-dept" v-if="manager.department">{{ manager.department }}</div>
              </div>
            </div>
            <div class="manager-center">
              <div class="progress-mini">
                <span class="progress-num">{{ manager.stats?.avgProgress || 0 }}%</span>
                <span class="progress-label">平均进度</span>
              </div>
            </div>
            <div class="manager-right">
              <span class="badge total">{{ manager.stats?.total || 0 }} 个机房</span>
              <span class="badge completed" v-if="manager.stats?.completed">{{ manager.stats.completed }} 完成</span>
              <i :class="expandedManager === manager.id ? 'el-icon-arrow-up' : 'el-icon-arrow-down'" class="expand-icon"></i>
            </div>
          </div>

          <!-- 机房列表 -->
          <div v-if="expandedManager === manager.id" class="room-list">
            <div
              v-for="room in manager.rooms"
              :key="room.id"
              class="room-card"
              @click="goToRoom(room.id)"
            >
              <div class="room-left">
                <div class="room-status-dot" :class="room.status"></div>
                <span class="room-name">{{ room.name }}</span>
              </div>
              <div class="room-center">
                <span class="room-status">{{ getStatusText(room.status) }}</span>
              </div>
              <div class="room-right">
                <span class="room-progress">{{ room.progress || 0 }}%</span>
                <i class="el-icon-arrow-right"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 编辑项目对话框 -->
    <el-dialog title="编辑项目" :visible.sync="editProjectVisible" width="420px">
      <el-form :model="projectForm" :rules="projectRules" ref="projectForm" label-width="80px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name"></el-input>
        </el-form-item>
        <el-form-item label="项目编码">
          <el-input v-model="projectForm.code"></el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="projectForm.description" type="textarea" rows="3"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="editProjectVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleUpdateProject">保存</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getProjectDetail, updateProject } from '@/api/project'
import { getByManager } from '@/api/statistics'
import { getDelayed } from '@/api/statistics'
import { getRoomStatusText } from '@/utils'
import { mapGetters } from 'vuex'

export default {
  name: 'ProjectDetail',
  data() {
    return {
      loading: false,
      projectId: null,
      project: {},
      projectStats: { total: 0, progress: 0 },
      managerStats: [],
      delayedTasks: [],
      delayedExpanded: false,
      expandedManager: null,
      editProjectVisible: false,
      saving: false,
      projectForm: {
        name: '',
        code: '',
        description: ''
      },
      projectRules: {
        name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }]
      }
    }
  },
  computed: {
    ...mapGetters('auth', ['isAdmin'])
  },
  created() {
    this.projectId = this.$route.params.id
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const projectRes = await getProjectDetail(this.projectId)
        this.project = projectRes.data

        const managerRes = await getByManager({ project_id: this.projectId })
        this.managerStats = managerRes.data

        const total = this.managerStats.reduce((sum, m) => sum + (m.stats?.total || 0), 0)
        const avgProgress = this.managerStats.reduce((sum, m) => sum + (m.stats?.avgProgress || 0), 0)
        this.projectStats = {
          total,
          progress: total > 0 ? Math.round(avgProgress / this.managerStats.length) : 0
        }

        const delayedRes = await getDelayed({ project_id: this.projectId })
        this.delayedTasks = delayedRes.data
      } catch (error) {
        console.error(error)
        this.$message.error('加载失败')
        this.$router.push('/dashboard')
      } finally {
        this.loading = false
      }
    },
    toggleExpand(managerId) {
      if (this.expandedManager === managerId) {
        this.expandedManager = null
      } else {
        this.expandedManager = managerId
      }
    },
    getStatusText(status) {
      return getRoomStatusText(status)
    },
    goToRoom(roomId) {
      this.$router.push(`/rooms/${roomId}`)
    },
    goToCreateRoom() {
      this.$router.push(`/rooms/create?project=${this.projectId}`)
    },
    showEditProject() {
      this.projectForm = {
        name: this.project.name,
        code: this.project.code || '',
        description: this.project.description || ''
      }
      this.editProjectVisible = true
    },
    async handleUpdateProject() {
      this.$refs.projectForm.validate(async valid => {
        if (!valid) return

        this.saving = true
        try {
          await updateProject(this.projectId, this.projectForm)
          this.$message.success('更新成功')
          this.editProjectVisible = false
          this.loadData()
        } catch (error) {
          console.error(error)
        } finally {
          this.saving = false
        }
      })
    }
  }
}
</script>

<style scoped>
.project-detail-page {
  min-height: 100%;
}

/* Hero 区 - 深色背景卡片 */
.hero-section {
  background: #000000;
  padding: 32px 24px;
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
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: #ffffff;
  margin: 0 0 8px 0;
}

.hero-subtitle {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.6);
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
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: #ffffff;
}

.hero-stats .stat-item.warning .stat-value {
  color: #ff9500;
}

.hero-stats .stat-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.6);
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hero-btn {
  border-radius: 980px;
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
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
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
  font-size: 14px;
  letter-spacing: 0;
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
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
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

/* 负责人区 */
.managers-section {
  background: #f5f5f7;
  padding: 24px;
}

.manager-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.manager-card {
  background: #ffffff;
  border-radius: 12px;
}

.manager-card.expanded {
  background: rgba(0, 113, 227, 0.04);
}

.manager-header {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  padding: 20px 24px;
}

.manager-header:hover {
  background: rgba(0, 113, 227, 0.08);
}

.manager-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.manager-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0071e3;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 16px;
}

.manager-meta {
  flex: 1;
}

.manager-name {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
  color: #1d1d1f;
}

.manager-dept {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.manager-center {
  display: flex;
  align-items: center;
}

.progress-mini {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-num {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  color: #1d1d1f;
}

.progress-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.manager-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  padding: 4px 12px;
  border-radius: 980px;
}

.badge.total {
  background: #f5f5f7;
  color: rgba(0, 0, 0, 0.8);
}

.badge.completed {
  background: rgba(52, 199, 89, 0.12);
  color: #34c759;
}

.expand-icon {
  color: rgba(0, 0, 0, 0.45);
}

/* 机房列表 */
.room-list {
  padding: 8px 24px 16px;
}

.room-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.room-card:hover {
  background: rgba(0, 113, 227, 0.08);
}

.room-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.room-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.room-status-dot.planning { background: rgba(0, 0, 0, 0.45); }
.room-status-dot.in_progress { background: #0071e3; }
.room-status-dot.completed { background: #34c759; }
.room-status-dot.paused { background: #ff9500; }

.room-name {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: #1d1d1f;
}

.room-center {
  display: flex;
  align-items: center;
}

.room-status {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.room-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-progress {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  color: #1d1d1f;
}

.room-card .el-icon-arrow-right {
  color: rgba(0, 0, 0, 0.25);
  font-size: 12px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding: 24px 16px;
    gap: 20px;
  }

  .hero-title {
    font-size: 24px;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .hero-subtitle {
    font-size: 14px;
    letter-spacing: 0;
    line-height: 1.5;
  }

  .hero-stats {
    justify-content: center;
    flex-wrap: wrap;
    gap: 16px;
  }

  .hero-stats .stat-value {
    font-size: 24px;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .hero-stats .stat-label {
    font-size: 12px;
    letter-spacing: 0;
  }

  .hero-actions {
    justify-content: center;
  }

  .delayed-header {
    padding: 16px;
  }

  .header-title {
    font-size: 14px;
    letter-spacing: 0;
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

  .managers-section {
    padding: 16px;
  }

  .manager-header {
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
  }

  .manager-left {
    flex: 1;
    min-width: 0;
  }

  .manager-center {
    width: 100%;
    margin-top: 8px;
    justify-content: flex-start;
  }

  .manager-right {
    width: 100%;
    justify-content: flex-start;
    margin-top: 8px;
  }

  .room-card {
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px;
  }

  .room-left {
    flex: 1;
    min-width: 0;
  }

  .room-right {
    width: 100%;
    justify-content: flex-start;
    gap: 16px;
  }
}
</style>