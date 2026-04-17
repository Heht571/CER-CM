<template>
  <div class="room-detail-page">
    <!-- Hero 区 - 深色背景 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">{{ room.name }}</h1>
        <p class="hero-subtitle" v-if="room.code">{{ room.code }}</p>
      </div>
      <div class="hero-stats">
        <div class="stat-item">
          <div class="stat-value">{{ progress.overall || 0 }}%</div>
          <div class="stat-label">进度</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ progress.completedTasks }}/{{ progress.totalTasks }}</div>
          <div class="stat-label">任务</div>
        </div>
      </div>
      <el-tag :type="getStatusType(room.status)" size="large">
        {{ getStatusText(room.status) }}
      </el-tag>
    </section>

    <!-- 操作区 -->
    <section class="action-section" v-if="isAdmin">
      <div class="action-bar">
        <el-button type="primary" class="action-btn" @click="showAssignDialog">分配负责人</el-button>
        <el-button type="warning" class="action-btn" @click="showStatusDialog">更新状态</el-button>
        <el-button class="action-btn" @click="showChangeHistory">变更记录</el-button>
      </div>
    </section>

    <!-- 基本信息 -->
    <section class="info-section">
      <div class="info-card">
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">地理位置</div>
            <div class="info-value">{{ room.location || '-' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">建设方式</div>
            <div class="info-value">{{ getConstructionTypeText(room.construction_type) }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">负责人</div>
            <div class="info-value">{{ room.manager?.real_name || '未分配' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">联系电话</div>
            <div class="info-value">{{ room.manager?.phone || '-' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">所属项目</div>
            <div class="info-value">{{ room.project?.name || '未分配' }}</div>
          </div>
          <div class="info-item">
            <div class="info-label">计划工期</div>
            <div class="info-value">{{ formatDate(room.planned_start_date) }} ~ {{ formatDate(room.planned_end_date) }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- 时间统计 -->
    <section class="time-section">
      <div class="time-grid">
        <div class="time-item">
          <div class="time-label">预计总工期</div>
          <div class="time-value">{{ calculateTotalDays() }} 天</div>
        </div>
        <div class="time-item">
          <div class="time-label">已用时间</div>
          <div class="time-value">{{ calculateElapsedDays() }} 天</div>
        </div>
        <div class="time-item">
          <div class="time-label">剩余时间</div>
          <div class="time-value" :class="{ danger: isOverdue() }">{{ calculateRemainingDays() }} 天</div>
        </div>
        <div class="time-item" v-if="isOverdue()">
          <div class="time-label danger">延期天数</div>
          <div class="time-value danger">{{ calculateOverdueDays() }} 天</div>
        </div>
      </div>
    </section>

    <!-- 进度对比 -->
    <section class="progress-section">
      <div class="progress-header">
        <h2 class="section-title">进度分析</h2>
      </div>
      <div class="progress-comparison">
        <div class="comparison-row">
          <span class="comparison-label">计划进度</span>
          <div class="comparison-bar">
            <div class="bar-fill gray" :style="{ width: calculatePlannedProgress() + '%' }"></div>
          </div>
          <span class="comparison-num">{{ calculatePlannedProgress() }}%</span>
        </div>
        <div class="comparison-row">
          <span class="comparison-label">实际进度</span>
          <div class="comparison-bar">
            <div class="bar-fill accent" :style="{ width: (progress.overall || 0) + '%' }"></div>
          </div>
          <span class="comparison-num" :class="{ danger: progress.overall < calculatePlannedProgress() }">{{ progress.overall || 0 }}%</span>
        </div>
        <div class="deviation-row">
          <span class="deviation-label">进度偏差</span>
          <span :class="getDeviationClass()">{{ getDeviationText() }}</span>
        </div>
      </div>
    </section>

    <!-- 网络流程图 -->
    <section class="graph-section">
      <div class="section-header">
        <h2 class="section-title">建设流程</h2>
        <div class="graph-legend">
          <span class="legend-item"><span class="legend-dot not-started"></span> 未开始</span>
          <span class="legend-item"><span class="legend-dot in-progress"></span> 进行中</span>
          <span class="legend-item"><span class="legend-dot completed"></span> 已完成</span>
        </div>
      </div>
      <div class="graph-container">
        <NetworkGraph
          v-if="graphData.nodes.length"
          :nodes="graphData.nodes"
          :edges="graphData.edges"
          @node-click="showTaskDialog"
        />
        <el-empty v-else description="暂无任务数据"></el-empty>
      </div>
    </section>

    <!-- 任务列表 -->
    <section class="tasks-section">
      <div class="section-header">
        <h2 class="section-title">任务列表</h2>
      </div>
      <div class="task-list">
        <div v-for="task in taskList" :key="task.id" class="task-card">
          <div class="task-left">
            <div class="task-name">{{ task.name }}</div>
            <div class="task-date">{{ formatDate(task.planned_start_date) }} ~ {{ formatDate(task.planned_end_date) }}</div>
          </div>
          <div class="task-center">
            <el-tag :type="getTaskStatusType(task.status)" size="small">{{ getTaskStatusText(task.status) }}</el-tag>
          </div>
          <div class="task-right">
            <span class="task-progress">{{ task.progress }}%</span>
            <el-button type="text" size="small" :disabled="isTaskEditingLocked" @click="showTaskDialog(task)">更新</el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 更新日志 -->
    <section class="logs-section">
      <div class="section-header">
        <h2 class="section-title">更新日志</h2>
      </div>
      <div class="logs-list" v-loading="logsLoading">
        <div v-for="log in logs" :key="log.id" class="log-card">
          <div class="log-header">
            <span class="log-time">{{ formatDateTime(log.created_at) }}</span>
            <span class="log-user">{{ log.user?.real_name || log.user?.username || '-' }}</span>
          </div>
          <div class="log-content">
            <span class="log-task">{{ log.task_name }}</span>
            <span class="log-action">{{ getLogContent(log) }}</span>
          </div>
          <div class="log-remark" v-if="log.remark">{{ log.remark }}</div>
        </div>
        <el-empty v-if="logs.length === 0 && !logsLoading" description="暂无更新日志"></el-empty>
      </div>
      <div class="pagination-wrapper" v-if="logsPagination.total > 0">
        <el-pagination
          background
          layout="total, prev, pager, next"
          :total="logsPagination.total"
          :page-size="logsPagination.pageSize"
          :current-page="logsPagination.page"
          @current-change="handleLogPageChange"
        ></el-pagination>
      </div>
    </section>

    <!-- 分配负责人对话框 -->
    <el-dialog title="分配负责人" :visible.sync="assignDialogVisible" width="400px">
      <el-form>
        <el-form-item label="选择负责人">
          <el-select v-model="selectedManagerId" placeholder="请选择" style="width: 100%;">
            <el-option v-for="manager in managers" :key="manager.id" :label="manager.real_name" :value="manager.id"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAssign">确定</el-button>
      </div>
    </el-dialog>

    <!-- 更新状态对话框 -->
    <el-dialog title="更新机房状态" :visible.sync="statusDialogVisible" width="400px">
      <el-form>
        <el-form-item label="选择状态">
          <el-select v-model="selectedStatus" placeholder="请选择" style="width: 100%;">
            <el-option label="规划中" value="planning"></el-option>
            <el-option label="建设中" value="in_progress"></el-option>
            <el-option label="已完成" value="completed"></el-option>
            <el-option label="已暂停" value="paused"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleStatusUpdate">确定</el-button>
      </div>
    </el-dialog>

    <!-- 更新任务对话框 -->
    <el-dialog title="更新任务进度" :visible.sync="taskDialogVisible" width="420px">
      <el-form :model="taskForm" label-width="80px">
        <el-form-item label="任务名称">
          <span>{{ currentTask?.name }}</span>
        </el-form-item>
        <el-form-item label="计划日期">
          <span>{{ formatDate(currentTask?.planned_start_date) }} ~ {{ formatDate(currentTask?.planned_end_date) }}</span>
        </el-form-item>
        <el-form-item label="进度">
          <el-slider v-model="taskForm.progress" :min="0" :max="100" show-input></el-slider>
        </el-form-item>
        <el-form-item label="状态">
          <el-tag :type="getAutoStatusType()" size="small">{{ getAutoStatusText() }}</el-tag>
          <span class="status-hint">（根据进度自动计算）</span>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="taskForm.remark" type="textarea" rows="3"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleTaskUpdate">确定</el-button>
      </div>
    </el-dialog>

    <!-- 变更历史对话框 -->
    <el-dialog title="变更记录" :visible.sync="changeHistoryVisible" width="600px">
      <div class="change-list" v-loading="changeHistoryLoading">
        <div v-for="change in changeHistory" :key="change.id" class="change-card">
          <div class="change-header">
            <el-tag size="small">{{ change.changeTypeText }}</el-tag>
            <span class="change-time">{{ formatDateTime(change.createdAt) }}</span>
          </div>
          <div class="change-content">
            <span class="change-old">{{ change.oldValue || '-' }}</span>
            <span class="change-arrow">→</span>
            <span class="change-new">{{ change.newValue || '-' }}</span>
          </div>
          <div class="change-meta">
            <span class="change-reason" v-if="change.changeReason">{{ change.changeReason }}</span>
            <span class="change-user">{{ change.changer?.real_name || '-' }}</span>
          </div>
        </div>
        <el-empty v-if="changeHistory.length === 0 && !changeHistoryLoading" description="暂无变更记录"></el-empty>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getRoomDetail, getRoomTasks, getRoomProgress, assignManager, updateRoomStatus, getRoomLogs, getRoomChangeHistory } from '@/api/room'
import { updateTask } from '@/api/task'
import { getManagers } from '@/api/user'
import { mapGetters } from 'vuex'
import NetworkGraph from '@/components/NetworkGraph.vue'
import {
  getTaskStatusText,
  getTaskStatusType,
  getRoomStatusText,
  getRoomStatusType,
  getConstructionTypeText,
  formatDate,
  formatDateTime,
  parseDateOnly,
  getTodayDateOnly,
  diffCalendarDays
} from '@/utils'

export default {
  name: 'RoomDetail',
  components: {
    NetworkGraph
  },
  data() {
    return {
      roomId: null,
      room: {},
      graphData: { nodes: [], edges: [] },
      taskList: [],
      progress: {},
      managers: [],
      assignDialogVisible: false,
      statusDialogVisible: false,
      taskDialogVisible: false,
      changeHistoryVisible: false,
      changeHistory: [],
      changeHistoryLoading: false,
      selectedManagerId: null,
      selectedStatus: null,
      currentTask: null,
      taskForm: {
        progress: 0,
        remark: ''
      },
      logs: [],
      logsLoading: false,
      logsPagination: {
        total: 0,
        page: 1,
        pageSize: 10
      }
    }
  },
  computed: {
    ...mapGetters('auth', ['isAdmin']),
    isTaskEditingLocked() {
      return ['paused', 'completed'].includes(this.room.status)
    }
  },
  created() {
    this.roomId = this.$route.params.id
    this.loadData()
    if (this.isAdmin) {
      this.loadManagers()
    }
    this.loadLogs()
  },
  methods: {
    async loadData() {
      try {
        const [roomRes, tasksRes, progressRes] = await Promise.all([
          getRoomDetail(this.roomId),
          getRoomTasks(this.roomId),
          getRoomProgress(this.roomId)
        ])
        this.room = roomRes.data
        this.graphData = {
          nodes: tasksRes.data.nodes,
          edges: tasksRes.data.edges
        }
        this.taskList = tasksRes.data.nodes.sort((a, b) => a.graph_level - b.graph_level)
        this.progress = progressRes.data
      } catch (error) {
        console.error(error)
      }
    },
    async loadManagers() {
      if (!this.isAdmin) return
      try {
        const res = await getManagers()
        this.managers = res.data
      } catch (error) {
        console.error(error)
      }
    },
    async loadLogs() {
      this.logsLoading = true
      try {
        const res = await getRoomLogs(this.roomId, {
          page: this.logsPagination.page,
          pageSize: this.logsPagination.pageSize
        })
        this.logs = res.data.list
        this.logsPagination.total = res.data.pagination.total
      } catch (error) {
        console.error(error)
      } finally {
        this.logsLoading = false
      }
    },
    handleLogPageChange(page) {
      this.logsPagination.page = page
      this.loadLogs()
    },
    showAssignDialog() {
      this.selectedManagerId = this.room.manager_id
      this.assignDialogVisible = true
    },
    async handleAssign() {
      if (!this.selectedManagerId) {
        this.$message.warning('请选择负责人')
        return
      }
      try {
        await this.$confirm(
          `确定将机房"${this.room.name}"分配给该负责人吗？`,
          '确认分配',
          { type: 'warning' }
        )
        await assignManager(this.roomId, { manager_id: this.selectedManagerId })
        this.$message.success('分配成功')
        this.assignDialogVisible = false
        this.loadData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error(error)
        }
      }
    },
    showStatusDialog() {
      this.selectedStatus = this.room.status
      this.statusDialogVisible = true
    },
    async handleStatusUpdate() {
      if (!this.selectedStatus) {
        this.$message.warning('请选择状态')
        return
      }
      if (this.selectedStatus === this.room.status) {
        this.$message.info('状态未变更')
        this.statusDialogVisible = false
        return
      }
      try {
        await this.$confirm(
          `确定将机房状态从"${getRoomStatusText(this.room.status)}"改为"${getRoomStatusText(this.selectedStatus)}"吗？`,
          '确认更新',
          { type: 'warning' }
        )
        await updateRoomStatus(this.roomId, { status: this.selectedStatus })
        this.$message.success('状态更新成功')
        this.statusDialogVisible = false
        this.loadData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error(error)
        }
      }
    },
    async showChangeHistory() {
      this.changeHistoryVisible = true
      this.changeHistoryLoading = true
      try {
        const res = await getRoomChangeHistory(this.roomId)
        this.changeHistory = res.data
      } catch (error) {
        console.error(error)
        this.$message.error('获取变更记录失败')
      } finally {
        this.changeHistoryLoading = false
      }
    },
    showTaskDialog(task) {
      if (this.isTaskEditingLocked) {
        this.$message.warning(
          this.room.status === 'paused'
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
      this.taskDialogVisible = true
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
    async handleTaskUpdate() {
      if (this.isTaskEditingLocked) {
        this.$message.warning(
          this.room.status === 'paused'
            ? '机房已暂停，请先恢复机房状态后再更新任务'
            : '机房已完成，请先调整机房状态后再更新任务'
        )
        return
      }

      if (
        this.taskForm.progress === this.currentTask.progress &&
        !this.taskForm.remark
      ) {
        this.$message.info('没有任何变更')
        return
      }
      try {
        await updateTask(this.currentTask.id, {
          progress: this.taskForm.progress,
          remark: this.taskForm.remark
        })
        this.$message.success('更新成功')
        this.taskDialogVisible = false
        this.loadData()
        this.loadLogs()
      } catch (error) {
        console.error(error)
      }
    },
    getStatusType: getRoomStatusType,
    getStatusText: getRoomStatusText,
    getTaskStatusType,
    getTaskStatusText,
    formatDate,
    formatDateTime,
    getConstructionTypeText,
    getLogContent(log) {
      const parts = []
      if (log.old_status && log.new_status) {
        parts.push(`状态: ${getTaskStatusText(log.old_status)} → ${getTaskStatusText(log.new_status)}`)
      }
      if (log.old_progress !== null && log.new_progress !== null) {
        parts.push(`进度: ${log.old_progress}% → ${log.new_progress}%`)
      }
      return parts.join(' | ') || log.remark || '更新'
    },
    calculateTotalDays() {
      if (!this.room.planned_start_date || !this.room.planned_end_date) return '-'
      return Math.max(0, diffCalendarDays(this.room.planned_start_date, this.room.planned_end_date))
    },
    calculateElapsedDays() {
      if (!this.room.planned_start_date) return '-'
      return Math.max(0, diffCalendarDays(this.room.planned_start_date, getTodayDateOnly()))
    },
    calculateRemainingDays() {
      if (!this.room.planned_end_date) return '-'
      return Math.max(0, diffCalendarDays(getTodayDateOnly(), this.room.planned_end_date))
    },
    isOverdue() {
      if (!this.room.planned_end_date) return false
      const end = parseDateOnly(this.room.planned_end_date)
      const today = getTodayDateOnly()
      return Boolean(end && today && today > end && this.room.status !== 'completed')
    },
    calculateOverdueDays() {
      if (!this.room.planned_end_date) return 0
      return Math.max(0, diffCalendarDays(this.room.planned_end_date, getTodayDateOnly()))
    },
    calculatePlannedProgress() {
      if (!this.room.planned_start_date || !this.room.planned_end_date) return 0
      const start = parseDateOnly(this.room.planned_start_date)
      const end = parseDateOnly(this.room.planned_end_date)
      const today = getTodayDateOnly()
      if (!start || !end || !today) return 0
      const total = diffCalendarDays(start, end)
      const elapsed = diffCalendarDays(start, today)
      if (elapsed <= 0) return 0
      if (total <= 0 || elapsed >= total) return 100
      return Math.round((elapsed / total) * 100)
    },
    getDeviationClass() {
      const deviation = (this.progress.overall || 0) - this.calculatePlannedProgress()
      if (deviation >= 0) return 'success'
      return 'danger'
    },
    getDeviationText() {
      const deviation = (this.progress.overall || 0) - this.calculatePlannedProgress()
      if (deviation > 0) return `超前 ${deviation}%`
      if (deviation < 0) return `落后 ${Math.abs(deviation)}%`
      return '进度正常'
    }
  }
}
</script>

<style scoped>
.room-detail-page {
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

.hero-stats .stat-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: rgba(255, 255, 255, 0.6);
}

/* 操作区 */
.action-section {
  background: #f5f5f7;
  padding: 16px 24px;
}

.action-bar {
  display: flex;
  gap: 12px;
}

.action-btn {
  border-radius: 980px;
}

/* 基本信息 */
.info-section {
  background: #f5f5f7;
  padding: 24px;
}

.info-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.info-value {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: #1d1d1f;
}

/* 时间统计 */
.time-section {
  background: #f5f5f7;
  padding: 24px;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.time-item {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 20px;
  text-align: center;
}

.time-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.time-value {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #1d1d1f;
  margin-top: 8px;
}

.time-value.danger,
.time-label.danger {
  color: #ff3b30;
}

/* 进度分析 */
.progress-section {
  background: #f5f5f7;
  padding: 24px;
}

.section-title {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #1d1d1f;
  margin: 0;
}

.progress-header {
  margin-bottom: 20px;
}

.progress-comparison {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
}

.comparison-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.comparison-label {
  width: 80px;
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: rgba(0, 0, 0, 0.8);
}

.comparison-bar {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 980px;
}

.bar-fill {
  height: 100%;
  border-radius: 980px;
}

.bar-fill.gray {
  background: rgba(0, 0, 0, 0.3);
}

.bar-fill.accent {
  background: #0071e3;
}

.comparison-num {
  width: 50px;
  text-align: right;
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  color: #1d1d1f;
}

.comparison-num.danger {
  color: #ff3b30;
}

.deviation-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
}

.deviation-label {
  width: 80px;
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: rgba(0, 0, 0, 0.8);
}

.deviation-row .success {
  color: #34c759;
  font-weight: 500;
}

.deviation-row .danger {
  color: #ff3b30;
  font-weight: 500;
}

/* 网络流程图 */
.graph-section {
  background: #f5f5f7;
  padding: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.graph-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.not-started { background: rgba(0, 0, 0, 0.45); }
.legend-dot.in-progress { background: #0071e3; }
.legend-dot.completed { background: #34c759; }

.graph-container {
  background: #ffffff;
  border-radius: 12px;
  padding: 24px;
}

/* 任务列表 */
.tasks-section {
  background: #f5f5f7;
  padding: 24px;
}

.task-list {
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
}

.task-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: background 0.15s ease;
}

.task-card:last-child {
  border-bottom: none;
}

.task-card:hover {
  background: rgba(0, 113, 227, 0.08);
}

.task-left {
  flex: 1;
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

.task-date {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.task-center {
  display: flex;
  align-items: center;
}

.task-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.task-progress {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  color: #1d1d1f;
}

/* 更新日志 */
.logs-section {
  background: #f5f5f7;
  padding: 24px;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 16px 20px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-time {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.log-user {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: #1d1d1f;
}

.log-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.log-task {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  color: #1d1d1f;
}

.log-action {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.8);
}

.log-remark {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
  margin-top: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 24px;
}

.status-hint {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
  margin-left: 8px;
}

/* 变更记录 */
.change-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.change-card {
  background: #f5f5f7;
  border-radius: 8px;
  padding: 12px 16px;
}

.change-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.change-time {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.change-content {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.change-old,
.change-new {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: #1d1d1f;
}

.change-arrow {
  color: rgba(0, 0, 0, 0.45);
}

.change-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.change-reason {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.8);
}

.change-user {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
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

  .action-section {
    padding: 12px 16px;
  }

  .action-bar {
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  .info-section,
  .time-section,
  .progress-section,
  .graph-section,
  .tasks-section,
  .logs-section {
    padding: 16px;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }

  .time-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .time-value {
    font-size: 20px;
  }

  .section-title {
    font-size: 16px;
    letter-spacing: 0;
    line-height: 1.5;
  }

  .comparison-row {
    flex-wrap: wrap;
  }

  .comparison-label {
    width: 100%;
    margin-bottom: 8px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .graph-legend {
    flex-wrap: wrap;
  }

  .task-card {
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px;
  }

  .task-left {
    flex: 1;
    min-width: 0;
  }

  .task-right {
    width: 100%;
    justify-content: flex-start;
    margin-top: 8px;
  }
}
</style>