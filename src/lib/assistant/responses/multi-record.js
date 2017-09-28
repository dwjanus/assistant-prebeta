import db from '../../../config/db.js'
import _ from 'lodash'
import util from 'util'
import dateFormat from 'dateformat'

const query = db.querySql

const addslashes = (str) => {
  return (`${str} `).replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0')
}

exports.multi_nocontext = (args, cb) => {
  console.log('\n--> inside multi -- nocontext')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const hasScreen = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)
  let text = 'Currently there are none'
  let options = {
    Subject: app.getArgument('Subject'),
    Status: app.getArgument('Status'),
    Priority: app.getArgument('Priority'),
    RecordType: app.getArgument('record-type')
  }

  if (app.getArgument('Assignee') === 'Self') options.OwnerId = user.sf_id
  options = _.omitBy(options, _.isNil)

  console.log(`options: ${util.inspect(options)}`)

  return ebu.multiRecord(options).then((records) => {
    console.log('--> records returned from ebu api')

    if (!_.isEmpty(records)) {
      const record = records[0]
      let saveRecordStr = `UPDATE users SET lastRecord = JSON_OBJECT('Id', '${record.Id}', 'Subject', '${addslashes(record.Subject)}', ` +
        `'OwnerId', '${record.OwnerId}', 'Description', '${addslashes(record.Description)}', 'CreatedDate', '${record.CreatedDate}', ` +
        `'SamanageESD__OwnerName__c', '${record.SamanageESD__OwnerName__c}', 'SamanageESD__Assignee_Name__c', '${record.SamanageESD__Assignee_Name__c}', ` +
        `'CaseNumber', '${record.CaseNumber}', 'Priority', '${record.Priority}', 'Status', '${record.Status}', 'SamanageESD__hasComments__c', ` +
        `'${record.SamanageESD__hasComments__c}', 'SamanageESD__RecordType__c', '${record.SamanageESD__RecordType__c}', ` +
        `'RecordTypeId', '${record.RecordTypeId}', 'SamanageESD__RequesterName__c', '${record.SamanageESD__RequesterName__c}')` +
        ` WHERE user_id = '${user.user_id}'`

      if (records.length > 1) {
        text = `here are ${records.length} `
        if (app.getArgument('yesno')) text = `Yes, t${text}`
        else text = `T${text}`
        if (options.Status) text += `${options.Status} `
        if (options.Priority) text += `${options.Priority} priority `
        text += `${records[0].SamanageESD__RecordType__c}s. The most recently active being ${records[0].CaseNumber}: "${records[0].Subject}"`
      } else {
        text = `All I found was ${options.RecordType} ${records[0].CaseNumber}: "${records[0].Subject}"`
      }

      if (hasScreen) {
        let number = 1
        const ids = []
        const originaltext = text
        const list = app.buildList()
        records.forEach((r) => {
          list.addItems(app.buildOptionItem(`${r.Id}`, [_.toString(number), r.CaseNumber])
            .setTitle(`${r.CaseNumber} // ${!_.isNil(options.Status) ? r.Priority : r.Status}`)
            .setDescription(`${!_.isNil(r.Subject) ? r.Subject : 'No Subject'}`))

          number++
          ids.push(r.Id)
        })

        text = app.askWithList(app.buildRichResponse()
          .addSimpleResponse(originaltext)
          .addSuggestions(), list) // might need to do this without empty suggestions

        saveRecordStr = `UPDATE users SET lastRecord = '${JSON.stringify(ids)}' WHERE user_id = '${user.user_id}'`
      }

      return query(saveRecordStr).then(() => cb(null, text))
    }

    return cb(null, text)
  })
}

