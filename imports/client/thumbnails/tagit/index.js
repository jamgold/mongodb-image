import { EJSON } from 'meteor/ejson';
import 'jquery-ui-dist/jquery-ui.min.js';
import 'jquery-ui-dist/jquery-ui.min.css';
import 'jquery-ui-dist/jquery-ui.theme.min.css';
import './jquery.tag-it.js';
import './jquery.tagit.css';
// import './tagit.ui-zendesk.css';
import './index.html';
// console.log(__filename);

Template.tagit.onCreated(function () {
  const instance = this;
  instance.id = 'tagit';
  instance.options = {};
  if(instance.data.id) instance.id = instance.data.id;
  if(instance.data.options) {
    if(typeof instance.data.options == 'string'){
      try{
        instance.options = EJSON.parse(instance.data.options);
      }catch(err){
        instance.options = {};console.error('Error parsing tagit options',err);
      }
    }else{
      instance.options = instance.data.options;
    }
  }
  if(instance.data.title) {
    instance.options.placeholderText = instance.data.title;
  }
  // console.log(`${instance.view.name}.onCreated`, instance)
});
Template.tagit.onRendered(function () {
  const instance = this;
  const tagit = instance.$(`#${instance.id}`);
  // get any assigned tags
  const tags = tagit.val().split(',');
  // clear tags before instantiating tagit
  if(instance.options.restoreTags != undefined) {
    tagit.val('');
  }
  try{
    tagit.tagit(instance.options);
  } catch(err){
    console.error('Error instantiating tagit with options', instance.options, err);
    tagit.tagit();
  }
  instance.tagit = tagit.data('uiTagit');
  instance.tagit._trigger('restoreTags', null, {tags: tags});
});
Template.tagit.onDestroyed(function () {
  const instance = this;
  instance.tagit.destroy();
});
Template.tagit.helpers({
  elementId(){
    return Template.instance().id;
  },
});
Template.tagit.events({
  'click .tag'(e,t){
    if(DEBUG) console.log(`.tag`,e.currentTarget)
  }
});
