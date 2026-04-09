---
name: continue-security-hardening-and-doc-alignment
overview: 继续上一轮未完成的高优先级整改，聚焦后端安全收口与项目文档对齐：去除弱默认 JWT 配置、收紧 CORS、限制 `/api-docs` 暴露，并修正 README 中与实际 PostgreSQL 环境不一致的内容。
todos:
  - id: audit-boundaries
    content: 用[subagent:code-explorer]复核安全入口与文档漂移范围
    status: completed
  - id: harden-runtime-config
    content: 收紧backend/config/index.js与backend/app.js的密钥、CORS和文档访问
    status: completed
    dependencies:
      - audit-boundaries
  - id: sync-env-docs
    content: 更新backend/.env.example与README.md的PostgreSQL和启动说明
    status: completed
    dependencies:
      - harden-runtime-config
  - id: verify-behavior
    content: 校验启动失败策略、跨域白名单和/api-docs访问结果
    status: completed
    dependencies:
      - harden-runtime-config
      - sync-env-docs
---

## User Requirements

继续当前项目的剩余高优先级整改，不重复已完成的任务权限、依赖校验和事务修复，重点处理安全配置与文档一致性问题。

## Product Overview

当前需要让服务端配置更严格、接口文档入口更可控、跨域访问范围更明确，同时把项目说明统一为真实运行方式。完成后，服务启动时会对关键配置进行校验，接口文档不会再默认对所有人开放，开发与部署说明会与当前数据库和容器配置保持一致。

## Core Features

- 启动时校验关键密钥配置，缺失或使用占位值时直接阻止服务启动
- 将跨域访问改为可配置白名单，保留本地开发和无浏览器来源请求的正常访问
- 控制 `/api-docs` 的开放范围，仅在允许环境或授权条件下可访问
- 更新项目说明中的数据库类型、端口、容器名、启动命令和初始化方式，使文档与当前实现一致

## Tech Stack Selection

- 沿用现有后端栈：Express 5、jsonwebtoken、cors、swagger-ui-express、Sequelize、PostgreSQL
- 复用现有鉴权中间件：`/Users/he.ht/projecttest/JIFANG-jianshe/backend/middleware/auth.js`
- 复用现有权限中间件：`/Users/he.ht/projecttest/JIFANG-jianshe/backend/middleware/authorize.js`

## Implementation Approach

采用“集中配置收口 + 入口中间件控制 + 文档同步修正”的方式完成整改。核心做法是在 `backend/config/index.js` 中统一解析并校验安全相关环境变量，在 `backend/app.js` 中只消费已校验配置来控制 CORS 和 `/api-docs` 暴露策略，并将 README 改写为与 `docker-compose.yml`、`init-db` 脚本一致的真实说明。

关键决策：

- **JWT 密钥 fail-fast**：不再依赖硬编码兜底，避免默认密钥进入真实环境；缺失或保留示例占位值时直接报错退出，降低泄露风险。
- **CORS 白名单配置化**：使用环境变量解析允许来源，优先复用现有后端入口，不引入新的网关层；保留无 `Origin` 请求和本地开发地址，兼顾 CLI/健康检查与浏览器访问。
- **Swagger 文档按环境/权限收口**：优先在 `backend/app.js` 侧复用 `auth` 与 `isAdmin`，或通过开关直接禁用，避免改动各业务路由和 Swagger 注释。
- **README 只对齐真实实现**：以 `docker-compose.yml` 中的 `postgres` 服务、5432 端口和 `backend/package.json` 的 `init-db` 脚本为准；`database/init` 当前无 SQL 文件，文档应明确实际初始化依赖脚本。

性能与可靠性：

- 启动期配置校验为 O(1)，只执行一次。
- CORS 来源判断建议转为 `Set`，单次请求判断可视为 O(1)。
- `/api-docs` 额外鉴权只影响文档路径，不增加业务 API 热路径负担。
- 方案保持现有 `/api` 路由结构不变，降低回归范围。

## Implementation Notes

- 保持 `frontend` 当前通过 `/api` 代理访问后端的行为不变，避免影响已正常工作的登录与业务接口。
- 错误信息要明确指出缺失的环境变量，但不要输出密钥原文。
- `README.md` 中所有 MySQL、3306、`mysql` 容器命令都应统一替换为 PostgreSQL 的真实值。
- 文档访问控制优先做到“默认安全”，开发环境需要时再显式开启。

## Architecture Design

当前整改沿用现有分层，不新增架构模式：

- **配置层**：`backend/config/index.js` 统一输出端口、JWT、CORS、文档开关等运行配置
- **入口层**：`backend/app.js` 负责挂载中间件、文档入口、业务路由与错误处理
- **鉴权层**：`backend/middleware/auth.js`、`backend/middleware/authorize.js` 负责文档和业务接口的身份校验
- **文档层**：`backend/config/swagger.js` 继续负责 OpenAPI 规格生成，不承担访问控制职责
- **说明层**：`README.md` 以运行入口和容器配置为准，反映真实启动方式

## Directory Structure

## Directory Structure Summary

本次改动只收口安全配置入口与项目说明，不改动业务接口契约和前端页面。

```text
/Users/he.ht/projecttest/JIFANG-jianshe/
├── backend/
│   ├── app.js                 # [MODIFY] 后端入口。根据集中配置控制 CORS 与 /api-docs 暴露方式，复用现有 auth/isAdmin 中间件，保持 /api 路由与健康检查不变。
│   ├── config/
│   │   └── index.js           # [MODIFY] 运行配置中心。新增/收口 JWT、CORS、Swagger 开关与来源解析逻辑，执行启动前配置校验并输出安全默认值。
│   └── .env.example           # [MODIFY] 示例环境变量。去除误导性的默认密钥用法，补充 CORS 与 API 文档相关配置说明，确保开发者按示例正确填写。
└── README.md                  # [MODIFY] 项目说明。统一数据库为 PostgreSQL，修正容器名、端口、启动命令、初始化流程与访问说明。
```

## Key Code Structures

建议在配置层明确以下配置分组的职责（文本约束即可，无需新增复杂抽象）：

- `jwt.secret`：必须提供有效值，禁止使用示例占位值
- `cors.origins`：由环境变量解析为白名单集合
- `swagger.enabled` / `swagger.requireAdmin`：控制 `/api-docs` 是否开放及是否要求管理员访问

## Agent Extensions

### SubAgent

- **code-explorer**
- Purpose: 复核 `backend/app.js`、`backend/config/index.js`、`backend/.env.example`、`README.md` 与 `docker-compose.yml` 的联动边界
- Expected outcome: 确认安全配置和文档修订的精确影响范围，避免遗漏入口文件、环境变量或说明文档的同步修改