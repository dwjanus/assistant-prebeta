import Promise from 'bluebird'
import samanage from '../samanage/ebu-api.js'
import responses from './responses/responses.js'

// consts for intent map
const GOOGLE_ASSISTANT_WELCOME = 'input.welcome'
const THANK_YOU = 'general.thankyou'
const CANCEL = 'general.cancel'
const KNOWLEDGE_NO_CONTEXT = 'general.knowledge-nocontext'
const KNOWLEDGE_FROM_SINGLE = 'general.knowledge'
const MULTIPLE_RECORDS_NO_CONTEXT = 'general.multirecords-nocontext'
const MULTIPLE_RECORDS_FROM_WELCOME = 'welcome.multi-record'
const SINGLE_FROM_MULTI = 'query.single-from-multi'
const METRICS = 'general.metrics'
const SINGLE_RECORD_DETAILS = 'query.single-record-details'
const SINGLE_RECORD_NO_CONTEXT = 'query.single-record-nocontext'
const SINGLE_RECORD_CHANGE = 'command.single-record-change'
const SINGLE_RECORD_CHANGE_NO_CONTEXT = 'command.single-record-change-no-context'
const CREATE_TICKET_FROM_KNOWLEDGE = 'create.newticket-knowledge'
const CREATE_TICKET_DETAILS = 'create.newticket-details'
const CREATE_TICKET_NO_CONTEXT = 'create.newticket-nocontext'
const CREATE_TICKET_DENY = 'deny.newticket'
const POST_COMMENT_FROM_SINGLE_CONFIRMED = 'confirm.post-comment'
const POST_COMMENT_FROM_SINGLE_DENY = 'deny.post-comment'
const POST_COMMENT_BODY = 'comment.body'
const POST_COMMENT_VERIFY_CONFIRM = 'create.comment'
const POST_COMMENT_VERIFY_NEWBODY = 'comment.verify-newbody'
const POST_COMMENT_VERIFY_DENY = 'comment.verify-deny'
const VIEW_FEED_FROM_COMMENTS_LIST = 'comment.viewfeed'
const VIEW_FEED_FROM_SINGLE_CONFIRMED = 'confirm.viewfeed'
const VIEW_FEED_FROM_SINGLE_DENY = 'deny.viewfeed'
const POST_FEED_COMMENT_CONFIRMED = 'confirm.post-feedcomment'
const POST_FEED_COMMENT_DENY = 'deny.post-feedcomment'
const POST_FEED_COMMENT_BODY = 'feedcomment.body'
const POST_FEED_COMMENT_VERIFY_CONFIRM = 'create.feedcomment'
const POST_FEED_COMMENT_VERIFY_NEWBODY = 'feedcomment.verify-newbody'
const POST_FEED_COMMENT_VERIFY_DENY = 'feedcomment.verify-deny'
const RESOLVE_CLOSE_DESCRIPTION_CONFIRM = 'confirm.resolution-description'
const RESOLVE_CLOSE_DESCRIPTION_SET = 'set.resolution-description'
const RESOLVE_CLOSE_VERIFY_CONFIRM = 'resolveclose.verify-confirm'
const RESOLVE_CLOSE_VERIFY_NEWFIELDS = 'resolveclose.verify-newfields'
const RESOLVE_CLOSE_VERIFY_DENY = 'resolveclose.verify-deny'
const CONFIG_SMS_START = 'config.sms-start'
const CONFIG_SMS_REJECT = 'config.sms-reject'
const CONFIG_SMS_NUMBER_CONFIRMED = 'config.sms-number-confirmed'
const CONFIG_SMS_NUMBER_INCORRECT = 'config.sms-number-incorrect'

// eventually make contextual intent of knowledge route to same function and pull subject from
// context provided in conversation i.e. "Are there any articles on that?"
const actionMap = new Map()
actionMap.set(GOOGLE_ASSISTANT_WELCOME, responses.welcome)
actionMap.set(THANK_YOU, responses.thankyou)
actionMap.set(CANCEL, responses.cancel)
actionMap.set(KNOWLEDGE_NO_CONTEXT, responses.knowledge)
actionMap.set(KNOWLEDGE_FROM_SINGLE, responses.knowledge)
actionMap.set(MULTIPLE_RECORDS_NO_CONTEXT, responses.multi_nocontext)
actionMap.set(MULTIPLE_RECORDS_FROM_WELCOME, responses.multi_welcome)
actionMap.set(SINGLE_FROM_MULTI, responses.single_fromMulti)
actionMap.set(METRICS, responses.metrics)
actionMap.set(SINGLE_RECORD_DETAILS, responses.single_details)
actionMap.set(SINGLE_RECORD_NO_CONTEXT, responses.single_nocontext)
actionMap.set(SINGLE_RECORD_CHANGE, responses.single_change)
actionMap.set(SINGLE_RECORD_CHANGE_NO_CONTEXT, responses.single_change_nocontext)
actionMap.set(CREATE_TICKET_FROM_KNOWLEDGE, responses.createTicket_knowledge)
actionMap.set(CREATE_TICKET_DETAILS, responses.createTicket_details)
actionMap.set(CREATE_TICKET_NO_CONTEXT, responses.createTicket_nocontext)
actionMap.set(CREATE_TICKET_DENY, responses.createTicket_deny)
actionMap.set(POST_COMMENT_FROM_SINGLE_CONFIRMED, responses.single_postcomment_confirm)
actionMap.set(POST_COMMENT_FROM_SINGLE_DENY, responses.single_postcomment_deny)
actionMap.set(POST_COMMENT_BODY, responses.single_postcomment_body)
actionMap.set(POST_COMMENT_VERIFY_CONFIRM, responses.single_postcomment_verify_confirm)
actionMap.set(POST_COMMENT_VERIFY_NEWBODY, responses.single_postcomment_verify_newbody)
actionMap.set(POST_COMMENT_VERIFY_DENY, responses.single_postcomment_verify_deny)
actionMap.set(VIEW_FEED_FROM_COMMENTS_LIST, responses.comments_viewfeed)
actionMap.set(VIEW_FEED_FROM_SINGLE_CONFIRMED, responses.single_viewfeed_confirmed)
actionMap.set(VIEW_FEED_FROM_SINGLE_DENY, responses.single_viewfeed_deny)
actionMap.set(POST_FEED_COMMENT_CONFIRMED, responses.single_postfeed_confirm)
actionMap.set(POST_FEED_COMMENT_DENY, responses.single_postfeed_deny)
actionMap.set(POST_FEED_COMMENT_BODY, responses.single_postfeed_body)
actionMap.set(POST_FEED_COMMENT_VERIFY_CONFIRM, responses.single_postfeed_verify_confirm)
actionMap.set(POST_FEED_COMMENT_VERIFY_NEWBODY, responses.single_postfeed_verify_newbody)
actionMap.set(POST_FEED_COMMENT_VERIFY_DENY, responses.single_postfeed_verify_deny)
actionMap.set(RESOLVE_CLOSE_DESCRIPTION_CONFIRM, responses.resolveclose_desc_confirm)
actionMap.set(RESOLVE_CLOSE_DESCRIPTION_SET, responses.resolveclose_desc_set)
actionMap.set(RESOLVE_CLOSE_VERIFY_CONFIRM, responses.resolveclose_verify_confirm)
actionMap.set(RESOLVE_CLOSE_VERIFY_NEWFIELDS, responses.resolveclose_verify_newfields)
actionMap.set(RESOLVE_CLOSE_VERIFY_DENY, responses.resolveclose_verify_deny)
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
