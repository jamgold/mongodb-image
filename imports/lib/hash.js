import imageHash from 'node-image-hash';
import { Promise } from 'meteor/promise';
global.imageHash = imageHash;
// const md5 = require('md5');
const HASH_BITS = 256;

export const callWithPromise = (method) => {
  return new Promise((resolve, reject) => {
    Meteor.call(method, (error, result) => {
      if (error) reject(error);
      resolve(result);
    });
  });
}
export const makeHash = function makeHash(data) {
  const buffer = Buffer.from(data);
  if(Meteor.isClient) {
    return new Promise((resolve, reject) => {
      imageHash.syncHash(buffer, HASH_BITS)
        .then((hash, error) => {
          // if (error) reject(error);
          resolve(hash.hash);
        });
    });
  } else {
    return imageHash.hash(buffer, HASH_BITS);
  }
}
