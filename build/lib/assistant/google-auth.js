'use strict';

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _config = require('../../config/config.js');

var _config2 = _interopRequireDefault(_config);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _shortid = require('shortid');

var _shortid2 = _interopRequireDefault(_shortid);

var _memjs = require('memjs');

var _memjs2 = _interopRequireDefault(_memjs);

var _db = require('../../config/db.js');

var _db2 = _interopRequireDefault(_db);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var query = _db2['default'].querySql;
var client = _memjs2['default'].Client.create((0, _config2['default'])('CACHE_SV'), {
  username: (0, _config2['default'])('CACHE_UN'),
  password: (0, _config2['default'])('CACHE_PW')
});

function expiration(getset) {
  var date = new Date();
  var year = date.getFullYear();

  var hour = date.getHours();
  if (getset === 'setaccess') hour += 1;
  hour = (hour < 10 ? '0' : '') + hour;

  var min = date.getMinutes();
  if (getset === 'set') min += 10;
  min = (min < 10 ? '0' : '') + min;

  var month = date.getMonth() + 1;
  month = (month < 10 ? '0' : '') + month;

  var day = date.getDate();
  day = (day < 10 ? '0' : '') + day;

  return String(year) + '-' + String(month) + '-' + String(day) + ' ' + String(hour) + ':' + String(min);
}

exports.auth = function (req, res) {
  console.log('--> google-auth /auth\n');
  console.log('    req url: ' + String(req.url));
  // --> verify client id matches the one in google console

  // --> create user and save to db
  var state = req.query.state;
  var userId = _shortid2['default'].generate();
  var code = _crypto2['default'].randomBytes(16).toString('base64');
  var expiresAt = expiration('set');
  var redir = 'https://oauth-redirect.googleusercontent.com/r/' + String((0, _config2['default'])('HEROKU_SUBDOMAIN')) + '?code=' + String(code) + '&state=' + String(state);

  console.log('--> caching redirect url: ' + redir);

  client.set(userId, redir, { expires: 600 }, function (error, val) {
    if (error) console.log('!!! MEM CACHE ERROR: ' + String(error));
    console.log('--> redirect cached\n    key: ' + String(userId) + '\n    val: ' + String(val));
  });

  console.log('--> saving auth code: ' + String(code));

  var insertQry = 'INSERT INTO codes (code_id, type, user_id, client_id, expires_at) ' + ('VALUES (\'' + String(code) + '\', \'auth_code\', \'' + String(userId) + '\', \'' + String((0, _config2['default'])('GOOGLE_ID')) + '\', \'' + String(expiresAt) + '\')');

  return query(insertQry).then(function () {
    return res.redirect('https://' + String((0, _config2['default'])('HEROKU_SUBDOMAIN')) + '.herokuapp.com/login/' + String(userId));
  })['catch'](function (insError) {
    console.log('--> Error storing auth code <--\n' + String(insError));
  });
};

exports.token = function (req, res) {
  res.setHeader('Content-Type', 'application/json');
  var grant = req.body.grant_type;
  var code = req.body.code;
  var currentTime = expiration('get');
  // const secret = req.query.secret // we will check this later
  var response = {
    token_type: 'bearer',
    expires_in: 3600
  };

  console.log('--> google-auth /token');
  console.log('    req url: ' + String(_util2['default'].inspect(req.url)));
  console.log('    req body: ' + String(_util2['default'].inspect(req.body)) + '}');

  // --> retrieve auth record
  if (grant === 'authorization_code') {
    console.log('    grant type = AUTH\n--> code: ' + String(code));
    if (/\s/.test(code)) {
      code = code.replace(/\s/g, '+');
      console.log('    whitespace detected\n--> new code: ' + String(code));
    }
    var codeQryStr = 'SELECT user_id FROM codes WHERE code_id = \'' + String(code) + '\'';

    return query(codeQryStr).then(function (result) {
      console.log('auth code retrieved from db: ' + String(_util2['default'].inspect(result)));
      if (!result) {
        res.sendStatus(500);
        return _bluebird2['default'].reject('    Failure: No rows found');
      }

      if (currentTime > result[0].expires_at) {
        console.log('\n--! discrepency registered between expiration times !--');
        console.log('       > currentTime: ' + String(currentTime) + '  -  expiresAt: ' + String(result[0].expires_at));
        // res.sendStatus(500)
      }

      if (req.body.client_id !== result[0].client_id) {
        console.log('\n--! discrepency registered between client Ids !--');
        console.log('       > req: ' + String(req.body.client_id) + '  -  auth: ' + String(result[0].client_id));
        // res.sendStatus(500)
      }

      return result[0].user_id;
    }).then(function (userId) {
      var accessToken = _crypto2['default'].randomBytes(16).toString('base64');
      var refreshToken = _crypto2['default'].randomBytes(16).toString('base64');
      var expiresAt = expiration('setaccess');
      var accessQryStr = 'INSERT INTO codes (code_id, type, user_id, client_id, expires_at) ' + ('VALUES (\'' + String(accessToken) + '\', \'access\', \'' + String(userId) + '\', \'samanage\', \'' + String(expiresAt) + '\')');
      var refreshQryStr = 'INSERT INTO codes (code_id, type, user_id, client_id) ' + ('VALUES (\'' + String(refreshToken) + '\', \'refresh\', \'' + String(userId) + '\', \'samanage\')');

      _bluebird2['default'].join(query(accessQryStr), query(refreshQryStr), function () {
        console.log('--> saved access token\n--> saved refresh token');
      }).then(function () {
        response.access_token = accessToken;
        response.refresh_token = refreshToken;

        console.log('    access: ' + String(accessToken) + '\n    refresh: ' + String(refreshToken));
        return res.json(response).end();
      })['catch'](function (insError) {
        console.log('--> Error storing access/refresh tokens <--\n' + String(insError));
      });
    })['catch'](function (err) {
      console.log('--> Error retrieving auth code from storage <--\n' + String(err));
      return res.sendStatus(500);
    });
  }

  if (grant === 'refresh_token') {
    console.log('--> Refresh Token recieved');

    var accessToken = _crypto2['default'].randomBytes(16).toString('base64');
    response.access_token = accessToken;
    var expiresAt = expiration('setaccess');
    var selectQry = 'SELECT user_id FROM codes WHERE code_id = \'' + String(req.body.refresh_token) + '\' AND type = \'refresh\'';

    return query(selectQry).then(function (selectResult) {
      console.log('--> retrieved user_id from refresh code: ' + String(_util2['default'].inspect(selectResult)));
      return selectResult[0].user_id;
    }).then(function (userId) {
      var updateQry = 'UPDATE codes SET code_id = \'' + String(accessToken) + '\', expires_at = \'' + String(expiresAt) + '\' WHERE user_id = \'' + String(userId) + '\'\n        AND type = \'access\'';

      return query(updateQry).then(function () {
        console.log('--> saved user info');
        console.log('--> sending response object back');
        return res.json(response).end();
      })['catch'](function (upError) {
        console.log('--> Error in DB UPDATE <--\n' + String(upError));
      });
    })['catch'](function (selError) {
      console.log('--> Error in DB SELECT<--\n' + String(selError));
    });
  }
};