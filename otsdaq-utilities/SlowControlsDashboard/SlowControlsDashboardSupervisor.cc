#include "otsdaq-utilities/SlowControlsDashboard/SlowControlsDashboardSupervisor.h"
#include <dirent.h>    //for DIR
#include <sys/stat.h>  //for stat() quickly checking if file exists
#include <thread>      //for std::thread

#include "otsdaq/SlowControlsCore/MakeSlowControls.h"
#include "otsdaq/SlowControlsCore/SlowControlsVInterface.h"

#include <boost/regex.hpp>

using namespace ots;

#define CONTROLS_SUPERVISOR_DATA_PATH \
	std::string(__ENV__("SERVICE_DATA_PATH")) + "/ControlsDashboardData/"
#define PAGES_DIRECTORY CONTROLS_SUPERVISOR_DATA_PATH + "pages/"
#define PAGES_PUBLIC_DIRECTORY CONTROLS_SUPERVISOR_DATA_PATH + "pages/public/"
#define PAGES_PRIVATE_DIRECTORY CONTROLS_SUPERVISOR_DATA_PATH + "pages/private/"

XDAQ_INSTANTIATOR_IMPL(SlowControlsDashboardSupervisor)

//==============================================================================
SlowControlsDashboardSupervisor::SlowControlsDashboardSupervisor(
    xdaq::ApplicationStub* stub)
    : CoreSupervisorBase(stub), alarms_(), alarms_timestamp_()
{
	__SUP_COUT__ << "Constructor." << __E__;

	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	// make controls dashboard supervisor directories in case they don't exist
	mkdir(((std::string)(CONTROLS_SUPERVISOR_DATA_PATH)).c_str(), 0755);
	mkdir(((std::string)(PAGES_DIRECTORY)).c_str(), 0755);
	mkdir(((std::string)(PAGES_PUBLIC_DIRECTORY)).c_str(), 0755);
	mkdir(((std::string)(PAGES_PRIVATE_DIRECTORY)).c_str(), 0755);

	interface_              = NULL;
	alarmNotifyRefreshRate_ = 60;  // seconds

	readOnly_ = getSupervisorProperty("ReadOnly", "1") == "1" ? true : false;
	__SUP_COUTV__(readOnly_);

	init();

	__SUP_COUT__ << "Constructed." << __E__;
}  // end constructor

//==============================================================================
SlowControlsDashboardSupervisor::~SlowControlsDashboardSupervisor(void)
{
	__SUP_COUT__ << "Destructor." << __E__;
	destroy();
	__SUP_COUT__ << "Destructed." << __E__;
}  // end destructor()

//==============================================================================
void SlowControlsDashboardSupervisor::destroy(void)
{
	// called by destructor
	delete interface_;
}  // end destroy()

//==============================================================================
void SlowControlsDashboardSupervisor::init(void)
/// called by constructor
{
	UID_ = 0;

	__SUP_COUT__ << __E__;
	ConfigurationTree node = CorePropertySupervisorBase::getSupervisorTableNode();
	std::string       pluginType;

	try
	{
		pluginType =
		    node.getNode("SlowControlsInterfacePluginType").getValue<std::string>();
	}
	catch(...)
	{
		// failed to get plugin type through supervisor table link, so try app property
		__SUP_COUT__ << "Pluging type was not definded through supervisor table, trying "
		                "supervisor property..."
		             << __E__;
		pluginType = CorePropertySupervisorBase::getSupervisorProperty(
		    "ControlsInterfacePluginType");
	}

	try
	{
		alarmNotifyRefreshRate_ = node.getNode("AlarmCheckRefreshPeriod").getValue<int>();
		__SUP_COUTV__(alarmNotifyRefreshRate_);
	}
	catch(...)
	{
		__COUT_WARN__ << "Couldn't find `AlarmCheckRefreshPeriod`. Default "
		                 "alarmNotifyRefreshRate = "
		              << alarmNotifyRefreshRate_ << " seconds." << __E__;
	}

	__COUTV__(pluginType);

	try
	{
		interface_ = makeSlowControls(
		    pluginType,
		    CorePropertySupervisorBase::getSupervisorUID(),
		    CorePropertySupervisorBase::getContextTreeNode(),
		    CorePropertySupervisorBase::getSupervisorConfigurationPath());
	}
	catch(...)
	{
	}

	if(interface_ == nullptr)
	{
		__SS__ << "Slow Control interface plugin construction failed of type "
		       << pluginType << __E__;
		__SS_THROW__;
	}

	interface_->setNewAlarmCallback(
	    std::bind(&SlowControlsDashboardSupervisor::handleNewAlarms, this));

	//
	// interface_->initialize();
	std::thread(
	    [](SlowControlsDashboardSupervisor* cs) {
		    // lockout the messages array for the remainder of the scope
		    // this guarantees the reading thread can safely access the messages
		    std::lock_guard<std::mutex> lock(cs->pluginBusyMutex_);

		    cs->interface_->initialize();
	    },
	    this)
	    .detach();  // thread completes after creating, subscribing, and getting
	//	                // parameters for all channels

	//
	// checkSubscription
	std::thread(
	    [](SlowControlsDashboardSupervisor* cs) {
		    // lockout the messages array for the remainder of the scope
		    // this guarantees the reading thread can safely access the messages
		    // std::lock_guard<std::mutex> lock(cs->pluginBusyMutex_);
		    // cs->checkSubscriptions(cs);
		    cs->checkSlowControlsAlarms(cs);
	    },
	    this)
	    .detach();  // thread check EPICS slow controls alarms

	__SUP_COUT__ << "Finished init() w/ interface: " << pluginType << __E__;

	// add interface plugin to state machine list
	CoreSupervisorBase::theStateMachineImplementation_.push_back(interface_);
}  //end init()

//==============================================================================
void SlowControlsDashboardSupervisor::handleNewAlarms()
{
	__COUT__ << "DEBUG handleNewAlarms" << __E__;
}  //end handleNewAlarms()

