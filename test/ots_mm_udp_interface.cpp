
#include "test/ots_mm_udp_interface.h"

#include <chrono>
#include <iomanip>

#define MAXBUFLEN 5000

//==============================================================================
bool hasCompleteXmlRoot(const std::string& xml)
{
	return xml.size() >= 10 &&
	       xml.substr(xml.size() - 10).find("</ROOT>") != std::string::npos;
}  //end hasCompleteXmlRoot()

//==============================================================================
/// get sockaddr, IPv4 or IPv6:
void* get_in_addr(struct sockaddr* sa)
{
	if(sa->sa_family == AF_INET)
	{
		return &(((struct sockaddr_in*)sa)->sin_addr);
	}

	return &(((struct sockaddr_in6*)sa)->sin6_addr);
}

//==============================================================================
int makeSocket(const char* ip, int port, struct sockaddr_in& mm_ai_addr)
{
	int             sockfd;
	struct addrinfo hints, *servinfo, *p;
	int             rv;
	// int                     numbytes;
	// struct sockaddr_storage their_addr;
	// socklen_t               addr_len;
	// char                    s[INET6_ADDRSTRLEN];

	memset(&hints, 0, sizeof hints);
	hints.ai_family   = AF_UNSPEC;
	hints.ai_socktype = SOCK_DGRAM;

	if((rv = getaddrinfo(ip, std::to_string(port).c_str(), &hints, &servinfo)) != 0)
	{
		__SS__ << "getaddrinfo: " << gai_strerror(rv) << __E__;
		__SS_THROW__;
	}

	// loop through all the results and make a socket
	for(p = servinfo; p != NULL; p = p->ai_next)
	{
		if((sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol)) == -1)
		{
			__COUT_WARN__ << "sw: socket failed, trying other address..." << __E__;
			continue;
		}

		break;
	}

	if(p == NULL)
	{
		__SS__ << "sw: failed to create socket" << __E__;
		__SS_THROW__;
	}

	//copy ai_addr, which is needed for sendto
	memcpy(&mm_ai_addr, p->ai_addr, sizeof(mm_ai_addr));

	freeaddrinfo(servinfo);

	// increase socket buffer size
	unsigned int socketReceiveBufferSize = 0x1400000;
	if(setsockopt(sockfd,
	              SOL_SOCKET,
	              SO_RCVBUF,
	              (char*)&socketReceiveBufferSize,
	              sizeof(socketReceiveBufferSize)) < 0)
		__COUT_ERR__ << "Failed to set socket receive size to 0x" << std::hex
		             << socketReceiveBufferSize << std::dec << "." << std::endl;
	else
		__COUT__ << "set socket receive size to 0x" << std::hex << socketReceiveBufferSize
		         << std::dec << "." << __E__;

	return sockfd;
}  //end makeSocket()

//==============================================================================
/// receive ~~
///	returns numberOfBytes on success, -1 on failure
fd_set             fileDescriptor_;
struct timeval     timeout_;
struct sockaddr_in fromAddress_;
socklen_t          addressLength_ = sizeof(fromAddress_);
int                receive(int          sockfd,
                           std::string& buffer,
                           unsigned int timeoutSeconds,
                           unsigned int timeoutUSeconds,
                           bool         verbose)
{
	unsigned long  fromIPAddress;
	unsigned short fromPort;

	// set timeout period for select()
	timeout_.tv_sec  = timeoutSeconds;
	timeout_.tv_usec = timeoutUSeconds;

	FD_ZERO(&fileDescriptor_);
	FD_SET(sockfd, &fileDescriptor_);
	select(sockfd + 1, &fileDescriptor_, 0, 0, &timeout_);

	int numberOfBytes;
	if(FD_ISSET(sockfd, &fileDescriptor_))
	{
		buffer.resize(MAXBUFLEN);  // NOTE: this is inexpensive according to
		                           // Lorenzo/documentation in C++11 (only increases
		                           // size once and doesn't decrease size)
		if((numberOfBytes = recvfrom(sockfd,
		                             &buffer[0],
		                             MAXBUFLEN,
		                             0,
		                             (struct sockaddr*)&fromAddress_,
		                             &addressLength_)) == -1)
		{
			__SS__ << "Error reading buffer from\tIP:\t";
			std::string fromIP = inet_ntoa(fromAddress_.sin_addr);
			fromIPAddress      = fromAddress_.sin_addr.s_addr;
			fromPort           = fromAddress_.sin_port;

			for(int i = 0; i < 4; i++)
			{
				ss << ((fromIPAddress << (i * 8)) & 0xff);
				if(i < 3)
					ss << ".";
			}
			ss << "\tPort\t" << ntohs(fromPort) << " IP " << fromIP << std::endl;
			__COUT__ << "\n" << ss.str();
			return -1;
		}
		// char address[INET_ADDRSTRLEN];
		// inet_ntop(AF_INET, &(fromAddress.sin_addr), address, INET_ADDRSTRLEN);
		fromIPAddress = fromAddress_.sin_addr.s_addr;
		fromPort      = fromAddress_.sin_port;

		//__COUT__ << __PRETTY_FUNCTION__ << "IP: " << std::hex << fromIPAddress <<
		// std::dec << " port: " << fromPort << std::endl;
		//__COUT__ << "Socket Number: " << socketNumber_ << " number of bytes: " <<
		// nOfBytes << std::endl;  gettimeofday(&tvend,NULL);
		//__COUT__ << "started at" << tvbegin.tv_sec << ":" <<tvbegin.tv_usec <<
		// std::endl;
		//__COUT__ << "ended at" << tvend.tv_sec << ":" <<tvend.tv_usec << std::endl;

		// NOTE: this is inexpensive according to Lorenzo/documentation in C++11 (only
		// increases size once and doesn't decrease size)
		buffer.resize(numberOfBytes);

		if(verbose)  // debug
		{
			std::string fromIP = inet_ntoa(fromAddress_.sin_addr);

			__COUT__ << "Receiving from: " << fromIP << ":" << ntohs(fromPort)
			         << " size: " << buffer.size() << std::endl;

			//			std::stringstream ss;
			//			ss << "\tRx";
			//			uint32_t begin = 0;
			//			for(uint32_t i=begin; i<buffer.size(); i++)
			//			{
			//				if(i==begin+2) ss << ":::";
			//				else if(i==begin+10) ss << ":::";
			//				ss << std::setfill('0') << std::setw(2) << std::hex <<
			//(((int16_t)  buffer[i]) &0xFF) << "-" << std::dec;
			//			}
			//			ss << std::endl;
			//			std::cout << ss.str();
		}
	}
	else
	{
		if(verbose)
			__COUT__ << "No new messages for "
			         << timeoutSeconds + timeoutUSeconds / 1000000.
			         << "s. Read request timed out." << std::endl;
		return -1;
	}

	return 0;
}  //end receive()

//==============================================================================
ots_mm_udp_interface::ots_mm_udp_interface(const char* mm_ip, int mm_port) : mm_sock_(-1)
/// , mm_p_(nullptr)
/// , mm_servinfo_(nullptr)
{
	__COUT__ << "Constructor" << __E__;

	mm_sock_ = makeSocket(mm_ip, mm_port, mm_ai_addr);  // mm_p_);

	selfIPandPort_ = mm_ip;
	selfIPandPort_ += ":";
	selfIPandPort_ += std::to_string(mm_port);
}  //end constructor()

//==============================================================================
ots_mm_udp_interface::~ots_mm_udp_interface()
{
	__COUT__ << "Destructor" << __E__;

	if(mm_sock_ != -1)
		close(mm_sock_);

	// if(mm_servinfo_)
	// 	freeaddrinfo(mm_servinfo_);
}  //end destructor()

