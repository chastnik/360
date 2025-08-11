exports.up = async function(knex) {
  // roles
  await knex.schema.createTable('roles', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('key').notNullable().unique();
    table.string('name').notNullable();
    table.text('description');
    table.boolean('is_system').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });

  // role_permissions
  await knex.schema.createTable('role_permissions', function(table) {
    table.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.string('permission').notNullable();
    table.primary(['role_id', 'permission']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('role_permissions');
  await knex.schema.dropTableIfExists('roles');
};


