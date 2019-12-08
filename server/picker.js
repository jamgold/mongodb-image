//
// https://github.com/meteorhacks/picker
//
Picker.route('/api/json/images', function (params, request, response, next) {
  switch (request.method) {
    case 'GET':
      var json = EJSON.stringify(DBImages.find({ thumbnail: { $exists: 1 } }, {
        fields: {
          src: 0
        },
        transform: function (doc) {
          doc.created = doc.created.toString();
          doc.transformed = true;
          return doc;
        }
      }).fetch());

      response.writeHead(200, {
        'Content-Length': json.length,
        'Content-Type': 'application/json'
      });

      response.end(json);
      break;

    default:
      console.log(request);
  }
});
Picker.route('/api/json/image/:id', function (params, request, response, next) {
  // console.log(params);
  switch (request.method) {
    case 'GET':
      // GET /webhooks/stripe
      var json = EJSON.stringify(DBImages.findOne({ _id: params.id }, {
        transform: function (doc) {
          doc.created = doc.created.toString();
          doc.transformed = true;
          return doc;
        }
      }));

      response.writeHead(200, {
        'Content-Length': json.length,
        'Content-Type': 'application/json'
      });

      response.end(json);
      break;
  }
  // .post(function () {
  //   // https://github.com/mscdex/busboy
  //   // https://github.com/EventedMind/iron-router/issues/909
  //   // https://gist.github.com/cristiandley/9460398
  // })
  // .put(function () {
  //   // PUT /webhooks/stripe
  // })
});
