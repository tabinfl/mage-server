var util = require('util')
  , fs = require('fs-extra')
  , api = require('../api')
  , archiver = require('archiver')
  , moment = require('moment')
  , log = require('winston')
  , path = require('path')
  , Exporter = require('./exporter')
  , GeoPackageAPI = require('@ngageoint/geopackage')
  , environment = require('../environment/env')
  , os = require('os');

var attachmentBase = environment.attachmentBaseDirectory;

function GeoPackage(options) {
  GeoPackage.super_.call(this, options);
}

util.inherits(GeoPackage, Exporter);
module.exports = GeoPackage;

GeoPackage.prototype.export = async function(streamable) {
  log.info('Export the GeoPackage');
  var self = this;

  var downloadedFileName = 'mage-' + self._event.name;

  streamable.type('application/zip');
  streamable.attachment(downloadedFileName + '.zip');

  var archive = archiver('zip');
  archive.pipe(streamable);

  try {
    var filePath = await this.createGeoPackageFile();
    var gp = await GeoPackageAPI.create(filePath);
    log.info('GeoPackage created');
    await this.createUserTable(gp);
    log.info('User table created');
    await this.addFormDataToGeoPackage(gp);
    log.info('Form Data added');
    await this.createFormAttributeTables(gp);
    log.info('Form attribute tables created');
    await this.addObservationIcons(gp);
    log.info('Observation icons added');
    await this.addObservationsToGeoPackage(gp);
    log.info('Observations added');
    await this.addLocationsToGeoPackage(gp, null, this._filter.startDate ? moment(this._filter.startDate) : null,
      this._filter.endDate ? moment(this._filter.endDate) : null);
    log.info('Locations added');
    await this.addUsersToUsersTable(gp);

    log.info('GeoPackage creation finished');
    archive.append(fs.createReadStream(filePath), {name: downloadedFileName + '.gpkg'});
    archive.on('end', function(){
      log.info('Removing temporary GeoPackage file: %s', filePath);
      fs.unlink(filePath, function() {
      });
    });
    archive.finalize();
  } catch (error) {
    log.info('Error exporting GeoPackage', error);
    fs.unlink(filePath, function() {
    });
  }
};

GeoPackage.prototype.createGeoPackageFile = function() {
  log.info('Create GeoPackage File');
  var filename = moment().format('YYYMMDD_hhmmssSSS') + '.gpkg';
  var filePath = path.join(os.tmpdir(), filename);
  return new Promise(function(resolve, reject) {
    fs.unlink(filePath, function() {
      fs.mkdir(path.dirname(filePath), function() {
        fs.open(filePath, 'w', function(err) {
          if (err) return reject(err);
          resolve(filePath);
        });
      });
    });
  });
};

GeoPackage.prototype.getObservations = async function() {
  this._filter.states = ['active'];
  return new Promise(resolve => {
    new api.Observation(this._event).getAll({filter: this._filter}, function(err, observations) {
      resolve(observations);
    });
  });
};

GeoPackage.prototype.getLocations = async function(lastLocationId, startDate, endDate) {
  var limit = 2000;
  return new Promise(resolve => {
    this.requestLocations({startDate: startDate, endDate: endDate, lastLocationId: lastLocationId, limit: limit}, (err, requestedLocations) => {
      resolve(requestedLocations);
    });
  });
};

var iconMap = {};

GeoPackage.prototype.createObservationTable = function(geopackage) {
  log.info('Create Observation Table');
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
};

GeoPackage.prototype.createAttachmentTable = function(geopackage) {
  log.info('Create Attachment Table');
  var columns = [{
    name: "name",
    dataType: "TEXT"
  },{
    name: "size",
    dataType: "REAL"
  }];
  return GeoPackageAPI.createMediaTableWithProperties(geopackage, 'Attachments', columns);
};

GeoPackage.prototype.createIconTable = function(geopackage) {
  log.info('Create Icon Table');
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
};

var locationTablesCreated = {
};

var usersLastLocation = {
};

GeoPackage.prototype.addUsersToUsersTable = async function(geopackage) {
  var userIds = Object.keys(this._users);
  for (const userId of userIds) {
    if (!usersLastLocation[userId]) {
      return;
    }

    var user = this._users[userId];
    var geoJson = {
      type: 'Feature',
      geometry: usersLastLocation[userId].geometry,
      properties: {
        timestamp: usersLastLocation[userId].properties.timestamp,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        phones: user.phones.join(', '),
        userId: userId
      }
    };
    var userRowId = GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geopackage, geoJson, 'Users');
    var iconBuffer = await fs.readFile(path.join(environment.userBaseDirectory, userId, 'icon'));
    var iconId = GeoPackageAPI.addMedia(geopackage, 'UserIcons', iconBuffer, user.icon.contentType, user.icon);
    await GeoPackageAPI.linkMedia(geopackage, 'Users', userRowId, 'UserIcons', iconId);
  }
  return geopackage;
};

GeoPackage.prototype.createLocationTableForUser = async function(geopackage, userId) {
  if (locationTablesCreated[userId]) return;
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
  return await GeoPackageAPI.createFeatureTableWithProperties(geopackage, 'Locations'+userId, columns);
};

GeoPackage.prototype.addLocationsToGeoPackage = async function(geopackage, lastLocationId, startDate, endDate) {
  log.info('Add Locations');

  var locations = await this.getLocations(lastLocationId, startDate, endDate);
  log.info('found some locations', locations.length);
  if (!locations || !locations.length) {
    return geopackage;
  }

  for (const location of locations) {
    var user = this._users[location.userId];
    await this.createLocationTableForUser(geopackage, location.userId.toString(), user, location);
    usersLastLocation[location.userId.toString()] = location;
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

    delete geojson.properties.id;
    await GeoPackageAPI.addGeoJSONFeatureToGeoPackage(geopackage, geojson, 'Locations'+location.userId.toString());
  }

  var last = locations.slice(-1).pop();
  if (last) {
    var locationTime = moment(last.properties.timestamp);
    lastLocationId = last._id;
    startDate = !startDate || startDate.isBefore(locationTime) ? locationTime : startDate;
    return await this.addLocationsToGeoPackage(geopackage, lastLocationId, startDate, endDate);
  }
  return geopackage;
};

