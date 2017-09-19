import { welcome } from './welcome.js'
import { knowledge } from './knowledge.js'
import multiRecord from './multi-record.js'
import metrics from './metrics.js'
import singleRecord from './single-record.js'
import createTicket from './create-ticket.js'
import configSMS from './config-sms.js'

module.exports = {
  welcome,
  knowledge,
  metrics: metrics,
  multi_nocontext: multiRecord.multi_nocontext,
  single_nocontext: singleRecord.single_nocontext,
  single_details: singleRecord.single_details,
  single_change: singleRecord.single_change,
  createTicket_knowledge: createTicket.createTicket_knowledge,
  createTicket_details: createTicket.createTicket_details,
  createTicket_nocontext: createTicket.createTicket_nocontext,
  configSMS_start: configSMS.configSMS_start,
  configSMS_reject: configSMS.configSMS_reject,
  configSMS_number_confirmed: configSMS.configSMS_number_confirmed,
  configSMS_number_incorrect: configSMS.configSMS_number_incorrect
}
