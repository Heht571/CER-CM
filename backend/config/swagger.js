const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '汇聚机房建设进度监控平台 API',
      version: '1.0.0',
      description: '用于管理汇聚机房建设进度的后端API接口文档',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: '开发服务器'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            real_name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager'] },
            department: { type: 'string' },
            phone: { type: 'string' },
            status: { type: 'integer', description: '1-启用, 0-禁用' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        MachineRoom: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            code: { type: 'string' },
            location: { type: 'string' },
            construction_type: {
              type: 'string',
              enum: ['purchase', 'lease', 'self_build', 'container', 'reuse']
            },
            manager_id: { type: 'integer' },
            status: {
              type: 'string',
              enum: ['planning', 'in_progress', 'completed', 'paused']
            },
            planned_start_date: { type: 'string', format: 'date' },
            planned_end_date: { type: 'string', format: 'date' },
            progress: { type: 'integer', minimum: 0, maximum: 100 }
          }
        },
        RoomTask: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            room_id: { type: 'integer' },
            phase_id: { type: 'integer' },
            name: { type: 'string' },
            planned_days: { type: 'integer' },
            status: {
              type: 'string',
              enum: ['not_started', 'in_progress', 'completed']
            },
            progress: { type: 'integer', minimum: 0, maximum: 100 },
            planned_start_date: { type: 'string', format: 'date' },
            planned_end_date: { type: 'string', format: 'date' }
          }
        },
        ConstructionPhase: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            phase_number: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    },
    tags: [
      { name: 'Auth', description: '认证相关接口' },
      { name: 'Users', description: '用户管理接口' },
      { name: 'Rooms', description: '机房管理接口' },
      { name: 'Tasks', description: '任务管理接口' },
      { name: 'Phases', description: '建设阶段接口' },
      { name: 'Statistics', description: '统计分析接口' }
    ]
  },
  apis: [
    './routes/*.js',
    './docs/*.yaml'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;