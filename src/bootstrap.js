/**
 * Initialize models using bookshelf-model-loader and create the schema
 * @package test
 */

var knex = require('knex');
var bookshelf = require('bookshelf');
var loader = require('bookshelf-model-loader');
var path = require('path');
var Promise = require('bluebird');
var fs = require('q-io/fs');
var dbFile = path.join(__dirname, '..', 'data', 'data.db');
var chance = require('chance').Chance(12345);
var exec = Promise.promisify(require('child_process').exec);
var datastore;
var configs = {
  sqlite: {
    client: 'sqlite',
    connection: {
      filename: dbFile
    }
  },
  postgres: {
    client: 'pg',
    connection: {
      user: 'postgres',
      host: 'localhost',
      database: 'bookshelf_pagination_test'
    }
  },
  mysql: {
    client: 'mysql',
    connection: {
      user: 'root',
      host: 'localhost',
      database: 'bookshelf_pagination_test'
    }
  }
};

function insert(cant, gender, profile) {
  return Promise.map(new Array(cant).join(0).split(0).map(Number.call, Number), function() {
    return datastore.knex('person').insert({
      firstname: chance.first(),
      lastname: chance.last(),
      gender: gender,
      profile: profile
    });
  });
}

function recreateDatabase(type) {
  var config = configs[type];
  var conn;

  switch (type) {

    case 'sqlite':
      return fs.exists(dbFile).then(function(exists) {
          if (exists) {
            return fs.remove(dbFile);
          } else {
            return Promise.resolve({});
          }
        });

    case 'postgres':
      conn = config.connection;
      return exec('echo "DROP DATABASE IF EXISTS ' + conn.database + '" | psql -U ' + conn.user + ' -h ' + conn.host)
        .then(function() {
          return exec('psql -c\'create database ' + conn.database + '\' -U ' + conn.user + ' -h ' + conn.host);
        });

    case 'mysql':
      conn = config.connection;
      return exec('echo "DROP DATABASE IF EXISTS ' + conn.database + '" | mysql -u ' + conn.user)
        .then(function() {
          return exec('mysqladmin -u ' + conn.user + ' create ' + conn.database);
        });
  }
}

/**
 * Initialize the database
 * @param type
 * @returns {*}
 */
function initilize(type) {

  type = type || 'sqlite';

  var config;

  // TODO: move this settings to external file
  switch (type) {
    case 'sqlite':
    case 'postgres':
    case 'mysql':
      config = configs[type];
      break;
    default:
      throw new Error('Database type:' + type + ' not supported');
  }

  config.debug = parseInt(process.env.DB_DEBUG || 0) === 1;

  return recreateDatabase(type)
    .then(function() {
      datastore = bookshelf(knex(config));
      loader.init(datastore, {
        plugins: ['virtuals', 'visibility', 'registry'],
        excludes: [],
        path: __dirname + '/models'
      });
    }).delay(500)
    .then(function() {
      return Promise.all([
        datastore.knex.schema.createTable('language',
          function(table) {
            table.increments();
            table.string('name');
          }

        ),
        datastore.knex.schema.createTable('person',
          function(table) {
            table.increments();
            table.string('firstname');
            table.string('lastname');
            table.string('gender');
            table.json('profile');
          }

        ),
        datastore.knex.schema.createTable('person_speaks_language',
          function(table) {
            table.integer('person_id');
            table.integer('language_id');
            table.primary(['person_id', 'language_id']);
          }

        )
      ]);
    })
    .then(function() {
      return datastore.knex.schema.createTable('domain',
        function(table) {
          table.increments();
          table.string('name');
          table.integer('person_id').unsigned().references('person.id');
        }

      );
    })
    .then(function() {
      return Promise.all([insert(50, 'female', {address: 'Venus'}), insert(30, 'male', {address: 'Mars'})]);
    })
    .then(function() {
      var languages = [
        {name: 'Spanish'},
        {name: 'English'}
      ];

      return Promise.map(languages, function(language) {
        return datastore.knex('language').insert(language);
      });
    })
    .then(function() {
      var domains = [];
      for (var i = 1; i <= 80; i++) {

        // jscs:disable
        domains.push({person_id: i, name: chance.domain()});
        // jscs:enable
      }

      return Promise.map(domains, function(domain) {
        return datastore.knex('domain').insert(domain);
      });
    })
    .then(function() {
      var personSpeaksLan = [];
      for (var i = 1; i <= 70; i++) {
        // Some users has two languages
        // jscs:disable
        personSpeaksLan.push({person_id: i, language_id: 1});
        // jscs:enable

        if (i > 10) {
          // jscs:disable
          personSpeaksLan.push({person_id: i, language_id: 2});
          // jscs:enable
        }
      }

      return Promise.map(personSpeaksLan, function(psl) {
        return datastore.knex('person_speaks_language').insert(psl);
      });
    });

}

module.exports = {
  initialize: initilize
};
