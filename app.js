const mongoose = require('mongoose')
  , fs = require('fs-extra')
  , environment = require('./environment/env')
  , log = require('./logger');

const mongooseLogger = log.loggers.get('mongoose');

mongoose.set('debug', function(collection, method, query, doc, options) {
  mongooseLogger.log('mongoose', "%s.%s(%s, %s, %s)", collection, method, this.$format(query), this.$format(doc), this.$format(options));
});

mongoose.Error.messages.general.required = "{PATH} is required.";

log.info('Starting MAGE');

// Create directory for storing SAGE media attachments
const attachmentBase = environment.attachmentBaseDirectory;
fs.mkdirp(attachmentBase, function(err) {
  if (err) {
    log.error("Could not create directory to store MAGE media attachments. "  + err);
    throw err;
  } else {
    log.info("Using '" + attachmentBase + "' as base directory for feature attachments.");
  }
});

const iconBase = environment.iconBaseDirectory;
fs.mkdirp(iconBase, function(err) {
  if (err) {
    log.error("Could not create directory to store MAGE icons. "  + err);
  } else {
    log.info("Using '" + iconBase + "' as base directory for MAGE icons.");
  }
});

const app = require('./express.js');

const mongo = environment.mongo;
const connectTimeout = Date.now() + mongo.connectTimeout;
const connectRetryDelay = mongo.connectRetryDelay;

const attemptConnection = () => {
  log.info(`connecting to mongodb at ${mongo.uri} ...`);
  mongoose.connect(mongo.uri, mongo.options)
    .catch(err => {
      log.error('error connecting to mongodb database; please make sure mongodb is running: ' + !!err ? err : 'unknown error');
      if (Date.now() < connectTimeout) {
        log.info(`will retry connection in ${connectRetryDelay / 1000} seconds`);
        setTimeout(attemptConnection, connectRetryDelay);
      }
      throw `timed out after ${connectTimeout / 1000} seconds waiting for mongodb connection`;
    });
};

app.on('ready', () => {
  app.listen(environment.port, environment.address, () => log.info(`MAGE Server: listening at address ${environment.address} on port ${environment.port}`));
});

mongoose.connection.once('open', () => {
  log.info('database connection established; opening app for client connections ...');
  // install all plugins
  require('./plugins');
  app.emit('ready');
});

attemptConnection();
