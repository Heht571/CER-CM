<template>
  <div class="email-list-page">
    <!-- Hero 区 - 深色背景 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">邮件管理</h1>
        <p class="hero-subtitle">管理邮件任务，调度发送计划</p>
      </div>
      <div class="hero-actions">
        <el-tag :type="serviceStatus.connected ? 'success' : 'danger'" size="small">
          {{ serviceStatus.connected ? '服务正常' : '服务异常' }}
        </el-tag>
        <el-button type="primary" class="hero-btn" @click="goToCreate">新建邮件</el-button>
      </div>
    </section>

    <!-- 搜索栏 -->
    <section class="search-section">
      <div class="search-bar">
        <el-select
          v-model="searchForm.status"
          placeholder="全部状态"
          clearable
          style="width: 140px;"
          @change="handleSearch"
        >
          <el-option label="草稿" value="draft"></el-option>
          <el-option label="已调度" value="scheduled"></el-option>
          <el-option label="发送中" value="sending"></el-option>
          <el-option label="已发送" value="sent"></el-option>
          <el-option label="发送失败" value="failed"></el-option>
        </el-select>
        <el-input
          v-model="searchForm.keyword"
          placeholder="搜索主题"
          clearable
          style="width: 200px;"
          @keyup.enter.native="handleSearch"
        ></el-input>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <el-button type="text" @click="goToSettings">邮件设置</el-button>
      </div>
    </section>

    <!-- 邮件列表 -->
    <section class="list-section" v-loading="loading">
      <el-empty v-if="emails.length === 0 && !loading" description="暂无邮件任务"></el-empty>

      <div class="email-list">
        <div v-for="email in emails" :key="email.id" class="email-card">
          <div class="email-header">
            <div class="email-subject">{{ email.subject }}</div>
            <el-tag size="small" :type="statusType(email.status)">
              {{ statusText(email.status) }}
            </el-tag>
          </div>

          <div class="email-meta">
            <div class="meta-item">
              <span class="meta-label">接收人</span>
              <span class="meta-value">{{ email.recipients?.length || 0 }} 人</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">计划时间</span>
              <span class="meta-value">{{ formatTime(email.scheduled_time) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">重复</span>
              <el-tag v-if="email.repeat_type === 'none'" type="info" size="mini">单次</el-tag>
              <el-tag v-else type="warning" size="mini">{{ repeatText(email.repeat_type) }}</el-tag>
            </div>
            <div class="meta-item">
              <span class="meta-label">发送次数</span>
              <span class="meta-value">{{ email.sent_count || 0 }}</span>
            </div>
          </div>

          <div class="email-footer">
            <span class="creator">{{ email.creator?.real_name || '-' }}</span>
            <div class="email-actions">
              <el-button type="text" size="small" @click="goToDetail(email.id)">详情</el-button>
              <el-button
                v-if="email.status === 'draft' || email.status === 'scheduled'"
                type="text"
                size="small"
                @click="goToEdit(email.id)"
              >编辑</el-button>
              <el-button
                v-if="email.status === 'draft' || email.status === 'scheduled'"
                type="primary"
                size="mini"
                @click="handleSendNow(email)"
              >发送</el-button>
              <el-button
                v-if="email.status !== 'sending'"
                type="text"
                size="small"
                class="danger"
                @click="handleDelete(email)"
              >删除</el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next"
          :total="total"
          :page-size="pageSize"
          :current-page="page"
          :page-sizes="[10, 20, 50]"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        ></el-pagination>
      </div>
    </section>
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
.email-list-page {
  min-height: 100%;
}

/* Hero 区 - 深色背景卡片 */
.hero-section {
  background: #000000;
  padding: 32px 24px;
  margin: 0 0 24px 0;
  border-radius: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hero-content {
  flex: 1;
}

.hero-title {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: #ffffff;
  margin: 0 0 8px 0;
}

.hero-subtitle {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hero-btn {
  border-radius: 980px;
}

/* 搜索区 */
.search-section {
  background: #f5f5f7;
  padding: 16px 24px;
}

.search-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 列表区 */
.list-section {
  background: #f5f5f7;
  padding: 24px;
}

.email-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 邮件卡片 - Apple 无边框风格 */
.email-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px 24px;
}

.email-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.email-subject {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 1.5;
  color: #1d1d1f;
  flex: 1;
}

.email-meta {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.meta-value {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: 0;
  color: #1d1d1f;
}

.email-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
}

.creator {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
}

.email-actions {
  display: flex;
  gap: 8px;
}

.danger {
  color: #ff3b30;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 24px;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .hero-section {
    flex-direction: column;
    text-align: center;
    padding: 24px 16px;
    gap: 20px;
  }

  .hero-title {
    font-size: 24px;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .hero-subtitle {
    font-size: 14px;
    letter-spacing: 0;
    line-height: 1.5;
  }

  .hero-actions {
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .search-section {
    padding: 12px 16px;
  }

  .search-bar {
    flex-wrap: wrap;
    gap: 8px;
  }

  .search-bar .el-input,
  .search-bar .el-select {
    width: 100%;
  }

  .list-section {
    padding: 16px;
  }

  .email-card {
    padding: 16px;
  }

  .email-header {
    flex-direction: column;
    gap: 8px;
  }

  .email-subject {
    font-size: 14px;
    letter-spacing: 0;
  }

  .email-meta {
    flex-wrap: wrap;
    gap: 16px;
  }

  .email-footer {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .email-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 8px;
  }
}
</style>