<template>
  <router-view />
</template>

<style>
/* 引入外部字体（可选，让数字和英文更优雅） */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f4f7f9; /* 柔和的浅灰蓝背景色 */
  color: #333;
  -webkit-font-smoothing: antialiased;
}

/* 全局卡片美化：悬浮阴影、圆角 */
.el-card {
  border-radius: 12px !important;
  border: none !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04) !important;
  transition: all 0.3s ease;
}

.el-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08) !important;
}

/* 表格美化：表头背景色加深，去边框 */
.el-table th.el-table__cell {
  background-color: #fafafa !important;
  color: #606266;
  font-weight: 600;
}

/* 按钮圆角微调 */
.el-button {
  border-radius: 6px;
}

/* 抽屉美化 */
.el-drawer__header {
  margin-bottom: 0;
  padding: 20px 24px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 600;
  color: #303133;
}
.el-drawer__body {
  padding: 24px;
  background-color: #fafafa;
}
</style>