const DEFAULT_DEV_CORS_ORIGINS = [
  'http://localhost:8080',
  'http://127.0.0.1:8080'
];

const INVALID_JWT_SECRETS = new Set([
  'jifang-jianshe-secret-key-2024',
  'replace-with-a-long-random-string',
  'your-jwt-secret',
  'changeme'
]);

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const parseOrigins = (value) => {
  if (!value) {
    return [];
  }

  return [...new Set(
    value
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean)
  )];
};

const jwtSecret = process.env.JWT_SECRET?.trim();

if (!jwtSecret || INVALID_JWT_SECRETS.has(jwtSecret) || jwtSecret.length < 16) {
  throw new Error('缺少有效的 JWT_SECRET 环境变量，请配置至少 16 位且非示例值的随机密钥');
}

const corsOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? parseOrigins(process.env.CORS_ALLOWED_ORIGINS)
  : (process.env.NODE_ENV === 'development' ? DEFAULT_DEV_CORS_ORIGINS : []);

const allowedOriginSet = new Set(corsOrigins);

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  cors: {
    origins: corsOrigins,
    allowNoOrigin: true,
    options: {
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true);
        }

        return callback(null, allowedOriginSet.has(origin));
      }
    }
  },
  swagger: {
    enabled: parseBoolean(process.env.SWAGGER_ENABLED, false),
    requireAdmin: parseBoolean(process.env.SWAGGER_REQUIRE_ADMIN, false)
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'jifang_jianshe',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    timezone: '+08:00',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  }
};