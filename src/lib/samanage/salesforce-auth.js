import util from 'util'
import jsforce from 'jsforce'
import config from '../../config/config.js'
import memjs from 'memjs'
import db from '../../config/db.js'

const query = db.querySql
const client = memjs.Client.create(config('CACHE_SV'),
  {
    username: config('CACHE_UN'),
    password: config('CACHE_PW')
  })

// ************************************** //
// Establish connection to Salesforce API //
// ************************************** //

const oauth2 = new jsforce.OAuth2({
  // loginUrl: 'https://test.salesforce.com',
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
  const userId = req.query.state
  const code = req.query.code
  const conn = new jsforce.Connection({ oauth2 })
  console.log(`--> (oauth callback) salesforce-auth /authorize\n    userId: ${userId}\n`)

  conn.authorize(code, (err, userInfo) => {
    if (err) res.status(500).send(`!!! AUTH ERROR: ${err}`)
    console.log(`--> authorizing for user: ${util.inspect(userInfo)}`)

    const insertStr = 'INSERT INTO users (user_id, sf_id, sf_org, url, access, refresh) ' +
      `VALUES ('${userId}', '${userInfo.id}', '${userInfo.organizationId}', '${conn.instanceUrl}', '${conn.accessToken}', '${conn.refreshToken}')`

    return query(insertStr).then((result) => {
      console.log(`--> saved user info: ${result}`)

      client.get(userId, (error, redir) => {
        if (error) console.log(`MEM_CACHE ERROR: ${error}`)
        return res.redirect(redir)
      })
    })
    .catch((insError) => {
      console.log(`Error storing user info - ${insError}`)
    })
  })

  conn.on('refresh', (newToken, refres) => {
    console.log(`--> salesforce-auth got a refresh event from Salesforce!\n    new token: ${newToken}\n`)
    console.log(`    response:\n${util.inspect(refres)}`)

    const updateQry = `UPDATE users SET access = '${newToken}' WHERE user_id = '${userId}'`

    return query(updateQry).then((result) => {
      console.log(`--> updated user info: ${util.inspect(result)}`)
    })
    .catch((upError) => {
      console.log(`Error updating user token: ${upError}`)
    })
  })
}
