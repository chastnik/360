// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
/* eslint-disable no-console */
import { Router, Response } from 'express';
import db from '../database/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import mattermostService from '../services/mattermost';

const router = Router();

// Получить все циклы оценки
router.get('/', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cycles = await db('assessment_cycles')
      .select('id', 'name', 'description', 'status', 'start_date', 'end_date', 'created_at')
      .orderBy('created_at', 'desc');

    // Получить количество участников для каждого цикла
    const cyclesWithParticipantsCount = await Promise.all(
      cycles.map(async (cycle) => {
        const participantsCount = await db('assessment_participants')
          .where('cycle_id', cycle.id)
          .count('id as count')
          .first();

        return {
          ...cycle,
          participants_count: Number(participantsCount?.count || 0)
        };
      })
    );

    res.json({
      success: true,
      data: cyclesWithParticipantsCount
    });
  } catch (error) {
    console.error('Ошибка получения циклов оценки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить участников, которым нужно выбрать респондентов (для текущего пользователя)
router.get('/participants-pending-respondents', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Получаем всех участников пользователя со статусом 'invited' в активных циклах
    const participants = await db('assessment_participants')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .where('assessment_participants.user_id', userId)
      .where('assessment_participants.status', 'invited')
      .where('assessment_cycles.status', 'active')
      .select(
        'assessment_participants.id as participant_id',
        'assessment_cycles.id as cycle_id',
        'assessment_cycles.name as cycle_name',
        'assessment_cycles.description as cycle_description'
      );

    // Для каждого участника проверяем количество выбранных респондентов
    const participantsNeedingRespondents = [];
    for (const participant of participants) {
      const respondentsCount = await db('assessment_respondents')
        .where('participant_id', participant.participant_id)
        .count('id as count')
        .first();

      const count = Number(respondentsCount?.count || 0);
      // Если респондентов меньше 4 или их нет вообще, добавляем в список
      if (count < 4) {
        participantsNeedingRespondents.push({
          participantId: participant.participant_id,
          cycleId: participant.cycle_id,
          cycleName: participant.cycle_name,
          cycleDescription: participant.cycle_description,
          respondentsCount: count,
          minRequired: 4
        });
      }
    }

    res.json({
      success: true,
      data: participantsNeedingRespondents
    });
  } catch (error) {
    console.error('Ошибка получения участников для выбора респондентов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить информацию об участнике для выбора респондентов (должен быть ДО /:id)
router.get('/participants/:participantId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const { participantId } = req.params;

    if (!user?.userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Получить информацию об участнике
    const participant = await db('assessment_participants')
      .join('assessment_cycles', 'assessment_participants.cycle_id', 'assessment_cycles.id')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_participants.id', participantId)
      .select(
        'assessment_participants.id',
        'assessment_participants.cycle_id',
        'assessment_participants.status as participant_status',
        'assessment_cycles.id as cycle_id',
        'assessment_cycles.name as cycle_name',
        'assessment_cycles.description as cycle_description',
        'assessment_cycles.status as cycle_status',
        'users.id as user_id',
        'users.first_name',
        'users.last_name',
        'users.email'
      )
      .first();

    if (!participant) {
      res.status(404).json({ error: 'Участник не найден' });
      return;
    }

    // Проверить, что пользователь является именно этим участником (строгая проверка)
    if (user.userId !== participant.user_id) {
      res.status(403).json({ error: 'Доступ запрещен. Вы можете выбрать респондентов только для своего участия в цикле.' });
      return;
    }

    // Получить уже добавленных респондентов
    const existingRespondents = await db('assessment_respondents')
      .join('users', 'assessment_respondents.respondent_user_id', 'users.id')
      .where('assessment_respondents.participant_id', participantId)
      .select(
        'assessment_respondents.id',
        'users.id as user_id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'assessment_respondents.status'
      );

    res.json({
      success: true,
      data: {
        ...participant,
        existingRespondents
      }
    });
  } catch (error) {
    console.error('Ошибка получения информации об участнике:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить детали цикла оценки
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cycle = await db('assessment_cycles')
      .where('id', id)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Получить участников цикла
    const participants = await db('assessment_participants')
      .join('users', 'assessment_participants.user_id', '=', 'users.id')
      .where('assessment_participants.cycle_id', id)
      .select(
        'assessment_participants.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.role',
        'users.mattermost_username',
        'assessment_participants.status'
      );

    // Получить респондентов для каждого участника
    const respondents = await db('assessment_respondents')
      .join('users', 'assessment_respondents.respondent_user_id', '=', 'users.id')
      .join('assessment_participants', 'assessment_respondents.participant_id', '=', 'assessment_participants.id')
      .where('assessment_participants.cycle_id', id)
      .select(
        'assessment_respondents.id',
        'assessment_respondents.participant_id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.mattermost_username',
        'assessment_respondents.status'
      );

    // Группировать респондентов по участникам
    const participantsWithRespondents = participants.map(participant => ({
      ...participant,
      respondents: respondents.filter(r => r.participant_id === participant.id)
    }));

    res.json({
      ...cycle,
      participants: participantsWithRespondents
    });
  } catch (error) {
    console.error('Ошибка получения деталей цикла:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Создать новый цикл оценки
router.post('/', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { name, description, start_date, end_date } = req.body;

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const [newCycle] = await db('assessment_cycles')
      .insert({
        name,
        description,
        start_date,
        end_date,
        status: 'draft',
        created_by: user.userId
      })
      .returning('*');

    const cycle = newCycle;

    res.status(201).json(cycle);
  } catch (error) {
    console.error('Ошибка создания цикла оценки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Обновить цикл оценки
router.put('/:id', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { name, description, start_date, end_date } = req.body;

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await db('assessment_cycles')
      .where('id', id)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Проверить, что цикл не активен
    if (cycle.status === 'active') {
      res.status(400).json({ error: 'Нельзя редактировать активный цикл' });
      return;
    }

    await db('assessment_cycles')
      .where('id', id)
      .update({
        name: name, // Исправляем: сохраняем как name
        description,
        start_date,
        end_date,
        updated_at: db.raw('NOW()')
      });

    const updatedCycle = await db('assessment_cycles')
      .where('id', id)
      .first();

    res.json(updatedCycle);
  } catch (error) {
    console.error('Ошибка обновления цикла оценки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавить участников в цикл
router.post('/:id/participants', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { user_id } = req.body;
    const userIds = Array.isArray(user_id) ? user_id : [user_id];

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await db('assessment_cycles')
      .where('id', id)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Проверить, что цикл не активен
    if (cycle.status === 'active') {
      res.status(400).json({ error: 'Нельзя добавлять участников в активный цикл' });
      return;
    }

    // Проверить, что пользователи существуют
    const existingUsers = await db('users')
      .whereIn('id', userIds)
      .where('is_active', true);

    if (existingUsers.length !== userIds.length) {
      res.status(400).json({ error: 'Один или несколько пользователей не найдены' });
      return;
    }

    // Добавить участников
    const participantData = userIds.map((userId: string) => ({
      cycle_id: id,
      user_id: userId,
      status: 'invited'
    }));

    await db('assessment_participants')
      .insert(participantData)
      .onConflict(['cycle_id', 'user_id'])
      .merge();

    res.json({ message: 'Участники успешно добавлены' });
  } catch (error) {
    console.error('Ошибка добавления участников:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Добавить респондентов для участника
router.post('/:id/participants/:participantId/respondents', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { id, participantId } = req.params;
    const { respondentIds } = req.body;

    if (!user?.userId) {
      res.status(401).json({ error: 'Пользователь не авторизован' });
      return;
    }

    // Получить информацию об участнике для проверки прав
    const participant = await db('assessment_participants')
      .where('id', participantId)
      .where('cycle_id', id)
      .first();

    if (!participant) {
      res.status(404).json({ error: 'Участник не найден' });
      return;
    }

    // Проверить права доступа: только сам участник может добавлять респондентов для себя
    if (user.userId !== participant.user_id) {
      res.status(403).json({ error: 'Доступ запрещен. Вы можете добавлять респондентов только для своего участия в цикле.' });
      return;
    }

    const cycle = await db('assessment_cycles')
      .where('id', id)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Проверить, что цикл активен (участники могут выбирать респондентов только в активном цикле)
    if (cycle.status !== 'active') {
      res.status(400).json({ error: 'Респондентов можно добавлять только в активном цикле' });
      return;
    }

    // Получаем информацию об участнике, включая его руководителя
    const participantUser = await db('users')
      .where('id', participant.user_id)
      .first();

    // Создаем список респондентов, включая руководителя (если есть)
    const allRespondentIds = [...respondentIds];
    
    if (participantUser?.manager_id && !allRespondentIds.includes(participantUser.manager_id)) {
      // Проверяем, что руководитель активен
      const manager = await db('users')
        .where('id', participantUser.manager_id)
        .where('is_active', true)
        .first();
      
      if (manager) {
        allRespondentIds.push(participantUser.manager_id);
      }
    }

    // Проверить, что респонденты существуют
    const existingUsers = await db('users')
      .whereIn('id', allRespondentIds)
      .where('is_active', true);

    if (existingUsers.length !== allRespondentIds.length) {
      res.status(400).json({ error: 'Один или несколько респондентов не найдены' });
      return;
    }

    // Добавить респондентов (включая руководителя)
    const respondentData = allRespondentIds.map((respondentId: string) => {
      // Определяем тип респондента
      let respondentType = 'peer'; // по умолчанию коллега
      
      if (respondentId === participant.user_id) {
        respondentType = 'self';
      } else if (respondentId === participantUser?.manager_id) {
        respondentType = 'manager';
      }
      
      return {
        participant_id: participantId,
        respondent_user_id: respondentId, // исправляем поле на правильное
        respondent_type: respondentType,
        status: 'invited'
      };
    });

    await db('assessment_respondents')
      .insert(respondentData)
      .onConflict(['participant_id', 'respondent_user_id'])
      .merge();

    // Формируем сообщение с информацией о добавленных респондентах
    let message = 'Респонденты успешно добавлены';
    if (participantUser?.manager_id && allRespondentIds.includes(participantUser.manager_id)) {
      const manager = existingUsers.find(u => u.id === participantUser.manager_id);
      if (manager) {
        message += `. Руководитель ${manager.first_name} ${manager.last_name} добавлен автоматически`;
      }
    }
    
    res.json({ 
      message,
      totalRespondents: allRespondentIds.length,
      managerAdded: participantUser?.manager_id && allRespondentIds.includes(participantUser.manager_id)
    });
  } catch (error) {
    console.error('Ошибка добавления респондентов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Запустить цикл оценки
router.post('/:id/start', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { id } = req.params;

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await db('assessment_cycles')
      .where('id', id)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    if (cycle.status === 'active') {
      res.status(400).json({ error: 'Цикл уже активен' });
      return;
    }

    // Проверить, что есть участники
    const participantsCount = await db('assessment_participants')
      .where('cycle_id', id)
      .count('id as count')
      .first();

    if (!participantsCount || participantsCount.count === 0) {
      res.status(400).json({ error: 'Нет участников для запуска цикла' });
      return;
    }

    // Запустить цикл в транзакции
    await db.transaction(async (trx) => {
      // Запустить цикл
      await trx('assessment_cycles')
        .where('id', id)
        .update({
          status: 'active',
          start_date: trx.raw('NOW()')
        });

      // Обновить статус участников
      await trx('assessment_participants')
        .where('cycle_id', id)
        .update({ status: 'in_progress' });

      // Обновить статус респондентов
      await trx('assessment_respondents')
        .whereIn('participant_id', 
          trx('assessment_participants')
            .where('cycle_id', id)
            .select('id')
        )
        .update({ status: 'in_progress' });
    });

    // Отправить запросы на выбор респондентов участникам
    try {
      // Получить участников с Mattermost username
      const participants = await db('assessment_participants')
        .join('users', 'assessment_participants.user_id', 'users.id')
        .where('assessment_participants.cycle_id', id)
        .whereNotNull('users.mattermost_username')
        .select('users.mattermost_username', 'assessment_participants.id as participant_id');

      // Отправить запросы на выбор респондентов участникам
      for (const participant of participants) {
        mattermostService.requestRespondentSelection(
          participant.mattermost_username,
          cycle.name, // Используем name вместо title
          participant.participant_id.toString(),
          4 // Минимум 4 респондента
        ).catch(error => {
          console.error(`Ошибка отправки запроса участнику ${participant.mattermost_username}:`, error);
        });
      }

      // Получить респондентов с Mattermost username
      const respondents = await db('assessment_respondents')
        .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
        .join('users as respondent_users', 'assessment_respondents.respondent_user_id', 'respondent_users.id')
        .join('users as participant_users', 'assessment_participants.user_id', 'participant_users.id')
        .where('assessment_participants.cycle_id', id)
        .whereNotNull('respondent_users.mattermost_username')
        .select(
          'assessment_respondents.id as respondent_id',
          'respondent_users.mattermost_username as respondent_username',
          'participant_users.first_name as participant_first_name',
          'participant_users.last_name as participant_last_name'
        );

      // Отправить уведомления респондентам
      for (const respondent of respondents) {
        const participantName = `${respondent.participant_first_name} ${respondent.participant_last_name}`;
        mattermostService.notifyRespondentAssessment(
          respondent.respondent_username,
          participantName,
          cycle.name,
          respondent.respondent_id
        ).catch(error => {
          console.error(`Ошибка отправки уведомления респонденту ${respondent.respondent_username}:`, error);
        });
      }

      console.log(`Уведомления отправлены для цикла "${cycle.name}": ${participants.length} участников, ${respondents.length} респондентов`);
    } catch (error) {
      console.error('Ошибка отправки уведомлений Mattermost:', error);
      // Не останавливаем выполнение, так как цикл уже запущен
    }

    res.json({ message: 'Цикл оценки успешно запущен' });
  } catch (error) {
    console.error('Ошибка запуска цикла оценки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Удалить участника из цикла
router.delete('/:id/participants/:participantId', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { id, participantId } = req.params;

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr' && user?.role !== 'manager') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await db('assessment_cycles')
      .where('id', id)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Проверить, что цикл не активен
    if (cycle.status === 'active') {
      res.status(400).json({ error: 'Нельзя удалять участников из активного цикла' });
      return;
    }

    // Удалить респондентов участника
    await db('assessment_respondents')
      .where('participant_id', participantId)
      .del();

    // Удалить участника
    await db('assessment_participants')
      .where('id', participantId)
      .where('cycle_id', id)
      .del();

    res.json({ message: 'Участник успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления участника:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 