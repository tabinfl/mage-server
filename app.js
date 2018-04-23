const 
mongoose = require('mongoose'),
waitForMongooseConnection = require('./utilities/waitForMongooseConnection'),
fs = require('fs-extra'),
environment = require('./environment/env'),
log = require('./logger');

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

require('./models').initializeModels();

const app = require('./express.js');

app.on('databaseReady', () => {
  app.listen(environment.port, environment.address, () => log.info(`MAGE Server: listening at address ${environment.address} on port ${environment.port}`));
});

waitForMongooseConnection()
  .then(() => {
    log.info('database connection established; loading plugins ...');
    require('./plugins');
    log.info('opening app for connections ...')
    app.emit('datbaseReady');
  })
  .catch(err => {
    log.error(err);
    process.exitCode = 1;
  });