//==============================================================================
/// Manage channel subscriptions to Interface
void SlowControlsDashboardSupervisor::checkSlowControlsAlarms(
    SlowControlsDashboardSupervisor* cs)
{
	{  //create mutex scope
		std::lock_guard<std::mutex> lock(cs->alarmCheckThreadErrorMutex_);
		cs->alarmCheckThreadError_ = "";
	}

	while(true)
	{
		alarms_ =
		    cs->interface_
		        ->checkAlarmNotifications();  // note: this calls is potential expensive since it probes the interface every time
		alarms_timestamp_ = std::chrono::system_clock::now();
		if(alarms_.size())
			__COUT__ << "checkSlowControlsAlarms() found count = " << alarms_.size()
			         << __E__;

		try
		{
			for(const auto& alarm : alarms_)
			{
				if(alarm.size() > 8)
				{
					time_t      rawtime = static_cast<time_t>(std::stoi(alarm[1]));
					char*       dt      = ctime(&rawtime);
					std::string subject = "Slow Control Alarm Notification";
					std::string message = "PV: " + alarm[0] + "\n" + " at time: " + dt +
					                      "\n" + " value: " + alarm[2] + "" +
					                      " status: " + alarm[3] + "" +
					                      " severity: " + alarm[4];

					__COUTT__ << "checkSlowControlsAlarms() subject '" << subject
					          << "' message '" << message << "' alarm name '" << alarm[5]
					          << "' notify to '" << alarm[8] << "' at '" << alarm[6]
					          << "' send mail " << alarm[7] << __E__;

					// toList can be "*", or "Tracker:10", "Ryan, Antonio"
					// theRemoteWebUsers_.sendSystemMessage(
					//    "*" /*toList*/, "Subject", "Message", false /*doEmail*/);
					theRemoteWebUsers_.sendSystemMessage(
					    alarm[6], subject, message, alarm[7] == "Yes" ? true : false);
				}
			}
		}
		catch(const std::runtime_error& e)
		{
			__SS__ << e.what() << '\n';
			std::lock_guard<std::mutex> lock(cs->alarmCheckThreadErrorMutex_);
			cs->alarmCheckThreadError_ = ss.str();
			__COUT_ERR__ << ss.str();
		}
		catch(const std::exception& e)
		{
			__SS__ << e.what() << '\n';
			std::lock_guard<std::mutex> lock(cs->alarmCheckThreadErrorMutex_);
			cs->alarmCheckThreadError_ = ss.str();
			__COUT_ERR__ << ss.str();
		}
		catch(...)
		{
			__SS__ << "checkSlowControlsAlarms() ERROR While sendin alarm messages"
			       << __E__;
			try
			{
				throw;
			}  //one more try to printout extra info
			catch(const std::exception& e)
			{
				ss << "Exception message: " << e.what();
			}
			catch(...)
			{
			}
			std::lock_guard<std::mutex> lock(cs->alarmCheckThreadErrorMutex_);
			cs->alarmCheckThreadError_ = ss.str();
			__COUT_ERR__ << ss.str();
		}

		sleep(alarmNotifyRefreshRate_);
	}  //end primary loop
}  // end checkSlowControlsAlarms()

//==============================================================================
/// Manage channel subscriptions to Interface
void SlowControlsDashboardSupervisor::checkSubscriptions(
    SlowControlsDashboardSupervisor* cs)
{
	__COUT__ << "checkSubscriptions() initializing..." << __E__;
	std::vector<std::string> channelList;
	std::vector<int>         channelRefreshRates;
	while(true)
	{
		channelList         = {"FIRST VALUE"};
		channelRefreshRates = {};
		std::map<int, std::set<std::string>>::iterator mapReference =
		    cs->channelDependencyLookupMap_.begin();
		while(mapReference !=
		      cs->channelDependencyLookupMap_
		          .end())  // We have here current list of Channel Dependencies
		{
			for(auto channel : mapReference->second)
			{
				int refreshRate = 15;  // seconds
				channelRefreshRates.push_back(refreshRate);

				__COUT__ << "THREAD actual time: " << std::time(NULL)
				         << "; uidPollTimeMap + 10 * refreshTime: "
				         << cs->uidPollTimeMap_.at(mapReference->first) + 10 * refreshRate
				         << " seconds" << __E__;
				if(std::time(NULL) >
				   cs->uidPollTimeMap_.at(mapReference->first) + 10 * refreshRate)
				{
					try
					{
						cs->channelDependencyLookupMap_.erase(mapReference->first);
						continue;
					}
					catch(const std::exception& e)
					{
						continue;
					}
				}

				std::vector<std::string>::iterator it =
				    find(channelList.begin(), channelList.end(), channel);
				if(it == channelList.end())
				{
					// cs->interface_->unsubscribe(channel);
					// cs->interface_->subscribe(channel);
					channelList.push_back(channel);
					__COUT__ << "Channel: " << channel << " refreshRate:  " << refreshRate
					         << " seconds" << __E__;
					__COUT__ << "channelDependencyLookupMap_.size(): "
					         << cs->channelDependencyLookupMap_.size()
					         << " UID: " << mapReference->first
					         << " mapReference->second.size(): "
					         << mapReference->second.size() << __E__;
				}

				sleep(1);
			}
			mapReference++;
		}
		int minTime = 30;  // seconds
		if(channelRefreshRates.size() > 0)
			minTime =
			    *min_element(channelRefreshRates.begin(), channelRefreshRates.end());
		sleep(minTime);
		__COUT__ << "Loop over channels subscribing - waiting time: " << minTime
		         << " seconds" << __E__;
	}
}

//==============================================================================
/// setSupervisorPropertyDefaults
///		override to set defaults for supervisor property values (before user settings
/// override)
void SlowControlsDashboardSupervisor::setSupervisorPropertyDefaults()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.CheckUserLockRequestTypes, "*");

}  // end setSupervisorPropertyDefaults()

