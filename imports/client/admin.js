import './admin.html';

Template.admin.helpers({
  isAdminUser: function () {
    return Roles.userIsInRole(Meteor.user(), ['admin']);
  }
});
