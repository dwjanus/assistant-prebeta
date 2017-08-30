import util from 'util'
import jsforce from 'jsforce'
import db from '../../config/db.js'
import config from '../../config/config.js'
import _ from 'lodash'
import Promise from 'bluebird'

const query = db.querySql

const formatCaseNumber = (number) => {
  const s = `0000000${number}`
  return s.substr(s.length - 8)
}

const recordType = {
  Incident: '01239000000EB4NAAW',
  Change: '01239000000EB4MAAW',
  Problem: '01239000000EB4OAAW',
  Release: '01239000000EB4PAAW',
  ServiceRequest: 'COMING__SOON'
}

const recordName = {
  '01239000000EB4NAAW': 'Incident',
  '01239000000EB4MAAW': 'Change',
  '01239000000EB4OAAW': 'Problem',
  '01239000000EB4PAAW': 'Release'
}

const record = (arg, key) => {
  if (!key) return null
  if (arg === 'id') return recordType[key]
  if (arg === 'name') return recordName[key]
  return null
}

const oauth2 = new jsforce.OAuth2({
  loginUrl: 'https://test.salesforce.com',
  clientId: config('SF_ID'),
  clientSecret: config('SF_SECRET'),
  redirectUri: 'https://assistant-prebeta.herokuapp.com/authorize'
})

const returnParams = {
  Id: 1,
  Subject: 1,
  Description: 1,
  CreatedDate: 1,
  CaseNumber: 1,
  SamanageESD__OwnerName__c: 1,
  Priority: 1,
  Status: 1,
  SamanageESD__hasComments__c: 1,
  RecordTypeId: 1
}

export default ((userId) => {
  return new Promise((resolve, reject) => {
    console.log(`--> ebu api initialized for user: ${userId}`)

    const getUser = `SELECT * from users WHERE user_id = '${userId}'`
    query(getUser).then((userRow) => {
      console.log(`\n[salesforce] user found!\n${util.inspect(userRow)}`)
      return userRow[0]
    })
    .then((user) => {
      if (!user.sf_id) {
        console.log('--! no connection object found !---\n    returning link now ')
        return reject({ text: `✋ Hold your horses!\nVisit this URL to login to Salesforce: https://assistant-prebeta.herokuapp.com/login/${userId}` })
      }

      let conn = new jsforce.Connection({
        oauth2,
        instanceUrl: user.url,
        accessToken: user.access,
        refreshToken: user.refresh
      })

      conn.on('refresh', (newToken, res) => {
        console.log(`--> got a refresh event from Salesforce!\n    new token: ${newToken}`)
        query(`UPDATE users SET access = '${newToken}' WHERE user_id = '${user.user_id}'`).then((result) => {
          console.log(`--> updated user: ${user.user_id} with new access token - ${result}`)
          return resolve(retrieveSfObj(conn))
        })
      })

      return conn.identity((iderr, res) => {
        console.log('    identifying sf connection')
        if (iderr || !res || res === 'undefined' || undefined) {
          if (iderr) console.log(`!!! Connection Error: ${iderr}`)
          else console.log('--! connection undefined !---')
          return oauth2.refreshToken(user.refresh).then((ret) => {
            console.log(`--> forcing oauth refresh\n${util.inspect(ret)}`)
            conn = new jsforce.Connection({
              instanceUrl: ret.instance_url,
              accessToken: ret.access_token
            })

            // can also try this to get rid of callback linter error
            // query(`UPDATE users SET access = '${ret.access_token}', url = '${ret.instance_url}' WHERE user_id = '${user.user_id}'`).then(return resolve(retrieveSfObj(conn)))
            // return resolve(retrieveSfObj(conn))

            return query(`UPDATE users SET access = '${ret.access_token}', url = '${ret.instance_url}' WHERE user_id = '${user.user_id}'`).then((result) => {
              console.log(`--> updated user: ${user.user_id} with new access token - ${result}`)
              return resolve(retrieveSfObj(conn))
            })
          })
          .catch((referr) => {
            console.log(`!!! refresh event error! ${referr}`)
            return reject({ text: `✋ Whoa now! You need to reauthorize first.\nVisit this URL to login to Salesforce: https://assistant-prebeta.herokuapp.com/login/${userId}` })
          })
        }

        return resolve(retrieveSfObj(conn))
      })
    })
    .catch((err) => {
      return reject({ text: err })
    })
  })
})

