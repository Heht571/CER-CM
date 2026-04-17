<template>
  <div class="network-graph" ref="container">
    <!-- 移动端：显示为任务列表 -->
    <div v-if="isMobile" class="mobile-task-list">
      <div class="mobile-header">
        <span class="phase-label">按阶段显示</span>
        <el-button size="mini" @click="toggleExpandAll">
          {{ allExpanded ? '全部收起' : '全部展开' }}
        </el-button>
      </div>

      <!-- 按阶段分组 -->
      <div v-for="phase in groupedByPhase" :key="phase.phaseNumber" class="phase-group">
        <div class="phase-title" @click="togglePhase(phase.phaseNumber)">
          <span class="phase-name">阶段 {{ phase.phaseNumber }}：{{ phase.name }}</span>
          <i :class="expandedPhases.includes(phase.phaseNumber) ? 'el-icon-arrow-down' : 'el-icon-arrow-right'"></i>
          <span class="phase-stats">
            {{ phase.completedCount }}/{{ phase.tasks.length }} 完成
          </span>
        </div>

        <div v-if="expandedPhases.includes(phase.phaseNumber)" class="phase-tasks">
          <div
            v-for="task in phase.tasks"
            :key="task.id"
            class="mobile-task-item"
            :class="task.status"
            @click="handleNodeClick(task)"
          >
            <div class="task-header">
              <span class="task-name">{{ task.name }}</span>
              <el-tag size="mini" :type="getStatusType(task.status)">
                {{ getStatusText(task.status) }}
              </el-tag>
            </div>
            <div class="task-progress">
              <el-progress
                :percentage="task.progress"
                :stroke-width="8"
                :show-text="false"
              ></el-progress>
              <span class="progress-text">{{ task.progress }}%</span>
            </div>
            <div class="task-info">
              <span>{{ task.planned_days || 0 }}天</span>
              <span v-if="task.planned_start_date">{{ formatDate(task.planned_start_date) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PC端：显示网络图 -->
    <div v-else class="pc-graph">
      <!-- 控制按钮 -->
      <div class="graph-controls">
        <el-button-group>
          <el-button size="mini" icon="el-icon-zoom-in" @click="zoomIn" title="放大"></el-button>
          <el-button size="mini" icon="el-icon-zoom-out" @click="zoomOut" title="缩小"></el-button>
          <el-button size="mini" icon="el-icon-refresh" @click="resetView" title="重置视图"></el-button>
        </el-button-group>
        <span class="zoom-level">{{ Math.round(scale * 100) }}%</span>
      </div>

      <div
        class="graph-viewport"
        ref="viewport"
        @mousedown="startPan"
        @mousemove="onPan"
        @mouseup="endPan"
        @mouseleave="endPan"
        @wheel="onWheel"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <svg
          :width="svgWidth"
          :height="svgHeight"
          class="graph-svg"
          :style="{ transform: `translate(${panX}px, ${panY}px) scale(${scale})`, transformOrigin: '0 0' }"
        >
          <!-- 定义箭头 -->
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#c0c4cc" />
            </marker>
            <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#409EFF" />
            </marker>
          </defs>

          <!-- 连线 -->
          <g class="edges">
            <line
              v-for="edge in edges"
              :key="`${edge.source}-${edge.target}`"
              :x1="getNodeX(edge.source)"
              :y1="getNodeY(edge.source)"
              :x2="getNodeX(edge.target)"
              :y2="getNodeY(edge.target)"
              stroke="#c0c4cc"
              stroke-width="2"
              :marker-end="isEdgeActive(edge) ? 'url(#arrowhead-active)' : 'url(#arrowhead)'"
              :class="{ 'edge-active': isEdgeActive(edge) }"
            />
          </g>

          <!-- 节点 -->
          <g class="nodes">
            <g
              v-for="node in nodes"
              :key="node.id"
              :transform="`translate(${getNodeX(node.id)}, ${getNodeY(node.id)})`"
              class="node-group"
              @click="handleNodeClick(node)"
            >
              <!-- 节点背景 -->
              <rect
                :x="-nodeWidth/2"
                :y="-nodeHeight/2"
                :width="nodeWidth"
                :height="nodeHeight"
                :rx="8"
                :class="['node-rect', `node-${node.status}`]"
              />
              <!-- 节点名称 -->
              <text
                text-anchor="middle"
                dominant-baseline="middle"
                class="node-text"
              >
                {{ node.name }}
              </text>
              <!-- 进度条背景 -->
              <rect
                :x="-nodeWidth/2 + 10"
                :y="nodeHeight/2 - 14"
                :width="nodeWidth - 20"
                :height="4"
                rx="2"
                fill="#e4e7ed"
              />
              <!-- 进度条 -->
              <rect
                :x="-nodeWidth/2 + 10"
                :y="nodeHeight/2 - 14"
                :width="(nodeWidth - 20) * node.progress / 100"
                :height="4"
                rx="2"
                :fill="node.status === 'completed' ? '#67c23a' : '#409EFF'"
              />
              <!-- 持续天数 -->
              <text
                :y="nodeHeight/2 + 6"
                text-anchor="middle"
                class="node-date"
              >
                {{ node.planned_days || 0 }}天
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<script>
import { getTaskStatusText, getTaskStatusType, formatDate } from '@/utils'

export default {
  name: 'NetworkGraph',
  props: {
    nodes: {
      type: Array,
      default: () => []
    },
    edges: {
      type: Array,
      default: () => []
    },
    phases: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isMobile: false,
      // PC端网络图参数
      width: 1200,
      height: 500,
      nodeWidth: 120,
      nodeHeight: 60,
      levelGap: 150,
      rowGap: 100,
      scale: 1,
      minScale: 0.5,
      maxScale: 2,
      panX: 0,
      panY: 0,
      isPanning: false,
      startPanX: 0,
      startPanY: 0,
      lastPanX: 0,
      lastPanY: 0,
      // 触摸事件
      touchStartDist: 0,
      touchStartScale: 1,
      lastTouchX: 0,
      lastTouchY: 0,
      // 移动端列表参数
      expandedPhases: [1],
      allExpanded: false
    }
  },
  computed: {
    svgWidth() {
      const maxLevel = Math.max(...this.nodes.map(n => n.graph_level || 0), 3)
      return (maxLevel + 1) * this.levelGap + 100
    },
    svgHeight() {
      const maxRow = Math.max(...this.nodes.map(n => n.graph_row || 0), 3)
      return (maxRow + 2) * this.rowGap
    },
    groupedByPhase() {
      // 按阶段分组任务
      const phaseMap = {}
      this.nodes.forEach(node => {
        // 根据graph_level判断阶段（大致对应）
        let phaseNumber = node.graph_level || 1
        // 调整阶段映射，使其更符合实际阶段
        if (phaseNumber === 1) phaseNumber = 1 // 立项批复
        else if (phaseNumber === 2) phaseNumber = 2 // 合同签订
        else if (phaseNumber === 3) phaseNumber = 3 // 设计批复/收房
        else if (phaseNumber === 4) phaseNumber = 4 // 物资到货/产权办理
        else if (phaseNumber === 5) phaseNumber = 5 // 施工作业
        else if (phaseNumber >= 6) phaseNumber = 6 // 竣工投用

        if (!phaseMap[phaseNumber]) {
          phaseMap[phaseNumber] = {
            phaseNumber,
            name: this.getPhaseName(phaseNumber),
            tasks: [],
            completedCount: 0
          }
        }
        phaseMap[phaseNumber].tasks.push(node)
        if (node.status === 'completed') {
          phaseMap[phaseNumber].completedCount++
        }
      })

      // 转为数组并排序
      return Object.values(phaseMap).sort((a, b) => a.phaseNumber - b.phaseNumber)
    }
  },
  mounted() {
    this.checkMobile()
    window.addEventListener('resize', this.checkMobile)
    if (!this.isMobile) {
      this.calculateSize()
      window.addEventListener('resize', this.calculateSize)
    }
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.checkMobile)
    window.removeEventListener('resize', this.calculateSize)
  },
  methods: {
    checkMobile() {
      this.isMobile = window.innerWidth <= 768
    },
    getPhaseName(phaseNumber) {
      const names = {
        1: '立项批复',
        2: '合同签订',
        3: '设计批复',
        4: '物资到货',
        5: '施工作业',
        6: '竣工投用'
      }
      return names[phaseNumber] || `阶段${phaseNumber}`
    },
    togglePhase(phaseNumber) {
      const index = this.expandedPhases.indexOf(phaseNumber)
      if (index > -1) {
        this.expandedPhases.splice(index, 1)
      } else {
        this.expandedPhases.push(phaseNumber)
      }
    },
    toggleExpandAll() {
      if (this.allExpanded) {
        this.expandedPhases = [1]
        this.allExpanded = false
      } else {
        this.expandedPhases = this.groupedByPhase.map(p => p.phaseNumber)
        this.allExpanded = true
      }
    },
    getStatusText: getTaskStatusText,
    getStatusType: getTaskStatusType,
    formatDate,
    // PC端网络图方法
    calculateSize() {
      if (this.$refs.container) {
        this.width = Math.max(this.$refs.container.clientWidth, 800)
      }
    },
    getNodeX(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId)
      if (!node) return 0
      const level = node.graph_level || 1
      return level * this.levelGap + 50
    },
    getNodeY(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId)
      if (!node) return 0
      const row = node.graph_row || 1
      return row * this.rowGap
    },
    isEdgeActive(edge) {
      const sourceNode = this.nodes.find(n => n.id === edge.source)
      const targetNode = this.nodes.find(n => n.id === edge.target)
      return sourceNode && targetNode &&
        (sourceNode.status === 'completed' || sourceNode.status === 'in_progress')
    },
    handleNodeClick(node) {
      this.$emit('node-click', node)
    },
    // 缩放
    zoomIn() {
      if (this.scale < this.maxScale) {
        this.scale = Math.min(this.scale + 0.1, this.maxScale)
      }
    },
    zoomOut() {
      if (this.scale > this.minScale) {
        this.scale = Math.max(this.scale - 0.1, this.minScale)
      }
    },
    resetView() {
      this.scale = 1
      this.panX = 0
      this.panY = 0
    },
    // 鼠标滚轮缩放
    onWheel(e) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta))
      this.scale = newScale
    },
    // 鼠标拖拽
    startPan(e) {
      if (e.button === 0) {
        this.isPanning = true
        this.startPanX = e.clientX
        this.startPanY = e.clientY
        this.lastPanX = this.panX
        this.lastPanY = this.panY
      }
    },
    onPan(e) {
      if (this.isPanning) {
        const dx = e.clientX - this.startPanX
        const dy = e.clientY - this.startPanY
        this.panX = this.lastPanX + dx
        this.panY = this.lastPanY + dy
      }
    },
    endPan() {
      this.isPanning = false
    },
    // 触摸事件处理
    onTouchStart(e) {
      if (e.touches.length === 1) {
        // 单指拖拽
        this.isPanning = true
        this.lastTouchX = e.touches[0].clientX
        this.lastTouchY = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        // 双指缩放
        this.isPanning = false
        this.touchStartDist = this.getTouchDistance(e.touches)
        this.touchStartScale = this.scale
      }
    },
    onTouchMove(e) {
      e.preventDefault()
      if (e.touches.length === 1 && this.isPanning) {
        // 单指拖拽
        const dx = e.touches[0].clientX - this.lastTouchX
        const dy = e.touches[0].clientY - this.lastTouchY
        this.panX += dx
        this.panY += dy
        this.lastTouchX = e.touches[0].clientX
        this.lastTouchY = e.touches[0].clientY
      } else if (e.touches.length === 2) {
        // 双指缩放
        const dist = this.getTouchDistance(e.touches)
        const scale = this.touchStartScale * (dist / this.touchStartDist)
        this.scale = Math.max(this.minScale, Math.min(this.maxScale, scale))
      }
    },
    onTouchEnd() {
      this.isPanning = false
    },
    getTouchDistance(touches) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }
  }
}
</script>

