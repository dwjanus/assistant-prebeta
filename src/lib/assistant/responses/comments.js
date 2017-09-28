// import db from '../../../config/db.js'
// import _ from 'lodash'
// import util from 'util'
import dateFormat from 'dateformat'

// const query = db.querySql
// const addslashes = (str) => {
//   return (`${str} `).replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0')
// }

exports.comments_viewfeed = (args, cb) => {
  console.log('\n--> inside comments -- viewfeed')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const latestRecord = JSON.parse(user.lastRecord)
  const ordinal = app.getArgument('ordinal')
  const comment = latestRecord[ordinal]
  let text = ''

  console.log(`--> ordinal: ${ordinal}`)
  return ebu.feedComments(comment.ParentId, comment.Id).each((feedComment) => {
    console.log(`-> adding feedComment ${feedComment.Id} to response`)
    const date = dateFormat(feedComment.CreatedDate, "ddd m/d/yy '@' h:MM tt")
    text += `${date} "${feedComment.CommentBody}" posted by ${feedComment.User.Name}\n`
  })
  .then(() => {
    text += '\nWould you like to post a response?'
    cb(null, text)
  })
  .catch(err => cb(err, null))
}
