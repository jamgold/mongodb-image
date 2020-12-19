import { HTTP } from 'meteor/http';
import { check } from 'meteor/check';
import '/imports/server/rest';
// import '/imports/server/login';
import { makeHash } from '/imports/lib/hash';

const DEBUG = false

const createQuery = function(query, tags) {
  if (tags !== undefined && tags.length > 0) {
    if(tags[0] == 'cssclasses') {
      query['cssclasses'] = {$exists:1}
    }else if (tags[0] == 'uncropped') {
      query['details'] = { $exists: 0 };
    } else {
      query['tags'] = { $all: tags };
      if (tags[0] == 'missing') query['tags'] = { $exists: 0 };
    }
  }
  return query;
};

const rawImages = Images.rawCollection();
const ImagesDistinct = Meteor.wrapAsync(rawImages.distinct, rawImages);

Meteor.publish('thumbnails', function(imageStart, tags, limit){
  const self = this;
  let query = createQuery({thumbnail:{$exists:1},$or:[{private:{$exists:0}},{private:{$in:[this.userId]}},{user:self.userId}]}, tags);
  // console.log(EJSON.stringify(query));
  imageStart = imageStart == undefined ? 0 : imageStart;
  // console.info('thumbnails start:'+ imageStart+' subscriptionId:'+self._subscriptionId);
  const images = Images.find(query,{
    fields: {src:0}
    ,sort:{created: -1}
    ,skip: imageStart
    ,limit: limit ? limit : ImagesPerPage
  });
  //
  // now publish all the tags
  //
  // var tagids = ImagesDistinct('tagids', query);
  // cursors.push( Tags.find({_id:{$in:tagids}}) );
  if(UseTagsCollection) {
    const tagids = [];
    images.forEach((image) => {
      tagids.push(...image.tagids);
    });
    const tagcursor = Tags.find({ _id: { $in: tagids } });
    // console.log(`${cursor.fetch().length} thumbnails published with limit ${ImagesPerPage}`);
    return [images, tagcursor];
  } else {
    return images;
  }
});

Meteor.publish('md5hash', function(md5hash){
  return Images.find({md5hash: md5hash}, {
    fields: { src: 0 }
    , sort: { created: -1 }
  });
});

Meteor.publish('image',function(id) {
  const self = this;
  const images = Images.find(id,{
    fields: {src:0}
  });
  var userIds = [];
  images.forEach((i) => {
    if(i.private) {
      i.private.forEach((u) => { userIds.push(u)})
    }
  });
  const users = Meteor.users.find({_id:{$in:userIds}});

  return [ images, users ];
});

Meteor.publish('user_images', function(skip,user,tags){
  var self = this;
  // check(skip, Integer);
  // check(user, String);
  // console.log(`user_images for ${user} starting ${skip}`);
  //
  // do not use subscriptionId since the images might already be 
  // there from the global Meteor.subscription and the publish
  // only adds the new subscriptionId to images not yet in the 
  // publication
  //
  const query = createQuery({ user: user }, tags);
  
  return Images.find(query,{
    limit: 18,
    skip: skip,
    fields: {src:0},
    sort:{created: -1}
  });
});

Meteor.publish(null, function(){
  if (this.userId) {
    if(Roles.userIsInRole(this.userId,'admin')){
      return Meteor.roleAssignment.find();
    }else{
      return Meteor.roleAssignment.find({ 'user._id': this.userId });
    }
  } else {
    this.ready()
  }
});

Images.allow({
  insert: function(userId, doc) {
    return userId;
  },
  update: function(userId, doc, fieldNames, modifier) {
    return userId;
  },
  remove: function(userId, doc) {
    return doc.user == userId || Roles.userIsInRole( userId,'admin');
  }
});

Images.before.insert(function(userId, doc) {
  doc.user = userId;
  doc.order = Meteor.call('maxOrder') + 1;
  doc.created = new Date();
  if (DEBUG) console.log(`Images inserting with order ${doc.order}`);
});

