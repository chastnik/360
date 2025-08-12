// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.schema.createTable('system_settings', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('setting_key').unique().notNullable();
    table.text('setting_value');
    table.string('setting_type').defaultTo('string'); // string, number, boolean, json
    table.text('description');
    table.string('category').defaultTo('general'); // general, database, cache, integrations, security, notifications
    table.boolean('is_system').defaultTo(false); // системные настройки нельзя удалять
    table.boolean('is_sensitive').defaultTo(false); // чувствительные данные (пароли, токены)
    table.timestamps(true, true);
    
    table.index(['category']);
    table.index(['setting_key']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('system_settings');
}; 