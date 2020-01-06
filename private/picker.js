//
// https://github.com/meteorhacks/picker
//
// Picker.route('/api/json/images_picker', function (params, request, response, next) {
//   switch (request.method) {
//     case 'GET':
//       // console.log(params);
//       var thumbnail = false;
//       var query = { thumbnail: { $exists: 1 }, private:{$exists:0} };
//       var options = {
//           fields:{
//           src: 0,
//           thumbnail: 0,
//         },
//         limit: 100,
//       };
//       if('query' in params) {
//         if(params.query.tags) {
//           var tags = params.query.tags.split(',');
//           query['tags'] = {$in: tags}
//         }
//         if(params.query.thumbnail) {
//           delete options.fields.thumbnail;
//         }
//       }
//       // console.log(query);
//       const images = DBImages.find(query, options).fetch();
//       const json = EJSON.stringify({
//         images: images,
//         count: images.length,
//       });
//       response.writeHead(200, {
//         'Content-Length': json.length,
//         'Content-Type': 'application/json'
//       });
//       response.end(json);
//       break;
//     default:
//       console.log(request);
//   }
// });
// Picker.route('/api/json/image_picker/:id', function (params, request, response, next) {
//   // console.log(params);
//   switch (request.method) {
//     case 'GET':
//       // GET /webhooks/stripe
//       const img = DBImages.findOne(params.id);
//       if(img && img.private) {
//         const message = 'This image is private';
//         response.writeHead(403, {
//           'Content-Length': message.length,
//           'Content-Type': 'text/text'
//         })
//         response.end(message);
//       } else {
//         const json = EJSON.stringify(img);
//         response.writeHead(200, {
//           'Content-Length': json.length,
//           'Content-Type': 'application/json'
//         });
//         response.end(json);
//       }
//       break;
//   }
//   // .post(function () {
//   //   // https://github.com/mscdex/busboy
//   //   // https://github.com/EventedMind/iron-router/issues/909
//   //   // https://gist.github.com/cristiandley/9460398
//   // })
//   // .put(function () {
//   //   // PUT /webhooks/stripe
//   // })
// });
//
// req: https://nodejs.org/api/http.html#http_class_http_incomingmessage
// res: 
