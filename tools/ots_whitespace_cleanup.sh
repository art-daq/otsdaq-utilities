#!/bin/bash
# Meet all the github clang and whitespace requirements (for Pull Request merging)
# Example usage:
#      ots_git_format_apply.sh

# Prevent the script from being sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
	echo "$(date +%d%b%y.%T) ots_whitespace_cleanup.sh:${LINENO} \t This script must be executed and not sourced!" >&2
	exit 1
fi

echo "$(date +%d%b%y.%T) ots_whitespace_cleanup.sh:${LINENO} \t | --- ots_whitespace_cleanup file-list: $@ ---"

for file in "$@"; do
	[ -f "$file" ] || continue

	tmp=$(mktemp)

	# 1) Convert leading spaces to tabs
	# 2) Remove trailing whitespace
	unexpand --first-only -t 4 "$file" \
	| sed 's/[[:space:]]\+$//' \
	> "$tmp"

	# 3) Ensure exactly one terminal newline
	# If file does not end with newline, add one
	if [ -s "$tmp" ] && [ "$(tail -c1 "$tmp" | wc -l)" -eq 0 ]; then
		echo >> "$tmp"
	fi

	# 4) Overwrite contents (preserves inode, permissions, SELinux)
	cat "$tmp" > "$file"

	rm -f "$tmp"
done

echo "$(date +%d%b%y.%T) ots_whitespace_cleanup.sh:${LINENO} \t | --- ots_whitespace_cleanup done ---"
