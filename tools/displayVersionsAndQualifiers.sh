

#############################
#############################
# function to display otsdaq versions and qualifiers
function displayVersionsAndQualifiers
{
	#this is TODO for the new Spack world:
	OTS_ENV=`ls -l -rta | grep tdaq-v | rev | cut -d '/' -f1 | rev | head -1`
	echo -e "displayVersionsAndQualifiers.sh:${LINENO} |  \t OTS_ENV=$OTS_ENV"

	# consider using...



	# When you're in an environment, it won't print packages which aren't in the environment tree (so if you have otsdaq checked out, it won't show up)
	# spack list --format version_json otsdaq will list the tags Spack knows about
	# [
	#   {"name": "otsdaq",
	#    "latest_version": "v3_02_00",
	#    "versions": ["develop", "v3_02_00", "v3_01_00", "v3_00_00", "v2_10_00", "v2_09_01", "v2_09_00", "v2_08_02", "v2_08_01", "v2_08_00", "v2_07_00", "v2_06_11", "v2_06_10", "v2_06_09", "v2_06_08", "v2_06_07"],
	#    "homepage": "https://cdcvs.fnal.gov/redmine/projects/artdaq/wiki",
	#    "file": "https://github.com/spack/spack/blob/develop/var/spack/repos/builtin/packages/otsdaq/package.py",
	#    "maintainers": [],

	# and how do i know which version I am on? which tag the products are setup for
	# cd srcs/otsdaq;git describe --tags
	# v3_03_00-36-g8ed8c96f


	# If you didn't have packages checked out across bundles, you'd be able to see the bundle version...
	# in your spack find output, you can see that you have art-suite@s132, but the artdaq and otsdaq bundles
	# are part of your srcs build, so you can't programmatically see what versions those bundles are at.
	# (It doesn't matter, since you're basically building develop)

	# Someone that only has mu2e packages checked out would have the otsdaq-suite and artdaq-suite bundles in
	# their spack find output

	# artdaq-spack and mu2e-spack are both generally safe to pull

	# fnal_art and scd_recipes should be left alone
	return

	# this is for the old MRB world

	echo
	echo
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t Note: Here are your localProducts directories..."
	echo
	ls ${MRB_SOURCE}/../ | grep localProducts
	echo
	echo

	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t Note: below are the available otsdaq releases..."
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t ----------------------------"
	#-s for silent, sed to remove closing </a>
	#curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep \<\/a\> | grep _ | grep v  | grep --invert-match href | sed -e 's/<.*//'
	curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep \<\/a\> | grep _ | grep \>v | sed -e 's/<.*\">/\t\t\t\t\t\t\t/' | sed -e 's/<\/td><\/tr>.*//' | sed -e 's/<.*>/    /'
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t ----------------------------"
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t Note: above are the available otsdaq releases..."
	echo

	#ALL_RELEASES=( $(curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep \<\/a\> | grep _ | grep v  | grep --invert-match href | sed -e 's/<.*//') )
	ALL_RELEASES=( $(curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep \<\/a\> | grep _ | grep \>v  | sed -e 's/<\/a.*//' | sed -e 's/.*v/v/') )
	#the above should be a clean array of v##_##_##, as of April 2021, the latest release is now first (instead of last)
	#LATEST_RELEASE=${ALL_RELEASES[${#ALL_RELEASES[@]}-1]}
	LATEST_RELEASE=${ALL_RELEASES[0]}
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t The latest otsdaq release is $LATEST_RELEASE"

	echo
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t Note: below are the available qualifiers for $LATEST_RELEASE.."
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t ----------------------------"
	#-s for silent, sed to remove closing </a>
	curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/$LATEST_RELEASE/manifest/ | grep \<\/a\> | grep MANIFEST | sed -e 's/-d.*//' |  sed -e 's/-p.*//' |  sed -e 's/.*-s/                                                        s/' | sed -e 's/-/:/'
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t ----------------------------"
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t Note: above are the available qualifiers for $LATEST_RELEASE.."
	echo
	ALL_QUALS=( $(curl -s https://scisoft.fnal.gov/scisoft/bundles/otsdaq/$LATEST_RELEASE/manifest/ | grep \<\/a\> | grep MANIFEST | sed -e 's/-d.*//' |  sed -e 's/-p.*//' |  sed -e 's/.*-s/ s/' | sed -e 's/-/:/') )
	LATEST_QUAL=${ALL_QUALS[${#ALL_QUALS[@]}-1]}
	echo
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t To explore the available qualifiers go here in your browser:"
	echo
	echo -e "\t\t\t\t https://scisoft.fnal.gov/scisoft/bundles/otsdaq"
	echo
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t ... then click the version, and manifest folder to view qualifiers."
	echo
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t To switch qualifiers, do the following: \n\n\t\t\t\t mrb newDev -f -v $LATEST_RELEASE -q $LATEST_QUAL:prof"
	echo
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t ...and replace '$LATEST_RELEASE' with your target version. and '$LATEST_QUAL:prof' with your qualifiers"
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t ...a new localProducts directory will be created, which you should use when you setup ots."
	echo -e "displayVersionsAndQualifiers.sh:${LINENO}  \t Note: Here are your localProducts directories..."
	echo
	ls ${MRB_SOURCE}/../ | grep localProducts
	echo
	echo

} #end displayVersionsAndQualifiers
