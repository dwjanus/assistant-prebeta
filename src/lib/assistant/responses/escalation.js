import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'
import dateFormat from 'dateformat'

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
      let RecordType = app.getArgument('record-type')
      text += `I found ${record.RecordType} # ${record.CaseNumber}\n`
      let now = new Date()
      let escalationOptions = {
        Id: record.Id,
        SamanageESD__EscalationReason__c: app.getArgument('EscalationReason'),
        SamanageESD__EscalationDescription__c: app.getArgument('EscalationDescription'),
        IsEscalated: true,
        SamanageESD__HasBeenEscalated__c: true,
        Status: 'Escalated',
        SamanageESD__Escalated_Date__c: dateFormat(now, 'isoDateTime'),
        SamanageESD__Escalated_By__c: user.sf_id,
      }
      console.log(`Escalation Options: ${util.inspect(escalationOptions)}`)
      return ebu.update(escalationOptions).then((result) => {
        text += `${record.RecordType} #${record.CaseNumber} has been escalated` // edit later
        return cb(null, text)
      })
      console.log(`Result: ${result}`)
    }
    else {
      text += `I could not find ${searchParams.RecordType} number ${searchParams.CaseNumber}`
    }
    return cb(null, text)
  })
}