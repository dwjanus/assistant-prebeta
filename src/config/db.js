import mysql from 'mysql'
import Promise from 'bluebird'
import config from './config.js'

Promise.promisifyAll(mysql)
Promise.promisifyAll(require('mysql/lib/Connection').prototype)
Promise.promisifyAll(require('mysql/lib/Pool').prototype)

const pool = mysql.createPool(config('JAWSDB_URL'))

function getSqlConnection () {
  return pool.getConnectionAsync().disposer((connection) => {
    console.log('Releasing connection back to pool')
    connection.release()
  })
}

function querySql (query, params) {
  return Promise.using(getSqlConnection(), (connection) => {
    console.log('Got connection from pool')
    if (typeof params !== 'undefined') return connection.queryAsync(query, params)
    return connection.queryAsync(query)
  })
}

module.exports = {
  getSqlConnection,
  querySql
}
