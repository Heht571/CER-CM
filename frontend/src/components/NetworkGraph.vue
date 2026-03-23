<template>
  <div class="network-graph" ref="container">
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
            @mouseenter="showTooltip(node, $event)"
            @mouseleave="hideTooltip"
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

    <!-- 悬浮提示 -->
    <div
      v-if="tooltip.visible"
      class="node-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="tooltip-title">{{ tooltip.node?.name }}</div>
      <div class="tooltip-row">
        <span class="label">状态：</span>
        <el-tag size="mini" :type="getTooltipStatusType(tooltip.node?.status)">
          {{ getTooltipStatusText(tooltip.node?.status) }}
        </el-tag>
      </div>
      <div class="tooltip-row">
        <span class="label">进度：</span>
        <span>{{ tooltip.node?.progress || 0 }}%</span>
      </div>
      <div class="tooltip-row">
        <span class="label">持续：</span>
        <span>{{ tooltip.node?.planned_days || 0 }} 天</span>
      </div>
      <div class="tooltip-row">
        <span class="label">计划开始：</span>
        <span>{{ formatTooltipDate(tooltip.node?.planned_start_date) }}</span>
      </div>
      <div class="tooltip-row">
        <span class="label">计划结束：</span>
        <span>{{ formatTooltipDate(tooltip.node?.planned_end_date) }}</span>
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
    }
  },
  data() {
    return {
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
      tooltip: {
        visible: false,
        x: 0,
        y: 0,
        node: null
      }
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
    }
  },
  mounted() {
    this.calculateSize()
    window.addEventListener('resize', this.calculateSize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.calculateSize)
  },
  methods: {
    calculateSize() {
      if (this.$refs.container) {
        this.width = Math.max(this.$refs.container.clientWidth, 1200)
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
    // 拖拽
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
    // 工具提示
    showTooltip(node, e) {
      const rect = this.$refs.container.getBoundingClientRect()
      this.tooltip = {
        visible: true,
        x: e.clientX - rect.left + 15,
        y: e.clientY - rect.top + 15,
        node
      }
    },
    hideTooltip() {
      this.tooltip.visible = false
    },
    getTooltipStatusText: getTaskStatusText,
    getTooltipStatusType: getTaskStatusType,
    formatTooltipDate: formatDate
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

.node-tooltip {
  position: absolute;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 10px 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  pointer-events: none;
  min-width: 160px;
}

.tooltip-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ebeef5;
}

.tooltip-row {
  display: flex;
  align-items: center;
  margin: 4px 0;
  font-size: 13px;
}

.tooltip-row .label {
  color: #909399;
  min-width: 60px;
}

.tooltip-row span {
  color: #303133;
}
</style>