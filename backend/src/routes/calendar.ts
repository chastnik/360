// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router, Response } from 'express';
import knex from '../database/connection';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Получить рабочее расписание
router.get('/work-schedule', authenticateToken, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const schedule = await knex('work_schedule')
      .select('*')
      .orderBy('day_of_week');
    
    // Если расписание пустое, создаем стандартное (пн-пт, 8 часов)
    if (schedule.length === 0) {
      const defaultSchedule = [
        { day_of_week: 1, is_workday: true, work_hours: 8, start_time: '09:00:00', end_time: '18:00:00' },
        { day_of_week: 2, is_workday: true, work_hours: 8, start_time: '09:00:00', end_time: '18:00:00' },
        { day_of_week: 3, is_workday: true, work_hours: 8, start_time: '09:00:00', end_time: '18:00:00' },
        { day_of_week: 4, is_workday: true, work_hours: 8, start_time: '09:00:00', end_time: '18:00:00' },
        { day_of_week: 5, is_workday: true, work_hours: 8, start_time: '09:00:00', end_time: '18:00:00' },
        { day_of_week: 6, is_workday: false, work_hours: 0, start_time: '09:00:00', end_time: '18:00:00' },
        { day_of_week: 7, is_workday: false, work_hours: 0, start_time: '09:00:00', end_time: '18:00:00' },
      ];
      await knex('work_schedule').insert(defaultSchedule);
      const newSchedule = await knex('work_schedule').select('*').orderBy('day_of_week');
      return res.json({ success: true, data: newSchedule });
    }
    
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('Ошибка получения рабочего расписания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить рабочее расписание
router.put('/work-schedule', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { schedule } = req.body;
    
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Неверный формат данных' });
    }
    
    // Удаляем старое расписание
    await knex('work_schedule').del();
    
    // Вставляем новое
    const scheduleData = schedule.map((item: { day_of_week: number; is_workday?: boolean; work_hours?: number; start_time?: string; end_time?: string }) => ({
      day_of_week: item.day_of_week,
      is_workday: item.is_workday !== false,
      work_hours: item.work_hours || 8,
      start_time: item.start_time || '09:00:00',
      end_time: item.end_time || '18:00:00',
    }));
    
    await knex('work_schedule').insert(scheduleData);
    
    const updatedSchedule = await knex('work_schedule').select('*').orderBy('day_of_week');
    res.json({ success: true, data: updatedSchedule });
  } catch (error) {
    console.error('Ошибка обновления рабочего расписания:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить список праздников
router.get('/holidays', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year } = req.query;
    
    let query = knex('holidays').select('*');
    
    if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      query = query.whereBetween('date', [startDate, endDate]);
    }
    
    const holidays = await query.orderBy('date');
    res.json({ success: true, data: holidays });
  } catch (error) {
    console.error('Ошибка получения праздников:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать праздник
router.post('/holidays', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { date, name, description, is_national } = req.body;
    
    if (!date || !name) {
      return res.status(400).json({ error: 'Дата и название обязательны' });
    }
    
    const [holiday] = await knex('holidays')
      .insert({
        date,
        name: String(name).trim(),
        description: description || null,
        is_national: is_national !== false,
      })
      .returning('*');
    
    res.status(201).json({ success: true, data: holiday });
  } catch (error: any) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({ error: 'Праздник с такой датой уже существует' });
    }
    console.error('Ошибка создания праздника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить праздник
router.put('/holidays/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { date, name, description, is_national } = req.body;
    
    const updateData: Record<string, any> = {};
    if (date) updateData.date = date;
    if (name !== undefined) updateData.name = String(name).trim();
    if (description !== undefined) updateData.description = description;
    if (typeof is_national === 'boolean') updateData.is_national = is_national;
    updateData.updated_at = knex.fn.now();
    
    await knex('holidays').where('id', id).update(updateData);
    
    const holiday = await knex('holidays').where('id', id).first();
    res.json({ success: true, data: holiday });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Праздник с такой датой уже существует' });
    }
    console.error('Ошибка обновления праздника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить праздник
router.delete('/holidays/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await knex('holidays').where('id', id).del();
    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления праздника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;

