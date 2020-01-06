WebApp.connectHandlers.use('/api/json/hello', (req, res, next) => {
  console.log(`request method ${req.method}`, req.cookies);
  res.writeHead(200);
  res.end(`Hello world from: ${Meteor.release}` + EJSON.stringify(req.query, { indent: 4 }));
});
WebApp.connectHandlers.use('/api/json/images', (request, response, next) => {
  switch (request.method) {
    case 'GET':
      // console.log(params);
      var thumbnail = false;
      var query = { thumbnail: { $exists: 1 }, private: { $exists: 0 } };
      var options = {
        fields: {
          src: 0,
          thumbnail: 0,
        },
        limit: 100,
      };
      if ('query' in request) {
        if (request.query.tags) {
          var tags = request.query.tags.split(',');
          query['tags'] = { $in: tags }
        }
        if (request.query.thumbnail) {
          delete options.fields.thumbnail;
        }
      }
      // console.log(query);
      const images = DBImages.find(query, options).fetch();
      const json = EJSON.stringify({
        count: images.length,
        images: images,
      });

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
WebApp.connectHandlers.use('/api/json/image', (request, response, next) => {
  switch (request.method) {
    case 'GET':
      const id = request.url.split('/').pop();
      if (id) {
        const img = DBImages.findOne(id);
        if(img) {
          if (img && img.private) {
            const message = 'This image is private';
            response.writeHead(403);
            response.end(message);
          } else {
            const json = EJSON.stringify(img);

            response.writeHead(200, {
              'Content-Length': json.length,
              'Content-Type': 'application/json'
            });
            response.end(json);
          }
        } else {
          response.writeHead(404);
          response.end(`image with id ${id} not found`);
        }
      } else {
        response.writeHead(500);
        response.end('Please provide the image id');
      }
      break;
  }
});