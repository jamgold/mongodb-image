DBImages = new Meteor.Collection('dbimages',{
  transform: function(doc) {
    // console.log('transform: '+doc._id);
    return doc;
  }
});
ImagesPerPage = 30;

if(Meteor.isClient) {
  Session.setDefault('uploaded', 0);
  Session.setDefault('imageStart', 0);
  Session.setDefault('imageCount', 0);
  Session.setDefault('loadingSize', 0);
  Session.setDefault('src', new Date());

  Template.upload.rendered = function () {
    var template = this;

    this.reader = new FileReader();
    this.preview = document.getElementById('images');

    if(!this.preview)
    {
      this.preview = document.createElement('div');
      this.preview.id = 'preview';
      document.body.appendChild(this.preview);
    }
    this.crop_img = document.getElementById('crop_img');
    if(!this.crop_img)
    {
      this.crop_img = document.createElement('img');
      this.crop_img.id = 'crop_img';
      this.crop_img.classList.add('hidden');
      this.preview.appendChild(this.crop_img);
    }

    this.cropCanvas = document.getElementById('crop_canvas');
    if(!this.cropCanvas)
    {
      this.cropCanvas = document.createElement('canvas');
      this.cropCanvas.id = 'crop_canvas';
      this.cropCanvas.classList.add('hidden');
      this.preview.appendChild(this.cropCanvas);
    }

    this.crop_img.onload = function(e) {
      var crop_dataUrl = template.crop_img.src;
      // console.log('cropping');
      var cc = {
        x: 0,
        y: 0,
        width: template.crop_img.width,
        height: template.crop_img.height
      };
      if (cc.height > cc.width) {
        cc.height = cc.width;
      }
      else
      {
        cc.width = crop_img.height;
      }

      //
      // resize to 300x300
      //
      template.cropCanvas.width = 100;
      template.cropCanvas.height= 100;

      // if(template.crop_img.width<template.cropCanvas.width) template.cropCanvas.width = template.crop_img.width;
      // if(template.crop_img.height<template.cropCanvas.height) template.cropCanvas.height = template.crop_img.height;

      // if (template.crop_img.width > template.cropCanvas.width)
      //   cc.x = (template.crop_img.width - template.cropCanvas.width) / 2.0;
      // if (template.crop_img.height > template.cropCanvas.height)
      //   cc.y = (template.crop_img.height - template.cropCanvas.height) / 2.0;
      // console.log(cc);
      var crop_ctx = template.cropCanvas.getContext("2d");

      crop_ctx.drawImage(
        template.crop_img,
        cc.x,
        cc.y,
        cc.width,
        cc.height,
        0,
        0,
        template.cropCanvas.width,
        template.cropCanvas.height
      );

      // crop_dataUrl = template.cropCanvas.toDataURL();
      // cropped = document.createElement('img');
      // cropped.id = 'cropped';
      // cropped.src = crop_dataUrl;
      // template.preview.appendChild(cropped);
    }
    // console.info(this.view.name+'.rendered',this);
  };

  Template.upload.events({
    'change #fileinput': function(e,template) {
      // console.info(e.target);
      var file = document.getElementById('fileinput').files[0];
      // set crop_img.src so crop_img.onload fires
      // https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
      template.reader.onload = (function(aImg) { return function(e) { aImg.src = e.target.result; }; })(template.crop_img);
      template.reader.readAsDataURL(file);
      template.$('button.upload').removeClass('hidden');
    },
    'submit form': function(e, template) {
        // http://meteortuts.com/meteor-js-upload-image-to-collection/
        e.preventDefault();
        template.$('button.upload').fadeOut();
        var form = e.target;
        var file = template.find('#fileinput').files[0];
        var meteoruser = Meteor.userId();

        template.reader.onload = function(e) {
          var md5hash = md5(e.target.result);
          var exists = DBImages.findOne({md5hash: md5hash});
          if(exists)
          {
            Bootstrap3boilerplate.alert('warning','This image has been uploaded before', true);
          }
          else
          {
            DBImages.insert({
               src:e.target.result
              ,size: file.size
              ,name: file.name
              ,type: file.type
              ,created: new Date()
              ,md5hash: md5hash
              ,thumbnail: template.cropCanvas.toDataURL()
              ,user: meteoruser
            });
            Session.set('uploaded', Session.get('uploaded')+1);
            Session.set('imageStart', 0);
          }
          template.$('input[type="reset"]').click();
          template.$('button.upload').fadeIn();
        };
        template.reader.readAsDataURL(file);
        template.$('button.upload').addClass('hidden');
    }
  });

  Template.thumbnails.helpers({
    pages: function () {
      var pages = [];
      var page = 1;
      var number = ImagesPerPage+1;
      var current = Session.get('imageStart');
      var counter = Session.get('imageCount');
      for(var i=0;i<counter;i+=number)
      {
        var c = i == current ? 'page btn btn-success' : 'page btn btn-default';
        pages.push('<a class="'+c+'" start="'+i+'">'+page+'</a>');
        page++;
      }
      return pages;
    },
    // helper to get all the thumbnails
    images: function() {
      // console.log('images');
      return DBImages.find({thumbnail:{$exists:1}},{limit:ImagesPerPage,sort:{created: -1 }});
    }
  });

  Template.thumbnails.events({
    'click a.page':function(e,t) {
      var a = $(e.target);
      var s = parseInt(a.attr('start'));
      Session.set('imageStart', s);
    },
    'click a.image':function(e,t) {
      var img = DBImages.findOne({_id: $(e.target).attr('imageid')});
      Session.set('loadingSize', img.size+'bytes');
    },
  });

  Template.image.rendered = function() {
    // console.info('Template.image.rendered', this);
    if(Roles.userIsInRole( Meteor.userId(),'admin'))
    {
      Meteor.call('user_name', this.data.img.user, function(err,res){
        if(!err) 
        {
          Session.set('user_name', res.email);
          Session.set('user_banned', res.banned);
        }
      });
    }
  };

  Template.image.helpers({
    md5hash: function() {
      var image = this;
      if(image && image.src)
      {
        var update = false;

        if(image.md5hash === undefined)
        {
          console.log('Template.image.helpers.img md5hash missing');
          image.md5hash = md5(image.src);
          update = true;
        }
        if(image.created === undefined)
        {
          console.log('Template.image.helpers.img created missing');
          image.created = new Date();
          update = true;
        }

        if(update)
        {
          DBImages.update({_id: image._id},{$set:{md5hash: image.md5hash, created: image.created}});
          console.log('Template.image.helpers.img updated');
        }
        // else console.log('Template.image.helpers.img md5hash exist');
      }
    },
    user_name: function() {
      return Session.get('user_name');
    },
    user_banned: function() {
      return Session.get('user_banned');
    },
    canDelete: function(owner) {
      return owner == Meteor.userId() || Roles.userIsInRole( Meteor.userId(),'admin');
    }
  });

  Template.image.events({
    'click a.delete': function(e,t) {
      if(confirm('Really Delete?'))
      {
        DBImages.remove({_id: e.target.id}, function(err){
          if(err)
          {
           console.log(err);
           e.preventDefault();
          }
          else
          {
            Session.set('uploaded', Session.get('uploaded')-1);
          }
        });
      }
    },
    'click a.ban': function(e,t){
      if(confirm('Really ban this user?'))
      {
        Meteor.call('ban', t.data.img.user, true, function(err,res){
          if(err)
          {
            console.log(err)
          }
          else
          {
            e.target.className = res;
            e.target.innerHTML = res;
          }
          // console.info(e.target.className,err,res);
        });
      }
    },
    'click a.banned': function(e,t) {
      if(confirm('Really unban this user?'))
      {
        Meteor.call('ban', t.data.img.user, false, function(err,res){
          if(err)
          {
            console.log(err)
          }
          else
          {
            e.target.className = res;
            e.target.innerHTML = res;
          }

          // console.info(e.target.className,err,res);
        });
      }
    }
  });

  Template.admin.helpers({
    isAdminUser: function() {
      return Roles.userIsInRole(Meteor.user(), ['admin']);
    }
  });

  Template.imageLoading.helpers({
    size: function () {
      return Session.get('loadingSize');
    }
  });

  Template.userImages.rendered = function() {
    if(Roles.userIsInRole( Meteor.userId(),'admin'))
    {
      Meteor.call('user_name', this.data.user, function(err,res){
        if(!err) 
        {
          Session.set('user_name', res.email);
          Session.set('user_banned', res.banned);
        }
      });
    }
  }

  Bootstrap3boilerplate.Navbar.left = function() {
    return [
      // {href:'/',text:'Images'},
    ];
  };

  Bootstrap3boilerplate.Navbar.right = function() {
    var right = [
      {showLoginButtons:true}
    ];

    if(Roles.userIsInRole( Meteor.userId(),'admin'))
    {
      right.unshift({text:'Admin',href:'/admin'});
    }
    return right;
  };

  Bootstrap3boilerplate.init();
  Bootstrap3boilerplate.Footer.show.set(false);

  Tracker.autorun(function () {
    var uploaded = Session.get('uploaded');
    Meteor.call('imageCount', function(err,res){
      if(!err)
        Session.set('imageCount', res);
    });
  });

  Tracker.autorun(function () {
    // ...
    Meteor.subscribe('thumbnails', Session.get('imageStart'));
  });

  Tracker.autorun(function () {
    // ...
    Bootstrap3boilerplate.ProjectName.set({text:Session.get('imageCount')+' MongoDB Images',href:'/'});
  });

  Meteor.startup(function(){
    // DBImages.distinct('user',function(err, result){
    //   console.info('distinct users', result);
    // });
  });
}

