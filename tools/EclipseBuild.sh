#!/bin/bash
cd $OTSDAQUTILITIES_BUILD/..
source setupARTDAQOTS
cd $OTSDAQUTILITIES_BUILD
source $OTSDAQUTILITIES_REPO/ups/setup_for_development -p
buildtool $@
