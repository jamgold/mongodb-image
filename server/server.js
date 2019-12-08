Meteor.publish('thumbnails', function(imageStart, tags){
  var self = this;
  let query = {thumbnail:{$exists:1}};
  if(tags !== undefined && tags.length>0) query['tags'] = {$all: tags};
  imageStart = imageStart == undefined ? 0 : imageStart;
  // console.info('thumbnails start:'+ imageStart+' subscriptionId:'+self._subscriptionId);
  var cursor = DBImages.find(query,{
    fields: {src:0}
    ,sort:{created: -1}
    ,skip: imageStart
    ,limit: ImagesPerPage
  });
  // console.log(`${cursor.fetch().length} thumbnails published with limit ${ImagesPerPage}`);
  return cursor;
});

Meteor.publish('image',function(id) {
  var self = this;
  return DBImages.find(id,{
    fields: {src:0}
  });
});

Meteor.publish('user_images', function(skip,user){
  var self = this;
  // check(skip, Integer);
  // check(user, String);
  // console.log(`user_images for ${user} starting ${skip}`);
  //
  // do not use subscriptionId since the images might already be 
  // there from the global Meteor.subscription and the publish
  // only adds the new subscriptionId to images not yet in the 
  // publication
  //
  return DBImages.find({
    user: user
    // thumbnail:{$exists:1}
  },{
    limit: 18,
    skip: skip,
    fields: {src:0},
    sort:{created: -1}
  });
});

