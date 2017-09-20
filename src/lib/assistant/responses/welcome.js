import db from '../../../config/db.js'
import dateFormat from 'dateformat'
import util from 'util'

const query = db.querySql
const now = new Date()

exports.welcome = (args, cb) => {
  console.log('--> inside welcome case')

  const user = args.user
  const ebu = args.ebu
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

    text += `back ${user.FirstName}! `
    return ebu.welcomeUser(user).then((welcome) => {
      console.log(`--> got cases back from welcome\n${util.inspect(welcome)}`)
      if (welcome.updates.length === 0 && welcome.newcases.length) text += 'Currently there are no updates to report.'
      if (welcome.updates.length > 0) {
        if (welcome.updates.length === 1) text += `A change has been made to ticket ${welcome.updates[0].CaseNumber}`
        if (welcome.updates.length > 1) text += `${welcome.updates.length} of your cases have been modified`
        if (welcome.newcases.length > 1) text += ` and you have ${welcome.newcases.length} new cases.`
        if (welcome.newcases.length === 1) text += ' and you have 1 new case.'
      } else {
        if (welcome.newcases.length > 1) text += `You have ${welcome.newcases.length} new cases.`
        if (welcome.newcases.length === 1) text += 'You have 1 new case.'
      }

      return updateUserQry
    })
  })
  .then(updateUserQry => query(updateUserQry))
  .then(() => cb(null, text))
  .catch(err => cb(err, null))
}

exports.thankyou = (args, cb) => {
  console.log('--> inside thankyou case')

  const text = 'Anytime fam!'
  return cb(null, text)
}
