import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'

const query = db.querySql

exports.multi_nocontext = (args, cb) => {
  console.log('\n--> inside multi -- nocontext')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let text = ''
  let options = {
    Subject: app.getArgument('Subject'),
    Status: app.getArgument('Status'),
    Priority: app.getArgument('Priority'),
    SamanageESD__Assignee_Name__c: app.getArgument('Assignee'),
    RecordType: app.getArgument('record-type')
  }

  // default options
  if (!app.getArgument('Assignee') || app.getArgument('Assignee') === 'Self') options.SamanageESD__Assignee_Name__c = user.Name
  if (!app.getArgument('record-type')) options.RecordType = 'Incident'

  options = _.omitBy(options, _.isNil)

  console.log(`options: ${util.inspect(options)}`)

  return ebu.multiRecord(options).then((records) => {
    console.log('--> records returned from ebu api')
    text = 'I\'m sorry, I was unable to find any records matching your description.'

    if (records.length > 1) {
      text = `${records.length} ${options.RecordType}s matching your description. ` +
      `The most recently active being ${options.RecordType} ${records[0].CaseNumber}: ${records[0].Subject}`
    } else {
      text = `All I found was ${options.RecordType} ${records[0].CaseNumber}: ${records[0].Subject}`
    }

    return cb(null, text)
  })
}
