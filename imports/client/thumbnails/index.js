import './thumbnails.html'
import './thumbnail.js'
import isMobile from 'ismobilejs/src/index.ts'
import { TAG_QUERY_SEPARATOR, tagQuery } from '/imports/lib/query'
// console.log(__filename);

ImagesDiv = null
Mobile = navigator.userAgent.match(/Mobile/)

ThumbnailsConfig = {
  MinHeight: null,
  TopMargin: 50,
  Height: 120,
  PerRow: 6,
}
global.ThumbnailsConfig = ThumbnailsConfig;

const recalculateImagesPerPage = function(){
  Template.thumbnails.ready.set(false)
  ImagesPerPage = 20
  Template.thumbnails.ready.set(true)
  return
  if(ImagesDiv && !Session.get('isMobile')) {
    Template.thumbnails.ready.set(false);
    const main = document.getElementsByTagName('main')[0]
    const X = main.clientHeight
    // ThumbnailsConfig.TopMargin = ImagesDiv.offsetTop
    // document.getElementById('images').style.minHeight = `${X + 60}px`
    ImagesPerPage = parseInt((X - ThumbnailsConfig.TopMargin) / ThumbnailsConfig.Height) * ThumbnailsConfig.PerRow
    if(ImagesPerPage>100) ImagesPerPage = 100
    Template.thumbnails.ready.set(true)
    console.info(`${X} ImagesPerPage ${ImagesPerPage}`)
  } else {
    Template.thumbnails.ready.set(false);
    ImagesPerPage = 18
    Template.thumbnails.ready.set(true)
  }
}

Template.thumbnails.ready = new ReactiveVar(false);
Template.thumbnails.onCreated(function () {
  const template = this;
  template.pages = new ReactiveVar([]);
});
Template.thumbnails.onRendered(function () {
  var template = this;
  TagsImgId = null;
  ImagesDiv = document.getElementById('images');

  // recalculateImagesPerPage();

  template.autorun(function thumbnailsAutorun() {
    ImageStart = parseInt(ImageStart);
    // console.log(`${template.view.name}.onCreated.autorun ImageStart=${ImageStart}`);
    var counter = Session.get('imageCount');
    var pages = [];//['<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true" >&laquo;</span> <a>'];
    var page = 1;
    const number = ImagesPerPage;
    template.$('.pagination li').removeClass('active');

    for (var i = 0; i < counter; i += number) {
      var c = i == ImageStart ? 'active' : '';
      // console.log(`${template.view.name}.onCreated.autorun ${i} ${c}`);
      // pages.push(`<li ${c} data-start='${i}'><a data-start='${i}'>${page}</a></li>`);
      pages.push({
        page: page,
        start: i,
        class: c
      })
      page++;
    }
    // pages.push('<li class="page-item"><a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a></li>');
    template.pages.set(pages);
    template.$(`li[data-start="${ImageStart}"]`).addClass('active');
  });

  Session.set('isMobile', isMobile(navigator.userAgent).any)
});
Template.thumbnails.onDestroyed(function () {
  var template = this;
  if (template.debug) {
    console.log(this.view.name + '.destroyed');
  }
  ImagesDiv = null;
});
Template.thumbnails.helpers({
  pages() {
    const pages = Template.instance().pages.get();
    // console.log(`pages ${pages.length}`);
    return pages;
  },
  // helper to get all the thumbnails only called ONCE, even when the subscription for Images changes
  images() {
    // console.log('thumbnails helper');
    return Images.find({
      thumbnail: { $exists: 1 },
      // subscriptionId: ThumbnailsHandle.subscriptionId,
    }, {
      limit: ImagesPerPage,
      sort: { created: -1 }
    });
  },
  ready() {
    return Template.thumbnails.ready.get() && ThumbnailsHandle && ThumbnailsHandle.ready();
  },
  imageid() {
    var img = Images.findOne();
    return img ? img._id : null;
  },
  // tags(){
  //   return Template.instance().tags.get();
  // },
  tagged() {
    return TagSearch.get();
  },
  canUpload(){
    const userId = Meteor.userId()
    return userId && !Roles.userIsInRole('banned')
  },
  showPrevNext(){
    const pages = Template.instance().pages.get();
    return pages && pages.length>1;
  },
});
Template.thumbnails.events({
  'shown.bs.collapse #tagSearchCollaps, hidden.bs.collapse #tagSearchCollaps'(e, t) {
    const type = e.type
    if (type == 'shown') {
      Session.set('tagCollapser','<span title="Hide" class="glyphicon glyphicon-eye-close" aria-hidden="true"></span>')
      window.scrollTo(0,0)
    } else {
      Session.set('tagCollapser', '<span title="Show" class="glyphicon glyphicon-eye-open" aria-hidden="true"></span>')
    }
  },
  'click .pagination li a.page'(e, t) {
    // console.log('click .pagination li a');
    t.$('.pagination li').removeClass('active');
    ImageStart = parseInt(e.currentTarget.dataset.start);
    e.currentTarget.parentNode.classList.add('active');
    Session.set('imageStart', ImageStart);
  },
  'click .prev'(e, t) {
    const current = document.querySelector('.pagination li.active');
    if (current) {
      const start = parseInt(current.dataset.start);
      if (start > 0) {
        const page = document.querySelector(`.pagination li a[data-start="${start - ImagesPerPage}"]`);
        if (page) page.click();
      }
    }
  },
  'click .next'(e, t) {
    const current = document.querySelector('.pagination li.active');
    if (current) {
      const start = parseInt(current.dataset.start);
      // if (start > 0) {
      const page = document.querySelector(`.pagination li a[data-start="${start + ImagesPerPage}"]`);
      if (page) page.click();
      // }
    }
  },
  'click span.present-tags .tag'(event, instance) {
    event.preventDefault();
    var tags = TagSearch.get();
    const tag = event.currentTarget.dataset.tag;
    if (tags.indexOf(tag < 0)) {
      // console.log(`adding ${tag} to ${tags}`);
      tags.push(tag);
      TagSearch.set(tags);
      Session.set('imageStart', 0);
    }
  },
});

