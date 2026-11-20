#!/bin/bash

if ! [ -d $OTSDAQ_UTILITIES_DIR ]; then
    echo "You must first set up your otsdaq environment!"
    exit
fi

cd ${OTSDAQ_WEB_PATH:-$OTSDAQ_UTILITIES_DIR/WebGUI} # web code lives in the otsdaq-utilities-web repo
curl -o ext-6.2.0-gpl.zip https://otsdaq.fnal.gov/downloads/ext-6.2.0-gpl.zip
unzip -o ext-6.2.0-gpl.zip
rm ext-6.2.0-gpl.zip
