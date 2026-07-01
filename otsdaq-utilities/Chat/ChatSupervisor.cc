#include "otsdaq-utilities/Chat/ChatSupervisor.h"
#include "otsdaq/CgiDataUtilities/CgiDataUtilities.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"
#include "otsdaq/XmlUtilities/HttpXmlDocument.h"

#include <xdaq/NamespaceURI.h>

#include <fcntl.h>
#include <signal.h>
#include <sys/file.h>
#include <sys/wait.h>
#include <unistd.h>

#include <fstream>
#include <iostream>
#include <sstream>

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "Chat"

XDAQ_INSTANTIATOR_IMPL(ChatSupervisor)

//==============================================================================
ChatSupervisor::ChatSupervisor(xdaq::ApplicationStub* stub) : CoreSupervisorBase(stub)
{
	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	ChatLastUpdateIndex = 1;  // skip 0
	slackDaemonPid_     = -1;

	// run ots_setup_slack.sh to enable OTS_EN_SLACK environment variable
	enableSlackChat = (std::getenv("OTS_EN_SLACK") != nullptr &&
	                   std::string(std::getenv("OTS_EN_SLACK")) == "1");
	if(enableSlackChat)
	{
		const char* env          = std::getenv("OTSDAQ_UTILITIES_DIR");
		chatSupervisorToolsPath_ = env ? env : "";

		if(chatSupervisorToolsPath_.empty())
			enableSlackChat = false;
		if(chatSupervisorToolsPath_.back() != '/')
			chatSupervisorToolsPath_ += '/';
		chatSupervisorToolsPath_ += "tools/";

		const char* userData = std::getenv("USER_DATA");
		slackInboxPath_      = userData ? std::string(userData) + "/ChatSlackInbox.txt"
		                                : "/tmp/ots_slack_inbox.txt";

		__COUT__ << "ChatSupervisor: Slack chat "
		         << (enableSlackChat ? "enabled" : "disabled") << __E__;
		__COUT__ << "ChatSupervisor path: " << chatSupervisorToolsPath_ << __E__;

		startSlackDaemon();
	}
}

//==============================================================================
ChatSupervisor::~ChatSupervisor(void) { destroy(); }

//==============================================================================
void ChatSupervisor::destroy(void)
{
	stopSlackDaemon();
}

//==============================================================================
void ChatSupervisor::defaultPage(xgi::Input* /* cgiIn */, xgi::Output* out)
{
	out->getHTTPResponseHeader().addHeader("Access-Control-Allow-Origin", "*");
	out->getHTTPResponseHeader().addHeader("Pragma", "no-cache");

	*out << "<!DOCTYPE HTML><html lang='en'><frameset col='100%' row='100%'><frame "
	        "src='/WebPath/html/Chat.html?urn="
	     << this->getApplicationDescriptor()->getLocalId() << "'></frameset></html>";
}  //end defaultPage()

//==============================================================================
/// forceSupervisorPropertyValues
///		override to force supervisor property values (and ignore user settings)
void ChatSupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes,
	    "RefreshChat");
}  /// end forceSupervisorPropertyValues()

