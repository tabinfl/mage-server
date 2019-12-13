module.exports = function(app, security) {
  const fs = require('fs-extra')
    , path = require('path')
    , Event = require('../models/event')
    , access = require('../access')
    , api = require('../api')
    , environment = require('../environment/env')
    , layerXform = require('../transformers/layer')
    , geopackage = require('../utilities/geopackage')
    , {default: upload} = require('../upload');

  const passport = security.authentication.passport;
  app.all('/api/layers*', passport.authenticate('bearer'));

  function validateLayerParams(req, res, next) {
    const layer = req.body;

    if (!layer.type) {
      return res.status(400).send('cannot create layer "type" param not specified');
    }

    if (!layer.name) {
      return res.status(400).send('cannot create layer "name" param not specified');
    }

    // TODO error check / validate that if WMS proper things are provided

    req.newLayer = layer;
    next();
  }

  function validateGeopackage(req, res, next) {
    if (req.body.type !== 'GeoPackage') {
      return next();
    }

    if (!req.file) {
      return res.send(400, 'cannot create layer "geopackage" file not specified');
    }
    console.log('validating', req.file);
    geopackage.validate(req.file)
      .then(result => {
        console.log('validated', result);
        req.newLayer.geopackage = req.file;
        req.newLayer.tables = result.metadata.tables;
        next();
      })
      .catch(() => {
        return res.status(400).send('Cannot create layer, the GeoPackage is not valid');
      });
  }

  function validateEventAccess(req, res, next) {
    if (access.userHasPermission(req.user, 'READ_LAYER_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_LAYER_EVENT')) {
      // Make sure I am part of this event
      Event.userHasEventPermission(req.event, req.user._id, 'read', function(err, hasPermission) {
        if (hasPermission) {
          return next();
        } else {
          return res.sendStatus(403);
        }
      });
    } else {
      res.sendStatus(403);
    }
  }

  function parseQueryParams(req, res, next) {
    req.parameters = {
      type: req.param('type')
    };

    if (!req.param('processing')) {
      req.parameters.processing = 'processed';
    } else {
      req.parameters.processing = req.param('processing');
    }

    next();
  }

  // get all layers
  app.get(
    '/api/layers',
    access.authorize('READ_LAYER_ALL'),
    parseQueryParams,
    function (req, res, next) {
      new api.Layer().getLayers({processing: req.parameters.processing})
        .then(layers => {
          var response = layerXform.transform(layers, {path: req.getPath()});
          res.json(response);
        })
        .catch(err => next(err));
    }
  );

  app.get(
    '/api/layers/count',
    access.authorize('READ_LAYER_ALL'),
    function (req, res, next) {
      new api.Layer().count()
        .then(count => res.json({count: count}))
        .catch(function(err) {
          next(err);
        });
    }
  );

  app.post(
    '/api/layers/features',
    access.authorize('READ_LAYER_ALL'),
    async function(req, res, next) {
      var clientLayers = req.body.layerIds;
      var layerIdMap = {};
      for (var i = 0; i < clientLayers.length; i++) {
        layerIdMap[clientLayers[i].id] = clientLayers[i];
      }
      try {
        var layers = await new api.Layer().getLayers({layerIds: Object.keys(layerIdMap), type: 'GeoPackage', processing: 'processed'});
        var gpLayers = [];
        for (i = 0; i < layers.length; i++) {
          gpLayers.push({
            layer: layers[i],
            table: layerIdMap[layers[i].id].table
          });
        }
        var closest = await geopackage.getClosestFeatures(gpLayers, Number(req.body.latlng.lat), Number(req.body.latlng.lng), req.body.tile);
        res.json(closest);
      } catch (err) {
        next(err);
      }
    });

  // get features for layer (must be a feature layer)
  app.get(
    '/api/layers/:layerId/features',
    access.authorize('READ_LAYER_ALL'),
    function (req, res, next) {
      if (req.layer.type !== 'Feature') return res.status(400).send('cannot get features, layer type is not "Feature"');

      new api.Feature(req.layer).getAll()
        .then(features => {
          res.json({
            type: 'FeatureCollection',
            features: features.map(f => f.toJSON())
          });
        })
        .catch(err => next(err));
    }
  );

  app.get(
    '/api/events/:eventId/layers',
    passport.authenticate('bearer'),
    validateEventAccess,
    parseQueryParams,
    function(req, res, next) {
      new api.Layer().getLayers({layerIds: req.event.layerIds, type: req.parameters.type, processing: req.parameters.processing})
        .then(layers => {
          var response = layerXform.transform(layers, {path: req.getPath()});
          res.json(response);
        })
        .catch(err => next(err));
    }
  );

  // get layer
  app.get(
    '/api/layers/:layerId',
    access.authorize('READ_LAYER_ALL'),
    function (req, res) {
      if (req.accepts('application/json')) {
        const response = layerXform.transform(req.layer, {path: req.getPath()});
        res.json(response);
      } else if (req.accepts('application/octet-stream') && req.layer.file) {
        var stream = fs.createReadStream(path.join(environment.layerBaseDirectory, req.layer.file.relativePath));
        stream.on('open', () => {
          res.type(req.layer.file.contentType);
          res.header('Content-Length', req.layer.file.size);
          stream.pipe(res);
        });
      }
    }
  );

  // get layer
  app.get(
    '/api/events/:eventId/layers/:layerId',
    passport.authenticate('bearer'),
    validateEventAccess,
    function (req, res) {
      if (req.accepts('application/json')) {
        const response = layerXform.transform(req.layer, {path: req.getPath()});
        res.json(response);
      } else if (req.accepts('application/octet-stream') && req.layer.file) {
        var stream = fs.createReadStream(path.join(environment.layerBaseDirectory, req.layer.file.relativePath));
        stream.on('open', () => {
          res.type(req.layer.file.contentType);
          res.header('Content-Length', req.layer.file.size);
          stream.pipe(res);
        });
      }
    }
  );

  app.get(
    '/api/events/:eventId/layers/:layerId/:tableName/:z(\\d+)/:x(\\d+)/:y(\\d+).:format',
    passport.authenticate('bearer'),
    function(req, res, next) {
      const tileParams = {
        x: Number(req.params.x),
        y: Number(req.params.y),
        z: Number(req.params.z)
      };

      const table = req.layer.tables.find(table => table.name === req.params.tableName);
      if (!table) {
        return res.status(404).send('Table does not exist in layer.');
      }

      if (req.params.format === 'pbf') {
        if (table.type !== 'feature') {
          return res.status(400).send('Cannot request vector tile from a tile layer');
        }

        geopackage.vectorTile(req.layer, req.params.tableName, tileParams)
          .then(vectorTile => {
            res.contentType('application/x-protobuf');
            res.send(Buffer.from(vectorTile));
          })
          .catch(err => next(err));
      } else {
        geopackage.tile(req.layer, req.params.tableName, tileParams)
          .then(tile => {
            if (!tile) return res.status(404);
            res.contentType('image/png');
            res.send(tile);
          });
      }
    }
  );

  // get features for layer (must be a feature layer)
  app.get(
    '/api/events/:eventId/layers/:layerId/features',
    passport.authenticate('bearer'),
    validateEventAccess,
    function (req, res, next) {
      if (req.layer.type !== 'Feature') return res.status(400).send('cannot get features, layer type is not "Feature"');
      if (req.event.layerIds.indexOf(req.layer._id) === -1) return res.status(400).send('layer requested is not in event ' + req.event.name);

      new api.Feature(req.layer).getAll()
        .then(features => {
          res.json({
            type: 'FeatureCollection',
            features: features.map(f => f.toJSON())
          });
        })
        .catch(err => next(err));
    }
  );

  // Create a new layer
  app.post(
    '/api/layers',
    access.authorize('CREATE_LAYER'),
    upload.single('geopackage'),
    validateLayerParams,
    validateGeopackage,
    function(req, res, next) {
      console.log('creating layer');
      if (req.body.type === 'GeoPackage') {
        new api.Layer().create(req.newLayer)
          .then(layer => {
            console.log('opening geopackage', path.join(environment.layerBaseDirectory, layer.file.relativePath));
            return geopackage.open(path.join(environment.layerBaseDirectory, layer.file.relativePath))
              .then(result => {
                console.log('result', result);
                const gp = result.geopackage;
                layer.processing = [];
                for (var i = 0; i < result.metadata.tables.length; i++) {
                  var gpLayer = result.metadata.tables[i];
        
                  if (gpLayer.type === 'tile') {
                    layer.processing.push({
                      layer: gpLayer.name,
                      description: '"' + gpLayer.name + '" layer optimization',
                      complete: false,
                      type: 'tile'
                    });
                  } else {
                    layer.processing.push({
                      layer: gpLayer.name,
                      description: '"' + gpLayer.name + '" layer index',
                      complete: false,
                      type: 'feature'
                    });
                  }
                }
        
                gp.close();
                layer.save();
              })
              .then(() => {
                return layer;
              });
          })
          .then(layer => {
            var response = layerXform.transform(layer, {path: req.getPath()});
            res.location(layer._id.toString()).json(response);

            var layerStatusMap = {};
            for (var i = 0; i < layer.processing.length; i++) {
              layerStatusMap[layer.processing[i].layer] = i;
            }

            // optimize after the layer is returned to the client
            var currentLayer;
            geopackage.optimize(path.join(environment.layerBaseDirectory, layer.file.relativePath), function(progress) {
              console.log('Progress in optimizing', progress);
              if (currentLayer && currentLayer !== progress.layer) {
                var oldLayerStatus = layer.processing[layerStatusMap[currentLayer]];
                oldLayerStatus.complete = true;
                currentLayer = progress.layer;
              }

              var layerStatus = layer.processing[layerStatusMap[progress.layer]];
              layerStatus.count = progress.count;
              layerStatus.total = progress.totalCount;
              layerStatus.description = progress.description;
              layer.save();
            })
              .then(() => {
                layer.processing = undefined;
                layer.save();
                console.log('GeoPackage optimized');
              });
          }).catch(err => next(err));
      } else {
        new api.Layer().create(req.newLayer)
          .then(layer => {
            var response = layerXform.transform(layer, {path: req.getPath()});
            res.location(layer._id.toString()).json(response);
          });
      }
        
    }
  );

  app.put(
    '/api/layers/:layerId',
    access.authorize('UPDATE_LAYER'),
    validateLayerParams,
    function(req, res, next) {
      new api.Layer(req.layer.id).update(req.newLayer)
        .then(layer => {
          var response = layerXform.transform(layer, {path: req.getPath()});
          res.json(response);
        })
        .catch(err => next(err));
    }
  );

  app.delete(
    '/api/layers/:layerId',
    access.authorize('DELETE_LAYER'),
    function(req, res, next) {
      new api.Layer().remove(req.layer)
        .then(function() {
          res.sendStatus(200);
        })
        .catch(err => next(err));
    }
  );
};
