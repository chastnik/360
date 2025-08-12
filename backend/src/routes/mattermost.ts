// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import mattermostService from '../services/mattermost';
import bcrypt from 'bcryptjs';

const router = Router();

/**
 * Генерация случайного пароля
 */
function generatePassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

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
      success: true,
      data: {
        connected: isConnected,
        message: isConnected ? 'Подключение к Mattermost успешно' : 'Ошибка подключения к Mattermost'
      }
    });
  } catch (error) {
    console.error('Ошибка проверки подключения:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Синхронизация пользователей с Mattermost (все пользователи)
 */
router.post('/sync-users', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    // Проверить права доступа
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить всех пользователей из Mattermost (не только членов команды)
    const mattermostUsers = await mattermostService.getAllUsers();
    
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
          // Обновить mattermost_username и mattermost_user_id
          await knex('users')
            .where('id', existingUser.id)
            .update({
              mattermost_username: (mmUser.username && mmUser.username.trim()) || null,
              mattermost_user_id: (mmUser.id && mmUser.id.trim()) || null,
              updated_at: knex.fn.now()
            });
          updatedCount++;
        } else {
          // Создать нового пользователя
          await knex('users').insert({
            email: mmUser.email.toLowerCase(),
            first_name: mmUser.first_name || '',
            last_name: mmUser.last_name || '',
            mattermost_username: (mmUser.username && mmUser.username.trim()) || null,
            mattermost_user_id: (mmUser.id && mmUser.id.trim()) || null,
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
 * Синхронизация только членов команды с Mattermost
 */
router.post('/sync-team-users', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    // Проверить права доступа
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить только членов команды из Mattermost
    const mattermostUsers = await mattermostService.getTeamUsers();
    
    if (mattermostUsers.length === 0) {
      res.status(400).json({ error: 'Не удалось получить пользователей команды из Mattermost' });
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
          // Обновить mattermost_username и mattermost_user_id
          await knex('users')
            .where('id', existingUser.id)
            .update({
              mattermost_username: (mmUser.username && mmUser.username.trim()) || null,
              mattermost_user_id: (mmUser.id && mmUser.id.trim()) || null,
              updated_at: knex.fn.now()
            });
          updatedCount++;
        } else {
          // Создать нового пользователя
          await knex('users').insert({
            email: mmUser.email.toLowerCase(),
            first_name: mmUser.first_name || '',
            last_name: mmUser.last_name || '',
            mattermost_username: (mmUser.username && mmUser.username.trim()) || null,
            mattermost_user_id: (mmUser.id && mmUser.id.trim()) || null,
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
      message: 'Синхронизация членов команды завершена',
      stats: {
        total: mattermostUsers.length,
        synced: syncedCount,
        updated: updatedCount,
        errors: errorCount
      }
    });
  } catch (error) {
    console.error('Ошибка синхронизации членов команды:', error);
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
          cycle.name
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
      .join('users as respondent_users', 'assessment_respondents.respondent_user_id', 'respondent_users.id')
      .join('users as participant_users', 'assessment_participants.user_id', 'participant_users.id')
      .where('assessment_participants.cycle_id', cycleId)
      .where('assessment_respondents.status', 'invited')
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
          cycle.name,
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
      .join('users as respondent_users', 'assessment_respondents.respondent_user_id', 'respondent_users.id')
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
          cycle.name,
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
      success: true,
      data: {
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
      }
    });
  } catch (error) {
    console.error('Ошибка получения статистики интеграции:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Поиск пользователей для выбора респондентов
 */
router.post('/search-respondents', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length < 2) {
      res.status(400).json({ error: 'Запрос должен содержать минимум 2 символа' });
      return;
    }

    const users = await mattermostService.searchUsers(query.trim());
    
    res.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        position: user.position
      }))
    });
  } catch (error) {
    console.error('Ошибка поиска респондентов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Подтверждение респондента
 */
router.post('/confirm-respondent/:participantId/:respondentId', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const participantId = req.params.participantId as string;
    const respondentId = req.params.respondentId as string;
    
    if (!participantId || !respondentId) {
      res.status(400).json({ error: 'Некорректные параметры participantId/respondentId' });
      return;
    }
    
    // Найти участника
    const participant = await knex('assessment_participants')
      .where('id', participantId)
      .first();
    
    if (!participant) {
      res.status(404).json({ error: 'Участник не найден' });
      return;
    }

    // Найти пользователя-респондента в нашей системе или создать
    let respondentUser = await knex('users')
      .where('mattermost_user_id', respondentId)
      .first();

    if (!respondentUser) {
      // Получить данные из Mattermost по ID
      const mmUser = await mattermostService.getUserById(respondentId);
      
      if (!mmUser) {
        res.status(404).json({ error: 'Респондент не найден в Mattermost' });
        return;
      }

      // Сгенерировать пароль для нового пользователя
      const tempPassword = generatePassword(12);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      // Создать пользователя в нашей системе
      const [newUser] = await knex('users').insert({
        email: mmUser.email.toLowerCase(),
        first_name: mmUser.first_name || '',
        last_name: mmUser.last_name || '',
        mattermost_username: mmUser.username,
        mattermost_user_id: mmUser.id,
        role: 'user',
        password_hash: passwordHash,
        is_active: true
      }).returning('*');
      
      respondentUser = newUser;

      // Отправить пароль в Mattermost
      await mattermostService.sendNotification({
        recipientUsername: mmUser.username,
        title: '🔑 Доступ к системе 360° оценки',
        message: `Для вас создан аккаунт в системе 360° оценки.\n\n**Данные для входа:**\nЛогин: ${mmUser.email}\nПароль: \`${tempPassword}\`\n\nРекомендуем сменить пароль после первого входа в систему.`,
        actionUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        actionText: 'Войти в систему'
      });
    }

    // Добавить респондента
    await knex('assessment_respondents').insert({
      participant_id: participantId,
      respondent_id: respondentUser.id,
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Респондент добавлен'
    });
  } catch (error) {
    console.error('Ошибка подтверждения респондента:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

/**
 * Тестирование создания прямых каналов
 */
router.post('/test-direct-channels', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    // Проверить права доступа
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    const { usernames } = req.body;
    
    if (!usernames || !Array.isArray(usernames)) {
      res.status(400).json({ error: 'Необходимо указать массив usernames' });
      return;
    }

    const results: { [key: string]: boolean } = {};

    for (const username of usernames) {
      results[username] = await mattermostService.testDirectChannelCreation(username);
    }

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Ошибка тестирования каналов:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 