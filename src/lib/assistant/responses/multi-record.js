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

  // const Subject = app.getArgument('Subject')
  // const Status = app.getArgument('Status')
  // const Priority = app.getArgument('Priority')
  // const SamanageESD__OwnerName__c = app.getArgument('Owner')
  // const SamanageESD__Assignee_Name__c = app.getArgument('Assignee')
  // const RecordType = app.getArgument('record-type')

  let options = {
    Subject: app.getArgument('Subject'),
    Status: app.getArgument('Status'),
    Priority: app.getArgument('Priority'),
    SamanageESD__Assignee_Name__c: app.getArgument('Assignee'),
    RecordType: app.getArgument('record-type')
  }

  if (app.getArgument('Assignee') === 'Self') options.SamanageESD__Assignee_Name__c = user.Name

  options = _.omitBy(options, _.isNil)

  console.log(`options: ${util.inspect(options)}`)

  return ebu.multiRecord(options).then((records) => {
    console.log('--> records returned from ebu api')
    text = `I found ${records.length} ${options.RecordType} matching your description`
    return cb(null, text)
  })
}
