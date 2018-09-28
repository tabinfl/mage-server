var util = require('util')
  , fs = require('fs')
  , api = require('../api')
  , async = require('async')
  , archiver = require('archiver')
  , mgrs = require('mgrs')
  , moment = require('moment')
  , log = require('winston')
  , stream = require('stream')
  , path = require('path')
  , Exporter = require('./exporter')
  , GeoPackageAPI = require('@ngageoint/geopackage')
  , turfCentroid = require('@turf/centroid')
  , environment = require('../environment/env');

var userBase = environment.userBaseDirectory;
var attachmentBase = environment.attachmentBaseDirectory;

function GeoPackage(options) {
  GeoPackage.super_.call(this, options);
}

util.inherits(GeoPackage, Exporter);
module.exports = GeoPackage;

GeoPackage.prototype.export = function(streamable) {
  console.log('Export the GeoPackage');
  var self = this;

  streamable.type('application/zip');
  streamable.attachment("mage-geopackage.zip");

  var archive = archiver('zip');
  archive.pipe(streamable);

  var iconPath = path.join(new api.Icon(self._event._id).getBasePath());

  this.createGeoPackageFile(function(err, filePath) {
    return GeoPackageAPI.create(filePath)
    .then(function(geopackage) {
      return self.createUserTable(geopackage)
      .then(function() {
        return geopackage;
      });
    })
    .then(function(geopackage) {
      return self.addFormDataToGeoPackage(geopackage)
      .then(function() {
        return geopackage;
      });
    })
    .then(function(geopackage) {
      return self.createFormAttributeTables(geopackage)
      .then(function() {
        return geopackage;
      });
    })
    .then(function(geopackage) {
      return self.addObservationIcons(geopackage, iconPath)
      .then(function() {
        return geopackage;
      });
    })
    .then(function(geopackage) {
      return self.addObservationsToGeoPackage(geopackage)
      .then(function() {
        return geopackage;
      })
      .catch(function(error) {
        console.log('Error adding observations to GeoPackage', error);
      });
    })
    .then(function(geopackage) {
      return self.addLocationsToGeoPackage(geopackage)
      .then(function() {
        return geopackage;
      });
    })
    .then(function(){
      console.log('GeoPackage created');
      archive.append(fs.createReadStream(filePath), {name: 'geopackage.gpkg'});
      // archive.finalize();
    })
    .catch(function(error) {
      console.log('Error exporting GeoPackage', error);
    });
  });
};


GeoPackage.prototype.getObservations = function() {
  var self = this;
  self._filter.states = ['active'];

  return new Promise(function(resolve, reject) {
    new api.Observation(self._event).getAll({filter: self._filter}, function(err, observations) {
      resolve(observations);
    });
  });

  return observationsGeoJson.features;
}
GeoPackage.prototype.getLocations = function() {
  var self = this;
  var limit = 2000;

  var startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
  var endDate = self._filter.endDate ? moment(self._filter.endDate) : null;
  var lastLocationId = null;

  return new Promise(function(resolve, reject) {
    self.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
      resolve(requestedLocations);
    });
  });

}

var iconMap = {};

// properties is an array of objects {name: 'columnname', type: columnType}
GeoPackage.prototype.createObservationTable = function(geopackage, properties) {
  console.log('Create Observation Table');
  var columns = [];

  columns.push({
    name: 'lastModified',
    dataType: 'DATETIME'
  });
  columns.push({
    name: 'timestamp',
    dataType: 'DATETIME'
  });
  columns.push({
    name: 'mageId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'userId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'deviceId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'createdAt',
    dataType: 'DATETIME'
  });
  columns.push({
    name: 'primaryField',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'variantField',
    dataType: 'TEXT'
  });
  return GeoPackageAPI.createFeatureTableWithProperties(geopackage, 'Observations', columns);
}

GeoPackage.prototype.createAttachmentTable = function(geopackage) {
  console.log('Create Attachment Table');
  var columns = [{
    name: "name",
    dataType: "TEXT"
  },{
    name: "size",
    dataType: "REAL"
  }];
  return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'Attachments', columns);
}

