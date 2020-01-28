import { onPageLoad } from "meteor/server-render";

onPageLoad(sink => {
  const path = sink.request.url.path.split('/');
  if(path.length>2 && path[1] == 'image') {
    const id = path[2];
    if (id) {
      const img = Images.findOne(id);
      if (img) {
        const type = img.type.split('/').pop();
        console.log(`inject image ${id} meta tags`);
        const imgurl = `http://images.buzzledom.com/thumbnail/${id}/img.${type}`;
        sink.appendToHead(` <meta property="og:title" content="${img.name}"/>\n`);
        sink.appendToHead(` <meta property="og:type" content="${img.type}" />\n`);
        sink.appendToHead(` <meta property="og:url" content="https://images.buzzledom.com/image/${id}" />\n`);
        sink.appendToHead(` <meta property="og:image" content="${imgurl}" />\n`);
        sink.appendToHead(` <meta property="og:image:type" content="${img.type}">\n`);
        sink.appendToHead(` <meta property="og:image:width" content="200">\n`);
        sink.appendToHead(` <meta property="og:image:height" content="200">\n`);
        sink.appendToHead(` <meta property="og:image:alt" content="image thumbnail">\n`);
        sink.appendToHead(` <meta property="twitter:image" content="${imgurl}" />\n`);
        sink.appendToHead(` <meta property="twitter:card" content="summary_large_image"/>\n`);
      }
    }
  }
});

Meteor.startup(function(){
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
        const images = Images.find(query, options).fetch();
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
          const img = Images.findOne(id);
          if (img) {
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
  WebApp.connectHandlers.use('/download', async function (request, response, next) {
    switch (request.method) {
      case 'GET':
        const id = request.url.split('/').pop();
        if (id) {
          const img = Images.findOne(id);
          if (img) {
            if (img && img.private) {
              const message = 'This image is private';
              response.writeHead(403);
              response.end(message);
            } else {
              // replace the data:...;base64, crap
              const base64 = img.src.replace(/^data:.*;base64,/, "");
              // create a buffer from the data
              const buff = Buffer.from(base64, 'base64');
              const ext = img.type.split('/').pop();

              response.writeHead(200, {
                'Content-Length': buff.length,
                'Content-Type': img.type,
                'Content-Transfer-Encoding': 'binary',
                'Content-Disposition': `attachement; filename = "${id}.${ext}"`,
              });
              // Content-Disposition: attachement forces the browser to download
              // HTTP response.end takes a buffer as argument !!!!
              response.end(buff, 'utf8');
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
  WebApp.connectHandlers.use('/thumbnail', async function (request, response, next) {
    switch (request.method) {
      case 'GET':
        const url = request.url.split('/');
        const id = url.length>0 ? url[1] : 'null';// request.url.split('/').pop();
        if (id) {
          const img = Images.findOne(id);
          if (img) {
            console.log(`serve thumbnail for ${id} ${img.type}`)
            if (img && img.private) {
              const message = 'This image is private';
              response.writeHead(403);
              response.end(message);
            } else {
              // replace the data:...;base64, crap
              const base64 = img.thumbnail.replace(/^data:.*;base64,/, "");
              // create a buffer from the data
              const buff = Buffer.from(base64, 'base64');
              // const ext = img.type.split('/').pop();
              response.writeHead(200, {
                'Content-Length': buff.length,
                'Content-Type': img.type,
              });
              // HTTP response.end takes a buffer as argument !!!!
              response.end(buff, 'utf8');
            }
          } else {
            response.writeHead(404);
            response.end(`image with id ${id} not found`, url);
            console.log(`image with id ${id} not found`, url);
          }
        } else {
          response.writeHead(500);
          response.end('Please provide the image id');
        }
        break;
    }
  });
})
