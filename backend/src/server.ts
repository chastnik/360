import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';
import redisService from './services/redis';
import databaseService from './services/database';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import questionRoutes from './routes/questions';
import cycleRoutes from './routes/cycles';
import assessmentRoutes from './routes/assessments';
import reportRoutes from './routes/reports';
import mattermostRoutes from './routes/mattermost';
import settingsRoutes from './routes/settings';

config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов на IP
  message: 'Слишком много запросов с этого IP, попробуйте позже.'
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mattermost', mattermostRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Внутренняя ошибка сервера' : err.message 
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, error: 'Маршрут не найден' });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize database first
    await databaseService.initialize();
    console.log('✅ База данных инициализирована');
    
    // Then initialize Redis
    await redisService.initialize();
    console.log('✅ Redis инициализирован');
    
  } catch (error: any) {
    console.error('❌ Ошибка инициализации сервисов:', error.message);
    process.exit(1);
  }
}

// Start server
initializeServices().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
    console.log(`📚 API доступен по адресу: http://localhost:${PORT}/api`);
  });
}).catch((error) => {
  console.error('❌ Не удалось запустить сервер:', error);
  process.exit(1);
});

export default app; 