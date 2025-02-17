#ifndef _ots_SlowControlsDashboardSupervisor_h_
#define _ots_SlowControlsDashboardSupervisor_h_

#include <chrono>
#include "otsdaq/CoreSupervisors/CoreSupervisorBase.h"

// #include "otsdaq-utilities/SlowControlsInterfacePlugins/EpicsInterface.h"
// #include "EpicsInterface.h.bkup"

namespace ots
{
class SlowControlsVInterface;
class ConfigurationManager;

// SlowControlsDashboardSupervisor
//	This class handles the management of slow controls interface plugins, as well as the
// user web interface
class SlowControlsDashboardSupervisor : public CoreSupervisorBase
{
  public:
	XDAQ_INSTANTIATOR();

	SlowControlsDashboardSupervisor(xdaq::ApplicationStub* s);
	virtual ~SlowControlsDashboardSupervisor(void);

	void init(void);
	void destroy(void);
	void checkSubscriptions(SlowControlsDashboardSupervisor* cs);
	void checkSlowControlsAlarms(SlowControlsDashboardSupervisor* cs);
	void handleNewAlarms();

	virtual void request(const std::string&               requestType,
	                     cgicc::Cgicc&                    cgiIn,
	                     HttpXmlDocument&                 xmlOut,
	                     const WebUsers::RequestUserInfo& userInfo) override;
	virtual void handleRequest(const std::string                Command,
	                           HttpXmlDocument&                 xmlOut,
	                           cgicc::Cgicc&                    cgiIn,
	                           const WebUsers::RequestUserInfo& userInfo);

	virtual void setSupervisorPropertyDefaults(void) override;
	virtual void forceSupervisorPropertyValues(void) override;  // override to force
	                                                            // supervisor property
	                                                            // values (and ignore user
	                                                            // settings)

	void Poll(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut, std::string UID);
	void Poll(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);
	void GetChannelSettings(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);
	void GetChannelArchiverData(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);
	void GetLastAlarmsData(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);
	void GetAlarmsLogData(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);
	void GetAlarmsCheck(HttpXmlDocument& xmlOut);
	void GetUserPermissions(cgicc::Cgicc&                    cgiIn,
	                        HttpXmlDocument&                 xmlOut,
	                        const WebUsers::RequestUserInfo& userInfo);
	void GenerateUID(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut, std::string pvlist);
	void GetList(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);
	void GetPages(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);
	void loadPage(cgicc::Cgicc&                    cgiIn,
	              HttpXmlDocument&                 xmlOut,
	              std::string                      page,
	              const WebUsers::RequestUserInfo& userInfo);
	void loadPhoebusPage(cgicc::Cgicc&                    cgiIn,
	                     HttpXmlDocument&                 xmlOut,
	                     std::string                      page,
	                     const WebUsers::RequestUserInfo& userInfo);
	void SaveControlsPage(cgicc::Cgicc&                    cgiIn,
	                      HttpXmlDocument&                 xmlOut,
	                      const WebUsers::RequestUserInfo& userInfo);
	void SavePhoebusControlsPage(cgicc::Cgicc&                    cgiIn,
	                             HttpXmlDocument&                 xmlOut,
	                             const WebUsers::RequestUserInfo& userInfo);
	void saveImageFile(cgicc::Cgicc&                    cgiIn,
	                   HttpXmlDocument&                 xmlOut,
	                   const WebUsers::RequestUserInfo& userInfo);
	void Subscribe(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);
	void Unsubscribe(cgicc::Cgicc& cgiIn, HttpXmlDocument& xmlOut);

	// Utilities, eventually to be moved
	bool isDir(std::string dir);
	void listFiles(std::string baseDir, bool recursive, std::vector<std::string>* pages);

  private:
	std::string PollChannels_(std::set<std::string>& channels, bool resubscibe = true);
	std::map<int, std::set<std::string>> channelDependencyLookupMap_;
	std::map<int, long int>              uidPollTimeMap_;
	int                                  UID_;
	int                                  alarmNotifyRefreshRate_;
	std::mutex                           alarmCheckThreadErrorMutex_;
	std::string                          alarmCheckThreadError_;
	int                                  readOnly_;

	// cached data to expose to the web user
	std::vector<std::vector<std::string>>              alarms_;
	std::chrono::time_point<std::chrono::system_clock> alarms_timestamp_;

  public:
	SlowControlsVInterface* interface_;
	std::mutex              pluginBusyMutex_;
};
}  // namespace ots

#endif
