import { Meteor } from "meteor/meteor"
import { Cookies } from 'meteor/ostrio:cookies'
const DEBUG = false

if(Meteor.isClient) {
  Tracker.autorun(function loginTokenAutorun(){
    const userId = Meteor.userId();
    const cookies = new Cookies();
    const opts = {path:'/', sameSite: 'Lax', secure: false};
    if(userId) {
      // const loginToken = Meteor._localStorage.getItem('Meteor.loginToken');
      Meteor.call('getLoginToken',(err,loginToken) => {
        if(err) console.error(err);
        else {
          // console.log(`loginTokenAutorun ${loginToken}`);
          cookies.set('meteor_login_token', loginToken,opts);
        }
      })
    } else {
      if (DEBUG) console.log(`loginTokenAutorun logout`);
      cookies.set('meteor_login_token', null, opts);
    }
  })
} else {
  export var cookies = new Cookies();

  export const checkPrivateAccess = function(img, loginToken){    
    let denied = img && img.private;
    if(denied && loginToken){
      const user = Meteor.users.findOne({'services.resume.loginTokens':{$elemMatch:{hashedToken: loginToken}}});
      console.log(`checkPrivateAccess loginToken=${loginToken} (${typeof loginToken}) => userId=${user ? user._id : 'no user'} img.user=${img.user}`);
      if(user) {
        if(img.user == user._id || img.private.indexOf(user._id)>=0){
          denied = false;
        }
      }
    }
    return denied;
  }

  Meteor.methods({
    getLoginToken(){
      return Accounts._getLoginToken(this.connection.id);
    }
  });
}
