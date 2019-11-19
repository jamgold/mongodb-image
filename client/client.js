import '/imports/lib/routes.js';
import '/imports/client/tagit';

import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
var md5 = require('md5');

if(Meteor.flush == undefined)
Meteor.flush = function() {
  console.info('Meteor.flush deprecated')
}
// optionsTest = function(args, options) {
//   options = options || {};

//   console.info('options', options);
// };

AcceptedFileTypes = {"image/png":true,"image/jpeg":true,"image/jpg":true,"image/gif":true};

Session.setDefault('uploaded', 0);
Session.setDefault('imageStart', 0);
Session.setDefault('imageCount', 0);
Session.setDefault('src', new Date());

ThumbnailsHandle = null;
// AllImageIDs = new ReactiveVar([]);
Contributors = new ReactiveVar([]);
TagSearch = new ReactiveVar([]);
TagsImgId = null;
ImageStart = 0;

Template.registerHelper('cssclasses',function(){
  // console.log(`cssclasses ${this.cssclasses}`);
  return this.cssclasses ? this.cssclasses : '';
});

// Template.body.onRendered(function(){
//   // const template = this;
//   var dragover = false;
//   var files = null;
//   const body = document.getElementsByTagName('body')[0]
//   console.log('body onRendered', body);
//   if(body) {
//     body.addEventListener('dragover', function(e){
//       e.preventDefault();
//       if(!dragover){
//         dragover = true;
//         body.classList.add('dragover')
//         // console.log('dragover');
//       }
//     });
//     body.addEventListener('dragleave', function(e){
//       e.preventDefault();
//       dragover = false;
//       body.classList.remove('dragover');
//       // console.log('dragleave');
//     });
//     body.addEventListener('drop', function(e){
//       e.preventDefault();
//       e.stopPropagation();
//       body.classList.remove('dragover');
//       if (e.dataTransfer) {
//         files = e.dataTransfer.files;
//       } else if (e.target) {
//         files = e.target.files;
//       }
//       console.log(files);
//     });
//   }
// });

