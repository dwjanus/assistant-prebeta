'use strict';

var _db = require('../../../config/db.js');

var _db2 = _interopRequireDefault(_db);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var query = _db2['default'].querySql;

exports.configSMS_start = function (args, cb) {
  console.log('--> inside configSMS -- start');

  var user = args.user;
  var text = '';
  if (user.MobilePhone) {
    text += 'I have your mobile number listed as ' + String(user.MobilePhone) + ', is this correct? If not ' + 'simply tell me the right number in your response.';
  } else {
    text += 'But first, what is your mobile number?';
  }

  cb(null, text);
};

exports.configSMS_reject = function (args, cb) {
  console.log('--> inside configSMS -- reject');

  var text = 'No worries, feel free let me know if you would like to change this setting in the future.';
  cb(null, text);
};

exports.configSMS_number_confirmed = function (args, cb) {
  console.log('--> inside configSMS -- number_confirmed');

  var user = args.user;
  var updateUserQry = 'UPDATE users SET receiveSMS = \'true\' WHERE user_id = \'' + String(user.user_id) + '\'';
  var text = 'Right on, future notifications will be sent to ' + String(user.MobilePhone);

  return query(updateUserQry).then(function () {
    return cb(null, text);
  })['catch'](function (err) {
    return cb(err, null);
  });
};

exports.configSMS_number_incorrect = function (args, cb) {
  console.log('--> inside configSMS -- number_incorrect');

  var user = args.user;
  var app = args.app;
  var phoneNumber = app.getArgument('phone-number');
  var updateUserQry = 'UPDATE users SET MobilePhone = \'' + String(phoneNumber) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
  var text = 'I am saving your phone number as ' + String(phoneNumber) + ', that cool with you?';

  console.log('   got phone number from arguments: ' + String(phoneNumber));

  return query(updateUserQry).then(function () {
    return cb(null, text);
  })['catch'](function (err) {
    return cb(err, null);
  });
};