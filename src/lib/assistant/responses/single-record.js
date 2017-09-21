import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'
import dateFormat from 'dateformat'

const query = db.querySql

function addslashes (str) {
  return (`${str} `).replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0')
}

exports.single_nocontext = (args, cb) => {
  console.log('\n--> inside single -- nocontext')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const returnType = app.getArgument('return-type')
  let text = ''
  let options = {
    CaseNumber: app.getArgument('CaseNumber'),
    RecordType: app.getArgument('record-type')
  }

  if (app.getArgument('Assignee') === 'Self') options.OwnerId = user.sf_id // need to play with this
  if (!app.getArgument('record-type')) options.RecordType = 'Incident'

  options = _.omitBy(options, _.isNil)

  console.log(`options: ${util.inspect(options)}`)
  console.log(`--> return type is: ${returnType}`)

  return ebu.singleRecord(options).then((record) => {
    console.log('--> record returned from ebu api')

    if (record) {
      const saveRecordStr = `UPDATE users SET lastRecord = JSON_OBJECT('Id', '${record.Id}', 'Subject', '${addslashes(record.Subject)}', ` +
        `'OwnerId', '${record.OwnerId}', 'Description', '${addslashes(record.Description)}', 'CreatedDate', '${record.CreatedDate}', ` +
        `'SamanageESD__OwnerName__c', '${record.SamanageESD__OwnerName__c}', 'SamanageESD__Assignee_Name__c', '${record.SamanageESD__Assignee_Name__c}', ` +
        `'CaseNumber', '${record.CaseNumber}', 'Priority', '${record.Priority}', 'Status', '${record.Status}', 'SamanageESD__hasComments__c', ` +
        `'${record.SamanageESD__hasComments__c}', 'SamanageESD__RecordType__c', '${record.SamanageESD__RecordType__c}', ` +
        `'RecordTypeId', '${record.RecordTypeId}', 'SamanageESD__RequesterName__c', '${record.SamanageESD__RequesterName__c}')` +
        ` WHERE user_id = '${user.user_id}'`

      return query(saveRecordStr).then(() => {
        if (returnType) {
          if (returnType === 'Latest Comment' || 'Comments') {
            return ebu.comments(record.Id).then((comments) => {
              console.log('--> just got comments back')

              if (comments) {
                console.log('   --> they are not empty')

                if (returnType === 'Latest Comment') {
                  const latest = comments[0]
                  const date = dateFormat(latest.CreatedDate, "dddd mmmm dS, yyyy, 'at' h:MM:ss tt")
                  text = `The most recent comment is "${latest.Body}" and was posted by ${latest.User.Name} on ${date}. `

                  if (latest.CommentCount === 0) {
                    text += 'There are no responses to this. Would you like to post a reply?'
                    app.setContext('feedcomments-view')
                  } else {
                    if (latest.CommentCount === 1) text += 'There is 1 response, would you like to view it?'
                    else text += `There are ${latest.CommentCount} responses, would you like to view them?`
                    app.setContext('viewfeed-prompt')
                  }

                  const saveFeedIdStr = `UPDATE users SET lastCommentId = '${latest.Id}' WHERE user_id = '${user.user_id}'`
                  return query(saveFeedIdStr)
                }

                const limit = comments.length > 3 ? 3 : comments.length
                const saved = {}
                for (let i = 0; i < limit; i++) {
                  const c = comments[i]
                  saved[`${(i + 1)}`] = c
                  const date = dateFormat(c.CreatedDate, "ddd m/d/yy '@' h:MM tt")
                  text += `${date} "${c.Body}" posted by ${c.User.Name} - ${c.CommentCount} replies\n`
                }

                if (comments.length > limit) text += `+${comments.length - limit} more`

                // set context to comments list
                app.setContext('comments-list')

                // save comments array to lastRecord
                const savedComments = JSON.stringify(saved)
                const updateLastRecordStr = `UPDATE users SET lastRecord = '${savedComments}' WHERE user_id = '${user.user_id}'`
                return query(updateLastRecordStr)
              }

              text = 'There are no public comments, would you like to post one?'
              return app.setContext('postcomment-prompt')
            })
            .then(() => {
              if (app.getArgument('yesno') && record) text = `Yes ${text}`
              return cb(null, text)
            })
          }

          text = `The ${app.getArgument('return-type')} is currently ${record[app.getArgument('return-type')]}`
        } else {
          text = `${record.SamanageESD__RecordType__c} ${record.CaseNumber} - ${record.Subject} / Priority: ${record.Priority} / Status: ${record.Status} / ` +
          `Description: ${record.Description}`
        }

        if (app.getArgument('yesno') && record) text = `Yes, ${text}`
        return cb(null, text)
      })
    }

    text = 'I\'m sorry, I was unable to find any records matching your description.'
    if (app.getArgument('yesno')) text = `No, ${text}`
    return cb(null, text)
  })
  .catch((err) => {
    cb(err, null)
  })
}

