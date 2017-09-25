import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'
import dateFormat from 'dateformat'


const query = db.querySql

exports.metrics = (args, cb) => {
  console.log(`\n--> inside metrics`)
  console.log(`\n--> ${util.inspect(args)}`)
  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let text = 'No tickets have been found'
  let options = {
    RecordType: app.getArgument('record-type'),
    DatePeriod: app.getArgument('date-period'),
    StatusChange: app.getArgument('StatusChange')
  }
  let escalation_options = {
    EscalationReason: app.getArgument('EscalationReason'),
    EscalationDescription: app.getArgument('EscalationDescription')
  }
  console.log(`\n--> [metrics] options: ${util.inspect(options)}`)
  // default options
  if (app.getArgument('Assignee') === 'Self') options.OwnerId = user.sf_id
  if (!app.getArgument('record-type')) options.RecordType = 'Incident'

  options = _.omitBy(options, _.isNil)

  return ebu.metrics(options).then((records) => {
    console.log(`\n--> records returned from ebu api`)
    let startClosedDate = dateFormat(options.DatePeriod.split('/')[0],'fullDate')
    let endClosedDate = dateFormat(options.DatePeriod.split('/')[1],'fullDate')
    if (!_.isEmpty(records)) {
      if (records.length > 1) {
        text = `${records.length} ${options.RecordType}s were ${options.StatusChange} between ${startClosedDate} and ${endClosedDate} `
        if (app.getArgument('yesno')) text = `Yes, ${text}`
        text += `The most recently active being ${options.RecordType} ` +
       `${parseInt(records[0].CaseNumber, 10)}: ${records[0].Subject}`
      } else {
        text = `I found ${options.RecordType} ${records[0].CaseNumber}: ${records[0].Subject}`
      }
    } else {
      text = `No ${options.RecordType}s were ${options.StatusChange} between ${startClosedDate} and ${endClosedDate}`
    }
    return cb(null, text)
  })
}