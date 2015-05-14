/**
 * Created by julian on 14/05/15.
 */

var Models = require('bookshelf-model-loader');


var Language  = Models.Base.extend({
    tableName: 'language'
});

module.exports = {
    Language: Models.Bookshelf.model('Language', Language)
};