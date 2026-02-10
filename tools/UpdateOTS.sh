#!/bin/bash
#
# This script is expected to be in otsdaq utilities repository in a specific directory
# but it can be executed from any path (do not source it, execute with ./ )
#
# ./path/to/script/UpdateOTS.sh "comment for git commit"
#
# If no comment is given, the script will only pull updates - it will not checkin.
#
# Note: it will be compiled by mrb so that no path is required:
#
# UpdateOTS.sh "comment for git commit"
#



CURRENT_AWESOME_BASE=$PWD
CHECKIN_LOG_PATH=$CURRENT_AWESOME_BASE/.UpdateOTS_pull.log
UPDATE_LOG_PATH=$CURRENT_AWESOME_BASE/.UpdateOTS_push.log

if [ "x$1" == "x" ] || [[ "$1" != "--warn" && "$1" != "--share" && "$1" != "--develop" && "$1" != "--main" && "$1" != "--fetch" && "$1" != "--fetchcore" && "$1" != "--fetchall" && "$1" != "--pull" && "$1" != "--push" && "$1" != "--pullcore" && "$1" != "--pushcore" && "$1" != "--pullall" && "$1" != "--pushall" && "$1" != "--tables" ]]; then

	echo -e "UpdateOTS.sh:${LINENO}  "
	echo -e "UpdateOTS.sh:${LINENO}  \t ~~ UpdateOTS ~~ "
	echo -e "UpdateOTS.sh:${LINENO}  "
	echo -e "UpdateOTS.sh:${LINENO}  "
	echo -e "UpdateOTS.sh:${LINENO}  \t Usage: Parameter 1 is the operation and, for pushes, Parameter 2 is the comment for git commit"
	echo -e "UpdateOTS.sh:${LINENO}  "
	echo -e "UpdateOTS.sh:${LINENO}  \t Note: git status will be logged here: $CHECKIN_LOG_PATH"
	echo -e "UpdateOTS.sh:${LINENO}  "
	echo -e "UpdateOTS.sh:${LINENO}  \t Parameter 1 operations:"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --share               \t #will mark as shared (multi-owner) all repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --develop             \t #will checkout develop  repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --main                \t #will checkout main  repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --fetch               \t #will fetch otsdaq repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --pull                \t #will pull  otsdaq user repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --push \"comment\"    \t #will push  otsdaq user repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --fetchcore           \t #will fetch otsdaq core repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --pullcore            \t #will pull  otsdaq core repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --pushcore \"comment\"\t #will push  otsdaq core repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --fetchall            \t #will fetch all    repositories in srcs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --pullall             \t #will pull  all    repositories in srcs/ (i.e. not just otsdaq)."
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --pushall \"comment\" \t #will push  all    repositories in srcs/ (i.e. not just otsdaq)."
	echo -e "UpdateOTS.sh:${LINENO}  \t\t --tables              \t #will not pull or push; it will just update tables based on your table dependencies at \${USER_DATA}/ServiceData/CoreTableInfoNames.dat."
	# Note: --warn is used by ots script to warn users that there are uncommitted changes in srcs/
	# 		warn usage to display only stderr: UpdateOTS.sh --warn 2>&1 >/dev/null &
	echo -e "UpdateOTS.sh:${LINENO}  "


	#copy tutorial launching scripts
	echo
	echo -e "UpdateOTS.sh:${LINENO}  \t updating tutorial launch scripts..."
	chmod 755 $OTS_SOURCE/../get_tutorial_data.sh &>/dev/null 2>&1 #make sure permissions allow deleting
	chmod 755 $OTS_SOURCE/../get_tutorial_database.sh &>/dev/null 2>&1 #make sure permissions allow deleting
	chmod 755 $OTS_SOURCE/../reset_ots_tutorial.sh &>/dev/null 2>&1 #make sure permissions allow deleting
	timeout 1 rm $OTS_SOURCE/../get_tutorial_data.sh &>/dev/null 2>&1 #hide output (could hang if weird permission, so use timeout)
	timeout 1 rm $OTS_SOURCE/../get_tutorial_database.sh &>/dev/null 2>&1 #hide output (could hang if weird permission, so use timeout)
	timeout 1 rm $OTS_SOURCE/../reset_ots_tutorial.sh &>/dev/null 2>&1 #hide output (could hang if weird permission, so use timeout)
	# echo -e "UpdateOTS.sh:${LINENO}  \t cp $LOC_OTS_DIR/../otsdaq_demo/tools/reset_ots_tutorial.sh $LOC_OTS_DIR/../../reset_ots_tutorial.sh"
	#cp $LOC_OTS_DIR/../otsdaq_demo/tools/reset_ots_tutorial.sh $LOC_OTS_DIR/../../reset_ots_tutorial.sh
	wget -T 5 -O $OTS_SOURCE/../reset_ots_tutorial.sh https://github.com/art-daq/otsdaq_demo/raw/develop/tools/reset_ots_tutorial.sh -P $OTS_SOURCE/../ --no-check-certificate	 &>/dev/null 2>&1
	chmod 644 $OTS_SOURCE/../reset_ots_tutorial.sh #for safety, prevent accidental execution by users

	rm $OTS_SOURCE/../reset_ots_artdaq_tutorial.sh &>/dev/null 2>&1 #hide output
	#now there is only one reset_tutorial script (that includes the artdaq tutorial), so cleanup old systems and do not download script

	echo -e "UpdateOTS.sh:${LINENO}  "

	exit
fi

# at this point, there must have been a valid option

#OTSDAQ_DIR is not always defined in early AL9 usage
if [[ "x${OTSDAQ_DIR}" == "x" ]]; then
	spack cd -i otsdaq
	OTSDAQ_DIR=$(echo $PWD)
	cd -
fi

