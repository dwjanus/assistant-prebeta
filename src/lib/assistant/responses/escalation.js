import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'

const query = db.querySql
// Escalation Fields:
// SamanageESD__EscalationDescription__c
// SamanageESD__EscalationReason__c
// SamanageESD__EscalationUser__c
// SamanageESD__Escalated_By__c
// SamanageESD__Escalated_Date__c
// SamanageESD__Escalated_To__c

exports.escalation = (args, cb) => {

  console.log(`\n--> Inside escalate`)
  // console.log(`\n--> ${util.inspect(args)}`)
  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let text = ''
  let searchParams = {
    CaseNumber: app.getArgument('CaseNumber'),
    RecordType: app.getArgument('record-type'),
  }
  let escalationOptions = {
    RecordType: app.getArgument('record-type'),
    CaseNumber: app.getArgument('CaseNumber'),
    SamanageESD__EscalationReason__c: app.getArgument('EscalationReason'),
    SamanageESD__EscalationDescription__c: app.getArgument('EscalationDescription')
  }

  if (!app.getArgument('record-type')) searchParams.RecordType = 'Incident'
  if (!app.getArgument('record-type')) escalationOptions.RecordType = 'Incident'

  searchParams = _.omitBy(searchParams, _.isNil)
  escalationOptions = _.omitBy(escalationOptions, _.isNil)

  console.log(`\n--> app.getArgument searchParams: ${util.inspect(searchParams)}`)
  console.log(`\n--> escalationOptions: ${util.inspect(escalationOptions)}`)

  return ebu.singleRecord(searchParams).then((record) => {
    console.log(`\n--> record returned from ebu api`)
    if (record) {
      console.log(`Escalation records: ${util.inspect(record)}`)
      text += `I found ${searchParams.RecordType} # ${record.CaseNumber}\n`
      let result = ebu.update(escalationOptions).then((result) => {
        console.log(`Inside escalation update: ${util.inspect(result)}`)
        text += `Escalation complete` // edit later
        return cb(null, text)
      })
      console.log(`Result was: ${util.inspect(result)}`)
    }
    else {
      text += `I could not find ${searchParams.RecordType} number ${searchParams.CaseNumber}`
    }
    return cb(null, text)
  })
}