'use strict';

var _dateformat = require('dateformat');

var _dateformat2 = _interopRequireDefault(_dateformat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

// const query = db.querySql
// const addslashes = (str) => {
//   return (`${str} `).replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0')
// }

exports.comments_viewfeed = function (args, cb) {
  console.log('\n--> inside comments -- viewfeed');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var latestRecord = JSON.parse(user.lastRecord);
  var ordinal = app.getArgument('ordinal');
  var comment = latestRecord[ordinal];
  var text = '';

  console.log('--> ordinal: ' + String(ordinal));
  return ebu.feedComments(comment.ParentId, comment.Id).each(function (feedComment) {
    console.log('-> adding feedComment ' + String(feedComment.Id) + ' to response');
    var date = (0, _dateformat2['default'])(feedComment.CreatedDate, "ddd m/d/yy '@' h:MM tt");
    text += String(date) + ' "' + String(feedComment.CommentBody) + '" posted by ' + String(feedComment.User.Name) + '\n';
  }).then(function () {
    text += '\nWould you like to post a response?';
    cb(null, text);
  })['catch'](function (err) {
    return cb(err, null);
  });
}; // import db from '../../../config/db.js'
// import _ from 'lodash'
// import util from 'util'