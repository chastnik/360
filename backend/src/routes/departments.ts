// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
import { Router, Response } from 'express';
import Joi from 'joi';
import db from '../database/connection';
import { authenticateToken, AuthRequest, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = Router();

// Схемы валидации
const createDepartmentSchema = Joi.object({
  name: Joi.string().required().min(1).max(255).trim().messages({
    'string.empty': 'Название отдела обязательно для заполнения',
    'string.min': 'Название отдела должно содержать минимум 1 символ',
    'string.max': 'Название отдела не должно превышать 255 символов',
    'any.required': 'Название отдела обязательно'
  }),
  description: Joi.string().allow('', null).max(1000).trim().optional(),
  code: Joi.string().allow('', null).max(50).trim().optional(),
  head_id: Joi.string().uuid().allow(null).optional()
});

const updateDepartmentSchema = Joi.object({
  name: Joi.string().min(1).max(255).trim().required().messages({
    'string.empty': 'Название отдела обязательно для заполнения',
    'string.min': 'Название отдела должно содержать минимум 1 символ',
    'string.max': 'Название отдела не должно превышать 255 символов',
    'any.required': 'Название отдела обязательно'
  }),
  description: Joi.string().allow('', null).max(1000).trim().optional(),
  code: Joi.string().allow('', null).max(50).trim().optional(),
  head_id: Joi.string().uuid().allow(null).optional()
});

const departmentIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

const reorderDepartmentsSchema = Joi.object({
  departments: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      sort_order: Joi.number().integer().min(0).required()
    })
  ).min(1).required()
});

