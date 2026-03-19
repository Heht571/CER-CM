<template>
  <div class="user-list">
    <el-card>
      <div slot="header">
        <span>用户管理</span>
        <el-button type="primary" size="small" style="float: right;" @click="goToCreate">新建用户</el-button>
      </div>

      <!-- 搜索 -->
      <el-form :inline="true" :model="searchForm" style="margin-bottom: 20px;">
        <el-form-item label="关键字">
          <el-input v-model="searchForm.keyword" placeholder="用户名/姓名" clearable></el-input>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="searchForm.role" placeholder="全部" clearable>
            <el-option label="管理员" value="admin"></el-option>
            <el-option label="机房负责人" value="manager"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 用户列表 -->
      <el-table :data="users" v-loading="loading">
        <el-table-column prop="username" label="用户名" width="120"></el-table-column>
        <el-table-column prop="real_name" label="姓名" width="120"></el-table-column>
        <el-table-column label="角色" width="100">
          <template slot-scope="scope">
            <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'primary'" size="small">
              {{ scope.row.role === 'admin' ? '管理员' : '负责人' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="department" label="部门"></el-table-column>
        <el-table-column prop="phone" label="电话" width="130"></el-table-column>
        <el-table-column label="状态" width="80">
          <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'" size="small">
              {{ scope.row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="负责机房" width="120">
          <template slot-scope="scope">
            <span v-if="scope.row.managedRooms && scope.row.managedRooms.length">
              {{ scope.row.managedRooms.length }} 个
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template slot-scope="scope">
            <el-button type="text" @click="goToEdit(scope.row.id)">编辑</el-button>
            <el-button type="text" @click="handleResetPassword(scope.row)">重置密码</el-button>
            <el-button type="text" class="danger" @click="handleDelete(scope.row)">删除</el-button>
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
import { getUsers, deleteUser, resetPassword } from '@/api/user'

export default {
  name: 'UserList',
  data() {
    return {
      loading: false,
      users: [],
      total: 0,
      page: 1,
      pageSize: 10,
      searchForm: {
        keyword: '',
        role: ''
      }
    }
  },
  created() {
    this.loadUsers()
  },
  methods: {
    async loadUsers() {
      this.loading = true
      try {
        const res = await getUsers({
          page: this.page,
          pageSize: this.pageSize,
          ...this.searchForm
        })
        this.users = res.data.list
        this.total = res.data.pagination.total
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.page = 1
      this.loadUsers()
    },
    handleReset() {
      this.searchForm = { keyword: '', role: '' }
      this.handleSearch()
    },
    handlePageChange(page) {
      this.page = page
      this.loadUsers()
    },
    handleSizeChange(size) {
      this.pageSize = size
      this.page = 1
      this.loadUsers()
    },
    goToCreate() {
      this.$router.push('/users/create')
    },
    goToEdit(id) {
      this.$router.push(`/users/${id}/edit`)
    },
    async handleResetPassword(user) {
      try {
        const { value } = await this.$prompt('请输入新密码', '重置密码', {
          inputPattern: /^.{6,}$/,
          inputErrorMessage: '密码长度不能少于6位'
        })
        await resetPassword(user.id, { newPassword: value })
        this.$message.success('密码重置成功')
      } catch (error) {
        if (error !== 'cancel') {
          console.error(error)
        }
      }
    },
    async handleDelete(user) {
      try {
        await this.$confirm(`确定要删除用户"${user.real_name}"吗？`, '提示', {
          type: 'warning'
        })
        await deleteUser(user.id)
        this.$message.success('删除成功')
        this.loadUsers()
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