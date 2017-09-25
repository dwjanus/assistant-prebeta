'use strict';

var _db = require('../../../config/db.js');

var _db2 = _interopRequireDefault(_db);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var query = _db2['default'].querySql;

exports.createTicket_knowledge = function (args, cb) {
  console.log('--> inside createTicket -- entry');

  var app = args.app;
  var subject = app.getArgument('Subject');
  var text = 'Sure thing! So far I have ' + String(subject) + ' as the subject for your incident. If you ' + 'would like to change the subject, add a description, set the priority, or anything else, ' + 'simply tell me what field values you would like. Or I can submit with defaults.';

  return cb(null, text);
};

exports.createTicket_details = function (args, cb) {
  console.log('--> inside createTicket -- details');
  var user = args.user;
  var ebu = args.ebu;
  var app = args.app;
  var subject = app.getArgument('Subject');
  var description = app.getArgument('Description');
  var priority = app.getArgument('Priority');
  var returnType = app.getArgument('return-type');
  var options = {
    Subject: subject,
    SamanageESD__RequesterUser__c: user.sf_id,
    Origin: 'Samanage Assistant'
  };
  var text = 'Excellent, I am submitting your ticket now. ';

  if (priority) options.Priority = priority;
  if (description) options.Descriptions = description;

  console.log('returnType:\n' + String(_util2['default'].inspect(returnType)));
  console.log('context argument: ' + String(_util2['default'].inspect(app.getContextArgument('newticket-details', 'Subject'))));

  return ebu.createIncident(options).then(function (newCase) {
    console.log('--> created new case ' + String(newCase.id));
    var updateUserQry = 'UPDATE users SET latestCreatedTicket = \'' + String(newCase.id) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';

    if (!user.receiveSMS) {
      text += 'You have no option set for SMS updates, would you like to receive text notifactions on your tickets?';
      app.setContext('newticket-notifysms');
      return query(updateUserQry).then(function () {
        return cb(null, text);
      });
    } else if (user.receiveSMS === true || 'true') {
      text += 'notifications via SMS will be sent to ' + String(user.MobilePhone);
      // send newCase to twilio handler for sms...
      // .then(() => twilioNotify(newCase).then)
      return query(updateUserQry).then(function () {
        return cb(null, text);
      });
    }

    text += 'You can view the details of your new incident at ' + String(newCase.link);
    return query(updateUserQry).then(function () {
      return cb(null, text);
    });
  })['catch'](function (err) {
    cb(err, null);
  });
};

exports.createTicket_nocontext = function (args, cb) {
  console.log('--> inside createTicket -- nocontext');

  var app = args.app;
  var Subject = app.getArgument('Subject');
  var Description = app.getArgument('Description');
  var Priority = app.getArgument('Priority');
  var text = 'Sure thing! I\'m about to submit your ticket for "' + String(Subject) + '"';

  if (Description) text += ' with a description: "' + String(Description) + '"';
  if (Priority) text += ' and make it ' + String(Priority) + ' priority';

  text += '. You can make changes now or I can go ahead and submit';

  return cb(null, text);
};

exports.createTicket_deny = function (args, cb) {
  console.log('--> inside createTicket -- deny');

  var text = 'Sounds good, just let me know if you need anything';
  return cb(null, text);
};