'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _ebuApi = require('../samanage/ebu-api.js');

var _ebuApi2 = _interopRequireDefault(_ebuApi);

var _responses = require('./responses/responses.js');

var _responses2 = _interopRequireDefault(_responses);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// consts for intent map
var GOOGLE_ASSISTANT_WELCOME = 'input.welcome';
var THANK_YOU = 'general.thankyou';
var CANCEL = 'general.cancel';
var KNOWLEDGE_NO_CONTEXT = 'general.knowledge-nocontext';
var KNOWLEDGE_FROM_SINGLE = 'general.knowledge';
var MULTIPLE_RECORDS_NO_CONTEXT = 'general.multirecords-nocontext';
var MULTIPLE_RECORDS_FROM_WELCOME = 'welcome.multi-record';
var SINGLE_FROM_MULTI = 'query.single-from-multi';
var METRICS = 'general.metrics';
var SINGLE_RECORD_DETAILS = 'query.single-record-details';
var SINGLE_RECORD_NO_CONTEXT = 'query.single-record-nocontext';
var SINGLE_RECORD_CHANGE = 'command.single-record-change';
var CREATE_TICKET_FROM_KNOWLEDGE = 'create.newticket-knowledge';
var CREATE_TICKET_DETAILS = 'create.newticket-details';
var CREATE_TICKET_NO_CONTEXT = 'create.newticket-nocontext';
var CREATE_TICKET_DENY = 'deny.newticket';
var POST_COMMENT_FROM_SINGLE_CONFIRMED = 'confirm.post-comment';
var POST_COMMENT_FROM_SINGLE_DENY = 'deny.post-comment';
var POST_COMMENT_BODY = 'comment.body';
var POST_COMMENT_VERIFY_CONFIRM = 'create.comment';
var POST_COMMENT_VERIFY_NEWBODY = 'comment.verify-newbody';
var POST_COMMENT_VERIFY_DENY = 'comment.verify-deny';
var VIEW_FEED_FROM_COMMENTS_LIST = 'comment.viewfeed';
var VIEW_FEED_FROM_SINGLE_CONFIRMED = 'confirm.viewfeed';
var VIEW_FEED_FROM_SINGLE_DENY = 'deny.viewfeed';
var POST_FEED_COMMENT_CONFIRMED = 'confirm.post-feedcomment';
var POST_FEED_COMMENT_DENY = 'deny.post-feedcomment';
var POST_FEED_COMMENT_BODY = 'feedcomment.body';
var POST_FEED_COMMENT_VERIFY_CONFIRM = 'create.feedcomment';
var POST_FEED_COMMENT_VERIFY_NEWBODY = 'feedcomment.verify-newbody';
var POST_FEED_COMMENT_VERIFY_DENY = 'feedcomment.verify-deny';
var CONFIG_SMS_START = 'config.sms-start';
var CONFIG_SMS_REJECT = 'config.sms-reject';
var CONFIG_SMS_NUMBER_CONFIRMED = 'config.sms-number-confirmed';
var CONFIG_SMS_NUMBER_INCORRECT = 'config.sms-number-incorrect';

// eventually make contextual intent of knowledge route to same function and pull subject from
// context provided in conversation i.e. "Are there any articles on that?"
var actionMap = new _map2['default']();
actionMap.set(GOOGLE_ASSISTANT_WELCOME, _responses2['default'].welcome);
actionMap.set(THANK_YOU, _responses2['default'].thankyou);
actionMap.set(CANCEL, _responses2['default'].cancel);
actionMap.set(KNOWLEDGE_NO_CONTEXT, _responses2['default'].knowledge);
actionMap.set(KNOWLEDGE_FROM_SINGLE, _responses2['default'].knowledge);
actionMap.set(MULTIPLE_RECORDS_NO_CONTEXT, _responses2['default'].multi_nocontext);
actionMap.set(MULTIPLE_RECORDS_FROM_WELCOME, _responses2['default'].multi_welcome);
actionMap.set(SINGLE_FROM_MULTI, _responses2['default'].single_fromMulti);
actionMap.set(METRICS, _responses2['default'].metrics);
actionMap.set(SINGLE_RECORD_DETAILS, _responses2['default'].single_details);
actionMap.set(SINGLE_RECORD_NO_CONTEXT, _responses2['default'].single_nocontext);
actionMap.set(SINGLE_RECORD_CHANGE, _responses2['default'].single_change);
actionMap.set(CREATE_TICKET_FROM_KNOWLEDGE, _responses2['default'].createTicket_knowledge);
actionMap.set(CREATE_TICKET_DETAILS, _responses2['default'].createTicket_details);
actionMap.set(CREATE_TICKET_NO_CONTEXT, _responses2['default'].createTicket_nocontext);
actionMap.set(CREATE_TICKET_DENY, _responses2['default'].createTicket_deny);
actionMap.set(POST_COMMENT_FROM_SINGLE_CONFIRMED, _responses2['default'].single_postcomment_confirm);
actionMap.set(POST_COMMENT_FROM_SINGLE_DENY, _responses2['default'].single_postcomment_deny);
actionMap.set(POST_COMMENT_BODY, _responses2['default'].single_postcomment_body);
actionMap.set(POST_COMMENT_VERIFY_CONFIRM, _responses2['default'].single_postcomment_verify_confirm);
actionMap.set(POST_COMMENT_VERIFY_NEWBODY, _responses2['default'].single_postcomment_verify_newbody);
actionMap.set(POST_COMMENT_VERIFY_DENY, _responses2['default'].single_postcomment_verify_deny);
actionMap.set(VIEW_FEED_FROM_COMMENTS_LIST, _responses2['default'].comments_viewfeed);
actionMap.set(VIEW_FEED_FROM_SINGLE_CONFIRMED, _responses2['default'].single_viewfeed_confirmed);
actionMap.set(VIEW_FEED_FROM_SINGLE_DENY, _responses2['default'].single_viewfeed_deny);
actionMap.set(POST_FEED_COMMENT_CONFIRMED, _responses2['default'].single_postfeed_confirm);
actionMap.set(POST_FEED_COMMENT_DENY, _responses2['default'].single_postfeed_deny);
actionMap.set(POST_FEED_COMMENT_BODY, _responses2['default'].single_postfeed_body);
actionMap.set(POST_FEED_COMMENT_VERIFY_CONFIRM, _responses2['default'].single_postfeed_verify_confirm);
actionMap.set(POST_FEED_COMMENT_VERIFY_NEWBODY, _responses2['default'].single_postfeed_verify_newbody);
actionMap.set(POST_FEED_COMMENT_VERIFY_DENY, _responses2['default'].single_postfeed_verify_deny);
actionMap.set(CONFIG_SMS_START, _responses2['default'].configSMS_start);
actionMap.set(CONFIG_SMS_REJECT, _responses2['default'].configSMS_reject);
actionMap.set(CONFIG_SMS_NUMBER_CONFIRMED, _responses2['default'].configSMS_number_confirmed);
actionMap.set(CONFIG_SMS_NUMBER_INCORRECT, _responses2['default'].configSMS_number_incorrect);

exports['default'] = function (app, user) {
  var action = actionMap.get(app.getIntent());
  var promisedAction = _bluebird2['default'].promisify(action);

  console.log('--> ebu assistant handler started for user: ' + String(user.user_id));

  (0, _ebuApi2['default'])(user.user_id).then(function (ebu) {
    promisedAction({ app: app, ebu: ebu, user: user }).then(function (result) {
      app.ask(result);
    });
  })['catch'](function (err) {
    return console.log(err);
  });
};