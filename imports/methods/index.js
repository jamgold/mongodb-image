import { Meteor } from 'meteor/meteor'
import { check } from 'meteor/check'
import createQuery from '/imports/lib/query'

const rawImages = Images.rawCollection()
const ImagesDistinct = Meteor.wrapAsync(rawImages.distinct, rawImages)
const lcSort = (a,b) => { if (a && b) return a.toLowerCase().localeCompare(b.toLowerCase()); else return 0 }

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
  contributors() {
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
    /*
  createPageFromTemplates(pageTemplates) {
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
  */
  imageCount(tags,userId) {
    const query = userId != undefined
      ? createQuery({ user: userId, thumbnail: { $exists: 1 } }, tags)
      : createQuery({thumbnail:{$exists:1},$or:[{private:{$exists:0}},{private:{$type:10}},{private:{$in:[this.userId]}},{user:this.userId}]}, tags)
      // createQuery({ thumbnail: { $exists: 1 } }, tags)
    ;
    return Images.find(query).count();
  },
  imageExists(md5hash, lastModified) {
    const exists = Images.findOne({ md5hash: md5hash });
    if (lastModified && exists && !exists.lastModified) {
      Images.update(exists._id,{$set:{lastModified: lastModified}})
    }
    return exists ? exists._id : false;
  },
  user_name(id) {
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
  ban(userid, ban) {
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
  src(id, tagSearch) {
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
  getURL(url){
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
  //
  // how to have an async method
  //
  asyncTest: async function(param1){
    try {
      check(param1, String);
      //...
      //await ....
    } catch(error) {
      throw new Meteor.Error(500, error);
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
      if (image.user == this.userId || Roles.userIsInRole(this.userId, 'admin')) {
        var r = 0;
        r = Images.update(imageid, { $push: { tags: tag } });
        return `added ${tag} to ${imageid} = ${r}`;
      } else {
        throw new Meteor.Error(403, `${imageid} can not be modified by ${this.userId}`);
      }
    } else {
      throw new Meteor.Error(404, `addTag image ${imageid} does not exist`)
    }
  },
  delTag(imageid, tag) {
    const image = Images.findOne(imageid);
    if (image) {
      if (image.user == this.userId || Roles.userIsInRole(this.userId, 'admin')) {
        var r = 0;
        r = Images.update(imageid, { $pull: { tags: tag } });
        return `deleted ${tag} to ${imageid} = ${r}`;
      } else {
        throw new Meteor.Error(403, `${imageid} can not be modified by ${this.userId}`);
      }
    } else {
      throw new Meteor.Error(404, `delTag image ${imageid} does not exist`)
    }
  },
  tags(search){
    // const raw = Images.rawCollection();
    // const distinct = Meteor.wrapAsync(raw.distinct, raw);
    if(UseTagsCollection) {
      const tags = Tags.find({ tag: { $regex: search } }, { sort: { tag: 1 } }).fetch()
      if (DEBUG) console.log(`${search} => ${tags}`);
      return tags
    } else {
      // filter out null
      let tags = ImagesDistinct('tags').filter((t) => t)
      if(search == undefined){
        return tags.sort(lcSort)
      } else {
        const s = search != undefined ? search.toLowerCase() : search
        return tags.filter((tag) => { return tag && tag.toLowerCase().includes(s) }).sort(lcSort)
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
});
