import { Meteor } from 'meteor/meteor'
import createQuery from '/imports/lib/query'

Meteor.publish('thumbnails', function(imageStart, tags, limit){
  const self = this;
  //
  // get all images that have a thumbnail and private doesn't exist 
  // or is null or contains the user or owned by the user
  //
  let query = createQuery({thumbnail:{$exists:1},$or:[{private:{$exists:0}},{private:{$type:10}},{private:{$in:[this.userId]}},{user:self.userId}]}, tags);
  // console.log(`publish.thumbnails`, tags)
  // console.log(`publish.thumbnails ${EJSON.stringify(query)}`)
  imageStart = imageStart == undefined ? 0 : imageStart
  // console.info('thumbnails start:'+ imageStart+' subscriptionId:'+self._subscriptionId);
  const images = Images.find(query,{
    fields: {src:0}
    ,sort:{created: -1}
    ,skip: imageStart
    ,limit: limit ? limit : ImagesPerPage
  })
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
