import util from 'util'
import jsforce from 'jsforce'
import config from '../../config/config.js'
import mongo from '../../config/db.js'
import memjs from 'memjs'

const storage = mongo({ mongoUri: config('MONGODB_URI') })
const client = memjs.Client.create(config('CACHE_SV'),
  {
    username: config('CACHE_UN'),
    password: config('CACHE_PW')
  })

// ************************************** //
// Establish connection to Salesforce API //
// ************************************** //

const oauth2 = new jsforce.OAuth2({
  loginUrl: 'https://test.salesforce.com',
  clientId: config('SF_ID'),
  clientSecret: config('SF_SECRET'),
  redirectUri: 'https://assistant-prebeta.herokuapp.com/authorize'
})

exports.login = (req, res) => {
  console.log('[salesforce-auth] ** Starting up salesforce-auth.login now **')
  console.log(`[salesforce-auth] ** req url: ${util.inspect(req.url)}`)
  let redirect = oauth2.getAuthorizationUrl({ scope: 'api id web refresh_token' })
  redirect += `&state=${req.params.userId}`
  console.log(`[salesforce-auth] ** generated our salesforce auth url: ${redirect}`)
  res.redirect(redirect)
}

exports.oauthCallback = (req, res) => {
  let sfTokens
  const userId = req.query.state
  const code = req.query.code
  const conn = new jsforce.Connection({ oauth2 })
  console.log(`--> (oauth callback) salesforce-auth /authorize\n    userId: ${userId}\n`)

  conn.authorize(code, (err, userInfo) => {
    if (err) res.status(500).send(`!!! AUTH ERROR: ${err}`)
    console.log(`--> authorizing for user: ${util.inspect(userInfo)}`)

    // for final security layer we can encrypt these tokens
    const user = {
      id: userId,
      sf: {
        id: userInfo.id,
        org: userInfo.organizationId,
        tokens:
        {
          sfInstanceUrl: conn.instanceUrl,
          sfAccessToken: conn.accessToken,
          sfRefreshToken: conn.refreshToken
        }
      }
    }

    console.log(`    stored updated user data:\n${util.inspect(user)}`)
    storage.users.save(user)

    client.get(userId, (error, redir) => {
      if (error) console.log(`MEM_CACHE ERROR: ${error}`)
      res.redirect(redir)
    })
  })

  conn.on('refresh', (newToken, refres) => {
    console.log(`--> salesforce-auth got a refresh event from Salesforce!\n    new token: ${newToken}\n`)
    console.log(`    response:\n${util.inspect(refres)}`)
    sfTokens.sfAccessToken = newToken
    storage.users.get(userId, (storeErr, user) => {
      if (storeErr) console.log(`!!! ERROR obtaining user: ${userId} -- ${storeErr}`)
      user.sf.tokens = sfTokens
      storage.users.save(user)
    })
  })
}
