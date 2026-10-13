#ifndef OTSDAQ_UTILITIES_OTSDAQ_UTILITIES_MACROMAKER_VERSION_H_
#define OTSDAQ_UTILITIES_OTSDAQ_UTILITIES_MACROMAKER_VERSION_H_

#include "config/PackageInfo.h"

#include <functional>
#include <set>
#include <string>

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

namespace MacroMaker
{
const std::string project  = "otsdaq";
const std::string package  = "MacroMaker";
const std::string versions = MYPACKAGE_FULL_VERSION_LIST;
const std::string summary  = "The MacroMaker Supervisor";
const std::string description =
    "The MacroMaker Supervisor handles low level sequences of read and writes to "
    "front-end interfaces with access through the Desktop graphical user interface.";
const std::string authors = "Ryan Rivera, Lorenzo Uplegger";
const std::string link    = "http://otsdaq.fnal.gov";

config::PackageInfo                            getPackageInfo();
void                                           checkPackageDependencies();
std::set<std::string, std::less<std::string> > getPackageDependencies();
}  // namespace MacroMaker

#endif  // OTSDAQ_UTILITIES_OTSDAQ_UTILITIES_MACROMAKER_VERSION_H_
