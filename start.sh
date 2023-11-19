#!/bin/bash
chmod +x wait-for-it.sh
./wait-for-it.sh -s -t 300 $TAIKO_WEB_MONGO_HOST:27017 -- python app.py 34801 -b 0.0.0.0
