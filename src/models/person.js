/**
 * Model Person
 *
 * @package test/models
 */

var Models = require('bookshelf-model-loader');

var Person = Models.Bookshelf.Model.extend({
  tableName: 'person',
  languages: function() {
    return this.belongsToMany('Language', 'person_speaks_language', 'person_id', 'language_id');
  }
});

module.exports = {
  Person: Models.Bookshelf.model('Person', Person)
};