exports.multi_welcome = (args, cb) => {
  console.log('\n--> inside multi -- welcome')

  const app = args.app
  const user = args.user
  const latestRecord = JSON.parse(user.lastRecord)
  const newcases = latestRecord.newcases
  const updates = latestRecord.updates
  const welcomerecord = app.getArgument('welcome-record')
  let text = ''
  let limit

  if (welcomerecord !== 'updates' || 'newcases') {
    if (!_.isEmpty(newcases)) {
      text = `New Ticket${newcases.length > 1 ? 's:' : ':'}\n`
      limit = newcases.length > 3 ? 3 : newcases.length
      for (let i = 0; i < limit; i++) {
        const n = newcases[i]
        const date = dateFormat(n.CreatedDate, "ddd m/d/yy '@' h:MM tt")
        text += `${n.CaseNumber}: ${n.Subject}\n - ${n.SamanageESD__RequesterName__c} / ${date}\n`
      }
      if (newcases.length > limit) text += `\n+${newcases.length - limit} more`
    }

    if (!_.isEmpty(updates)) {
      text = `Update${updates.length > 1 ? 's:' : ':'}\n`
      limit = updates.length > 3 ? 3 : updates.length
      for (let i = 0; i < limit; i++) {
        const u = updates[i]
        const date = dateFormat(u.LastModifiedDate, "ddd m/d/yy '@' h:MM tt")
        text += `${u.CaseNumber} on ${date}\n`
      }
      if (newcases.length > limit) text += `\n+${updates.length - limit} more`
    }
  } else {
    if (!_.isEmpty(latestRecord[welcomerecord])) {
      app.setContext('multi-record')
      const saved = latestRecord[welcomerecord]
      text = `${welcomerecord === 'newcases' ? 'New Ticket' : 'Update'}${saved.length > 1 ? 's:' : ':'}\n`
      limit = saved.length > 3 ? 3 : saved.length
      for (let i = 0; i < limit; i++) {
        const s = saved[i]
        if (welcomerecord === 'newcases') {
          const date = dateFormat(s.CreatedDate, "ddd m/d/yy '@' h:MM tt")
          text += `${s.CaseNumber}: ${s.Subject}\n - ${s.SamanageESD__RequesterName__c} / ${date}\n`
        } else {
          const date = dateFormat(s.LastModifiedDate, "ddd m/d/yy '@' h:MM tt")
          text += `${s.CaseNumber} on ${date}\n`
        }
      }
      if (saved.length > limit) text += `\n+${saved.length - limit} more`

      const savedRecord = JSON.stringify(saved)
      const updateLastRecordStr = `UPDATE users SET lastRecord = '${savedRecord}' WHERE user_id = '${user.user_id}'`
      return query(updateLastRecordStr).then(() => cb(null, text))
    }
    text = 'There aren\'t any bruh.'
  }

  return cb(null, text)
}

exports.multi_selection = (args, cb) => {
  console.log('--> inside multi selection fallback')

  const app = args.app
  const ebu = args.ebu
  const hasScreen = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)
  const recordId = app.getContextArgument('actions_intent_option', 'OPTION').value

  console.log(`--> got selected option: ${recordId}`)

  if (hasScreen && recordId) {
    return ebu.caseRecordsById(recordId).then((record) => {
      console.log(`--> case retrieved:\n${util.inspect(record)}`)

      const text = `*${record.Subject}*<br>Status: ${record.Status}\nPriority: ${record.Priority}\nAssigned: ${record.SamanageESD__Assignee_Name__c}` +
        `<br>${_.isNil(record.Description) ? 'No Description Provided' : record.Description}<br>${record.SamanageESD__hasComments__c} Comments`

      const card = app.buildBasicCard(text)
        .setTitle(`${record.SamanageESD__RecordType__c} ${record.CaseNumber}`)
        .setSubtitle(`Requester: ${record.SamanageESD__RequesterName__c}`)
        .addButton('View in Browser', record.link)

      const caseCard = app.ask(app.buildRichResponse()
        .addSimpleResponse('Here are the details')
        .addSuggestions(['Back', `${record.SamanageESD__hasComments__c > 0 ? 'View Comments' : 'Post Comment'}`])
        .addBasicCard(card))

      return cb(null, caseCard)
    })
  }

  return cb(null, 'Bust ya phone out homie!')
}

exports.multi_selection_suggestion_buttons = (args, cb) => {
  console.log('--> inside knowledge suggestion buttons fallback')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const recordIds = JSON.parse(user.lastRecord)
  const hasScreen = app.hasSurfaceCapability(app.SurfaceCapabilities.SCREEN_OUTPUT)
  const selected = app.getRawInput()
  const contexts = app.getContexts()

  console.log(`--> got selected option: ${selected}`)
  console.log(`--> contexts:\n${util.inspect(contexts)}`)

  if (hasScreen && selected === 'Back') {
    return ebu.caseRecordsById(recordIds).then((records) => {
      let number = 1
      const list = app.buildList()
      records.forEach((r) => {
        list.addItems(app.buildOptionItem(`${r.Id}`, [_.toString(number), r.CaseNumber])
          .setTitle(`${r.CaseNumber} // ${r.Status} // ${r.Priority}`)
          .setDescription(`${!_.isNil(r.Subject) ? r.Subject : 'No Subject'}`))

        number++
      })

      const listAsk = app.askWithList(app.buildRichResponse()
        .addSimpleResponse('Here is that list again')
        .addSuggestions(), list) // might need to do this without empty suggestions

      app.setContext('records')
      return cb(null, listAsk)
    })
    .catch((err) => {
      cb(err, null)
    })
  }

  // add handler for View and Post Comment buttons

  return cb(null, 'Bust ya phone out homie!')
}


// This will handle the next context - takes ordinal and returns specific info on
// the corresponding item in the latestRecord array (i.e. "are there comments on that second one?")
// or --> "are there any comments on those?" --> "yes, there are (total number) new comments. 2 on ___ and 1 on ___"
//         --> "show me the ones for (ordinal or case number)"
//
// exports.multi = (args, cb) => {}
