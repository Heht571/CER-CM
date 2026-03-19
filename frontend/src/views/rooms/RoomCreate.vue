<template>
  <div class="room-create">
    <el-card header="创建机房">
      <el-alert
        title="创建机房后将自动生成建设任务网络图，根据项目开始日期自动计算各节点时间"
        type="info"
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
          <div class="form-tip">设置开始日期后，系统将自动计算所有节点的计划时间</div>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" rows="3" placeholder="请输入描述"></el-input>
        </el-form-item>

        <!-- 流程预览 -->
        <el-divider>建设流程网络图预览</el-divider>
        <div class="flow-preview">
          <div class="preview-graph">
            <!-- 第1层 -->
            <div class="level level-1">
              <div class="node">立项批复</div>
            </div>
            <!-- 箭头 -->
            <div class="arrow-down">↓</div>
            <!-- 第2层 -->
            <div class="level level-2">
              <div class="node" v-if="form.construction_type !== 'container'">合同签订<span class="days">(3个月)</span></div>
              <div class="node" v-else>方案及用地确定<span class="days">(3个月)</span></div>
            </div>
            <!-- 分支箭头 -->
            <div class="arrow-split">
              <span v-if="showShoufang">↙</span>
              <span>↓</span>
            </div>
            <!-- 第3层 -->
            <div class="level level-3">
              <div class="node" v-if="showShoufang">收房<span class="days">(1个月)</span></div>
              <div class="node">设计批复<span class="days">(1周)</span></div>
            </div>
            <!-- 箭头 -->
            <div class="arrow-split">
              <span v-if="showShoufang">↓</span>
              <span>↓</span>
            </div>
            <!-- 第4层 -->
            <div class="level level-4">
              <div class="node" v-if="showChanquan">产权办理<span class="days">(2个月)</span></div>
              <div class="node">物资到货<span class="days">(1月+1周)</span></div>
            </div>
            <!-- 三分支箭头 -->
            <div class="arrow-triple">
              <span>↘</span>
              <span>↓</span>
              <span>↙</span>
            </div>
            <!-- 第5层 -->
            <div class="level level-5">
              <div class="node small">外市电完成<span class="days">(6个月)</span></div>
              <div class="node small">装修完成<span class="days">(2个月)</span></div>
              <div class="node small">管道完成<span class="days">(5个月)</span></div>
            </div>
            <!-- 箭头 -->
            <div class="arrow-continue">
              <span></span>
              <span>↓</span>
              <span>↓</span>
            </div>
            <!-- 第6层 -->
            <div class="level level-6">
              <div class="node-spacer"></div>
              <div class="node small">配套安装<span class="days">(4个月)</span></div>
              <div class="node small">线路完成<span class="days">(1个月)</span></div>
            </div>
            <!-- 箭头 -->
            <div class="arrow-continue">
              <span></span>
              <span>↓</span>
              <span></span>
            </div>
            <!-- 第7层 -->
            <div class="level level-7">
              <div class="node-spacer"></div>
              <div class="node small">动环上线<span class="days">(1周)</span></div>
              <div class="node-spacer"></div>
            </div>
            <!-- 箭头 -->
            <div class="arrow-continue">
              <span></span>
              <span>↓</span>
              <span></span>
            </div>
            <!-- 第8层 -->
            <div class="level level-8">
              <div class="node-spacer"></div>
              <div class="node small">传输业务割接<span class="days">(3天)</span></div>
              <div class="node-spacer"></div>
            </div>
          </div>
        </div>

        <el-form-item style="margin-top: 20px;">
          <el-button type="primary" :loading="loading" @click="handleSubmit">创建机房</el-button>
          <el-button @click="goBack">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { createRoom } from '@/api/room'
import { getManagers } from '@/api/user'

export default {
  name: 'RoomCreate',
  data() {
    return {
      loading: false,
      managers: [],
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
        name: [{ required: true, message: '请输入机房名称', trigger: 'blur' }],
        planned_start_date: [{ required: true, message: '请选择项目开始日期', trigger: 'change' }],
        construction_type: [{ required: true, message: '请选择建设方式', trigger: 'change' }]
      }
    }
  },
  computed: {
    constructionTypeDesc() {
      const descs = {
        purchase: '购置类：包含收房、产权办理流程（13个节点）',
        lease: '租赁类：包含收房流程，无产权办理（12个节点）',
        self_build: '自建类：包含收房流程，无产权办理（12个节点）',
        container: '一体化集装箱：方案及用地确定，无收房、无产权办理（11个节点）'
      }
      return descs[this.form.construction_type] || ''
    },
    showShoufang() {
      return ['purchase', 'lease', 'self_build'].includes(this.form.construction_type)
    },
    showChanquan() {
      return this.form.construction_type === 'purchase'
    }
  },
  created() {
    this.loadManagers()
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
    handleTypeChange() {
      // 建设方式变更时可以做一些提示
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return

        this.loading = true
        try {
          await createRoom(this.form)
          this.$message.success('创建成功，已自动生成建设任务')
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
.room-create {
  max-width: 1000px;
}
.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}
.flow-preview {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  overflow-x: auto;
}
.preview-graph {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 600px;
}
.level {
  display: flex;
  justify-content: center;
  gap: 20px;
}
.node {
  background: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  border: 2px solid #409EFF;
  text-align: center;
  min-width: 100px;
  font-size: 13px;
}
.node.small {
  min-width: 80px;
  font-size: 12px;
  padding: 6px 12px;
}
.node-spacer {
  min-width: 80px;
}
.days {
  display: block;
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}
.arrow-down {
  color: #c0c4cc;
  font-size: 20px;
  height: 20px;
  line-height: 20px;
}
.arrow-split {
  display: flex;
  justify-content: center;
  gap: 100px;
  color: #c0c4cc;
  font-size: 20px;
  height: 20px;
}
.arrow-triple {
  display: flex;
  justify-content: center;
  gap: 60px;
  color: #c0c4cc;
  font-size: 20px;
  height: 20px;
}
.arrow-continue {
  display: flex;
  justify-content: center;
  gap: 20px;
  color: #c0c4cc;
  font-size: 20px;
  height: 20px;
  min-width: 80px;
}
.arrow-continue span {
  min-width: 80px;
  text-align: center;
}
</style>