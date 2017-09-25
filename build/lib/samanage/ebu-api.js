'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _jsforce = require('jsforce');

var _jsforce2 = _interopRequireDefault(_jsforce);

var _db = require('../../config/db.js');

var _db2 = _interopRequireDefault(_db);

var _config = require('../../config/config.js');

var _config2 = _interopRequireDefault(_config);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _dateformat = require('dateformat');

var _dateformat2 = _interopRequireDefault(_dateformat);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var query = _db2['default'].querySql;

var formatCaseNumber = function formatCaseNumber(number) {
  var s = '0000000' + String(number);
  return s.substr(s.length - 8);
};

var addslashes = function addslashes(str) {
  return (String(str) + ' ').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
};

var recordType = {
  Incident: '0121I000000kKdzQAE',
  Change: '0121I000000kKe0QAE',
  Problem: '0121I000000kKdwQAE',
  Release: '0121I000000kKdvQAE',
  Request: '0121I000000kKdyQAE'
};

var recordName = {
  '0121I000000kKdzQAE': 'Incident',
  '0121I000000kKe0QAE': 'Change',
  '0121I000000kKdwQAE': 'Problem',
  '0121I000000kKdvQAE': 'Release',
  '0121I000000kKdyQAE': 'Request'
};

var record = function record(arg, key) {
  if (!key) return null;
  if (arg === 'id') return recordType[key];
  if (arg === 'name') return recordName[key];
  return null;
};

var oauth2 = new _jsforce2['default'].OAuth2({
  clientId: (0, _config2['default'])('SF_ID'),
  clientSecret: (0, _config2['default'])('SF_SECRET'),
  redirectUri: 'https://' + String((0, _config2['default'])('HEROKU_SUBDOMAIN')) + '.herokuapp.com/authorize'
});

var returnParams = {
  Id: 1,
  Subject: 1,
  Description: 1,
  CreatedDate: 1,
  LastModifiedDate: 1,
  CaseNumber: 1,
  OwnerId: 1,
  SamanageESD__OwnerName__c: 1,
  SamanageESD__Assignee_Name__c: 1,
  SamanageESD__RequesterName__c: 1,
  Priority: 1,
  Status: 1,
  SamanageESD__hasComments__c: 1,
  SamanageESD__RecordType__c: 1,
  RecordTypeId: 1
};

exports['default'] = function (userId) {
  return new _bluebird2['default'](function (resolve, reject) {
    console.log('--> ebu api initialized for user: ' + String(userId));

    var getUser = 'SELECT * from users WHERE user_id = \'' + String(userId) + '\'';
    query(getUser).then(function (userRow) {
      console.log('\n[salesforce] user found!\n' + String(_util2['default'].inspect(userRow)));
      return userRow[0];
    }).then(function (user) {
      if (!user.sf_id) {
        console.log('--! no connection object found !---\n    returning link now ');
        return reject({ text: '\u270B Hold your horses!\nVisit this URL to login to Salesforce: https://' + String((0, _config2['default'])('HEROKU_SUBDOMAIN')) + '.herokuapp.com/login/' + String(userId) });
      }

      var conn = new _jsforce2['default'].Connection({
        oauth2: oauth2,
        instanceUrl: user.url,
        accessToken: user.access,
        refreshToken: user.refresh
      });

      conn.on('refresh', function (newToken, res) {
        console.log('--> got a refresh event from Salesforce!\n    new token: ' + String(newToken));
        return query('UPDATE users SET access = \'' + String(newToken) + '\' WHERE user_id = \'' + String(user.user_id) + '\'').then(function (result) {
          console.log('--> updated user: ' + String(user.user_id) + ' with new access token - ' + String(result));
          return resolve(retrieveSfObj(conn));
        });
      });

      return conn.identity(function (iderr, res) {
        console.log('    identifying sf connection...');

        if (iderr || !res || res === 'undefined' || undefined) {
          if (iderr) console.log('!!! Connection Error !!!\n' + String(_util2['default'].inspect(res)));else console.log('--! connection undefined !---');
          return oauth2.refreshToken(user.refresh).then(function (ret) {
            console.log('--> forcing oauth refresh\n' + String(_util2['default'].inspect(ret)));
            conn = new _jsforce2['default'].Connection({
              instanceUrl: ret.instance_url,
              accessToken: ret.access_token
            });

            var updateStr = 'UPDATE users SET access = \'' + String(ret.access_token) + '\', url = \'' + String(ret.instance_url) + '\' WHERE user_id = \'' + String(user.user_id) + '\'';
            console.log('--> updating user: ' + String(user.user_id) + ' with new access token');
            return query(updateStr).then(resolve(retrieveSfObj(conn)));
          })['catch'](function (referr) {
            console.log('!!! refresh event error! ' + String(referr));
            return reject({ text: '\u270B Whoa now! You need to reauthorize first.\nVisit this URL to login to Salesforce: https://' + String((0, _config2['default'])('HEROKU_SUBDOMAIN')) + '.herokuapp.com/login/' + String(userId) });
          });
        }

        return resolve(retrieveSfObj(conn));
      });
    })['catch'](function (err) {
      reject(err);
    });
  });
};

