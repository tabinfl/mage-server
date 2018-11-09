const async = require('async')
  , fs = require('fs-extra')
  , path = require('path')
  , geopackageManager = require('@ngageoint/geopackage')
  , GeoPackageOptimizer = require('@ngageoint/geopackage-mobile-optimizer')
  , environment = require('../environment/env');

const tileSize = 256;

module.exports = {
  open: open,
  optimize: optimize,
  tile: tile,
  features: features,
  vectorTile: vectorTile
};

function open(file) {
  console.log('Open GeoPackage');
  return geopackageManager.open(file.path)
    .then(geopackage => {
      console.log('Opened the GeoPackage: ', file.path);
      const tables = geopackage.getTables();
      const tileTables = tables.tiles.map(tableName => ({name: tableName, type: 'tile'}));
      const featureTables = tables.features.map(tableName => ({name: tableName, type: 'feature'}));

      return {
        geopackage: geopackage,
        metadata: {
          tables: tileTables.concat(featureTables)
        }
      };
    })
    .catch(err => console.log('err', err));
}

function optimize(path, progress) {
  return geopackageManager.open(path)
    .then(geopackage => {
      return geopackageManager.open(path)
        .then(outputGeopackage => {
          return GeoPackageOptimizer.optimize({inputGeoPackage: geopackage, outputGeoPackage: outputGeopackage, same: true, progress: progress})
            .then(() => {
              outputGeopackage.close();
            });
          })
          .then(() => {
            console.log('Optimized the GeoPackage: ', path);
        })
    })
    .catch(err => console.log('err', err));
}

function tile(layer, tableName, {x, y, z}) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
  return fs.stat(geopackagePath)
    .then(() => geopackageManager.open(geopackagePath))
    .then(geopackage => {
      const table = layer.tables.find(table => table.name === tableName);
      if (!table) throw new Error("Table '" + table + "' does not exist in GeoPackage");
      var tile;
      switch(table.type) {
        case 'tile':
          tile = geopackageManager.getTileFromXYZ(geopackage, table.name, x, y, z, tileSize, tileSize);
          break;
        case 'feature':
          tile = geopackageManager.getFeatureTileFromXYZ(geopackage, table.name, x, y, z, tileSize, tileSize);
          break;
      }

      geopackage.close();
      return tile;
    });
}

function features(layer, tableName, {x, y, z}) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

  return fs.stat(geopackagePath)
    .then(() => geopackageManager.open(geopackagePath))
    .then(geopackage => {
      if (!geopackage) throw new Error("Cannot open geopackage");

      const table = layer.tables.find(table => table.name === tableName);
      if (!table) return done(new Error("Table '" + table + "' does not exist in GeoPackage"));
      return geopackageManager.getGeoJSONFeaturesInTile(geopackage, table.name, x, y, z);
    })
    .then(features => {
      return {
        type: 'FeatureCollection',
        features: features
      };
    });
}

function vectorTile(layer, tableName, {x, y, z}) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

  return fs.stat(geopackagePath)
    .then(() => geopackageManager.open(geopackagePath))
    .then(geopackage => {
      if (!geopackage) throw new Error("Cannot open geopackage");
      const table = layer.tables.find(table => table.name === tableName);
      if (!table) return done(new Error("Table '" + table + "' does not exist in GeoPackage"));
      return geopackageManager.getVectorTileProtobuf(geopackage, table.name, x, y, z);
    });
}
