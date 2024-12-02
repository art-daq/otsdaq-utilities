#include "otsdaq-utilities/ECLWriter/ECLSupervisor.h"
#include "otsdaq/CgiDataUtilities/CgiDataUtilities.h"
#include "otsdaq/ConfigurationInterface/ConfigurationManager.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"
#include "otsdaq/SOAPUtilities/SOAPCommand.h"
#include "otsdaq/SOAPUtilities/SOAPParameters.h"
#include "otsdaq/SOAPUtilities/SOAPUtilities.h"
#include "otsdaq/TablePlugins/XDAQContextTable/XDAQContextTable.h"
#include "otsdaq/XmlUtilities/HttpXmlDocument.h"

#include "otsdaq-utilities/ECLWriter/ECLConnection.h"

#include <dirent.h>   /*DIR and dirent*/
#include <sys/stat.h> /*mkdir*/

#include <xdaq/NamespaceURI.h>

#include <iomanip>
#include <iostream>
#include "otsdaq/TableCore/TableGroupKey.h"

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "ECL"



#define XML_ADMIN_STATUS "logbook_admin_status"
#define XML_STATUS "logbook_status"
#define XML_MOST_RECENT_DAY "most_recent_day"
#define XML_EXPERIMENTS_ROOT "experiments"
#define XML_EXPERIMENT "experiment"
#define XML_ACTIVE_EXPERIMENT "active_experiment"
#define XML_EXPERIMENT_CREATE "create_time"
#define XML_EXPERIMENT_CREATOR "creator"

#define XML_LOGBOOK_ENTRY "logbook_entry"
#define XML_LOGBOOK_ENTRY_SUBJECT "logbook_entry_subject"
#define XML_LOGBOOK_ENTRY_TEXT "logbook_entry_text"
#define XML_LOGBOOK_ENTRY_FILE "logbook_entry_file"
#define XML_LOGBOOK_ENTRY_TIME "logbook_entry_time"
#define XML_LOGBOOK_ENTRY_CREATOR "logbook_entry_creator"
#define XML_LOGBOOK_ENTRY_HIDDEN "logbook_entry_hidden"
#define XML_LOGBOOK_ENTRY_HIDER "logbook_entry_hider"
#define XML_LOGBOOK_ENTRY_HIDDEN_TIME "logbook_entry_hidden_time"


XDAQ_INSTANTIATOR_IMPL(ECLSupervisor)

//==============================================================================
ECLSupervisor::ECLSupervisor(xdaq::ApplicationStub* stub) : CoreSupervisorBase(stub)
{
	__SUP_COUT__ << "Constructor." << __E__;

	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	xoap::bind(
	    this, &ECLSupervisor::MakeSystemLogEntry, "MakeSystemLogEntry", XDAQ_NS_URI);

	init();

	__SUP_COUT__ << "Constructed." << __E__;
}  // end constructor

//==============================================================================
void ECLSupervisor::init(void)
try
{
	// do not put username/pw in saved/committed text files
	ECLUser_     = __ENV__("ECL_USER_NAME");
	ECLHost_     = __ENV__("ECL_URL");  // e.g. https://dbweb6.fnal.gov:8443/ECL/test_beam
	ECLPwd_      = __ENV__("ECL_PASSWORD");
	ECLCategory_ = __ENV__("ECL_CATEGORY");
	ExperimentName_ = __ENV__("OTS_OWNER") + std::string(" ots");
	
}  // end init()
catch(const std::runtime_error& e)
{
	__COUT_ERR__ << "ECL environment variables not setup: " << e.what() << __E__;
	ECLUser_ = ""; //clearing to disable
}

//==============================================================================
ECLSupervisor::~ECLSupervisor(void) { destroy(); }

//==============================================================================
void ECLSupervisor::destroy(void)
{
	// // called by destructor
	// delete theConfigurationManager_;

	__SUP_COUT__ << "Destructed." << __E__;
}  // end destroy()

//==============================================================================
void ECLSupervisor::defaultPage(xgi::Input* /*in*/, xgi::Output* out)
{
	__COUT__ << " active experiment " << ECLCategory_ << std::endl;
	*out << "<!DOCTYPE HTML><html lang='en'><head><title>ots</title>" << ECLSupervisor::getIconHeaderString() <<
	    // end show ots icon
	    "</head>"
		<< "<frameset col='100%' row='100%'><frame "
	        "src='/WebPath/html/Logbook.html?urn="
	     << this->getApplicationDescriptor()->getLocalId()
	     << "&active_experiment=" << ECLCategory_ << "'></frameset></html>";
} //end defaultPage()

