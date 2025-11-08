// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
/* eslint-disable no-console */
import { Router } from 'express';
import knex from '../database/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import mattermostService from '../services/mattermost';
import bcrypt from 'bcryptjs';

const router = Router();
// Публичная конфигурация (URL Mattermost и team name) — доступна авторизованным пользователям
router.get('/public-config', authenticateToken, async (_req: any, res): Promise<void> => {
  try {
    let teamName = process.env.MATTERMOST_TEAM_NAME || 'Бит.Цифра';
    
    // Пытаемся получить team name из API Mattermost
    if (process.env.MATTERMOST_TEAM_ID) {
      try {
        const teamInfo = await mattermostService.getTeamInfo(process.env.MATTERMOST_TEAM_ID);
        if (teamInfo && teamInfo.name) {
          teamName = teamInfo.name;
        }
      } catch (error) {
        console.log('Не удалось получить team name из API Mattermost, используем значение по умолчанию');
      }
    }
    
    res.json({ 
      success: true, 
      data: { 
        url: process.env.MATTERMOST_URL || null,
        teamName: teamName
      } 
    });
  } catch (error) {
    res.json({ success: true, data: { url: null, teamName: 'Бит.Цифра' } });
  }
});


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

    const mattermostUsers = await mattermostService.searchUsers(query.trim());
    
    // Для каждого пользователя из Mattermost найти или создать пользователя в нашей базе
    const resultUsers = await Promise.all(
      mattermostUsers.map(async (mmUser) => {
        // Ищем пользователя в нашей базе по email или Mattermost ID
        let dbUser = await knex('users')
          .where('email', mmUser.email.toLowerCase())
          .orWhere('mattermost_user_id', mmUser.id)
          .first();

        // Если пользователь не найден, создаем его
        if (!dbUser) {
          // Проверяем, есть ли уже пользователь с таким email
          const existingUser = await knex('users')
            .where('email', mmUser.email.toLowerCase())
            .first();

          if (!existingUser) {
            // Создаем нового пользователя с временным паролем
            const tempPassword = generatePassword(12);
            const passwordHash = await bcrypt.hash(tempPassword, 10);
            
            const [newUser] = await knex('users')
              .insert({
                email: mmUser.email.toLowerCase(),
                first_name: mmUser.first_name || '',
                last_name: mmUser.last_name || '',
                mattermost_username: mmUser.username || null,
                mattermost_user_id: mmUser.id || null,
                role: 'user',
                is_active: true,
                password_hash: passwordHash
              })
              .returning('*');
            
            dbUser = newUser;
            
            // Отправляем уведомление в Mattermost с временным паролем
            if (mmUser.username) {
              try {
                await mattermostService.sendNotification({
                  recipientUsername: mmUser.username,
                  title: '🔑 Доступ к системе 360° оценки',
                  message: `Для вас создан аккаунт в системе 360° оценки.\n\n**Данные для входа:**\nЛогин: ${mmUser.email}\nПароль: \`${tempPassword}\`\n\nРекомендуем сменить пароль после первого входа в систему.`,
                  actionUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                  actionText: 'Войти в систему'
                });
              } catch (error) {
                console.error(`Ошибка отправки уведомления пользователю ${mmUser.username}:`, error);
              }
            }
          } else {
            // Обновляем существующего пользователя с Mattermost данными
            await knex('users')
              .where('id', existingUser.id)
              .update({
                mattermost_username: mmUser.username || existingUser.mattermost_username,
                mattermost_user_id: mmUser.id || existingUser.mattermost_user_id,
                first_name: mmUser.first_name || existingUser.first_name,
                last_name: mmUser.last_name || existingUser.last_name
              });
            
            dbUser = await knex('users')
              .where('id', existingUser.id)
              .first();
          }
        } else {
          // Обновляем Mattermost данные существующего пользователя
          await knex('users')
            .where('id', dbUser.id)
            .update({
              mattermost_username: mmUser.username || dbUser.mattermost_username,
              mattermost_user_id: mmUser.id || dbUser.mattermost_user_id,
              first_name: mmUser.first_name || dbUser.first_name,
              last_name: mmUser.last_name || dbUser.last_name
            });
          
          dbUser = await knex('users')
            .where('id', dbUser.id)
            .first();
        }

        // Возвращаем пользователя с UUID из нашей базы
        return {
          id: dbUser.id, // UUID из нашей базы
          username: mmUser.username,
          email: mmUser.email,
          first_name: dbUser.first_name || mmUser.first_name,
          last_name: dbUser.last_name || mmUser.last_name,
          position: mmUser.position || dbUser.position || null
        };
      })
    );

    // Удаляем дубликаты по ID
    const uniqueUsers = resultUsers.filter((user, index, self) => 
      index === self.findIndex(u => u.id === user.id)
    );
    
    res.json({
      success: true,
      data: uniqueUsers
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

/**
 * Массовая загрузка аватаров всех пользователей из Mattermost
 */
router.post('/sync-avatars', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    
    // Проверить права доступа
    if (user?.role !== 'admin') {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить всех пользователей с настроенным Mattermost
    const users = await knex('users')
      .whereNotNull('mattermost_user_id')
      .select('id', 'email', 'mattermost_user_id', 'first_name', 'last_name');

    if (users.length === 0) {
      res.status(400).json({ error: 'Нет пользователей с настроенным Mattermost' });
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Загрузить аватары для каждого пользователя
    for (const dbUser of users) {
      try {
        // Получить изображение профиля из Mattermost
        const profileImage = await mattermostService.getUserProfileImage(dbUser.mattermost_user_id);

        if (!profileImage) {
          skippedCount++;
          console.log(`⚠️  Пропущен пользователь ${dbUser.email} - аватар не найден в Mattermost`);
          continue;
        }

        // Проверить, что данные получены
        if (!profileImage.data || profileImage.data.length === 0) {
          skippedCount++;
          console.log(`⚠️  Пропущен пользователь ${dbUser.email} - получены пустые данные`);
          continue;
        }

        // Сохранить в базу данных
        // Убеждаемся, что данные в формате Buffer
        const bufferData = Buffer.isBuffer(profileImage.data) 
          ? profileImage.data 
          : Buffer.from(profileImage.data);
        
        await knex('users')
          .where('id', dbUser.id)
          .update({
            avatar_data: bufferData,
            avatar_mime: profileImage.contentType,
            avatar_updated_at: knex.fn.now()
          });

        // Проверить, что данные действительно сохранились
        const savedUser = await knex('users')
          .where('id', dbUser.id)
          .select('avatar_data', 'avatar_mime', 'avatar_updated_at')
          .first();

        // Проверяем, что данные сохранились
        // В PostgreSQL binary данные могут возвращаться как Buffer или как строка
        const avatarData = savedUser?.avatar_data;
        const hasData = avatarData && (
          (Buffer.isBuffer(avatarData) && avatarData.length > 0) ||
          (typeof avatarData === 'string' && avatarData.length > 0) ||
          (avatarData instanceof Uint8Array && avatarData.length > 0)
        );

        if (hasData) {
          const dataSize = Buffer.isBuffer(avatarData) 
            ? avatarData.length 
            : (typeof avatarData === 'string' ? Buffer.byteLength(avatarData) : avatarData.length);
          successCount++;
          console.log(`✅ Аватар загружен для пользователя ${dbUser.email} (размер: ${dataSize} байт, тип: ${savedUser.avatar_mime})`);
        } else {
          failedCount++;
          console.error(`❌ Ошибка: данные не сохранились для пользователя ${dbUser.email}. Тип данных: ${typeof avatarData}, значение: ${avatarData ? 'есть' : 'null'}`);
        }
      } catch (error: any) {
        failedCount++;
        console.error(`❌ Ошибка загрузки аватара для пользователя ${dbUser.email}:`, error?.message || error);
      }
    }

    res.json({
      success: true,
      message: 'Загрузка аватаров завершена',
      stats: {
        total: users.length,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount
      }
    });
  } catch (error: any) {
    console.error('Ошибка массовой загрузки аватаров:', error?.message || error);
    res.status(500).json({ 
      success: false,
      error: 'Внутренняя ошибка сервера',
      message: error?.message || 'Неизвестная ошибка'
    });
  }
});

/**
 * Синхронизация аватара конкретного пользователя из Mattermost
 */
router.post('/sync-avatar/:userId', authenticateToken, async (req: AuthRequest, res): Promise<void> => {
  try {
    const user = req.user;
    const { userId } = req.params;
    
    // Проверить права доступа (только для себя или админ)
    if (user?.role !== 'admin' && user?.userId !== userId) {
      res.status(403).json({ error: 'Недостаточно прав доступа' });
      return;
    }

    // Получить пользователя из базы
    const dbUser = await knex('users')
      .where('id', userId)
      .first();

    if (!dbUser) {
      res.status(404).json({ error: 'Пользователь не найден' });
      return;
    }

    // Проверить наличие mattermost_user_id
    if (!dbUser.mattermost_user_id) {
      res.status(400).json({ error: 'У пользователя не настроен Mattermost' });
      return;
    }

    // Получить изображение профиля из Mattermost
    const profileImage = await mattermostService.getUserProfileImage(dbUser.mattermost_user_id);

    if (!profileImage) {
      res.status(404).json({ error: 'Не удалось получить изображение профиля из Mattermost. Возможно, у пользователя нет аватара в Mattermost.' });
      return;
    }

    // Сохранить в базу данных
    await knex('users')
      .where('id', userId)
      .update({
        avatar_data: profileImage.data,
        avatar_mime: profileImage.contentType,
        avatar_updated_at: knex.fn.now()
      });

    res.json({
      success: true,
      message: 'Аватар успешно синхронизирован из Mattermost'
    });
  } catch (error) {
    console.error('Ошибка синхронизации аватара:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

export default router; 