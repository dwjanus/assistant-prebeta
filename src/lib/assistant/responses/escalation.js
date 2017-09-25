import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'

const query = db.querySql

exports.agent = (args, cb) => {
  console.log(`\n--> Inside escalate.agent`)
  console.log(`\n--> ${util.inspect(args)}`)
  const app = args.app
  const ebu = args.ebu
  const user = args.user

}

exports.requester = (args, cb) => {
  console.log(`\n--> Inside escalate.requester`)
  console.log(`\n--> ${util.inspect(args)}`)
  const app = args.app
  const ebu = args.ebu
  const user = args.user

}