exports.single_details = (args, cb) => {
  console.log('\n--> inside single -- details')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const returnType = app.getArgument('return-type')
  const latestRecord = JSON.parse(user.lastRecord)
  let text = ''

  if (returnType === 'Latest Comment' || 'Comments') {
    console.log(`--> return type is: ${returnType}`)
    return ebu.comments(latestRecord.Id).then((comments) => {
      console.log('--> just got comments back')

      if (comments) {
        console.log('   --> they are not empty')
        if (returnType === 'Latest Comment') {
          const latest = comments[0]
          const date = dateFormat(latest.CreatedDate, "dddd mmmm dS, yyyy, 'at' h:MM:ss tt")
          text = `The most recent comment is "${latest.Body}" and was posted by ${latest.User.Name} on ${date}. `

          if (latest.CommentCount === 0) {
            text += 'There are no responses to this. Would you like to post a reply?'
            app.setContext('feedcomments-view')
          } else {
            if (latest.CommentCount === 1) text += 'There is 1 response, would you like to view it?'
            else text += `There are ${latest.CommentCount} responses, would you like to view them?`
            app.setContext('viewfeed-prompt')
          }

          const saveFeedIdStr = `UPDATE users SET lastCommentId = '${latest.Id}' WHERE user_id = '${user.user_id}'`
          return query(saveFeedIdStr).then(() => cb(null, text))
        }

        const limit = comments.length > 3 ? 3 : comments.length
        const saved = {}
        for (let i = 0; i < limit; i++) {
          const c = comments[i]
          saved[`${i + 1}`] = c
          const date = dateFormat(c.CreatedDate, "ddd m/d/yy '@' h:MM tt")
          text += `${date} "${c.Body}" posted by ${c.User.Name} - ${c.CommentCount} replies\n`
        }

        if (comments.length > limit) text += `+${comments.length - limit} more`

        app.setContext('comments-list')

        const savedComments = JSON.stringify(saved)
        const updateLastRecordStr = `UPDATE users SET lastRecord = '${savedComments}' WHERE user_id = '${user.user_id}'`
        return query(updateLastRecordStr)
      }

      text = 'There are no public comments, would you like to post one?'
      return app.setContext('postcomment-prompt')
    })
    .then(() => {
      if (app.getArgument('yesno')) text = `Yes ${text}`
      return cb(null, text)
    })
  }

  text = `The ${returnType} is currently ${latestRecord[returnType]}`
  return cb(null, text)
}


/** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***
 *               Handlers for Case Comment view/post convo paths              *
 ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***/

exports.single_postcomment_confirm = (args, cb) => {
  console.log('\n--> inside single -- postcomment/confirm')

  const app = args.app
  const commentBody = app.getArgument('CommentBody')
  let text = 'Okay, what would you like to say?'

  if (!commentBody || commentBody === '') return cb(null, text)
  text = `Replying with: "${commentBody}" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted`
  app.setContext('comment-verify')
  return cb(null, text)
}

exports.single_postcomment_body = (args, cb) => {
  console.log('\n--> inside single -- postcomment/confirm')

  const app = args.app
  const commentBody = app.getArgument('CommentBody')
  const text = `Replying with: "${commentBody}" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted`
  return cb(null, text)
}

exports.single_postcomment_deny = (args, cb) => {
  console.log('\n--> inside single -- postcomment/deny')
  const text = 'No worries, I am here if you need anything else'
  return cb(null, text)
}

exports.single_postcomment_verify_newbody = (args, cb) => {
  console.log('\n--> inside single -- postcomment/verify-confirm')

  const app = args.app
  const commentBody = app.getArgument('CommentBody')
  const text = `Replying with: "${commentBody}" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted`
  return cb(null, text)
}

exports.single_postcomment_verify_deny = (args, cb) => {
  console.log('\n--> inside single -- postcomment/verify-confirm')
  const text = 'No worries, cancelling your feed post'
  return cb(null, text)
}