Meteor.publish(null, function(){
  if(this.userId) {
    return Meteor.roleAssignment.find({'user._id': this.userId});
  } else {
    return null;
  }
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

DBImages.before.insert(function(userId, doc) {
  doc.user = userId;
  doc.order = Meteor.call('maxOrder') + 1;
  doc.created = new Date();
  console.log(`DBImages inserting with order ${doc.order}`);

});

Meteor.methods({
  tags(search){
    const raw = DBImages.rawCollection();
    const distinct = Meteor.wrapAsync(raw.distinct, raw);

    let tags = distinct('tags');
    return search == undefined ? tags : tags.filter((tag) => {return tag.includes(search)})
  },
  maxOrder(){
    let images = DBImages.find({order:{$exists:1}},{sort:{order:-1},limit:1}).fetch()
    if(images.length>0) return images[0].order;else return DBImages.find().count()+10;
  },
  nextImage(order, tags){
    let images = tags !== undefined && tags.length>0
      ? DBImages.find({order:{$lt:order},tags:{$all:tags}},{sort:{order:-1},limit:1}).fetch()
      : DBImages.find({order:{$lt:order}},{sort:{order:-1},limit:1}).fetch()
    ;
    // console.log(`nextImage ${order} ${images.length}`, tags);
    if(images.length>0) return images[0]._id;else return null;
  },
  prevImage(order, tags){
    let images = tags !== undefined && tags.length>0
      ? DBImages.find({order:{$gt:order},tags:{$all:tags}},{sort:{order:1},limit:1}).fetch()
      : DBImages.find({order:{$gt:order}},{sort:{order:1},limit:1}).fetch()
    ;
    // console.log(`prevImage ${order} ${images.length}`, tags);
    if(images.length>0) return images[0]._id;else return null;
  },
  contributors: function() {
    const self = this;
    var res = {images:[],contributors:[],count: DBImages.find({thumbnail:{$exists:1}}).count()};
    const raw = DBImages.rawCollection();
    const distinct = Meteor.wrapAsync(raw.distinct, raw);

    // console.time("allImageIds");
    // res.images = DBImages.find({thumbnail:{$exists:1}, },{sort:{created: -1 } } ).fetch().map((image) => {return image._id;});
    // console.timeEnd("allImageIds");

    console.time("contributors");
    res.contributors = Meteor.users.find({_id:{$in:distinct('user')}}).fetch().map((u) => {
      var email = u.emails[0].address; //.replace(/[@\.]+/g,' ');
      var count = DBImages.find({user: u._id}).count();
      r = {
        id: u._id,
        email: email,
        banned: Roles.userIsInRole(u._id, ['banned']), //? '<a class="banning banned">banned</a>' : '<a class="banning ban">ban</a>',
        activeUser: self.userId == u._id,
        count: count,
      };
      return r;
    });
    console.timeEnd("contributors");

    return res;
  },
  createPageFromTemplates: function(pageTemplates) {
    if (this.isSimulation) {
      return {};
    } else {
      var defaultDuration = 1; //_.max(_.pluck(pageTemplates, 'duration'));

      var endDate = moment().add(defaultDuration, 'weeks'); //MyMoment(defaultDuration)

      return {
        title: "New page template",
        startDate: new Date(),
        endDate: endDate.toDate(),
        // templateIds: templateIds
      }
    }
  },
  imageCount: function(tags) {
    let query = { thumbnail: { $exists: 1 } };
    if (tags !== undefined && tags.length > 0) query['tags'] = { $all: tags };

    return DBImages.find(query).count();
  },
  imageExists: function(md5hash) {
    var exists = DBImages.findOne({ md5hash: md5hash });
    return exists != undefined;
  },
  user_name: function(id) {
    // console.log(`user_name for ${id} called by ${this.userId}`);
    // if(this.isSimulation) return {};
    // else {
      if (this.userId == id || Roles.userIsInRole(this.userId, ['admin'])) {
        var r = {};
        var user = Meteor.users.findOne({ _id: id });
        if (user) {
          var email = user.emails[0].address; //.replace(/[@\.]+/g,' ');
          r = {
            email: email,
            banned: '<a class="ban">ban</a>'
          };
          if (Roles.userIsInRole(id, ['banned'])) {
            r['banned'] = '<a class="banned">banned</a>';
          }
          // else
          // {
          //   return '<a class="ban">'+email+'</a>';
          // }
        }
        return r;
      } else {
        throw new Meteor.Error(403, 'Access Denied', 'only admins can ask for user names');
      }
    // }
  },
  ban: function(userid, ban) {
    if (Roles.userIsInRole(this.userId, ['admin'])) {
      // var email = Meteor.users.findOne({_id: userid}).emails[0].address;//.replace(/[@\.]+/g,' ');
      if (ban) {
        Roles.addUsersToRoles(userid, ['banned']);
        r = 'banned';
      } else {
        Roles.removeUsersFromRoles(userid, ['banned']);
        r = 'ban';
      }
      return r;
    } else {
      return 'only admins can ban users';
    }
  },
  src: function(id, tagSearch) {
    var img = DBImages.findOne({ _id: id });
    var res = {src: img ? img.src : '', prev:null,next:null};
    if(img){
      res.prev = Meteor.call('prevImage', img.order, tagSearch);
      res.next = Meteor.call('nextImage', img.order, tagSearch);
    }
    return res;
  },
  reorder(startup){
    if (Roles.userIsInRole(this.userId, ['admin']) || startup == 'startup') {
      let order = 1;
      console.time("updating order");
      DBImages.find({},{sort:{created:1}}).forEach((image) => {
        DBImages.update(image._id,{$set:{order: order++}});
      });
      console.timeEnd("updating order");
    }
  }
});

Meteor.startup(function(){
  DBImages._ensureIndex('created');

  var assets = EJSON.parse(Assets.getText('admin.json'));
  var admin_user = assets.admin_user;
  var admin = Meteor.users.findOne({username: admin_user.username});
  if(admin) {
    Roles.addUsersToRoles(admin._id, ['admin']);
  } else {
    id = Accounts.createUser(admin_user);
    Roles.addUsersToRoles(id, ['admin']);
  }
  if(DBImages.findOne({order:{$exists:0}})) {
    Meteor.call('reorder','startup')
  }
  // var raw = DBImages.rawCollection();
  // var distinct = Meteor.wrapAsync(raw.distinct, raw);
  // console.log(distinct('user'));
});

