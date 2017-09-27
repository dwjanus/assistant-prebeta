import util from 'util'
import db from '../../../config/db.js'
import _ from 'lodash'
import textversion from 'html-to-text'

const query = db.querySql

exports.knowledge = (args, cb) => {
  console.log('--> inside knowledge case')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const hasScreen = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)
  let Subject = app.getArgument('Subject')
  let text = 'I was unable to find any relavent articles in the knowledge base, would like me to submit a ticket?'
  if (!Subject) Subject = app.getRawInput()

  return ebu.knowledge(Subject).then((articles) => {
    console.log(`--> articles retrieved:\n${util.inspect(articles)}`)
    if (articles.length > 0) {
      text = 'I found some knowledge base articles that matched your issue. If these do not help I can also submit a ticket for you'
      if (app.getArgument('yesno')) text = `Yes, ${text}`
      if (hasScreen) {
        let number = 1
        const ids = []
        const carousel = app.buildCarousel('Related Knowledge Articles')
        articles.forEach((article) => {
          carousel.addItems(app.buildOptionItem(`${article.Id}`, [_.toString(number)]) // maybe make this id ?
            .setTitle(article.Title)
            .setDescription(article.Summary))

          number++
          ids.push(article.Id)
        })

        const askWithCarousel = app.askWithCarousel(app.buildRichResponse()
          .addSimpleResponse(text)
          .addSuggestions(['Submit Incident']), carousel)

        const updateStr = `UPDATE users SET lastRecord = '${JSON.stringify(ids)}' WHERE user_id = '${user.user_id}'`
        return query(updateStr).then(() => cb(null, askWithCarousel))
      }

      return cb(null, text)
    }

    return cb(null, text)
  })
  .catch(err => cb(err, null))
}

exports.knowledge_article_fallback = (args, cb) => {
  console.log('--> inside knowledge article fallback')

  const app = args.app
  const ebu = args.ebu
  const hasScreen = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)
  const articleId = app.getContextArgument('actions_intent_option', 'OPTION').value

  console.log(`--> got selected option: ${articleId}`)

  if (hasScreen && articleId) {
    return ebu.knowledge_article(articleId).then((article) => {
      console.log(`--> article retrieved:\n${util.inspect(article)}`)

      const body = textversion.fromString(article.body__c, { preserveNewlines: true, hideLinkHrefIfSameAsText: true, ignoreImage: true })
      const regex = /<img\b(?=\s)(?=(?:[^>=]|='[^']*'|="[^"]*"|=[^'"][^\s>]*)*?\ssrc=['"]([^"]*)['"]?)(?:[^>=]|='[^']*'|="[^"]*"|=[^'"\s]*)*"\s?\/?>/g
      const results = regex.exec(article.body__c)
      let img = !_.isEmpty(results) ? results[1] : null

      const card = app.buildBasicCard(body)
        .setTitle(article.Title)
        .addButton('View in Browser', article.link)

      if (img) {
        img = img.replace(/amp;/g, '')
        card.setImage(img)
      }

      console.log(`--> img: ${img}`)
      console.log(`--> results: ${util.inspect(results)}`)

      const articleCard = app.ask(app.buildRichResponse()
        .addSimpleResponse(`Article: ${article.ArticleNumber.replace(/^0+/, '')}`)
        .addSuggestions(['Back', 'Submit Incident'])
        .addBasicCard(card))

      return cb(null, articleCard)
    })
  }

  return cb(null, 'Error retrieving knowledge article')
}

exports.knowledge_suggestion_buttons = (args, cb) => {
  console.log('--> inside knowledge suggestion buttons fallback')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const articleIds = JSON.parse(user.lastRecord)
  const hasScreen = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)
  const selected = app.getRawInput()

  console.log(`--> got selected option: ${selected}`)

  if (hasScreen) {
    return ebu.knowledge_article(articleIds).then((articles) => {
      let number = 1
      const carousel = app.buildCarousel('Related Knowledge Articles')
      articles.forEach((article) => {
        carousel.addItems(app.buildOptionItem(`${article.Id}`, [_.toString(number)]) // maybe make this id ?
          .setTitle(article.Title)
          .setDescription(article.Summary))

        number++
      })

      const askWithCarousel = app.askWithCarousel(app.buildRichResponse()
        .addSimpleResponse('Previous Knowledge Articles')
        .addSuggestions(['Submit Incident']), carousel)

      return cb(null, askWithCarousel)
    })
    .catch((err) => {
      cb(err, null)
    })
  }

  return cb(null, 'I seem to have lost the articles we were looking at')
}
