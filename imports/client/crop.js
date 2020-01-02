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
  // console.log(FlowRouter.current().params);
  instance.id = FlowRouter.current().params.id;
  instance.details = { };
  // console.log(`${instance.view.name}.onCreated`, instance.details);
  window.crop = instance;
});
Template.crop.onRendered(function(){
  const instance = this;
  instance.image = instance.find('#croppie');
  instance.cropped = instance.find('#cropped');

  instance.croppie = new Croppie(instance.image, {
    viewport: { width: 200, height: 200 },
    boundary: { width: 500, height: 500 },
    showZoomer: true,
    enableResize: false,
    enableOrientation: true,
    endforceBoundary: true,
    // https://github.com/Foliotek/Croppie/issues/536#issuecomment-519640639
    customClass: 'croppieUpdate'
    // mouseWheelZoom: 'ctrl'
  });

  instance.image.addEventListener('load', function(ev){
    // const img = instance.img.get();
    // console.log(`image loaded`, instance.details);
    Meteor.setTimeout(function(){
      var details = {};
      const img = DBImages.findOne(instance.id);
      if (img) {
        // console.log(`${instance.view.name}.onCreated subscribed`)
        details = img.details ? img.details : {};
      }
      Meteor.call('src', instance.id, null, function (err, res) {
        if (err) {
          console.log(err);
        } else {
          details.url = res.src;
          // console.log(`${instance.view.name}.onRendered src`, details);
          instance.croppie.bind(details);
        }
      });
    }, 100)
  });
});
Template.crop.onDestroyed(function(){
  const instance = this;
  instance.croppie.destroy();
});
Template.crop.helpers({
  id() {
    return Template.instance().id;
  },
});
Template.crop.events({
  'click button.result': async function (event, instance) {
    const image = await instance.croppie.result();
    instance.cropped.src = image;
    DBImages.update(instance.id,{$set:{
      thumbnail: image,
      details: instance.details,
    }});
    FlowRouter.go(`/image/${instance.id}`);
  },
  'update.croppie .croppieUpdate': async function (event, instance) {
    // console.log(event.originalEvent.detail);
    instance.details = event.originalEvent.detail;
    const image = await instance.croppie.result();
    instance.cropped.src = image;
  },
});