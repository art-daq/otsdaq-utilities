#include "test/ots_cfg_udp_interface.h"

#include <algorithm>
#include <cctype>
#include <chrono>

#define MAXBUFLEN 5000

//==============================================================================
static bool hasCompleteXmlRoot(const std::string& xml)
{
	return xml.size() >= 10 &&
	       xml.substr(xml.size() - 10).find("</ROOT>") != std::string::npos;
}  // end hasCompleteXmlRoot()

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
		{
			__COUT_WARN__ << "socket failed, trying other address..." << __E__;
			continue;
		}
		break;
	}

	if(p == NULL)
	{
		__SS__ << "failed to create socket" << __E__;
		__SS_THROW__;
	}

	memcpy(&addr, p->ai_addr, sizeof(addr));
	freeaddrinfo(servinfo);

	unsigned int socketReceiveBufferSize = 0x1400000;
	if(setsockopt(sockfd,
	              SOL_SOCKET,
	              SO_RCVBUF,
	              (char*)&socketReceiveBufferSize,
	              sizeof(socketReceiveBufferSize)) < 0)
		__COUT_ERR__ << "Failed to set socket receive size to 0x" << std::hex
		             << socketReceiveBufferSize << std::dec << "." << __E__;

	return sockfd;
}  // end makeSocket()

//==============================================================================
/// returns 0 on success, -1 on timeout/failure
static int receive(int          sockfd,
                   std::string& buffer,
                   unsigned int timeoutSeconds,
                   unsigned int timeoutUSeconds)
{
	fd_set         fileDescriptor;
	struct timeval timeout;
	timeout.tv_sec  = timeoutSeconds;
	timeout.tv_usec = timeoutUSeconds;

	FD_ZERO(&fileDescriptor);
	FD_SET(sockfd, &fileDescriptor);
	select(sockfd + 1, &fileDescriptor, 0, 0, &timeout);

	if(!FD_ISSET(sockfd, &fileDescriptor))
		return -1;

	struct sockaddr_in fromAddress;
	socklen_t          addressLength = sizeof(fromAddress);
	int                numberOfBytes;

	buffer.resize(MAXBUFLEN);
	if((numberOfBytes = recvfrom(sockfd,
	                             &buffer[0],
	                             MAXBUFLEN,
	                             0,
	                             (struct sockaddr*)&fromAddress,
	                             &addressLength)) == -1)
	{
		__COUT_ERR__ << "Error reading buffer from " << inet_ntoa(fromAddress.sin_addr)
		             << ":" << ntohs(fromAddress.sin_port) << __E__;
		return -1;
	}
	buffer.resize(numberOfBytes);
	return 0;
}  // end receive()

//==============================================================================
ots_cfg_udp_interface::ots_cfg_udp_interface(const char*        cfg_ip,
                                             int                cfg_port,
                                             const std::string& username)
    : sock_(-1), username_(username)
{
	sock_          = makeSocket(cfg_ip, cfg_port, addr_);
	selfIPandPort_ = std::string(cfg_ip) + ":" + std::to_string(cfg_port);
}  // end constructor()

//==============================================================================
std::string ots_cfg_udp_interface::getKerberosUsername(void)
{
	// the principal line of klist, before the '@'. MIT prints "Default principal:",
	// Heimdal prints "Principal:", so match case-insensitively.
	FILE* pipe = popen("klist 2>/dev/null", "r");
	if(!pipe)
		return "";
	std::string username;
	char        line[512];
	while(fgets(line, sizeof(line), pipe))
	{
		std::string l(line), lower(line);
		std::transform(lower.begin(), lower.end(), lower.begin(), [](unsigned char c) {
			return std::tolower(c);
		});
		size_t pos = lower.find("principal:");
		if(pos == std::string::npos)
			continue;
		username = l.substr(pos + strlen("principal:"));
		username.erase(std::remove_if(username.begin(),
		                              username.end(),
		                              [](unsigned char c) { return std::isspace(c); }),
		               username.end());
		username = username.substr(0, username.find('@'));
		break;
	}
	pclose(pipe);
	return username;
}  // end getKerberosUsername()

