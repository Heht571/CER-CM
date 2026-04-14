<template>
  <div class="dashboard">
    <!-- 顶部标题 -->
    <div class="dashboard-header">
      <h2>建设总览</h2>
      <p>按项目查看机房建设进度，点击项目卡片查看详情</p>
    </div>

    <!-- 项目卡片列表 -->
    <div class="project-grid" v-loading="loading">
      <el-empty v-if="projects.length === 0 && !loading" description="暂无项目数据"></el-empty>

      <div
        v-for="project in projects"
        :key="project.id"
        class="project-card"
        @click="goToProject(project.id)"
      >
        <!-- 项目头部 -->
        <div class="card-header">
          <div class="project-icon">
            <i class="el-icon-folder"></i>
          </div>
          <div class="project-meta">
            <div class="project-name">{{ project.name }}</div>
            <div class="project-code" v-if="project.code">{{ project.code }}</div>
          </div>
          <div class="project-status">
            <el-tag type="success" size="small">进行中</el-tag>
          </div>
        </div>

        <!-- 进度环 -->
        <div class="progress-section">
          <div class="progress-ring">
            <el-progress
              type="circle"
              :percentage="project.progress || 0"
              :width="70"
              :stroke-width="6"
              :color="getProgressColor(project.progress)"
            ></el-progress>
          </div>
          <div class="progress-info">
            <div class="progress-label">整体进度</div>
            <div class="progress-value">{{ project.progress || 0 }}%</div>
          </div>
        </div>

        <!-- 统计数据 -->
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-num">{{ project.stats?.total || 0 }}</div>
            <div class="stat-text">机房总数</div>
          </div>
          <div class="stat-item">
            <div class="stat-num in-progress">{{ project.stats?.inProgress || 0 }}</div>
            <div class="stat-text">建设中</div>
          </div>
          <div class="stat-item">
            <div class="stat-num completed">{{ project.stats?.completed || 0 }}</div>
            <div class="stat-text">已完成</div>
          </div>
        </div>

        <!-- 悬停提示 -->
        <div class="card-footer">
          <span>点击查看详情</span>
          <i class="el-icon-arrow-right"></i>
        </div>
      </div>

      <!-- 新建项目卡片（管理员可见） -->
      <div v-if="isAdmin" class="project-card add-card" @click="showCreateProjectDialog">
        <div class="add-content">
          <i class="el-icon-plus"></i>
          <span>新建项目</span>
        </div>
      </div>
    </div>

    <!-- 新建项目对话框 -->
    <el-dialog title="新建项目" :visible.sync="createProjectVisible" width="400px">
      <el-form :model="projectForm" :rules="projectRules" ref="projectForm" label-width="80px">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="projectForm.name" placeholder="请输入项目名称"></el-input>
        </el-form-item>
        <el-form-item label="项目编码">
          <el-input v-model="projectForm.code" placeholder="请输入项目编码（可选）"></el-input>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="projectForm.description" type="textarea" rows="2" placeholder="请输入项目描述"></el-input>
        </el-form-item>
      </el-form>
      <div slot="footer">
        <el-button @click="createProjectVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="handleCreateProject">创建</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getByProject } from '@/api/statistics'
import { createProject } from '@/api/project'
import { mapGetters } from 'vuex'

export default {
  name: 'Dashboard',
  data() {
    return {
      loading: false,
      projects: [],
      createProjectVisible: false,
      creating: false,
      projectForm: {
        name: '',
        code: '',
        description: ''
      },
      projectRules: {
        name: [
          { required: true, message: '请输入项目名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapGetters('auth', ['isAdmin'])
  },
  created() {
    this.loadProjects()
  },
  methods: {
    async loadProjects() {
      this.loading = true
      try {
        const res = await getByProject()
        this.projects = res.data
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    getProgressColor(progress) {
      if (progress >= 100) return '#52c41a'
      if (progress >= 70) return '#1890ff'
      if (progress >= 40) return '#faad14'
      return '#d9d9d9'
    },
    goToProject(projectId) {
      this.$router.push(`/projects/${projectId}`)
    },
    showCreateProjectDialog() {
      this.projectForm = { name: '', code: '', description: '' }
      this.createProjectVisible = true
    },
    async handleCreateProject() {
      this.$refs.projectForm.validate(async valid => {
        if (!valid) return

        this.creating = true
        try {
          await createProject(this.projectForm)
          this.$message.success('项目创建成功')
          this.createProjectVisible = false
          this.loadProjects()
        } catch (error) {
          console.error(error)
        } finally {
          this.creating = false
        }
      })
    }
  }
}
</script>

<style scoped>
.dashboard {
  min-height: 100%;
}

.dashboard-header {
  text-align: center;
  padding: 30px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin-bottom: 24px;
  color: #fff;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
}

.dashboard-header p {
  margin: 10px 0 0;
  font-size: 14px;
  opacity: 0.85;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid #f0f0f0;
}

.project-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-3px);
  border-color: #667eea;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.project-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
}

.project-meta {
  flex: 1;
}

.project-name {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
}

.project-code {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.progress-section {
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

.progress-info {
  flex: 1;
}

.progress-label {
  font-size: 13px;
  color: #8c8c8c;
}

.progress-value {
  font-size: 24px;
  font-weight: 700;
  color: #262626;
  margin-top: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  text-align: center;
}

.stat-item {
  padding: 10px;
  background: #f5f5f5;
  border-radius: 6px;
}

.stat-num {
  font-size: 20px;
  font-weight: 600;
  color: #595959;
}

.stat-num.in-progress {
  color: #1890ff;
}

.stat-num.completed {
  color: #52c41a;
}

.stat-text {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-top: 16px;
  color: #8c8c8c;
  font-size: 13px;
}

.card-footer i {
  font-size: 12px;
}

/* 新建项目卡片 */
.add-card {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  border-color: #d9d9d9;
}

.add-card:hover {
  border-color: #667eea;
  background: linear-gradient(to bottom, #f0f5ff 0%, #fff 100%);
}

.add-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #8c8c8c;
}

.add-content i {
  font-size: 32px;
  color: #667eea;
}

.add-content span {
  font-size: 14px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .dashboard-header {
    padding: 20px;
  }

  .dashboard-header h2 {
    font-size: 22px;
  }

  .project-grid {
    grid-template-columns: 1fr;
  }

  .project-card {
    padding: 16px;
  }
}
</style>