module.exports = AuthorizeController;

AuthorizeController.$inject = ['$scope', '$routeParams', 'UserService'];

function AuthorizeController($scope, $routeParams, UserService) {

  $scope.authorize = function(uid) {
    var user = {};  // TODO do I need user here?

    UserService.authorize($routeParams.type, user, false, {uid: uid}).success(function(data) {
      if (data.device.registered) {
        // nothing
      } else {
        $scope.status = 400;
        $scope.statusTitle = 'Invalid Device ID';
        $scope.statusMessage = 'Please check your device ID and try again.';
        $scope.statusLevel = 'alert-warning';
      }
    }).error(function (data, status) {
      $scope.status = status;
      $scope.statusTitle = 'Invalid Device ID';
      $scope.statusMessage = data.errorMessage;
      $scope.statusLevel = 'alert-warning';
    });
  };

}
