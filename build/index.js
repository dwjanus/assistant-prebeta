'use strict';

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _config = require('./config/config.js');

var _config2 = _interopRequireDefault(_config);

var _salesforceAuth = require('./lib/samanage/salesforce-auth.js');

var _salesforceAuth2 = _interopRequireDefault(_salesforceAuth);

var _googleAuth = require('./lib/assistant/google-auth.js');

var _googleAuth2 = _interopRequireDefault(_googleAuth);

var _db = require('./config/db.js');

var _db2 = _interopRequireDefault(_db);

var _ebuAssistantHandler = require('./lib/assistant/ebu-assistant-handler.js');

var _ebuAssistantHandler2 = _interopRequireDefault(_ebuAssistantHandler);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var app = (0, _express2['default'])();
var query = _db2['default'].querySql;
var ApiAiApp = require('actions-on-google').ApiAiAssistant;
var port = process.env.port || process.env.PORT || (0, _config2['default'])('PORT') || 8080;
if (!port) {
  console.log('Error: Port not specified in environment');
  process.exit(1);
}

app.set('port', port);
app.use(_express2['default']['static'](_path2['default'].join(__dirname, '../public')));
app.use(_bodyParser2['default'].json({ type: 'application/json', limit: '50mb' }));
app.use(_bodyParser2['default'].urlencoded({ extended: true }));

app.get('/', function (request, response) {
  response.sendFile('index.html');
});

app.get('/auth', _googleAuth2['default'].auth);
app.post('/token', _googleAuth2['default'].token);
app.get('/login/:userId', _salesforceAuth2['default'].login);
app.get('/authorize', _salesforceAuth2['default'].oauthCallback);

app.post('/actions', function (request, response) {
  console.log('\n--> /actions Webhook Received\n');

  var ApiAiConstructor = { request: request, response: response };
  if (request.body.sessionId) ApiAiConstructor = { request: request, response: response, sessionId: request.body.sessionId };
  var assistant = new ApiAiApp(ApiAiConstructor);
  var currentUser = assistant.getUser();
  var currentToken = currentUser.access_token;
  var userQry = 'SELECT user_id from codes WHERE code_id = \'' + String(currentToken) + '\' AND type = \'access\'';

  // console.log(`    user data from request:\n${util.inspect(request.body.originalRequest.data)}\n`)
  console.log('    user:\n' + String(_util2['default'].inspect(currentUser)) + '\n');

  query(userQry).then(function (result) {
    return result[0].user_id;
  }).then(function (userId) {
    console.log('--> starting up Assistant for user: ' + String(userId));
    query('SELECT * from users WHERE user_id = \'' + String(userId) + '\'').then(function (user) {
      // --> this is where we would check the token
      (0, _ebuAssistantHandler2['default'])(assistant, user[0]);
    });
  });
});

var server = app.listen(app.get('port'), function () {
  console.log('App listening on port %s', server.address().port);
  console.log('Press Ctrl+C to quit');
});