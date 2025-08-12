// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Недавняя активность для админ-панели
router.get('/recent-activity', authenticateToken, requireAdmin, async (_req: any, res: any): Promise<void> => {
  try {
    const [usersRecent, cyclesCreated, cyclesStarted, assessmentsCompleted] = await Promise.all([
      knex('users')
        .select('id', 'first_name', 'last_name', 'created_at')
        .orderBy('created_at', 'desc')
        .limit(10),

      knex('assessment_cycles')
        .leftJoin('users as creators', 'assessment_cycles.created_by', 'creators.id')
        .select(
          'assessment_cycles.id as id',
          'assessment_cycles.name as name',
          'assessment_cycles.created_at as created_at',
          'creators.first_name as creator_first_name',
          'creators.last_name as creator_last_name'
        )
        .orderBy('assessment_cycles.created_at', 'desc')
        .limit(10),

      knex('assessment_cycles')
        .select('id', 'name', 'status', 'updated_at')
        .where('status', 'active')
        .orderBy('updated_at', 'desc')
        .limit(10),

      knex('assessment_participants')
        .join('users', 'assessment_participants.user_id', 'users.id')
        .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
        .select(
          'assessment_participants.id as id',
          'assessment_participants.completed_at as completed_at',
          'users.first_name as user_first_name',
          'users.last_name as user_last_name',
          'assessment_cycles.name as cycle_name'
        )
        .where('assessment_participants.status', 'completed')
        .whereNotNull('assessment_participants.completed_at')
        .orderBy('assessment_participants.completed_at', 'desc')
        .limit(10)
    ]);

    type Activity = { id: number; type: string; description: string; user: string; timestamp: string };
    const activities: Activity[] = [];

    usersRecent.forEach((u: any) => {
      activities.push({
        id: activities.length + 1,
        type: 'user_registered',
        description: 'Зарегистрирован новый пользователь',
        user: `${u.first_name} ${u.last_name}`.trim(),
        timestamp: (u.created_at instanceof Date ? u.created_at.toISOString() : u.created_at)
      });
    });

    cyclesCreated.forEach((c: any) => {
      activities.push({
        id: activities.length + 1,
        type: 'cycle_created',
        description: `Создан цикл оценки "${c.name}"`,
        user: c.creator_first_name ? `${c.creator_first_name} ${c.creator_last_name}`.trim() : 'Система',
        timestamp: (c.created_at instanceof Date ? c.created_at.toISOString() : c.created_at)
      });
    });

    cyclesStarted.forEach((c: any) => {
      activities.push({
        id: activities.length + 1,
        type: 'cycle_started',
        description: `Запущен цикл оценки "${c.name}"`,
        user: 'Система',
        timestamp: (c.updated_at instanceof Date ? c.updated_at.toISOString() : c.updated_at)
      });
    });

    assessmentsCompleted.forEach((a: any) => {
      activities.push({
        id: activities.length + 1,
        type: 'assessment_completed',
        description: `Завершена оценка (цикл: ${a.cycle_name})`,
        user: `${a.user_first_name} ${a.user_last_name}`.trim(),
        timestamp: (a.completed_at instanceof Date ? a.completed_at.toISOString() : a.completed_at)
      });
    });

    // Сортировка по дате
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({ success: true, data: activities.slice(0, 20) });
  } catch (error) {
    console.error('Ошибка получения недавней активности:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;


