import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (_req: any, res: any): Promise<void> => {
  try {
    const questions = await knex('questions')
      .select('id', 'category_id', 'text', 'type', 'order_index')
      .where('is_active', true)
      .orderBy('category_id', 'order_index');
    
    res.json(questions);
  } catch (error) {
    console.error('Ошибка получения вопросов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 