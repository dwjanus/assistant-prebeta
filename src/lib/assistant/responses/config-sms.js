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

  return cb(null, text)
}

exports.configSMS_number = (args, cb) => {
  console.log('--> inside configSMS -- number')

  const user = args.user
  const app = args.app
  const yesno = app.getArgument('yes-no')

  let phoneNumber = app.getArgument('MobilePhone')
  console.log(`   got phone number: ${phoneNumber}`)
  let updateUserQry = 'UPDATE users SET receiveSMS = \'true\''

  if (phoneNumber || yesno !== 'yes') updateUserQry += `, MobilePhone = '${phoneNumber}'`
  else phoneNumber = user.MobilePhone
  console.log(`   phone number: ${phoneNumber}`)
  updateUserQry += ` WHERE user_id = '${user.user_id}'`

  const text = `Right on, updates will be sent to ${phoneNumber}`

  query(updateUserQry).then(() => cb(null, text)) // here we would call the twilio function
  .catch(err => cb(err, null))
}
