<template>
  <div class="room-list">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="关键字">
          <el-input v-model="searchForm.keyword" placeholder="机房名称/编码" clearable></el-input>
        </el-form-item>
        <el-form-item label="建设方式">
          <el-select v-model="searchForm.construction_type" placeholder="全部" clearable>
            <el-option label="购置" value="purchase"></el-option>
            <el-option label="租赁" value="lease"></el-option>
            <el-option label="自建" value="self_build"></el-option>
            <el-option label="一体化集装箱" value="container"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="规划中" value="planning"></el-option>
            <el-option label="建设中" value="in_progress"></el-option>
            <el-option label="已完成" value="completed"></el-option>
            <el-option label="已暂停" value="paused"></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button v-if="isAdmin" type="success" @click="goToCreate">新建机房</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 机房列表 -->
    <el-card>
      <el-table :data="rooms" v-loading="loading" style="width: 100%">
        <el-table-column prop="code" label="机房编码" width="120"></el-table-column>
        <el-table-column prop="name" label="机房名称"></el-table-column>
        <el-table-column label="建设方式" width="120">
          <template slot-scope="scope">
            <el-tag size="small" type="info">{{ getConstructionTypeText(scope.row.construction_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="位置"></el-table-column>
        <el-table-column label="负责人">
          <template slot-scope="scope">
            {{ scope.row.manager?.real_name || '未分配' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template slot-scope="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="200">
          <template slot-scope="scope">
            <el-progress
              :percentage="scope.row.progress || 0"
              :status="scope.row.progress === 100 ? 'success' : ''"
            ></el-progress>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="120">
          <template slot-scope="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template slot-scope="scope">
            <el-button type="text" @click="goToDetail(scope.row.id)">查看</el-button>
            <el-button v-if="isAdmin" type="text" @click="goToEdit(scope.row.id)">编辑</el-button>
            <el-button v-if="isAdmin" type="text" class="danger" @click="handleDelete(scope.row)">删除</el-button>
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
import { getRooms, deleteRoom } from '@/api/room'
import { mapGetters } from 'vuex'

export default {
  name: 'RoomList',
  data() {
    return {
      loading: false,
      rooms: [],
      total: 0,
      page: 1,
      pageSize: 10,
      searchForm: {
        keyword: '',
        status: '',
        construction_type: ''
      }
    }
  },
  computed: {
    ...mapGetters('auth', ['isAdmin'])
  },
  created() {
    this.loadRooms()
  },
  methods: {
    async loadRooms() {
      this.loading = true
      try {
        const res = await getRooms({
          page: this.page,
          pageSize: this.pageSize,
          ...this.searchForm
        })
        this.rooms = res.data.list
        this.total = res.data.pagination.total
      } catch (error) {
        console.error(error)
      } finally {
        this.loading = false
      }
    },
    handleSearch() {
      this.page = 1
      this.loadRooms()
    },
    handleReset() {
      this.searchForm = { keyword: '', status: '', construction_type: '' }
      this.handleSearch()
    },
    handlePageChange(page) {
      this.page = page
      this.loadRooms()
    },
    handleSizeChange(size) {
      this.pageSize = size
      this.page = 1
      this.loadRooms()
    },
    goToCreate() {
      this.$router.push('/rooms/create')
    },
    goToDetail(id) {
      this.$router.push(`/rooms/${id}`)
    },
    goToEdit(id) {
      this.$router.push(`/rooms/${id}/edit`)
    },
    async handleDelete(row) {
      try {
        await this.$confirm(`确定要删除机房"${row.name}"吗？`, '提示', {
          type: 'warning'
        })
        await deleteRoom(row.id)
        this.$message.success('删除成功')
        this.loadRooms()
      } catch (error) {
        if (error !== 'cancel') {
          console.error(error)
        }
      }
    },
    getStatusType(status) {
      const types = {
        planning: 'info',
        in_progress: 'warning',
        completed: 'success',
        paused: 'danger'
      }
      return types[status] || 'info'
    },
    getStatusText(status) {
      const texts = {
        planning: '规划中',
        in_progress: '建设中',
        completed: '已完成',
        paused: '已暂停'
      }
      return texts[status] || status
    },
    getConstructionTypeText(type) {
      const texts = {
        purchase: '购置',
        lease: '租赁',
        self_build: '自建',
        container: '一体化集装箱'
      }
      return texts[type] || type
    },
    formatDate(date) {
      if (!date) return ''
      return new Date(date).toLocaleDateString()
    }
  }
}
</script>

<style scoped>
.search-card {
  margin-bottom: 20px;
}

.danger {
  color: #f56c6c;
}
</style>