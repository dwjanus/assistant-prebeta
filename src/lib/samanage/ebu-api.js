import util from 'util'
import jsforce from 'jsforce'
import db from '../../config/db.js'
import config from '../../config/config.js'
import _ from 'lodash'
import Promise from 'bluebird'
import dateFormat from 'dateformat'

const query = db.querySql

const formatCaseNumber = (number) => {
  const s = `0000000${number}`
  return s.substr(s.length - 8)
}

const addslashes = (str) => {
  return str.replace(/[&!:"'-*+~?^${}()|[\]\\]/g, '\\$&').replace(/\u0000/g, '\\0')
}

const recordType = {
  Incident: '0121I000000kKdzQAE',
  Change: '0121I000000kKe0QAE',
  Problem: '0121I000000kKdwQAE',
  Release: '0121I000000kKdvQAE',
  Request: '0121I000000kKdyQAE'
}

const recordName = {
  '0121I000000kKdzQAE': 'Incident',
  '0121I000000kKe0QAE': 'Change',
  '0121I000000kKdwQAE': 'Problem',
  '0121I000000kKdvQAE': 'Release',
  '0121I000000kKdyQAE': 'Request'
}

const record = (arg, key) => {
  if (!key) return null
  if (arg === 'id') return recordType[key]
  if (arg === 'name') return recordName[key]
  return null
}

const oauth2 = new jsforce.OAuth2({
  clientId: config('SF_ID'),
  clientSecret: config('SF_SECRET'),
  redirectUri: `https://${config('HEROKU_SUBDOMAIN')}.herokuapp.com/authorize`
})

const returnParams = {
  Id: 1,
  Subject: 1,
  Description: 1,
  CreatedDate: 1,
  LastModifiedDate: 1,
  LastModifiedById: 1,
  CaseNumber: 1,
  OwnerId: 1,
  SamanageESD__OwnerName__c: 1,
  SamanageESD__Assignee_Name__c: 1,
  SamanageESD__RequesterName__c: 1,
  Priority: 1,
  Status: 1,
  SamanageESD__hasComments__c: 1,
  SamanageESD__RecordType__c: 1,
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
        return reject({ text: `✋ Hold your horses!\nVisit this URL to login to Salesforce: https://${config('HEROKU_SUBDOMAIN')}.herokuapp.com/login/${userId}` })
      }

      let conn = new jsforce.Connection({
        oauth2,
        instanceUrl: user.url,
        accessToken: user.access,
        refreshToken: user.refresh
      })

      conn.on('refresh', (newToken, res) => {
        console.log(`--> got a refresh event from Salesforce!\n    new token: ${newToken}`)
        return query(`UPDATE users SET access = '${newToken}' WHERE user_id = '${user.user_id}'`).then((result) => {
          console.log(`--> updated user: ${user.user_id} with new access token - ${result}`)
          return resolve(retrieveSfObj(conn))
        })
      })

      return conn.identity((iderr, res) => {
        console.log('    identifying sf connection...')

        if (iderr || !res || res === 'undefined' || undefined) {
          if (iderr) console.log(`!!! Connection Error !!!\n${util.inspect(res)}`)
          else console.log('--! connection undefined !---')
          return oauth2.refreshToken(user.refresh).then((ret) => {
            console.log(`--> forcing oauth refresh\n${util.inspect(ret)}`)
            conn = new jsforce.Connection({
              instanceUrl: ret.instance_url,
              accessToken: ret.access_token
            })

            const updateStr = `UPDATE users SET access = '${ret.access_token}', url = '${ret.instance_url}' WHERE user_id = '${user.user_id}'`
            console.log(`--> updating user: ${user.user_id} with new access token`)
            return query(updateStr).then(resolve(retrieveSfObj(conn)))
          })
          .catch((referr) => {
            console.log(`!!! refresh event error! ${referr}`)
            return reject({ text: `✋ Whoa now! You need to reauthorize first.\nVisit this URL to login to Salesforce: https://${config('HEROKU_SUBDOMAIN')}.herokuapp.com/login/${userId}` })
          })
        }

        return resolve(retrieveSfObj(conn))
      })
    })
    .catch((err) => {
      reject(err)
    })
  })
})

