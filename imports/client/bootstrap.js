import jQuery from 'jquery'
import 'bootstrap/dist/js/bootstrap.js'
import 'bootstrap/dist/css/bootstrap.min.css'
import { tagQuery } from '/imports/lib/query'
import '/imports/client/bootstrap3boilerplate'
import '/imports/client/upload'
import './toast'
// we fix the font url in /client/css/glyphicons.css
import './bootstrap.html'
import { cropDrop } from '/imports/lib/crop'
import popper from 'popper.js'
global.Popper = popper // fixes some issues with Popper and Meteor
export const LAYOUT = 'bootstrap';

Session.setDefault('tagCollapser','<span class="glyphicon glyphicon-eye-open" aria-hidden="true"></span>')

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_AND_EMAIL'
})

// const orientationchange = (event) => {
//   Bootstrap3boilerplate.alert('info',`the orientation of the device is now ${event.target.screen.orientation.angle}`);
// }
// window.addEventListener("orientationchange", orientationchange, false)
// window.addEventListener('resize', orientationchange)
// orientationchange()

Template.bootstrap.onRendered(function(){
  const instance = this
  instance.files = []
  instance.filesIndex = 0
  instance.file = null
  instance.md5hash = ""
  instance.debug = false

  window.cropDrop = cropDrop
  cropDrop.init()

  instance.autorun(function(){
    const userId = Meteor.userId()
    cropDrop.userId = userId
    console.log(`cropDrop.userId = ${userId}`)
  })
})
Template.bootstrap.helpers({
  alerts() {
    return Bootstrap3boilerplate.__alert.get();
  },
});
Template.bootstrap.events({
  'click button.closeAlert'(event, instance) {
    var alertid = event.currentTarget.dataset.alertid;
    Bootstrap3boilerplate.removeAlert(alertid);
  },
});