GeoPackage.prototype.createIconTable = function(geopackage) {
  console.log('Create Icon Table');
  var columns = [{
    name: "eventId",
    dataType: "TEXT"
  },{
    name: "formId",
    dataType: "TEXT"
  },{
    name: "primary",
    dataType: "TEXT"
  },{
    name: "variant",
    dataType: "TEXT"
  }];
  return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'Icons', columns);
}

var locationTablesCreated = {
};

GeoPackage.prototype.createLocationTableForUser = function(geopackage, userId, user, lastLocation) {
  if (locationTablesCreated[userId]) return Promise.resolve();

  console.log('Add User to user table');
  console.log('Create Location Table');
  var columns = [];

  columns.push({
    name: 'mageId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'userId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'timestamp',
    dataType: 'DATETIME'
  });
  columns.push({
    name: 'deviceId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'accuracy',
    dataType: 'REAL'
  });

  locationTablesCreated[userId] = true;
  return GeoPackageAPI.createFeatureTableWithProperties(geopackage, 'Locations'+userId, columns)
  .then(function() {
    var geoJson = {
      type: 'Feature',
      geometry: lastLocation.geometry,
      properties: {
        timestamp: lastLocation.properties.timestamp,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phones: user.phones.join(', '),
        userId: userId
      }
    };
    console.log('add the user to the table', geoJson);
    return GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geopackage, geoJson, 'Users');
  })
  .then(function(userRowId) {
    return new Promise(function (resolve, reject) {
      fs.readFile(path.join(environment.userBaseDirectory, userId, 'icon'), function(err, iconBuffer) {
        var iconId = GeoPackageAPI.addMedia(geopackage, 'UserIcons', iconBuffer, user.icon.contentType, user.icon);
        resolve(GeoPackageAPI.linkMedia(geopackage, 'Users', userRowId, 'UserIcons', iconId));
      });
    });
  })
  .catch(function(err) {
  });
}

GeoPackage.prototype.addLocationsToGeoPackage = function(geopackage) {
  console.log('Add Locations');
  var self = this;
  return self.getLocations()
  .then(function(locations) {
    return locations.reduce(function(sequence, location) {
      var user = self._users[location.userId];
      return self.createLocationTableForUser(geopackage, location.userId.toString(), user, location)
      .then(function() {
        return sequence.then(function() {
          var properties = {};
          properties.userId = location.userId.toString();

          var geojson = {
            type:'Feature',
            geometry: location.geometry,
            properties: location.properties
          };
          geojson.properties.mageId = location._id.toString();
          geojson.properties.userId = location.userId.toString();
          geojson.properties.deviceId = location.properties.deviceId.toString();

          if (geojson.properties.id) {
            delete geojson.properties.id;
          }
          var featureId = GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geopackage, geojson, 'Locations'+location.userId.toString());
        });
      });
    }, Promise.resolve());
  });
}

GeoPackage.prototype.createFormAttributeTables = function(geopackage) {
  var self = this;

  console.log('Create Form Attribute Tables');
  return Object.keys(self._event.formMap).reduce(function(sequence, formId) {
    var columns = [];
    var form = self._event.formMap[formId];
    if (form.primaryField) {
      columns.push({
        name: 'primaryField',
        dataType: 'TEXT'
      });
    }
    if (form.variantField) {
      columns.push({
        name: 'variantField',
        dataType: 'TEXT'
      });
    }
    columns.push({
      name: 'formId',
      dataType: 'TEXT',
      default: formId
    });
    for (var i = 0; i < form.fields.length; i++) {
      var field = form.fields[i];
      columns.push({
        dataColumn: {
          column_name: field.name,
          table_name: 'Form_'+formId,
          name: field.title,
          title: field.title
        },
        name: field.name,
        dataType: 'TEXT'
      });
    }
    return GeoPackageAPI.createAttributeTableWithProperties(geopackage, 'Form_'+formId, columns);
  }, Promise.resolve());
}

