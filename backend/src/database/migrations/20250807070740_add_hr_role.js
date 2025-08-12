// Автор: Стас Чашин @chastnik
exports.up = function(knex) {
  return knex.raw(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_role_check;
    
    ALTER TABLE users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'hr', 'manager', 'user'));
  `);
};

exports.down = function(knex) {
  return knex.raw(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_role_check;
    
    ALTER TABLE users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'manager', 'user'));
  `);
};
