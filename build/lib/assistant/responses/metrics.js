'use strict';

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

exports.metrics = function (args, cb) {
  console.log('\n--> inside metrics');
  console.log('\n--> ' + String(_util2['default'].inspect(args)));
  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var text = 'No tickets have been found';
  var options = {
    RecordType: app.getArgument('record-type'),
    DatePeriod: app.getArgument('date-period'),
    StatusChange: app.getArgument('StatusChange')
  };
  console.log('\n--> [metrics] options: ' + String(_util2['default'].inspect(options)));
  // default options
  if (app.getArgument('Assignee') === 'Self') options.OwnerId = user.sf_id;
  if (!app.getArgument('record-type')) options.RecordType = 'Incident';

  options = _lodash2['default'].omitBy(options, _lodash2['default'].isNil);

  return ebu.metrics(options).then(function (records) {
    console.log('\n--> records returned from ebu api');
    // if (!_.isEmpty(records)) {
    var startClosedDate = (0, _dateformat2['default'])(options.DatePeriod.split('/')[0], 'fullDate');
    var endClosedDate = (0, _dateformat2['default'])(options.DatePeriod.split('/')[1], 'fullDate');
    if (records) {
      if (records.length > 1) {
        text = String(records.length) + ' ' + String(options.RecordType) + 's were ' + String(options.StatusChange) + ' between ' + String(startClosedDate) + ' and ' + String(endClosedDate) + ' ';
        if (app.getArgument('yesno')) text = 'Yes, ' + text;
        text += 'The most recently active being ' + String(options.RecordType) + ' ' + (String(parseInt(records[0].CaseNumber, 10)) + ': ' + String(records[0].Subject));
      } else {
        text = 'I found ' + String(options.RecordType) + ' ' + String(records[0].CaseNumber) + ': ' + String(records[0].Subject);
      }
    } else {
      text = 'No ' + String(options.RecordType) + 's were ' + String(options.StatusChange) + ' between ' + String(startClosedDate) + ' and ' + String(endClosedDate);
    }
    return cb(null, text);
  });
};