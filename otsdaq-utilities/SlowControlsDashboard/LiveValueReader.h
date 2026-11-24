#ifndef _ots_LiveValueReader_h_
#define _ots_LiveValueReader_h_

#include <atomic>
#include <ctime>
#include <memory>
#include <mutex>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

namespace ots
{

// clang-format off

////// class define
/// LiveValueReader
///	This class reads the live value of pvs with EPICS Channel Access, to be shown next
/// 	to the alarm state and to the archived history (e.g., a pv with a live value and
/// 	no archived samples points to a problem of the archive engine).
///
///	It is read-only (monitors only, nothing is ever written to a pv) and independent of
/// 	the controls plugin: it has its own Channel Access context in its own thread. A pv
/// 	is monitored from the first time its value is requested, so the first request
/// 	returns state "connecting".
///
///	The standard EPICS environment is used (e.g., EPICS_CA_NAME_SERVERS, EPICS_CA_ADDR_LIST).
class LiveValueReader
{
  public:
									LiveValueReader						(void);
									~LiveValueReader					(void);

	/// returns JSON fields (no braces) liveValue, liveTime [s since epoch], liveSeverity, liveState of the pv
	std::string						getLiveJSONFields					(const std::string& pvName);

	static const size_t 			MAX_CHANNELS;

	struct Channel_t
	{
		LiveValueReader* 			reader = nullptr;
		std::string 				name, value, severity;
		time_t 						time       = 0;
		bool 						connected  = false, everConnected = false, subscribed = false, failed = false;
	}; //end Channel_t struct

	std::mutex						mutex_; ///< protects channels_ and pending_ (public for the Channel Access callbacks)

  private:
	void 							readLoop							(void);

	std::unordered_map<std::string /*pv name*/, std::unique_ptr<Channel_t>>
									channels_;
	std::vector<Channel_t*>			pending_; ///< channels to be created by the thread

	std::thread						thread_;
	std::atomic<bool>				threadStarted_{false}, exitThread_{false};
};

// clang-format on
}  // namespace ots

#endif
