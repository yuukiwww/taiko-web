#!/bin/bash

docker run --detach \
  --name taiko-mongo-debug \
  --volume taiko-mongo:/data/db \
  --publish 27017:27017 \
  mongo

docker run --detach \
  --name taiko-redis-debug \
  --volume taiko-redis:/data \
  --publish 6379:6379 \
  redis

#pip install -r requirements.txt

#flask run
python -m flask run