#############################
#############################
# function to update USER DATA configuration files and table definitions
#NOTE: relative paths are allowed from otsdaq/data-core/TableInfo
# for example...
# 		ConfigCore/*
# 		ARTDAQ/*
# 		../../../otsdaq_mu2e_config/CoreTables/*
# 		../../../otsdaq_mu2e_config/CoreTables/Advanced/*
# 		ContextGroup/DesktopIconTable
function updateTable
{
	line=$1
	# echo -e "UpdateOTS.sh:${LINENO}  \t Updating table... $line"


	LOC_OTS_DIR=$OTSDAQ_DIR
	if [ ! -d $LOC_OTS_DIR/data-core ]; then
		LOC_OTS_DIR="$OTSDAQ_LIB/../"
	fi

	# echo
	# echo
	# echo -e "UpdateOTS.sh:${LINENO}  \t line=$line"
	# echo -e "UpdateOTS.sh:${LINENO}  \t OTSDAQ_DIR=$LOC_OTS_DIR"
	# echo -e "UpdateOTS.sh:${LINENO}  \t OTS_SOURCE=$OTS_SOURCE"
	BACK_COUNT=$(echo $line | sed s/\\\.\\\./\\\n/g | grep -c .)
	# echo -e "UpdateOTS.sh:${LINENO}  \t BACK_COUNT=$BACK_COUNT"
	BACK_COUNT=$((BACK_COUNT+1))
	# echo -e "UpdateOTS.sh:${LINENO}  \t BACK_COUNT=$BACK_COUNT"

	SLASH_COUNT=$(echo $line | sed s/\\//\\\n/g | grep -c .)
	SLASH_COUNT=$((SLASH_COUNT-1))
	# echo -e "UpdateOTS.sh:${LINENO}  \t SLASH_COUNT=$SLASH_COUNT"


	#steps:
	#	* if SLASH_COUNT == 1, then assume otsdaq repo
	#   * else, then assume other repo

	if [[ $SLASH_COUNT == 1 ]]; then #assuming otsdaq repo
		repo_of_line="otsdaq"
		OTS_INSTALL_PATH="$LOC_OTS_DIR/data-core/TableInfo/"
		OTS_SOURCE_PATH="$OTS_SOURCE/otsdaq/data-core/TableInfo/"
		OTS_SOURCE_PATH_MOD="$OTS_SOURCE/otsdaq/data-core/TableInfo/" #same as above
		mod_line=$line
	elif [[ $BACK_COUNT > 3 ]]; then

		repo_of_line=$(echo $line | cut -d '/' -f$BACK_COUNT)
		# echo -e "UpdateOTS.sh:${LINENO}  \t repo_of_line=$repo_of_line"

		if [[ "${last_repo_of_line}" != "${repo_of_line}" ]]; then #need to search for repo install path
			OTS_INSTALL_PATH=$(spack cd -i $repo_of_line >/dev/null 2>&1 && echo $PWD && cd - || echo "NOT FOUND");
			last_repo_of_line=$repo_of_line
		fi

		OTS_SOURCE_PATH="$OTS_SOURCE/$repo_of_line/"
		lineRepoSed=$(echo $repo_of_line | sed s/_/-/g) #need to convert repo names from _ to - for backward compatibility of .dat files
		OTS_SOURCE_PATH_MOD="$OTS_SOURCE/$lineRepoSed/"
		# echo -e "UpdateOTS.sh:${LINENO}  \t BACK_COUNT=$BACK_COUNT"
		INDEX_OF_CHAR_BACK=$(echo $line | grep -ob "/" | sed ''"$BACK_COUNT"'q;d' | cut -d ':' -f1)
		# echo -e "UpdateOTS.sh:${LINENO}  \t INDEX_OF_CHAR_BACK=$INDEX_OF_CHAR_BACK"
		mod_line=$(echo ${line:$INDEX_OF_CHAR_BACK})
	fi
	# echo $OTS_INSTALL_PATH | sed s/__spack_path_placeholder__//g | sed s/\\\[padded-to-255-chars\\\]//g | sed s/\\\/tdaq-v......../\\\/tdaq-v_\ \ \ \\\//g
	# echo $OTS_SOURCE_PATH | sed s/__spack_path_placeholder__//g | sed s/\\\[padded-to-255-chars\\\]//g | sed s/\\\/tdaq-v......../\\\/tdaq-v_\ \ \ \\\//g
	# echo -e "UpdateOTS.sh:${LINENO}  \t DID_IT=$DID_IT"

	DID_IT=0
	DID_IT_SOURCE="Error: NOT FOUND"
	#verify that at least one of the copies worked! Otherwise, flag for user

	if [[ "$OTS_INSTALL_PATH" != "NOT FOUND" ]]; then
		cp $OTS_INSTALL_PATH/${mod_line}Info.xml $USER_DATA/TableInfo/ &>/dev/null && DID_IT=1 && DID_IT_SOURCE="Installed"
		# echo -e "UpdateOTS.sh:${LINENO}  \t install DID_IT=$DID_IT"
	fi

	# echo -e "UpdateOTS.sh:${LINENO}  \t DID_IT=$DID_IT"
	cp $OTS_SOURCE_PATH/${mod_line}Info.xml $USER_DATA/TableInfo/ &>/dev/null && DID_IT=1 && DID_IT_SOURCE="Source"
	# echo -e "UpdateOTS.sh:${LINENO}  \t source  DID_IT=$DID_IT"


	if [ $DID_IT == 0 ]; then #try modified path as last resort!
		cp $OTS_SOURCE_PATH_MOD/${mod_line}Info.xml $USER_DATA/TableInfo/ &>/dev/null && DID_IT=1 && DID_IT_SOURCE="-Source"
		# echo -e "UpdateOTS.sh:${LINENO}  \t modsource  DID_IT=$DID_IT"
	fi
	if [[ $DID_IT == 0 && $BACK_COUNT > 4 ]]; then #try above srcs modified path as last resort!
		cp $OTS_SOURCE/../${repo_of_line}/${mod_line}Info.xml $USER_DATA/TableInfo/ &>/dev/null && DID_IT=1 && DID_IT_SOURCE="..Source"
		# echo -e "UpdateOTS.sh:${LINENO}  \t unmodsource  DID_IT=$DID_IT $OTS_SOURCE/../${repo_of_line}/${mod_line}Info.xml"
	fi


	echo -e "UpdateOTS.sh:${LINENO}  \t ============= from $DID_IT_SOURCE, Table Dependency = $repo_of_line/$mod_line"
	if [ $DID_IT == 0 ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t Error, table dependency copy failed! Could not find table source for ${line}"
	fi

} #end updateTable()

#############################
#############################
# function to update USER DATA configuration files and table definitions
function updateUserData
{
	echo -e "UpdateOTS.sh:${LINENO}  \t Updating tables..."

	LOC_OTS_DIR=$OTSDAQ_DIR
	if [ ! -d $LOC_OTS_DIR/data-core ]; then
		if [[ "x${OTSDAQ_LIB}" != "x" ]]; then
			LOC_OTS_DIR="$OTSDAQ_LIB/../"
		fi
		# If still not found, try spack location
		if [ ! -d $LOC_OTS_DIR/data-core ]; then
			SPACK_OTSDAQ=$(spack location -i otsdaq 2>/dev/null)
			if [ -d "$SPACK_OTSDAQ/data-core" ]; then
				LOC_OTS_DIR="$SPACK_OTSDAQ"
			fi
		fi
	fi

	echo
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t Updating USER_DATA path ${USER_DATA}..."
	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t     LOC_OTS_DIR=$LOC_OTS_DIR"
	echo -e "UpdateOTS.sh:${LINENO}  \t     OTS_SOURCE=$OTS_SOURCE"
	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t Table info is updated based on the list in..."
	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t \t ${USER_DATA}/ServiceData/CoreTableInfoNames.dat"
	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t ... each line will be copied into user data relative to installed path LOC_OTS_DIR/data-core/TableInfo/"
	echo -e "UpdateOTS.sh:${LINENO}  \t ... 			       and then, if it exists, relative to source path OTS_SOURCE/otsdaq/data-core/TableInfo/"
	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t If CoreTableInfoNames.dat doesn't exist the whole directory OTSDAQ_DIR/data-core/TableInfo/ will be copied!"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo

	echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/TableInfo/TableInfo.xsd $USER_DATA/TableInfo/"
	mkdir -p $USER_DATA/TableInfo >/dev/null 2>&1 #make table directory in case of startup clean slate
	cp $LOC_OTS_DIR/data-core/TableInfo/TableInfo.xsd $USER_DATA/TableInfo/

	if [ -e "$USER_DATA/ServiceData/CoreTableInfoNames.dat" ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t $USER_DATA/ServiceData/CoreTableInfoNames.dat exists!"
		echo -e "UpdateOTS.sh:${LINENO}  \t Loading updated info for core tables (relative paths and wildcards are allowed) from OTSDAQ_DIR/data-core/TableInfo/ ..."
		echo


		#replace TheSupervisorConfiguration with GatewaySupervisorConfiguration for updating
		sed -i s/TheSupervisorConfiguration/GatewaySupervisorConfiguration/g $USER_DATA/ServiceData/CoreTableInfoNames.dat

		#remove empty whitespace lines
		sed -i '/^$/d' $USER_DATA/ServiceData/CoreTableInfoNames.dat

		cat $USER_DATA/ServiceData/CoreTableInfoNames.dat
		echo

		echo -e "UpdateOTS.sh:${LINENO}  \t cp -r $USER_DATA/TableInfo $USER_DATA/TableInfo.updateots.bk.<timestamp>"
		# rm -rf $USER_DATA/TableInfo.updateots.bk
		cp -r $USER_DATA/TableInfo $USER_DATA/TableInfo.updateots.bk.$(date +"%Y%m%d_%H%M%S")

		#NOTE: relative paths are allowed from otsdaq/data-core/TableInfo
		# for example...
		# 		ConfigCore/*
		# 		ARTDAQ/*
		# 		../../../otsdaq_mu2e_config/CoreTables/*
		# 		../../../otsdaq_mu2e_config/CoreTables/Advanced/*
		# 		ContextGroup/DesktopIconTable

		last_repo_of_line=
		LAST_LINE=
		while read line; do
			if [[ "x${line}" != "x" && "${LAST_LINE}" != "${line}" ]]; then
				updateTable $line
				LAST_LINE=${line}
			fi
		done < $USER_DATA/ServiceData/CoreTableInfoNames.dat

		#do one more time after loop to make sure last line is read
		# (even if user did not put new line)
		if [[ "x${line}" != "x" && "${LAST_LINE}" != "${line}" ]]; then
			updateTable $line
		fi

	else
		echo -e "UpdateOTS.sh:${LINENO}  \t cp -r $USER_DATA/TableInfo $USER_DATA/TableInfo_update_bk"
		rm -rf $USER_DATA/TableInfo_update_bk
		cp -r $USER_DATA/TableInfo/ $USER_DATA/TableInfo_update_bk

		echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/TableInfo/ARTDAQ/*Info.xml $USER_DATA/TableInfo/"
		cp $LOC_OTS_DIR/data-core/TableInfo/ARTDAQ/*Info.xml $USER_DATA/TableInfo/ 		# undo c++ style comment for Eclipse viewing*/
		cp $OTS_SOURCE/otsdaq/data-core/TableInfo/ARTDAQ/*Info.xml $USER_DATA/TableInfo/ &>/dev/null 		# undo c++ style comment for Eclipse viewing*/
		echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/TableInfo/BackboneGroup/*Info.xml $USER_DATA/TableInfo/"
		cp $LOC_OTS_DIR/data-core/TableInfo/BackboneGroup/*Info.xml $USER_DATA/TableInfo/			# undo c++ style comment for Eclipse viewing*/
		cp $OTS_SOURCE/otsdaq/data-core/TableInfo/BackboneGroup/*Info.xml $USER_DATA/TableInfo/ &>/dev/null			# undo c++ style comment for Eclipse viewing*/
		echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/TableInfo/ConfigCore/*Info.xml $USER_DATA/TableInfo/"
		cp $LOC_OTS_DIR/data-core/TableInfo/ConfigCore/*Info.xml $USER_DATA/TableInfo/ 		# undo c++ style comment for Eclipse viewing*/
		cp $OTS_SOURCE/otsdaq/data-core/TableInfo/ConfigCore/*Info.xml $USER_DATA/TableInfo/ &>/dev/null 		# undo c++ style comment for Eclipse viewing*/
		echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/TableInfo/ContextGroup/*Info.xml $USER_DATA/TableInfo/"
		cp $LOC_OTS_DIR/data-core/TableInfo/ContextGroup/*Info.xml $USER_DATA/TableInfo/			# undo c++ style comment for Eclipse viewing*/
		cp $OTS_SOURCE/otsdaq/data-core/TableInfo/ContextGroup/*Info.xml $USER_DATA/TableInfo/ &>/dev/null			# undo c++ style comment for Eclipse viewing*/
		echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/TableInfo/IterateGroup/*Info.xml $USER_DATA/TableInfo/"
		cp $LOC_OTS_DIR/data-core/TableInfo/IterateGroup/*Info.xml $USER_DATA/TableInfo/ 		# undo c++ style comment for Eclipse viewing*/
		cp $OTS_SOURCE/otsdaq/data-core/TableInfo/IterateGroup/*Info.xml $USER_DATA/TableInfo/ &>/dev/null 		# undo c++ style comment for Eclipse viewing*/

	fi

	if ! [ -d $USER_DATA/XDAQConfigurations ]; then
		mkdir $USER_DATA/XDAQConfigurations
	fi
	echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/XDAQConfigurations/otsConfiguration_CMake.xml $USER_DATA/XDAQConfigurations/"
	cp $LOC_OTS_DIR/data-core/XDAQConfigurations/otsConfiguration_CMake.xml $USER_DATA/XDAQConfigurations/
	cp $OTS_SOURCE/otsdaq/data-core/XDAQConfigurations/otsConfiguration_CMake.xml $USER_DATA/XDAQConfigurations/ &>/dev/null
	echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/XDAQConfigurations/otsConfiguration_Wizard_CMake.xml $USER_DATA/XDAQConfigurations/"
	cp $LOC_OTS_DIR/data-core/XDAQConfigurations/otsConfiguration_Wizard_CMake.xml $USER_DATA/XDAQConfigurations/
	cp $OTS_SOURCE/otsdaq/data-core/XDAQConfigurations/otsConfiguration_Wizard_CMake.xml $USER_DATA/XDAQConfigurations/ &>/dev/null
	echo -e "UpdateOTS.sh:${LINENO}  \t cp OTSDAQ_DIR/data-core/XDAQConfigurations/otsConfiguration_MacroMaker_CMake.xml $USER_DATA/XDAQConfigurations/"
	cp $LOC_OTS_DIR/data-core/XDAQConfigurations/otsConfiguration_MacroMaker_CMake.xml $USER_DATA/XDAQConfigurations/
	cp $OTS_SOURCE/otsdaq/data-core/XDAQConfigurations/otsConfiguration_MacroMaker_CMake.xml $USER_DATA/XDAQConfigurations/ &>/dev/null

	if ! [ -d $USER_DATA/MessageFacilityConfigurations ]; then
		mkdir $USER_DATA/MessageFacilityConfigurations
	fi
	echo -e "UpdateOTS.sh:${LINENO}  \t cp $LOC_OTS_DIR/data-core/MessageFacilityConfigurations/* $USER_DATA/MessageFacilityConfigurations/"
	cp $LOC_OTS_DIR/data-core/MessageFacilityConfigurations/* $USER_DATA/MessageFacilityConfigurations/ # undo c++ style comment for Eclipse viewing*/
	cp $OTS_SOURCE/otsdaq/data-core/MessageFacilityConfigurations/* $USER_DATA/MessageFacilityConfigurations/ &>/dev/null # undo c++ style comment for Eclipse viewing*/

	#make sure permissions are usable
	echo -e "UpdateOTS.sh:${LINENO}  \t chmod 755 $USER_DATA/TableInfo/*.xml"
	chmod 755 $USER_DATA/TableInfo/*.xml #*/ just resetting comment coloring
	echo -e "UpdateOTS.sh:${LINENO}  \t chmod 755 $USER_DATA/TableInfo/*Info.xsd"
	chmod 755 $USER_DATA/TableInfo/*Info.xsd #*/ just resetting comment coloring

	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t Reminder, table info is updated based on the list in..."
	echo -e "UpdateOTS.sh:${LINENO}  \t "
	echo -e "UpdateOTS.sh:${LINENO}  \t \t ${USER_DATA}/ServiceData/CoreTableInfoNames.dat"
	echo -e "UpdateOTS.sh:${LINENO}  \t "

	echo -e "UpdateOTS.sh:${LINENO}  \t Done updating USER DATA."

	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo

} # end updateUserData function
export -f updateUserData


# Need this source local scripts
SCRIPT_DIR="$(
 cd "$(dirname "$(readlink "$0" || printf %s "$0")")"
 pwd -P
)"

# get function from a single place (also used by UpdateOTS.sh, for example)
source "${SCRIPT_DIR}"/displayVersionsAndQualifiers.sh


#clear git comment to avoid push
GIT_COMMENT=

ALL_REPOS=0
SKIP_CORE=0
ONLY_CORE=0

FETCH_ONLY=0
SHARE_ONLY=0

DEVELOP_ONLY=0
MAIN_ONLY=0
WARN_ONLY=0

echo -e "UpdateOTS.sh:${LINENO}  1= $1"

if [ "$1"  == "--warn" ]; then #warn should be quiet unless (on stderr) there are uncommitted changes, then output to stderr for capture
	WARN_ONLY=1
	echo -e  "\n" >&2 #take stderr for warn result

	#scan for top-level git repos and check those
	scan_dir="${OTS_SOURCE}/../"

	find "$scan_dir" -maxdepth 2 -type d -name ".git" 2>/dev/null |
	while IFS= read -r gitdir; do
		repo_dir="$(dirname "$gitdir")"
		echo -e "UpdateOTS.sh:${LINENO}  check found: $repo_dir"
		remote_url="$(git -C "$repo_dir" remote get-url origin 2>/dev/null)"
		if [[ "$remote_url" == *github.com* ]]; then
			echo -e "UpdateOTS.sh:${LINENO}  GitHub repo found: $repo_dir"

			echo -e "UpdateOTS.sh:${LINENO}    → $remote_url"
			cd $repo_dir
			if ! git diff --quiet || ! git diff --cached --quiet; then
				echo -e  " ===|>  WARNING!!! Found uncommitted changes in repository ${repo_dir}" >&2 #take stderr for warn result
			# else
			# 	echo "Working tree is clean."
			fi

			#skip centrally managed (e.g., spack and fermi-spack-tools) repos
			if [[ "$repo_dir" == *"../spack"* || "$repo_dir" == *"../fermi-spack-tools"*  || "$repo_dir" == *"../spack-repos/fnal_art"*  || "$repo_dir" == *"../spack-repos/scd_recipes"* ]]; then
				echo -e "UpdateOTS.sh:${LINENO}  Skipping unmmerged branch check for centrally managed repo"
			else
				#find unmerged branches
				branch="$(git rev-parse --abbrev-ref HEAD)"
				if [ "$branch" != "main" ] && [ "$branch" != "develop" ] && [ "$branch" != "HEAD" ]; then
					echo -e  " ===|>  WARNING!!! Found unmerged BRANCH in repository ${repo_dir} ==> ${branch}" >&2 #take stderr for warn result
				# else
				# 	echo "You are on main or develop"
				fi
			fi

			#find orphaned branches, ignoring 'no branch' and 'HEAD detached...'
			missing=$(comm -23 \
				<(git branch --format='%(refname:short)' | grep -v '^(' | sort) \
				<(git branch -r --format='%(refname:short)' | sed 's|origin/||' | sort) \
				| paste -sd', ' -)
			if [ -n "$missing" ]; then
				echo -e  " ===|>  WARNING!!! Found local branches not represented on ORIGIN in repository ${repo_dir} ==> ${missing}" >&2 #take stderr for warn result
			# else
				# echo "All local branches are represented on origin."
			fi

			# find branches with unpushed commits
			unpushed=$(git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads |
			while read -r branch upstream; do
				[ -z "$upstream" ] && continue
				ahead=$(git rev-list --count "$upstream..$branch")
				[ "$ahead" -gt 0 ] && printf "%s(%d ahead)\n" "$branch" "$ahead"
			done | paste -sd', ' -)

			if [ -n "$unpushed" ]; then
				echo -e " ===|>  WARNING!!! Found unpushed commits in repository ${repo_dir} ==> ${unpushed}" >&2
			fi

			#done checking repo, return to previous directory
			cd -
		else
			echo -e "UpdateOTS.sh:${LINENO}  NOT GitHub repo found: $repo_dir"
			echo -e "UpdateOTS.sh:${LINENO}    → $remote_url"
		fi
	done

	#done with warning on repos
	#now warn on tables

	# Detect if we're on an NFS host by checking for colon in Filesystem column of df -h
    # A colon in the filesystem name indicates a remote mount (like NFS)

	# Detect if we are on a host with NFS mounted (in this case, TableInfo manipulations may be too slow, so skip!)
	# ... by checking for colon in Filesystem column of df -h | grep home
	# A colon in the filesystem name indicates a remote mount (like NFS)
	IS_NFS_MOUNTED=false
	# Skip the header line and check each filesystem entry
	while IFS= read -r line; do
		# Extract the filesystem column (first field) and check if it contains a colon
		filesystem=$(echo "$line" | awk '{print $1}')
		if [[ "$filesystem" == *:* ]]; then
			IS_NFS_MOUNTED=true
			break
		fi
	done < <(df -h | grep /home)

	# Only run table warning code on NFS hosts
	if [ "$IS_NFS_MOUNTED" = true ]; then
		echo -e "UpdateOTS.sh:${LINENO}  this host has a remote mounted home area, skip TableInfo test."
	else
		echo -e "UpdateOTS.sh:${LINENO}  this host does not have a remote mounted home area, do TableInfo test."

		echo "Checking for uncommitted TableInfo..." >&2
        # Run the table warning code only on NFS host nodes
        SAVE_USER_DATA=$USER_DATA
        rm -rf $USER_DATA.warn
        mkdir $USER_DATA.warn
        mkdir $USER_DATA.warn/TableInfo
        mkdir $USER_DATA.warn/ServiceData
        USER_DATA=$USER_DATA.warn
        cp ${SAVE_USER_DATA}/ServiceData/CoreTableInfoNames.dat ${USER_DATA}/ServiceData/CoreTableInfoNames.dat

        updateUserData

        #now diff and copy back (ignore whitespace)
        diff -qr -w $SAVE_USER_DATA/TableInfo $USER_DATA/TableInfo >&2

        rm -rf $USER_DATA
        USER_DATA=$SAVE_USER_DATA
    fi


#end warn handling
else
	echo -e "UpdateOTS.sh:${LINENO}  "
	echo -e "UpdateOTS.sh:${LINENO}  \t ~~ UpdateOTS ~~ "
	echo -e "UpdateOTS.sh:${LINENO}  "
	echo -e "UpdateOTS.sh:${LINENO}  "
fi

if [ "$1"  == "--tables" ]; then
	echo -e "UpdateOTS.sh:${LINENO}  \t Updating tables only!"
	updateUserData

	displayVersionsAndQualifiers

	exit
fi
if [ "$1"  == "--pullall" ]; then
	ALL_REPOS=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Updating all repositories (i.e. not only otsdaq)!"
fi
if [ "$1"  == "--pushall" ]; then
	ALL_REPOS=1
	GIT_COMMENT=$2
	if [ "x$2" == "x" ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t For git push, a comment must be placed in Parameter 2!"
		exit
	fi
	echo -e "UpdateOTS.sh:${LINENO}  \t Pushing all repositories (i.e. not only otsdaq)!"
fi
if [ "$1"  == "--push" ]; then
	SKIP_CORE=1
	GIT_COMMENT=$2
	if [ "x$2" == "x" ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t For git push, a comment must be placed in Parameter 2!"
		exit
	fi
	echo -e "UpdateOTS.sh:${LINENO}  \t Pushing otsdaq user repositories!"
fi
if [ "$1"  == "--pull" ]; then
	SKIP_CORE=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Pulling otsdaq user repositories!"
fi
if [ "$1"  == "--pushcore" ]; then
	ONLY_CORE=1
	GIT_COMMENT=$2
	if [ "x$2" == "x" ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t For git push, a comment must be placed in Parameter 2!"
		exit
	fi
	echo -e "UpdateOTS.sh:${LINENO}  \t Pushing otsdaq core repositories!"
fi
if [ "$1"  == "--pullcore" ]; then
	ONLY_CORE=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Pulling otsdaq core repositories!"
fi

if [ "$1"  == "--share" ]; then
	ALL_REPOS=1
	SHARE_ONLY=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Sharing (marking as multi-user) all repositories (i.e. not only otsdaq)!"
fi
if [ "$1"  == "--develop" ]; then
	ALL_REPOS=1
	DEVELOP_ONLY=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Doing checkout devleop in all repositories (i.e. not only otsdaq)!"
fi
if [ "$1"  == "--main" ]; then
	ALL_REPOS=1
	MAIN_ONLY=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Doing checkout main in all repositories (i.e. not only otsdaq)!"
fi


if [ "$1"  == "--fetchall" ]; then
	ALL_REPOS=1
	FETCH_ONLY=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Fetching all repositories (i.e. not only otsdaq)!"
fi
if [ "$1"  == "--fetchcore" ]; then
	ONLY_CORE=1
	FETCH_ONLY=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Fetching otsdaq core repositories!"
fi
if [ "$1"  == "--fetch" ]; then
	FETCH_ONLY=1
	SKIP_CORE=1
	echo -e "UpdateOTS.sh:${LINENO}  \t Fetching otsdaq repositories!"
fi


echo -e "UpdateOTS.sh:${LINENO}  \t REPO_FILTER = ${REPO_FILTER}"
echo
echo
echo -e "UpdateOTS.sh:${LINENO}  \t Finding paths..."

SCRIPT_DIR="$(
  cd "$(dirname "$(readlink "$0" || printf %s "$0")")"
  pwd -P
)"

echo -e "UpdateOTS.sh:${LINENO}  \t Script directory found as: $SCRIPT_DIR"
echo -e "UpdateOTS.sh:${LINENO}  \t Finding target repositories..."

#if not done with compile setup, then OTS_SOURCE may not be defined
DEREFENCED_OTS_SOURCE="$SCRIPT_DIR/../../../srcs"
if [ "x$OTS_SOURCE" == "x" ]; then
	OTS_SOURCE="$SCRIPT_DIR/../../../srcs"
fi
if [ $SHARE_ONLY = 1 ]; then
	OTS_SOURCE="${DEREFENCED_OTS_SOURCE%%/otsdaq_utilities/tools*}"  #strip path back to /srcs without ../.. in path
fi

echo -e "UpdateOTS.sh:${LINENO}  \t Source directory found as OTS_SOURCE = ${OTS_SOURCE}"
echo
echo

if [[ $ALL_REPOS = 1 || $WARN_ONLY = 1 ]]; then
	REPO_DIR="$(find -L $OTS_SOURCE -maxdepth 1 -iname '*')"
else
	REPO_DIR="$(find -L $OTS_SOURCE -maxdepth 1 -iname 'otsdaq*')"
fi

for p in ${REPO_DIR[@]}; do
	if [ -d $p ]; then
	if [ -d $p/.git ]; then

		bp=$(basename $p)
		if [ $SKIP_CORE = 1 ] && [[ $bp = "otsdaq" || $bp = "otsdaq_utilities" || $bp = "otsdaq_components" || $bp = "otsdaq-utilities" || $bp = "otsdaq-components" || $bp = "otsdaq-epics" || $bp = "otsdaq-suite" ]]; then
			continue #skip core repos
		fi
		if [ $ONLY_CORE = 1 ] && [[ $bp != "otsdaq" && $bp != "otsdaq_utilities" && $bp != "otsdaq_components" && $bp != "otsdaq-utilities" && $bp != "otsdaq-components" && $bp != "otsdaq-epics" && $bp != "otsdaq-suite" ]]; then
			continue #skip non-core repos
		fi

		echo -e "UpdateOTS.sh:${LINENO}  \t Repo directory found as: $bp"

	fi
	fi
done



#######################################################################################################################

echo
echo -e "UpdateOTS.sh:${LINENO}  \t =================="

echo -e "UpdateOTS.sh:${LINENO}  \t Git comment '$GIT_COMMENT'"
echo -e "UpdateOTS.sh:${LINENO}  \t Status will be logged here: $CHECKIN_LOG_PATH"

if [ $SHARE_ONLY = 1 ]; then
	echo "List of srcs repos:" > $CURRENT_AWESOME_BASE/list_of_repos.txt
fi

echo
echo -e "UpdateOTS.sh:${LINENO}  \t =================="

echo -e "UpdateOTS.sh:${LINENO}  \t log start:" > $CHECKIN_LOG_PATH
for p in ${REPO_DIR[@]}; do
	if [ -d $p ]; then
	if [ -d $p/.git ]; then

	bp=$(basename $p)
	if [ $SKIP_CORE = 1 ] && [[ $bp = "otsdaq" || $bp = "otsdaq_utilities" || $bp = "otsdaq_components" || $bp = "otsdaq-utilities" || $bp = "otsdaq-components" || $bp = "otsdaq-epics" || $bp = "otsdaq-suite" ]]; then
		continue #skip core repos
	fi
	if [ $ONLY_CORE = 1 ] && [[ $bp != "otsdaq" && $bp != "otsdaq_utilities" && $bp != "otsdaq_components" && $bp != "otsdaq-utilities" && $bp != "otsdaq-components" && $bp != "otsdaq-epics" && $bp != "otsdaq-suite" ]]; then
		continue #skip non-core repos
	fi

	cd $p

	if [ $SHARE_ONLY = 1 ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t Sharing (marking as multi-user) $p"

		git remote -v | grep fetch | sed -E 's/^origin[[:space:]]+([^[:space:]]+).*/\1/' >> $CURRENT_AWESOME_BASE/list_of_repos.txt
		git config --global --add safe.directory $p
	elif [ $DEVELOP_ONLY = 1 ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t Doing checkout develop from $p"
		git checkout develop
	elif [ $MAIN_ONLY = 1 ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t Doing checkout main from $p"
		git checkout main
	elif [ $FETCH_ONLY = 1 ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t Fetching updates from $p"
		git fetch
	elif [ $WARN_ONLY = 1 ]; then
		if ! git diff --quiet || ! git diff --cached --quiet; then
			echo -e  " ===|>  WARNING!!! Found uncommitted changes in repository $p" >&2 #take stderr for warn result
		# else
		# 	echo "Working tree is clean."
		fi

		#find unmerged branches
		branch="$(git rev-parse --abbrev-ref HEAD)"
		if [ "$branch" != "main" ] && [ "$branch" != "develop" ]; then
			echo -e  " ===|>  WARNING!!! Found unmerged BRANCH in repository $p ==> ${branch}" >&2 #take stderr for warn result
		# else
		# 	echo "You are on main or develop"
		fi

		#find orphaned branches, ignoring 'no branch' and 'HEAD detached...'
		missing=$(comm -23 \
			<(git branch --format='%(refname:short)' | grep -v '^(' | sort) \
			<(git branch -r --format='%(refname:short)' | sed 's|origin/||' | sort) \
			| paste -sd', ' -)
		if [ -n "$missing" ]; then
			echo -e  " ===|>  WARNING!!! Found local branches not represented on ORIGIN in repository $p ==> ${missing}" >&2 #take stderr for warn result
		# else
			# echo "All local branches are represented on origin."
		fi

		# find branches with unpushed commits
		unpushed=$(
			git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads |
			while read -r branch upstream; do
				# no upstream configured at all
				[ -z "$upstream" ] && {
					printf "%s(no upstream)\n" "$branch"
					continue
				}

				# upstream configured but ref does not exist (e.g. deleted on origin)
				if ! git show-ref --verify --quiet "refs/remotes/$upstream"; then
					printf "%s(upstream missing: %s)\n" "$branch" "$upstream"
					continue
				fi

				ahead=$(git rev-list --count "$upstream..$branch" 2>/dev/null || echo 0)
				[ "$ahead" -gt 0 ] && printf "%s(%d ahead)\n" "$branch" "$ahead"
			done | paste -sd', ' -
		)

		if [ -n "$unpushed" ]; then
			echo -e " ===|>  WARNING!!! Found unpushed commits in repository $p ==> ${unpushed}" >&2
		fi



	else
		echo -e "UpdateOTS.sh:${LINENO}  \t Pulling updates from $p"
		git pull
		git submodule update --init
	fi

	echo -e "UpdateOTS.sh:${LINENO}  \t ==================" >> $CHECKIN_LOG_PATH
	pwd >> $CHECKIN_LOG_PATH
	git status &>> $CHECKIN_LOG_PATH

	if [ "x$GIT_COMMENT" != "x" ]; then

		echo -e "UpdateOTS.sh:${LINENO}  \t Checking in $p"
		git commit -m "$GIT_COMMENT " .  &>> $CHECKIN_LOG_PATH  #add space in comment for user
		git push # || git push origin-ssh
	fi

	cd $CURRENT_AWESOME_BASE
	echo
	echo -e "UpdateOTS.sh:${LINENO}  \t =================="

	fi
	fi
done



echo
echo -e "UpdateOTS.sh:${LINENO}  \t =================="


#######################################################################################################################
#handle manual updates that should take place ONLY if it is UPDATING not committing
if [[ "x$GIT_COMMENT" == "x" && $FETCH_ONLY = 0 && $WARN_ONLY = 0 ]]; then

	echo -e "UpdateOTS.sh:${LINENO}  \t Update status will be logged here: $UPDATE_LOG_PATH"
	echo -e "UpdateOTS.sh:${LINENO}  \t Update log start:" > $UPDATE_LOG_PATH

	#updateUserData #do not call function during git pulls, have user explicitly call --tables to avoid unexepcted table changes



	echo
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t Updating installed Repositories,"
	echo -e "UpdateOTS.sh:${LINENO}  \t based on the list in $USER_DATA/ServiceData/InstalledRepoNames.dat."
	echo -e "UpdateOTS.sh:${LINENO}  \t If InstalledRepoNames.dat doesn't exist, then nothing happens"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo

	if [ -e "$USER_DATA/ServiceData/InstalledRepoNames.dat" ]; then
		echo -e "UpdateOTS.sh:${LINENO}  \t $USER_DATA/ServiceData/InstalledRepoNames.dat exists!"
		echo -e "UpdateOTS.sh:${LINENO}  \t Loading list of repos to update..."
		cat $USER_DATA/ServiceData/InstalledRepoNames.dat
		echo


		#NOTE: relative paths are allowed from otsdaq/../
		while read line; do
			echo
			echo -e "UpdateOTS.sh:${LINENO}  \t updating ${line} repository...."
			echo -e "UpdateOTS.sh:${LINENO}  \t running script $OTS_SOURCE/${line}/tools/update_ots_repo.sh"
			$OTS_SOURCE/${line}/tools/update_ots_repo.sh
		done < $USER_DATA/ServiceData/InstalledRepoNames.dat

		#do one more time after loop to make sure last line is read (even if user did not put new line)
		echo
		echo -e "UpdateOTS.sh:${LINENO}  \t updating ${line} repository...."
		echo -e "UpdateOTS.sh:${LINENO}  \t running script $OTS_SOURCE/${line}/tools/update_ots_repo.sh"
		$OTS_SOURCE/${line}/tools/update_ots_repo.sh

	fi

	echo
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"




	# echo
	# echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	# echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	# echo -e "UpdateOTS.sh:${LINENO}  \t Upgrading database (if needed)..."
	# echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	# echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	# echo

	# #TODO by lukhanin

	# echo
	# echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	# echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"









	echo
	echo -e "UpdateOTS.sh:${LINENO}  \t Updating ups products based on .bz2 files in $OTS_SOURCE/otsdaq/tarballs/"
	echo -e "UpdateOTS.sh:${LINENO}  \t PRODUCTS path found as: $PRODUCTS"
	IFS=':' read -r -a array <<< "$PRODUCTS"
	UPS_DIR=${array[@]: -1:1}
	echo -e "UpdateOTS.sh:${LINENO}  \t Unzipping any extra products from otsdaq to: $UPS_DIR"

	cd $UPS_DIR
	for file in $OTS_SOURCE/otsdaq/tarballs/*.bz2 	# undo c++ style comment for Eclipse viewing*/
	do
		IFS='/' read -r -a array <<< "$file"
		UPS_FILE_NAME=${array[@]: -1:1}
		IFS='-' read -r -a array <<< "$UPS_FILE_NAME"
		UPS_FILE_NAME_FIELDS="${#array[@]}"
		#echo -e "UpdateOTS.sh:${LINENO}  \t $UPS_FILE_NAME_FIELDS fields found"
		if [ $UPS_FILE_NAME_FIELDS -lt 7 ]; then
			echo -e "UpdateOTS.sh:${LINENO}  \t 	$file skipping, (7 fields expected) too few fields in name to identify name, version, qualifier..."
			echo -e "UpdateOTS.sh:${LINENO}  \t   Would like to do this command, but not sure it is necessary:"
			echo -e "UpdateOTS.sh:${LINENO}  \t    tar -xf $file"
			continue
		fi

		UPS_PRODUCT_NAME=${array[0]}
		UPS_PRODUCT_VERSION=${array[1]}
		UPS_PRODUCT_VERSION=${UPS_PRODUCT_VERSION//./_}

		#e.g. slf6.x86_64.e10.s41.debug
		UPS_PRODUCT_QUAL="${array[2]}.${array[3]}.${array[4]}.${array[5]}"
		IFS='.' read -r -a array <<< "${array[6]}"
		UPS_PRODUCT_QUAL="$UPS_PRODUCT_QUAL.${array[0]}"

		echo -e "UpdateOTS.sh:${LINENO}  \t Checking $UPS_PRODUCT_NAME/v$UPS_PRODUCT_VERSION/$UPS_PRODUCT_QUAL..."

		if [ ! -d "$UPS_PRODUCT_NAME/v$UPS_PRODUCT_VERSION/$UPS_PRODUCT_QUAL" ]; then
			echo -e "UpdateOTS.sh:${LINENO}  \t    $file unzipping..."
			echo -e "UpdateOTS.sh:${LINENO}  \t    tar -xf $file"
			tar -xf $file &>> $UPDATE_LOG_PATH

			if [ ! -d "$UPS_PRODUCT_NAME/v$UPS_PRODUCT_VERSION/$UPS_PRODUCT_QUAL" ]; then
				echo -e "UpdateOTS.sh:${LINENO}  \t    Something went wrong. Unzip was not successful. (Are special permissions required for products area?)"
				echo
				echo -e "UpdateOTS.sh:${LINENO}  \t 	 Pausing for 3 seconds (so you read this!)..."
				sleep 3s
			fi
		else
			echo -e "UpdateOTS.sh:${LINENO}  \t 	...already found in ups products."
		fi

	done

	cd $CURRENT_AWESOME_BASE

	#done updating ups products from otsdaq repo /tarballs
	echo
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"
	echo -e "UpdateOTS.sh:${LINENO}  \t #######################################################################################################################"

fi


echo -e "UpdateOTS.sh:${LINENO}  \t Git comment '$GIT_COMMENT'"
echo -e "UpdateOTS.sh:${LINENO}  \t Git actions were logged here: $CHECKIN_LOG_PATH"
echo -e "UpdateOTS.sh:${LINENO}  \t Product update was logged here: $UPDATE_LOG_PATH"
echo
if [ "$WARN_ONLY" = 0 ]; then
	echo -e "UpdateOTS.sh:${LINENO}  \t log dump in 2 seconds... #######################################################"
	sleep 2s
	echo
fi
#print checkin log but hide gratuitous Data_ and databases_ lines


COUNT_OF_DATA=`cat $CHECKIN_LOG_PATH | grep -c Data_`
COUNT_OF_DATABASES=`cat $CHECKIN_LOG_PATH | grep -c databases_`
HIDING_COUNT_MESSAGE=`echo -e "UpdateOTS.sh:${LINENO}  \t Hiding verbose Data_* and databases_* entries of counts respectively: $COUNT_OF_DATA and $COUNT_OF_DATABASES"`
#echo -e "UpdateOTS.sh:${LINENO}  \t Hiding verbose Data_* entries in log of count: $COUNT_OF_DATA"
#echo -e "UpdateOTS.sh:${LINENO}  \t Hiding verbose databases_* entries in log of count: $COUNT_OF_DATABASE"
echo $HIDING_COUNT_MESSAGE
#cat $CHECKIN_LOG_PATH | grep -v Data_ | grep -v databases_

cp $CHECKIN_LOG_PATH ${CHECKIN_LOG_PATH}.bk &>/dev/null
sed -i ':a;N;$!ba;s/databases_.*\n.*databases_/HIDING_COUNT_MESSAGE/g' ${CHECKIN_LOG_PATH}.bk &>/dev/null;
sed -i ':a;N;$!ba;s/Data_.*\n.*HIDING_COUNT_MESSAGE/HIDING_COUNT_MESSAGE/g' ${CHECKIN_LOG_PATH}.bk &>/dev/null;
sed -i ':a;N;$!ba;s/Data_.*\n.*Data_/HIDING_COUNT_MESSAGE/g' ${CHECKIN_LOG_PATH}.bk &>/dev/null;
sed -i "s/.*HIDING_COUNT_MESSAGE.*/${HIDING_COUNT_MESSAGE}/g" ${CHECKIN_LOG_PATH}.bk &>/dev/null;
cat ${CHECKIN_LOG_PATH}.bk 2>/dev/null;
rm ${CHECKIN_LOG_PATH}.bk &>/dev/null

echo -e "UpdateOTS.sh:${LINENO}  \t end log dump... #######################################################"
echo -e "UpdateOTS.sh:${LINENO}  \t Git actions were logged here: $CHECKIN_LOG_PATH"
echo -e "UpdateOTS.sh:${LINENO}  \t Product update was logged here: $UPDATE_LOG_PATH"

echo
echo -e "UpdateOTS.sh:${LINENO}  \t =================="
echo

for p in ${REPO_DIR[@]}; do
	if [ -d $p ]; then
	if [ -d $p/.git ]; then


		bp=$(basename $p)
		if [ $SKIP_CORE = 1 ] && [[ $bp = "otsdaq" || $bp = "otsdaq_utilities" || $bp = "otsdaq_components" || $bp = "otsdaq-utilities" || $bp = "otsdaq-components" || $bp = "otsdaq-epics" || $bp = "otsdaq-suite" ]]; then
			continue #skip core repos
		fi
		if [ $ONLY_CORE = 1 ] && [[ $bp != "otsdaq" && $bp != "otsdaq_utilities" && $bp != "otsdaq_components" && $bp != "otsdaq-utilities" && $bp != "otsdaq-components" && $bp != "otsdaq-epics" && $bp != "otsdaq-suite" ]]; then
			continue #skip non-core repos
		fi

		echo -e "UpdateOTS.sh:${LINENO}  \t Repo directory handled: $bp"
	fi
	fi
done

displayVersionsAndQualifiers


echo -e "UpdateOTS.sh:${LINENO}  \t =================="
echo -e "UpdateOTS.sh:${LINENO}  \t ots update script done"
echo -e "UpdateOTS.sh:${LINENO}  \t Note: if you have issues with this script, please notify us by opening a ticket here:\n\t\t https://github.com/art-daq/otsdaq_utilities/issues/new/choose"
echo -e "UpdateOTS.sh:${LINENO}  \t *******************************"
echo -e "UpdateOTS.sh:${LINENO}  \t *******************************"
