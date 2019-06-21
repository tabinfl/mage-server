

const eventCollectionPathBase = {
  "get" : {
    "tags" : [ "Capabilities" ],
    "summary" : "describe the {collectionId} feature collection",
    "operationId" : "describe_collection:",
    "responses" : {
      "200" : {
        "description" : "Metadata about the {collectionId} collection shared by this API.",
        "content" : {
          "application/json" : {
            "schema" : {
              "$ref" : "#/components/schemas/collectionInfo"
            }
          },
          "text/html" : {
            "schema" : {
              "type" : "string"
            }
          }
        }
      },
      "default" : {
        "description" : "An error occured.",
        "content" : {
          "application/json" : {
            "schema" : {
              "$ref" : "#/components/schemas/exception"
            }
          },
          "text/html" : {
            "schema" : {
              "type" : "string"
            }
          }
        }
      }
    }
  }
};

const eventCollectionInfoStub = {
  name: null,
  title: null,
  description: null,
  links: [],
  extent: [],
  crs: [ "http://www.opengis.net/def/crs/OGC/1.3/CRS84" ]
};

function observationCollectionIdOfEvent(event) {
  return `event:${event._id}:observations`;
}

function locationCollectionIdOfEvent(event) {
  return `event:${event._id}:locations`;
}

/**
 *
 * @param {Event} event
 */
function observationCollectionPathForEvent(event) {
  const colId = observationCollectionIdOfEvent(event);
  const path = `/collections/${colId}`;
  const def = JSON.parse(JSON.stringify(eventCollectionPathBase));
  const describeCollection = def['get'];
  describeCollection.operationId += colId;
  describeCollection.summary = `Observations from ${event.name}`;
  describeCollection.responses['200'].description = `Meta-data about the ${event.name} event observation feature collection`;
  const pair = {};
  pair[path] = def;
  return pair;
}

/**
 *
 * @param {Event} event
 */
function locationCollectionPathForEvent(event) {
  const colId = locationCollectionIdOfEvent(event);
  const path = `/collections/${colId}`;
  const def = JSON.parse(JSON.stringify(eventCollectionPathBase));
  const describeCollection = def['get'];
  describeCollection.operationId += colId;
  describeCollection.summary = `User locations from ${event.name}`;
  describeCollection.responses['200'].description = `Meta-data about the ${event.name} event locations feature collection`;
  const pair = {};
  pair[path] = def;
  return pair;
}
const eventItemsPathBase = {
  "get" : {
    "tags" : [ "Features" ],
    "summary" : null,
    "description" : null,
    "operationId" : null,
    "parameters" : [ {
      "name" : "collectionId",
      "in" : "path",
      "description" : "Identifier (name) of a specific collection",
      "required" : true,
      "style" : "simple",
      "explode" : false,
      "schema" : {
        "type" : "string"
      }
    }, {
      "name" : "limit",
      "in" : "query",
      "description" : "The optional limit parameter limits the number of items that are\npresented in the response document.\n\nOnly items are counted that are on the first level of the collection in\nthe response document. Nested objects contained within the explicitly\nrequested items shall not be counted.\n\n* Minimum = 1\n* Maximum = 10000\n* Default = 10\n",
      "required" : false,
      "style" : "form",
      "explode" : false,
      "schema" : {
        "maximum" : 10000,
        "minimum" : 1,
        "type" : "integer",
        "default" : 10
      }
    },
    {
      "name" : "bbox",
      "in" : "query",
      "description" : "Only features that have a geometry that intersects the bounding box are selected. The bounding box is provided as four or six numbers, depending on whether the coordinate reference system includes a vertical axis (elevation or depth):\n* Lower left corner, coordinate axis 1 * Lower left corner, coordinate axis 2 * Lower left corner, coordinate axis 3 (optional) * Upper right corner, coordinate axis 1 * Upper right corner, coordinate axis 2 * Upper right corner, coordinate axis 3 (optional)\nThe coordinate reference system of the values is WGS84 longitude/latitude (http://www.opengis.net/def/crs/OGC/1.3/CRS84) unless a different coordinate reference system is specified in the parameter `bbox-crs`.\nFor WGS84 longitude/latitude the values are in most cases the sequence of minimum longitude, minimum latitude, maximum longitude and maximum latitude. However, in cases where the box spans the antimeridian the first value (west-most box edge) is larger than the third value (east-most box edge).\nIf a feature has multiple spatial geometry properties, it is the decision of the server whether only a single spatial geometry property is used to determine the extent or all relevant geometries.\n",
      "required" : false,
      "style" : "form",
      "explode" : false,
      "schema" : {
        "maxItems" : 6,
        "minItems" : 4,
        "type" : "array",
        "items" : {
          "type" : "number"
        }
      }
    },
    {
      "name" : "time",
      "in" : "query",
      "description" : "Either a date-time or a period string that adheres to RFC 3339. Examples:\n* A date-time: \"2018-02-12T23:20:50Z\" * A period: \"2018-02-12T00:00:00Z/2018-03-18T12:31:12Z\" or \"2018-02-12T00:00:00Z/P1M6DT12H31M12S\"\nOnly features that have a temporal property that intersects the value of `time` are selected.\nIf a feature has multiple temporal properties, it is the decision of the server whether only a single temporal property is used to determine the extent or all relevant temporal properties.",
      "required" : false,
      "style" : "form",
      "explode" : false,
      "schema" : {
        "type" : "string"
      }
    } ],
    "responses" : {
      "200" : {
        "description" : null,
        "content" : {
          "application/geo+json" : {
            "schema" : {
              "$ref" : "#/components/schemas/featureCollectionGeoJSON"
            }
          },
          "text/html" : {
            "schema" : {
              "type" : "string"
            }
          }
        }
      },
      "default" : {
        "description" : "An error occured.",
        "content" : {
          "application/json" : {
            "schema" : {
              "$ref" : "#/components/schemas/exception"
            }
          },
          "text/html" : {
            "schema" : {
              "type" : "string"
            }
          }
        }
      }
    }
  }
};

