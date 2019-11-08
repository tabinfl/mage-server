const fs = require('fs-extra')
  , path = require('path')
  , geopackageManager = require('@ngageoint/geopackage')
  , FeatureTile = require('@ngageoint/geopackage/lib/tiles/features')
  , ShadedFeaturesTile = require('@ngageoint/geopackage/lib/tiles/features/custom/shadedFeaturesTile')
  , GeoPackageOptimizer = require('@ngageoint/geopackage-mobile-optimizer')
  , environment = require('../environment/env');

const tileSize = 256;

module.exports = {
  open: open,
  optimize: optimize,
  tile: tile,
  features: features,
  vectorTile: vectorTile,
  getClosestFeatures
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
        });
    })
    .catch(err => console.log('err', err));
}

async function tile(layer, tableName, {x, y, z}) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);
  await fs.stat(geopackagePath);
  var geopackage = await geopackageManager.open(geopackagePath);
  const table = layer.tables.find(table => table.name === tableName);
  if (!table) throw new Error("Table '" + table + "' does not exist in GeoPackage");
  var tile;
  switch(table.type) {
  case 'tile':
    tile = geopackageManager.getTileFromXYZ(geopackage, table.name, x, y, z, tileSize, tileSize);
    break;
  case 'feature':
    x = Number(x);
    y = Number(y);
    z = Number(z);
    var width = 256;
    var height = 256;
    var featureDao = geopackage.getFeatureDao(table.name);
    if (!featureDao) return;
    var ft = new FeatureTile(featureDao, width, height);
    ft.setMaxFeaturesPerTile(10000);
    var numberFeaturesTile = new ShadedFeaturesTile();
    ft.setMaxFeaturesTileDraw(numberFeaturesTile);
    tile = ft.drawTile(x, y, z);

    // tile = geopackageManager.getFeatureTileFromXYZ(geopackage, table.name, x, y, z, tileSize, tileSize);
    break;
  }

  geopackage.close();
  return tile;
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

async function getClosestFeatures(layers, lat, lng, {x, y, z}) {
  var closestFeatures = [];
  for (var i = 0; i < layers.length; i++) {
    var layer = layers[i].layer;
    var tableName = layers[i].table;
    const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

    await fs.stat(geopackagePath);
    var geopackage = await geopackageManager.open(geopackagePath);
    const table = layer.tables.find(table => table.name === tableName);
    if (!table) throw new Error("Table '" + table + "' does not exist in GeoPackage");
    var closestFeature = await geopackageManager.getClosestFeatureInXYZTile(geopackage, table.name, x, y, z, lat, lng);
    if (closestFeature) closestFeatures.push(closestFeature);
  }
  closestFeatures.sort(function(first, second) {
    if (first.coverage && second.coverage) return 0;
    if (first.coverage) return 1;
    if (second.coverage) return -1;
    return first.distance - second.distance;
  });
  return closestFeatures;
}
