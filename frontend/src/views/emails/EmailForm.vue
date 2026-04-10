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
          <el-select
            v-model="selectedRecipientIds"
            multiple
            filterable
            placeholder="请选择接收人"
            style="width: 100%;"
            @change="handleRecipientChange"
          >
            <el-option
              v-for="user in recipientOptions"
              :key="user.id"
              :label="`${user.real_name} (${user.email})`"
              :value="user.id"
            ></el-option>
          </el-select>
          <div v-if="form.recipients.length > 0" style="margin-top: 10px;">
            <el-tag
              v-for="r in form.recipients"
              :key="r.email"
              closable
              style="margin-right: 5px;"
              @close="removeRecipient(r)"
            >{{ r.name || r.email }}</el-tag>
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
      recipientOptions: [],
      selectedRecipientIds: [],
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
        callback(new Error('请选择接收人'))
      } else {
        callback()
      }
    },
    async loadRecipients() {
      try {
        const res = await getRecipients()
        this.recipientOptions = res.data
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
        this.selectedRecipientIds = this.form.recipients.map(r => r.id)
      } catch (error) {
        console.error(error)
      }
    },
    handleRecipientChange(ids) {
      this.form.recipients = ids.map(id => {
        const user = this.recipientOptions.find(u => u.id === id)
        return {
          id: user.id,
          email: user.email,
          name: user.real_name
        }
      })
    },
    removeRecipient(recipient) {
      this.form.recipients = this.form.recipients.filter(r => r.email !== recipient.email)
      this.selectedRecipientIds = this.selectedRecipientIds.filter(id => id !== recipient.id)
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
</style>