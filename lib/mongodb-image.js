DBImages = new Meteor.Collection('dbimages', {
  transform: function(doc) {
    // console.log('transform: '+doc._id);
    return doc;
  }
});
ImagesPerPage = 18;

FlowRouter.route('/', {
  name: 'thumbnails',
  action: function(params) {
    BlazeLayout.render(Bootstrap3boilerplate.layout, {
      content: "thumbnails"
    });
  }
});

FlowRouter.route('/image/:id', {
  name: 'image',
  action: function(params) {
    // console.log('image', params);
    BlazeLayout.render(Bootstrap3boilerplate.layout, {
      content: "image",
      // params: params,
    });
  }
});

FlowRouter.route('/user/:user', {
  name: 'user_images',
  action: function(params) {
    BlazeLayout.render("Bootstrap3boilerplateFlowRouter", {
      // header: "header"
      content: "userImages"
    });
  }
});

FlowRouter.route('/admin', {
  name: 'admin',
  action: function(params) {
    BlazeLayout.render("Bootstrap3boilerplateFlowRouter", {
      // header: "header"
      content: "admin"
    });
  }
});