GeoPackage.prototype.createUserTable = function(geopackage) {
  var columns = [];
  columns.push({
    name: 'username',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'displayName',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'email',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'phones',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'userId',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'timestamp',
    dataType: 'DATETIME'
  });
  return GeoPackageAPI.createFeatureTableWithProperties(geopackage, 'Users', columns)
  .then(function() {
    console.log('Create User Icon Table');
    var columns = [{
      name: "type",
      dataType: "TEXT"
    },{
      name: "text",
      dataType: "TEXT"
    },{
      name: "color",
      dataType: "TEXT"
    }];
    return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'UserIcons', columns);
  })
  .then(function() {
    console.log('Create User Avatar Table');
    return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'UserAvatars');
  });
}

GeoPackage.prototype.addFormDataToGeoPackage = function(geopackage) {
  var self = this;

  var columns = [];
  columns.push({
    name: 'formName',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'primaryField',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'variantField',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'color',
    dataType: 'TEXT'
  });
  columns.push({
    name: 'formId',
    dataType: 'TEXT'
  });
  /**
   * "3": {
    "color": "#F58300",
    "name": "Animals",
    "primaryField": "field1",
    "variantField": null,
    "fields": [
      {
        "title": "Animal",
        "type": "dropdown",
        "required": false,
        "id": 1,
        "name": "field1",
        "choices": [
          {
            "id": 0,
            "value": 0,
            "title": "Turkey"
          },
          {
            "id": 1,
            "value": 1,
            "title": "Cow"
          }
        ]
      }
    ],
    "userFields": [],
    "archived": false,
    "id": 3
  }

   */
  return GeoPackageAPI.createAttributeTableWithProperties(geopackage, 'Forms', columns)
  .then(function(dao) {
    for (var formId in self._event.formMap) {
      var form = self._event.formMap[formId];
      var row = {
        formName: form.name,
        primaryField: form.primaryField,
        variantField: form.variantField,
        color: form.color,
        formId: formId
      };

      GeoPackageAPI.addAttributeRow(geopackage, 'Forms', row);
    }
  });
}

GeoPackage.prototype.addObservationsToGeoPackage = function(geopackage) {
  console.log('Add Observations');
  var self = this;
  return this.getObservations()
  .then(function(observations) {
    var firstObs = observations[0];
    return self.createObservationTable(geopackage, {

    })
    .then(function() {
      self.createAttachmentTable(geopackage);
    })
    .then(function() {
      return observations.reduce(function(sequence, observation) {
        return sequence.then(function() {

          var form = self._event.formMap[observation.properties.forms[0].formId];
          var primary = observation.properties.forms[0][form.primaryField];
          var variant = observation.properties.forms[0][form.variantField];

          var properties = {
            lastModified: observation.lastModified,
            timestamp: observation.properties.timestamp,
            mageId: observation._id.toString(),
            userId: observation.userId.toString(),
            deviceId: observation.deviceId.toString(),
            createdAt: observation.createdAt,
            primaryField: primary,
            variantField: variant
          }
          var geojson = {
            type:'Feature',
            geometry: observation.geometry,
            properties: properties
          };

          var featureId = GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geopackage, geojson, 'Observations');
          // insert the icon link
          var iconId = iconMap[observation.properties.forms[0].formId]['icon.png'];
          if (primary) {
            iconId = iconMap[observation.properties.forms[0].formId][primary]['icon.png'];
          }
          if (variant) {
            iconId = iconMap[observation.properties.forms[0].formId][primary][variant];
          }
          return GeoPackageAPI.linkMedia(geopackage, 'Observations', featureId, 'Icons', iconId)
          .then(function() {
            // insert all attachments and link them
            if (observation.attachments) {
              return self.addAttachments(geopackage, observation.attachments, featureId);
            }
          })
          .then(function() {
            // insert all of the forms as linked attribute tables
            return observation.properties.forms.reduce(function(sequence, form) {
              return sequence.then(function() {
                form.primaryField = primary;
                form.variantField = variant;
                form.formId = form.formId.toString();
                var rowId = GeoPackageAPI.addAttributeRow(geopackage, 'Form_'+form.formId, form);
                var relatedTables = geopackage.getRelatedTablesExtension();
                return relatedTables.linkRelatedIds('Observations', featureId, 'Form_'+form.formId, rowId, {
                  name: 'simple_attributes',
                  dataType: 'ATTRIBUTES'
                });
                // form { field8: '', field7: 'None', type: 'VIP', formId: 1 }
                // console.log('form', form);

              });
            }, Promise.resolve());
          });
        });
      }, Promise.resolve())
      .catch(function(error){
        console.log('error', error);
      });
    });
  });
}

