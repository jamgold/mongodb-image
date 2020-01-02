import '/imports/lib/routes.js';
import '/imports/client/tags.js';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { FlowRouter, RouterHelpers } from 'meteor/ostrio:flow-router-extra';

var md5 = require('md5');
if(Meteor.flush == undefined)
Meteor.flush = function() {
  // console.info('Meteor.flush deprecated')
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
ImageType = new ReactiveVar('cover');
TagsImgId = null;
ImageStart = 0;

Bootstrap3boilerplate = {
  __alert: new ReactiveVar([]),
  alert: function (type, text, dismiss) {
    var alertid = Random.id();
    type = _.indexOf(Bootstrap3boilerplate._alertTypes, type) >= 0 ? type : 'info';
    dismiss = dismiss === undefined ? false : dismiss === true;
    var alerts = Bootstrap3boilerplate.__alert.get();
    if (alerts === undefined) alerts = [];
    alerts.push({
      type: type,
      text: text,
      dismiss: dismiss,
      alertid: alertid
    });
    Bootstrap3boilerplate.__alert.set(alerts);
    return alertid;
  },
  removeAlert: function (alertid) {
    var newalerts = [];
    if (_.indexOf(['all', 'clear'], alertid) < 0) {
      var alerts = Bootstrap3boilerplate.__alert.get();
      if (alerts === undefined) alerts = [];
      _.each(alerts, function (alert) {
        if (alert.alertid != alertid)
          newalerts.push(alert);
      });
    }
    Bootstrap3boilerplate.__alert.set(newalerts);
  },

}
Template.registerHelper('cssclasses',function(){
  // console.log(`cssclasses ${this.cssclasses}`);
  return this.cssclasses ? this.cssclasses : '';
});

Template.bootstrap.helpers({
  alerts(){
    return Bootstrap3boilerplate.__alert.get();
  },
  showButton(){

  }
});
Template.bootstrap.events({
  'click button'(event, instance){
    var alertid = event.currentTarget.dataset.alertid;
    Bootstrap3boilerplate.removeAlert(alertid);
  }
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
      // Bootstrap3boilerplate.Modal.hide();
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
  'click button.upload-url'(event, template) {
    var url = template.find('#image-url');
    if(url){
      Meteor.call('getURL', url.value , (err, file) => {
        if(err) {
          console.error(err);
          Bootstrap3boilerplate.alert('danger', `Image ${err.message} has been uploaded before`, true);
        } else {
          template.file = file;
          template.crop_img.src = file.data;
          template.md5hash = md5(file.data);
          url.value = '';
        }
      });
    } else {
      console.log('could not find #image-url')
    }
  },
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

});
Template.thumbnails.onRendered(function(){
  var template = this;
  TagsImgId = null;
  template.autorun(function () {
    ImageStart = parseInt(ImageStart);
    // console.log(`${template.view.name}.onCreated.autorun ImageStart=${ImageStart}`);
    var counter = Session.get('imageCount');
    var pages = [];
    var page = 1;
    const number = ImagesPerPage;
    template.$('.pagination li').removeClass('active');

    for (var i = 0; i < counter; i += number) {
      var c = i == ImageStart ? 'active' : '';
      // console.log(`${template.view.name}.onCreated.autorun ${i} ${c}`);
      // pages.push(`<li ${c} data-start='${i}'><a data-start='${i}'>${page}</a></li>`);
      pages.push({
        page: page,
        start: i,
        class: c
      })
      page++;
    }
    template.pages.set(pages);
    template.$(`li[data-start="${ImageStart}"]`).addClass('active');
  })
});
Template.thumbnails.onDestroyed(function() {
  var template = this;
  if(template.debug) {
    console.log(this.view.name+'.destroyed');
  }
});
Template.thumbnails.helpers({
  pages() {
    const pages = Template.instance().pages.get();
    // console.log('pages', pages)
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
  // tags(){
  //   return Template.instance().tags.get();
  // },
  tagged(){
    return TagSearch.get();
  }
});
Template.thumbnails.events({
  'click .pagination li a'(e,t) {
    // console.log('click .pagination li a');
    t.$('.pagination li').removeClass('active');
    ImageStart = parseInt(e.currentTarget.dataset.start);
    e.currentTarget.parentNode.classList.add('active');
    Session.set('imageStart', ImageStart);
  },
  // 'click .uploadModal'(e,t) {
  //   Bootstrap3boilerplate.Modal.show();
  // },
});

Template.thumbnail.onRendered(function(){
  const instance = this;
  instance.find('div.off').classList.remove('off');
  // console.log(`${instance.view.name}.onRendered`, instance.data);
});
Template.thumbnail.onDestroyed(function(){
  const instance = this;
  // instance.find('div.off').classList.add('off');
});
Template.thumbnail.helpers({
  // cssclasses(){
  //   console.log(this);
  // }
});

Template.bs_navbar.onCreated(function(){
  const instance = this;
  instance.imgid = '/';
})
Template.bs_navbar.onRendered(function(){
  const instance = this;
  // console.log(`${instance.view.name}.onRendered`);
  instance.autorun(function(){
    FlowRouter.watchPathChange();
    const c = FlowRouter.current();
    const s = `a.nav-link[href="${c.path}"]`;
    instance.$('a.nav-link').removeClass('active');
    if (['image', 'crop'].indexOf(c.route.name) >= 0)
      instance.$('a.nav-link.conditional').removeClass('disabled');
    else
      instance.$('a.nav-link.conditional').addClass('disabled');
    var a = instance.$(s).addClass('active').length;
    // console.log(s,a);
  })
})
Template.bs_navbar.helpers({
  title(){
    return `${Session.get('imageCount')} MongoDB Images`;
  },
  imageInfoButtons(){
    FlowRouter.watchPathChange();
    const c = FlowRouter.current();
    const disabled = ['image', 'crop'].indexOf(c.route.name) >= 0 ? '' : 'disabled';
    const r = {
      disabled: disabled,
      imgid: c.params.id,
      url: c.route.name == 'image' ? '/' : `/image/${c.params.id}`,
      // cropActive: c.route.name == 'crop' ? `${disabled} active` : disabled,
      // infoActive: c.route.name == 'image' ? `${disabled} active` : disabled,
    };
    console.log(r);
    return r;
  },
  imgid(){
    FlowRouter.watchPathChange();
    const c = FlowRouter.current();
    const instance = Template.instance();
    instance.imgid = ['image', 'crop'].indexOf(c.route.name) >= 0 ? c.params.id : '';
    // console.log(`imgid=${instance.imgid}`);
    return instance.imgid;
  },
  url(){
    FlowRouter.watchPathChange();
    const c = FlowRouter.current();
    const url = c.route.name == 'image' ? '/' : `/image/${c.params.id}`;
    return url;
  },
  right(){
    const userId = Meteor.userId();
    var right = [];
    if (userId) {
      right.unshift({ text: 'My Images', href: `/user/${userId}` });
    }
    if (Roles.userIsInRole(Meteor.userId(), 'admin')) {
      right.unshift({ text: 'Admin', href: '/admin' });
    }
    return right;
  },
});
Template.bs_navbar.events({
  'click .delete': function (e, t) {
    const id = e.currentTarget.id;
    if (confirm(`Really Delete? ${id}`)) {
      DBImages.remove({ _id: id }, function (err) {
        if (err) {
          console.log(err);
          e.preventDefault();
        }
        else {
          Session.set('uploaded', Session.get('uploaded') - 1);
          FlowRouter.go('/');
        }
      });
    }
  },
  'click a[data-target="#imageInfo"]'(event, instance){
    FlowRouter.go(`/image/${event.currentTarget.dataset.id}`);
  }
})

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

Meteor.startup(function(){
  // console.log('Meteor.startup');
  Meteor.call('contributors', function(err,res){
    if(err) {
      console.error(err);
    } else {
      // AllImageIDs.set(res.images);
      Contributors.set(res.contributors);
    }
  });
});
