#!/bin/bash

#Note: this script is different from otsdaq_demo/instal_ots_repo.sh
# that script attempts to install an existing repo
# this script attempts to create a new repo directory.. check-in handling is not handled

#first run setup_ots.sh
# usage: ./ots_create_repo_from_demo.sh <repo_name>
#
# use underscores in name

Base=$PWD

#Steps:
#	ask user for repo name

repo=$1

if [ "x$repo" == "x" ];then
  echo "User did not input a repository name. Exiting."
  echo "usage: ./ots_create_repo_from_demo.sh <repo_name>"
  exit
fi

repoName=${repo//_/-}

echo "repo = $repo"
echo "repoName = $repoName"

# download tutorial database
echo
echo "*****************************************************"
echo "Downloading template..."
echo

cd $MRB_SOURCE # this is the 'srcs' directory that will be set in the course of setting up OTS-DAQ

echo "mrb gitCheckout -d ${repo} http://cdcvs.fnal.gov/projects/otsdaq-demo"
mrb gitCheckout -d ${repo} http://cdcvs.fnal.gov/projects/otsdaq-demo

echo "mrb uc"
mrb uc


echo
echo "*****************************************************"
echo "Modifying template..."
echo

#kill repository actions
echo "rm -rf ${MRB_SOURCE}/otsdaq-demo/.git"
rm -rf ${MRB_SOURCE}/otsdaq-demo/.git

echo "sed -i s/otsdaq-demo/${repoName}/g                            ${repo}/CMakeLists.txt"
sed -i s/otsdaq-demo/${repoName}/g 	${repo}/CMakeLists.txt
echo "sed -i s/add_subdirectory(tools)/#add_subdirectory(tools)/g   ${repo}/CMakeLists.txt"
sed -i s/add_subdirectory\(tools\)/#add_subdirectory\(tools\)/g 		${repo}/CMakeLists.txt
echo "sed -i s/add_subdirectory(test)/#add_subdirectory(test)/g     ${repo}/CMakeLists.txt"
sed -i s/add_subdirectory\(test\)/#add_subdirectory\(test\)/g 		${repo}/CMakeLists.txt

echo "sed -i s/otsdaq_demo/${repo}/g                                ${repo}/ups/product_deps"
sed -i s/otsdaq_demo/${repo}/g 		${repo}/ups/product_deps

echo "mv ${repo}/otsdaq-demo ${repo}/${repoName}"
mv ${repo}/otsdaq-demo ${repo}/${repoName}

echo "sed -i s/add_subdirectory/#add_subdirectory/g                 ${repo}/${repoName}/CMakeLists.txt"
sed -i s/add_subdirectory/#add_subdirectory/g 		${repo}/${repoName}/CMakeLists.txt



cd ${Base} #return to starting directory


echo
echo "*****************************************************"
echo "Wrapping up..."
echo
echo

echo "Now, if you have an empty repository and want to fill it, do this:"
echo "  download your repo with write access (make sure to use a different temporary folder name):"
echo "    mrb gitCheckout -d <folder name> ssh://p-<main-repo-name>@cdcvs.fnal.gov/cvs/projects/<target-repo-name>  #target and main are often the same"
echo
echo "... then you can copy the .git folder from your repo into ${repo}"
echo
echo "...   cp -r <folder name>/.git ${repo}/.git"
echo "...   rm -rf <folder name> # you do not need temporary folder anymore"
echo "...   cd ${repo}/; git status  # to check status from your repo perspective"
echo
echo "...   mrb uc #to clean up top level CMake based on resulting folders in srcs"
echo
echo "... and you will need to uncomment any add_subdirectory lines that you want to revive."
echo
echo "p.s. You may need to do... mrb z"

echo
echo
echo "Complete!"
