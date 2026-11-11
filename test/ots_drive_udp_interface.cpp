#include "test/ots_drive_udp_interface.h"

#include <cctype>
#include <chrono>
#include <utility>

#define MAXBUFLEN 65535

//==============================================================================
static int makeSocket(const char* ip, int port, struct sockaddr_in& addr)
{
	int             sockfd = -1;
	struct addrinfo hints, *servinfo, *p;
	int             rv;

	memset(&hints, 0, sizeof hints);
	hints.ai_family   = AF_INET;  // IPv4 only: addr is stored in sockaddr_in
	hints.ai_socktype = SOCK_DGRAM;
	if((rv = getaddrinfo(ip, std::to_string(port).c_str(), &hints, &servinfo)) != 0)
	{
		__SS__ << "getaddrinfo: " << gai_strerror(rv) << __E__;
		__SS_THROW__;
	}
	for(p = servinfo; p != NULL; p = p->ai_next)
	{
		if((sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol)) == -1)
			continue;
		break;
	}
	if(p == NULL)
	{
		freeaddrinfo(servinfo);
		__SS__ << "failed to create socket" << __E__;
		__SS_THROW__;
	}
	memcpy(&addr, p->ai_addr, sizeof(addr));
	freeaddrinfo(servinfo);

	unsigned int socketReceiveBufferSize = 0x1400000;
	setsockopt(sockfd,
	           SOL_SOCKET,
	           SO_RCVBUF,
	           (char*)&socketReceiveBufferSize,
	           sizeof(socketReceiveBufferSize));
	return sockfd;
}  // end makeSocket()

//==============================================================================
/// returns 0 on success, -1 on timeout/failure
static int receive(int sockfd, std::string& buffer, unsigned int timeoutUSeconds)
{
	fd_set         fileDescriptor;
	struct timeval timeout;
	timeout.tv_sec  = timeoutUSeconds / 1000000;
	timeout.tv_usec = timeoutUSeconds % 1000000;
	FD_ZERO(&fileDescriptor);
	FD_SET(sockfd, &fileDescriptor);
	select(sockfd + 1, &fileDescriptor, 0, 0, &timeout);
	if(!FD_ISSET(sockfd, &fileDescriptor))
		return -1;

	buffer.resize(MAXBUFLEN);
	int numberOfBytes = recvfrom(sockfd, &buffer[0], MAXBUFLEN, 0, NULL, NULL);
	if(numberOfBytes < 0)
		return -1;
	buffer.resize(numberOfBytes);
	return 0;
}  // end receive()

//==============================================================================
ots_drive_udp_interface::ots_drive_udp_interface(const char* ip, int port) : sock_(-1)
{
	sock_          = makeSocket(ip, port, addr_);
	selfIPandPort_ = std::string(ip) + ":" + std::to_string(port);
}  // end constructor()

//==============================================================================
ots_drive_udp_interface::~ots_drive_udp_interface(void)
{
	if(sock_ != -1)
		close(sock_);
}  // end destructor()

//==============================================================================
std::string ots_drive_udp_interface::send(const std::string& message, int timeoutSeconds)
{
	{  // drop anything left over from an earlier exchange
		std::string stale;
		while(receive(sock_, stale, 0) == 0)
			;
	}

	if(sendto(sock_,
	          message.c_str(),
	          message.size(),
	          0,
	          (struct sockaddr*)&addr_,
	          sizeof(addr_)) == -1)
	{
		__SS__ << "Failed to send '" << message << "' to " << selfIPandPort_ << __E__;
		__SS_THROW__;
	}

	std::string reply, chunk;
	if(receive(sock_, chunk, timeoutSeconds * 1000000) != 0)
		return "";  // no reply (e.g. an FSM command with acknowledgements off)
	reply = chunk;

	// XML replies come in 1500-byte datagrams: keep reading until the root closes
	if(reply.find("<ROOT>") != std::string::npos)
		while(reply.find("</ROOT>") == std::string::npos &&
		      receive(sock_, chunk, 2000000 /*later chunks follow immediately*/) == 0)
			reply += chunk;
	return reply;
}  // end send()

//==============================================================================
std::vector<std::string> ots_drive_udp_interface::getStateMachineNames(void)
{
	return extractXmlFields(send("GetStateMachineNames"), "fsm");
}  // end getStateMachineNames()

