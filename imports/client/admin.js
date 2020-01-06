import './admin.html';

Template.admin.onRendered(function(){
  const instance = this;
});
Template.admin.helpers({
  isAdminUser: function () {
    return Roles.userIsInRole(Meteor.user(), ['admin']);
  }
});
