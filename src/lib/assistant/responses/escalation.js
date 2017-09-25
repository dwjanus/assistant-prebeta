import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'

const query = db.querySql

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

  if (!app.getArgument('record-type')) options.RecordType = 'Incident'

  options = _.omitBy(options, _.isNil)
  console.log(`options: ${util.inspect(options)}`)

  return ebu.singleRecord(options).then((record) => {
    console.log(`\n--> Case: ${util.inspect(record)}`);

    return cb(null, text)
  })
  .catch((err) => {
    cb(err, null)
  })
}