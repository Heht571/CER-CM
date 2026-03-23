<template>
  <div class="room-detail">
    <!-- 机房基本信息 -->
    <el-card class="info-card">
      <div slot="header" class="card-header">
        <span>{{ room.name }}</span>
        <div>
          <el-button v-if="isAdmin" type="primary" size="small" @click="showAssignDialog">分配负责人</el-button>
          <el-button v-if="isAdmin" type="warning" size="small" @click="showStatusDialog">更新状态</el-button>
        </div>
      </div>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="机房编码">{{ room.code || '-' }}</el-descriptions-item>
        <el-descriptions-item label="地理位置">{{ room.location || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(room.status)">{{ getStatusText(room.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="建设方式">
          <el-tag type="info">{{ getConstructionTypeText(room.construction_type) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="负责人">{{ room.manager?.real_name || '未分配' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ room.manager?.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="项目开始日期">{{ room.planned_start_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="预计结束日期">{{ room.planned_end_date || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(room.created_at) }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 进度概览 -->
    <el-card class="progress-card">
      <div slot="header">建设进度</div>
      <div class="progress-overview">
        <el-progress type="circle" :percentage="progress.overall || 0" :width="120"></el-progress>
        <div class="progress-text">
          <p>总进度: {{ progress.overall }}%</p>
          <p>已完成: {{ progress.completedTasks }} / {{ progress.totalTasks }} 个任务</p>
          <p>进行中: {{ progress.inProgressTasks }} 个任务</p>
        </div>
      </div>
      <!-- 耗时统计 -->
      <el-divider></el-divider>
      <div class="time-stats">
        <div class="stat-item">
          <span class="label">项目开始日期：</span>
          <span class="value">{{ formatDate(room.planned_start_date) }}</span>
        </div>
        <div class="stat-item">
          <span class="label">预计结束日期：</span>
          <span class="value">{{ formatDate(room.planned_end_date) }}</span>
        </div>
        <div class="stat-item">
          <span class="label">预计总工期：</span>
          <span class="value">{{ calculateTotalDays() }} 天</span>
        </div>
        <div class="stat-item">
          <span class="label">已用时间：</span>
          <span class="value">{{ calculateElapsedDays() }} 天</span>
        </div>
        <div class="stat-item">
          <span class="label">剩余时间：</span>
          <span class="value" :class="{ 'text-danger': isOverdue() }">{{ calculateRemainingDays() }} 天</span>
        </div>
        <div class="stat-item" v-if="isOverdue()">
          <span class="label text-danger">延期天数：</span>
          <span class="value text-danger">{{ calculateOverdueDays() }} 天</span>
        </div>
      </div>
      <!-- 进度对比 -->
      <el-divider></el-divider>
      <div class="progress-comparison">
        <div class="comparison-item">
          <span class="label">计划进度：</span>
          <el-progress :percentage="calculatePlannedProgress()" :show-text="false" color="#909399"></el-progress>
          <span class="percent">{{ calculatePlannedProgress() }}%</span>
        </div>
        <div class="comparison-item">
          <span class="label">实际进度：</span>
          <el-progress :percentage="progress.overall || 0" :show-text="false"></el-progress>
          <span class="percent" :class="{ 'text-danger': progress.overall < calculatePlannedProgress() }">{{ progress.overall || 0 }}%</span>
        </div>
        <div class="comparison-item">
          <span class="label">进度偏差：</span>
          <span :class="getDeviationClass()">{{ getDeviationText() }}</span>
        </div>
      </div>
    </el-card>

    <!-- 网络流程图 -->
    <el-card style="margin-top: 20px;">
      <div slot="header">建设流程网络图</div>
      <div class="graph-legend">
        <span class="legend-item"><span class="legend-color not-started"></span> 未开始</span>
        <span class="legend-item"><span class="legend-color in-progress"></span> 进行中</span>
        <span class="legend-item"><span class="legend-color completed"></span> 已完成</span>
      </div>
      <NetworkGraph
        v-if="graphData.nodes.length"
        :nodes="graphData.nodes"
        :edges="graphData.edges"
        @node-click="showTaskDialog"
      />
      <el-empty v-else description="暂无任务数据"></el-empty>
    </el-card>

    <!-- 任务列表 -->
    <el-card style="margin-top: 20px;">
      <div slot="header">任务列表</div>
      <el-table :data="taskList" size="small">
        <el-table-column type="index" label="序号" width="60"></el-table-column>
        <el-table-column prop="name" label="任务名称"></el-table-column>
        <el-table-column label="计划开始日期" width="120">
          <template slot-scope="scope">
            {{ formatDate(scope.row.planned_start_date) }}
          </template>
        </el-table-column>
        <el-table-column label="计划结束日期" width="120">
          <template slot-scope="scope">
            {{ formatDate(scope.row.planned_end_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="planned_days" label="持续天数" width="100">
          <template slot-scope="scope">
            {{ scope.row.planned_days || 0 }} 天
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="getTaskStatusType(scope.row.status)" size="small">
              {{ getTaskStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="120">
          <template slot-scope="scope">
            <el-progress :percentage="scope.row.progress" :show-text="false"></el-progress>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template slot-scope="scope">
            <el-button type="text" @click="showTaskDialog(scope.row)">更新</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 更新日志 -->
    <el-card style="margin-top: 20px;">
      <div slot="header">更新日志</div>
      <el-table :data="logs" v-loading="logsLoading" size="small">
        <el-table-column label="时间" width="160">
          <template slot-scope="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="task_name" label="任务" width="140"></el-table-column>
        <el-table-column label="操作人" width="100">
          <template slot-scope="scope">
            {{ scope.row.user?.real_name || scope.row.user?.username || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="更新内容">
          <template slot-scope="scope">
            {{ getLogContent(scope.row) }}
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注">
          <template slot-scope="scope">
            {{ scope.row.remark || '-' }}
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-if="logsPagination.total > 0"
        style="margin-top: 15px; text-align: right;"
        background
        layout="total, prev, pager, next"
        :total="logsPagination.total"
        :page-size="logsPagination.pageSize"
        :current-page="logsPagination.page"
        @current-change="handleLogPageChange"
      ></el-pagination>
    </el-card>

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
    <el-dialog title="更新任务进度" :visible.sync="taskDialogVisible" width="500px">
      <el-form :model="taskForm" label-width="100px">
        <el-form-item label="任务名称">
          <span>{{ currentTask?.name }}</span>
        </el-form-item>
        <el-form-item label="计划日期">
          <span>{{ formatDate(currentTask?.planned_start_date) }} ~ {{ formatDate(currentTask?.planned_end_date) }}</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="taskForm.status" style="width: 100%;">
            <el-option label="未开始" value="not_started"></el-option>
            <el-option label="进行中" value="in_progress"></el-option>
            <el-option label="已完成" value="completed"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="进度">
          <el-slider v-model="taskForm.progress" :min="0" :max="100" show-input></el-slider>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="taskForm.remark" type="textarea" rows="2"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleTaskUpdate">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getRoomDetail, getRoomTasks, getRoomProgress, assignManager, updateRoomStatus, getRoomLogs } from '@/api/room'
import { updateTaskStatus, updateTaskProgress } from '@/api/task'
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
  formatDateTime
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
      selectedManagerId: null,
      selectedStatus: null,
      currentTask: null,
      taskForm: {
        status: 'not_started',
        progress: 0,
        remark: ''
      },
      // 日志相关
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
    ...mapGetters('auth', ['isAdmin'])
  },
  created() {
    this.roomId = this.$route.params.id
    this.loadData()
    this.loadManagers()
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
    showTaskDialog(task) {
      this.currentTask = task
      this.taskForm = {
        status: task.status,
        progress: task.progress,
        remark: ''
      }
      this.taskDialogVisible = true
    },
    async handleTaskUpdate() {
      // 数据校验：进度必须与状态匹配
      if (this.taskForm.status === 'completed' && this.taskForm.progress !== 100) {
        this.$message.warning('任务完成时进度必须为100%')
        return
      }
      if (this.taskForm.status === 'not_started' && this.taskForm.progress > 0) {
        this.$message.warning('任务未开始时进度应为0%')
        return
      }
      // 检查是否有变更
      if (
        this.taskForm.status === this.currentTask.status &&
        this.taskForm.progress === this.currentTask.progress &&
        !this.taskForm.remark
      ) {
        this.$message.info('没有任何变更')
        return
      }
      try {
        if (this.taskForm.status !== this.currentTask.status) {
          await updateTaskStatus(this.currentTask.id, {
            status: this.taskForm.status,
            remark: this.taskForm.remark
          })
        }
        if (this.taskForm.progress !== this.currentTask.progress) {
          await updateTaskProgress(this.currentTask.id, {
            progress: this.taskForm.progress,
            remark: this.taskForm.remark
          })
        }
        this.$message.success('更新成功')
        this.taskDialogVisible = false
        this.loadData()
        this.loadLogs()
      } catch (error) {
        console.error(error)
      }
    },
    // 使用共享工具函数
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
    // 时间统计方法
    calculateTotalDays() {
      if (!this.room.planned_start_date || !this.room.planned_end_date) return '-'
      const start = new Date(this.room.planned_start_date)
      const end = new Date(this.room.planned_end_date)
      return Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    },
    calculateElapsedDays() {
      if (!this.room.planned_start_date) return '-'
      const start = new Date(this.room.planned_start_date)
      const today = new Date()
      const elapsed = Math.ceil((today - start) / (1000 * 60 * 60 * 24))
      return Math.max(0, elapsed)
    },
    calculateRemainingDays() {
      if (!this.room.planned_end_date) return '-'
      const end = new Date(this.room.planned_end_date)
      const today = new Date()
      const remaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
      return Math.max(0, remaining)
    },
    isOverdue() {
      if (!this.room.planned_end_date) return false
      const end = new Date(this.room.planned_end_date)
      const today = new Date()
      return today > end && this.room.status !== 'completed'
    },
    calculateOverdueDays() {
      if (!this.room.planned_end_date) return 0
      const end = new Date(this.room.planned_end_date)
      const today = new Date()
      return Math.max(0, Math.ceil((today - end) / (1000 * 60 * 60 * 24)))
    },
    calculatePlannedProgress() {
      if (!this.room.planned_start_date || !this.room.planned_end_date) return 0
      const start = new Date(this.room.planned_start_date)
      const end = new Date(this.room.planned_end_date)
      const today = new Date()
      const total = end - start
      const elapsed = today - start
      if (elapsed <= 0) return 0
      if (elapsed >= total) return 100
      return Math.round((elapsed / total) * 100)
    },
    getDeviationClass() {
      const deviation = (this.progress.overall || 0) - this.calculatePlannedProgress()
      if (deviation >= 0) return 'text-success'
      return 'text-danger'
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
.info-card, .progress-card { margin-bottom: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.progress-overview { display: flex; align-items: center; gap: 30px; }
.progress-text { color: #666; line-height: 2; }
.time-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}
.stat-item {
  display: flex;
  align-items: center;
}
.stat-item .label {
  color: #909399;
  margin-right: 8px;
}
.stat-item .value {
  font-weight: 500;
  color: #303133;
}
.progress-comparison {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.comparison-item {
  display: flex;
  align-items: center;
  gap: 10px;
}
.comparison-item .label {
  width: 80px;
  color: #606266;
}
.comparison-item .el-progress {
  flex: 1;
}
.comparison-item .percent {
  width: 50px;
  text-align: right;
  font-weight: 500;
}
.text-success { color: #67c23a; }
.text-danger { color: #f56c6c; }
.graph-legend {
  display: flex;
  gap: 20px;
  margin-bottom: 15px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #666;
}
.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid;
}
.legend-color.not-started {
  background: #f5f7fa;
  border-color: #dcdfe6;
}
.legend-color.in-progress {
  background: #ecf5ff;
  border-color: #409EFF;
}
.legend-color.completed {
  background: #f0f9eb;
  border-color: #67c23a;
}
</style>