function retrieveSfObj(conn) {
  return {
    // maybe also want to check if any tickets have been assigned to user, resolved or closed since last login?
    welcomeUser: function () {
      function welcomeUser(user) {
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('--> [salesforce] welcoming returning user: ' + String(user.sf_id));

          var newcases = [];
          var updates = [];

          conn.sobject('Case').find({ OwnerId: user.sf_id }, returnParams).sort('-LastModifiedDate -CaseNumber').execute(function (err, records) {
            if (err) return reject(err);
            console.log('Records:\n' + String(_util2['default'].inspect(records)));
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = (0, _getIterator3['default'])(records), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var r = _step.value;

                if (r.CreatedDate > user.lastLogin && r.Status === 'New') newcases.push(r);else if (r.LastModifiedDate > user.lastLogin && r.LastModifiedById !== user.sf_id) updates.push(r);
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator['return']) {
                  _iterator['return']();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            return resolve({ newcases: newcases, updates: updates });
          });
        });
      }

      return welcomeUser;
    }(),
    knowledge: function () {
      function knowledge(text) {
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('--> [salesforce] knowledge search\n    options:\n' + String(_util2['default'].inspect(text)));
          var articles = [];
          var search = _lodash2['default'].replace(text, '-', ' ');
          console.log('--> search string: ' + String(search));
          return conn.search('FIND {' + String(addslashes(search)) + '} IN All Fields RETURNING Knowledge__kav (Id, KnowledgeArticleId, UrlName, Title, Summary,\n          LastPublishedDate, ArticleNumber, CreatedBy.Name, CreatedDate, VersionNumber, body__c WHERE PublishStatus = \'Online\' AND Language = \'en_US\'\n          AND IsLatestVersion = true)', function (err, res) {
            if (err) return reject(err);
            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = (0, _getIterator3['default'])(res.searchRecords), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var r = _step2.value;

                r.title_link = String(conn.instanceUrl) + '/' + String(r.UrlName);
                articles.push(r);
              }
            } catch (err) {
              _didIteratorError2 = true;
              _iteratorError2 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                  _iterator2['return']();
                }
              } finally {
                if (_didIteratorError2) {
                  throw _iteratorError2;
                }
              }
            }

            return resolve(articles);
          });
        });
      }

      return knowledge;
    }(),
    createIncident: function () {
      function createIncident(options) {
        return new _bluebird2['default'](function (resolve, reject) {
          var request = void 0;
          options.RecordTypeId = record('id', 'Incident');
          console.log('--> [salesforce] incident creation\n    options:\n' + String(_util2['default'].inspect(options)));

          conn.sobject('Case').create(options, function (err, ret) {
            if (err || !ret.success) return reject(err);
            console.log('--> success! Created records id: ' + String(ret.id) + '\n' + String(_util2['default'].inspect(ret)));
            request = ret;
            request.link = String(conn.instanceUrl) + '/' + String(ret.id);
            return conn.sobject('Case').retrieve(ret.id, function (reterr, res) {
              if (reterr) return reject(reterr);
              request.CaseNumber = res.CaseNumber;
              console.log('--> got new case back:\n' + String(_util2['default'].inspect(request)));
              return resolve(request);
            });
          });
        });
      }

      return createIncident;
    }(),
    singleRecord: function () {
      function singleRecord(options) {
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('\n--> [salesforce] singleRecord\n    options:\n' + String(_util2['default'].inspect(options)));
          var response = [];
          var type = record('id', options.RecordType);
          var searchParams = options;

          delete searchParams.Owner;
          delete searchParams.RecordType;
          delete searchParams.Sortby;

          searchParams = _lodash2['default'].omitBy(searchParams, _lodash2['default'].isNil);
          if (searchParams.CaseNumber && searchParams.CaseNumber !== 'undefined') searchParams.CaseNumber = formatCaseNumber(searchParams.CaseNumber);

          console.log('Search Params:\n' + String(_util2['default'].inspect(searchParams)));
          console.log('Return Params:\n' + String(_util2['default'].inspect(returnParams)));

          conn.sobject('Case').find(searchParams, returnParams) // need handler for if no number and going by latest or something
          .execute(function (err, records) {
            if (err) return reject(err);
            console.log('Records:\n' + String(_util2['default'].inspect(records)));
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
              for (var _iterator3 = (0, _getIterator3['default'])(records), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var r = _step3.value;

                r.RecordTypeMatch = true;
                r.RecordTypeName = record('name', r.RecordTypeId);
                r.title_link = String(conn.instanceUrl) + '/' + String(r.Id);
                if (type && r.RecordTypeId !== type) {
                  console.log('Type Mismatch! type: ' + String(type) + ' != RecordTypeId: ' + String(r.RecordTypeId));
                  r.RecordTypeMatch = false;
                }
                response.push(r);
              }
            } catch (err) {
              _didIteratorError3 = true;
              _iteratorError3 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                  _iterator3['return']();
                }
              } finally {
                if (_didIteratorError3) {
                  throw _iteratorError3;
                }
              }
            }

            return resolve(response[0]);
          });
        });
      }

      return singleRecord;
    }(),
    multiRecord: function () {
      function multiRecord(options) {
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('\n--> [salesforce] multiRecord\n    options:\n' + String(_util2['default'].inspect(options)));
          var searchParams = options;

          if (options.RecordType) {
            var type = record('id', options.RecordType);
            searchParams.RecordTypeId = type;
          }

          delete searchParams.Owner;
          delete searchParams.RecordType;
          delete searchParams.Sortby;

          searchParams = _lodash2['default'].omitBy(searchParams, _lodash2['default'].isNil);
          if (searchParams.CaseNumber && searchParams.CaseNumber !== 'undefined') searchParams.CaseNumber = formatCaseNumber(searchParams.CaseNumber);

          console.log('Search Params:\n' + String(_util2['default'].inspect(searchParams)));
          console.log('Return Params:\n' + String(_util2['default'].inspect(returnParams)));

          conn.sobject('Case').find(searchParams, returnParams) // need handler for if no number and going by latest or something
          .sort('-LastModifiedDate -CaseNumber').execute(function (err, records) {
            if (err) return reject(err);
            console.log('Records:\n' + String(_util2['default'].inspect(records)));
            return resolve(records); // need to include sorting at some point
          });
        });
      }

      return multiRecord;
    }(),
    metrics: function () {
      function metrics(options) {
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('\n--> [salesforce] metrics\n    options:\n' + String(_util2['default'].inspect(options)));
          var response = [];
          var type = record('id', options.RecordType);
          var searchParams = options;

          var startClosedDate = (0, _dateformat2['default'])(options.DatePeriod.split('/')[0], 'isoDateTime');
          var endClosedDate = (0, _dateformat2['default'])(options.DatePeriod.split('/')[1], 'isoDateTime');

          console.log('startClosedDate = ' + String(_util2['default'].inspect(startClosedDate)));
          console.log('endClosedDate = ' + String(_util2['default'].inspect(endClosedDate)));

          var statusDateType = '';
          if (searchParams.StatusChange === 'Closed') statusDateType = 'ClosedDate';
          if (searchParams.StatusChange === 'Opened') statusDateType = 'CreatedDate';
          searchParams = _lodash2['default'].omitBy(searchParams, _lodash2['default'].isNil);

          console.log('Search Params: ' + String(_util2['default'].inspect(searchParams)));
          console.log('Return Params:\n' + String(_util2['default'].inspect(returnParams)));
          conn.sobject('Case').find(searchParams, returnParams) // need handler for if no number and going by latest or something
          .where(statusDateType + ' >= ' + String(startClosedDate) + ' AND ' + statusDateType + ' <= ' + String(endClosedDate)).sort('-LastModifiedDate').execute(function (err, records) {
            if (err) return reject(err);
            var sampleRecords = records.slice(0, 5); // Show first 5 records

            console.log('Found ' + String(records.length) + ' Records:\n' + String(_util2['default'].inspect(sampleRecords)));
            var _iteratorNormalCompletion4 = true;
            var _didIteratorError4 = false;
            var _iteratorError4 = undefined;

            try {
              for (var _iterator4 = (0, _getIterator3['default'])(records), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                var r = _step4.value;

                console.log('Adding ' + String(r.CaseNumber) + ' - ' + String(r.RecordTypeId));
                r.RecordTypeMatch = true;
                r.RecordTypeName = record('name', r.RecordTypeId);
                r.title_link = String(conn.instanceUrl) + '/' + String(r.Id);
                console.log('Adding ' + String(r.CaseNumber) + ' - ' + String(r.RecordTypeId));
                if (type && r.RecordTypeId !== type) {
                  console.log('Type Mismatch! type: ' + String(type) + ' != RecordTypeId: ' + String(r.RecordTypeId));
                  r.RecordTypeMatch = false;
                }
                console.log('Adding ' + String(r.CaseNumber) + ' - ' + String(r.RecordTypeId));
                response.push(r);
              }
            } catch (err) {
              _didIteratorError4 = true;
              _iteratorError4 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                  _iterator4['return']();
                }
              } finally {
                if (_didIteratorError4) {
                  throw _iteratorError4;
                }
              }
            }

            return resolve(response);
          });
        });
      }

      return metrics;
    }(),
    update: function () {
      function update(options) {
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('\n--> [salesforce] update\n    options:\n' + String(_util2['default'].inspect(options)));

          conn.sobject('Case').update(options, function (err, ret) {
            if (err || !ret.success) return reject(err);
            console.log('--> updated successfully');
            return resolve();
          });
        });
      }

      return update;
    }(),
    comments: function () {
      function comments(objectId) {
        var _this = this;

        console.log('--> [salesforce] comments - Case: ' + String(objectId) + ' **');
        var comments = [];
        return new _bluebird2['default'](function (resolve, reject) {
          return _this.getCaseFeed(objectId).then(function (caseFeed) {
            return _bluebird2['default'].map(caseFeed, function (comment) {
              console.log('[comments] mapping users to feed objects');
              return _this.getUser(comment.CreatedById).then(function (user) {
                if (user) comment.User = user;else comment.User = null;
                return comment;
              });
            }).each(function (r) {
              console.log('[comments .each]');
              if (r.Body) comments.push(r);
              return comments;
            });
          }).then(function () {
            console.log('[comments .then]\n' + String(_util2['default'].inspect(comments)));
            return _bluebird2['default'].all(comments).then(resolve(comments));
          })['catch'](function (err) {
            reject(err);
          });
        });
      }

      return comments;
    }(),
    feedComments: function () {
      function feedComments(parentId, caseFeedId) {
        var _this2 = this;

        // need to retrieve only the comment which exists in the feedViews for the case
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('** [salesforce] retrieving FeedComments for case: ' + String(parentId) + ' feed: ' + String(caseFeedId) + ' **');
          var feedComments = [];

          conn.sobject('FeedComment').find({ ParentId: parentId, FeedItemId: caseFeedId }).orderby('-CreatedDate').execute(function (err, records) {
            if (err) reject(err);
            return _bluebird2['default'].map(records, function (r) {
              return _this2.getUser(r.CreatedById).then(function (user) {
                if (user) r.User = user;else r.User = null;
                return r;
              });
            }).each(function (feed) {
              if (feed.IsDeleted === false) {
                feedComments.push(feed);
              }
              return feedComments;
            }).then(function () {
              _bluebird2['default'].all(feedComments).then(resolve(feedComments));
            });
          });
        });
      }

      return feedComments;
    }(),
    createComment: function () {
      function createComment(objectId, userId, comment) {
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('** [salesforce] posting ' + String(comment) + '\n   on case: ' + String(objectId) + ' for user: ' + String(userId) + ' **');

          conn.sobject('FeedItem').create({
            ParentId: objectId,
            Type: 'TextPost',
            InsertedById: userId,
            Body: comment,
            Visibility: 'AllUsers'
          }, function (err, ret) {
            console.log('--> finsihed creating comment: ' + String(ret.success));
            if (err || !ret.success) return reject(err);
            return resolve(ret);
          });
        });
      }

      return createComment;
    }(),
    createFeedComment: function () {
      function createFeedComment(caseFeedId, userId, comment) {
        return new _bluebird2['default'](function (resolve, reject) {
          console.log('** [salesforce] posting ' + String(comment) + '\n   on casefeed: ' + String(caseFeedId) + ' for user: ' + String(userId) + ' **');

          conn.sobject('FeedComment').create({
            FeedItemId: caseFeedId,
            CommentType: 'TextComment',
            InsertedById: userId,
            CommentBody: comment
          }, function (err, ret) {
            console.log('--> finished creating feed comment: ' + String(_util2['default'].inspect(ret)));
            if (err) return reject(err); // || !ret.success
            return resolve(ret);
          });
        });
      }

      return createFeedComment;
    }(),
    getCaseOwner: function () {
      function getCaseOwner(id) {
        return new _bluebird2['default'](function (resolve, reject) {
          conn.query('SELECT OwnerId FROM Case WHERE Id = \'' + String(id) + '\'', function (err, result) {
            if (err) return reject(err);
            var OwnerId = result.records[0].OwnerId;
            return resolve(OwnerId);
          });
        });
      }

      return getCaseOwner;
    }(),
    getCaseFeed: function () {
      function getCaseFeed(id) {
        return new _bluebird2['default'](function (resolve, reject) {
          conn.sobject('FeedItem').find({ ParentId: id, Type: 'TextPost' }).orderby('-LastModifiedDate').execute(function (err, records) {
            if (err) return reject(err);
            console.log('[getCaseFeed] got records');
            return resolve(records);
          });
        });
      }

      return getCaseFeed;
    }(),


    // NOTE: these are the fields we want from this function
    // Name: 'Devin Janus
    // SmallPhotoUrl: 'https://c.cs60.content.force.com/profilephoto/7293C000000CavH/T'
    // MediumPhotoUrl: 'https://c.cs60.content.force.com/profilephoto/7293C000000CavH/M'
    // FullPhotoUrl: 'https://c.cs60.content.force.com/profilephoto/7293C000000CavH/F
    // --> the only difference between photourls is the T/M/F at the end
    getUser: function () {
      function getUser(id) {
        return new _bluebird2['default'](function (resolve, reject) {
          var token = conn.accessToken;
          conn.sobject('User').find({ Id: id }).execute(function (err, records) {
            if (err || !records) reject(err || 'no records found');
            // console.log(`--> got user:\n${util.inspect(records[0])}`)
            var user = {
              Name: records[0].Name,
              FirstName: records[0].FirstName,
              Photo: String(records[0].FullPhotoUrl) + '?oauth_token=' + String(token),
              MobilePhone: records[0].MobilePhone,
              CompanyName: records[0].CompanyName,
              Department: records[0].Department,
              Email: records[0].Email,
              PortalRole: records[0].PortalRole,
              IsPortalEnabled: records[0].IsPortalEnabled,
              SamanageESD_FullName__c: records[0].SamanageESD_FullName__c,
              SamanageESD_RoleName__c: records[0].SamanageESD_RoleName__c
            };
            return resolve(user);
          });
        });
      }

      return getUser;
    }()
  };
}