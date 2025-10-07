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
#define XML_TIMEZONE_OFFSET "timezone_offset_hours"
#define XML_CATEGORY_ROOT "categories"
#define XML_CATEGORY "category"
#define XML_ACTIVE_CATEGORY "active_category"
#define XML_SAFE_URL "ecl_url"
#define XML_RESPONSE_CATEGORY "response_category"
#define XML_CATEGORY_CREATE "create_time"
#define XML_CATEGORY_CREATOR "creator"

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
	CategoryName_ = __ENV__("OTS_OWNER") + std::string(" ots");

	// Determine the timezone offset from UTC time in hours
	// Get the current time
	std::chrono::system_clock::time_point now = std::chrono::system_clock::now();

	// Get the current time in UTC
	std::chrono::zoned_time<std::chrono::system_clock::duration> utcTime{"UTC", now};

	// Get the current local time using the current system's timezone
	std::chrono::zoned_time<std::chrono::system_clock::duration> localTime{
	    std::chrono::current_zone(), now};

	// Calculate the difference between local time and UTC
	std::chrono::seconds offset = std::chrono::duration_cast<std::chrono::seconds>(
	    localTime.get_local_time() - utcTime.get_local_time());

	// Convert the offset to hours and minutes
	timezoneHourOffset_ = offset.count() / 3600;

	__SUP_COUTV__(timezoneHourOffset_);

	eclConn_ = std::make_unique<ECLConnection>(ECLUser_, ECLPwd_, ECLHost_);

}  // end init()
catch(const std::runtime_error& e)
{
	__COUT_ERR__ << "ECL environment variables not setup: " << e.what() << __E__;
	ECLUser_ = "";  //clearing to disable
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
	__COUT__ << " active category " << ECLCategory_ << std::endl;
	*out << "<!DOCTYPE HTML><html lang='en'><head><title>ots</title>"
	     << ECLSupervisor::getIconHeaderString() <<
	    // end show ots icon
	    "</head>"
	     << "<frameset col='100%' row='100%'><frame "
	        "src='/WebPath/html/Logbook.html?urn="
	     << this->getApplicationDescriptor()->getLocalId()
	     << "&active_category=" << ECLCategory_ << "'></frameset></html>";
}  //end defaultPage()

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
/// setSupervisorPropertyDefaults
///		override to set defaults for supervisor property values (before user settings
/// override)
void ECLSupervisor::setSupervisorPropertyDefaults()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.UserPermissionsThreshold,
	    std::string() +
	        "*=1 | CreateCategory=-1 | RemoveCategory=-1 | GetCategoryListAdmin=-1 "
	        "| SetActiveCategory=-1" +
	        " | AdminRemoveRestoreEntry=-1");

	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AllowNoLoginRequestTypes,
	    "RefreshLogbook | GetCategoryList");

}  //end setSupervisorPropertyDefaults()

//==============================================================================
/// forceSupervisorPropertyValues
///		override to force supervisor property values (and ignore user settings)
void ECLSupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::addSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes,
	    "RefreshLogbook");
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.NonXMLRequestTypes,
	    "LogImage | LogReport");
	CorePropertySupervisorBase::addSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.RequireUserLockRequestTypes,
	    "CreateCategory | RemoveCategory | PreviewEntry | AdminRemoveRestoreEntry");
}  //end forceSupervisorPropertyValues()

