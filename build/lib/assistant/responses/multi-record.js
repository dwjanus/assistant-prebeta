'use strict';

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _db = require('../../../config/db.js');

var _db2 = _interopRequireDefault(_db);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _dateformat = require('dateformat');

var _dateformat2 = _interopRequireDefault(_dateformat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var query = _db2['default'].querySql;

var addslashes = function addslashes(str) {
  return (String(str) + ' ').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
};

exports.multi_nocontext = function (args, cb) {
  console.log('\n--> inside multi -- nocontext');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var text = 'Currently there are none';
  var options = {
    Subject: app.getArgument('Subject'),
    Status: app.getArgument('Status'),
    Priority: app.getArgument('Priority'),
    RecordType: app.getArgument('record-type')
  };

  if (app.getArgument('Assignee') === 'Self') options.OwnerId = user.sf_id;
  options = _lodash2['default'].omitBy(options, _lodash2['default'].isNil);

  console.log('options: ' + String(_util2['default'].inspect(options)));

  return ebu.multiRecord(options).then(function (records) {
    console.log('--> records returned from ebu api');
    if (!_lodash2['default'].isEmpty(records)) {
      if (records.length > 1) {
        text = 'here are ' + String(records.length) + ' ';
        if (app.getArgument('yesno')) text = 'Yes, t' + text;else text = 'T' + text;
        if (options.Status) text += String(options.Status) + ' ';
        if (options.Priority) text += String(options.Priority) + ' priority ';
        text += String(records[0].SamanageESD__RecordType__c) + 's. The most recently active being ' + String(records[0].CaseNumber) + ': "' + String(records[0].Subject) + '"';
      } else {
        text = 'All I found was ' + String(options.RecordType) + ' ' + String(records[0].CaseNumber) + ': "' + String(records[0].Subject) + '"';
      }

      var record = records[0];
      var saveRecordStr = 'UPDATE users SET lastRecord = JSON_OBJECT(\'Id\', \'' + String(record.Id) + '\', \'Subject\', \'' + String(addslashes(record.Subject)) + '\', ' + ('\'OwnerId\', \'' + String(record.OwnerId) + '\', \'Description\', \'' + String(addslashes(record.Description)) + '\', \'CreatedDate\', \'' + String(record.CreatedDate) + '\', ') + ('\'SamanageESD__OwnerName__c\', \'' + String(record.SamanageESD__OwnerName__c) + '\', \'SamanageESD__Assignee_Name__c\', \'' + String(record.SamanageESD__Assignee_Name__c) + '\', ') + ('\'CaseNumber\', \'' + String(record.CaseNumber) + '\', \'Priority\', \'' + String(record.Priority) + '\', \'Status\', \'' + String(record.Status) + '\', \'SamanageESD__hasComments__c\', ') + ('\'' + String(record.SamanageESD__hasComments__c) + '\', \'SamanageESD__RecordType__c\', \'' + String(record.SamanageESD__RecordType__c) + '\', ') + ('\'RecordTypeId\', \'' + String(record.RecordTypeId) + '\', \'SamanageESD__RequesterName__c\', \'' + String(record.SamanageESD__RequesterName__c) + '\')') + (' WHERE user_id = \'' + String(user.user_id) + '\'');

      return query(saveRecordStr).then(function () {
        cb(null, text);
      });
    }

    return cb(null, text);
  });
};

exports.multi_welcome = function (args, cb) {
  console.log('\n--> inside multi -- welcome');

  var app = args.app;
  var user = args.user;
  var latestRecord = JSON.parse(user.lastRecord);
  var newcases = latestRecord.newcases;
  var updates = latestRecord.updates;
  var welcomerecord = app.getArgument('welcome-record');
  var text = '';
  var limit = void 0;

  if (welcomerecord !== 'updates' || 'newcases') {
    if (!_lodash2['default'].isEmpty(newcases)) {
      text = 'New Ticket' + (newcases.length > 1 ? 's:' : ':') + '\n';
      limit = newcases.length > 3 ? 3 : newcases.length;
      for (var i = 0; i < limit; i++) {
        var n = newcases[i];
        var date = (0, _dateformat2['default'])(n.CreatedDate, "ddd m/d/yy '@' h:MM tt");
        text += String(n.CaseNumber) + ': ' + String(n.Subject) + '\n - ' + String(n.SamanageESD__RequesterName__c) + ' / ' + String(date) + '\n';
      }
      if (newcases.length > limit) text += '\n+' + (newcases.length - limit) + ' more';
    }

    if (!_lodash2['default'].isEmpty(updates)) {
      text = 'Update' + (updates.length > 1 ? 's:' : ':') + '\n';
      limit = updates.length > 3 ? 3 : updates.length;
      for (var _i = 0; _i < limit; _i++) {
        var u = updates[_i];
        var _date = (0, _dateformat2['default'])(u.LastModifiedDate, "ddd m/d/yy '@' h:MM tt");
        text += String(u.CaseNumber) + ' on ' + String(_date) + '\n';
      }
      if (newcases.length > limit) text += '\n+' + (updates.length - limit) + ' more';
    }
  } else {
    if (!_lodash2['default'].isEmpty(latestRecord[welcomerecord])) {
      app.setContext('multi-record');
      var saved = latestRecord[welcomerecord];
      text = '' + (welcomerecord === 'newcases' ? 'New Ticket' : 'Update') + (saved.length > 1 ? 's:' : ':') + '\n';
      limit = saved.length > 3 ? 3 : saved.length;
      for (var _i2 = 0; _i2 < limit; _i2++) {
        var s = saved[_i2];
        if (welcomerecord === 'newcases') {
          var _date2 = (0, _dateformat2['default'])(s.CreatedDate, "ddd m/d/yy '@' h:MM tt");
          text += String(s.CaseNumber) + ': ' + String(s.Subject) + '\n - ' + String(s.SamanageESD__RequesterName__c) + ' / ' + String(_date2) + '\n';
        } else {
          var _date3 = (0, _dateformat2['default'])(s.LastModifiedDate, "ddd m/d/yy '@' h:MM tt");
          text += String(s.CaseNumber) + ' on ' + String(_date3) + '\n';
        }
      }
      if (saved.length > limit) text += '\n+' + (saved.length - limit) + ' more';

      var savedRecord = (0, _stringify2['default'])(saved);
      var updateLastRecordStr = 'UPDATE users SET lastRecord = \'' + String(savedRecord) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
      return query(updateLastRecordStr).then(function () {
        return cb(null, text);
      });
    }
    text = 'There aren\'t any bruh.';
  }

  return cb(null, text);
};

// This will handle the next context - takes ordinal and returns specific info on
// the corresponding item in the latestRecord array (i.e. "are there comments on that second one?")
// or --> "are there any comments on those?" --> "yes, there are (total number) new comments. 2 on ___ and 1 on ___"
//         --> "show me the ones for (ordinal or case number)"
//
// exports.multi = (args, cb) => {}