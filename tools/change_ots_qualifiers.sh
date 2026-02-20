#!/bin/bash
#
# This script is expected to be executed (not sourced).
# It can be executed from any path (do not source it, execute with ./ )
#
# ./path/to/script/change_ots_qualifiers.sh <ots version> <qualifiers>
#
# If no parameters are given, the script will list the available versions and qualifiers
#
#	Example execution:
#
# 		./change_ots_qualifiers.sh    v2_05_00    s89:19:prof
#

export MRB_PROJECT=otsdaq_demo

echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "
echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ~~ change_ots_qualifiers ~~ "
echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "
echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "


# Need this source local scripts
SCRIPT_DIR="$(
 cd "$(dirname "$(readlink "$0" || printf %s "$0")")"
 pwd -P
)"

# get function from a single place (also used by UpdateOTS.sh, for example)
source "${SCRIPT_DIR}"/displayVersionsAndQualifiers.sh


# #############################
# #############################
# # function to display otsdaq versions and qualifiers
# function displayVersionsAndQualifiers
# {


# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t Note: below are the available otsdaq releases..."
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ----------------------------"
# 	#-s for silent, sed to remove closing </a>
# 	curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep \<\/a\> | grep _ | grep v  | grep --invert-match href | sed -e 's/<.*//'
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ----------------------------"
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t Note: above are the available otsdaq releases..."
# 	echo

# 	ALL_RELEASES=( $(curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep \<\/a\> | grep _ | grep v  | grep --invert-match href | sed -e 's/<.*//') )
# 	LATEST_RELEASE=${ALL_RELEASES[${#ALL_RELEASES[@]}-1]}
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t The latest otsdaq release is $LATEST_RELEASE"

# 	echo
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t Note: below are the available qualifiers for $LATEST_RELEASE.."
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ----------------------------"
# 	#-s for silent, sed to remove closing </a>
# 	curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/$LATEST_RELEASE/manifest/ | grep \<\/a\> | grep MANIFEST | sed -e 's/-d.*//' |  sed -e 's/-p.*//' |  sed -e 's/.*-s/                                                        s/' | sed -e 's/-/:/'
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ----------------------------"
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t Note: above are the available qualifiers for $LATEST_RELEASE.."
# 	echo
# 	ALL_QUALS=( $(curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/$LATEST_RELEASE/manifest/ | grep \<\/a\> | grep MANIFEST | sed -e 's/-d.*//' |  sed -e 's/-p.*//' |  sed -e 's/.*-s/ s/' | sed -e 's/-/:/') )
# 	LATEST_QUAL=${ALL_QUALS[${#ALL_QUALS[@]}-1]}
# 	echo
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t To explore the available qualifiers go here in your browser:"
# 	echo
# 	echo -e "\t\t\t\t https://scisoft.fnal.gov/scisoft/bundles/otsdaq"
# 	echo
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ... then click the version, and manifest folder to view qualifiers."
# 	echo
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t To switch qualifiers, do the following: \n\n\t\t\t\t ./change_ots_qualifiers.sh   $LATEST_RELEASE   $LATEST_QUAL:prof"
# 	echo
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ...and replace '$LATEST_RELEASE' with your target version. and '$LATEST_QUAL:prof' with your qualifiers"
# 	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ...a new localProducts directory will be created, which you should use when you setup ots."
# 	echo
# 	echo


# } #end displayVersionsAndQualifiers

#check parameters
if [[ "x$1" == "x"  || "x$2" == "x" ]]; then
    echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t Usage: Parameter 1 is the ots version, Parameter 2 is the compiler qualifiers"
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "
    echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  (do not source the script, execute with ./ )"
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  If no parameters are given, the script will list the available versions and qualifiers."
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t\t Example execution:"
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t\t\t ./change_ots_qualifiers.sh    v2_05_00    s89:e19:prof"
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "

	displayVersionsAndQualifiers


	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  "
	exit
fi

# at this point, there must have been valid parameters

echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t\t\t VERSION = $1    QUALS = $2"

displayVersionsAndQualifiers

VERSION=$1
if [ "$1" == "DEFAULT" ]; then
	VERSION=$LATEST_RELEASE
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t\t\t DEFAULT VERSION = $VERSION"
fi

QUAL=$2
if [ "$2" == "DEFAULT" ]; then
	QUAL="$LATEST_QUAL:prof" #"s96:e19:prof" #"$LATEST_QUAL:prof"
	echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t\t\t DEFAULT QUALS = $QUAL"
fi


mkdir oldLocalProducts
mv localProducts* oldLocalProducts/ >/dev/null 2>&1
source setup_ots.sh >/dev/null 2>&1
mrb newDev -f -v $VERSION -q $QUAL

echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t =================="
echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t ots change_ots_qualifiers script done"
echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t *******************************"
echo -e "$(date +%d%b%y.%T) change_ots_qualifiers.sh [${LINENO}]  \t *******************************"



exit
