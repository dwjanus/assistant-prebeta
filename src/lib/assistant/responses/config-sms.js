import db from '../../../config/db.js'

const query = db.querySql

exports.configSMS_start = (args, cb) => {
  console.log('--> inside configSMS -- start')

  const user = args.user
  let text = 'Gladly! '
  if (user.MobilePhone) {
    text += `I have your mobile number listed as ${user.MobilePhone}, is this correct? If not ` +
      'simply tell me the right number in your response.'
  } else {
    text += 'But first, what is your mobile number?'
  }

  return cb(null, text, args.app)
}

exports.configSMS_reject = (args, cb) => {
  console.log('--> inside configSMS -- reject')

  const text = 'No worries, feel free let me know if you would like to change this setting in the future.'
  return cb(null, text, args.app)
}

exports.configSMS_number_confirmed = (args, cb) => {
  console.log('--> inside configSMS -- number_confirmed')

  const user = args.user
  const updateUserQry = `UPDATE users SET receiveSMS = 'true' WHERE user_id = '${user.user_id}'`
  const text = `Right on, updates will be sent to ${user.MobilePhone}`

  return query(updateUserQry).then(() => cb(null, text, args.app))
  .catch(err => cb(err, null, args.app))
}

exports.configSMS_number_incorrect = (args, cb) => {
  console.log('--> inside configSMS -- number_incorrect')

  const user = args.user
  const app = args.app
  const phoneNumber = app.getArgument('phone-number')
  const updateUserQry = `UPDATE users SET MobilePhone = '${phoneNumber}' WHERE user_id = '${user.user_id}'`
  const text = `I am saving your phone number as ${phoneNumber}, that cool with you?`

  console.log(`   got phone number from arguments: ${phoneNumber}`)

  return query(updateUserQry).then(() => cb(null, text, app))
  .catch(err => cb(err, null, app))
}
