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
  const options = {
    Subject: subject,
    SamanageESD__RequesterUser__c: user.sf_id,
    Origin: 'Samanage Assistant'
  }
  let text = 'Excellent, I am submitting your ticket now - '

  if (priority) options.Priority = priority
  if (description) options.Descriptions = description

  console.log(`${util.inspect(app.getContextArgument('newticket-details', 'Subject'))}`)

  return ebu.createIncident(options).then((newCaseId) => {
    console.log(`--> newCaseId: ${newCaseId}`)
    const updateUserQry = `UPDATE users SET latestCreatedTicket = '${newCaseId}' WHERE user_id = '${user.user_id}'`

    if (!user.receiveSMS) {
      text += 'you have no options set for SMS, if you would like to receive ' +
      'text notifications on your incidents simply say so.'
    }
    if (user.receiveSMS === false) text += 'you will be notified of updates via email.'
    else {
      // send newCaseId to twilio handler for sms
      text += 'you will receive updates via SMS and email'
    }
    return query(updateUserQry).then(() => cb(null, text))
  })
  .catch((err) => {
    cb(err, null)
  })
}
