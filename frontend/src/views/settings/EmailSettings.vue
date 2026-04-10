<template>
  <div class="email-settings">
    <el-card>
      <div slot="header">
        <span>邮件服务配置</span>
        <el-tag :type="serviceStatus.connected ? 'success' : 'danger'" size="small" style="margin-left: 10px;">
          {{ serviceStatus.connected ? '连接正常' : (serviceStatus.enabled ? '连接异常' : '未启用') }}
        </el-tag>
      </div>

      <el-form ref="form" :model="form" :rules="rules" label-width="120px" v-loading="loading">
        <el-form-item label="启用邮件服务">
          <el-switch v-model="form.enabled"></el-switch>
        </el-form-item>

        <template v-if="form.enabled">
          <el-form-item label="SMTP服务器" prop="host">
            <el-input v-model="form.host" placeholder="例如: smtp.qq.com"></el-input>
          </el-form-item>

          <el-form-item label="SMTP端口" prop="port">
            <el-input-number v-model="form.port" :min="1" :max="65535"></el-input-number>
            <span style="margin-left: 10px; color: #909399;">SSL加密通常使用465端口</span>
          </el-form-item>

          <el-form-item label="使用SSL加密">
            <el-switch v-model="form.secure"></el-switch>
          </el-form-item>

          <el-form-item label="邮箱账号" prop="user">
            <el-input v-model="form.user" placeholder="发送邮件的邮箱地址"></el-input>
          </el-form-item>

          <el-form-item label="邮箱密码/授权码" prop="pass">
            <el-input
              v-model="form.pass"
              type="password"
              placeholder="邮箱密码或授权码"
              show-password
            ></el-input>
            <div style="color: #909399; font-size: 12px; margin-top: 5px;">
              QQ邮箱、163邮箱等需要使用授权码，而非登录密码
            </div>
          </el-form-item>

          <el-form-item label="发件人名称">
            <el-input v-model="form.from_name" placeholder="显示的发件人名称"></el-input>
          </el-form-item>

          <el-form-item label="发件人地址">
            <el-input v-model="form.from_address" placeholder="默认使用邮箱账号"></el-input>
          </el-form-item>

          <el-form-item label="测试发送">
            <el-input
              v-model="testEmail"
              placeholder="输入测试邮箱地址"
              style="width: 250px; margin-right: 10px;"
            ></el-input>
            <el-button type="primary" :loading="testing" @click="handleTestSend">发送测试邮件</el-button>
          </el-form-item>
        </template>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
        </el-form-item>
      </el-form>

      <!-- 常用邮箱配置说明 -->
      <el-collapse style="margin-top: 20px;">
        <el-collapse-item title="常用邮箱SMTP配置参考" name="help">
          <el-table :data="smtpHelpData" border size="small">
            <el-table-column prop="name" label="邮箱" width="120"></el-table-column>
            <el-table-column prop="host" label="SMTP服务器" width="150"></el-table-column>
            <el-table-column prop="port" label="端口" width="80"></el-table-column>
            <el-table-column prop="note" label="说明"></el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>
    </el-card>
  </div>
</template>

<script>
import { getEmailConfig, updateEmailConfig, getEmailStatus, testEmailSend } from '@/api/config'

export default {
  name: 'EmailSettings',
  data() {
    return {
      loading: false,
      saving: false,
      testing: false,
      testEmail: '',
      serviceStatus: { connected: false, enabled: false },
      form: {
        enabled: false,
        host: '',
        port: 465,
        secure: true,
        user: '',
        pass: '',
        from_name: '机房建设监控平台',
        from_address: ''
      },
      rules: {
        host: [{ required: true, message: '请输入SMTP服务器地址', trigger: 'blur' }],
        user: [{ required: true, message: '请输入邮箱账号', trigger: 'blur' }],
        pass: [{ required: true, message: '请输入邮箱密码或授权码', trigger: 'blur' }]
      },
      smtpHelpData: [
        { name: 'QQ邮箱', host: 'smtp.qq.com', port: '465', note: '需开启SMTP服务，使用授权码' },
        { name: '163邮箱', host: 'smtp.163.com', port: '465', note: '需开启SMTP服务，使用授权码' },
        { name: 'Gmail', host: 'smtp.gmail.com', port: '587', note: '需开启"允许不够安全的应用"或使用应用密码' },
        { name: '阿里企业邮箱', host: 'smtp.qiye.aliyun.com', port: '465', note: '使用邮箱密码' }
      ]
    }
  },
  created() {
    this.loadConfig()
    this.checkStatus()
  },
  methods: {
    async loadConfig() {
      this.loading = true
      try {
        const res = await getEmailConfig()
        this.form = {
          enabled: res.data.enabled || false,
          host: res.data.host || '',
          port: res.data.port || 465,
          secure: res.data.secure !== false,
          user: res.data.user || '',
          pass: '', // 密码不返回，保持为空
          from_name: res.data.from_name || '机房建设监控平台',
          from_address: res.data.from_address || ''
        }
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    async checkStatus() {
      try {
        const res = await getEmailStatus()
        this.serviceStatus = res.data
      } catch (error) {
        console.error(error)
      }
    },
    async handleSave() {
      // 如果启用，需要验证必填字段
      if (this.form.enabled) {
        try {
          await this.$refs.form.validate()
        } catch (error) {
          return
        }
      }

      this.saving = true
      try {
        await updateEmailConfig(this.form)
        this.$message.success('配置保存成功')
        this.checkStatus()
      } catch (error) {
        console.error(error)
      } finally {
        this.saving = false
      }
    },
    async handleTestSend() {
      if (!this.testEmail) {
        this.$message.warning('请输入测试邮箱地址')
        return
      }

      this.testing = true
      try {
        await testEmailSend(this.testEmail)
        this.$message.success('测试邮件已发送，请检查邮箱')
      } catch (error) {
        console.error(error)
      } finally {
        this.testing = false
      }
    }
  }
}
</script>

<style scoped>
.email-settings {
  max-width: 700px;
}
</style>