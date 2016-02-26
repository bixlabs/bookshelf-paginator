/**
 * @package test
 */

var bootstrap = require('./../src/bootstrap');
var Models;
var Paginator;
var should = require('should');
var _ = require('lodash');

describe('Paginator', function() {
  before(function(done) {
    bootstrap.initialize(process.env.DB_TYPE)
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
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to limit without pass nothing', function(done) {
      var paginator = new Paginator('Person');
      paginator.paginate()
        .then(function() {
          should(paginator.getTotal()).equal(80);
          should(paginator.getData().size()).equal(25);
          done();
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to filter results using model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname']
      });

      paginator.paginate({limit: 10, gender: 'male'})
        .then(function() {
          should(paginator.getTotal()).equal(30);
          should(paginator.getData().size()).equal(10);
          done();
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to sort results using model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id']
      });

      paginator.paginate({limit: 10, gender: 'female', sortBy: 'lastname'})
        .then(function() {
          should(paginator.getTotal()).equal(50);
          should(paginator.getData().size()).equal(10);
          should(paginator.getData().at(0).get('lastname')).lessThan(paginator.getData().at(9).get('lastname'));
          done();
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to sort (invert) results using model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id']
      });

      paginator.paginate({limit: 10, gender: 'female', sortBy: '-lastname'})
        .then(function() {
          should(paginator.getTotal()).equal(50);
          should(paginator.getData().size()).equal(10);
          should(paginator.getData().at(0).get('lastname')).greaterThan(paginator.getData().at(9).get('lastname'));
          done();
        })
        .catch(function(err) {
          done(err);
        });
    });

    it('able to offset results', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id']
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
        })
        .catch(function(err) {
          done(err);
        });
    });

    it('able to paginate results with related models', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id', 'languages.name']
      });

      paginator
        .paginate({limit: 10, gender: 'female', sortBy: '-lastname'}, {withRelated: 'languages'})
        .then(function() {
          should(paginator.getTotal()).equal(50, 'Wrong total counter');
          should(paginator.getData().size()).equal(10, 'Wrong pagination');
          done();
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to paginate results with related models without dulicate any records', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id', 'languages.name']
      });

      var counters = {};

      paginator
        .paginate({limit: 10, gender: 'female', sortBy: '-lastname'}, {withRelated: 'languages'})
        .then(function() {
          should(paginator.getTotal()).equal(50);
          should(paginator.getData().size()).equal(10);
          should(paginator.getData().at(0).getPrimaryLanguage()).not.equal(null);
          paginator.getData().toArray().forEach(function(person) {
            if (!counters[person.id]) {
              counters[person.id] = 0;
            }

            counters[person.id]++;
          });

          _.forIn(counters, function(value) {
            should(value).equal(1, 'Each Person can\'t be duplicated');
          });

          done();
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to sorting results with related model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id', 'languages.name']
      });

      paginator.paginate({limit: 10, sortBy: 'languages.name'}, {withRelated: 'languages'})
        .then(function() {
          should(paginator.getTotal()).equal(80);
          should(paginator.getData().size()).equal(10);
          paginator.getData().map(
            function(person) {
              should(person.getPrimaryLanguage()).equal(null);
            }

          );
          done();
        })
        .catch(function(err) {

          done(err);
        });
    });

    it('able to sorting (invert) results with related model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id', 'languages.name']
      });

      paginator
        .paginate({limit: 10, sortBy: '-languages.name'}, {withRelated: 'languages'})
        .then(function() {
          should(paginator.getData().size()).equal(10);
          paginator.getData().map(
            function(person) {
              should(person.getPrimaryLanguage()).equal('Spanish');
            }

          );

          done();
        })
        .catch(function(err) {

          done(err);
        });
    });

    it('able to filtering results with related model properties', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id', 'languages.name']
      });

      paginator
        .paginate({limit: 10, sortBy: '-languages.name', 'languages.name': 'English'}, {withRelated: 'languages'})
        .then(function() {
          should(paginator.getTotal()).equal(60);
          should(paginator.getData().size()).equal(10);
          paginator.getData().map(
            function(person) {
              should(person.getLanguages().toJSON()).containDeep(['English']);
            }

          );

          done();
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to filtering using different comparison operator', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id', 'languages.name'],
        comp: 'LIKE'
      });

      paginator
        .paginate({firstname: 'L%'})
        .then(function() {
          paginator.getData().map(
            function(person) {
              should(person.get('firstname')).match(/^L/);
            }

          );

          done();
        })
        .catch(function(err) {
          done(err);
        });
    });

    it('able to filtering using different comparison operator for different properites', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['gender', 'firstname', 'lastname', 'id', 'languages.name'],
        comp: {
          LIKE: ['gender', 'firstname', 'lastname', 'languages.name']
        }
      });

      paginator
        .paginate({firstname: 'L%', id: 25})
        .then(function() {
          paginator.getData().map(
            function(person) {
              should(person.get('firstname')).match(/^L/);
            }

          );

          done();
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to sorting results properly through the whole list', function(done) {
      var paginator = new Paginator('Person', {
        filterBy: ['lastname'],
        sortBy: 'lastname'
      });

      var paginated;
      var nonPaginated;

      paginator.paginate({offset: 0, limit: 20})
        .then(function() {
          paginated = paginator.getData().toJSON();
          return paginator.paginate({offset: 20, limit: 20});
        })
        .then(function() {
          paginated = paginated.concat(paginator.getData().toJSON());
          return paginator.paginate({offset: 40, limit: 20});
        })
        .then(function() {
          paginated = paginated.concat(paginator.getData().toJSON());
          return paginator.paginate({offset: 60, limit: 20});
        })
        .then(function() {
          paginated = paginated.concat(paginator.getData().toJSON());
          return paginator.paginate({limit: 80, offset: 0});
        })
        .then(function() {
          nonPaginated = paginator.getData().toJSON();
          should(paginated.length).equal(80, 'Paginate concat fail');
          should(nonPaginated.length).equal(80, 'Non paginated fail');
          should(paginated).eql(nonPaginated);
          done();
        })
        .catch(function(err) {
          done(err);

        });
    });

    it('able to paginate results filtering with related properties (belongsTo)', function(done) {
      var paginator = new Paginator('Domain', {
        filterBy: ['name', 'owner.firstname'],
        sortBy: 'name',
        comp: {
          like: ['name', 'owner.firstname']
        }
      });

      paginator.paginate({'owner.firstname': 'A%'})
        .then(function() {
          paginator.getData().map(function(domain) {
            should(domain.getOwner().get('firstname')).match(/^A/);
          });

          done();
        })
        .catch(function(err) {
          done(err);
        });
    });

    if (process.env.DB_TYPE === 'postgres') {
      it('able to paginate using raw filter', function(done) {
        var paginator = new Paginator('Person', {
          filterBy: ['lastname', 'address'],
          rawFilters: {
            address: 'person.profile ->> \'address\''
          },
          comp: {
            ILIKE: ['lastname', 'address']
          }
        });

        paginator
          .paginate({address: 'venus', limit: 100})
          .then(function() {
            var people = paginator.getData();
            should(people.length).equal(50, 'We should have 50 people from venus');

            paginator.getData().map(function(person) {
              should(person.get('profile').address).match(/^Venus/);
            });

            done();
          })
          .catch(function(err) {
            done(err);
          });
      });
    }
  });
});
