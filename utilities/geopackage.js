const fs = require('fs-extra')
  , path = require('path')
  , geopackageManager = require('@ngageoint/geopackage').GeoPackage
  , FeatureTile = require('@ngageoint/geopackage').FeatureTiles
  , ShadedFeaturesTile = require('@ngageoint/geopackage').ShadedFeaturesTile
  , GeoPackageOptimizer = require('@ngageoint/geopackage/optimizer')
  , environment = require('../environment/env');

const tileSize = 256;

module.exports = {
  open: open,
  optimize: optimize,
  tile: tile,
  features: features,
  vectorTile: vectorTile,
  validate,
  getClosestFeatures
};

async function open(file) {
  var geopackage = await geopackageManager.open(file);
  const tables = geopackage.getTables();
  const tileTables = tables.tiles.map(tableName => ({name: tableName, type: 'tile'}));
  const featureTables = tables.features.map(tableName => ({name: tableName, type: 'feature'}));

  return {
    geopackage: geopackage,
    metadata: {
      tables: tileTables.concat(featureTables)
    }
  };
}

async function optimize(path, progress) {
  var geopackage = await geopackageManager.open(path);
  var outputGeopackage = await geopackageManager.open(path);
  await GeoPackageOptimizer.optimize({inputGeoPackage: geopackage, outputGeoPackage: outputGeopackage, same: true, progress: progress});
  precacheTiles(outputGeopackage, 1000);
  outputGeopackage.close();
}

async function precacheTiles(geopackage, maxTilesPerTable) {
  // For now let's not do this
  // var featureTables = geopackage.getFeatureTables();
  // for (const featureTable of featureTables) {
  //   console.log('Pre-Caching tiles from feature table', featureTable);
  // }
}

async function validate(file) {
  try {
    var geopackage = await geopackageManager.open(file.path);
    var tables = geopackage.getTables();
    const tileTables = tables.tiles.map(tableName => ({name: tableName, type: 'tile'}));
    const featureTables = tables.features.map(tableName => ({name: tableName, type: 'feature'}));

    for (const tileTable of tileTables) {
      var tileDao = geopackage.getTileDao(tileTable.name);
      tileTable.minZoom = tileDao.minWebMapZoom;
      tileTable.maxZoom = tileDao.maxWebMapZoom;
    }

    return {
      metadata: {
        tables: tileTables.concat(featureTables)
      }
    };
  } catch (e) {
    console.log('Error validating geopackage', e);
  }
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
    tile = await geopackageManager.getTileFromXYZ(geopackage, table.name, x, y, z, tileSize, tileSize);
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
    ft.setPolygonFillColor("#0000FF11");
    ft.setPolygonColor("#0000FF");
    ft.setLineColor("#0000FF");
    ft.setLineStrokeWidth(2.0);
    var numberFeaturesTile = new ShadedFeaturesTile();
    ft.setMaxFeaturesTileDraw(numberFeaturesTile);
    tile = await ft.drawTile(x, y, z);
    break;
  }

  geopackage.close();
  return tile;
}

async function features(layer, tableName, {x, y, z}) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

  await fs.stat(geopackagePath);
  var geopackage = await geopackageManager.open(geopackagePath);
  if (!geopackage) throw new Error("Cannot open geopackage");

  const table = layer.tables.find(table => table.name === tableName);
  if (!table) throw new Error("Table '" + table + "' does not exist in GeoPackage");
  var features = await geopackageManager.getGeoJSONFeaturesInTile(geopackage, table.name, x, y, z);
  return {
    type: 'FeatureCollection',
    features: features
  };
}

async function vectorTile(layer, tableName, {x, y, z}) {
  const geopackagePath = path.join(environment.layerBaseDirectory, layer.file.relativePath);

  await fs.stat(geopackagePath);
  var geopackage = await geopackageManager.open(geopackagePath);
  if (!geopackage) throw new Error("Cannot open geopackage");
  const table = layer.tables.find(table => table.name === tableName);
  if (!table) throw new Error("Table '" + table + "' does not exist in GeoPackage");
  return geopackageManager.getVectorTileProtobuf(geopackage, table.name, x, y, z);
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
    var closestFeature = geopackageManager.getClosestFeatureInXYZTile(geopackage, table.name, x, y, z, lat, lng);
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
