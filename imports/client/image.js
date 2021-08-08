import './image.html'
import './private'
import isMobile from 'ismobilejs/src/index.ts'
import { tagQuery } from '/imports/lib/query'
// console.log(__filename);
window.isMobile = isMobile
Template.image.onCreated(function () {
  const instance = this
  const imgid = instance.data.image && instance.data.image._id ? instance.data.image._id : FlowRouter.current().params.id
  instance.cssclasses = new ReactiveVar('')
  instance.next = new ReactiveVar(null)
  instance.prev = new ReactiveVar(null)
  instance.img = new ReactiveVar({
    name: 'loading',
    md5hash: 'loading',
    size: 0,
    type: 'loading',
    src: new ReactiveVar('/circle-loading-animation.gif'),
    imageId: imgid,
  })
});
Template.image.onRendered(function () {
  const instance = this;
  const tagSearch = TagSearch.get();
  const $tagSearch = $('#tagSearch');

  instance.autorun(function coverAutorun(c){
    const cover = ImageType.get()
    if (cover == 'cover')
      document.getElementsByTagName('body')[0].style.overflow = 'hidden'
    else
      document.getElementsByTagName('body')[0].style.overflow = ''
  })
    
  instance.autorun(function imageAutorun(c) {
    // FlowRouter.watchPathChange();
    var userId = Meteor.userId();
    var params = FlowRouter.current().params;
    // console.log(`${instance.view.name}.onCreated.autorun`, instance.data);
    // subscription now happens in the route
    // instance.subscribe('image', params.id, function () {
    // this takes care of the re-run since we subscribe in the route
    var img = Template.currentData().image;//instance.data.image; //Images.findOne({ _id: params.id });
    if (img) {
      // this determines if the tags are being added to the image, set to null so the current image is not being updated
      TagsImgId = null;
      $tagSearch.tagit('removeAll');
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
      $tagSearch.tagit({ readOnly: readOnly });//.prop('readOnly', false);
      $('#tagSearch li.tagit-new input').prop('disabled', readOnly);
      if (img.tags) {
        img.tags.forEach(function (tag) {
          $("#tagSearch").tagit("createTag", tag);
        })
      }
      // $tagSearch.prop('readOnly', readOnly);
      // set the preliminary src to animation and make it reactive
      img.src = new ReactiveVar('/circle-loading-animation.gif');
      instance.img.set(img);
      // now call method to get src for id
      Meteor.call('src', img._id, tagSearch,async function (err, res) {
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
          Meteor.call('imageHash', img._id, (err,res) => {
            if(err) console.error(err);
            // else console.log(`imageHash`,res);
          })
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
      TagsImgId = img._id;
    }
    // TagsImgId = params.id;
    // });
    if(Session.get('isMobile')) {
      Session.set('navbarUrl', `/#${params.id}`);
    }
  });
  Session.set('isMobile', isMobile(navigator.userAgent).any)
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
    return Template.currentData()._id //FlowRouter.current().params.id
  },
  img: function () {
    const instance = Template.instance();
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
    return ImageType.get() == 'cover';
  },
  imageType(type) {
    return ImageType.get() == type ? 'checked' : '';
  },
  lastModified() {
    // console.log(`lastModified ${this._id}`)
    const img = Images.findOne(this._id)
    return img ? img.lastModified : null
  },
  imgTags(){
    // const instance = Template.instance()
    const data = Template.currentData()
    // console.log('imgTags', data)
    // const id = image ? image._id : null //FlowRouter.current().params.id
    const image = data._id ? Images.findOne(data._id) : null
    return image ? image.tags : []
  }
});
Template.image.events({
  // 'change #image-type'(e, t) {
  //   ImageType.set(e.currentTarget.value);
  // },
  'click .present-tags .tag'(event, instance) {
    event.preventDefault();
    if (DEBUG) console.log(`.image.tag`, event.currentTarget)
    var tags = TagSearch.get()
    const tag = event.currentTarget.dataset.tag
    if (tags.indexOf(tag < 0)) {
      if (DEBUG) console.log(`adding ${tag} to ${tags}`)
      tags.push(tag)
      Session.set('imageStart', 0)
      TagSearch.set(tags)
      // FlowRouter.go('/',{}, {tags: tagQuery(tags)})
    }
  },
});
Template.image.onDestroyed(function(){
  document.getElementsByTagName('body')[0].style.overflow = ''
})
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
  localDate(epoch) {
    const d = new Date(epoch)
    return d.toLocaleString()
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
      if (DEBUG) console.log(`updated ${id} with cssclass=${c.value}`);
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
    e.preventDefault()
    // console.log(t.data.img)
    if (confirm('Really ban this user?')) {
      var img = t.data.img;
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
    e.preventDefault()
    if (confirm('Really unban this user?')) {
      var img = t.data.img
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
  },
  'click a.download'(e,t){
    // prevent flickering and opening new tab
    if(!Session.get('isMobile')) e.preventDefault()
    const href = e.currentTarget.href
    window.location.href = href
  }
});