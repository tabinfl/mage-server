var angular = require('angular');

angular.module('mage')
  .component('localSignin', require('./local.signin.js'))
  .component('localSignup', require('./local.signup.js'))
  .component('ldapSignin', require('./ldap.signin.js'))
  .component('oauthSignin', require('./oauth.signin.js'))
  .component('samlSignin', require('./saml.signin.js'))
  .controller('SigninController', require('./signin.controller'))
  .controller('SignupController', require('./signup.controller'))
  .controller('AuthorizeController', require('./authorize.controller'));
