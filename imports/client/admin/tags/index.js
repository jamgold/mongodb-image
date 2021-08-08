import './tag_admin.html';
import { InvalidTags } from '/imports/lib/tags'
// console.log(__filename);
Template.tags_admin.onCreated(function(){
  const instance = this;
  instance.tags = ReactiveVar([]);
  instance.tag = ReactiveVar('');
  instance.count = ReactiveVar('');
  Meteor.call('tags', (err, tags) => {
    if (err) Bootstrap3boilerplate.alert('danger', `${err.message}`, false);
    else instance.tags.set(tags);
  })
  instance.autorun(function(){
    const tag = instance.tag.get();
    if(tag) {
      Meteor.call('count', tag, (err,count) => {
        if(err) console.error(err);else instance.count.set(`(${count})`);
      })
    }
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
    const instance = Template.instance();
    const tag = instance.tag.get();
  
    return tag ? `${tag} ${instance.count.get()}` : '';
  },
  disabled(){
    return Template.instance().tag.get() == null ? 'disabled' : '';
  },
  InvalidTags(){
    return InvalidTags.join(', ')
  },
});
Template.tags_admin.events({
  'click .tag'(event, instance){
    instance.tag.set(event.currentTarget.dataset.tag);
    instance.newName.value = event.currentTarget.dataset.tag;
  },
  'click .reset'(event, instance) {
    instance.tag.set('');
    instance.count.set('');
    instance.newName.value = '';
  },
  'click .update'(event, instance) {
    var oldName = instance.tag.get();
    var newName = instance.newName.value;
    if(oldName != newName) {
      Meteor.call('update_tag', oldName, newName, (err, res) => {
        if (err) Bootstrap3boilerplate.alert('danger', `${err.message}`, false);
        else {
          Bootstrap3boilerplate.alert('info', `Updated ${res.count} Images`, true);
          instance.tags.set(res.tags);
          instance.tag.set(null);
          instance.newName.value = '';
        }
      });
    } else {
      Bootstrap3boilerplate.alert('danger', `Old and new tag name must be different`, false);
    }
  },
});