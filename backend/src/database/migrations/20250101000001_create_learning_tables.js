/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Таблица курсов
    .createTable('training_courses', function(table) {
      table.increments('id').primary();
      table.string('name', 200).notNullable().unique();
      table.text('description');
      table.integer('hours').unsigned().notNullable().comment('Объем курса в часах');
      table.boolean('is_active').defaultTo(true);
      table.enum('target_level', ['junior', 'middle', 'senior']).notNullable();
      table.integer('system_id').unsigned().references('id').inTable('systems').onDelete('SET NULL');
      table.timestamps(true, true);
    })
    
    // Таблица зависимостей курсов (prerequisites)
    .createTable('course_prerequisites', function(table) {
      table.increments('id').primary();
      table.integer('course_id').unsigned().notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
      table.integer('prerequisite_id').unsigned().notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
      table.timestamps(true, true);
      table.unique(['course_id', 'prerequisite_id']);
    })
    
    // Таблица параллельных курсов (corequisites)
    .createTable('course_corequisites', function(table) {
      table.increments('id').primary();
      table.integer('course_id').unsigned().notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
      table.integer('corequisite_id').unsigned().notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
      table.timestamps(true, true);
      table.unique(['course_id', 'corequisite_id']);
    })
    
    // Таблица планов индивидуального роста
    .createTable('growth_plans', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.date('start_date').notNullable();
      table.integer('study_load_percent').unsigned().notNullable().comment('Процент времени на учебу (0-100)');
      table.date('end_date').comment('Дата завершения обучения (рассчитывается)');
      table.enum('status', ['active', 'completed']).defaultTo('active');
      table.timestamps(true, true);
    })
    
    // Таблица связи планов роста с курсами
    .createTable('growth_plan_courses', function(table) {
      table.increments('id').primary();
      table.integer('growth_plan_id').unsigned().notNullable().references('id').inTable('growth_plans').onDelete('CASCADE');
      table.integer('course_id').unsigned().notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
      table.timestamps(true, true);
      table.unique(['growth_plan_id', 'course_id']);
    })
    
    // Таблица результатов тестирования
    .createTable('test_results', function(table) {
      table.increments('id').primary();
      table.integer('growth_plan_id').unsigned().notNullable().references('id').inTable('growth_plans').onDelete('CASCADE');
      table.integer('course_id').unsigned().notNullable().references('id').inTable('training_courses').onDelete('CASCADE');
      table.enum('status', ['passed', 'failed']).notNullable();
      table.date('test_date').notNullable();
      table.text('notes');
      table.timestamps(true, true);
      table.unique(['growth_plan_id', 'course_id']);
    })
    
    // Таблица матрицы компетенций
    .createTable('competence_matrix', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('competency_id').unsigned().notNullable().references('id').inTable('competencies').onDelete('CASCADE');
      table.enum('level', ['novice', 'beginner', 'competent', 'proficient', 'expert']).notNullable();
      table.integer('score').unsigned().comment('Балл от 0 до 100');
      table.date('assessment_date').notNullable();
      table.text('notes');
      table.timestamps(true, true);
      table.unique(['user_id', 'competency_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('competence_matrix')
    .dropTableIfExists('test_results')
    .dropTableIfExists('growth_plan_courses')
    .dropTableIfExists('growth_plans')
    .dropTableIfExists('course_corequisites')
    .dropTableIfExists('course_prerequisites')
    .dropTableIfExists('training_courses');
};
