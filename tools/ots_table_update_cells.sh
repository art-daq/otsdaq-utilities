#!/bin/bash
# Wrapper for ots_table_update_cells_DO_NOT_RUN
# Enforces kerberos authentication and requires user notes before modifying table cells.
#
# usage:
#     ots_table_update_cells.sh <tableName> <updates> <notes> [--version <ver>] [--source-alias <name>] [--alias <aliasName>]
#
# where <updates> is a semicolon-separated list of row updates:
#     UID1:col1=val1,col2=val2;UID2:col1=val3

if [ $# -lt 3 ]; then
	echo ""
	echo "usage:"
	echo "    ots_table_update_cells.sh <tableName> <updates> <notes> [--version <ver>] [--source-alias <name>] [--alias <aliasName>]"
	echo ""
	echo "    <updates> format: UID1:col1=val1,col2=val2;UID2:col1=val3"
	echo ""
	echo "    options:"
	echo "        --version <ver>       : source version to modify (default: active version)"
	echo "        --source-alias <name> : load source version from a version alias"
	echo "        --alias <alias>       : assign version alias to newly created version"
	echo ""
	echo "    Notes are required to document the reason for the change."
	echo ""
	exit 1
fi

# --- Kerberos authentication check ---
kcacheUser=$(klist 2>/dev/null | grep "Default principal" | cut -d: -f2 | sed 's/ //g' | cut -d '@' -f1)

if [ -z "$kcacheUser" ]; then
	echo ""
	echo "Error: No valid kerberos principal found."
	echo "Please run 'kinit' and then re-try."
	echo ""
	exit 1
fi

export OTS_KCACHE_USER="$kcacheUser"
echo "Kerberos user: $kcacheUser"

# --- Extract positional args ---
tableName="$1"
updates="$2"
notes="$3"
shift 3

if [ -z "$notes" ]; then
	echo ""
	echo "Error: Notes are required. Please provide a description of your changes as the 3rd argument."
	echo ""
	exit 1
fi

echo "Notes: $notes"

# --- Call the underlying C++ tool ---
ots_table_update_cells_DO_NOT_RUN "$tableName" "$updates" --notes "$notes" "$@"
