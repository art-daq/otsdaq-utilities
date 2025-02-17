#!/bin/sh
#
# create_tutorial_zips.sh 
#	Creates tutorial Data and databases zip files, updates repository, and transfers to otsdaq.fnal.gov web server.
#	After this script, there is still the remaining work of updating the links in the html pages of the live tutorial being updated.
#
# usage: --tutorial <tutorial name> --version <version string> --repo <path to repo area> --data <path to user data> --database <path to database>
# 
#   tutorial 
#		e.g. first_demo or artdaq
#   version 
#		usually looks like v2_2 to represent v2.2 release, for example 
#		(underscores might be more universal for web downloads than periods)
# 	repo 
#		is the path to the repository folder where tutorial data should be saved for posterity
#	data 
#		is the full path to the $USER_DATA (NoGitData) folder to become the official tutorial data
#	database
#		is the full path to the databases folder to become the official tutorial database
#
#  example run:
#	./create_tutorial_zips.sh --tutorial first_demo --version v2_2 --repo /home/rrivera/ots/srcs/otsdaq/tutorial_data --data /home/rrivera/ots/NoGitData --database /home/rrivera/databases
#
# Note: for now blocking users other than rrivera.. (forcing use of defaults for paths)

echo
echo
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t Do not source this script, run it as ./create_tutorial_zips.sh"
return  >/dev/null 2>&1 #return is used if script is sourced
		
echo
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t Extracting parameters..."
echo


SRC='/home/rrivera/data/ots/srcs/otsdaq/tutorial_data'
UDATA='/home/rrivera/data/ots/srcs/otsdaq_demo/NoGitData'
UDATABASES='/home/rrivera/data/ots/srcs/otsdaq_demo/NoGitDatabases'
		

if [[ "$1"  == "--tutorial" && "x$2" != "x" ]]; then
	TUTORIAL="$2"
fi

if [[ "$3"  == "--version" && "x$4" != "x" ]]; then
	VERSION="$4"
fi

if [[ "$5"  == "--repo" && "x$6" != "x" ]]; then
	SRC="$6"
fi

if [[ "$7"  == "--data" && "x$8" != "x" ]]; then
	UDATA="$8"
fi

if [[ "$9"  == "--database" && "x$10" != "x" ]]; then
	UDATABASES="$10"
fi

echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t TUTORIAL \t= $TUTORIAL"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t VERSION  \t= $VERSION"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t REPO     \t= $SRC"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t DATA     \t= $UDATA"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t DATABASE \t= $UDATABASES"

if [[ "x$TUTORIAL" == "x" || "x$VERSION" == "x" ]]; then 		#require a tutorial name and version string
	echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t usage: --tutorial <tutorial name> --version <version string> --src <path to repo area> --data <path to user data> --database <path to database>"
	exit
fi

if [ "x$5" != "x" ]; then 		#for now block other users that are not rrivera from using this, unless they explictly comment this out
		echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t usage: --tutorial <tutorial name> --version <version string> --src <path to repo area> --data <path to user data> --database <path to database>"
	exit
fi

echo
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t Creating UserData and UserDatabases zips..."
echo

SRC="${SRC}"

echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t source directory: ${SRC}/"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t user data directory: ${UDATA}"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t user databases directory: ${UDATABASES}"


#from otsdaq, replace tutorial within repo
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_databases; #replace databases 
cp -r ${UDATABASES} ${SRC}/tutorial_${TUTORIAL}_${VERSION}_databases;
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_databases/filesystemdb/test_db.*; 
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_databases/filesystemdb/test_db_*;
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_databases/filesystemdb/test_dbb*; #remove backups or bkups
cd ${SRC}
git add ${SRC}/tutorial_${TUTORIAL}_${VERSION}_databases/filesystemdb/test_db
cd -

rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data; #replace data
cp -r ${UDATA} ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data; 
rm ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/ServiceData/ActiveConfigurationGroups.cf*;
rm ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/ServiceData/ActiveTableGroups.cfg.*; 
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/ConfigurationInfo.*
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/OutputData/*   #*/ fix comment text coloring
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/Logs/*   #*/ fix comment text coloring
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/ServiceData/RunNumber/*  #*/ fix comment text coloring
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/ServiceData/MacroHistory/* #*/ fix comment text coloring
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/ServiceData/ProgressBarData 
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/ServiceData/RunControlData
rm -rf ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data/ServiceData/LoginData/UsersData/TooltipData
cd ${SRC}
git add ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data
cd -


#from home/tmp, make demo zips from repo
rm tutorial_${TUTORIAL}_${VERSION}_Data.zip
mv NoGitData NoGitData.mv.bk; #for safety attempt to move and then restore temporary folder
cp -r ${SRC}/tutorial_${TUTORIAL}_${VERSION}_Data NoGitData;
zip -r tutorial_${TUTORIAL}_${VERSION}_Data.zip NoGitData; 
rm -rf NoGitData; 
mv NoGitData.mv.bk NoGitData; 

rm tutorial_${TUTORIAL}_${VERSION}_database.zip
mv databases databases.mv.bk; #for safety attempt to move and then restore temporary folder
cp -r ${SRC}/tutorial_${TUTORIAL}_${VERSION}_databases databases; 
zip -r tutorial_${TUTORIAL}_${VERSION}_database.zip databases; 
rm -rf databases; 
mv databases.mv.bk databases;





echo
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t Done creating UserData and UserDatabases zips."
echo


echo
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t Transferring to web server..."
echo


scp tutorial_${TUTORIAL}_${VERSION}_Data.zip web-otsdaq@otsdaq.fnal.gov:/web/sites/otsdaq.fnal.gov/htdocs/downloads/
scp tutorial_${TUTORIAL}_${VERSION}_database.zip web-otsdaq@otsdaq.fnal.gov:/web/sites/otsdaq.fnal.gov/htdocs/downloads/

rm tutorial_${TUTORIAL}_${VERSION}_Data.zip
rm tutorial_${TUTORIAL}_${VERSION}_database.zip 



echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t TUTORIAL \t= $TUTORIAL"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t VERSION  \t= $VERSION"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t REPO     \t= $SRC"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t DATA     \t= $UDATA"
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t DATABASE \t= $UDATABASES"

echo
echo -e `date +"%h%y %T"` "create_tutorial_zips.sh [${LINENO}]  \t Done handling tutorial UserData and UserDatabases!"
echo



	