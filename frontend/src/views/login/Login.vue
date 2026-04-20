<template>
  <div class="login-container">
    <div class="login-wrapper">
      <div class="page-header">
        <h1 class="app-title">机房建设监控平台</h1>
        <p class="app-subtitle">实时追踪建设进度，高效管理机房任务</p>
      </div>

      <div class="login-card">
        <el-form ref="form" :model="form" :rules="rules" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="form.username"
              placeholder="用户名"
              size="large"
            ></el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="密码"
              size="large"
              show-password
              @keyup.enter.native="handleLogin"
            ></el-input>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              :loading="loading"
              class="login-btn"
              @click="handleLogin"
            >
              <span v-if="!loading">登录</span>
              <span v-else>验证中...</span>
            </el-button>
          </el-form-item>
        </el-form>

        <p class="login-footer">汇聚机房建设进度监控</p>
      </div>
    </div>
  </div>
</template>

<script>
import { login } from '@/api/auth'
import { mapActions } from 'vuex'

export default {
  name: 'Login',
  data() {
    return {
      form: {
        username: '',
        password: ''
      },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
      },
      loading: false
    }
  },
  methods: {
    ...mapActions('auth', { loginVuex: 'login' }),
    handleLogin() {
      this.$refs.form.validate(async valid => {
        if (!valid) return

        this.loading = true
        try {
          const res = await login(this.form)
          this.loginVuex(res.data)
          this.$message.success('登录成功')
          window.location.href = res.data.user.role === 'admin' ? '/dashboard' : '/tasks'
        } catch (error) {
          console.error(error)
          this.$message.error('登录失败，请检查用户名和密码')
        } finally {
          this.loading = false
        }
      })
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-wrapper {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.page-header {
  text-align: center;
}

.app-title {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 36px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: #ffffff;
  margin: 0 0 12px 0;
}

.app-subtitle {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif);
  font-size: 17px;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.login-card {
  width: 100%;
  background: #ffffff;
  border-radius: 18px;
  padding: 32px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

.login-form {
  margin-bottom: 20px;
}

.login-form .el-form-item {
  margin-bottom: 16px;
}

.login-btn {
  width: 100%;
  height: 36px;
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0;
  border-radius: 980px;
  border: none;
}

.login-footer {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);
  text-align: center;
  margin: 0;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .login-container {
    padding: 16px;
  }

  .login-wrapper {
    gap: 20px;
  }

  .app-title {
    font-size: 26px;
  }

  .app-subtitle {
    font-size: 14px;
  }

  .login-card {
    padding: 24px;
  }
}
</style>