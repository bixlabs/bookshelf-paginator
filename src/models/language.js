/**
 * Model Language
 *
 * @package test/models
 */

var Models = require('bookshelf-model-loader');
var Language = Models.Bookshelf.Model.extend({
  tableName: 'language',

  toJSON: function() {
    return this.get('name');
  }
});

module.exports = {
  Language: Models.Bookshelf.model('Language', Language)
};
