// console.log(__filename);
//
// this file is being loaded by client + server
//
DEBUG = false

Accounts.config({
  forbidClientAccountCreation: false,
})

UseTagsCollection = false

Tags = new Meteor.Collection('tags')

if (Meteor.isServer) {
  Images = new Meteor.Collection('images')

  Accounts.emailTemplates.from = "Buzzledom support <jan@buzzledom.com>"

  Images.allow({
    insert: function(userId, doc) {
      return userId;
    },
    update: function(userId, doc, fieldNames, modifier) {
      return userId;
    },
    remove: function(userId, doc) {
      return doc.user == userId || Roles.userIsInRole( userId,'admin');
    }
  })

  Images.before.insert(function(userId, doc) {
    doc.user = userId
    doc.order = Meteor.call('maxOrder') + 1
    doc.created = new Date()
    if (DEBUG) console.log(`Images inserting with order ${doc.order}`)
  })
} else {
  const imageTransformation = {
    transform(doc) {
      // console.log('transform: '+doc._id);
      return doc;
    }
  }
  Images = new Meteor.Collection('images', imageTransformation)
}
ImagesPerPage = 15
