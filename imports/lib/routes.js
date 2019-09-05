// import {FlowRouter} from 'meteor/kadira:flow-router';
import { FlowRouter, RouterHelpers } from 'meteor/ostrio:flow-router-extra';

FlowRouter.route('/', {
  name: 'thumbnails',
  title: 'MongoDB Images',
  action(params) {
    this.render(Bootstrap3boilerplate.layout, "thumbnails", {content: "thumbnails"});
  },
});

FlowRouter.route('/image/:id', {
  name: 'image',
  action: function(params) {
    // console.log('image', params);
    this.render(Bootstrap3boilerplate.layout, "image", {content: "image"});
  }
});

// FlowRouter.route('/image/:id/src', {
//   name: 'imageSrc',
//   action: function(params) {
//     // console.log('image', params);
//     this.render("imageSrc");
//   }
// });

FlowRouter.route('/user/:user', {
  name: 'user_images',
  action: function(params) {
    this.render(Bootstrap3boilerplate.layout, "userImages", {content:"userImages"});
  }
});

FlowRouter.route('/admin', {
  name: 'admin',
  async action(params) {
    import 'meteor/jamgold:accounts-admin-ui-bootstrap-3';
    this.render(Bootstrap3boilerplate.layout, "admin", {content: "admin"});
  },
});

