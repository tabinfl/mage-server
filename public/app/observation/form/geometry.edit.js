import angular from 'angular';
import {select} from 'material-components-web';

class GeometryEditController {

  constructor($element, $timeout, MapService, LocalStorageService) {
    this.$element = $element;
    this.$timeout = $timeout;
    this.MapService = MapService;
    this.LocalStorageService = LocalStorageService;

    this.edit = false;
    this.shapes = [{
      display: 'Point',
      value: 'Point'
    },{
      display: 'Line',
      value: 'LineString'
    },{
      display: 'Polygon',
      value: 'Polygon'
    }];

    this.shape = {
      type: 'Point'
    };

    this.coordinateSystem = LocalStorageService.getCoordinateSystemEdit();
  }

  $postLink() {
    this.initializeDropDown();
  }

  $doCheck() {
    if (!this.feature && this.select) {
      this.select.selectedIndex = -1;
    }
  }

  gotoGeometry() {
    // Only the main geometry is on the map, identified by having an id.
    // Don't zoom to form/field locations as they are not on the map.
    if (this.feature.id) {
      this.MapService.zoomToFeatureInLayer(this.feature, 'Observations');
    }
  }

  startGeometryEdit() {
    if (this.feature.geometry) {
      this.editFeature = angular.copy(this.feature);
    } else {
      const mapPosition = this.LocalStorageService.getMapPosition();
      this.editFeature = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [mapPosition.center.lng, mapPosition.center.lat]
        },
        style: this.feature.style
      };
    }

    this.edit = true;

    this.onFeatureEdit({
      $event: {
        action: 'edit'
      }
    });
  }

  saveLocationEdit(feature) {
    this.edit = false;
    this.feature.geometry = this.feature ? this.feature.geometry : null;

    this.onFeatureChanged({
      $event: {
        feature: feature
      }
    });

    this.onFeatureEdit({
      $event: {
        action: 'none'
      }
    });
  }

  cancelLocationEdit() {
    this.edit = false;

    this.onFeatureEdit({
      $event: {
        action: 'none'
      }
    });
  }

  editGeometry(event) {
    event.stopPropagation();
    event.preventDefault();
    event.stopImmediatePropagation();
    const mapPos = this.LocalStorageService.getMapPosition();

    this.feature = this.feature || {
      type: 'Feature',
      geometry: {
        type: 'Point', 
        coordinates: [mapPos.center.lng, mapPos.center.lat]
      }
    };
    this.startGeometryEdit(this.feature);

    this.select.selectedIndex = 0;
  }

  initializeDropDown() {
    this.$timeout(() => {
      if (!this.select) {
        this.select = new select.MDCSelect(this.$element.find('.mdc-select')[0]);
      }

      this.select.selectedIndex = 0;
      this.select.value = " ";
      this.initialized = true;
    });
  }
}

GeometryEditController.$inject = ['$element', '$timeout', 'MapService', 'LocalStorageService'];

const GeometryEdit = {
  template: require('./geometry.edit.html'),
  bindings: {
    field: '<',
    feature: '<',
    onFeatureEdit: '&',
    onFeatureChanged: '&'
  },
  controller: GeometryEditController
};

export default GeometryEdit;