//==============================================================================
///	request
///		Handles Web Interface requests to chat supervisor.
///		Does not refresh cookie for automatic update checks.
void ChatSupervisor::request(const std::string& requestType,
                             cgicc::Cgicc&      cgiIn,
                             HttpXmlDocument&   xmlOut,
                             const WebUsers::RequestUserInfo& /*userInfo*/)
{
	__COUTVS__(40, requestType);

	// Commands:
	// RefreshChat
	// RefreshUsers
	// SendChat

	cleanupExpiredChats();

	if(requestType == "RefreshChat")
	{
		receiveFromSlack();

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
	{
		__SUP_SS__ << "requestType Request, " << requestType
		           << ", not recognized by the Chat Editor Supervisor (was it intended "
		              "for another Supervisor?)."
		           << __E__;
		__SUP_SS_THROW__;
	}

}  // end request()

//==============================================================================
/// ChatSupervisor::escapeChat()
///	replace html/xhtml reserved characters with equivalent.
///	reserved: ", ', &, <, >
void ChatSupervisor::escapeChat(std::string& /*chat*/)
{
	//	char reserved[] = {'"','\'','&','<','>'};
	// std::string replace[] = {"&#34;","&#39;","&#38;","&#60;","&#62;"};
	//	for(uint64_t i=0;i<chat.size();++i)
	//		for(uint64_t j=0;j<chat.size();++j)
	//		if(chat[i] ==
}  // end escapeChat()

//==============================================================================
/// ChatSupervisor::insertActiveUsers()
void ChatSupervisor::insertActiveUsers(HttpXmlDocument* xmlOut)
{
	xmlOut->addTextElementToData("active_users", theRemoteWebUsers_.getActiveUserList());
}  // end insertActiveUsers()

//==============================================================================
/// ChatSupervisor::insertChatRefresh()
///	check if user is new to list (may cause update)
///		each new user causes update to last index
///	if lastUpdateIndex is current, return nothing
///	else return full chat user list and new chats
///	(note: lastUpdateIndex==0 first time and returns user list. and all history chats)
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

	//if lastUpdateIndex == 0, first request, so give give full history!

	// get all accounts
	xmlOut->addTextElementToData("chat_history", "");
	for(uint64_t i = 0; i < ChatHistoryEntry_.size(); ++i)  // output oldest to new
	{
		__COUTT__ << "Chat[" << i << "]: " << ChatHistoryIndex_[i] << " vs "
		          << lastUpdateIndex << __E__;
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
/// ChatSupervisor::newUser()
///	create new user if needed, and increment update
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
/// ChatSupervisor::newChat()
///	create new chat, and increment update
void ChatSupervisor::newChat(const std::string& chat, const std::string& user, bool fromSlack)
{
	ChatHistoryEntry_.push_back(chat);
	ChatHistoryAuthor_.push_back(user);
	ChatHistoryTime_.push_back(time(0));
	ChatHistoryIndex_.push_back(incrementAndGetLastUpdate());
	if(enableSlackChat && !fromSlack)
		sendToSlack(user, chat);
}

//==============================================================================
/// ChatSupervisor::isChatNew()
///	return true if chatIndex is older than lastUpdateIndex
bool ChatSupervisor::isChatOld(uint64_t chatIndex, uint64_t last)
{
	return (last - chatIndex < (uint64_t(1) << 62));
}

//==============================================================================
/// ChatSupervisor::isLastUpdateIndexStale()
bool ChatSupervisor::isLastUpdateIndexStale(uint64_t last)
{
	return ChatLastUpdateIndex != last;
}

//==============================================================================
/// ChatSupervisor::incrementAndGetLastUpdate()
uint64_t ChatSupervisor::incrementAndGetLastUpdate()
{
	if(!++ChatLastUpdateIndex)
		++ChatLastUpdateIndex;  // skip 0
	return ChatLastUpdateIndex;
}

//==============================================================================
/// ChatSupervisor::cleanupExpiredChats()
///	remove expired entries from Chat history and user list
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
/// ChatSupervisor::removeChatHistoryEntry()
void ChatSupervisor::removeChatHistoryEntry(uint64_t i)
{
	ChatHistoryEntry_.erase(ChatHistoryEntry_.begin() + i);
	ChatHistoryTime_.erase(ChatHistoryTime_.begin() + i);
	ChatHistoryAuthor_.erase(ChatHistoryAuthor_.begin() + i);
	ChatHistoryIndex_.erase(ChatHistoryIndex_.begin() + i);
}

//==============================================================================
/// ChatSupervisor::removeChatHistoryEntry()
void ChatSupervisor::removeChatUserEntry(uint64_t i)
{
	newChat(ChatUsers_[i] + " left the chat.",
	        "ots");  // add status message to chat, increment update
	ChatUsers_.erase(ChatUsers_.begin() + i);
	ChatUsersTime_.erase(ChatUsersTime_.begin() + i);
}

//==============================================================================
/// ChatSupervisor::sendToSlack()
void ChatSupervisor::sendToSlack(const std::string& user, const std::string& message)
{
	std::string command = "python3 " + chatSupervisorToolsPath_ + "SendSlackChat.py " +
	                      "--message \"" + message + "\" --user " + user;
	__COUT__ << "Executing command: " << command << __E__;

	try
	{
		auto result = StringMacros::exec(command.c_str());

		if(!result.empty() && result.find("Error:") != std::string::npos)
			__COUT__ << "Error from SendSlackChat.py: " << result << __E__;
		else if(!result.empty())
			__COUT__ << "Response from SendSlackChat.py: " << result << __E__;
	}
	catch(const std::exception& e)
	{
		__COUT__ << "Exception while executing command: " << e.what() << __E__;
	}
}

//==============================================================================
/// ChatSupervisor::startSlackDaemon()
///	Launch the ReceiveSlackChat.py daemon as a background process.
void ChatSupervisor::startSlackDaemon()
{
	if(slackDaemonPid_ > 0)
		return;

	std::string script = chatSupervisorToolsPath_ + "ReceiveSlackChat.py";
	__COUT__ << "Starting Slack receive daemon: " << script
	         << " -> " << slackInboxPath_ << __E__;

	pid_t pid = fork();
	if(pid < 0)
	{
		__COUT__ << "Failed to fork Slack receive daemon" << __E__;
		return;
	}
	if(pid == 0)
	{
		execlp("python3", "python3", script.c_str(),
		       "--output", slackInboxPath_.c_str(),
		       "--interval", "1",
		       (char*)nullptr);
		_exit(1);
	}

	slackDaemonPid_ = pid;
	__COUT__ << "Slack receive daemon started with PID " << slackDaemonPid_ << __E__;
}

//==============================================================================
/// ChatSupervisor::stopSlackDaemon()
///	Terminate the background ReceiveSlackChat.py daemon.
void ChatSupervisor::stopSlackDaemon()
{
	if(slackDaemonPid_ <= 0)
		return;

	__COUT__ << "Stopping Slack receive daemon PID " << slackDaemonPid_ << __E__;
	kill(slackDaemonPid_, SIGTERM);

	int  status = 0;
	bool exited = false;
	for(int i = 0; i < 50; ++i)  // ~5s total
	{
		pid_t r = waitpid(slackDaemonPid_, &status, WNOHANG);
		if(r == slackDaemonPid_)
		{
			exited = true;
			break;
		}
		if(r < 0)
		{
			exited = true;  // already reaped / not our child
			break;
		}
		usleep(100000);
	}
	if(!exited)
	{
		__COUT__ << "Slack receive daemon did not exit after SIGTERM; sending SIGKILL" << __E__;
		kill(slackDaemonPid_, SIGKILL);
		waitpid(slackDaemonPid_, &status, 0);
	}
	else
	{
		(void)waitpid(slackDaemonPid_, &status, WNOHANG);  // ensure reaped if it exited quickly
	}

	slackDaemonPid_ = -1;

	// Clean up the inbox file
	std::remove(slackInboxPath_.c_str());
	std::remove((slackInboxPath_ + ".lock").c_str());
}

//==============================================================================
/// ChatSupervisor::receiveFromSlack()
///	Read messages written by the ReceiveSlackChat.py daemon and inject them
///	into the chat history. Uses file locking to coordinate with the daemon.
void ChatSupervisor::receiveFromSlack()
{
	if(!enableSlackChat || slackInboxPath_.empty())
		return;

	std::string lockPath = slackInboxPath_ + ".lock";
	int lockFd = open(lockPath.c_str(), O_WRONLY | O_CREAT, 0644);
	if(lockFd < 0)
	{
		__COUT__ << "receiveFromSlack: cannot open lock file " << lockPath << __E__;
		return;
	}

	if(flock(lockFd, LOCK_EX | LOCK_NB) != 0)
	{
		close(lockFd);
		return;  // daemon is writing, try next cycle
	}

	std::vector<std::string> lines;
	{
		std::ifstream infile(slackInboxPath_);
		if(infile.is_open())
		{
			std::string line;
			while(std::getline(infile, line))
				if(!line.empty())
					lines.push_back(line);
		}
	}

	// Truncate the file after reading
	if(!lines.empty())
	{
		__COUT__ << "receiveFromSlack: read " << lines.size()
		         << " line(s) from " << slackInboxPath_ << __E__;
		std::ofstream clearFile(slackInboxPath_, std::ios::trunc);
	}

	flock(lockFd, LOCK_UN);
	close(lockFd);

	for(const auto& line : lines)
	{
		size_t firstTab = line.find('\t');
		if(firstTab == std::string::npos)
		{
			__COUT__ << "receiveFromSlack: skipping malformed line (no tab): "
			         << line << __E__;
			continue;
		}

		std::string tag = line.substr(0, firstTab);
		if(tag != "MSG")
		{
			__COUT__ << "receiveFromSlack: skipping unknown tag '" << tag
			         << "'" << __E__;
			continue;
		}

		size_t secondTab = line.find('\t', firstTab + 1);
		if(secondTab == std::string::npos)
		{
			__COUT__ << "receiveFromSlack: skipping malformed MSG line: "
			         << line << __E__;
			continue;
		}

		std::string user    = line.substr(firstTab + 1, secondTab - firstTab - 1);
		std::string message = line.substr(secondTab + 1);

		// Unescape newlines from the Python output
		size_t pos = 0;
		while((pos = message.find("\\n", pos)) != std::string::npos)
		{
			message.replace(pos, 2, "\n");
			pos += 1;
		}

		__COUT__ << "receiveFromSlack: injecting message from user '"
		         << user << "': " << message << __E__;
		newChat(message, "[slack] " + user, /*fromSlack=*/true);
	}
}
