/**
 * Pagination module
 * @module pagination
 * Created by julian on 14/05/15.
 */

var Models = require('bookshelf-model-loader');
var Promise = require('bluebird');
var _ = require('lodash');

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
};

/**
 * Build the count and data queries
 * @param where object
 */
Paginator.prototype.prepateQuery = function(where) {

  this.countQuery = Models.Bookshelf.knex(this.modelInstance.tableName);
  this.dataQuery = this.modelInstance.query({});

  this.buildJoins();

  var fixedWhere = {};

  _.keys(where).forEach(
    function(key) {
      fixedWhere[this.realTableNames[key] ? this.realTableNames[key] : key] = where[key];
    }.bind(this)
  );

  var column = this.options.sortBy;
  var direction = column.match(/^-/) ? 'DESC' : 'ASC';
  var comp = this.options.comp;

  column = column.charAt(0) === '-' ? column.slice(1) : column;
  column = this.realTableNames[column] ? this.realTableNames[column] : column;

  var whereComp = function(qb) {
    _.forIn(fixedWhere, function(value, key) {
      qb.andWhere(key, comp, value);
    });
  };

  this.countQuery = this.countQuery
    .count(this.modelInstance.tableName + '.id as count');

  if (!_.isEmpty(fixedWhere)) {
    this.countQuery.where(whereComp);
  }

  this.dataQuery = this.dataQuery.query(function(qb) {
    if (!_.isEmpty(fixedWhere)) {
      qb.where(whereComp);
    }

    qb.limit(this.getLimit());
    qb.offset(this.getOffset());
    qb.orderBy(column, direction);
    return qb;
  }.bind(this));
};

/**
 * loop searching for joins
 */
Paginator.prototype.buildJoins = function() {
  var joinCandidates;
  var tableName;

  this.options.filterBy.forEach(function(item) {
    if (item.indexOf('.') !== -1) {
      joinCandidates = item.split('.');

      if (joinCandidates.length > 2) {
        throw new Error('Paginator does not support nested relations like ' + item);
      }

      var relation = joinCandidates.shift();

      if (typeof this.modelInstance[relation] !== 'function') {
        throw new Error('Does not exists the relation "' + relation + '" in ' + this.model);
      }

      tableName = this.buildJoin(this.modelInstance[relation]());
      this.realTableNames[item] = [tableName, joinCandidates.shift()].join('.');
    }
  }.bind(this));
};

/**
 * Build the join using the relations defined in the model
 * @param relation
 *
 * @return {string} real table name
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

  this.countQuery
    .leftJoin(joinData.joinTable, joinData.id, joinData.foreignId)
    .leftJoin(joinData.targetTable, joinData.targetId, joinData.foreignTargeId);

  this.dataQuery.query()
    .leftJoin(joinData.joinTable, joinData.id, joinData.foreignId)
    .leftJoin(joinData.targetTable, joinData.targetId, joinData.foreignTargeId);

  return joinData.targetTable;
};

/**
 * Returns the result for the filters passed
 * @param filter
 * @param options
 */
Paginator.prototype.paginate = function(filter, options) {
  var where = _.pick(filter, this.options.filterBy);

  this.init(filter);
  this.prepateQuery(where);

  return Promise.props({
    total: this.countQuery,
    data: this.dataQuery.fetchAll(options)
  }).then(function(result) {

    this.total = result.total[0].count;
    this.data = result.data;

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
