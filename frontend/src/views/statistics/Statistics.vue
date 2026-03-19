<template>
  <div class="statistics">
    <!-- 概览卡片 -->
    <el-row :gutter="20">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ overview.rooms?.total || 0 }}</div>
          <div class="stat-label">机房总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ overview.managers || 0 }}</div>
          <div class="stat-label">负责人数量</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-value">{{ overview.tasks?.total || 0 }}</div>
          <div class="stat-label">任务总数</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card danger">
          <div class="stat-value">{{ overview.tasks?.delayed || 0 }}</div>
          <div class="stat-label">延期任务</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 阶段统计 -->
    <el-card header="各阶段进度统计" style="margin-top: 20px;">
      <el-table :data="phaseStats">
        <el-table-column prop="name" label="阶段名称"></el-table-column>
        <el-table-column prop="total" label="任务总数" width="100"></el-table-column>
        <el-table-column prop="completed" label="已完成" width="100"></el-table-column>
        <el-table-column prop="inProgress" label="进行中" width="100"></el-table-column>
        <el-table-column label="完成率" width="200">
          <template slot-scope="scope">
            <el-progress :percentage="scope.row.percentage" :status="scope.row.percentage === 100 ? 'success' : ''"></el-progress>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 机房排行 -->
    <el-card header="机房建设进度排行" style="margin-top: 20px;">
      <el-table :data="ranking" max-height="400">
        <el-table-column type="index" label="排名" width="60"></el-table-column>
        <el-table-column prop="name" label="机房名称"></el-table-column>
        <el-table-column label="负责人" width="100">
          <template slot-scope="scope">
            {{ scope.row.manager?.real_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="200">
          <template slot-scope="scope">
            <el-progress :percentage="scope.row.progress" :status="scope.row.progress === 100 ? 'success' : ''"></el-progress>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 延期预警 -->
    <el-card header="延期预警" style="margin-top: 20px;">
      <el-table :data="delayedTasks" max-height="400">
        <el-table-column prop="name" label="任务名称"></el-table-column>
        <el-table-column label="所属机房" width="150">
          <template slot-scope="scope">
            {{ scope.row.room?.name }}
          </template>
        </el-table-column>
        <el-table-column label="负责人" width="100">
          <template slot-scope="scope">
            {{ scope.row.room?.manager?.real_name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="计划完成日期" width="120">
          <template slot-scope="scope">
            {{ scope.row.planned_end_date }}
          </template>
        </el-table-column>
        <el-table-column label="延期天数" width="100">
          <template slot-scope="scope">
            <span style="color: #f56c6c;">{{ scope.row.delayDays }} 天</span>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="delayedTasks.length === 0" description="暂无延期任务"></el-empty>
    </el-card>
  </div>
</template>

<script>
import { getOverview, getByPhase, getDelayed, getRanking } from '@/api/statistics'

export default {
  name: 'Statistics',
  data() {
    return {
      overview: {},
      phaseStats: [],
      delayedTasks: [],
      ranking: []
    }
  },
  created() {
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        const [overviewRes, phaseRes, delayedRes, rankingRes] = await Promise.all([
          getOverview(),
          getByPhase(),
          getDelayed(),
          getRanking()
        ])
        this.overview = overviewRes.data
        this.phaseStats = phaseRes.data
        this.delayedTasks = delayedRes.data
        this.ranking = rankingRes.data
      } catch (error) {
        console.error(error)
      }
    },
    getStatusType(status) {
      const types = {
        planning: 'info',
        in_progress: 'warning',
        completed: 'success',
        paused: 'danger'
      }
      return types[status] || 'info'
    },
    getStatusText(status) {
      const texts = {
        planning: '规划中',
        in_progress: '建设中',
        completed: '已完成',
        paused: '已暂停'
      }
      return texts[status] || status
    }
  }
}
</script>

<style scoped>
.stat-card {
  text-align: center;
  padding: 10px 0;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

.stat-card.danger .stat-value {
  color: #f56c6c;
}
</style>