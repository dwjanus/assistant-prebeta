'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _db = require('../../../config/db.js');

var _db2 = _interopRequireDefault(_db);

var _dateformat = require('dateformat');

var _dateformat2 = _interopRequireDefault(_dateformat);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var query = _db2['default'].querySql;
var now = new Date();

exports.welcome = function (args, cb) {
  console.log('--> inside welcome case');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var text = 'Welcome ';
  var datetime = (0, _dateformat2['default'])(now, 'isoDateTime');

  console.log('--> updating user info');
  return ebu.getUser(user.sf_id).then(function (userInfo) {
    var updateUserQry = 'UPDATE users SET Name = \'' + String(userInfo.Name) + '\', FirstName = \'' + String(userInfo.FirstName) + '\',\n      Photo = \'' + String(userInfo.Photo) + '\', MobilePhone = \'' + String(userInfo.MobilePhone) + '\', Department = \'' + String(userInfo.Department) + '\',\n      Email = \'' + String(userInfo.Email) + '\', PortalRole = \'' + String(userInfo.PortalRole) + '\', IsPortalEnabled = \'' + String(userInfo.IsPortalEnabled) + '\',\n      lastLogin = \'' + String(datetime) + '\', SamanageESD__RoleName__c = \'' + String(userInfo.SamanageESD__RoleName__c) + '\'\n      WHERE user_id = \'' + String(user.user_id) + '\'';

    if (!user.lastLogin) {
      if (userInfo.FirstName) text += '' + String(userInfo.FirstName);
      text += '! ';
      text += 'What can I do for you?';
      return query(updateUserQry);
    }

    text += 'back ' + String(userInfo.FirstName) + '! ';
    return ebu.welcomeUser(user).then(function (welcome) {
      console.log('--> got cases back from welcome\n' + String(_util2['default'].inspect(welcome)));
      var updates = welcome.updates;
      var newcases = welcome.newcases;
      var totalSize = updates.length + newcases.length;

      if (totalSize === 0) {
        text += 'Currently there are no updates to report.';
        return query(updateUserQry);
      }

      if (updates.length === 1) text += 'A change has been made to ticket ' + String(updates[0].CaseNumber);
      if (updates.length > 1) text += String(updates.length) + ' of your cases have been modified';
      if (newcases.length === 1) text += (updates.length > 0 ? ' and you' : 'You') + ' have 1 new case';
      if (newcases.length > 1) text += (updates.length > 0 ? 'and you' : 'You') + ' have ' + String(newcases.length) + ' new cases.';

      if (totalSize === 1) {
        var _saved = updates.length > 0 ? (0, _stringify2['default'])(updates) : (0, _stringify2['default'])(newcases);
        var _updateLastRecordStr = 'UPDATE users SET lastRecord = \'' + String(_saved) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
        console.log('--> created json object for saved record:\n' + String(_util2['default'].inspect(_saved)));
        app.setContext('welcome-multi-record');
        return query(updateUserQry).then(function () {
          return query(_updateLastRecordStr);
        });
      }

      var saved = {};
      if (updates.length > 0) saved.updates = updates;
      if (newcases.length > 0) saved.newcases = newcases;
      console.log('--> created json object for saved record:\n' + String(_util2['default'].inspect(saved)));
      saved = (0, _stringify2['default'])(saved);
      var updateLastRecordStr = 'UPDATE users SET lastRecord = \'' + String(saved) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
      app.setContext('welcome-multi-record');
      return query(updateUserQry).then(function () {
        return query(updateLastRecordStr);
      });
    });
  }).then(function () {
    return cb(null, text);
  })['catch'](function (err) {
    return cb(err, null);
  });
};

exports.thankyou = function (args, cb) {
  console.log('--> inside thankyou');

  var text = 'Anytime fam!';
  return cb(null, text);
};

exports.cancel = function (args, cb) {
  console.log('--> inside cancel');

  // might want to save user info here
  var text = 'No worries, let me know if you need anything else!';
  return cb(null, text);
};