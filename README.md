# 汇聚机房建设进度监控平台

## 项目简介

本系统用于监控汇聚机房从立项到投用的全流程建设进度，支持管理员和机房负责人两类用户角色。

## 技术栈

- **后端**: Express + PostgreSQL + Sequelize
- **前端**: Vue 2 + Element UI + Vuex + Vue Router
- **数据库**: PostgreSQL 15（Docker 容器）

## 功能模块

1. **用户管理**: 管理员可创建用户、分配角色、重置密码
2. **机房管理**: 创建机房、分配负责人、绑定项目、查看进度、变更记录
3. **任务管理**: 机房负责人更新任务状态和进度
4. **统计分析**: 项目卡片总览、负责人分组明细、延期预警
5. **邮件通知**: 定时邮件任务、支持选择负责人或自定义邮箱
6. **项目管理**: 项目创建、归档（含机房时不可删除）

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

### 1. 克隆项目

```bash
git clone <repository-url>
cd JIFANG-jianshe
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少完成以下配置：

- 将 `JWT_SECRET` 替换为至少 16 位、不可预测的随机字符串
- 配置数据库连接信息
- 按需调整 `CORS_ALLOWED_ORIGINS`

### 3. 启动 PostgreSQL

```bash
docker-compose up -d postgres
docker-compose logs -f postgres
```

等待数据库启动完成（显示 `database system is ready to accept connections`）。

### 4. 初始化数据库并启动后端

```bash
cd backend
npm install
npm run init-db    # 初始化数据库表结构和默认数据
npm run dev        # 启动开发服务器
```

注意：`npm run init-db` 会执行 `sequelize.sync({ force: true })` 并写入默认演示数据，会重建表结构，勿在已有业务数据的环境中直接执行。

### 5. 启动前端

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

## 默认演示账号

以下账号由 `npm run init-db` 创建，仅用于本地开发联调：

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| manager1 | 123456 | 机房负责人 |
| manager2 | 123456 | 机房负责人 |

⚠️ **生产环境请务必修改默认密码！**

## 界面说明

### 首页（建设总览）

- 以**项目卡片**形式展示各项目进度
- 点击项目卡片进入项目详情页
- 管理员可在此新建项目

### 项目详情页

- 显示项目整体进度和机房统计
- **延期任务预警**：超过计划完成日期但尚未完成的任务
- 按**负责人分组**展示机房列表，点击负责人卡片展开明细

### 机房管理

- 创建机房时需选择所属项目
- 支持批量删除、批量导入（含项目字段）
- 机房变更自动记录变更历史

### 邮件管理

- 定时邮件任务支持多种接收人配置：
  - 选择各机房负责人（自动填充邮箱）
  - 自定义输入任意邮箱地址
- 支持单次/每日/每周/每月重复发送

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

# 同步新增表（不重建已有表）
cd backend && npm run sync-tables
```

## 项目结构

```text
JIFANG-jianshe/
├── .env.example                 # 环境变量示例（根目录统一配置）
├── .gitignore                   # Git 忽略配置
├── docker-compose.yml           # PostgreSQL 容器编排
├── README.md                    # 项目说明
├── database/
│   └── init/                    # PostgreSQL 初始化脚本目录
├── backend/                     # 后端项目
│   ├── config/                  # 运行配置
│   ├── controllers/             # 控制器
│   ├── middleware/              # 中间件
│   ├── models/                  # 数据模型
│   ├── routes/                  # 路由
│   ├── scripts/                 # 初始化脚本
│   ├── utils/                   # 工具函数
│   ├── server.js                # 启动入口
│   ├── app.js                   # Express 应用配置
│   └── package.json             # 后端依赖
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── api/                 # API 接口
│   │   ├── components/          # 公共组件
│   │   ├── router/              # 路由配置
│   │   ├── store/               # Vuex 状态管理
│   │   ├── utils/               # 工具函数
│   │   └/views/                 # 页面组件
│   │   └── App.vue
│   ├── vue.config.js            # Vue CLI 配置
│   ├── .env.example             # 前端环境变量示例
│   └── package.json             # 前端依赖
```

## 生产部署建议

1. **修改 JWT_SECRET**：使用强随机密钥
2. **修改默认密码**：admin、manager1、manager2 的密码
3. **关闭 Swagger**：保持 `SWAGGER_ENABLED=false`
4. **配置 CORS**：设置实际的前端域名
5. **配置邮件服务**：设置 SMTP 相关参数
6. **前端构建**：`npm run build` 后部署静态文件
7. **后端启动**：使用 `npm start`（非开发模式）

## 数据表说明

| 表名 | 说明 |
|------|------|
| users | 用户表（管理员、负责人） |
| projects | 项目表 |
| machine_rooms | 机房表（含 project_id 外键） |
| room_change_logs | 机房变更记录表 |
| construction_phases | 建设阶段表 |
| task_templates | 任务模板表 |
| task_dependencies | 任务依赖表 |
| room_tasks | 机房任务表 |
| task_progress_logs | 进度日志表 |
| operation_logs | 操作日志表 |
| email_tasks | 邮件任务表 |
| email_logs | 邮件发送日志表 |
| system_configs | 系统配置表 |