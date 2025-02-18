#!/bin/bash
#Usage: ./convert_header_comments_to_doxygen.sh <path>
# Note: this does not work as well as otsdaq-utilities/tools/convert_comments_to_doxygen.cpp

# Check if directory is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <directory>"
    exit 1
fi




# Process all .h files in the given directory recursively
find "$1" -type f -name "*.h" | while read -r file; do
    echo "Processing: $file"

    # Use sed to replace end-of-line // comments with ///<
    # - Ignores lines that start with '#' (e.g., #pragma)
    # - Ignores special comments like '// clang-format off'
    # - Ignores comments made of repeated characters (e.g., '// ========')
    # - Ignores `} // namespace ots` specifically
    # - Converts other comments to Doxygen format
    sed -i -E '/^[[:space:]]*#/! {/^[[:space:]]*\/\/[[:space:]]*(clang-format|TODO|FIXME|NOTE|namespace)/! {/^[[:space:]]*\/\/[[:space:]]*([=_\-~*\/]{3,})/! {/^[[:space:]]*\/\/[[:space:]]*\}[[:space:]]*\/\/[[:space:]]*namespace[[:space:]]+ots/! s#([^/])//[[:space:]]*(.*)$#\1 ///< \2#}}}' "$file"

    # Remove unwanted `} ///< namespace ots` conversion
    sed -i -E 's#}   ///< namespace ots#} // namespace ots#' "$file"

done

echo "Conversion complete for all .h files in $1"



