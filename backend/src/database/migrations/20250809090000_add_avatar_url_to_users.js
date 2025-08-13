// Автор: Стас Чашин @chastnik

exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'avatar_url');
  if (!hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.string('avatar_url');
    });
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'avatar_url');
  if (hasColumn) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('avatar_url');
    });
  }
};


