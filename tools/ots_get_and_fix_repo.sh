#!/bin/bash
#
# This script is expected to be sourced or executed from anywhere after MRB is setup for your ots project.
#
# usage:
USAGE="ots_get_and_fix_repo.sh <repo name or srcs/ folder wildcard search> <project name> <folder name for local repo creation (optional if checking out for first time)> \
		\n\nots_get_and_fix_repo.sh [${LINENO}]  \t Note: <project name> may be different than repo, because a project can have many repos. \
		\nots_get_and_fix_repo.sh [${LINENO}]  \t Note: <folder name> is optional name of folder to create in srcs/ \
		\n\nots_get_and_fix_repo.sh [${LINENO}]  \t e.g: ots_get_and_fix_repo.sh   components-epics   components   otsdaq_epics \
		\n\n\nots_get_and_fix_repo.sh [${LINENO}]  \t  or... for wildcard search, use '*' or 'otsdaq*' with single quotes, like source ots_get_and_fix_repo.sh '*'\n\n"
#
# This script attempts to setup fetch and push origin properly, e.g.:
#		origin http://cdcvs.fnal.gov/projects/components-epics (fetch)
#		origin ssh://p-components@cdcvs.fnal.gov/cvs/projects/components-epics (push)
#


echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t ~~ ots_get_and_fix_repo ~~ "
echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "

#Steps:
#	1. get target repo folders and names

repo=$1

#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  0=$0 1=$1 2=$2 3=$3"

if [ "x$repo" == "x" ]; then
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t Note: this script should be sourced."
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t User did not input a repository name or search string. Exiting."
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t USAGE:"
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t $USAGE"
	return #for sourcing
	exit #for executing
fi


