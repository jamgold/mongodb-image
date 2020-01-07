import './tag_admin.html';
console.log(__filename);
Template.tags_admin.onCreated(function(){
  const instance = this;
  instance.tags = ReactiveVar([]);
  instance.tag = ReactiveVar(null);
  Meteor.call('tags', (err, tags) => {
    if (err) Bootstrap3boilerplate.alert('danger', `${err.message}`, true);
    else instance.tags.set(tags);
  })
});
Template.tags_admin.onRendered(function(){
  const instance = this;
  instance.newName = instance.find('input.newtag');
  // console.log(`${instance.view.name}.onRendered`, instance.newName);
});
Template.tags_admin.onDestroyed(function(){
  const instance = this;
});
Template.tags_admin.helpers({
  tags(){
    return Template.instance().tags.get()
  },
  selectedTag(){
    return Template.instance().tag.get()
  },
  disabled(){
    return Template.instance().tag.get() == null ? 'disabled' : '';
  },
});
Template.tags_admin.events({
  'click .tag'(event, instance){
    instance.tag.set(event.currentTarget.dataset.tag);
    instance.newName.value = event.currentTarget.dataset.tag;
  },
  'click .reset'(event, instance) {
    instance.tag.set(null);
    instance.newName.value = '';
  },
  'click .update'(event, instance) {
    var oldName = instance.tag.get();
    var newName = instance.newName.value;
    if(oldName != newName) {
      Meteor.call('update_tag', oldName, newName, (err, res) => {
        if (err) Bootstrap3boilerplate.alert('danger', `${err.message}`, true);
        else {
          Bootstrap3boilerplate.alert('info', `Updated ${res.count} Images`, true);
          instance.tags.set(res.tags);
          instance.tag.set(null);
          instance.newName.value = '';
        }
      });
    } else {
      Bootstrap3boilerplate.alert('danger', `Old and new tag name must be different`, true);
    }
  },
});