exports.single_postcomment_verify_confirm = (args, cb) => {
  console.log('\n--> inside single -- postcomment/verify-confirm')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const latestRecord = JSON.parse(user.lastRecord)
  const commentBody = app.getArgument('CommentBody')

  return ebu.createComment(latestRecord.Id, user.sf_id, commentBody).then((ret) => {
    console.log(`--> got ret back from create function:\n${util.inspect(ret)}`)
    const text = 'Your comment has been posted!'
    return cb(null, text)
  })
  .catch((err) => {
    cb(err, null)
  })
}


/** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***
 *               Handlers for Feed Comment view/post convo paths              *
 ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***/

exports.single_viewfeed_confirmed = (args, cb) => {
  console.log('\n--> inside single -- viewfeed/confirmed')

  const ebu = args.ebu
  const user = args.user
  const latestRecord = JSON.parse(user.lastRecord)
  const lastComment = user.lastCommentId
  let text = ''

  return ebu.feedComments(latestRecord.Id, lastComment).each((feedComment) => {
    console.log(`-> adding feedComment ${feedComment.Id} to response`)
    const date = dateFormat(feedComment.CreatedDate, "ddd m/d/yy '@' h:MM tt")
    text += `${date} "${feedComment.CommentBody}" posted by ${feedComment.User.Name}\n`
  })
  .then(() => {
    text += '\nWould you like to post a response?'
    cb(null, text)
  })
  .catch(err => cb(err, null))
}

exports.single_viewfeed_deny = (args, cb) => {
  console.log('\n--> inside single -- viewfeed/deny')
  const text = 'Okay, I am here if you need anything else'
  return cb(null, text)
}

exports.single_postfeed_confirm = (args, cb) => {
  console.log('\n--> inside single -- postfeed/confirm')

  const app = args.app
  const commentBody = app.getArgument('CommentBody')
  let text = 'Okay, what would you like to say?'

  if (!commentBody) return cb(null, text)
  text = `Replying with: "${commentBody}" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted`
  app.setContext('feedcomment-verify')
  return cb(null, text)
}

exports.single_postfeed_deny = (args, cb) => {
  console.log('\n--> inside single -- postfeed/deny')
  const text = 'Okay, I am here if you need anything else'
  return cb(null, text)
}

exports.single_postfeed_body = (args, cb) => {
  console.log('\n--> inside single -- postfeed/body')

  const app = args.app
  const commentBody = app.getArgument('CommentBody')
  const text = `Replying with: "${commentBody}" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted`
  return cb(null, text)
}

exports.single_postfeed_verify_newbody = (args, cb) => {
  console.log('\n--> inside single -- postfeed/verify-newbody')

  const app = args.app
  const commentBody = app.getArgument('CommentBody')
  const text = `Replying with: "${commentBody}" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted`
  return cb(null, text)
}

exports.single_postfeed_verify_deny = (args, cb) => {
  console.log('\n--> inside single -- postfeed/verify-deny')
  const text = 'No worries, cancelling your feed post'
  return cb(null, text)
}

exports.single_postfeed_verify_confirm = (args, cb) => {
  console.log('\n--> inside single -- postfeed/verify-confirm')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const caseFeed = user.lastCommentId
  let commentBody = app.getContextArgument('feedcomment-verify', 'CommentBody')
  if (!commentBody) commentBody = app.getRawInput()

  return ebu.createFeedComment(caseFeed, user.sf_id, commentBody).then((ret) => {
    console.log(`--> got ret back from create function:\n${util.inspect(ret)}`)
    const text = 'Your comment has been posted!'
    return cb(null, text)
  })
  .catch((err) => {
    cb(err, null)
  })
}

/** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***
 *               Handlers for making single change to a case obj              *
 ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***/

exports.single_change = (args, cb) => {
  console.log('\n--> inside single -- change')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let returnType = app.getArgument('return-type')
  let options = {
    Id: ''
  }

  if (app.getArgument('Status')) options.Status = _.upperFirst(app.getArgument('Status'))
  if (app.getArgument('Priority')) options.Priority = _.upperFirst(app.getArgument('Priority'))

  options = _.omitBy(options, _.isNil)

  if (!returnType || returnType === 'undefined') returnType = _.keys(options)[1]

  const latestRecord = JSON.parse(user.lastRecord)
  console.log(`--> record after jsonify:\n${util.inspect(latestRecord)}`)
  options.Id = latestRecord.Id
  return ebu.update(options).then(() => {
    const text = `No problem, I have updated the ${returnType} to ${options[returnType]}`
    return cb(null, text)
  })
  .catch((err) => {
    cb(err, null)
  })
}

// need to add single_change_nocontext!!
