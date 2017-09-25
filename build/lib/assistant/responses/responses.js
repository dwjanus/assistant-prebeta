'use strict';

var _welcome = require('./welcome.js');

var _welcome2 = _interopRequireDefault(_welcome);

var _knowledge = require('./knowledge.js');

var _multiRecord = require('./multi-record.js');

var _multiRecord2 = _interopRequireDefault(_multiRecord);

var _metrics = require('./metrics.js');

var _escalation = require('./escalation.js');

var _escalation2 = _interopRequireDefault(_escalation);

var _singleRecord = require('./single-record.js');

var _singleRecord2 = _interopRequireDefault(_singleRecord);

var _comments = require('./comments.js');

var _comments2 = _interopRequireDefault(_comments);

var _createTicket = require('./create-ticket.js');

var _createTicket2 = _interopRequireDefault(_createTicket);

var _configSms = require('./config-sms.js');

var _configSms2 = _interopRequireDefault(_configSms);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

module.exports = {
  welcome: _welcome2['default'].welcome,
  thankyou: _welcome2['default'].thankyou,
  cancel: _welcome2['default'].cancel,
  knowledge: _knowledge.knowledge,
  metrics: _metrics.metrics,
  escalation_agent: _escalation2['default'].agent,
  escalation_requester: _escalation2['default'].requester,
  multi_nocontext: _multiRecord2['default'].multi_nocontext,
  multi_welcome: _multiRecord2['default'].multi_welcome,
  single_nocontext: _singleRecord2['default'].single_nocontext,
  single_details: _singleRecord2['default'].single_details,
  single_postcomment_confirm: _singleRecord2['default'].single_postcomment_confirm,
  single_postcomment_body: _singleRecord2['default'].single_postcomment_body,
  single_postcomment_deny: _singleRecord2['default'].single_postcomment_deny,
  single_postcomment_verify_newbody: _singleRecord2['default'].single_postcomment_verify_newbody,
  single_postcomment_verify_deny: _singleRecord2['default'].single_postcomment_verify_deny,
  single_postcomment_verify_confirm: _singleRecord2['default'].single_postcomment_verify_confirm,
  single_viewfeed_confirmed: _singleRecord2['default'].single_viewfeed_confirmed,
  single_viewfeed_deny: _singleRecord2['default'].single_viewfeed_deny,
  single_postfeed_confirm: _singleRecord2['default'].single_postfeed_confirm,
  single_postfeed_deny: _singleRecord2['default'].single_postfeed_deny,
  single_postfeed_body: _singleRecord2['default'].single_postfeed_body,
  single_postfeed_verify_confirm: _singleRecord2['default'].single_postfeed_verify_confirm,
  single_postfeed_verify_newbody: _singleRecord2['default'].single_postfeed_verify_newbody,
  single_postfeed_verify_deny: _singleRecord2['default'].single_postfeed_verify_deny,
  single_change: _singleRecord2['default'].single_change,
  comments_viewfeed: _comments2['default'].comments_viewfeed,
  createTicket_knowledge: _createTicket2['default'].createTicket_knowledge,
  createTicket_details: _createTicket2['default'].createTicket_details,
  createTicket_nocontext: _createTicket2['default'].createTicket_nocontext,
  createTicket_deny: _createTicket2['default'].createTicket_deny,
  configSMS_start: _configSms2['default'].configSMS_start,
  configSMS_reject: _configSms2['default'].configSMS_reject,
  configSMS_number_confirmed: _configSms2['default'].configSMS_number_confirmed,
  configSMS_number_incorrect: _configSms2['default'].configSMS_number_incorrect
};