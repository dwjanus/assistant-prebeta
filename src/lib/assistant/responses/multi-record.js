import db from '../../../config/db.js'
import util from 'util'

const query = db.querySql

exports.multi_nocontext = (args, cb) => {
  console.log('--> inside multi -- nocontext')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const text = 'Multi Record Intent recognized! This is where youd get a list of stuff'

  // this is a test
  const params1 = app.getArgument('Multiple Records - No Context')
  const params2 = app.getArgument('general.multirecords-nocontext')
  const params3 = app.getArgument('records')

  console.log('Parameter Gathering Test Results:')
  console.log(`${util.inspect(params1)}`)
  console.log(`${util.inspect(params2)}`)
  console.log(`${util.inspect(params3)}`)

  return cb(null, text)
}
