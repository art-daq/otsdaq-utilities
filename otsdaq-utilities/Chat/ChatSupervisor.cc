#include "otsdaq-utilities/Chat/ChatSupervisor.h"
#include "otsdaq/CgiDataUtilities/CgiDataUtilities.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"
#include "otsdaq/XmlUtilities/HttpXmlDocument.h"

#include <xdaq/NamespaceURI.h>

#include <iostream>

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "Chat"

XDAQ_INSTANTIATOR_IMPL(ChatSupervisor)

//==============================================================================
ChatSupervisor::ChatSupervisor(xdaq::ApplicationStub* stub)

    : CoreSupervisorBase(stub)
{
	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	ChatLastUpdateIndex = 1;  // skip 0
}

//==============================================================================
ChatSupervisor::~ChatSupervisor(void) { destroy(); }

//==============================================================================
void ChatSupervisor::destroy(void)
{
	// called by destructor
}

//==============================================================================
void ChatSupervisor::defaultPage(xgi::Input* /* cgiIn */, xgi::Output* out)
{
     out->getHTTPResponseHeader().addHeader("Access-Control-Allow-Origin","*");
     out->getHTTPResponseHeader().addHeader("Pragma", "no-cache");

     *out << "<!DOCTYPE HTML><html lang='en'><frameset col='100%' row='100%'><frame "
             "src='/WebPath/html/Chat.html?urn="
          << this->getApplicationDescriptor()->getLocalId() << "'></frameset></html>";
 } //end defaultPage()

//==============================================================================
// forceSupervisorPropertyValues
//		override to force supervisor property values (and ignore user settings)
void ChatSupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes,
	    "RefreshChat");
}  /// end forceSupervisorPropertyValues()

//==============================================================================
//	request
//		Handles Web Interface requests to chat supervisor.
//		Does not refresh cookie for automatic update checks.
void ChatSupervisor::request(const std::string& requestType,
                             cgicc::Cgicc&      cgiIn,
                             HttpXmlDocument&   xmlOut,
                             const WebUsers::RequestUserInfo& /*userInfo*/)
{
	__COUTVS__(40,requestType);

	// Commands:
	// RefreshChat
	// RefreshUsers
	// SendChat

	cleanupExpiredChats();

	if(requestType == "RefreshChat")
	{
		std::string lastUpdateIndexString =
		    CgiDataUtilities::postData(cgiIn, "lastUpdateIndex");
		std::string user = CgiDataUtilities::postData(cgiIn, "user");
		uint64_t    lastUpdateIndex;
		sscanf(lastUpdateIndexString.c_str(), "%lu", &lastUpdateIndex);

		insertChatRefresh(&xmlOut, lastUpdateIndex, user);
	}
	else if(requestType == "RefreshUsers")
	{
		insertActiveUsers(&xmlOut);
	}
	else if(requestType == "SendChat")
	{
		std::string chat = CgiDataUtilities::postData(cgiIn, "chat");
		std::string user = CgiDataUtilities::postData(cgiIn, "user");

		escapeChat(chat);

		newChat(chat, user);
	}
	else if(requestType == "PageUser")
	{
		std::string  topage   = CgiDataUtilities::postData(cgiIn, "topage");
		unsigned int topageId = CgiDataUtilities::postDataAsInt(cgiIn, "topageId");
		std::string  user     = CgiDataUtilities::postData(cgiIn, "user");

		__COUT__ << "Paging = " << topage.substr(0, 10)
		         << "... from user = " << user.substr(0, 10) << std::endl;

		__COUTV__(topageId);

		theRemoteWebUsers_.sendSystemMessage(topage,
		                                     user + " is paging you to come chat.");
	}
	else
		__COUT__ << "requestType request not recognized." << std::endl;

}  // end request()

//==============================================================================
// ChatSupervisor::escapeChat()
//	replace html/xhtml reserved characters with equivalent.
//	reserved: ", ', &, <, >
void ChatSupervisor::escapeChat(std::string& /*chat*/)
{
	//	char reserved[] = {'"','\'','&','<','>'};
	// std::string replace[] = {"&#34;","&#39;","&#38;","&#60;","&#62;"};
	//	for(uint64_t i=0;i<chat.size();++i)
	//		for(uint64_t j=0;j<chat.size();++j)
	//		if(chat[i] ==
}  // end escapeChat()

//==============================================================================
// ChatSupervisor::insertActiveUsers()
void ChatSupervisor::insertActiveUsers(HttpXmlDocument* xmlOut)
{
	xmlOut->addTextElementToData("active_users", theRemoteWebUsers_.getActiveUserList());
}  // end insertActiveUsers()

