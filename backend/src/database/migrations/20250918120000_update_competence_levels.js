/**
 * Миграция для изменения уровней компетенций с ['novice', 'beginner', 'competent', 'proficient', 'expert'] 
 * на ['junior', 'middle', 'senior'] для соответствия уровням курсов
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Сначала обновляем существующие данные
  await knex.raw(`
    UPDATE competence_matrix 
    SET level = CASE 
      WHEN level IN ('novice', 'beginner') THEN 'junior'
      WHEN level IN ('competent', 'proficient') THEN 'middle' 
      WHEN level = 'expert' THEN 'senior'
      ELSE 'junior'
    END
  `);
  
  // Изменяем enum тип
  await knex.raw(`
    ALTER TABLE competence_matrix 
    DROP CONSTRAINT competence_matrix_level_check
  `);
  
  await knex.raw(`
    ALTER TABLE competence_matrix 
    ADD CONSTRAINT competence_matrix_level_check 
    CHECK (level IN ('junior', 'middle', 'senior'))
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Возвращаем обратно старые уровни
  await knex.raw(`
    UPDATE competence_matrix 
    SET level = CASE 
      WHEN level = 'junior' THEN 'beginner'
      WHEN level = 'middle' THEN 'competent' 
      WHEN level = 'senior' THEN 'expert'
      ELSE 'beginner'
    END
  `);
  
  await knex.raw(`
    ALTER TABLE competence_matrix 
    DROP CONSTRAINT competence_matrix_level_check
  `);
  
  await knex.raw(`
    ALTER TABLE competence_matrix 
    ADD CONSTRAINT competence_matrix_level_check 
    CHECK (level IN ('novice', 'beginner', 'competent', 'proficient', 'expert'))
  `);
};

