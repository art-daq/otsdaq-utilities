/// MF_ReceiveAndForward.cpp
///    by rrivera at fnal dot gov
///	  created Feb 2016
///
/// 	This is a simple UDP receive and forward program
///		for MessageFacility packets.
///
///	It echos packets received and only appends '|' as decoration.
///
///
///
///
/// compile with:
/// g++ MF_ReceiveAndForward.cpp -o MF_ReceiveAndForward.o
///
/// if developing, consider appending -D_GLIBCXX_DEBUG to get more
/// descriptive error messages
///
/// run with:
///./MF_ReceiveAndForward.o <optional port file name>
///
///
///	Port Config File Format:
///		RECEIVING_PORT 	<port number>
///		FORWARDING_PORT <port number>
///
///
///
#include <arpa/inet.h>
#include <errno.h>
#include <netdb.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <unistd.h>
#include <iostream>
#include <map>

#define MAXBUFLEN 5000

#define __MF_SUBJECT__ "mfReceiveAndForward"

#define __SHORTFILE__                                   \
	(__builtin_strstr(&__FILE__[0], "/srcs/")           \
	     ? __builtin_strstr(&__FILE__[0], "/srcs/") + 6 \
	     : __FILE__)
#define __COUT_HDR_L__ "[" << std::dec << __LINE__ << " |\t"
#define __COUT_HDR_FL__ __SHORTFILE__ << " " << __COUT_HDR_L__

#define __COUT_TYPE__(X) std::cout << QUOTE(X) << ":" << __MF_SUBJECT__ << ":"
#define __COUT_ERR__ __COUT_TYPE__(LogError) << __COUT_HDR_FL__
#define __COUT_WARN__ __COUT_TYPE__(LogWarning) << __COUT_HDR_FL__
#define __COUT_INFO__ __COUT_TYPE__(LogInfo) << __COUT_HDR_FL__
#define __COUT__ __COUT_TYPE__(LogDebug) << __COUT_HDR_FL__

#define __SS__            \
	std::stringstream ss; \
	ss << "|" << __MF_DECOR__ << ": " << __COUT_HDR_FL__
#define __SS_THROW__                        \
	{                                       \
		__COUT_ERR__ << "\n" << ss.str();   \
		throw std::runtime_error(ss.str()); \
	}  //put in {}'s to prevent surprises, e.g. if ... else __SS_THROW__;
#define __E__ std::endl
#define Q(X) #X
#define QUOTE(X) Q(X)
#define __COUTV__(X) __COUT__ << QUOTE(X) << " = " << X << __E__

/// get sockaddr, IPv4 or IPv6:
void* get_in_addr(struct sockaddr* sa)
{
	if(sa->sa_family == AF_INET)
	{
		return &(((struct sockaddr_in*)sa)->sin_addr);
	}

	return &(((struct sockaddr_in6*)sa)->sin6_addr);
}

int makeSocket(const char* ip, int port, struct addrinfo*& p)
{
	int             sockfd;
	struct addrinfo hints, *servinfo;
	int             rv;
	// char                    s[INET6_ADDRSTRLEN];

	memset(&hints, 0, sizeof hints);
	hints.ai_family   = AF_UNSPEC;
	hints.ai_socktype = SOCK_DGRAM;
	char portStr[10];
	sprintf(portStr, "%d", port);
	if((rv = getaddrinfo(ip, portStr, &hints, &servinfo)) != 0)
	{
		fprintf(stderr, "getaddrinfo: %s\n", gai_strerror(rv));
		return 1;
	}

	// loop through all the results and make a socket
	for(p = servinfo; p != NULL; p = p->ai_next)
	{
		if((sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol)) == -1)
		{
			perror("sw: socket");
			continue;
		}

		break;
	}

	if(p == NULL)
	{
		fprintf(stderr, "sw: failed to create socket\n");
		return 2;
	}

	freeaddrinfo(servinfo);

	return sockfd;
}

