import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (_req: any, res: any): Promise<void> => {
  try {
    const categories = await knex('categories')
      .select('id', 'name', 'description', 'color')
      .where('is_active', true)
      .orderBy('name');
    
    res.json(categories);
  } catch (error) {
    console.error('Ошибка получения категорий:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 