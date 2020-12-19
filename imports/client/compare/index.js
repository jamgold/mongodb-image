import './index.html';
import '/imports/client/thumbnails/thumbnail';
import { makeHash } from '/imports/lib/hash';
console.log(__filename);

Template.compare.onCreated(function () {
  const instance = this;
  instance.ready = new ReactiveVar(false);
  instance.debug = false;
  instance.files = [];
  instance.filesIndex = 0;
  instance.file = null;
  instance.md5hash = "";
  instance.validUsers = [];
  instance.validTags = [];
  if (ThumbnailsHandle) {
    ThumbnailsHandle.stop();
  }
});
Template.compare.onRendered(function () {
  const instance = this;

  // console.log(`${instance.view.name}.onRendered`);
  instance.dropzone = document.getElementById('dropzone');
  instance.processNext = function uploadProcessNext() {
    //
    // process next if there are more
    //
    if (instance.filesIndex < instance.files.length) {
      instance.file = instance.files.item(instance.filesIndex++);
      instance.reader.readAsDataURL(instance.file);
    } else {
      instance.filesIndex = 0;
      instance.files = [];
      instance.$('h1').removeClass('hidden');
      instance.$('img.loading').addClass('hidden');
      // Bootstrap3boilerplate.Modal.hide();
    }
  }

  instance.reader = new FileReader();
  instance.preview = document.getElementById('images');

  if (!instance.preview) {
    instance.preview = document.createElement('div');
    instance.preview.id = 'preview';
    if (instance.debug) {
      console.log('creating #preview');
    } else {
      instance.preview.classList.add('hidden');
    }
    document.body.appendChild(instance.preview);
  }
  instance.crop_img = document.getElementById('crop_img');
  if (!instance.crop_img) {
    instance.crop_img = document.createElement('img');
    instance.crop_img.id = 'crop_img';
    if (instance.debug) {
      console.log('creating #crop_img');
    } else {
      instance.crop_img.classList.add('hidden');
    }
    instance.preview.appendChild(instance.crop_img);
  }

  instance.cropCanvas = document.getElementById('crop_canvas');
  if (!instance.cropCanvas) {
    instance.cropCanvas = document.createElement('canvas');
    instance.cropCanvas.id = 'crop_canvas';
    instance.cropCanvas.width = 100;
    instance.cropCanvas.height = 100;
    if (instance.debug) {
      console.log('creating #crop_canvas');
    } else {
      instance.cropCanvas.classList.add('hidden');
    }
    instance.preview.appendChild(instance.cropCanvas);
  }
  //
  // define onload handler for image
  //
  instance.crop_img.onload = function cropImgLoaded(e) {
    console.log(`crop_img.onload ${e.timeStamp}`);
    var cropCanvas = instance.cropCanvas;
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
    else {
      cc.width = this.height;
    }
    // console.log('cropping',cc);

    var crop_ctx = cropCanvas.getContext("2d");
    //
    // resize original to a 100x100 square for the thumbnail
    //
    crop_ctx.drawImage(
      this, //instance.crop_img,
      // original x/y w/h
      cc.x, cc.y,
      100, 100 * cc.width / cc.height
      // cc.width, cc.height,
      // reduce to canvas x/y w/h
      // 0, 0,
      // instance.cropCanvas.width, instance.cropCanvas.height
    );
    var tags = $('#new_image_tags').tagit('assignedTags');
    var private = $('#new_image_users').tagit('assignedTags');
    if (private.length == 0) private = null;
    console.log(`cropImage cropped into cropCanvas ${instance.file.name}`, tags, private);

    // Images.insert({
    //   src: cropDataUrl
    //   , thumbnail: instance.cropCanvas.toDataURL()
    //   , size: instance.file.size
    //   , name: instance.file.name
    //   , type: instance.file.type
    //   , md5hash: instance.md5hash
    //   , tags: tags
    //   , private: private
    // }, function imageInserted(error, id) {
    //   if (error) {
    //     console.error(error);
    //   } else {
    //     console.log(`image ${id} inserted`);
    //     // var ids = AllImageIDs.get();
    //     // ids.push(id);
    //     // AllImageIDs.set(ids);
    //   }
    //   instance.processNext();
    // });
  }
  //
  // define onload handler for reader to read in the file
  //
  instance.reader.onload = (function (cropImg) {
    return async function (e) {
      if (instance.file.type in AcceptedFileTypes) {
        instance.md5hash = await makeHash(e.target.result);
        if (instance.debug) {
          console.log(`read file ${instance.file.name} => ${instance.md5hash}`, cropImg);
        }
        cropImg.src = e.target.result;
        instance.$('button.reset').removeClass('hidden');
        instance.subscription = instance.subscribe('md5hash', instance.md5hash, function(){
          console.log(`subscription ready ${Images.find().count()}`)
          instance.ready.set(true);
        });
      } else {
        Bootstrap3boilerplate.alert('danger', `Image ${instance.file.type} not of acceptable mime-type`, true);
        instance.processNext();
      }
    };
  })(instance.crop_img);
});
Template.compare.onDestroyed(function () {
  const instance = this;
  // console.log(`${instance.view.name}.onDestroyed`);
});
Template.compare.events({
  'click button.reset'(event, instance){
    if(instance.subscription) {
      instance.subscription.stop();
    }
    event.currentTarget.classList.add('hidden');
    instance.dropzone.classList.remove('hidden');
    instance.crop_img.src = "";
    instance.ready.set(false);
  },
  'click button.upload'(event, instance){
    Images.insert({
        src: instance.crop_img.src
      , thumbnail: instance.cropCanvas.toDataURL()
      , size: instance.file.size
      , name: instance.file.name
      , type: instance.file.type
      , md5hash: instance.md5hash
      // , tags: tags
      // , private: private
    }, function imageInserted(error, id) {
      if (error) {
        console.error(error);
      } else {
        console.log(`image ${id} inserted`);
      }
      // template.processNext();
    });
  },
  'click button.upload-url'(event, instance) {
    var url = instance.find('#image-url');
    if (url) {
      Meteor.call('getURL', url.value, async function (err, file) {
        if (err) {
          console.error(err);
          Bootstrap3boilerplate.alert('danger', `${err.details}`, true);
        } else {
          const md5hash = await makeHash(file.data);
          instance.file = file;

          Meteor.call('imageExists', md5hash, function imageExits(err, exists) {
            if (exists) {
              Bootstrap3boilerplate.alert('danger', `Image ${instance.file.name} has been uploaded before`, true);
              instance.processNext();
            } else {
              // set crop_img.src so crop_img.onload fires which creates the thumbnail
              // https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
              instance.crop_img.src = file.data;
              instance.md5hash = md5hash;
              url.value = '';
            }
          });
        }
      });
    } else {
      console.log('could not find #image-url')
    }
  },
  'change #fileinput': function (e, instance) {
    // console.info(e.target);
    instance.filesIndex = 0;
    instance.files = document.getElementById('fileinput').files;
    // instance.$('h1').addClass('hidden');
    // instance.$('img.loading').removeClass('hidden');
    instance.processNext();
    // instance.file = instance.files.item(instance.filesIndex++);
    // instance.reader.readAsDataURL(instance.file);
    // instance.$('button.upload').removeClass('hidden');
    // $('div.crop_img').removeClass('hidden');
  },
  'click div.mongodb-image-droppable'(e, instance) {
    e.preventDefault();
    e.stopPropagation();
    instance.$('#fileinput').trigger('click');
  },
  'dragover div.mongodb-image-droppable'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
  },
  'dragleave div.mongodb-image-droppable'(e, t) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
  },
  'drop div.mongodb-image-droppable'(e, instance) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    instance.filesIndex = 0;
    if (e.originalEvent.dataTransfer) {
      instance.files = e.originalEvent.dataTransfer.files;
    } else if (e.originalEvent.target) {
      instance.files = e.originalEvent.target.files;
    }
    instance.dropzone.classList.add('hidden');
    // instance.$('h1.dnd-instructions').addClass('hidden');
    // instance.$('img.loading').removeClass('hidden');
    instance.processNext();
  }
});
Template.compare.helpers({
  images(){
    return Images.find();
  },
  ready(){
    return Template.instance().ready.get();
  },
  imageCount(){
    return Images.find().count();
  },
});