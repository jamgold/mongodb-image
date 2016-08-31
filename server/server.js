Meteor.publish('thumbnails', function(imageStart){
  // console.info('thumbnails', imageStart);
  imageStart = imageStart == undefined ? 0 : imageStart;
  return DBImages.find({
    thumbnail:{$exists:1}
  },{
    fields: {src:0}
    ,sort:{created: -1}
    ,skip: imageStart
    ,limit: ImagesPerPage
  });
});

Meteor.publish('image',function(id) {
  return DBImages.find(id,{
    fields: {src:0}
  });
});

Meteor.publish('user_images', function(user){
  // console.info('user_images', user);
  return DBImages.find({
    user: user
    // thumbnail:{$exists:1}
  },{
    fields: {src:0}
    ,sort:{created: -1}
    // ,skip: imageStart
    // ,limit: ImagesPerPage
  });
});

DBImages.allow({
  insert: function(userId, doc) {
    return userId;
  },
  update: function(userId, doc, fieldNames, modifier) {
    return userId;
  },
  remove: function(userId, doc) {
    return doc.user == userId || Roles.userIsInRole( userId,'admin');
  }
});

Meteor.startup(function(){
  DBImages._ensureIndex('created');

  // Log.info( moment().add(1,'week') );

  var assets = EJSON.parse(Assets.getText('admin.json'));
  var admin_user = assets.admin_user;
  var email = admin_user.email;

  var admin = Meteor.users.findOne({"emails.0.address": email});

  if(admin) {
    Roles.addUsersToRoles(admin._id, ['admin','json']);
  } else {
    id = Accounts.createUser(admin_user);
    Roles.addUsersToRoles(id, ['admin']);
  }
});

// var result = DBImages.distinct('user');console.info('distinct users', result);

