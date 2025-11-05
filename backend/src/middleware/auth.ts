// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { AuthTokenPayload } from '../types';
import db from '../database/connection';

export interface AuthRequest extends Request {
  user?: AuthTokenPayload;
  headers: any;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ 
        success: false, 
        error: 'Токен доступа не предоставлен' 
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      res.status(500).json({ 
        success: false, 
        error: 'JWT секрет не настроен' 
      });
      return;
    }

    const decoded = jwt.verify(token, secret) as AuthTokenPayload;
    
    // Проверяем, что пользователь существует и активен
    const user = await db('users')
      .where({ id: decoded.userId, is_active: true })
      .first();

    if (!user) {
      res.status(401).json({ 
        success: false, 
        error: 'Пользователь не найден или деактивирован' 
      });
      return;
    }

    // Загружаем permissions для пользователя
    const userPermissions = user.role_id 
      ? await db('role_permissions').where('role_id', user.role_id).pluck('permission')
      : [];

    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: user.role,
      roleId: (user as any).role_id || null,
      permissions: userPermissions
    };
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(403).json({ 
      success: false, 
      error: 'Недействительный токен' 
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Пользователь не авторизован' 
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        error: 'Недостаточно прав доступа' 
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireManagerOrAdmin = requireRole(['manager', 'admin']); 

// Проверка прав по role_permissions
export const requirePermission = (permission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Пользователь не авторизован' });
        return;
      }
      const roleId = (req.user as any).roleId;
      if (!roleId) {
        res.status(403).json({ success: false, error: 'У пользователя не назначена роль' });
        return;
      }
      const has = await db('role_permissions').where({ role_id: roleId, permission }).first();
      if (!has) {
        res.status(403).json({ success: false, error: 'Недостаточно прав доступа' });
        return;
      }
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ success: false, error: 'Ошибка проверки прав' });
    }
  };
};