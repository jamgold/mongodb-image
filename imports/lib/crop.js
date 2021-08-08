import { Meteor } from 'meteor/meteor'
import { makeHash } from '/imports/lib/hash';

export const CROP_DIMENSIONS = {x: 200, y: 200}

export const createCropCanvas = function(name) {
  let cropCanvas = document.createElement('canvas')
  cropCanvas.id = name ? name : 'crop_canvas'
  cropCanvas.width = CROP_DIMENSIONS.x
  cropCanvas.height = CROP_DIMENSIONS.x
  return cropCanvas
}

export const cropDrop = {
  _initialized: false,
  userId: null,
  debug: false,
  action: 'insert',
  file: null,
  files: [],
  filesIndex: 0,
  tags: [],
  private: [],
  reader: new FileReader(),
  preview: null,
  crop_img: null,
  cropCanvas: null,
  processing: new ReactiveVar(false),
  acceptedFileTypes: {"image/png":true,"image/jpeg":true,"image/jpg":true,"image/gif":true},
  processNext() {
    if(!this.processing.get()) {
      this.processing.set(true)
    }
    //
    // process next if there are more
    //
    if (this.filesIndex < this.files.length) {
      this.file = this.files.item(this.filesIndex++)
      this.reader.readAsDataURL(this.file)
    } else {
      this.filesIndex = 0
      this.files = []
      this.processing.set(false)
    }
  },
  init(){
    if (this._initialized) return
    if (this.debug) console.log(`cropDrop.init ${__filename}`)
    this.preview = document.getElementById('preview');
    if (!this.preview) {
      this.preview = document.createElement('div');
      this.preview.id = 'preview';
      if (this.debug) {
        console.log('creating #preview');
      } else {
        this.preview.classList.add('hidden');
      }
      document.body.appendChild(this.preview);
    }
    this.crop_img = document.getElementById('crop_img');
    if (!this.crop_img) {
      this.crop_img = document.createElement('img');
      this.crop_img.id = 'crop_img';
      if (this.debug) {
        console.log('creating #crop_img');
      } else {
        this.crop_img.classList.add('hidden');
      }
      this.preview.appendChild(this.crop_img);
    }

    this.cropCanvas = document.getElementById('crop_canvas');
    if (!this.cropCanvas) {
      this.cropCanvas = createCropCanvas('crop_canvas')
      if (this.debug) {
        console.log('creating #crop_canvas');
      } else {
        this.cropCanvas.classList.add('hidden');
      }
      this.preview.appendChild(this.cropCanvas);
    }
    //
    // define onload handler for image
    //
    this.crop_img.onload = function cropImgLoaded(e) {
      if (cropDrop.debug) console.log(`crop_img.onload ${e.timeStamp}`);
      var cropCanvas = cropDrop.cropCanvas;
      var cropDataUrl = this.src;
      var cc = {
        x: 0,
        y: 0,
        width: this.width,
        height: this.height,
      };
      if (cc.height > cc.width) {
        cc.height = cc.width;
      } else {
        cc.width = this.height;
      }
      // console.log('cropping',cc);

      var crop_ctx = cropCanvas.getContext("2d");
      //
      // resize original to a 100x100 square for the thumbnail
      //
      crop_ctx.drawImage(
        this,
        // original x/y w/h
        cc.x, cc.y,
        cc.width, cc.height,
        // reduce to canvas x/y w/h
        0, 0,
        cropDrop.cropCanvas.width, cropDrop.cropCanvas.height
      );
      var tags = TagSearch.get();//$('#new_image_tags').tagit('assignedTags');
      var private = [];//$('#new_image_users').tagit('assignedTags');
      if (private.length == 0) private = null;
      if (cropDrop.debug) {
        console.log(`cropImage cropped into cropCanvas ${cropDrop.file.name}`, tags, private);
        console.log(`cropDrop.crop_img.onload.action ${cropDrop.action}`)
      }
      switch(cropDrop.action) {
        case 'insert':
          Images.insert({
            src: cropDataUrl
            , thumbnail: cropDrop.cropCanvas.toDataURL()
            , size: cropDrop.file.size
            , name: cropDrop.file.name
            , type: cropDrop.file.type
            , lastModified: cropDrop.file.lastModified
            , md5hash: cropDrop.md5hash
            , tags: cropDrop.tags
            , private: cropDrop.private.length>0 ? cropDrop.private : null
          }, function imageInserted(error, id) {
            if (error) {
              console.error(error);
              Bootstrap3boilerplate.alert('danger', error.message, false);
            } else {
              Bootstrap3boilerplate.alert('info', `image ${id} inserted`);
            }
            cropDrop.processNext();
          });
        break

        case 'compare':
          Bootstrap3boilerplate.alert('info',`Please drop image into the propper area`)
        break

        default: Bootstrap3boilerplate.alert('info',`unknown cropDrop action ${cropDrop.action}`)
      }
    }
    //
    // define onload handler for reader to read in the file
    //
    this.reader.onload = (function (aImg) {
      return async function (e) {
        if (cropDrop.file.type in cropDrop.acceptedFileTypes) {
          cropDrop.md5hash = await makeHash(e.target.result);
          // console.log(cropDrop.file)
          if (cropDrop.debug) {
            console.log(`read file ${cropDrop.file.name} => ${cropDrop.md5hash}`);
            console.log(`cropDrop.reader.onload ${cropDrop.action}`)
          }
          switch(cropDrop.action) {
            case 'insert':
              Meteor.call('imageExists', cropDrop.md5hash, cropDrop.file.lastModified, function imageExits(err, exists) {
                if (exists) {
                  Bootstrap3boilerplate.alert('danger', `Image ${cropDrop.file.name} has been uploaded before <a href="/image/${exists}">${exists}</a>`, false);
                  cropDrop.processNext();
                } else {
                  // set crop_img.src so crop_img.onload fires which creates the thumbnail
                  // https://developer.mozilla.org/en-US/docs/Using_files_from_web_applications
                  aImg.src = e.target.result;
                }
              });
            break;

            case 'compare':
              Bootstrap3boilerplate.alert('info',`Please drop image into the propper area`)
            break

            default: Bootstrap3boilerplate.alert('danger',`unknown cropDrop action ${cropDrop.action}`)
          }
        } else {
          Bootstrap3boilerplate.alert('danger', `Image ${cropDrop.file.type} not of acceptable mime-type`, false);
          cropDrop.processNext();
        }
      };
    })(this.crop_img);

    window.addEventListener("dragover",function(e){
      e = e || event;
      e.preventDefault();
    },false)

    window.addEventListener("drop",function(e){
      e = e || event;
      e.preventDefault();
      if(cropDrop.userId) {
        if(!Roles.userIsInRole('banned')) {
          cropDrop.files = e.dataTransfer.files
          cropDrop.processNext()
        } else {
          console.info('cropDrop no insert because user is banned')
        }
      } else {
        console.log(`cropDrop no userId`)
      }
    },false)
    this._initialized = true
  }
}