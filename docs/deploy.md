# 机房建设监控平台 - 生产环境部署指南

## 部署方案

### 方案一：传统部署（手动安装）

#### 服务器要求
- 操作系统：Ubuntu 20.04+ / CentOS 7+
- Node.js 18+
- PostgreSQL 15+
- Nginx
- 内存：至少 1GB
- 存储：至少 10GB

#### 1. 安装依赖

**Ubuntu:**
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Nginx
sudo apt install -y nginx

# PM2（进程管理）
sudo npm install -g pm2
```

**CentOS:**
```bash
# Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# PostgreSQL
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql

# Nginx
sudo yum install -y nginx
```

#### 2. 配置 PostgreSQL

```bash
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE jifang_jianshe;
CREATE USER jifang_user WITH PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE jifang_jianshe TO jifang_user;
\q
```

#### 3. 上传代码

```bash
# 方式一：Git
git clone <your-repo-url> /opt/jifang-jianshe

# 方式二：SCP 上传
# 本地执行：
scp -r /Users/he.ht/projecttest/JIFANG-jianshe user@server:/opt/
```

#### 4. 配置环境变量

```bash
cd /opt/jifang-jianshe

# 创建 .env 文件
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=jifang_jianshe
DB_USER=jifang_user
DB_PASSWORD=your_strong_password

JWT_SECRET=<生成32位随机字符串>
JWT_EXPIRES_IN=12h

CORS_ALLOWED_ORIGINS=https://your-domain.com
SWAGGER_ENABLED=false
EOF

# 生成 JWT 密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 5. 初始化数据库

```bash
cd /opt/jifang-jianshe/backend
npm install --production
npm run init-db
```

#### 6. 构建前端

```bash
cd /opt/jifang-jianshe/frontend
npm install
npm run build
# 产物在 dist 目录
```

#### 7. 启动后端

```bash
cd /opt/jifang-jianshe/backend
pm2 start server.js --name jifang-backend
pm2 save
pm2 startup
```

#### 8. 配置 Nginx

```bash
sudo nano /etc/nginx/sites-available/jifang.conf
```

内容：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /opt/jifang-jianshe/frontend/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/jifang.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 9. 配置 HTTPS（推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

---

### 方案二：Docker 部署（推荐）

#### 1. 安装 Docker

```bash
# Ubuntu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. 上传代码到服务器

```bash
scp -r /Users/he.ht/projecttest/JIFANG-jianshe user@server:/opt/
```

#### 3. 配置环境变量

```bash
cd /opt/JIFANG-jianshe

# 创建 .env 文件
cat > .env << 'EOF'
DB_USER=jifang
DB_PASSWORD=your_strong_password
DB_NAME=jifang_jianshe
JWT_SECRET=<32位随机字符串>
CORS_ALLOWED_ORIGINS=https://your-domain.com
EOF
```

#### 4. 启动服务

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

#### 5. 查看状态

```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 常用运维命令

### PM2 命令（传统部署）
```bash
pm2 status              # 查看进程状态
pm2 logs jifang-backend # 查看日志
pm2 restart jifang-backend # 重启服务
pm2 stop jifang-backend    # 停止服务
```

### Docker 命令
```bash
docker-compose ps       # 查看容器状态
docker-compose logs -f  # 查看日志
docker-compose restart  # 重启所有服务
docker-compose down     # 停止并删除容器
```

### 数据库备份
```bash
pg_dump -U jifang_user jifang_jianshe > backup.sql
```

### 数据库恢复
```bash
psql -U jifang_user jifang_jianshe < backup.sql
```

---

## 安全建议

1. **修改默认密码**：数据库密码、JWT 密钥必须使用强密码
2. **关闭 Swagger**：生产环境设置 `SWAGGER_ENABLED=false`
3. **配置 HTTPS**：使用 SSL 证书加密通信
4. **防火墙配置**：只开放 80/443 端口，关闭数据库端口
5. **定期备份**：每天自动备份数据库

---

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80/443 | 对外访问 |
| 后端 API | 3000 | 内部通信 |
| PostgreSQL | 5432 | 内部通信 |

---

## 常见问题

### 1. 前端页面空白
检查 `dist` 目录是否正确生成，Nginx 配置是否正确。

### 2. API 请求失败
检查后端是否启动，数据库连接是否正常。

### 3. 登录失败
检查 JWT 配置，数据库是否有用户数据。

### 4. 邮件发送失败
检查 SMTP 配置，可在前端"系统设置"页面配置。