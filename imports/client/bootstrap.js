import isMobile from 'ismobilejs';
import jQuery from 'jquery';
import 'bootstrap/dist/js/bootstrap.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'glyphicons-only-bootstrap/css/bootstrap.min.css';
// we fix the font url in /client/css/glyphicons.css
import './bootstrap.html';
import popper from 'popper.js'
global.Popper = popper // fixes some issues with Popper and Meteor

export const LAYOUT = 'bootstrap';

Template.bootstrap.onRendered(function(){
  const instance = this;
  window.isMobile = isMobile(navigator.userAgent).any;
})
Template.bootstrap.helpers({
  alerts() {
    return Bootstrap3boilerplate.__alert.get();
  },
});
Template.bootstrap.events({
  'click button'(event, instance) {
    var alertid = event.currentTarget.dataset.alertid;
    Bootstrap3boilerplate.removeAlert(alertid);
  }
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
  title() {
    return `${Session.get('imageCount')} Images`;
  },
  imageLinks() {
    FlowRouter.watchPathChange();
    const userId = Meteor.userId();
    const img = Images.findOne(FlowRouter.current().params.id);
    const result = { links: [], imgid: null };
    if (img) {
      if(isMobile) result.links.push(`<a class="nav-link" href="/">Thumbnails</a>`)
      result.imgid = img._id;
      // result.links.push(`<a class="nav-link conditional" data-toggle="collapse" data-target="#imageInfo" data-id="${img._id}" href="/image/${img._id}">Info</a>`)
      result.links.push(`<a class="nav-link conditional imageInfo" data-id="${img._id}" href="/image/${img._id}">Info</a>`)
      if (img.user == userId || Roles.userIsInRole(userId, 'admin')) {
        const cropped = img.details == undefined ? '<span class="glyphicon glyphicon-resize-small"></span>' : '<span class="glyphicon glyphicon-ok" title="image thumbnail cropped"></span>';
        // console.log(img);
        result.links.push(`<a class="nav-link conditional" href="/crop/${img._id}">Crop ${cropped}</a>`);
        // result.links.push(`<a class="nav-link conditional" href="/rotate/${img._id}">Rotate</a>`);
        result.links.push(`<a class="nav-link conditional btn btn-outline-danger delete" id="${img._id}">Delete</a>`)
      }
    }
    return result;
  },
  url() {
    return Session.get('navbarUrl');
  },
});
Template.bs_navbar.events({
  'click [data-toggle="offcanvas"]'(event, instance) {
    instance.$('.offcanvas-collapse').toggleClass('open')
  },
  'click .delete': function (e, t) {
    const id = e.currentTarget.id;
    if (confirm(`Really Delete? ${id}`)) {
      Images.remove({ _id: id }, function (err) {
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
  'click a.imageInfo'(event, instance) {
    FlowRouter.go(`/image/${event.currentTarget.dataset.id}`);
    // console.log(event);
    // we need to manually toggle because dynamically genereated 
    // links do not work with the automatic data-toggle
    $('#imageInfo').collapse('toggle');
  },
  'click a.nav-link:not(.dropdown-toggle)'(event, instance) {
    // instance.navbar.classList.remove('show');
    instance.$('.offcanvas-collapse').toggleClass('open')
  },
});
