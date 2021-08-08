import { HTTP } from 'meteor/http'
import { check } from 'meteor/check'
import '/imports/server/rest'
import '/imports/publications'
import '/imports/methods'
import { makeHash } from '/imports/lib/hash'

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
  if (Roles.getAllRoles({fields:{_id:1}}).fetch().filter((r)=>{return r._id == 'banned'}).length == 0) {
    console.log('add role banned', Roles.createRole('banned'))
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

  Images.find({details:{$exists: 1}}).forEach((img) => {
    Images.update(img._id,{$set:{crop: img.details}});
    Images.update(img._id,{$unset:{details: 1}});
    console.log(`update ${img._id} details -> crop`);
  })
  console.log(`${process.env.ROOT_URL} started`)
});