<style scoped>
.network-graph {
  width: 100%;
  background: #fafafa;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

/* ========== 移动端样式 ========== */
.mobile-task-list {
  padding: 12px;
}

.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.phase-label {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.phase-group {
  margin-bottom: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.phase-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  cursor: pointer;
  background: #f5f7fa;
  border-radius: 8px 8px 0 0;
}

.phase-title:active {
  background: #e4e7ed;
}

.phase-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.phase-stats {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.phase-tasks {
  padding: 8px 12px 12px;
}

.mobile-task-item {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
  margin-bottom: 8px;
  border: 1px solid #e4e7ed;
  cursor: pointer;
}

.mobile-task-item:active {
  background: #f0f0f0;
}

.mobile-task-item.completed {
  background: #f0f9eb;
  border-color: #c2e7b0;
}

.mobile-task-item.in_progress {
  background: #ecf5ff;
  border-color: #b3d8ff;
}

.mobile-task-item.not_started {
  background: #f5f7fa;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  flex: 1;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.task-progress .el-progress {
  flex: 1;
}

.progress-text {
  font-size: 12px;
  color: #606266;
  min-width: 36px;
}

.task-info {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

/* ========== PC端样式 ========== */
.pc-graph {
  position: relative;
}

.graph-controls {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.9);
  padding: 5px 10px;
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.zoom-level {
  font-size: 12px;
  color: #606266;
  min-width: 40px;
}

.graph-viewport {
  width: 100%;
  height: 500px;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
}

.graph-viewport:active {
  cursor: grabbing;
}

.graph-svg {
  display: block;
  min-width: 100%;
}

.node-rect {
  stroke: #dcdfe6;
  stroke-width: 2;
  transition: all 0.3s;
}

.node-not_started {
  fill: #f5f7fa;
}

.node-in_progress {
  fill: #ecf5ff;
  stroke: #409EFF;
}

.node-completed {
  fill: #f0f9eb;
  stroke: #67c23a;
}

.node-group {
  cursor: pointer;
}

.node-group:hover .node-rect {
  filter: brightness(0.95);
  stroke-width: 3;
}

.node-text {
  font-size: 13px;
  font-weight: 500;
  fill: #303133;
}

.node-date {
  font-size: 11px;
  fill: #909399;
}

.edge-active {
  stroke: #409EFF !important;
  stroke-width: 3 !important;
}

/* ========== 响应式 ========== */
@media screen and (max-width: 768px) {
  .network-graph {
    background: #fff;
  }

  .graph-viewport {
    height: 300px;
  }

  .graph-controls {
    top: 5px;
    right: 5px;
    padding: 3px 6px;
  }
}
</style>