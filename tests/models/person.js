/**
 * Created by julian on 14/05/15.
 */

var Models = require('bookshelf-model-loader');


var Person  = Models.Base.extend({
    tableName: 'person',
    languages: function () {
        return this.belongsToMany('Language', 'person_speaks_language', 'person_id', 'language_id');
    },
    getLanguages: function() {
        return this.related('languages');
    }
});

module.exports = {
    Person: Models.Bookshelf.model('Person', Person)
}