#ifndef _ots_drive_udp_interface_h_
#define _ots_drive_udp_interface_h_

#include <arpa/inet.h>
#include <netdb.h>
#include <netinet/in.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>

#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

#define Q(X)     #X
#define QUOTE(X) Q(X)

#define __FILENAME__ \
	(__builtin_strrchr(__FILE__, '/') ? __builtin_strrchr(__FILE__, '/') + 1 : __FILE__)
#define __COUT_HDR_FL__ __FILENAME__ << ":" << std::dec << __LINE__ << " |\t"
#define TLOG(X)         std::cout << QUOTE(X) << ": " << __COUT_HDR_FL__
#define __COUT_ERR__    TLOG(TLVL_ERROR)
#define __COUT_WARN__   TLOG(TLVL_WARN)
#define __COUT_INFO__   TLOG(TLVL_INFO)
#define __COUT__ \
	if(0)        \
	TLOG(TLVL_DEBUG)

#define __SS__            \
	std::stringstream ss; \
	ss << "|" << __FILENAME__ << ": " << __COUT_HDR_FL__
#define __SS_THROW__                        \
	{                                       \
		__COUT_ERR__ << "\n"                \
		             << ss.str();           \
		throw std::runtime_error(ss.str()); \
	}
#define __E__ std::endl

//==============================================================================
/// Client for the GatewaySupervisor UDP remote control ("UDP State Changer"), enabled
/// in the Context group (GatewaySupervisorTable: EnableStateChangesOverUDP,
/// IPAddressForStateChangesOverUDP, PortForStateChangesOverUDP), not by env vars.
///
/// Messages are plain text, one datagram each:
///   - queries: Help, GetStateMachineNames, GetRemoteAppStatus(XML),
///     GetRemoteGatewayStatus(XML), GetRemoteDesktopIcons, ...
///   - FSM commands: <FSMName>,<Command>[,<param>...]  (Configure needs the
///     Configuration Alias as first param; Start takes an optional run number)
/// XML replies arrive in 1500-byte datagrams and are reassembled up to </ROOT>.
/// FSM commands are acknowledged only if EnableAckForStateChangesOverUDP is on, so the
/// outcome is read from the Gateway application's status instead.
class ots_drive_udp_interface
{
  public:
	struct AppStatus
	{
		std::string name, id, status, progress, detail, url, className, statusChangeTime;
	};

	ots_drive_udp_interface(const char* ip, int port);
	~ots_drive_udp_interface(void);

	/// sends a message; returns the reply ("" if none arrived within timeoutSeconds)
	std::string send(const std::string& message, int timeoutSeconds = 5);

	std::vector<std::string> getStateMachineNames(void);
	std::vector<AppStatus>   getAppStatus(void);
	/// the entry whose class is ots::GatewaySupervisor (throws if absent)
	AppStatus getGatewayStatus(void);

	/// sends <fsm>,<command>[,<param>...]; returns the acknowledgement, or "" if acks are off
	std::string sendCommand(const std::string&              fsm,
	                        const std::string&              command,
	                        const std::vector<std::string>& params);

	/// state the Gateway reaches after a successful transition ("" if unknown command)
	static std::string expectedState(const std::string& command);

	static std::vector<std::string> extractXmlFields(const std::string& xml,
	                                                 const std::string& field);
	static std::string              decodeHTMLEntities(const std::string& s);
	static std::string              decodeURIComponent(const std::string& s);

  private:
	int                sock_;
	struct sockaddr_in addr_;
	std::string        selfIPandPort_;
};  // end ots_drive_udp_interface class declaration

#endif
