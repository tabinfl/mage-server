
const 
path = require('path'),
cfenv = require('cfenv');

const appEnv = cfenv.getAppEnv({
  vcap: {
    services: {
      "user-provided": [
        {
          name: 'MongoInstance',
          plan: 'unlimited',
          credentials: {
            scheme: process.env.MAGE_MONGO_SCHEME || 'mongodb',
            host: process.env.MAGE_MONGO_HOST || 'localhost',
            port: parseInt(process.env.MAGE_MONGO_PORT) || 27017,
            db: process.env.MAGE_MONGO_DATABASE || 'magedb',
            username: null,
            password: null,
            ssl: process.env.MAGE_MONGO_SSL,
            poolSize: parseInt(process.env.MAGE_MONGO_POOL_SIZE) || 5
          }
        }
      ]
    }
  }
});

if (appEnv.isLocal && appEnv.port == 3000) {
  // bit of whitebox to cfenv lib here, because it provides no
  // way to override the port value in options at construction,
  // and always sets the port to 3000 outside of Cloud Foundry
  // if PORT env var is not present
  appEnv.port = parseInt(process.env.MAGE_PORT || process.env.PORT) || 4242;
}

const mongoConfig = appEnv.getServiceCreds('MongoInstance');
const mongoSsl = String(mongoConfig.ssl).toLowerCase() in { "true":0, "yes":0, "enabled":0 };

const environment = {
  address: process.env.MAGE_ADDRESS || '0.0.0.0',
  port: appEnv.port,
  userBaseDirectory: path.resolve(process.env.MAGE_USER_DIR || '/var/lib/mage/users'),
  iconBaseDirectory: path.resolve(process.env.MAGE_ICON_DIR || '/var/lib/mage/icons'),
  attachmentBaseDirectory: path.resolve(process.env.MAGE_ATTACHMENT_DIR || '/var/lib/mage/attachments'),
  tokenExpiration: parseInt(process.env.MAGE_TOKEN_EXPIRATION) || 28800,
  mongo: {
    options: {
      useMongoClient: true, // this can be removed after upgrading to mongoose 5+ http://mongoosejs.com/docs/connections.html#v5-changes
      poolSize: mongoConfig.poolSize,
      ssl: mongoSsl,
      auth: {
        user: mongoConfig.user || mongoConfig.username || '',
        password: mongoConfig.password || ''
      }
    },
    get uri() {
      return `${mongoConfig.scheme}://${mongoConfig.host}:${mongoConfig.port}/${mongoConfig.db}`;
    }
  }
};

/*
SSL configuration
Comment out as nessecary to setup ssl between MAGE application MongoDB server
Refer to the nodejs mongo driver docs for more information about these options
http://mongodb.github.io/node-mongodb-native/2.0/tutorials/enterprise_features/
You will also need to setup SSL on the mongodb side: https://docs.mongodb.com/v3.0/tutorial/configure-ssl/

2-way ssl configuration with x509 certificate

Object.assign(environment.mongo.options, {
  ssl: true,
  sslValidate: false,
  sslCA: fs.readFileSync('/etc/ssl/mongodb-cert.crt'),
  sslKey: fs.readFileSync('/etc/ssl/mongodb.pem'),
  sslCert: fs.readFileSync('/etc/ssl/mongodb-cert.crt'),
  auth: {
    user: '',
    authdb: '$external' ,
    authMechanism: 'MONGODB-X509'
  }
});
*/

module.exports = environment;