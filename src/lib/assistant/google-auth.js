import util from 'util'
import config from '../../config/config.js'
import crypto from 'crypto'
import shortid from 'shortid'
import memjs from 'memjs'
import mysql from 'mysql'

const connection = mysql.createConnection(config('JAWSDB_URL'))
const client = memjs.Client.create(config('CACHE_SV'),
  {
    username: config('CACHE_UN'),
    password: config('CACHE_PW')
  })

function expiration (getset) {
  const date = new Date()
  const year = date.getFullYear()

  let hour = date.getHours()
  if (getset === 'setaccess') hour += 1
  hour = (hour < 10 ? '0' : '') + hour

  let min = date.getMinutes()
  if (getset === 'set') min += 10
  min = (min < 10 ? '0' : '') + min

  let month = date.getMonth() + 1
  month = (month < 10 ? '0' : '') + month

  let day = date.getDate()
  day = (day < 10 ? '0' : '') + day

  return `${year}-${month}-${day} ${hour}:${min}`
}

exports.auth = (req, res) => {
  console.log('--> google-auth /auth\n')
  console.log(`    req url: ${req.url}`)
  // --> verify client id matches the one in google console

  // --> create user and save to db
  const state = req.query.state
  const userId = shortid.generate()
  const code = crypto.randomBytes(16).toString('base64')
  const expiresAt = expiration('set')
  const redir = `https://oauth-redirect.googleusercontent.com/r/assistant-prebeta?code=${code}&state=${state}`

  const newCode = {
    id: code,
    type: 'auth_code',
    userId,
    clientId: config('GOOGLE_ID'),
    expiresAt
  }

  console.log(`--> caching redirect url: ${redir}`)

  client.set(userId, redir, { expires: 600 }, (error, val) => {
    if (error) console.log(`!!! MEM CACHE ERROR: ${error}`)
    console.log(`--> redirect cached\n    key: ${userId}\n    val: ${val}`)
  })

  console.log(`--> caching auth code: ${util.inspect(newCode)}`)

  client.set(code, userId, { expires: 600 }, (error, val) => {
    if (error) console.log(`!!! MEM CACHE ERROR: ${error}`)
    console.log(`--> auth code cached\n    key: ${code}\n    val: ${val}`)
  })

  // --> send our request out to salesforce for auth
  res.redirect(`https://assistant-prebeta.herokuapp.com/login/${userId}`)
}

exports.token = (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  const grant = req.body.grant_type
  const code = req.body.code
  // const currentTime = expiration('get')
  // const secret = req.query.secret // we will check this later

  console.log('--> google-auth /token')
  console.log(`    req url: ${util.inspect(req.url)}`)
  console.log(`    req body: ${util.inspect(req.body)}\n`)

  // --> retrieve auth record
  if (grant === 'authorization_code') {
    console.log(`    grant type ==> AUTH -- code: ${code}`)


    client.get(code, (err, value) => {
      console.log(`Auth Code retrieved from cache: ${value.toString()}`)

      if (err || !value) {
        console.log(`    Error in auth code storage: ${err}`)
        res.sendStatus(500)
      }

      // if (currentTime > auth.expiresAt) {
      //   console.log('\n--! discrepency registered between expiration times:')
      //   console.log(`    currentTime: ${currentTime}  -  expiresAt: ${auth.expiresAt}`)
      //   // res.sendStatus(500)
      // }

      // if (req.body.client_id !== auth.clientId) {
      //   console.log('\n--! discrepency registered between client Ids:')
      //   console.log(`    req: ${req.body.client_id}  -  auth: ${auth.clientId}`)
      //   // res.sendStatus(500)
      // }

      const accessToken = crypto.randomBytes(16).toString('base64')
      const refreshToken = crypto.randomBytes(16).toString('base64')
      const expiresAt = expiration('setaccess')

      connection.connect((error) => {
        if (error) console.log(`JAWS DB connection Error!\n${error}`)
        connection.query('INSERT INTO codes (code_id, type, user_id, client_id, expires_at) ' +
          `VALUES ('${accessToken}', 'access', '${value.toString()}', 'samanage', '${expiresAt}')`, (insError, result) => {
          if (insError) console.log(`Error storing access tokens: ${insError}`)
          console.log(`--> saved access token: ${util.inspect(result)}`)
        })

        connection.query('INSERT INTO codes (code_id, type, user_id, client_id) ' +
          `VALUES ('${refreshToken}', 'refresh', '${value.toString()}', 'samanage')`, (insError, result) => {
          if (insError) console.log(`Error storing refresh tokens: ${insError}`)
          console.log(`--> saved refresh token: ${util.inspect(result)}`)
        })
      })

      const response = {
        token_type: 'bearer',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 3600
      }

      console.log(`    access: ${accessToken}\n    refresh: ${refreshToken}`)
      res.json(response).end()
    })
  }

  if (grant === 'refresh_token') {
    console.log('--> Refresh Token recieved')

    const accessToken = crypto.randomBytes(16).toString('base64')
    const expiresAt = expiration('setaccess')

    connection.connect((error) => {
      if (error) console.log(`JAWS DB connection Error!\n${error}`)
      connection.query(`SELECT user_id FROM codes WHERE code_id = '${req.body.refresh_token}' AND type = 'refresh'`, (selError, result1) => {
        if (selError) console.log(`Error in DB SELECT: ${selError}`)
        else console.log(`--> retrieved user_id from refresh code: ${util.inspect(result1)}`)

        connection.query(`UPDATE codes SET code_id = '${accessToken}', expires_at = '${expiresAt}' WHERE user_id = '${result1[0].user_id}'
          AND type = 'access'`, (upError, result2) => {
          if (upError) console.log(`Error in DB UPDATE: ${upError}`)
          else console.log(`--> saved user info: ${util.inspect(result2)}`)
        })
      })
    })

    const response = {
      token_type: 'bearer',
      access_token: accessToken,
      expires_in: 3600
    }

    console.log(`    sending response object back:\n${util.inspect(response)}`)
    res.json(response).end()
  }
}
