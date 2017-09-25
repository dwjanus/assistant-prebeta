'use strict';

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

exports.knowledge = function (args, cb) {
  console.log('--> inside knowledge case');

  var ebu = args.ebu;
  var app = args.app;
  var Subject = app.getArgument('Subject');
  if (!Subject) Subject = app.getRawInput();
  var text = 'I found some knowledge base articles that matched your issue. If these do not help I can submit a ticket for you';

  return ebu.knowledge(Subject).then(function (articles) {
    console.log('--> articles retrieved:\n' + String(_util2['default'].inspect(articles)));
    if (articles.length === 0) text = 'I was unable to find any relavent articles in the knowledge base, would like me to submit a ticket?';
    // if (surface is phone && articles.length() > 0) return processList(articles).then((list) => cb(null, list))
    if (app.getArgument('yesno') && articles.length > 0) text = 'Yes, ' + text;
    return cb(null, text);
  })['catch'](function (err) {
    return cb(err, null);
  });
};