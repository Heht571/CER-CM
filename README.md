# 汇聚机房建设进度监控平台

## 项目简介

本系统用于监控汇聚机房从立项到投用的全流程建设进度，支持管理员和机房负责人两类用户角色。

## 技术栈

- **后端**: Express + PostgreSQL + Sequelize
- **前端**: Vue 2 + Element UI + Vuex + Vue Router
- **数据库**: PostgreSQL 15（Docker 容器）

## 功能模块

1. **用户管理**: 管理员可创建用户、分配角色、重置密码
2. **机房管理**: 创建机房、分配负责人、查看进度
3. **任务管理**: 机房负责人更新任务状态和进度
4. **统计分析**: 总体概览、阶段统计、延期预警

## 建设流程（6 个阶段）

1. 立项批复
2. 合同签订
3. 设计批复
4. 物资到货
5. 施工作业
6. 竣工投用

## 快速开始

### 环境要求

- Node.js 16+
- Docker & Docker Compose

### 1. 启动 PostgreSQL

```bash
docker-compose up -d postgres
docker-compose logs -f postgres
```

当前 `docker-compose.yml` 只负责启动数据库，不会自动启动后端和前端服务。

### 2. 启动后端

```bash
cd backend
cp .env.example .env
```

编辑 `backend/.env`，至少完成以下配置：

- 将 `JWT_SECRET` 替换为至少 16 位、不可预测的随机字符串
- 按需调整 `CORS_ALLOWED_ORIGINS`
- 如需接口文档，显式设置 `SWAGGER_ENABLED=true`

然后安装依赖并初始化：

```bash
npm install
npm run init-db
npm run dev
```

注意：`npm run init-db` 会执行 `sequelize.sync({ force: true })` 并写入默认演示数据，会重建表结构，勿在已有业务数据的环境中直接执行。

### 3. 启动前端

```bash
cd frontend
npm install
npm run serve
```

前端开发服务器默认运行在 `http://localhost:8080`，并通过代理将 `/api` 转发到 `http://localhost:3000`。

## 数据库连接信息

| 配置项 | 值 |
|--------|-----|
| 主机 | localhost |
| 端口 | 5432 |
| 数据库 | jifang_jianshe |
| 用户名 | root |
| 密码 | root123 |
| 容器名 | jifang-postgres |

## 访问地址

- 前端地址: `http://localhost:8080`
- 后端 API: `http://localhost:3000/api`
- 健康检查: `http://localhost:3000/health`
- API 文档: 默认关闭；设置 `SWAGGER_ENABLED=true` 后访问 `http://localhost:3000/api-docs`

如果同时设置 `SWAGGER_REQUIRE_ADMIN=true`，则 `/api-docs` 需要管理员 JWT 才能访问。

## 默认演示账号

以下账号由 `npm run init-db` 创建，仅用于本地开发联调：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| manager1 | 123456 | 机房负责人 |
| manager2 | 123456 | 机房负责人 |

## 常用命令

```bash
# 启动数据库
docker-compose up -d postgres

# 停止数据库
docker-compose stop postgres

# 查看容器状态
docker-compose ps

# 进入 PostgreSQL 命令行
docker exec -it jifang-postgres psql -U root -d jifang_jianshe

# 删除容器和数据卷（危险操作）
docker-compose down -v
```

## 项目结构

```text
JIFANG-jianshe/
├── docker-compose.yml          # PostgreSQL 容器编排
├── database/
│   └── init/                   # 预留给 PostgreSQL 容器初始化脚本（当前未使用）
├── backend/                    # 后端项目
│   ├── config/                 # 运行配置
│   ├── controllers/            # 控制器
│   ├── middleware/             # 中间件
│   ├── models/                 # 数据模型
│   ├── routes/                 # 路由
│   ├── scripts/                # 初始化脚本
│   └── .env.example            # 环境变量示例
├── frontend/                   # 前端项目
│   ├── src/
│   └── package.json
└── README.md
```