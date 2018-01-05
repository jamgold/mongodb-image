optionsTest = function(args, options) {
  options = options || {};

  console.info('options', options);
};

Session.setDefault('uploaded', 0);
Session.setDefault('imageStart', 0);
Session.setDefault('imageCount', 0);
Session.setDefault('loadingSize', 0);
Session.setDefault('distinct_users',[]);
Session.setDefault('src', new Date());

ThumbnailsHandle = null;
AllImages = new ReactiveVar([]);

Template.upload.onRendered(function () {
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
    console.log('creating #crop_img');
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
    this.cropCanvas.width = 100;
    this.cropCanvas.height = 100;
    this.cropCanvas.classList.add('hidden');
    this.preview.appendChild(this.cropCanvas);
  }

  this.crop_img.onload = function(e) {
    //
    // resize to 100x100
    //
    template.cropCanvas.width = 100;
    template.cropCanvas.height= 100;

    var crop_dataUrl = template.crop_img.src;
    // console.log('cropping');
    var cc = {
      x: 0,
      y: 0,
      width: template.crop_img.width,
      height: template.crop_img.height
      // width: template.cropCanvas.width,
      // height: template.cropCanvas.height
    };
    if (cc.height > cc.width) {
      cc.height = cc.width;
    }
    else
    {
      cc.width = crop_img.height;
    }
    console.log('cropping',cc);
    // if(template.crop_img.width<template.cropCanvas.width) template.cropCanvas.width = template.crop_img.width;
    // if(template.crop_img.height<template.cropCanvas.height) template.cropCanvas.height = template.crop_img.height;

    // if (template.crop_img.width > template.cropCanvas.width)
    //   cc.x = (template.crop_img.width - template.cropCanvas.width) / 2.0;
    // if (template.crop_img.height > template.cropCanvas.height)
    //   cc.y = (template.crop_img.height - template.cropCanvas.height) / 2.0;
    // console.log(cc);
    var crop_ctx = template.cropCanvas.getContext("2d");
    //
    // resize original to a 100x100 square for the thumbnail
    crop_ctx.drawImage(
      template.crop_img,
      // original x/y w/h
      cc.x, cc.y,
      100, 100 * cc.width/cc.height
      // cc.width, cc.height,
      // reduce to canvas x/y w/h
      // 0, 0,
      // template.cropCanvas.width, template.cropCanvas.height
    );

    // crop_dataUrl = template.cropCanvas.toDataURL();
    // cropped = document.createElement('img');
    // cropped.id = 'cropped';
    // cropped.src = crop_dataUrl;
    // template.preview.appendChild(cropped);
  }
  // console.info(this.view.name+'.rendered',this);
});
Template.upload.events({
  'change #fileinput': function(e,template) {
    // console.info(e.target);
    var file = document.getElementById('fileinput').files[0];
    // set crop_img.src so crop_img.onload fires
    // https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
    template.reader.onload = (function(aImg) { return function(e) {
      aImg.src = e.target.result;
      var md5hash = md5(e.target.result);
      Meteor.call('imageExists', md5hash, function(err, exists){
        if(exists)
        {
          Bootstrap3boilerplate.alert('danger','Image '+file.name+' has been uploaded before', true);
          template.$('button.upload').addClass('hidden');
        }
      });
    };
    })(template.crop_img);
    template.reader.readAsDataURL(file);
    template.$('button.upload').removeClass('hidden');
    $('div.crop_img').removeClass('hidden');
  },
  'submit form': function(e, template) {
      // http://meteortuts.com/meteor-js-upload-image-to-collection/
      e.preventDefault();
      template.$('button.upload').fadeOut();
      var form = e.target;
      var file = template.find('#fileinput').files[0];
      var meteoruser = Meteor.userId();

      template.reader.onload = function(event) {
        var md5hash = md5(event.target.result);
        // console.log(md5hash);
        Meteor.call('imageExists', md5hash, function(err, exists){
          if(exists)
          {
            Bootstrap3boilerplate.alert('danger','This image has been uploaded before', true);
          }
          else
          {
            DBImages.insert({
               src: event.target.result
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
            Meteor.call('allImageIds', function(err,res){
              AllImages.set(res);
            });
          }
          template.$('input[type="reset"]').click();
          template.$('button.upload').fadeIn();
        });
      };
      template.reader.readAsDataURL(file);
      template.$('button.upload').addClass('hidden');
      $('div.crop_img').addClass('hidden');
  }
});

Template.thumbnails.onCreated(function() {
  var template = this;
  // console.log(template.view.name+'.created');
  // this.autorun(function () {
  //   // var imageStart = Session.get('imageStart');
  //   template.numberofimages = 0;
  //   // console.log(template.view.name+'.autorun '+imageStart);
  //   template.handle = template.subscribe('thumbnails', Session.get('imageStart'),function(){
  //     console.log('thumbnails subscribed');
  //   });
  // });
});
Template.thumbnails.onRendered(function(){
  var template = this;
});
Template.thumbnails.onDestroyed(function() {
  console.log(this.view.name+'.destroyed');
});
Template.thumbnails.helpers({
  pages: function () {
    var pages = [];
    var page = 1;
    var number = ImagesPerPage;//+1;
    var template = Template.instance();
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
  // helper to get all the thumbnails only called ONCE, even when the subscription for DBImages changes
  images: function() {
    // console.log('thumbnails helper');
    return DBImages.find({
      thumbnail:{$exists:1},
      subscriptionId: ThumbnailsHandle.subscriptionId,
    },{
      limit:ImagesPerPage,
      sort:{created: -1 }
    });
  },
  ready: function() {
    return ThumbnailsHandle.ready();
  },
});
Template.thumbnails.events({
  'click a.page':function(e,t) {
    var a = $(e.target);
    var s = parseInt(a.attr('start'));
    // stopping the handle will remove all the images
    // t.handle.stop();
    Session.set('imageStart', s);
  },
});

Template.thumbnail.onRendered(function(){
  var template = this;
  this.$('div.off').removeClass('off');
});
Template.thumbnail.onDestroyed(function(){
  this.$('div.off').addClass('off')
});

Template.image.onCreated(function(){
  var self = this;
  self.img = new ReactiveVar({});
  self.autorun(function(){
    var params = FlowRouter.current().params;
    FlowRouter.watchPathChange();
    self.subscribe('image', params.id, function(){
      var img = DBImages.findOne({_id: params.id});
      if(img)
      {
        // set the preliminary src to animation and make it reactive
        img.src = new ReactiveVar('/circle-loading-animation.gif');
        self.img.set(img);
        // now call method to get src for id
        Meteor.call('src', params.id, function(err,src){
          if(err)
          {
            console.log(err);
          }
          else
          {
            // set this routes img src
            img.src.set(src);
          }
        });
      }
    });
  });
});
Template.image.onRendered(function() {
  // console.info('Template.image.rendered', this);
  if(Roles.userIsInRole( Meteor.userId(),'admin'))
  {
    var params = FlowRouter.current().params;
    var img = DBImages.findOne({_id: params.id});
    if(img)
      Meteor.call('user_name', img.user, function(err,res){
        if(!err) 
        {
          Session.set('user_name', res.email);
          Session.set('user_banned', res.banned);
        } else console.error(err);
      });
  }
});
Template.image.helpers({
  img: function() {
    var instance = Template.instance();
    // var params = FlowRouter.current().params;
    // return DBImages.findOne({_id: params.id});
    // console.log('image.img');
    return instance.img.get();
  },
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
  },
  prev: function() {
    var instance = Template.instance();
    var images = AllImages.get();
    var img = instance.img.get();
    if(img && img._id) {
      var id = img._id;
      var pos = images.indexOf(id);
      if(pos>0) {
        return images[pos-1];
      } else {
        return false;
      }
    }
  },
  next: function() {
    var instance = Template.instance();
    var images = AllImages.get();
    var img = instance.img.get();
    if(img && img._id) {
      var id = img._id;
      var pos = images.indexOf(id);
      if(pos<images.length) {
        return images[pos+1];
      } else {
        return false;
      }
    }
  }
});
Template.image.events({
  // 'click .carousel': function(e,t) {
  //   var id = t.$(e.currentTarget).data('id');
  //   var url = `/image/${id}`;
  //   console.log(url);
  //   FlowRouter.go(url);
  // },
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
      var img = t.img.get();
      Meteor.call('ban', img.user, true, function(err,res){
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
      var img = t.img.get();
      Meteor.call('ban', img.user, false, function(err,res){
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

Template.userImages.onCreated(function(){
  var template = this;
  template.handle = null;
  template.autorun(function(){
    FlowRouter.watchPathChange();
    template.user = FlowRouter.current().params.user;
    Session.set('loadingSize', template.user);
    template.handle = template.subscribe('user_images', template.user, function(){
      console.log('subscribed to images for '+template.user);
    });
    Meteor.call('user_name', template.user, function(err,res){
      if(!err) 
      {
        // console.log('set user_name to '+res.email);
        Session.set('user_name', res.email);
        Session.set('user_banned', res.banned);
      } else console.error(err);
    });
  })
});
Template.userImages.helpers({
  distinct_users: function () {
    FlowRouter.watchPathChange();

    DBImages.distinct('user',function(err, result){
      Session.set('distinct_users', result);
    });
    return Session.get('distinct_users');
  },
  activeUser: function() {
    return this.toString() == Session.get('loadingSize');
  },
  images: function() {
    //
    // do not use subscriptionId since the images might already be 
    // there from the global Meteor.subscription and the publish
    // only adds the new subscriptionId to images not yet in the 
    // publication
    //
    FlowRouter.watchPathChange();
    var instance = Template.instance();
    return DBImages.find({
      user: instance.user,
    },{
      sort:{created: -1}
    });
  },
  user: function() {
    var instance = Template.instance();
    return instance.user;
  },
  user_name: function() {
    return Session.get('user_name');
  },
});
Template.other_user.onCreated(function(){
  var self = this;
  self.user_name = new ReactiveVar(self.data);
  Meteor.call('user_name', self.data, function(err, user_name){
    if(err) console.error(err);
    else {
      self.user_name.set(user_name.email);
    }
  })
});
Template.other_user.helpers({
  other_user_name: function(){
    var self = Template.instance();
    return self.user_name.get();
  }
});
/*
 * requires role moment
 */
Template.momentTemplate.helpers({
  createPageFromTemplates: function() {
    return EJSON.stringify(Session.get('createPageFromTemplates'), {indent: true});
  },
  isDevelopment: function() {
    return __meteor_runtime_config__.isDevelopment;
  }
});
Template.momentTemplate.events({
  'click button.createPageFromTemplates': function(e,t) {
    console.info('calling createPageFromTemplates');
    Meteor.call('createPageFromTemplates', function(e,r){
      if(!e) Session.set('createPageFromTemplates', r);
    });
  }
});

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
Bootstrap3boilerplate.Footer.show.set(true);

Tracker.autorun(function () {
  Template.thumbnails.numberofimages = 0;
  ThumbnailsHandle = Meteor.subscribe('thumbnails', Session.get('imageStart'),function(){
    console.log('thumbnails subscribed '+ThumbnailsHandle.subscriptionId);
  });
});

Tracker.autorun(function () {
  var uploaded = Session.get('uploaded');
  Meteor.call('imageCount', function(err,res){
    if(!err)
      Session.set('imageCount', res);
  });
});

Tracker.autorun(function () {
  // ...
  Bootstrap3boilerplate.ProjectName.set({text:Session.get('imageCount')+' MongoDB Images',href:'/'});
});

Meteor.startup(function(){
  // DBImages.distinct('user',function(err, result){
  //   console.info('distinct users', result);
  // });
  // Meteor.call('createPageFromTemplates', function(e,r){
  //   if(!e) Session.set('createPageFromTemplates', r);
  // });
  Meteor.call('allImageIds', function(err,res){
    AllImages.set(res);
  });
});