//==============================================================================
/// forceSupervisorPropertyValues
///		override to force supervisor property values (and ignore user settings)
void SlowControlsDashboardSupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes, "poll");

	if(readOnly_)
	{
		CorePropertySupervisorBase::setSupervisorProperty(
		    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.UserPermissionsThreshold,
		    "*=0 | getPages=1 | loadPhoebusPage=1 | getList=1 | getPVSettings=1 | getPvArchiverData=1 | generateUID=1 | getUserPermissions=1 |\
			 userActivityHeartbeat=1 | poll=1 | uid=1 | isUserAdmin=1 | getLastAlarmsData=1 | getAlarmsLogData=1 | getAlarmsCheck=1 | getPvData=1 ");  // block users from writing if no write access
	}
}  //end forceSupervisorPropertyValues()

//==============================================================================
void SlowControlsDashboardSupervisor::request(const std::string& requestType,
                                              cgicc::Cgicc&      cgiIn,
                                              HttpXmlDocument&   xmlOut,
                                              const WebUsers::RequestUserInfo& userInfo)
{
	try
	{
		if(requestType != "getPages" && !pluginBusyMutex_.try_lock())
		{
			__SUP_SS__ << "Controls plugin is still initializing. Please try again in a "
			              "few minutes!"
			           << __E__;
			__SUP_SS_THROW__;
		}

		__SUP_COUT__ << "User name is " << userInfo.username_ << "." << __E__;
		__SUP_COUT__ << "User permission level for request '" << requestType << "' is "
		             << unsigned(userInfo.permissionLevel_)
		             << "(isAdmin=" << (userInfo.isAdmin() ? "Yes" : "No") << ")."
		             << __E__;

		// handle request per requestType
		handleRequest(requestType, xmlOut, cgiIn, userInfo);
	}
	catch(const std::runtime_error& e)
	{
		__SUP_SS__ << "Error occurred handling request '" << requestType
		           << "': " << e.what() << __E__;
		__SUP_COUT__ << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}
	catch(...)
	{
		__SS__ << "Unknown error occurred handling request '" << requestType << "!'"
		       << __E__;
		try
		{
			throw;
		}  //one more try to printout extra info
		catch(const std::exception& e)
		{
			ss << "Exception message: " << e.what();
		}
		catch(...)
		{
		}
		__SUP_COUT__ << ss.str();
		xmlOut.addTextElementToData("Error", ss.str());
	}

	pluginBusyMutex_.unlock();
	__SUP_COUT__ << __E__;
}  // end request()

//==============================================================================
void SlowControlsDashboardSupervisor::handleRequest(
    const std::string                Command,
    HttpXmlDocument&                 xmlOut,
    cgicc::Cgicc&                    cgiIn,
    const WebUsers::RequestUserInfo& userInfo)
{
	// return xml doc holding server response
	__SUP_COUT__ << __E__;

	if(Command == "poll")
	{
		std::string uid = CgiDataUtilities::getOrPostData(cgiIn, "uid");
		Poll(cgiIn, xmlOut, uid);
	}
	else if(Command == "getPvData")
	{
		Poll(cgiIn, xmlOut);
	}
	else if(Command == "userActivityHeartbeat")
	{
		// web client code should call this while user is building
		//	in Edit Mode.
		// Do nothing, just keep login alive
	}
	else if(Command == "generateUID")
	{
		std::string channelList = CgiDataUtilities::getOrPostData(cgiIn, "pvList");
		GenerateUID(cgiIn, xmlOut, channelList);
	}
	else if(Command == "isUserAdmin")
	{
		std::string json = std::string("{ \"message\": \"");
		json += (userInfo.isAdmin() ? "Yes" : "No");
		json += "\"}";
		xmlOut.addTextElementToData("JSON", json.c_str());
	}
	else if(Command == "getUserPermissions")
	{
		GetUserPermissions(cgiIn, xmlOut, userInfo);
	}
	else if(Command == "getPVSettings")
	{
		__SUP_COUT__ << "Channel settings requested from server! " << __E__;
		GetChannelSettings(cgiIn, xmlOut);
		xmlOut.addTextElementToData("id", CgiDataUtilities::getData(cgiIn, "id"));
	}
	else if(Command == "getPvArchiverData")
	{
		__SUP_COUT__ << "Archived Channel data requested from server! " << __E__;
		GetChannelArchiverData(cgiIn, xmlOut);
		xmlOut.addTextElementToData("id", CgiDataUtilities::getData(cgiIn, "id"));
	}
	else if(Command == "getList")
	{
		__SUP_COUT__ << "Channel List requested from server! " << __E__;
		GetList(cgiIn, xmlOut);
	}
	else if(Command == "getPages")
	{
		__SUP_COUT__ << "Requesting pages from server! " << __E__;
		GetPages(cgiIn, xmlOut);
	}
	else if(Command == "loadPage")
	{
		std::string page = CgiDataUtilities::getData(cgiIn, "Page");
		__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " " << page
		             << __E__;

		loadPage(cgiIn, xmlOut, page, userInfo);
	}
	else if(Command == "loadPhoebusPage")
	{
		std::string page = CgiDataUtilities::getData(cgiIn, "Page");
		__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " " << page
		             << __E__;

		loadPhoebusPage(cgiIn, xmlOut, page, userInfo);
	}
	else if(Command == "createControlsPage")
	{
		SaveControlsPage(cgiIn, xmlOut, userInfo);
	}
	else if(Command == "createPhoebusControlsPage")
	{
		SavePhoebusControlsPage(cgiIn, xmlOut, userInfo);
	}
	else if(Command == "getLastAlarmsData")
	{
		__SUP_COUT__ << "Last Alarms Data requested from server! " << __E__;
		GetLastAlarmsData(cgiIn, xmlOut);
		xmlOut.addTextElementToData("id", CgiDataUtilities::getData(cgiIn, "id"));
	}
	else if(Command == "getAlarmsLogData")
	{
		__SUP_COUT__ << "Alarms Log Data requested from server! " << __E__;
		GetAlarmsLogData(cgiIn, xmlOut);
		xmlOut.addTextElementToData("id", CgiDataUtilities::getData(cgiIn, "id"));
	}
	else if(Command == "getAlarmsCheck")
	{
		__SUP_COUT__ << "Alarms Data requested from server! " << __E__;
		GetAlarmsCheck(xmlOut);
	}
	else if(Command == "saveImageFile")
	{
		saveImageFile(cgiIn, xmlOut, userInfo);
	}

	__SUP_COUT__ << "" << __E__;
}  // end handleRequest()