Template.bs_navbar.onCreated(function () {
  const instance = this;
  instance.imgid = '/';
})
Template.bs_navbar.onRendered(function () {
  const instance = this;
  // console.log(`${instance.view.name}.onRendered`);
  instance.navbar = instance.find('#navbarsExampleDefault');
  instance.autorun(function () {
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
  list(){
    FlowRouter.watchPathChange()
    const name = FlowRouter.current().route.name
    // switch(name) {
    //   case 'image': pre = `<a class="list">${glyph}</a> Image of `;break
    //   case 'thumbnails': pre = `${Images.find().count()} of `;break
    //   default: pre = `<a class="list">${glyph}</a>&nbsp;`;console.log(name)
    // }
    // console.log(name, pre)
    return name == 'thumbnails'
  },
  title() {
    const name = FlowRouter.current().route.name
    const loading = '<div class="spinner-border spinner-border-sm text-success" role="status"> <span class="sr-only">Loading...</span> </div>'
    if ( name == 'thumbnails' ) {
      const ready = ThumbnailsHandle ? ThumbnailsHandle.ready() : false
      const count = ready ? Images.find().count() : loading
      return `${name == 'thumbnails' ? `<span title="Images">${count}</span> of `:''}<span title="Total">${Session.get('imageCount')}</span>`
    } else {
      return `${Session.get('imageCount')}`
    }
  },
  tagSearch() {
    return TagSearch.get().length>0
  },
  tagCollapser(){
    return Session.get('tagCollapser')
  },
  imageLinks() {
    FlowRouter.watchPathChange()
    const userId = Meteor.userId()
    const img = Images.findOne(FlowRouter.current().params.id)
    const result = { links: [], imgid: null, show: Session.get('isMobile') ? 'show' : '' }
    // console.log(result)
    if (img) {
      result.imgid = img._id;
      // result.links.push(`<a class="nav-link conditional" data-toggle="collapse" data-target="#imageInfo" data-id="${img._id}" href="/image/${img._id}">Info</a>`)
      result.links.push(`<span class="dropdown-item">Download <a target="_new" class="download" href="/download/${img._id}">${img.name}</a></span>`);
      result.links.push(`<span class="dropdown-item">size ${img.size} bytes</span>`);
      result.links.push(`<span class="dropdown-item">mime-type ${img.type}</span>`);
      if (img.lastModified)
        result.links.push(`<span class="dropdown-item">date ${new Date(img.lastModified).toLocaleString()}</span>`);

      if (img.user == userId || Roles.userIsInRole(userId, 'admin')) {
        result.links.push(`<span class="dropdown-item">${Session.get('user_banned')} <a href="/user/${img.user}">${Session.get('user_name')}</a></span>`);
        result.links.push('<div class="dropdown-divider"></div>');
        const cropped = img.details == undefined ? '<span class="glyphicon glyphicon-resize-small"></span>' : '<span class="glyphicon glyphicon-ok" title="image thumbnail cropped"></span>';
        // console.log(img);
        result.links.push(`<a class="dropdown-item conditional" href="/crop/${img._id}">Crop ${cropped}</a>`);
        // result.links.push(`<a class="nav-link conditional" href="/rotate/${img._id}">Rotate</a>`);
        result.links.push(`<a class="dropdown-item conditional delete" id="${img._id}">Delete</a>`)
      }
      result.links.push('<div class="dropdown-divider"></div>');
      if(result.show) {
        result.links.push(`<span class="dropdown-item conditional imageInfo" data-id="${img._id}" href="/image/${img._id}">Info</span>`)
      }
    }
    return result
  },
  // url() {
  //   if (Session.get('isMobile')) {
  //     console.log('return navbarUrl')
  //     return Session.get('navbarUrl');
  //   } else {
  //     const tags = TagSearch.get()
  //     if(tags.length > 0) {
  //       const query = tagQuery(tags)
  //       return `/?tags=${query}`
  //     } else {
  //       return '/'
  //     }
  //   }
  // },
});
Template.bs_navbar.events({
  'click .tag-search-clear'(e, t) {
    e.preventDefault()
    e.stopPropagation()
    TagSearch.set([])
    $('#tagSearch').tagit('removeAll');
  },
  'click #tagCollapser'(e, t) {
    // console.log(FlowRouter.current().route.name)
    // const tagCollapser = e.currentTarget.innerHTML
    const tagCollapser = Session.get('tagCollapser')
    // if(window.scrollY>0 && tagCollapser == 'Show Tags') window.scrollTo(0, 0)
  },
  'click a.ban': function (e, t) {
    e.preventDefault()
    // console.log(t.data.img)
    if (confirm('Really ban this user?')) {
      const img = Images.findOne(FlowRouter.current().params.id);
      Meteor.call('ban', img.user, true, function (err, res) {
        if (err) {
          console.log(err)
        } else {
          e.target.className = res;
          e.target.innerHTML = res;
        }
        // console.info(e.target.className,err,res);
      });
    }
  },
  'click a.banned': function (e, t) {
    e.preventDefault()
    if (confirm('Really unban this user?')) {
      const img = Images.findOne(FlowRouter.current().params.id);
      Meteor.call('ban', img.user, false, function (err, res) {
        if (err) {
          console.log(err)
        } else {
          e.target.className = res;
          e.target.innerHTML = res;
        }
        // console.info(e.target.className,err,res);
      });
    }
  },
  'click a.download'(e,t){
    // prevent flickering and opening new tab
    if(!Session.get('isMobile')) e.preventDefault()
    const href = e.currentTarget.href
    window.location.href = href
  },
  'click [data-toggle="offcanvas"]'(event, instance) {
    // console.log(event)
    instance.$('.offcanvas-collapse').toggleClass('open')
  },
  'click a.listThumbnails'(e,t) {
    e.preventDefault()
    if (DEBUG) console.log(`a.listThumbnails`, e.currentTarget)
    const tags = TagSearch.get()
    if(tags.length > 0) {
      // console.log(`tagSearch.autorun tags=${tags}, length=${tags.length}, path=${path}`)
      FlowRouter.go('/',{}, {tags: tagQuery(tags) } )
    } else {
      // console.log(`tagSearch goto /`)
      FlowRouter.go('/')
    }
  },
  'click .delete': function (e, t) {
    const id = e.currentTarget.id;
    if (confirm(`Really Delete? ${id}`)) {
      Images.remove({ _id: id }, function (err) {
        if (err) {
          console.log(err)
          e.preventDefault()
          Bootstrap3boilerplate.alert('danger', err.message, false)
        }
        else {
          Session.set('uploaded', Session.get('uploaded') - 1);
          Bootstrap3boilerplate.alert('success', `deleted image ${id}`)
          const tags = TagSearch.get()
          if(tags.length > 0) {
            // console.log(`tagSearch ${tags} ${tags.length}`, query)
            FlowRouter.go('/',{}, { tags: tagQuery(tags) } )
          } else {
            // console.log(`tagSearch goto /`)
            FlowRouter.go('/')
          }
        }
      });
    }
  },
  'click .imageInfo'(event, instance) {
    event.preventDefault()
    document.querySelector('.offcanvas-collapse').classList.toggle('open')
    // console.log(instance.$('.offcanvas-collapse').removeClass('open'))
    // $('.offcanvas-collapse.navbar-collapse').removeClass('open')
    // FlowRouter.go(`/image/${event.currentTarget.dataset.id}`)
    // we need to manually toggle because dynamically genereated 
    // links do not work with the automatic data-toggle
    $('#imageInfo').collapse('toggle')
  },
  'click .nav-item a.dropdown-item'(event, instance) {
    instance.$('.offcanvas-collapse').toggleClass('open')
  },
  'click a.nav-link:not(.dropdown-toggle)'(event, instance) {
    // instance.navbar.classList.remove('show');
    instance.$('.offcanvas-collapse').toggleClass('open')
  },
});
