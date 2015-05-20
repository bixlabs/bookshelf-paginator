/**
 * Model Organization
 *
 * @package test/models
 */

var Models = require('bookshelf-model-loader');
var Domain = Models.Bookshelf.Model.extend({
  tableName: 'domain',

  owner: function() {
    return this.belongsTo('Person', 'person_id');
  },

  getOnwer: function() {
    return this.related('person');
  }
});

module.exports = {
  Domain: Models.Bookshelf.model('Domain', Domain)
};
