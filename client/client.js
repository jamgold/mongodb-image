import '/imports/lib/routes.js';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
var md5 = require('md5');

if(Meteor.flush == undefined)
Meteor.flush = function() {
  console.info('Meteor.flush deprecated')
}
optionsTest = function(args, options) {
  options = options || {};

  console.info('options', options);
};

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

Template.registerHelper('cssclasses',function(){
  // console.log(`cssclasses ${this.cssclasses}`);
  return this.cssclasses ? this.cssclasses : '';
});

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

  if(!template.preview)
  {
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
  if(!template.crop_img)
  {
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
  if(!template.cropCanvas)
  {
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
  Meteor.call('tags',(err,res) => {
    if(err) console.error(err);else template.tags.set(res);
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
  'click a.page'(e,t) {
    var a = $(e.target);
    var s = parseInt(a.attr('start'));
    // stopping the handle will remove all the images
    // t.handle.stop();
    Session.set('imageStart', s);
  },
  'click button.uploadModal'(e,t) {
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
  });

  instance.autorun(function(){
    var params = FlowRouter.current().params;
    FlowRouter.watchPathChange();
    instance.subscribe('image', params.id, function(){
      TagsImgId = null;
      $('#myTags').tagit('removeAll');
      instance.cssclasses.set("");
      var img = DBImages.findOne({_id: params.id});
      if(img)
      {
        if(img.tags) {
          img.tags.forEach(function(tag){
            $("#myTags").tagit("createTag", tag);
          })
        }
        // set the preliminary src to animation and make it reactive
        img.src = new ReactiveVar('/circle-loading-animation.gif');
        instance.img.set(img);
        // now call method to get src for id
        Meteor.call('src', params.id, function(err,res){
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

  template.autorun(function(){
    FlowRouter.watchPathChange();
    template.user = FlowRouter.current().params.user;
    template.handle = template.subscribe('user_images', template.user, function(){
      console.log(`subscribed to ${DBImages.find({user:template.user}).fetch().length} images for ${template.user}`);
    });
    Meteor.call('user_name', template.user, function(err,res){
      if(!err) 
      {
        Session.set('user_name', res.email);
        Session.set('user_banned', res.banned);
      } else console.error(err);
    });
  })
});
Template.userImages.helpers({
  contributors(){
    return Contributors.get();
  },
  activeUser: function(c) {
    return c.id.toString() == Template.instance().user;
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

Template.tagit.onRendered(function(){
  const instance = this;
  console.info(`${instance.view.name}.onRendered`,instance.data);
  
  let options = {
    placeholderText: instance.data.title,
    allowDuplicates: false,
    allowSpaces: false,
    caseSensitive: false,
    readOnly: false,
    tagLimit: null,
    singleField: true,
    fieldName: 'tag',
    autocomplete: {
      delay: 0,
      minLength: 2,
      autoFocus: true,
    }
  };
  let useHook = true;
  // instance.autorun(function(){
    let userId = Meteor.userId();
    // console.log(`${instance.view.name}.autorun ${userId}`);
    if(instance.data.tags) {
      //
      // if template was called with array of tags, use those
      //
      options['availableTags'] = instance.data.tags;
      //
      // make sure we can only add existing tags
      //
      options['beforeTagAdded'] = function(event, ui) {
        return instance.data.tags.indexOf(ui.tagLabel)>=0;
      };
      options['afterTagAdded'] = function(event, ui) {
        if(useHook) {
          let tags = TagSearch.get();
          tags.push(ui.tagLabel);
          TagSearch.set(tags);
        }
      };
      options['afterTagRemoved'] = function(event, ui) {
        if(useHook){
          let tags = TagSearch.get();
          TagSearch.set(tags.filter((tag) => {return ui.tagLabel != tag}));
        }
      };
    } else {
      //
      // add autocomplete from meteor call
      //
      options['autocomplete']['source'] = function(request, callback){
        Meteor.call('tags', request.term, (err,res) => {
          var options = [];
          if(err) console.error(err);else options = res.map( (t) => {return {label:t, value: t}});
          callback( options );
        });
      };
      options['afterTagAdded'] = function(event, ui) {
        if(TagsImgId){
          // console.log(`added ${ui.tagLabel} to ${TagsImgId}`,ui);
          DBImages.update(TagsImgId,{$push:{tags: ui.tagLabel}});
        }
      };
      options['afterTagRemoved'] = function(event, ui) {
        if(TagsImgId){
          // console.log(`removed ${ui.tagLabel} from ${TagsImgId}`,ui);
          DBImages.update(TagsImgId,{$pull:{tags: ui.tagLabel}});
        }
      };
      //
      // only let logged-in users tag
      //
      options['readOnly'] = userId == null;
    }
    instance.$("#myTags").tagit( options );
  // });
  
  if(instance.data.tagged) {
    useHook = false;
    instance.data.tagged.forEach(function(tag){
      instance.$("#myTags").tagit("createTag", tag);
    });
    useHook = true;
  }

  let input = instance.findAll('.ui-autocomplete-input');
  if(input.length>0) {
    input[0].spellcheck = false;
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
Bootstrap3boilerplate.Footer.show.set(false);
Bootstrap3boilerplate.Modal.title.set('Upload Images');
Bootstrap3boilerplate.Modal.dynamicTemplate.set('upload');

Tracker.autorun(function () {
  Template.thumbnails.numberofimages = 0;
  if(ThumbnailsHandle) ThumbnailsHandle.stop();
  ThumbnailsHandle = Meteor.subscribe('thumbnails', Session.get('imageStart'), TagSearch.get(),function(){
    console.log(`${DBImages.find().count()} thumbnails subscribed ${ThumbnailsHandle.subscriptionId}`);
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