Template.thumbnails_data.onRendered(function () {
  const instance = this;
  if(Session.get('isMobile')) {
    const hash = Session.get('navbarUrl').replace('/#', '');//window.location.hash.replace('#', '');
    if (hash) {
      Meteor.setTimeout(function () {
        const img = instance.find(`img[imageid="${hash}"]`);
        if (img) {
          const top = img.getBoundingClientRect().top;
          if (top) {
            // console.log(`${instance.view.name}.onRendered ${hash} ${top}`);
            window.scrollTo(0, top - 60);
          }
        }
      }, 500)
    } else {
      console.log(`${instance.view.name}.onRendered no hash ${window.location.hash}`);
    }
  }
  // document.getElementsByTagName('body')[0].style.height = ''
  // Bootstrap3boilerplate.alert('info',   document.getElementsByTagName('body')[0].style.overflow )
});

Tracker.autorun(function tagSearch(c) {
  const tags = TagSearch.get()
  // const path = FlowRouter.current().path
  const firstRun = c.firstRun
  const recomputing = c._recomputing
  const invalidated = c.invalidated
  if(!firstRun && recomputing) {
    if(tags.length > 0) {
      if (DEBUG) console.log(`tagSearch.autorun tags=${tags}, length=${tags.length}, firstRun=${firstRun}, invalidated=${invalidated}, recomputing=${recomputing}`,c)
      FlowRouter.go('/',{}, {tags: tagQuery(tags) } )
    } else {
      // console.log(`tagSearch goto /`)
      FlowRouter.go('/')
    }
  }
})

//
// define this outside of autorun since it triggers
//
// $uploadTags = $('#new_image_tags')

Tracker.autorun(function uploadTagsAutorun(c) {
  const tags = TagSearch.get()
  const firstRun = c.firstRun
  const recomputing = c._recomputing
  const invalidated = c.invalidated
  // const $uploadTags = $(document.getElementById('new_image_tags'))
  const $uploadTags = $('#new_image_tags')
  if ($uploadTags && (firstRun || recomputing || invalidated)) {
    let uTags = $uploadTags.tagit('assignedTags')
    if (!Array.isArray(uTags)) uTags = []
    if(tags.sort().join(',') != uTags.sort().join(',') ) {
      if (DEBUG) console.log(`uploadTagsAutorun tags=${tags} (${tags.length}),uTags=${uTags}, invalidated=${invalidated}, recomputing=${recomputing}`, $uploadTags)
      if (tags.length > 0) {
        $uploadTags.tagit('removeAll')
        tags.forEach((tag) => {
          if (DEBUG) console.log(`uploadTags createTag ${tag}`)
          $uploadTags.tagit('createTag', tag)
        })
      } else {
        if (DEBUG) console.log(`uploadTagsAutorun removeAll`)
        $uploadTags.tagit('removeAll')
      }
    }
  }
})
Tracker.autorun(function subscribeThumbnails(c) {
  Template.thumbnails.numberofimages = 0
  if (ThumbnailsHandle) ThumbnailsHandle.stop()
  if (DEBUG) console.log(`autorun.subscribeThumbnails`)
  ThumbnailsHandle = Meteor.subscribe('thumbnails', Session.get('imageStart'), TagSearch.get(), ImagesPerPage, function () {
    if(ImagesDiv) {
      const height = ImagesDiv.clientHeight
      const MinHeight = ImagesDiv.dataset.MinHeight
      // only set new min-height if it has changed
      if(MinHeight == undefined || MinHeight != height) {
        // console.log(height, MinHeight)
        ThumbnailsConfig.MinHeight = height
        // ImagesDiv.dataset.MinHeight = ThumbnailsConfig.MinHeight
        // ImagesDiv.style['min-height'] = `${ThumbnailsConfig.MinHeight}px`
      }
    }
    Template.thumbnails.ready.set(true)
  });
});

const doneResizing = function(){
  recalculateImagesPerPage();
}

// var resizeId;
// $(window).resize(function(e){
//   clearTimeout(resizeId);
//   resizeId = setTimeout(doneResizing, 500);
// });

Meteor.startup(function startupQuery(){
  const query = FlowRouter.current().queryParams
  if (query && 'tags' in query && query.tags) {
    const tags = query.tags
    console.log(`startupQuery tags=${tags}`)
    TagSearch.set(unescape(tags).split(TAG_QUERY_SEPARATOR))
  }
})