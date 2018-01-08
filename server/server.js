Meteor.publish('thumbnails', function(imageStart){
  var self = this;
  imageStart = imageStart == undefined ? 0 : imageStart;
  // console.info('thumbnails start:'+ imageStart+' subscriptionId:'+self._subscriptionId);
  var handle = DBImages.find({
    thumbnail:{$exists:1}
  },{
    fields: {src:0}
    ,sort:{created: -1}
    ,skip: imageStart
    ,limit: ImagesPerPage
  }).observeChanges({
    added: function(id, img) {
      img.subscriptionId = self._subscriptionId;
      self.added('dbimages', id, img);
    },
    removed: function(id) {
      self.removed('dbimages', id);
    },
    changed: function(id, fields) {
      self.changed('dbimages', id, fields);
    }
  });;
  self.ready();
  self.onStop(function(){
    handle.stop();
  })
});

Meteor.publish('image',function(id) {
  var self = this;
  return DBImages.find(id,{
    fields: {src:0}
  });
});

Meteor.publish('user_images', function(user){
  var self = this;
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
    fields: {src:0}
    ,sort:{created: -1}
  });
});

DBImages.allow({
  insert: function(userId, doc) {
    doc.user = userId;
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

  var assets = EJSON.parse(Assets.getText('admin.json'));
  var admin_user = assets.admin_user;

  var admin = Meteor.users.findOne({username: admin_user.username});

  if(admin) {
    Roles.addUsersToRoles(admin._id, ['admin']);
  } else {
    id = Accounts.createUser(admin_user);
    Roles.addUsersToRoles(id, ['admin']);
  }
});


Meteor.methods({
  allImageIds: function() {
    var images = [];
    DBImages.find({
          thumbnail:{$exists:1},
        },{
          sort:{created: -1 }
        }
    ).fetch().forEach(function(image){
      images.push(image._id);
    });
    return images;
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
  imageCount: function() {
    return DBImages.find().count();
  },
  imageExists: function(md5hash) {
    var exists = DBImages.findOne({ md5hash: md5hash });
    return exists != undefined;
  },
  user_name: function(id) {
    // console.log('user_name '+this.userId);
    // if(this.isSimulation) return {};
    // else {
      if (Roles.userIsInRole(this.userId, ['admin'])) {
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
  src: function(id) {
    var img = DBImages.findOne({ _id: id });
    return img ? img.src : '';
  }
});
//
// https://github.com/meteorhacks/picker
//
Picker.route('/api/json/images', function(params, request, response, next) {
  switch(request.method) {
    case 'GET':
      var json = EJSON.stringify( DBImages.find({thumbnail:{$exists:1}},{
        fields: {
          src:0
        },
        transform: function(doc) {
          doc.created = doc.created.toString();
          doc.transformed = true;
          return doc;
        }
      }).fetch() );

      response.writeHead(200, {
        'Content-Length': json.length,
        'Content-Type': 'application/json'
      });

      response.end(json);
    break;

    default:
      console.log(request);
  }
});
Picker.route('/api/json/image/:id', function(params, request, response, next) {
  // console.log(params);
  switch(request.method) {
    case 'GET':
      // GET /webhooks/stripe
      var json = EJSON.stringify( DBImages.findOne({_id: params.id}, {
        transform: function(doc) {
          doc.created = doc.created.toString();
          doc.transformed = true;
          return doc;
        }
      }) );

      response.writeHead(200, {
        'Content-Length': json.length,
        'Content-Type': 'application/json'
      });

      response.end(json);
    break;
  }
  // .post(function () {
  //   // https://github.com/mscdex/busboy
  //   // https://github.com/EventedMind/iron-router/issues/909
  //   // https://gist.github.com/cristiandley/9460398
  // })
  // .put(function () {
  //   // PUT /webhooks/stripe
  // })
});