Meteor.methods({
  imageHash: async function(id){
    const image = Images.findOne(id);
    if(image) {
      if (image.md5hash == undefined || image.md5hash.length<64) {
        const hash = await makeHash(image.src);
        Images.update(id,{$set:{md5hash: hash.hash}})
        // console.log(hash)
        return hash.hash
      } else {
        return 'no update needed';
      }
    } else {
      throw new Meteor.Error(404, `${id} image not found`, `${id} image not found`);
    }
  },
  count(tag){
    return Images.find({tags:{$in:[tag]}}).count()
  },
  tags(search){
    // const raw = Images.rawCollection();
    // const distinct = Meteor.wrapAsync(raw.distinct, raw);
    if(UseTagsCollection) {
      const tags = Tags.find({ tag: { $regex: search } }, { sort: { tag: 1 } }).fetch();
      if (DEBUG) console.log(`${search} => ${tags}`);
      return tags;
    } else {
      let tags = ImagesDistinct('tags');
      if(search == undefined){
        return tags.sort();
      } else {
        const s = search != undefined ? search.toLowerCase() : search;
        return tags.filter((tag) => { return tag && tag.toLowerCase().includes(s) }).sort();
      }
    }
  },
  update_tag(oldName,newName) {
    check(oldName, String);
    check(newName, String);
    if(Roles.userIsInRole(this.userId, 'admin')) {
      // find all the images that contain oldName tag
      var count = 0;
      Images.find({tags:{$in:[oldName]}}).forEach(function(i){
        // get the tags with oldName filtered out
        var tags = i.tags.filter((t) => {return t!=oldName});
        // add newName to tags if it doesn't exist
        if(tags.indexOf(newName)<0) tags.push(newName);
        // write back record
        count += Images.update(i._id,{$set:{tags: tags}});
      });
      // return all tags sorted
      return {count: count, tags: Meteor.call('tags')};
    } else {
      throw new Meteor.Error(403, 'Access Denied', 'only admins can rename tags');
    }
  },
  users(search){
    return this.userId ? Meteor.users.find({'emails.0.address':{$regex: search, $options: 'i'}}).map((u) => { return {value: u._id, label: u.emails[0].address}}) : null;
  },
  maxOrder(){
    let images = Images.find({order:{$exists:1}},{sort:{order:-1},limit:1}).fetch()
    if(images.length>0) return images[0].order;else return Images.find().count()+10;
  },
  nextImage(order, tags, userId){
    const self = this;
    if (userId == undefined) userId = self.userId;
    let query = createQuery({ order: { $lt: order }, $or: [{ private: { $exists: 0 } }, { private: { $in: [userId] } }, { user: self.userId }] }, tags) ;
    let images = Images.find(query,{sort:{order:-1},limit:1}).fetch()
    if(images.length>0) return images[0]._id;else return null;
  },
  prevImage(order, tags, userId){
    const self = this;
    if(userId==undefined) userId = self.userId;
    let query = createQuery({ order: { $gt: order }, $or: [{ private: { $exists: 0 } }, { private: { $in: [userId] } }, { user: self.userId }]}, tags);
    let images =  Images.find(query,{sort:{order:1},limit:1}).fetch();
    if(images.length>0) return images[0]._id;else return null;
  },
  contributors: function() {
    const self = this;
    var res = {images:[],contributors:[],count: Images.find({thumbnail:{$exists:1}}).count()};
    const raw = Images.rawCollection();
    const distinct = Meteor.wrapAsync(raw.distinct, raw);

    if (DEBUG) console.time("contributors");
    res.contributors = Meteor.users.find({_id:{$in:distinct('user')}}).fetch().map((u) => {
      var email = u.emails[0].address; //.replace(/[@\.]+/g,' ');
      var count = Images.find({user: u._id}).count();
      r = {
        id: u._id,
        email: email,
        banned: Roles.userIsInRole(u._id, ['banned']), //? '<a class="banning banned">banned</a>' : '<a class="banning ban">ban</a>',
        activeUser: self.userId == u._id,
        count: count,
      };
      return r;
    });
    if (DEBUG) console.timeEnd("contributors");

    return res;
  },
  createPageFromTemplates: function(pageTemplates) {
    if (this.isSimulation) {
      return {};
    } else {
      var defaultDuration = 1; //_.max(_.pluck(pageTemplates, 'duration'));

      var endDate = moment().add(defaultDuration, 'weeks'); //MyMoment(defaultDuration)

      return {
        title: "New page template",
        startDate: new Date(),
        endDate: endDate.toDate(),
        // templateIds: templateIds
      }
    }
  },
  imageCount: function(tags,userId) {
    const query = userId != undefined
      ? createQuery({user: userId, thumbnail: { $exists: 1 } }, tags)
      : createQuery({ thumbnail: { $exists: 1 } }, tags)
    ;
    return Images.find(query).count();
  },
  imageExists: function(md5hash) {
    var exists = Images.findOne({ md5hash: md5hash });
    return exists != undefined;
  },
  user_name: function(id) {
    // if(this.isSimulation) return {};
    // else {
      if (this.userId == id || Roles.userIsInRole(this.userId, ['admin'])) {
        var r = {};
        var user = Meteor.users.findOne({ _id: id });
        if (user) {
          var email = user.emails[0].address; //.replace(/[@\.]+/g,' ');
          r = {
            email: email,
            banned: '<a class="ban">ban</a>'
          };
          if (Roles.userIsInRole(id, ['banned'])) {
            r['banned'] = '<a class="banned">banned</a>';
          }
          // else
          // {
          //   return '<a class="ban">'+email+'</a>';
          // }
        }
        return r;
      } else {
        throw new Meteor.Error(403, 'Access Denied', 'only admins can ask for user names');
      }
    // }
  },
  ban: function(userid, ban) {
    if (Roles.userIsInRole(this.userId, ['admin'])) {
      // var email = Meteor.users.findOne({_id: userid}).emails[0].address;//.replace(/[@\.]+/g,' ');
      if (ban) {
        Roles.addUsersToRoles(userid, ['banned']);
        r = 'banned';
      } else {
        Roles.removeUsersFromRoles(userid, ['banned']);
        r = 'ban';
      }
      return r;
    } else {
      return 'only admins can ban users';
    }
  },
  src: function(id, tagSearch) {
    var img = Images.findOne({ _id: id });
    var res = {src: img ? img.src : '', prev:null,next:null};
    if(img && tagSearch){
      res.prev = Meteor.call('prevImage', img.order, tagSearch, this.userId);
      res.next = Meteor.call('nextImage', img.order, tagSearch, this.userId);
    }
    return res;
  },
  reorder(startup){
    if (Roles.userIsInRole(this.userId, ['admin']) || startup == 'startup') {
      let order = 1;
      if (DEBUG) console.time("updating order");
      Images.find({},{sort:{created:1}}).forEach((image) => {
        Images.update(image._id,{$set:{order: order++}});
      });
      if (DEBUG) console.timeEnd("updating order");
    }
  },
  getURL: function(url){
    try {
      var response = HTTP.call('GET', url, { npmRequestOptions: { encoding: null } });
      var content_type = response.headers['content-type'];
      var content_length = response.headers['content-length'];
      var name = url.split('/').pop();
      if (content_type.match(/^image/)) {
        if (DEBUG) console.log(`cropUploaderUrl ${content_type} of ${content_length} bytes`);
        return {
          size: content_length,
          name: name,
          type: content_type,
          data: "data:" + content_type + ";base64," + Buffer.from(response.content).toString('base64')
        }
      } else {
        throw new Meteor.Error(500, 'wrong content type', `the url "${url}" returned ${content_type}`);
      }
    } catch (e) {
      throw new Meteor.Error(e.statusCode, 'url wrong', `<p>the URL ${url} could not be accessed:</p><pre>${e}</pre>`);
    }
  },
  addPrivate(imageid, uid) {
    const image = Images.findOne(imageid);
    if (image) {
      if(image.user != this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
        throw new Meteor.Error(403, `${imageid} can not be modified by ${this.userId}`);
      } else {
        var r = 0;
        if (image.private) {
          r = Images.update(imageid, { $push: { private: uid } });
        } else {
          r = Images.update(imageid, { $set: { private: [uid] } });
        }
        return `added ${uid} to ${imageid} = ${r}`;
      }
    } else {
      throw new Meteor.Error(404, `addPrivate image ${imageid} does not exist`)
    }
  },
  delPrivate(imageid, uid) {
    const image = Images.findOne(imageid);
    if(image) {
      if (image.user != this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
        throw new Meteor.Error(403, `${imageid} can not be modified by ${this.userId}`);
      } else {
        var r = 0;
        if (image.private && image.private.length == 1) {
          r = Images.update(imageid, { $unset: { private: 1 } });
        } else {
          r = Images.update(imageid, { $pull: { private: uid } });
        }
        return `removed ${uid} from ${imageid} = ${r}`;
      }
    } else {
      throw new Meteor.Error(404, `delPrivate image ${imageid} does not exist`)
    }
  },
  addTag(imageid, tag) {
    const image = Images.findOne(imageid);
    if (image) {
      if (image.user != this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
        throw new Meteor.Error(403, `${imageid} can not be modified by ${this.userId}`);
      } else {
        var r = 0;
        r = Images.update(imageid, { $push: { tags: tag } });
        return `added ${tag} to ${imageid} = ${r}`;
      }
    } else {
      throw new Meteor.Error(404, `addTag image ${imageid} does not exist`)
    }
  },
  delTag(imageid, tag) {
    const image = Images.findOne(imageid);
    if (image) {
      if (image.user != this.userId || !Roles.userIsInRole(this.userId, 'admin')) {
        throw new Meteor.Error(403, `${imageid} can not be modified by ${this.userId}`);
      } else {
        var r = 0;
        r = Images.update(imageid, { $pull: { tags: tag } });
        return `deleted ${tag} to ${imageid} = ${r}`;
      }
    } else {
      throw new Meteor.Error(404, `delTag image ${imageid} does not exist`)
    }
  }
});

