import './tags.html'
import './thumbnails/tagit'
import { InvalidTags } from '/imports/lib/tags'
// const DEBUG = false

Template.tags.onCreated(function () {
  const instance = this;
  instance.doAutorun = true;
  // console.log(`${instance.view.name}.onCreated`, instance.data);
});
Template.tags.onRendered(function () {
  //
  // https://github.com/aehlke/tag-it/blob/master/README.markdown
  //
  const instance = this;
  const userId = Meteor.userId();
  instance.validTags = [];
  let useHook = true;

  // console.info(`${instance.view.name}.onRendered`,instance.data);

  let options = {
    placeholderText: instance.data.title,
    allowDuplicates: false,
    allowSpaces: false,
    caseSensitive: false,
    // readOnly: false,
    tagLimit: null,
    singleField: true,
    fieldName: 'tag',
    // defaultClasses: 'bootstrap label label-primary tagit-choice ui-corner-all',
    defaultClasses: 'bootstrap badge badge-primary tagit-choice ui-corner-all',
    existingEffect: 'shake',
    autocomplete: {
      delay: 0,
      minLength: 1,
      // autoFocus: true,
      source(request, callback) {
        // console.log('tag.search', request);
        Meteor.call('tags', request.term, (err, tags) => {
          var options = [];
          if (err) {
            console.error(err);
            Bootstrap3boilerplate.alert('danger', err.message, true);
          } else {
            // console.log(tags);
            instance.validTags = tags;
            options = tags.map((t) => { return { label: t, value: t } });
            // options = tags.map((t) => { return { label: t.tag, value: t._id } });
          }
          callback(options);
        });
      }
    },
  };

  // console.log(`${instance.view.name}.autorun ${userId}`);
  //
  // this only fires when rendering the search
  //
  // console.log(instance.data)
  if (instance.data.search) {
    //
    // if template was called with array of tags, use those
    //
    options.allowSpaces = true;
    // options.autocomplete.autoFocus = true;
    options.readOnly = false;
    //
    // make sure we can only add existing tags
    //
    options.beforeTagAdded = function (event, ui) {
      var valid = true;
      if(useHook){
        const tagit = instance.$(this).data('uiTagit');
        valid = InvalidTags.indexOf(ui.tagLabel) >=0 || instance.validTags.indexOf(ui.tagLabel) >= 0;
        if (!valid) tagit.tagInput.val('');
      }
      return valid;
    };
    //
    // add/remove tags to TagSearch ReactiveVar
    //
    options.afterTagAdded = function (event, ui) {
      if (useHook) {
        let tags = TagSearch.get();
        tags.push(ui.tagLabel);
        ImageStart = 0;
        Session.set('imageStart', 0);
        instance.doAutorun = false;
        TagSearch.set(tags);
        instance.doAutorun = true;
      }
    };
    options.afterTagRemoved = function (event, ui) {
      if (useHook) {
        let tags = TagSearch.get();
        ImageStart = 0;
        Session.set('imageStart', 0);
        instance.doAutorun = false;
        TagSearch.set(tags.filter((tag) => { return ui.tagLabel != tag }));
        instance.doAutorun = true;
      }
    };
  } else {
    //
    // only let logged-in users tag
    //
    // console.log(`${userId} ${instance.data.img.user}`)
    if( userId && userId == instance.data.img.user ) {
      options.readOnly = false;
    } else {
      options.readOnly = true;
    }
    // options.readOnly = userId == null || userId == undefined;
    //
    // add a clicked tag to the search
    //
    options.onTagClicked = function (event, ui) {
      var tags = TagSearch.get();
      tags.push(ui.tagLabel);
      TagSearch.set(tags);
      Session.set('imageStart', 0);
      // FlowRouter.go('/');
    };
    // options['beforeTagAdded'] = function(event, ui) {
    //   let readOnly = instance.$('#tagSearch').prop('readOnly');
    //   if(readOnly) {
    //     Bootstrap3boilerplate.alert('danger', "You don't have permission to add tags to this image", true);
    //     return false;
    //   } else {
    //     return true;
    //   }
    // }
    options.afterTagAdded = function (event, ui) {
      if (TagsImgId) {
        if (DEBUG) console.log(`added ${ui.tagLabel} to ${TagsImgId}`,ui);
        // Images.update(TagsImgId, { $push: { tags: ui.tagLabel } });
        Meteor.call('addTag', TagsImgId, ui.tagValue, (err, res) => {
          if (err) {
            console.error(err);
            Bootstrap3boilerplate.alert('danger', err.message, false);
          }
          else {
            Bootstrap3boilerplate.alert('success', res, true);
          }
        })
      }
    };
    options.beforeTagRemoved = function (event, ui) {
      // let userId = Meteor.userId();
      // console.log(`beforeTagRemoved ui.tagLabel ${ui.tagLabel} TagsImgId=${TagsImgId} userId=${userId} useHook=${useHook}`);
      if (TagsImgId == null) {
        return true;
      } else {
        // only logged in users can remove
        return userId != null;
      }
    };
    options.afterTagRemoved = function (event, ui) {
      if (TagsImgId) {
        if (DEBUG) console.log(`removed ${ui.tagLabel} from ${TagsImgId}`,ui);
        // Images.update(TagsImgId, { $pull: { tags: ui.tagLabel } });
        Meteor.call('delTag', TagsImgId, ui.tagValue, (err, res) => {
          if (err) {
            console.error(err);
            Bootstrap3boilerplate.alert('danger', err.message, false);
          }
          else {
            Bootstrap3boilerplate.alert('success', res, true);
          }
        })
      }
    };
  }
  instance.$("#tagSearch").tagit(options);
  //
  // render the search tags
  //
  if (instance.data.search) {
    instance.autorun(function tagitTagSearch() {
      const tagged = TagSearch.get();
      if (instance.doAutorun && tagged.length>0) {
        const existing = instance.$("#tagSearch").tagit('assignedTags');
        if(DEBUG) console.log(`tagitTagSearch`, tagged, existing);
        useHook = false;
        tagged.forEach(function (tag) {
          // console.log(`createTag ${tag}`)
          if(existing.indexOf(tag)<0)
            instance.$("#tagSearch").tagit("createTag", tag);
        });
        useHook = true;
      }
    })
  } else {
    // instance.autorun(function tagidTagField(c){
    //   // const params = FlowRouter.current().params;
    //   const data = Template.currentData()
    //   if(!c.firstRun){
    //     console.log(c,data)
    //   }
    // })
  }

  // if (instance.data.tagged) {
  //   useHook = false;
  //   instance.data.tagged.forEach(function (tag) {
  //     // console.log(`createTag ${tag}`)
  //     instance.$("#tagSearch").tagit("createTag", tag);
  //   });
  //   useHook = true;
  // }

  let input = instance.findAll('.ui-autocomplete-input');
  if (input.length > 0) {
    input[0].spellcheck = false;
  }
});