#############################
#############################
# function to display otsdaq versions and qualifiers
function fixTargetRepos
{
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t Fixing ${REPO_COUNT} target repo(s)!"
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "

	#fix all REPO_DIR

	for p in ${REPO_DIR[@]}; do
		if [ -d $p ]; then
			if [ -d $p/.git ]; then

				bp=$(basename $p)

				echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t ================== Repo directory to fix found as: $MRB_SOURCE/$bp"

				cd $p



				#two step fix:
				#	1. fix by making fetch http
				#	2. if origin-ssh, copy to origin (push)

				#but first fix pull selection to merge
				git config pull.rebase false  # merge (the default strategy)

				############################# 1. fix by making fetch http

				#get the correct from one of the push origins
				GIT_REMOTE_ARR="$(git remote -v | grep origin-ssh | grep \(push\) )"

				if [ -z "${GIT_REMOTE_ARR}" ]; then
					#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t No push origin-ssh found, assuming push origin is good."
					GIT_REMOTE_ARR="$(git remote -v | grep origin | grep \(push\) )"
				fi

				#do not get it from fetch, which  might  be broken
				#GIT_REMOTE_ARR="$(git remote -v | grep origin | grep \(fetch\) )"

				if [ -z "${GIT_REMOTE_ARR}" ]; then
					echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t Failed to find a valid push origin, skipping $bp..."
					cd - &>/dev/null 2>&1 #hide output
					continue;
				fi

				#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t ${GIT_REMOTE_ARR[0]}"
				IFS='/' read -r -a GIT_FETCH_ARR <<< "${GIT_REMOTE_ARR[0]}"
				GIT_FETCH_ARR_COUNT=(${#GIT_FETCH_ARR[@]})
				#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t GIT_FETCH_ARR_COUNT=${GIT_FETCH_ARR_COUNT}"

				if [ $GIT_FETCH_ARR_COUNT -lt 5 ]; then
					echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t Not enough fetch origin fields, skipping $bp..."
					cd - &>/dev/null 2>&1 #hide output
					continue;
				fi

				#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t ${GIT_FETCH_ARR[0]}"
				if [ "${GIT_FETCH_ARR[0]}" == "origin	ssh:" ]; then
					echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t Fixing fetch origin..."

					#create http url
					# from e.g.... origin ssh://p-components@cdcvs.fnal.gov/cvs/projects/components-epics (fetch)
					# to e.g.... origin http://cdcvs.fnal.gov/projects/components-epics (fetch)

					GIT_REMOTE_URL="http://cdcvs.fnal.gov" #init with preamble
					i=0
					for git_arr_piece in ${GIT_FETCH_ARR[@]}; do
						i=$(( $i + 1 ))
						if [[ ($i -lt 5) || ($i == $(($GIT_FETCH_ARR_COUNT + 1))) ]]; then #skip up to cvs/	and (fetch)
							continue;
						fi
						#echo -e "ots_get_and_fix_repo.sh [${LINENO}] \t $i ${git_arr_piece} "
						GIT_REMOTE_URL="${GIT_REMOTE_URL}/${git_arr_piece}"
					done

					echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t git remote set-url origin --fetch ${GIT_REMOTE_URL}"
					git remote set-url origin ${GIT_REMOTE_URL}

					#sometimes (always?) no option also sets the push, so set it back
					GIT_REMOTE_URL="ssh:/" #init with preamble
					i=0
					for git_arr_piece in ${GIT_FETCH_ARR[@]}; do
						i=$(( $i + 1 ))
						if [[ ($i -lt 3) || ($i == $(($GIT_FETCH_ARR_COUNT + 1))) ]]; then #skip up to cvs/	and (fetch)
							continue;
						fi
						GIT_REMOTE_URL="${GIT_REMOTE_URL}/${git_arr_piece}"
					done

					echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t git remote set-url origin --push ${GIT_REMOTE_URL}"
					git remote set-url origin --push ${GIT_REMOTE_URL}

				else
					echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t Fetch origin already good."
				fi


				############################# 2. if origin-ssh, copy to origin (push)
				GIT_REMOTE_ARR="$(git remote -v | grep origin-ssh | grep \(push\) )"

				if [ -z "${GIT_REMOTE_ARR}" ]; then
					echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t No push origin-ssh found, assuming push origin is good."
					cd - &>/dev/null 2>&1 #hide output
					continue;
				fi

				#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t ${GIT_REMOTE_ARR[0]}"
				IFS='/' read -r -a GIT_PUSH_ARR <<< "${GIT_REMOTE_ARR[0]}"
				GIT_PUSH_ARR_COUNT=(${#GIT_PUSH_ARR[@]})
				#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t GIT_PUSH_ARR_COUNT=${GIT_PUSH_ARR_COUNT}"

				if [ $GIT_PUSH_ARR_COUNT -lt 5 ]; then
					echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t Not enough push origin-ssh fields, skipping for $bp..."
					cd - &>/dev/null 2>&1 #hide output
					continue;
				fi

				echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t Fixing push origin..."

				#create http url
				# from e.g.... origin-ssh ssh://p-components@cdcvs.fnal.gov/cvs/projects/components-epics (push)
				# to e.g.... origin ssh://p-components@cdcvs.fnal.gov/cvs/projects/components-epics (push)

				GIT_REMOTE_URL="ssh:/" #init with preamble
				i=0
				for git_arr_piece in ${GIT_PUSH_ARR[@]}; do
					i=$(( $i + 1 ))
					if [[ ($i -lt 3) || ($i == $(($GIT_PUSH_ARR_COUNT + 1))) ]]; then #skip up to cvs/	and (fetch)
						continue;
					fi
					GIT_REMOTE_URL="${GIT_REMOTE_URL}/${git_arr_piece}"
				done

				echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t git remote set-url origin --push ${GIT_REMOTE_URL}"
				git remote set-url origin --push ${GIT_REMOTE_URL}
				git remote remove origin-ssh

				cd - &>/dev/null 2>&1 #hide output
			fi
		fi
	done

	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t ================== Done fixing target repo(s)."
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
} #end fixTargetRepos
#######################################################

#if repo points to an existing folder, then no checkout needed

echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t repo search = ${repo}"
REPO_DIR="$(find $MRB_SOURCE -maxdepth 1 -iname "${repo}")"
if [ -z "${REPO_DIR}" ]; then #check empty, because empty was showing up as 1 for blank line count
	REPO_COUNT=0
else
	REPO_COUNT=(${#REPO_DIR[@]})
fi
#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t REPO_COUNT=$REPO_COUNT"

repoProject=$2
repoProjectPrepend=$2
if [ "x$repoProject" == "x" ]; then
	repoProject=$repo
	repoProjectPrepend=""
fi

#######################################################
### handle repo checkout
if [ $REPO_COUNT == 0 ]; then

	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t $repo not found, assuming checkout is needed!"

	repoName=$3
	if [ "x$repoName" == "x" ]; then
		repoName=${repo//-/_}
	fi

	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t repo project = $repoProject"
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t repo folder name = $repoName"

	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t mrb g -d ${repoName} ${repo}%fnal:${repo}%${repoProject} "
	echo
	echo

	mrb g -d ${repoName} ${repo}%fnal:${repoProjectPrepend}-${repo}%${repoProject}

	echo
	echo
	echo -e "ots_get_and_fix_repo.sh [${LINENO}]  "

	REPO_DIR="$(find $MRB_SOURCE -maxdepth 1 -iname $repoName)"
	if [ -z "$REPO_DIR" ]; then #check empty, because empty was showing up as 1 for blank line count
		REPO_COUNT=0
	else
		REPO_COUNT=(${#REPO_DIR[@]})
	fi
fi
### end handle repo checkout
#######################################################

#at this point have one or many target repos to fix

fixTargetRepos #function call

echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t =================="
echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t ots_get_and_fix_repo script done!"
echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t *******************************"
echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t *******************************"
