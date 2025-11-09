// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'resume');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.text('resume').nullable();
    });
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'resume');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('resume');
    });
  }
};

