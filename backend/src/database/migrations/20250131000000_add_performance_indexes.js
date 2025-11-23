// © 2025 Бит.Цифра - Стас Чашин

/**
 * Миграция для добавления индексов для оптимизации производительности запросов
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Индексы для таблицы users
  try {
    await knex.schema.alterTable('users', function(table) {
      // Индекс для role_id (часто используется в JOIN и WHERE)
      table.index('role_id', 'idx_users_role_id');
      // Индекс для department_id (часто используется в JOIN и WHERE)
      table.index('department_id', 'idx_users_department_id');
      // Индекс для is_active (часто используется в WHERE)
      table.index('is_active', 'idx_users_is_active');
      // Составной индекс для частых запросов
      table.index(['is_active', 'role_id'], 'idx_users_active_role');
    });
  } catch (error) {
    console.warn('Ошибка при создании индексов для users:', error.message);
  }

  // Индексы для таблицы assessment_responses
  try {
    await knex.schema.alterTable('assessment_responses', function(table) {
      // Индекс для respondent_id (часто используется в JOIN)
      table.index('respondent_id', 'idx_responses_respondent_id');
      // Индекс для question_id (часто используется в JOIN)
      table.index('question_id', 'idx_responses_question_id');
      // Составной индекс для частых запросов
      table.index(['respondent_id', 'question_id'], 'idx_responses_respondent_question');
    });
  } catch (error) {
    console.warn('Ошибка при создании индексов для assessment_responses:', error.message);
  }

  // Индексы для таблицы assessment_participants
  try {
    await knex.schema.alterTable('assessment_participants', function(table) {
      // Индекс для cycle_id (часто используется в WHERE и GROUP BY)
      table.index('cycle_id', 'idx_participants_cycle_id');
      // Индекс для user_id (часто используется в WHERE)
      table.index('user_id', 'idx_participants_user_id');
      // Составной индекс для частых запросов
      table.index(['cycle_id', 'user_id'], 'idx_participants_cycle_user');
    });
  } catch (error) {
    console.warn('Ошибка при создании индексов для assessment_participants:', error.message);
  }

  // Индексы для таблицы assessment_respondents
  try {
    await knex.schema.alterTable('assessment_respondents', function(table) {
      // Индекс для participant_id (часто используется в JOIN)
      table.index('participant_id', 'idx_respondents_participant_id');
      // Индекс для respondent_user_id (часто используется в JOIN)
      table.index('respondent_user_id', 'idx_respondents_user_id');
    });
  } catch (error) {
    console.warn('Ошибка при создании индексов для assessment_respondents:', error.message);
  }

  // Индексы для таблицы role_permissions
  try {
    await knex.schema.alterTable('role_permissions', function(table) {
      // Индекс для role_id (часто используется в WHERE)
      table.index('role_id', 'idx_role_permissions_role_id');
    });
  } catch (error) {
    console.warn('Ошибка при создании индексов для role_permissions:', error.message);
  }

  // Индексы для таблицы departments
  try {
    await knex.schema.alterTable('departments', function(table) {
      // Индекс для is_active (часто используется в WHERE)
      table.index('is_active', 'idx_departments_is_active');
      // Индекс для head_id (часто используется в JOIN)
      table.index('head_id', 'idx_departments_head_id');
    });
  } catch (error) {
    console.warn('Ошибка при создании индексов для departments:', error.message);
  }

  // Индексы для таблицы questions
  try {
    await knex.schema.alterTable('questions', function(table) {
      // Индекс для category_id (часто используется в WHERE и JOIN)
      table.index('category_id', 'idx_questions_category_id');
      // Индекс для is_active (часто используется в WHERE)
      table.index('is_active', 'idx_questions_is_active');
    });
  } catch (error) {
    console.warn('Ошибка при создании индексов для questions:', error.message);
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Удаляем индексы в обратном порядке
  try {
    await knex.schema.alterTable('questions', function(table) {
      table.dropIndex('is_active', 'idx_questions_is_active');
      table.dropIndex('category_id', 'idx_questions_category_id');
    });
  } catch (error) {
    console.warn('Ошибка при удалении индексов для questions:', error.message);
  }

  try {
    await knex.schema.alterTable('departments', function(table) {
      table.dropIndex('head_id', 'idx_departments_head_id');
      table.dropIndex('is_active', 'idx_departments_is_active');
    });
  } catch (error) {
    console.warn('Ошибка при удалении индексов для departments:', error.message);
  }

  try {
    await knex.schema.alterTable('role_permissions', function(table) {
      table.dropIndex('role_id', 'idx_role_permissions_role_id');
    });
  } catch (error) {
    console.warn('Ошибка при удалении индексов для role_permissions:', error.message);
  }

  try {
    await knex.schema.alterTable('assessment_respondents', function(table) {
      table.dropIndex('respondent_user_id', 'idx_respondents_user_id');
      table.dropIndex('participant_id', 'idx_respondents_participant_id');
    });
  } catch (error) {
    console.warn('Ошибка при удалении индексов для assessment_respondents:', error.message);
  }

  try {
    await knex.schema.alterTable('assessment_participants', function(table) {
      table.dropIndex(['cycle_id', 'user_id'], 'idx_participants_cycle_user');
      table.dropIndex('user_id', 'idx_participants_user_id');
      table.dropIndex('cycle_id', 'idx_participants_cycle_id');
    });
  } catch (error) {
    console.warn('Ошибка при удалении индексов для assessment_participants:', error.message);
  }

  try {
    await knex.schema.alterTable('assessment_responses', function(table) {
      table.dropIndex(['respondent_id', 'question_id'], 'idx_responses_respondent_question');
      table.dropIndex('question_id', 'idx_responses_question_id');
      table.dropIndex('respondent_id', 'idx_responses_respondent_id');
    });
  } catch (error) {
    console.warn('Ошибка при удалении индексов для assessment_responses:', error.message);
  }

  try {
    await knex.schema.alterTable('users', function(table) {
      table.dropIndex(['is_active', 'role_id'], 'idx_users_active_role');
      table.dropIndex('is_active', 'idx_users_is_active');
      table.dropIndex('department_id', 'idx_users_department_id');
      table.dropIndex('role_id', 'idx_users_role_id');
    });
  } catch (error) {
    console.warn('Ошибка при удалении индексов для users:', error.message);
  }
};

