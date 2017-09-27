import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'

const query = db.querySql

exports.createTicket_knowledge = (args, cb) => {
  console.log('--> inside createTicket -- entry')

  const app = args.app
  const temp = 'Blah'
  const subject = app.request_.IncomingMessage.body.originalRequest
  const text = `Sure thing! So far I have ${temp} as the subject for your incident. If you ` +
    'would like to change the subject, add a description, set the priority, or anything else, ' +
    'simply tell me what field values you would like. Or I can submit with defaults.'

  console.log(`--> subject: ${util.inspect(subject)}`)
  return cb(null, text)
}

exports.createTicket_details = (args, cb) => {
  console.log('--> inside createTicket -- details')
  const user = args.user
  const ebu = args.ebu
  const app = args.app
  const returnType = app.getArgument('return-type')
  let options = {
    Subject: app.getArgument('Subject'),
    SamanageESD__RequesterUser__c: user.sf_id,
    Description: app.getArgument('Description'),
    Priority: app.getArgument('Priority'),
    Origin: 'Samanage Assistant'
  }
  let text = 'Excellent, I am submitting your ticket now. '

  options = _.omitBy(options, _.isNil)

  console.log(`> options:\n${util.inspect(options)}`)
  console.log(`> returnType:\n${util.inspect(returnType)}`)

  return ebu.createIncident(options).then((newCase) => {
    console.log(`--> created new case ${newCase.id}`)
    const updateUserQry = `UPDATE users SET lastRecord = '${JSON.stringify(newCase)}' WHERE user_id = '${user.user_id}'`

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

exports.createTicket_deny = (args, cb) => {
  console.log('--> inside createTicket -- deny')

  const text = 'Sounds good, just let me know if you need anything'
  return cb(null, text)
}
