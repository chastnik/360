// Автор: Стас Чашин @chastnik
import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requirePermission } from '../middleware/permissions';
import db from '../database/connection';

const router = Router();

// Получить все отпуска (с фильтрацией по правам доступа)
router.get('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { user_id, department_id, manager_id, year, status, type } = req.query;
    
    let query = db('vacations as v')
      .select(
        'v.*',
        db.raw(`CONCAT(u.last_name, ' ', u.first_name, COALESCE(' ' || u.middle_name, '')) as user_name`),
        'u.department_id',
        'u.manager_id',
        'd.name as department_name'
      )
      .leftJoin('users as u', 'v.user_id', 'u.id')
      .leftJoin('departments as d', 'u.department_id', 'd.id')
      .where('u.is_active', true);

    // Права доступа: админы и HR видят все, остальные только свои
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      query = query.where('v.user_id', req.user?.id);
    }

    // Применяем фильтры
    if (user_id) {
      query = query.where('v.user_id', user_id);
    }
    
    if (department_id) {
      // Поддерживаем как department_id, так и название отдела
      if (department_id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Это UUID department_id
        query = query.where('u.department_id', department_id);
      } else {
        // Это название отдела
        query = query.where('u.old_department', department_id);
      }
    }
    
    if (manager_id) {
      query = query.where('u.manager_id', manager_id);
    }
    
    if (year) {
      query = query.whereRaw('EXTRACT(YEAR FROM v.start_date) = ?', [year]);
    }
    
    if (status) {
      query = query.where('v.status', status);
    }
    
    if (type) {
      query = query.where('v.type', type);
    }

    const vacations = await query.orderBy('v.start_date', 'desc');
    
    res.json({
      success: true,
      data: vacations
    });
  } catch (error) {
    console.error('Ошибка получения отпусков:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить отпуск по ID
router.get('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    let query = db('vacations as v')
      .select(
        'v.*',
        db.raw(`CONCAT(u.last_name, ' ', u.first_name, COALESCE(' ' || u.middle_name, '')) as user_name`),
        'u.department_id',
        'u.manager_id',
        'd.name as department_name',
        db.raw(`CONCAT(approver.last_name, ' ', approver.first_name, COALESCE(' ' || approver.middle_name, '')) as approved_by_name`)
      )
      .leftJoin('users as u', 'v.user_id', 'u.id')
      .leftJoin('departments as d', 'u.department_id', 'd.id')
      .leftJoin('users as approver', 'v.approved_by', 'approver.id')
      .where('v.id', id)
      .first();

    const vacation = await query;
    
    if (!vacation) {
      return res.status(404).json({ error: 'Отпуск не найден' });
    }

    // Проверяем права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr' && vacation.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Нет прав для просмотра этого отпуска' });
    }
    
    res.json({
      success: true,
      data: vacation
    });
  } catch (error) {
    console.error('Ошибка получения отпуска:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новый отпуск
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { user_id, start_date, end_date, type, comment } = req.body;
    
    // Проверяем права: админы и HR могут создавать для любого пользователя
    const targetUserId = (req.user?.role === 'admin' || req.user?.role === 'hr') ? 
      (user_id || req.user?.id) : req.user?.id;

    // Валидация данных
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Даты начала и окончания обязательны' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate > endDate) {
      return res.status(400).json({ error: 'Дата окончания должна быть больше или равна дате начала' });
    }

    // Вычисляем количество дней (исключая выходные)
    const timeDiff = endDate.getTime() - startDate.getTime();
    const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Простой расчет рабочих дней (можно улучшить учетом праздников)
    let workingDays = 0;
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Не воскресенье и не суббота
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Проверяем пересечения с существующими отпусками
    const overlapping = await db('vacations')
      .where('user_id', targetUserId)
      .where('status', '!=', 'rejected')
      .where(function() {
        this.whereBetween('start_date', [start_date, end_date])
          .orWhereBetween('end_date', [start_date, end_date])
          .orWhere(function() {
            this.where('start_date', '<=', start_date)
              .andWhere('end_date', '>=', end_date);
          });
      });

    if (overlapping.length > 0) {
      return res.status(400).json({ error: 'На выбранные даты уже запланирован отпуск' });
    }

    // Создаем отпуск
    const [vacation] = await db('vacations')
      .insert({
        user_id: targetUserId,
        start_date,
        end_date,
        days_count: workingDays,
        type: type || 'vacation',
        comment,
        status: (req.user?.role === 'admin' || req.user?.role === 'hr') ? 'approved' : 'pending',
        approved_by: (req.user?.role === 'admin' || req.user?.role === 'hr') ? req.user?.id : null,
        approved_at: (req.user?.role === 'admin' || req.user?.role === 'hr') ? new Date() : null
      })
      .returning('*');

    res.status(201).json({
      success: true,
      data: vacation
    });
  } catch (error) {
    console.error('Ошибка создания отпуска:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить отпуск
router.put('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date, type, comment, status } = req.body;
    
    // Получаем существующий отпуск
    const existingVacation = await db('vacations')
      .where('id', id)
      .first();
    
    if (!existingVacation) {
      return res.status(404).json({ error: 'Отпуск не найден' });
    }

    // Проверяем права доступа
    const canEdit = req.user?.role === 'admin' || req.user?.role === 'hr' || 
                   (existingVacation.user_id === req.user?.id && existingVacation.status === 'pending');
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Нет прав для редактирования этого отпуска' });
    }

    const updateData: any = {};
    
    // Обновляем даты, если они изменились
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      if (startDate > endDate) {
        return res.status(400).json({ error: 'Дата окончания должна быть больше или равна дате начала' });
      }

      // Пересчитываем рабочие дни
      let workingDays = 0;
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      updateData.start_date = start_date;
      updateData.end_date = end_date;
      updateData.days_count = workingDays;
    }
    
    if (type) updateData.type = type;
    if (comment !== undefined) updateData.comment = comment;
    
    // Только админы и HR могут менять статус
    if (status && (req.user?.role === 'admin' || req.user?.role === 'hr')) {
      updateData.status = status;
      if (status === 'approved') {
        updateData.approved_by = req.user?.id;
        updateData.approved_at = new Date();
      } else if (status === 'rejected') {
        updateData.approved_by = req.user?.id;
        updateData.approved_at = new Date();
      }
    }

    const [updatedVacation] = await db('vacations')
      .where('id', id)
      .update(updateData)
      .returning('*');

    res.json({
      success: true,
      data: updatedVacation
    });
  } catch (error) {
    console.error('Ошибка обновления отпуска:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить отпуск
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const vacation = await db('vacations')
      .where('id', id)
      .first();
    
    if (!vacation) {
      return res.status(404).json({ error: 'Отпуск не найден' });
    }

    // Проверяем права доступа
    const canDelete = req.user?.role === 'admin' || req.user?.role === 'hr' || 
                     (vacation.user_id === req.user?.id && vacation.status === 'pending');
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Нет прав для удаления этого отпуска' });
    }

    await db('vacations')
      .where('id', id)
      .del();

    res.json({
      success: true,
      message: 'Отпуск удален'
    });
  } catch (error) {
    console.error('Ошибка удаления отпуска:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить статистику отпусков
router.get('/stats/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    let baseQuery = db('vacations as v')
      .leftJoin('users as u', 'v.user_id', 'u.id')
      .where('u.is_active', true)
      .whereRaw('EXTRACT(YEAR FROM v.start_date) = ?', [year]);

    // Права доступа
    if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
      baseQuery = baseQuery.where('v.user_id', req.user?.id);
    }

    const [totalStats, statusStats, typeStats] = await Promise.all([
      // Общая статистика
      baseQuery.clone()
        .select(
          db.raw('COUNT(*) as total_vacations'),
          db.raw('SUM(days_count) as total_days')
        )
        .first(),
      
      // Статистика по статусам
      baseQuery.clone()
        .select('status')
        .count('* as count')
        .sum('days_count as total_days')
        .groupBy('status'),
      
      // Статистика по типам
      baseQuery.clone()
        .select('type')
        .count('* as count')
        .sum('days_count as total_days')
        .groupBy('type')
    ]);

    res.json({
      success: true,
      data: {
        total: totalStats,
        by_status: statusStats,
        by_type: typeStats
      }
    });
  } catch (error) {
    console.error('Ошибка получения статистики отпусков:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
