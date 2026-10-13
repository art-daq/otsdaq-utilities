#ifndef OTSDAQ_UTILITIES_OTSDAQ_UTILITIES_CONFIGURATIONGUI_VERSION_H_
#define OTSDAQ_UTILITIES_OTSDAQ_UTILITIES_CONFIGURATIONGUI_VERSION_H_

#include "config/PackageInfo.h"

#define MYPACKAGE_VERSION_MAJOR OTSDAQ_MAJOR_VERSION
#define MYPACKAGE_VERSION_MINOR OTSDAQ_MINOR_VERSION
#define MYPACKAGE_VERSION_PATCH OTSDAQ_PATCH_VERSION
#undef MYPACKAGE_PREVIOUS_VERSIONS

#define MYPACKAGE_VERSION_CODE \
	PACKAGE_VERSION_CODE(      \
	    MYPACKAGE_VERSION_MAJOR, MYPACKAGE_VERSION_MINOR, MYPACKAGE_VERSION_PATCH)
#ifndef MYPACKAGE_PREVIOUS_VERSIONS
#define MYPACKAGE_FULL_VERSION_LIST \
	PACKAGE_VERSION_STRING(         \
	    MYPACKAGE_VERSION_MAJOR, MYPACKAGE_VERSION_MINOR, MYPACKAGE_VERSION_PATCH)
#else
#define MYPACKAGE_FULL_VERSION_LIST                         \
	MYPACKAGE_PREVIOUS_VERSIONS "," PACKAGE_VERSION_STRING( \
	    MYPACKAGE_VERSION_MAJOR, MYPACKAGE_VERSION_MINOR, MYPACKAGE_VERSION_PATCH)
#endif

namespace ConfigurationGUI
{
const std::string project  = "otsdaq";
const std::string package  = "ConfigurationGUI";
const std::string versions = MYPACKAGE_FULL_VERSION_LIST;
const std::string summary  = "The ConfigurationGUI Supervisor";
const std::string description =
    "The ConfigurationGUI Supervisor handles editing the system configuration tree with "
    "support through the Desktop graphical user interface.";
const std::string authors = "Ryan Rivera, Lorenzo Uplegger";
const std::string link    = "http://otsdaq.fnal.gov";

config::PackageInfo                            getPackageInfo();
void                                           checkPackageDependencies();
std::set<std::string, std::less<std::string> > getPackageDependencies();
}  // namespace ConfigurationGUI

#endif  // OTSDAQ_UTILITIES_OTSDAQ_UTILITIES_CONFIGURATIONGUI_VERSION_H_