//==============================================================================
void ots_mm_udp_interface::receiveXmlResponse(std::string&       response,
                                              const std::string& waitDescription,
                                              int                inactivityTimeoutSeconds)
{
	response.clear();
	auto    startTime           = std::chrono::steady_clock::now();
	auto    lastUpdateTime      = std::chrono::steady_clock::now();
	int64_t lastWarnElapsedTime = 0;

	while(true)
	{
		if(receive(mm_sock_,
		           buffer_,
		           0 /*timeoutSeconds*/,
		           200000 /*timeoutUSeconds*/,
		           false /*verbose*/) == 0)
		{
			lastUpdateTime = std::chrono::steady_clock::now();
			if(buffer_.find("<progress>") == 0)
			{
				__COUT_INFO__ << "Progress update: " << buffer_ << __E__;
				continue;
			}

			response += buffer_;
			// __COUT_INFO__ << "Received: " << buffer_ << __E__;
			if(hasCompleteXmlRoot(response))
				break;
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
}  //end receiveXmlResponse()

//=========================================================================
///extract value for field from xml looking forwards from after
/// occurence = 0 is first occurence
std::string extractXmlField(const std::string& xml,
                            const std::string& field,
                            uint32_t           occurrence,
                            size_t             after,
                            size_t*            returnAfter)
{
	size_t lo = after, hi;
	for(uint32_t i = 0; i <= occurrence; ++i)
		if((lo = xml.find("<" + field + " ", lo)) == std::string::npos)
			return "";
	if((hi = xml.find("'/>", lo)) == std::string::npos)
		return "";

	lo = xml.find("value='", lo) + 7;

	if(returnAfter)
		*returnAfter = hi + 3;

	return xml.substr(lo, hi - lo);
}  //end extractXmlField()

//=========================================================================
///extract value for field from xml looking backwards from before
/// occurence = 0 is first occurence
std::string rextractXmlField(const std::string& xml,
                             const std::string& field,
                             uint32_t           occurrence,
                             size_t             before)
{
	size_t lo = 0, hi = before;
	for(uint32_t i = 0; i <= occurrence; ++i)
		if((lo = xml.rfind("<" + field + " ", hi)) == std::string::npos)
			return "";
	if((hi = xml.rfind("'/>", hi)) == std::string::npos)
		return "";

	lo = xml.find("value='", lo) + 7;

	return xml.substr(lo, hi - lo);
}  //end rextractXmlField()

//==============================================================================
/// getVectorFromString
///	extracts the list of elements from string that uses a delimiter
///		ignoring whitespace
///	optionally returns the list of delimiters encountered, which may be useful
///		for extracting which operator was used.
///
///
///	Note: lists are returned as vectors
///	Note: the size() of delimiters will be one less than the size() of the returned values
///		unless there is a leading delimiter, in which case vectors will have the same
/// size.
void getVectorFromString(const std::string&        inputString,
                         std::vector<std::string>& listToReturn,
                         const std::set<char>&     delimiter,
                         const std::set<char>&     whitespace,
                         std::vector<char>*        listOfDelimiters,
                         bool                      decodeURIComponents)
{
	unsigned int             i = 0;
	unsigned int             j = 0;
	unsigned int             c = 0;
	std::set<char>::iterator delimeterSearchIt;
	char                     lastDelimiter = 0;
	bool                     isDelimiter;
	// bool foundLeadingDelimiter = false;

	//__COUT__ << inputString << __E__;
	//__COUTV__(inputString.length());

	// go through the full string extracting elements
	// add each found element to set
	for(; c < inputString.size(); ++c)
	{
		//__COUT__ << (char)inputString[c] << __E__;

		delimeterSearchIt = delimiter.find(inputString[c]);
		isDelimiter       = delimeterSearchIt != delimiter.end();

		//__COUT__ << (char)inputString[c] << " " << isDelimiter <<
		//__E__;//char)lastDelimiter << __E__;

		if(whitespace.find(inputString[c]) !=
		       whitespace.end()  // ignore leading white space
		   && i == j)
		{
			++i;
			++j;
			// if(isDelimiter)
			//	foundLeadingDelimiter = true;
		}
		else if(whitespace.find(inputString[c]) != whitespace.end() &&
		        i != j)  // trailing white space, assume possible end of element
		{
			// do not change j or i
		}
		else if(isDelimiter)  // delimiter is end of element
		{
			// __COUT__ << "Set element found: " << i << "-" << j << " of " << inputString.size() << __E__;
			//		inputString.substr(i,j-i) << std::endl;

			if(listOfDelimiters && listToReturn.size())  // || foundLeadingDelimiter))
			                                             // //accept leading delimiter
			                                             // (especially for case of
			                                             // leading negative in math
			                                             // parsing)
			{
				//__COUTV__(lastDelimiter);
				listOfDelimiters->push_back(lastDelimiter);
			}

			listToReturn.push_back(decodeURIComponents
			                           ? ots_mm_udp_interface::decodeURIComponent(
			                                 inputString.substr(i, j - i))
			                           : inputString.substr(i, j - i));

			// setup i and j for next find
			i = c + 1;
			j = c + 1;
		}
		else  // part of element, so move j, not i
			j = c + 1;

		if(isDelimiter)
			lastDelimiter = *delimeterSearchIt;
		//__COUTV__(lastDelimiter);
	}

	if(1)  // i != j) //last element check (for case when no concluding ' ' or delimiter)
	{
		//__COUT__ << "Last element found: " <<
		//		inputString.substr(i,j-i) << std::endl;

		if(listOfDelimiters && listToReturn.size())  // || foundLeadingDelimiter))
		                                             // //accept leading delimiter
		                                             // (especially for case of leading
		                                             // negative in math parsing)
		{
			//__COUTV__(lastDelimiter);
			listOfDelimiters->push_back(lastDelimiter);
		}
		listToReturn.push_back(
		    decodeURIComponents
		        ? ots_mm_udp_interface::decodeURIComponent(inputString.substr(i, j - i))
		        : inputString.substr(i, j - i));
	}

	// assert that there is one less delimiter than values
	if(listOfDelimiters && listToReturn.size() - 1 != listOfDelimiters->size() &&
	   listToReturn.size() != listOfDelimiters->size())
	{
		__SS__
		    << "There is a mismatch in delimiters to entries (should be equal or one "
		       "less delimiter): "
		    << listOfDelimiters->size() << " vs " << listToReturn.size()
		    << __E__;  // << "Entries: " << StringMacros::vectorToString(listToReturn) << __E__
		//<< "Delimiters: " << StringMacros::vectorToString(*listOfDelimiters) << __E__;
		__SS_THROW__;
	}

}  // end getVectorFromString()

//==============================================================================
/// getVectorFromString
///	extracts the list of elements from string that uses a delimiter
///		ignoring whitespace
///	optionally returns the list of delimiters encountered, which may be useful
///		for extracting which operator was used.
///
///
///	Note: lists are returned as vectors
///	Note: the size() of delimiters will be one less than the size() of the returned values
///		unless there is a leading delimiter, in which case vectors will have the same
/// size.
std::vector<std::string> getVectorFromString(const std::string&    inputString,
                                             const std::set<char>& delimiter,
                                             const std::set<char>& whitespace,
                                             std::vector<char>*    listOfDelimiters,
                                             bool                  decodeURIComponents)
{
	std::vector<std::string> listToReturn;

	getVectorFromString(inputString,
	                    listToReturn,
	                    delimiter,
	                    whitespace,
	                    listOfDelimiters,
	                    decodeURIComponents);
	return listToReturn;
}  // end getVectorFromString()

//==============================================================================
std::string vectorToString(const std::vector<std::string>& setToReturn,
                           const std::string&              delimeter /*= ", "*/)
{
	std::stringstream ss;
	bool              first = true;
	for(auto& setValue : setToReturn)
	{
		if(first)
			first = false;
		else
			ss << delimeter;
		ss << setValue;
	}
	return ss.str();
}  // end vectorToString()

//==============================================================================
/// decodeURIComponent
///	converts all %## to the ascii character
std::string ots_mm_udp_interface::decodeURIComponent(const std::string& data)
{
	std::string  decodeURIString(data.size(), 0);  // init to same size
	unsigned int j = 0;
	for(unsigned int i = 0; i < data.size(); ++i, ++j)
	{
		if(data[i] == '%')
		{
			// high order hex nibble digit
			if(data[i + 1] > '9')  // then ABCDEF
				decodeURIString[j] += (data[i + 1] - 55) * 16;
			else
				decodeURIString[j] += (data[i + 1] - 48) * 16;

			// low order hex nibble digit
			if(data[i + 2] > '9')  // then ABCDEF
				decodeURIString[j] += (data[i + 2] - 55);
			else
				decodeURIString[j] += (data[i + 2] - 48);

			i += 2;  // skip to next char
		}
		else
			decodeURIString[j] = data[i];
	}
	decodeURIString.resize(j);
	return decodeURIString;
}  // end decodeURIComponent()

//==============================================================================
std::string ots_mm_udp_interface::encodeURIComponent(const std::string& sourceStr)
{
	std::string retStr = "";
	char        encodeStr[4];
	for(const auto& c : sourceStr)
		if((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'))
			retStr += c;
		else
		{
			sprintf(encodeStr, "%%%2.2X", (uint8_t)c);
			retStr += encodeStr;
		}
	return retStr;
}  // end encodeURIComponent()

//==============================================================================
std::string ots_mm_udp_interface::decodeHTMLEntities(const std::string& sourceStr)
{
	std::string              retStr = sourceStr;
	std::vector<std::string> htmlSubstrings(
	    {"&lt;", "&gt;", "&amp;", "&quot;", "&apos;", "&#160;", "&#013;"});
	std::vector<std::string> htmlReplaces({"<", ">", "&", "\"", "'", " ", "\n"});
	for(size_t i = 0; i < htmlSubstrings.size(); ++i)
	{
		size_t index = 0;
		while((index = retStr.find(htmlSubstrings[i], index)) != std::string::npos)
		{
			retStr.replace(index, htmlSubstrings[i].size(), htmlReplaces[i]);
			index += htmlReplaces[i].size();  //advance search location
		}
	}
	return retStr;
}  // end decodeHTMLEntities()

//==============================================================================
///returns CSV list of Front-end interface UIDs
const std::string& ots_mm_udp_interface::getFrontendMacroInfo()
{
	__COUT__ << "getFrontendMacroInfo()" << __E__;
	if(fullXML_.size())
		return fullXML_;

	int numbytes;

	std::string sendMessage = "GetFrontendMacroInfo";

	if((numbytes = sendto(mm_sock_,
	                      &(sendMessage.c_str()[0]),
	                      sendMessage.size(),
	                      0,
	                      (struct sockaddr*)&mm_ai_addr,
	                      sizeof(mm_ai_addr))) == -1)
	{
		__SS__ << "Error on getFrontendMacroInfo() sendto!" << __E__;
		__SS_THROW__;
	}

	// __COUTV__(numbytes);

	// read response ///////////////////////////////////////////////////////////
	receiveXmlResponse(fullXML_, "FE Macro Info response", 5);

	if(fullXML_.size() == 0)
	{
		__SS__ << "FE Macro Info receive failed! Check that a MacroMaker Supervisor is "
		          "configured with UDP Remote Control enabled and accessible at "
		       << selfIPandPort_ << "." << __E__;
		__SS_THROW__;
	}

	// __COUTV__(fullXML_);

	//Format: 	each line:
	//		<parent supervisor name>;<parent supervisor lid>;<interface type>;<interface UID>
	//		;<macro name>;<macro permissions req>;<macro num of inputs>;...<input names ;
	// separated>...
	//		;<macro num of outputs>;...<output names ; separated>...
	//	do not use :-separator because of the : in user permissions strings

	return fullXML_;
}  //end getFrontendMacroInfo()

//==============================================================================
///returns CSV list of Front-end interface UIDs
std::string ots_mm_udp_interface::getFrontendList()
{
	__COUT__ << "getFrontendList()" << __E__;
	getFrontendMacroInfo();  //init fullXML_

	//Format: 	each line:
	//		<parent supervisor name>;<parent supervisor lid>;<interface type>;<interface UID>
	//		;<macro name>;<macro permissions req>;<macro tooltip>;<macro num of inputs>;...<input names ;
	// separated>...
	//		;<macro num of outputs>;...<output names ; separated>...
	//	do not use :-separator because of the : in user permissions strings

	std::string value;
	size_t      after = 0;

	std::string retStr;
	while((value = extractXmlField(fullXML_, "FEMacros", 0, after, &after)) != "")
	{
		__COUTV__(fullXML_.size());
		__COUTV__(after);
		// __COUTV__(value);

		std::vector<std::string> fields = getVectorFromString(value, {';'});

		// __COUTV__(vectorToString(fields));
		if(fields.size() < 6)
			continue;

		//0 = supervisor name
		//1 = supervisor lid
		//2 = type
		//3 = FE UID

		if(retStr.size())
			retStr += ';';
		retStr += fields[3];  //append FE UID
		                      // __COUTV__(retStr);
	}                         //end primary loop

	return retStr;
}  //end getFrontendList()

//==============================================================================
std::string ots_mm_udp_interface::getCommandList(const std::string& targetFE)
{
	__COUT__ << "getCommandList()" << __E__;
	getFrontendMacroInfo();  //init fullXML_

	//Format: 	each line:
	//		<parent supervisor name>;<parent supervisor lid>;<interface type>;<interface UID>
	//		;<macro name>;<macro permissions req>;<macro tooltip>;<macro num of inputs>;...<input names ;
	// separated>...
	//		;<macro num of outputs>;...<output names ; separated>...
	//	do not use :-separator because of the : in user permissions strings

	std::string value;
	size_t      after = 0;
	std::string retStr;
	while((value = extractXmlField(fullXML_, "FEMacros", 0, after, &after)) != "")
	{
		// __COUTV__(after);
		// __COUTV__(value);
		std::vector<std::string> fields = getVectorFromString(value, {';'});

		if(fields.size() < 6)
			continue;

		uint32_t i = 4;  //start at first Macro Name, then...
		//i+0 = Macro Name
		//i+1 = Macro Permissions
		//i+2 = Macro Tooltip
		//i+3 = number of inputs N
		//i+4+N = number of outputs M
		//i+4+N+M = Macro Name...

		if(fields[3] == targetFE)
		{
			// __COUTV__(vectorToString(fields));

			//scan through all Macro Names

			while(fields.size() >
			      i + 5)  //need type, uid, input count, output count (at least)
			{
				if(retStr.size())
					retStr += ';';
				retStr += fields[i + 0];  //append FE Macro Name

				// __COUTV__(fields[i+0]);
				// __COUTV__(fields[i+3]);

				//now navigate to next FE UID, by jumping input and output counts
				i += 3 + 1 + atoi(fields[i + 3].c_str());

				if(fields.size() < i)
				{
					__SS__ << "Illegal FE Macro info! " << i << " vs " << fields.size()
					       << __E__;
					__SS_THROW__;
				}
				// __COUTV__(fields[i]);
				i += 1 + atoi(fields[i].c_str());
			}  //primary FE UID search with fields from one FE Supervisor

			break;  //found targetFE, so end search
		}

	}  //end FE search loop

	return retStr;
}  //end getCommandList()

//==============================================================================
int ots_mm_udp_interface::getCommandInputCount(const std::string& targetFE,
                                               const std::string& command)
{
	__COUT__ << "getCommandInputCount()" << __E__;
	getFrontendMacroInfo();  //init fullXML_

	//Format: 	each line:
	//		<parent supervisor name>;<parent supervisor lid>;<interface type>;<interface UID>
	//		;<macro name>;<macro permissions req>;<macro tooltip>;<macro num of inputs>;...<input names ;
	// separated>...
	//		;<macro num of outputs>;...<output names ; separated>...
	//	do not use :-separator because of the : in user permissions strings

	std::string value;
	size_t      after = 0;
	std::string retStr;
	while((value = extractXmlField(fullXML_, "FEMacros", 0, after, &after)) != "")
	{
		// __COUTV__(after);
		// __COUTV__(value);
		std::vector<std::string> fields = getVectorFromString(value, {';'});

		if(fields.size() < 6)
			continue;

		uint32_t i = 4;  //start at first Macro Name, then...
		//i+0 = Macro Name
		//i+1 = Macro Permissions
		//i+2 = Macro Tooltip
		//i+3 = number of inputs N
		//i+4+N = number of outputs M
		//i+4+N+M = Macro Name...

		if(fields[3] == targetFE)
		{
			// __COUTV__(vectorToString(fields));

			//scan through all Macro Names

			while(fields.size() >
			      i + 5)  //need type, uid, input count, output count (at least)
			{
				if(fields[i + 0] == command)  //if found uid/command pair, return
				{
					return atoi(fields[i + 3].c_str());  //return input count
				}
				//else keep looking for macro name

				//now navigate to next FE UID, by jumping input and output counts
				i += 3 + 1 + atoi(fields[i + 3].c_str());

				if(fields.size() < i)
				{
					__SS__ << "Illegal FE Macro info! " << i << " vs " << fields.size()
					       << __E__;
					__SS_THROW__;
				}
				// __COUTV__(fields[i]);
				i += 1 + atoi(fields[i].c_str());
			}  //primary FE UID search with fields from one FE Supervisor

			break;  //found targetFE, so end search
		}
	}  //end FE search loop

	__SS__ << "Count not find FE '" << targetFE << "' Command '" << command
	       << "' in FE Macro Info! Check UID and Macro name." << __E__;
	__SS_THROW__;
}  //end getCommandInputCount()

//==============================================================================
int ots_mm_udp_interface::getCommandOutputCount(const std::string& targetFE,
                                                const std::string& command)
{
	__COUT__ << "getCommandOutputCount()" << __E__;
	getFrontendMacroInfo();  //init fullXML_

	//Format: 	each line:
	//		<parent supervisor name>;<parent supervisor lid>;<interface type>;<interface UID>
	//		;<macro name>;<macro permissions req>;<macro tooltip>;<macro num of inputs>;...<input names ;
	// separated>...
	//		;<macro num of outputs>;...<output names ; separated>...
	//	do not use :-separator because of the : in user permissions strings

	std::string value;
	size_t      after = 0;
	std::string retStr;
	while((value = extractXmlField(fullXML_, "FEMacros", 0, after, &after)) != "")
	{
		// __COUTV__(after);
		// __COUTV__(value);
		std::vector<std::string> fields = getVectorFromString(value, {';'});

		if(fields.size() < 6)
			continue;

		uint32_t i = 4;  //start at first Macro Name, then...
		//i+0 = Macro Name
		//i+1 = Macro Permissions
		//i+2 = Macro Tooltip
		//i+3 = number of inputs N
		//i+4+N = number of outputs M
		//i+4+N+M = Macro Name...

		if(fields[3] == targetFE)
		{
			// __COUTV__(vectorToString(fields));

			//scan through all Macro Names

			while(fields.size() >
			      i + 5)  //need type, uid, input count, output count (at least)
			{
				bool found = false;
				if(fields[i + 0] == command)  //if found uid/command pair, return
				{
					found = true;
				}
				//else keep looking for macro name

				//now navigate to next FE UID, by jumping input and output counts
				i += 3 + 1 + atoi(fields[i + 3].c_str());

				if(fields.size() < i)
				{
					__SS__ << "Illegal FE Macro info! " << i << " vs " << fields.size()
					       << __E__;
					__SS_THROW__;
				}
				// __COUTV__(fields[i]);

				if(found)
				{
					return atoi(fields[i].c_str());  //return output count
				}
				//else keep looking for macro name
				i += 1 + atoi(fields[i].c_str());
			}  //primary FE UID search with fields from one FE Supervisor

			break;  //found targetFE, so end search
		}
	}  //end FE search loop

	__SS__ << "Count not find FE '" << targetFE << "' Command '" << command
	       << "' in FE Macro Info! Check UID and Macro name." << __E__;
	__SS_THROW__;
}  //end getCommandOutputCount()

//==============================================================================
std::string ots_mm_udp_interface::getCommandInputName(const std::string& targetFE,
                                                      const std::string& command,
                                                      int                inputIndex)
{
	// __COUT__ << "getCommandInputName()" << __E__;
	getFrontendMacroInfo();  //init fullXML_

	//Format: 	each line:
	//		<parent supervisor name>;<parent supervisor lid>;<interface type>;<interface UID>
	//		;<macro name>;<macro permissions req>;<macro tooltip>;<macro num of inputs>;...<input names ;
	// separated>...
	//		;<macro num of outputs>;...<output names ; separated>...
	//	do not use :-separator because of the : in user permissions strings

	std::string value;
	size_t      after = 0;
	std::string retStr;
	while((value = extractXmlField(fullXML_, "FEMacros", 0, after, &after)) != "")
	{
		// __COUTV__(after);
		// __COUTV__(value);
		std::vector<std::string> fields = getVectorFromString(value, {';'});

		if(fields.size() < 6)
			continue;

		uint32_t i = 4;  //start at first Macro Name, then...
		//i+0 = Macro Name
		//i+1 = Macro Permissions
		//i+2 = Macro Tooltip
		//i+3 = number of inputs N
		//i+4+N = number of outputs M
		//i+4+N+M = Macro Name...

		if(fields[3] == targetFE)
		{
			// __COUTV__(vectorToString(fields));

			//scan through all Macro Names

			while(fields.size() >
			      i + 5)  //need type, uid, input count, output count (at least)
			{
				if(fields[i + 0] == command)  //if found uid/command pair, return
				{
					if(i + 3 + 1 + inputIndex >= fields.size() ||
					   inputIndex >= atoi(fields[i + 3].c_str()))
					{
						__SS__ << "Illegal input arg index " << inputIndex << " vs "
						       << fields[i + 3] << " count" << __E__;
						__SS_THROW__;
					}
					return decodeURIComponent(
					    fields[i + 3 + 1 + inputIndex]);  //return input arg name
				}
				//else keep looking for macro name

				//now navigate to next FE UID, by jumping input and output counts
				i += 3 + 1 + atoi(fields[i + 3].c_str());

				if(fields.size() < i)
				{
					__SS__ << "Illegal FE Macro info! " << i << " vs " << fields.size()
					       << __E__;
					__SS_THROW__;
				}
				// __COUTV__(fields[i]);
				i += 1 + atoi(fields[i].c_str());
			}  //primary FE UID search with fields from one FE Supervisor

			break;  //found targetFE, so end search
		}
	}  //end FE search loop

	__SS__ << "Count not find FE '" << targetFE << "' Command '" << command
	       << "' in FE Macro Info! Check UID and Macro name." << __E__;
	__SS_THROW__;
}  //end getCommandInputName()

//==============================================================================
///Note: if std::map does not complicate interface too much for ROOT/pyton, could make this const std::string& and leverage cache solution
std::string ots_mm_udp_interface::getCommandOutputName(const std::string& targetFE,
                                                       const std::string& command,
                                                       int                outputIndex)
{
	// // __COUT__ << "getCommandOutputName()" << __E__;
	// if(feCache_.find(targetFE + "|" + command) != feCache_.end())
	// {
	// 	if(feCache_.at(targetFE + "|" + command).find("outputNames-" + std::to_string(outputIndex)) != feCache_.at(targetFE + "|" + command).end())
	// 	{
	// 		__COUT__ << "Found direct cache" << __E__;
	// 		return feCache_.at(targetFE + "|" + command).at("outputNames-" + std::to_string(outputIndex));
	// 	}
	// 	else if(feCache_.at(targetFE + "|" + command).find("outputNames") != feCache_.at(targetFE + "|" + command).end())
	// 	{
	// 		__COUT__ << "Found cache" << __E__;
	// 		std::vector<std::string> outputs = getVectorFromString(
	// 			feCache_.at(targetFE + "|" + command).at("outputNames"), {';'});
	// 		return outputs[outputIndex];
	// 	}
	// }
	getFrontendMacroInfo();  //init fullXML_

	//Format: 	each line:
	//		<parent supervisor name>;<parent supervisor lid>;<interface type>;<interface UID>
	//		;<macro name>;<macro permissions req>;<macro tooltip>;<macro num of inputs>;...<input names ;
	// separated>...
	//		;<macro num of outputs>;...<output names ; separated>...
	//	do not use :-separator because of the : in user permissions strings

	std::string value;
	size_t      after = 0;
	std::string retStr;
	while((value = extractXmlField(fullXML_, "FEMacros", 0, after, &after)) != "")
	{
		// __COUTV__(after);
		// __COUTV__(value);
		std::vector<std::string> fields = getVectorFromString(value, {';'});

		if(fields.size() < 6)
			continue;

		uint32_t i = 4;  //start at first Macro Name, then...
		//i+0 = Macro Name
		//i+1 = Macro Permissions
		//i+2 = Macro Tooltip
		//i+3 = number of inputs N
		//i+4+N = number of outputs M
		//i+4+N+M = Macro Name...

		if(fields[3] == targetFE)
		{
			// __COUTV__(vectorToString(fields));

			//scan through all Macro Names

			while(fields.size() >
			      i + 5)  //need type, uid, input count, output count (at least)
			{
				bool found = false;
				if(fields[i + 0] == command)  //if found uid/command pair, return
				{
					found = true;
				}
				//else keep looking for macro name

				//now navigate to next FE UID, by jumping input and output counts
				i += 3 + 1 + atoi(fields[i + 3].c_str());

				if(fields.size() < i)
				{
					__SS__ << "Illegal FE Macro info! " << i << " vs " << fields.size()
					       << __E__;
					__SS_THROW__;
				}
				// __COUTV__(fields[i]);

				if(found)
				{
					if(i + 1 + outputIndex >= fields.size() ||
					   outputIndex >= atoi(fields[i].c_str()))
					{
						__SS__ << "Illegal output arg index " << outputIndex << " vs "
						       << fields[i] << " count" << __E__;
						__SS_THROW__;
					}

					// feCache_[targetFE + "|" + command]["outputNames-" + std::to_string(outputIndex)] = decodeURIComponent(fields[i+1+outputIndex]);
					// return feCache_.at(targetFE + "|" + command).at("outputNames-" + std::to_string(outputIndex)); //return output arg name
					return decodeURIComponent(fields[i + 1 + outputIndex]);
				}
				//else keep looking for macro name
				i += 1 + atoi(fields[i].c_str());
			}  //primary FE UID search with fields from one FE Supervisor

			break;  //found targetFE, so end search
		}
	}  //end FE search loop

	__SS__ << "Count not find FE '" << targetFE << "' Command '" << command
	       << "' in FE Macro Info! Check UID and Macro name." << __E__;
	__SS_THROW__;
}  //end getCommandOutputName()

//==============================================================================
///	inputs should be ;-separated and URI encoded (to avoid commas and semicolons)
///	outputs will be ;-separated and URI encoded
std::string ots_mm_udp_interface::runCommand(const std::string& targetFE,
                                             const std::string& command,
                                             const std::string& inputs)
{
	__COUT__ << "On '" << targetFE << "' runCommand: " << command << __E__;

	__COUTV__(inputs);

	//extract FE Type from FE Macro info...
	getFrontendMacroInfo();  //init fullXML_
	std::string feType;

	//Format: 	each line:
	//		<parent supervisor name>;<parent supervisor lid>;<interface type>;<interface UID>
	//		;<macro name>;<macro permissions req>;<macro tooltip>;<macro num of inputs>;...<input names ;
	// separated>...
	//		;<macro num of outputs>;...<output names ; separated>...
	//	do not use :-separator because of the : in user permissions strings

	std::string value;
	size_t      after = 0;

	std::string retStr;
	while((value = extractXmlField(fullXML_, "FEMacros", 0, after, &after)) != "")
	{
		__COUTV__(fullXML_.size());
		__COUTV__(after);
		// __COUTV__(value);

		std::vector<std::string> fields = getVectorFromString(value, {';'});

		// __COUTV__(vectorToString(fields));
		if(fields.size() < 6)
			continue;

		//0 = supervisor name
		//1 = supervisor lid
		//2 = type
		//3 = FE UID

		if(fields[3] == targetFE)
		{
			feType = fields[2];
			__COUTV__(feType);
			break;
		}
	}  //end primary loop

	if(feType.size() == 0)
	{
		__SS__ << "Could not find front-end type for FE UID '" << targetFE << __E__;
		__SS_THROW__;
	}

	int numbytes;

	std::string sendMessage = "RunFrontendMacro";
	//create ;-separated arguments to satisfy this:
	// std::string feClassSelected = bufferFields[1];
	// std::string feUIDSelected = bufferFields[2];  // allow CSV multi-selection
	// std::string macroType =  bufferFields[3]; // "fe", "public", "private"
	// std::string macroName = bufferFields[4];
	// std::string inputArgs   = StringMacros::decodeURIComponent(bufferFields[5]); //two level ;- and ,- separated
	// std::string outputArgs  =  StringMacros::decodeURIComponent(bufferFields[6]); // ,- separated
	// bool        saveOutputs = bufferFields[7] == "1";
	sendMessage += ";" + feType;  // std::string feClassSelected = bufferFields[1];
	sendMessage +=
	    ";" +
	    targetFE;  // std::string feUIDSelected = bufferFields[2];  // allow CSV multi-selection
	sendMessage +=
	    ";" +
	    std::string(
	        "fe");  // std::string macroType =  bufferFields[3]; // "fe", "public", "private"
	sendMessage +=
	    ";" + encodeURIComponent(command);  // std::string macroName = bufferFields[4];

	//handle inputs
	{
		std::string inputStr;
		uint32_t    numberOfInputs = getCommandInputCount(targetFE, command);

		std::vector<std::string> inputVec = getVectorFromString(inputs, {';'});
		uint32_t                 countOfNonEmptyInputs = 0;
		for(uint32_t i = 0; i < inputVec.size(); ++i)
		{
			if(inputVec[i] == "")
				continue;  //skip empty inputs
			if(countOfNonEmptyInputs)
				inputStr += ";";
			inputStr += encodeURIComponent(getCommandInputName(
			                targetFE, command, countOfNonEmptyInputs)) +
			            "," + inputVec[i];  //already encoded (hopefully)

			++countOfNonEmptyInputs;
		}
		if(numberOfInputs != countOfNonEmptyInputs)
		{
			__SS__ << "Input argument mismatch: " << countOfNonEmptyInputs << " vs "
			       << numberOfInputs << " expected." << __E__;
			__SS_THROW__;
		}
		__COUTV__(inputStr);
		sendMessage += ";" + encodeURIComponent(inputStr);  //double encoded
	}

	//handle outputs, which are ,- separated
	uint32_t numberOfOutputs = getCommandOutputCount(targetFE, command);
	{
		std::string outputStr;

		for(uint32_t i = 0; i < numberOfOutputs; ++i)
		{
			if(i)
				outputStr += ",";
			outputStr += encodeURIComponent(getCommandOutputName(targetFE, command, i));
		}

		sendMessage += ";" + encodeURIComponent(outputStr);  //double encoded
	}

	sendMessage +=
	    ";" + std::string("0");  // bool        saveOutputs = bufferFields[7] == "1";

	__COUTV__(sendMessage.size());
	__COUTV__(sendMessage);

	if((numbytes = sendto(mm_sock_,
	                      &(sendMessage.c_str()[0]),
	                      sendMessage.size(),
	                      0,
	                      (struct sockaddr*)&mm_ai_addr,
	                      sizeof(mm_ai_addr))) == -1)
	{
		__SS__ << "Error on runCommand() sendto! Error: " << strerror(errno) << __E__;

		{  //check for more error info
			int       error  = 0;
			socklen_t len    = sizeof(error);
			int       retval = getsockopt(mm_sock_, SOL_SOCKET, SO_ERROR, &error, &len);
			if(retval != 0 || error != 0)
			{
				ss << "Socket is closed or in error state: " << strerror(error)
				   << std::endl;
			}
		}

		close(mm_sock_);
		mm_sock_ = -1;

		__SS_THROW__;
	}

	// read response ///////////////////////////////////////////////////////////
	std::string runXML;
	receiveXmlResponse(runXML, "command run response", 10);

	// At this point, runXML should contain the complete response assembled by the current receive logic.
	if(runXML.size() == 0 || runXML.find("Error") == 0 || !hasCompleteXmlRoot(runXML))
	{
		__SS__ << "Error running the command. Received error or incomplete buffer: "
		       << (runXML.size() == 0 ? "<empty>" : runXML) << __E__;
		__SS_THROW__;
	}

	//example response:
	// <ROOT>
	// 	<DATA>
	// 		<feMacroExec value='Check Firefly Loss-of-Light'>
	// 			<exec_time value='Fri Aug 16 18:59:15 2024 CDT'/>
	// 			<fe_uid value='CFO0'/>
	// 			<fe_type value='CFOFrontEndInterface'/>
	// 			<fe_context value='ots::FESupervisor'/>
	// 			<fe_supervisor value='LID-280'/>
	// 			<fe_hostname value='mu2e-calo-03.fnal.gov'/>
	// 			<outputArgs_name value='Link Status'/>
	// 			<outputArgs_value value='%7B0%3ADEAD%2C%201%3A%20DEAD%2C%202%3ADEAD%2C%203%3ADEAD%2C%204%3A%20DEAD%2C%205%3A%20DEAD%2C%206%2FCFO%3A%20OK%2C%207%2FEVB%3A%20DEAD%7D'/>
	// 		</feMacroExec>
	// 	</DATA>
	// </ROOT>

	//verify outputs
	{
		std::string outputStr;

		size_t      after = 0;
		std::string error = extractXmlField(runXML, "Error", 0, after, &after);

		if(error != "")
		{
			//error has html entities in it
			error = decodeHTMLEntities(error);
			__SS__ << "Error message received after command execution attempt: \n"
			       << error << __E__;
			__SS_THROW__;
		}

		for(uint32_t i = 0; i < numberOfOutputs; ++i)
		{
			std::string expectedOutputName = getCommandOutputName(targetFE, command, i);

			std::string outputName =
			    extractXmlField(runXML, "outputArgs_name", 0, after, &after);
			std::string outputValue =
			    extractXmlField(runXML, "outputArgs_value", 0, after, &after);
			__COUT_INFO__ << "Command Result output #" << i << ": " << outputName << " = "
			              << decodeURIComponent(outputValue) << __E__;

			if(i)
				outputStr += ';';
			outputStr += outputValue;
		}

		return outputStr;
	}

}  //end runCommand()

//==============================================================================
std::string ots_mm_udp_interface::getSequenceList()
{
	__COUT__ << "getSequenceList()" << __E__;

	std::string sendMessage = "GetSequenceList";

	int numbytes;
	if((numbytes = sendto(mm_sock_,
	                      &(sendMessage.c_str()[0]),
	                      sendMessage.size(),
	                      0,
	                      (struct sockaddr*)&mm_ai_addr,
	                      sizeof(mm_ai_addr))) == -1)
	{
		__SS__ << "Error on getSequenceList() sendto!" << __E__;
		__SS_THROW__;
	}

	std::string responseXML;
	receiveXmlResponse(responseXML, "Sequence List response", 5);

	if(responseXML.size() == 0)
	{
		__SS__ << "Sequence List receive failed! Check that a MacroMaker Supervisor is "
		          "configured with UDP Remote Control enabled and accessible at "
		       << selfIPandPort_ << "." << __E__;
		__SS_THROW__;
	}

	size_t      after = 0;
	std::string sequenceListValue =
	    extractXmlField(responseXML, "FEsequences", 0, after, &after);

	std::string cleanedSequenceList;
	std::vector<std::string> rawEntries =
	    getVectorFromString(sequenceListValue, {';'});
	for(size_t i = 0; i < rawEntries.size(); ++i)
	{
		std::string entry = rawEntries[i];
		if(entry.size() > 4 &&
		   entry.substr(entry.size() - 4) == ".dat")
			entry = entry.substr(0, entry.size() - 4);
		std::string baseName = entry;
		size_t lastSlash = baseName.rfind('/');
		if(lastSlash != std::string::npos)
			baseName = baseName.substr(lastSlash + 1);
		if(baseName.empty() || baseName == "." || baseName == "..")
			continue;
		if(!cleanedSequenceList.empty())
			cleanedSequenceList += ";";
		cleanedSequenceList += entry;
	}
	return cleanedSequenceList;
}  //end getSequenceList()

//==============================================================================
std::string ots_mm_udp_interface::getSequenceInfo(const std::string& sequenceName)
{
	__COUT__ << "getSequenceInfo() for '" << sequenceName << "'" << __E__;

	std::string sendMessage = "GetSequenceInfo;" + encodeURIComponent(sequenceName);

	int numbytes;
	if((numbytes = sendto(mm_sock_,
	                      &(sendMessage.c_str()[0]),
	                      sendMessage.size(),
	                      0,
	                      (struct sockaddr*)&mm_ai_addr,
	                      sizeof(mm_ai_addr))) == -1)
	{
		__SS__ << "Error on getSequenceInfo() sendto!" << __E__;
		__SS_THROW__;
	}

	std::string responseXML;
	receiveXmlResponse(responseXML, "Sequence Info response", 5);

	if(responseXML.size() == 0 || responseXML.find("Error") == 0 ||
	   !hasCompleteXmlRoot(responseXML))
	{
		__SS__ << "Error loading sequence '" << sequenceName
		       << "'. Received: "
		       << (responseXML.size() == 0 ? "<empty>" : responseXML) << __E__;
		__SS_THROW__;
	}

	size_t after = 0;
	std::string errorMessage =
	    extractXmlField(responseXML, "Error", 0, after, &after);
	if(!errorMessage.empty())
	{
		errorMessage = decodeHTMLEntities(errorMessage);
		__SS__ << "Error loading sequence '" << sequenceName << "': "
		       << errorMessage << __E__;
		__SS_THROW__;
	}

	after = 0;
	std::string sequenceJSON =
	    extractXmlField(responseXML, "FEsequence", 0, after, &after);
	return decodeHTMLEntities(sequenceJSON);
}  //end getSequenceInfo()

//==============================================================================
// Lightweight JSON helpers for parsing sequence .dat content.
// Supports both old format (string values) and new format (object values).

namespace
{

size_t findMatchingBrace(const std::string& jsonString, size_t openBracePosition)
{
	int  depth = 1;
	bool insideQuote = false;
	for(size_t i = openBracePosition + 1; i < jsonString.size(); ++i)
	{
		char currentChar = jsonString[i];
		if(currentChar == '\\' && insideQuote)
		{
			++i;
			continue;
		}
		if(currentChar == '"')
			insideQuote = !insideQuote;
		if(!insideQuote)
		{
			if(currentChar == '{')
				++depth;
			else if(currentChar == '}')
			{
				--depth;
				if(depth == 0)
					return i;
			}
		}
	}
	return std::string::npos;
}

std::string extractJsonStringValue(const std::string& jsonString,
                                   size_t             openQuotePosition)
{
	std::string result;
	for(size_t i = openQuotePosition + 1; i < jsonString.size(); ++i)
	{
		char currentChar = jsonString[i];
		if(currentChar == '\\' && i + 1 < jsonString.size())
		{
			char nextChar = jsonString[i + 1];
			if(nextChar == '"')
				result += '"';
			else if(nextChar == '\\')
				result += '\\';
			else if(nextChar == '/')
				result += '/';
			else if(nextChar == 'n')
				result += '\n';
			else if(nextChar == 't')
				result += '\t';
			else if(nextChar == 'r')
				result += '\r';
			else
			{
				result += currentChar;
				result += nextChar;
			}
			++i;
			continue;
		}
		if(currentChar == '"')
			break;
		result += currentChar;
	}
	return result;
}

size_t findClosingQuote(const std::string& jsonString, size_t openQuotePosition)
{
	for(size_t i = openQuotePosition + 1; i < jsonString.size(); ++i)
	{
		if(jsonString[i] == '\\')
		{
			++i;
			continue;
		}
		if(jsonString[i] == '"')
			return i;
	}
	return std::string::npos;
}

std::string extractFieldFromObject(const std::string& objectJSON,
                                   const std::string& fieldName)
{
	std::string searchPattern = "\"" + fieldName + "\"";
	size_t      fieldPosition = objectJSON.find(searchPattern);
	if(fieldPosition == std::string::npos)
		return "";

	size_t colonPosition = objectJSON.find(':', fieldPosition + searchPattern.size());
	if(colonPosition == std::string::npos)
		return "";

	size_t valueStart = colonPosition + 1;
	while(valueStart < objectJSON.size() && objectJSON[valueStart] == ' ')
		++valueStart;
	if(valueStart >= objectJSON.size())
		return "";

	if(objectJSON[valueStart] == '"')
		return extractJsonStringValue(objectJSON, valueStart);

	size_t valueEnd = objectJSON.find_first_of(",}", valueStart);
	if(valueEnd == std::string::npos)
		valueEnd = objectJSON.size();
	return objectJSON.substr(valueStart, valueEnd - valueStart);
}

struct SequenceCommand
{
	std::string feClass;
	std::string feUID;
	std::string macroType;
	std::string macroName;
	std::string inputArgs;
	std::string outputArgs;
	std::string saveOutputs;
};

struct SequenceVariable
{
	std::string value;
	std::string step;
	std::string max;
};

SequenceCommand parseCommandObject(const std::string& objectJSON)
{
	SequenceCommand command;
	command.feClass     = extractFieldFromObject(objectJSON, "feClass");
	command.feUID       = extractFieldFromObject(objectJSON, "feUID");
	command.macroType   = extractFieldFromObject(objectJSON, "macroType");
	command.macroName   = extractFieldFromObject(objectJSON, "macroName");
	command.inputArgs   = extractFieldFromObject(objectJSON, "inputArgs");
	command.outputArgs  = extractFieldFromObject(objectJSON, "outputArgs");
	command.saveOutputs = extractFieldFromObject(objectJSON, "saveOutputs");
	if(command.saveOutputs.empty())
		command.saveOutputs = "0";
	return command;
}

void parseSequenceJSON(
    const std::string&                                   sequenceJSON,
    std::map<unsigned int, SequenceCommand>&              commandMap,
    std::vector<std::pair<std::string, SequenceVariable>>& variableList)
{
	if(sequenceJSON.empty())
		return;

	size_t outerOpen = sequenceJSON.find('{');
	if(outerOpen == std::string::npos)
		return;

	size_t position = outerOpen + 1;
	while(position < sequenceJSON.size())
	{
		size_t keyStart = sequenceJSON.find('"', position);
		if(keyStart == std::string::npos)
			break;
		size_t keyEnd = findClosingQuote(sequenceJSON, keyStart);
		if(keyEnd == std::string::npos)
			break;

		std::string key = sequenceJSON.substr(keyStart + 1, keyEnd - keyStart - 1);

		size_t colonPosition = sequenceJSON.find(':', keyEnd + 1);
		if(colonPosition == std::string::npos)
			break;

		size_t valueStart = colonPosition + 1;
		while(valueStart < sequenceJSON.size() && sequenceJSON[valueStart] == ' ')
			++valueStart;

		if(key == "__variables__")
		{
			if(sequenceJSON[valueStart] == '{')
			{
				size_t variablesEnd =
				    findMatchingBrace(sequenceJSON, valueStart);
				if(variablesEnd == std::string::npos)
					break;
				std::string variablesBlock =
				    sequenceJSON.substr(valueStart, variablesEnd - valueStart + 1);

				size_t variablePosition = 1;
				while(variablePosition < variablesBlock.size())
				{
					size_t variableNameStart =
					    variablesBlock.find('"', variablePosition);
					if(variableNameStart == std::string::npos)
						break;
					size_t variableNameEnd =
					    findClosingQuote(variablesBlock, variableNameStart);
					if(variableNameEnd == std::string::npos)
						break;
					std::string variableName = variablesBlock.substr(
					    variableNameStart + 1,
					    variableNameEnd - variableNameStart - 1);

					size_t variableColon =
					    variablesBlock.find(':', variableNameEnd + 1);
					if(variableColon == std::string::npos)
						break;
					size_t variableObjectStart =
					    variablesBlock.find('{', variableColon + 1);
					if(variableObjectStart == std::string::npos)
						break;
					size_t variableObjectEnd =
					    findMatchingBrace(variablesBlock, variableObjectStart);
					if(variableObjectEnd == std::string::npos)
						break;

					std::string variableObjectJSON = variablesBlock.substr(
					    variableObjectStart,
					    variableObjectEnd - variableObjectStart + 1);

					SequenceVariable sequenceVariable;
					sequenceVariable.value =
					    extractFieldFromObject(variableObjectJSON, "value");
					sequenceVariable.step =
					    extractFieldFromObject(variableObjectJSON, "step");
					sequenceVariable.max =
					    extractFieldFromObject(variableObjectJSON, "max");
					variableList.push_back({variableName, sequenceVariable});

					variablePosition = variableObjectEnd + 1;
				}
				position = variablesEnd + 1;
			}
			else
			{
				position = valueStart + 1;
			}
			continue;
		}

		bool isNumericKey = !key.empty();
		for(size_t i = 0; i < key.size() && isNumericKey; ++i)
			if(key[i] < '0' || key[i] > '9')
				isNumericKey = false;

		if(!isNumericKey)
		{
			if(sequenceJSON[valueStart] == '{')
			{
				size_t skipEnd = findMatchingBrace(sequenceJSON, valueStart);
				position = (skipEnd != std::string::npos) ? skipEnd + 1 : valueStart + 1;
			}
			else if(sequenceJSON[valueStart] == '"')
			{
				size_t skipEnd = findClosingQuote(sequenceJSON, valueStart);
				position = (skipEnd != std::string::npos) ? skipEnd + 1 : valueStart + 1;
			}
			else
			{
				position = sequenceJSON.find_first_of(",}", valueStart);
				if(position == std::string::npos)
					break;
			}
			continue;
		}

		unsigned int stepIndex = std::stoul(key);

		if(sequenceJSON[valueStart] == '"')
		{
			std::string commandObjectJSON =
			    extractJsonStringValue(sequenceJSON, valueStart);
			commandMap[stepIndex] = parseCommandObject(commandObjectJSON);
			size_t closingQuote = findClosingQuote(sequenceJSON, valueStart);
			position =
			    (closingQuote != std::string::npos) ? closingQuote + 1 : valueStart + 1;
		}
		else if(sequenceJSON[valueStart] == '{')
		{
			size_t objectEnd = findMatchingBrace(sequenceJSON, valueStart);
			if(objectEnd == std::string::npos)
				break;
			std::string commandObjectJSON =
			    sequenceJSON.substr(valueStart, objectEnd - valueStart + 1);
			commandMap[stepIndex] = parseCommandObject(commandObjectJSON);
			position = objectEnd + 1;
		}
		else
		{
			position = sequenceJSON.find_first_of(",}", valueStart);
			if(position == std::string::npos)
				break;
		}
	}
}  //end parseSequenceJSON()

struct SplitNumericResult
{
	double      numericPart;
	std::string unitSuffix;
	bool        isValid;
};

SplitNumericResult splitNumericValue(const std::string& valueString)
{
	static const std::regex numericPattern(
	    "^\\s*([-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:[eE][-+]?\\d+)?)\\s*([a-zA-Z]*)\\s*$");
	std::smatch matchResult;
	SplitNumericResult result;
	result.isValid = false;
	if(std::regex_match(valueString, matchResult, numericPattern))
	{
		result.numericPart = std::stod(matchResult[1].str());
		result.unitSuffix  = matchResult[2].str();
		result.isValid     = true;
	}
	return result;
}

std::string substituteSequenceVariables(
    const std::string&                                            inputArgs,
    const std::vector<std::pair<std::string, SequenceVariable>>&  variableList,
    unsigned int                                                  currentIteration)
{
	if(variableList.empty())
		return inputArgs;

	std::vector<std::string> pairs =
	    getVectorFromString(inputArgs, {';'}, {} /*whitespace*/);
	std::string result;

	for(size_t pairIndex = 0; pairIndex < pairs.size(); ++pairIndex)
	{
		if(pairIndex > 0)
			result += ";";

		std::vector<std::string> nameAndValue =
		    getVectorFromString(pairs[pairIndex], {','}, {} /*whitespace*/);
		if(nameAndValue.size() < 2)
		{
			result += pairs[pairIndex];
			continue;
		}

		std::string decodedValue =
		    ots_mm_udp_interface::decodeURIComponent(nameAndValue[1]);

		for(size_t variableIndex = 0;
		    variableIndex < variableList.size();
		    ++variableIndex)
		{
			const std::string&    variableName     = variableList[variableIndex].first;
			const SequenceVariable& sequenceVariable = variableList[variableIndex].second;

			size_t searchPosition = 0;
			while((searchPosition = decodedValue.find(variableName, searchPosition)) !=
			      std::string::npos)
			{
				std::string effectiveValue = sequenceVariable.value;

				if(currentIteration > 0)
				{
					SplitNumericResult valueParts =
					    splitNumericValue(sequenceVariable.value);
					double stepValue = 0;
					try
					{
						stepValue = std::stod(sequenceVariable.step);
					}
					catch(...)
					{
					}

					if(valueParts.isValid && stepValue != 0)
					{
						double computedValue =
						    valueParts.numericPart + currentIteration * stepValue;
						SplitNumericResult maxParts =
						    splitNumericValue(sequenceVariable.max);
						if(maxParts.isValid)
						{
							if(stepValue > 0 && computedValue > maxParts.numericPart)
								computedValue = maxParts.numericPart;
							else if(stepValue < 0 &&
							        computedValue < maxParts.numericPart)
								computedValue = maxParts.numericPart;
						}

						std::ostringstream precisionStream;
						precisionStream << std::setprecision(12)
						                << computedValue;
						effectiveValue =
						    precisionStream.str() + valueParts.unitSuffix;
					}
				}

				decodedValue.replace(
				    searchPosition, variableName.size(), effectiveValue);
				searchPosition += effectiveValue.size();
			}
		}

		result += nameAndValue[0] + "," +
		          ots_mm_udp_interface::encodeURIComponent(decodedValue);
	}
	return result;
}  //end substituteSequenceVariables()

}  //end anonymous namespace

//==============================================================================
std::string ots_mm_udp_interface::runSequence(
    const std::string& sequenceName,
    const std::string& variablesJSON,
    unsigned int       iterationCount)
{
	__COUT_INFO__ << "runSequence() '" << sequenceName << "' for " << iterationCount
	              << " iteration(s)" << __E__;

	std::string sequenceJSON = getSequenceInfo(sequenceName);
	__COUTV__(sequenceJSON.size());

	std::map<unsigned int, SequenceCommand>              commandMap;
	std::vector<std::pair<std::string, SequenceVariable>> variableList;
	parseSequenceJSON(sequenceJSON, commandMap, variableList);

	__COUT_INFO__ << "Parsed " << commandMap.size() << " step(s) and "
	              << variableList.size() << " variable(s)" << __E__;

	if(!variablesJSON.empty() && variablesJSON != "{}")
	{
		std::map<unsigned int, SequenceCommand>               unusedCommands;
		std::vector<std::pair<std::string, SequenceVariable>> overrideVariables;
		parseSequenceJSON("{\"__variables__\":" + variablesJSON + "}",
		                  unusedCommands,
		                  overrideVariables);
		for(size_t overrideIndex = 0;
		    overrideIndex < overrideVariables.size();
		    ++overrideIndex)
		{
			for(size_t variableIndex = 0;
			    variableIndex < variableList.size();
			    ++variableIndex)
			{
				if(variableList[variableIndex].first ==
				   overrideVariables[overrideIndex].first)
				{
					variableList[variableIndex].second =
					    overrideVariables[overrideIndex].second;
					break;
				}
			}
		}
	}

	std::string accumulatedOutput;
	unsigned int totalSteps = commandMap.size() * iterationCount;
	unsigned int completedSteps = 0;

	for(unsigned int iterationIndex = 0;
	    iterationIndex < iterationCount;
	    ++iterationIndex)
	{
		if(iterationCount > 1)
			__COUT_INFO__ << "\n=== Iteration " << (iterationIndex + 1) << " of "
			              << iterationCount << " ===" << __E__;

		for(auto& commandEntry : commandMap)
		{
			unsigned int   stepIndex = commandEntry.first;
			SequenceCommand& command  = commandEntry.second;
			++completedSteps;

			if(command.macroType == "__delay__")
			{
				std::vector<std::string> delayParts =
				    getVectorFromString(command.inputArgs, {','}, {} /*whitespace*/);
				double delaySeconds = 0;
				if(delayParts.size() > 1)
				{
					try
					{
						delaySeconds =
						    std::stod(decodeURIComponent(delayParts[1]));
					}
					catch(...)
					{
					}
				}

				__COUT_INFO__ << "  [" << completedSteps << "/" << totalSteps
				              << "] Delay " << delaySeconds << "s..." << __E__;
				if(delaySeconds > 0)
					usleep(static_cast<useconds_t>(delaySeconds * 1000000));
				continue;
			}

			if(command.macroType == "__mom__")
			{
				std::string innerSequenceName = command.macroName;
				std::vector<std::string> momIterParts =
				    getVectorFromString(command.inputArgs, {','}, {} /*whitespace*/);
				unsigned int innerIterationCount = 1;
				if(momIterParts.size() > 1)
				{
					try
					{
						innerIterationCount =
						    std::stoul(decodeURIComponent(momIterParts[1]));
					}
					catch(...)
					{
					}
				}
				if(innerIterationCount < 1)
					innerIterationCount = 1;

				__COUT_INFO__ << "  [" << completedSteps << "/" << totalSteps
				              << "] Nested MoM: " << innerSequenceName << " x"
				              << innerIterationCount << __E__;

				std::string innerResult =
				    runSequence(innerSequenceName, variablesJSON, innerIterationCount);
				if(!innerResult.empty())
				{
					if(!accumulatedOutput.empty())
						accumulatedOutput += "\n";
					accumulatedOutput += innerResult;
				}
				continue;
			}

			__COUT_INFO__ << "  [" << completedSteps << "/" << totalSteps
			              << "] " << command.macroName << " on "
			              << command.feUID << " (" << command.feClass << ")"
			              << __E__;

			std::string reconciledInputArgs  = command.inputArgs;
			std::string reconciledOutputArgs = command.outputArgs;

			{
				std::string lookupFeUID = command.feUID;
				if(lookupFeUID == "*")
				{
					getFrontendMacroInfo();
					std::string xmlValue;
					size_t      xmlAfter = 0;
					while((xmlValue = extractXmlField(
					           fullXML_, "FEMacros", 0, xmlAfter, &xmlAfter)) != "")
					{
						std::vector<std::string> xmlFields =
						    getVectorFromString(xmlValue, {';'});
						if(xmlFields.size() < 6)
							continue;
						if(command.feClass != "*" &&
						   xmlFields[2] != command.feClass)
							continue;

						unsigned int fieldIndex = 4;
						bool foundMacro = false;
						while(xmlFields.size() > fieldIndex + 5)
						{
							if(xmlFields[fieldIndex] == command.macroName)
							{
								foundMacro = true;
								break;
							}
							fieldIndex += 3 + 1 +
							    atoi(xmlFields[fieldIndex + 3].c_str());
							if(xmlFields.size() <= fieldIndex)
								break;
							fieldIndex += 1 +
							    atoi(xmlFields[fieldIndex].c_str());
						}
						if(foundMacro)
						{
							lookupFeUID = xmlFields[3];
							break;
						}
					}
					if(lookupFeUID == "*")
					{
						__COUT_WARN__ << "    Could not resolve wildcard FE for macro '"
						              << command.macroName
						              << "', skipping reconciliation" << __E__;
					}
				}

				if(lookupFeUID != "*")
				{
					unsigned int currentInputCount =
					    getCommandInputCount(lookupFeUID, command.macroName);
					std::vector<std::string> savedInputPairs =
					    getVectorFromString(command.inputArgs, {';'}, {} /*whitespace*/);

					if(currentInputCount != savedInputPairs.size())
					{
						__COUT_INFO__ << "    Reconciling inputs: sequence has "
						              << savedInputPairs.size() << ", FE expects "
						              << currentInputCount << __E__;

						std::map<std::string, std::string> savedInputsByName;
						for(size_t savedIndex = 0;
						    savedIndex < savedInputPairs.size();
						    ++savedIndex)
						{
							std::vector<std::string> nameAndValue =
							    getVectorFromString(
							        savedInputPairs[savedIndex], {','}, {} /*whitespace*/);
							if(nameAndValue.size() >= 2)
								savedInputsByName[decodeURIComponent(nameAndValue[0])] =
								    nameAndValue[1];
						}

						reconciledInputArgs.clear();
						for(unsigned int inputIndex = 0;
						    inputIndex < currentInputCount;
						    ++inputIndex)
						{
							std::string currentInputName =
							    getCommandInputName(
							        lookupFeUID, command.macroName, inputIndex);
							if(inputIndex > 0)
								reconciledInputArgs += ";";
							reconciledInputArgs += encodeURIComponent(currentInputName) + ",";
							auto savedEntry = savedInputsByName.find(currentInputName);
							if(savedEntry != savedInputsByName.end())
								reconciledInputArgs += savedEntry->second;
							else
								reconciledInputArgs += encodeURIComponent("Default");
						}
					}

					unsigned int currentOutputCount =
					    getCommandOutputCount(lookupFeUID, command.macroName);
					std::vector<std::string> savedOutputParts =
					    getVectorFromString(command.outputArgs, {','}, {} /*whitespace*/);

					if(currentOutputCount != savedOutputParts.size())
					{
						__COUT_INFO__ << "    Reconciling outputs: sequence has "
						              << savedOutputParts.size() << ", FE expects "
						              << currentOutputCount << __E__;

						reconciledOutputArgs.clear();
						for(unsigned int outputIndex = 0;
						    outputIndex < currentOutputCount;
						    ++outputIndex)
						{
							std::string currentOutputName =
							    getCommandOutputName(
							        lookupFeUID, command.macroName, outputIndex);
							if(outputIndex > 0)
								reconciledOutputArgs += ",";
							reconciledOutputArgs += encodeURIComponent(currentOutputName);
						}
					}
				}
			}

			std::string substitutedInputArgs = substituteSequenceVariables(
			    reconciledInputArgs, variableList, iterationIndex);

			std::string sendMessage = "RunFrontendMacro";
			sendMessage += ";" + command.feClass;
			sendMessage += ";" + command.feUID;
			sendMessage += ";" + command.macroType;
			sendMessage += ";" + encodeURIComponent(command.macroName);
			sendMessage += ";" + encodeURIComponent(substitutedInputArgs);
			sendMessage += ";" + encodeURIComponent(reconciledOutputArgs);
			sendMessage += std::string(";") + (command.saveOutputs == "1" ? "1" : "0");

			__COUTV__(sendMessage.size());

			int numbytes;
			if((numbytes = sendto(mm_sock_,
			                      &(sendMessage.c_str()[0]),
			                      sendMessage.size(),
			                      0,
			                      (struct sockaddr*)&mm_ai_addr,
			                      sizeof(mm_ai_addr))) == -1)
			{
				__SS__ << "Error on runSequence() sendto for step " << stepIndex
				       << " (" << command.macroName << ")!" << __E__;
				__SS_THROW__;
			}

			std::string runXML;
			receiveXmlResponse(runXML, "sequence step response", 120);

			if(runXML.size() == 0 || runXML.find("Error") == 0 ||
			   !hasCompleteXmlRoot(runXML))
			{
				__SS__ << "Error running sequence step " << stepIndex << " ("
				       << command.macroName << "): "
				       << (runXML.size() == 0 ? "<empty>" : runXML) << __E__;
				__SS_THROW__;
			}

			size_t      parseAfter = 0;
			std::string errorMessage =
			    extractXmlField(runXML, "Error", 0, parseAfter, &parseAfter);
			if(!errorMessage.empty())
			{
				errorMessage = decodeHTMLEntities(errorMessage);
				__SS__ << "Error at sequence step " << stepIndex << " ("
				       << command.macroName << "): " << errorMessage << __E__;
				__SS_THROW__;
			}

			parseAfter = 0;
			std::string outputName;
			while((outputName = extractXmlField(
			           runXML, "outputArgs_name", 0, parseAfter, &parseAfter)) != "")
			{
				std::string outputValue =
				    extractXmlField(runXML, "outputArgs_value", 0, parseAfter, &parseAfter);
				__COUT_INFO__ << "    Output: " << outputName << " = "
				              << decodeURIComponent(outputValue) << __E__;
				if(!accumulatedOutput.empty())
					accumulatedOutput += ";";
				accumulatedOutput += outputValue;
			}
		}
	}

	__COUT_INFO__ << "Sequence '" << sequenceName << "' completed." << __E__;
	return accumulatedOutput;
}  //end runSequence()

//==============================================================================
std::string ots_mm_udp_interface::describeSequence(const std::string& sequenceJSON)
{
	std::map<unsigned int, SequenceCommand>               commandMap;
	std::vector<std::pair<std::string, SequenceVariable>> variableList;
	parseSequenceJSON(sequenceJSON, commandMap, variableList);

	std::ostringstream description;

	description << "Steps (" << commandMap.size() << "):\n";

	for(auto& commandEntry : commandMap)
	{
		unsigned int           stepIndex = commandEntry.first;
		const SequenceCommand& command   = commandEntry.second;

		description << "  Step " << stepIndex << ": ";

		if(command.macroType == "__delay__")
		{
			std::vector<std::string> delayParts =
			    getVectorFromString(command.inputArgs, {','}, {} /*whitespace*/);
			std::string delayValue = "?";
			if(delayParts.size() > 1)
				delayValue = decodeURIComponent(delayParts[1]);
			description << "[Delay " << delayValue << "s]\n";
			continue;
		}

		if(command.macroType == "__mom__")
		{
			std::vector<std::string> momParts =
			    getVectorFromString(command.inputArgs, {','}, {} /*whitespace*/);
			std::string innerIterations = "1";
			if(momParts.size() > 1)
				innerIterations = decodeURIComponent(momParts[1]);
			description << "[Nested MoM: " << command.macroName
			            << " x" << innerIterations << "]\n";
			continue;
		}

		description << command.macroName << "  on  " << command.feUID
		            << " (" << command.feClass << ")\n";

		std::vector<std::string> inputPairs =
		    getVectorFromString(command.inputArgs, {';'}, {} /*whitespace*/);
		for(size_t inputIndex = 0; inputIndex < inputPairs.size(); ++inputIndex)
		{
			std::vector<std::string> nameAndValue =
			    getVectorFromString(inputPairs[inputIndex], {','}, {} /*whitespace*/);
			if(nameAndValue.size() >= 2)
				description << "      Input:  " << decodeURIComponent(nameAndValue[0])
				            << " = " << decodeURIComponent(nameAndValue[1]) << "\n";
			else if(nameAndValue.size() == 1 && !nameAndValue[0].empty())
				description << "      Input:  " << decodeURIComponent(nameAndValue[0])
				            << "\n";
		}

		std::vector<std::string> outputPairs =
		    getVectorFromString(command.outputArgs, {';'}, {} /*whitespace*/);
		for(size_t outputIndex = 0; outputIndex < outputPairs.size(); ++outputIndex)
		{
			std::vector<std::string> nameAndValue =
			    getVectorFromString(outputPairs[outputIndex], {','}, {} /*whitespace*/);
			if(!nameAndValue.empty() && !nameAndValue[0].empty())
				description << "      Output: " << decodeURIComponent(nameAndValue[0])
				            << (command.saveOutputs == "1" ? " (saved)" : "")
				            << "\n";
		}
	}

	if(!variableList.empty())
	{
		description << "\nInput Variables (" << variableList.size() << "):\n";

		size_t maxNameWidth  = 0;
		size_t maxValueWidth = 0;
		size_t maxStepWidth  = 0;
		for(size_t variableIndex = 0;
		    variableIndex < variableList.size();
		    ++variableIndex)
		{
			if(variableList[variableIndex].first.size() > maxNameWidth)
				maxNameWidth = variableList[variableIndex].first.size();
			if(variableList[variableIndex].second.value.size() > maxValueWidth)
				maxValueWidth = variableList[variableIndex].second.value.size();
			if(variableList[variableIndex].second.step.size() > maxStepWidth)
				maxStepWidth = variableList[variableIndex].second.step.size();
		}

		for(size_t variableIndex = 0;
		    variableIndex < variableList.size();
		    ++variableIndex)
		{
			const std::string&       variableName     = variableList[variableIndex].first;
			const SequenceVariable&  sequenceVariable = variableList[variableIndex].second;
			description << "  #" << variableIndex << "  "
			            << std::left << std::setw(maxNameWidth) << variableName
			            << ":  value=" << std::setw(maxValueWidth) << sequenceVariable.value
			            << "  step=" << std::setw(maxStepWidth) << sequenceVariable.step
			            << "  max=" << sequenceVariable.max << "\n";
		}
	}
	else
	{
		description << "\nNo Input Variables.\n";
	}

	return description.str();
}  //end describeSequence()
