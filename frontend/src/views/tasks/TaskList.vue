<template>
  <div class="task-list">
    <el-card>
      <div slot="header">
        <span>我的任务</span>
      </div>

      <!-- 机房任务列表 -->
      <div v-loading="loading" class="room-task-list">
        <el-empty v-if="roomTasks.length === 0" description="暂无任务"></el-empty>

        <div v-for="item in roomTasks" :key="item.room.id" class="room-card">
          <div class="room-header" @click="goToRoom(item.room.id)">
            <div class="room-info">
              <span class="room-name">{{ item.room.name }}</span>
              <el-tag size="small" :type="getRoomStatusType(item.room.status)">
                {{ getRoomStatusText(item.room.status) }}
              </el-tag>
              <span class="construction-type">{{ getConstructionTypeText(item.room.construction_type) }}</span>
            </div>
            <div class="room-progress">
              <el-progress
                :percentage="item.overallProgress"
                :width="60"
                type="circle"
                :status="item.overallProgress === 100 ? 'success' : ''"
              ></el-progress>
            </div>
          </div>

          <!-- 当前待处理任务列表 -->
          <div class="current-tasks">
            <div class="tasks-label">当前任务：</div>
            <div v-if="item.currentTasks.length > 0" class="tasks-list">
              <div
                v-for="task in item.currentTasks"
                :key="task.id"
                class="task-item"
              >
                <div class="task-content">
                  <span class="task-name">{{ task.name }}</span>
                  <el-tag size="mini" :type="getTaskStatusType(task.status)">
                    {{ getTaskStatusText(task.status) }}
                  </el-tag>
                  <span class="task-date">
                    {{ formatDate(task.planned_start_date) }} ~ {{ formatDate(task.planned_end_date) }}
                  </span>
                </div>
                <div class="task-actions">
                  <el-button type="primary" size="mini" @click.stop="showUpdateDialog(task)">
                    更新进度
                  </el-button>
                </div>
              </div>
            </div>
            <div v-else class="tasks-completed">
              <span class="completed-all">所有任务已完成</span>
            </div>
          </div>

          <!-- 任务统计 -->
          <div class="task-stats">
            <span>总任务: {{ item.totalTasks }}</span>
            <span>已完成: {{ item.completedTasks }}</span>
            <span>进行中: {{ item.inProgressTasks }}</span>
            <span v-if="item.delayedTasks > 0" class="delayed">延期: {{ item.delayedTasks }}</span>
          </div>

          <!-- 查看详情按钮 -->
          <div class="view-detail">
            <el-button size="small" @click="goToRoom(item.room.id)">
              查看机房详情
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 更新任务对话框 -->
    <el-dialog title="更新任务进度" :visible.sync="dialogVisible" width="500px">
      <el-form :model="taskForm" label-width="80px">
        <el-form-item label="任务名称">
          <span>{{ currentTask?.name }}</span>
        </el-form-item>
        <el-form-item label="所属机房">
          <span>{{ currentTask?.room?.name }}</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="taskForm.status" style="width: 100%;">
            <el-option
              v-for="item in taskStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getMyRoomTasks, updateTaskStatus, updateTaskProgress } from '@/api/task'
import { TASK_STATUS_OPTIONS } from '@/utils/constants'
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
      dialogVisible: false,
      currentTask: null,
      taskForm: {
        status: 'not_started',
        progress: 0,
        remark: ''
      },
      taskStatusOptions: TASK_STATUS_OPTIONS
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
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    showUpdateDialog(task) {
      this.currentTask = task
      this.taskForm = {
        status: task.status,
        progress: task.progress,
        remark: ''
      }
      this.dialogVisible = true
    },
    async handleUpdate() {
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
        this.dialogVisible = false
        this.loadRoomTasks()
      } catch (error) {
        console.error(error)
      }
    },
    goToRoom(roomId) {
      this.$router.push(`/rooms/${roomId}`)
    },
    // 工具函数
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
.room-task-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.room-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
  transition: all 0.3s;
}

.room-card:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.room-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.construction-type {
  font-size: 12px;
  color: #909399;
  background: #f4f4f5;
  padding: 2px 8px;
  border-radius: 4px;
}

.current-tasks {
  padding: 12px 0;
}

.tasks-label {
  color: #909399;
  font-size: 13px;
  margin-bottom: 10px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.task-item:hover {
  border-color: #409EFF;
}

.task-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.task-name {
  font-weight: 500;
  color: #303133;
}

.task-date {
  font-size: 12px;
  color: #909399;
}

.tasks-completed {
  padding: 10px 0;
}

.completed-all {
  color: #67c23a;
  font-weight: 500;
}

.task-stats {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #909399;
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}

.task-stats .delayed {
  color: #f56c6c;
  font-weight: 500;
}

.view-detail {
  margin-top: 12px;
  text-align: right;
}
</style>