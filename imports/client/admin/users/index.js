import 'meteor/jamgold:accounts-admin-ui-bootstrap-3';
import './user_admin.html';
// console.log(__filename);
// Template.user_admin.onRendered(function () {
//   const instance = this;
// });
// Template.user_admin.helpers({
//   isAdminUser: function () {
//     return Roles.userIsInRole(Meteor.user(), ['admin']);
//   }
// });

Template.accountsAdmin.onCreated(function(){
  const instance = this;
  instance.contributors = new ReactiveVar({});
  Meteor.call('contributors', function (err, data){
    if(err){
      console.error(err);
    } else {
      var contributors = {};
      data.contributors.forEach(function(c){
        contributors[c.id] = c;
      });
      instance.contributors.set(contributors);
      // console.log(contributors);
    }
  });
});
Template.accountsAdmin.onRendered(function(){
  const instance = this;
  instance.$('.btn-dark').switchClass('btn-dark', 'btn-outline-secondary');
});
Template.accountsAdmin.onDestroyed(function(){
  const instance = this;
});
Template.accountsAdmin.helpers({
  contentColumns() {
    return [
      'Images',
    ];
  },
  contentColumn(column, user) {
    // console.log(`${column} ${user._id}`,column);
    const contributors = Template.instance().contributors.get();
    var r = [];
    switch (column) {
      case 'Images':
        if (contributors[user._id]) {
          r.push(`<a href='/user/${user._id}'>${contributors[user._id].count}</a>`);
        } else {
          r.push('&nbsp;')
        }
        break;
      default:
        r.push('Unknow Column');
    }
    return r.join('');
  },
});
Template.accountsAdmin.events({
});