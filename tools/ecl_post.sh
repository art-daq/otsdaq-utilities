#!/bin/bash


# Usage: ./ecl_post.sh <author> <title> <message>

if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
	echo "Error: this script must be executed, not sourced." >&2
	return 1 2>/dev/null || exit 1
fi


SCRIPT_DIR="$(
 cd "$(dirname "$(readlink "$0" || printf %s "$0")")"
 pwd -P
)"

if [[ "x$1" == "x" ]]; then
	echo -e "$(date +%d%b%y.%T) ecl_post.sh:${LINENO} |  \t Missing <author> <title> and <message> args!"
	exit 1
fi
AUTHOR=$1
shift

if [[ "x$1" == "x" ]]; then
	echo -e "$(date +%d%b%y.%T) ecl_post.sh:${LINENO} |  \t Missing <author> <title> and <message> args!"
	exit 1
fi
TITLE=$1
shift

if [[ "x$1" == "x" ]]; then
	echo -e "$(date +%d%b%y.%T) ecl_post.sh:${LINENO} |  \t Missing <author> <title> and <message> args!"
	exit 1
fi

MESSAGE=$1
shift

echo -e "$(date +%d%b%y.%T) ecl_post.sh:${LINENO} |  \t Posting ECL message from ${AUTHOR} --> ${TITLE}: ${MESSAGE}"

ECLTest --host $ECL_URL --user $ECL_USER_NAME --pwd $ECL_PASSWORD --cat "${ECL_CATEGORY}" --title "${TITLE}" --msg "From ${AUTHOR}: ${MESSAGE}"

# Print a summary result
echo -e "$(date +%d%b%y.%T) ecl_post.sh:${LINENO} |  \t ===> Done with ecl post from ${AUTHOR} on ${HOSTNAME}!"
