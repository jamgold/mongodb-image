import { Meteor } from 'meteor/meteor'
import { onPageLoad } from "meteor/server-render"
import { cookies, checkPrivateAccess } from '/imports/lib/loginToken'
//
// https://metatags.io/
// 
onPageLoad(sink => {
  const path = sink.request.url.path.split('/');
  const root = process.env.ROOT_URL
  let id = ''
  if(path.length>2) {
    // console.log(`onPageLoad sink "${path[1]}"`)
    switch (path[1]) {
      case 'image':
        id = path[2];
        if (id) {
          const img = Images.findOne(id);
          if (img) {
            const type = img.type.split('/').pop();
            // console.log(`inject image ${id} meta tags`);
            const imgurl = `${root}/thumbnail/${id}/img.${type}`;
            sink.appendToHead(` <meta property="og:title" content="${img.name}"/>\n`);
            sink.appendToHead(` <meta property="og:type" content="${img.type}" />\n`);
            sink.appendToHead(` <meta property="og:url" content="${root}/image/${id}" />\n`);
            sink.appendToHead(` <meta property="og:image" content="${imgurl}" />\n`);
            sink.appendToHead(` <meta property="og:image:type" content="${img.type}">\n`);
            sink.appendToHead(` <meta property="og:image:width" content="200">\n`);
            sink.appendToHead(` <meta property="og:image:height" content="200">\n`);
            sink.appendToHead(` <meta property="og:image:alt" content="image thumbnail">\n`);
            sink.appendToHead(` <meta property="twitter:image" content="${imgurl}" />\n`);
            sink.appendToHead(` <meta property="twitter:card" content="summary_large_image"/>\n`);
          }
        } else {
          console.log(`onPageLoad ${path[1]} could not find image ${id}`)
        }
      break

      case 'Xrandom':
        let query = { thumbnail:{ $exists:1} ,'$or':[ {private: {$exists:0}},{private: null} ]}
        if (url.length>0 && url[1]) query['tags'] = {'$all': url[1].split(',')}
        const ids = Images.find(query,{fields:{_id:1}}).fetch().map((i) => {return i._id})
        // console.log(EJSON.stringify(query), ids)
        id = random( ids )
        console.log(`onPageLoad.sink random: ${root}/image/${id}`, sink)
        if (id) {
          const img = Images.findOne(id);
          if (img) {
            const type = img.type.split('/').pop();
            // console.log(`inject image ${id} meta tags`);
            const imgurl = `${root}/thumbnail/${id}/img.${type}`;
            // console.log(`serve thumbnail for ${id} ${img.type}`)
            // replace the data:...;base64, crap
            const base64 = img.thumbnail.replace(/^data:.*;base64,/, "");
            // create a buffer from the data
            const buff = Buffer.from(base64, 'base64');
            // const ext = img.type.split('/').pop();
            sink.appendToHead(` <meta property="og:title" content="${img.name}"/>\n`);
            sink.appendToHead(` <meta property="og:type" content="${img.type}" />\n`);
            sink.appendToHead(` <meta property="og:url" content="${root}/image/${id}" />\n`);
            sink.appendToHead(` <meta property="og:image" content="${imgurl}" />\n`);
            sink.appendToHead(` <meta property="og:image:type" content="${img.type}">\n`);
            sink.appendToHead(` <meta property="og:image:width" content="200">\n`);
            sink.appendToHead(` <meta property="og:image:height" content="200">\n`);
            sink.appendToHead(` <meta property="og:image:alt" content="image thumbnail">\n`);
            sink.appendToHead(` <meta property="twitter:image" content="${imgurl}" />\n`);
            sink.appendToHead(` <meta property="twitter:card" content="summary_large_image"/>\n`);

            // sink.appendToHead(`Content-Length: ${buff.length}`)
            // sink.appendToHead(`Content-Type: ${img.type}`)
            sink.appendToHead(`Location: ${root}/image/${id}`)            
            // HTTP response.end takes a buffer as argument !!!!
            // sink.response.end(buff, 'utf8')
          }
        }
        break
    }
  }
});

