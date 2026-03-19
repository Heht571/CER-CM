<template>
  <div class="user-form">
    <el-card :header="isEdit ? '编辑用户' : '创建用户'">
      <el-form ref="form" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit"></el-input>
        </el-form-item>
        <el-form-item v-if="!isEdit" label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码"></el-input>
        </el-form-item>
        <el-form-item label="姓名" prop="real_name">
          <el-input v-model="form.real_name" placeholder="请输入姓名"></el-input>
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin"></el-option>
            <el-option label="机房负责人" value="manager"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="form.department" placeholder="请输入部门"></el-input>
        </el-form-item>
        <el-form-item label="电话">
          <el-input v-model="form.phone" placeholder="请输入电话"></el-input>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱"></el-input>
        </el-form-item>
        <el-form-item v-if="isEdit" label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0"></el-switch>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
          <el-button @click="goBack">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { getUserDetail, createUser, updateUser } from '@/api/user'

export default {
  name: 'UserForm',
  data() {
    return {
      loading: false,
      isEdit: false,
      userId: null,
      form: {
        username: '',
        password: '',
        real_name: '',
        role: 'manager',
        department: '',
        phone: '',
        email: '',
        status: 1
      },
      rules: {
        username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
        password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
        real_name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
        role: [{ required: true, message: '请选择角色', trigger: 'change' }]
      }
    }
  },
  created() {
    this.userId = this.$route.params.id
    this.isEdit = !!this.userId
    if (this.isEdit) {
      this.loadUser()
    }
  },
  methods: {
    async loadUser() {
      try {
        const res = await getUserDetail(this.userId)
        this.form = { ...res.data, password: '' }
      } catch (error) {
        console.error(error)
      }
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return

        this.loading = true
        try {
          if (this.isEdit) {
            await updateUser(this.userId, this.form)
          } else {
            await createUser(this.form)
          }
          this.$message.success('保存成功')
          this.$router.push('/users')
        } catch (error) {
          console.error(error)
        } finally {
          this.loading = false
        }
      })
    },
    goBack() {
      this.$router.back()
    }
  }
}
</script>

<style scoped>
.user-form {
  max-width: 600px;
}
</style>