Meteor.startup(function(){
  Images._ensureIndex('created');
  Images._ensureIndex('tags');
  Images._ensureIndex('md5hash');
  Tags._ensureIndex('tag')
  var assets = EJSON.parse(Assets.getText('admin.json'));
  var admin_user = assets.admin_user;
  var admin = Meteor.users.findOne({username: admin_user.username});
  if(admin) {
    Roles.addUsersToRoles(admin._id, ['admin']);
  } else {
    id = Accounts.createUser(admin_user);
    Roles.addUsersToRoles(id, ['admin']);
  }
  if(Images.findOne({order:{$exists:0}})) {
    Meteor.call('reorder','startup')
  }
  //
  // turn tags into their own collection
  //
  if(UseTagsCollection) {
    if (Tags.find().count() == 0) {
      Images.find({ tags: { $exists: true } }).forEach((image) => {
        var tagids = [];
        image.tags.forEach((tag) => {
          var tig = Tags.upsert({ tag: tag }, { $set: { tag: tag } });
          if (tig.insertedId) {
            if (DEBUG) console.log(`${tag} = ${tig.insertedId}`, tig);
            tagids.push(tig.insertedId);
          } else {
            if (DEBUG) console.log(`${tag} already exists`);
            tagids.push(Tags.findOne({ tag: tag })._id);
          }
        })
        Images.update(image._id, { $set: { tagids: tagids } });
      })
    }
  }

  Images.find({ $where: "this.md5hash.length < 64" }).forEach(async function(image){
    const id = image._id;
    const hash = await makeHash(image.src);
    if (DEBUG) console.log(`${image._id} new hash ${hash.hash}`);
    Images.update(id, { $set: { md5hash: hash.hash } })
  })
});
