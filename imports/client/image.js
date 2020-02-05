import './image.html';
import './private';
console.log(__filename);
Template.image.onCreated(function () {
  var instance = this;
  instance.cssclasses = new ReactiveVar('');
  instance.next = new ReactiveVar(null);
  instance.prev = new ReactiveVar(null);
  instance.img = new ReactiveVar({
    name: 'loading',
    md5hash: 'loading',
    size: 0,
    type: 'loading',
    src: new ReactiveVar('/circle-loading-animation.gif'),
    imageId: FlowRouter.current().params.id,
  });
});
Template.image.onRendered(function () {
  const instance = this;
  const tagSearch = TagSearch.get();
  const $myTags = $('#myTags');

  instance.autorun(function imageAutorun() {
    // FlowRouter.watchPathChange();
    var userId = Meteor.userId();
    var params = FlowRouter.current().params;
    // console.log(`${instance.view.name}.onCreated`, instance.data);
    // subscription now happens in the route
    // instance.subscribe('image', params.id, function () {
    // this takes care of the re-run since we subscribe in the route
    var img = Template.currentData().image;//instance.data.image; //Images.findOne({ _id: params.id });
    if (img) {
      // this determines if the tags are being added to the image, set to null so the current image is not being updated
      TagsImgId = null;
      $myTags.tagit('removeAll');
      instance.cssclasses.set("");
      // console.log(`${instance.view.name}.onRendered autorun ${params.id} ${img._id} ${img.tags}`);
      let readOnly = true;
      if (userId) {
        if (img.user == userId) {
          readOnly = false;
        } else {
          readOnly = !Roles.userIsInRole(userId, 'admin');
        }
      }
      // this only affects the tags and not readOnly of the input
      $myTags.tagit({ readOnly: readOnly });//.prop('readOnly', false);
      $('#myTags li.tagit-new input').prop('disabled', readOnly);
      if (img.tags) {
        img.tags.forEach(function (tag) {
          $("#myTags").tagit("createTag", tag);
        })
      }
      // $myTags.prop('readOnly', readOnly);
      // set the preliminary src to animation and make it reactive
      img.src = new ReactiveVar('/circle-loading-animation.gif');
      instance.img.set(img);
      // now call method to get src for id
      Meteor.call('src', params.id, tagSearch, function (err, res) {
        if (err) {
          console.log(err);
        }
        else {
          // set this routes img src
          // console.log(`prev ${res.prev}, next ${res.next}`);
          img.src.set(res.src);
          instance.next.set(res.next);
          instance.prev.set(res.prev);
          instance.cssclasses.set(img.cssclasses);
        }
      });
      if (Roles.userIsInRole(Meteor.userId(), 'admin')) {
        if (img)
          Meteor.call('user_name', img.user, function (err, res) {
            if (!err) {
              Session.set('user_name', res.email);
              Session.set('user_banned', res.banned);
              // console.log(`imageRenderedAutorun ${res.email}`);
            } else console.error(err);
          });
      }
    }
    TagsImgId = params.id;
    // });
    Session.set('navbarUrl', `/#${params.id}`);
  });
});
Template.image.helpers({
  allowed(){
    const img = Images.findOne(this._id);
    const userId = Meteor.userId();
    var allowed = true;
    if(img && img.type != 'loading' && img.private) {
      // console.log(`allowed`, img.private);
      allowed = img.user == userId || img.private.indexOf(userId)>=0;
    }
    // if(img) console.log(`${img._id} ${allowed}`);
    return allowed;
  },
  imgId() {
    return FlowRouter.current().params.id;
  },
  img: function () {
    var instance = Template.instance();
    return instance.img.get();
  },
  myImage(){
    const userId = Meteor.userId();
    const instance = Template.instance();
    const img = instance.img.get();
    // console.log(`myImage ${userId} ${img.user}`);
    return img && img.user == userId;
  },
  cssclasses(){
    const instance = Template.instance();
    return instance.cssclasses;
  },
  cssclassesImage() {
    var instance = Template.instance();
    var css = instance.cssclasses.get();
    var type = ImageType.get();
    if (type != 'cover') {
      css += ` ${type}`;
    }
    return css;
  },
  md5hash: function () {
    var image = this;
    if (image && image._id && image.src) {
      var update = false;

      if (image.md5hash === undefined) {
        console.log('Template.image.helpers.img md5hash missing');
        image.md5hash = md5(image.src);
        update = true;
      }
      if (image.created === undefined) {
        console.log('Template.image.helpers.img created missing');
        image.created = new Date();
        update = true;
      }

      if (update) {
        Images.update({ _id: image._id }, { $set: { md5hash: image.md5hash, created: image.created } });
        console.log('Template.image.helpers.img updated');
      }
      // else console.log('Template.image.helpers.img md5hash exist');
    }
  },
  user_name: function () {
    return Session.get('user_name');
  },
  user_banned: function () {
    return Session.get('user_banned');
  },
  canDelete: function (owner) {
    return owner == Meteor.userId() || Roles.userIsInRole(Meteor.userId(), 'admin');
  },
  prev: function () {
    var instance = Template.instance();
    return instance.prev.get();
  },
  next: function () {
    var instance = Template.instance();
    return instance.next.get();
  },
  active(c) {
    // console.log(c,this);
    if (c == undefined) {
      return this.cssclasses == undefined || this.cssclasses == "" ? "checked" : "";
    } else {
      return this.cssclasses == c ? "checked" : "";
    }
  },
  cover() {
    var instance = Template.instance();
    return ImageType.get() == 'cover';
  },
  imageType(type) {
    return ImageType.get() == type ? 'checked' : '';
  },
});
Template.image.events({
  // 'change #image-type'(e, t) {
  //   ImageType.set(e.currentTarget.value);
  // },
  'click .present-tags .tag'(event, instance) {
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

Template.image_info.onRendered(function(){
  const instance = this;
  // console.log(`${instance.view.name}.onRendered`, instance.data);
})
Template.image_info.helpers({
  imageType(type) {
    const t = ImageType.get();
    // console.log(`imageType ${type}==${t} ${t==type}`);
    return t == type ? 'checked' : '';
  },
  active(c) {
    if (c == undefined) {
      return this.cssclasses == undefined || this.cssclasses.get() == "" ? "checked" : "";
    } else {
      // console.log(c, this);
      return this.cssclasses.get() == c ? "checked" : "";
    }
  },
  canDelete: function (owner) {
    return owner == Meteor.userId() || Roles.userIsInRole(Meteor.userId(), 'admin');
  },
});

Template.image_info.events({
  'change #image-type'(e, t) {
    ImageType.set(e.currentTarget.value);
  },
  'change #cssclasses'(e, t) {
    var c = e.currentTarget;
    var id = c.dataset.imageId;
    // var image = Images.findOne(id);
    // var old = image.cssclasses;
    Images.update(id, { $set: { cssclasses: c.value } }, function (r) {
      // t.$('.fullscreen').removeClass(old).addClass(c.value);
      t.data.cssclasses.set(c.value);
      console.log(`updated ${id} with cssclass=${c.value}`);
    })
  },
  // 'click .delete': function (e, t) {
  //   const id = e.currentTarget.id;
  //   if (confirm(`Really Delete? ${id}`)) {
  //     Images.remove({ _id: id }, function (err) {
  //       if (err) {
  //         console.log(err);
  //         e.preventDefault();
  //       }
  //       else {
  //         Session.set('uploaded', Session.get('uploaded') - 1);
  //         FlowRouter.go('/');
  //       }
  //     });
  //   }
  // },
  'click a.ban': function (e, t) {
    if (confirm('Really ban this user?')) {
      var img = t.img.get();
      Meteor.call('ban', img.user, true, function (err, res) {
        if (err) {
          console.log(err)
        } else {
          e.target.className = res;
          e.target.innerHTML = res;
        }
        // console.info(e.target.className,err,res);
      });
    }
  },
  'click a.banned': function (e, t) {
    if (confirm('Really unban this user?')) {
      var img = t.img.get();
      Meteor.call('ban', img.user, false, function (err, res) {
        if (err) {
          console.log(err)
        } else {
          e.target.className = res;
          e.target.innerHTML = res;
        }
        // console.info(e.target.className,err,res);
      });
    }
  }
});