// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
// ВАЖНО: Загружаем переменные окружения ПЕРВЫМ делом, до всех импортов
import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import redisService from './services/redis';
import databaseService from './services/database';
import schedulerService from './services/scheduler';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

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

const app = express();
const PORT = process.env.PORT || 5000;

// Health check должен быть ПЕРВЫМ, до всех middleware
// Это критично для Docker health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

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

// Строгий rate limiting для критичных эндпоинтов аутентификации
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток
  message: 'Слишком много попыток. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // максимум 3 попытки в час
  message: 'Слишком много запросов на сброс пароля. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
import authRoutes from './routes/auth';
// Применяем строгий rate limiting к критичным эндпоинтам
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/auth', authRoutes);
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

// Error handling middleware (должен быть последним)
app.use(errorHandler);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ success: false, error: 'Маршрут не найден' });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize database first
    await databaseService.initialize();
    logger.info('База данных инициализирована');
    
    // Then initialize Redis
    await redisService.initialize();
    logger.info('Redis инициализирован');
    
    // Start scheduler
    schedulerService.start();
    logger.info('Планировщик задач запущен');
    
  } catch (error: any) {
    logger.error({ error }, 'Ошибка инициализации сервисов');
    process.exit(1);
  }
}

// Start server
// Запускаем сервер сразу, чтобы health check работал
// Инициализация сервисов происходит асинхронно
try {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT }, 'Сервер запущен');
    logger.info({ url: `http://localhost:${PORT}/api` }, 'API доступен');
    
    // Инициализируем сервисы после запуска сервера
    initializeServices().catch((error) => {
      logger.error({ error }, 'Ошибка инициализации сервисов');
      logger.warn('Приложение продолжит работу, но некоторые функции могут быть недоступны');
      // Не завершаем процесс, чтобы сервер продолжал работать
      // Health check может показать, что сервисы не инициализированы
    });
  }).on('error', (error: any) => {
    logger.error({ error }, 'Ошибка запуска сервера');
    // Не завершаем процесс сразу, даем время для диагностики
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  });
} catch (error) {
  logger.error({ error }, 'Критическая ошибка при запуске сервера');
  process.exit(1);
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Получен сигнал SIGINT, завершение работы...');
  schedulerService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Получен сигнал SIGTERM, завершение работы...');
  schedulerService.stop();
  process.exit(0);
});

export default app; 