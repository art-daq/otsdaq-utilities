#!/bin/bash
# Meet all the github clang and whitespace requirements (for Pull Request merging)
# Example usage:
#      ots_git_format_apply.sh

# Prevent the script from being sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
	echo "This script must be executed and not sourced!" >&2
	exit 1
fi


echo
echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Targeting recursively the current directory ${PWD}"
echo
read -p "Are you sure you want to apply git format and whitespace rules? (the operations may be irreversible) [Y/N] " answer
if [[ "$answer" != "Y" && "$answer" != "y" ]]; then
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Aborting format-apply."
	exit 1
fi
echo

if command -v clang-format >/dev/null 2>&1; then
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Applying Clang format rules recursively at ${PWD} (this may take a few seconds depending on size of directory)..."
	if ! clang-format -i `find . -type f -name *.cc -o -name *.c -o -name *.cpp -o -name *.cxx -o -name *.icc`; then
		echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Error: clang-format failed" >&2
		exit 1
	fi
	if ! clang-format -i -style=file:.clang-format-hpp `find . -type f -name *.h -o -name *.hh -o -name *.hxx -o -name *.hpp`; then
		echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Error: clang-format failed" >&2
		exit 1
	fi
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Clang format rules applied."
else
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t clang-format not found; skipping Clang formatting."
fi

GIT_TEST_MSG="WIP test white-space snapshot commit for white-space check $(date +%d%b%y.%T)"
git_reset_before_msg() {
	msg="$GIT_TEST_MSG"
	hash=$(git reflog | awk -v m="$msg" '$0 ~ m {print $1; exit}')
	[ -z "$hash" ] && { echo "Message not found"; return 1; }
	git reset --mixed "$hash^" #uncommit test commit and unstage
	echo
} # end git_reset_before_msg


echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t White-space must be checked on a commit. Creating a test commit (which will be reversed)..."

# Stage everything
if ! git add -A; then
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Error: git add failed" >&2
	exit 1
fi

# Only commit if there are staged changes
if ! git diff --cached --quiet; then
	if ! git commit -m "$GIT_TEST_MSG"; then
		echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Error: Failed to commit changes" >&2
		exit 1
	else
		echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t White-space test commit created. Setting up trap to uncommit on exit..."
		# Set up trap to reset the commit if script exits unexpectedly
		trap 'echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Unstaging white-space test commit."; echo; git_reset_before_msg' EXIT
	fi
else
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t No changes to commit"
fi

# Capture output of ots_check_whitespace.sh and extract files with whitespace issues
echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Conducting White-space check of test commit..."
output=$(ots_check_whitespace.sh) #capture only stdout
# echo "$output"

# Extract filenames with whitespace issues (lines that start with a filename)
whitespace_files=$(echo "$output" | grep -E '^[^[:space:]]+:' | cut -d':' -f1 | sort -u)

# If there are files with whitespace issues, pass them to a subsequent script
if [ -n "$whitespace_files" ]; then
	echo
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Found files with whitespace issues. Passing them to next processing step..."
	# In a real implementation, this would call the next script with the files
	# For now, we'll just display them
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Files with whitespace issues:"
	echo
	# echo "$whitespace_files"
	fileParam=()
	readarray -t files <<<"$whitespace_files"
	for f in "${files[@]}"; do
		[ -f "$f" ] || continue
		echo "          $f"
		fileParam+=("$f") #append
	done
	echo
	echo
	read -p "Please inspect the list above. Do you want to continue modifying these files to fix the whitespace issues? [Y/N] " answer
	if [[ "$answer" != "Y" && "$answer" != "y" ]]; then
		echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Aborting whitespace-fix."
		exit 1
	fi

	echo
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Doing whitespace cleanup... calling ots_whitespace_cleanup.sh"
	echo

	ots_whitespace_cleanup.sh "${fileParam[@]}"

	echo
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t Whitespace cleanup complete."
	echo
else
	echo
	echo -e "$(date +%d%b%y.%T) ots_git_format_apply.sh:${LINENO} \t No whitespace issues found."
	echo
fi
