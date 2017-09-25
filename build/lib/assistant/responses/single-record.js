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

function addslashes(str) {
  return (String(str) + ' ').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
}

exports.single_nocontext = function (args, cb) {
  console.log('\n--> inside single -- nocontext');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var returnType = app.getArgument('return-type');
  var text = '';
  var options = {
    CaseNumber: app.getArgument('CaseNumber'),
    RecordType: app.getArgument('record-type')
  };

  if (app.getArgument('Assignee') === 'Self') options.OwnerId = user.sf_id; // need to play with this
  if (!app.getArgument('record-type')) options.RecordType = 'Incident';

  options = _lodash2['default'].omitBy(options, _lodash2['default'].isNil);

  console.log('options: ' + String(_util2['default'].inspect(options)));
  console.log('--> return type is: ' + String(returnType));

  return ebu.singleRecord(options).then(function (record) {
    console.log('--> record returned from ebu api');

    if (record) {
      var saveRecordStr = 'UPDATE users SET lastRecord = JSON_OBJECT(\'Id\', \'' + String(record.Id) + '\', \'Subject\', \'' + String(addslashes(record.Subject)) + '\', ' + ('\'OwnerId\', \'' + String(record.OwnerId) + '\', \'Description\', \'' + String(addslashes(record.Description)) + '\', \'CreatedDate\', \'' + String(record.CreatedDate) + '\', ') + ('\'SamanageESD__OwnerName__c\', \'' + String(record.SamanageESD__OwnerName__c) + '\', \'SamanageESD__Assignee_Name__c\', \'' + String(record.SamanageESD__Assignee_Name__c) + '\', ') + ('\'CaseNumber\', \'' + String(record.CaseNumber) + '\', \'Priority\', \'' + String(record.Priority) + '\', \'Status\', \'' + String(record.Status) + '\', \'SamanageESD__hasComments__c\', ') + ('\'' + String(record.SamanageESD__hasComments__c) + '\', \'SamanageESD__RecordType__c\', \'' + String(record.SamanageESD__RecordType__c) + '\', ') + ('\'RecordTypeId\', \'' + String(record.RecordTypeId) + '\', \'SamanageESD__RequesterName__c\', \'' + String(record.SamanageESD__RequesterName__c) + '\')') + (' WHERE user_id = \'' + String(user.user_id) + '\'');

      return query(saveRecordStr).then(function () {
        if (returnType) {
          if (returnType === 'Latest Comment' || 'Comments') {
            return ebu.comments(record.Id).then(function (comments) {
              console.log('--> just got comments back');

              if (!_lodash2['default'].isEmpty(comments)) {
                console.log('   --> they are not empty');

                if (returnType === 'Latest Comment') {
                  var latest = comments[0];
                  var date = (0, _dateformat2['default'])(latest.CreatedDate, "dddd mmmm dS, yyyy, 'at' h:MM:ss tt");
                  text = 'The most recent comment is "' + String(latest.Body) + '" and was posted by ' + String(latest.User.Name) + ' on ' + String(date) + '. ';

                  if (latest.CommentCount === 0) {
                    text += 'There are no responses to this. Would you like to post a reply?';
                    app.setContext('feedcomments-view');
                  } else {
                    if (latest.CommentCount === 1) text += 'There is 1 response, would you like to view it?';else text += 'There are ' + String(latest.CommentCount) + ' responses, would you like to view them?';
                    app.setContext('viewfeed-prompt');
                  }

                  var saveFeedIdStr = 'UPDATE users SET lastCommentId = \'' + String(latest.Id) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
                  return query(saveFeedIdStr);
                }

                var limit = comments.length > 3 ? 3 : comments.length;
                var saved = {};
                for (var i = 0; i < limit; i++) {
                  var c = comments[i];
                  saved['' + String(i + 1)] = c;
                  var _date = (0, _dateformat2['default'])(c.CreatedDate, "ddd m/d/yy '@' h:MM tt");
                  text += String(_date) + ' "' + String(c.Body) + '" posted by ' + String(c.User.Name) + ' - ' + String(c.CommentCount) + ' replies\n';
                }

                if (comments.length > limit) text += '+' + (comments.length - limit) + ' more';

                // set context to comments list
                app.setContext('comments-list');

                // save comments array to lastRecord
                var savedComments = (0, _stringify2['default'])(saved);
                var updateLastRecordStr = 'UPDATE users SET lastRecord = \'' + String(savedComments) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
                return query(updateLastRecordStr);
              }

              text = 'There are no public comments, would you like to post one?';
              return app.setContext('postcomment-prompt');
            }).then(function () {
              if (app.getArgument('yesno') && record) text = 'Yes ' + text;
              return cb(null, text);
            });
          }

          text = 'The ' + String(app.getArgument('return-type')) + ' is currently ' + String(record[app.getArgument('return-type')]);
        } else {
          text = String(record.SamanageESD__RecordType__c) + ' ' + String(record.CaseNumber) + ' - ' + String(record.Subject) + ' / Priority: ' + String(record.Priority) + ' / Status: ' + String(record.Status) + ' / ' + ('Description: ' + String(record.Description));
        }

        if (app.getArgument('yesno') && record) text = 'Yes, ' + text;
        return cb(null, text);
      });
    }

    text = 'I\'m sorry, I was unable to find any records matching your description.';
    if (app.getArgument('yesno')) text = 'No, ' + text;
    return cb(null, text);
  })['catch'](function (err) {
    cb(err, null);
  });
};

