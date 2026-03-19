<template>
  <div class="network-graph" ref="container">
    <svg :width="width" :height="height" class="graph-svg">
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
          <!-- 日期 -->
          <text
            :y="nodeHeight/2 + 6"
            text-anchor="middle"
            class="node-date"
          >
            {{ formatDate(node.planned_start_date) }}
          </text>
        </g>
      </g>
    </svg>
  </div>
</template>

<script>
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
      rowGap: 100
    };
  },
  mounted() {
    this.calculateSize();
    window.addEventListener('resize', this.calculateSize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.calculateSize);
  },
  methods: {
    calculateSize() {
      if (this.$refs.container) {
        this.width = Math.max(this.$refs.container.clientWidth, 1200);
      }
      // 计算高度
      const maxRow = Math.max(...this.nodes.map(n => n.graph_row || 0), 3);
      this.height = (maxRow + 2) * this.rowGap;
    },
    getNodeX(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return 0;
      const level = node.graph_level || 1;
      return level * this.levelGap + 50;
    },
    getNodeY(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return 0;
      const row = node.graph_row || 1;
      return row * this.rowGap;
    },
    isEdgeActive(edge) {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);
      return sourceNode && targetNode &&
        (sourceNode.status === 'completed' || sourceNode.status === 'in_progress');
    },
    handleNodeClick(node) {
      this.$emit('node-click', node);
    },
    formatDate(date) {
      if (!date) return '-';
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
  }
};
</script>

<style scoped>
.network-graph {
  width: 100%;
  overflow: auto;
  background: #fafafa;
  border-radius: 8px;
  padding: 20px;
}

.graph-svg {
  display: block;
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
</style>