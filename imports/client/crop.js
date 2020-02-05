console.log(__filename);
import './crop.html';
import 'croppie/croppie.css';
import 'croppie/croppie.min.js';
import Croppie from 'croppie';
//
// http://foliotek.github.io/Croppie#documentation
//
Template.crop.onCreated(function(){
  const instance = this;

  // console.log(`${instance.view.name}.onCreated`, instance.data);
  instance.autorun(function(){
    FlowRouter.watchPathChange();
    instance.subscribe('image', FlowRouter.current().params.id);
  })
});
Template.crop.onRendered(function(){
  const instance = this;
  // console.log(`${instance.view.name}.onRendered`, instance.data);
});
Template.crop.onDestroyed(function(){
  const instance = this;
});
Template.crop.helpers({
  id() {
    return FlowRouter.current().params.id;
  },
  private(){
    const image = Images.findOne(FlowRouter.current().params.id);
    return image.private;
  },
  tags(){
    const image = Images.findOne(FlowRouter.current().params.id);
    return image.tags;
  },
  canCrop(){
    const id = FlowRouter.current().params.id;
    const img = Images.findOne(id);
    const userId = Meteor.userId();
    // console.log(`canCrop ${id} for ${userId}`, img);
    return img && userId && (Roles.userIsInRole(userId, 'admin') || img.user == userId);
  },
});
Template.crop.events({
  'click span.present-tags .tag'(event, instance) {
    var tags = TagSearch.get();
    const tag = event.currentTarget.dataset.tag;
    if (tags.indexOf(tag < 0)) {
      // console.log(`adding ${tag} to ${tags}`);
      tags.push(tag);
      TagSearch.set(tags);
      Session.set('imageStart', 0);
      FlowRouter.go('/')
    }
  },
});

Template.croppie.onCreated(function(){
  const instance = this;
  instance.next = new ReactiveVar(null);
  instance.prev = new ReactiveVar(null);
  instance.bound = 2;
  window.crop = instance;
  instance.details = {};
  // console.log(`${instance.view.name}.onCreated`, instance.data);
});
Template.croppie.onRendered(function(){
  const instance = this;
  instance.image = instance.find('#croppie');
  instance.cropped = instance.find('#cropped');
  // console.log(`${instance.view.name}.onRendered`, instance.data);
  const boundary = window.isMobile ? {width: 300, height: 300} : { width: 500, height: 500 };
  instance.croppie = new Croppie(instance.image, {
    // The inner container of the coppie. The visible part of the image
    viewport: { width: 200, height: 200 },
    // The outer container of the cropper
    boundary: boundary,
    showZoomer: true,
    enableResize: false,
    enableOrientation: true,
    // Restricts zoom so image cannot be smaller than viewport
    endforceBoundary: false,
    // https://github.com/Foliotek/Croppie/issues/536#issuecomment-519640639
    // A class of your choosing to add to the container to add custom styles to your croppie
    customClass: 'croppieUpdate'
    // mouseWheelZoom: 'ctrl'
  });
  window.croppie = instance.croppie;
  instance.image.addEventListener('load', function (ev) {
    // const img = instance.img.get();
    // console.log(`image loaded`, instance.details);
    Meteor.setTimeout(function () {
      var details = {};
      const img = Images.findOne(instance.data.id);
      if (img) {
        // console.log(`${instance.view.name}.onCreated subscribed`)
        details = img.details ? img.details : {};
        // details.src = img.thumbnail;
        // Valid options are:
        // 1 unchanged
        // 2 flipped horizontally
        // 3 rotated 180 degrees
        // 4 flipped vertically
        // 5 flipped horizontally, then rotated left by 90 degrees
        // 6 rotated clockwise by 90 degrees
        // 7 flipped horizontally, then rotated right by 90 degrees
        // 8 rotated counter - clockwise by 90 degrees
        switch(img.cssclasses) {
          case 'transform90': details.orientation = 6;break;
          case 'transform180': details.orientation = 3;break;
          case 'transform270': details.orientation = 8;break;
        }
      }
      //
      // always load original into croppie, possible problem with cssclasses
      //
      // if(true){
        Meteor.call('src', instance.data.id, TagSearch.get(), function (err, res) {
          if (err) {
            console.log(err);
          } else {
            details.url = res.src;
            // this fucks with the croppie preview
            // instance.next.set(res.next);
            // instance.prev.set(res.prev);
            // console.log(`${instance.view.name}.onRendered src`, details);
            instance.croppie.bind(details);
            instance.bound = 2
          }
        });
      // }else{
      //   console.log(details);
      //   instance.croppie.bind(details);
      // }
    }, 100)
  });
});
Template.croppie.onDestroyed(function(){
  const instance = this;
  // console.log(`${instance.view.name}.onDestroyed`);
  instance.croppie.destroy();
});
Template.croppie.helpers({
  prev: function () {
    var instance = Template.instance();
    return instance.prev.get();
  },
  next: function () {
    var instance = Template.instance();
    return instance.next.get();
  },
});
Template.croppie.events({
  'click button.save': async function (event, instance) {
    const image = await instance.croppie.result();
    instance.cropped.src = image;
    Images.update(instance.data.id, {
      $set: {
        thumbnail: image,
        details: instance.details,
      }
    }, (err, u) => {
        if (err) Bootstrap3boilerplate.alert('danger', `update image failed with ${err.message}`, true);
        // else Bootstrap3boilerplate.alert('info', `updated thumbnail ${u}`, true);
    });
    if(event.currentTarget.classList.contains('list')){
      FlowRouter.go(`/`);
    } else if (event.currentTarget.classList.contains('image')) {
      FlowRouter.go(`/image/${instance.data.id}`);
    }
  },
  'click button.zoom'(event, instance) {
    instance.croppie.setZoom(0);
  },
  'update.croppie .croppieUpdate': async function (event, instance) {
    // if(instance.bound--<=0) {
    // console.log(instance.bound, event.originalEvent.detail.points);
    instance.details = event.originalEvent.detail;
    const image = await instance.croppie.result();
    instance.cropped.src = image;
    // }
  },
  'click button.rotate': async function(event, instance){
    const angle = parseInt(event.currentTarget.innerHTML);
    // console.log(angle);
    await instance.croppie.rotate(angle)
  },
});
