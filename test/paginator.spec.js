/**
 * @package test
 */

var bootstrap = require('./../src/bootstrap');
var Models;
var Paginator;
var should = require('should');

describe('Paginator', function() {
  before(function(done) {
    this.timeout(10000);
    bootstrap.initialize()
      .then(function() {
        // Needs lazy load
        Models = require('bookshelf-model-loader');
        Paginator = require('../lib/paginator');
      })
      .then(function() {
        done();
      })
      .catch(function(err) {
        done(err);
      });
  });

  describe('paginate()', function() {
    it('able to limit results to an amount per call', function(done) {
      var paginator = new Paginator('Person');
      paginator.paginate({limit: 10})
        .then(function() {
          should(paginator.getTotal()).equal(80);
          should(paginator.getData().size()).equal(10);
          done();
        });
    });

    it('able to filter results using model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firtname', 'lastname']
      });

      paginator.paginate({limit: 10, gender: 'male'})
        .then(function() {
          should(paginator.getTotal()).equal(30);
          should(paginator.getData().size()).equal(10);
          done();
        });
    });

    it('able to sort results using model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firtname', 'lastname', 'id']
      });

      paginator.paginate({limit: 10, gender: 'female', sortBy: 'lastname'})
        .then(function() {
          should(paginator.getTotal()).equal(50);
          should(paginator.getData().size()).equal(10);
          should(paginator.getData().at(0).get('lastname')).lessThan(paginator.getData().at(9).get('lastname'));
          done();
        });
    });

    it('able to sort (invert) results using model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firtname', 'lastname', 'id']
      });

      paginator.paginate({limit: 10, gender: 'female', sortBy: '-lastname'})
        .then(function() {
          should(paginator.getTotal()).equal(50);
          should(paginator.getData().size()).equal(10);
          should(paginator.getData().at(0).get('lastname')).greaterThan(paginator.getData().at(9).get('lastname'));
          done();
        });
    });

    it('able to offset results', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firtname', 'lastname', 'id']
      });

      var filter0 = {limit: 10, gender: 'female', sortBy: '-lastname'};
      var filter10 = {limit: 10, offset: 10, gender: 'female', sortBy: '-lastname'};
      var offset0;
      var offset10;

      paginator.paginate(filter0)
        .then(function() {
          offset0 = paginator.getData().toJSON();
          return paginator.paginate(filter10);
        })
        .then(function() {
          offset10 = paginator.getData().toJSON();
          should(offset0).not.equal(offset10);
          done();
        });
    });
  });
});
