
/*
This is a pm2 ecosystem file.  See http://pm2.keymetrics.io/.
*/


module.exports = {
  name: 'mage-live',
  script: 'app.js',

  // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
  instances: 1,
  autorestart: true,
  watch: false,
  max_memory_restart: '256M',
  merge_logs: true,
  env: {
    MAGE_SESSION_COOKIE_SECURE: 'true',
    MAGE_USER_DIR: '/mage/users',
    MAGE_ATTACHMENT_DIR: '/mage/attachments',
    MAGE_LAYER_DIR: '/mage/layers',
    MAGE_TOKEN_EXPIRATION: 43200
  }
};