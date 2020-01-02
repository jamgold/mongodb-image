import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
import './user.html';
console.log(__filename);

Template.userImages.onCreated(function () {
  const template = this;
  template.handle = null;
  template.start = new ReactiveVar(0);
  template.user = new ReactiveVar(FlowRouter.current().params.user);
  template.pages = new ReactiveVar([]);
  template.contributors = {};

  if (ThumbnailsHandle) ThumbnailsHandle.stop();

  template.autorun(function () {
    var contributors = Contributors.get();
    if (contributors) {
      contributors.forEach(function (c) {
        template.contributors[c.id] = c;
      })
    }
    // console.log(template.contributors);
  });

  template.autorun(function () {
    FlowRouter.watchPathChange();
    template.user.set(FlowRouter.current().params.user);
  });
  template.autorun(function () {
    var user = template.user.get();
    // template.user = FlowRouter.current().params.user;
    Meteor.call('user_name', user, function (err, res) {
      // console.log('user_name', res);
      if (!err) {
        Session.set('user_name', res.email);
        Session.set('user_banned', res.banned);
      } else console.error(err);
    });

    var counter = user in template.contributors ? template.contributors[user].count : 0;
    var pages = [];
    var page = 1;
    var number = 18;//ImagesPerPage;
    if (counter > number) {
      for (var i = 0; i < counter; i += number) {
        var c = i == ImageStart ? 'page-item active' : 'page-item';
        pages.push(`<li class="page-item ${c}" data-start="${i}"><a class="page-link" data-start="${i}">${page}</a></li>`);
        page++;
      }
    }
    // console.log(`set pages for ${user} / ${counter} => ${pages.length}`);
    template.pages.set(pages);
    template.start.set(0);
  });
  template.autorun(function () {
    var user = template.user.get();
    var start = template.start.get();
    // console.log(`${template.view.name} running subscribe for ${user}`);
    if (template.handle) template.handle.stop();
    template.handle = template.subscribe('user_images', start, user, function () {
      // console.log(`subscribed to ${DBImages.find({user:user}).count()} images for ${user}`);
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
});
Template.userImages.events({
  'click .pagination li a'(e, template) {
    template.$('.pagination li').removeClass('active');
    e.currentTarget.parentNode.classList.add('active');
    template.start.set(parseInt(e.currentTarget.dataset.start));
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
