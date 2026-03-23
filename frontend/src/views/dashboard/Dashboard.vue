<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
          <div class="stat-value">{{ overview.rooms?.total || 0 }}</div>
          <div class="stat-label">机房总数</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">
          <div class="stat-value">{{ overview.rooms?.in_progress || 0 }}</div>
          <div class="stat-label">建设中</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">
          <div class="stat-value">{{ overview.rooms?.completed || 0 }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);">
          <div class="stat-value">{{ overview.tasks?.delayed || 0 }}</div>
          <div class="stat-label">延期任务</div>
        </div>
      </el-col>
    </el-row>

    <!-- 进度概览 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="8">
        <el-card header="总体进度">
          <div class="progress-circle">
            <el-progress
              type="circle"
              :percentage="overview.overallProgress || 0"
              :width="150"
            ></el-progress>
          </div>
          <div class="progress-info">
            <p>已完成: {{ overview.tasks?.completed || 0 }} / {{ overview.tasks?.total || 0 }} 个任务</p>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
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
      <el-col :span="8">
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
      <el-table :data="rooms" style="width: 100%">
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
      constructionTypeStats: {}
    }
  },
  computed: {
    totalRooms() {
      return this.overview.rooms?.total || 0
    }
  },
  created() {
    this.loadData()
  },
  methods: {
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
</style>