// https://github.com/VeliovGroup/flow-router
import { FlowRouter, RouterHelpers } from 'meteor/ostrio:flow-router-extra';
global.FlowRouter = FlowRouter;

FlowRouter.route('/', {
  name: 'thumbnails',
  title: 'MongoDB Images',
  action(params) {
    this.render('bootstrap', "thumbnails", {content: "thumbnails"});
  },
});

FlowRouter.route('/image/:id', {
  name: 'image',
  async action(params) {
    import '/imports/client/image';
    this.render('bootstrap', "image", {content: "image"});
  }
});

FlowRouter.route('/crop/:id', {
  name: 'crop',
  async action(params){
    import '/imports/client/crop';
    this.render('bootstrap', "crop");
  }
});
// FlowRouter.route('/image/:id/src', {
//   name: 'imageSrc',
//   action: function(params) {
//     // console.log('image', params);
//     this.render('bootstrap',"imageSrc");
//   }
// });

FlowRouter.route('/user/:user', {
  name: 'user_images',
  async action(params) {
    import '/imports/client/user';
    this.render('bootstrap', "userImages", {content:"userImages"});
  }
});

FlowRouter.route('/admin/users', {
  name: 'admin_users',
  async action(params) {
    // import 'meteor/jamgold:accounts-admin-ui-bootstrap-3';
    import '/imports/client/admin/users';
    this.render('bootstrap', "user_admin", {content: "user_admin"});
  },
});

FlowRouter.route('/admin/tags', {
  name: 'admin_tags',
  async action(params) {
    // import 'meteor/jamgold:accounts-admin-ui-bootstrap-3';
    import '/imports/client/admin/tags';
    this.render('bootstrap', "tag_admin", { content: "tag_admin" });
  },
});

FlowRouter.route('*', {
  title: '404: Page not found',
  action(params, queryParams) {
    // console.log(Meteor.isServer, params[0], queryParams);
    this.render('bootstrap', '404', {
      queryParams: queryParams,
      url: params[0],
    });
  }
});