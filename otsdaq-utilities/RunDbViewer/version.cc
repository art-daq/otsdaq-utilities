#include "config/version.h"
#include <xcept/version.h>
#include <xdaq/version.h>
#include "otsdaq-utilities/RunDbViewer/version.h"

GETPACKAGEINFO(RunDbViewer)

//==============================================================================
void RunDbViewer::checkPackageDependencies()
{
	CHECKDEPENDENCY(config);
	CHECKDEPENDENCY(xcept);
	CHECKDEPENDENCY(xdaq);
}

//==============================================================================
std::set<std::string, std::less<std::string> > RunDbViewer::getPackageDependencies()
{
	std::set<std::string, std::less<std::string> > dependencies;

	ADDDEPENDENCY(dependencies, config);
	ADDDEPENDENCY(dependencies, xcept);
	ADDDEPENDENCY(dependencies, xdaq);

	return dependencies;
}