GeoPackage.prototype.addAttachments = function(geopackage, attachments, observationId) {
  console.log('Add Attachments');
  // attachments:
  //  [ { contentType: 'image/jpeg',
  //      size: 220814,
  //      name: '1c44fd1f0501f45477eab5841ff4e793.jpg',
  //      relativePath: 'observations1/2018/9/24/1c44fd1f0501f45477eab5841ff4e793.jpg',
  //      lastModified: 2018-09-24T18:03:52.030Z,
  //      _id: 5ba92708315b25bfeed06308,
  //      thumbnails: [],
  //      oriented: false } ] }

  return attachments.reduce(function(sequence, attachment) {
    return sequence.then(function() {
      return new Promise(function(resolve, reject) {
        fs.readFile(path.join(attachmentBase, attachment.relativePath), function(err, dataBuffer) {
          var mediaId = GeoPackageAPI.addMedia(geopackage, 'Attachments', dataBuffer, attachment.contentType, {
            name: attachment.name,
            size: attachment.size
          });

          resolve(GeoPackageAPI.linkMedia(geopackage, 'Observations', observationId, 'Attachments', mediaId));
        });
      });
    });
  }, Promise.resolve());
}

GeoPackage.prototype.addObservationIcons = function(geopackage, rootDir) {
  console.log('Add Icons', rootDir);
  this.createIconTable(geopackage);

  var self = this;

  // Icon.getAll({eventId: self._event._id}, function(err, icons) {
  //   console.log('icons', icons);
  //   stream.write(writer.generateObservationStyles(self._event, icons));
  //   stream.write(writer.generateKMLFolderStart(self._event.name, false));
  //
  //   observations.forEach(function(o) {
  //     var form = null;
  //     var primary = null;
  //     var variant = null;
  //     if (o.properties.forms.length) {
  //       form = self._event.formMap[o.properties.forms[0].formId];
  //       primary = o.properties.forms[0][form.primaryField];
  //       variant = o.properties.forms[0][form.variantField];
  //     }
  //
  //     self.mapObservations(o);
  //     var name = primary || form.name || self._event.name;
  //     stream.write(writer.generateObservationPlacemark(name, o, form, primary, variant));
  //
  //     o.attachments.forEach(function(attachment) {
  //       archive.file(path.join(attachmentBase, attachment.relativePath), {name: attachment.relativePath});
  //     });
  //   });
  //
  //   stream.write(writer.generateKMLFolderClose());
  //
  //   // throw in icons
  //   archive.directory(new api.Icon(self._event._id).getBasePath(), 'icons/' + self._event._id, {date: new Date()});
  //
  //   done();
  // });
  //
  var formDirs = fs.readdirSync(path.join(rootDir));
  return formDirs.reduce(function(formSequence, formDir) {
    return formSequence.then(function() {
      iconMap[formDir] = iconMap[formDir] || {};
      if (formDir === 'icon.png') {
        return new Promise(function(resolve, reject) {
          fs.readFile(path.join(rootDir, formDir), function(err, iconBuffer) {
            var iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
              formId: formDir
            });
            iconMap[formDir] = iconId;
            resolve();
          });
        });
      } else {
        var primaryDirs = fs.readdirSync(path.join(rootDir, formDir));
        return primaryDirs.reduce(function(primarySequence, primaryDir) {
          return primarySequence.then(function() {
            if (primaryDir === 'icon.png') {
              return new Promise(function(resolve, reject) {
                fs.readFile(path.join(rootDir, formDir, primaryDir), function(err, iconBuffer) {
                  var iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
                    formId: formDir
                  });
                  iconMap[formDir]['icon.png'] = iconId;
                  resolve();
                });
              });
            } else {
              iconMap[formDir][primaryDir] = iconMap[formDir][primaryDir] || {};
              var variantDirs = fs.readdirSync(path.join(rootDir, formDir, primaryDir));
              return variantDirs.reduce(function(variantSequence, variantDir) {
                return variantSequence.then(function() {
                  if (variantDir === 'icon.png') {
                    return new Promise(function(resolve, reject) {
                      fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir), function(err, iconBuffer) {
                        var iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
                          formId: formDir,
                          primary: primaryDir
                        });
                        iconMap[formDir][primaryDir]['icon.png'] = iconId;
                        resolve();
                      });
                    });
                  } else {
                    return new Promise(function(resolve, reject) {
                      fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir, 'icon.png'), function(err, iconBuffer) {
                        var iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
                          formId: formDir,
                          primary: primaryDir,
                          variant: variantDir
                        });
                        iconMap[formDir][primaryDir][variantDir] = iconId;
                        resolve();
                      });
                    });
                  }
                });
              }, Promise.resolve());
            }
          });
        }, Promise.resolve());
      }
    });
  }, Promise.resolve());
}

