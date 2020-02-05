import './thumbnail.html';
console.log(__filename);

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
});
