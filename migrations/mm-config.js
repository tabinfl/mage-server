const environment = require('../environment/env')
  , mongoose = require('mongoose')
  , log = require('winston');

const mongo = environment.mongo;

const migrateConfig = {
  url: mongo.uri,
  collection: "migrations",
  directory: "migrations",
  options: environment.mongo.options
};

log.info('using mongodb connection from: ' + mongo.uri);
mongoose.connect(environment.mongo.uri, environment.mongo.options, function(err) {
  if (err) {
    log.error('Error connecting to mongo database, please make sure mongodbConfig is running...');
    throw err;
  }
});

module.exports = migrateConfig;