//==============================================================================
void SlowControlsDashboardSupervisor::Poll(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut)
{
	std::string           channelList = CgiDataUtilities::postData(cgiIn, "pvList");
	std::set<std::string> channels;
	StringMacros::getSetFromString(channelList, channels);

	xmlOut.addTextElementToData("JSON", PollChannels_(channels));
}  //end Poll()

//==============================================================================
void SlowControlsDashboardSupervisor::Poll(cgicc::Cgicc& /*cgiIn*/,
                                           HttpXmlDocument& xmlOut,
                                           std::string      UID)
{
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " "
	             << "Polling on UID:" << UID << __E__;

	std::map<int, std::set<std::string>>::iterator mapReference;

	if(UID != "" && (mapReference = channelDependencyLookupMap_.find(std::stoi(UID))) !=
	                    channelDependencyLookupMap_
	                        .end())  // We have their current list of Channel Dependencies
	{
		uidPollTimeMap_.at(std::stoi(UID)) = std::time(NULL);

		xmlOut.addTextElementToData(
		    "JSON", PollChannels_(mapReference->second));  // add to response
	}
	else  // UID is not in our map so force them to generate a new one
	{
		xmlOut.addTextElementToData("JSON",
		                            "{ \"message\": \"NOT_FOUND\"}");  // add to response
	}
}  //end Poll()

//==============================================================================
std::string SlowControlsDashboardSupervisor::PollChannels_(
    std::set<std::string>& channels, bool resubscibe /*=true*/)
{
	std::string JSONMessage = "{ ";

	for(auto channel : channels)
	{
		// channel = channel.substr(0, channel.find(":"));

		__SUP_COUT__ << channel << __E__;

		std::array<std::string, 4> channelInformation =
		    interface_->getCurrentValue(channel);

		__SUP_COUT__ << channel << ": " << channelInformation[1] << " : "
		             << channelInformation[3] << __E__;

		if(channelInformation[0] != "NO_CHANGE")
		{
			//__SUP_COUT__ << "Reached" <<  __E__;
			JSONMessage += "\"" + channel + "\": {";
			JSONMessage += "\"Timestamp\":\"" + channelInformation[0] + "\",";
			JSONMessage += "\"Value\":\"" + channelInformation[1] + "\",";
			JSONMessage += "\"Status\":\"" + channelInformation[2] + "\",";
			JSONMessage += "\"Severity\":\"" + channelInformation[3] + "\"},";
		}
		else
		{
			__SUP_COUT__ << "No change in value since last poll: " << channel << __E__;
		}

		// Handle Channels that disconnect, etc
		if(channelInformation[3] == "INVALID" && resubscibe)
		{
			interface_->unsubscribe(channel);
			interface_->subscribe(channel);
		}
	}

	JSONMessage = JSONMessage.substr(0, JSONMessage.length() - 1);
	JSONMessage += "}";
	__SUP_COUT__ << JSONMessage << __E__;
	return JSONMessage;
}  //end PollChannels_()

//==============================================================================
void SlowControlsDashboardSupervisor::GetChannelSettings(cgicc::Cgicc&    cgiIn,
                                                         HttpXmlDocument& xmlOut)
{
	std::string channelList = CgiDataUtilities::postData(cgiIn, "pvList");

	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " "
	             << "Getting settings for " << channelList << __E__;

	std::string JSONMessage = "{ ";

	__SUP_COUT__ << "**********************" << channelList.size() << __E__;
	if(channelList.size() > 0)
	{
		std::string channel;
		size_t      pos = 0;
		size_t      nextPos;
		while((nextPos = channelList.find(",", pos)) != std::string::npos)
		{
			channel = channelList.substr(pos, nextPos - pos);

			__SUP_COUT__ << channel << __E__;

			std::array<std::string, 9> channelSettings = interface_->getSettings(channel);

			JSONMessage += "\"" + channel + "\": {";
			JSONMessage += "\"Units\": \"" + channelSettings[0] + "\",";
			JSONMessage += "\"Upper_Display_Limit\": \"" + channelSettings[1] + "\",";
			JSONMessage += "\"Lower_Display_Limit\": \"" + channelSettings[2] + "\",";
			JSONMessage += "\"Upper_Alarm_Limit\": \"" + channelSettings[3] + "\",";
			JSONMessage += "\"Upper_Warning_Limit\": \"" + channelSettings[4] + "\",";
			JSONMessage += "\"Lower_Warning_Limit\": \"" + channelSettings[5] + "\",";
			JSONMessage += "\"Lower_Alarm_Limit\": \"" + channelSettings[6] + "\",";
			JSONMessage += "\"Upper_Control_Limit\": \"" + channelSettings[7] + "\",";
			JSONMessage += "\"Lower_Control_Limit\": \"" + channelSettings[8] + "\"},";

			pos = nextPos + 1;
		}

		JSONMessage = JSONMessage.substr(0, JSONMessage.length() - 1);
		JSONMessage += "}";

		__SUP_COUT__ << JSONMessage << __E__;
		xmlOut.addTextElementToData("JSON", JSONMessage);  // add to response
	}
	else
	{
		__SUP_COUT__ << "Did not find any settings because Channel list is length zero!"
		             << __E__;

		xmlOut.addTextElementToData(
		    "JSON", "{ \"message\": \"GetPVSettings\"}");  // add to response
	}
}  //end GetChannelSettings()

