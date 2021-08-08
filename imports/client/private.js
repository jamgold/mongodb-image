import './private.html';
import './thumbnails/tagit';
// console.log(__filename);
Template.private.onCreated(function(){
  const instance = this;
  instance.imageid = null;
  instance.validUsers = [];
  instance.createTags = function(data){
    if(data.img._id == undefined) return;
    instance.imageid = data.img._id;
    instance.useHook = false;
    // console.log(data.img);
    instance.private.tagit('removeAll');
    if (data.img.private) {
      data.img.private.forEach((u) => {
        // console.log(`${u} = ${typeof u}`);
        if(typeof u == 'string') {
          var user = Meteor.users.findOne(u);
          // console.log(user);
          instance.tagit.createTag({label: user.emails[0].address,value:u});
        } else {
          console.info(`${instance.imageid} has ${u} = ${typeof u} in private`)
          Images.update(instance.imageid, {$pull:{private: u}});
        }
      });
    }
    instance.useHook = true;
  }
  instance.validUser = function(id){
    var user = Meteor.users.findOne(id);
    if(user == undefined){
      if(instance.validUsers.length>0) {
        var x = instance.validUsers.filter((u) => {return u.value == id});
        if(x.length>0) user = x[0].value;
      }
    } else {
      user = user._id;
    }
    return user;
  }
});
Template.private.onRendered(function(){
  //
  // https://github.com/aehlke/tag-it/blob/master/README.markdown
  //
  const instance = this;
  instance.private = instance.$('#private');
  instance.useHook = true;
  let userId = Meteor.userId();
  // console.info(`${instance.view.name}.onRendered`,instance.data);
  const options = {
    placeholderText: 'Add users for who this image is private',
    // defaultClasses: 'bootstrap label label-primary tagit-choice ui-corner-all',
    defaultClasses: 'bootstrap badge badge-primary tagit-choice ui-corner-all',
    allowDuplicates: false,
    allowSpaces: false,
    caseSensitive: false,
    existingEffect: 'shake',
    readOnly: userId == null || userId == undefined,
    tagLimit: null,
    singleField: true,
    fieldName: 'tag',
    // availableTags: instance.data.users.map((u) => {return u.email}),
    autocomplete: {
      delay: 0,
      minLength: 2,
      autoFocus: true,
      source(request, callback) {
        Meteor.call('users', request.term, (err,users) => {
          if(err) console.error(err);
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
      if (instance.useHook) {
        const tagit = instance.$(this).data('uiTagit');
        const valid = instance.validUser(ui.tagValue);
        // console.log(`beforeTagAdded ${ui.tagValue}=${valid}`);
        if(!valid) tagit.tagInput.val('');
        return valid;
      }
    },
    afterTagAdded(event, ui) {
      if (instance.useHook) {
        // console.log(`afterTagAdded ${ui.tagValue}`);
        var uid = instance.validUser(ui.tagValue);
        if (uid && instance.imageid) {
          Meteor.call('addPrivate', instance.imageid, uid, (err,res) => {
            if (err) {
              console.error(err);
              Bootstrap3boilerplate.alert('danger', err.message, false);
             }
             else {
               Bootstrap3boilerplate.alert('success', res, true);
             }
          })
        }
      }
    },
    afterTagRemoved(event, ui) {
      // console.log(ui);
      if (instance.useHook) {
        var uid = ui.tagValue;
        if (uid && instance.imageid) {
          Meteor.call('delPrivate', instance.imageid, uid, (err,res) => {
            if (err) {
              Bootstrap3boilerplate.alert('danger', err.message, false);
             } 
             else {
               Bootstrap3boilerplate.alert('success', res, true);
             }
          })
        }
      }
    },
  };

  instance.private.tagit(options);
  instance.tagit = instance.private.data('uiTagit')
  // console.log(`${instance.view.name}.onRendered`, instance.private);
  instance.createTags(instance.data);

  let input = instance.findAll('.ui-autocomplete-input');
  if (input.length > 0) {
    input[0].spellcheck = false;
  }
});
Template.private.onDestroyed(function(){
  const instance = this;
  // instance.tagit.destroy();
});
Template.private.helpers({
  private: function privateHelper(){
    const instance = Template.instance();
    const data = Template.currentData();
    if(data.img && data.img.user && instance.imageid != data.img._id && instance.private){
      instance.createTags(data);
    }
  }
});
Template.private.events({
});