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

  // default options
  if (!app.getArgument('Assignee') || app.getArgument('Assignee') === 'Self') options.SamanageESD__Assignee_Name__c = user.Name
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
        text = `${options.RecordType} ${record.CaseNumber} - ${record.Subject} / Priority: ${record.Priority} / Status: ${record.Status} ` +
        `Description: ${record.Description}`
      }

      const saveRecordStr = `UPDATE users SET lastRecord = JSON_OBJECT('Id', '${record.Id}', 'Subject', '${record.Subject}', ` +
        `'Description', '${record.Description}', 'CreatedDate', '${record.CreatedDate}', 'CaseNumber', '${record.CaseNumber}', ` +
        `'SamanageESD__OwnerName__c', '${record.SamanageESD__OwnerName__c}', 'SamanageESD__Assignee_Name__c', '${record.SamanageESD__Assignee_Name__c}', ` +
        `'Priority', '${record.Priority}', 'Status', '${record.Status}', 'SamanageESD__hasComments__c', '${record.SamanageESD__hasComments__c}', ` +
        `'HasCommentsUnreadByOwner', '${record.HasCommentsUnreadByOwner}', 'Last_Comment__c', '${record.Last_Comment__c}', ` +
        `'RecordTypeId', '${record.RecordTypeId}')`

      return query(saveRecordStr).then(() => {
        if (app.getArgument('yesno') && record) text = `Yes, ${text}`
        return cb(null, text)
      })
    }

    if (app.getArgument('yesno')) text = `No, ${text}`
    return cb(null, text)
  })
  .catch((err) => {
    return cb(err, null)
  })
}

exports.single_details = (args, cb) => {
  console.log('\n--> inside single -- details')

  const app = args.app
  const user = args.user
  const returnType = app.getArgument('return-type')
  let text = 'I\'m sorry, I seem to have lost what record this is related to. Try asking again with the case number included'
  const selectRecordStr = `SELECT lastRecord from users WHERE user_id = '${user.user_id}'`

  return query(selectRecordStr).then((record) => {
    console.log(`--> got our contextually saved record!\n${util.inspect(record)}`)
    if (record) {
      text = `The ${returnType} is currently ${record[returnType]}`
    }
    return cb(null, text)
  })
  .catch((err) => {
    return cb(err, null)
  })
}

exports.single_change = (args, cb) => {
  console.log('\n--> inside single -- change')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let returnType = app.getArgument('return-type')
  let options = {
    Status: app.getArgument('Status'),
    Priority: app.getArgument('Priority')
  }
  // const selectCurrentRecordStr = `SELECT lastRecord (as JSON) from users WHERE user_id = '${user.user_id}'`

  options = _.omitBy(options, _.isNil)
  if (!returnType || returnType === 'undefined') returnType = _.keys(options)[0]

  const latestRecord = JSON.parse(user.latestRecord)
  console.log(`--> record after jsonify:\n${util.inspect(latestRecord)}`)
  options.Id = latestRecord.Id
  return ebu.update(options).then(() => {
    const text = `No problem, I have updated the ${returnType} to ${options[returnType]}`
    return cb(null, text)
  })
  .catch((err) => {
    return cb(err, null)
  })
}

// need to add single_change_nocontext!!
