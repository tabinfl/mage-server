#!/bin/bash
# copy this file to hooks/post-receive in a bare git repo
name=mage
base=/$name
refspec=wfs3
pm2_config=$base/live/$name-live.config.js

echo "receiving mage live update"
cd $base/live
git --git-dir=$base/live.git --work-tree $base/live checkout $refspec -f
echo "$name live npm install..."
([ -d node_modules ] && rm -rf node_modules/) || true \
&& npm install \
&& echo "$name-live building ..." \
&& npm run build \
&& echo "$name-live build complete." \
&& (pm2 delete '$name-live' || true) \
&& pm2 start $pm2_config
