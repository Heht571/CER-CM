<template>
  <div class="room-list">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :inline="!isMobile" :model="searchForm">
        <el-form-item label="关键字">
          <el-input v-model="searchForm.keyword" placeholder="机房名称/编码" clearable></el-input>
        </el-form-item>
        <el-form-item label="建设方式">
          <el-select v-model="searchForm.construction_type" placeholder="全部" clearable>
            <el-option
              v-for="item in constructionTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option
              v-for="item in roomStatusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="searchForm.manager_id" placeholder="全部" clearable>
            <el-option
              v-for="manager in managers"
              :key="manager.id"
              :label="manager.real_name"
              :value="manager.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button v-if="!isMobile" type="info" @click="handleExport">导出</el-button>
          <el-button v-if="isAdmin && !isMobile" type="success" @click="goToCreate">新建机房</el-button>
        </el-form-item>
        <!-- 移动端操作按钮 -->
        <el-form-item v-if="isMobile">
          <el-button v-if="isAdmin" type="success" size="small" @click="goToCreate">
            <i class="el-icon-plus"></i> 新建
          </el-button>
          <el-button type="info" size="small" @click="handleExport">
            <i class="el-icon-download"></i>
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 机房列表 -->
    <el-card>
      <!-- 移动端卡片列表 -->
      <div v-if="isMobile" class="mobile-room-list">
        <div v-for="room in rooms" :key="room.id" class="mobile-room-card" @click="goToDetail(room.id)">
          <div class="room-header">
            <div class="room-title">
              <span class="room-name">{{ room.name }}</span>
              <span class="room-code">{{ room.code }}</span>
            </div>
            <el-tag :type="getRoomStatusType(room.status)" size="small">
              {{ getRoomStatusText(room.status) }}
            </el-tag>
          </div>
          <div class="room-info">
            <div class="info-row">
              <span class="label"><i class="el-icon-location"></i></span>
              <span>{{ room.location || '未设置' }}</span>
            </div>
            <div class="info-row">
              <span class="label"><i class="el-icon-user"></i></span>
              <span>{{ room.manager?.real_name || '未分配' }}</span>
            </div>
            <div class="info-row">
              <span class="label">方式：</span>
              <span>{{ getConstructionTypeText(room.construction_type) }}</span>
            </div>
          </div>
          <div class="room-progress">
            <el-progress :percentage="room.progress || 0" :show-text="true"></el-progress>
          </div>
          <div class="room-actions" v-if="isAdmin" @click.stop>
            <el-button type="primary" size="mini" @click="goToEdit(room.id)">编辑</el-button>
            <el-button type="danger" size="mini" plain @click="handleDelete(room)">删除</el-button>
          </div>
        </div>
      </div>
      <!-- PC端表格 -->
      <el-table v-else :data="rooms" v-loading="loading" style="width: 100%">
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
            <el-tag :type="getRoomStatusType(scope.row.status)">
              {{ getRoomStatusText(scope.row.status) }}
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
        :layout="isMobile ? 'total, prev, pager, next' : 'total, sizes, prev, pager, next'"
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
import { getManagers } from '@/api/user'
import { mapGetters } from 'vuex'
import {
  ROOM_STATUS_OPTIONS,
  CONSTRUCTION_TYPE_OPTIONS
} from '@/utils/constants'
import {
  getRoomStatusText,
  getRoomStatusType,
  getConstructionTypeText,
  formatDate,
  exportToExcel
} from '@/utils'

export default {
  name: 'RoomList',
  data() {
    return {
      loading: false,
      rooms: [],
      managers: [],
      total: 0,
      page: 1,
      pageSize: 10,
      searchForm: {
        keyword: '',
        status: '',
        construction_type: '',
        manager_id: ''
      },
      // 常量
      roomStatusOptions: ROOM_STATUS_OPTIONS,
      constructionTypeOptions: CONSTRUCTION_TYPE_OPTIONS,
      isMobile: false
    }
  },
  computed: {
    ...mapGetters('auth', ['isAdmin'])
  },
  created() {
    this.loadRooms()
    this.loadManagers()
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.checkMobile)
  },
  methods: {
    checkMobile() {
      this.isMobile = window.innerWidth < 768
    },
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
    async loadManagers() {
      try {
        const res = await getManagers()
        this.managers = res.data
      } catch (error) {
        console.error(error)
      }
    },
    handleSearch() {
      this.page = 1
      this.loadRooms()
    },
    handleReset() {
      this.searchForm = { keyword: '', status: '', construction_type: '', manager_id: '' }
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
    handleExport() {
      const headers = [
        { prop: 'code', label: '机房编码' },
        { prop: 'name', label: '机房名称' },
        { prop: 'construction_type', label: '建设方式' },
        { prop: 'location', label: '位置' },
        { prop: 'manager_name', label: '负责人' },
        { prop: 'status_text', label: '状态' },
        { prop: 'progress', label: '进度(%)' },
        { prop: 'created_at', label: '创建时间' }
      ]
      const data = this.rooms.map(room => ({
        ...room,
        construction_type: getConstructionTypeText(room.construction_type),
        manager_name: room.manager?.real_name || '未分配',
        status_text: getRoomStatusText(room.status),
        progress: room.progress || 0,
        created_at: formatDate(room.created_at)
      }))
      exportToExcel(data, '机房列表', headers)
      this.$message.success('导出成功')
    },
    // 使用工具函数
    getRoomStatusText,
    getRoomStatusType,
    getConstructionTypeText,
    formatDate
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

/* 移动端机房列表 */
.mobile-room-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mobile-room-card {
  background: #fafafa;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s;
}

.mobile-room-card:hover {
  background: #f0f0f0;
}

.mobile-room-card .room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.mobile-room-card .room-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mobile-room-card .room-name {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
}

.mobile-room-card .room-code {
  font-size: 12px;
  color: #909399;
}

.mobile-room-card .room-info {
  margin-bottom: 12px;
}

.mobile-room-card .info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 6px;
}

.mobile-room-card .info-row .label {
  color: #909399;
  min-width: 20px;
}

.mobile-room-card .room-progress {
  margin-bottom: 10px;
}

.mobile-room-card .room-actions {
  display: flex;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid #ebeef5;
}
</style>