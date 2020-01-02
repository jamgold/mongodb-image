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

  instance.autorun(function () {
    var userId = Meteor.userId();
    var params = FlowRouter.current().params;
    FlowRouter.watchPathChange();
    instance.subscribe('image', params.id, function () {
      var tagSearch = TagSearch.get();
      var $myTags = $('#myTags');
      TagsImgId = null;
      $myTags.tagit('removeAll');
      instance.cssclasses.set("");
      var img = DBImages.findOne({ _id: params.id });
      if (img) {
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
      }
      TagsImgId = params.id;
    });
  });
});
Template.image.onRendered(function () {
  // console.info('Template.image.rendered', this);
  if (Roles.userIsInRole(Meteor.userId(), 'admin')) {
    var params = FlowRouter.current().params;
    var img = DBImages.findOne({ _id: params.id });
    if (img)
      Meteor.call('user_name', img.user, function (err, res) {
        if (!err) {
          Session.set('user_name', res.email);
          Session.set('user_banned', res.banned);
        } else console.error(err);
      });
  }
});
Template.image.helpers({
  allowed(){
    const img = DBImages.findOne(this._id);
    const userId = Meteor.userId();
    var allowed = true;
    if(img && img.type != 'loading' && img.private) {
      // console.log(`allowed`, img.private);
      allowed = img.user == userId || img.private.indexOf(userId)>=0;
    }
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
        DBImages.update({ _id: image._id }, { $set: { md5hash: image.md5hash, created: image.created } });
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
});

Template.image_info.helpers({
  imageType(type) {
    const t = ImageType.get();
    // console.log(`imageType ${type}==${t} ${t==type}`);
    return t == type ? 'checked' : '';
  },
  active(c) {
    // console.log(c,this);
    if (c == undefined) {
      return this.cssclasses == undefined || this.cssclasses == "" ? "checked" : "";
    } else {
      return this.cssclasses == c ? "checked" : "";
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
    var image = DBImages.findOne(id);
    var old = image.cssclasses;
    DBImages.update(id, { $set: { cssclasses: c.value } }, function (r) {
      // t.$('.fullscreen').removeClass(old).addClass(c.value);
      t.cssclasses.set(c.value);
    })
  },
  'click .delete': function (e, t) {
    const id = e.currentTarget.id;
    if (confirm(`Really Delete? ${id}`)) {
      DBImages.remove({ _id: id }, function (err) {
        if (err) {
          console.log(err);
          e.preventDefault();
        }
        else {
          Session.set('uploaded', Session.get('uploaded') - 1);
          FlowRouter.go('/');
        }
      });
    }
  },
  'click a.ban': function (e, t) {
    if (confirm('Really ban this user?')) {
      var img = t.img.get();
      Meteor.call('ban', img.user, true, function (err, res) {
        if (err) {
          console.log(err)
        }
        else {
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
        }
        else {
          e.target.className = res;
          e.target.innerHTML = res;
        }

        // console.info(e.target.className,err,res);
      });
    }
  }
});