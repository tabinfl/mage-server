Master [![Build Status Master Branch](https://travis-ci.org/ngageoint/mage-server.svg?branch=master)](https://travis-ci.org/ngageoint/mage-server/branches)  
Develop [![Build Status Develop Branch](https://travis-ci.org/ngageoint/mage-server.svg?branch=develop)](https://travis-ci.org/ngageoint/mage-server/branches)  

# MAGE server & Web client

The **M**obile **A**wareness **G**EOINT **E**nvironment, or MAGE, provides mobile situational awareness capabilities. The MAGE web client can be accessed over the internet and is optimized for desktop and mobile web browsers.  The MAGE web client allows you to create geotagged field reports that contain media such as photos, videos, and voice recordings and share them instantly with who you want. Using the HTML Geolocation API, MAGE can also track users locations in real time. Your locations can be automatically shared with the other members of your team.

MAGE is very customizable and can be tailored for your situation, including custom forms, avatars, and icons.

MAGE was developed at the National Geospatial-Intelligence Agency (NGA) in collaboration with BIT Systems. The government has "unlimited rights" and is releasing this software to increase the impact of government investments by providing developers with the opportunity to take things in new directions. The software use, modification, and distribution rights are stipulated within the Apache license.

The server supports the [MAGE Android](https://github.com/ngageoint/mage-android) and [MAGE iOS](https://github.com/ngageoint/mage-ios) mobile clients.

## Architecture

MAGE is built using the [MEAN stack](https://en.wikipedia.org/wiki/MEAN_(software_bundle)).  The components of the MEAN stack are as follows:
* [MongoDB](https://www.mongodb.com/), a NoSQL database;
* [Express.js](http://expressjs.com/), a web applications framework;
* [AngularJS](https://angularjs.org/), a JavaScript MVC framework for web apps;
* [Node.js](https://nodejs.org/), a software platform for scalable server-side and networking applications.

## API & documentation

The MAGE RESTful API is documented using [Swagger](http://swagger.io/). MAGE [swagger API docs](docs/swagger.json) are served out from [*/api/api-docs*](http://localhost:4242/api/api-docs).

If you want to explore the interactive documentation there is a link from the About page in the MAGE web client.  Your API token is automatically inserted into interactive docs.  Have fun and remember that the documentation is hitting the server's API, so be careful with modifying requests such as POST/PUT/DELETE.

### Code generation
Want to use the API to build your own client?  Swagger has many tools to generate method stubs based on the api.  [Swagger Codegen](https://github.com/swagger-api/swagger-codegen/blob/master/README.md) is a good place to start.

#### Android & iOS
Opensource MAGE [Android](https://github.com/ngageoint/mage-android) and [iOS](https://github.com/ngageoint/mage-ios) clients are available under the Apache License for anyone to use.  Check them out if you are considering mobile platforms.

If you are considering building your own iOS or Android application based on the MAGE API, the [Android SDK](https://github.com/ngageoint/mage-android-sdk) and [iOS SDK](https://github.com/ngageoint/mage-ios-sdk) are already built and tested around the MAGE API.

## Setup & installation
MAGE runs on most *nix operating systems, such as macOS, CentOS, and Ubuntu.  Although not currently supported, MAGE will run on Windows systems with some minor configuration (mainly paths) work.

MAGE depends the following software:
* [Node.js](https://nodejs.org/) >= 6 an <= 8
* [MongoDB](https://www.mongodb.org/) >= 3.0
* [Apache HTTP Server](https://httpd.apache.org/) >= 2.2.15
* [GraphicsMagick](http://www.graphicsmagick.org/) (optional, but recommended for image rotation and thumbnails) >= 1.3

### Node.js setup

#### Install [Node Version Manager](https://github.com/creationix/nvm)
This will make it simple to install a specific version of NodeJS as well as update to a newer version.
```bash
$ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash
$ source ~/.bashrc
```

#### Install [Node.js](https://nodejs.org/) with Node Version Manager
```bash
$ nvm install 8
$ node --version
```

### MongoDB setup
Install [MongoDB](https://docs.mongodb.com/manual/administration/install-community/) using your favorite package manager.

#### macOS install with homebrew
```bash
$ brew install mongo
$ mongo --version
```

#### CentOS install with yum
Configure mongo yum repository with your favorite editor

```bash
$ vi /etc/yum.repos.d/mongodb-org-3.4.repo
```
With contents:

```bash
[mongodb-org-3.4]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/amazon/2013.03/mongodb-org/3.4/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-3.4.asc
```

Install from newly created repo:

```bash
sudo yum install -y mongodb-org
```

Verify install:
```bash
$ mongo --version
```

#### Ubuntu install with apt
```bash
$ sudo apt-get install mongodb
$ mongo --version && mongod --version
```

For more information check out the mongo CentOS/RHEL install page <https://docs.mongodb.org/manual/tutorial/install-mongodb-on-red-hat/>

### GraphicsMagick setup
The optional, but recommended, [GraphicsMagick](http://www.graphicsmagick.org/) suite is used to rotate and thumbnail images on the MAGE server.  Many web browsers and mobile devices will not render rotated images based on their exif data.  By thumbnailing images, mobile clients can request smaller images, significantly increasing performance.

Install GraphicsMagick using your favorite package manager.

#### GraphicsMagick install with homebrew

```bash
$ brew install graphicsmagick
$ gm version
```

#### GraphicsMagick install with yum

```bash
$ yum install GraphicsMagick
$ gm version
```

#### Ubuntu install with apt

```bash
$ sudo apt-get install graphicsmagick
$ gm version
```

## Running MAGE

### MAGE installation and setup

#### Install the MAGE server
You can install the MAGE server wherever you would like. In this example we will install it in /opt

#### Grab the latest release[https://github.com/ngageoint/mage-server/releases]
```bash
$ mkdir /opt/mage
$ cd /opt/mage
$ curl https://codeload.github.com/ngageoint/mage-server/zip/<version> | tar -xf - -C .
```

The rest of the installation steps assume you are in the MAGE server directory, eg /opt/mage

### Installing dependencies and building MAGE
You can install all server and web dependencies by using npm from the mage-server directory:
```bash
$ npm install
```

### MAGE local media directory
By default MAGE will store media attachments (video, images, etc), as well as user and map icons locally on the MAGE server.  
The default base directory for these files is '/var/lib/mage', so you will need to create that.  If you would like to change 
where MAGE stores these files, please see the relevant material in [MAGE Setup](#setting-up-mage-for-local-deployment).

``` bash
$ mkdir /var/lib/mage
```

### Starting MongoDB
To start the mongo daemon type the following:
```bash
$ mongod --config <filename>
```

The mongodb configuation file will live in a different place depending on your system:
* homebrew: /usr/local/etc/mongod.conf
* yum: /etc/mongod.conf
* apt: /etc/mongodb.conf

MAGE will run with the provided configuration defaults, but feel free to modified these settings for your particular deployment.

### MAGE database setup
The migration patches live in the [migrations folder](migrations).  MAGE uses [mongodb-migrations](https://github.com/emirotin/mongodb-migrations) to support applying migrations.  On initial setup, you will have to run the migrations to create the initial user and device used to log into the web.

To run the migrations:
``` bash
$ npm run migrate
```

### Web dependencies and build

Initially you will need to pull down the web dependencies (via npm).   Make sure you run this again if you add any new dependencies in the web client.

```bash
$ npm run build
```

### Running the server

At this point you should be able to fire up your MAGE node server
```bash
$ node app.js
```

The node MAGE server runs on port 4242 by default.  You can access MAGE on port 4242 in your web browser [localhost:4242] (http://localhost:4242).

### Running with `forever`

The best way to handle critical errors in NodeJS is to let the node server crash immediately.  Upon crash the server should be restarted.  There are many tools to monitor your node process to ensure its running.  We are currently using a simple node script called [forever](https://github.com/foreverjs/forever) to accomplish this.

We will use npm (Node Package Manager) to install forever. The -g option will install globally in the /usr/bin directory.
```bash
$ npm install -g forever
```

To start forever run:
```bash
$ forever start app.js
```

For a full list of forever commands please refer to the [forever docs](https://github.com/foreverjs/forever/blob/master/README.md).

### Debugging the web app

If you are developing or debugging the web client it might be helpful to run a non-production build.  Open another terminal and navigate to the public directory from your MAGE root directory.
```bash
$ cd public
$ npm run start
```
This will run a [webpack](https://webpack.js.org/) dev server that provides live reloading of code changes as well as a source map.

### MAGE environment settings

MAGE environment configuration is located here: [environment/env.js](environment/env.js).  That module reads several environment
variables to configure MAGE, and provides sensible defaults for any that are not present.  For convenience, MAGE provides a 
[shell script](environment/magerc.sh) that exports all the MAGE environment variables.  You can copy this script to a convenient 
location on the machine that runs your MAGE server Node process and `source` it to initialize the MAGE server enironment with your 
settings.  The home directory of a user that runs the MAGE server Node process, or `/etc/mage` are good candidates.

#### Cloud Foundry deployment

MAGE uses the [cfenv](https://github.com/cloudfoundry-community/node-cfenv) node module to read settings from Cloud Foundry's
[environment variables](https://docs.cloudfoundry.org/devguide/deploy-apps/environment-variable.html).  If Cloud Foundry's 
environment variables are present, they will take precendence over any of their counterparts derived from the 
[magerc.sh](environment/env.js) file.  This pertains mostly to defining the connection to the MongoDB server as a bound service
in Cloud Foundry, for which Cloud Foundry should supply the connection string and credentials in the `VCAP_SERVICES` variable.

### Configuring and customizing MAGE

MAGE configuration lies within the config.js file located at the server's root directory.

Configuration:
* api - configuration parsed by clients for information about this MAGE server, exposed in /api call
    * name - Human readable MAGE server name
    * version - Used by MAGE clients to determine compatibility
        * major - Major server version. Updated when backwards breaking changes are implemented.
        * minor - Minor server version. Updated when significant feature changes are added that do not break backwards compatibility.
        * micro - Micro server version. Updated for bug fixes.
    * authenticationStrategies - hash of all authentication strategies accepted by this server.
        * local - local (username/password) authentication.  Usernames and passwords stored and managed localy by this MAGE server
            * passwordMinLength - minimum password length
        * google - google oauth2 authentication strategy.
            * callbackURL - google callback URL
            * clientID - google client ID
            * clientSecret - google client secret
    * provison - device provisioning strategy
        * strategy - provision strategy name.  Provisioning strategy name maps to file name in provisioning directory
* server - Server based configuration.  Not exposed to client
    * locationServices
        * userCollectionLocationLimit - user locations are stored in 2 different collections.  This is the limit for the capped locations.

```json
{
  "api": {
    "name": "MAGE (Mobile Awareness GEOINT Environment)",
    "version": {
      "major": 5,
      "minor": 0,
      "micro": 0
    },
    "authenticationStrategies": {
      "local": {
        "passwordMinLength": 14
      }
    },
    "provision": {
      "strategy": "uid"
    }
  },
  "server": {
    "locationServices": {
      "userCollectionLocationLimit": 100
    }
  }
}
```

## Plugins

MAGE plugins are seperate node scripts located in the plugins folder.  For more information about MAGE plugins please see the [MAGE Plugins README](plugins/README.md).

## Web application

The MAGE web application is built on the [AngularJS framework](https://angularjs.org/).  The application resides in the public directory.  See the 
[MAGE Web Application README](public/README.md) for more information.

## Pull Requests

If you'd like to contribute to this project, please make a pull request. We'll review the pull request and discuss the changes. All pull request contributions to this project will be released under the Apache license.

Software source code previously released under an open source license and then modified by NGA staff is considered a "joint work" (see 17 USC § 101); it is partially copyrighted, partially public domain, and as a whole is protected by the copyrights of the non-government authors and must be released according to the terms of the original open source license.

## License

Copyright 2015 BIT Systems

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
