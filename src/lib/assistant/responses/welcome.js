import db from '../../../config/db.js'

const query = db.querySql

exports.welcome = (args, cb) => {
  console.log('--> inside welcome case')

  const user = args.user
  const ebu = args.ebu
  const text = 'What can I do for you? If you are not totally sure what to do, just say \"I need help\"'

  if (!user.SamanageESD_FullName__c) {
    console.log('--> updating user info')
    return ebu.getUser(user.sf_id).then((userInfo) => {
      if (!userInfo.SamanageESD_FullName__c) userInfo.SamanageESD_FullName__c = 'undefined'
      const updateUserQry = `UPDATE users SET Name = '${userInfo.Name}', Photo = '${userInfo.Photo}',
        MobilePhone = '${userInfo.MobilePhone}', CompanyName = '${userInfo.CompanyName}', Department = '${userInfo.Department}',
        Email = '${userInfo.Email}', PortalRole = '${userInfo.PortalRole}', IsPortalEnabled = '${userInfo.IsPortalEnabled}',
        SamanageESD__FullName__c = '${userInfo.SamanageESD__FullName__c}', SamanageESD__RoleName__c = '${userInfo.SamanageESD__RoleName__c}'
        WHERE user_id = '${user.user_id}'`
      return updateUserQry
    })
    .then(updateUserQry => query(updateUserQry))
    .then(() => cb(null, text, args.app))
    .catch(err => cb(err, null, args.app))
  }

  console.log('All user field info appears in db')
  return cb(null, text, args.app)
}
