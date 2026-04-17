<template>
  <div class="task-page">
    <!-- Hero 区 - 深色背景 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">我的任务</h1>
        <p class="hero-subtitle">查看分配给您的机房建设任务</p>
      </div>
      <div class="hero-stats">
        <div class="stat-item">
          <div class="stat-value">{{ totalTasks }}</div>
          <div class="stat-label">总任务</div>
        </div>
        <div class="stat-item success">
          <div class="stat-value">{{ completedTasks }}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-item warning">
          <div class="stat-value">{{ delayedTasks }}</div>
          <div class="stat-label">延期</div>
        </div>
      </div>
    </section>

    <!-- 搜索栏 - 浅色背景 -->
    <section class="search-section">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索机房名称或编码"
          clearable
          @clear="handleSearch"
          @keyup.enter.native="handleSearch"
          style="width: 280px;"
        ></el-input>
        <el-select
          v-model="filterStatus"
          placeholder="机房状态"
          clearable
          style="width: 140px;"
          @change="handleSearch"
        >
          <el-option label="规划中" value="planning"></el-option>
          <el-option label="建设中" value="in_progress"></el-option>
          <el-option label="已完成" value="completed"></el-option>
          <el-option label="已暂停" value="paused"></el-option>
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
      </div>
    </section>

    <!-- 任务列表 -->
    <section class="tasks-section" v-loading="loading">
      <el-empty v-if="filteredRoomTasks.length === 0 && !loading" description="暂无分配任务"></el-empty>

      <div class="task-list">
        <div v-for="item in filteredRoomTasks" :key="item.room.id" class="room-card">
          <!-- 机房头部 -->
          <div class="room-header" @click="toggleRoom(item.room.id)">
            <div class="room-left">
              <i :class="expandedRooms.includes(item.room.id) ? 'el-icon-arrow-down' : 'el-icon-arrow-right'" class="expand-icon"></i>
              <span class="room-name">{{ item.room.name }}</span>
              <span class="construction-type">{{ getConstructionTypeText(item.room.construction_type) }}</span>
            </div>
            <div class="room-right">
              <div class="progress-mini">
                <span class="progress-num">{{ item.overallProgress }}%</span>
              </div>
              <span v-if="item.delayedTasks > 0" class="delayed-badge">{{ item.delayedTasks }}延期</span>
              <el-tag size="small" :type="getRoomStatusType(item.room.status)">
                {{ getRoomStatusText(item.room.status) }}
              </el-tag>
            </div>
          </div>

          <!-- 展开的任务列表 -->
          <div v-if="expandedRooms.includes(item.room.id)" class="task-section">
            <div class="task-header">
              <span class="task-label">当前任务</span>
              <el-button type="text" size="small" @click="goToRoom(item.room.id)">
                查看详情 <i class="el-icon-arrow-right"></i>
              </el-button>
            </div>

            <div v-if="item.currentTasks.length > 0" class="task-items">
              <div
                v-for="task in item.currentTasks"
                :key="task.id"
                class="task-row"
                :class="{ 'waiting-task': !task.canStart }"
              >
                <div class="task-content">
                  <span class="task-name">{{ task.name }}</span>
                  <span class="task-date">
                    {{ formatDate(task.planned_start_date) }} ~ {{ formatDate(task.planned_end_date) }}
                  </span>
                </div>
                <div class="task-meta">
                  <el-tag v-if="!task.canStart" size="mini" type="info">等待前置</el-tag>
                  <el-tag size="mini" :type="getTaskStatusType(task.status)">
                    {{ getTaskStatusText(task.status) }}
                  </el-tag>
                </div>
                <div class="task-action">
                  <el-button
                    type="primary"
                    size="mini"
                    :disabled="!task.canStart || isTaskEditingLocked(task)"
                    @click.stop="showUpdateDialog(task)"
                  >
                    更新进度
                  </el-button>
                </div>
              </div>
            </div>
            <div v-else class="task-completed">
              <span class="completed-all"><i class="el-icon-success"></i> 所有任务已完成</span>
            </div>

            <!-- 任务统计 -->
            <div class="task-stats">
              <span>总 {{ item.totalTasks }}</span>
              <span>完成 {{ item.completedTasks }}</span>
              <span>进行 {{ item.inProgressTasks }}</span>
              <span v-if="item.delayedTasks > 0" class="delayed">延期 {{ item.delayedTasks }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 无搜索结果 -->
      <div v-if="filteredRoomTasks.length === 0 && roomTasks.length > 0" class="no-result">
        <span>未找到匹配的机房</span>
        <el-button type="text" @click="clearSearch">清除筛选</el-button>
      </div>
    </section>

    <!-- 更新任务对话框 -->
    <el-dialog title="更新任务进度" :visible.sync="dialogVisible" width="420px">
      <el-form :model="taskForm" label-width="80px">
        <el-form-item label="任务名称">
          <span>{{ currentTask?.name }}</span>
        </el-form-item>
        <el-form-item label="所属机房">
          <span>{{ currentTask?.room?.name }}</span>
        </el-form-item>
        <el-form-item label="进度">
          <el-slider v-model="taskForm.progress" :min="0" :max="100" show-input></el-slider>
        </el-form-item>
        <el-form-item label="状态">
          <el-tag :type="getAutoStatusType()" size="small">
            {{ getAutoStatusText() }}
          </el-tag>
          <span class="status-hint">（根据进度自动计算）</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="taskForm.remark" type="textarea" rows="3"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getMyRoomTasks, updateTask } from '@/api/task'
