require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const specs = require('./config/swagger');
const auth = require('./middleware/auth');
const { isAdmin } = require('./middleware/authorize');
const errorHandler = require('./middleware/errorHandler');
const routes = require('./routes');
const logger = require('./utils/logger');
const { initEmailService } = require('./utils/emailService');
const { initScheduler } = require('./utils/scheduler');

const app = express();

// 中间件
app.use(cors(config.cors.options));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// 静态文件
app.use('/uploads', express.static('uploads'));

// API文档
if (config.swagger.enabled) {
  const swaggerMiddlewares = config.swagger.requireAdmin
    ? [auth, isAdmin]
    : [];

  app.use(
    '/api-docs',
    ...swaggerMiddlewares,
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: '机房建设监控平台 API文档'
    })
  );
} else {
  logger.info('API 文档已禁用，如需启用请设置 SWAGGER_ENABLED=true');
}

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

// 初始化邮件服务和调度器
initEmailService();
initScheduler().catch(err => logger.error('调度器初始化失败:', err));

// 启动服务器
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`服务器运行在 http://localhost:${PORT}`);
});

module.exports = app;