<template>
  <div class="email-form">
    <el-card :header="isEdit ? '编辑邮件' : '创建邮件'">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="邮件主题" prop="subject">
          <el-input v-model="form.subject" placeholder="请输入邮件主题"></el-input>
        </el-form-item>

        <el-form-item label="邮件内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="10"
            placeholder="请输入邮件内容（支持HTML格式）"
          ></el-input>
        </el-form-item>

        <el-form-item label="接收人" prop="recipients">
          <!-- 快捷选择负责人 -->
          <div class="recipient-section">
            <div class="section-label">
              <i class="el-icon-user"></i>
              选择负责人
            </div>
            <el-select
              v-model="selectedManagers"
              multiple
              filterable
              placeholder="选择各机房负责人"
              style="width: 100%;"
              @change="handleManagerChange"
            >
              <el-option
                v-for="manager in managerOptions"
                :key="manager.id"
                :label="`${manager.real_name} (${manager.email})${manager.department ? ' - ' + manager.department : ''}`"
                :value="manager.id"
              ></el-option>
            </el-select>
          </div>

          <!-- 自定义邮箱输入 -->
          <div class="recipient-section">
            <div class="section-label">
              <i class="el-icon-message"></i>
              自定义邮箱
            </div>
            <div class="custom-email-input">
              <el-input
                v-model="customEmailInput"
                placeholder="输入邮箱地址，按回车添加"
                @keyup.enter.native="addCustomEmail"
              >
                <el-button slot="append" @click="addCustomEmail">添加</el-button>
              </el-input>
            </div>
          </div>

          <!-- 已选接收人列表 -->
          <div v-if="form.recipients.length > 0" class="recipient-list">
            <div class="list-header">
              <span>已选接收人 ({{ form.recipients.length }} 人)</span>
              <el-button type="text" size="small" @click="clearAllRecipients">清空</el-button>
            </div>
            <div class="recipient-tags">
              <el-tag
                v-for="r in form.recipients"
                :key="r.email"
                :type="r.type === 'manager' ? 'primary' : (r.type === 'user' ? 'success' : 'info')"
                closable
                @close="removeRecipient(r)"
              >
                <span v-if="r.type === 'manager'"><i class="el-icon-user"></i> {{ r.name }}</span>
                <span v-else-if="r.type === 'user'">{{ r.name }}</span>
                <span v-else><i class="el-icon-message"></i> {{ r.email }}</span>
              </el-tag>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="发送时间" prop="scheduled_time">
          <el-date-picker
            v-model="form.scheduled_time"
            type="datetime"
            placeholder="选择发送时间"
            :picker-options="pickerOptions"
            style="width: 100%;"
          ></el-date-picker>
        </el-form-item>

        <el-form-item label="重复类型">
          <el-select v-model="form.repeat_type" placeholder="请选择">
            <el-option label="单次发送" value="none"></el-option>
            <el-option label="每日重复" value="daily"></el-option>
            <el-option label="每周重复" value="weekly"></el-option>
            <el-option label="每月重复" value="monthly"></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio label="draft">保存为草稿</el-radio>
            <el-radio label="scheduled">立即调度</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
          <el-button v-if="form.status === 'scheduled'" type="success" :loading="sending" @click="handleSendNow">立即发送</el-button>
          <el-button @click="goBack">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { getEmailDetail, createEmail, updateEmail, getRecipients, sendEmailNow } from '@/api/email'

