import {FlowRouter} from 'meteor/kadira:flow-router';

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