//==============================================================================
std::string ECLSupervisor::getIconHeaderString(void)
{
	// show ots icon
	//	from http://www.favicon-generator.org/
	return "<link rel='apple-touch-icon' sizes='57x57' href='/WebPath/images/otsdaqIcons/apple-icon-57x57.png'>\
	<link rel='apple-touch-icon' sizes='60x60' href='/WebPath/images/otsdaqIcons/apple-icon-60x60.png'>\
	<link rel='apple-touch-icon' sizes='72x72' href='/WebPath/images/otsdaqIcons/apple-icon-72x72.png'>\
	<link rel='apple-touch-icon' sizes='76x76' href='/WebPath/images/otsdaqIcons/apple-icon-76x76.png'>\
	<link rel='apple-touch-icon' sizes='114x114' href='/WebPath/images/otsdaqIcons/apple-icon-114x114.png'>\
	<link rel='apple-touch-icon' sizes='120x120' href='/WebPath/images/otsdaqIcons/apple-icon-120x120.png'>\
	<link rel='apple-touch-icon' sizes='144x144' href='/WebPath/images/otsdaqIcons/apple-icon-144x144.png'>\
	<link rel='apple-touch-icon' sizes='152x152' href='/WebPath/images/otsdaqIcons/apple-icon-152x152.png'>\
	<link rel='apple-touch-icon' sizes='180x180' href='/WebPath/images/otsdaqIcons/apple-icon-180x180.png'>\
	<link rel='icon' type='image/png' sizes='192x192'  href='/WebPath/images/otsdaqIcons/android-icon-192x192.png'>\
	<link rel='icon' type='image/png' sizes='144x144'  href='/WebPath/images/otsdaqIcons/android-icon-144x144.png'>\
	<link rel='icon' type='image/png' sizes='48x48'  href='/WebPath/images/otsdaqIcons/android-icon-48x48.png'>\
	<link rel='icon' type='image/png' sizes='72x72'  href='/WebPath/images/otsdaqIcons/android-icon-72x72.png'>\
	<link rel='icon' type='image/png' sizes='32x32' href='/WebPath/images/otsdaqIcons/favicon-32x32.png'>\
	<link rel='icon' type='image/png' sizes='96x96' href='/WebPath/images/otsdaqIcons/favicon-96x96.png'>\
	<link rel='icon' type='image/png' sizes='16x16' href='/WebPath/images/otsdaqIcons/favicon-16x16.png'>\
	<link rel='manifest' href='/WebPath/images/otsdaqIcons/manifest.json'>\
	<meta name='msapplication-TileColor' content='#ffffff'>\
	<meta name='msapplication-TileImage' content='/WebPath/images/otsdaqIcons/ms-icon-144x144.png'>\
	<meta name='theme-color' content='#ffffff'>";

}  // end getIconHeaderString()

//==============================================================================
// setSupervisorPropertyDefaults
//		override to set defaults for supervisor property values (before user settings
// override)
void ECLSupervisor::setSupervisorPropertyDefaults()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.UserPermissionsThreshold,
	    std::string() +
	        "*=1 | CreateExperiment=-1 | RemoveExperiment=-1 | GetExperimentListAdmin=-1 "
	        "| SetActiveExperiment=-1" +
	        " | AdminRemoveRestoreEntry=-1");
} //end setSupervisorPropertyDefaults()

//==============================================================================
// forceSupervisorPropertyValues
//		override to force supervisor property values (and ignore user settings)
void ECLSupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes,
	    "RefreshLogbook");
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.NonXMLRequestTypes,
	    "LogImage | LogReport");
		CorePropertySupervisorBase::setSupervisorProperty(CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.RequireUserLockRequestTypes,
				"CreateExperiment | RemoveExperiment | PreviewEntry | AdminRemoveRestoreEntry");
} //end forceSupervisorPropertyValues()

