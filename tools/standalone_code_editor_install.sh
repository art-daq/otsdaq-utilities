#!/bin/bash
#
# This file can be downloaded here:
#
# 	wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/tools/standalone_code_editor_install.sh
#
#
# This script is expected to be sourced. It will
# create the folder structure and download
# the necessary files for the otsdaq stand-alone Code Editor.
#
# Copyright January 2020,  rrivera at fnal dot gov
#
# source standalone_code_editor_install.sh



echo -e "standalone_code_editor_install.sh [${LINENO}]  "
echo -e "standalone_code_editor_install.sh [${LINENO}]  \t ~~ Code Editor stand-alone installation ~~ "
echo -e "standalone_code_editor_install.sh [${LINENO}]  "
echo -e "standalone_code_editor_install.sh [${LINENO}]  "

mkdir otsCodeEditor
mkdir otsCodeEditor/html
mkdir otsCodeEditor/css
mkdir otsCodeEditor/js
mkdir otsCodeEditor/js/js_lib
mkdir otsCodeEditor/images
mkdir otsCodeEditor/images/windowContentImages
mkdir otsCodeEditor/images/otsdaqIcons
mkdir otsCodeEditor/fonts
mkdir otsCodeEditor/fonts/comfortaa

wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/html/CodeEditor_standalone.html -P otsCodeEditor/html/ --no-check-certificate || curl -o  otsCodeEditor/html/CodeEditor_standalone.html https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/html/CodeEditor_standalone.html

wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/css/ots.css -P otsCodeEditor/css/ --no-check-certificate	 || curl -o  otsCodeEditor/css/ots.css https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/css/ots.css
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/css/MultiSelectBox.css -P otsCodeEditor/css/ --no-check-certificate || curl -o  otsCodeEditor/css/MultiSelectBox.css https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/css/MultiSelectBox.css
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/css/CodeEditor.css -P otsCodeEditor/css/ --no-check-certificate	|| curl -o  otsCodeEditor/css/CodeEditor.css https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/css/CodeEditor.css

wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/Globals.js -P otsCodeEditor/js/ --no-check-certificate	|| curl -o  otsCodeEditor/js/Globals.js https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/Globals.js
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/Debug.js -P otsCodeEditor/js/ --no-check-certificate		|| curl -o  otsCodeEditor/js/Debug.js https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/Debug.js
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/DesktopWindowContentCode.js -P otsCodeEditor/js/ --no-check-certificate		|| curl -o  otsCodeEditor/js/DesktopWindowContentCode.js https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/DesktopWindowContentCode.js
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/CodeEditor.js -P otsCodeEditor/js/ --no-check-certificate	|| curl -o  otsCodeEditor/js/CodeEditor.js https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/CodeEditor.js
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/js_lib/MultiSelectBox.js -P otsCodeEditor/js/js_lib/ --no-check-certificate		|| curl -o  otsCodeEditor/js/js_lib/MultiSelectBox.js https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/js/js_lib/MultiSelectBox.js

wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/ConfigurationGUI-pencilEdit.png -P otsCodeEditor/images/windowContentImages/ --no-check-certificate		|| curl -o  otsCodeEditor/images/windowContentImages/ConfigurationGUI-pencilEdit.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/ConfigurationGUI-pencilEdit.png
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/ConfigurationGUI-pencilEditHover.png -P otsCodeEditor/images/windowContentImages/ --no-check-certificate		|| curl -o  otsCodeEditor/images/windowContentImages/ConfigurationGUI-pencilEditHover.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/ConfigurationGUI-pencilEditHover.png
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/ConfigurationGUI-trashCan.png -P otsCodeEditor/images/windowContentImages/ --no-check-certificate		|| curl -o  otsCodeEditor/images/windowContentImages/ConfigurationGUI-trashCan.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/ConfigurationGUI-trashCan.png
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/ConfigurationGUI-trashCanHover.png -P otsCodeEditor/images/windowContentImages/ --no-check-certificate		|| curl -o  otsCodeEditor/images/windowContentImages/ConfigurationGUI-trashCanHover.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/ConfigurationGUI-trashCanHover.png

wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/CodeEditor-openInNewWindow.png -P otsCodeEditor/images/windowContentImages/ --no-check-certificate		|| curl -o  otsCodeEditor/images/windowContentImages/CodeEditor-openInNewWindow.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/CodeEditor-openInNewWindow.png
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/CodeEditor-openInOtherPane.png -P otsCodeEditor/images/windowContentImages/ --no-check-certificate		|| curl -o  otsCodeEditor/images/windowContentImages/CodeEditor-openInOtherPane.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/windowContentImages/CodeEditor-openInOtherPane.png

wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/otsdaqIcons/favicon-32x32.png -P otsCodeEditor/images/otsdaqIcons/ --no-check-certificate		|| curl -o  otsCodeEditor/images/otsdaqIcons/favicon-32x32.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/otsdaqIcons/favicon-32x32.png
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/otsdaqIcons/favicon-96x96.png -P otsCodeEditor/images/otsdaqIcons/ --no-check-certificate		|| curl -o  otsCodeEditor/images/otsdaqIcons/favicon-96x96.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/otsdaqIcons/favicon-96x96.png
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/otsdaqIcons/favicon-16x16.png -P otsCodeEditor/images/otsdaqIcons/ --no-check-certificate		|| curl -o  otsCodeEditor/images/otsdaqIcons/favicon-16x16.png https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/otsdaqIcons/favicon-16x16.png
wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/otsdaqIcons/favicon.ico -P otsCodeEditor/images/otsdaqIcons/ --no-check-certificate		|| curl -o  otsCodeEditor/images/otsdaqIcons/favicon.ico https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/images/otsdaqIcons/favicon.ico

wget https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/fonts/comfortaa/Comfortaa-Regular.ttf -P otsCodeEditor/fonts/comfortaa/ --no-check-certificate		|| curl -o  otsCodeEditor/fonts/comfortaa/Comfortaa-Regular.ttf https://cdcvs.fnal.gov/redmine/projects/otsdaq/repository/utilities/revisions/develop/raw/WebGUI/fonts/comfortaa/Comfortaa-Regular.ttf

#fix style paths
sed -i '' 's/\/WebPath/\.\./g' otsCodeEditor/css/*.css
sed -i '' 's/\/WebPath/\.\./g' otsCodeEditor/js/*.js

echo -e "standalone_code_editor_install.sh [${LINENO}]  \t =================="
echo -e "standalone_code_editor_install.sh [${LINENO}]  \t Code Editor stand-alone installation done"
echo -e "standalone_code_editor_install.sh [${LINENO}]  \t "
echo -e "standalone_code_editor_install.sh [${LINENO}]  \t Now open this file in your browser: otsCodeEditor/html/CodeEditor_standalone.html"
echo -e "standalone_code_editor_install.sh [${LINENO}]  \t "
echo -e "standalone_code_editor_install.sh [${LINENO}]  \t *******************************"
echo -e "standalone_code_editor_install.sh [${LINENO}]  \t *******************************"
