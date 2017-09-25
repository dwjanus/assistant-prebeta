'use strict';

var _mysql = require('mysql');

var _mysql2 = _interopRequireDefault(_mysql);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _config = require('./config.js');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

_bluebird2['default'].promisifyAll(_mysql2['default']);
_bluebird2['default'].promisifyAll(require('mysql/lib/Connection').prototype);
_bluebird2['default'].promisifyAll(require('mysql/lib/Pool').prototype);

var pool = _mysql2['default'].createPool((0, _config2['default'])('JAWSDB_URL'));

function getSqlConnection() {
  return pool.getConnectionAsync().disposer(function (connection) {
    console.log('Releasing connection back to pool');
    connection.release();
  });
}

function querySql(query, params) {
  return _bluebird2['default'].using(getSqlConnection(), function (connection) {
    console.log('Got connection from pool');
    if (typeof params !== 'undefined') return connection.queryAsync(query, params);
    return connection.queryAsync(query);
  });
}

module.exports = {
  getSqlConnection: getSqlConnection,
  querySql: querySql
};