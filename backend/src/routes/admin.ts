// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router, Response } from 'express';
import knex from '../database/connection';
import { authenticateToken, requireAdmin, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// Недавняя активность для админ-панели
router.get('/recent-activity', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
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

// Получить логи системы
router.get('/logs', authenticateToken, requirePermission('ui:view:admin.logs'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { level, search, limit = 100 } = req.query;
    
    // В реальной системе логи обычно хранятся в файлах или специальной таблице
    // Для примера создадим простую реализацию, которая читает логи из файла или возвращает моковые данные
    // В production нужно использовать winston, pino или другую библиотеку для логирования
    
    // Здесь можно добавить чтение из файла логов или из таблицы БД
    // Для демонстрации вернем моковые данные
    const mockLogs = [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Система запущена',
        context: 'server',
        userId: null,
        userEmail: null
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: 'warn',
        message: 'Предупреждение: высокая нагрузка на сервер',
        context: 'performance',
        userId: null,
        userEmail: null
      }
    ];
    
    // Фильтрация по уровню
    let filteredLogs = mockLogs;
    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    // Поиск
    if (search) {
      const searchStr = Array.isArray(search) ? search[0] : search;
      const searchLower = String(searchStr).toLowerCase();
      filteredLogs = filteredLogs.filter(log => {
        const contextMatch = log.context ? log.context.toLowerCase().includes(searchLower) : false;
        const userEmailStr = log.userEmail as string | null;
        const emailMatch = userEmailStr ? userEmailStr.toLowerCase().includes(searchLower) : false;
        return log.message.toLowerCase().includes(searchLower) || contextMatch || emailMatch;
      });
    }
    
    // Лимит
    const limitedLogs = filteredLogs.slice(0, parseInt(limit as string) || 100);
    
    res.json({ success: true, data: limitedLogs });
  } catch (error) {
    console.error('Ошибка получения логов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;


// Компетенции (CRUD)
router.get('/competencies', authenticateToken, requirePermission('ui:view:admin.competencies'), async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rows = await knex('competencies').where('is_active', true).orderBy('name');
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ error: 'Не удалось получить компетенции' });
  }
});

router.post('/competencies', authenticateToken, requirePermission('ui:view:admin.competencies'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    if (!name || String(name).trim() === '') { res.status(400).json({ error: 'Название обязательно' }); return; }
    const [row] = await knex('competencies').insert({ name: String(name).trim(), description: description || null }).returning('*');
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ error: 'Не удалось создать компетенцию' });
  }
});

router.put('/competencies/:id', authenticateToken, requirePermission('ui:view:admin.competencies'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, is_active } = req.body;
    await knex('competencies').where('id', id).update({
      name: name && String(name).trim() !== '' ? String(name).trim() : undefined,
      description: description !== undefined ? description : undefined,
      is_active: typeof is_active === 'boolean' ? is_active : undefined,
      updated_at: knex.fn.now()
    });
    const row = await knex('competencies').where('id', id).first();
    res.json({ success: true, data: row });
  } catch (e) {
    res.status(500).json({ error: 'Не удалось обновить компетенцию' });
  }
});

router.delete('/competencies/:id', authenticateToken, requirePermission('ui:view:admin.competencies'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await knex('competencies').where('id', id).update({ is_active: false, updated_at: knex.fn.now() });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Не удалось удалить компетенцию' });
  }
});

