'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var ENV = process.env.NODE_ENV || 'development';

if (ENV === 'development') _dotenv2['default'].load();

var config = {
  ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PROXY_URI: process.env.PROXY_URI,
  GOOGLE_ID: process.env.GOOGLE_ID,
  JAWSDB_URL: process.env.JAWSDB_URL,
  CACHE_UN: process.env.MEMCACHEDCLOUD_USERNAME,
  CACHE_PW: process.env.MEMCACHEDCLOUD_PASSWORD,
  CACHE_SV: process.env.MEMCACHEDCLOUD_SERVERS,
  MONGODB_URI: process.env.MONGODB_URI,
  SF_ID: process.env.SF_ID,
  SF_SECRET: process.env.SF_SECRET,
  HEROKU_SUBDOMAIN: process.env.HEROKU_SUBDOMAIN
};

exports['default'] = function (key) {
  if (!key) return config;
  return config[key];
};