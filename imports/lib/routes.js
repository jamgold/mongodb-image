// https://github.com/VeliovGroup/flow-router
import { FlowRouter, RouterHelpers } from 'meteor/ostrio:flow-router-extra';
import { FlowRouterMeta, FlowRouterTitle } from 'meteor/ostrio:flow-router-meta';
import { LAYOUT } from '/imports/client/bootstrap';
global.FlowRouter = FlowRouter;

ThumbnailsConfig = {
  MinHeight: null,
  TopMargin: 254,
  Height: 160,
  PerRow: 6
}
global.ThumbnailsConfig = ThumbnailsConfig;

FlowRouter.route('/', {
  name: 'thumbnails',
  title: 'Images',
  async action(params) {
    import '/imports/client/thumbnails';
    this.render(LAYOUT, "thumbnails", {content: "thumbnails"});
  },
});

FlowRouter.route('/image/:id', {
  name: 'image',
  waitOn(params) {
    // console.log(`image waitOn ${params.id}`);
    return Meteor.subscribe('image', params.id);
  },
  data(params) {
    return Images.findOne(params.id);
  },
  async action(params, query, image = {}) {
    import '/imports/client/image';
    // console.log(`image action ${image._id} ${image.tags}`);
    this.render(LAYOUT, "image", {image: image});
  },
  title(params, query, image) {
    return image.name;
  },
  // The machinery that creates link previews will not follow<meta> redirects, nor run JavaScript, so metadata must 
  // be available on the page without either occurring.Server - side redirects are followed, however, and are a 
  // good alternative.
  //
  // we handle this server-side with server-render
  //
  meta:{
    keywords: {
      name: 'keywords',
      itemprop: 'keywords',
      content(params, query, data = {}) {
        return data.tags;
      }
    },
    'og:title'(params, query, image){
      return image.name;
    },
    'og:url'(params, query, data = {}){
      return `https://images.buzzledom.com/image/${params.id}`;
    },
    'og:type'(params, query, image = {}){
      return image ? image.type : 'image/jpeg';
    },
    'og:image'(params, query, image = {}){
      const url = `https://images.buzzledom.com/thumbnail/${params.id}`;
      // console.log(url);
      return url;
    },
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

FlowRouter.route('/user/:user', {
  name: 'user_images',
  async action(params) {
    import '/imports/client/user';
    this.render(LAYOUT, "userImages", {content:"userImages"});
  }
});

const adminRoutes = FlowRouter.group({
  prefix: '/admin',
  name: 'admin',
  triggersEnter: [(context, redirect) => {
    if(!Roles.userIsInRole(Meteor.userId(), 'admin')){
      // console.log('running group triggers', adminRoutes);
      global.url403 = context.path;
      redirect('/403');
    }
  }]
});

adminRoutes.route('/users', {
  name: 'admin_users',
  async action(params) {
    // import 'meteor/jamgold:accounts-admin-ui-bootstrap-3';
    import '/imports/client/admin/users';
    this.render(LAYOUT, "user_admin", {content: "user_admin"});
  },
});

adminRoutes.route('/tags', {
  name: 'admin_tags',
  async action(params) {
    import '/imports/client/admin/tags';
    this.render(LAYOUT, "tag_admin", { content: "tag_admin" });
  },
});

FlowRouter.route('/compare', {
  name: 'compare',
  title: 'Compare Picture',
  async action(params) {
    import '/imports/client/compare';
    this.render(LAYOUT, "compare", { content: "compare" });
  },
});

FlowRouter.route('/admin/glyphicons', {
  name: 'glyphicons',
  async action(params) {
    // import 'meteor/jamgold:accounts-admin-ui-bootstrap-3';
    import '/imports/client/glyphicons';
    this.render(LAYOUT, "glyphicons", { content: "glyphicons" });
  },
})

FlowRouter.route('/403', {
  title: '403: Access Denied',
  async action(params, queryParams) {
    const self = this;
    import '/imports/client/404';
    // console.log(`403 ${url403}`, params, queryParams);
    if(global.url403) {
      this.render(LAYOUT, '403', {
        url: global.url403 ? global.url403 : 'undefined',
      });
    } else {
      FlowRouter.redirect('/')
    }
  }
})
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

global.flowRouterMeta = new FlowRouterMeta(FlowRouter);
