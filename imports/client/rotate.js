import './rotate.html';

const TO_RADIANS = Math.PI / 180; 

Template.rotate.onCreated(function(){
  const instance = this;
  instance.angle = 0;
});
Template.rotate.onRendered(function(){
  const instance = this;
  const image = document.createElement("img");
  const canvas = instance.find('canvas');
  const params = FlowRouter.current().params;
  const context = canvas.getContext("2d");
  instance.rotated = instance.find('#rotated');
  instance.canvas = canvas;
  var cache = null;
  instance.drawRotated = function(degrees) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(cache.width, cache.height);
    context.rotate(degrees * TO_RADIANS);
    context.drawImage(image, -cache.width / 2, -cache.height / 2, cache.width, cache.height); //draw the image ;)
    context.restore();
  }
  instance.imgload = true;
  image.addEventListener('load', function (ev) {
    // console.log(this);
    canvas.width = this.width <<1;
    canvas.height = this.height <<1;
    
    cache = this;
    context.drawImage(image, canvas.width / 2 - image.width / 2, canvas.height / 2 - image.width / 2);

    instance.rotated.src = instance.canvas.toDataURL();
  });

  instance.subscribe('image', params.id, function (err, x) {
    if (err) {
      console.error(err);
    } else {
      const dbimage = Images.findOne(params.id);
      console.log(`subscribed`, dbimage);
      // img.src = dbimg.thumbnail;
      Meteor.call('src', params.id, [], function (err, res) {
        if (err) {
          console.log(err);
        } else {
          image.src = res.src;
        }
      });
    }
  });
});
Template.rotate.onDestroyed(function(){
  const instance = this;
});
Template.rotate.helpers({
  id(){
    return FlowRouter.current().params.id;
  },
});
Template.rotate.events({
  'click button.rotate'(event, instance){
    instance.angle+=90;
    instance.drawRotated(instance.angle);
    instance.rotated.src = instance.canvas.toDataURL();
  },
  'click button.save'(event, instance){
    const params = FlowRouter.current().params;
    const src = instance.canvas.toDataURL();
    Images.update(params.id,{$set:{src:src}},function(err){
      if(err) console.error(err);
    })
  },
});