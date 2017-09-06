import util from 'util'
import Promise from 'bluebird'
import samanage from '../samanage/ebu-api.js'
import responses from './responses/responses.js'

// consts for intent map
const GOOGLE_ASSISTANT_WELCOME = 'input.welcome'
const KNOWLEDGE_NO_CONTEXT = 'general.knowledge-nocontext'
const CREATE_TICKET_FROM_KNOWLEDGE = 'create.newticket-knowledge'
const CREATE_TICKET_DETAILS = 'create.newticket-details'
const CONFIG_SMS_START = 'config.sms-start'
const CONFIG_SMS_REJECT = 'config.sms-reject'
const CONFIG_SMS_NUMBER_CONFIRMED = 'config.sms-number-confirmed'
const CONFIG_SMS_NUMBER_INCORRECT = 'config.sms-number-incorrect'

// eventually make contextual intent of knowledge rout to same function and pull subject from
// context provided in conversation
const actionMap = new Map()
actionMap.set(GOOGLE_ASSISTANT_WELCOME, responses.welcome)
actionMap.set(KNOWLEDGE_NO_CONTEXT, responses.knowledge)
actionMap.set(CREATE_TICKET_FROM_KNOWLEDGE, responses.createTicket_knowledge)
actionMap.set(CREATE_TICKET_DETAILS, responses.createTicket_details)
actionMap.set(CONFIG_SMS_START, responses.configSMS_start)
actionMap.set(CONFIG_SMS_REJECT, responses.configSMS_reject)
actionMap.set(CONFIG_SMS_NUMBER_CONFIRMED, responses.configSMS_number_confirmed)
actionMap.set(CONFIG_SMS_NUMBER_INCORRECT, responses.configSMS_number_incorrect)

export default ((app, user) => {
  console.log(`--> ebu assistant handler started for user: ${user.user_id}`)
  const intent = app.getIntent()
  const context = app.getContext(intent)
  console.log(`    current context: ${util.inspect(context)}`)
  console.log(`    current intent: ${util.inspect(intent)}`)
  const action = actionMap.get(app.getIntent())
  const promisedAction = Promise.promisify(action)

  samanage(user.user_id).then((ebu) => {
    promisedAction({ app, ebu, user }).then((result) => {
      app.ask(result)
    })
  })
  .catch(err => console.log(err))
})
