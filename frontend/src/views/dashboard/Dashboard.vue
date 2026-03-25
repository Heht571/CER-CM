<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="isMobile ? 10 : 20" class="stat-cards">
      <el-col :xs="12" :sm="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div class="stat-value">{{ overview.rooms?.total || 0 }}</div>
          <div class="stat-label">机房总数</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div class="stat-value">{{ overview.rooms?.in_progress || 0 }}</div>
          <div class="stat-label">建设中</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <div class="stat-value">{{ overview.rooms?.completed || 0 }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
          <div class="stat-value">{{ overview.tasks?.delayed || 0 }}</div>
          <div class="stat-label">延期任务</div>
        </div>
      </el-col>
    </el-row>

    <!-- 进度概览 -->
    <el-row :gutter="isMobile ? 10 : 20" style="margin-top: 20px;">
      <el-col :xs="24" :sm="8">
        <el-card header="总体进度">
          <div class="progress-circle">
            <el-progress
              type="circle"
              :percentage="overview.overallProgress || 0"
              :width="isMobile ? 120 : 150"
            ></el-progress>
          </div>
          <div class="progress-info">
            <p>已完成: {{ overview.tasks?.completed || 0 }} / {{ overview.tasks?.total || 0 }} 个任务</p>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card header="各阶段进度">
          <div v-for="phase in phaseStats" :key="phase.id" class="phase-item">
            <div class="phase-name">{{ phase.name }}</div>
            <el-progress
              :percentage="phase.percentage"
              :status="phase.percentage === 100 ? 'success' : ''"
            ></el-progress>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="8">
        <el-card header="建设方式分布">
          <div v-for="(count, type) in constructionTypeStats" :key="type" class="type-item">
            <div class="type-name">{{ getConstructionTypeText(type) }}</div>
            <div class="type-bar">
              <div class="type-count">{{ count }} 个</div>
              <el-progress
                :percentage="getConstructionPercentage(count)"
                :show-text="false"
              ></el-progress>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 机房列表 -->
    <el-card header="机房建设进度" style="margin-top: 20px;">
      <!-- 移动端卡片列表 -->
      <div v-if="isMobile" class="mobile-room-list">
        <div v-for="room in rooms" :key="room.id" class="mobile-room-card" @click="goToDetail(room.id)">
          <div class="room-header">
            <span class="room-name">{{ room.name }}</span>
            <el-tag size="small" :type="getStatusType(room.status)">
              {{ getStatusText(room.status) }}
            </el-tag>
          </div>
          <div class="room-info">
            <span class="room-location"><i class="el-icon-location"></i> {{ room.location || '未设置' }}</span>
            <span class="room-manager"><i class="el-icon-user"></i> {{ room.manager?.real_name || '未分配' }}</span>
          </div>
          <div class="room-progress">
            <el-progress
              :percentage="room.progress || 0"
              :status="room.progress === 100 ? 'success' : ''"
            ></el-progress>
          </div>
        </div>
      </div>
      <!-- PC端表格 -->
      <el-table v-else :data="rooms" style="width: 100%">
        <el-table-column prop="name" label="机房名称"></el-table-column>
        <el-table-column prop="location" label="位置"></el-table-column>
        <el-table-column label="负责人">
          <template slot-scope="scope">
            {{ scope.row.manager?.real_name || '未分配' }}
          </template>
        </el-table-column>
        <el-table-column label="状态">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度">
          <template slot-scope="scope">
            <el-progress
              :percentage="scope.row.progress || 0"
              :status="scope.row.progress === 100 ? 'success' : ''"
            ></el-progress>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template slot-scope="scope">
            <el-button type="text" @click="goToDetail(scope.row.id)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
import { getOverview, getByPhase, getRanking } from '@/api/statistics'
import { getRooms } from '@/api/room'
import { getRoomStatusText, getRoomStatusType, getConstructionTypeText } from '@/utils'

export default {
  name: 'Dashboard',
  data() {
    return {
      overview: {},
      phaseStats: [],
      rooms: [],
      constructionTypeStats: {},
      isMobile: false
    }
  },
  computed: {
    totalRooms() {
      return this.overview.rooms?.total || 0
    }
  },
  created() {
    this.loadData()
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.checkMobile)
  },
  methods: {
    checkMobile() {
      this.isMobile = window.innerWidth < 768
    },
    async loadData() {
      try {
        const [overviewRes, phaseRes, roomsRes] = await Promise.all([
          getOverview(),
          getByPhase(),
          getRooms({ pageSize: 10 })
        ])
        this.overview = overviewRes.data
        this.phaseStats = phaseRes.data
        this.rooms = roomsRes.data.list
        this.constructionTypeStats = overviewRes.data.constructionTypes || {}
      } catch (error) {
        console.error(error)
      }
    },
    getConstructionPercentage(count) {
      if (this.totalRooms === 0) return 0
      return Math.round((count / this.totalRooms) * 100)
    },
    getStatusType(status) {
      return getRoomStatusType(status)
    },
    getStatusText(status) {
      return getRoomStatusText(status)
    },
    getConstructionTypeText,
    goToDetail(id) {
      this.$router.push(`/rooms/${id}`)
    }
  }
}
</script>

<style scoped>
.stat-cards {
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  border-radius: 8px;
  color: #fff;
  text-align: center;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
}

.stat-label {
  font-size: 14px;
  margin-top: 8px;
  opacity: 0.9;
}

.progress-circle {
  text-align: center;
  padding: 20px 0;
}

.progress-info {
  text-align: center;
  color: #666;
}

.phase-item {
  margin-bottom: 15px;
}

.phase-name {
  margin-bottom: 5px;
  font-size: 14px;
  color: #666;
}

.type-item {
  margin-bottom: 15px;
}

.type-name {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.type-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-count {
  font-size: 13px;
  color: #999;
  min-width: 50px;
}

.type-bar .el-progress {
  flex: 1;
}

/* 移动端机房列表 */
.mobile-room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-room-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.mobile-room-card:hover {
  background: #f0f0f0;
}

.mobile-room-card .room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.mobile-room-card .room-name {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.mobile-room-card .room-info {
  display: flex;
  gap: 15px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 10px;
}

.mobile-room-card .room-info i {
  margin-right: 4px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .stat-card {
    padding: 15px;
  }

  .stat-value {
    font-size: 28px;
  }

  .stat-label {
    font-size: 12px;
  }

  .progress-circle {
    padding: 15px 0;
  }

  .el-col {
    margin-bottom: 10px;
  }
}
</style>