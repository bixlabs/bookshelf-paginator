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

  getOwner: function() {
    return this.related('owner');
  }
});

module.exports = {
  Domain: Models.Bookshelf.model('Domain', Domain)
};