//==============================================================================
//	request
//		Handles Web Interface requests to Logbook supervisor.
//		Does not refresh cookie for automatic update checks.
void ECLSupervisor::request(const std::string&               requestType,
                                cgicc::Cgicc&                    cgiIn,
                                HttpXmlDocument&                 xmlOut,
                                const WebUsers::RequestUserInfo& userInfo)
{
	// Commands - Note: treat 'Experiment' as ECL Category
	//	N/A CreateExperiment
	//	N/A RemoveExperiment
	//	GetExperimentList
	//	SetActiveExperiment
	//	RefreshLogbook
	//	PreviewEntry
	//	ApproveEntry
	//	N/A AdminRemoveRestoreEntry

	
	// to report to logbook admin status use
	// xmlOut.addTextElementToData(XML_ADMIN_STATUS,tempStr);

	if(0 && requestType == "CreateExperiment")
	{
		// check that experiment directory does not exist, and it is not in xml list
		// create experiment (TODO - could set env variable ECLConnection/$ECL_CATEGORY)
		// 

		// get creator name
		std::string creator = userInfo.username_;

		// createExperiment(
		//     CgiDataUtilities::postData(cgiIn, "Experiment"), creator, &xmlOut);

		__COUT__ << "Created" << std::endl;
	}
	else if(0 && requestType == "RemoveExperiment")
	{
		// remove from xml list, but do not remove directory (requires manual delete so
		// mistakes aren't made)
		//(TODO - could unset env variable ECLConnection/$ECL_CATEGORY)

		// get remover name
		std::string remover = userInfo.username_;
		// removeExperiment(
		//     CgiDataUtilities::postData(cgiIn, "Experiment"), remover, &xmlOut);
	}
	else if(requestType == "GetExperimentList")
	{
		//allow all users to ECL categories:
		if(0 && userInfo.permissionLevel_ >=
		   CoreSupervisorBase::getSupervisorPropertyUserPermissionsThreshold(
		       "GetExperimentListAdmin"))
		{
			xmlOut.addTextElementToData("is_admin", "0");  // indicate not an admin
			return;
		}
		// else

		xmlOut.addTextElementToData("is_admin", "1");  // indicate not an admin
		getExperiments(&xmlOut);
	}
	else if(requestType == "SetActiveExperiment")
	{
		// check that experiment exists
		// set active experiment

		//		if(userPermissions < ADMIN_PERMISSIONS_THRESHOLD)
		//		{
		//			xmlOut.addTextElementToData(XML_ADMIN_STATUS,"Error - Insufficient
		// permissions."); 			goto CLEANUP;
		//		}

		webUserSetActiveExperiment(CgiDataUtilities::postData(cgiIn, "Experiment"),
		                           &xmlOut);
	}
	else if(requestType == "RefreshLogbook")
	{
		// returns logbook for currently active experiment based on date and duration
		// parameters

		std::string Date     = CgiDataUtilities::postData(cgiIn, "Date");
		std::string Duration = CgiDataUtilities::postData(cgiIn, "Duration");

		time_t        date;
		unsigned char duration;
		sscanf(Date.c_str(), "%li", &date);           // scan for unsigned long
		sscanf(Duration.c_str(), "%hhu", &duration);  // scan for unsigned char

		__COUT__ << "date " << date << " duration " << (int)duration << std::endl;
		std::stringstream str;
		refreshLogbook(date, duration, &xmlOut, (std::ostringstream*)&str);
		__COUT__ << str.str() << std::endl;
	}
	// else if(requestType == "PreviewEntry")
	// {
	// 	// cleanup temporary folder
	// 	// NOTE: all input parameters for PreviewEntry will be attached to form
	// 	//	so use cgiIn(xxx) to get values.
	// 	// increment number for each temporary preview, previewPostTempIndex_
	// 	// save entry and uploads to previewPath / previewPostTempIndex_ /.

	// 	cleanUpPreviews();
	// 	std::string EntryText = cgiIn("EntryText");
	// 	__COUT__ << "EntryText " << EntryText << std::endl << std::endl;
	// 	std::string EntrySubject = cgiIn("EntrySubject");
	// 	__COUT__ << "EntrySubject " << EntrySubject << std::endl << std::endl;

	// 	// get creator name
	// 	std::string creator = userInfo.username_;

	// 	savePostPreview(EntrySubject, EntryText, cgiIn.getFiles(), creator, &xmlOut);
	// 	// else xmlOut.addTextElementToData(XML_STATUS,"Failed - could not get username
	// 	// info.");
	// }
	// else if(requestType == "ApproveEntry")
	// {
	// 	// If Approve = "1", then previewed Log entry specified by PreviewNumber
	// 	//  is moved to logbook
	// 	// Else the specified Log entry is deleted.
	// 	std::string PreviewNumber = CgiDataUtilities::postData(cgiIn, "PreviewNumber");
	// 	std::string Approve       = CgiDataUtilities::postData(cgiIn, "Approve");

	// 	movePreviewEntry(PreviewNumber, Approve == "1", &xmlOut);
	// }
	// else if(requestType == "AdminRemoveRestoreEntry")
	// {
	// 	//		if(userPermissions < ADMIN_PERMISSIONS_THRESHOLD)
	// 	//		{
	// 	//			xmlOut.addTextElementToData(XML_ADMIN_STATUS,"Error - Insufficient
	// 	// permissions."); 			goto CLEANUP;
	// 	//		}

	// 	std::string EntryId = CgiDataUtilities::postData(cgiIn, "EntryId");
	// 	bool Hide = CgiDataUtilities::postData(cgiIn, "Hide") == "1" ? true : false;

	// 	// get creator name
	// 	std::string hider = userInfo.username_;

	// 	hideLogbookEntry(EntryId, Hide, hider);

	// 	xmlOut.addTextElementToData(XML_ADMIN_STATUS, "1");  // success
	// }
	else
		__COUT__ << "requestType request not recognized." << std::endl;
} //end request()

