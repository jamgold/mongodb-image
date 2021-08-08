import '/imports/lib/routes'
import '/imports/lib/loginToken'
import '/imports/client/tags'
import isMobile from 'ismobilejs'
import 'hammerjs'
import { FlowRouter } from 'meteor/ostrio:flow-router-extra'
//
// http://www.apimeme.com/
//
if(Meteor.flush == undefined)
Meteor.flush = function() {
  // console.info('Meteor.flush deprecated')
}
// optionsTest = function(args, options) {
//   options = options || {};

//   console.info('options', options);
// };

Session.setDefault('uploaded', 0);
Session.setDefault('imageStart', 0);
Session.setDefault('imageCount', 0);
Session.setDefault('navbarUrl', '/');
Session.setDefault('TagSearch',[]);
Session.setDefault('isMobile', false);
Session.setDefault('src', new Date());

// AllImageIDs = new ReactiveVar([]);
ThumbnailsHandle = null;
Contributors = new ReactiveVar([]);
TagSearch = {
  get(){
    const tags = Session.get('TagSearch')
    return Array.isArray(tags) ? tags : []
  },
  set(v){
    if (DEBUG) console.trace(`TagSearch.set ${v}`)
    Session.set('TagSearch', v)
  },
};//new ReactiveVar([]);
ImageType = new ReactiveVar('cover');
TagsImgId = null;
ImageStart = 0;

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
      // alert('swipeleft')
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
      // alert('swiperight')
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

Template.jsonWell.onRendered(function(){
  // const cookies = new Cookies();
  // cookies.set('meteor_login_token', Meteor._localStorage.getItem('Meteor.loginToken'))
})
Template.jsonWell.helpers({
  // loginToken(){
  //   return Meteor._localStorage.getItem('Meteor.loginToken')
  // }
});

Template.pagination.helpers({
  showPrevNext(){
    // const pages = Template.currentData().pages
    return false // pages && pages.length>1
  },
});
Template.pagination.events({
  'click .page-link'(e,t) {
    window.scrollTo(0, top - 60);
  }
})

Tracker.autorun(function imageCountAutorun() {
  const uploaded = Session.get('uploaded')
  const tags = TagSearch.get()
  const userId = Meteor.userId()
  if (DEBUG) console.info(`imageCountAutorun for ${userId} [${tags}]`);
  Meteor.call('imageCount', tags, function(err,count){
    if(!err) {
      Session.set('imageCount', count)
    }
  })
})

Meteor.startup(function(){
  Session.set('isMobile', isMobile(navigator.userAgent).any)
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