const random = function randomArrayItem(a) {
  const i = Math.floor(Math.random() * a.length);
  return a.splice(i, 1).toString();
}

Meteor.startup(function(){
  WebApp.connectHandlers.use('/api/json/hello', (req, res, next) => {
    const json = {
      loginToken: null,
      hashedToken: null,
      userId: null,
      message: 'Success'
    }
    console.log(`request method ${req.method}`, req.cookies);
    json.loginToken = req.cookies?.meteor_login_token;
    // get the user
    if (Meteor.users) {
      // check to make sure, we've the loginToken,
      // otherwise a random user will fetched from the db
      if (json.loginToken) {
        json.hashedToken = Accounts._hashLoginToken(json.loginToken)
        var query = { 'services.resume.loginTokens.hashedToken': json.hashedToken }
        var options = { fields: { _id: 1 } }
        var user = Meteor.users.findOne(query, options);
        if (user) {
          json.userId = user._id
        } else {
          json.message = `/api/json/hello no user for ${json.loginToken}`
        }
      } else {
        json.message = `/api/json/hello meteor-login-token undefined`
      }
    } else {
      json.message = `/api/json/hello Meteor.users does not exist`
    }

    res.writeHead(200);
    res.end(`Hello world from: ${Meteor.release}` + EJSON.stringify(json, { indent: 4 }));
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
        const id = request.url.split('/').pop()
        console.log(`${request.method} image ${id}`)
        if (id) {
          cookies = request.Cookies;
          const img = Images.findOne(id);
          const loginToken = cookies.get('meteor_login_token');
          if (img) {
            if (checkPrivateAccess(img, loginToken)) {
              const message = `The image ${id} is private for ${loginToken}`;
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
        cookies = request.Cookies;
        if (id) {
          const img = Images.findOne(id);
          const loginToken = cookies.get('meteor_login_token');
          if (img) {
            // console.log(`serve thumbnail for ${id} ${img.type}`)
            if (checkPrivateAccess(img, loginToken)) {
              const message = `The image ${id} is private for ${loginToken}`;
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
  WebApp.connectHandlers.use('/random', async function (request, response, next) {
    // switch (request.method) {
      //case 'GET':
        const root = process.env.ROOT_URL
        const url = request.url.split('/')
        // const queryObject = url.parse(request.url,true).query;
        const tags = url.filter((u)=> u.match(/^tags=/))
        const noredirect = url.filter((u) => u=='noredirect')
        const html_code = noredirect.length ? 200 : 302
        // console.log( html_code )
        let query = { thumbnail:{ $exists:1} ,'$or':[ {private: {$exists:0}},{private: null} ]}
        if (tags && tags.length>0) {
          const t = tags[0].split('=')
          if (t.length>0)
          query['tags'] = {'$all': t[1].split(',')}
        }
        const ids = Images.find(query,{fields:{_id:1}}).fetch().map((i) => {return i._id})
        const id = random( ids )
        if (DEBUG) console.log(`connectHandler random ${root}/image/${id}`, EJSON.stringify(query), ids)
        if (id) {
          const img = Images.findOne(id);
          const loginToken = cookies.get('meteor_login_token');
          if (img) {
            // console.log(`serve thumbnail for ${id} ${img.type}`)
            // replace the data:...;base64, crap
            const base64 = img.thumbnail.replace(/^data:.*;base64,/, "");
            // create a buffer from the data
            const buff = Buffer.from(base64, 'base64');
            // const ext = img.type.split('/').pop();
            response.writeHead(html_code, {
              'Content-Length': buff.length,
              'Content-Type': img.type,
              'Location': `${root}/image/${id}`,
            });
            // HTTP response.end takes a buffer as argument !!!!
            response.end(buff, 'utf8');
          } else {
            response.writeHead(404);
            response.end(`image with id ${id} not found`, url);
            console.log(`image with id ${id} not found`, url);
          }
        } else {
          response.writeHead(500);
          response.end('Please provide the image id '+id);
        }
        // break;
    // }
  })
})
