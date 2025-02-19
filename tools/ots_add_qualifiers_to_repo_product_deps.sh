#!/bin/bash
#
# This script is expected to be sourced from anywhere after MRB is setup for your ots project.
#
# usage:
USAGE="source ots_add_qualifiers_to_repo_product_deps.sh <repo folder name or srcs/ folder wildcard search> <qualifers to add> \
		\n\n\n\
ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t Note: for wildcard search, use '*' or 'otsdaq*' with single quotes, like \n\n\t\t\t\t\t\t\t\t source ots_add_qualifiers_to_repo_product_deps.sh '*' e19:s94:prof\n\n"
#
# This script attempts to fix the text in repo/ups/product_deps
#


echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t ~~ ots_add_qualifiers_to_repo_product_deps ~~ "
echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "

#Steps:
#	1. get target repo folders and names

repo=$1
QUALS=$2

#echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  0=$0 1=$1 2=$2 3=$3"

IFS=':' read -r -a QUAL_PIECES <<< "$QUALS"
QUAL_ARR_COUNT=(${#QUAL_PIECES[@]})
#echo -e "ots_get_and_fix_repo.sh [${LINENO}]  \t\t QUAL_ARR_COUNT=${QUAL_ARR_COUNT}"

if [[ "x$repo" == "x" || "x$QUALS" == "x" || $QUAL_ARR_COUNT != 3 ]]; then
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t Note: this script should be sourced."
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t User did not input a valid repository name or search string (must be in single quotes) or qualifiers (must be 3 parts, e.g. e19:s94:prof). Exiting."
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t USAGE:"
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t\t $USAGE"
	return #for sourcing
	exit #for executing
fi

FIRST_CHAR=${QUAL_PIECES[0]:0:1}
echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t\t FIRST_CHAR=${FIRST_CHAR}"

if [[ "$FIRST_CHAR" != "e" ]]; then
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t Note: this script should be sourced."
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t User did not input a valid repository name or search string (must be in single quotes) or qualifiers (must be 3 parts, e.g. e19:s94:prof). Exiting."
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t USAGE:"
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t\t $USAGE"
	return #for sourcing
	exit #for executing
fi

#############################
#############################
# function to display otsdaq versions and qualifiers
function fixTargetRepos
{
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t Adding new qualifiers ${QUALS} to ${REPO_COUNT} target repo(s)!"
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "

	#fix all REPO_DIR

	for p in ${REPO_DIR[@]}; do
		if [ -d $p ]; then
			if [[ -d $p/.git && -f $p/ups/product_deps ]]; then

				bp=$(basename $p)

				echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t ================== Repo directory to fix found as: $MRB_SOURCE/$bp"

				cd $p

				#Steps:
				#  - get line number of qualifier start
				#  - create tmp file up to line number
				#  - insert new quals line (using first line as example)
				#  - insert remaining quals

				NUM_OF_LINES=$(wc -l ups/product_deps)
				IFS=' ' read -r -a NUM_OF_LINES <<< "${NUM_OF_LINES}"
				NUM_OF_LINES=${NUM_OF_LINES[0]}
				echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t NUM_OF_LINES = $NUM_OF_LINES"

				QUAL_START_LINE="$(cat ups/product_deps | grep -n qualifier\ )"
				IFS=':' read -r -a QUAL_START_LINE <<< "${QUAL_START_LINE}"
				QUAL_START_LINE=${QUAL_START_LINE[0]}
				QUAL_START_LINE=$(( $QUAL_START_LINE + 1 ))
				echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t QUAL_START_LINE = $QUAL_START_LINE"

				#clear tmp file
				TMP_OUT_FILE="ups/product_deps.tmp"
				echo "" > $TMP_OUT_FILE

				##############
				i=0
				while IFS= read -r line; do #IFS= and -r to prevent whitespace changes

					i=$(( $i + 1 )) #maintain line count

					if [ $i == $QUAL_START_LINE ]; then
						echo
						#echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t\t line = $line"
						IFS=' ' read -r -a LINE_ARR <<< "$line"

						NEW_QUAL_LINE="" #init to blank and build it

						for line_arr_piece in ${LINE_ARR[@]}; do
							#echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t\t line_arr_piece = $line_arr_piece"

							IFS=':' read -r -a LINE_QUAL_ARR <<< "$line_arr_piece"
							LINE_QUAL_ARR_COUNT=(${#LINE_QUAL_ARR[@]})
							#echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t\t LINE_QUAL_ARR=${LINE_QUAL_ARR}"

							FIRST_CHAR=${LINE_QUAL_ARR:0:1}
							#echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t\t FIRST_CHAR=${FIRST_CHAR}"

							if [[ $LINE_QUAL_ARR_COUNT == 2 && "${LINE_QUAL_ARR[0]:0:1}" == "e" ]]; then
								NEW_QUAL_LINE="${NEW_QUAL_LINE}${QUAL_PIECES[0]}:${QUAL_PIECES[2]}\t\t"
							elif [[ $LINE_QUAL_ARR_COUNT == 3 && "${LINE_QUAL_ARR[0]:0:1}" == "e" && "${LINE_QUAL_ARR[1]:0:1}" == "s" ]]; then
								NEW_QUAL_LINE="${NEW_QUAL_LINE}${QUAL_PIECES[0]}:${QUAL_PIECES[1]}:${QUAL_PIECES[2]}\t\t"
							elif [[ $LINE_QUAL_ARR_COUNT == 4 && "${LINE_QUAL_ARR[0]:0:1}" == "e" && "${LINE_QUAL_ARR[1]:0:1}" == "s" ]]; then #like e19:s96:offline:prof
								NEW_QUAL_LINE="${NEW_QUAL_LINE}${QUAL_PIECES[0]}:${QUAL_PIECES[1]}:${LINE_QUAL_ARR[2]}:${QUAL_PIECES[2]}\t\t"
							else
								#do not know what to do, so take as is
								NEW_QUAL_LINE="${NEW_QUAL_LINE}${line_arr_piece}\t\t"
							fi


						done

						#echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t NEW_QUAL_LINE=${NEW_QUAL_LINE}"
						echo -e "$NEW_QUAL_LINE" >> $TMP_OUT_FILE  #-e to prevent whitespace changes
					fi
					echo -e "$line" >> $TMP_OUT_FILE  #-e to prevent whitespace changes

				done < ups/product_deps
				##############

				diff $TMP_OUT_FILE ups/product_deps
				cp ups/product_deps ups/product_deps.bk
				mv $TMP_OUT_FILE ups/product_deps

				cd - &>/dev/null 2>&1 #hide output
			fi
		fi
	done

	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t ================== Done fixing target repo(s)."
	echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  "
} #end fixTargetRepos
#######################################################

#if repo points to an existing folder, then no checkout needed

echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t repo search = ${repo}"
REPO_DIR="$(find $MRB_SOURCE -maxdepth 1 -iname "${repo}")"
if [ -z "${REPO_DIR}" ]; then #check empty, because empty was showing up as 1 for blank line count
	REPO_COUNT=0
else
	REPO_COUNT=(${#REPO_DIR[@]})
fi
#echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t REPO_COUNT=$REPO_COUNT"

repoProject=$2
if [ "x$repoProject" == "x" ]; then
	repoProject=$repo
fi

#at this point have one or many target repos to fix

fixTargetRepos #function call

echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t =================="
echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t ots_add_qualifiers_to_repo_product_deps script done!"
echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t *******************************"
echo -e "ots_add_qualifiers_to_repo_product_deps.sh [${LINENO}]  \t *******************************"
