import '/imports/lib/routes.js';
import '/imports/client/tags.js';
import '/imports/client/private.js';
import '/imports/client/upload';
import 'hammerjs';
import 'bootstrap/dist/js/bootstrap.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
// import 'glyphicons-only-bootstrap/css/bootstrap.css';
import { FlowRouter, RouterHelpers } from 'meteor/ostrio:flow-router-extra';

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
Session.setDefault('navbarUrl', '/');
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
  _alertTypes:[
    "primary",
    "secondary",
    "success",
    "danger",
    "warning",
    "info",
    "light",
    "dark",
  ],
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

Template.body.onRendered(function(){
  const template = this;
  const body = document.getElementsByTagName('body')[0];
  template.hammer = new Hammer(body);
  template.hammer.get('swipe').set({
    enable: true,
    threshold: 5,
    velocity: 0.1,
    direction: Hammer.DIRECTION_HORIZONTAL,
  });
  template.hammer
    .on('swipeleft', (e) => {
      const next = document.querySelector('a.next');
      if(next) {
        next.click();
      } else {
        const current = document.querySelector('.pagination .active');
        if (current) {
          const start = parseInt(current.dataset.start);
          const page = document.querySelector(`.pagination li a[data-start="${start + 18}"]`);
          if(page) page.click();
        }
      }
      // alert('swipeleft ' + current.dataset.start);
    })
    .on('swiperight', (e) => {
      const prev = document.querySelector('a.prev');
      if (prev) {
        prev.click();
      } else {
        const current = document.querySelector('.pagination .active');
        if (current) {
          const start = parseInt(current.dataset.start);
          if (start > 0) {
            const page = document.querySelector(`.pagination li a[data-start="${start - 18}"]`);
            if(page) page.click();
          }
        }
      }
      // alert('swiperight '+current.dataset.start);
    })
  window.hammertime = template.hammer;
  // console.log(`${template.view.name}.onRendered`, body);
});

Template.bootstrap.helpers({
  alerts(){
    return Bootstrap3boilerplate.__alert.get();
  },
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
    var pages = [];//['<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true" >&laquo;</span> <a>'];
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
    // pages.push('<li class="page-item"><a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a></li>');
    template.pages.set(pages);
    template.$(`li[data-start="${ImageStart}"]`).addClass('active');
  });
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
    // console.log(`pages ${pages.length}`);
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
  'click .pagination li a.page'(e,t) {
    // console.log('click .pagination li a');
    t.$('.pagination li').removeClass('active');
    ImageStart = parseInt(e.currentTarget.dataset.start);
    e.currentTarget.parentNode.classList.add('active');
    Session.set('imageStart', ImageStart);
  },
  'click .prev'(e,t){
    const current = document.querySelector('.pagination li.active');
    if(current) {
      const start = parseInt(current.dataset.start);
      if(start>0) {
        const page = document.querySelector(`.pagination li a[data-start="${start - 18}"]`);
        if (page) page.click();
      }
    }
  },
  'click .next'(e,t) {
    const current = document.querySelector('.pagination li.active');
    if (current) {
      const start = parseInt(current.dataset.start);
      // if (start > 0) {
        const page = document.querySelector(`.pagination li a[data-start="${start + 18}"]`);
        if (page) page.click();
      // }
    }
  },
  // 'click .uploadModal'(e,t) {
  //   Bootstrap3boilerplate.Modal.show();
  // },
});

Template.thumbnails_data.onRendered(function(){
  const instance = this;
  const hash = Session.get('navbarUrl').replace('/#','');//window.location.hash.replace('#', '');
  if(hash) {
    Meteor.setTimeout(function(){
      const img = instance.find(`img[imageid="${hash}"]`);
      if(img){
        const top = img.getBoundingClientRect().top;
        if (top) {
          // console.log(`${instance.view.name}.onRendered ${hash} ${top}`);
          window.scrollTo(0, top - 60);
        }
      }
    },500)
  } else {
    console.log(`${instance.view.name}.onRendered no hash ${window.location.hash}`);
  }
});

Template.pagination.helpers({
  showPrevNext(){
    const pages = Template.currentData().pages;
    return pages && pages.length>1;
  },
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
Template.thumbnail.events({
  'click span.present-tags .tag'(event, instance){
    var tags = TagSearch.get();
    const tag = event.currentTarget.dataset.tag;
    if(tags.indexOf(tag<0)){
      // console.log(`adding ${tag} to ${tags}`);
      tags.push(tag);
      TagSearch.set(tags);
      Session.set('imageStart', 0);
    }
  },
});

Template.bs_navbar.onCreated(function(){
  const instance = this;
  instance.imgid = '/';
})
Template.bs_navbar.onRendered(function(){
  const instance = this;
  // console.log(`${instance.view.name}.onRendered`);
  instance.navbar = instance.find('#navbarsExampleDefault');
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
    return `${Session.get('imageCount')} Images`;
  },
  imageLinks(){
    FlowRouter.watchPathChange();
    const userId = Meteor.userId();
    const img = DBImages.findOne(FlowRouter.current().params.id);
    const result = { links: [], imgid: null};
    if (img) {
      result.imgid = img._id;
      result.links.push(`<a class="nav-link conditional" data-toggle="collapse" data-target="#imageInfo" data-id="${img._id}" href="/image/${img._id}">Info</a>`)
      if(img.user == userId || Roles.userIsInRole(userId, 'admin')){
        const cropped = img.details != 'undefined' ? '<span class="glyphicon glyphicon-ok" title="image thumbnail cropped"></span>':'';
        result.links.push(`<a class="nav-link conditional" href="/crop/${img._id}">Crop ${cropped}</a>`);
        result.links.push(`<a class="nav-link conditional btn btn-outline-danger delete" id="${img._id}">Delete</a>`)
      }
    }
    return result;
  },
  url(){
    return Session.get('navbarUrl');
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
  },
  'click a'(event, instance){
    instance.navbar.classList.remove('show');
  },
});

Tracker.autorun(function subscribeThumbnails() {
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
