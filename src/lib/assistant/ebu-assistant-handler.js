import util from 'util'
import Promise from 'bluebird'
import samanage from '../samanage/ebu-api.js'
import db from '../../config/db.js'

const query = db.querySql

// consts for intent map
const GOOGLE_ASSISTANT_WELCOME = 'input.welcome'

const welcomeIntent = (args, cb) => {
  console.log('--> inside welcome case')

  const user = args.user
  const ebu = args.ebu
  const text = 'What can I do for you? If you are not totally sure what to do, just say: I need help'

  if (!user.SamanageESD_FullName__c) {
    console.log('--> updating user info')
    return ebu.getUser(user.sf_id).then((userInfo) => {
      if (!userInfo.SamanageESD_FullName__c) userInfo.SamanageESD_FullName__c = 'undefined'
      const updateUserQry = `UPDATE users SET Name = '${userInfo.Name}', Photo = '${userInfo.Photo}',
        MobilePhone = '${userInfo.MobilePhone}', CompanyName = '${userInfo.CompanyName}', Department = '${userInfo.Department}',
        Email = '${userInfo.Email}', PortalRole = '${userInfo.PortalRole}', IsPortalEnabled = '${userInfo.IsPortalEnabled}',
        SamanageESD_FullName__c = '${userInfo.SamanageESD_FullName__c}', SamanageESD_RoleName__c = '${userInfo.SamanageESD_RoleName__c}'
        WHERE user_id = '${user.user_id}'`
      return updateUserQry
    })
    .then(updateUserQry => query(updateUserQry))
    .then(() => cb(null, text))
    .catch(err => cb(err, null))
  }

  console.log('All user field info appears in db')
  return cb(null, text)
}

const actionMap = new Map()

actionMap.set(GOOGLE_ASSISTANT_WELCOME, welcomeIntent)

export default ((app, user) => {
  console.log(`--> ebu assistant handler started for user: ${user.user_id}`)
  const context = app.getContexts()
  const action = actionMap.get(app.getIntent())
  const promisedAction = Promise.promisify(action)
  console.log(`    context: ${util.inspect(context)}`)
  samanage(user.user_id).then((ebu) => {
    console.log('--> got ebu object back')

    promisedAction({ app, ebu, user }).then((result) => {
      console.log('--> promisedAction')
      // if (context[0].name === 'comments') {
      //   console.log('    comments context recieved > asking with list now...')
      //   app.askWithList('Do you want to respond?', app.buildList('Comments').addItems(result))
      // } else
      app.ask(result)
    })
  })
  .catch((err) => {
    console.log(err)
    if (err.text) app.tell(err.text)
  })
})
