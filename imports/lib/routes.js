// https://github.com/VeliovGroup/flow-router
import { FlowRouter, RouterHelpers } from 'meteor/ostrio:flow-router-extra';
import { LAYOUT } from '/imports/client/bootstrap';
global.FlowRouter = FlowRouter;


FlowRouter.route('/', {
  name: 'thumbnails',
  title: 'MongoDB Images',
  action(params) {
    this.render(LAYOUT, "thumbnails", {content: "thumbnails"});
  },
});

FlowRouter.route('/image/:id', {
  name: 'image',
  async action(params) {
    import '/imports/client/image';
    this.render(LAYOUT, "image", {content: "image"});
  }
});

FlowRouter.route('/rotate/:id', {
  name: 'rotate',
  async action(params) {
    import '/imports/client/rotate';
    this.render(LAYOUT, "rotate", { content: "rotate" });
  }
});

FlowRouter.route('/crop/:id', {
  name: 'crop',
  async action(params){
    import '/imports/client/crop';
    this.render(LAYOUT, "crop");
  }
});
// FlowRouter.route('/image/:id/src', {
//   name: 'imageSrc',
//   action: function(params) {
//     // console.log('image', params);
//     this.render(LAYOUT,"imageSrc");
//   }
// });

FlowRouter.route('/user/:user', {
  name: 'user_images',
  async action(params) {
    import '/imports/client/user';
    this.render(LAYOUT, "userImages", {content:"userImages"});
  }
});

FlowRouter.route('/admin/users', {
  name: 'admin_users',
  async action(params) {
    // import 'meteor/jamgold:accounts-admin-ui-bootstrap-3';
    import '/imports/client/admin/users';
    this.render(LAYOUT, "user_admin", {content: "user_admin"});
  },
});

FlowRouter.route('/admin/tags', {
  name: 'admin_tags',
  async action(params) {
    // import 'meteor/jamgold:accounts-admin-ui-bootstrap-3';
    import '/imports/client/admin/tags';
    this.render(LAYOUT, "tag_admin", { content: "tag_admin" });
  },
});

FlowRouter.route('*', {
  title: '404: Page not found',
  async action(params, queryParams) {
    // console.log(Meteor.isServer, params[0], queryParams);
    import '/imports/client/404';
    this.render(LAYOUT, '404', {
      queryParams: queryParams,
      url: params[0],
    });
  }
});