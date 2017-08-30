import util from 'util'
import express from 'express'
import bodyParser from 'body-parser'
import path from 'path'
import config from './config/config.js'
import sfauth from './lib/samanage/salesforce-auth.js'
import gauth from './lib/assistant/google-auth.js'
// import mysql from 'mysql'
// import Promise from 'bluebird'
import db from './config/db.js'
import samanageAssistant from './lib/assistant/ebu-assistant-handler.js'

const app = express()
const query = db.querySql
const ApiAiApp = require('actions-on-google').ApiAiAssistant
// const connection = mysql.createConnection(config('JAWSDB_URL'))
// connection.connect((err) => {
//   if (!err) console.log('Database is connected...')
//   else console.log('Error connecting database...')
// })
// const query = Promise.promisify(connection.query)

const port = process.env.port || process.env.PORT || config('PORT') || 8080
if (!port) {
  console.log('Error: Port not specified in environment')
  process.exit(1)
}

app.set('port', port)
app.use(express.static(path.join(__dirname, '../public')))
app.use(bodyParser.json({ type: 'application/json', limit: '50mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb', parameterLimit: 50000 }))

app.get('/', (request, response) => {
  response.sendFile('index.html')
})

app.get('/auth', gauth.auth)
app.post('/token', gauth.token)
app.get('/login/:userId', sfauth.login)
app.get('/authorize', sfauth.oauthCallback)

app.post('/actions', (request, response) => {
  console.log('--> /actions Webhook Received')
  let ApiAiConstructor = { request, response }
  if (request.body.sessionId) ApiAiConstructor = { request, response, sessionId: request.body.sessionId }
  const assistant = new ApiAiApp(ApiAiConstructor)
  const currentUser = assistant.getUser()
  const currentToken = currentUser.access_token
  console.log(`    user data from request:\n${util.inspect(request.body.originalRequest.data)}\n`)
  console.log(`    user data from assistant:\n${util.inspect(currentUser)}\n`)

  query(`SELECT user_id from codes WHERE code_id = '${currentToken}' AND type = 'access'`).then((result) => {
    console.log(`    result: ${util.inspect(result)}`)
    return result[0].user_id
  })
  .then((userId) => {
    console.log(`--> starting up Assistant for user: ${userId}`)
    // --> this is where we would check the token
    samanageAssistant(assistant, userId)
  })
})

const server = app.listen(app.get('port'), () => {
  console.log('App listening on port %s', server.address().port)
  console.log('Press Ctrl+C to quit')
})