export default {
  name: 'EmailForm',
  data() {
    return {
      loading: false,
      sending: false,
      isEdit: false,
      emailId: null,
      managerOptions: [],
      userOptions: [],
      selectedManagers: [],
      customEmailInput: '',
      pickerOptions: {
        disabledDate(time) {
          return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
        }
      },
      form: {
        subject: '',
        content: '',
        recipients: [],
        scheduled_time: null,
        repeat_type: 'none',
        status: 'draft'
      },
      rules: {
        subject: [{ required: true, message: '请输入邮件主题', trigger: 'blur' }],
        content: [{ required: true, message: '请输入邮件内容', trigger: 'blur' }],
        recipients: [
          { required: true, validator: this.validateRecipients, trigger: 'change' }
        ],
        scheduled_time: [{ required: true, message: '请选择发送时间', trigger: 'change' }]
      }
    }
  },
  created() {
    this.emailId = this.$route.params.id
    this.isEdit = !!this.emailId
    this.loadRecipients()
    if (this.isEdit) {
      this.loadEmail()
    }
  },
  methods: {
    validateRecipients(rule, value, callback) {
      if (!value || value.length === 0) {
        callback(new Error('请选择或输入接收人'))
      } else {
        callback()
      }
    },
    async loadRecipients() {
      try {
        const res = await getRecipients()
        this.managerOptions = res.data.managers || []
        this.userOptions = res.data.users || []
      } catch (error) {
        console.error(error)
      }
    },
    async loadEmail() {
      try {
        const res = await getEmailDetail(this.emailId)
        this.form = {
          subject: res.data.subject,
          content: res.data.content,
          recipients: res.data.recipients || [],
          scheduled_time: new Date(res.data.scheduled_time),
          repeat_type: res.data.repeat_type || 'none',
          status: res.data.status
        }
        // 回显负责人选择
        this.selectedManagers = this.form.recipients
          .filter(r => r.type === 'manager' && r.id)
          .map(r => r.id)
      } catch (error) {
        console.error(error)
      }
    },
    handleManagerChange(ids) {
      // 先移除之前选择的负责人
      this.form.recipients = this.form.recipients.filter(r => r.type !== 'manager')

      // 添加新选择的负责人
      ids.forEach(id => {
        const manager = this.managerOptions.find(m => m.id === id)
        if (manager) {
          // 避免重复添加
          if (!this.form.recipients.find(r => r.email === manager.email)) {
            this.form.recipients.push({
              id: manager.id,
              email: manager.email,
              name: manager.real_name,
              type: 'manager'
            })
          }
        }
      })
    },
    addCustomEmail() {
      const email = this.customEmailInput.trim()
      if (!email) return

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        this.$message.warning('请输入有效的邮箱地址')
        return
      }

      // 避免重复添加
      if (this.form.recipients.find(r => r.email === email)) {
        this.$message.warning('该邮箱已添加')
        this.customEmailInput = ''
        return
      }

      // 添加自定义邮箱
      this.form.recipients.push({
        email: email,
        name: email,
        type: 'custom'
      })

      this.customEmailInput = ''
    },
    removeRecipient(recipient) {
      this.form.recipients = this.form.recipients.filter(r => r.email !== recipient.email)

      // 如果是负责人，也要从下拉选择中移除
      if (recipient.type === 'manager' && recipient.id) {
        this.selectedManagers = this.selectedManagers.filter(id => id !== recipient.id)
      }
    },
    clearAllRecipients() {
      this.form.recipients = []
      this.selectedManagers = []
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return

        this.loading = true
        try {
          const data = {
            ...this.form,
            scheduled_time: this.form.scheduled_time.toISOString()
          }

          if (this.isEdit) {
            await updateEmail(this.emailId, data)
          } else {
            await createEmail(data)
          }
          this.$message.success('保存成功')
          this.$router.push('/emails')
        } catch (error) {
          console.error(error)
        } finally {
          this.loading = false
        }
      })
    },
    async handleSendNow() {
      try {
        await this.$confirm('确定要立即发送此邮件吗？', '提示', { type: 'warning' })
        this.sending = true
        await sendEmailNow(this.emailId || (await createEmail({ ...this.form, scheduled_time: this.form.scheduled_time.toISOString() })).data.id)
        this.$message.success('发送成功')
        this.$router.push('/emails')
      } catch (error) {
        if (error !== 'cancel') {
          console.error(error)
        }
      } finally {
        this.sending = false
      }
    },
    goBack() {
      this.$router.back()
    }
  }
}
</script>

<style scoped>
.email-form {
  max-width: 800px;
}

.recipient-section {
  margin-bottom: 12px;
}

.section-label {
  font-size: 13px;
  color: #8c8c8c;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.custom-email-input {
  display: flex;
}

.recipient-list {
  margin-top: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #595959;
}

.recipient-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.recipient-tags .el-tag {
  max-width: 200px;
}

.recipient-tags .el-tag i {
  margin-right: 4px;
}
</style>