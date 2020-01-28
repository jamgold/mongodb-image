console.log(__filename);

Images = new Meteor.Collection('dbimages', {
  transform: function(doc) {
    // console.log('transform: '+doc._id);
    return doc;
  }
});
ImagesPerPage = 18;
