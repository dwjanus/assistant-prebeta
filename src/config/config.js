import dotenv from 'dotenv'
const ENV = process.env.NODE_ENV || 'development'

if (ENV === 'development') dotenv.load()

const config = {
  ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  PROXY_URI: process.env.PROXY_URI,
  MONGODB_URI: process.env.MONGODB_URI,
  SF_ID: process.env.SF_ID,
  SF_SECRET: process.env.SF_SECRET,
  GOOGLE_ID: process.env.GOOGLE_ID,
  CACHE_UN: process.env.MEMCACHEDCLOUD_USERNAME,
  CACHE_PW: process.env.MEMCACHEDCLOUD_PASSWORD,
  CACHE_SV: process.env.MEMCACHEDCLOUD_SERVERS
}

export default (key) => {
  if (!key) return config
  return config[key]
}