GeoPackage.prototype.createFormAttributeTables = async function(geopackage) {
  log.info('Create Form Attribute Tables');
  for (const formId of Object.keys(this._event.formMap)) {
    var columns = [];
    var form = this._event.formMap[formId];
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
    await GeoPackageAPI.createAttributeTableWithProperties(geopackage, 'Form_'+formId, columns);
  }
  return geopackage;
};

GeoPackage.prototype.createUserTable = async function(geopackage) {
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
  await GeoPackageAPI.createFeatureTableWithProperties(geopackage, 'Users', columns);
  log.info('Create User Icon Table');
  columns = [{
    name: "type",
    dataType: "TEXT"
  },{
    name: "text",
    dataType: "TEXT"
  },{
    name: "color",
    dataType: "TEXT"
  }];
  await GeoPackageAPI.createMediaTableWithProperties(geopackage, 'UserIcons', columns);
  log.info('Create User Avatar Table');
  await GeoPackageAPI.createMediaTableWithProperties(geopackage, 'UserAvatars');
  return geopackage;
};

GeoPackage.prototype.addFormDataToGeoPackage = async function(geopackage) {
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

  await GeoPackageAPI.createAttributeTableWithProperties(geopackage, 'Forms', columns);
  for (var formId in this._event.formMap) {
    var form = this._event.formMap[formId];
    var row = {
      formName: form.name,
      primaryField: form.primaryField,
      variantField: form.variantField,
      color: form.color,
      formId: formId
    };

    GeoPackageAPI.addAttributeRow(geopackage, 'Forms', row);
  }
  return geopackage;
};

GeoPackage.prototype.addObservationsToGeoPackage = async function(geopackage) {
  log.info('Add Observations');
  var observations = await this.getObservations();
  await this.createObservationTable(geopackage, {});
  await this.createAttachmentTable(geopackage);
  for (const observation of observations) {
    var form = this._event.formMap[observation.properties.forms[0].formId];
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
    };
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
    await GeoPackageAPI.linkMedia(geopackage, 'Observations', featureId, 'Icons', iconId);
    // insert all attachments and link them
    if (observation.attachments) {
      return this.addAttachments(geopackage, observation.attachments, featureId);
    }
    // insert all of the forms as linked attribute tables
    for (const form of observation.properties.forms) {
      form.primaryField = primary;
      form.variantField = variant;
      form.formId = form.formId.toString();
      var rowId = GeoPackageAPI.addAttributeRow(geopackage, 'Form_'+form.formId, form);
      var relatedTables = geopackage.getRelatedTablesExtension();
      await relatedTables.linkRelatedIds('Observations', featureId, 'Form_'+form.formId, rowId, {
        name: 'simple_attributes',
        dataType: 'ATTRIBUTES'
      });
    }
  }
  return geopackage;
};

GeoPackage.prototype.addAttachments = async function(geopackage, attachments, observationId) {
  log.info('Add Attachments');
  for (const attachment of attachments) {
    var dataBuffer = await fs.readFile(path.join(attachmentBase, attachment.relativePath));
    var mediaId = GeoPackageAPI.addMedia(geopackage, 'Attachments', dataBuffer, attachment.contentType, {
      name: attachment.name,
      size: attachment.size
    });

    await GeoPackageAPI.linkMedia(geopackage, 'Observations', observationId, 'Attachments', mediaId);
  }
};

GeoPackage.prototype.addObservationIcons = async function(geopackage) {
  var rootDir = path.join(new api.Icon(this._event._id).getBasePath());

  log.info('Add Icons', rootDir);
  this.createIconTable(geopackage);

  var formDirs = fs.readdirSync(path.join(rootDir));
  for (const formDir of formDirs) {
    if (formDir === 'icon.png') {
      var iconBuffer = await fs.readFile(path.join(rootDir, formDir));
      var iconId = await GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
        formId: formDir
      });
      iconMap[formDir] = iconId;
    } else {
      iconMap[formDir] = iconMap[formDir] || {};
      var primaryDirs = fs.readdirSync(path.join(rootDir, formDir));
      for (const primaryDir of primaryDirs) {
        if (primaryDir === 'icon.png') {
          iconBuffer = await fs.readFile(path.join(rootDir, formDir, primaryDir));
          iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
            formId: formDir
          });
          iconMap[formDir]['icon.png'] = iconId;
        } else {
          iconMap[formDir][primaryDir] = iconMap[formDir][primaryDir] || {};
          var variantDirs = fs.readdirSync(path.join(rootDir, formDir, primaryDir));
          for (const variantDir of variantDirs) {
            if (variantDir === 'icon.png') {
              iconBuffer = await fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir));
              iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
                formId: formDir,
                primary: primaryDir
              });
              iconMap[formDir][primaryDir]['icon.png'] = iconId;
            } else {
              iconBuffer = await fs.readFile(path.join(rootDir, formDir, primaryDir, variantDir, 'icon.png'));
              iconId = GeoPackageAPI.addMedia(geopackage, 'Icons', iconBuffer, 'image/png', {
                formId: formDir,
                primary: primaryDir,
                variant: variantDir
              });
              iconMap[formDir][primaryDir][variantDir] = iconId;
            }
          }
        }
      }
    }
  }
  return geopackage;
};
