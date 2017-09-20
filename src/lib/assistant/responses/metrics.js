import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'


const query = db.querySql

exports.metrics = (args, cb) => {
  console.log(`\n--> inside metrics`)
  console.log(`\n--> ${util.inspect(args)}`)
  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let text = 'No tickets have been found'
  let options = {
    Status: app.getArgument('Status'),
    Priority: app.getArgument('Priority'),
    RecordType: app.getArgument('record-type'),
    DatePeriod: app.getArgument('date-period'),
  }
  // default options
  if (app.getArgument('Assignee') === 'Self') options.OwnerId = user.sf_id
  if (!app.getArgument('record-type')) options.RecordType = 'Incident'

  options = _.omitBy(options, _.isNil)

  console.log(`options: ${util.inspect(options)}`)

  return ebu.metrics(options).then((records) => {
    console.log('--> records returned from ebu api')
    if (records) {
      if (records.length > 1) {
        text = `here are ${records.length} `
        if (app.getArgument('yesno')) text = `Yes, t${text}`
        else text = `T${text}`
        if (options.Status) text += `${options.Status} `
        if (options.Priority) text += `${options.Priority} priority `
        text += `${options.RecordType}s. The most recently active being ${options.RecordType} ` +
       `${records[0].CaseNumber}: ${records[0].Subject}`
      } else {
        text = `All I found was ${options.RecordType} ${records[0].CaseNumber}: ${records[0].Subject}`
      }
    }
    return cb(null, text)
  })
}