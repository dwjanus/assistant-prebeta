import util from 'util'
import Promise from 'bluebird'
import samanage from '../samanage/ebu-api.js'
import db from '../../config/db.js'

const query = db.querySql

// consts for intent map
const GOOGLE_ASSISTANT_WELCOME = 'input.welcome'
const KNOWLEDGE_NO_CONTEXT = 'general.knowledge-nocontext'

const welcome = (args, cb) => {
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


const knowledge = (args, cb) => {
  console.log('--> inside knowledge case')

  const ebu = args.ebu
  const app = args.app
  const subject = app.getArgument('subject')
  const text = 'Got some articles for you fam'

  return ebu.knowledge(subject).then((articles) => {
    console.log(`--> articles retrieved:\n${util.inspect(articles)}`)
    return cb(null, text)
  })
  .catch(err => cb(err, null))
}


const actionMap = new Map()
actionMap.set(GOOGLE_ASSISTANT_WELCOME, welcome)
// eventually make contextual intent of knowledge rout to same function and pull subject from
// context provided in conversation
actionMap.set(KNOWLEDGE_NO_CONTEXT, knowledge)

export default ((app, user) => {
  console.log(`--> ebu assistant handler started for user: ${user.user_id}`)
  const context = app.getContexts()
  const action = actionMap.get(app.getIntent())
  const promisedAction = Promise.promisify(action)
  console.log(`    context: ${util.inspect(context)}`)
  samanage(user.user_id).then((ebu) => {
    promisedAction({ app, ebu, user }).then((result) => {
      console.log('--> fulfilling promisedAction')
      // if (context[0].name === 'comments') {
      //   console.log('    comments context recieved > asking with list now...')
      //   app.askWithList('Do you want to respond?', app.buildList('Comments').addItems(result))
      // } else
      app.ask(result)
    })
  })
  .catch(err => console.log(err))
})
