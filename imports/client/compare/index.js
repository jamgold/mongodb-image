import './index.html';
import '/imports/client/thumbnails/thumbnail';
import { cropDrop } from '/imports/lib/crop'
import { makeHash } from '/imports/lib/hash';
// console.log(__filename);

Template.compare.onCreated(function () {
  const instance = this
  instance.ready = new ReactiveVar(false)
  instance.debug = true
  instance.files = []
  instance.filesIndex = 0
  instance.file = null
  instance.md5hash = ""
  instance.validUsers = []
  instance.validTags = []
  //
  // if we come here from thumbnails we need to stop the subscripion
  //
  if (ThumbnailsHandle) {
    ThumbnailsHandle.stop()
  }
  cropDrop.action = 'compare'
  window.compare = instance
});
Template.compare.onRendered(function () {
  const instance = this;
  // console.log(`${instance.view.name}.onRendered`);
  instance.next = instance.find('button.next')
  instance.reset = instance.find('button.reset')
  instance.loading = instance.find('img.loading')
  instance.instructions = instance.find('h1.dnd-instructions')

  instance.showLoading = function(show) {
    if(show) {
      instance.crop_img.src = "";
      instance.loading.classList.remove('hidden')
      instance.instructions.classList.add('hidden')
    } else {
      if (instance.crop_img.src == "" || instance.crop_img.src == document.location.href)
        instance.instructions.classList.remove('hidden')
      instance.loading.classList.add('hidden')
    }
  }
  instance.processNext = function uploadProcessNext() {
    //
    // process next if there are more
    //
    if (instance.filesIndex < instance.files.length) {
      if(instance.subscription) {
        instance.subscription.stop()
        instance.ready.set(false)
      }
      // if (ThumbnailsHandle) ThumbnailsHandle.stop();
      instance.file = instance.files.item(instance.filesIndex++)
      instance.reader.readAsDataURL(instance.file)
    } else {
      instance.filesIndex = 0
      instance.files = []
      instance.showLoading(false)
      // Bootstrap3boilerplate.Modal.hide();
    }

    if(instance.filesIndex < instance.files.length) {
      instance.next.disabled = false
      // instance.next.classList.remove('hidden')
      instance.next.innerHTML = `Next ${instance.filesIndex} of ${instance.files.length}`
    } else {
      instance.next.innerHTML = `Next ${instance.filesIndex} of ${instance.files.length}`
      // instance.next.classList.add('hidden')
      instance.next.disabled = true
    }
  }
  instance.reader = new FileReader();
  instance.preview = document.getElementById('preview');
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
    instance.cropCanvas = createCropCanvas('crop_canvas')
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
    if(instance.debug) console.log(`crop_img.onload ${e.timeStamp}`);
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
      this,
      // original x/y w/h
      cc.x, cc.y,
      cc.width, cc.height,
      // reduce to canvas x/y w/h
      0, 0,
      instance.cropCanvas.width, instance.cropCanvas.height
    );
    var tags = $('#new_image_tags').tagit('assignedTags');
    var private = $('#new_image_users').tagit('assignedTags');
    if (private.length == 0) private = null;
    if(instance.debug) console.log(`cropImage cropped into cropCanvas ${instance.file.name}`, tags, private);
  }
  //
  // define onload handler for reader to read in the file
  //
  instance.reader.onload = (function (cropImg) {
    return async function (e) {
      instance.showLoading(true)
      if (instance.file.type in cropDrop.acceptedFileTypes) {
        // console.log(instance.file.lastModified);
        instance.md5hash = await makeHash(e.target.result)
        if (instance.debug) {
          console.log(`read file ${instance.file.name} => ${instance.md5hash}`)
        }
        cropImg.src = e.target.result
        instance.ready.set(false)
        instance.subscription = instance.subscribe('md5hash', instance.md5hash, function(){
          if(instance.debug) console.log(`subscription ready ${Images.find().count()}`)
          instance.ready.set(true)
          instance.showLoading(false)
          instance.reset.disabled = false // $('button.reset').removeClass('hidden');
          const img = Images.findOne()
          if (img && !img.lastModified && instance.file.lastModified) {
            Images.update(img._id, {$set:{lastModified: instance.file.lastModified}})
          }
        });
      } else {
        Bootstrap3boilerplate.alert('danger', `Image ${instance.file.type} not of acceptable mime-type`, false);
        instance.processNext();
      }
    };
  })(instance.crop_img);
});
Template.compare.onDestroyed(function () {
  const instance = this
  // console.log(`${instance.view.name}.onDestroyed`)
  cropDrop.action = 'insert'
});
Template.compare.events({
  'click button.next'(event, instance) {
    instance.processNext()
  },
  'click button.reset'(event, instance){
    if(instance.subscription) {
      instance.subscription.stop();
    }
    event.currentTarget.disabled = true //classList.add('hidden');
    instance.crop_img.src = "";
    instance.showLoading(false)
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
          Bootstrap3boilerplate.alert('danger', `${err.details}`, false);
        } else {
          const md5hash = await makeHash(file.data);
          instance.file = file;

          Meteor.call('imageExists', md5hash, instance.file.lastModified, function imageExits(err, exists) {
            if (exists) {
              Bootstrap3boilerplate.alert('danger', `Image ${instance.file.name} has been uploaded before`, false);
              // instance.processNext();
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
    instance.filesIndex = 0
    instance.files = document.getElementById('fileinput').files
    instance.showLoading(true)
    instance.processNext();
    instance.file = instance.files.item(instance.filesIndex++);
    instance.reader.readAsDataURL(instance.file);
    instance.$('button.upload').removeClass('hidden');
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
    instance.showLoading(true)
    instance.processNext()
  }
});
Template.compare.helpers({
  images(){
    return Images.find()
  },
  imagesExist(){
    return Images.find().count() > 0
  },
  ready(){
    return Template.instance().ready.get()
  },
});