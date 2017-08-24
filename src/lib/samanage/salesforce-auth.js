import util from 'util'
import jsforce from 'jsforce'
import config from '../../config/config.js'
import mongo from '../../config/db.js'

const storage = mongo({ mongoUri: config('MONGODB_URI') })

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
  console.log(`[salesforce-auth] ** req params: ${util.inspect(req.param)}`)
  console.log(`[salesforce-auth] ** req url: ${util.inspect(req.url)}`)
  let redir = oauth2.getAuthorizationUrl({ scope: 'api id web refresh_token' })
  redir += `&state=${req.params.userId}`
  console.log(`[salesforce-auth] ** generated our salesforce auth url: ${redir}`)
  res.redirect(redir)
}

exports.oauthCallback = (req, res) => {
  let sfTokens
  const userId = req.query.state
  const code = req.query.code
  const conn = new jsforce.Connection({ oauth2 })
  console.log(`--> (oauth callback) salesforce-auth /authorize\n    userId: ${userId}\n`)
  // console.log(`    connection:\n${util.inspect(conn)}`)

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

  conn.authorize(code, (err, userInfo) => {
    if (err) res.status(500).send(`!!! AUTH ERROR: ${err}`)
    console.log(`--> authorizing for user: ${util.inspect(userInfo)}`)

    // for final security layer we can encrypt these tokens
    sfTokens = {
      id: userInfo.id,
      org: userInfo.organizationId,
      tokens:
      {
        sfInstanceUrl: conn.instanceUrl,
        sfAccessToken: conn.accessToken,
        sfRefreshToken: conn.refreshToken
      }
    }

    storage.users.get(userId, (error, user) => {
      if (error) console.log(`!!!ERROR obtaining user: ${userId} -- ${error}`)
      console.log(`--> retrieving user: ${userId}`)
      console.log(`--> got user: ${util.inspect(user)}`)
      user.sf = sfTokens
      storage.users.save(user)
      console.log(`    stored updated user data:\n${util.inspect(user)}`)
      console.log(`    connected to sf instance: ${conn.instanceUrl}\n`)
      console.log(`    redirecting to: ${user.redir}`)
      res.redirect(user.redir)
    })
  })
}