// Получить все отделы
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    
    // Для администраторов - все отделы, для остальных - только активные
    const query = db('departments')
      .select([
        'departments.id',
        'departments.name', 
        'departments.description',
        'departments.code',
        'departments.head_id',
        'departments.is_active',
        'departments.sort_order',
        'departments.created_at',
        'departments.updated_at',
        'users.first_name as head_first_name',
        'users.last_name as head_last_name'
      ])
      .leftJoin('users', 'departments.head_id', 'users.id')
      .orderBy('departments.sort_order', 'asc')
      .orderBy('departments.name', 'asc');

    if (user?.role !== 'admin') {
      query.where('departments.is_active', true);
    }

    const departments = await query;

    // Оптимизация: получаем количество сотрудников одним запросом для всех отделов
    const departmentIds = departments.map(d => d.id);
    const employeeCounts = departmentIds.length > 0
      ? await db('users')
          .select('department_id')
          .count('id as count')
          .whereIn('department_id', departmentIds)
          .where('is_active', true)
          .groupBy('department_id')
      : [];

    // Создаем мапу для быстрого доступа к количеству сотрудников
    const countMap = new Map(
      employeeCounts.map((item: any) => [
        item.department_id,
        parseInt(String(item.count || '0'))
      ])
    );

    // Объединяем данные
    const departmentsWithCounts = departments.map((department) => ({
      ...department,
      employee_count: countMap.get(department.id) || 0,
      head_name: department.head_first_name && department.head_last_name 
        ? `${department.head_first_name} ${department.head_last_name}`
        : null
    }));

    res.json({
      success: true,
      data: departmentsWithCounts
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка получения отделов');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить отдел по ID
router.get('/:id', authenticateToken, validate(departmentIdSchema, 'params'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const department = await db('departments')
      .leftJoin('users as head', 'departments.head_id', 'head.id')
      .select(
        'departments.*',
        'head.first_name as head_first_name',
        'head.last_name as head_last_name'
      )
      .where('departments.id', id)
      .first();
    
    if (!department) {
      res.status(404).json({ error: 'Отдел не найден' });
      return;
    }
    
    // Получаем количество сотрудников
    const employeeCount = await db('users')
      .where('department_id', department.id)
      .where('is_active', true)
      .count('id as count')
      .first();

    const result = {
      ...department,
      employee_count: parseInt(String(employeeCount?.count || '0')),
      head_name: department.head_first_name && department.head_last_name 
        ? `${department.head_first_name} ${department.head_last_name}`
        : null
    };
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка получения отдела');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новый отдел (только для админов)
router.post('/', authenticateToken, requireAdmin, validate(createDepartmentSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, code, head_id } = req.body;

    // Проверяем уникальность названия
    const existingDepartment = await db('departments').where('name', name.trim()).first();
    if (existingDepartment) {
      res.status(400).json({ 
        success: false,
        error: 'Отдел с таким названием уже существует' 
      });
      return;
    }

    // Проверяем уникальность кода (если указан)
    if (code && code.trim()) {
      const existingCode = await db('departments').where('code', code.trim()).first();
      if (existingCode) {
        res.status(400).json({ 
          success: false,
          error: 'Отдел с таким кодом уже существует' 
        });
        return;
      }
    }

    // Проверяем существование руководителя (если указан)
    if (head_id) {
      const headUser = await db('users').where('id', head_id).where('is_active', true).first();
      if (!headUser) {
        res.status(400).json({ 
          success: false,
          error: 'Указанный руководитель не найден' 
        });
        return;
      }
    }

    const [newDepartment] = await db('departments')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        code: code?.trim() || null,
        head_id: head_id || null,
        is_active: true,
        sort_order: 0,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'name', 'description', 'code', 'head_id', 'is_active', 'sort_order', 'created_at', 'updated_at']);

    res.status(201).json({
      success: true,
      data: newDepartment,
      message: 'Отдел создан успешно'
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка создания отдела');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить отдел (только для админов)
router.put('/:id', authenticateToken, requireAdmin, validate(departmentIdSchema, 'params'), validate(updateDepartmentSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departmentId = req.params.id;
    const { name, description, code, head_id } = req.body;

    // Проверяем существование отдела
    const existingDepartment = await db('departments').where('id', departmentId).first();
    if (!existingDepartment) {
      res.status(404).json({ 
        success: false,
        error: 'Отдел не найден' 
      });
      return;
    }

    // Проверяем уникальность названия (если изменяется)
    if (name.trim() !== existingDepartment.name) {
      const duplicateName = await db('departments')
        .where('name', name.trim())
        .whereNot('id', departmentId)
        .first();
      
      if (duplicateName) {
        res.status(400).json({ error: 'Отдел с таким названием уже существует' });
        return;
      }
    }

    // Проверяем уникальность кода (если изменяется)
    if (code && code.trim() && code.trim() !== existingDepartment.code) {
      const duplicateCode = await db('departments')
        .where('code', code.trim())
        .whereNot('id', departmentId)
        .first();
      
      if (duplicateCode) {
        res.status(400).json({ error: 'Отдел с таким кодом уже существует' });
        return;
      }
    }

    // Проверяем существование руководителя (если указан)
    if (head_id) {
      const headUser = await db('users').where('id', head_id).where('is_active', true).first();
      if (!headUser) {
        res.status(400).json({ error: 'Указанный руководитель не найден' });
        return;
      }
    }

    // Обновляем отдел
    await db('departments')
      .where('id', departmentId)
      .update({
        name: name.trim(),
        description: description?.trim() || null,
        code: code?.trim() || null,
        head_id: head_id || null,
        updated_at: new Date()
      });

    // Получаем обновленные данные
    const updatedDepartment = await db('departments')
      .select(['id', 'name', 'description', 'code', 'head_id', 'is_active', 'sort_order', 'created_at', 'updated_at'])
      .where('id', departmentId)
      .first();

    res.json({
      success: true,
      data: updatedDepartment,
      message: 'Отдел обновлен успешно'
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка обновления отдела');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Активировать/деактивировать отдел
router.patch('/:id/toggle-active', authenticateToken, requireAdmin, validate(departmentIdSchema, 'params'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departmentId = req.params.id;

    const department = await db('departments').where('id', departmentId).first();
    if (!department) {
      res.status(404).json({ error: 'Отдел не найден' });
      return;
    }

    const newStatus = !department.is_active;

    await db('departments')
      .where('id', departmentId)
      .update({
        is_active: newStatus,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: newStatus ? 'Отдел активирован' : 'Отдел деактивирован'
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка изменения статуса отдела');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Изменить порядок отделов
router.patch('/reorder', authenticateToken, requireAdmin, validate(reorderDepartmentsSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { departments } = req.body;

    // Обновляем порядок в транзакции
    await db.transaction(async (trx) => {
      for (const dept of departments) {
        await trx('departments')
          .where('id', dept.id)
          .update({ 
            sort_order: dept.sort_order,
            updated_at: new Date()
          });
      }
    });

    res.json({
      success: true,
      message: 'Порядок отделов обновлен'
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка изменения порядка отделов');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить отдел (только если нет сотрудников)
router.delete('/:id', authenticateToken, requireAdmin, validate(departmentIdSchema, 'params'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const departmentId = req.params.id;

    const department = await db('departments').where('id', departmentId).first();
    if (!department) {
      res.status(404).json({ error: 'Отдел не найден' });
      return;
    }

    // Проверяем, есть ли сотрудники в отделе
    const employeeCount = await db('users')
      .where('department_id', departmentId)
      .count('id as count')
      .first();

    if (parseInt(String(employeeCount?.count || '0')) > 0) {
      res.status(400).json({ 
        error: 'Невозможно удалить отдел, в котором есть сотрудники. Сначала переместите или удалите всех сотрудников.' 
      });
      return;
    }

    await db('departments').where('id', departmentId).del();

    res.json({
      success: true,
      message: 'Отдел удален успешно'
    });
  } catch (error) {
    logger.error({ error }, 'Ошибка удаления отдела');
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;
