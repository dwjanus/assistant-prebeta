import util from 'util'

exports.knowledge = (args, cb) => {
  console.log('--> inside knowledge case')

  const ebu = args.ebu
  const app = args.app
  const hasScreen = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)
  let Subject = app.getArgument('Subject')
  let text = 'I was unable to find any relavent articles in the knowledge base, would like me to submit a ticket?'
  if (!Subject) Subject = app.getRawInput()

  return ebu.knowledge(Subject).then((articles) => {
    console.log(`--> articles retrieved:\n${util.inspect(articles)}`)
    if (articles.length > 0) {
      text = 'I found some knowledge base articles that matched your issue. If these do not help I can submit a ticket for you'
      if (app.getArgument('yesno')) text = `Yes, ${text}`
      if (hasScreen) {
        const carousel = app.buildCarousel('Related Knowledge Articles')
        articles.forEach((article) => {
          carousel.addItems(app.buildOptionItem(`${article.ArticleNumber.replace(/^0+/, '')}`)
          .setTitle(article.Title)
          .setDescription(article.Summary))
        })
        const askWithCarousel = app.askWithCarousel(text, carousel)
        return cb(null, askWithCarousel)
      }

      return cb(null, text)
    }

    return cb(null, text)
  })
  .catch(err => cb(err, null))
}
