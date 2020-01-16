import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './user.html';
import '/imports/client/thumbnails/thumbnail';
console.log(__filename);

Template.userImages.onCreated(function () {
  const instance = this;
  instance.handle = null;
  instance.start = new ReactiveVar(0);
  instance.user = new ReactiveVar(FlowRouter.current().params.user);
  instance.pages = new ReactiveVar([]);
  instance.tags = new ReactiveVar([]);
  instance.contributors = {};
  instance.useHook = true;

  if (ThumbnailsHandle) ThumbnailsHandle.stop();

  instance.autorun(function () {
    var contributors = Contributors.get();
    if (contributors) {
      contributors.forEach(function (c) {
        instance.contributors[c.id] = c;
      })
    }
    // console.log(instance.contributors);
  });
  instance.autorun(function () {
    FlowRouter.watchPathChange();
    instance.user.set(FlowRouter.current().params.user);
  });
  instance.autorun(function () {
    var user = instance.user.get();
    // instance.user = FlowRouter.current().params.user;
    Meteor.call('user_name', user, function (err, res) {
      // console.log('user_name', res);
      if (!err) {
        Session.set('user_name', res.email);
        Session.set('user_banned', res.banned);
      } else console.error(err);
    });
  });
});
Template.userImages.onRendered(function(){
  const instance = this;
  instance.autorun(function(){
    var user = instance.user.get();
    var tags = instance.tags.get();
    instance.start.set(0);
    Meteor.call('imageCount', tags, user, (err, counter) => {
      if(err) {
        console.error(err);
      } else {
        console.log(`pages to ${counter} images for ${user} with ${tags}`);
        var pages = [];
        var page = 1;
        var number = 18;//ImagesPerPage;
        if (counter > number) {
          for (var i = 0; i < counter; i += number) {
            var c = i == 0 ? 'page-item active' : 'page-item';
            pages.push(`<li class="page-item ${c}" data-start="${i}"><a class="page-link" data-start="${i}">${page}</a></li>`);
            page++;
          }
        }
        // console.log(`set pages for ${user} / ${counter} => ${pages.length}`);
        instance.pages.set(pages);
      }
    })
  });
  instance.autorun(function () {
    var user = instance.user.get();
    var start = instance.start.get();
    var tags = instance.tags.get();
    const tagit = instance.$('#user-tag-search').data('uiTagit');
    const assignedTags = tagit.assignedTags();
    // console.log(`${instance.view.name} running subscribe for ${user} ${assignedTags} ${tags}`);
    // add tags not yet part of assigendTags to the search field
    instance.useHook = false;
    tags.filter((tag) => {return assignedTags.indexOf(tag)<0}).forEach((tag) => {
      tagit.createTag(tag);
    });
    instance.useHook = true;
    if (instance.handle) instance.handle.stop();
    instance.handle = instance.subscribe('user_images', start, user, tags, function () {
    });
  });
});
Template.userImages.onDestroyed(function () {
  const instance = this;
  // console.info(`${instance.view.name}.onDestroyed`);
  //
  // restore global subscription
  //
  if (ThumbnailsHandle) ThumbnailsHandle.stop();
  ThumbnailsHandle = Meteor.subscribe('thumbnails', Session.get('imageStart'), TagSearch.get(), function () {
    // console.log(`${DBImages.find().count()} thumbnails subscribed ${ThumbnailsHandle.subscriptionId}`);
  });
});
Template.userImages.helpers({
  options(){
    const instance = Template.instance();
    return {
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
      // appendTo: '#uploadModal .modal-content',
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
        },
        
      },
      beforeTagAdded: function (event, ui) {
        var valid = true;
        if (instance.useHook) {
          const tagit = instance.$(this).data('uiTagit');
          valid = ['missing', 'uncropped', 'cssclasses'].indexOf(ui.tagLabel) >= 0 || instance.validTags.indexOf(ui.tagLabel) >= 0;
          if (!valid) tagit.tagInput.val('');
        }
        return valid;
      },
      //
      // add/remove tags to TagSearch ReactiveVar
      //
      afterTagAdded: function (event, ui) {
        if (instance.useHook) {
          let tags = instance.tags.get();
          tags.push(ui.tagLabel);
          instance.start.set(0);
          instance.tags.set(tags);
        }
      },
      afterTagRemoved: function (event, ui) {
        if (instance.useHook) {
          let tags = instance.tags.get();
          instance.start.set(0);
          instance.doAutorun = false;
          instance.tags.set(tags.filter((tag) => { return ui.tagLabel != tag }));
        }
      },
    };
  },
  needsPagination() {
    const instance = Template.instance();
    const pages = instance.pages.get();
    return pages.length > 0;
  },
  pages() {
    const instance = Template.instance();
    return instance.pages.get();
  },
  contributors() {
    return Contributors.get();
  },
  activeUser(c) {
    const instance = Template.instance();
    var user = instance.user.get();
    // console.log(`activeUser ${c.id} == ${user}`);
    return c.id.toString() == user;
  },
  images() {
    //
    // do not use subscriptionId since the images might already be 
    // there from the global Meteor.subscription and the publish
    // only adds the new subscriptionId to images not yet in the 
    // publication
    //
    var instance = Template.instance();
    var user = instance.user.get()
    return DBImages.find({
      user: user,
    }, {
      sort: { created: -1 }
    });
  },
  user() {
    var instance = Template.instance();
    return instance.user.get();
  },
  user_name: function () {
    return Session.get('user_name');
  },
  ready(){
    const instance = Template.instance();
    // console.log('ready', instance.handle);
    return instance.handle && instance.handle.ready();
  },
});
Template.userImages.events({
  'click .pagination li a'(e, instance) {
    instance.$('.pagination li').removeClass('active');
    e.currentTarget.parentNode.classList.add('active');
    instance.start.set(parseInt(e.currentTarget.dataset.start));
  },
  'click span.present-tags .tag'(event, instance) {
    var tags = instance.tags.get();
    const tag = event.currentTarget.dataset.tag;
    if (tags.indexOf(tag < 0)) {
      // console.log(`adding ${tag} to ${tags}`);
      tags.push(tag);
      instance.tags.set(tags);
      instance.start.set(0);
    }
  },
});
Template.other_user.onCreated(function () {
  const self = this;
  self.user_name = new ReactiveVar(self.data);
  // console.log(`${self.view.name}.onCreated`, self.data);
  Meteor.call('user_name', self.data, function (err, user_name) {
    if (err) console.error(err);
    else {
      self.user_name.set(user_name.email);
    }
  })
});
Template.other_user.helpers({
  other_user_name: function () {
    var self = Template.instance();
    return self.user_name.get();
  }
});
Template.other_user.events({
  'click .banning'(event, instance) {
    let user = event.currentTarget.dataset.contributor;
    if (event.currentTarget.classList.contains('ban')) {
      // console.log(`ban ${user}`);
      if (confirm('Really ban this user?')) {
        Meteor.call('ban', user, true, function (err, res) {
          if (err) {
            console.log(err)
          }
          else {
            event.currentTarget.classList.remove('ban');
            event.currentTarget.classList.add('banned');
            event.currentTarget.innerHTML = res;
          }
          // console.info(e.target.className,err,res);
        });
      }
    } else {
      // console.log(`unban ${user}`);
      if (confirm('Really unban this user?')) {
        Meteor.call('ban', user, false, function (err, res) {
          if (err) {
            console.log(err)
          }
          else {
            event.currentTarget.classList.remove('banned');
            event.currentTarget.classList.add('ban');
            event.currentTarget.innerHTML = res;
          }
          // console.info(e.target.className,err,res);
        });
      }
    }
  }
});