//==============================================================================
void SlowControlsDashboardSupervisor::GetChannelArchiverData(cgicc::Cgicc&    cgiIn,
                                                             HttpXmlDocument& xmlOut)
{
	__SUP_COUT__ << "Requesting archived data!" << __E__;

	std::string channelList = CgiDataUtilities::postData(cgiIn, "pvList");
	int         startTime   = stoi(CgiDataUtilities::postData(cgiIn, "startTime"));
	int         endTime     = stoi(CgiDataUtilities::postData(cgiIn, "endTime"));

	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " "
	             << "Getting History for " << channelList << " start time: " << startTime
	             << " end time: " << endTime << __E__;

	__SUP_COUT__ << "channelList.size(): " << channelList.size() << __E__;
	if(channelList.size() > 0 && startTime > 0 && endTime > 0)
	{
		std::string channel;
		size_t      pos = 0;
		size_t      nextPos;
		while((nextPos = channelList.find(",", pos)) != std::string::npos)
		{
			channel = channelList.substr(pos, nextPos - pos);

			__SUP_COUT__ << "Getting History for " << channel << __E__;

			std::vector<std::vector<std::string>> channelInformation =
			    interface_->getChannelHistory(channel, startTime, endTime);

			for(auto channelData : channelInformation)
			{
				std::string JSONMessage = "{ ";
				JSONMessage += "\"" + channel + "\": {";
				JSONMessage += "\"Timestamp\":\"" + channelData[0] + "\",";
				JSONMessage += "\"Value\":\"" + channelData[1] + "\",";
				JSONMessage += "\"Status\":\"" + channelData[2] + "\",";
				JSONMessage += "\"Severity\":\"" + channelData[3] + "\"},";

				JSONMessage = JSONMessage.substr(0, JSONMessage.length() - 1);
				JSONMessage += "}";
				xmlOut.addTextElementToData("JSON", JSONMessage);  // add to response
			}
			//__SUP_COUT__ << JSONMessage << __E__;
			pos = nextPos + 1;
		}
	}
	else
	{
		__SUP_COUT__ << "Did not find any data because Channel list is length zero!"
		             << __E__;

		xmlOut.addTextElementToData(
		    "JSON", "{ \"message\": \"GetChannelArchiverData\"}");  // add to response
	}
}  // end GetChannelArchiverData()

//==============================================================================
void SlowControlsDashboardSupervisor::GetLastAlarmsData(cgicc::Cgicc&    cgiIn,
                                                        HttpXmlDocument& xmlOut)
{
	__SUP_COUT__ << "Requesting last alarms data!" << __E__;

	std::string channelList = CgiDataUtilities::postData(cgiIn, "pvList");

	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " "
	             << "Getting last Alarms for " << channelList << __E__;
	__SUP_COUT__ << "channelList.size(): " << channelList.size() << __E__;

	std::vector<std::vector<std::string>> alarms;

	// create lambda function to fill JSONMessage
	std::function<void(HttpXmlDocument&, std::vector<std::vector<std::string>>&)>
	    jsonFiller = [](HttpXmlDocument&                       xmlOut,
	                    std::vector<std::vector<std::string>>& alarms) {
		    if(alarms.size())
			    for(auto& alarmRow : alarms)
			    {
				    std::string JSONMessage = "{ ";
				    JSONMessage += "\"id\":\"" + alarmRow[0] + "\",";
				    JSONMessage += "\"pvName\":\"" + alarmRow[1] + "\",";
				    JSONMessage += "\"pvDescription\":\"" + alarmRow[2] + "\",";
				    JSONMessage += "\"pvValue\":\"" + alarmRow[3] + "\",";
				    JSONMessage += "\"pvStatus\":\"" + alarmRow[4] + "\",";
				    JSONMessage += "\"pvSeverity\":\"" + alarmRow[5] + "\",";
				    JSONMessage += "\"pvTime\":\"" + alarmRow[6] + "\",";

				    JSONMessage = JSONMessage.substr(0, JSONMessage.length() - 1);
				    JSONMessage += "}";
				    xmlOut.addTextElementToData("JSON", JSONMessage);  // add to response
				    // __SUP_COUT__ << JSONMessage << __E__;
			    }
	    };

	if(channelList.size() > 0)
	{
		std::string channel;
		size_t      pos = 0;
		size_t      nextPos;
		while((nextPos = channelList.find(",", pos)) != std::string::npos)
		{
			channel = channelList.substr(pos, nextPos - pos);

			alarms = interface_->getLastAlarms(channel);
			__SUP_COUT__ << "get Last Alarms for channel: " << channel << __E__;
			jsonFiller(xmlOut, alarms);
			pos = nextPos + 1;
		}
	}
	else
	{
		alarms = interface_->getLastAlarms("");
		__SUP_COUT__ << "get Last Alarms for all channels" << __E__;
		jsonFiller(xmlOut, alarms);
	}
}  // end GetLastAlarmsData()

//==============================================================================
void SlowControlsDashboardSupervisor::GetAlarmsCheck(HttpXmlDocument& xmlOut)
{
	__SUP_COUT__ << "Requesting alarms check cache data!" << __E__;

	std::string JSONMessage = "{ ";
	JSONMessage += "\"last_check\":" +
	               std::to_string(std::chrono::duration_cast<std::chrono::seconds>(
	                                  alarms_timestamp_.time_since_epoch())
	                                  .count()) +
	               ",";
	JSONMessage += "\"total\":" + std::to_string(alarms_.size()) + ",";
	JSONMessage += "\"alarms\": [";
	unsigned int nactive = 0;
	if(alarms_.size())
	{
		for(auto& alarmRow : alarms_)
		{
			JSONMessage += "{ ";
			JSONMessage += "\"name\":\"" + alarmRow[0] + "\",";
			if(alarmRow.size() > 9)
			{  // alarm present
				++nactive;
				JSONMessage += "\"time\":\"" + alarmRow[1] + "\",";
				JSONMessage += "\"value\":\"" + alarmRow[2] + "\",";
				JSONMessage += "\"status\":\"" + alarmRow[3] + "\",";
				JSONMessage += "\"severity\":\"" + alarmRow[4] + "\",";
			}
			JSONMessage =
			    JSONMessage.substr(0, JSONMessage.length() - 1);  // get rid of last ,
			JSONMessage += "},";
		}  //end alarm loop
		JSONMessage =
		    JSONMessage.substr(0, JSONMessage.length() - 1);  // get rid of last ,
	}
	JSONMessage += "], \"nactive\": " + std::to_string(nactive);
	JSONMessage += "}";
	xmlOut.addTextElementToData("JSON", JSONMessage);  // add to response
}  // end GetAlarmsCheck()