function retrieveSfObj (conn) {
  return {
    // maybe also want to check if any tickets have been assigned to user, resolved or closed since last login?
    welcomeUser (user) {
      return new Promise((resolve, reject) => {
        console.log(`--> [salesforce] welcoming returning user: ${user.sf_id}`)

        const newcases = []
        const updates = []

        conn.sobject('Case')
        .find({ OwnerId: user.sf_id }, returnParams)
        .sort('-LastModifiedDate -CaseNumber')
        .execute((err, records) => {
          if (err) return reject(err)
          console.log(`Records:\n${util.inspect(records)}`)
          for (const r of records) {
            if (r.CreatedDate > user.lastLogin && r.Status === 'New') newcases.push(r)
            else if (r.LastModifiedDate > user.lastLogin && r.LastModifiedById !== user.sf_id) updates.push(r)
          }
          return resolve({ newcases, updates })
        })
      })
    },

    knowledge (text) {
      return new Promise((resolve, reject) => {
        console.log(`--> [salesforce] knowledge search\n    options:\n${util.inspect(text)}`)
        let articles = []
        console.log(`--> search string: ${addslashes(text)}`)
        return conn.search(`FIND {${addslashes(text)}} IN NAME Fields RETURNING Knowledge__kav (Id, KnowledgeArticleId, UrlName, Title, Summary,
          LastPublishedDate, ArticleNumber, CreatedBy.Name, CreatedDate, VersionNumber, body__c WHERE PublishStatus = 'Online' AND Language = 'en_US'
          AND IsLatestVersion = true)`,
        (err, res) => {
          if (err) return reject(err)
          articles = res.searchRecords
          if (articles.length > 8) articles = _.slice(articles, 0, 7)
          return resolve(articles)
        })
      })
    },

    knowledgeArticle (id) {
      return new Promise((resolve, reject) => {
        console.log(`--> [salesforce] knowledge article\n    id:\n${id}`)

        let articles = []
        conn.sobject('Knowledge__kav')
          .retrieve(id, (err, result) => {
            if (err) return reject(err)
            if (result.length > 1) {
              for (const r of result) {
                r.link = `${conn.instanceUrl}/${r.KnowledgeArticleId}`
                articles.push(r)
              }
            } else {
              articles = result
              articles.link = `${conn.instanceUrl}/${result.KnowledgeArticleId}`
            }
            return resolve(articles)
          })
      })
    },

    createIncident (options) {
      return new Promise((resolve, reject) => {
        let request
        options.RecordTypeId = record('id', 'Incident')
        console.log(`--> [salesforce] incident creation\n    options:\n${util.inspect(options)}`)

        conn.sobject('Case').create(options, (err, ret) => {
          if (err || !ret.success) return reject(err)
          console.log(`--> success! Created records id: ${ret.id}\n${util.inspect(ret)}`)
          request = ret
          request.link = `${conn.instanceUrl}/${ret.id}`
          return conn.sobject('Case').retrieve(ret.id, (reterr, res) => {
            if (reterr) return reject(reterr)
            request.CaseNumber = res.CaseNumber
            console.log(`--> got new case back:\n${util.inspect(request)}`)
            return resolve(request)
          })
        })
      })
    },

    singleRecord (options) {
      return new Promise((resolve, reject) => {
        console.log(`\n--> [salesforce] singleRecord\n    options:\n${util.inspect(options)}`)
        const response = []
        const type = record('id', options.RecordType)
        let searchParams = options

        delete searchParams.Owner
        delete searchParams.RecordType
        delete searchParams.Sortby

        searchParams = _.omitBy(searchParams, _.isNil)
        if (searchParams.CaseNumber && searchParams.CaseNumber !== 'undefined') searchParams.CaseNumber = formatCaseNumber(searchParams.CaseNumber)

        console.log(`Search Params:\n${util.inspect(searchParams)}`)
        console.log(`Return Params:\n${util.inspect(returnParams)}`)

        conn.sobject('Case')
        .find(searchParams, returnParams) // need handler for if no number and going by latest or something
        .execute((err, records) => {
          if (err) return reject(err)
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
          return resolve(response[0])
        })
      })
    },

    caseRecordsById (ids) {
      return new Promise((resolve, reject) => {
        console.log(`--> [salesforce] caseRecordsById\n-->ids: ${ids}`)

        let records = []
        conn.sobject('Case')
          .retrieve(ids, (err, result) => {
            if (err) return reject(err)
            if (result.length > 1) {
              for (const r of result) {
                r.link = `${conn.instanceUrl}/${r.Id}`
                records.push(r)
              }
            } else {
              records = result
              records.link = `${conn.instanceUrl}/${result.KnowledgeArticleId}`
            }
            return resolve(records)
          })
      })
    },

    multiRecord (options) {
      return new Promise((resolve, reject) => {
        console.log(`\n--> [salesforce] multiRecord\n    options:\n${util.inspect(options)}`)
        let searchParams = options

        if (options.RecordType) {
          const type = record('id', options.RecordType)
          searchParams.RecordTypeId = type
        }

        delete searchParams.Owner
        delete searchParams.RecordType
        delete searchParams.Sortby

        searchParams = _.omitBy(searchParams, _.isNil)
        if (searchParams.CaseNumber && searchParams.CaseNumber !== 'undefined') searchParams.CaseNumber = formatCaseNumber(searchParams.CaseNumber)

        console.log(`Search Params:\n${util.inspect(searchParams)}`)
        console.log(`Return Params:\n${util.inspect(returnParams)}`)

        conn.sobject('Case')
        .find(searchParams, returnParams) // need handler for if no number and going by latest or something
        .sort('-LastModifiedDate -CaseNumber')
        .limit(8) // hard limit for now, later we will add handler to 'View More' from multi record intent
        .execute((err, records) => {
          if (err) return reject(err)
          console.log(`Records:\n${util.inspect(records)}`)
          return resolve(records) // need to include sorting at some point
        })
      })
    },

    metrics (options) {
      return new Promise((resolve, reject) => {
        console.log(`\n--> [salesforce] metrics\n    options:\n${util.inspect(options)}`)
        const response = []
        const type = record('id', options.RecordType)
        let searchParams = options

        const startClosedDate = dateFormat(options.DatePeriod.split('/')[0], 'isoDateTime')
        const endClosedDate = dateFormat(options.DatePeriod.split('/')[1], 'isoDateTime')

        console.log(`startClosedDate = ${util.inspect(startClosedDate)}`)
        console.log(`endClosedDate = ${util.inspect(endClosedDate)}`)

        let statusDateType = ''
        if (searchParams.StatusChange === 'Closed') statusDateType = 'ClosedDate'
        if (searchParams.StatusChange === 'Opened') statusDateType = 'CreatedDate'
        searchParams = _.omitBy(searchParams, _.isNil)

        console.log(`Search Params: ${util.inspect(searchParams)}`)
        console.log(`Return Params:\n${util.inspect(returnParams)}`)
        conn.sobject('Case')
        .find(searchParams, returnParams) // need handler for if no number and going by latest or something
        .where(
          `${statusDateType} >= ${startClosedDate} AND ${statusDateType} <= ${endClosedDate}`
        )
        .sort('-LastModifiedDate')
        .execute((err, records) => {
          if (err) return reject(err)
          const sampleRecords = records.slice(0, 5) // Show first 5 records

          console.log(`Found ${records.length} Records:\n${util.inspect(sampleRecords)}`)
          for (const r of records) {
            console.log(`Adding ${r.CaseNumber} - ${r.RecordTypeId}`)
            r.RecordTypeMatch = true
            r.RecordTypeName = record('name', r.RecordTypeId)
            r.title_link = `${conn.instanceUrl}/${r.Id}`
            console.log(`Adding ${r.CaseNumber} - ${r.RecordTypeId}`)
            if (type && (r.RecordTypeId !== type)) {
              console.log(`Type Mismatch! type: ${type} != RecordTypeId: ${r.RecordTypeId}`)
              r.RecordTypeMatch = false
            }
            console.log(`Adding ${r.CaseNumber} - ${r.RecordTypeId}`)
            response.push(r)
          }
          return resolve(response)
        })
      })
    },

    update (options) {
      return new Promise((resolve, reject) => {
        console.log(`\n--> [salesforce] update\n    options:\n${util.inspect(options)}`)

        conn.sobject('Case').update(options, (err, ret) => {
          if (err || !ret.success) return reject(err)
          console.log('--> updated successfully')
          return resolve()
        })
      })
    },

    comments (objectId) {
      console.log(`--> [salesforce] comments - Case: ${objectId} **`)
      const comments = []
      return new Promise((resolve, reject) => {
        return this.getCaseFeed(objectId).then((caseFeed) => {
          return Promise.map(caseFeed, ((comment) => {
            console.log('[comments] mapping users to feed objects')
            return this.getUser(comment.CreatedById).then((user) => {
              if (user) comment.User = user
              else comment.User = null
              return comment
            })
          }))
          .each((r) => {
            console.log('[comments .each]')
            if (r.Body) comments.push(r)
            return comments
          })
        })
        .then(() => {
          console.log(`[comments .then]\n${util.inspect(comments)}`)
          return Promise.all(comments).then(resolve(comments))
        })
        .catch((err) => {
          reject(err)
        })
      })
    },

    feedComments (parentId, caseFeedId) { // need to retrieve only the comment which exists in the feedViews for the case
      return new Promise((resolve, reject) => {
        console.log(`** [salesforce] retrieving FeedComments for case: ${parentId} feed: ${caseFeedId} **`)
        const feedComments = []

        conn.sobject('FeedComment')
          .find({ ParentId: parentId, FeedItemId: caseFeedId })
          .orderby('-CreatedDate')
        .execute((err, records) => {
          if (err) reject(err)
          return Promise.map(records, (r) => {
            return this.getUser(r.CreatedById).then((user) => {
              if (user) r.User = user
              else r.User = null
              return r
            })
          })
          .each((feed) => {
            if (feed.IsDeleted === false) {
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

    createComment (objectId, userId, comment) {
      return new Promise((resolve, reject) => {
        console.log(`** [salesforce] posting ${comment}\n   on case: ${objectId} for user: ${userId} **`)

        conn.sobject('FeedItem').create({
          ParentId: objectId,
          Type: 'TextPost',
          InsertedById: userId,
          Body: comment,
          Visibility: 'AllUsers'
        }, (err, ret) => {
          console.log(`--> finsihed creating comment: ${ret.success}`)
          if (err || !ret.success) return reject(err)
          return resolve(ret)
        })
      })
    },

    createFeedComment (caseFeedId, userId, comment) {
      return new Promise((resolve, reject) => {
        console.log(`** [salesforce] posting ${comment}\n   on casefeed: ${caseFeedId} for user: ${userId} **`)

        conn.sobject('FeedComment').create({
          FeedItemId: caseFeedId,
          CommentType: 'TextComment',
          InsertedById: userId,
          CommentBody: comment
        }, (err, ret) => {
          console.log(`--> finished creating feed comment: ${util.inspect(ret)}`)
          if (err) return reject(err) // || !ret.success
          return resolve(ret)
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
        conn.sobject('FeedItem')
          .find({ ParentId: id, Type: 'TextPost' })
          .orderby('-LastModifiedDate')
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
          // console.log(`--> got user:\n${util.inspect(records[0])}`)
          const user = {
            Name: records[0].Name,
            FirstName: records[0].FirstName,
            Photo: `${records[0].FullPhotoUrl}?oauth_token=${token}`,
            MobilePhone: records[0].MobilePhone,
            CompanyName: records[0].CompanyName,
            Department: records[0].Department,
            Email: records[0].Email,
            PortalRole: records[0].PortalRole,
            IsPortalEnabled: records[0].IsPortalEnabled,
            SamanageESD_FullName__c: records[0].SamanageESD_FullName__c,
            SamanageESD_RoleName__c: records[0].SamanageESD_RoleName__c
          }
          return resolve(user)
        })
      })
    }
  }
}
