// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import path from 'path';
import rateLimit from 'express-rate-limit';
import redisService from './services/redis';
import databaseService from './services/database';
import schedulerService from './services/scheduler';

// import authRoutes from './routes/auth'; // временно отключен
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import questionRoutes from './routes/questions';
import cycleRoutes from './routes/cycles';
import assessmentRoutes from './routes/assessments';
import reportRoutes from './routes/reports';
import mattermostRoutes from './routes/mattermost';
import jiraRoutes from './routes/jira';
import settingsRoutes from './routes/settings';
import departmentRoutes from './routes/departments';
import roleRoutes from './routes/roles';
import adminRoutes from './routes/admin';
import learningRoutes from './routes/learning';
import vacationRoutes from './routes/vacations';
import calendarRoutes from './routes/calendar';

// Загружаем переменные окружения из корневого .env файла
config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy - устанавливаем в 1 для доверия только первому прокси (более безопасно)
// Это нужно для корректной работы за прокси/балансировщиком, но не позволяет обойти rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (увеличен лимит для разработки)
// trustProxy: false - игнорируем trust proxy для безопасности rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 минута
  max: 1000, // максимум 1000 запросов на IP
  message: 'Слишком много запросов с этого IP, попробуйте позже.'
  // trustProxy отключен через app.set('trust proxy', 1) выше
});
app.use('/api/', limiter);

// Test routes (временно заменяем основной auth)
import testAuthRoutes from './routes/test-auth';
app.use('/api/auth', testAuthRoutes);

// Routes
// app.use('/api/auth', authRoutes); // временно отключен
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/cycles', cycleRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/mattermost', mattermostRoutes);
app.use('/api/jira', jiraRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/vacations', vacationRoutes);
app.use('/api/calendar', calendarRoutes);

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
    
    // Start scheduler
    schedulerService.start();
    console.log('✅ Планировщик задач запущен');
    
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

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Получен сигнал SIGINT, завершение работы...');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Получен сигнал SIGTERM, завершение работы...');
  schedulerService.stop();
  process.exit(0);
});

export default app; 