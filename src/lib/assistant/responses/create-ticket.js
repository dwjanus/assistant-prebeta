import db from '../../../config/db.js'
import util from 'util'

const query = db.querySql

exports.createTicket_knowledge = (args, cb) => {
  console.log('--> inside createTicket -- entry')

  const app = args.app
  const subject = app.getArgument('Subject')
  const text = `Sure thing! So far I have ${subject} as the subject for your incident. If you ` +
    'would like to change the subject, add a description, set the priority, or anything else, ' +
    'simply tell me what field values you would like. Or I can submit with defaults.'

  return cb(null, text)
}

exports.createTicket_details = (args, cb) => {
  console.log('--> inside createTicket -- details')
  const user = args.user
  const ebu = args.ebu
  const app = args.app
  const subject = app.getArgument('Subject')
  const description = app.getArgument('Description')
  const priority = app.getArgument('Priority')
  const returnType = app.getArgument('returnType')
  const options = {
    Subject: subject,
    SamanageESD__RequesterUser__c: user.sf_id,
    Origin: 'Samanage Assistant'
  }
  let text = 'Excellent, I am submitting your ticket now - '

  if (priority) options.Priority = priority
  if (description) options.Descriptions = description

  console.log(`returnType:\n${util.inspect(returnType)}`)
  console.log(`context argument: ${util.inspect(app.getContextArgument('newticket-details', 'Subject'))}`)

  return ebu.createIncident(options).then((newCaseId) => {
    console.log(`--> newCaseId: ${newCaseId}`)
    const updateUserQry = `UPDATE users SET latestCreatedTicket = '${newCaseId}' WHERE user_id = '${user.user_id}'`

    if (!user.receiveSMS) {
      text += 'you have no options set for SMS updates, would you like to receive notifactions on your tickets via text message?'
      app.setContext('newticket-notifysms') // may have to return cb(null, { text app })
    }

    if (user.receiveSMS === true || 'true') {
      text += `notifications via SMS will be sent to ${user.MobilePhone}`
      // .then(() => twilioNotify(newCaseId).then)send newCaseId to twilio handler for sms
      return query(updateUserQry).then(() => cb(null, text))
    }

    return query(updateUserQry).then(() => cb(null, text))
  })
  .catch((err) => {
    cb(err, null)
  })
}
