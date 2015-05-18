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
  },

  getLanguages: function() {
    return this.related('languages');
  },

  getPrimaryLanguage: function() {
    if (this.getLanguages().size()) {
      return this.getLanguages().at(0).get('name');
    } else {
      return null;
    }
  },

  toJSON: function() {
    return {
      fullname: [this.get('firstname'), ' ', this.get('lastname')].join(' ').trim(),
      firstname: this.get('firstname'),
      lastname: this.get('lastname'),
      primaryLanguage: this.getPrimaryLanguage()
    };
  }
});

module.exports = {
  Person: Models.Bookshelf.model('Person', Person)
};
