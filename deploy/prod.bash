#!/bin/bash
source .env

ssh -p $DEPLOY_PORT $DEPLOY_URL "
  cd $DEPLOY_FOLDER &&
  git reset --hard origin/master &&
  git pull &&
  yarn &&
  yarn build &&
  yarn stop:pm2 &&
  yarn start:pm2
"
