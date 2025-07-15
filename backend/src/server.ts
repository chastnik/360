import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import questionRoutes from './routes/questions';
import cycleRoutes from './routes/cycles';
import assessmentRoutes from './routes/assessments';
import reportRoutes from './routes/reports';
import mattermostRoutes from './routes/mattermost';

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📚 API доступен по адресу: http://localhost:${PORT}/api`);
});

export default app; 