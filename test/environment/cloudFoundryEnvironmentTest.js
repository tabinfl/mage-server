const 
expect = require('chai').expect,
proxyquire = require('proxyquire').noPreserveCache();

describe("cloud foundry environment", function() {

  process.env.PORT = '2424';
  process.env.MAGE_TOKEN_EXPIRATION = '3600';
  process.env.VCAP_APPLICATION = '{}';
  process.env.VCAP_SERVICES = JSON.stringify({
    "user-provided": [
      {
        name: 'MongoInstance',
        credentials: {
          scheme: 'mongodb-cf',
          host: 'db.test.mage',
          port: 27999,
          db: 'magedb_cf',
          username: 'cloudfoundry',
          password: 'foundrycloud',
          poolSize: 99
        }
      }
    ]
  });

  var environment = proxyquire('../../environment/env', {});

  it("provides port", function() {
    expect(environment).to.have.property('port', 2424);
  });

  it("provides address", function() {
    expect(environment).to.have.property('address', '0.0.0.0');
  });

  it("provides attachment base directory", function() {
    expect(environment).to.have.property('attachmentBaseDirectory', '/var/lib/mage/attachments');
  });

  it("provides icon base directory", function() {
    expect(environment).to.have.property('iconBaseDirectory', '/var/lib/mage/icons');
  });

  it("provides user base directory", function() {
    expect(environment).to.have.property('userBaseDirectory', '/var/lib/mage/users');
  });
  
  it("environment should provide token expiration", function() {
    expect(environment).to.have.property('tokenExpiration', 3600);
  });

  it("provides mongo connection config", function() {
    expect(environment).to.have.property('mongo');

    const mongo = environment.mongo;
    expect(mongo).to.have.property('uri', 'mongodb-cf://db.test.mage:27999/magedb_cf');
    const options = mongo.options;
    expect(options).to.have.property('useMongoClient', true);
    expect(options).to.have.property('ssl', false);
    expect(options).to.have.property('poolSize', 99);
    console.log(options.auth);
    expect(options).to.have.deep.property('auth', { "user": "cloudfoundry", "password": "foundrycloud" });
  });

});
