import './thumbnails.html';
import './thumbnail.js';
console.log(__filename);

Template.thumbnails.onCreated(function () {
  var template = this;
  template.tags = new ReactiveVar(null);
  template.pages = new ReactiveVar([]);
  // Meteor.call('tags',(err,res) => {
  //   if(err) console.error(err);else template.tags.set(res);
  // });

});
Template.thumbnails.onRendered(function () {
  var template = this;
  TagsImgId = null;
  template.autorun(function () {
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
});
Template.thumbnails.onDestroyed(function () {
  var template = this;
  if (template.debug) {
    console.log(this.view.name + '.destroyed');
  }
});
Template.thumbnails.helpers({
  pages() {
    const pages = Template.instance().pages.get();
    // console.log(`pages ${pages.length}`);
    return pages;
  },
  // helper to get all the thumbnails only called ONCE, even when the subscription for DBImages changes
  images() {
    // console.log('thumbnails helper');
    return DBImages.find({
      thumbnail: { $exists: 1 },
      // subscriptionId: ThumbnailsHandle.subscriptionId,
    }, {
      limit: ImagesPerPage,
      sort: { created: -1 }
    });
  },
  ready() {
    return ThumbnailsHandle.ready();
  },
  imageid() {
    var img = DBImages.findOne();
    return img ? img._id : null;
  },
  // tags(){
  //   return Template.instance().tags.get();
  // },
  tagged() {
    return TagSearch.get();
  }
});
Template.thumbnails.events({
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
        const page = document.querySelector(`.pagination li a[data-start="${start - 18}"]`);
        if (page) page.click();
      }
    }
  },
  'click .next'(e, t) {
    const current = document.querySelector('.pagination li.active');
    if (current) {
      const start = parseInt(current.dataset.start);
      // if (start > 0) {
      const page = document.querySelector(`.pagination li a[data-start="${start + 18}"]`);
      if (page) page.click();
      // }
    }
  },
  'click span.present-tags .tag'(event, instance) {
    var tags = TagSearch.get();
    const tag = event.currentTarget.dataset.tag;
    if (tags.indexOf(tag < 0)) {
      // console.log(`adding ${tag} to ${tags}`);
      tags.push(tag);
      TagSearch.set(tags);
      Session.set('imageStart', 0);
    }
  },
  // 'click .uploadModal'(e,t) {
  //   Bootstrap3boilerplate.Modal.show();
  // },
});

Template.thumbnails_data.onRendered(function () {
  const instance = this;
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
});

Tracker.autorun(function subscribeThumbnails() {
  Template.thumbnails.numberofimages = 0;
  if (ThumbnailsHandle) ThumbnailsHandle.stop();
  ThumbnailsHandle = Meteor.subscribe('thumbnails', Session.get('imageStart'), TagSearch.get(), function () {
    // console.log(`${DBImages.find().count()} thumbnails subscribed ${ThumbnailsHandle.subscriptionId}`);
  });
});