Template.upload.onCreated(function(){
  var template = this;
  template.debug = false;
  template.files = [];
  template.filesIndex = 0;
  template.file = null;
  template.md5hash = "";
  template.autorun(function(){
    template.userId = Meteor.userId();
  });
});
Template.upload.onRendered(function () {
  var template = this;

  template.processNext = function uploadProcessNext() {
    //
    // process next if there are more
    //
    if(template.filesIndex < template.files.length) {
      template.file = template.files.item(template.filesIndex++);
      template.reader.readAsDataURL(template.file);
    } else {
      template.filesIndex=0;
      template.files = [];
      Session.set('uploaded', Session.get('uploaded')+1);
      Session.set('imageStart', 0);
      template.$('h1').removeClass('hidden');
      template.$('img').addClass('hidden');
      Bootstrap3boilerplate.Modal.hide();
    }
  }

  template.reader = new FileReader();
  template.preview = document.getElementById('images');

  if(!template.preview) {
    template.preview = document.createElement('div');
    template.preview.id = 'preview';
    if(template.debug) {
      console.log('creating #preview');
    } else {
      template.preview.classList.add('hidden');
    }
    document.body.appendChild(template.preview);
  }
  template.crop_img = document.getElementById('crop_img');
  if(!template.crop_img) {
    template.crop_img = document.createElement('img');
    template.crop_img.id = 'crop_img';
    if(template.debug) {
      console.log('creating #crop_img');
    } else {
      template.crop_img.classList.add('hidden');
    }
    template.preview.appendChild(template.crop_img);
  }

  template.cropCanvas = document.getElementById('crop_canvas');
  if(!template.cropCanvas) {
    template.cropCanvas = document.createElement('canvas');
    template.cropCanvas.id = 'crop_canvas';
    template.cropCanvas.width = 100;
    template.cropCanvas.height = 100;
    if(template.debug) {
      console.log('creating #crop_canvas');
    } else {
      template.cropCanvas.classList.add('hidden');
    }
    template.preview.appendChild(template.cropCanvas);
  }
  //
  // define onload handler for image
  //
  template.crop_img.onload = function cropImgLoaded(e) {
    console.log(`crop_img.onload ${e.timeStamp}`);
    var cropCanvas = template.cropCanvas;
    var cropDataUrl = this.src;
    var cc = {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
    };
    if (cc.height > cc.width) {
      cc.height = cc.width;
    }
    else
    {
      cc.width = this.height;
    }
    // console.log('cropping',cc);

    var crop_ctx = cropCanvas.getContext("2d");
    //
    // resize original to a 100x100 square for the thumbnail
    //
    crop_ctx.drawImage(
      this, //template.crop_img,
      // original x/y w/h
      cc.x, cc.y,
      100, 100 * cc.width/cc.height
      // cc.width, cc.height,
      // reduce to canvas x/y w/h
      // 0, 0,
      // template.cropCanvas.width, template.cropCanvas.height
    );
    console.log(`cropImage cropped into cropCanvas ${template.file.name}`);

    DBImages.insert({
       src: cropDataUrl
      ,thumbnail: template.cropCanvas.toDataURL()
      ,size: template.file.size
      ,name: template.file.name
      ,type: template.file.type
      ,md5hash: template.md5hash
    }, function imageInserted(error,id) {
      if(error) {
        console.error(error);
      } else {        
        console.log(`image ${id} inserted`);
        // var ids = AllImageIDs.get();
        // ids.push(id);
        // AllImageIDs.set(ids);
      }
      template.processNext();
    });
  }
  //
  // define onload handler for reader to read in the file
  //
  template.reader.onload = (function(aImg) { return function(e) {
    if(template.file.type in AcceptedFileTypes) {
      template.md5hash = md5(e.target.result);
      if(template.debug) {
        console.log(`read file ${template.file.name} => ${template.md5hash}`);
      }
      Meteor.call('imageExists', template.md5hash, function imageExits(err, exists){
        if(exists) {
          Bootstrap3boilerplate.alert('danger',`Image ${template.file.name} has been uploaded before`, true);
          template.processNext();
        } else {
          // set crop_img.src so crop_img.onload fires which creates the thumbnail
          // https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
          aImg.src = e.target.result;
        }
      });
    } else {
      Bootstrap3boilerplate.alert('danger',`Image ${template.file.type} not of acceptable mime-type`, true);
      template.processNext();
    }
  };
  })(template.crop_img);
});
Template.upload.events({
  'change #fileinput': function(e,template) {
    // console.info(e.target);
    template.filesIndex = 0;
    template.files = document.getElementById('fileinput').files;
    template.$('h1').addClass('hidden');
    template.$('img').removeClass('hidden');
    template.processNext();
    // template.file = template.files.item(template.filesIndex++);
    // template.reader.readAsDataURL(template.file);
    // template.$('button.upload').removeClass('hidden');
    // $('div.crop_img').removeClass('hidden');
  },
  'click div.mongodb-image-droppable'(e,template) {
    e.preventDefault();
    e.stopPropagation();
    template.$('#fileinput').trigger('click');
  },
  'dragover div.mongodb-image-droppable'(e,t){
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
  },
  'dragleave div.mongodb-image-droppable'(e,t){
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
  },
  'drop div.mongodb-image-droppable'(e,template){
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    template.filesIndex = 0;
    if(e.originalEvent.dataTransfer) {
      template.files = e.originalEvent.dataTransfer.files;
    } else if(e.originalEvent.target) {
      template.files = e.originalEvent.target.files;
    }
    template.$('h1').addClass('hidden');
    template.$('img').removeClass('hidden');
    template.processNext();
  }
});

