var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  defaults: {
    username: null,
    password: null,
  },
  hasTimestamps: true,
  // isLoggedIn: function() {
  //   return this.signedIn;
  // },
  // logIn: function() {
  //   this.signedIn = true;
  // },
  // logOut: function() {
  //   this.signedIn = false;
  // }
});

module.exports = User;
