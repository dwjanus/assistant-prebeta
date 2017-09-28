import welcome from './welcome.js'
import knowledge from './knowledge.js'
import multiRecord from './multi-record.js'
import { metrics } from './metrics.js'
import singleRecord from './single-record.js'
import comments from './comments.js'
import resolveClose from './resolve-close.js'
import createTicket from './create-ticket.js'
import configSMS from './config-sms.js'

module.exports = {
  welcome: welcome.welcome,
  thankyou: welcome.thankyou,
  cancel: welcome.cancel,
  knowledge: knowledge.knowledge,
  knowledge_article_fallback: knowledge.knowledge_article_fallback,
  knowledge_suggestion_buttons: knowledge.knowledge_suggestion_buttons,
  metrics,
  multi_nocontext: multiRecord.multi_nocontext,
  multi_welcome: multiRecord.multi_welcome,
  multi_selection: multiRecord.multi_selection,
  multi_selection_suggestion_buttons: multiRecord.multi_selection_suggestion_buttons,
  single_nocontext: singleRecord.single_nocontext,
  single_details: singleRecord.single_details,
  single_postcomment_confirm: singleRecord.single_postcomment_confirm,
  single_postcomment_body: singleRecord.single_postcomment_body,
  single_postcomment_deny: singleRecord.single_postcomment_deny,
  single_postcomment_verify_newbody: singleRecord.single_postcomment_verify_newbody,
  single_postcomment_verify_deny: singleRecord.single_postcomment_verify_deny,
  single_postcomment_verify_confirm: singleRecord.single_postcomment_verify_confirm,
  single_viewfeed_confirmed: singleRecord.single_viewfeed_confirmed,
  single_viewfeed_deny: singleRecord.single_viewfeed_deny,
  single_postfeed_confirm: singleRecord.single_postfeed_confirm,
  single_postfeed_deny: singleRecord.single_postfeed_deny,
  single_postfeed_body: singleRecord.single_postfeed_body,
  single_postfeed_verify_confirm: singleRecord.single_postfeed_verify_confirm,
  single_postfeed_verify_newbody: singleRecord.single_postfeed_verify_newbody,
  single_postfeed_verify_deny: singleRecord.single_postfeed_verify_deny,
  single_change: singleRecord.single_change,
  single_change_nocontext: singleRecord.single_change_nocontext,
  comments_viewfeed: comments.comments_viewfeed,
  createTicket_knowledge: createTicket.createTicket_knowledge,
  createTicket_details: createTicket.createTicket_details,
  createTicket_nocontext: createTicket.createTicket_nocontext,
  createTicket_deny: createTicket.createTicket_deny,
  resolveclose_desc_confirm: resolveClose.resolveclose_desc_confirm,
  resolveclose_desc_set: resolveClose.resolveclose_desc_set,
  resolveclose_verify_confirm: resolveClose.resolveclose_verify_confirm,
  resolveclose_verify_newfields: resolveClose.resolveclose_verify_newfields,
  resolveclose_verify_deny: resolveClose.resolveclose_verify_deny,
  configSMS_start: configSMS.configSMS_start,
  configSMS_reject: configSMS.configSMS_reject,
  configSMS_number_confirmed: configSMS.configSMS_number_confirmed,
  configSMS_number_incorrect: configSMS.configSMS_number_incorrect
}
