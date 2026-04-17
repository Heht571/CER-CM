<template>
  <div class="login-container">
    <!-- 深色 Hero 区 -->
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">机房建设监控平台</h1>
        <p class="hero-subtitle">实时追踪建设进度，高效管理机房任务</p>
      </div>
    </section>

    <!-- 登录卡片区 -->
    <section class="login-section">
      <div class="login-card">
        <h2 class="login-heading">登录系统</h2>

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
    </section>
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
  display: flex;
  flex-direction: column;
  background: #f5f5f7;
}

/* Hero 区 - 深色背景卡片 */
.hero-section {
  background: #000000;
  padding: 48px 32px;
  text-align: center;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 16px;
  border-radius: 18px;
}

.hero-content {
  max-width: 680px;
}

.hero-title {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: #ffffff;
  margin: 0 0 12px 0;
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

/* 登录区 - 浅色背景 */
.login-section {
  background: #f5f5f7;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #ffffff;
  border-radius: 18px;
  padding: 32px;
}

.login-heading {
  font-family: var(--font-display, 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.3;
  color: #1d1d1f;
  margin: 0 0 24px 0;
  text-align: center;
}

/* 表单 */
.login-form {
  margin-bottom: 24px;
}

.login-form .el-form-item {
  margin-bottom: 16px;
}

.login-btn {
  width: 100%;
  height: 36px;
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0;
  border-radius: 980px;
  border: none;
}

.login-footer {
  font-family: var(--font-text, 'Inter', -apple-system, BlinkMacSystemFont, sans-serif);
  font-size: 14px;
  letter-spacing: -0.224px;
  color: rgba(0, 0, 0, 0.48);
  text-align: center;
  margin: 0;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  .hero-section {
    padding: 32px 24px;
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

  .login-section {
    padding: 24px;
  }

  .login-heading {
    font-size: 16px;
    letter-spacing: 0;
    line-height: 1.5;
  }

  .login-card {
    max-width: 100%;
  }
}
</style>