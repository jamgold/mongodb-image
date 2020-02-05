// console.log(__filename);

const UseTagsCollection = false;
global.UseTagsCollection = UseTagsCollection;

Images = new Meteor.Collection('images', {
  transform: function(doc) {
    // console.log('transform: '+doc._id);
    return doc;
  }
});
ImagesPerPage = 18;

Tags = new Meteor.Collection('tags')