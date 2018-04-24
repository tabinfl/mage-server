'use strict';

const
log = require('winston'),
Event = require('../models/event').Model;

module.exports.id = "ensure-event-indexes";

module.exports.up = function(done) {
  // use this.db for MongoDB communication, and this.log() for logging
  const events = Event.collection;
  events.indexes().then(indexes => {
    const formIdIndex = indexes.find(index => {
      const keys = Object.keys(index.key);
      return keys.length == 1 && keys[0] == 'forms._id';
    });
    if (formIdIndex && !(formIdIndex.sparse && formIdIndex.unique)) {
      log.info(`dropping event forms._id index ${formIdIndex.name} and recreating unique, sparse index ...`)
      events.dropIndex(formIdIndex.name)
        .then(Event.ensureIndexes.bind(Event), done)
        .then(done, done);
    }
    else {
      Event.ensureIndexes().then(done, done);
    }
  }, done);
};

module.exports.down = function(done) {
  // use this.db for MongoDB communication, and this.log() for logging
  done();
};