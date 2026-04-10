<template>
  <div class="dashboard">
    <!-- 顶部概览 -->
    <div class="overview-header">
      <div class="overview-title">
        <h2>建设总览</h2>
        <p>实时掌握机房建设进度</p>
      </div>
      <div class="overview-stats">
        <div class="stat-item">
          <div class="stat-number">{{ overview.rooms?.total || 0 }}</div>
          <div class="stat-text">机房总数</div>
        </div>
        <div class="stat-item">
          <div class="stat-number primary">{{ overview.rooms?.in_progress || 0 }}</div>
          <div class="stat-text">建设中</div>
        </div>
        <div class="stat-item">
          <div class="stat-number success">{{ overview.rooms?.completed || 0 }}</div>
          <div class="stat-text">已完成</div>
        </div>
        <div class="stat-item" v-if="overview.tasks?.delayed > 0">
          <div class="stat-number warning">{{ overview.tasks?.delayed || 0 }}</div>
          <div class="stat-text">延期任务</div>
        </div>
      </div>
    </div>

    <!-- 负责人看板 -->
    <div class="manager-board" v-loading="loading">
      <div v-if="managerStats.length === 0 && !loading" class="empty-state">
        <i class="el-icon-office-building"></i>
        <p>暂无机房数据</p>
      </div>

      <div v-else class="manager-cards">
        <div
          v-for="manager in managerStats"
          :key="manager.id || 'unassigned'"
          class="manager-card"
          :class="{ 'idle-warning': shouldWarn(manager) }"
        >
          <!-- 负责人头部 -->
          <div class="card-header">
            <div class="manager-avatar">
              <i class="el-icon-user"></i>
            </div>
            <div class="manager-meta">
              <div class="manager-name">{{ manager.name }}</div>
              <div class="manager-dept" v-if="manager.department">{{ manager.department }}</div>
            </div>
            <div class="manager-badges">
              <span class="badge total">{{ manager.stats.total }} 个机房</span>
              <span class="badge completed" v-if="manager.stats.completed">{{ manager.stats.completed }} 完成</span>
              <span class="badge progress" v-if="manager.stats.in_progress">{{ manager.stats.in_progress }} 在建</span>
            </div>
          </div>

          <!-- 进度环 -->
          <div class="progress-ring-section">
            <div class="progress-ring">
              <el-progress
                type="circle"
                :percentage="manager.stats.avgProgress"
                :width="80"
                :stroke-width="8"
                :color="getProgressColor(manager.stats.avgProgress)"
              ></el-progress>
            </div>
            <div class="progress-detail">
              <div class="progress-label">平均进度</div>
              <div class="progress-value">{{ manager.stats.avgProgress }}%</div>
            </div>
          </div>

          <!-- 更新状态 -->
          <div class="update-status" :class="getIdleClass(manager.idleDays)">
            <i :class="getIdleIcon(manager.idleDays)"></i>
            <span v-if="manager.lastUpdate">
              最近更新: {{ formatTime(manager.lastUpdate) }}
              <template v-if="manager.idleDays !== null">
                · {{ getIdleText(manager.idleDays) }}
              </template>
            </span>
            <span v-else>暂无更新记录</span>
          </div>

          <!-- 机房列表 -->
          <div class="room-list">
            <div
              v-for="room in manager.rooms"
              :key="room.id"
              class="room-row"
              @click="goToDetail(room.id)"
            >
              <div class="room-status-dot" :class="room.status"></div>
              <div class="room-name">{{ room.name }}</div>
              <div class="room-status">{{ getStatusText(room.status) }}</div>
              <div class="room-progress-bar">
                <div class="progress-fill" :style="{ width: room.progress + '%' }"></div>
              </div>
              <div class="room-progress-text">{{ room.progress }}%</div>
              <i class="el-icon-arrow-right"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getOverview, getByManager } from '@/api/statistics'
import { getRoomStatusText } from '@/utils'