function observationItemsPathForEvent(event, obsGeoJsonSchema) {
  const colId = observationCollectionIdOfEvent(event);
  const path = `/collections/${colId}/items`;
  const def = JSON.parse(JSON.stringify(eventItemsPathBase));
  def['get'].summary = `Observations for event ${event.name}`;
  def['get'].description = '';
  def['get'].operationId = `get_observations:event:${event._id}`;
  const responseDef = def['get']['responses']['200'];
  responseDef.description = `Observations from event ${event.name}`;
  const geoJsonContentDef = responseDef['content']['application/geo+json'];
  const schemaRef = Object.keys(obsGeoJsonSchema)[0];
  Object.assign(geoJsonContentDef, { schema: { $ref: `#/components/schemas/${schemaRef}` } });
  const pair = {};
  pair[path] = def;
  return pair;
}

function locationItemsPathForEvent(event) {
  const colId = locationCollectionIdOfEvent(event);
  const path = `/collections/${colId}/items`;
  const def = JSON.parse(JSON.stringify(eventItemsPathBase));
  def['get'].summary = `User locations for event ${event.name}`;
  def['get'].description = '';
  def['get'].operationId = `get_locations:event:${event._id}`;
  const responseDef = def['get']['responses']['200'];
  responseDef.description = `User locations from event ${event.name}`;
  const geoJsonContentDef = responseDef['content']['application/geo+json'];
  Object.assign(geoJsonContentDef, { schema: { $ref: `#/components/schemas/eventLocationFeatureCollectionGeoJSON` } });
  const pair = {};
  pair[path] = def;
  return pair;
}

/**
 * Generate the OAF collection info document for the observations of the given event.
 *
 * @param {Event} event
 */
function observationCollectionInfoForEvent(event, baseUrl) {
  const info = JSON.parse(JSON.stringify(eventCollectionInfoStub));
  info.id = `${event._id}:observations`;
  info.title = event.name;
  info.description = event.description;
  info.links.push({
    rel: 'items',
    href: `${baseUrl}/collections/${info.id}/items`,
    type: "application/geo+json",
    title: `${info.title} observation as features`
  });
}

/**
 * Generate the OAF collection info document for the locations of the given event.
 *
 * @param {Event} event
 */
function locationCollectionInfoForEvent(event) {
  const info = JSON.parse(JSON.stringify(eventCollectionInfoStub));
  info.id = `${event._id}:locations`;
  info.title = event.name;
  info.description = event.description;
  info.links.push({
    rel: 'items',
    href: '',
    type: "application/geo+json",
    title: `${info.title} observation as features`
  });
}

