// Автор: Стас Чашин @chastnik

exports.up = async function(knex) {
  const hasData = await knex.schema.hasColumn('users', 'avatar_data');
  if (!hasData) {
    await knex.schema.alterTable('users', (table) => {
      table.binary('avatar_data');
      table.string('avatar_mime');
      table.timestamp('avatar_updated_at');
    });
  }
};

exports.down = async function(knex) {
  const hasData = await knex.schema.hasColumn('users', 'avatar_data');
  if (hasData) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('avatar_data');
      table.dropColumn('avatar_mime');
      table.dropColumn('avatar_updated_at');
    });
  }
};


