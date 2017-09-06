import util from 'util'

exports.knowledge = (args, cb) => {
  console.log('--> inside knowledge case')

  const ebu = args.ebu
  const app = args.app
  const subject = app.getArgument('Subject')
  let text = 'I found some knowledge base articles that matched your issue. If these do not help I can submit a ticket for you'

  return ebu.knowledge(subject).then((articles) => {
    console.log(`--> articles retrieved:\n${util.inspect(articles)}`)
    if (articles.length === 0) text = 'I was unable to find any relavent articles in the knowledge base, would like me to submit a ticket?'
    // if (surface is phone && articles.length() > 0) return processList(articles).then((list) => cb(null, list))
    return cb(null, text)
  })
  .catch(err => cb(err, null))
}
