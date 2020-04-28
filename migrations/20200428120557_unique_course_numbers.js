
exports.up = function(knex) {
  return knex.schema.table('courses', (table) => {
    table.unique('course_number');
  })
};

exports.down = function(knex) {
  table.dropUnique('course_number');
};
