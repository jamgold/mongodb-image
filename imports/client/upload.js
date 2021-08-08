import './upload.html';
import './thumbnails/tagit';
import { cropDrop } from '/imports/lib/crop'
import { makeHash } from '/imports/lib/hash'
// console.log(__filename);

Template.upload.onCreated(function () {
  const instance = this
  // console.log(`${instance.view.name}.onCreated`, instance.data)
  instance.file = null
  instance.validUsers = []
  instance.validTags = []
  window.upload = instance
  instance.autorun(function uploadAutorunUserId() {
    instance.userId = Meteor.userId()
  });
  instance.validUser = function uploadValidUser(id) {
    var user = Meteor.users.findOne(id);
    if (user == undefined) {
      if (instance.validUsers.length > 0) {
        var x = instance.validUsers.filter((u) => { return u.value == id });
        if (x.length > 0) user = x[0].value;
      }
    } else {
      user = user._id;
    }
    return user;
  }
});
Template.upload.onRendered(function () {
  const instance = this;
  // console.log(`${instance.view.name}.onRendered`, instance.$('#new_image_tags'));
  instance.autorun(function uploadAutorunProcessing(c){
    const processing = cropDrop.processing.get()
    if(c.firsRun !== false && c._recomputing === true) {
      // console.log(`uploadAutorunProcessing ${processing}`, c)
      if(processing) {
        instance.$('h1').addClass('hidden')
        instance.$('img.loading').removeClass('hidden')
      } else {
        instance.$('h1').removeClass('hidden');
        instance.$('img.loading').addClass('hidden');
      }
    }
  })
});
Template.upload.onDestroyed(function () {
  const template = this;
  if (DEBUG) console.log(`${template.view.name}.onDestroyed`);
});
Template.upload.events({
  'click button.upload-url' (event, template) {
    var url = template.find('#image-url');
    if (url) {
      //
      // call getURL method to retrieve the URL
      //
      Meteor.call('getURL', url.value, async function(err, file) {
        if (err) {
          console.error(err);
          Bootstrap3boilerplate.alert('danger', `${err.details}`, false);
        } else {
          const md5hash = await makeHash(file.data);
          cropDrop.file = file;
          Meteor.call('imageExists', md5hash, file.lastModified, function imageExits(err, exists) {
            if (exists) {
              Bootstrap3boilerplate.alert('danger', `Image ${file.name} has been uploaded before`, false)
              // cropDrop.file = file
              cropDrop.processNext()
            } else {
              cropDrop.crop_img.src = file.data
              cropDrop.md5hash = md5hash
              url.value = ''
            }
          });
        }
      });
    } else {
      console.log('could not find #image-url')
    }
  },
  'change #fileinput': function (e, template) {
    const files = document.getElementById('fileinput').files
    cropDrop.filesIndex = 0
    cropDrop.files = files
    cropDrop.processNext()
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
    // e.preventDefault();
    // e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
  },
  'change #new_image_tags'(e, template) {
    cropDrop.tags = $(`#${e.currentTarget.id}`).tagit('assignedTags')
  },
  // 'change #new_image_users'(e, template) {
  //   console.log(e.currentTarget)
  //   cropDrop.private = $(`#${e.currentTarget.id}`).tagit('assignedTags')
  // },
});
Template.upload.helpers({
  currentTags(){
    return TagSearch.get()
  },
  options(type){
    const instance = Template.instance();
    const options = {
      private: {
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
              if (err) console.error(err)
              else {
                instance.validUsers = users
                callback(users)
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
          const valid = instance.validUser(ui.tagValue) !== undefined;
          // console.log(`beforeTagAdded ${ui.tagValue}=${valid}`);
          if (!valid) tagit.tagInput.val('');
          return valid;
        },
        afterTagRemoved(event, ui) {
          // console.log(`removed ${ui.tagLabel}=${ui.tagValue}`,ui)
          cropDrop.private = cropDrop.private.filter((p) => p != ui.tagValue)
        },
        afterTagAdded(event, ui) {
          // console.log(`added ${ui.tagLabel}=${ui.tagValue}`, ui)
          cropDrop.private.push(ui.tagValue)
        }
      },
      tags: {
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
        afterTagAdded(event, ui) {
          if (DEBUG) console.log(`uploadTag added ${ui.tagLabel}=${ui.tagValue}`, ui)
        },
      },
    }
    // console.log(`options ${type}`, options[type]);
    return options[type];
  }
});