//==============================================================================
// getExperiments
//		if xmlOut, then output experiments to xml
//		if out, then output to stream
void ECLSupervisor::getExperiments(HttpXmlDocument* xmlOut, std::ostringstream* out)
{
	if(ECLUser_ == "" || ECLHost_ == "") //ignore ECL when environment variables are not set
	{
		__SS__ << "No ECL user/host specified for logbook access." << __E__;
		__SS_THROW__;
	}

	std::string response, url = "/A/xml_category_list";
	ECLConnection eclConn(ECLUser_, ECLPwd_, ECLHost_);
	eclConn.Get(url,response);
	__COUTV__(response);

	std::vector<std::string> exps;
	std::string name;
	size_t after = 0;
	while((name = StringMacros::extractXmlField(response, "category", 0, after, &after, "path")) != "")
	{
		__COUTTV__(name);		
		exps.push_back(name);
	}
	
	// // check that experiment listing doesn't already exist
	// HttpXmlDocument expXml;
	// if(!expXml.loadXmlDocument((std::string)LOGBOOK_EXPERIMENT_LIST_PATH))
	// {
	// 	__COUT__ << "Fatal Error - Experiment database." << std::endl;
	// 	__COUT__ << "Creating empty experiment database." << std::endl;

	// 	expXml.addTextElementToData((std::string)XML_EXPERIMENTS_ROOT);
	// 	expXml.saveXmlDocument((std::string)LOGBOOK_EXPERIMENT_LIST_PATH);
	// 	return;
	// }

	// expXml.getAllMatchingValues(XML_EXPERIMENT, exps);

	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_EXPERIMENT, ECLCategory_);

	for(unsigned int i = 0; i < exps.size(); ++i)  // loop experiments
	{
		if(xmlOut)
			xmlOut->addTextElementToData(XML_EXPERIMENT, exps[i]);
		if(out)
			*out << exps[i] << std::endl;
	}
} //end getExperiments()

//==============================================================================
// webUserSetActiveExperiment
//		if experiment exists, set as active
//		to clear active experiment set to ""
void ECLSupervisor::webUserSetActiveExperiment(std::string      experiment,
                                                   HttpXmlDocument* xmlOut)
{
	// no check, just set
	ECLCategory_ = experiment;
	if(xmlOut)
		xmlOut->addTextElementToData(
		    XML_ADMIN_STATUS,
		    "Active category set to " + experiment + " successfully.");
} //end webUserSetActiveExperiment()

