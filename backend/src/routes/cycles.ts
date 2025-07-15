import { Router, Response } from 'express';
import knex from '../database/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import mattermostService from '../services/mattermost';

const router = Router();

// Получить все циклы оценки
router.get('/', authenticateToken, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cycles = await knex('assessment_cycles')
      .select('id', 'title', 'description', 'status', 'start_date', 'end_date', 'created_at')
      .orderBy('created_at', 'desc');

    res.json(cycles);
  } catch (error) {
    console.error('Ошибка получения циклов оценки:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// Получить детали цикла оценки
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cycle = await knex('assessment_cycles')
      .where('id', id)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Получить участников цикла
    const participants = await knex('assessment_participants')
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
    const respondents = await knex('assessment_respondents')
      .join('users', 'assessment_respondents.respondent_id', '=', 'users.id')
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
    const { title, description, start_date, end_date } = req.body;

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const [cycleId] = await knex('assessment_cycles')
      .insert({
        title,
        description,
        start_date,
        end_date,
        status: 'draft',
        created_by: user.userId
      })
      .returning('id');

    const cycle = await knex('assessment_cycles')
      .where('id', cycleId)
      .first();

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
    const { title, description, start_date, end_date } = req.body;

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await knex('assessment_cycles')
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

    await knex('assessment_cycles')
      .where('id', id)
      .update({
        title,
        description,
        start_date,
        end_date,
        updated_at: knex.fn.now()
      });

    const updatedCycle = await knex('assessment_cycles')
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
    const { userIds } = req.body;

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await knex('assessment_cycles')
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
    const existingUsers = await knex('users')
      .whereIn('id', userIds)
      .where('is_active', true);

    if (existingUsers.length !== userIds.length) {
      res.status(400).json({ error: 'Один или несколько пользователей не найдены' });
      return;
    }

    // Добавить участников
    const participantData = userIds.map((userId: number) => ({
      cycle_id: id,
      user_id: userId,
      status: 'pending'
    }));

    await knex('assessment_participants')
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

    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await knex('assessment_cycles')
      .where('id', id)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    const participant = await knex('assessment_participants')
      .where('id', participantId)
      .where('cycle_id', id)
      .first();

    if (!participant) {
      res.status(404).json({ error: 'Участник не найден' });
      return;
    }

    // Проверить, что цикл не активен
    if (cycle.status === 'active') {
      res.status(400).json({ error: 'Нельзя добавлять респондентов в активный цикл' });
      return;
    }

    // Проверить, что респонденты существуют
    const existingUsers = await knex('users')
      .whereIn('id', respondentIds)
      .where('is_active', true);

    if (existingUsers.length !== respondentIds.length) {
      res.status(400).json({ error: 'Один или несколько респондентов не найдены' });
      return;
    }

    // Добавить респондентов
    const respondentData = respondentIds.map((respondentId: number) => ({
      participant_id: participantId,
      respondent_id: respondentId,
      status: 'pending'
    }));

    await knex('assessment_respondents')
      .insert(respondentData)
      .onConflict(['participant_id', 'respondent_id'])
      .merge();

    res.json({ message: 'Респонденты успешно добавлены' });
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
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await knex('assessment_cycles')
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
    const participantsCount = await knex('assessment_participants')
      .where('cycle_id', id)
      .count('id as count')
      .first();

    if (!participantsCount || participantsCount.count === 0) {
      res.status(400).json({ error: 'Нет участников для запуска цикла' });
      return;
    }

    // Запустить цикл
    await knex('assessment_cycles')
      .where('id', id)
      .update({
        status: 'active',
        start_date: knex.fn.now()
      });

    // Обновить статус участников
    await knex('assessment_participants')
      .where('cycle_id', id)
      .update({ status: 'active' });

    // Обновить статус респондентов
    await knex('assessment_respondents')
      .whereIn('participant_id', 
        knex('assessment_participants')
          .where('cycle_id', id)
          .select('id')
      )
      .update({ status: 'active' });

    // Отправить уведомления в Mattermost
    try {
      // Получить участников с Mattermost username
      const participants = await knex('assessment_participants')
        .join('users', 'assessment_participants.user_id', 'users.id')
        .where('assessment_participants.cycle_id', id)
        .whereNotNull('users.mattermost_username')
        .select('users.mattermost_username');

      // Отправить уведомления участникам
      for (const participant of participants) {
        mattermostService.notifyAssessmentCycleStart(
          participant.mattermost_username,
          cycle.title
        ).catch(error => {
          console.error(`Ошибка отправки уведомления участнику ${participant.mattermost_username}:`, error);
        });
      }

      // Получить респондентов с Mattermost username
      const respondents = await knex('assessment_respondents')
        .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
        .join('users as respondent_users', 'assessment_respondents.respondent_id', 'respondent_users.id')
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
          cycle.title,
          respondent.respondent_id
        ).catch(error => {
          console.error(`Ошибка отправки уведомления респонденту ${respondent.respondent_username}:`, error);
        });
      }

      console.log(`Уведомления отправлены для цикла "${cycle.title}": ${participants.length} участников, ${respondents.length} респондентов`);
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
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const cycle = await knex('assessment_cycles')
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
    await knex('assessment_respondents')
      .where('participant_id', participantId)
      .del();

    // Удалить участника
    await knex('assessment_participants')
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