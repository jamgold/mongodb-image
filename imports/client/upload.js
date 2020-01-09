import './upload.html';
import './tagit';
console.log(__filename);
var md5 = require('md5');

Template.upload.onCreated(function () {
  const template = this;
  template.debug = false;
  template.files = [];
  template.filesIndex = 0;
  template.file = null;
  template.md5hash = "";
  template.validUsers = [];
  template.validTags = [];
  template.autorun(function () {
    template.userId = Meteor.userId();
  });
  template.validUser = function (id) {
    var user = Meteor.users.findOne(id);
    if (user == undefined) {
      if (template.validUsers.length > 0) {
        var x = template.validUsers.filter((u) => { return u.value == id });
        if (x.length > 0) user = x[0].value;
      }
    } else {
      user = user._id;
    }
    return user;
  }

});
Template.upload.onRendered(function () {
  const template = this;

  // console.log(`${template.view.name}.onRendered`);

  template.processNext = function uploadProcessNext() {
    //
    // process next if there are more
    //
    if (template.filesIndex < template.files.length) {
      template.file = template.files.item(template.filesIndex++);
      template.reader.readAsDataURL(template.file);
    } else {
      template.filesIndex = 0;
      template.files = [];
      Session.set('uploaded', Session.get('uploaded') + 1);
      Session.set('imageStart', 0);
      template.$('h1').removeClass('hidden');
      template.$('img').addClass('hidden');
      // Bootstrap3boilerplate.Modal.hide();
    }
  }

  template.reader = new FileReader();
  template.preview = document.getElementById('images');

  if (!template.preview) {
    template.preview = document.createElement('div');
    template.preview.id = 'preview';
    if (template.debug) {
      console.log('creating #preview');
    } else {
      template.preview.classList.add('hidden');
    }
    document.body.appendChild(template.preview);
  }
  template.crop_img = document.getElementById('crop_img');
  if (!template.crop_img) {
    template.crop_img = document.createElement('img');
    template.crop_img.id = 'crop_img';
    if (template.debug) {
      console.log('creating #crop_img');
    } else {
      template.crop_img.classList.add('hidden');
    }
    template.preview.appendChild(template.crop_img);
  }

  template.cropCanvas = document.getElementById('crop_canvas');
  if (!template.cropCanvas) {
    template.cropCanvas = document.createElement('canvas');
    template.cropCanvas.id = 'crop_canvas';
    template.cropCanvas.width = 100;
    template.cropCanvas.height = 100;
    if (template.debug) {
      console.log('creating #crop_canvas');
    } else {
      template.cropCanvas.classList.add('hidden');
    }
    template.preview.appendChild(template.cropCanvas);
  }
  //
  // define onload handler for image
  //
  template.crop_img.onload = function cropImgLoaded(e) {
    console.log(`crop_img.onload ${e.timeStamp}`);
    var cropCanvas = template.cropCanvas;
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
      this, //template.crop_img,
      // original x/y w/h
      cc.x, cc.y,
      100, 100 * cc.width / cc.height
      // cc.width, cc.height,
      // reduce to canvas x/y w/h
      // 0, 0,
      // template.cropCanvas.width, template.cropCanvas.height
    );
    var tags = $('#new_image_tags').tagit('assignedTags');
    var private = $('#new_image_users').tagit('assignedTags');
    if(private.length == 0) private = null;
    console.log(`cropImage cropped into cropCanvas ${template.file.name}`, tags, private);

    DBImages.insert({
      src: cropDataUrl
      , thumbnail: template.cropCanvas.toDataURL()
      , size: template.file.size
      , name: template.file.name
      , type: template.file.type
      , md5hash: template.md5hash
      , tags: tags
      , private: private
    }, function imageInserted(error, id) {
      if (error) {
        console.error(error);
      } else {
        console.log(`image ${id} inserted`);
        // var ids = AllImageIDs.get();
        // ids.push(id);
        // AllImageIDs.set(ids);
      }
      template.processNext();
    });
  }
  //
  // define onload handler for reader to read in the file
  //
  template.reader.onload = (function (aImg) {
    return function (e) {
      if (template.file.type in AcceptedFileTypes) {
        template.md5hash = md5(e.target.result);
        if (template.debug) {
          console.log(`read file ${template.file.name} => ${template.md5hash}`);
        }
        Meteor.call('imageExists', template.md5hash, function imageExits(err, exists) {
          if (exists) {
            Bootstrap3boilerplate.alert('danger', `Image ${template.file.name} has been uploaded before`, true);
            template.processNext();
          } else {
            // set crop_img.src so crop_img.onload fires which creates the thumbnail
            // https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
            aImg.src = e.target.result;
          }
        });
      } else {
        Bootstrap3boilerplate.alert('danger', `Image ${template.file.type} not of acceptable mime-type`, true);
        template.processNext();
      }
    };
  })(template.crop_img);
});
Template.upload.onDestroyed(function () {
  const template = this;
  // console.log(`${template.view.name}.onDestroyed`);
});
Template.upload.events({
  'click button.upload-url'(event, template) {
    var url = template.find('#image-url');
    if (url) {
      Meteor.call('getURL', url.value, (err, file) => {
        if (err) {
          console.error(err);
          Bootstrap3boilerplate.alert('danger', `Image ${err.message} has been uploaded before`, true);
        } else {
          const md5hash = md5(file.data);
          template.file = file;

          Meteor.call('imageExists', md5hash, function imageExits(err, exists) {
            if (exists) {
              Bootstrap3boilerplate.alert('danger', `Image ${template.file.name} has been uploaded before`, true);
              template.processNext();
            } else {
              // set crop_img.src so crop_img.onload fires which creates the thumbnail
              // https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
              template.crop_img.src = file.data;
              template.md5hash = md5hash;
              url.value = '';
            }
          });
        }
      });
    } else {
      console.log('could not find #image-url')
    }
  },
  'change #fileinput': function (e, template) {
    // console.info(e.target);
    template.filesIndex = 0;
    template.files = document.getElementById('fileinput').files;
    template.$('h1').addClass('hidden');
    template.$('img').removeClass('hidden');
    template.processNext();
    // template.file = template.files.item(template.filesIndex++);
    // template.reader.readAsDataURL(template.file);
    // template.$('button.upload').removeClass('hidden');
    // $('div.crop_img').removeClass('hidden');
  },
  'click div.mongodb-image-droppable'(e, template) {
    e.preventDefault();
    e.stopPropagation();
    template.$('#fileinput').trigger('click');
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
  'drop div.mongodb-image-droppable'(e, template) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    template.filesIndex = 0;
    if (e.originalEvent.dataTransfer) {
      template.files = e.originalEvent.dataTransfer.files;
    } else if (e.originalEvent.target) {
      template.files = e.originalEvent.target.files;
    }
    template.$('h1').addClass('hidden');
    template.$('img').removeClass('hidden');
    template.processNext();
  }
});
Template.upload.helpers({
  privateOptions(){
    const instance = Template.instance();
    return {
      placeholderText: 'Add users for which this is private',
      // defaultClasses: 'bootstrap label label-primary tagit-choice ui-corner-all',
      defaultClasses: 'bootstrap badge badge-primary tagit-choice ui-corner-all',
      allowDuplicates: false,
      allowSpaces: false,
      caseSensitive: false,
      existingEffect: 'shake',
      readOnly: false,
      tagLimit: null,
      singleField: true,
      // fieldName: 'tag',
      appendTo: '#uploadModal',
      // availableTags: instance.data.users.map((u) => {return u.email}),
      autocomplete: {
        delay: 0,
        minLength: 2,
        autoFocus: true,
        source(request, callback) {
          Meteor.call('users', request.term, (err, users) => {
            if (err) console.error(err);
            else {
              instance.validUsers = users;
              callback(users);
            }
          });
          // console.log(request.term, instance.users)
          // var options = instance.users
          //   .filter((u) => { return u.email.match(request.term) })
          //   .map((u) => { return { label: u.email, value: u.id } })
          // callback(options);
        },
      },
      beforeTagAdded(event, ui) {
        const tagit = instance.$(this).data('uiTagit');
        const valid = instance.validUser(ui.tagValue);
        // console.log(`beforeTagAdded ${ui.tagValue}=${valid}`);
        if (!valid) tagit.tagInput.val('');
        return valid;
      },
    };
  },
  tagOptions(){
    const instance = Template.instance();
    return {
      placeholderText: 'Enter tags for this image',
      allowDuplicates: false,
      allowSpaces: false,
      caseSensitive: false,
      // readOnly: false,
      tagLimit: null,
      singleField: true,
      // fieldName: 'tag',
      // defaultClasses: 'bootstrap label label-primary tagit-choice ui-corner-all',
      defaultClasses: 'bootstrap badge badge-primary tagit-choice ui-corner-all',
      existingEffect: 'shake',
      appendTo: '#uploadModal .modal-content',
      autocomplete: {
        delay: 0,
        minLength: 2,
        // autoFocus: true,
        source(request, callback) {
          Meteor.call('tags', request.term, (err, tags) => {
            var options = [];
            if (err) {
              console.error(err);
            } else {
              // console.log(tags);
              instance.validTags = tags;
              // options = tags.map((t) => { return { label: t, value: t } });
              options = tags;
            }
            callback(options);
          });
        }
      },
    };
  },
})