exports.single_details = function (args, cb) {
  console.log('\n--> inside single -- details');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var returnType = app.getArgument('return-type');
  var latestRecord = JSON.parse(user.lastRecord);
  var text = '';

  if (returnType === 'Latest Comment' || 'Comments') {
    console.log('--> return type is: ' + String(returnType));
    return ebu.comments(latestRecord.Id).then(function (comments) {
      console.log('--> just got comments back');

      if (!_lodash2['default'].isEmpty(comments)) {
        console.log('   --> they are not empty');
        if (returnType === 'Latest Comment') {
          var latest = comments[0];
          var date = (0, _dateformat2['default'])(latest.CreatedDate, "dddd mmmm dS, yyyy, 'at' h:MM:ss tt");
          text = 'The most recent comment is "' + String(latest.Body) + '" and was posted by ' + String(latest.User.Name) + ' on ' + String(date) + '. ';

          if (latest.CommentCount === 0) {
            text += 'There are no responses to this. Would you like to post a reply?';
            app.setContext('feedcomments-view');
          } else {
            if (latest.CommentCount === 1) text += 'There is 1 response, would you like to view it?';else text += 'There are ' + String(latest.CommentCount) + ' responses, would you like to view them?';
            app.setContext('viewfeed-prompt');
          }

          var saveFeedIdStr = 'UPDATE users SET lastCommentId = \'' + String(latest.Id) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
          return query(saveFeedIdStr).then(function () {
            return cb(null, text);
          });
        }

        var limit = comments.length > 3 ? 3 : comments.length;
        var saved = {};
        for (var i = 0; i < limit; i++) {
          var c = comments[i];
          saved['' + String(i + 1)] = c;
          var _date2 = (0, _dateformat2['default'])(c.CreatedDate, "ddd m/d/yy '@' h:MM tt");
          text += String(_date2) + ' "' + String(c.Body) + '" posted by ' + String(c.User.Name) + ' - ' + String(c.CommentCount) + ' replies\n';
        }

        if (comments.length > limit) text += '+' + (comments.length - limit) + ' more';

        app.setContext('comments-list');

        var savedComments = (0, _stringify2['default'])(saved);
        var updateLastRecordStr = 'UPDATE users SET lastRecord = \'' + String(savedComments) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
        return query(updateLastRecordStr);
      }

      text = 'There are no public comments, would you like to post one?';
      return app.setContext('postcomment-prompt');
    }).then(function () {
      if (app.getArgument('yesno')) text = 'Yes ' + text;
      return cb(null, text);
    });
  }

  text = 'The ' + String(returnType) + ' is currently ' + String(latestRecord[returnType]);
  return cb(null, text);
};

