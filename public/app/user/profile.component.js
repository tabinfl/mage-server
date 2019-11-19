import angular from 'angular';
import zxcvbn from 'zxcvbn';

class UserController {
  constructor($state, $timeout, Api, UserService) {
    this.$state = $state;
    this.$timeout = $timeout;
    this.Api = Api;
    this.UserService = UserService;

    this.authentication = {};
    this.passwordStatus = {};
    this.showUserStatus = false;
    this.avatar = null;

    this.passwordStrengthScore = 0;
    this.passwordStrengthMap = {
      0: {
        type: 'danger',
        text: 'Weak'
      },
      1: {
        type: 'warning',
        text: 'Fair'
      },
      2: {
        type: 'info',
        text: 'Good'
      },
      3: {
        type: 'primary',
        text: 'Strong'
      },
      4: {
        type: 'success',
        text: 'Excellent'
      }
    };
  }

  $onInit() {
    this.Api.get(api => {
      var authenticationStrategies = api.authenticationStrategies || {};
      if (authenticationStrategies.local && authenticationStrategies.local.passwordMinLength) {
        this.passwordPlaceholder = authenticationStrategies.local.passwordMinLength + ' characters, alphanumeric';
      }
    });
  }

  $onChanges(changes) {
    if (changes.user && !this.originalUser) {
      this.originalUser = angular.copy(changes.user);
    }
  }

  saveUser() {
    var user = {
      username: this.user.username,
      displayName: this.user.displayName,
      email: this.user.email,
      avatar: this.avatar
    };

    if (this.user.phones && this.user.phones.length) {
      user.phone = this.user.phones[0].number;
    }

    // TODO throw in progress
    var progress = e => {
      if(e.lengthComputable){
        this.$timeout(() => {
          this.uploading = true;
          this.uploadProgress = (e.loaded/e.total) * 100;
        });
      }
    };

    var complete = () => {
      this.status("Success", "Your account information has been updated.", "alert-success");
    };

    var failed = data => {
      this.$timeout(() => {
        this.status("Error", data, "alert-danger");
      });
    };

    this.UserService.updateMyself(user, complete, failed, progress);
  }

  cancel() {
    this.user = angular.copy(this.originalUser);
    this.$state.go('map');
  }

  updatePassword(form) {
    form.newPasswordConfirm.$setValidity("nomatch", this.authentication.newPassword === this.authentication.newPasswordConfirm);

    if (!form.$valid) return;

    var authentication = {
      username: this.user.username,
      password: this.authentication.password,
      newPassword: this.authentication.newPassword,
      newPasswordConfirm: this.authentication.newPasswordConfirm
    };

    this.UserService.updateMyPassword(authentication).success(() => {
      this.authentication.password = "";
      this.authentication.newPassword = "";
      this.authentication.newPasswordConfirm = "";
      this.form.authentication.$setPristine();
      this.passwordStatus = {status: "success", msg: "Password successfully updated, you will be redirected to the login page."};

      this.$timeout(function() {
        this.$state.go('landing');
      }, 5000);
    }).error((data, status) => {
      if (status === 401) {
        form.password.$setValidity('invalid', false);
      } else {
        this.passwordStatus = {status: "danger", msg: data};
      }
    });
  }

  status(statusTitle, statusMessage, statusLevel) {
    this.statusTitle = statusTitle;
    this.statusMessage = statusMessage;
    this.statusLevel = statusLevel;
    this.showUserStatus = true;
  }

  avatarChanged($event) {
    this.avatar = $event.avatar;

    if (!this.avatar) {
      this.user.avatarData = null;
      return;
    }

    if (window.FileReader) {
      var reader = new FileReader();
      reader.onload = (() => {
        return e => {
          this.$timeout(() => {
            this.user.avatarData = e.target.result;
          });
        };
      })(this.avatar);

      reader.readAsDataURL(this.avatar);
    }
  }

  passwordChanged() {
    this.form.authentication.password.$setValidity('invalid', true);
  }

  newPasswordChanged(password) {    
    var score = password && password.length ? zxcvbn(password, [this.user.username, this.user.displayName, this.user.email]).score : 0;
    this.passwordStrengthScore = score + 1;
    this.passwordStrengthType = this.passwordStrengthMap[score].type;
    this.passwordStrength = this.passwordStrengthMap[score].text;
  }
}

UserController.$inject =  ['$state', '$timeout', 'Api', 'UserService'];

export default {
  template: require('./profile.html'),
  bindings: {
    user: '<'
  },
  controller: UserController
};
