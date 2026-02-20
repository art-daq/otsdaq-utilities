#!/bin/bash
# Use results to find extra white-space
#   ...then in VS code, for example, find with .* regular expressions '[ \t]+$' and replace with empty ''

# Developer note: ots_git_format_apply.sh parses the stdout result from this script execution, so do not do leading printout decoratation
#  File difference callouts have to be first in the printout!

# Prevent the script from being sourced
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
	echo "This script must be executed and not sourced!" >&2
	exit 1
fi

excluded_dirs="WebGUI/js/js_lib WebGUI/js/visualizers_lib" #could space-separate excluded directories
exclude_regex="^(nothingtoseehere|Data_.*|databases_.*"

#copied from otdsaq-utilities Check Git whitespace / Check Git whitespace on 20-Feb-2026
for dir in \$excluded_dirs;do
if [ -d \$dir ] || [ -f \$dir ]; then
	exclude_regex="\${exclude_regex}|\$dir"
fi
done
if [ -f .git_whitespace_exclude ];then
while read entry;do
	if [ "x\$entry" == "x" ]; then continue; fi
	if [ -d \$entry ] || [ -f \$entry ]; then
	exclude_regex="\${exclude_regex}|\$entry"
	fi
done < .git_whitespace_exclude
fi
exclude_regex="\${exclude_regex})"
echo "Excluding files from checks via \${exclude_regex}"

against=ab8055f50d452954d26e4e02ca60df40f98c9b8d
if [ "x\$against" == "x" ] || [ "x\$against" == "x0" ]; then
	against=\$(git hash-object -t tree /dev/null)
fi
echo "Checking for whitespace differences introduced since commit \$against"

# Cross platform projects tend to avoid non-ASCII filenames; prevent
# them from being added to the repository. We exploit the fact that the
# printable range starts at the space character and ends with tilde.
badchar=\$(git diff --cached --name-only --diff-filter=A  \$against | grep -vE "\${exclude_regex}" | \
LC_ALL=C tr -d 'A-Za-z0-9/\n_ .@+-' | wc -c)
if [ \$badchar != 0 ]
then
	echo "Check failed: cannot add a file name with non-ASCII or blank char."
	exit 1
fi

names=$( git diff --cached --name-only --diff-filter=AM  $against | grep -vE "${exclude_regex}" )

rc=0
geomReg1=".*/geom[^/]*\.txt$"
geomReg2="Mu2eG4/geom/.*\.txt$"
for name in $names
do
	#echo "Checking whitespace for $name"
	bname=$( basename $name )
	ext=$(echo $bname | awk -F. '{if(NF==1) print ""; else print $NF};' )
	if [[ "$ext" == "hh" || "$ext" == "cc" || "$ext" == "fcl" \
		|| "$ext" == "C" ||  "$ext" == "h" || "$ext" == "icc" \
		|| "$ext" == "mac" || "$ext" == "sh" || "$ext" == "py" || "$ext" == "pl"  \
		|| "$ext" == "html" || "$ext" == "htm" || "$ext" == "css" || "$ext" == "js"
		|| "$bname" == "SConscript"  \
		|| "$name" == *"tools/"*  \
		|| "$name" == *"test/"*  \
		|| "$name" =~ $geomReg1 || "$name" =~ $geomReg2 ]]; then

		# check whitespace and return non-zero if not allowed

		git diff-index --check --cached $against $name
		[ $? -ne 0 ] && rc=1

		if [[ -e "$name" && $(tail -c1 "$name" | wc -l) -eq 0 ]]; then
			echo "$name: does not have a terminal newline"
			rc=1
		fi
	fi
done

if [ $rc -ne 0 ] ; then
	echo "White-space check detected excess whitespace!"
else
	echo "White-space check found no excess whitespace."
fi
exit $rc
