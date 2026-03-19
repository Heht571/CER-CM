<template>
  <div class="profile">
    <el-card header="个人信息">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
        <el-descriptions-item label="姓名">{{ user.real_name }}</el-descriptions-item>
        <el-descriptions-item label="角色">
          <el-tag :type="user.role === 'admin' ? 'danger' : 'primary'">
            {{ user.role === 'admin' ? '管理员' : '机房负责人' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="部门">{{ user.department || '-' }}</el-descriptions-item>
        <el-descriptions-item label="电话">{{ user.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ user.email || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card header="修改密码" style="margin-top: 20px;">
      <el-form ref="passwordForm" :model="passwordForm" :rules="passwordRules" label-width="100px" style="max-width: 400px;">
        <el-form-item label="旧密码" prop="oldPassword">
          <el-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入旧密码"></el-input>
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码"></el-input>
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleChangePassword">修改密码</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { changePassword } from '@/api/auth'
import { mapGetters } from 'vuex'

export default {
  name: 'Profile',
  data() {
    const validateConfirmPassword = (rule, value, callback) => {
      if (value !== this.passwordForm.newPassword) {
        callback(new Error('两次输入的密码不一致'))
      } else {
        callback()
      }
    }

    return {
      loading: false,
      passwordForm: {
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      },
      passwordRules: {
        oldPassword: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
        newPassword: [
          { required: true, message: '请输入新密码', trigger: 'blur' },
          { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
        ],
        confirmPassword: [
          { required: true, message: '请再次输入新密码', trigger: 'blur' },
          { validator: validateConfirmPassword, trigger: 'blur' }
        ]
      }
    }
  },
  computed: {
    ...mapGetters('auth', ['currentUser']),
    user() {
      return this.currentUser
    }
  },
  methods: {
    handleChangePassword() {
      this.$refs.passwordForm.validate(async valid => {
        if (!valid) return

        this.loading = true
        try {
          await changePassword({
            oldPassword: this.passwordForm.oldPassword,
            newPassword: this.passwordForm.newPassword
          })
          this.$message.success('密码修改成功')
          this.$refs.passwordForm.resetFields()
        } catch (error) {
          console.error(error)
        } finally {
          this.loading = false
        }
      })
    }
  }
}
</script>

<style scoped>
.profile {
  max-width: 800px;
}
</style>