#include "otsdaq-utilities/RunDbViewer/RunDbViewerSupervisor.h"

#include "otsdaq/FiniteStateMachine/MakeRunInfo.h"        // for Run Info plugin macro
#include "otsdaq/FiniteStateMachine/RunInfoVInterface.h"  // for Run Info plugins

using namespace ots;

#define XML_ADMIN_STATUS "rundbviewer_admin_status"
#define XML_STATUS "rundbviewer_status"
#define XML_MOST_RECENT_DAY "most_recent_day"
#define XML_RUNTYPE_LIST "run_type_list"
#define XML_ACTIVE_RUNTYPE "active_runtype"

#define XML_RUNDBVIEWER_ENTRY "rundbviewer_entry"
#define XML_RUNDBVIEWER_ENTRY_RUN_NUMBER "rundbviewer_entry_run_number"
#define XML_RUNDBVIEWER_ENTRY_RUN_TIME "rundbviewer_entry_run_time"
#define XML_RUNDBVIEWER_ENTRY_RUN_TYPE "rundbviewer_entry_run_type"
#define XML_RUNDBVIEWER_ENTRY_RUN_ARTDAQ_PARTITION \
	"rundbviewer_entry_run_artdaq_partition"
#define XML_RUNDBVIEWER_ENTRY_RUN_HOST_NAME "host_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONDIOTION_ID "condition_id"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_NAME "configuration_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_VERSION "configuration_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_NAME "context_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_VERSION "context_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_ONLINE_SOFTWARE_VERSION "online_software_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_SHIFTER_NOTE "shifter_note"
#define XML_RUNDBVIEWER_ENTRY_RUN_START_TIME "start_time"
#define XML_RUNDBVIEWER_ENTRY_RUN_STOP_TIME "stop_time"
#define XML_RUNDBVIEWER_ENTRY_SUBSYSTEM_CONFIG_RECORD "subsystem_config_record"

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
	//	getRunTypeList
	//	RefreshRunDbViewer

	// to report to RunDbViewer admin status use
	// xmlOut.addTextElementToData(XML_ADMIN_STATUS,tempStr);

	if(requestType == "GetRunTypeList")
	{
		getRunTypeList(&xmlOut);
	}
	else if(requestType == "RefreshRunDbViewer")
	{
		// returns RunDbViewer for currently active category based on date and duration
		// parameters

		std::string Date     = CgiDataUtilities::postData(cgiIn, "Date");
		uint32_t    Duration = CgiDataUtilities::postDataAsInt(cgiIn, "Duration");

		time_t date;
		sscanf(Date.c_str(), "%li", &date);  // scan for unsigned long

		__COUT__ << "User name " << userInfo.username_ << " date " << date << " duration "
		         << Duration << std::endl;

		std::stringstream str;
		std::string       runType = StringMacros::decodeURIComponent(
            CgiDataUtilities::postData(cgiIn, "runTypeFilter"));
		std::string pluginName = CgiDataUtilities::postData(cgiIn, "runInfoPluginName");
		std::string runInfoUID = CgiDataUtilities::postData(cgiIn, "runInfoPluginUID");
		refreshRunDbViewer(date,
		                   Duration,
		                   &xmlOut,
		                   (std::ostringstream*)&str,
		                   runType,
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
	else
		__COUT__ << "requestType request not recognized." << std::endl;
}  //end request()

//==============================================================================
/// getRunTypeList
///		if xmlOut, then output categories to xml
///		if out, then output to stream
void RunDbViewerSupervisor::getRunTypeList(HttpXmlDocument*    xmlOut,
                                           std::ostringstream* out)
{
	std::vector<std::string> exps;

	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_RUNTYPE, activeRunType_);

	for(unsigned int i = 0; i < exps.size(); ++i)  // loop categories
	{
		if(xmlOut)
			xmlOut->addTextElementToData(XML_RUNTYPE_LIST, exps[i]);
		if(out)
			*out << exps[i] << std::endl;
	}
}  //end getRunTypeList()

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
                                               std::string         runType,
                                               const std::string&  pluginName,
                                               const std::string&  runInfoUID)
{
	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_RUNTYPE, runType);  // for success

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
	__COUT__ << "Today: " << date << __E__;

	sprintf(dayIndexStr, "%lu", date * 0);
	if(xmlOut)
		xmlOut->addTextElementToData(XML_MOST_RECENT_DAY,
		                             dayIndexStr);  // send most recent day index

	std::unique_ptr<RunInfoVInterface> runInfoInterface = nullptr;


	auto runInfo = makeRunInfo(pluginName, runInfoUID);

	if(runInfo == nullptr)
	{
		__SS__ << "runInfo Db interface plugin construction failed of " << pluginName
		       << __E__;
		__SS_THROW__;
	}

	try
	{
		runInfoInterface.reset(runInfo);
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

	std::string filter = "AND run_type.run_type_description like '%" + runType + "%'";
	std::vector<std::vector<std::string>> runRecords =
	    runInfoInterface->getRunRecords(startTime, endTime, filter);
	std::vector<std::vector<std::string>> subsystemConfigRecords;

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
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_NAME, runData[6], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_VERSION, runData[7], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_NAME, runData[8], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_VERSION, runData[9], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_ONLINE_SOFTWARE_VERSION, runData[10], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_SHIFTER_NOTE, runData[6], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_START_TIME, runData[7], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_STOP_TIME, runData[8], entryEl);
			__COUT__ << "xmlOut getMatchingValue "
			         << xmlOut->getMatchingValue(XML_RUNDBVIEWER_ENTRY, i) << __E__;
			i++;


			__COUT__ << "Number of cycles: " << i << __E__;

			try 
			{
				subsystemConfigRecords = runInfoInterface->getRunConfigSubsystemInfo(std::stoul(runData[5]));
			}
			catch(const std::exception& e)
			{
				__COUT__ << "Error getting subsytem configuration info" << __E__;
				__COUT__ << e.what() << __E__; 
			}

			std::string rows;
			for(auto subsystemConfRecord : subsystemConfigRecords)
			{
				rows.append("<config_record config_record_id= " + subsystemConfRecord[0] + ">");
				rows.append("<config_id>" + subsystemConfRecord[0] + "</config_id>");
				rows.append("<subsystem_id>" + subsystemConfRecord[1] + "</subsystem_id>");
				rows.append("<subsystem_config_data>" + subsystemConfRecord[2] + "</subsystem_config_data>");
				rows.append("<config_alias>" + subsystemConfRecord[3] + "</config_alias>");
				rows.append("<context_name>" + subsystemConfRecord[4] + "</context_name>");
				rows.append("<context_key>" + subsystemConfRecord[5] + "</context_key>");
				rows.append("<context_group_name>" + subsystemConfRecord[6] + "</context_group_name>");
				rows.append("<config_group_key>" + subsystemConfRecord[7] + "</config_group_key>");
				rows.append("<backbone_name>" + subsystemConfRecord[8] + "</backbone_name>");
				rows.append("<backbone_name>" + subsystemConfRecord[9] + "</backbone_name>");
				rows.append("<config_db_uri>" + subsystemConfRecord[10] + "</config_db_uri>");
				rows.append("<subsystem_sw_version_id>" + subsystemConfRecord[11] + "</subsystem_sw_version_id>");
				rows.append("<create_time>" + subsystemConfRecord[12] + "</create_time>");
				rows.append("</config_record>");
			}
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_SUBSYSTEM_CONFIG_RECORD, rows, entryEl);
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
