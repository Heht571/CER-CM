# 汇聚机房建设进度监控平台

## 项目简介

本系统用于监控汇聚机房从立项到投用的全流程建设进度，支持管理员和机房负责人两类用户角色。

## 技术栈

- **后端**: Express + MySQL + Sequelize
- **前端**: Vue 2 + Element UI + Vuex + Vue Router
- **数据库**: MySQL 8.0 (Docker容器)

## 功能模块

1. **用户管理**: 管理员可创建用户、分配角色、重置密码
2. **机房管理**: 创建机房、分配负责人、查看进度
3. **任务管理**: 机房负责人更新任务状态和进度
4. **统计分析**: 总体概览、阶段统计、延期预警

## 建设流程（6个阶段）

1. 采购立项批复
2. 网络部方案审批（新增）
3. 全专业设计批复
4. 建设施工
5. 设备安装调测
6. 机房投用

## 快速开始

### 环境要求

- Node.js 16+
- Docker & Docker Compose

### 方式一：Docker Compose 启动（推荐）

```bash
# 启动 MySQL 容器
docker-compose up -d mysql

# 等待 MySQL 启动完成（约10秒）
docker-compose logs -f mysql

# 后端
cd backend
npm install
npm run init-db    # 初始化数据库
npm run dev

# 前端（新终端）
cd frontend
npm install
npm run serve
```

### 方式二：全部使用 Docker

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 数据库连接信息

| 配置项 | 值 |
|--------|-----|
| 主机 | localhost |
| 端口 | 3306 |
| 数据库 | jifang_jianshe |
| 用户名 | root |
| 密码 | root123 |

### 访问系统

- 前端地址: http://localhost:8080
- 后端API: http://localhost:3000/api

### 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin | admin123 | 管理员 |
| manager1 | 123456 | 机房负责人 |
| manager2 | 123456 | 机房负责人 |

## 常用命令

```bash
# 启动 MySQL
docker-compose up -d mysql

# 停止 MySQL
docker-compose stop mysql

# 查看容器状态
docker-compose ps

# 进入 MySQL 命令行
docker exec -it jifang-mysql mysql -uroot -proot123 jifang_jianshe

# 删除所有容器和数据卷（危险操作）
docker-compose down -v
```

## 项目结构

```
JIFANG-jianshe/
├── docker-compose.yml          # Docker Compose 配置
├── database/
│   └── init/                   # 数据库初始化脚本
├── backend/                    # 后端项目
│   ├── config/                 # 配置文件
│   ├── controllers/            # 控制器
│   ├── middleware/             # 中间件
│   ├── models/                 # 数据模型
│   ├── routes/                 # 路由
│   ├── scripts/                # 脚本
│   ├── Dockerfile              # 后端 Dockerfile
│   └── .env                    # 环境变量
│
├── frontend/                   # 前端项目
│   ├── src/
│   │   ├── api/               # API 接口
│   │   ├── components/        # 公共组件
│   │   ├── views/             # 页面组件
│   │   ├── router/            # 路由配置
│   │   └── store/             # Vuex 状态管理
│   └── package.json
│
└── README.md
```