Template.thumbnails.onCreated(function() {
  var template = this;
  template.tags = new ReactiveVar(null);
  template.pages = new ReactiveVar([]);
  // Meteor.call('tags',(err,res) => {
  //   if(err) console.error(err);else template.tags.set(res);
  // });

  template.autorun(function(){
    // console.log(`${template.view.name}.onCreated.autorun ImageStart=${ImageStart}`);
    var counter = Session.get('imageCount');
    var pages = [];
    var page = 1;
    var number = ImagesPerPage;
    for (var i = 0; i < counter; i += number) {
      var c = i == ImageStart ? 'active' : '';
      pages.push(`<li class="${c}" data-start="${i}"><a data-start="${i}">${page}</a></li>`);
      page++;
    }
    template.pages.set(pages);
  })
});
Template.thumbnails.onRendered(function(){
  var template = this;
  TagsImgId = null;
});
Template.thumbnails.onDestroyed(function() {
  var template = this;
  if(template.debug) {
    console.log(this.view.name+'.destroyed');
  }
});
Template.thumbnails.helpers({
  pages() {
    var template = Template.instance();
    return template.pages.get();
  },
  // helper to get all the thumbnails only called ONCE, even when the subscription for DBImages changes
  images() {
    // console.log('thumbnails helper');
    return DBImages.find({
      thumbnail:{$exists:1},
      // subscriptionId: ThumbnailsHandle.subscriptionId,
    },{
      limit:ImagesPerPage,
      sort:{created: -1 }
    });
  },
  ready(){
    return ThumbnailsHandle.ready();
  },
  imageid(){
    var img = DBImages.findOne();
    return img ? img._id : null;
  },
  tags(){
    return Template.instance().tags.get();
  },
  tagged(){
    return TagSearch.get();
  }
});
Template.thumbnails.events({
  'click .pagination li a'(e,t) {
    t.$('.pagination li').removeClass('active');
    ImageStart = parseInt(e.currentTarget.dataset.start);
    e.currentTarget.parentNode.classList.add('active');
    Session.set('imageStart', ImageStart);
  },
  'click .uploadModal'(e,t) {
    Bootstrap3boilerplate.Modal.show();
  },
});

Template.thumbnail.onRendered(function(){
  var template = this;
  this.$('div.off').removeClass('off');
});
Template.thumbnail.onDestroyed(function(){
  //
  this.$('div.off').addClass('off');
});
Template.thumbnail.helpers({
  // cssclasses(){
  //   console.log(this);
  // }
});