GeoPackage.prototype.createGeoPackageFile = function(callback) {
  console.log('Create GeoPackage File');
  var filePath = path.join(__dirname, 'mage.gpkg');
  fs.unlink(filePath, function() {
    fs.mkdir(path.dirname(filePath), function() {
      fs.open(filePath, 'w', function(err){
        callback(err, filePath);
      });
    });
  });
}

// GeoJson.prototype.streamObservations = function(stream, archive, done) {
//   var self = this;
//
//   self._filter.states = ['active'];
//   new api.Observation(self._event).getAll({filter: self._filter}, function(err, observations) {
//     if (err) return err;
//
//     self.mapObservations(observations);
//     observations = observations.map(function(o) {
//       return {
//         geometry: o.geometry,
//         properties: o.properties,
//         attachments: o.attachments
//       };
//     });
//
//     observations.forEach(function(o) {
//       o.attachments = o.attachments.map(function(attachment) {
//         return {
//           name: attachment.name,
//           relativePath: attachment.relativePath,
//           size: attachment.size,
//           contentType: attachment.contentType,
//           width: attachment.width,
//           height: attachment.height,
//         };
//       });
//
//       o.attachments.forEach(function(attachment) {
//         archive.file(path.join(attachmentBase, attachment.relativePath), {name: attachment.relativePath});
//       });
//     });
//
//     stream.write(JSON.stringify({
//       type: 'FeatureCollection',
//       features: observations
//     }));
//
//     // throw in icons
//     archive.directory(new api.Icon(self._event._id).getBasePath(), 'mage-export/icons', {date: new Date()});
//
//     done();
//   });
// };
//
// GeoJson.prototype.streamLocations = function(stream, done) {
//   log.info('writing locations...');
//
//   var self = this;
//   var limit = 2000;
//
//   var startDate = self._filter.startDate ? moment(self._filter.startDate) : null;
//   var endDate = self._filter.endDate ? moment(self._filter.endDate) : null;
//   var lastLocationId = null;
//
//   stream.write('{"type": "FeatureCollection", "features": [');
//   var locations = [];
//   async.doUntil(function(done) {
//     self.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, function(err, requestedLocations) {
//       if (err) return done(err);
//
//       locations = requestedLocations;
//
//       locations.forEach(location => {
//         var centroid = turfCentroid(location);
//         location.properties.mgrs = mgrs.forward(centroid.geometry.coordinates);
//       });
//
//       if (locations.length) {
//         if (lastLocationId) stream.write(",");  // not first time through
//
//         var data = JSON.stringify(locations);
//         stream.write(data.substr(1, data.length - 2));
//       } else {
//         stream.write(']}');
//       }
//
//       log.info('Successfully wrote ' + locations.length + ' locations to GeoJSON');
//       var last = locations.slice(-1).pop();
//       if (last) {
//         var locationTime = moment(last.properties.timestamp);
//         lastLocationId = last._id;
//         if (!startDate || startDate.isBefore(locationTime)) {
//           startDate = locationTime;
//         }
//       }
//
//       done();
//     });
//   },
//   function() {
//     return locations.length === 0;
//   },
//   function(err) {
//     log.info('done writing locations');
//     done(err);
//   });
// };
