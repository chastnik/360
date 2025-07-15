import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import mattermostService from '../services/mattermost';

const router = Router();

/**
 * Проверка подключения к Mattermost
 */
router.get('/test-connection', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    // Проверить права доступа
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const isConnected = await mattermostService.testConnection();
    
    res.json({ 
      connected: isConnected,
      message: isConnected ? 'Подключение к Mattermost успешно' : 'Ошибка подключения к Mattermost'
    });
  } catch (error) {
    console.error('Ошибка проверки подключения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Синхронизация пользователей с Mattermost
 */
router.post('/sync-users', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    // Проверить права доступа
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить пользователей из Mattermost
    const mattermostUsers = await mattermostService.getTeamUsers();
    
    if (mattermostUsers.length === 0) {
      res.status(400).json({ error: 'Не удалось получить пользователей из Mattermost' });
      return;
    }

    let syncedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const mmUser of mattermostUsers) {
      try {
        // Найти пользователя в базе данных по email
        const existingUser = await knex('users')
          .where('email', mmUser.email.toLowerCase())
          .first();

        if (existingUser) {
          // Обновить mattermost_username
          await knex('users')
            .where('id', existingUser.id)
            .update({
              mattermost_username: mmUser.username,
              updated_at: knex.fn.now()
            });
          updatedCount++;
        } else {
          // Создать нового пользователя
          await knex('users').insert({
            email: mmUser.email.toLowerCase(),
            first_name: mmUser.first_name || '',
            last_name: mmUser.last_name || '',
            mattermost_username: mmUser.username,
            role: 'user',
            password_hash: '', // Пароль будет установлен при первом входе
            is_active: true
          });
          syncedCount++;
        }
      } catch (error) {
        console.error(`Ошибка синхронизации пользователя ${mmUser.email}:`, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: 'Синхронизация завершена',
      stats: {
        total: mattermostUsers.length,
        synced: syncedCount,
        updated: updatedCount,
        errors: errorCount
      }
    });
  } catch (error) {
    console.error('Ошибка синхронизации пользователей:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Отправка уведомлений о запуске цикла оценки
 */
router.post('/notify-cycle-start/:cycleId', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { cycleId } = req.params;
    
    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить информацию о цикле
    const cycle = await knex('assessment_cycles')
      .where('id', cycleId)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Получить всех участников цикла
    const participants = await knex('assessment_participants')
      .join('users', 'assessment_participants.user_id', 'users.id')
      .where('assessment_participants.cycle_id', cycleId)
      .where('users.mattermost_username', '!=', null)
      .select('users.mattermost_username', 'users.first_name', 'users.last_name');

    if (participants.length === 0) {
      res.status(400).json({ error: 'Нет участников с настроенным Mattermost' });
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    // Отправить уведомления всем участникам
    for (const participant of participants) {
      try {
        const success = await mattermostService.notifyAssessmentCycleStart(
          participant.mattermost_username,
          cycle.title
        );
        
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Ошибка уведомления участника ${participant.mattermost_username}:`, error);
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: 'Уведомления отправлены',
      stats: {
        total: participants.length,
        success: successCount,
        failed: failedCount
      }
    });
  } catch (error) {
    console.error('Ошибка отправки уведомлений:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Отправка уведомлений респондентам
 */
router.post('/notify-respondents/:cycleId', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { cycleId } = req.params;
    
    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить информацию о цикле
    const cycle = await knex('assessment_cycles')
      .where('id', cycleId)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Получить всех респондентов со статусом active
    const respondents = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('users as respondent_users', 'assessment_respondents.respondent_id', 'respondent_users.id')
      .join('users as participant_users', 'assessment_participants.user_id', 'participant_users.id')
      .where('assessment_participants.cycle_id', cycleId)
      .where('assessment_respondents.status', 'active')
      .where('respondent_users.mattermost_username', '!=', null)
      .select(
        'assessment_respondents.id as respondent_id',
        'respondent_users.mattermost_username as respondent_username',
        'participant_users.first_name as participant_first_name',
        'participant_users.last_name as participant_last_name'
      );

    if (respondents.length === 0) {
      res.status(400).json({ error: 'Нет активных респондентов с настроенным Mattermost' });
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    // Отправить уведомления всем респондентам
    for (const respondent of respondents) {
      try {
        const participantName = `${respondent.participant_first_name} ${respondent.participant_last_name}`;
        
        const success = await mattermostService.notifyRespondentAssessment(
          respondent.respondent_username,
          participantName,
          cycle.title,
          respondent.respondent_id
        );
        
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Ошибка уведомления респондента ${respondent.respondent_username}:`, error);
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: 'Уведомления респондентам отправлены',
      stats: {
        total: respondents.length,
        success: successCount,
        failed: failedCount
      }
    });
  } catch (error) {
    console.error('Ошибка отправки уведомлений респондентам:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Отправка напоминаний о незавершенных опросах
 */
router.post('/send-reminders/:cycleId', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { cycleId } = req.params;
    
    // Проверить права доступа
    if (user?.role !== 'admin' && user?.role !== 'hr') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить информацию о цикле
    const cycle = await knex('assessment_cycles')
      .where('id', cycleId)
      .first();

    if (!cycle) {
      res.status(404).json({ error: 'Цикл оценки не найден' });
      return;
    }

    // Получить респондентов с незавершенными опросами
    const pendingRespondents = await knex('assessment_respondents')
      .join('assessment_participants', 'assessment_respondents.participant_id', 'assessment_participants.id')
      .join('users as respondent_users', 'assessment_respondents.respondent_id', 'respondent_users.id')
      .join('users as participant_users', 'assessment_participants.user_id', 'participant_users.id')
      .where('assessment_participants.cycle_id', cycleId)
      .where('assessment_respondents.status', 'in_progress')
      .where('respondent_users.mattermost_username', '!=', null)
      .select(
        'assessment_respondents.id as respondent_id',
        'respondent_users.mattermost_username as respondent_username',
        'participant_users.first_name as participant_first_name',
        'participant_users.last_name as participant_last_name'
      );

    if (pendingRespondents.length === 0) {
      res.status(400).json({ error: 'Нет незавершенных опросов' });
      return;
    }

    let successCount = 0;
    let failedCount = 0;

    // Отправить напоминания
    for (const respondent of pendingRespondents) {
      try {
        const participantName = `${respondent.participant_first_name} ${respondent.participant_last_name}`;
        
        const success = await mattermostService.sendAssessmentReminder(
          respondent.respondent_username,
          participantName,
          cycle.title,
          respondent.respondent_id
        );
        
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Ошибка отправки напоминания ${respondent.respondent_username}:`, error);
        failedCount++;
      }
    }

    res.json({
      success: true,
      message: 'Напоминания отправлены',
      stats: {
        total: pendingRespondents.length,
        success: successCount,
        failed: failedCount
      }
    });
  } catch (error) {
    console.error('Ошибка отправки напоминаний:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Получить статистику интеграции с Mattermost
 */
router.get('/integration-stats', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    // Проверить права доступа
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить статистику пользователей
    const totalUsers = await knex('users').count('id as count').first();
    const usersWithMattermost = await knex('users')
      .whereNotNull('mattermost_username')
      .count('id as count')
      .first();

    // Проверить подключение к Mattermost
    const isConnected = await mattermostService.testConnection();

    res.json({
      connection: {
        status: isConnected ? 'connected' : 'disconnected',
        message: isConnected ? 'Подключение активно' : 'Нет подключения к Mattermost'
      },
      users: {
        total: Number(totalUsers?.count || 0),
        withMattermost: Number(usersWithMattermost?.count || 0),
        syncPercentage: Number(totalUsers?.count || 0) > 0 
          ? Math.round((Number(usersWithMattermost?.count || 0) / Number(totalUsers?.count || 0)) * 100)
          : 0
      }
    });
  } catch (error) {
    console.error('Ошибка получения статистики интеграции:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 