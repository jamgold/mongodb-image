import { check } from 'meteor/check'
import crypto from 'crypto';
//
// this is not needed
//
const JHMdefaultResumeLoginHandler = (accounts, options) => {
  console.log(`defaultResumeLoginHandler`, options);

  if (!options.resume) return undefined;

  check(options.resume, String);

  const hashedToken = accounts._hashLoginToken(options.resume);

  // First look for just the new-style hashed login token, to avoid
  // sending the unhashed token to the database in a query if we don't
  // need to.
  let user = accounts.users.findOne(
    { "services.resume.loginTokens.hashedToken": hashedToken },
    { fields: { "services.resume.loginTokens.$": 1 } });

  if (!user) {
    // If we didn't find the hashed login token, try also looking for
    // the old-style unhashed token.  But we need to look for either
    // the old-style token OR the new-style token, because another
    // client connection logging in simultaneously might have already
    // converted the token.
    user = accounts.users.findOne({
      $or: [
        { "services.resume.loginTokens.hashedToken": hashedToken },
        { "services.resume.loginTokens.token": options.resume }
      ]
    },
      // Note: Cannot use ...loginTokens.$ positional operator with $or query.
      { fields: { "services.resume.loginTokens": 1 } });
  }

  if (!user)
    return {
      error: new Meteor.Error(403, "You've been logged out by the server. Please log in again.")
    };

  // Find the token, which will either be an object with fields
  // {hashedToken, when} for a hashed token or {token, when} for an
  // unhashed token.
  let oldUnhashedStyleToken;
  let token = user.services.resume.loginTokens.find(token =>
    token.hashedToken === hashedToken
  );
  if (token) {
    oldUnhashedStyleToken = false;
  } else {
    token = user.services.resume.loginTokens.find(token =>
      token.token === options.resume
    );
    oldUnhashedStyleToken = true;
  }

  const tokenExpires = accounts._tokenExpiration(token.when);
  if (new Date() >= tokenExpires)
    return {
      userId: user._id,
      error: new Meteor.Error(403, "Your session has expired. Please log in again.")
    };

  // Update to a hashed token when an unhashed token is encountered.
  if (oldUnhashedStyleToken) {
    // Only add the new hashed token if the old unhashed token still
    // exists (this avoids resurrecting the token if it was deleted
    // after we read it).  Using $addToSet avoids getting an index
    // error if another client logging in simultaneously has already
    // inserted the new hashed token.
    accounts.users.update(
      {
        _id: user._id,
        "services.resume.loginTokens.token": options.resume
      },
      {
        $addToSet: {
          "services.resume.loginTokens": {
            "hashedToken": hashedToken,
            "when": token.when
          }
        }
      }
    );

    // Remove the old token *after* adding the new, since otherwise
    // another client trying to login between our removing the old and
    // adding the new wouldn't find a token to login with.
    accounts.users.update(user._id, {
      $pull: {
        "services.resume.loginTokens": { "token": options.resume }
      }
    });
  }

  return {
    userId: user._id,
    stampedLoginToken: {
      token: options.resume,
      when: token.when
    }
  };
};

Accounts._hashLoginToken = function(loginToken) {
  const hash = crypto.createHash('sha256');
  hash.update(loginToken);
  const x = hash.digest('base64');
  console.log(`Accounts._hashLoginToken ${loginToken} => ${x}`);
  return x;
};

Accounts.registerLoginHandler("resume", function (options) {
  return JHMdefaultResumeLoginHandler.call(this, Accounts, options);
});

Accounts.onLogin(function mongodbImagesOnLogin(session){
  console.log(`mongodbImagesOnLogin ${session.type}`);
      // type: 'resume',
      // allowed: true,
      // methodName: 'login',
      // methodArguments: [ [Object] ],
      // user: {
        // _id: 'ZGYc4zu8JdjXdofD6',
        // createdAt: 1370493608794,
        // emails: [Array],
        // location: [Object],
        // services: [Object],
        // status: [Object],
        // username: 'jhm',
        // profile: [Object]
      // },
      // connection: {
        // id: 'kCShbs7bkWSqCTyJD',
        // close: [Function: close],
        // onClose: [Function: onClose],
        // clientAddress: '127.0.0.1',
        // httpHeaders: [Object]
      // }
})