int main(int argc, char** argv)
{
	__COUT__ << "Starting...\n\n" << __E__;

	std::string myPort_("3000");             // set default
	std::string myFwdPort_("3001");          // set default
	std::string myFwdIP_("127.0.0.1");       // set default
	std::string enablePrintouts_("do not");  // set default
	if(argc >= 2)
	{
		__COUT__ << "port parameter file:" << argv[1] << "\n\n" << __E__;
		FILE* fp = fopen(argv[1], "r");
		if(fp)
		{
			char tmp[100];
			char tmpParamStr[100];
			fgets(tmp, 100, fp);
			sscanf(tmp, "%*s %s", tmpParamStr);
			myPort_ = tmpParamStr;
			fgets(tmp, 100, fp);
			sscanf(tmp, "%*s %s", tmpParamStr);
			myFwdPort_ = tmpParamStr;
			fgets(tmp, 100, fp);
			sscanf(tmp, "%*s %s", tmpParamStr);
			myFwdIP_ = tmpParamStr;
			fgets(tmp, 100, fp);
			sscanf(tmp, "%*s %s", tmpParamStr);
			enablePrintouts_ = tmpParamStr;
			fclose(fp);
		}
		else  // else use defaults
			__COUT__ << "port parameter file failed to open: " << argv[1] << "\n\n"
			         << __E__;
	}
	__COUT__ << "Forwarding from: " << myPort_ << " to: " << myFwdIP_ << ":" << myFwdPort_
	         << "\n\n"
	         << __E__;

	int myFwdPort;
	sscanf(myFwdPort_.c_str(), "%d", &myFwdPort);

	bool enablePrintouts = enablePrintouts_ == "enablePrintouts";

	int sockfd;
	int sendSockfd = 0;

	struct addrinfo         hints, *servinfo, *p;
	int                     rv;
	int                     recvBytes, sentBytes;
	struct sockaddr_storage their_addr;
	char                    buff[MAXBUFLEN * 3];
	socklen_t               addr_len;
	// char                    s[INET6_ADDRSTRLEN];

	memset(&hints, 0, sizeof hints);
	hints.ai_family   = AF_UNSPEC;  // set to AF_INET to force IPv4
	hints.ai_socktype = SOCK_DGRAM;
	hints.ai_flags    = AI_PASSIVE;  // use my IP

	if((rv = getaddrinfo(NULL, myPort_.c_str(), &hints, &servinfo)) != 0)
	{
		fprintf(stderr, "getaddrinfo: %s\n", gai_strerror(rv));
		return 1;
	}

	// loop through all the results and bind to the first we can
	for(p = servinfo; p != NULL; p = p->ai_next)
	{
		if((sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol)) == -1)
		{
			__COUT__ << "listener: socket...\n\n" << __E__;
			perror("listener: socket");
			continue;
		}

		if(bind(sockfd, p->ai_addr, p->ai_addrlen) < 0)
		{
			close(sockfd);
			__COUT__ << "listener: bind.\n\n" << __E__;
			perror("listener: bind");
			continue;
		}

		break;
	}

	if(p == NULL)
	{
		__COUT__ << "listener: failed to bind socket...\n\n" << __E__;
		fprintf(stderr, "listener: failed to bind socket\n");
		return 2;
	}

	freeaddrinfo(servinfo);

	// increase socket buffer size
	unsigned int socketReceiveBufferSize = 0x1400000;
	if(setsockopt(sockfd,
	              SOL_SOCKET,
	              SO_RCVBUF,
	              (char*)&socketReceiveBufferSize,
	              sizeof(socketReceiveBufferSize)) < 0)
		__COUT_ERR__ << "Failed to set socket receive size to 0x" << std::hex
		             << socketReceiveBufferSize << std::dec
		             << ". Attempting to revert to default." << std::endl;
	else
		__COUT__ << "set socket receive size to 0x" << std::hex << socketReceiveBufferSize
		         << std::dec << "." << __E__;

	int       socketLength       = 0;
	socklen_t sizeOfSocketLength = sizeof(socketLength);
	if(getsockopt(sockfd, SOL_SOCKET, SO_RCVBUF, &socketLength, &sizeOfSocketLength) < 0)
		__COUT_ERR__ << "Failed to set socket receive size to 0x" << std::hex
		             << socketReceiveBufferSize << std::dec
		             << ". Attempting to revert to default." << std::endl;
	else
		__COUT__ << "set socket receive size verified at 0x" << std::hex << socketLength
		         << std::dec << "." << __E__;

	//////////////////////////////////////////////////////////////////////
	////////////// ready to go //////////////
	//////////////////////////////////////////////////////////////////////

	// hardware "registers"
	// uint64_t data_gen_cnt  = 0;
	// uint64_t data_gen_rate = 1 << 16;
	// uint8_t  dataEnabled   = 0;

	// const unsigned int RX_ADDR_OFFSET = 2;
	// const unsigned int RX_DATA_OFFSET = 10;
	// const unsigned int TX_DATA_OFFSET = 2;

	// unsigned int packetSz;
	unsigned int pingCounter = 0;

	// for timeout/select
	struct timeval tv;
	fd_set         readfds, masterfds;
	tv.tv_sec  = 0;
	tv.tv_usec = 500000;
	FD_ZERO(&masterfds);
	FD_SET(sockfd, &masterfds);

	// time_t count = 0;

	int          mf_p, mf_i, mf_j;  // for extracting message
	const int    MF_POS_OF_ID   = 2;
	const int    MF_POS_OF_TYPE = 5;
	const int    MF_POS_OF_MSG  = 11;
	bool         firstPartPresent;
	unsigned int buffi = 0, buffStarti = 0, packCount = 1;
	char         saveChar = '\0', saveChar2;

	int          mf_labeli, mf_labelsi;
	unsigned int newSequenceId;
	unsigned int processId;

	std::map<unsigned int, unsigned int> sourceLastSequenceID;  // map from sourceID to
	                                                            // lastSequenceID to
	// identify missed messages

	// this should ip/port of Console xdaq app Receiver port
	sendSockfd = makeSocket(myFwdIP_.c_str(), myFwdPort, p);

	while(1)
	{
		readfds = masterfds;  // copy to reset timeout select
		select(sockfd + 1, &readfds, NULL, NULL, &tv);

		if(FD_ISSET(sockfd, &readfds))
		{
			pingCounter = 0;  // reset ping counter

			// packet received
			// cout << "hw: Line " << __LINE__ << ":::" << "Packet Received!" << endl;

			addr_len = sizeof their_addr;
			if((recvBytes = recvfrom(sockfd,
			                         &buff[buffi],
			                         MAXBUFLEN - 1,
			                         0,
			                         (struct sockaddr*)&their_addr,
			                         &addr_len)) == -1)
			{
				__COUT__ << "error: recvfrom...\n\n" << __E__;
				perror("recvfrom");
				exit(1);
			}

			//			printf("hw: got packet from %s\n",
			//				inet_ntop(their_addr.ss_family,
			//					get_in_addr((struct sockaddr *)&their_addr),
			//					s, sizeof s));
			//			printf("hw: packet is %d bytes long\n", recvBytes);
			//			printf("packet contents: ");
			//
			//			for(int i=0;i<recvBytes;++i)
			//			{
			//				if((i-RX_ADDR_OFFSET)%8==0) printf("\n");
			//				printf("%2.2X", (unsigned char)buff[i]);
			//			}
			//			printf("\n");

			// print message without decoration
			// find position of message and save to p
			// by jumping to the correct '|' marker
			buff[buffi + recvBytes] = '\0';  // make sure it is null terminated

			// DEBUG -- for identifying strange MessageFacility bug with clipped messages
			// std::cout << "+" << ((int)strlen(buff)==recvBytes?1:0) << " " << buff <<
			// __E__; 			if((int)strlen(buff)!=recvBytes)
			//			{
			//				for(int iii=strlen(buff)-3;iii<recvBytes;++iii)
			//					std::cout << (int)buff[iii] << "-" << (char)buff[iii] << "
			//"; 				std::cout << recvBytes << " " << strlen(buff) << __E__;
			//				std::cout << __E__;
			//			}

			// count markers to find message

			if(enablePrintouts)
				std::cout << "|||" << &buff[buffi] << __E__;  // show all
			// e.g. UDPMFMESSAGE7370|01-Jul-2019 11:12:44
			// CDT|3|correlator2.fnal.gov|131.225.52.45|Info|_TCPConnect|xdaq.exe|7370|Booted|DAQ|TCPConnect.cc|241|Resolving
			// ip correlator2.fnal.gov

			if(1)
			{
				// get sequence ID
				mf_labeli  = 0;
				mf_labelsi = 0;
				for(mf_p = 0, mf_i = 0; mf_i < recvBytes && mf_p < MF_POS_OF_ID; ++mf_i)
					if(buff[buffi + mf_i] == '|')
					{
						++mf_p;  // count markers
						if(!mf_labeli)
							mf_labeli = mf_i;
					}
					else if(!mf_labeli &&
					        !(buff[buffi + mf_i] >= '0' && buff[buffi + mf_i] <= '9'))
						mf_labelsi = mf_i;
				for(mf_j = mf_i; mf_j < recvBytes; ++mf_j)
					if(buff[buffi + mf_j] == '|')
					{
						break;
					}

				saveChar2               = buff[buffi + mf_labeli];
				buff[buffi + mf_labeli] = '\0';
				if(mf_j < recvBytes)
				{
					saveChar           = buff[buffi + mf_j];
					buff[buffi + mf_j] = '\0';
				}
				newSequenceId = atoi(&buff[buffi + mf_i]);
				processId     = atoi(&buff[buffi + mf_labelsi + 1]);

				// std::cout << processId << ": " <<
				// 	&buff[buffi + mf_i] << " ==> " << newSequenceId << __E__;
				// avoid startup sequencing problem with MF
				if(  //(newSequenceId == 1 && sourceLastSequenceID[processId] == 5) &&
				     //!(newSequenceId == 5 && sourceLastSequenceID[processId] == 2) &&
				    sourceLastSequenceID.find(processId) !=
				        sourceLastSequenceID.end() &&  // ensure not first packet received
				    ((newSequenceId == 0 && sourceLastSequenceID[processId] !=
				                                (unsigned int)-1) ||  // wrap around case
				     newSequenceId !=
				         sourceLastSequenceID[processId] + 1))  // normal sequence case
				{
					// missed some messages!
					std::cout << "MFfwd missed " << newSequenceId << " vs "
					          << sourceLastSequenceID[processId] + 1 << " "
					          << (newSequenceId - 1) -
					                 (sourceLastSequenceID[processId] + 1) + 1
					          << " packet(s) from " << processId << "!" << __E__;
				}
				// std::cout << &buff[buffi + mf_i - 1] << "|" << newSequenceId << " vs "
				// << 	sourceLastSequenceID[&buff[buffi + 0]] << "[" << 	&buff[buffi +
				// 0]
				// <<
				// "]||" << &buff[buffi + mf_j + 1] << __E__; // show all w/sequence ID

				// save the new last sequence ID
				sourceLastSequenceID[processId] = newSequenceId;

				// resolve nullchars
				if(mf_j < recvBytes)
					buff[buffi + mf_j] = saveChar;
				buff[buffi + mf_labeli] = saveChar2;
			}

			if(1 || packCount > 10000)
			{
				for(mf_p = 0, mf_i = 0; mf_i < recvBytes && mf_p < MF_POS_OF_TYPE; ++mf_i)
					if(buff[buffi + mf_i] == '|')
						++mf_p;  // count markers

				for(mf_j = mf_i; mf_j < recvBytes && mf_p < MF_POS_OF_TYPE + 1; ++mf_j)
					if(buff[buffi + mf_j] == '|')
						++mf_p;  // count markers

				// print first part (message type)
				if(mf_i < mf_j && mf_j < recvBytes)
				{
					saveChar               = buff[buffi + mf_j - 1];
					buff[buffi + mf_j - 1] = '\0';
					// std::cout << &buff[buffi + mf_i - 1];
					buff[buffi + mf_j - 1] = saveChar;

					// // tab for all types but Warning
					// if(strcmp(&buff[buffi + mf_i - 1], "|Warning") != 0)
					// 	std::cout << "\t";

					firstPartPresent = true;
				}
				else
					firstPartPresent = false;

				for(mf_i = mf_j; mf_i < recvBytes && mf_p < MF_POS_OF_MSG; ++mf_i)
					if(buff[buffi + mf_i] == '|')
						++mf_p;  // count markers

				if(packCount > 10000)
				{
					// print second part
					if(mf_i < recvBytes)  // if valid find, show message
						std::cout << &buff[buffi + mf_i - 1]
						          << __E__;  // show msg after '|'
					else if(firstPartPresent)
						std::cout << __E__;
				}
			}

			// forward packet onto sendSockfd

			// forward when we have a full packet
			if(buffi + recvBytes - buffStarti > MAXBUFLEN)
			{
				__COUT__ << "Pack count ==> " << packCount
				         << " sz=" << buffi - buffStarti - 1 << __E__;
				// send buffer without closing null character
				if((sentBytes = sendto(sendSockfd,
				                       &buff[buffStarti],
				                       buffi - buffStarti - 1,
				                       0,
				                       p->ai_addr,
				                       p->ai_addrlen)) == -1)
				{
					__COUT__ << "error: sendto...\n\n" << __E__;
					perror("hw: sendto");
					exit(1);
				}
				// printf("hw: sent %d bytes on\n", sentBytes);

				// now setup for next buffer
				buffStarti = buffi;
				buffi += recvBytes + 1;  // go past null character
				packCount = 1;

				// if past point for safe receive of next packet, then lets bail on it now
				// and send
				if(buffi > MAXBUFLEN * 2)
				{
					__COUT__ << "Wrap Pack count ==> " << packCount
					         << " sz=" << buffi - buffStarti - 1 << __E__;
					if((sentBytes = sendto(sendSockfd,
					                       &buff[buffStarti],
					                       buffi - buffStarti - 1,
					                       0,
					                       p->ai_addr,
					                       p->ai_addrlen)) == -1)
					{
						__COUT__ << "error: sendto...\n\n" << __E__;
						perror("hw: sendto");
						exit(1);
					}
					// reset for next buffer
					buffStarti = 0;
					buffi      = 0;
					packCount  = 1;
				}
			}     // end handle full packet
			else  // we do not have a full packet, so setup buff for next packet
			{
				buffi += recvBytes + 1;  // go past null character
				++packCount;

				// bail on decent sized packet, so buffer can return to start efficiently
				if(buffi > MAXBUFLEN && packCount > 12)
				{
					__COUT__ << "WrapAvoid Pack count ==> " << packCount
					         << " sz=" << buffi - buffStarti - 1 << __E__;
					if((sentBytes = sendto(sendSockfd,
					                       &buff[buffStarti],
					                       buffi - buffStarti - 1,
					                       0,
					                       p->ai_addr,
					                       p->ai_addrlen)) == -1)
					{
						__COUT__ << "error: sendto...\n\n" << __E__;
						perror("hw: sendto");
						exit(1);
					}
					// reset for next buffer
					buffStarti = 0;
					buffi      = 0;
					packCount  = 1;
				}
			}

		}  // end received packet case
		else
		{
			sleep(1);                   // one second
			if(++pingCounter > 2 * 60)  // two minutes
			{
				// send 1-byte "ping" to keep socket alive
				if((sentBytes =
				        sendto(sendSockfd, buff, 1, 0, p->ai_addr, p->ai_addrlen)) == -1)
				{
					__COUT__ << "error: ping sendto...\n\n" << __E__;
					perror("hw: ping sendto");
					exit(1);
				}
				pingCounter = 0;
			}
			else if(pingCounter > 1 && packCount > 1)
			{
				// forward partial packet while idle
				__COUT__ << "Partial Pack count ==> " << packCount - 1
				         << " sz=" << buffi - buffStarti - 1 << __E__;

				if((sentBytes = sendto(sendSockfd,
				                       &buff[buffStarti],
				                       buffi - buffStarti - 1,
				                       0,
				                       p->ai_addr,
				                       p->ai_addrlen)) == -1)
				{
					__COUT__ << "error: sendto...\n\n" << __E__;
					perror("hw: sendto");
					exit(1);
				}
				// reset for next buffer
				buffStarti = 0;
				buffi      = 0;
				packCount  = 1;
			}
		}  // end no packet case
	}      // end main loop

	close(sockfd);
	close(sendSockfd);

	__COUT__ << "Exited.\n\n" << __E__;

	return 0;
}