//==============================================================================
// ChatSupervisor::insertChatRefresh()
//	check if user is new to list (may cause update)
//		each new user causes update to last index
//	if lastUpdateIndex is current, return nothing
//	else return full chat user list and new chats
//	(note: lastUpdateIndex==0 first time and returns user list. and all history chats)
void ChatSupervisor::insertChatRefresh(HttpXmlDocument*   xmlOut,
                                       uint64_t           lastUpdateIndex,
                                       const std::string& user)
{
	newUser(user);

	if(!isLastUpdateIndexStale(lastUpdateIndex))
		return;  //	if lastUpdateIndex is current, return nothing

	// return new update index, full chat user list, and new chats!

	char tempStr[50];
	sprintf(tempStr, "%lu", ChatLastUpdateIndex);
	xmlOut->addTextElementToData("last_update_index", tempStr);

	// get all users
	xmlOut->addTextElementToData("chat_users", "");
	for(uint64_t i = 0; i < ChatUsers_.size(); ++i)
		xmlOut->addTextElementToParent("chat_user", ChatUsers_[i], "chat_users");

	//Changed to give full history!
	// if(!lastUpdateIndex)  // lastUpdateIndex == 0, so just give the <user> entered chat
	//                       // message only
	// 	lastUpdateIndex = ChatHistoryIndex_[ChatHistoryIndex_.size() - 1] -
	// 	                  1;  // new user will then get future chats

	// get all accounts
	xmlOut->addTextElementToData("chat_history", "");
	for(uint64_t i = 0; i < ChatHistoryEntry_.size(); ++i)  // output oldest to new
	{
		__COUTT__ << "Chat[" << i << "]: " << 
			ChatHistoryIndex_[i] << " vs " << lastUpdateIndex << __E__;
		if(isChatOld(ChatHistoryIndex_[i], lastUpdateIndex))
			continue;

		xmlOut->addTextElementToParent(
		    "chat_entry", ChatHistoryEntry_[i], "chat_history");
		xmlOut->addTextElementToParent(
		    "chat_author", ChatHistoryAuthor_[i], "chat_history");
		sprintf(tempStr, "%lu", ChatHistoryTime_[i]);
		xmlOut->addTextElementToParent("chat_time", tempStr, "chat_history");
	}
}  // end insertChatRefresh()

//==============================================================================
// ChatSupervisor::newUser()
//	create new user if needed, and increment update
void ChatSupervisor::newUser(const std::string& user)
{
	for(uint64_t i = 0; i < ChatUsers_.size(); ++i)
		if(ChatUsers_[i] == user)
		{
			ChatUsersTime_[i] = time(0);  // update time
			return;                       // do not add new if found
		}

	__COUT__ << "New user: " << user << std::endl;
	// add and increment
	ChatUsers_.push_back(user);
	ChatUsersTime_.push_back(time(0));
	newChat(user + " joined the chat.",
	        "ots");  // add status message to chat, increment update
}  // end newUser()

//==============================================================================
// ChatSupervisor::newChat()
//	create new chat, and increment update
void ChatSupervisor::newChat(const std::string& chat, const std::string& user)
{
	ChatHistoryEntry_.push_back(chat);
	ChatHistoryAuthor_.push_back(user);
	ChatHistoryTime_.push_back(time(0));
	ChatHistoryIndex_.push_back(incrementAndGetLastUpdate());
}

//==============================================================================
// ChatSupervisor::isChatNew()
//	return true if chatIndex is older than lastUpdateIndex
bool ChatSupervisor::isChatOld(uint64_t chatIndex, uint64_t last)
{
	return (last - chatIndex < (uint64_t(1) << 62));
}

//==============================================================================
// ChatSupervisor::isLastUpdateIndexStale()
bool ChatSupervisor::isLastUpdateIndexStale(uint64_t last)
{
	return ChatLastUpdateIndex != last;
}

//==============================================================================
// ChatSupervisor::incrementAndGetLastUpdate()
uint64_t ChatSupervisor::incrementAndGetLastUpdate()
{
	if(!++ChatLastUpdateIndex)
		++ChatLastUpdateIndex;  // skip 0
	return ChatLastUpdateIndex;
}

//==============================================================================
// ChatSupervisor::cleanupExpiredChats()
//	remove expired entries from Chat history and user list
void ChatSupervisor::cleanupExpiredChats()
{
	for(uint64_t i = 0; i < ChatHistoryEntry_.size(); ++i)
		if(i >= CHAT_HISTORY_MAX_ENTRIES ||
		   ChatHistoryTime_[i] + CHAT_HISTORY_EXPIRATION_TIME < time(0))  // expired
		{
			removeChatHistoryEntry(i);
			--i;  // rewind loop
		}
		else
			break;  // chronological order, so first encountered that is still valid exit
			        // loop

	for(uint64_t i = 0; i < ChatUsers_.size(); ++i)
		if(ChatUsersTime_[i] + CHAT_HISTORY_EXPIRATION_TIME < time(0))  // expired
		{
			removeChatUserEntry(i);
			--i;  // rewind loop
		}
		else
			break;  // chronological order, so first encountered that is still valid exit
			        // loop
}

//==============================================================================
// ChatSupervisor::removeChatHistoryEntry()
void ChatSupervisor::removeChatHistoryEntry(uint64_t i)
{
	ChatHistoryEntry_.erase(ChatHistoryEntry_.begin() + i);
	ChatHistoryTime_.erase(ChatHistoryTime_.begin() + i);
	ChatHistoryAuthor_.erase(ChatHistoryAuthor_.begin() + i);
	ChatHistoryIndex_.erase(ChatHistoryIndex_.begin() + i);
}

//==============================================================================
// ChatSupervisor::removeChatHistoryEntry()
void ChatSupervisor::removeChatUserEntry(uint64_t i)
{
	newChat(ChatUsers_[i] + " left the chat.",
	        "ots");  // add status message to chat, increment update
	ChatUsers_.erase(ChatUsers_.begin() + i);
	ChatUsersTime_.erase(ChatUsersTime_.begin() + i);
}