//==============================================================================
///	request
///		Handles Web Interface requests to Logbook supervisor.
///		Does not refresh cookie for automatic update checks.
void ECLSupervisor::request(const std::string&               requestType,
                            cgicc::Cgicc&                    cgiIn,
                            HttpXmlDocument&                 xmlOut,
                            const WebUsers::RequestUserInfo& userInfo)
{
	__COUTTV__(requestType);

	// Commands - Note: treat 'Category' as ECL Category
	//	N/A CreateCategory
	//	N/A RemoveCategory
	//	GetCategoryList
	//	SetActiveCategory
	//	RefreshLogbook
	//	PreviewEntry
	//	ApproveEntry
	//	N/A AdminRemoveRestoreEntry

	// to report to logbook admin status use
	// xmlOut.addTextElementToData(XML_ADMIN_STATUS,tempStr);

	if(0 && requestType == "CreateCategory")
	{
		// check that category directory does not exist, and it is not in xml list
		// create category (TODO - could set env variable ECLConnection/$ECL_CATEGORY)
		//

		// get creator name
		std::string creator = userInfo.username_;

		// createCategory(
		//     CgiDataUtilities::postData(cgiIn, "Category"), creator, &xmlOut);

		__COUT__ << "Created" << std::endl;
	}
	else if(0 && requestType == "RemoveCategory")
	{
		// remove from xml list, but do not remove directory (requires manual delete so
		// mistakes aren't made)
		//(TODO - could unset env variable ECLConnection/$ECL_CATEGORY)

		// get remover name
		std::string remover = userInfo.username_;
		// removeCategory(
		//     CgiDataUtilities::postData(cgiIn, "Category"), remover, &xmlOut);
	}
	else if(requestType == "GetCategoryList")
	{
		//allow all users to ECL categories, but tell GUI not admin since have no access to managing ECL posts directly
		xmlOut.addTextElementToData("is_admin", "0");  // indicate not an admin
		getCategories(&xmlOut);
	}
	else if(requestType == "SetActiveCategory")
	{
		// check that category exists
		// set active category

		//		if(userPermissions < ADMIN_PERMISSIONS_THRESHOLD)
		//		{
		//			xmlOut.addTextElementToData(XML_ADMIN_STATUS,"Error - Insufficient
		// permissions."); 			goto CLEANUP;
		//		}

		webUserSetActiveCategory(CgiDataUtilities::postData(cgiIn, "Category"), &xmlOut);
	}
	else if(requestType == "RefreshLogbook")
	{
		// returns logbook for currently active category based on date and duration
		// parameters

		std::string Date           = CgiDataUtilities::postData(cgiIn, "Date");
		uint32_t    Duration       = CgiDataUtilities::postDataAsInt(cgiIn, "Duration");
		std::string CategoryFilter = CgiDataUtilities::postData(cgiIn, "CategoryFilter");

		__COUTV__(CategoryFilter);

		time_t date;
		sscanf(Date.c_str(), "%li", &date);  // scan for unsigned long

		__COUT__ << "date " << date << " duration " << Duration << std::endl;
		std::stringstream str;
		refreshLogbook(date,
		               Duration,
		               &xmlOut,
		               (std::ostringstream*)&str,
		               StringMacros::decodeURIComponent(CategoryFilter));
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
	{
		__SUP_SS__ << "requestType Request, " << requestType
		           << ", not recognized by the ECL Supervisor (was it intended for "
		              "another Supervisor?)."
		           << __E__;
		__SUP_SS_THROW__;
	}
}  //end request()

//==============================================================================
/// getCategories
///		if xmlOut, then output categories to xml
///		if out, then output to stream
void ECLSupervisor::getCategories(HttpXmlDocument* xmlOut, std::ostringstream* out)
{
	if(ECLUser_ == "" ||
	   ECLHost_ == "")  //ignore ECL when environment variables are not set
	{
		__SS__ << "No ECL user/host specified for logbook access." << __E__;
		__SS_THROW__;
	}

	std::string response, url = "/A/xml_category_list";
	eclConn_->Get(url, response);
	__COUTTV__(response);

	std::vector<std::string> exps;
	std::string              name;
	size_t                   after = 0;

	//example response:
	// <?xml version="1.0" encoding="UTF-8"?>
	// <category_list>
	// 		<category path="Accelerator"/>
	// 		<category path="CRV"/>
	// 		<category path="CRV/Vertical Slice Test"/>
	// 		<category path="Calorimeter"/>
	// 		<category path="Cryogenics"/>
	// 		<category path="Cryogenics/Cryogenics Construction"/>
	// 		<category path="Cryogenics/Mu2e Controls"/>
	// 		<category path="Cryogenics/Mu2e ODH System"/>
	// 		<category path="Cryogenics/Mu2e Operations"/>
	// 		<category path="Cryogenics/Mu2e Vacuum"/>
	// 		<category path="Cryogenics/Muon Campus Operations"/>
	// 		<category path="Extinction Monitor"/>
	// 		<category path="Facilities / Building"/>
	// 		<category path="Global Run"/>
	// 		<category path="Leak checking"/>
	// 		<category path="Mu2e team member location"/>
	// 		<category path="Muon beamline"/>
	// 		<category path="Planning"/>
	// 		<category path="Production"/>
	// 		<category path="Production/MDC18"/>
	// 		<category path="Production/su2020"/>
	// 		<category path="Safety"/>
	// 		<category path="Solenoids"/>
	// 		<category path="Stopping Target Monitor"/>
	// 		<category path="TDAQ"/>
	// 		<category path="Tracker"/>
	// 		<category path="Tracker/VST"/>
	// 		<category path="Transfer Lines"/>
	// 		<category path="help"/>
	// 		<category path="test"/>
	// 		<category path="testbeam"/>
	// </category_list>

	while((name = StringMacros::extractXmlField(
	           response, "category", 0, after, &after, "path=", "\"")) != "")
	{
		after +=
		    std::string("category").size();  //move forward to prepare for next search
		__COUTTV__(name);
		exps.push_back(name);
	}

	// // check that category listing doesn't already exist
	// HttpXmlDocument expXml;
	// if(!expXml.loadXmlDocument((std::string)LOGBOOK_CATEGORY_LIST_PATH))
	// {
	// 	__COUT__ << "Fatal Error - Category database." << std::endl;
	// 	__COUT__ << "Creating empty category database." << std::endl;

	// 	expXml.addTextElementToData((std::string)XML_CATEGORY_ROOT);
	// 	expXml.saveXmlDocument((std::string)LOGBOOK_CATEGORY_LIST_PATH);
	// 	return;
	// }

	// expXml.getAllMatchingValues(XML_CATEGORY, exps);

	if(xmlOut)
	{
		xmlOut->addTextElementToData(XML_ACTIVE_CATEGORY, ECLCategory_);
		xmlOut->addTextElementToData(XML_SAFE_URL, eclConn_->getSafeURL());
	}

	for(unsigned int i = 0; i < exps.size(); ++i)  // loop categories
	{
		if(xmlOut)
			xmlOut->addTextElementToData(XML_CATEGORY, exps[i]);
		if(out)
			*out << exps[i] << std::endl;
	}
}  //end getCategories()

//==============================================================================
/// webUserSetActiveCategory
///		if category exists, set as active
///		to clear active category set to ""
void ECLSupervisor::webUserSetActiveCategory(std::string      category,
                                             HttpXmlDocument* xmlOut)
{
	// no check, just set
	ECLCategory_ = category;
	if(xmlOut)
		xmlOut->addTextElementToData(
		    XML_ADMIN_STATUS, "Active category set to " + category + " successfully.");
}  //end webUserSetActiveCategory()

//==============================================================================
///	refreshLogbook
///		returns all the logbook data for active category from starting date and back in
/// time for 			duration total number of days.
///		e.g. date = today, and duration = 1 returns logbook for today from active
/// category 		The entries are returns from oldest to newest
void ECLSupervisor::refreshLogbook(time_t              date,
                                   size_t              duration,
                                   HttpXmlDocument*    xmlOut,
                                   std::ostringstream* out,
                                   std::string         categoryFilter)
{
	if(ECLUser_ == "" ||
	   ECLHost_ == "")  //ignore ECL when environment variables are not set
	{
		__SS__ << "No ECL user/host specified for logbook access." << __E__;
		__SS_THROW__;
	}

	if(categoryFilter == "")
		categoryFilter = ECLCategory_;  // default to active category
	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_CATEGORY, ECLCategory_);  // for success
	if(xmlOut)
		xmlOut->addTextElementToData(XML_RESPONSE_CATEGORY,
		                             categoryFilter);  // for success

	int64_t mostRecentTime = 0;
	time_t  baseTime;

	__COUTTV__(date);
	if(!date)                // if date is 0 take most recent day and update it
		baseTime = time(0);  // / (60 * 60 * 24);
	else
		baseTime = date - timezoneHourOffset_ * 60 * 60 +
		           1;  //date is 12:00a GMT, so could give wrong day in local timezone

	if(0)  //test xml_get
	{
		std::string response, url = "/E/xml_get?e=" + std::string("1843");
		__COUTV__(url);
		eclConn_->Get(url, response);
		__COUTV__(response);
	}
	if(0)  //test xml_search
	{
		std::string response, url = "/E/xml_search?l=5";  //limit to 5
		// url += "&c=Facilities / Building";
		__COUTV__(url);
		eclConn_->Get(url, response);
		__COUTV__(response);
	}
	if(0)  //test xml_search
	{
		std::string response, url = "/E/xml_search?l=5";  //limit to 5
		url +=
		    "&c=" + StringMacros::encodeURIComponent("Facilities / Building");  //category
		__COUTV__(url);
		eclConn_->Get(url, response);
		__COUTV__(response);
	}
	if(0)  //test xml_search
	{
		std::string response, url = "/E/xml_search?l=5";  //limit to 5
		url += "&c=" +
		       StringMacros::encodeURIComponent("Facilities &#46 Building");  //category
		__COUTV__(url);
		eclConn_->Get(url, response);
		__COUTV__(response);
	}

	//add all posts that match date/duration criteria
	{
		__COUTTV__(categoryFilter);
		std::string response, url = "/E/xml_search?";  //l=100"; //limit to 100
		    // "&a=" + std::to_string(duration) + "days" + //after
		    // "&b=" + baseTimeTmBuffer; //before

		bool                     applyCategoryFilter         = false;
		bool                     applyInvertedCategoryFilter = false;
		std::vector<std::string> acceptCategories;
		//filter can start with * for all, or with ! for inverted selection (i.e. all without certain categories)
		if(categoryFilter.size() && categoryFilter[0] != '*' &&
		   categoryFilter[0] != '!' && categoryFilter.find(',') == std::string::npos &&
		   categoryFilter.find(" / ") == std::string::npos)
			url +=
			    "l=100&c=" + StringMacros::encodeURIComponent(categoryFilter);  //category
		else
		{
			if(duration > 14)
				url += "l=1000";  //get more so better chance to find in filter
			else
				url += "l=300";  //get more so better chance to find in filter

			applyCategoryFilter =
			    (categoryFilter.size() && categoryFilter[0] != '*') ? true : false;
			applyInvertedCategoryFilter =
			    (categoryFilter.size() && categoryFilter[0] == '!') ? true : false;
			if(applyCategoryFilter)
			{
				if(applyInvertedCategoryFilter)  //skip 1st char
					acceptCategories =
					    StringMacros::getVectorFromString(categoryFilter.substr(1));
				else
					acceptCategories = StringMacros::getVectorFromString(categoryFilter);
				__COUTTV__(StringMacros::vectorToString(acceptCategories));
			}
			__COUTTV__(applyInvertedCategoryFilter);
			__COUTTV__(applyCategoryFilter);
		}

		//apply date range
		{
			__COUTTV__(baseTime);
			__COUTTV__(duration);

			if(TTEST(30))  //debug date
			{
				for(size_t i = 0; i < 24; ++i)
				{
					__COUTT__ << "i-: " << i << " "
					          << ((baseTime - i * 60 * 60) / (60 * 60 * 24));

					time_t   modTime = baseTime - i * 60 * 60;
					std::tm* baseTimeTm =
					    std::localtime(&modTime);  // Convert to local time
					char translatedDate[256];
					strftime(
					    translatedDate, sizeof(translatedDate), "%Y-%m-%d", baseTimeTm);
					__COUTTV__(translatedDate);
				}

				for(size_t i = 0; i < 24; ++i)
				{
					__COUTT__ << "i+: " << i << " "
					          << ((baseTime + i * 60 * 60) / (60 * 60 * 24));
					time_t   modTime = baseTime + i * 60 * 60;
					std::tm* baseTimeTm =
					    std::localtime(&modTime);  // Convert to local time
					char translatedDate[256];
					strftime(
					    translatedDate, sizeof(translatedDate), "%Y-%m-%d", baseTimeTm);
					__COUTTV__(translatedDate);
				}
			}

			// add one day to calculate before
			baseTime += 1 * (60 * 60 * 24);  //before is non-inclusive, after is inclusive
			std::tm* baseTimeTm = std::localtime(&baseTime);  // Convert to local time
			char     baseTimeTmBuffer[256];
			strftime(baseTimeTmBuffer, sizeof(baseTimeTmBuffer), "%Y-%m-%d", baseTimeTm);
			__COUTTV__(baseTimeTmBuffer);
			url += "&b=" + std::string(baseTimeTmBuffer) + "+00:00:00";  //before

			//now calculate after from duration in days
			baseTime -=
			    duration * (60 * 60 * 24);  //before is non-inclusive, after is inclusive
			baseTimeTm = std::localtime(&baseTime);  // Convert to local time
			strftime(baseTimeTmBuffer, sizeof(baseTimeTmBuffer), "%Y-%m-%d", baseTimeTm);
			__COUTTV__(baseTimeTmBuffer);
			url += "&a=" + std::string(baseTimeTmBuffer) + "+00:00:00";  //after
		}
		// ECLConnection eclConn(ECLUser_, ECLPwd_, ECLHost_);
		eclConn_->Get(url, response);
		__COUTVS__(3, response);

		//example response:
		// <?xml version="1.0" encoding="UTF-8"?>
		// <entry_list ids_only="False">

		// 		<entry
		// 			id="2502"
		// 			author="mu2e_ots"
		// 			category="Global Run"
		// 			timestamp="12/05/2024 17:49:53"
		// 			html="yes"
		// 			formatted="no"
		// 			form="default"
		// 			images="0"
		// 			files="0">
		// 				<text>Message: &amp;#010;Run stopped. Run &amp;apos;105214&amp;apos; duration so far of 00:11:57.35 seconds.&amp;#010;&amp;#010;This was a System Generated Log Entry from &amp;apos;Mu2e ot>
		// 				<text-html><![CDATA[<pre class="html_safe_entry">Message: &#010;Run stopped. Run &apos;105214&apos; duration so far of 00:11:57.35 seconds.&#010;&#010;This was a System Generated Log Entry from &apos;Mu2e>
		// 				<text-cdata><![CDATA[<pre class="html_safe_entry">Message: &#010;Run stopped. Run &apos;105214&apos; duration so far of 00:11:57.35 seconds.&#010;&#010;This was a System Generated Log Entry from &apos;Mu2>
		// 		</entry>
		// 		<entry
		// 			id="2501"
		// 			author="mu2e_ots"
		//		...

		//and result to request is:
		//  <XML_LOGBOOK_ENTRY>
		//		<XML_LOGBOOK_ENTRY_TIME>
		//		<XML_LOGBOOK_ENTRY_CREATOR>
		//      <XML_LOGBOOK_ENTRY_SUBJECT>
		//      <XML_LOGBOOK_ENTRY_TEXT>
		//      <XML_LOGBOOK_ENTRY_FILE value=fileType0>
		//      <XML_LOGBOOK_ENTRY_FILE value=fileType1> ...
		//  </XML_LOGBOOK_ENTRY>

		std::string id, author, subject, category, timestamp, files, images, text;
		size_t      after = 0, before = -1, entryCount = 0, lastBefore = -1;
		std::tm     tm;
		std::string preText, postText;

		while((id =  //StringMacros::extractXmlField(response, "entry", 0, after, &after,
		       StringMacros::rextractXmlField(response,
		                                      "entry",
		                                      0,
		                                      before,
		                                      &before,  //e.g. for reverse order
		                                      "id=",
		                                      "\"")) != "")
		{
			__COUTVS__(2, id);
			++entryCount;

			after = before;

			author = StringMacros::extractXmlField(
			    response, "entry", 0, after, nullptr, "author=", "\"");
			subject = StringMacros::extractXmlField(
			    response, "entry", 0, after, nullptr, "subject=", "\"");
			category = StringMacros::extractXmlField(
			    response, "entry", 0, after, nullptr, "category=", "\"");

			if(applyCategoryFilter)
			{
				bool found = applyInvertedCategoryFilter;
				for(const auto& acceptCategory : acceptCategories)
					if(category == acceptCategory ||
					   category.find(acceptCategory + "/") != std::string::npos)
					{
						found = !applyInvertedCategoryFilter;
						break;
					}

				if(!found)
				{
					__COUTS__(10)
					    << "Skipping unaccepted category: " << category << __E__;
					lastBefore = before;
					--before;  //move back to prepare for next search
					continue;
				}
			}

			timestamp = StringMacros::extractXmlField(
			    response, "entry", 0, after, nullptr, "timestamp=", "\"");
			images = StringMacros::extractXmlField(
			    response, "entry", 0, after, nullptr, "images=", "\"");
			files = StringMacros::extractXmlField(
			    response, "entry", 0, after, nullptr, "files=", "\"");

			__COUTVS__(2, author);
			__COUTVS__(2, timestamp);
			tm = {};  //clear
			std::istringstream ss(timestamp);
			ss >>
			    std::get_time(
			        &tm, "%m/%d/%Y %H:%M:%S");  // Parse the string into the tm structure
			time_t t = std::mktime(&tm);        // Convert tm structure to time_t

			__COUTVS__(2, t);
			__COUTVS__(2, mostRecentTime);
			if(!date && t > mostRecentTime)
				mostRecentTime = t;  //track most recent entry
			__COUTVS__(2, mostRecentTime);

			size_t foundTextPos;
			text = StringMacros::extractXmlField(response,
			                                     "pre class=\"html_safe_entry\"",
			                                     0,
			                                     after,
			                                     &foundTextPos,
			                                     "",
			                                     ">");
			__COUTVS__(2, text.size());
			if(text.size() == 0 ||         //if not found
			   foundTextPos > lastBefore)  //or found in different entry!
			{
				text = StringMacros::extractXmlField(
				    response, "text", 0, after, nullptr, "", ">");
				__COUTVS__(2, text.size());
			}
			__COUTVS__(3, text);
			if(text.size() > std::string("Message: &#010;").size() && text[0] == 'M' &&
			   text[6] == 'e' && text[7] == ':' && text[9] == '&' && text[10] == '#')
				text = text.substr(
				    std::string("Message: &#010;").size());  //skip Message header

			preText              = "";
			postText             = "";
			bool needAttachments = false;
			if(atoi(images.c_str()))
			{
				needAttachments = true;
				preText += "Attached Images: " + images + "<br>";
			}
			if(atoi(files.c_str()))
			{
				needAttachments = true;
				preText += "Attached Files: " + files + "<br>";
			}

			if(needAttachments)
			{
				std::string response, url = "/E/xml_get?e=" + id;
				// ECLConnection eclConn(ECLUser_, ECLPwd_, ECLHost_);
				eclConn_->Get(url, response);
				__COUTVS__(3, response);

				size_t fileCount = atoi(files.c_str());
				__COUTV__(fileCount);
				size_t attachmentAfter = 0;

				if(fileCount)
					postText += "<br><br>=====> Attached Files:";
				for(size_t j = 0; j < fileCount; ++j)
				{
					__COUTTV__(attachmentAfter);
					std::string furl = StringMacros::extractXmlField(response,
					                                                 "attachment",
					                                                 0,
					                                                 attachmentAfter,
					                                                 &attachmentAfter,
					                                                 "url=",
					                                                 "\"");

					__COUTVS__(2, furl);
					std::string fname = StringMacros::extractXmlField(response,
					                                                  "attachment",
					                                                  0,
					                                                  attachmentAfter,
					                                                  nullptr,
					                                                  "filename=",
					                                                  "\"");

					__COUTVS__(2, fname);
					postText += "<br>";
					if(fileCount > 1)
						postText += "Attached File #" + std::to_string(j + 1) + ": ";
					postText +=
					    "<a target='_blank' href='" + furl + "'>" + fname + "</a>";
					attachmentAfter += 20;  //advance to next
				}

				size_t imageCount = atoi(images.c_str());
				__COUTVS__(3, imageCount);
				attachmentAfter = 0;
				if(imageCount)
					postText += "<br><br>=====> Attached Images:";
				for(size_t j = 0; j < imageCount; ++j)
				{
					__COUTTV__(attachmentAfter);
					attachmentAfter = response.find("type=\"image\"", attachmentAfter);
					if(attachmentAfter == std::string::npos)
						break;
					attachmentAfter = response.rfind("<attachment", attachmentAfter);
					if(attachmentAfter == std::string::npos)
						break;

					std::string furl = StringMacros::extractXmlField(response,
					                                                 "attachment",
					                                                 0,
					                                                 attachmentAfter,
					                                                 nullptr,
					                                                 "full_url=",
					                                                 "\"");

					__COUTVS__(2, furl);
					std::string fname = StringMacros::extractXmlField(response,
					                                                  "attachment",
					                                                  0,
					                                                  attachmentAfter,
					                                                  nullptr,
					                                                  "filename=",
					                                                  "\"");

					__COUTVS__(2, fname);
					postText += "<br>";
					if(imageCount > 1)
						postText += "Attached Image #" + std::to_string(j + 1) + ": ";
					postText +=
					    "<a target='_blank' href='" + furl + "'>" + fname + "</a>";

					attachmentAfter += 50;  //advance to next
				}
			}  //end attachment handling

			// Lambda function to wrap links
			auto wrapLinks = [](const std::string& inputText) -> std::string {
				std::string            result;
				std::string::size_type pos = 0;
				std::string::size_type start;

				while((start = inputText.find("http://", pos)) != std::string::npos ||
				      (start = inputText.find("https://", pos)) != std::string::npos)
				{
					// Append text before the link
					result.append(inputText, pos, start - pos);

					// Find the end of the URL (stop at space or end of string)
					std::string::size_type end =
					    inputText.find_first_of(" \t\n!<>(),\"\'", start);
					if(end == std::string::npos)
					{
						end = inputText.size();
					}

					// Extract the URL
					std::string url = inputText.substr(start, end - start);

					// Append the <a> tag
					result += "<a href=\"" + url + "\" target=\"_blank\">" + url + "</a>";

					// Move position to after the URL
					pos = end;
				}

				// Append any remaining text
				result.append(inputText, pos, inputText.size() - pos);

				return result;
			};

			text =
			    preText + (preText.size() ? "\n<br>" : "") + wrapLinks(text) + postText;
			__COUTVS__(2, text);

			if(xmlOut)
			{
				auto entryParent = xmlOut->addTextElementToData(XML_LOGBOOK_ENTRY);

				xmlOut->addTextElementToParent(
				    XML_LOGBOOK_ENTRY_TIME, std::to_string(t), entryParent);
				xmlOut->addTextElementToParent(
				    XML_LOGBOOK_ENTRY_CREATOR, author, entryParent);
				xmlOut->addTextElementToParent(XML_LOGBOOK_ENTRY_TEXT, text, entryParent);
				xmlOut->addTextElementToParent(
				    XML_LOGBOOK_ENTRY_SUBJECT,
				    category + " - entry #" + id + " - " + subject,
				    entryParent);
			}

			lastBefore = before;
			--before;  //move back to prepare for next search
			// after += std::string("entry").size(); //move forward to prepare for next search

		}  //end primary entry extraction loop

		__COUTV__(entryCount);
	}  //end add all posts that match

	if(xmlOut)
		xmlOut->addTextElementToData(XML_STATUS, "1");  // for success
	if(out)
		*out << __COUT_HDR_FL__ << "Today: " << time(0) / (60 * 60 * 24) << std::endl;

	if(TTEST(30))
	{
		__COUTTV__(mostRecentTime);
		__COUTTV__(time(0));
		__COUTTV__(time(0) - mostRecentTime);
		__COUTTV__((time(0) - mostRecentTime) / (60 * 60 * 24));
		__COUTTV__(timezoneHourOffset_);
		for(size_t i = 0; i < 24; ++i)
			__COUTT__ << "i: " << i << " "
			          << ((time(0) - i * 60 * 60 + timezoneHourOffset_ * 60 * 60) /
			              (60 * 60 * 24));
	}

	if(xmlOut)
	{
		xmlOut->addNumberElementToData(XML_TIMEZONE_OFFSET, timezoneHourOffset_);

		if(0 &&
		   mostRecentTime)  //always return 0 for ECL, because category filter may change, and may want live view of today..
		{
			int64_t mostRecentDayIndex =
			    (mostRecentTime + timezoneHourOffset_ * 60 * 60) / (60 * 60 * 24);
			int64_t nowDayIndex =
			    (time(0) + timezoneHourOffset_ * 60 * 60) / (60 * 60 * 24);
			if(TTEST(30))
			{
				__COUTTV__(mostRecentDayIndex);
				__COUTTV__(nowDayIndex);
				__COUTTV__(mostRecentTime);
				__COUTTV__(((time(0) - mostRecentTime + timezoneHourOffset_ * 60 * 60) /
				            (60 * 60 * 24)));
			}
			__COUTTV__(nowDayIndex - mostRecentDayIndex);
			xmlOut->addNumberElementToData(
			    XML_MOST_RECENT_DAY,  //0 is today
			    nowDayIndex -
			        mostRecentDayIndex);  // send most recent day index found in response
		}
		else
			xmlOut->addNumberElementToData(XML_MOST_RECENT_DAY, 0);
	}

}  //end refreshLogbook()

