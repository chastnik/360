// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import { Router } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
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

    // Все могут просматривать все отпуска (без ограничений на просмотр)

    // Применяем фильтры
    if (user_id) {
      query = query.where('v.user_id', user_id);
    }
    
    if (department_id && typeof department_id === 'string') {
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

    // Все могут просматривать любой отпуск (без ограничений на просмотр)
    
    return res.json({
      success: true,
      data: vacation
    });
  } catch (error) {
    console.error('Ошибка получения отпуска:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новый отпуск
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { user_id, start_date, end_date, type, comment } = req.body;
    
    console.log('📝 Создание отпуска:', { user_id, start_date, end_date, type, comment, userRole: req.user?.role, userId: req.user?.userId });
    
    // Проверяем права: админы и пользователи с правом на создание отпусков могут создавать для любого пользователя
    const hasCreatePermission = req.user?.permissions?.includes('action:vacations:create');
    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'hr';
    const canCreateForOthers = hasCreatePermission || isAdmin;
    
    // Определяем targetUserId: если user_id передан, используем его, иначе используем ID текущего пользователя
    let targetUserId: string | undefined;
    if (user_id) {
      // Если user_id передан, проверяем права
      if (canCreateForOthers) {
        targetUserId = user_id;
      } else {
        // Обычный пользователь может создавать отпуск только для себя
        if (user_id !== req.user?.userId) {
          return res.status(403).json({ error: 'Нет прав для создания отпуска для другого пользователя' });
        }
        targetUserId = req.user?.userId;
      }
    } else {
      // Если user_id не передан, создаем отпуск для текущего пользователя
      targetUserId = req.user?.userId;
    }
    
    if (!targetUserId) {
      console.error('❌ Ошибка: не указан user_id');
      return res.status(400).json({ error: 'Не указан идентификатор пользователя' });
    }
    
    console.log('✅ targetUserId определен:', targetUserId, 'из user_id:', user_id, 'req.user?.userId:', req.user?.userId, 'canCreateForOthers:', canCreateForOthers);

    // Валидация данных
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Даты начала и окончания обязательны' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate > endDate) {
      return res.status(400).json({ error: 'Дата окончания должна быть больше или равна дате начала' });
    }

    // Вычисляем количество календарных дней
    const timeDiff = endDate.getTime() - startDate.getTime();
    const calendarDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    
    // Используем календарные дни вместо рабочих дней
    const daysCount = calendarDays;

    // Проверяем пересечения с существующими отпусками ТОЛЬКО для этого пользователя
    console.log('🔍 Проверка пересечений для пользователя:', targetUserId, 'Даты:', start_date, '-', end_date);
    
    // Сначала получаем все отпуска этого пользователя для отладки
    const allUserVacations = await db('vacations')
      .where('user_id', targetUserId)
      .where('status', '!=', 'rejected')
      .select('*');
    
    console.log('🔍 Все отпуска пользователя', targetUserId, ':', allUserVacations.length, allUserVacations);
    
    // Проверяем пересечения
    const overlapping = await db('vacations')
      .where('user_id', String(targetUserId)) // Явно приводим к строке для надежности
      .where('status', '!=', 'rejected')
      .where(function() {
        this.where(function() {
          // Начало нового отпуска попадает в существующий
          this.where('start_date', '<=', start_date)
            .where('end_date', '>=', start_date);
        }).orWhere(function() {
          // Конец нового отпуска попадает в существующий
          this.where('start_date', '<=', end_date)
            .where('end_date', '>=', end_date);
        }).orWhere(function() {
          // Новый отпуск полностью содержит существующий
          this.where('start_date', '>=', start_date)
            .where('end_date', '<=', end_date);
        }).orWhere(function() {
          // Существующий отпуск полностью содержит новый
          this.where('start_date', '<=', start_date)
            .where('end_date', '>=', end_date);
        });
      })
      .select('*');

    console.log('🔍 Найдено пересекающихся отпусков:', overlapping.length);
    if (overlapping.length > 0) {
      console.log('⚠️ Найдены пересекающиеся отпуска:', overlapping);
      // Проверяем, что все найденные отпуска действительно принадлежат этому пользователю
      const wrongUserIds = overlapping.filter(v => String(v.user_id) !== String(targetUserId));
      if (wrongUserIds.length > 0) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА: Найдены отпуска других пользователей!', wrongUserIds);
        console.error('❌ Ожидаемый user_id:', targetUserId, 'Тип:', typeof targetUserId);
        wrongUserIds.forEach(v => {
          console.error('❌ Найден отпуск с user_id:', v.user_id, 'Тип:', typeof v.user_id);
        });
        return res.status(500).json({ error: 'Внутренняя ошибка: найдены отпуска других пользователей' });
      }
      return res.status(400).json({ error: 'На выбранные даты уже запланирован отпуск' });
    }

    // Создаем отпуск
    const insertData = {
      user_id: targetUserId,
      start_date,
      end_date,
      days_count: daysCount,
      type: type || 'vacation',
      comment: comment || null,
      status: hasCreatePermission ? 'approved' : 'pending',
      approved_by: hasCreatePermission ? req.user?.userId : null,
      approved_at: hasCreatePermission ? new Date() : null
    };
    
    console.log('💾 Данные для вставки:', insertData);
    
    const [vacation] = await db('vacations')
      .insert(insertData)
      .returning('*');
    
    console.log('✅ Отпуск создан:', vacation);

    return res.status(201).json({
      success: true,
      data: vacation
    });
  } catch (error: any) {
    console.error('❌ Ошибка создания отпуска:', error);
    console.error('❌ Детали ошибки:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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
    const hasUpdatePermission = req.user?.permissions?.includes('action:vacations:update');
    const isOwnVacation = existingVacation.user_id === req.user?.userId;
    // Пользователь может редактировать свой отпуск независимо от статуса
    // Или пользователь с правом update может редактировать любой отпуск
    const canEdit = hasUpdatePermission || isOwnVacation;
    
    if (!canEdit) {
      return res.status(403).json({ error: 'Нет прав для редактирования этого отпуска' });
    }

    const updateData: any = {};
    
    // Обновляем даты, если они указаны
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      
      if (startDate > endDate) {
        return res.status(400).json({ error: 'Дата окончания должна быть больше или равна дате начала' });
      }

      // Нормализуем даты для сравнения (убираем время, оставляем только дату)
      const existingStartDate = new Date(existingVacation.start_date).toISOString().split('T')[0];
      const existingEndDate = new Date(existingVacation.end_date).toISOString().split('T')[0];
      const newStartDate = new Date(start_date).toISOString().split('T')[0];
      const newEndDate = new Date(end_date).toISOString().split('T')[0];
      
      const datesChanged = existingStartDate !== newStartDate || existingEndDate !== newEndDate;
      
      // Пересчитываем календарные дни только если даты изменились
      if (datesChanged) {
        // Пересчитываем календарные дни
        const timeDiff = endDate.getTime() - startDate.getTime();
        const calendarDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        const daysCount = calendarDays;

        // Проверяем пересечения с другими отпусками ТОЛЬКО для этого пользователя (исключая текущий)
        const overlapping = await db('vacations')
          .where('user_id', existingVacation.user_id) // Важно: проверяем только для конкретного пользователя
          .where('id', '!=', db.raw('?', [id]))
          .where('status', '!=', 'rejected')
          .where(function() {
            this.where(function() {
              // Начало нового отпуска попадает в существующий
              this.where('start_date', '<=', start_date)
                .where('end_date', '>=', start_date);
            }).orWhere(function() {
              // Конец нового отпуска попадает в существующий
              this.where('start_date', '<=', end_date)
                .where('end_date', '>=', end_date);
            }).orWhere(function() {
              // Новый отпуск полностью содержит существующий
              this.where('start_date', '>=', start_date)
                .where('end_date', '<=', end_date);
            }).orWhere(function() {
              // Существующий отпуск полностью содержит новый
              this.where('start_date', '<=', start_date)
                .where('end_date', '>=', end_date);
            });
          });

        if (overlapping.length > 0) {
          console.log('⚠️ Найдены пересекающиеся отпуска при обновлении:', overlapping);
          console.log('📅 Новые даты:', { start_date, end_date });
          console.log('📅 Текущий отпуск:', { id, start_date: existingVacation.start_date, end_date: existingVacation.end_date });
          return res.status(400).json({ error: 'На выбранные даты уже запланирован отпуск' });
        }

        updateData.start_date = start_date;
        updateData.end_date = end_date;
        updateData.days_count = daysCount;
      }
    }
    
    if (type) updateData.type = type;
    if (comment !== undefined) updateData.comment = comment;
    
    // Только пользователи с правом на обновление отпусков могут менять статус
    // Обычные пользователи не могут менять статус своего отпуска
    if (status && hasUpdatePermission) {
      updateData.status = status;
      if (status === 'approved') {
        updateData.approved_by = req.user?.userId;
        updateData.approved_at = new Date();
      } else if (status === 'rejected') {
        updateData.approved_by = req.user?.userId;
        updateData.approved_at = new Date();
      }
    } else if (status && isOwnVacation) {
      // Если пользователь пытается изменить статус своего отпуска без прав - игнорируем это
      // Не добавляем статус в updateData
    }

    // Проверяем, что есть что обновлять
    if (Object.keys(updateData).length === 0) {
      // Если ничего не изменилось, просто возвращаем существующий отпуск
      return res.json({
        success: true,
        data: existingVacation
      });
    }

    updateData.updated_at = new Date();

    const updated = await db('vacations')
      .where('id', id)
      .update(updateData)
      .returning('*');

    if (!updated || updated.length === 0) {
      console.error('⚠️ Отпуск не был обновлен:', { id, updateData });
      return res.status(404).json({ error: 'Отпуск не найден или не был обновлен' });
    }

    const updatedVacation = updated[0];

    return res.json({
      success: true,
      data: updatedVacation
    });
  } catch (error: any) {
    console.error('Ошибка обновления отпуска:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    return res.status(500).json({ 
      error: error.message || 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
    const hasDeletePermission = req.user?.permissions?.includes('action:vacations:delete');
    const isOwnVacation = vacation.user_id === req.user?.userId;
    // Пользователь может удалять свой отпуск независимо от статуса
    // Или пользователь с правом delete может удалять любой отпуск
    const canDelete = hasDeletePermission || isOwnVacation;
    
    if (!canDelete) {
      return res.status(403).json({ error: 'Нет прав для удаления этого отпуска' });
    }

    await db('vacations')
      .where('id', id)
      .del();

    return res.json({
      success: true,
      message: 'Отпуск удален'
    });
  } catch (error) {
    console.error('Ошибка удаления отпуска:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
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

    // Все могут просматривать статистику всех отпусков (без ограничений на просмотр)

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
