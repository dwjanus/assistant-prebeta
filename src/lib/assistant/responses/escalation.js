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

exports.agent = (args, cb) => {

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
    EscalationReason: app.getArgument('EscalationReason'),
    EscalationDescription: app.getArgument('EscalationDescription')
  }

  if (!app.getArgument('record-type')) options.RecordType = 'Incident'

  options = _.omitBy(options, _.isNil)
  console.log(`options: ${util.inspect(options)}`)
  console.log(`\n--> [metrics] escalation_options: ${util.inspect(escalation_options)}`)

  return ebu.singleRecord(options).then((record) => {
    console.log(`\n--> record returned from ebu api`)
    if (record) {
      console.log(`Escalation records: ${util.inspect(record)}`)
      text += 'Found a record'
    }
    else {
      text += `I could not find ${options.RecordType} number ${options.CaseNumber}`
    }
    return cb(null, text)
  })
}