const observationItemFeatureGeoJsonSchemaBase = {
  "allOf": [
    { "$ref": "#/components/schemas/featureGeoJSON" },
    {
      "type": "object",
      "properties": {
        "properties": {}
      }
    }
  ]
};

/**
 * Build the overall (GEO)JSON Schema for the feature items of the given event,
 * including all forms of the event.
 *
 * @param {Event} event
 */
function itemSchemaForFormsOfEvent(event) {
  const properties = {};
  for (const form of event.forms) {
    const formPrefix = keyPrefixForForm(form);
    for (const field of form.fields) {
      const fieldKey = keyForFormField(formPrefix, field);
      const schemaType = jsonSchemaTypeOfField(field);
      if (schemaType) {
        properties[fieldKey] = schemaType;
      }
    }
  }
  const itemSchema = JSON.parse(JSON.stringify(observationItemFeatureGeoJsonSchemaBase));
  Object.assign(itemSchema['allOf'][1]['properties'], properties);
  const schemaRef = `event${event._id}-observationFeatureCollectionGeoJSON`;
  const pair = {};
  pair[schemaRef] = {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: [ 'FeatureCollection' ]
      },
      features: {
        type: 'array',
        items: itemSchema
      }
    }
  };
  return pair;
}

// TODO: fill enums for dropdown types and radios
// eslint-disable-next-line complexity
function jsonSchemaTypeOfField(field) {
  if (field.type === 'textfield') {
    return { type: 'string' };
  }
  else if (field.type === 'numberfield') {
    return { type: 'number' };
  }
  else if (field.type === 'email') {
    return {
      type: 'string',
      format: 'email'
    };
  }
  else if (field.type === 'password') {
    return null;
  }
  else if (field.type === 'radio') {
    return {
      type: 'string',
      enum: field.choices.map(option => option.title)
    };
  }
  else if (field.type === 'dropdown') {
    return {
      type: 'string',
      enum: field.choices.map(option => option.title)
    };
  }
  else if (field.type === 'multiselectdropdown') {
    return {
      type: 'array',
      items: {
        type: 'string',
        enum: field.choices.map(option => option.title)
      }
    };
  }
  else if (field.type === 'date') {
    return {
      type: 'string',
      format: 'date-time'
    };
  }
  else if (field.type === 'geometry') {
    return null;
  }
  else if (field.type === 'textarea') {
    return { type: 'string' };
  }
  else if (field.type === 'checkbox') {
    return { type: 'boolean' };
  }
  else if (field.type === 'hidden') {
    return null;
  }
  return null;
}

function keyForFormField(form, field) {
  if (typeof form === 'object') {
    form = keyPrefixForForm(form);
  }
  return `${form}_${keyForField(field)}`;
}

function keyPrefixForForm(form) {
  return `${sanitizeName(form.name)}_${form._id}`;
}

function keyForField(field) {
  return `${sanitizeName(field.title)}_${field.id}`;
}

function sanitizeName(name) {
  return `${name}`.replace(/(\s|\W)+/g, '_').replace(/(^_+)|(_+$)/g, '').toLowerCase();
}

/**
 *
 * @param {Form} form
 */
function geojsonSchemaForForm(form) {

}

function jsonSchemaForFormField(field) {

}

