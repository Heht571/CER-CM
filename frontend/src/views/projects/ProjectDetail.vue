<template>
  <div class="project-detail">
    <!-- 项目信息头部 -->
    <el-card class="project-header">
      <div slot="header" class="header-content">
        <div class="project-info">
          <h2>{{ project.name }}</h2>
          <div class="project-meta">
            <span v-if="project.code">编码: {{ project.code }}</span>
            <el-tag type="success" size="small">进行中</el-tag>
          </div>
        </div>
        <div class="header-actions" v-if="isAdmin">
          <el-button type="primary" size="small" @click="goToCreateRoom">
            <i class="el-icon-plus"></i> 新建机房
          </el-button>
          <el-button type="info" size="small" @click="showEditProject">
            编辑项目
          </el-button>
        </div>
      </div>
      <el-descriptions :column="3" border size="small">
        <el-descriptions-item label="项目描述">{{ project.description || '暂无描述' }}</el-descriptions-item>
        <el-descriptions-item label="机房总数">{{ projectStats.total || 0 }}</el-descriptions-item>
        <el-descriptions-item label="整体进度">
          <el-progress :percentage="projectStats.progress || 0" :stroke-width="15"></el-progress>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 延期任务预警 -->
    <el-card v-if="delayedTasks.length > 0" class="delayed-card">
      <div slot="header">
        <span class="delayed-title">
          <i class="el-icon-warning"></i>
          延期任务预警
          <el-tooltip content="超过计划完成日期但尚未完成的任务" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </span>
        <el-tag type="danger" size="small">{{ delayedTasks.length }} 个</el-tag>
      </div>
      <div class="delayed-list">
        <div v-for="task in delayedTasks" :key="task.id" class="delayed-item" @click="goToRoom(task.room?.id)">
          <div class="delayed-info">
            <span class="task-name">{{ task.name }}</span>
            <span class="room-name">({{ task.room?.name }})</span>
            <span class="delay-days">延期 {{ task.delayDays }} 天</span>
          </div>
          <div class="delayed-manager">
            负责人: {{ task.room?.manager?.real_name || '未分配' }}
          </div>
        </div>
      </div>
    </el-card>

    <!-- 按负责人分组的机房 -->
    <div class="manager-sections" v-loading="loading">
      <el-empty v-if="managerStats.length === 0 && !loading" description="该项目暂无机房"></el-empty>

      <el-card
        v-for="manager in managerStats"
        :key="manager.id || 'unassigned'"
        class="manager-card"
        :class="{ expanded: expandedManager === manager.id }"
      >
        <!-- 负责人头部（点击展开/收起） -->
        <div slot="header" class="manager-header" @click="toggleExpand(manager.id)">
          <div class="manager-avatar">
            <i class="el-icon-user"></i>
          </div>
          <div class="manager-meta">
            <div class="manager-name">{{ manager.name }}</div>
            <div class="manager-dept" v-if="manager.department">{{ manager.department }}</div>
          </div>
          <div class="manager-badges">
            <span class="badge total">{{ manager.stats?.total || 0 }} 个机房</span>
            <span class="badge completed" v-if="manager.stats?.completed">{{ manager.stats.completed }} 完成</span>
            <span class="badge in-progress" v-if="manager.stats?.in_progress">{{ manager.stats.in_progress }} 在建</span>
          </div>
          <div class="expand-icon">
            <i :class="expandedManager === manager.id ? 'el-icon-arrow-up' : 'el-icon-arrow-down'"></i>
          </div>
        </div>

        <!-- 进度概览 -->
        <div class="manager-progress">
          <div class="progress-ring">
            <el-progress
              type="circle"
              :percentage="manager.stats?.avgProgress || 0"
              :width="60"
              :stroke-width="6"
              :color="getProgressColor(manager.stats?.avgProgress)"
            ></el-progress>
          </div>
          <div class="progress-detail">
            <div class="progress-label">平均进度</div>
            <div class="progress-value">{{ manager.stats?.avgProgress || 0 }}%</div>
          </div>
        </div>

        <!-- 机房列表（仅在展开时显示） -->
        <div v-if="expandedManager === manager.id" class="room-list">
          <div
            v-for="room in manager.rooms"
            :key="room.id"
            class="room-row"
            @click="goToRoom(room.id)"
          >
            <div class="room-status-dot" :class="room.status"></div>
            <div class="room-name">{{ room.name }}</div>
            <div class="room-status">{{ getStatusText(room.status) }}</div>
            <div class="room-progress-bar">
              <div class="progress-fill" :style="{ width: (room.progress || 0) + '%' }"></div>
            </div>
            <div class="room-progress-text">{{ room.progress || 0 }}%</div>
            <i class="el-icon-arrow-right"></i>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 编辑项目对话框 -->
    <el-dialog title="编辑项目" :visible.sync="editProjectVisible" width="400px">
      <el-form :model="projectForm" :rules="projectRules" ref="projectForm" label-width="80px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name"></el-input>
        </el-form-item>
        <el-form-item label="项目编码">
          <el-input v-model="projectForm.code"></el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="projectForm.description" type="textarea" rows="2"></el-input>
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
        // 获取项目详情
        const projectRes = await getProjectDetail(this.projectId)
        this.project = projectRes.data

        // 获取项目负责人统计
        const managerRes = await getByManager({ project_id: this.projectId })
        this.managerStats = managerRes.data

        // 计算项目总体统计
        const total = this.managerStats.reduce((sum, m) => sum + (m.stats?.total || 0), 0)
        const avgProgress = this.managerStats.reduce((sum, m) => sum + (m.stats?.avgProgress || 0), 0)
        this.projectStats = {
          total,
          progress: total > 0 ? Math.round(avgProgress / this.managerStats.length) : 0
        }

        // 获取延期任务
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
    getProgressColor(progress) {
      if (progress >= 100) return '#52c41a'
      if (progress >= 70) return '#1890ff'
      if (progress >= 40) return '#faad14'
      return '#d9d9d9'
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
.project-detail {
  min-height: 100%;
}

.project-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-info h2 {
  margin: 0;
  font-size: 20px;
  color: #262626;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  font-size: 13px;
  color: #8c8c8c;
}

/* 延期预警卡片 */
.delayed-card {
  margin-bottom: 20px;
  border-color: #faad14;
}

.delayed-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delayed-title i.el-icon-warning {
  color: #faad14;
}

.delayed-list {
  max-height: 200px;
  overflow-y: auto;
}

.delayed-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #fffbe6;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
}

