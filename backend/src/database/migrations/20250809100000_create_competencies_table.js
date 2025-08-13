// Автор: Стас Чашин @chastnik

exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('competencies');
  if (!exists) {
    await knex.schema.createTable('competencies', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.text('description');
      table.boolean('is_active').notNullable().defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = async function(knex) {
  const exists = await knex.schema.hasTable('competencies');
  if (exists) {
    await knex.schema.dropTable('competencies');
  }
};


