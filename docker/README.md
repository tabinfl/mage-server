# Running With Docker

You can start a MAGE server by using [docker-compose](https://docs.docker.com/compose/overview/) to start services
defined in MAGE's [Compose file](docker-compose.yml).

Execute the following steps from the directory where you cloned the 
MAGE Git repoistory.

1. `cd ./docker`
1. `docker-compose build`
1. `docker-compose up -d mage-db` # bring up the mongodb database
1. `docker-compose up mage-server-migration` # when the database is up, run the database migrations
1. `docker-compose up -d mage-server` # start the web server 

With all the default settings, you should then be able to browse to http://localhost:4242 to interact with the MAGE Web app.

After the initial `build` and `up` commands, you can use 

## Details

### MongoDB Image

The MongoDB image is the official MongoDB image available from [Docker Hub](https://hub.docker.com/_/mongo/).  The Compose 
file builds that image unmodified, but uses a custom command to launch MongoDB with specific settings.  The Compose file 
runs MongoDB as the service `mage-db`.

### MAGE Server Image

The Compose file references a custom, local [Dockerfile](server/Dockerfile) based on the official [Node.js](https://hub.docker.com/_/node/)
image to build the MAGE server image.  At build time, the MAGE server Dockerfile downloads an archive of the MAGE server
code from [Github](https://github.com/ngageoint/mage-server).  This defaults to some (hopefully) recent release version of 
the MAGE server, e.g., 5.1.0.  The Dockerfile accepts an [argument](https://docs.docker.com/engine/reference/builder/#arg),
`MAGE_VER`, which you can specify like `docker-compose build --build-arg MAGE_VER=develop` to build with whatever version 
of MAGE server you wish.  Github should accept any valid refspec in the download URL the Docker file uses, so you could use
a branch name, tag name, or commit hash.

### Bind Mounts

The Compose file uses [bind mounts](https://docs.docker.com/storage/bind-mounts/) for the MongoDB database directory,
database log path, and MAGE server resources.  By default, the source paths of those bind mounts are `database/data`,
`database/log`, and `server/resources`, respectively.  You can change the source paths according to your environment
and needs.

With these bind mounts, the MAGE server will retain its data on your host file system in directories you can explore
and manage yourself.  For example, this setup allows you to mount a directory into the MAGE server container from a 
[FUSE-based](https://github.com/libfuse/libfuse) file system, which might provide extra functionality like 
[encryption](https://www.veracrypt.fr) or [remote mounting](https://github.com/libfuse/sshfs) transparently to the 
Docker container and MAGE application.  If you don't have any requirements of that sort, you can modify the Compose file
to use [Docker-managed volumes](https://docs.docker.com/storage/volumes/) instead of bind mounts.

### Environment Settings

