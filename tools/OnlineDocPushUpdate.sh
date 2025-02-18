#!/bin/bash
#
# This script is expected to be in otsdaq utilities repository in a specific directory
# but it can be executed from any path (do not source it, execute with ./ )
#
# ./path/to/script/OnlineDocPushUpdate.sh <do NOT do mrb z> <only transfer main page> <transfer to dev area>
#
#		export OTS_WEB_USER="name"
#		export OTS_WEB_HOST="host"
#
#	For example:  ./srcs/otsdaq-utilities/tools/OnlineDocPushUpdate.sh 1 1 1 #<do NOT do mrb z> <only transfer main page> <transfer to dev area>
#
# Note: people keep commenting out CMakeLists requirements when doxygen causes issues,
#	so remember to have 'add_subdirectory(doc)'  in repo/CMakeLists.txt 
#	and ...				'include(artdaq_doxygen) \n create_doxygen_documentation()' in repo/doc/CMakeLists.txt
#   NOW -- export OTS_DOXY=DOIT  #to enable doxygen doc creation
#
# 
# Note: with option do MRB Z, this script calls ./doxygen_main_editor
#		to avoid requiring a successful compile:
# 	g++ ./srcs/otsdaq-utilities/onlineDoc/doxygen_main_editor.cpp -o doxygen_main_editor
#
# If an area is not formatted for doxygen style documentation, can apply temporarily/permanently:
# 	
# 	g++ ./srcs/otsdaq-utilities/tools/convert_comments_to_doxygen.cpp -o convert_comments_to_doxygen
#	./convert_comments_to_doxygen <path>
#
#	... with the goal to have .cc function comments like this
#
#		//==============================================================================
#		/// this function is useful
#
#	... and with the goal to have .h function comments like this
#  		bool slowControlsRunning(void);  ///< slow controls workloop calls this
#

echo 
echo
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t =================="
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Starting online doc push..."

if ! [ -e setup_ots.sh ]; then
	echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t You must run this script from an OTSDAQ installation directory!"
  	exit 1
fi

CURRENT_AWESOME_BASE=$PWD
CHECKIN_LOG_PATH=$CURRENT_AWESOME_BASE/.checkinAll.log
UPDATE_LOG_PATH=$CURRENT_AWESOME_BASE/.updateAll.log

echo 
echo
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Note: Your shell must be bash. If you received 'Expression Syntax' errors, please type 'bash' to switch."
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t You are using $0"
echo
echo


SCRIPT_DIR="$( 
  cd "$(dirname "$(readlink "$0" || printf %s "$0")")"
  pwd -P 
)"
		
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Script directory found as: $SCRIPT_DIR"


#######################################################################################################################
# regenerate documentation

echo
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t =================="
DO_MRBZ=0
if [[ "x$1" == "x" || "$1" == "0" ]]; then   #  <do NOT do mrb z> 
	DO_MRBZ=1
else
	echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Skipping mrb z and regeneration of documentation."
fi
ONLY_MAIN=1
if [[ "x$2" == "x" || "$2" == "0" ]]; then    #  <only transfer main page>
	ONLY_MAIN=0
else
	echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Only regenerating and updating main.html"
fi
RM_SCP_LOC="/pubhosting/sites/o/otsdaq.fnal.gov/data/deleteCodeNavDev.sh"
SCP_LOC="/docs/dev"
if [[ "x$3" == "x" || "$3" == "0" ]]; then    #  <transfer to dev area>
	RM_SCP_LOC="/pubhosting/sites/o/otsdaq.fnal.gov/data/deleteCodeNa.sh"
	SCP_LOC="/docs/code"
fi
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Transferring to location otsdaq.fnal.gov${SCP_LOC}"

set -- #clear all args
if [ $DO_MRBZ == 1 ]; then
	
	echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t CLEAN BUILD DOES NOT WORK FOR SPACK.. export OTS_DOXY=\"DOIT\" and do mz manually, then rerun this script."
	# exit
	# export OTS_DOXY="DOIT" #enable doxygen in CMakelists
	# source setup_ots.sh
	# export OTS_DOXY="DOIT" #enable doxygen in CMakelists
	# mz
	# unset OTS_DOXY #disable doxygen for future builds
fi

#exit #for debugging

#######################################################################################################################
# transfer documentation

echo
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t =================="


if [ $DO_MRBZ == 1 ]; then #should be careful to not delete /artdaq folder.. target only otsdaq*
	echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Deleting current web documentation..."
	ssh ${OTS_WEB_USER}@${OTS_WEB_HOST} $RM_SCP_LOC

fi

#exit #for debugging

echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Finding paths and transferring doxygen html..."
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Look in OTS_SOURCE/../build/* for doxygen output."

# REPO_DIR="$(find $SCRIPT_DIR/../../../build_* -maxdepth 1 -iname 'otsdaq*')"
REPO_DIR="$(find $OTS_SOURCE/../build/* -maxdepth 1 -iname 'otsdaq*')"
# REPO_DIR=$(find "$OTS_SOURCE/../build" -maxdepth 1 -type d -iname 'otsdaq*' ! -iname '*mu2e*')



for p in ${REPO_DIR[@]}; do
	if [ -d $p ]; then    
	if [ -d $p/doc/html ]; then
		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Doc directory found as: $(basename $p)"
	fi
	fi
done

# exit #for debugging

for p in ${REPO_DIR[@]}; do
	if [ -d $p ]; then    
	if [ -d $p/doc/html ]; then
		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Handling directory: $(basename $p)"

		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Injecting main html..."

		if [ $DO_MRBZ == 1 ]; then #only backup when generated
			#cp $p/doc/html/main.html $p/doc/html/main.html.bk
			cp $p/doc/html/index.html $p/doc/html/index.html.bk
		fi
		# cp $p/doc/html/index.html $p/doc/html/index.html.bk #for debugging

		echo
		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t =================="
		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Refining content..."
		echo
		echo
		
		#doxygen_main_editor $p/doc/html/main.html $SCRIPT_DIR/../../../srcs/otsdaq_utilities/onlineDoc/inject_$(basename $p).html $SCRIPT_DIR/../../../srcs/otsdaq_utilities/onlineDoc/inject_otsdaq_head.html
		# doxygen_main_editor $p/doc/html/index.html $SCRIPT_DIR/../../../srcs/otsdaq_utilities/onlineDoc/inject_$(basename $p).html $SCRIPT_DIR/../../../srcs/otsdaq_utilities/onlineDoc/inject_otsdaq_head.html
		INJECT_SOURCE="otsdaq_utilities"
		if [ $(basename $p) == "otsdaq" ]; then 
			INJECT_SOURCE="otsdaq"
		fi
		
		echo -e "./doxygen_main_editor $p/doc/html/index.html $OTS_SOURCE/otsdaq-utilities/onlineDoc/inject_${INJECT_SOURCE}.html $OTS_SOURCE/otsdaq-utilities/onlineDoc/inject_otsdaq_head.html"
		# continue #for debugging
		./doxygen_main_editor $p/doc/html/index.html $OTS_SOURCE/otsdaq-utilities/onlineDoc/inject_${INJECT_SOURCE}.html $OTS_SOURCE/otsdaq-utilities/onlineDoc/inject_otsdaq_head.html

		if [ $ONLY_MAIN == 1 ]; then
			echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t scp -r $p/doc/html/index.html ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o/otsdaq.fnal.gov/htdocs${SCP_LOC}/$(basename $p)/"			
			scp -r $p/doc/html/index.html ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o/otsdaq.fnal.gov/htdocs${SCP_LOC}/$(basename $p)/

			# exit #for debugging
			continue
		fi

		echo
		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t =================="
		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Transferring content..."
		echo
		echo
		
		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t scp -r $p/doc/html ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o/otsdaq.fnal.gov/htdocs${SCP_LOC}/$(basename $p)"
		scp -r $p/doc/html ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o/otsdaq.fnal.gov/htdocs${SCP_LOC}/$(basename $p)
		echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Done with .... scp -r $p/doc/html ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o/otsdaq.fnal.gov/htdocs${SCP_LOC}/$(basename $p)"

		# exit #for debugging
	fi
    fi	   
done


echo
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t =================="
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Transferring shared content..."
echo
echo
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t scp -r ${SCRIPT_DIR}/../onlineDoc/otsdaq_doc_library.js ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o//otsdaq.fnal.gov/htdocs${SCP_LOC}/"
scp -r ${SCRIPT_DIR}/../onlineDoc/otsdaq_doc_library.js ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o//otsdaq.fnal.gov/htdocs${SCP_LOC}/
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t scp -r ${SCRIPT_DIR}/../onlineDoc/contentData ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o//otsdaq.fnal.gov/htdocs${SCP_LOC}/"
scp -r ${SCRIPT_DIR}/../onlineDoc/contentData ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o//otsdaq.fnal.gov/htdocs${SCP_LOC}/
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t scp -r $OTS_SOURCE/otsdaq-utilities/onlineDoc/index.html ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o//otsdaq.fnal.gov/htdocs${SCP_LOC}/"
scp -r $OTS_SOURCE/otsdaq-utilities/onlineDoc/index.html ${OTS_WEB_USER}@${OTS_WEB_HOST}:/pubhosting/sites/o//otsdaq.fnal.gov/htdocs${SCP_LOC}/




echo
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t =================="
echo
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t =================="
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t Online documentation update done"
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t *******************************"
echo -e "OnlineDocPushUpdate.sh:${LINENO}  \t *******************************"





















