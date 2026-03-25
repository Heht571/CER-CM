<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

a {
  text-decoration: none;
  color: inherit;
}

.clearfix::after {
  content: '';
  display: table;
  clear: both;
}

/* 移动端适配 */
@media screen and (max-width: 768px) {
  /* Element UI 表格横向滚动 */
  .el-table {
    font-size: 13px;
  }

  .el-table__body-wrapper {
    overflow-x: auto;
  }

  .el-table th, .el-table td {
    padding: 8px 0;
  }

  /* 卡片内边距 */
  .el-card__body {
    padding: 15px;
  }

  /* 表单适配 */
  .el-form--inline .el-form-item {
    display: block;
    margin-right: 0;
    margin-bottom: 15px;
  }

  .el-form--inline .el-form-item__label {
    display: block;
    text-align: left;
    margin-bottom: 5px;
  }

  .el-form--inline .el-form-item__content {
    display: block;
  }

  .el-form--inline .el-select,
  .el-form--inline .el-input,
  .el-form--inline .el-date-editor {
    width: 100% !important;
  }

  /* 分页适配 */
  .el-pagination {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
  }

  .el-pagination__sizes,
  .el-pagination__jump {
    display: none;
  }

  /* 对话框适配 */
  .el-dialog {
    width: 95% !important;
    margin-top: 5vh !important;
  }

  .el-dialog__body {
    padding: 15px;
    max-height: 70vh;
    overflow-y: auto;
  }

  /* 标签页适配 */
  .el-tabs__nav-scroll {
    overflow-x: auto;
  }

  /* 描述列表适配 */
  .el-descriptions {
    display: block;
  }

  .el-descriptions__body .el-descriptions__table {
    display: block;
  }

  .el-descriptions__body .el-descriptions__row {
    display: block;
  }

  .el-descriptions__body .el-descriptions__cell {
    display: block;
    width: 100% !important;
    text-align: left !important;
  }

  /* 按钮组适配 */
  .el-button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  /* 搜索区域适配 */
  .search-card .el-form {
    display: block;
  }

  .search-card .el-form-item {
    margin-bottom: 10px;
  }

  /* 统计卡片适配 */
  .stat-cards .el-col {
    margin-bottom: 10px;
  }

  .stat-card {
    padding: 15px;
  }

  .stat-value {
    font-size: 28px;
  }

  /* 进度圈适配 */
  .progress-card .el-row {
    display: block;
  }

  .progress-card .el-col {
    margin-bottom: 15px;
  }

  /* 操作按钮适配 */
  .el-table .el-button + .el-button {
    margin-left: 0;
    display: block;
    margin-top: 5px;
  }
}

/* 触摸优化 */
@media (hover: none) and (pointer: coarse) {
  .el-button {
    min-height: 44px;
  }

  .el-input__inner {
    height: 44px;
  }

  .el-select .el-input__inner {
    height: 44px;
  }
}
</style>