module.exports = function(app, security) {

  const express = require('express');
  const fs = require('fs-extra');
  const moment = require('moment');
  const path = require('path');
  const pug = require('pug');
  const log = require('winston');
  const turfCentroid = require('@turf/centroid');
  const api = require('../../api');
  const environment = require('../../environment/env');
  const Event = require('../../models/event');
  const Team = require('../../models/team');
  const access = require('../../access');
  const geometryFormat = require('../../format/geoJsonFormat');
  const observationXform = require('../../transformers/observation');
  const passport = security.authentication.passport;

  const routes = express.Router();

  const determineReadAccess = (req, res, next) => {
    if (!access.userHasPermission(req.user, 'READ_EVENT_ALL')) {
      req.access = { user: req.user, permission: 'read' };
    }
    next();
  };

  const validateObservationReadAccess = (req, res, next) => {
    if (access.userHasPermission(req.user, 'READ_OBSERVATION_ALL')) {
      next();
    } else if (access.userHasPermission(req.user, 'READ_OBSERVATION_EVENT')) {
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
  };

  routes.use('/api',
    determineReadAccess,
    async (req, res) => {
      const apiDoc = await fs.readJSON(path.resolve(__dirname, 'openapi-static.json'));
      const events = await Event.getEventsAsync({ access: req.access });
      for (const event of events) {
        const obsPath = observationCollectionPathForEvent(event);
        const obsSchema = itemSchemaForFormsOfEvent(event);
        Object.assign(apiDoc.components.schemas, obsSchema);
        const obsItemsPath = observationItemsPathForEvent(event, obsSchema);
        const locPath = locationCollectionPathForEvent(event);
        const locItemsPath = locationItemsPathForEvent(event);
        Object.assign(apiDoc.paths,
          obsPath, obsItemsPath,
          locPath, locItemsPath);
      }
      return res.status(200).json(apiDoc);
    });

  routes.use('/conformance', (req, res) => {

    return res.status(200).json({
      conformsTo: [
        'http://www.opengis.net/spec/wfs-1/3.0/req/core',
        'http://www.opengis.net/spec/wfs-1/3.0/req/oas30',
        // 'http://www.opengis.net/spec/wfs-1/3.0/req/html',
        'http://www.opengis.net/spec/wfs-1/3.0/req/geojson'
      ]
    });
  });

  routes.use('/collections.json',
    determineReadAccess,
    async (req, res) => {
      const events = await Event.getEventsAsync({ access: req.access });
      const collections = [];
      for (const event of events) {
        const obsInfo = observationCollectionInfoForEvent(event);
        const locInfo = locationCollectionInfoForEvent(event);
        collections.push(obsInfo, locInfo);
      }
      return res.status(200).json({
        links: [
          {
            rel: 'self', href: ``
          }
        ],
        collections: collections
      });
    });

  routes.use('/collections/:colId/items:format', async (req, res) => {
    const colId = req.params['colId'];
    if (!colId) {
      return res.status(400).json({ code: 'bad_request', description: 'You must specify a collection.' });
    }
    let format = req.params['format'];
    format = (format.match(/\.(\w+)$/)[1] || 'json').toLowerCase();
    const parts = colId.match(/event:(\d+):(observations|locations)/);
    const eventId = parts[1];
    const itemType = parts[2];
    const event = await Event.getByIdAsync(eventId, {});
    var options = {
      // filter: req.parameters.filter,
      // fields: req.parameters.fields,
      // sort: req.parameters.sort
    };
    if (format === 'json') {
      if (itemType === 'observations') {
        const obsFeatureCollection = await observations(event, options);
        return res.contentType('application/geo+json').send(obsFeatureCollection);
      }
      return res.status(400).json({ code: 'bad_request', description: `Unknown item type: ${itemType}` });
    }
    return res.status(400).json({ code: 'bad_request', description: `Invalid requested format: ${format}` });
  });

  function observations(event, options) {
    return new Promise((resolve, reject) => {
      new api.Observation(event).getAll(options, function(err, observations) {
        if (err) {
          log.error('error fetching observations: ', err);
          return reject(err);
        }
        return resolve(transformObservations(observations, event));
      });
    });
  }

  function transformObservations(observations, event) {
    const features = observations.map(function(observation) {
      const feature = {
        type: 'Feature',
        geometry: observation.geometry,
        properties: {}
      };
      let obsForms = observation.properties.forms || [];
      obsForms = obsForms.reduce((prev, cur) => {
        prev[`${cur.formId}`] = cur;
        return prev;
      } , {});
      event.forms.forEach(form => {
        const obsFields = obsForms[`${form._id}`];
        if (!obsFields) {
          return;
        }
        const formPrefix = keyPrefixForForm(form);
        for (const field of form.fields) {
          const fieldKey = keyForFormField(formPrefix, field);
          const obsVal = obsFields[field.name];
          if (obsVal) {
            feature.properties[fieldKey] = obsVal;
          }
        }
      });
      return feature;
    });
    return {
      type: 'FeatureCollection',
      features
    };
  }

  app.use('/api/ogc/features', routes);
};