import {
  getTaskStatusText,
  getTaskStatusType,
  getRoomStatusText,
  getRoomStatusType,
  getConstructionTypeText,
  formatDate
} from '@/utils'

export default {
  name: 'TaskList',
  data() {
    return {
      loading: false,
      roomTasks: [],
      filteredRoomTasks: [],
      expandedRooms: [],
      searchKeyword: '',
      filterStatus: '',
      dialogVisible: false,
      currentTask: null,
      taskForm: {
        progress: 0,
        remark: ''
      }
    }
  },
  computed: {
    totalTasks() {
      return this.roomTasks.reduce((sum, item) => sum + item.totalTasks, 0)
    },
    completedTasks() {
      return this.roomTasks.reduce((sum, item) => sum + item.completedTasks, 0)
    },
    delayedTasks() {
      return this.roomTasks.reduce((sum, item) => sum + item.delayedTasks, 0)
    }
  },
  created() {
    this.loadRoomTasks()
  },
  methods: {
    async loadRoomTasks() {
      this.loading = true
      try {
        const res = await getMyRoomTasks()
        this.roomTasks = res.data
        this.filteredRoomTasks = res.data
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      const keyword = this.searchKeyword.trim().toLowerCase()
      const status = this.filterStatus

      this.filteredRoomTasks = this.roomTasks.filter(item => {
        if (status && item.room.status !== status) return false
        if (keyword) {
          const nameMatch = item.room.name.toLowerCase().includes(keyword)
          const codeMatch = item.room.code && item.room.code.toLowerCase().includes(keyword)
          return nameMatch || codeMatch
        }
        return true
      })
    },
    clearSearch() {
      this.searchKeyword = ''
      this.filterStatus = ''
      this.filteredRoomTasks = this.roomTasks
    },
    toggleRoom(roomId) {
      const index = this.expandedRooms.indexOf(roomId)
      if (index > -1) {
        this.expandedRooms.splice(index, 1)
      } else {
        this.expandedRooms.push(roomId)
      }
    },
    showUpdateDialog(task) {
      if (!task.canStart) {
        this.$message.warning('该任务的前置任务尚未完成，暂无法更新进度')
        return
      }
      if (this.isTaskEditingLocked(task)) {
        this.$message.warning(
          task.room?.status === 'paused'
            ? '机房已暂停，请先恢复机房状态后再更新任务'
            : '机房已完成，请先调整机房状态后再更新任务'
        )
        return
      }

      this.currentTask = task
      this.taskForm = {
        progress: task.progress,
        remark: ''
      }
      this.dialogVisible = true
    },
    getAutoStatusText() {
      const progress = this.taskForm.progress
      if (progress === 100) return '已完成'
      if (progress > 0) return '进行中'
      return '未开始'
    },
    getAutoStatusType() {
      const progress = this.taskForm.progress
      if (progress === 100) return 'success'
      if (progress > 0) return 'warning'
      return 'info'
    },
    async handleUpdate() {
      if (!this.currentTask.canStart) {
        this.$message.warning('该任务的前置任务尚未完成')
        return
      }
      if (this.isTaskEditingLocked(this.currentTask)) {
        this.$message.warning(
          this.currentTask?.room?.status === 'paused'
            ? '机房已暂停'
            : '机房已完成'
        )
        return
      }

      if (this.taskForm.progress === this.currentTask.progress && !this.taskForm.remark) {
        this.$message.info('没有任何变更')
        return
      }

      try {
        await updateTask(this.currentTask.id, {
          progress: this.taskForm.progress,
          remark: this.taskForm.remark
        })
        this.$message.success('更新成功')
        this.dialogVisible = false
        this.loadRoomTasks()
      } catch (error) {
        console.error(error)
      }
    },
    isTaskEditingLocked(task) {
      return ['paused', 'completed'].includes(task?.room?.status)
    },
    goToRoom(roomId) {
      this.$router.push(`/rooms/${roomId}`)
    },
    getTaskStatusText,
    getTaskStatusType,
    getRoomStatusText,
    getRoomStatusType,
    getConstructionTypeText,
    formatDate
  }
}
</script>

<style scoped>
.task-page {
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
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
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
  font-size: 14px;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.6);
}