//==============================================================================
ots_cfg_udp_interface::~ots_cfg_udp_interface()
{
	if(sock_ != -1)
		close(sock_);
}  // end destructor()

//==============================================================================
std::string ots_cfg_udp_interface::encodeURIComponent(const std::string& sourceStr)
{
	std::string retStr;
	char        encodeStr[4];
	for(const auto& c : sourceStr)
		if((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') ||
		   c == '-' || c == '_' || c == '.')
			retStr += c;
		else
		{
			sprintf(encodeStr, "%%%2.2X", (uint8_t)c);
			retStr += encodeStr;
		}
	return retStr;
}  // end encodeURIComponent()

//==============================================================================
std::string ots_cfg_udp_interface::decodeURIComponent(const std::string& data)
{
	std::string  decodeURIString(data.size(), 0);  // init to same size
	unsigned int j = 0;
	for(unsigned int i = 0; i < data.size(); ++i, ++j)
	{
		if(data[i] == '%' && i + 2 < data.size())
		{
			decodeURIString[j] = (char)std::stoi(data.substr(i + 1, 2), nullptr, 16);
			i += 2;  // skip to next char
		}
		else
			decodeURIString[j] = data[i];
	}
	decodeURIString.resize(j);
	return decodeURIString;
}  // end decodeURIComponent()

//==============================================================================
std::string ots_cfg_udp_interface::encodeListItems(const std::string& csv)
{
	std::string retStr;
	size_t      start = 0, comma;
	while(true)
	{
		comma = csv.find(',', start);
		retStr += encodeURIComponent(csv.substr(start, comma - start));
		if(comma == std::string::npos)
			break;
		retStr += ",";
		start = comma + 1;
	}
	return retStr;
}  // end encodeListItems()

//==============================================================================
void ots_cfg_udp_interface::receiveXmlResponse(std::string&       response,
                                               const std::string& waitDescription,
                                               int inactivityTimeoutSeconds)
{
	response.clear();
	auto    startTime           = std::chrono::steady_clock::now();
	auto    lastUpdateTime      = startTime;
	int64_t lastWarnElapsedTime = 0;

	while(true)
	{
		if(receive(sock_, buffer_, 0 /*timeoutSeconds*/, 200000 /*timeoutUSeconds*/) == 0)
		{
			lastUpdateTime = std::chrono::steady_clock::now();
			response += buffer_;
			if(hasCompleteXmlRoot(response))
				break;
			if(response.find("Error: ") == 0 && buffer_.size() < 1500)
				break;  // short error reply, not chunked XML
		}

		auto currentTime = std::chrono::steady_clock::now();
		auto elapsed =
		    std::chrono::duration_cast<std::chrono::seconds>(currentTime - startTime);
		if(lastWarnElapsedTime != elapsed.count() && elapsed.count() > 2 &&
		   elapsed.count() % 3 == 0)
		{
			__COUT_WARN__ << "Still waiting for " << waitDescription << " after "
			              << elapsed.count() << " seconds... " << response.size()
			              << " bytes received so far." << __E__;
			lastWarnElapsedTime = elapsed.count();
		}

		elapsed = std::chrono::duration_cast<std::chrono::seconds>(currentTime -
		                                                           lastUpdateTime);
		if(elapsed.count() > inactivityTimeoutSeconds)
			break;
	}
}  // end receiveXmlResponse()

//==============================================================================
std::string ots_cfg_udp_interface::sendRequest(const std::string& requestType,
                                               const Params&      params,
                                               int inactivityTimeoutSeconds)
{
	std::string sendMessage = "RequestType=" + requestType;
	if(!username_.empty())
		sendMessage += "&username=" + encodeURIComponent(username_);
	for(const auto& p : params)
		sendMessage += "&" + p.first + "=" + p.second;

	__COUT__ << "sendRequest: " << sendMessage << __E__;

	if(sendto(sock_,
	          sendMessage.c_str(),
	          sendMessage.size(),
	          0,
	          (struct sockaddr*)&addr_,
	          sizeof(addr_)) == -1)
	{
		__SS__ << "Error on sendto for request '" << requestType << "'!" << __E__;
		__SS_THROW__;
	}

	std::string responseXML;
	receiveXmlResponse(responseXML, requestType + " response", inactivityTimeoutSeconds);

	if(responseXML.empty())
	{
		__SS__ << "No response to '" << requestType
		       << "'! Check that a ConfigurationGUISupervisor is running with UDP "
		          "Remote Control enabled (OTS_CONFIG_UDP_IP/PORT) and accessible at "
		       << selfIPandPort_ << "." << __E__;
		__SS_THROW__;
	}
	// receiveXmlResponse() also returns on inactivity with a partial document (e.g. a
	// lost UDP chunk of a large reply); do not hand that back as a successful reply.
	if(responseXML.find("Error: ") != 0 && !hasCompleteXmlRoot(responseXML))
	{
		__SS__ << "Incomplete response to '" << requestType << "' (" << responseXML.size()
		       << " bytes received, no closing ROOT element). A UDP chunk was likely "
		          "lost; retry the request."
		       << __E__;
		__SS_THROW__;
	}
	return responseXML;
}  // end sendRequest()

//==============================================================================
std::string ots_cfg_udp_interface::extractXmlField(const std::string& xml,
                                                   const std::string& field)
{
	std::vector<std::string> all = extractXmlFields(xml, field);
	return all.empty() ? "" : all[0];
}  // end extractXmlField()

//==============================================================================
std::vector<std::string> ots_cfg_udp_interface::extractXmlFields(const std::string& xml,
                                                                 const std::string& field)
{
	std::vector<std::string> values;
	std::string              needle = "<" + field + " value='";
	size_t                   pos    = 0;
	while((pos = xml.find(needle, pos)) != std::string::npos)
	{
		pos += needle.size();
		size_t end = xml.find("'", pos);
		if(end == std::string::npos)
			break;
		values.push_back(xml.substr(pos, end - pos));
		pos = end;
	}
	return values;
}  // end extractXmlFields()

//==============================================================================
// read wrappers
//==============================================================================
std::string ots_cfg_udp_interface::getTables() { return sendRequest("getTables"); }
std::string ots_cfg_udp_interface::getTableGroups()
{
	return sendRequest("getTableGroups");
}
std::string ots_cfg_udp_interface::getActiveTableGroups()
{
	return sendRequest("getActiveTableGroups");
}
std::string ots_cfg_udp_interface::getGroupAliases()
{
	return sendRequest("getGroupAliases");
}
std::string ots_cfg_udp_interface::getVersionAliases()
{
	return sendRequest("getVersionAliases");
}
std::string ots_cfg_udp_interface::getSpecificTable(const std::string& tableName,
                                                    const std::string& version)
{
	return sendRequest("getSpecificTable",
	                   {{"tableName", tableName}, {"version", version}});
}
std::string ots_cfg_udp_interface::getSpecificTableGroup(const std::string& groupName,
                                                         const std::string& groupKey)
{
	return sendRequest("getSpecificTableGroup",
	                   {{"groupName", groupName}, {"groupKey", groupKey}});
}
std::string ots_cfg_udp_interface::getTreeView(const std::string& tableGroup,
                                               const std::string& tableGroupKey,
                                               const std::string& startPath,
                                               unsigned int       depth)
{
	return sendRequest("getTreeView",
	                   {{"tableGroup", tableGroup},
	                    {"tableGroupKey", tableGroupKey},
	                    {"startPath", startPath},
	                    {"depth", std::to_string(depth)}});
}

//==============================================================================
// table editing wrappers
//==============================================================================
std::string ots_cfg_udp_interface::saveTreeNodeEdit(const std::string& targetTable,
                                                    const std::string& targetTableVersion,
                                                    const std::string& targetUID,
                                                    const std::string& targetColumn,
                                                    const std::string& newValue,
                                                    const std::string& editNodeType)
{
	return sendRequest("saveTreeNodeEdit",
	                   {{"editNodeType", editNodeType},
	                    {"targetTable", targetTable},
	                    {"targetTableVersion", targetTableVersion},
	                    {"targetUID", encodeURIComponent(targetUID)},
	                    {"targetColumn", encodeURIComponent(targetColumn)},
	                    {"newValue", encodeURIComponent(newValue)}});
}
std::string ots_cfg_udp_interface::setTreeNodeFieldValues(
    const std::string& tableGroup,
    const std::string& tableGroupKey,
    const std::string& startPath,
    const std::string& recordList,
    const std::string& fieldList,
    const std::string& valueList,
    const std::string& modifiedTables)
{
	return sendRequest("setTreeNodeFieldValues",
	                   {{"tableGroup", tableGroup},
	                    {"tableGroupKey", tableGroupKey},
	                    {"startPath", startPath},
	                    {"modifiedTables", modifiedTables},
	                    {"recordList", encodeListItems(recordList)},
	                    {"fieldList", encodeListItems(fieldList)},
	                    {"valueList", encodeListItems(valueList)}});
}
std::string ots_cfg_udp_interface::addTreeNodeRecords(const std::string& tableGroup,
                                                      const std::string& tableGroupKey,
                                                      const std::string& startPath,
                                                      const std::string& recordList,
                                                      const std::string& modifiedTables)
{
	return sendRequest("addTreeNodeRecords",
	                   {{"tableGroup", tableGroup},
	                    {"tableGroupKey", tableGroupKey},
	                    {"startPath", startPath},
	                    {"modifiedTables", modifiedTables},
	                    {"recordList", encodeListItems(recordList)}});
}
std::string ots_cfg_udp_interface::deleteTreeNodeRecords(
    const std::string& tableGroup,
    const std::string& tableGroupKey,
    const std::string& startPath,
    const std::string& recordList,
    const std::string& modifiedTables)
{
	return sendRequest("deleteTreeNodeRecords",
	                   {{"tableGroup", tableGroup},
	                    {"tableGroupKey", tableGroupKey},
	                    {"startPath", startPath},
	                    {"modifiedTables", modifiedTables},
	                    {"recordList", encodeListItems(recordList)}});
}
std::string ots_cfg_udp_interface::saveSpecificTable(const std::string& tableName,
                                                     const std::string& version,
                                                     bool               temporary,
                                                     const std::string& data,
                                                     const std::string& tableComment)
{
	return sendRequest("saveSpecificTable",
	                   {{"tableName", tableName},
	                    {"version", version},
	                    {"temporary", temporary ? "1" : "0"},
	                    {"tableComment", encodeURIComponent(tableComment)},
	                    {"data", data}});
}

//==============================================================================
// group and alias wrappers
//==============================================================================
std::string ots_cfg_udp_interface::saveNewTableGroup(const std::string& groupName,
                                                     const std::string& tableList,
                                                     const std::string& groupComment)
{
	return sendRequest("saveNewTableGroup",
	                   {{"groupName", groupName},
	                    {"tableList", tableList},
	                    {"groupComment", encodeURIComponent(groupComment)}});
}
std::string ots_cfg_udp_interface::checkAffectedActiveGroups(
    const std::string& modifiedTables)
{
	return sendRequest("checkAffectedActiveGroups", {{"modifiedTables", modifiedTables}});
}
std::string ots_cfg_udp_interface::activateTableGroup(const std::string& tableGroup,
                                                      const std::string& tableGroupKey,
                                                      bool               ignoreWarnings)
{
	return sendRequest("activateTableGroup",
	                   {{"groupName", tableGroup},
	                    {"groupKey", tableGroupKey},
	                    {"ignoreWarnings", ignoreWarnings ? "1" : "0"}},
	                   60 /*activation can be slow*/);
}
std::string ots_cfg_udp_interface::setGroupAliasInActiveBackbone(
    const std::string& groupAlias,
    const std::string& groupName,
    const std::string& groupKey)
{
	return sendRequest(
	    "setGroupAliasInActiveBackbone",
	    {{"groupAlias", groupAlias}, {"groupName", groupName}, {"groupKey", groupKey}});
}
std::string ots_cfg_udp_interface::setTableAliasInActiveBackbone(
    const std::string& tableAlias,
    const std::string& tableName,
    const std::string& version)
{
	return sendRequest(
	    "setTableAliasInActiveBackbone",
	    {{"tableAlias", tableAlias}, {"tableName", tableName}, {"version", version}});
}
