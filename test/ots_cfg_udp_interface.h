#ifndef _ots_cfg_udp_interface_h_
#define _ots_cfg_udp_interface_h_

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
#include <map>
#include <sstream>
#include <stdexcept>
#include <string>
#include <utility>
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

#define __COUTV__(X) __COUT__ << QUOTE(X) << " = " << X << __E__

//==============================================================================
/// Client for the ConfigurationGUISupervisor UDP remote-control interface
/// (enabled on the server with OTS_CONFIG_UDP_IP / OTS_CONFIG_UDP_PORT).
///
/// A request is any of the ConfigurationGUISupervisor::request() types and its
/// name=value parameters, exactly as the browser sends them. The reply is the same
/// XML document the browser receives, or a string starting with "Error: ".
class ots_cfg_udp_interface
{
  public:
	typedef std::vector<std::pair<std::string, std::string>> Params;

	ots_cfg_udp_interface(const char* cfg_ip, int cfg_port);
	~ots_cfg_udp_interface(void);

	/// generic entry point: any request type with any parameters
	std::string sendRequest(const std::string& requestType,
	                        const Params&      params                   = Params(),
	                        int                inactivityTimeoutSeconds = 5);

	// --- read ---
	std::string getTables(void);
	std::string getTableGroups(void);
	std::string getActiveTableGroups(void);
	std::string getGroupAliases(void);
	std::string getVersionAliases(void);
	std::string getSpecificTable(const std::string& tableName, const std::string& version);
	std::string getSpecificTableGroup(const std::string& groupName, const std::string& groupKey);
	std::string getTreeView(const std::string& tableGroup,
	                        const std::string& tableGroupKey,
	                        const std::string& startPath,
	                        unsigned int       depth = 1);

	// --- table editing ---
	std::string saveTreeNodeEdit(const std::string& targetTable,
	                             const std::string& targetTableVersion,
	                             const std::string& targetUID,
	                             const std::string& targetColumn,
	                             const std::string& newValue,
	                             const std::string& editNodeType = "value");
	std::string setTreeNodeFieldValues(const std::string& tableGroup,
	                                   const std::string& tableGroupKey,
	                                   const std::string& startPath,
	                                   const std::string& recordList,
	                                   const std::string& fieldList,
	                                   const std::string& valueList,
	                                   const std::string& modifiedTables = "");
	std::string addTreeNodeRecords(const std::string& tableGroup,
	                               const std::string& tableGroupKey,
	                               const std::string& startPath,
	                               const std::string& recordList,
	                               const std::string& modifiedTables = "");
	std::string deleteTreeNodeRecords(const std::string& tableGroup,
	                                  const std::string& tableGroupKey,
	                                  const std::string& startPath,
	                                  const std::string& recordList,
	                                  const std::string& modifiedTables = "");
	std::string saveSpecificTable(const std::string& tableName,
	                              const std::string& version,
	                              bool               temporary,
	                              const std::string& data,
	                              const std::string& tableComment = "");

	// --- groups and aliases (Backbone) ---
	std::string saveNewTableGroup(const std::string& groupName,
	                              const std::string& tableList,
	                              const std::string& groupComment = "");
	std::string checkAffectedActiveGroups(const std::string& modifiedTables);
	std::string activateTableGroup(const std::string& tableGroup,
	                               const std::string& tableGroupKey,
	                               bool               ignoreWarnings = false);
	std::string setGroupAliasInActiveBackbone(const std::string& groupAlias,
	                                          const std::string& groupName,
	                                          const std::string& groupKey);
	std::string setTableAliasInActiveBackbone(const std::string& tableAlias,
	                                          const std::string& tableName,
	                                          const std::string& version);

	/// value of the first <name value="..."/> in an XML reply, or "" if absent
	static std::string extractXmlField(const std::string& xml, const std::string& field);
	/// all values of <name value="..."/> in an XML reply
	static std::vector<std::string> extractXmlFields(const std::string& xml,
	                                                 const std::string& field);
	static std::string              encodeURIComponent(const std::string& data);

  private:
	void receiveXmlResponse(std::string&       response,
	                        const std::string& waitDescription,
	                        int                inactivityTimeoutSeconds);

	int                sock_;
	struct sockaddr_in addr_;
	std::string        buffer_;
	std::string        selfIPandPort_;
};  // end ots_cfg_udp_interface class declaration

#endif
