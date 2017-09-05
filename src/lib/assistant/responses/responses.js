import { welcome } from './welcome.js'
import { knowledge } from './knowledge.js'
import createTicket from './create-ticket.js'
import configSMS from './config-sms.js'

module.exports = {
  welcome,
  knowledge,
  createTicket_knowledge: createTicket.createTicket_knowledge,
  createTicket_details: createTicket.createTicket_details,
  configSMS_start: configSMS.configSMS_start,
  configSMS_number: configSMS.configSMS_number
}