import util from 'util'
import config from '../../config/config.js'
import crypto from 'crypto'
import shortid from 'shortid'
import memjs from 'memjs'
import db from '../../config/db.js'
import Promise from 'bluebird'

const query = db.querySql
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

  console.log(`--> caching redirect url: ${redir}`)

  client.set(userId, redir, { expires: 600 }, (error, val) => {
    if (error) console.log(`!!! MEM CACHE ERROR: ${error}`)
    console.log(`--> redirect cached\n    key: ${userId}\n    val: ${val}`)
  })

  console.log(`--> saving auth code: ${code}`)

  const insertQry = 'INSERT INTO codes (code_id, type, user_id, client_id, expires_at) ' +
    `VALUES ('${code}', 'auth_code', '${userId}', '${config('GOOGLE_ID')}', '${expiresAt}')`

  return query(insertQry).then((result) => {
    console.log(`--> auth code saved: ${result}`)

    // --> send our request out to salesforce for auth
    return res.redirect(`https://assistant-prebeta.herokuapp.com/login/${userId}`)
  })
  .catch((insError) => {
    console.log(`--> Error storing auth code <--\n${insError}`)
  })
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
    console.log(`    grant type = AUTH --> code: ${code.toString('base64')}`)
    const codeQryStr = `SELECT user_id FROM codes WHERE code_id = '${code.toString('base64')}'`

    return query(codeQryStr).then((result) => {
      console.log(`auth code retrieved from db: ${util.inspect(result)}`)
      if (!result) {
        res.sendStatus(500)
        return Promise.reject('    Failure: No rows found from query')
      }
      return result[0].user_id
    })
    .then((userId) => {
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
      const accessQryStr = 'INSERT INTO codes (code_id, type, user_id, client_id, expires_at) ' +
      `VALUES ('${accessToken}', 'access', '${userId}', 'samanage', '${expiresAt}')`
      const refreshQryStr = 'INSERT INTO codes (code_id, type, user_id, client_id) ' +
      `VALUES ('${refreshToken}', 'refresh', '${userId}', 'samanage')`

      Promise.join(query(accessQryStr), query(refreshQryStr), (result1, result2) => {
        console.log(`--> saved access token: ${result1}`)
        console.log(`--> saved refresh token: ${result2}`)
      })
      .then(() => {
        const response = {
          token_type: 'bearer',
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 3600
        }

        console.log(`    access: ${accessToken}\n    refresh: ${refreshToken}`)
        return res.json(response).end()
      })
      .catch((insError) => {
        console.log(`--> Error storing access/refresh tokens <--\n${insError}`)
      })
    })
    .catch((err) => {
      console.log(`--> Error retrieving auth code from storage <--\n${err}`)
      return res.sendStatus(500)
    })
  }

  if (grant === 'refresh_token') {
    console.log('--> Refresh Token recieved')

    const accessToken = crypto.randomBytes(16).toString('base64')
    const response = {
      token_type: 'bearer',
      access_token: accessToken,
      expires_in: 3600
    }
    const expiresAt = expiration('setaccess')
    const selectQry = `SELECT user_id FROM codes WHERE code_id = '${req.body.refresh_token}' AND type = 'refresh'`

    return query(selectQry).then((selectResult) => {
      console.log(`--> retrieved user_id from refresh code: ${util.inspect(selectResult)}`)
      return selectResult[0].user_id
    })
    .then((userId) => {
      const updateQry = `UPDATE codes SET code_id = '${accessToken}', expires_at = '${expiresAt}' WHERE user_id = '${userId}'
        AND type = 'access'`

      return query(updateQry).then((result2) => {
        console.log(`--> saved user info: ${result2}`)
        console.log(`    sending response object back:\n${util.inspect(response)}`)
        return res.json(response).end()
      })
      .catch((upError) => {
        console.log(`--> Error in DB UPDATE <--\n${upError}`)
      })
    })
    .catch((selError) => {
      console.log(`--> Error in DB SELECT<--\n${selError}`)
    })
  }
}
