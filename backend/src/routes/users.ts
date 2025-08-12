// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import db from '../database/connection';
import { authenticateToken } from '../middleware/auth';
import bcrypt from 'bcryptjs';

// Инициализация: обновляем ограничение роли для поддержки 'hr'
const initializeRoleConstraint = async () => {
  try {
    await db.raw(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check;
      
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'hr', 'manager', 'user'));
    `);
    console.log('✅ Ограничение роли обновлено для поддержки HR');
  } catch (error) {
    console.log('ℹ️  Ограничение роли уже обновлено или не требует изменений');
  }
};

// Выполняем инициализацию при загрузке модуля
initializeRoleConstraint();

const router = Router();

router.get('/', authenticateToken, async (_req: any, res: any): Promise<void> => {
  try {
    const users = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'is_active', 'created_at', 'position', 'old_department as department', 'department_id', 'manager_id', 'mattermost_username', 'is_manager')
      .where('is_active', true)
      .orderBy('last_name', 'first_name');
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить пользователя по ID
router.get('/:id', authenticateToken, async (req: any, res): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'is_active', 'created_at', 'position', 'old_department as department', 'department_id', 'manager_id', 'mattermost_username', 'is_manager')
      .where('id', id)
      .first();
    
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление профиля пользователя
router.put('/profile', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { first_name, last_name, email, position, department, department_id } = req.body;
    const userId = req.user.userId;

    // Проверяем, не занят ли email другим пользователем
    if (email) {
      const existingUser = await db('users')
        .where('email', email)
        .where('id', '!=', userId)
        .first();

      if (existingUser) {
        res.status(400).json({ error: 'Данный email уже используется' });
        return;
      }
    }

    // Обновляем данные пользователя
    await db('users')
      .where('id', userId)
      .update({
        first_name,
        last_name,
        email,
        position,
        old_department: department,
        department_id: department_id && department_id.trim() !== '' ? department_id : null,
        updated_at: new Date()
      });

    // Получаем обновленные данные пользователя
    const updatedUser = await db('users')
      .select('id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'position', 'old_department as department', 'department_id', 'manager_id', 'mattermost_username', 'is_manager', 'is_active', 'created_at', 'updated_at')
      .where('id', userId)
      .first();

    res.json({ 
      success: true, 
      user: updatedUser,
      message: 'Профиль успешно обновлен' 
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Смена пароля
router.put('/password', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.userId;

    if (!current_password || !new_password) {
      res.status(400).json({ error: 'Необходимо указать текущий и новый пароль' });
      return;
    }

    if (new_password.length < 6) {
      res.status(400).json({ error: 'Новый пароль должен содержать не менее 6 символов' });
      return;
    }

    // Получаем текущего пользователя
    const user = await db('users')
      .select('password_hash')
      .where('id', userId)
      .first();

    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Проверяем текущий пароль
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentPasswordValid) {
      res.status(400).json({ error: 'Неверный текущий пароль' });
      return;
    }

    // Хешируем новый пароль
    const hashedNewPassword = await bcrypt.hash(new_password, 10);

    // Обновляем пароль
    await db('users')
      .where('id', userId)
      .update({
        password_hash: hashedNewPassword,
        updated_at: new Date()
      });

    res.json({ 
      success: true,
      message: 'Пароль успешно изменен' 
    });
  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создание нового пользователя (только для админов)
router.post('/', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    // Проверяем, что пользователь админ
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const { 
      email, 
      first_name, 
      last_name, 
      middle_name, 
      role, 
      role_id,
      position, 
      department, // старое поле для совместимости
      department_id, // новое поле - ID отдела
      manager_id,
      mattermost_username,
      password = 'defaultPassword123' // временный пароль
    } = req.body;

    // Валидация обязательных полей
    if (!email || !first_name || !last_name) {
      res.status(400).json({ error: 'Email, имя и фамилия обязательны для заполнения' });
      return;
    }

    // Проверяем уникальность email
    const existingUser = await db('users').where('email', email).first();
    if (existingUser) {
      res.status(400).json({ error: 'Пользователь с таким email уже существует' });
      return;
    }

    // Хешируем временный пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Проверяем существование отдела (если указан department_id)
    if (department_id) {
      const departmentExists = await db('departments').where('id', department_id).where('is_active', true).first();
      if (!departmentExists) {
        res.status(400).json({ error: 'Указанный отдел не найден' });
        return;
      }
    }

    // Создаем пользователя
    const [newUser] = await db('users')
      .insert({
        email,
        first_name,
        last_name,
        middle_name,
        role: role || 'user',
        role_id: role_id && role_id.trim() !== '' ? role_id : null,
        position,
        old_department: department, // старое поле для совместимости
        department_id: department_id && department_id.trim() !== '' ? department_id : null,
        manager_id: manager_id && manager_id.trim() !== '' ? manager_id : null,
        mattermost_username,
        password_hash: hashedPassword,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning(['id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'position', 'old_department', 'department_id', 'manager_id', 'mattermost_username', 'is_active', 'created_at', 'updated_at']);

    res.status(201).json({
      success: true,
      user: newUser,
      message: 'Пользователь создан успешно'
    });
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление пользователя (только для админов)
router.put('/:id', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    // Проверяем, что пользователь админ
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const userId = req.params.id;
    const { 
      email, 
      first_name, 
      last_name, 
      middle_name, 
      role, 
      position, 
      department, // старое поле для совместимости
      department_id, // новое поле - ID отдела
      manager_id,
      mattermost_username,
      is_manager
    } = req.body;

    // Проверяем существование пользователя
    const existingUser = await db('users').where('id', userId).first();
    if (!existingUser) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Проверяем уникальность email (если он изменяется)
    if (email && email !== existingUser.email) {
      const duplicateUser = await db('users')
        .where('email', email)
        .where('id', '!=', userId)
        .first();
      
      if (duplicateUser) {
        res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        return;
      }
    }

    // Проверяем существование отдела (если указан department_id)
    if (department_id) {
      const departmentExists = await db('departments').where('id', department_id).where('is_active', true).first();
      if (!departmentExists) {
        res.status(400).json({ error: 'Указанный отдел не найден' });
        return;
      }
    }

    // Обновляем данные пользователя
    await db('users')
      .where('id', userId)
      .update({
        email,
        first_name,
        last_name,
        middle_name,
        role,
        role_id: req.body.role_id && String(req.body.role_id).trim() !== '' ? req.body.role_id : null,
        position,
        old_department: department, // старое поле для совместимости
        department_id: department_id && department_id.trim() !== '' ? department_id : null,
        manager_id: manager_id && manager_id.trim() !== '' ? manager_id : null,
        mattermost_username,
        is_manager: is_manager === true || is_manager === 'true',
        updated_at: new Date()
      });

    // Получаем обновленные данные
    const updatedUser = await db('users')
      .select(['id', 'email', 'first_name', 'last_name', 'middle_name', 'role', 'position', 'old_department', 'department_id', 'manager_id', 'mattermost_username', 'is_manager', 'is_active', 'created_at', 'updated_at'])
      .where('id', userId)
      .first();

    res.json({
      success: true,
      user: updatedUser,
      message: 'Пользователь обновлен успешно'
    });
  } catch (error: any) {
    console.error('Ошибка обновления пользователя:', error);
    console.error('Детали ошибки:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Активация пользователя
router.patch('/:id/activate', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    // Проверяем, что пользователь админ
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const userId = req.params.id;

    // Проверяем существование пользователя
    const user = await db('users').where('id', userId).first();
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Активируем пользователя
    await db('users')
      .where('id', userId)
      .update({
        is_active: true,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Пользователь активирован'
    });
  } catch (error) {
    console.error('Ошибка активации пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Деактивация пользователя
router.patch('/:id/deactivate', authenticateToken, async (req: any, res: any): Promise<void> => {
  try {
    // Проверяем, что пользователь админ
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const userId = req.params.id;

    // Проверяем существование пользователя
    const user = await db('users').where('id', userId).first();
    if (!user) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Нельзя деактивировать самого себя
    if (userId === req.user.userId) {
      res.status(400).json({ error: 'Нельзя деактивировать самого себя' });
      return;
    }

    // Деактивируем пользователя
    await db('users')
      .where('id', userId)
      .update({
        is_active: false,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: 'Пользователь деактивирован'
    });
  } catch (error) {
    console.error('Ошибка деактивации пользователя:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 