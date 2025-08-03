#include "otsdaq-utilities/RunDbViewer/RunDbViewerSupervisor.h"

#include "otsdaq/FiniteStateMachine/MakeRunInfo.h"        // for Run Info plugin macro
#include "otsdaq/FiniteStateMachine/RunInfoVInterface.h"  // for Run Info plugins

using namespace ots;

const std::string RUNDBVIEWER_PATH = getenv("RUNDBVIEWER_DATA_PATH")
                                         ? getenv("RUNDBVIEWER_DATA_PATH")
                                         : "." + std::string("/");
#define RUNDBVIEWER_CATEGORY_LIST_PATH RUNDBVIEWER_PATH + "category_list.xml"

#define XML_ADMIN_STATUS "rundbviewer_admin_status"
#define XML_STATUS "rundbviewer_status"
#define XML_MOST_RECENT_DAY "most_recent_day"
#define XML_CATEGORY_ROOT "categories"
#define XML_CATEGORY "category"
#define XML_ACTIVE_CATEGORY "active_category"

#define XML_RUNDBVIEWER_ENTRY "rundbviewer_entry"
#define XML_RUNDBVIEWER_ENTRY_RUN_NUMBER "rundbviewer_entry_run_number"
#define XML_RUNDBVIEWER_ENTRY_RUN_TIME "rundbviewer_entry_run_time"
#define XML_RUNDBVIEWER_ENTRY_RUN_TYPE "rundbviewer_entry_run_type"
#define XML_RUNDBVIEWER_ENTRY_RUN_ARTDAQ_PARTITION \
	"rundbviewer_entry_run_artdaq_partition"
#define XML_RUNDBVIEWER_ENTRY_RUN_HOST_NAME "rundbviewer_entry_run_host_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONDIOTION_ID "condition_id"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_NAME "configuration_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_VERSION "configuration_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_NAME "context_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_VERSION "context_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_ONLINE_SOFTWARE_VERSION "online_software_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_SHIFTER_NOTE "shifter_note"
#define XML_RUNDBVIEWER_ENTRY_RUN_START_TIME "start_time"
#define XML_RUNDBVIEWER_ENTRY_RUN_STOP_TIME "stop_time"

XDAQ_INSTANTIATOR_IMPL(RunDbViewerSupervisor)

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "RunDbViewer"

//==============================================================================
RunDbViewerSupervisor::RunDbViewerSupervisor(xdaq::ApplicationStub* stub)
    : CoreSupervisorBase(stub)
{
	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	// xgi::bind (this, &RunDbViewerSupervisor::Default,                	"Default" );
	// xgi::bind (this, &RunDbViewerSupervisor::Log,                		"Log" );
	// xgi::bind (this, &RunDbViewerSupervisor::LogImage,               	"LogImage" );
	// xgi::bind (this, &RunDbViewerSupervisor::LogReport,             	"LogReport" );

	init();

	// TODO allow admins to subscribe to active category alerts using System messages
	// (and email)
}  // end constructor()

//==============================================================================
RunDbViewerSupervisor::~RunDbViewerSupervisor(void) { destroy(); }

//==============================================================================
void RunDbViewerSupervisor::init(void)
{
	// called by constructor
	mostRecentDayIndex_ = 0;
}  //end init()

//==============================================================================
void RunDbViewerSupervisor::destroy(void)
{
	// called by destructor
}  //end destroy()

//==============================================================================
/// setSupervisorPropertyDefaults
///		override to set defaults for supervisor property values (before user settings
/// override)
void RunDbViewerSupervisor::setSupervisorPropertyDefaults()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.UserPermissionsThreshold,
	    std::string() +
	        "*=1 | CreateCategory=-1 | RemoveCategory=-1 | GetCategoryListAdmin=-1 "
	        "| SetActiveCategory=-1" +
	        " | AdminRemoveRestoreEntry=-1");
}  //end setSupervisorPropertyDefaults()

//==============================================================================
/// forceSupervisorPropertyValues
///		override to force supervisor property values (and ignore user settings)
void RunDbViewerSupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes,
	    "RefreshRunDbViewer | getRunConditionByID");
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.NonXMLRequestTypes,
	    "LogImage | LogReport");
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.RequireUserLockRequestTypes,
	    "CreateCategory | RemoveCategory | PreviewEntry | AdminRemoveRestoreEntry");
}  //end forceSupervisorPropertyValues()

