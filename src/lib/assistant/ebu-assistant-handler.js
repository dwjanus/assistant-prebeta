import util from 'util'
// import _ from 'lodash'
import Promise from 'bluebird'
import samanage from '../samanage/ebu-api.js'
// import mongo from '../../config/db.js'
// import config from '../../config/config.js'
// const storage = mongo({ mongoUri: config('MONGODB_URI') })

// consts for intent map
const GOOGLE_ASSISTANT_WELCOME = 'input.welcome'

const welcomeIntent = (args, cb) => {
  console.log('--> inside welcome case')
  const text = 'What can I do for you? If you are not totally sure what to do, just say: I need help'
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
