require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const logger = require('./utils/logger');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 静态文件
app.use('/uploads', express.static('uploads'));

// API 路由
app.use('/api', routes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;