//==============================================================================
/// GetRemoteAppStatus lists, per application and in this order: name, id, status, ...,
/// statusChangeTime, ..., progress, detail, ..., class, url, ...
std::vector<ots_drive_udp_interface::AppStatus> ots_drive_udp_interface::getAppStatus(void)
{
	std::string xml = send("GetRemoteAppStatus");
	if(xml.find("</ROOT>") == std::string::npos)
	{
		__SS__ << "No complete reply to GetRemoteAppStatus from the Gateway at "
		       << selfIPandPort_
		       << ". Is ots running with the Gateway UDP remote control enabled?" << __E__;
		__SS_THROW__;
	}

	std::vector<AppStatus> apps;
	size_t                 pos = 0;
	const std::string      tag = "<name value='";
	while((pos = xml.find(tag, pos)) != std::string::npos)
	{
		size_t next  = xml.find(tag, pos + tag.size());
		auto   block = xml.substr(pos, next == std::string::npos ? std::string::npos
		                                                         : next - pos);
		auto   field = [&block](const std::string& f) {
            std::vector<std::string> v = extractXmlFields(block, f);
            return v.size() ? v[0] : std::string("");
		};
		AppStatus a;
		a.name             = field("name");
		a.id               = field("id");
		a.status           = decodeHTMLEntities(field("status"));
		a.statusChangeTime = field("statusChangeTime");
		a.progress         = field("progress");
		a.detail           = decodeURIComponent(decodeHTMLEntities(field("detail")));
		a.className        = field("class");
		a.url              = field("url");
		apps.push_back(a);
		if(next == std::string::npos)
			break;
		pos = next;
	}
	return apps;
}  // end getAppStatus()

//==============================================================================
ots_drive_udp_interface::AppStatus ots_drive_udp_interface::getGatewayStatus(void)
{
	for(const auto& a : getAppStatus())
		if(a.className == "ots::GatewaySupervisor")
			return a;
	__SS__ << "No ots::GatewaySupervisor entry in the GetRemoteAppStatus reply from "
	       << selfIPandPort_ << ". Is EnableApplicationStatusMonitoring on?" << __E__;
	__SS_THROW__;
}  // end getGatewayStatus()

//==============================================================================
std::string ots_drive_udp_interface::sendCommand(const std::string&              fsm,
                                                 const std::string&              command,
                                                 const std::vector<std::string>& params)
{
	std::string message = fsm + "," + command;
	for(const auto& p : params)
		message += "," + p;
	__COUT_INFO__ << "Sending '" << message << "' to " << selfIPandPort_ << __E__;
	return send(message, 2 /*seconds; no reply unless acknowledgements are enabled*/);
}  // end sendCommand()

//==============================================================================
std::string ots_drive_udp_interface::expectedState(const std::string& command)
{
	if(command == "Initialize")
		return "Halted";
	if(command == "Configure")
		return "Configured";
	if(command == "Start" || command == "Resume")
		return "Running";
	if(command == "Pause")
		return "Paused";
	if(command == "Stop")
		return "Configured";
	if(command == "Halt" || command == "Abort")
		return "Halted";
	if(command == "Shutdown")
		return "Shutdown";
	if(command == "Startup")
		return "Initial";
	return "";
}  // end expectedState()

//==============================================================================
std::vector<std::string> ots_drive_udp_interface::extractXmlFields(const std::string& xml,
                                                                   const std::string& field)
{
	std::vector<std::string> values;
	const std::string        tag = "<" + field + " value='";
	size_t                   pos = 0;
	while((pos = xml.find(tag, pos)) != std::string::npos)
	{
		pos += tag.size();
		size_t end = xml.find('\'', pos);
		if(end == std::string::npos)
			break;
		values.push_back(xml.substr(pos, end - pos));
		pos = end;
	}
	return values;
}  // end extractXmlFields()

//==============================================================================
std::string ots_drive_udp_interface::decodeHTMLEntities(const std::string& s)
{
	static const std::vector<std::pair<std::string, std::string>> entities = {
	    {"&apos;", "'"}, {"&quot;", "\""}, {"&lt;", "<"}, {"&gt;", ">"}, {"&amp;", "&"}};
	std::string out;
	for(size_t i = 0; i < s.size();)
	{
		bool replaced = false;
		if(s[i] == '&')
			for(const auto& e : entities)
				if(s.compare(i, e.first.size(), e.first) == 0)
				{
					out += e.second;
					i += e.first.size();
					replaced = true;
					break;
				}
		if(!replaced)
			out += s[i++];
	}
	return out;
}  // end decodeHTMLEntities()

//==============================================================================
std::string ots_drive_udp_interface::decodeURIComponent(const std::string& s)
{
	std::string out;
	for(size_t i = 0; i < s.size(); ++i)
	{
		if(s[i] == '%' && i + 2 < s.size() && isxdigit(s[i + 1]) && isxdigit(s[i + 2]))
		{
			out += (char)strtol(s.substr(i + 1, 2).c_str(), nullptr, 16);
			i += 2;
		}
		else
			out += s[i];
	}
	return out;
}  // end decodeURIComponent()
