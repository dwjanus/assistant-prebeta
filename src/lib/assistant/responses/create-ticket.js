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
  const returnType = app.getArgument('return-type')
  const options = {
    Subject: subject,
    SamanageESD__RequesterUser__c: user.sf_id,
    Origin: 'Samanage Assistant'
  }
  let text = 'Excellent, I am submitting your ticket now. '

  if (priority) options.Priority = priority
  if (description) options.Descriptions = description

  console.log(`returnType:\n${util.inspect(returnType)}`)
  console.log(`context argument: ${util.inspect(app.getContextArgument('newticket-details', 'Subject'))}`)

  return ebu.createIncident(options).then((newCase) => {
    console.log(`--> created new case ${newCase.id}`)
    const updateUserQry = `UPDATE users SET latestCreatedTicket = '${newCase.id}' WHERE user_id = '${user.user_id}'`

    if (!user.receiveSMS) {
      text += 'You have no option set for SMS updates, would you like to receive text notifactions on your tickets?'
      app.setContext('newticket-notifysms')
      return query(updateUserQry).then(() => cb(null, text))
    } else if (user.receiveSMS === true || 'true') {
      text += `notifications via SMS will be sent to ${user.MobilePhone}`
      // send newCase to twilio handler for sms...
      // .then(() => twilioNotify(newCase).then)
      return query(updateUserQry).then(() => cb(null, text))
    }

    text += `You can view the details of your new incident at ${newCase.link}`
    return query(updateUserQry).then(() => cb(null, text))
  })
  .catch((err) => {
    cb(err, null)
  })
}

exports.createTicket_nocontext = (args, cb) => {
  console.log('--> inside createTicket -- nocontext')

  const app = args.app
  const Subject = app.getArgument('Subject')
  const Description = app.getArgument('Description')
  const Priority = app.getArgument('Priority')
  let text = `Sure thing! I'm about to submit your ticket for "${Subject}"`

  if (Description) text += ` with a description: "${Description}"`
  if (Priority) text += ` and make it ${Priority} priority`

  text += '. You can make changes now or I can go ahead and submit'

  return cb(null, text)
}