Template.image.onCreated(function(){
  var instance = this;
  instance.cssclasses = new ReactiveVar('');
  instance.next = new ReactiveVar(null);
  instance.prev = new ReactiveVar(null);
  instance.img = new ReactiveVar({
    name:'loading',
    md5hash:'loading',
    size:0,
    type:'loading',
    src:new ReactiveVar('/circle-loading-animation.gif'),
    imageId: FlowRouter.current().params.id,
  });

  instance.autorun(function(){
    var userId = Meteor.userId();
    var params = FlowRouter.current().params;
    FlowRouter.watchPathChange();
    instance.subscribe('image', params.id, function(){
      var tagSearch = TagSearch.get();
      var $myTags = $('#myTags');
      TagsImgId = null;
      $myTags.tagit('removeAll');
      instance.cssclasses.set("");
      var img = DBImages.findOne({_id: params.id});
      if(img) {
        let readOnly = true;
        if(userId) {
          if(img.user == userId) {
            readOnly = false;
          } else {
            readOnly = !Roles.userIsInRole(userId, 'admin');
          }
        }
        // this only affects the tags and not readOnly of the input
        $myTags.tagit({ readOnly: readOnly });//.prop('readOnly', false);
        $('#myTags li.tagit-new input').prop('disabled', readOnly);
        if(img.tags) {
          img.tags.forEach(function(tag){
            $("#myTags").tagit("createTag", tag);
          })
        }
        // $myTags.prop('readOnly', readOnly);
        // set the preliminary src to animation and make it reactive
        img.src = new ReactiveVar('/circle-loading-animation.gif');
        instance.img.set(img);
        // now call method to get src for id
        Meteor.call('src', params.id, tagSearch, function(err,res){
          if(err)
          {
            console.log(err);
          }
          else
          {
            // set this routes img src
            // console.log(`prev ${res.prev}, next ${res.next}`);
            img.src.set(res.src);
            instance.next.set(res.next);
            instance.prev.set(res.prev);
            instance.cssclasses.set(img.cssclasses);
          }
        });
      }
      TagsImgId = params.id;
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
  imgId(){
    return FlowRouter.current().params.id;
  },
  img: function() {
    var instance = Template.instance();
    return instance.img.get();
  },
  cssclassesImage(){
    var instance = Template.instance();
    return instance.cssclasses.get();    
  },
  md5hash: function() {
    var image = this;
    if(image && image._id && image.src)
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
    return instance.prev.get();
    // var images = AllImageIDs.get();
    // var img = instance.img.get();
    // var prev = false;
    // if(img && img._id) {
    //   var id = img._id;
    //   var pos = images.indexOf(id);
    //   if(pos>0) {
    //     prev = images[pos-1];
    //   }
    //   Meteor.call('prevImage', img.order, (err,res) => {
    //     if(err) console.error(err);else console.info(`${prev} and ${res}`);
    //   })
    // }
    // return prev;
  },
  next: function() {
    var instance = Template.instance();
    return instance.next.get();
    // var images = AllImageIDs.get();
    // var img = instance.img.get();
    // var next = false;
    // if(img && img._id) {
    //   var id = img._id;
    //   var pos = images.indexOf(id);
    //   if(pos<images.length) {
    //     next = images[pos+1];
    //   }
    //   Meteor.call('nextImage', img.order, (err,res) => {
    //     if(err) console.error(err);else console.info(`${next} and ${res}`);
    //   });
    // }
    // return next;
  },
  active(c) {
    // console.log(c,this);
    if(c == undefined) {
      return this.cssclasses == undefined || this.cssclasses == "" ? "checked" : "";
    } else {
      return this.cssclasses == c ? "checked" : "";
    }
  },
  commentOut(){
    return true;
  }
});
Template.image.events({
  'change #cssclasses'(e,t){
    var c = e.currentTarget;
    var id = c.dataset.imageId;
    var image = DBImages.findOne(id);
    var old = image.cssclasses;
    DBImages.update(id,{$set:{cssclasses: c.value}},function(r){
      // t.$('.fullscreen').removeClass(old).addClass(c.value);
      t.cssclasses.set(c.value);
    })
  },
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

Template.userImages.onCreated(function(){
  const template = this;
  template.handle = null;
  template.start = new ReactiveVar(0);
  template.user = new ReactiveVar(FlowRouter.current().params.user);
  template.pages = new ReactiveVar([]);
  template.contributors = {};

  if(ThumbnailsHandle) ThumbnailsHandle.stop();

  template.autorun(function(){
    var contributors = Contributors.get();
    if (contributors) {
      contributors.forEach(function (c) {
        template.contributors[c.id] = c;
      })
    }
    // console.log(template.contributors);
  });

  template.autorun(function(){
    FlowRouter.watchPathChange();
    template.user.set(FlowRouter.current().params.user);
  });
  template.autorun(function(){
    var user = template.user.get();
    // template.user = FlowRouter.current().params.user;
    Meteor.call('user_name', user, function (err, res) {
      // console.log('user_name', res);
      if (!err) {
        Session.set('user_name', res.email);
        Session.set('user_banned', res.banned);
      } else console.error(err);
    });

    var counter = user in template.contributors ? template.contributors[user].count : 0;
    var pages = [];
    var page = 1;
    var number = 18;//ImagesPerPage;
    if(counter>number){
      for (var i = 0; i < counter; i += number) {
        var c = i == ImageStart ? 'active' : '';
        pages.push(`<li class="${c}" data-start="${i}"><a data-start="${i}">${page}</a></li>`);
        page++;
      }
    }
    // console.log(`set pages for ${user} / ${counter} => ${pages.length}`);
    template.pages.set(pages);
    template.start.set(0);
  });
  template.autorun(function(){
    var user = template.user.get();
    var start = template.start.get();
    // console.log(`${template.view.name} running subscribe for ${user}`);
    if(template.handle) template.handle.stop();
    template.handle = template.subscribe('user_images', start, user, function(){
      // console.log(`subscribed to ${DBImages.find({user:user}).count()} images for ${user}`);
    });
  });
});
Template.userImages.onDestroyed(function(){
  const instance = this;
  // console.info(`${instance.view.name}.onDestroyed`);
  //
  // restore global subscription
  //
  if (ThumbnailsHandle) ThumbnailsHandle.stop();
  ThumbnailsHandle = Meteor.subscribe('thumbnails', Session.get('imageStart'), TagSearch.get(), function () {
    // console.log(`${DBImages.find().count()} thumbnails subscribed ${ThumbnailsHandle.subscriptionId}`);
  });
});
Template.userImages.helpers({
  needsPagination(){
    const instance = Template.instance();
    const pages = instance.pages.get();
    return pages.length>0;
  },
  pages(){
    const instance = Template.instance();
    return instance.pages.get();
  },
  contributors(){
    return Contributors.get();
  },
  activeUser(c) {
    const instance = Template.instance();
    var user = instance.user.get();
    // console.log(`activeUser ${c.id} == ${user}`);
    return c.id.toString() == user;
  },
  images() {
    //
    // do not use subscriptionId since the images might already be 
    // there from the global Meteor.subscription and the publish
    // only adds the new subscriptionId to images not yet in the 
    // publication
    //
    var instance = Template.instance();
    var user = instance.user.get()
    return DBImages.find({
      user: user,
    },{
      sort:{created: -1}
    });
  },
  user() {
    var instance = Template.instance();
    return instance.user.get();
  },
  user_name: function() {
    return Session.get('user_name');
  },
});
Template.userImages.events({
  'click .pagination li a'(e, template) {
    template.$('.pagination li').removeClass('active');
    e.currentTarget.parentNode.classList.add('active');
    template.start.set(parseInt(e.currentTarget.dataset.start));
  },
});
Template.other_user.onCreated(function(){
  const self = this;
  self.user_name = new ReactiveVar(self.data);
  // console.log(`${self.view.name}.onCreated`, self.data);
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
Template.other_user.events({
  'click .banning'(event, instance){
    let user = event.currentTarget.dataset.contributor;
    if(event.currentTarget.classList.contains('ban')){
      // console.log(`ban ${user}`);
      if(confirm('Really ban this user?'))
      {
        Meteor.call('ban', user, true, function(err,res){
          if(err)
          {
            console.log(err)
          }
          else
          {
            event.currentTarget.classList.remove('ban');
            event.currentTarget.classList.add('banned');
            event.currentTarget.innerHTML = res;
          }
          // console.info(e.target.className,err,res);
        });
      }
    } else {
      // console.log(`unban ${user}`);
      if(confirm('Really unban this user?'))
      {
        Meteor.call('ban', user, false, function(err,res){
          if(err)
          {
            console.log(err)
          }
          else
          {
            event.currentTarget.classList.remove('banned');
            event.currentTarget.classList.add('ban');
            event.currentTarget.innerHTML = res;
          }
          // console.info(e.target.className,err,res);
        });
      }
    }
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

  let userId = Meteor.userId();
  if(userId) {
    right.unshift({text:'My Images', href: `/user/${userId}`});
  }
  if(Roles.userIsInRole( Meteor.userId(),'admin')) {
    right.unshift({text:'Admin',href:'/admin'});
  }
  return right;
};
Bootstrap3boilerplate.init();
Bootstrap3boilerplate.Footer.show.set(false);
Bootstrap3boilerplate.Modal.title.set('Upload Images');
Bootstrap3boilerplate.Modal.dynamicTemplate.set('upload');

Tracker.autorun(function () {
  Template.thumbnails.numberofimages = 0;
  if(ThumbnailsHandle) ThumbnailsHandle.stop();
  ThumbnailsHandle = Meteor.subscribe('thumbnails', Session.get('imageStart'), TagSearch.get(),function(){
    // console.log(`${DBImages.find().count()} thumbnails subscribed ${ThumbnailsHandle.subscriptionId}`);
  });
});
Tracker.autorun(function imageCountAutorun() {
  var uploaded = Session.get('uploaded');
  var tags = TagSearch.get();
  // console.info(`imageCountAutorun ${tags}`);
  Meteor.call('imageCount', tags, function(err,count){
    if(!err) {
      Session.set('imageCount', count);
      // Session.set('imageStart',0);
      // ImageStart = 0;
    }
  });
});
Tracker.autorun(function () {
  // ...
  Bootstrap3boilerplate.ProjectName.set({text:Session.get('imageCount')+' MongoDB Images',href:'/'});
});

Meteor.startup(function(){
  console.log('Meteor.startup');
  Meteor.call('contributors', function(err,res){
    if(err) {
      console.error(err);
    } else {
      // AllImageIDs.set(res.images);
      Contributors.set(res.contributors);
    }
  });
});