exports.single_fromMulti = function (args, cb) {
  console.log('\n--> inside single -- from Multi');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var latestRecord = JSON.parse(user.lastRecord);
  var ordinal = app.getArgument('ordinal');
  var returnType = app.getArgument('return-type');
  var single = latestRecord[ordinal];
  var text = '';

  if (returnType === 'Latest Comment' || 'Comments') {
    console.log('--> return type is: ' + String(returnType));
    return ebu.comments(single.Id).then(function (comments) {
      console.log('--> just got comments back');

      if (!_lodash2['default'].isEmpty(comments)) {
        console.log('   --> they are not empty');
        if (returnType === 'Latest Comment') {
          var latest = comments[0];
          var date = (0, _dateformat2['default'])(latest.CreatedDate, "dddd mmmm dS, yyyy, 'at' h:MM:ss tt");
          text = 'The most recent comment is "' + String(latest.Body) + '" and was posted by ' + String(latest.User.Name) + ' on ' + String(date) + '. ';

          if (latest.CommentCount === 0) {
            text += 'There are no responses to this. Would you like to post a reply?';
            app.setContext('feedcomments-view');
          } else {
            if (latest.CommentCount === 1) text += 'There is 1 response, would you like to view it?';else text += 'There are ' + String(latest.CommentCount) + ' responses, would you like to view them?';
            app.setContext('viewfeed-prompt');
          }

          var saveFeedIdStr = 'UPDATE users SET lastCommentId = \'' + String(latest.Id) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
          return query(saveFeedIdStr).then(function () {
            return cb(null, text);
          });
        }

        var limit = comments.length > 3 ? 3 : comments.length;
        var saved = {};
        for (var i = 0; i < limit; i++) {
          var c = comments[i];
          saved['' + String(i + 1)] = c;
          var _date3 = (0, _dateformat2['default'])(c.CreatedDate, "ddd m/d/yy '@' h:MM tt");
          text += String(_date3) + ' "' + String(c.Body) + '" posted by ' + String(c.User.Name) + ' - ' + String(c.CommentCount) + ' replies\n';
        }

        if (comments.length > limit) text += '+' + (comments.length - limit) + ' more';

        app.setContext('comments-list');

        var savedComments = (0, _stringify2['default'])(saved);
        var updateLastRecordStr = 'UPDATE users SET lastRecord = \'' + String(savedComments) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
        return query(updateLastRecordStr);
      }

      text = 'There are no public comments, would you like to post one?';
      return app.setContext('postcomment-prompt');
    }).then(function () {
      if (app.getArgument('yesno')) text = 'Yes ' + text;
      return cb(null, text);
    });
  }

  text = 'The ' + String(returnType) + ' is currently ' + String(single[returnType]);
  return cb(null, text);
};

/** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***
 *               Handlers for Case Comment view/post convo paths              *
 ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***/

exports.single_postcomment_confirm = function (args, cb) {
  console.log('\n--> inside single -- postcomment/confirm');

  var app = args.app;
  var commentBody = app.getArgument('CommentBody');
  var text = 'Okay, what would you like to say?';

  if (!commentBody || commentBody === '') return cb(null, text);
  text = 'Replying with: "' + String(commentBody) + '" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted';
  app.setContext('comment-verify');
  return cb(null, text);
};

exports.single_postcomment_body = function (args, cb) {
  console.log('\n--> inside single -- postcomment/confirm');

  var app = args.app;
  var commentBody = app.getArgument('CommentBody');
  var text = 'Replying with: "' + String(commentBody) + '" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted';
  return cb(null, text);
};

exports.single_postcomment_deny = function (args, cb) {
  console.log('\n--> inside single -- postcomment/deny');
  var text = 'No worries, I am here if you need anything else';
  return cb(null, text);
};

exports.single_postcomment_verify_newbody = function (args, cb) {
  console.log('\n--> inside single -- postcomment/verify-confirm');

  var app = args.app;
  var commentBody = app.getArgument('CommentBody');
  var text = 'Replying with: "' + String(commentBody) + '" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted';
  return cb(null, text);
};

exports.single_postcomment_verify_deny = function (args, cb) {
  console.log('\n--> inside single -- postcomment/verify-confirm');
  var text = 'No worries, cancelling your feed post';
  return cb(null, text);
};

exports.single_postcomment_verify_confirm = function (args, cb) {
  console.log('\n--> inside single -- postcomment/verify-confirm');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var latestRecord = JSON.parse(user.lastRecord);
  var commentBody = app.getArgument('CommentBody');

  return ebu.createComment(latestRecord.Id, user.sf_id, commentBody).then(function (ret) {
    console.log('--> got ret back from create function:\n' + String(_util2['default'].inspect(ret)));
    var text = 'Your comment has been posted!';
    return cb(null, text);
  })['catch'](function (err) {
    cb(err, null);
  });
};

/** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***
 *               Handlers for Feed Comment view/post convo paths              *
 ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***/

