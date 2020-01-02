import './tags.html';
import './tagit';
Template.tags.onCreated(function () {
  const instance = this;
  // console.log(`${instance.view.name}.onCreated`, instance.data);
});
Template.tags.onRendered(function () {
  //
  // https://github.com/aehlke/tag-it/blob/master/README.markdown
  //
  const instance = this;
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
      minLength: 2,
      // autoFocus: true,
      source(request, callback) {
        Meteor.call('tags', request.term, (err, res) => {
          var options = [];
          if (err) console.error(err); else options = res.map((t) => { return { label: t, value: t } });
          callback(options);
        });
      }
    },
  };

  const userId = Meteor.userId();

  // console.log(`${instance.view.name}.autorun ${userId}`);
  //
  // this only fires when rendering the search
  //
  if (instance.data.search) {
    //
    // if template was called with array of tags, use those
    //
    // options['availableTags'] = instance.data.tags;
    //
    // make sure we can only add existing tags
    //
    // options['beforeTagAdded'] = function (event, ui) {
    //   return instance.data.tags.indexOf(ui.tagLabel) >= 0;
    // };
    options['readOnly'] = false;
    options['afterTagAdded'] = function (event, ui) {
      if (useHook) {
        let tags = TagSearch.get();
        tags.push(ui.tagLabel);
        ImageStart = 0;
        Session.set('imageStart', 0);
        TagSearch.set(tags);
      }
    };
    options['afterTagRemoved'] = function (event, ui) {
      if (useHook) {
        let tags = TagSearch.get();
        ImageStart = 0;
        Session.set('imageStart', 0);
        TagSearch.set(tags.filter((tag) => { return ui.tagLabel != tag }));
      }
    };
  } else {
    //
    // only let logged-in users tag
    //
    options['readOnly'] = userId == null || userId == undefined;
    //
    // add autocomplete from meteor call
    //
    // options['autocomplete']['source'] = function (request, callback) {
    //   Meteor.call('tags', request.term, (err, res) => {
    //     var options = [];
    //     if (err) console.error(err); else options = res.map((t) => { return { label: t, value: t } });
    //     callback(options);
    //   });
    // };
    //
    // add a clicked tag to the search
    //
    options['onTagClicked'] = function (event, ui) {
      var tags = TagSearch.get();
      tags.push(ui.tagLabel);
      TagSearch.set(tags);
      FlowRouter.go('/');
    };
    // options['readOnly'] = userId == null;
    // options['beforeTagAdded'] = function(event, ui) {
    //   let readOnly = instance.$('#myTags').prop('readOnly');
    //   if(readOnly) {
    //     Bootstrap3boilerplate.alert('danger', "You don't have permission to add tags to this image", true);
    //     return false;
    //   } else {
    //     return true;
    //   }
    // }
    options['afterTagAdded'] = function (event, ui) {
      if (TagsImgId) {
        // console.log(`added ${ui.tagLabel} to ${TagsImgId}`,ui);
        DBImages.update(TagsImgId, { $push: { tags: ui.tagLabel } });
      }
    };
    options['beforeTagRemoved'] = function (event, ui) {
      // let userId = Meteor.userId();
      // console.log(`beforeTagRemoved ui.tagLabel ${ui.tagLabel} TagsImgId=${TagsImgId} userId=${userId} useHook=${useHook}`);
      if (TagsImgId == null) {
        return true;
      } else {
        // only logged in users can remove
        return userId != null;
      }
    };
    options['afterTagRemoved'] = function (event, ui) {
      if (TagsImgId) {
        // console.log(`removed ${ui.tagLabel} from ${TagsImgId}`,ui);
        DBImages.update(TagsImgId, { $pull: { tags: ui.tagLabel } });
      }
    };
  }
  instance.$("#myTags").tagit(options);
  //
  // render the search tags
  //
  if (instance.data.tagged) {
    useHook = false;
    instance.data.tagged.forEach(function (tag) {
      instance.$("#myTags").tagit("createTag", tag);
    });
    useHook = true;
  }

  let input = instance.findAll('.ui-autocomplete-input');
  if (input.length > 0) {
    input[0].spellcheck = false;
  }
});
