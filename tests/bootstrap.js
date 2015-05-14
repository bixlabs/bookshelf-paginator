/**
 * Created by julian on 14/05/15.
 */
var knex = require('knex'),
    bookshelf = require('bookshelf'),
    loader = require('bookshelf-model-loader'),
    path = require('path'),
    fs = require('fs'),
    dbFile = path.join(__dirname, 'data.db');

module.exports = function() {
    var datastore = bookshelf(knex({
        client: 'sqlite',
        debug: true,
        connection: {
            filename: dbFile
        }
    }));

    loader.init(datastore, {
        plugins: ['virtuals', 'visibility', 'registry'],
        excludes: [],
        path: __dirname + '/models'
    });

    fs.exists(dbFile, function(exist) {
        if (!exist) {
            datastore.knex.schema.createTable('language', function(table) {
                table.increments();
                table.string('name');
            });

            datastore.knex.schema.createTable('person', function(table) {
                table.increments();
                table.string('firstname');
                table.string('lastname');
            });

            datastore.knex.schema.createTable('person_speaks_language', function(table) {
                table.integer('person_id');
                table.string('language_id');
                table.primary('person_id', 'language_id');
            });
        }
    })
};



