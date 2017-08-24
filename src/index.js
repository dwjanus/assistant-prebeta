import util from 'util'
import express from 'express'
import bodyParser from 'body-parser'
import path from 'path'
import config from './config/config.js'
import sfauth from './lib/samanage/salesforce-auth.js'
import gauth from './lib/assistant/google-auth.js'
import mongo from './config/db.js'
import Promise from 'bluebird'
import samanageAssistant from './lib/assistant/ebu-assistant-handler.js'

const app = express()
const ApiAiApp = require('actions-on-google').ApiAiAssistant
const storage = mongo({ mongoUri: config('MONGODB_URI') })
const codes = Promise.promisify(storage.codes.get)
const users = Promise.promisify(storage.users.get)
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
  codes(currentToken).then((access) => {
    console.log(`    found user: ${util.inspect(access)}`)
    return access.userId
  })
  .then((userId) => {
    users(userId).then((user) => {
      console.log(`    ${user.id} retrieved`)
      // --> this is where we would check the token
      samanageAssistant(assistant, user)
    })
  })
})

const server = app.listen(app.get('port'), () => {
  console.log('App listening on port %s', server.address().port)
  console.log('Press Ctrl+C to quit')
})
