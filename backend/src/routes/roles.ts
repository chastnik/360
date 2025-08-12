// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import db from '../database/connection';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Список ролей
router.get('/', authenticateToken, requireAdmin, async (_req: any, res: any): Promise<void> => {
  try {
    const roles = await db('roles').select('id', 'key', 'name', 'description', 'is_system', 'created_at', 'updated_at').orderBy('name');
    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('Ошибка получения ролей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создание роли
router.post('/', authenticateToken, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { key, name, description } = req.body;
    if (!key || !name) {
      res.status(400).json({ error: 'Необходимо указать key и name' });
      return;
    }
    const [role] = await db('roles').insert({ key, name, description, is_system: false }).returning('*');
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    console.error('Ошибка создания роли:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновление роли
router.put('/:id', authenticateToken, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const existing = await db('roles').where('id', id).first();
    if (!existing) {
      res.status(404).json({ error: 'Роль не найдена' });
      return;
    }
    if (existing.is_system && typeof name === 'string' && name.trim() === '') {
      res.status(400).json({ error: 'Системную роль нельзя сделать пустой' });
      return;
    }
    const [updated] = await db('roles').where('id', id).update({ name, description, updated_at: new Date() }).returning('*');
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Ошибка обновления роли:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удаление роли (нельзя удалить системную)
router.delete('/:id', authenticateToken, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await db('roles').where('id', id).first();
    if (!existing) {
      res.status(404).json({ error: 'Роль не найдена' });
      return;
    }
    if (existing.is_system) {
      res.status(400).json({ error: 'Системные роли удалять нельзя' });
      return;
    }
    await db('roles').where('id', id).del();
    res.json({ success: true, message: 'Роль удалена' });
  } catch (error) {
    console.error('Ошибка удаления роли:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Права роли: получение
router.get('/:id/permissions', authenticateToken, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { id } = req.params;
    const permissions = await db('role_permissions').where('role_id', id).pluck('permission');
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Ошибка получения прав роли:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Права роли: замена списка
router.put('/:id/permissions', authenticateToken, requireAdmin, async (req: any, res: any): Promise<void> => {
  try {
    const { id } = req.params;
    const { permissions } = req.body as { permissions: string[] };
    if (!Array.isArray(permissions)) {
      res.status(400).json({ error: 'permissions должен быть массивом строк' });
      return;
    }
    await db('role_permissions').where('role_id', id).del();
    if (permissions.length > 0) {
      await db('role_permissions').insert(permissions.map(p => ({ role_id: id, permission: p })));
    }
    res.json({ success: true, data: permissions });
  } catch (error) {
    console.error('Ошибка обновления прав роли:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router;


