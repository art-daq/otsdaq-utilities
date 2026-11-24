#include "otsdaq-utilities/SlowControlsDashboard/LiveValueReader.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"

#ifdef OTS_HAVE_EPICS_CA
#include <cadef.h>
#endif

#include <cstdio>   //for snprintf
#include <cstring>  //for strnlen

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "LiveValueReader"

const size_t LiveValueReader::MAX_CHANNELS = 5000;

namespace
{
//==============================================================================
/// returns str ready to be placed inside a JSON string
std::string escapeJSON(const std::string& str)
{
	std::string retStr;
	retStr.reserve(str.size() + 20);
	char hex[8];
	for(const unsigned char c : str)
	{
		if(c == '"' || c == '\\')
		{
			retStr += '\\';
			retStr += (char)c;
		}
		else if(c < 0x20 || c == 0x7f)
		{
			snprintf(hex, sizeof(hex), "\\u%04x", c);
			retStr += hex;
		}
		else
			retStr += (char)c;
	}
	return retStr;
}  // end escapeJSON()

#ifdef OTS_HAVE_EPICS_CA
//==============================================================================
/// called by Channel Access (from its own thread) at each new value
void valueCallback(struct event_handler_args args)
{
	LiveValueReader::Channel_t* channel = (LiveValueReader::Channel_t*)args.usr;
	if(!channel || args.status != ECA_NORMAL || !args.dbr ||
	   args.type != DBR_TIME_STRING)
		return;

	const struct dbr_time_string* data = (const struct dbr_time_string*)args.dbr;
	static const char* SEVERITIES[]    = {"NONE", "MINOR", "MAJOR", "INVALID"};

	std::lock_guard<std::mutex> lock(channel->reader->mutex_);
	channel->value.assign(data->value, strnlen(data->value, sizeof(data->value)));
	channel->severity =
	    (data->severity >= 0 && data->severity < 4) ? SEVERITIES[data->severity] : "";
	channel->time = data->stamp.secPastEpoch
	                    ? (time_t)data->stamp.secPastEpoch + POSIX_TIME_AT_EPICS_EPOCH
	                    : 0;
}  // end valueCallback()

//==============================================================================
/// called by Channel Access (from its own thread) when the pv connects or disconnects
void connectionCallback(struct connection_handler_args args)
{
	LiveValueReader::Channel_t* channel =
	    (LiveValueReader::Channel_t*)ca_puser(args.chid);
	if(!channel)
		return;

	bool subscribe = false;
	{
		std::lock_guard<std::mutex> lock(channel->reader->mutex_);
		channel->connected = args.op == CA_OP_CONN_UP;
		if(channel->connected)
		{
			channel->everConnected = true;
			subscribe              = !channel->subscribed;
			channel->subscribed    = true;
		}
	}

	// the subscription is made once, Channel Access restores it at each reconnection
	if(subscribe)
		ca_create_subscription(DBR_TIME_STRING,
		                       1 /*count*/,
		                       args.chid,
		                       DBE_VALUE | DBE_ALARM,
		                       valueCallback,
		                       channel,
		                       nullptr /*evid*/);
}  // end connectionCallback()
#endif
}  // namespace

//==============================================================================
LiveValueReader::LiveValueReader(void) {}

//==============================================================================
LiveValueReader::~LiveValueReader(void)
{
	exitThread_ = true;
	if(thread_.joinable())
		thread_.join();
}  // end destructor()

//==============================================================================
/// getLiveJSONFields
///	liveState is one of: connected, disconnected (no connection now, value is the last
/// 	one received), connecting (never connected so far), or the reason why the pv is not read.
std::string LiveValueReader::getLiveJSONFields(const std::string& pvName)
{
	std::string value, severity, state;
	time_t      valueTime = 0;

#ifdef OTS_HAVE_EPICS_CA
	// the alarm server pv names may have a protocol prefix
	std::string name = pvName;
	if(name.find("ca://") == 0)
		name = name.substr(5);

	if(name == "" || name.find("://") != std::string::npos)
		state = "not a Channel Access pv";
	else
	{
		std::lock_guard<std::mutex> lock(mutex_);
		auto                        it = channels_.find(name);
		if(it == channels_.end())
		{
			if(channels_.size() >= MAX_CHANNELS)
				state = "too many pvs";
			else
			{
				std::unique_ptr<Channel_t> channel(new Channel_t());
				channel->reader = this;
				channel->name   = name;
				pending_.push_back(channel.get());
				channels_.emplace(name, std::move(channel));
				state = "connecting";

				if(!threadStarted_.exchange(true))
					thread_ = std::thread([this]() { readLoop(); });
			}
		}
		else
		{
			const Channel_t& channel = *(it->second);
			value                    = channel.value;
			severity                 = channel.severity;
			valueTime                = channel.time;
			state                    = channel.failed
			                               ? "Channel Access error"
			                               : channel.connected
			                                     ? "connected"
			                                     : channel.everConnected ? "disconnected"
			                                                             : "connecting";
		}
	}
#else
	(void)pvName;
	state = "EPICS Channel Access was not found at compile time";
#endif

	return "\"liveValue\":\"" + escapeJSON(value) +
	       "\",\"liveTime\":" + std::to_string(valueTime) + ",\"liveSeverity\":\"" +
	       escapeJSON(severity) + "\",\"liveState\":\"" + escapeJSON(state) + "\"";
}  // end getLiveJSONFields()

//==============================================================================
/// readLoop
///	Thread that owns the Channel Access context and creates the channels.
void LiveValueReader::readLoop(void)
{
#ifdef OTS_HAVE_EPICS_CA
	const int status = ca_context_create(ca_enable_preemptive_callback);
	if(status != ECA_NORMAL)
	{
		__COUT_ERR__ << "Channel Access context creation failed: " << ca_message(status)
		             << __E__;
		std::lock_guard<std::mutex> lock(mutex_);
		for(auto& channel : channels_)
			channel.second->failed = true;
		// Note: thread is not restarted, pvs requested from now on stay 'connecting'
		return;
	}
	__COUT__ << "Live value reading started." << __E__;

	while(!exitThread_)
	{
		std::vector<Channel_t*> pending;
		{
			std::lock_guard<std::mutex> lock(mutex_);
			pending.swap(pending_);
		}

		for(Channel_t* channel : pending)
		{
			chid      id;
			const int createStatus = ca_create_channel(channel->name.c_str(),
			                                           connectionCallback,
			                                           channel,
			                                           CA_PRIORITY_DEFAULT,
			                                           &id);
			if(createStatus != ECA_NORMAL)
			{
				__COUT__ << "Channel creation failed for '" << channel->name
				         << "': " << ca_message(createStatus) << __E__;
				std::lock_guard<std::mutex> lock(mutex_);
				channel->failed = true;
			}
		}

		ca_pend_event(0.2 /*seconds*/);  //also flushes the requests
	}

	ca_context_destroy();  //clears all channels, no more callbacks after this
#endif
}  // end readLoop()
