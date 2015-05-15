/**
 * @package test
 */

var bootstrap = require('./../src/bootstrap');
var Models;

describe('Paginator', function() {
  before(function(done) {
    this.timeout(10000);
    bootstrap.initialize()
      .then(function() {
        // Needs lazy load
        Models = require('bookshelf-model-loader');
      })
      .then(function() {
        done();
      });

  });

  describe('paginate()', function() {
    it('allow paginate results', function(done) {
      done();
    });
  });
});