if(Meteor.isServer) {
  Meteor.publish('thumbnails', function(imageStart){
    // console.info('thumbnails', imageStart);
    return DBImages.find({
      thumbnail:{$exists:1}
    },{
      fields: {src:0}
      ,sort:{created: -1}
      ,skip: imageStart
      ,limit: ImagesPerPage
    });
  });

  Meteor.publish('user_images', function(user){
    console.info('user_images', user);
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

  Meteor.startup(function(){
    DBImages._ensureIndex('created');

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
}

Meteor.methods({
  imageCount: function() {
    return DBImages.find().count();
  },
  user_name: function(id) {
    if(Roles.userIsInRole(this.userId, ['admin']))
    {
      var email = Meteor.users.findOne({_id: id}).emails[0].address;//.replace(/[@\.]+/g,' ');
      var r = {
        email: email,
        banned: '<a class="ban">ban</a>'
      };
      if(Roles.userIsInRole(id, ['banned']))
      {
        r['banned'] = '<a class="banned">banned</a>';
      }
      // else
      // {
      //   return '<a class="ban">'+email+'</a>';
      // }
      return r;
    }
    else
      return 'only admins can ask for user names';
  },
  ban: function(userid, ban) {
    if(Roles.userIsInRole(this.userId, ['admin']))
    {
      // var email = Meteor.users.findOne({_id: userid}).emails[0].address;//.replace(/[@\.]+/g,' ');
      if(ban)
      {
        Roles.addUsersToRoles(userid, ['banned']);
        r = 'banned';
      }
      else
      {
        Roles.removeUsersFromRoles(userid, ['banned']);
        r = 'ban';
      }
      return r;
    }
    else
    { 
      return 'only admins can ban users';
    }
  },
  src: function(id) {
    var img = DBImages.findOne({_id: id});
    return img ? img.src : '';
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

Router.configure({
  layoutTemplate: 'Bootstrap3boilerplate',
  loadingTemplate: 'imageLoading'
});

Router.route('/',{
  name:'thumbnails',
  //
  // do not subscribe to thumbnails here, because then the whole page flickers
  // when loading the next page of thumbnails, subscribe thumbnails in Tracker instead
  //
  // waitOn: function () {
  //   return Meteor.subscribe('thumbnails', Session.get('imageStart'), function(){
  //     // var c = DBImages.find().count();
  //     // Bootstrap3boilerplate.ProjectName.set({text:c+' MongoDB Images',href:'/'});
  //   });
  // },
  // data: function() {
  //   // console.log('thumbnails '+DBImages.find().count());
  //   return {
  //     images: DBImages.find({thumbnail:{$exists:1}},{sort:{created: -1 }})
  //   }
  // }
});

Router.route('/image/:id',{
  name: 'image',
  // we already have all the images, so just get the src for the selected image
  onBeforeAction: function() {
    var route = this;
    console.info('route.image.beforeAction','get full image', route.params.id);
    route.img = DBImages.findOne({_id: route.params.id});
    if(route.img)
    {
      // set the preliminary src to animation and make it reactive
      route.img.src = new ReactiveVar('/circle-loading-animation.gif');
      // now call method to get src for id
      Meteor.call('src', route.params.id, function(err,src){
        if(this.isSimulation)
        {
          console.log('loading image');
        }
        else
        {
          if(err)
          {
            console.log(err);
          }
          else
          {
            // set this routes img src
            route.img.src.set(src);
          }
        }
      });
    }
    route.next();
  },
  data: function() {
    return {
      img: this.img
    }
  }
});

Router.route('/user/:user',{
  name: 'user_images',
  waitOn: function() {
    var user = this.params.user;
    Session.set('loadingSize', 'user '+user);
    return Meteor.subscribe('user_images', user, function(){
      // console.log('subscribed to '+user);
    });
  },
  data: function() {
    return {
      images: DBImages.find({user: this.params.user},{sort:{created: -1}}),
      user: this.params.user,
      user_name: Session.get('user_name')
    }
  }
});

Router.route('/admin');

//
// http://nodejs.org/api/http.html#http_class_http_serverresponse
//
Router.route('/api/json/images', { where: 'server' })
  .get(function () {
    // GET /webhooks/stripe
    // console.log(this);
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

    this.response.writeHead(200, {
      'Content-Length': json.length,
      'Content-Type': 'application/json'
    });

    this.response.end(json);
  })
;

Router.route('/api/json/image/:id', { where: 'server' })
  .get(function () {
    // GET /webhooks/stripe
    var json = EJSON.stringify( DBImages.findOne({_id: this.params.id}, {
      transform: function(doc) {
        doc.created = doc.created.toString();
        doc.transformed = true;
        return doc;
      }
    }) );

    this.response.writeHead(200, {
      'Content-Length': json.length,
      'Content-Type': 'application/json'
    });

    this.response.end(json);
  })
  // .post(function () {
  //   // https://github.com/mscdex/busboy
  //   // https://github.com/EventedMind/iron-router/issues/909
  //   // https://gist.github.com/cristiandley/9460398
  // })
  // .put(function () {
  //   // PUT /webhooks/stripe
  // })
;