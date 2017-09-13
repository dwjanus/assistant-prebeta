import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'

const query = db.querySql

exports.single_nocontext = (args, cb) => {
  console.log('\n--> inside single -- nocontext')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let text = ''
  let options = {
    CaseNumber: app.getArgument('CaseNumber'),
    RecordType: app.getArgument('record-type')
  }

  if (app.getArgument('Assignee') === 'Self') options.OwnerId = user.sf_id // need to play with this
  if (!app.getArgument('record-type')) options.RecordType = 'Incident'

  options = _.omitBy(options, _.isNil)

  console.log(`options: ${util.inspect(options)}`)

  return ebu.singleRecord(options).then((record) => {
    console.log('--> records returned from ebu api')

    text = 'I\'m sorry, I was unable to find any records matching your description.'

    if (record) {
      if (app.getArgument('return-type')) {
        text = `The ${app.getArgument('return-type')} is currently ${record[app.getArgument('return-type')]}`
      } else {
        text = `${record.SamanageESD__RecordType__c} ${record.CaseNumber} - ${record.Subject} / Priority: ${record.Priority} / Status: ${record.Status} ` +
        `Description: ${record.Description}`
      }

      const saveRecordStr = `UPDATE users SET lastRecord = JSON_OBJECT('Id', '${record.Id}', 'Subject', '${record.Subject}', 'OwnerId', '${record.OwnerId}', ` +
        `'Description', '${record.Description}', 'CreatedDate', '${record.CreatedDate}', 'CaseNumber', '${record.CaseNumber}', ` +
        `'SamanageESD__OwnerName__c', '${record.SamanageESD__OwnerName__c}', 'SamanageESD__Assignee_Name__c', '${record.SamanageESD__Assignee_Name__c}', ` +
        `'Priority', '${record.Priority}', 'Status', '${record.Status}', 'SamanageESD__hasComments__c', '${record.SamanageESD__hasComments__c}', ` +
        `'SamanageESD__RecordType__c', '${record.SamanageESD__RecordType__c}', 'RecordTypeId', '${record.RecordTypeId}')`

      return query(saveRecordStr).then(() => {
        if (app.getArgument('yesno') && record) text = `Yes, ${text}`
        return cb(null, text)
      })
    }

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
  let text = `The ${returnType} is currently ${latestRecord[returnType]}`
  console.log(`--> record after jsonify:\n${util.inspect(latestRecord)}`)

  if (returnType === 'Latest Comment' || 'Comments') {
    console.log(`--> return type is: ${returnType}`)
    return ebu.comments(latestRecord.Id, user.sf_id).then((comments) => {
      console.log('--> just got comments back')
      if (comments) {
        console.log('---> they are not empty')
        if (returnType === 'Latest Comment') {
          const latest = comments[0]
          // add parse for date so text version says Aug. 29 at {time} and speech takes normal date-time field from object
          text = `The most recent comment is "${latest.Body}" and was posted by ${latest.User} on ${latest.CreatedDate}. `
          if (latest.CommentCount === 0) text += 'There are no responses to this. Would you like to post a reply?'
          if (latest.CommentCount === 1) text += 'There is 1 response, would you like to view it?'
          else text += `There are ${latest.CommentCount} responses, would you like to view them?`
        } else {
          for (const c of comments) {
            text += `${c.CreatedDate}: "${c.Body}" posted by ${c.User}`
          }
        }
      } else {
        text = 'There are no public comments, would you like to post one?'
      }
      return cb(null, text)
    })
  }
  return cb(null, text)
}

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
