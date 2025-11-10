// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('training_courses');
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('training_courses', 'competency_id');
    if (!hasColumn) {
      await knex.schema.table('training_courses', function(table) {
        table.uuid('competency_id').nullable().references('id').inTable('competencies').onDelete('SET NULL');
      });
    }
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('training_courses');
  if (hasTable) {
    const hasColumn = await knex.schema.hasColumn('training_courses', 'competency_id');
    if (hasColumn) {
      await knex.schema.table('training_courses', function(table) {
        table.dropColumn('competency_id');
      });
    }
  }
};






