"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.string('mattermost_username').nullable();
        table.index('mattermost_username');
    });
}
async function down(knex) {
    await knex.schema.alterTable('users', (table) => {
        table.dropColumn('mattermost_username');
    });
}
//# sourceMappingURL=008_add_mattermost_username.js.map