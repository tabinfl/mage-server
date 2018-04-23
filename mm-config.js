const 
environment = require('./environment/env'),
mongoose = require('mongoose'),
waitForMongooseConnection = require('./utilities/waitForMongooseConnection'),
log = require('winston');

require('models').initializeModels();

const mongo = environment.mongo;
const migrateConfig = {
  url: mongo.uri,
  collection: "migrations",
  directory: "migrations",
  options: mongo.options
};

log.info('connecting to database at ' + mongo.uri);
mongoose.connect(mongo.uri, mongo.options, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});

module.exports = migrateConfig;
