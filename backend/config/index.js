module.exports = {
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'jifang-jianshe-secret-key-2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'jifang_jianshe',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    timezone: '+08:00',
    logging: process.env.NODE_ENV === 'development' ? console.log : false
  }
};