//==============================================================================
//	refreshLogbook
//		returns all the logbook data for active experiment from starting date and back in
// time for 			duration total number of days.
//		e.g. date = today, and duration = 1 returns logbook for today from active
// experiment 		The entries are returns from oldest to newest
void ECLSupervisor::refreshLogbook(time_t              date,
                                       unsigned char       duration,
                                       HttpXmlDocument*    xmlOut,
                                       std::ostringstream* out,
                                       std::string         experiment)
{
	if(ECLUser_ == "" || ECLHost_ == "") //ignore ECL when environment variables are not set
	{
		__SS__ << "No ECL user/host specified for logbook access." << __E__;
		__SS_THROW__;
	}

	if(experiment == "")
		experiment = ECLCategory_;  // default to active experiment
	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_EXPERIMENT, experiment);  // for success

	unsigned int baseDay;

	if(!date)  // if date is 0 take most recent day and update it
		baseDay = (time(0) / (60 * 60 * 24));
	else
		baseDay = (date / (60 * 60 * 24));
	
	__COUTTV__(baseDay);
	__COUTTV__(duration);
	__COUTTV__(experiment);

	
	//add all posts that match
	{
		std::string response, url = "/E/xml_search?l=100&c=" + 
			StringMacros::encodeURIComponent(experiment); //limit to 100 
		ECLConnection eclConn(ECLUser_, ECLPwd_, ECLHost_);
		eclConn.Get(url,response);
		__COUTV__(response);
	} //end add all posts that match

	if(xmlOut)
		xmlOut->addTextElementToData(XML_STATUS, "1");  // for success
	if(out)
		*out << __COUT_HDR_FL__ << "Today: " << time(0) / (60 * 60 * 24) << std::endl;

	char        dayIndexStr[20];
	sprintf(dayIndexStr, "%lu", time(0) / (60 * 60 * 24));
	if(xmlOut)
		xmlOut->addTextElementToData(XML_MOST_RECENT_DAY,
		                             dayIndexStr);  // send most recent day index
} //end refreshLogbook()

//==============================================================================
// xoap::MakeSystemLogEntry
//	make a system logbook entry into active experiment's logbook from Supervisor only
//	TODO: (how to enforce?)
xoap::MessageReference ECLSupervisor::MakeSystemLogEntry(xoap::MessageReference msg)
{
	SOAPParameters parameters("EntryText");
	parameters.addParameter("SubjectText");
	SOAPUtilities::receive(msg, parameters);
	std::string EntryText =
	    StringMacros::decodeURIComponent(parameters.getValue("EntryText"));
	std::string SubjectText =
	    StringMacros::decodeURIComponent(parameters.getValue("SubjectText"));

	__COUT__ << "Received External Supervisor System Entry " << EntryText << std::endl;
	__COUTV__(SubjectText);

	std::string retStr = "Success";

	if(ECLUser_ == "" || ECLHost_ == "") //ignore ECL when environment variables are not set
	{
		__COUT_INFO__ << "No ECL user/host specified for log entry: " << EntryText << __E__;

		// fill return parameters
		SOAPParameters retParameters("Status", retStr);

		return SOAPUtilities::makeSOAPMessageReference("SystemLogEntryStatusResponse",
													retParameters);
	}

	ECLEntry_t eclEntry;
	eclEntry.author(StringMacros::escapeString(ECLUser_));
	eclEntry.category(StringMacros::escapeString(ECLCategory_));
	eclEntry.subject(StringMacros::escapeString(SubjectText));

	Form_t                 form;
	Field_t                field;
	Form_t::field_sequence fields;
	std::string            users = theRemoteWebUsers_.getActiveUserList();

	form.name("default");  // these form names must be created in advance? ... default
	                       // seems to have one field and be generic: 'text' field

	{
		std::stringstream ss;
		ss << "Message: " << __E__ << EntryText << __E__ << __E__;
		ss << "This was a System Generated Log Entry from '" << ExperimentName_ << "'" << __E__;
		ss << "Active ots users: " << users << __E__;
		field = Field_t(StringMacros::escapeString(ss.str(), true /* keep white space */),
		                "text");
		fields.push_back(field);
	}

	// field = Field_t(EscapeECLString(ExperimentName_), "Experiment");
	// fields.push_back(field);

	// field = Field_t(EscapeECLString(users), "ActiveUsers");
	// fields.push_back(field);

	// field = Field_t(EscapeECLString(EntryText), "Entry");
	// fields.push_back(field);

	form.field(fields);
	eclEntry.form(form);
	try
	{
		ECLConnection eclConn(ECLUser_, ECLPwd_, ECLHost_);
		if(!eclConn.Post(eclEntry))
			retStr = "Failure";
	}
	catch(const std::runtime_error& e)
	{
		__SS__ << "Exception caught during Logbook ECL connection: " << e.what();
		__COUT_ERR__ << ss.str();
		retStr = ss.str();
	}	
	
	// fill return parameters
	SOAPParameters retParameters("Status", retStr);

	return SOAPUtilities::makeSOAPMessageReference("SystemLogEntryStatusResponse",
	                                               retParameters);
}  // end MakeSystemLogEntry()