//==============================================================================
void SlowControlsDashboardSupervisor::GetAlarmsLogData(cgicc::Cgicc&    cgiIn,
                                                       HttpXmlDocument& xmlOut)
{
	__SUP_COUT__ << "Requesting alarms log data!" << __E__;

	std::string channelList = CgiDataUtilities::postData(cgiIn, "pvList");

	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " "
	             << "Getting Alarms Log for " << channelList << __E__;
	__SUP_COUT__ << "channelList.size(): " << channelList.size() << __E__;

	std::vector<std::vector<std::string>> alarmsLog;

	// create lambda function to fill JSONMessage
	std::function<void(HttpXmlDocument&, std::vector<std::vector<std::string>>&)>
	    jsonFiller = [](HttpXmlDocument&                       xmlOut,
	                    std::vector<std::vector<std::string>>& alarmsLog) {
		    if(alarmsLog.size())
			    for(auto& alarmRow : alarmsLog)
			    {
				    std::string JSONMessage = "{ ";
				    JSONMessage += "\"id\":\"" + alarmRow[0] + "\",";
				    JSONMessage += "\"pvName\":\"" + alarmRow[1] + "\",";
				    JSONMessage += "\"pvValue\":\"" + alarmRow[2] + "\",";
				    JSONMessage += "\"pvStatus\":\"" + alarmRow[3] + "\",";
				    JSONMessage += "\"pvSeverity\":\"" + alarmRow[4] + "\",";
				    JSONMessage += "\"pvTime\":\"" + alarmRow[5] + "\",";

				    JSONMessage = JSONMessage.substr(0, JSONMessage.length() - 1);
				    JSONMessage += "}";
				    xmlOut.addTextElementToData("JSON", JSONMessage);  // add to response
				    // __SUP_COUT__ << JSONMessage << __E__;
			    }
	    };

	if(channelList.size() > 0)
	{
		std::string channel;
		size_t      pos = 0;
		size_t      nextPos;
		while((nextPos = channelList.find(",", pos)) != std::string::npos)
		{
			channel = channelList.substr(pos, nextPos - pos);

			alarmsLog = interface_->getAlarmsLog(channel);
			__SUP_COUT__ << "get Alarms Log for channel: " << channel << __E__;
			jsonFiller(xmlOut, alarmsLog);
			pos = nextPos + 1;
		}
	}
	else
	{
		alarmsLog = interface_->getAlarmsLog("");
		__SUP_COUT__ << "get Alarms Log for all channels" << __E__;
		jsonFiller(xmlOut, alarmsLog);
	}
}  // end GetAlarmsLogData()

//==============================================================================
void SlowControlsDashboardSupervisor::GetUserPermissions(
    cgicc::Cgicc& /*cgiIn*/,
    HttpXmlDocument& /*xmlOut*/,
    const WebUsers::RequestUserInfo& /*userInfo*/)
{
	return;
}

//==============================================================================
void SlowControlsDashboardSupervisor::GenerateUID(cgicc::Cgicc& /*cgiIn*/,
                                                  HttpXmlDocument& xmlOut,
                                                  std::string      channelList)
{
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " "
	             << "Generating UID" << __E__;

	std::set<std::string> channelDependencies;
	StringMacros::getSetFromString(channelList, channelDependencies);

	// make entry for new UID_ in UID-to-channel map
	channelDependencyLookupMap_.insert(
	    std::pair<int, std::set<std::string>>(++UID_, channelDependencies));

	uidPollTimeMap_.insert(std::pair<int, long int>(UID_, std::time(NULL)));

	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() << " NEW UID: " << UID_
	             << " maps to " << channelDependencies.size() << " channels" << __E__;

	xmlOut.addTextElementToData("JSON",
	                            std::string("{ \"message\": \"") + std::to_string(UID_) +
	                                "\"}");  // add to response
}  // end GenerateUID()

//==============================================================================
void SlowControlsDashboardSupervisor::GetList(cgicc::Cgicc& /*cgiIn*/,
                                              HttpXmlDocument& xmlOut)
{
	if(interface_ != NULL)
	{
		__SUP_COUT__ << "Interface is defined! Attempting to get list!" << __E__;
		//	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId() <<
		// __E__;
		std::string list;
		try
		{
			list = interface_->getList("JSON");
		}
		catch(std::runtime_error& e)
		{
			__SUP_SS__ << "Channel list request failed: " << e.what() << __E__;
			__SUP_SS_THROW__;
		}

		__SUP_COUT__ << " " << list << __E__;

		xmlOut.addTextElementToData("JSON", list);  // add to response
	}
	else
	{
		__SUP_COUT__ << "Interface undefined! Failed to get list!" << __E__;
		xmlOut.addTextElementToData("JSON", "[\"None\"]");
	}
}  // end GetList()

//==============================================================================
void SlowControlsDashboardSupervisor::GetPages(cgicc::Cgicc& /*cgiIn*/,
                                               HttpXmlDocument& xmlOut)
{
	std::vector<std::string> pages;

	listFiles("", true, &pages);

	std::string returnJSON = "[";
	for(auto it = pages.begin(); it != pages.end(); it++)
	{
		if(*it != "." && *it != "..")
			returnJSON += "\"" + *it + "\", ";
	}
	if(returnJSON.size() > 2 && returnJSON.compare("[") != 0)
	{
		__SUP_COUT__ << "Found pages on server!" << __E__;
		returnJSON.resize(returnJSON.size() - 2);
		returnJSON += "]";
	}
	else
	{
		// No pages on the server
		__SUP_COUT__ << "No pages found on server!" << __E__;
		returnJSON = "[\"None\"]";
	}
	__SUP_COUT__ << returnJSON << __E__;

	xmlOut.addTextElementToData("JSON", returnJSON);  // add to response
}  // end GetPages()

