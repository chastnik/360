import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (_req: any, res: any): Promise<void> => {
  try {
    const users = await knex('users')
      .select('id', 'email', 'first_name', 'last_name', 'role', 'is_active', 'created_at')
      .where('is_active', true)
      .orderBy('last_name', 'first_name');
    
    res.json(users);
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 