//==============================================================================
///	request
///		Handles Web Interface requests to RunDbViewer supervisor.
///		Does not refresh cookie for automatic update checks.
void RunDbViewerSupervisor::request(const std::string&               requestType,
                                    cgicc::Cgicc&                    cgiIn,
                                    HttpXmlDocument&                 xmlOut,
                                    const WebUsers::RequestUserInfo& userInfo)
{
	__COUTTV__(requestType);

	// Commands
	//	GetCategoryList
	//	RefreshRunDbViewer

	// to report to RunDbViewer admin status use
	// xmlOut.addTextElementToData(XML_ADMIN_STATUS,tempStr);

	if(requestType == "GetCategoryList")
	{
		// remove from xml list, but do not remove directory (requires manual delete so
		// mistakes aren't made)
		if(userInfo.permissionLevel_ >=
		   CoreSupervisorBase::getSupervisorPropertyUserPermissionsThreshold(
		       "GetCategoryListAdmin"))
		{
			xmlOut.addTextElementToData("is_admin", "0");  // indicate not an admin
			return;
		}
		// else

		xmlOut.addTextElementToData("is_admin", "1");  // indicate an admin
		getCategories(&xmlOut);
	}
	else if(requestType == "RefreshRunDbViewer")
	{
		// returns RunDbViewer for currently active category based on date and duration
		// parameters

		std::string Date     = CgiDataUtilities::postData(cgiIn, "Date");
		uint32_t    Duration = CgiDataUtilities::postDataAsInt(cgiIn, "Duration");

		time_t date;
		sscanf(Date.c_str(), "%li", &date);  // scan for unsigned long

		__COUT__ << "date " << date << " duration " << Duration << std::endl;

		std::stringstream str;
		std::string       category = "";
		std::string pluginName = CgiDataUtilities::postData(cgiIn, "runInfoPluginName");
		std::string runInfoUID = CgiDataUtilities::postData(cgiIn, "runInfoPluginUID");
		refreshRunDbViewer(date,
		                   Duration,
		                   &xmlOut,
		                   (std::ostringstream*)&str,
		                   category,
		                   pluginName,
		                   runInfoUID);
		__COUT__ << str.str() << std::endl;
	}
	else if(requestType == "getRunConditionByID")
	{
		// returns Run conditions for currently condition_ID
		uint64_t condition_ID =
		    CgiDataUtilities::postDataAsUint64_t(cgiIn, "condition_ID");
		std::string pluginName = CgiDataUtilities::postData(cgiIn, "runInfoPluginName");
		std::string runInfoUID = CgiDataUtilities::postData(cgiIn, "runInfoPluginUID");
		getRunConditionByID(condition_ID, &xmlOut, pluginName, runInfoUID);
	}
	else
		__COUT__ << "requestType request not recognized." << std::endl;
}  //end request()

//==============================================================================
///	request
///		Handles Web Interface requests to RunDbViewer supervisor.
///		Does not refresh cookie for automatic update checks.
void RunDbViewerSupervisor::nonXmlRequest(const std::string& requestType,
                                          cgicc::Cgicc&      cgiIn,
                                          std::ostream&      out,
                                          const WebUsers::RequestUserInfo& /*userInfo*/)
{
	// Commands
	// LogImage
	// LogReport

	if(requestType == "LogImage")
	{
		std::string src = CgiDataUtilities::getData(cgiIn, "src");
		__COUT__ << " Get Log Image " << src << std::endl;

		out << "<!DOCTYPE HTML><html lang='en'><frameset col='100%' row='100%'><frame "
		       "src='/WebPath/html/RunDbViewerImage.html?urn="
		    << this->getApplicationDescriptor()->getLocalId() << "&src=" << src
		    << "'></frameset></html>";
	}
	else if(requestType == "LogReport")
	{
		std::string activeCategory = CgiDataUtilities::getData(cgiIn, "activeCategory");
		__COUT__ << " Start Log Report for " << activeCategory << std::endl;

		out << "<!DOCTYPE HTML><html lang='en'><header><title>ots RunDbViewer "
		       "Reports</title></header><frameset col='100%' row='100%'><frame "
		       "src='/WebPath/html/RunDbViewerReport.html?urn="
		    << this->getApplicationDescriptor()->getLocalId()
		    << "&activeCategory=" << activeCategory << "'></frameset></html>";
	}
	else
		__COUT__ << "requestType request not recognized." << std::endl;
}  //end request()

//==============================================================================
/// getCategories
///		if xmlOut, then output categories to xml
///		if out, then output to stream
void RunDbViewerSupervisor::getCategories(HttpXmlDocument*    xmlOut,
                                          std::ostringstream* out)
{
	// check that category listing doesn't already exist
	HttpXmlDocument expXml;
	if(!expXml.loadXmlDocument((std::string)RUNDBVIEWER_CATEGORY_LIST_PATH))
	{
		__COUT__ << "Fatal Error - Category database." << std::endl;
		__COUT__ << "Creating empty category database." << std::endl;

		expXml.addTextElementToData((std::string)XML_CATEGORY_ROOT);
		expXml.saveXmlDocument((std::string)RUNDBVIEWER_CATEGORY_LIST_PATH);
		return;
	}

	std::vector<std::string> exps;
	expXml.getAllMatchingValues(XML_CATEGORY, exps);

	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_CATEGORY, activeCategory_);

	for(unsigned int i = 0; i < exps.size(); ++i)  // loop categories
	{
		if(xmlOut)
			xmlOut->addTextElementToData(XML_CATEGORY, exps[i]);
		if(out)
			*out << exps[i] << std::endl;
	}
}  //end getCategories()

