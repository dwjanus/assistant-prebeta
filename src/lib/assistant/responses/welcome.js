import db from '../../../config/db.js'
import dateFormat from 'dateformat'
import util from 'util'

const query = db.querySql
const now = new Date()

exports.welcome = (args, cb) => {
  console.log('--> inside welcome case')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  let text = 'Welcome '
  const datetime = dateFormat(now, 'isoDateTime')

  console.log('--> updating user info')
  return ebu.getUser(user.sf_id).then((userInfo) => {
    const updateUserQry = `UPDATE users SET Name = '${userInfo.Name}', FirstName = '${userInfo.FirstName}',
      Photo = '${userInfo.Photo}', MobilePhone = '${userInfo.MobilePhone}', Department = '${userInfo.Department}',
      Email = '${userInfo.Email}', PortalRole = '${userInfo.PortalRole}', IsPortalEnabled = '${userInfo.IsPortalEnabled}',
      lastLogin = '${datetime}', SamanageESD__RoleName__c = '${userInfo.SamanageESD__RoleName__c}'
      WHERE user_id = '${user.user_id}'`

    if (!user.lastLogin) {
      if (userInfo.FirstName) text += `${userInfo.FirstName}`
      text += '! '
      text += 'What can I do for you?'
      return updateUserQry
    }

    text += `back ${userInfo.FirstName}! `
    return ebu.welcomeUser(user).then((welcome) => {
      console.log(`--> got cases back from welcome\n${util.inspect(welcome)}`)
      const updates = welcome.updates
      const newcases = welcome.newcases
      const totalSize = updates.length + newcases.length

      if (totalSize === 0) {
        text += 'Currently there are no updates to report.'
        return query(updateUserQry)
      }

      if (updates.length === 1) text += `A change has been made to ticket ${updates[0].CaseNumber}`
      if (updates.length > 1) text += `${updates.length} of your cases have been modified`
      if (newcases.length === 1) text += `${updates.length > 0 ? ' and you' : 'You'} have 1 new case`
      if (newcases.length > 1) text += `${updates.length > 0 ? 'and you' : 'You'} have ${newcases.length} new cases.`

      if (totalSize === 1) {
        // save record
        const saved = updates.length > 0 ? JSON.stringify(updates) : JSON.stringify(newcases)
        const updateLastRecordStr = `UPDATE users SET lastRecord = '${saved}' WHERE user_id = '${user.user_id}'`
        console.log(`--> created json object for saved record:\n${util.inspect(saved)}`)
        app.setContext('single-record')
        return query(updateUserQry).then(() => query(updateLastRecordStr))
      }

      // save records
      let saved = {}
      if (updates.length > 0) saved.updates = updates
      if (newcases.length > 0) saved.newcases = newcases
      console.log(`--> created json object for saved record:\n${util.inspect(saved)}`)
      saved = JSON.stringify(saved)
      const updateLastRecordStr = `UPDATE users SET lastRecord = '${saved}' WHERE user_id = '${user.user_id}'`
      app.setContext('welcome-multi-record')
      return query(updateUserQry).then(() => query(updateLastRecordStr))
    })
  })
  .then(() => cb(null, text))
  .catch(err => cb(err, null))
}

exports.thankyou = (args, cb) => {
  console.log('--> inside thankyou case')

  const text = 'Anytime fam!'
  return cb(null, text)
}
