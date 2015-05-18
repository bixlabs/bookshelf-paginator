/**
 * Pagination module
 * @module pagination
 * Created by julian on 14/05/15.
 */

var Models = require('bookshelf-model-loader');
var Promise = require('bluebird');
var _ = require('lodash');

var debug = require('debug');
var debugJoin = debug('pagination:join');
var debugWhere = debug('pagination:where');

/**
 * Allow pagina bookshelf models with ease
 *
 * @param model string
 * @param options object
 * @constructor
 */
function Paginator(model, options) {
  this.model = model;

  if (typeof Models[this.model] === 'undefined') {
    throw new Error('Model "' + this.model + '" not defined');
  }

  this.init(options);
}

/**
 * Initialize the pagitor
 * @private
 */
Paginator.prototype.init = function(options) {

  this.options = this.options || {
    headers: {
      total: 'X-Total',
      limit: 'X-Limit',
      offset: 'X-Offset'
    },
    queryStrings: {
      limit: 'limit',
      offset: 'offset'
    },
    limit: 25,
    offset: 0,
    filterBy: [],
    sortBy: 'id',
    comp: '='
  };

  _.extend(this.options, options || {});

  this.modelInstance = Models[this.model].forge();
  this.dataQuery = null;
  this.countQuery = null;
  this.total = 0;
  this.data = [];
  this.realTableNames = {};
  this.joins = {};
  this.order = {
    column: 'id',
    direction: 'ASC'
  };
};

/**
 * Build the count and data queries
 * @private
 */
Paginator.prototype.prepateQuery = function() {
  var fixedWhere = {};

  this.countQuery = Models.Bookshelf.knex(this.modelInstance.tableName);
  this.dataQuery = Models.Bookshelf.knex(this.modelInstance.tableName);

  this.buildJoins();

  _.keys(this.where).forEach(
    function(key) {
      fixedWhere[this.realTableNames[key] ? this.realTableNames[key] : key] = this.where[key];
    }.bind(this)
  );

  this.countQuery = this.attachJoins(this.countQuery);
  this.dataQuery = this.attachJoins(this.dataQuery);

  // Resolve the order
  var column = this.options.sortBy;
  var direction = this.order.direction = column.match(/^-/) ? 'DESC' : 'ASC';
  var comp = this.options.comp;

  column = column.charAt(0) === '-' ? column.slice(1) : column;
  this.order.column = column = this.realTableNames[column] ? this.realTableNames[column] : column;

  var whereComp = function(qb) {
    _.forIn(fixedWhere, function(value, key) {
      debugWhere('adding where (', key, comp, value, ')');
      qb.andWhere(key, comp, value);
    });
  };

  this.countQuery = this.countQuery
    .count(this.modelInstance.tableName + '.id as count');

  if (!_.isEmpty(fixedWhere)) {
    this.countQuery.where(whereComp);
    this.dataQuery.where(whereComp);
  }

  this.dataQuery.limit(this.getLimit());
  this.dataQuery.offset(this.getOffset());
  this.dataQuery.orderBy(column, direction);
};

/**
 * loop searching for joins
 * @private
 */
Paginator.prototype.buildJoins = function() {
  var joinCandidates;
  var join;
  var relation;

  this.options.filterBy.forEach(function(item) {
    if (item.indexOf('.') !== -1) {
      debugJoin('building (', item, ')');
      joinCandidates = item.split('.');

      if (joinCandidates.length > 2) {
        throw new Error('Paginator does not support nested relations like ' + item);
      }

      relation = joinCandidates.shift();

      if (typeof this.modelInstance[relation] !== 'function') {
        throw new Error('Does not exists the relation "' + relation + '" in ' + this.model);
      }

      join = this.buildJoin(this.modelInstance[relation]());
      this.realTableNames[item] = [join.tableName, joinCandidates.shift()].join('.');
      this.joins[item] = join.joinData;
    }
  }.bind(this));
};

/**
 * Attach all built joins to the query
 * @private
 * @param query
 * @returns {*}
 */
Paginator.prototype.attachJoins = function(query) {
  _.forIn(this.joins, function(joinData) {
    query = query
      .leftJoin(joinData.joinTable, joinData.id, joinData.foreignId)
      .leftJoin(joinData.targetTable, joinData.targetId, joinData.foreignTargeId);
  });

  return query;
};

/**
 * Build the join using the relations defined in the model
 * @private
 * @param relation
 *
 * @return {{tableName: *, joinData: ({joinTable: *, id: string, foreignId: string, targetTable: *, targetId: string, foreignTargeId: string}|*)}} real table name
 */
Paginator.prototype.buildJoin = function(relation) {

  var relatedData = relation.relatedData;
  var joinData;

  // FIXME: for check for other relations before continue
  //        move all logic inside the switch
  switch (relatedData.type) {
    case 'belongsToMany':
      break;
    default:
      throw new Error('Relation "' + relatedData.type + '" not supported in Paginator');
  }

  joinData = {
    joinTable: relatedData.joinTable(),
    id: [relatedData.parentTableName, 'id'].join('.'),
    foreignId: [relatedData.joinTable(), relatedData.foreignKey].join('.'),
    targetTable: relatedData.targetTableName,
    targetId: [relatedData.joinTable(), relatedData.otherKey].join('.'),
    foreignTargeId: [relatedData.targetTableName, 'id'].join('.')
  };

  return {
    tableName: joinData.targetTable,
    joinData: joinData
  };
};

/**
 * Returns the result for the filters passed
 * @param filter
 * @param options
 */
Paginator.prototype.paginate = function(filter, options) {
  this.where = _.pick(filter, this.options.filterBy);

  this.init(filter);
  this.prepateQuery();

  return Promise.props({
    total: this.countQuery,
    data: this.dataQuery
  })
    .then(function(result) {

      this.total = result.total[0].count;

      var ids = result.data.map(function(r) {
        return r.id;
      });

      return this.modelInstance.query(function(qb) {
        qb.whereIn(this.modelInstance.tableName + '.id', ids);
        this.attachJoins(qb);
        qb.orderBy(this.order.column, this.order.direction);
      }.bind(this)).fetchAll(options);
    }.bind(this))
    .then(function(results) {
      this.data = results;

      return this;
    }.bind(this));
};

/**
 * Set the correct headers for the response
 * @param res Response
 */
Paginator.prototype.setHeaders = function(res) {
  if (!res || typeof res.setHeader !== 'function') {
    throw new Error('Must pased a Response object');
  }

  res.setHeader(this.options.headers.total, this.getTotal());
  res.setHeader(this.options.headers.offset, this.getOffset());
  res.setHeader(this.options.headers.limit, this.getLimit());
};

/**
 * Return the result data
 * @returns {Array|*}
 */
Paginator.prototype.getData = function() {
  return this.data;
};

/**
 * Return the total items counted
 * @returns {*|Number}
 */
Paginator.prototype.getTotal = function() {
  return parseInt(this.total);
};

/**
 * Return the offset
 * @returns {*|Number}
 */
Paginator.prototype.getOffset = function() {
  return parseInt(this.options.offset);
};

/**
 * Return the limit
 * @returns {*|Number}
 */
Paginator.prototype.getLimit = function() {
  return parseInt(this.options.limit);
};

exports['default'] = Paginator;
module.exports = exports['default'];
