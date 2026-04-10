<template>
  <div class="email-list">
    <el-card>
      <div slot="header">
        <span>邮件任务管理</span>
        <div style="float: right;">
          <el-tag :type="serviceStatus.connected ? 'success' : 'danger'" size="small">
            {{ serviceStatus.connected ? '服务正常' : '服务异常' }}
          </el-tag>
          <el-button size="small" style="margin-left: 10px;" @click="goToSettings">邮件设置</el-button>
          <el-button type="primary" size="small" style="margin-left: 10px;" @click="goToCreate">新建邮件</el-button>
        </div>
      </div>

      <!-- 搜索 -->
      <el-form :inline="true" :model="searchForm" style="margin-bottom: 20px;">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="草稿" value="draft"></el-option>
            <el-option label="已调度" value="scheduled"></el-option>
            <el-option label="发送中" value="sending"></el-option>
            <el-option label="已发送" value="sent"></el-option>
            <el-option label="发送失败" value="failed"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="主题">
          <el-input v-model="searchForm.keyword" placeholder="搜索主题" clearable></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 邮件列表 -->
      <el-table :data="emails" v-loading="loading">
        <el-table-column prop="subject" label="主题" min-width="200"></el-table-column>
        <el-table-column label="接收人" min-width="150">
          <template slot-scope="scope">
            <span v-if="scope.row.recipients && scope.row.recipients.length">
              {{ scope.row.recipients.length }} 人
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="计划发送时间" width="160">
          <template slot-scope="scope">
            {{ formatTime(scope.row.scheduled_time) }}
          </template>
        </el-table-column>
        <el-table-column label="重复" width="80">
          <template slot-scope="scope">
            <el-tag v-if="scope.row.repeat_type === 'none'" type="info" size="small">单次</el-tag>
            <el-tag v-else type="warning" size="small">{{ repeatText(scope.row.repeat_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="statusType(scope.row.status)" size="small">
              {{ statusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发送次数" width="80">
          <template slot-scope="scope">
            {{ scope.row.sent_count || 0 }}
          </template>
        </el-table-column>
        <el-table-column label="创建人" width="100">
          <template slot-scope="scope">
            {{ scope.row.creator ? scope.row.creator.real_name : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template slot-scope="scope">
            <el-button type="text" @click="goToDetail(scope.row.id)">详情</el-button>
            <el-button
              v-if="scope.row.status === 'draft' || scope.row.status === 'scheduled'"
              type="text"
              @click="goToEdit(scope.row.id)"
            >编辑</el-button>
            <el-button
              v-if="scope.row.status === 'draft' || scope.row.status === 'scheduled'"
              type="text"
              @click="handleSendNow(scope.row)"
            >发送</el-button>
            <el-button
              v-if="scope.row.status !== 'sending'"
              type="text"
              class="danger"
              @click="handleDelete(scope.row)"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        style="margin-top: 20px; text-align: right;"
        background
        layout="total, sizes, prev, pager, next"
        :total="total"
        :page-size="pageSize"
        :current-page="page"
        :page-sizes="[10, 20, 50]"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      ></el-pagination>
    </el-card>
  </div>
</template>

<script>
import { getEmails, deleteEmail, sendEmailNow, getEmailServiceStatus } from '@/api/email'

export default {
  name: 'EmailList',
  data() {
    return {
      loading: false,
      emails: [],
      total: 0,
      page: 1,
      pageSize: 10,
      serviceStatus: { connected: false, message: '' },
      searchForm: {
        status: '',
        keyword: ''
      }
    }
  },
  created() {
    this.loadEmails()
    this.checkServiceStatus()
  },
  methods: {
    async loadEmails() {
      this.loading = true
      try {
        const res = await getEmails({
          page: this.page,
          pageSize: this.pageSize,
          ...this.searchForm
        })
        this.emails = res.data.list
        this.total = res.data.pagination.total
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    async checkServiceStatus() {
      try {
        const res = await getEmailServiceStatus()
        this.serviceStatus = res.data
      } catch (error) {
        console.error(error)
      }
    },
    formatTime(time) {
      if (!time) return '-'
      return new Date(time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    },
    statusType(status) {
      const types = {
        draft: 'info',
        scheduled: 'warning',
        sending: '',
        sent: 'success',
        failed: 'danger'
      }
      return types[status] || 'info'
    },
    statusText(status) {
      const texts = {
        draft: '草稿',
        scheduled: '已调度',
        sending: '发送中',
        sent: '已发送',
        failed: '失败'
      }
      return texts[status] || status
    },
    repeatText(type) {
      const texts = {
        daily: '每日',
        weekly: '每周',
        monthly: '每月'
      }
      return texts[type] || type
    },
    handleSearch() {
      this.page = 1
      this.loadEmails()
    },
    handleReset() {
      this.searchForm = { status: '', keyword: '' }
      this.handleSearch()
    },
    handlePageChange(page) {
      this.page = page
      this.loadEmails()
    },
    handleSizeChange(size) {
      this.pageSize = size
      this.page = 1
      this.loadEmails()
    },
    goToCreate() {
      this.$router.push('/emails/create')
    },
    goToEdit(id) {
      this.$router.push(`/emails/${id}/edit`)
    },
    goToDetail(id) {
      this.$router.push(`/emails/${id}`)
    },
    goToSettings() {
      this.$router.push('/settings/email')
    },
    async handleSendNow(email) {
      try {
        await this.$confirm('确定要立即发送此邮件吗？', '提示', { type: 'warning' })
        this.loading = true
        const res = await sendEmailNow(email.id)
        this.$message.success(res.message)
        this.loadEmails()
      } catch (error) {
        if (error !== 'cancel') {
          console.error(error)
        }
      } finally {
        this.loading = false
      }
    },
    async handleDelete(email) {
      try {
        await this.$confirm(`确定要删除邮件"${email.subject}"吗？`, '提示', { type: 'warning' })
        await deleteEmail(email.id)
        this.$message.success('删除成功')
        this.loadEmails()
      } catch (error) {
        if (error !== 'cancel') {
          console.error(error)
        }
      }
    }
  }
}
</script>

<style scoped>
.danger {
  color: #f56c6c;
}
</style>