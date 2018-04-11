#!/usr/bin/env sh

export MAGE_MONGO_SCHEME=mongodb
export MAGE_MONGO_HOST=127.0.0.1
export MAGE_MONGO_PORT=27017
export MAGE_MONGO_DATABASE=magedb
export MAGE_MONGO_SSL=false
export MAGE_MONGO_POOL_SIZE=5
export MAGE_MONGO_SERVER

export MAGE_PORT=4242
export MAGE_ADDRESS=0.0.0.0
export MAGE_USER_DIR=/var/lib/mage/users
export MAGE_ICON_DIR=/var/lib/mage/icons
# number seconds an authentication token is valid; default 8 hours
export MAGE_TOKEN_EXPIRATION=28800