export default {
  name: 'Dashboard',
  data() {
    return {
      loading: false,
      overview: {},
      managerStats: []
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    async loadData() {
      this.loading = true
      try {
        const [overviewRes, managerRes] = await Promise.all([
          getOverview(),
          getByManager()
        ])
        this.overview = overviewRes.data
        this.managerStats = managerRes.data
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    getStatusText(status) {
      return getRoomStatusText(status)
    },
    getProgressColor(progress) {
      if (progress >= 100) return '#52c41a'
      if (progress >= 70) return '#1890ff'
      if (progress >= 40) return '#faad14'
      return '#d9d9d9'
    },
    formatTime(time) {
      if (!time) return '-'
      const date = new Date(time)
      const now = new Date()
      const diff = now - date
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))

      if (days === 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        if (hours === 0) {
          const minutes = Math.floor(diff / (1000 * 60))
          return minutes <= 1 ? '刚刚' : `${minutes}分钟前`
        }
        return `${hours}小时前`
      } else if (days === 1) {
        return '昨天'
      } else if (days < 7) {
        return `${days}天前`
      } else {
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${month}-${day}`
      }
    },
    getIdleText(days) {
      if (days === 0) return '今日已更新'
      if (days === 1) return '1天未更新'
      if (days < 7) return `${days}天未更新`
      return `${Math.floor(days / 7)}周未更新`
    },
    getIdleClass(days) {
      if (days === null || days === undefined) return 'unknown'
      if (days === 0) return 'fresh'
      if (days <= 3) return 'normal'
      if (days <= 7) return 'warning'
      return 'danger'
    },
    getIdleIcon(days) {
      if (days === null || days === undefined) return 'el-icon-question'
      if (days === 0) return 'el-icon-check'
      if (days <= 3) return 'el-icon-time'
      if (days <= 7) return 'el-icon-warning'
      return 'el-icon-warning-outline'
    },
    shouldWarn(manager) {
      return manager.idleDays !== null && manager.idleDays > 7 && manager.stats.in_progress > 0
    },
    goToDetail(id) {
      this.$router.push(`/rooms/${id}`)
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100%;
}

/* 顶部概览 */
.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 32px 40px;
  border-radius: 12px;
  margin-bottom: 24px;
  color: #fff;
}

.overview-title h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.overview-title p {
  margin: 8px 0 0;
  font-size: 14px;
  opacity: 0.85;
}

.overview-stats {
  display: flex;
  gap: 32px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 36px;
  font-weight: 700;
  line-height: 1;
}

.stat-number.primary { color: #69c0ff; }
.stat-number.success { color: #95de64; }
.stat-number.warning { color: #ffc53d; }

.stat-text {
  font-size: 13px;
  margin-top: 8px;
  opacity: 0.85;
}

/* 负责人看板 */
.manager-board {
  min-height: 400px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 0;
  color: #bfbfbf;
}

.empty-state i {
  font-size: 64px;
  margin-bottom: 16px;
}

.manager-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

/* 负责人卡片 */
.manager-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 24px;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
}

.manager-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.manager-card.idle-warning {
  border-color: #faad14;
  background: linear-gradient(to bottom, #fffbe6 0%, #fff 60px);
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.manager-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
}

.manager-meta {
  flex: 1;
}

.manager-name {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.manager-dept {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 2px;
}

.manager-badges {
  display: flex;
  gap: 6px;
}

.badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.badge.total {
  background: #f5f5f5;
  color: #595959;
}

.badge.completed {
  background: #f6ffed;
  color: #52c41a;
}

.badge.progress {
  background: #e6f7ff;
  color: #1890ff;
}

/* 进度环区域 */
.progress-ring-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
}

.progress-ring {
  flex-shrink: 0;
}

.progress-detail {
  flex: 1;
}

.progress-label {
  font-size: 13px;
  color: #8c8c8c;
}

.progress-value {
  font-size: 28px;
  font-weight: 700;
  color: #262626;
  margin-top: 4px;
}

/* 更新状态 */
.update-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.update-status.fresh {
  background: #f6ffed;
  color: #52c41a;
}

.update-status.normal {
  background: #f5f5f5;
  color: #595959;
}

.update-status.warning {
  background: #fffbe6;
  color: #d48806;
}

.update-status.danger {
  background: #fff1f0;
  color: #cf1322;
}

.update-status.unknown {
  background: #f5f5f5;
  color: #8c8c8c;
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
  gap: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
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
  flex-shrink: 0;
}

.room-status-dot.planning { background: #d9d9d9; }
.room-status-dot.in_progress { background: #1890ff; }
.room-status-dot.completed { background: #52c41a; }
.room-status-dot.paused { background: #faad14; }

.room-name {
  flex: 1;
  font-size: 14px;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-status {
  font-size: 12px;
  color: #8c8c8c;
}

.room-progress-bar {
  width: 60px;
  height: 4px;
  background: #e8e8e8;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff, #52c41a);
  border-radius: 2px;
  transition: width 0.3s;
}

.room-progress-text {
  font-size: 12px;
  color: #595959;
  width: 36px;
  text-align: right;
}

.room-row .el-icon-arrow-right {
  color: #bfbfbf;
  font-size: 12px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .overview-header {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }

  .overview-stats {
    margin-top: 20px;
    gap: 24px;
  }

  .stat-number {
    font-size: 28px;
  }

  .manager-cards {
    grid-template-columns: 1fr;
  }

  .manager-card {
    padding: 16px;
  }

  .card-header {
    flex-wrap: wrap;
  }

  .manager-badges {
    width: 100%;
    margin-top: 8px;
  }

  .progress-ring-section {
    padding: 12px;
  }
}
</style>