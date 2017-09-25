'use strict';

var _db = require('../../../config/db.js');

var _db2 = _interopRequireDefault(_db);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var query = _db2['default'].querySql;

exports.agent = function (args, cb) {

  console.log('\n--> Inside escalate');
  console.log('\n--> ' + String(_util2['default'].inspect(args)));
  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var text = '';
  var options = {
    CaseNumber: app.getArgument('CaseNumber'),
    RecordType: app.getArgument('record-type')
  };

  if (!app.getArgument('record-type')) options.RecordType = 'Incident';

  options = _lodash2['default'].omitBy(options, _lodash2['default'].isNil);
  console.log('options: ' + String(_util2['default'].inspect(options)));

  return ebu.singleRecord(options).then(function (record) {
    console.log('\n--> record returned from ebu api');
    if (record) {
      console.log('Escalation records: ' + String(_util2['default'].inspect(record)));
      text += 'Found a record';
    } else {
      text += 'I could not find ' + String(options.RecordType) + ' number ' + String(options.CaseNumber);
    }
    return cb(null, text);
  })['catch'](function (err) {
    cb(err, null);
  });
};