//==============================================================================
void SlowControlsDashboardSupervisor::loadPage(
    cgicc::Cgicc& /*cgiIn*/,
    HttpXmlDocument& xmlOut,
    std::string      page,
    const WebUsers::RequestUserInfo& /*userInfo*/)
{
	page = StringMacros::decodeURIComponent(page);

	// FIXME Filter out malicious attacks i.e. ../../../../../ stuff
	struct stat buffer;
	if(page.find("..") != std::string::npos)
	{
		__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
		             << "Error! Request using '..': " << page << __E__;
	}
	else if(page.find("~") != std::string::npos)
	{
		__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
		             << "Error! Request using '~': " << page << __E__;
	}
	else if(!(stat(page.c_str(), &buffer) == 0))
	{
		__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
		             << "Error! File not found: " << page << __E__;
	}
	// Remove double / in path

	__SUP_COUT__ << page << __E__;

	if(page.at(0) == '/')
	{
		__SUP_COUT__ << "First character is '/'" << __E__;
		page.erase(page.begin(), page.begin() + 1);
		__SUP_COUT__ << page << __E__;
	}

	std::string file = PAGES_DIRECTORY;
	file += page;
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
	             << "Trying to load page: " << page << __E__;
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
	             << "Trying to load page: " << file << __E__;
	// read file
	// for each line in file

	std::ifstream infile(file);
	if(infile.fail())
	{
		__SUP_COUT__ << "Failed reading file: " << file << __E__;

		xmlOut.addTextElementToData("Time", "[\"Not Found\"]");   // add to response
		xmlOut.addTextElementToData("Notes", "[\"Not Found\"]");  // add to response
		xmlOut.addTextElementToData(
		    "Page", StringMacros::encodeURIComponent(page));  // add to response
		return;
	}
	__SUP_COUT__ << "Reading file" << __E__;

	std::string time         = "";
	std::string notes        = "";
	std::string controlsPage = "";

	for(std::string line; getline(infile, line);)
	{
		__SUP_COUT__ << line << __E__;
		if(!line.substr(0, 5).compare("Time:"))
		{
			time = line.substr(6);
		}
		else if(!line.substr(0, 6).compare("Notes:"))
		{
			notes = line.substr(7);
		}
		else if(!line.substr(0, 5).compare("Page:"))
		{
			controlsPage = line.substr(6);
		}
	}
	__SUP_COUT__ << "Finished reading file" << __E__;
	__SUP_COUTV__(time);
	__SUP_COUTV__(notes);
	__SUP_COUTV__(controlsPage);

	xmlOut.addTextElementToData("Time", time);          // add to response
	xmlOut.addTextElementToData("Notes", notes);        // add to response
	xmlOut.addTextElementToData("Page", controlsPage);  // add to response
}  // end loadPage()

//==============================================================================
void SlowControlsDashboardSupervisor::loadPhoebusPage(
    cgicc::Cgicc& /*cgiIn*/,
    HttpXmlDocument& xmlOut,
    std::string      page,
    const WebUsers::RequestUserInfo& /*userInfo*/)
{
	page = StringMacros::decodeURIComponent(page);

	// FIXME Filter out malicious attacks i.e. ../../../../../ stuff
	struct stat buffer;
	if(page.find("..") != std::string::npos)
	{
		__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
		             << "Error! Request using '..': " << page << __E__;
	}
	else if(page.find("~") != std::string::npos)
	{
		__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
		             << "Error! Request using '~': " << page << __E__;
	}
	else if(!(stat(page.c_str(), &buffer) == 0))
	{
		__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
		             << "Error! File not found: " << page << __E__;
	}
	// Remove double / in path

	__SUP_COUT__ << page << __E__;

	if(page.at(0) == '/')
	{
		__SUP_COUT__ << "First character is '/'" << __E__;
		page.erase(page.begin(), page.begin() + 1);
		__SUP_COUT__ << page << __E__;
	}

	std::string file = PAGES_DIRECTORY;
	file += page;
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
	             << "Trying to load page: " << page << __E__;
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
	             << "Trying to load page: " << file << __E__;

	// read file
	__SUP_COUT__ << "Reading file" << __E__;
	std::ifstream infile(file);
	if(infile.fail())
	{
		__SUP_COUT__ << "Failed reading file: " << file << __E__;
		xmlOut.addTextElementToData(
		    "Page", StringMacros::encodeURIComponent(page));  // add to response
		return;
	}

	std::string xml;
	for(std::string line; getline(infile, line);)
	{
		xml += line + "\n";
	}
	__SUP_COUT__ << xml << __E__;
	xmlOut.addTextElementToData("PHOEBUS", xml);

}  // end loadPhoebusPage()

//==============================================================================
void SlowControlsDashboardSupervisor::SaveControlsPage(
    cgicc::Cgicc& cgiIn,
    HttpXmlDocument& /*xmlOut*/,
    const WebUsers::RequestUserInfo& /*userInfo*/)
{
	__SUP_COUT__ << "ControlsDashboard wants to create a Controls Page!" << __E__;

	std::string controlsPageName = CgiDataUtilities::postData(cgiIn, "Name");
	std::string pageString       = CgiDataUtilities::postData(cgiIn, "Page");
	std::string Time             = CgiDataUtilities::postData(cgiIn, "Time");
	std::string Notes =
	    StringMacros::decodeURIComponent(CgiDataUtilities::postData(cgiIn, "Notes"));
	std::string isControlsPagePublic = CgiDataUtilities::postData(cgiIn, "isPublic");

	__SUP_COUTV__(controlsPageName);
	__SUP_COUTV__(pageString);
	__SUP_COUTV__(Notes);
	__SUP_COUTV__(Time);
	__SUP_COUTV__(isControlsPagePublic);

	if(controlsPageName == "")
		return;

	std::string fullPath;
	if(isControlsPagePublic == "true")
		fullPath = (std::string)PAGES_PUBLIC_DIRECTORY;
	else
		fullPath = (std::string)PAGES_PRIVATE_DIRECTORY;

	__SUP_COUTV__(fullPath);

	std::string file = fullPath + controlsPageName;

	__SUP_COUTV__("Saving Controls Page to: " + file);

	std::string extension = file.substr(file.length() - 4, 4);
	if(extension != ".dat")
	{
		__SUP_COUT__ << "Extension : " << extension << __E__;
		file += std::string(".dat");
	}
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
	             << "Trying to save page: " << controlsPageName << __E__;
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
	             << "Trying to save page as: " << file << __E__;
	// read file
	// for each line in file

	std::ofstream outputFile;
	outputFile.open(file);
	if(!outputFile.is_open())
	{
		__SUP_SS__ << "Failed to open file for writing: " << file << __E__;
		__SUP_SS_THROW__;
	}
	outputFile << "Time: " << Time << "\n";
	outputFile << "Notes: " << Notes << "\n";
	outputFile << "Page: " << pageString;
	outputFile.close();

	__SUP_COUT__ << "Finished writing file" << __E__;

	return;
}