exports.single_viewfeed_confirmed = function (args, cb) {
  console.log('\n--> inside single -- viewfeed/confirmed');

  var ebu = args.ebu;
  var user = args.user;
  var latestRecord = JSON.parse(user.lastRecord);
  var lastComment = user.lastCommentId;
  var text = '';

  return ebu.feedComments(latestRecord.Id, lastComment).each(function (feedComment) {
    console.log('-> adding feedComment ' + String(feedComment.Id) + ' to response');
    var date = (0, _dateformat2['default'])(feedComment.CreatedDate, "ddd m/d/yy '@' h:MM tt");
    text += String(date) + ' "' + String(feedComment.CommentBody) + '" posted by ' + String(feedComment.User.Name) + '\n';
  }).then(function () {
    text += '\nWould you like to post a response?';
    cb(null, text);
  })['catch'](function (err) {
    return cb(err, null);
  });
};

exports.single_viewfeed_deny = function (args, cb) {
  console.log('\n--> inside single -- viewfeed/deny');
  var text = 'Okay, I am here if you need anything else';
  return cb(null, text);
};

exports.single_postfeed_confirm = function (args, cb) {
  console.log('\n--> inside single -- postfeed/confirm');

  var app = args.app;
  var commentBody = app.getArgument('CommentBody');
  var text = 'Okay, what would you like to say?';

  if (!commentBody) return cb(null, text);
  text = 'Replying with: "' + String(commentBody) + '" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted';
  app.setContext('feedcomment-verify');
  return cb(null, text);
};

exports.single_postfeed_deny = function (args, cb) {
  console.log('\n--> inside single -- postfeed/deny');
  var text = 'Okay, I am here if you need anything else';
  return cb(null, text);
};

exports.single_postfeed_body = function (args, cb) {
  console.log('\n--> inside single -- postfeed/body');

  var app = args.app;
  var commentBody = app.getArgument('CommentBody');
  var text = 'Replying with: "' + String(commentBody) + '" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted';
  return cb(null, text);
};

exports.single_postfeed_verify_newbody = function (args, cb) {
  console.log('\n--> inside single -- postfeed/verify-newbody');

  var app = args.app;
  var commentBody = app.getArgument('CommentBody');
  var text = 'Replying with: "' + String(commentBody) + '" / say "Confirm" to post, or if this is incorrect respond with exactly what you want posted';
  return cb(null, text);
};

exports.single_postfeed_verify_deny = function (args, cb) {
  console.log('\n--> inside single -- postfeed/verify-deny');
  var text = 'No worries, cancelling your feed post';
  return cb(null, text);
};

exports.single_postfeed_verify_confirm = function (args, cb) {
  console.log('\n--> inside single -- postfeed/verify-confirm');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var caseFeed = user.lastCommentId;
  var commentBody = app.getContextArgument('feedcomment-verify', 'CommentBody');
  if (!commentBody) commentBody = app.getRawInput();

  return ebu.createFeedComment(caseFeed, user.sf_id, commentBody).then(function (ret) {
    console.log('--> got ret back from create function:\n' + String(_util2['default'].inspect(ret)));
    var text = 'Your comment has been posted!';
    return cb(null, text);
  })['catch'](function (err) {
    cb(err, null);
  });
};

/** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***
 *               Handlers for making single change to a case obj              *
 ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ** ***/

exports.single_change = function (args, cb) {
  console.log('\n--> inside single -- change');

  var app = args.app;
  var ebu = args.ebu;
  var user = args.user;
  var returnType = app.getArgument('return-type');
  var options = {
    Id: ''
  };

  if (app.getArgument('Status')) options.Status = _lodash2['default'].upperFirst(app.getArgument('Status'));
  if (app.getArgument('Priority')) options.Priority = _lodash2['default'].upperFirst(app.getArgument('Priority'));

  options = _lodash2['default'].omitBy(options, _lodash2['default'].isNil);

  if (!returnType || returnType === 'undefined') returnType = _lodash2['default'].keys(options)[1];

  var latestRecord = JSON.parse(user.lastRecord);
  console.log('--> record after jsonify:\n' + String(_util2['default'].inspect(latestRecord)));
  options.Id = latestRecord.Id;
  return ebu.update(options).then(function () {
    var text = 'No problem, I have updated the ' + String(returnType) + ' to ' + String(options[returnType]);
    return cb(null, text);
  })['catch'](function (err) {
    cb(err, null);
  });
};

// need to add single_change_nocontext!!