<template>
  <div class="room-edit">
    <el-card header="编辑机房">
      <el-alert
        title="修改建设方式或开始日期后，将重新生成所有任务节点"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px;"
      ></el-alert>

      <el-form ref="form" :model="form" :rules="rules" label-width="140px">
        <el-form-item label="机房名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入机房名称"></el-input>
        </el-form-item>
        <el-form-item label="机房编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入机房编码"></el-input>
        </el-form-item>
        <el-form-item label="地理位置" prop="location">
          <el-input v-model="form.location" placeholder="请输入地理位置"></el-input>
        </el-form-item>
        <el-form-item label="建设方式" prop="construction_type">
          <el-select v-model="form.construction_type" placeholder="请选择建设方式" @change="handleTypeChange">
            <el-option label="购置" value="purchase"></el-option>
            <el-option label="租赁" value="lease"></el-option>
            <el-option label="自建" value="self_build"></el-option>
            <el-option label="一体化集装箱" value="container"></el-option>
            <el-option label="利旧" value="reuse"></el-option>
          </el-select>
          <div class="form-tip">{{ constructionTypeDesc }}</div>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select v-model="form.manager_id" placeholder="请选择负责人" clearable>
            <el-option
              v-for="manager in managers"
              :key="manager.id"
              :label="manager.real_name"
              :value="manager.id"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="项目开始日期" prop="planned_start_date">
          <el-date-picker
            v-model="form.planned_start_date"
            type="date"
            placeholder="选择项目开始日期"
            value-format="yyyy-MM-dd"
          ></el-date-picker>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" rows="3" placeholder="请输入描述"></el-input>
        </el-form-item>

        <el-form-item style="margin-top: 20px;">
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存修改</el-button>
          <el-button @click="goBack">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { getRoomDetail, updateRoom } from '@/api/room'
import { getManagers } from '@/api/user'
import { getConstructionTypeDesc } from '@/utils'

export default {
  name: 'RoomEdit',
  data() {
    return {
      loading: false,
      managers: [],
      roomId: null,
      form: {
        name: '',
        code: '',
        location: '',
        manager_id: null,
        planned_start_date: null,
        construction_type: 'purchase',
        description: ''
      },
      rules: {
        name: [
          { required: true, message: '请输入机房名称', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        code: [
          { pattern: /^[A-Za-z0-9_-]*$/, message: '编码只能包含字母、数字、下划线和横线', trigger: 'blur' }
        ],
        planned_start_date: [{ required: true, message: '请选择项目开始日期', trigger: 'change' }],
        construction_type: [{ required: true, message: '请选择建设方式', trigger: 'change' }]
      }
    }
  },
  computed: {
    constructionTypeDesc() {
      return getConstructionTypeDesc(this.form.construction_type)
    }
  },
  created() {
    this.roomId = this.$route.params.id
    this.loadManagers()
    this.loadRoom()
  },
  methods: {
    async loadManagers() {
      try {
        const res = await getManagers()
        this.managers = res.data
      } catch (error) {
        console.error(error)
      }
    },
    async loadRoom() {
      try {
        const res = await getRoomDetail(this.roomId)
        const room = res.data
        this.form = {
          name: room.name,
          code: room.code,
          location: room.location,
          manager_id: room.manager_id,
          planned_start_date: room.planned_start_date,
          construction_type: room.construction_type,
          description: room.description
        }
      } catch (error) {
        console.error(error)
        this.$message.error('加载机房信息失败')
        this.$router.back()
      }
    },
    handleTypeChange() {
      // 建设方式变更提示
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return

        try {
          await this.$confirm(
            '修改建设方式或开始日期后，将重新生成所有任务节点，确定继续吗？',
            '确认修改',
            { type: 'warning' }
          )
        } catch {
          return
        }

        this.loading = true
        try {
          await updateRoom(this.roomId, this.form)
          this.$message.success('修改成功')
          this.$router.push('/rooms')
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
.room-edit {
  max-width: 800px;
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}
</style>