.delayed-item:hover {
  background: #fff1b8;
}

.delayed-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-name {
  font-weight: 500;
  color: #262626;
}

.room-name {
  color: #8c8c8c;
}

.delay-days {
  color: #cf1322;
  font-weight: 500;
}

.delayed-manager {
  color: #8c8c8c;
  font-size: 13px;
}

/* 负责人卡片 */
.manager-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.manager-card {
  border-radius: 12px;
}

.manager-card.expanded {
  border-color: #667eea;
}

.manager-header {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.manager-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
}

.manager-meta {
  flex: 1;
}

.manager-name {
  font-weight: 600;
  color: #262626;
}

.manager-dept {
  font-size: 12px;
  color: #8c8c8c;
}

.manager-badges {
  display: flex;
  gap: 6px;
}

.badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.badge.total {
  background: #f5f5f5;
  color: #595959;
}

.badge.completed {
  background: #f6ffed;
  color: #52c41a;
}

.badge.in-progress {
  background: #e6f7ff;
  color: #1890ff;
}

.expand-icon {
  color: #8c8c8c;
  font-size: 14px;
}

.manager-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 12px;
}

.progress-ring {
  flex-shrink: 0;
}

.progress-detail {
  flex: 1;
}

.progress-label {
  font-size: 12px;
  color: #8c8c8c;
}

.progress-value {
  font-size: 20px;
  font-weight: 600;
  color: #262626;
}

/* 机房列表 */
.room-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fafafa;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.room-row:hover {
  background: #f0f0f0;
}

.room-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.room-status-dot.planning { background: #d9d9d9; }
.room-status-dot.in_progress { background: #1890ff; }
.room-status-dot.completed { background: #52c41a; }
.room-status-dot.paused { background: #faad14; }

.room-name {
  flex: 1;
  font-size: 14px;
  color: #262626;
}

.room-status {
  font-size: 12px;
  color: #8c8c8c;
}

.room-progress-bar {
  width: 50px;
  height: 4px;
  background: #e8e8e8;
  border-radius: 2px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  border-radius: 2px;
}

.room-progress-text {
  font-size: 12px;
  color: #595959;
  width: 30px;
  text-align: right;
}

.room-row .el-icon-arrow-right {
  color: #bfbfbf;
  font-size: 12px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .manager-header {
    flex-wrap: wrap;
  }

  .manager-badges {
    width: 100%;
    margin-top: 8px;
  }
}
</style>