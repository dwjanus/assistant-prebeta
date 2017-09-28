import _ from 'lodash'
// import util from 'util'

exports.resolveclose_desc_confirm = (args, cb) => {
  console.log('--> inside resolveclose -- description / confirm')

  const app = args.app
  const user = args.user
  const latestRecord = JSON.parse(user.lastRecord)

  const Status = app.getArgument('Status')
  const Description = app.getArgument('Description')
  const ResolutionType = app.getArgument('ResolutionType')
  let text = 'Okay, simply tell me what you want to say. Whatever fields you do not provide info for will be left blank.'

  console.log(`> Status: ${Status}\n> ResolutionType: ${ResolutionType}\n> Description: ${Description}`)

  if (_.isNil(Description && ResolutionType)) return cb(null, text)

  app.setContext('resolveclose-description-verify')
  text = `${Status === 'Closed' ? 'Closing' : 'Resolving'} ticket ${latestRecord.CaseNumber}`

  if (!_.isNil(Description)) text += ` with description: "${Description}"`
  else text += ' with no description'
  if (!_.isNil(ResolutionType)) text += ` and resolution type: ${ResolutionType}.`
  else text += ' and no type.'

  text += ' Say \"Confrim\" to submit these changes or respond with the desired description and/or type.'
  return cb(null, text)
}

exports.resolveclose_desc_set = (args, cb) => {
  console.log('--> inside resolveclose -- description / confirm')

  const app = args.app
  const user = args.user
  const latestRecord = JSON.parse(user.lastRecord)

  const Status = app.getArgument('Status')
  const Description = app.getArgument('Description')
  const ResolutionType = app.getArgument('ResolutionType')

  console.log(`> Status: ${Status}\n> ResolutionType: ${ResolutionType}\n> Description: ${Description}`)

  let text = `${Status === 'Closed' ? 'Closing' : 'Resolving'} ticket ${latestRecord.CaseNumber}`

  if (!_.isNil(Description)) text += ` with description: "${Description}"`
  else text += ' with no description'
  if (!_.isNil(ResolutionType)) text += ` and resolution type: ${ResolutionType}.`
  else text += ' and no type.'

  text += ' Say \"Confrim\" to submit these changes or respond with the desired description and/or type.'
  return cb(null, text)
}

exports.resolveclose_verify_confirm = (args, cb) => {
  console.log('--> inside resolveclose -- verify / confirm')

  const app = args.app
  const ebu = args.ebu
  const user = args.user
  const latestRecord = JSON.parse(user.lastRecord)

  const Status = app.getArgument('Status')
  const Description = app.getArgument('Description')
  const ResolutionType = app.getArgument('ResolutionType')

  let options = {
    Id: latestRecord.Id,
    Status,
    SamanageESD__ResolutionDescription__c: Description,
    SamanageESD__ResolutionType__c: ResolutionType
  }

  options = _.omitBy(options, _.isNil)

  return ebu.update(options).then(() => {
    const text = `Ticket ${latestRecord.CaseNumber} has been ${Status === 'Closed' ? 'closed' : 'resolved'}.`
    return cb(null, text)
  })
  .catch((err) => {
    cb(err, null)
  })
}

exports.resolveclose_verify_newfields = (args, cb) => {
  console.log('--> inside resolveclose -- verify / newfields')

  const app = args.app
  const user = args.user
  const latestRecord = JSON.parse(user.lastRecord)

  const Status = app.getArgument('Status')
  const Description = app.getArgument('Description')
  const ResolutionType = app.getArgument('ResolutionType')

  console.log(`> Status: ${Status}\n> ResolutionType: ${ResolutionType}\n> Description: ${Description}`)

  let text = `${Status === 'Closed' ? 'Closing' : 'Resolving'} ticket ${latestRecord.CaseNumber}`

  if (!_.isNil(Description)) text += ` with description: "${Description}"`
  else text += ' with no description'
  if (!_.isNil(ResolutionType)) text += ` and resolution type: ${ResolutionType}.`
  else text += ' and no type.'

  text += ' Say \"Confrim\" to submit these changes or respond with the desired description and/or type.'
  return cb(null, text)
}

exports.resolveclose_verify_deny = (args, cb) => {
  console.log('\n--> inside resolveclose -- verify / deny')
  const text = 'No worries, Im cancelling your resolution now'
  return cb(null, text)
}
