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
      comp: '=',
      rawFilters: {}
    };

  _.extend(this.options, options || {});

  this.modelInstance = Models[this.model].forge();
  this.countQuery = null;
  this.total = 0;
  this.data = [];
  this.realTableNames = {};
  this.joins = {};
  this.order = {
    column: 'id',
    direction: 'ASC'
  };
  this.groups = [];
  this.comps = {};
  this.selectQuery = null;
  this.selectQueryOrder = null;
};

/**
 * Resolve the column to use for order the query
 * @private
 *
 * @return {void}
 */
Paginator.prototype.prepareQueryResolveOrder = function() {
  var column = this.options.sortBy;
  this.order.direction = column.match(/^-/) ? 'DESC' : 'ASC';

  // Resolve the column to order
  this.selectQueryOrder = column = column.charAt(0) === '-' ? column.slice(1) : column;
  this.order.column = column = this.realTableNames[column] ? this.realTableNames[column] : column;
};

/**
 * Build the where function for the query
 * @private
 *
 * @return {Function} Where function
 */
Paginator.prototype.prepareQueryWhere = function(fixedWhere) {
  return function(qb) {
    _.forIn(fixedWhere, function(value, key) {

      // There are two kinds of where, default and raw where
      // raw wheres are getted from the options configuration using the current key
      // default wheres are using directly the current key

      if (_this.options.rawFilters && _this.options.rawFilters[key]) {

        debugWhere('adding where (', _this.options.rawFilters[key], _this.comps[key], value, ')');
        qb.andWhereRaw([_this.options.rawFilters[key], _this.comps[key], '?'].join(' '), [value]);
      } else {
        debugWhere('adding where (', key, _this.comps[key], value, ')');

        qb.andWhere(key, _this.comps[key], value);
      }
    });
  };
};

/**
 * Choice the columns to groups and select
 * @private
 *
 * @return {void}
 */
Paginator.prototype.prepareQueryGroup = function() {
  this.selectQuery = this.selectQuery.column(this.groups).select();

  this.groups.push(
    this.modelInstance.tableName + '.' + this.modelInstance.idAttribute
  );

  if (this.order.column.match(/\./)) {
    if (!this.order.column.match(new RegExp('^' + this.modelInstance.tableName))) {
      this.selectQueryOrder = '_result.' + this.order.column.split('.')[1];
      this.groups.push(this.order.column);
    }
  }

  this.groups.forEach(function(group) {
    this.selectQuery = this.selectQuery.groupBy(group);
  }.bind(this));
};

/**
 * Build the count query
 * @private
 *
 * @param  {Query} baseQuery
 * @return {void}
 */
Paginator.prototype.prepareQueryCount = function(baseQuery) {
  this.countQuery = baseQuery.clone()
    .select(
      Models.Bookshelf.knex.raw('COUNT(DISTINCT _result.id) as count')
    )
    .join(
      this.selectQuery.as('_result'), '_result.id', this.modelInstance.tableName + '.id'
    );
};

/**
 * Build the count and data queries
 * @private
 *
 * @return {void}
 */
Paginator.prototype.prepareQuery = function() {
  var fixedWhere = {};
  var baseQuery;
  var _this = this;

  baseQuery = Models.Bookshelf.knex(this.modelInstance.tableName);

  this.buildJoins();

  _.keys(this.where).forEach(
    function(key) {

      // raw filters should not have table name as prefix
      if (this.options.rawFilters && this.options.rawFilters[key]) {
        fixedWhere[key] = this.where[key];
      } else {
        fixedWhere[this.realTableNames[key] ? this.realTableNames[key] : key] = this.where[key];
      }
    }.bind(this)
  );

  this.selectQuery = this.attachJoins(baseQuery.clone());

  this.prepareQueryResolveOrder();

  this.prepareQueryGroup();
  this.prepareQueryCount(baseQuery);
};

/**
 * Build the query to fetch model
 * @param qb
 */
Paginator.prototype.buildQuery = function(qb) {
  qb
    .join(this.selectQuery.as('_result'), '_result.id', this.modelInstance.tableName + '.id')
    .limit(this.getLimit())
    .offset(this.getOffset())
    .orderBy(this.selectQueryOrder, this.order.direction);
};

/**
 * loop searching for joins
 * @private
 */
Paginator.prototype.buildJoins = function() {
  var joinCandidates;
  var join;
  var relation;
  var _this = this;

  this.options.filterBy.forEach(function(item) {
    var filter;

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
      this.joins[join.tableName] = join.joinData;
    } else {
      this.realTableNames[item] = [this.modelInstance.tableName, item].join('.')
    }

    filter = _this.isRawFilter(item) ? item : _this.realTableNames[item];

    if (_.isObject(this.options.comp)) {
      _.forIn(this.options.comp, function(value, key) {
        if (_.include(value, item)) {
          _this.comps[filter] = key;
        }
      });
    }

    if (!this.comps[filter]) {
      this.comps[filter] = _.isObject(this.options.comp) ? '=' : this.options.comp;
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
  var tableName = this.modelInstance.tableName;

  _.forIn(this.joins, function(joinData) {
    if (joinData.joinTable !== tableName) {
      query = query
        .leftJoin(joinData.joinTable, joinData.id, joinData.foreignId)
        .leftJoin(joinData.targetTable, joinData.targetId, joinData.foreignTargeId);
    } else {
      query = query
        .leftJoin(joinData.targetTable, joinData.foreignId, joinData.foreignTargeId);
    }
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
  var joinTable = '';
  var otherKey;

  // FIXME: for check for other relations before continue
  switch (relatedData.type) {
    case 'belongsToMany':
      joinTable = relatedData.joinTable();
      otherKey = relatedData.otherKey;
      break;
    case 'belongsTo':
      joinTable = this.modelInstance.tableName;
      otherKey = this.modelInstance.idAttribute;
      break;
    default:
      throw new Error('Relation "' + relatedData.type + '" not supported in Paginator');
  }

  joinData = {
    joinTable: joinTable,
    id: [relatedData.parentTableName, 'id'].join('.'),
    foreignId: [joinTable, relatedData.foreignKey].join('.'),
    targetTable: relatedData.targetTableName,
    targetId: [joinTable, otherKey].join('.'),
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
  this.prepareQuery();

  return Promise.props({
    total: this.countQuery,
    data: this.modelInstance.query(this.buildQuery.bind(this)).fetchAll(options)
  })
    .then(function(result) {

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

/**
 * Returns true if the filter is of type raw
 * @param name
 * @returns {Boolean}
 */
Paginator.prototype.isRawFilter = function(name) {
  return this.options.rawFilters && this.options.rawFilters[name];
};

exports['default'] = Paginator;
module.exports = exports['default'];