/* 搜索区 */
.search-section {
  background: #f5f5f7;
  padding: 16px 24px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 任务列表区 */
.tasks-section {
  background: #f5f5f7;
  padding: 24px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 机房卡片 - Apple 无边框风格 */
.room-card {
  background: #ffffff;
  border-radius: 12px;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 20px 24px;
  transition: background 0.15s ease;
}

.room-header:hover {
  background: rgba(0, 113, 227, 0.08);
}

.expand-icon {
  color: rgba(0, 0, 0, 0.45);
  margin-right: 12px;
  transition: transform 0.15s ease;
}

.room-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.room-name {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
  color: #1d1d1f;
}

.construction-type {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
  background: #f5f5f7;
  padding: 4px 12px;
  border-radius: 980px;
}

.room-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-mini {
  display: flex;
  align-items: center;
}

.progress-num {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  color: #1d1d1f;
}

.delayed-badge {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: #ff3b30;
  background: rgba(255, 59, 48, 0.12);
  padding: 4px 12px;
  border-radius: 980px;
}

/* 任务区域 */
.task-section {
  padding: 20px 24px;
  background: #f5f5f7;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.task-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  color: rgba(0, 0, 0, 0.8);
}

.task-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.task-row:hover {
  background: rgba(0, 113, 227, 0.08);
}

.task-row.waiting-task {
  background: #fafafa;
}

.task-row.waiting-task .task-name {
  color: rgba(0, 0, 0, 0.48);
}

.task-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  overflow: hidden;
}

.task-name {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  color: #1d1d1f;
}

.task-date {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-completed {
  padding: 12px 0;
}

.completed-all {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: #34c759;
}

.completed-all i {
  margin-right: 8px;
}

.task-stats {
  display: flex;
  gap: 16px;
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
  padding-top: 16px;
  margin-top: 16px;
}

.task-stats .delayed {
  color: #ff3b30;
  font-weight: 500;
}

.no-result {
  text-align: center;
  padding: 24px;
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: rgba(0, 0, 0, 0.48);
}

.status-hint {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
  margin-left: 8px;
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
    gap: 20px;
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

  .search-section {
    padding: 12px 16px;
  }

  .search-bar {
    flex-direction: column;
    gap: 8px;
  }

  .search-bar .el-input,
  .search-bar .el-select {
    width: 100%;
  }

  .tasks-section {
    padding: 16px;
  }

  .room-header {
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px;
  }

  .room-left {
    flex: 1;
    min-width: 0;
  }

  .room-right {
    width: 100%;
    justify-content: flex-start;
    gap: 12px;
    margin-top: 8px;
    padding-left: 24px;
  }

  .task-row {
    flex-wrap: wrap;
    gap: 8px;
  }

  .task-content {
    flex: 1;
    min-width: 0;
  }

  .task-meta {
    order: 2;
  }

  .task-action {
    order: 3;
    width: 100%;
    margin-top: 8px;
  }

  .task-stats {
    flex-wrap: wrap;
    gap: 12px;
  }
}
</style>