exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Переименовываем старое поле department в old_department для сохранения данных
    table.renameColumn('department', 'old_department');
    
    // Добавляем новое поле department_id как внешний ключ
    table.uuid('department_id').references('id').inTable('departments').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Возвращаем обратно
    table.dropColumn('department_id');
    table.renameColumn('old_department', 'department');
  });
};