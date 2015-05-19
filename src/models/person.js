/**
 * Model Person
 *
 * @package test/models
 */

var Models = require('bookshelf-model-loader');
var _ = require('lodash');

var Person = Models.Bookshelf.Model.extend({
  tableName: 'person',
  languages: function() {
    return this.belongsToMany('Language', 'person_speaks_language', 'person_id', 'language_id');
  },

  getLanguages: function() {
    return this.related('languages');
  },

  getPlainLanguages: function() {
    return this.getLanguages().map(function(i) { return i.get('name'); }).sort();
  },

  getPrimaryLanguage: function() {
    if (this.getLanguages().size()) {
      return this.getPlainLanguages()[0];
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