//==============================================================================
void SlowControlsDashboardSupervisor::SavePhoebusControlsPage(
    cgicc::Cgicc& cgiIn,
    HttpXmlDocument& /*xmlOut*/,
    const WebUsers::RequestUserInfo& /*userInfo*/)
{
	__SUP_COUT__ << "ControlsDashboard wants to create a Controls Page!" << __E__;

	std::string controlsPageName     = CgiDataUtilities::postData(cgiIn, "Name");
	std::string pageString           = CgiDataUtilities::postData(cgiIn, "Page");
	std::string isControlsPagePublic = CgiDataUtilities::postData(cgiIn, "isPublic");

	__SUP_COUTV__(controlsPageName);
	__SUP_COUTV__(pageString);
	__SUP_COUTV__(isControlsPagePublic);

	if(controlsPageName == "")
		return;

	std::string fullPath;
	if(isControlsPagePublic == "true")
		fullPath = (std::string)PAGES_PUBLIC_DIRECTORY;
	else
		fullPath = (std::string)PAGES_PRIVATE_DIRECTORY;

	__SUP_COUTV__(fullPath);

	std::string file = fullPath + controlsPageName;

	__SUP_COUTV__("Saving Controls Page to: " + file);

	std::string extension = file.substr(file.length() - 4, 4);
	if(extension != ".bob")
	{
		__SUP_COUT__ << "Extension : " << extension << __E__;
		file += std::string(".bob");
	}
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
	             << "Trying to save page: " << controlsPageName << __E__;
	__SUP_COUT__ << this->getApplicationDescriptor()->getLocalId()
	             << "Trying to save page as: " << file << __E__;
	// read file
	// for each line in file

	std::ofstream outputFile;
	outputFile.open(file);
	if(!outputFile.is_open())
	{
		__SUP_SS__ << "Failed to open file for writing: " << file << __E__;
		__SUP_SS_THROW__;
	}
	outputFile << pageString << "\n";
	outputFile.close();

	__SUP_COUT__ << "Finished writing file" << __E__;

	return;
}

//==============================================================================
void SlowControlsDashboardSupervisor::saveImageFile(
    cgicc::Cgicc& cgiIn,
    HttpXmlDocument& /*xmlOut*/,
    const WebUsers::RequestUserInfo& /*userInfo*/)
{
	__SUP_COUT__ << "ControlsDashboard wants to save the image file uploaded!" << __E__;

	std::string                         isImagePublic = cgiIn("isPublic");
	const std::vector<cgicc::FormFile>& files         = cgiIn.getFiles();
	std::string                         filename;
	std::ofstream                       myfile;
	std::string                         fullPath;

	__SUP_COUTV__(files.size());
	__SUP_COUTV__(isImagePublic);

	if(isImagePublic == "true")
		fullPath = (std::string)PAGES_PUBLIC_DIRECTORY;
	else
		fullPath = (std::string)PAGES_PRIVATE_DIRECTORY;

	for(unsigned int i = 0; i < files.size(); ++i)
	{
		filename = files[i].getFilename();
		filename = fullPath + filename;
		__COUT__ << "file " << i << " - " << filename << std::endl;

		myfile.open(filename.c_str());
		if(myfile.is_open())
		{
			files[i].writeToStream(myfile);
			myfile.close();
			__SUP_COUT__ << "Finished writing image file" << __E__;
		}
	}

	return;
}

//==============================================================================
void SlowControlsDashboardSupervisor::Subscribe(cgicc::Cgicc& /*cgiIn*/,
                                                HttpXmlDocument& /*xmlOut*/)
{
}

//==============================================================================
void SlowControlsDashboardSupervisor::Unsubscribe(cgicc::Cgicc& /*cgiIn*/,
                                                  HttpXmlDocument& /*xmlOut*/)
{
}

//==============================================================================
//==============================================================================
//================================================== UTILITIES
//===========================================================
//==============================================================================
bool SlowControlsDashboardSupervisor::isDir(std::string dir)
{
	struct stat fileInfo;
	stat(dir.c_str(), &fileInfo);
	if(S_ISDIR(fileInfo.st_mode))
	{
		return true;
	}
	else
	{
		return false;
	}
}

//==============================================================================
void SlowControlsDashboardSupervisor::listFiles(std::string               innerDir,
                                                bool                      recursive,
                                                std::vector<std::string>* pages)
{
	std::string baseDir = PAGES_DIRECTORY;
	baseDir += innerDir;
	DIR*           dp;
	struct dirent* dirp;
	if((dp = opendir(baseDir.c_str())) == NULL)
	{
		__SUP_COUT__ << "[ERROR: " << errno << " ] Couldn't open " << baseDir << "."
		             << __E__;
		return;
	}
	else
	{
		while((dirp = readdir(dp)) != NULL)
		{
			if(dirp->d_name != std::string(".") && dirp->d_name != std::string(".."))
			{
				if(isDir(baseDir + dirp->d_name) == true && recursive == true)
				{
					// pages->push_back(baseDir + dirp->d_name);
					__SUP_COUT__ << "[DIR]\t" << baseDir << dirp->d_name << "/" << __E__;
					listFiles(std::string("") + dirp->d_name + "/", true, pages);
				}
				else
				{
					pages->push_back(innerDir + dirp->d_name);
					__SUP_COUT__ << "[FILE]\t" << baseDir << innerDir << dirp->d_name
					             << __E__;
				}
			}
		}
		closedir(dp);
	}
}
