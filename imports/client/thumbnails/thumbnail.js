import './thumbnail.html';
// console.log(__filename);

Template.thumbnail.onRendered(function () {
  const instance = this;
  instance.find('div.off').classList.remove('off');
  // console.log(`${instance.view.name}.onRendered`, instance.data);
});
Template.thumbnail.onDestroyed(function () {
  const instance = this;
  // instance.find('div.off').classList.add('off');
});
Template.thumbnail.helpers({
  // cssclasses(){
  //   console.log(this);
  // }
  cropped(){
    const image = this;
    const instance = Template.instance();
    const cropped = 'details' in image && image.details.zoom;
    const tagged = instance.data.tagged && instance.data.tagged.indexOf('uncropped') >= 0;
    if (! tagged) {
      if(cropped) console.log(image.details);
      return true;
    } else {
      // console.log(cropped, image.details, tagged);
      return cropped;
    }
  }
});
Template.thumbnail.events({
  'click a.thumbnail'(e,t) {
    // e.preventDefault()
    const id = e.currentTarget.dataset.imageId
    if (DEBUG) console.log(`a.thumbnail ${id}`, e.currentTarget.href)
    // FlowRouter.go(`/image/${id}`)
  },
  // 'click img.img-fluid'(e, t) {
  //   e.preventDefault()
  //   console.log(`img-fluid`, e.currentTarget.parentNode)
  //   // e.currentTarget.parentNode.click()
  // },
})
