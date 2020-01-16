import '/imports/lib/routes.js';
import '/imports/client/tags.js';
import '/imports/client/private.js';
import '/imports/client/upload';
import 'hammerjs';
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';

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
Session.setDefault('TagSearch',[]);
Session.setDefault('src', new Date());

// AllImageIDs = new ReactiveVar([]);
ThumbnailsHandle = null;
Contributors = new ReactiveVar([]);
TagSearch = {
  get(){return Session.get('TagSearch')},
  set(v){Session.set('TagSearch', v)},
};//new ReactiveVar([]);
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

Template.pagination.helpers({
  showPrevNext(){
    const pages = Template.currentData().pages;
    return pages && pages.length>1;
  },
});

Tracker.autorun(function imageCountAutorun() {
  var uploaded = Session.get('uploaded');
  var tags = TagSearch.get();
  // console.info(`imageCountAutorun ${tags}`);
  Meteor.call('imageCount', tags, function(err,count){
    if(!err) {
      Session.set('imageCount', count);
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
