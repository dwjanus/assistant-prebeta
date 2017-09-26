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
  console.log(`\n--> ${util.inspect(args)}`)
  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let text = ''
  let options = {
    CaseNumber: app.getArgument('CaseNumber'),
    RecordType: app.getArgument('record-type')
  }
  let escalation_options = {
    CaseNumber: app.getArgument('CaseNumber'),
    RecordType: app.getArgument('record-type'),
    EscalationReason: app.getArgument('EscalationReason'),
    EscalationDescription: app.getArgument('EscalationDescription')
  }

  if (!app.getArgument('record-type')) options.RecordType = 'Incident'

  options = _.omitBy(options, _.isNil)
  console.log(`options: ${util.inspect(options)}`)
  console.log(`\n--> escalation_options: ${util.inspect(escalation_options)}`)

  return ebu.singleRecord(options).then((record) => {
    console.log(`\n--> record returned from ebu api`)
    if (record) {
      console.log(`Escalation records: ${util.inspect(record)}`)
      text += `I found ${options.RecordType} # ${record.CaseNumber}\n`
      return ebu.update(escalation_options).then((result) => {
        console.log(`Inside escalation update: ${util.inspect(result)}`)
        text += `Escalation complete` // edit later
        return cb(null, text)
      })
    }
    else {
      text += `I could not find ${options.RecordType} number ${options.CaseNumber}`
    }
    return cb(null, text)
  })
}