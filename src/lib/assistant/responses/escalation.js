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
  console.log(`options: ${util.inspect(options)}`)
  return ebu.singleRecord(options).then((case) => {
    console.log(`\n--> Case: ${util.inspect(case)}`);
  })
}