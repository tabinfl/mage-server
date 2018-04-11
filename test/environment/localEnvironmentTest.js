const
proxyquire = require('proxyquire'),
expect = require('chai').expect;

describe("local environment", function() {

  Object.assign(process.env, {
    MAGE_ADDRESS: '64.32.16.8',
    MAGE_PORT: '2424',
    MAGE_USER_DIR: '/test/users',
    MAGE_ICON_DIR: '/test/icons',
    MAGE_ATTACHMENT_DIR: '/test/attachments',
    MAGE_TOKEN_EXPIRATION: '6000',
    MAGE_MONGO_SCHEME: 'mongodb-test',
    MAGE_MONGO_HOST: 'db.test.mage',
    MAGE_MONGO_PORT: '54545',
    MAGE_MONGO_DATABASE: 'magedbtest',
    MAGE_MONGO_SSL: 'true',
    MAGE_MONGO_USER: 'mage_test',
    MAGE_MONGO_PASSWORD: 'test_mage',
    MAGE_MONGO_POOL_SIZE: '87'
  });

  const environment = require('../../environment/env');

  it("provides port", function() {
    expect(environment).to.have.property('port', 2424);
  });

  it("provides address", function() {
    expect(environment).to.have.property('address', '64.32.16.8');
  });

  it("provides attachment base directory", function() {
    expect(environment).to.have.property('attachmentBaseDirectory', '/test/attachments');
  });

  it("provides icon base directory", function() {
    expect(environment).to.have.property('iconBaseDirectory', '/test/icons');
  });

  it("provides user base directory", function() {
    expect(environment).to.have.property('userBaseDirectory', '/test/users');
  });
  
  it("provides token expiration", function() {
    expect(environment).to.have.property('tokenExpiration', 6000);
  });

  it("provides mongo config", function() {
    const mongo = environment.mongo;
    expect(mongo).to.have.property('uri', 'mongodb-test://db.test.mage:54545/magedbtest');
    const options = mongo.options;
    expect(options).to.have.property('userMongoClient', true);
    expect(options).to.have.property('poolSize', 87);
    expect(options).to.have.property('ssl', true);
    expect(options).to.have.deep.property('auth', { "user": "mage_test", "password": "test_mage" });
  });
  
});
