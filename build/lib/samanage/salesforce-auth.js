'use strict';

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _jsforce = require('jsforce');

var _jsforce2 = _interopRequireDefault(_jsforce);

var _config = require('../../config/config.js');

var _config2 = _interopRequireDefault(_config);

var _memjs = require('memjs');

var _memjs2 = _interopRequireDefault(_memjs);

var _db = require('../../config/db.js');

var _db2 = _interopRequireDefault(_db);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var query = _db2['default'].querySql;
var client = _memjs2['default'].Client.create((0, _config2['default'])('CACHE_SV'), {
  username: (0, _config2['default'])('CACHE_UN'),
  password: (0, _config2['default'])('CACHE_PW')
});

// ************************************** //
// Establish connection to Salesforce API //
// ************************************** //

var oauth2 = new _jsforce2['default'].OAuth2({
  // loginUrl: 'https://test.salesforce.com',
  clientId: (0, _config2['default'])('SF_ID'),
  clientSecret: (0, _config2['default'])('SF_SECRET'),
  redirectUri: 'https://' + String((0, _config2['default'])('HEROKU_SUBDOMAIN')) + '.herokuapp.com/authorize'
});

exports.login = function (req, res) {
  console.log('[salesforce-auth] ** Starting up salesforce-auth.login now **');
  console.log('[salesforce-auth] ** req url: ' + String(_util2['default'].inspect(req.url)));
  var redirect = oauth2.getAuthorizationUrl({ scope: 'api id web refresh_token' });
  redirect += '&state=' + String(req.params.userId);
  console.log('[salesforce-auth] ** generated our salesforce auth url: ' + String(redirect));
  res.redirect(redirect);
};

exports.oauthCallback = function (req, res) {
  var userId = req.query.state;
  var code = req.query.code;
  var conn = new _jsforce2['default'].Connection({ oauth2: oauth2 });
  console.log('--> (oauth callback) salesforce-auth /authorize\n    userId: ' + String(userId) + '\n');

  conn.authorize(code, function (err, userInfo) {
    if (err) res.status(500).send('!!! AUTH ERROR: ' + String(err));
    console.log('--> authorizing for user: ' + String(_util2['default'].inspect(userInfo)));

    var insertStr = 'INSERT INTO users (user_id, sf_id, sf_org, url, access, refresh) ' + ('VALUES (\'' + String(userId) + '\', \'' + String(userInfo.id) + '\', \'' + String(userInfo.organizationId) + '\', \'' + String(conn.instanceUrl) + '\', \'' + String(conn.accessToken) + '\', \'' + String(conn.refreshToken) + '\')');

    return query(insertStr).then(function (result) {
      console.log('--> saved user info: ' + String(result));

      client.get(userId, function (error, redir) {
        if (error) console.log('MEM_CACHE ERROR: ' + String(error));
        return res.redirect(redir);
      });
    })['catch'](function (insError) {
      console.log('Error storing user info - ' + String(insError));
    });
  });

  conn.on('refresh', function (newToken, refres) {
    console.log('--> salesforce-auth got a refresh event from Salesforce!\n    new token: ' + String(newToken) + '\n');
    console.log('    response:\n' + String(_util2['default'].inspect(refres)));

    var updateQry = 'UPDATE users SET access = \'' + String(newToken) + '\' WHERE user_id = \'' + String(userId) + '\'';

    return query(updateQry).then(function (result) {
      console.log('--> updated user info: ' + String(_util2['default'].inspect(result)));
    })['catch'](function (upError) {
      console.log('Error updating user token: ' + String(upError));
    });
  });
};