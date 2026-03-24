#ifndef _ots_mm_udp_interface_h_
#define _ots_mm_udp_interface_h_

#include <arpa/inet.h>
#include <errno.h>
#include <netdb.h>
#include <netinet/in.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>

#include <string.h>  //for strstr (not the same as <string>)
#include <chrono>
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <string>  //for string
#include <vector>

#define __COUT_HDR__ ""

#define Q(X)     #X
#define QUOTE(X) Q(X)

#define __FILENAME__ \
	(__builtin_strrchr(__FILE__, '/') ? __builtin_strrchr(__FILE__, '/') + 1 : __FILE__)
#define __MF_SUBJECT__ __FILENAME__
#define __MF_DECOR__   (__MF_SUBJECT__)

#define __COUT_HDR_L__  ":" << std::dec << __LINE__ << " |\t"
#define __COUT_HDR_FL__ __FILENAME__ << "" << __COUT_HDR_L__
#define TLOG(X)         std::cout << QUOTE(X) << ": " << __COUT_HDR_FL__  //__LINE__ << ": "
#define __COUT_ERR__    TLOG(TLVL_ERROR) << __COUT_HDR__
#define __COUT_WARN__   TLOG(TLVL_WARN) << __COUT_HDR__
#define __COUT_INFO__   TLOG(TLVL_INFO) << __COUT_HDR__
#define __COUT__ \
	if(0)        \
	TLOG(TLVL_DEBUG) << __COUT_HDR__
#define __COUTT__ \
	if(0)         \
	TLOG(TLVL_TRACE) << __COUT_HDR__

#define __SS__            \
	std::stringstream ss; \
	ss << "|" << __MF_DECOR__ << ": " << __COUT_HDR_FL__ << __COUT_HDR__
#define __SS_THROW__                        \
	{                                       \
		__COUT_ERR__ << "\n"                \
		             << ss.str();           \
		throw std::runtime_error(ss.str()); \
	}  //put in {}'s to prevent surprises, e.g. if ... else __SS_THROW__;
#define __SS_THROW_ONLY__                   \
	{                                       \
		throw std::runtime_error(ss.str()); \
	}  //put in {}'s to prevent surprises, e.g. if ... else __SS_THROW__;
#define __E__ std::endl

#define __COUTV__(X) __COUT__ << QUOTE(X) << " = " << X << __E__
#define __COUTVS__(LVL, X) \
	TLOG(TLVL_DEBUG + LVL) << __COUT_HDR__ << QUOTE(X) << " = " << X << __E__

std::string              vectorToString(const std::vector<std::string>& setToReturn,
                                        const std::string&              delimeter = ", ");
void                     getVectorFromString(const std::string&        inputString,
                                             std::vector<std::string>& listToReturn,
                                             const std::set<char>&     delimiter           = {',', '|', '&'},
                                             const std::set<char>&     whitespace          = {' ', '\t', '\n', '\r'},
                                             std::vector<char>*        listOfDelimiters    = 0,
                                             bool                      decodeURIComponents = false);
std::vector<std::string> getVectorFromString(
    const std::string&    inputString,
    const std::set<char>& delimiter           = {',', '|', '&'},
    const std::set<char>& whitespace          = {' ', '\t', '\n', '\r'},
    std::vector<char>*    listOfDelimiters    = 0,
    bool                  decodeURIComponents = false);

//==============================================================================
class ots_mm_udp_interface
{
  public:
	ots_mm_udp_interface(const char* mm_ip, int mm_port);
	~ots_mm_udp_interface(void);

	const std::string& getFrontendMacroInfo(void);
	std::string        getFrontendList(void);
	std::string        getCommandList(const std::string& targetFE);
	int                getCommandInputCount(const std::string& targetFE, const std::string& command);
	int                getCommandOutputCount(const std::string& targetFE, const std::string& command);
	std::string        getCommandInputName(const std::string& targetFE,
	                                       const std::string& command,
	                                       int                inputIndex);
	std::string        getCommandOutputName(const std::string& targetFE,
	                                        const std::string& command,
	                                        int                outputIndex);
	std::string        runCommand(const std::string& targetFE,
	                              const std::string& command,
	                              const std::string& inputs);

	// static const int        MAXBUFLEN = 5000;

	static std::string decodeURIComponent(const std::string& data);
	static std::string encodeURIComponent(const std::string& data);
	static std::string decodeHTMLEntities(const std::string& data);

  private:
	int                mm_sock_;
	struct sockaddr_in mm_ai_addr;
	std::string        buffer_;
	std::string        fullXML_;
	std::string        selfIPandPort_;  //cache of this info for error messages, etc.
	                                    ///Note: if std::map does not complicate interface too much for ROOT/pyton, could make member functions return const std::string& and leverage cache solution
	                                    /// std::map<std::string /*fe+cmd*/,std::map<std::string /*field*/, std::string /*value*/>> feCache_;
	                                    ///
};                                      //end ots_mm_udp_interface class declaration

#endif