//==============================================================================
/// xoap::MakeSystemLogEntry
///	make a system logbook entry into active category's logbook from Supervisor only
///	TODO: (how to enforce?)
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

	if(ECLUser_ == "" ||
	   ECLHost_ == "")  //ignore ECL when environment variables are not set
	{
		__COUT_INFO__ << "No ECL user/host specified for log entry: " << EntryText
		              << __E__;

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
		ss << "This was a System Generated Log Entry from '" << CategoryName_
		   << "' at host '" << __ENV__("THIS_HOST") << "'" << __E__;
		ss << "Active ots users: " << users << __E__;
		ss << "USER_DATA: " << __ENV__("USER_DATA") << __E__;
		ss << "Uptime: "
		   << StringMacros::getTimeDurationString(
		          CorePropertySupervisorBase::getSupervisorUptime())
		   << __E__;
		field = Field_t(StringMacros::escapeString(ss.str(), true /* keep white space */),
		                "text");
		fields.push_back(field);
	}

	form.field(fields);
	eclEntry.form(form);
	try
	{
		// ECLConnection eclConn(ECLUser_, ECLPwd_, ECLHost_);
		if(!eclConn_->Post(eclEntry))
		{
			__COUT_ERR__ << "Failure to post ECL entry." << __E__;
			retStr = "Failure";
		}
	}
	catch(const std::runtime_error& e)
	{
		__SS__ << "Exception caught during Logbook ECL connection: " << e.what();
		ss << "\n\nIf the problem persists, you can turn off ECL communication by clearing the environment variable ECL_USER_NAME (e.g. " <<
			"export ECL_USER_NAME="") at the terminal and restarting ots, or you can permanently disable the requirement by editing the Configuration Tree and setting Gateway Supervisor --> State Machine --> RequireUserLogInputOnConfigureTransition/RequireUserLogInputOnRunTransition = false.";
		__COUT_ERR__ << ss.str();
		retStr = ss.str();
	}

	// fill return parameters
	SOAPParameters retParameters("Status", retStr);

	return SOAPUtilities::makeSOAPMessageReference("SystemLogEntryStatusResponse",
	                                               retParameters);
}  // end MakeSystemLogEntry()
