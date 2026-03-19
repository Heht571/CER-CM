<template>
  <div class="task-list">
    <el-card>
      <div slot="header">
        <span>我的任务</span>
      </div>

      <!-- 筛选 -->
      <el-form :inline="true" :model="searchForm" style="margin-bottom: 20px;">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="未开始" value="not_started"></el-option>
            <el-option label="进行中" value="in_progress"></el-option>
            <el-option label="已完成" value="completed"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 任务列表 -->
      <el-table :data="tasks" v-loading="loading">
        <el-table-column prop="name" label="任务名称"></el-table-column>
        <el-table-column label="所属机房" width="150">
          <template slot-scope="scope">
            {{ scope.row.room?.name }}
          </template>
        </el-table-column>
        <el-table-column label="阶段" width="120">
          <template slot-scope="scope">
            {{ scope.row.phase?.name }}
          </template>
        </el-table-column>
        <el-table-column prop="responsible_department" label="责任部门" width="120"></el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)" size="small">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="150">
          <template slot-scope="scope">
            <el-progress :percentage="scope.row.progress" :show-text="false"></el-progress>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template slot-scope="scope">
            <el-button type="text" @click="showUpdateDialog(scope.row)">更新进度</el-button>
            <el-button type="text" @click="goToRoom(scope.row.room_id)">查看机房</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        style="margin-top: 20px; text-align: right;"
        background
        layout="total, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        @current-change="handlePageChange"
      ></el-pagination>
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
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate">确定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { getTasks, updateTaskStatus, updateTaskProgress } from '@/api/task'

export default {
  name: 'TaskList',
  data() {
    return {
      loading: false,
      tasks: [],
      total: 0,
      page: 1,
      pageSize: 20,
      searchForm: {
        status: ''
      },
      dialogVisible: false,
      currentTask: null,
      taskForm: {
        status: 'not_started',
        progress: 0,
        remark: ''
      }
    }
  },
  created() {
    this.loadTasks()
  },
  methods: {
    async loadTasks() {
      this.loading = true
      try {
        const res = await getTasks({
          page: this.page,
          pageSize: this.pageSize,
          ...this.searchForm
        })
        this.tasks = res.data.list
        this.total = res.data.pagination.total
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.page = 1
      this.loadTasks()
    },
    handleReset() {
      this.searchForm = { status: '' }
      this.handleSearch()
    },
    handlePageChange(page) {
      this.page = page
      this.loadTasks()
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
        // 更新状态
        if (this.taskForm.status !== this.currentTask.status) {
          await updateTaskStatus(this.currentTask.id, {
            status: this.taskForm.status,
            remark: this.taskForm.remark
          })
        }
        // 更新进度
        if (this.taskForm.progress !== this.currentTask.progress) {
          await updateTaskProgress(this.currentTask.id, {
            progress: this.taskForm.progress,
            remark: this.taskForm.remark
          })
        }
        this.$message.success('更新成功')
        this.dialogVisible = false
        this.loadTasks()
      } catch (error) {
        console.error(error)
      }
    },
    goToRoom(roomId) {
      this.$router.push(`/rooms/${roomId}`)
    },
    getStatusType(status) {
      const types = {
        not_started: 'info',
        in_progress: 'warning',
        completed: 'success'
      }
      return types[status] || 'info'
    },
    getStatusText(status) {
      const texts = {
        not_started: '未开始',
        in_progress: '进行中',
        completed: '已完成'
      }
      return texts[status] || status
    }
  }
}
</script>

<style scoped>
</style>