//==============================================================================
///	refreshRunDbViewer
///		returns all the rundbviewer data for active category from starting date and back in
/// time for 			duration total number of days.
///		e.g. date = today, and duration = 1 returns rundbviewer for today from active
/// category 		The entries are returns from oldest to newest
void RunDbViewerSupervisor::refreshRunDbViewer(time_t              date,
                                               uint32_t            duration,
                                               HttpXmlDocument*    xmlOut,
                                               std::ostringstream* out,
                                               std::string         category,
                                               const std::string&  pluginName,
                                               const std::string&  runInfoUID)
{
	if(category == "")
		category = activeCategory_;  // default to active category
	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_CATEGORY, category);  // for success

	char dayIndexStr[20];

	if(xmlOut)
		xmlOut->addTextElementToData(XML_STATUS, "1");  // for success
	if(out)
		*out << __COUT_HDR_FL__ << "Today: " << date << std::endl;

	if(date == 0)
		date = time(NULL);
	unsigned int endTime   = date;
	unsigned int startTime = endTime - (60 * 60 * 24) * duration;
	__COUT__ << "Start time " << startTime << " End time " << endTime << __E__;

	sprintf(dayIndexStr, "%lu", date * 0);
	if(xmlOut)
		xmlOut->addTextElementToData(XML_MOST_RECENT_DAY,
		                             dayIndexStr);  // send most recent day index

	std::unique_ptr<RunInfoVInterface> runInfoInterface = nullptr;
	try
	{
		runInfoInterface.reset(makeRunInfo(pluginName, runInfoUID));
	}
	catch(...)
	{
		;
	}

	if(runInfoInterface == nullptr)
	{
		__SS__ << "runInfo Db interface plugin construction failed of " << pluginName
		       << __E__;
		__SS_THROW__;
	}

	std::vector<std::vector<std::string>> runRecords =
	    runInfoInterface->getRunRecords(startTime, endTime, "");

	if(xmlOut)
	{
		int i = 0;
		for(auto runData : runRecords)
		{
			auto entryEl =
			    xmlOut->addTextElementToData(XML_RUNDBVIEWER_ENTRY, runData[0]);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_NUMBER, runData[0], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_TIME, runData[1], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_TYPE, runData[2], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_ARTDAQ_PARTITION, runData[3], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_HOST_NAME, runData[4], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_CONDIOTION_ID, runData[5], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_NAME, runData[6], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_VERSION, runData[7], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_NAME, runData[8], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_VERSION, runData[9], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_ONLINE_SOFTWARE_VERSION, runData[10], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_SHIFTER_NOTE, runData[11], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_START_TIME, runData[12], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_STOP_TIME, runData[13], entryEl);
			__COUT__ << "xmlOut getMatchingValue "
			         << xmlOut->getMatchingValue(XML_RUNDBVIEWER_ENTRY, i) << __E__;
			i++;
		}
	}
}  //end refreshRunDbViewer()

//==============================================================================
///	getRunConditionByID
///		returns run conditions by condition_ID
void RunDbViewerSupervisor::getRunConditionByID(uint64_t           condition_ID,
                                                HttpXmlDocument*   xmlOut,
                                                const std::string& pluginName,
                                                const std::string& runInfoUID)
{
	std::unique_ptr<RunInfoVInterface> runInfoInterface = nullptr;
	try
	{
		runInfoInterface.reset(makeRunInfo(pluginName, runInfoUID));
	}
	catch(...)
	{
		;
	}

	if(runInfoInterface == nullptr)
	{
		__SS__ << "runInfo Db interface plugin construction failed of " << pluginName
		       << __E__;
		__SS_THROW__;
	}

	if(xmlOut)
	{
		xmlOut->addTextElementToData("condition_id", std::to_string(condition_ID));

		std::vector<std::vector<std::string>> conditionRecords =
		    runInfoInterface->getRunConditionByID(condition_ID);
		int i = 0;
		for(auto conditionRecord : conditionRecords)
		{
			xmlOut->addTextElementToData("blob", conditionRecord[0]);
			xmlOut->addTextElementToData("commit_time", conditionRecord[1]);
			i++;
		}

		__COUT__ << "getRunConditionByID - records = " << i << __E__;
	}
}  //end getRunConditionByID()
