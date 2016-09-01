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

// //
// // http://nodejs.org/api/http.html#http_class_http_serverresponse
// //
// Router.route('/api/json/images', { where: 'server' })
//   .get(function () {
//     // GET /webhooks/stripe
//     // console.log(this);
//     var json = EJSON.stringify( DBImages.find({thumbnail:{$exists:1}},{
//       fields: {
//         src:0
//       },
//       transform: function(doc) {
//         doc.created = doc.created.toString();
//         doc.transformed = true;
//         return doc;
//       }
//     }).fetch() );

//     this.response.writeHead(200, {
//       'Content-Length': json.length,
//       'Content-Type': 'application/json'
//     });

//     this.response.end(json);
//   })
// ;

// Router.route('/api/json/image/:id', { where: 'server' })
//   .get(function () {
//     // GET /webhooks/stripe
//     var json = EJSON.stringify( DBImages.findOne({_id: this.params.id}, {
//       transform: function(doc) {
//         doc.created = doc.created.toString();
//         doc.transformed = true;
//         return doc;
//       }
//     }) );

//     this.response.writeHead(200, {
//       'Content-Length': json.length,
//       'Content-Type': 'application/json'
//     });

//     this.response.end(json);
//   })
//   // .post(function () {
//   //   // https://github.com/mscdex/busboy
//   //   // https://github.com/EventedMind/iron-router/issues/909
//   //   // https://gist.github.com/cristiandley/9460398
//   // })
//   // .put(function () {
//   //   // PUT /webhooks/stripe
//   // })
// ;
