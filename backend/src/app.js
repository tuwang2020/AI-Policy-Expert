const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./config/database');
const logger = require('./utils/logger');

const policyRoutes = require('./routes/policy.routes');
const enterpriseRoutes = require('./routes/enterprise.routes');
const matchRoutes = require('./routes/match.routes');
const reminderRoutes = require('./routes/reminder.routes');
const searchRoutes = require('./routes/search.routes');
const authRoutes = require('./routes/auth.routes');

const { initReminderScheduler } = require('./tasks/reminder.scheduler');
const { syncPoliciesToES } = require('./tasks/es.sync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api/', limiter);

app.use('/uploads', express.static('uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/enterprises', enterpriseRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/search', searchRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `接口不存在: ${req.originalUrl}`
  });
});

const startServer = async () => {
  try {
    await db.authenticate();
    logger.info('数据库连接成功');
    
    await db.sync({ force: false, alter: false });
    // await db.sync({ alter: process.env.NODE_ENV === 'development' });
    logger.info('数据库同步完成');
    
    initReminderScheduler();
    logger.info('定时任务调度器已启动');
    
    app.listen(PORT, () => {
      logger.info(`🚀 服务器启动成功 - 端口: ${PORT}`);
      logger.info(`📡 API地址: http://localhost:${PORT}/api`);
      logger.info(`🏥 健康检查: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;