function retrieveSfObj (conn) {
  return {
    singleObject (options, callback) {
      console.log(`--> [salesforce] singleObject\n    options:\n${util.inspect(options)}`)
      const response = []
      let searchParams = options
      delete searchParams.Owner
      delete searchParams.RecordType
      delete searchParams.Sortby
      if (options.Owner) searchParams.SamanageESD__OwnerName__c = options.Owner
      searchParams = _.omitBy(searchParams, _.isNil)
      searchParams.CaseNumber = formatCaseNumber(searchParams.CaseNumber)

      const type = record('id', options.RecordType)
      console.log(`Search Params:\n${util.inspect(searchParams)}`)
      console.log(`Return Params:\n${util.inspect(returnParams)}`)
      conn.sobject('Case')
      .find(searchParams, returnParams) // need handler for if no number and going by latest or something
      .execute((err, records) => {
        if (err) callback(err, null)
        else {
          console.log(`Records:\n${util.inspect(records)}`)
          for (const r of records) {
            r.RecordTypeMatch = true
            r.RecordTypeName = record('name', r.RecordTypeId)
            r.title_link = `${conn.instanceUrl}/${r.Id}`
            if (type && (r.RecordTypeId !== type)) {
              console.log(`Type Mismatch! type: ${type} != RecordTypeId: ${r.RecordTypeId}`)
              r.RecordTypeMatch = false
            }
            response.push(r)
          }
          callback(null, response[0])
        }
      })
    },

    quantity (options, callback) {
      console.log(`--> [salesforce] quantity\n    options:\n${util.inspect(options)}`)
      const type = record('id', options.RecordType)
      const response = []
      const searchParams = _.omitBy(options, _.isNil)
      if (searchParams.CaseNumber) searchParams.CaseNumber = formatCaseNumber(searchParams.CaseNumber)
      delete searchParams.RecordType
      if (!_.isNil(type)) searchParams.RecordTypeId = type

      console.log(`Search Params:\n${util.inspect(searchParams)}`)
      console.log(`Return Params:\n${util.inspect(returnParams)}`)
      conn.sobject('Case')
      .find(searchParams, returnParams) // need handler for if no number and going by latest or something
      .execute((err, records) => {
        if (err) callback(err, null)
        console.log('    records retrieved!\n')
        for (const r of records) {
          r.RecordTypeMatch = true
          r.RecordTypeName = record('name', r.RecordTypeId)
          r.title_link = `${conn.instanceUrl}/${r.Id}`
          if (type && (r.RecordTypeId !== type)) {
            console.log(`--! Type Mismatch! type: ${type} != RecordTypeId: ${r.RecordTypeId}`)
            r.RecordTypeMatch = false
          } else {
            console.log(`    Added record: ${r.Id}`)
          }
          response.push(r)
        }
        callback(null, response)
      })
    },

    comments (objectId, currentUserId) {
      console.log(`--> [salesforce] comments - Case: ${objectId} - User: ${currentUserId} **`)
      const comments = []
      return new Promise((resolve, reject) => {
        Promise.join(this.getCaseOwner(objectId), this.getCaseFeed(objectId), (OwnerId, records) => {
          return { OwnerId, records }
        })
        .then((joined) => {
          return Promise.map(joined.records, ((joinedrecord) => {
            return this.getUser(joinedrecord.CreatedById).then((user) => {
              console.log('getting user')
              if (user) {
                joinedrecord.User = user
                console.log(`User Added to record: ${joinedrecord.Id}`)
              }
              return joinedrecord
            })
          }))
          .each((r) => {
            if (r.Body) { // r.Visibility = InternalUsers for private comments
              if (r.Visibility !== 'AllUsers' && r.CreatedById !== currentUserId && currentUserId !== joined.OwnerId) {
                r.Body = '*Private Comment*'
              }
              return this.feedComments(r.ParentId, r.Id).then((feedComments) => {
                r.attachments = feedComments
                comments.push(r)
              })
            }
            return comments
          })
        })
        .then(() => {
          return Promise.all(comments).then(resolve(comments))
        })
        .catch((err) => {
          reject(err)
        })
      })
    },

    feedComments (parentId, caseFeedId) { // need to retrieve only the comment which exists in the feedViews for the case
      return new Promise((resolve, reject) => {
        console.log(`** [salesforce] retrieving FeedComments ${caseFeedId} for ${parentId} **`)
        const feedComments = []
        conn.sobject('FeedComment')
          .find({ ParentId: parentId, FeedItemId: caseFeedId })
          .orderby('CreatedDate', 'DESC')
        .execute((err, records) => {
          if (err) reject(err)
          return Promise.map(records, (r) => {
            return this.getUser(r.CreatedById).then((user) => {
              if (user) {
                r.User = user
              }
              return r
            })
          })
          .each((feed) => {
            if (feed.CommentBody && feed.IsDeleted === false) {
              feedComments.push(feed)
            }
            return feedComments
          })
          .then(() => {
            Promise.all(feedComments).then(resolve(feedComments))
          })
        })
      })
    },

    getCaseOwner (id) {
      return new Promise((resolve, reject) => {
        conn.query(`SELECT OwnerId FROM Case WHERE Id = '${id}'`, (err, result) => {
          if (err) return reject(err)
          const OwnerId = result.records[0].OwnerId
          return resolve(OwnerId)
        })
      })
    },

    getCaseFeed (id) {
      return new Promise((resolve, reject) => {
        conn.sobject('CaseFeed')
          .find({ ParentId: id })
          .orderby('CreatedDate', 'DESC')
          .limit(5)
        .execute((err, records) => {
          if (err) return reject(err)
          console.log('[getCaseFeed] got records')
          return resolve(records)
        })
      })
    },

    // NOTE: these are the fields we want from this function
    // Name: 'Devin Janus
    // SmallPhotoUrl: 'https://c.cs60.content.force.com/profilephoto/7293C000000CavH/T'
    // MediumPhotoUrl: 'https://c.cs60.content.force.com/profilephoto/7293C000000CavH/M'
    // FullPhotoUrl: 'https://c.cs60.content.force.com/profilephoto/7293C000000CavH/F
    // --> the only difference between photourls is the T/M/F at the end
    getUser (id) {
      return new Promise((resolve, reject) => {
        const token = conn.accessToken
        conn.sobject('User')
        .find({ Id: id })
        .execute((err, records) => {
          if (err || !records) reject(err || 'no records found')
          const user = {
            Name: records[0].Name,
            Photo: `${records[0].FullPhotoUrl}?oauth_token=${token}`
          }
          return resolve(user)
        })
      })
    }
  }
}
