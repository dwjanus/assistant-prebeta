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

  if (!app.getArgument('record-type')) searchParams.RecordType = 'Incident'

  searchParams = _.omitBy(searchParams, _.isNil)
  console.log(`\n--> app.getArgument searchParams: ${util.inspect(searchParams)}`)


  return ebu.singleRecord(searchParams).then((record) => {
    console.log(`\n--> record returned from ebu api`)
    if (record) {
      console.log(`Escalation records: ${util.inspect(record)}`)
      text += `I found ${searchParams.RecordType} # ${record.CaseNumber}\n`
      let escalationOptions = {
        Id: record.Id,
        SamanageESD__EscalationReason__c: 'Other', // app.getArgument('EscalationReason'),
        SamanageESD__EscalationDescription__c: 'Other', // app.getArgument('EscalationDescription')
      }
      let update_result = ebu.update(escalationOptions).then((result) => {
        console.log(`Inside escalation update: ${util.inspect(result)}`)
        text += `Escalation complete` // edit later
        return cb(null, text)
      })
      console.log(`Result was: ${util.inspect(Promise.resolve(update_result))}`)
    }
    else {
      text += `I could not find ${searchParams.RecordType} number ${searchParams.CaseNumber}`
    }
    return cb(null, text)
  })
}