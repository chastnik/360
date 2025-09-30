// © 2025 Бит.Цифра - Стас Чашин

// Автор: Стас Чашин @chastnik
exports.up = async function(knex) {
  // Добавляем колонку role_id
  await knex.schema.alterTable('users', function(table) {
    table.uuid('role_id').nullable().references('id').inTable('roles').onDelete('SET NULL');
  });

  // Создаем системные роли и маппинг из старого поля role -> role_id
  const [adminId] = await knex('roles').insert({ key: 'admin', name: 'Администратор', is_system: true }).returning('id');
  const [hrId] = await knex('roles').insert({ key: 'hr', name: 'HR', is_system: true }).returning('id');
  const [managerId] = await knex('roles').insert({ key: 'manager', name: 'Руководитель', is_system: true }).returning('id');
  const [userId] = await knex('roles').insert({ key: 'user', name: 'Пользователь', is_system: true }).returning('id');

  // Заполняем role_id на основе текущего users.role
  await knex('users').where('role', 'admin').update({ role_id: adminId.id || adminId });
  await knex('users').where('role', 'hr').update({ role_id: hrId.id || hrId });
  await knex('users').where('role', 'manager').update({ role_id: managerId.id || managerId });
  await knex('users').where('role', 'user').update({ role_id: userId.id || userId });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('users', function(table) {
    table.dropColumn('role_id');
  });
  await knex('roles').del();
};


