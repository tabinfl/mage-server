angular
  .module('mage')
  .directive('userNewsItem', userNewsItem);

function userNewsItem() {
  var directive = {
    restrict: "A",
    templateUrl:  "app/user/user-feed.directive.html",
    scope: {
      user: '=userNewsItem',
      followUserId: '=userNewsItemFollow'
    },
    controller: UserNewsItemController
  };

  return directive;
}

UserNewsItemController.$inject = ['$scope', 'LocalStorageService'];

function UserNewsItemController($scope, LocalStorageService) {
  $scope.followingUserId = null;
  $scope.fromNow = moment($scope.user.location.properties.timestamp).fromNow();

  $scope.periodChoices = ['minutes', 'hours', 'days'];
  $scope.breadcrumbs = {
    period: $scope.periodChoices[0],
    color: '#0000FF'
  };

  $scope.minicolorSettings = {
    position: 'bottom right',
    control: 'wheel'
  };

  if ($scope.user.avatarUrl) {
    $scope.avatarUrl = $scope.user.avatarUrl + "?access_token=" + LocalStorageService.getToken();
  } else {
    $scope.avatarUrl = "img/missing_photo.png";
  }

  $scope.followUser = function(e, user) {
    e.stopPropagation();
    $scope.$emit('user:follow', user);
  };

  $scope.showBreadcrumbs = function(e, user) {
    e.stopPropagation();
    $scope.breadcrumb = !$scope.breadcrumb;

    var event = $scope.breadcrumb ? 'user:breadcrumb:on' : 'user:breadcrumb:off';
    $scope.$emit(event, user, $scope.breadcrumbs);
  };

  $scope.onUserLocationClick = function(user) {
    $scope.$emit('user:zoom', user, {panToLocation: true, zoomToLocation: true});
  };

  $scope.$on('user:poll', function() {
    $scope.fromNow = moment($scope.user.location.properties.timestamp).fromNow();
  });

}
