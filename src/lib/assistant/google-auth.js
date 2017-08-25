import util from 'util'
import config from '../../config/config.js'
import mongo from '../../config/db.js'
import crypto from 'crypto'
import shortid from 'shortid'
import memjs from 'memjs'

const storage = mongo({ mongoUri: config('MONGODB_URI') })
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

  // storage.codes.save(newCode)

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

    client.get(code, (err, auth) => {
      auth = auth.toString('base64')
      console.log(`--> auth: ${util.inspect(auth)}`)

      if (err || !auth) {
        console.log(`    Error in auth storage: ${err}`)
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

      const access = {
        id: accessToken,
        type: 'access',
        userId: auth,
        clientId: config('GOOGLE_ID'),
        expiresAt
      }

      const refresh = {
        id: refreshToken,
        type: 'refresh',
        userId: auth,
        clientId: config('GOOGLE_ID'),
        expiresAt: null
      }

      storage.codes.save(access)
      console.log(`--> saved access token: ${util.inspect(access)}`)

      storage.codes.save(refresh)
      console.log(`--> saved refresh token: ${util.inspect(refresh)}`)

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
    storage.codes.get(req.body.refresh_token, (err, refresh) => {
      console.log(`    refresh code retrieved:\n${util.inspect(refresh)}`)
      if (err) res.send(err)
      // need to verify everything here
      const accessToken = crypto.randomBytes(16).toString('base64')
      const expiresAt = expiration('setaccess')
      const access = {
        id: accessToken,
        type: 'access',
        userId: refresh.userId,
        clientId: config('GOOGLE_ID'),
        expiresAt
      }

      storage.codes.save(access)

      const response = {
        token_type: 'bearer',
        access_token: accessToken,
        expires_in: 3600
      }
      console.log(`    sending response object back:\n${util.inspect(response)}`)
      res.json(response).end()
    })
  }
}
