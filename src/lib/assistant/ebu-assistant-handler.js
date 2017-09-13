import Promise from 'bluebird'
import samanage from '../samanage/ebu-api.js'
import responses from './responses/responses.js'

// consts for intent map
const GOOGLE_ASSISTANT_WELCOME = 'input.welcome'
const KNOWLEDGE_NO_CONTEXT = 'general.knowledge-nocontext'
const MULTIPLE_RECORDS_NO_CONTEXT = 'general.multirecords-nocontext'
const SINGLE_RECORD_DETAILS = 'query.single-record-details'
const SINGLE_RECORD_NO_CONTEXT = 'query.single-record-nocontext'
const SINGLE_RECORD_CHANGE = 'command.single-record-change'
const CREATE_TICKET_FROM_KNOWLEDGE = 'create.newticket-knowledge'
const CREATE_TICKET_DETAILS = 'create.newticket-details'
const CREATE_TICKET_NO_CONTEXT = 'create.newticket-nocontext'
const CREATE_TICKET_DENY = 'deny.newticket'
const CONFIG_SMS_START = 'config.sms-start'
const CONFIG_SMS_REJECT = 'config.sms-reject'
const CONFIG_SMS_NUMBER_CONFIRMED = 'config.sms-number-confirmed'
const CONFIG_SMS_NUMBER_INCORRECT = 'config.sms-number-incorrect'

// eventually make contextual intent of knowledge route to same function and pull subject from
// context provided in conversation i.e. "Are there any articles on that?"
const actionMap = new Map()
actionMap.set(GOOGLE_ASSISTANT_WELCOME, responses.welcome)
actionMap.set(KNOWLEDGE_NO_CONTEXT, responses.knowledge)
actionMap.set(MULTIPLE_RECORDS_NO_CONTEXT, responses.multi_nocontext)
actionMap.set(SINGLE_RECORD_DETAILS, responses.single_details)
actionMap.set(SINGLE_RECORD_NO_CONTEXT, responses.single_nocontext)
actionMap.set(SINGLE_RECORD_CHANGE, responses.single_change)
actionMap.set(CREATE_TICKET_FROM_KNOWLEDGE, responses.createTicket_knowledge)
actionMap.set(CREATE_TICKET_DETAILS, responses.createTicket_details)
actionMap.set(CREATE_TICKET_NO_CONTEXT, responses.createTicket_nocontext)
actionMap.set(CREATE_TICKET_DENY, responses.createTicket_deny)
actionMap.set(CONFIG_SMS_START, responses.configSMS_start)
actionMap.set(CONFIG_SMS_REJECT, responses.configSMS_reject)
actionMap.set(CONFIG_SMS_NUMBER_CONFIRMED, responses.configSMS_number_confirmed)
actionMap.set(CONFIG_SMS_NUMBER_INCORRECT, responses.configSMS_number_incorrect)

export default ((app, user) => {
  const action = actionMap.get(app.getIntent())
  const promisedAction = Promise.promisify(action)

  console.log(`--> ebu assistant handler started for user: ${user.user_id}`)

  samanage(user.user_id).then((ebu) => {
    promisedAction({ app, ebu, user }).then((result) => {
      app.ask(result)
    })
  })
  .catch(err => console.log(err))
})
