#include "otsdaq-utilities/SlowControlsDashboard/KafkaAlarmReader.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/Macros/StringMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"

#ifdef OTS_HAVE_RDKAFKA
#include <librdkafka/rdkafka.h>
#include <nlohmann/json.hpp>
#endif

#include <unistd.h>  //for gethostname, getpid
#include <algorithm>
#include <cstdio>   //for snprintf
#include <cstdlib>  //for getenv
#include <sstream>

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "KafkaAlarmReader"

const std::string KafkaAlarmReader::DEFAULT_ERROR_TOPIC = "OtsErrors";
const size_t      KafkaAlarmReader::MAX_ERROR_RECORDS   = 2000;
// as defined by Phoebus (AlarmSystemConstants)
const std::string KafkaAlarmReader::COMMAND_TOPIC_SUFFIX = "Command";
const std::string KafkaAlarmReader::COMMAND_KEY_PREFIX   = "command:";

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
		switch(c)
		{
		case '\n':
			retStr += "\\n";
			break;
		case '"':
			retStr += "\\\"";
			break;
		case '\t':
			retStr += "\\t";
			break;
		case '\r':
			retStr += "\\r";
			break;
		case '\\':
			retStr += "\\\\";
			break;
		default:
			if(c < 0x20 || c == 0x7f)
			{
				snprintf(hex, sizeof(hex), "\\u%04x", c);
				retStr += hex;
			}
			else
				retStr += (char)c;
		}
	}
	return retStr;
}  // end escapeJSON()

//==============================================================================
std::string toLower(std::string str)
{
	std::transform(str.begin(), str.end(), str.begin(), [](unsigned char c) {
		return std::tolower(c);
	});
	return str;
}  // end toLower()

//==============================================================================
/// returns the last element of a Phoebus alarm tree path, i.e. the pv name of a leaf.
///	Note: a '/' inside of a pv name is escaped as "\/" in the path
std::string getPathLeafName(const std::string& path)
{
	size_t pos = path.size();
	while(pos > 0)
	{
		--pos;
		if(path[pos] == '/' && (pos == 0 || path[pos - 1] != '\\'))
		{
			++pos;
			break;
		}
	}
	std::string name = path.substr(pos);
	size_t      esc;
	while((esc = name.find("\\/")) != std::string::npos)
		name.erase(esc, 1);
	return name;
}  // end getPathLeafName()

//==============================================================================
/// returns the path of the parent node, or "" for the root of an alarm configuration
///	Note: a '/' inside of a pv name is escaped as "\/" in the path
std::string getParentPath(const std::string& path)
{
	size_t pos = path.size();
	while(pos > 0)
	{
		--pos;
		if(path[pos] == '/' && (pos == 0 || path[pos - 1] != '\\'))
			return path.substr(0, pos);
	}
	return "";
}  // end getParentPath()

#ifdef OTS_HAVE_RDKAFKA
//==============================================================================
/// log callback, to keep librdkafka from printing to stderr at every reconnect attempt
void logCallback(const rd_kafka_t* /*rk*/,
                 int /*level*/,
                 const char* /*fac*/,
                 const char* /*buf*/)
{
}  // end logCallback()

//==============================================================================
/// delivery report of the commands, the message opaque is the count of failures
void commandDeliveryCallback(rd_kafka_t* /*rk*/,
                             const rd_kafka_message_t* message,
                             void* /*opaque*/)
{
	if(!message->err || !message->_private)
		return;
	auto failures = (std::pair<size_t, std::string>*)message->_private;
	++failures->first;
	failures->second = rd_kafka_err2str(message->err);
}  // end commandDeliveryCallback()

//==============================================================================
std::string getJSONString(const nlohmann::json& json, const char* field)
{
	auto it = json.find(field);
	if(it == json.end() || !it->is_string())
		return "";
	return it->get<std::string>();
}  // end getJSONString()
#endif
}  // namespace

//==============================================================================
KafkaAlarmReader::KafkaAlarmReader(void)
{
	const char* env = getenv("OTS_KAFKA_BROKERS");
	brokers_        = env ? env : "";
	env             = getenv("OTS_KAFKA_ERROR_TOPIC");
	errorTopic_     = (env && env[0]) ? env : DEFAULT_ERROR_TOPIC;
	env             = getenv("OTS_KAFKA_ALARM_TOPICS");
	{
		std::istringstream topics(env ? env : "");
		std::string        topic;
		while(std::getline(topics, topic, ','))
		{
			StringMacros::trim(topic);
			if(topic != "" && topic != errorTopic_ &&
			   std::find(alarmTopics_.begin(), alarmTopics_.end(), topic) ==
			       alarmTopics_.end())
				alarmTopics_.push_back(topic);
		}
	}

	if(brokers_ == "")
	{
		disabledReason_ = "Environment variable OTS_KAFKA_BROKERS is not set.";
		return;
	}

#ifdef OTS_HAVE_RDKAFKA
	for(const auto& topic : alarmTopics_)
		topics_[topic];  //create, so that topics are reported even before first message
	enabled_ = true;
#else
	disabledReason_ = "librdkafka was not found at compile time.";
#endif
}  // end constructor()

//==============================================================================
KafkaAlarmReader::~KafkaAlarmReader(void)
{
	exitThread_ = true;
	if(thread_.joinable())
		thread_.join();
#ifdef OTS_HAVE_RDKAFKA
	if(producer_)
		rd_kafka_destroy((rd_kafka_t*)producer_);
#endif
}  // end destructor()

//==============================================================================
/// start
///	Starts the reading thread on first call (i.e., there is no connection to Kafka
/// 	until the first user request).
void KafkaAlarmReader::start(void)
{
	if(!enabled_ || threadStarted_.exchange(true))
		return;

	__COUT_INFO__ << "Starting to read Phoebus alarm topics {"
	              << StringMacros::vectorToString(alarmTopics_)
	              << "} and ots error topic '" << errorTopic_ << "' from Kafka at "
	              << brokers_ << __E__;
	thread_ = std::thread([this]() { readLoop(); });
}  // end start()

//==============================================================================
/// severityRank
///	Returns the Phoebus alarm severity ordering: active alarms above acknowledged
/// alarms above OK.
unsigned int KafkaAlarmReader::severityRank(const std::string& severity)
{
	static const std::map<std::string, unsigned int> ranks({{"OK", 0},
	                                                        {"MINOR_ACK", 1},
	                                                        {"MAJOR_ACK", 2},
	                                                        {"INVALID_ACK", 3},
	                                                        {"UNDEFINED_ACK", 4},
	                                                        {"MINOR", 5},
	                                                        {"MAJOR", 6},
	                                                        {"INVALID", 7},
	                                                        {"UNDEFINED", 8}});
	auto                                             it = ranks.find(severity);
	return it == ranks.end() ? 0 : it->second;
}  // end severityRank()

//==============================================================================
/// readLoop
///	Thread that reads all topics from the beginning (the alarm topics are compacted,
/// 	so that gives the current state of every pv), and then follows the updates.
void KafkaAlarmReader::readLoop(void)
{
#ifdef OTS_HAVE_RDKAFKA
	char hostname[256] = "";
	gethostname(hostname, sizeof(hostname) - 1);
	const std::string clientId =
	    "ots-alarm-reader-" + std::string(hostname) + "-" + std::to_string(getpid());

	char             errstr[512];
	rd_kafka_conf_t* conf = rd_kafka_conf_new();

	std::vector<std::pair<std::string, std::string>> settings(
	    {{"bootstrap.servers", brokers_},
	     {"client.id", clientId},
	     //Note: group.id is required by librdkafka, but since partitions are assigned
	     //	explicitly and nothing is committed, no group is ever created at the broker
	     {"group.id", clientId},
	     {"enable.auto.commit", "false"},
	     {"enable.auto.offset.store", "false"},
	     {"enable.partition.eof", "true"},
	     {"auto.offset.reset", "earliest"},
	     {"socket.keepalive.enable", "true"}});
	for(const auto& setting : settings)
		if(rd_kafka_conf_set(conf,
		                     setting.first.c_str(),
		                     setting.second.c_str(),
		                     errstr,
		                     sizeof(errstr)) != RD_KAFKA_CONF_OK)
		{
			__COUT_WARN__ << "Kafka alarm reading failed, illegal " << setting.first
			              << " = '" << setting.second << "': " << errstr << __E__;
			rd_kafka_conf_destroy(conf);
			std::lock_guard<std::mutex> lock(mutex_);
			lastKafkaError_     = errstr;
			lastKafkaErrorTime_ = time(0);
			return;
		}
	rd_kafka_conf_set_log_cb(conf, logCallback);

	rd_kafka_t* consumer = rd_kafka_new(RD_KAFKA_CONSUMER, conf, errstr, sizeof(errstr));
	if(!consumer)
	{
		__COUT_WARN__ << "Kafka alarm reading failed, the consumer could not be created: "
		              << errstr << __E__;
		rd_kafka_conf_destroy(conf);  //conf is only owned by consumer on success
		std::lock_guard<std::mutex> lock(mutex_);
		lastKafkaError_     = errstr;
		lastKafkaErrorTime_ = time(0);
		return;
	}
	rd_kafka_poll_set_consumer(consumer);

	//Note: Phoebus alarm topics (and the ots error topic) have a single partition
	rd_kafka_topic_partition_list_t* partitions =
	    rd_kafka_topic_partition_list_new(alarmTopics_.size() + 1);
	for(const auto& topic : alarmTopics_)
		rd_kafka_topic_partition_list_add(partitions, topic.c_str(), 0)->offset =
		    RD_KAFKA_OFFSET_BEGINNING;
	rd_kafka_topic_partition_list_add(partitions, errorTopic_.c_str(), 0)->offset =
	    RD_KAFKA_OFFSET_BEGINNING;
	rd_kafka_resp_err_t err = rd_kafka_assign(consumer, partitions);
	rd_kafka_topic_partition_list_destroy(partitions);
	if(err)
	{
		__COUT_WARN__ << "Kafka alarm reading failed at topic assignment: "
		              << rd_kafka_err2str(err) << __E__;
		std::lock_guard<std::mutex> lock(mutex_);
		lastKafkaError_     = rd_kafka_err2str(err);
		lastKafkaErrorTime_ = time(0);
	}

	while(!err && !exitThread_)
	{
		rd_kafka_message_t* message =
		    rd_kafka_consumer_poll(consumer, 500 /*timeout_ms*/);
		if(!message)
			continue;

		const std::string topic = message->rkt ? rd_kafka_topic_name(message->rkt) : "";

		if(message->err == RD_KAFKA_RESP_ERR__PARTITION_EOF)
		{
			std::lock_guard<std::mutex> lock(mutex_);
			if(topic == errorTopic_)
				errorTopicLoaded_ = true;
			else if(topics_.find(topic) != topics_.end())
				topics_[topic].loaded = true;
		}
		else if(message->err)
		{
			std::lock_guard<std::mutex> lock(mutex_);
			lastKafkaError_ = (topic != "" ? "Topic '" + topic + "': " : "") +
			                  rd_kafka_message_errstr(message);
			lastKafkaErrorTime_ = time(0);
		}
		else
		{
			rd_kafka_timestamp_type_t timestampType;
			const int64_t timestamp = rd_kafka_message_timestamp(message, &timestampType);
			handleMessage(
			    topic,
			    std::string((const char*)message->key, message->key_len),
			    (const char*)message->payload,
			    message->len,
			    timestampType == RD_KAFKA_TIMESTAMP_NOT_AVAILABLE ? 0 : timestamp / 1000);
		}
		rd_kafka_message_destroy(message);
	}  //end primary read loop

	rd_kafka_consumer_close(consumer);
	rd_kafka_destroy(consumer);
#endif
}  // end readLoop()

//==============================================================================
/// handleMessage
///	Applies one Kafka record to the alarm (or ots error) cache.
void KafkaAlarmReader::handleMessage(const std::string& topic,
                                     const std::string& key,
                                     const char*        payload,
                                     size_t             payloadSize,
                                     time_t             kafkaTime)
{
#ifdef OTS_HAVE_RDKAFKA
	if(topic == errorTopic_)
	{
		if(!payload || !payloadSize)
			return;
		//only accept valid JSON objects, since records are forwarded to the web as is
		nlohmann::json json = nlohmann::json::parse(
		    payload, payload + payloadSize, nullptr, false /*allow_exceptions*/);
		if(!json.is_object())
			return;

		std::lock_guard<std::mutex> lock(mutex_);
		errors_.push_back(ErrorRecord_t());
		errors_.back().kafkaTime = kafkaTime;
		errors_.back().key       = key;
		errors_.back().record    = json.dump();
		while(errors_.size() > MAX_ERROR_RECORDS)
			errors_.pop_front();
		return;
	}

	const bool isState = key.rfind("state:", 0) == 0;
	if(!isState && key.rfind("config:", 0) != 0)
		return;  //ignore, e.g. commands and talk
	const std::string path = key.substr(key.find(':') + 1);

	if(!payload || !payloadSize)  //null value means entry was deleted
	{
		std::lock_guard<std::mutex> lock(mutex_);
		Topic_t&                    topicStruct = topics_[topic];
		++topicStruct.messageCount;
		if(isState)
			topicStruct.states.erase(path);
		else
			topicStruct.configs.erase(path);
		return;
	}

	nlohmann::json json = nlohmann::json::parse(
	    payload, payload + payloadSize, nullptr, false /*allow_exceptions*/);
	if(!json.is_object())
		return;

	if(isState)
	{
		AlarmState_t state;
		state.severity        = getJSONString(json, "severity");
		state.message         = getJSONString(json, "message");
		state.value           = getJSONString(json, "value");
		state.currentSeverity = getJSONString(json, "current_severity");
		state.currentMessage  = getJSONString(json, "current_message");
		//only pvs (i.e., leaves of the alarm tree) have a current severity
		state.isLeaf = json.find("current_severity") != json.end();
		auto timeIt  = json.find("time");
		if(timeIt != json.end() && timeIt->is_object())
		{
			auto secondsIt = timeIt->find("seconds");
			if(secondsIt != timeIt->end() && secondsIt->is_number())
				state.time = secondsIt->get<int64_t>();
		}

		std::lock_guard<std::mutex> lock(mutex_);
		Topic_t&                    topicStruct = topics_[topic];
		++topicStruct.messageCount;
		topicStruct.lastUpdate   = kafkaTime;
		topicStruct.states[path] = state;
	}
	else
	{
		AlarmConfig_t config;
		config.description = getJSONString(json, "description");
		StringMacros::trim(config.description);
		auto enabledIt = json.find("enabled");
		if(enabledIt != json.end() && enabledIt->is_boolean())
			config.enabled = enabledIt->get<bool>();
		//Note: 'enabled' can also be a date string until which the alarm is disabled,
		//	which is treated as enabled here (the alarm server reports severity OK while disabled)

		std::lock_guard<std::mutex> lock(mutex_);
		Topic_t&                    topicStruct = topics_[topic];
		++topicStruct.messageCount;
		topicStruct.configs[path] = config;
	}
#endif
}  // end handleMessage()

//==============================================================================
/// getStatusJSONFields
///	Note: must be called with mutex_ locked
std::string KafkaAlarmReader::getStatusJSONFields(void) const
{
	std::string json = "\"enabled\":" + std::string(enabled_ ? "true" : "false") + ",";
	json += "\"disabledReason\":\"" + escapeJSON(disabledReason_) + "\",";
	json += "\"brokers\":\"" + escapeJSON(brokers_) + "\",";
	json += "\"errorTopic\":\"" + escapeJSON(errorTopic_) + "\",";
	json += "\"serverTime\":" + std::to_string(time(0)) + ",";
	json += "\"lastKafkaError\":\"" + escapeJSON(lastKafkaError_) + "\",";
	json += "\"lastKafkaErrorTime\":" + std::to_string(lastKafkaErrorTime_);
	return json;
}  // end getStatusJSONFields()

//==============================================================================
bool KafkaAlarmReader::isAcknowledged(const std::string& severity)
{
	return severity.size() > 4 && severity.rfind("_ACK") == severity.size() - 4;
}  // end isAcknowledged()

//==============================================================================
/// isAlarmMatch
///	Returns true if the pv is in alarm (i.e. latched severity is not OK) and matches
/// 	the filter. See getAlarmsJSON() for the parameters.
///
///	With onlyCurrentOk, only the alarms of pvs that are OK now match, i.e. the latched
/// 	alarms that are only waiting for the acknowledge.
bool KafkaAlarmReader::isAlarmMatch(const std::string&           path,
                                    const AlarmState_t&          state,
                                    const AlarmConfig_t&         config,
                                    const std::set<std::string>& severities,
                                    bool                         includeAcknowledged,
                                    const std::string&           lowerCaseTextFilter,
                                    bool                         onlyCurrentOk)
{
	if(state.severity == "OK" || state.severity == "")
		return false;
	if(onlyCurrentOk && state.currentSeverity != "OK")
		return false;

	const bool        acknowledged = isAcknowledged(state.severity);
	const std::string baseSeverity =
	    acknowledged ? state.severity.substr(0, state.severity.size() - 4)
	                 : state.severity;
	if(acknowledged && !includeAcknowledged)
		return false;
	if(severities.size() && severities.find(baseSeverity) == severities.end())
		return false;
	if(lowerCaseTextFilter != "" &&
	   toLower(path).find(lowerCaseTextFilter) == std::string::npos &&
	   toLower(config.description).find(lowerCaseTextFilter) == std::string::npos &&
	   toLower(state.message).find(lowerCaseTextFilter) == std::string::npos)
		return false;
	return true;
}  // end isAlarmMatch()

//==============================================================================
/// countBelow
///	Counts the alarms (enabled pvs with severity not OK) below a node of the alarm tree.
///	Note: must be called with mutex_ locked
void KafkaAlarmReader::countBelow(const Topic_t&     topic,
                                  const std::string& nodePath,
                                  size_t&            activeCount,
                                  size_t&            acknowledgedCount)
{
	const std::string prefix = nodePath + "/";
	activeCount              = 0;
	acknowledgedCount        = 0;
	for(const auto& statePair : topic.states)
	{
		if(!statePair.second.isLeaf || statePair.first.compare(0, prefix.size(), prefix))
			continue;
		auto configIt = topic.configs.find(statePair.first);
		if(configIt == topic.configs.end() || !configIt->second.enabled ||
		   statePair.second.severity == "OK" || statePair.second.severity == "")
			continue;
		if(isAcknowledged(statePair.second.severity))
			++acknowledgedCount;
		else
			++activeCount;
	}
}  // end countBelow()

//==============================================================================
/// getAlarmTreeJSON
///	Returns the rows of the alarm tree in display order (depth first), starting with
/// 	the root of each alarm configuration: only the children of the open nodes are listed,
/// 	so the tree is read one level at a time.
///
///	Nodes have the alarm count below them that match the filter (same filter as getAlarmsJSON).
/// 	Unless showAll is true, only the nodes with such alarms (and the alarms) are listed.
std::string KafkaAlarmReader::getAlarmTreeJSON(
    const std::string&                                    topicFilter,
    const std::set<std::string>&                          severities,
    bool                                                  includeAcknowledged,
    const std::string&                                    textFilter,
    bool                                                  onlyCurrentOk,
    bool                                                  showAll,
    const std::set<std::string>&                          openPaths,
    bool                                                  openRoots,
    size_t                                                maxRows,
    const std::function<std::string(const std::string&)>& getExtraJSONFields)
{
	start();

	struct Counts_t
	{
		size_t active = 0, acknowledged = 0;
	};  //end Counts_t struct

	const std::string filter = toLower(textFilter);

	std::lock_guard<std::mutex> lock(mutex_);

	std::string json      = "{" + getStatusJSONFields() + ",\"rows\":[";
	size_t      rowCount  = 0;
	bool        truncated = false;

	for(const auto& topicPair : topics_)
	{
		if(topicFilter != "" && topicFilter != topicPair.first)
			continue;
		const Topic_t& topic = topicPair.second;

		// alarm counts for every node
		std::unordered_map<std::string, Counts_t> counts;
		for(const auto& statePair : topic.states)
		{
			const AlarmState_t& state = statePair.second;
			if(!state.isLeaf)
				continue;
			auto configIt = topic.configs.find(statePair.first);
			if(configIt == topic.configs.end() || !configIt->second.enabled ||
			   !isAlarmMatch(statePair.first,
			                 state,
			                 configIt->second,
			                 severities,
			                 includeAcknowledged,
			                 filter,
			                 onlyCurrentOk))
				continue;
			const bool acknowledged = isAcknowledged(state.severity);
			for(std::string node = getParentPath(statePair.first); node != "";
			    node             = getParentPath(node))
                ++(acknowledged ? counts[node].acknowledged : counts[node].active);
		}

		// children of every node
		std::unordered_map<std::string, std::vector<const std::string*>> children;
		for(const auto& configPair : topic.configs)
		{
			const std::string parent = getParentPath(configPair.first);
			if(parent != "")
				children[parent].push_back(&configPair.first);
		}

		auto isVisible = [&](const std::string& path) {
			auto configIt = topic.configs.find(path);
			if(configIt != topic.configs.end() && !configIt->second.enabled)
				return false;
			if(showAll || counts.find(path) != counts.end())
				return true;
			auto stateIt = topic.states.find(path);
			return stateIt != topic.states.end() && stateIt->second.isLeaf &&
			       configIt != topic.configs.end() &&
			       isAlarmMatch(path,
			                    stateIt->second,
			                    configIt->second,
			                    severities,
			                    includeAcknowledged,
			                    filter,
			                    onlyCurrentOk);
		};  // end isVisible()

		std::function<void(const std::string&, int)> emit = [&](const std::string& path,
		                                                        int depth) {
			if(truncated)
				return;
			if(rowCount >= maxRows)
			{
				truncated = true;
				return;
			}

			auto                stateIt    = topic.states.find(path);
			auto                configIt   = topic.configs.find(path);
			auto                childrenIt = children.find(path);
			const AlarmState_t* state =
			    stateIt == topic.states.end() ? nullptr : &stateIt->second;
			const bool isNode =
			    childrenIt != children.end() || (state && !state->isLeaf) || depth == 0;

			json += std::string(rowCount ? "," : "") + "{";
			json += "\"topic\":\"" + escapeJSON(topicPair.first) + "\",";
			json += "\"path\":\"" + escapeJSON(path) + "\",";
			json += "\"depth\":" + std::to_string(depth) + ",";
			json += "\"name\":\"" +
			        escapeJSON(depth == 0 ? topicPair.first : getPathLeafName(path)) +
			        "\",";
			json += "\"description\":\"" +
			        escapeJSON(configIt == topic.configs.end()
			                       ? ""
			                       : configIt->second.description) +
			        "\",";
			json += "\"severity\":\"" + escapeJSON(state ? state->severity : "") + "\",";
			++rowCount;

			if(!isNode)
			{
				json += "\"isNode\":false,";
				json += "\"pv\":\"" + escapeJSON(getPathLeafName(path)) + "\",";
				json +=
				    "\"message\":\"" + escapeJSON(state ? state->message : "") + "\",";
				json += "\"value\":\"" + escapeJSON(state ? state->value : "") + "\",";
				json += "\"time\":" + std::to_string(state ? state->time : 0) + ",";
				if(getExtraJSONFields)
					json += getExtraJSONFields(getPathLeafName(path)) + ",";
				json += "\"currentSeverity\":\"" +
				        escapeJSON(state ? state->currentSeverity : "") + "\",";
				json += "\"currentMessage\":\"" +
				        escapeJSON(state ? state->currentMessage : "") + "\"}";
				return;
			}

			const bool expandable = childrenIt != children.end();
			const bool expanded =
			    expandable && (openPaths.count(path) || (openRoots && depth == 0));
			auto countIt = counts.find(path);
			json += "\"isNode\":true,";
			json += "\"activeCount\":" +
			        std::to_string(countIt == counts.end() ? 0 : countIt->second.active) +
			        ",";
			json += "\"acknowledgedCount\":" +
			        std::to_string(
			            countIt == counts.end() ? 0 : countIt->second.acknowledged) +
			        ",";
			json += "\"expandable\":" + std::string(expandable ? "true" : "false") + ",";
			json += "\"expanded\":" + std::string(expanded ? "true" : "false") + "}";

			if(!expanded)
				return;

			// most severe first, then by name
			std::vector<const std::string*> visibleChildren;
			for(const std::string* child : childrenIt->second)
				if(isVisible(*child))
					visibleChildren.push_back(child);
			std::sort(
			    visibleChildren.begin(),
			    visibleChildren.end(),
			    [&](const std::string* a, const std::string* b) {
				    auto aIt = topic.states.find(*a), bIt = topic.states.find(*b);
				    const unsigned int aRank = aIt == topic.states.end()
				                                   ? 0
				                                   : severityRank(aIt->second.severity);
				    const unsigned int bRank = bIt == topic.states.end()
				                                   ? 0
				                                   : severityRank(bIt->second.severity);
				    if(aRank != bRank)
					    return aRank > bRank;
				    return getPathLeafName(*a) < getPathLeafName(*b);
			    });
			for(const std::string* child : visibleChildren)
				emit(*child, depth + 1);
		};  // end emit()

		emit("/" + topicPair.first, 0);
	}  //end topic loop

	json += "],\"rowCount\":" + std::to_string(rowCount) +
	        ",\"truncated\":" + (truncated ? "true" : "false") + "}";
	return json;
}  // end getAlarmTreeJSON()

//==============================================================================
/// sendAcknowledgeJSON
///	Sends the acknowledge (or unacknowledge) command for the paths given, which are pvs
/// 	or nodes of the alarm tree (i.e. all the alarms below). Paths that are not known, or
/// 	not in alarm, are skipped, as are the alarms already acknowledged (or, for
/// 	unacknowledge, not acknowledged).
///
///	With onlyCurrentOk, the command is only for the alarms of pvs that are OK now: so
/// 	it is sent for each of such alarms below a node, and not for the node as a whole.
std::string KafkaAlarmReader::sendAcknowledgeJSON(bool               acknowledge,
                                                  const std::string& user,
                                                  const std::vector<std::string>& paths,
                                                  bool onlyCurrentOk)
{
	start();

	std::vector<std::pair<std::string, std::string>> targets;
	std::set<std::string>                            targetPaths;  //to send only once
	size_t                                           skippedCount = 0;
	{
		std::lock_guard<std::mutex> lock(mutex_);
		for(const auto& path : paths)
		{
			// path is /Configuration/path/to/pv
			const size_t      pos = path.find('/', 1);
			const std::string topic =
			    (path.size() > 1 && path[0] == '/' && pos != std::string::npos)
			        ? path.substr(1, pos - 1)
			        : "";
			auto topicIt = topics_.find(topic);
			if(topicIt == topics_.end())
			{
				++skippedCount;
				continue;
			}
			auto stateIt  = topicIt->second.states.find(path);
			auto configIt = topicIt->second.configs.find(path);
			if(stateIt == topicIt->second.states.end())
			{
				++skippedCount;
				continue;
			}
			if(!stateIt->second.isLeaf && onlyCurrentOk)
			{
				// a node of the alarm tree: acts on each alarm below it that is OK now
				const std::string prefix     = path + "/";
				size_t            belowCount = 0;
				for(const auto& statePair : topicIt->second.states)
				{
					if(!statePair.second.isLeaf ||
					   statePair.first.compare(0, prefix.size(), prefix))
						continue;
					auto belowConfigIt = topicIt->second.configs.find(statePair.first);
					if(belowConfigIt == topicIt->second.configs.end() ||
					   !belowConfigIt->second.enabled ||
					   !isAlarmMatch(statePair.first,
					                 statePair.second,
					                 belowConfigIt->second,
					                 {},
					                 true,
					                 "",
					                 true /*onlyCurrentOk*/) ||
					   isAcknowledged(statePair.second.severity) == acknowledge)
						continue;
					++belowCount;
					if(targetPaths.insert(statePair.first).second)
						targets.push_back(std::make_pair(topic, statePair.first));
				}
				if(!belowCount)
					++skippedCount;
				continue;
			}
			else if(!stateIt->second.isLeaf)
			{
				// a node of the alarm tree: acts on all the alarms below it
				size_t activeCount, acknowledgedCount;
				countBelow(topicIt->second, path, activeCount, acknowledgedCount);
				if((acknowledge ? activeCount : acknowledgedCount) == 0)
				{
					++skippedCount;
					continue;
				}
			}
			else if(configIt == topicIt->second.configs.end() ||
			        !isAlarmMatch(path,
			                      stateIt->second,
			                      configIt->second,
			                      {},
			                      true,
			                      "",
			                      onlyCurrentOk) ||
			        isAcknowledged(stateIt->second.severity) == acknowledge)
			{
				++skippedCount;
				continue;
			}
			if(targetPaths.insert(path).second)
				targets.push_back(std::make_pair(topic, path));
		}
	}
	return sendCommands(acknowledge, user, targets, skippedCount, "");
}  // end sendAcknowledgeJSON()

//==============================================================================
/// sendAcknowledgeByFilterJSON
///	Sends the acknowledge (or unacknowledge) command for all the alarms that match the
/// 	filter (same parameters as getAlarmsJSON), i.e. also for the alarms beyond the
/// 	rows shown to the user.
///
///	expectedCount is the count that the user confirmed: nothing is sent if the alarms
/// 	have changed in the meantime to many more than that.
std::string KafkaAlarmReader::sendAcknowledgeByFilterJSON(
    bool                         acknowledge,
    const std::string&           user,
    const std::string&           topicFilter,
    const std::set<std::string>& severities,
    bool                         includeAcknowledged,
    const std::string&           textFilter,
    bool                         onlyCurrentOk,
    size_t                       expectedCount)
{
	start();

	std::vector<std::pair<std::string, std::string>> targets;
	const std::string                                filter = toLower(textFilter);
	std::string                                      error;
	{
		std::lock_guard<std::mutex> lock(mutex_);
		for(const auto& topicPair : topics_)
		{
			if(topicFilter != "" && topicFilter != topicPair.first)
				continue;
			for(const auto& statePair : topicPair.second.states)
			{
				if(!statePair.second.isLeaf)
					continue;
				auto configIt = topicPair.second.configs.find(statePair.first);
				if(configIt == topicPair.second.configs.end() ||
				   !configIt->second.enabled)
					continue;
				if(!isAlarmMatch(statePair.first,
				                 statePair.second,
				                 configIt->second,
				                 severities,
				                 includeAcknowledged,
				                 filter,
				                 onlyCurrentOk) ||
				   isAcknowledged(statePair.second.severity) == acknowledge)
					continue;
				targets.push_back(std::make_pair(topicPair.first, statePair.first));
			}
		}
	}

	if(targets.size() > expectedCount + std::max((size_t)5, expectedCount / 20))
	{
		error = "Nothing was sent: the alarms that match the filter are now " +
		        std::to_string(targets.size()) + ", and no longer " +
		        std::to_string(expectedCount) + ". Please check and try again.";
		targets.clear();
	}
	return sendCommands(acknowledge, user, targets, 0 /*skippedCount*/, error);
}  // end sendAcknowledgeByFilterJSON()

//==============================================================================
/// sendCommands
///	Publishes one command per target to the command topic of its alarm configuration,
/// 	and waits for the delivery to Kafka.
std::string KafkaAlarmReader::sendCommands(
    bool                                                    acknowledge,
    const std::string&                                      user,
    const std::vector<std::pair<std::string, std::string>>& targets,
    size_t                                                  skippedCount,
    std::string                                             error)
{
	size_t sentCount = 0;

#ifdef OTS_HAVE_RDKAFKA
	std::lock_guard<std::mutex> lock(producerMutex_);

	if(!enabled_)
		error = disabledReason_;
	else if(targets.size() && !producer_)
	{
		char                                             errstr[512];
		rd_kafka_conf_t*                                 conf = rd_kafka_conf_new();
		std::vector<std::pair<std::string, std::string>> settings(
		    {{"bootstrap.servers", brokers_},
		     {"client.id", "ots-alarm-command"},
		     {"acks", "all"},
		     {"message.timeout.ms", "10000"},
		     {"socket.keepalive.enable", "true"}});
		for(const auto& setting : settings)
			if(rd_kafka_conf_set(conf,
			                     setting.first.c_str(),
			                     setting.second.c_str(),
			                     errstr,
			                     sizeof(errstr)) != RD_KAFKA_CONF_OK)
				error = "Illegal Kafka setting " + setting.first + ": " + errstr;
		rd_kafka_conf_set_dr_msg_cb(conf, commandDeliveryCallback);
		rd_kafka_conf_set_log_cb(conf, logCallback);

		if(error == "")
			producer_ = rd_kafka_new(RD_KAFKA_PRODUCER, conf, errstr, sizeof(errstr));
		if(!producer_)
		{
			if(error == "")
				error = "The Kafka producer could not be created: " + std::string(errstr);
			rd_kafka_conf_destroy(conf);  //conf is only owned by producer on success
		}
	}

	if(error == "" && targets.size())
	{
		rd_kafka_t* producer = (rd_kafka_t*)producer_;

		char hostname[256] = "";
		gethostname(hostname, sizeof(hostname) - 1);
		const std::string value = "{\"user\":\"" + escapeJSON(user) + "\",\"host\":\"" +
		                          escapeJSON(hostname) + "\",\"command\":\"" +
		                          (acknowledge ? "acknowledge" : "unacknowledge") + "\"}";

		std::pair<size_t /*count*/, std::string /*last error*/> failures(0, "");
		size_t                                                  queuedCount = 0;
		for(const auto& target : targets)
		{
			const std::string   topic = target.first + COMMAND_TOPIC_SUFFIX;
			const std::string   key   = COMMAND_KEY_PREFIX + target.second;
			rd_kafka_resp_err_t err;
			int                 tries = 0;
			while((err = rd_kafka_producev(
			           producer,
			           RD_KAFKA_V_TOPIC(topic.c_str()),
			           RD_KAFKA_V_PARTITION(0),
			           RD_KAFKA_V_KEY(key.data(), key.size()),
			           RD_KAFKA_V_VALUE((void*)value.data(), value.size()),
			           RD_KAFKA_V_MSGFLAGS(RD_KAFKA_MSG_F_COPY),
			           RD_KAFKA_V_OPAQUE(&failures),
			           RD_KAFKA_V_END)) == RD_KAFKA_RESP_ERR__QUEUE_FULL &&
			      ++tries < 20)
				rd_kafka_poll(producer, 100 /*timeout_ms*/);
			if(err)
			{
				++failures.first;
				failures.second = rd_kafka_err2str(err);
			}
			else
				++queuedCount;
		}

		if(rd_kafka_flush(producer, 15000 /*timeout_ms*/) != RD_KAFKA_RESP_ERR_NO_ERROR)
		{
			// give up on what is left, so that nothing is delivered later by surprise
			rd_kafka_purge(producer, RD_KAFKA_PURGE_F_QUEUE | RD_KAFKA_PURGE_F_INFLIGHT);
			rd_kafka_flush(producer, 5000 /*timeout_ms*/);
		}

		sentCount = queuedCount > failures.first ? targets.size() - failures.first : 0;
		if(failures.first)
			error = std::to_string(failures.first) + " of " +
			        std::to_string(targets.size()) +
			        " commands could not be delivered to Kafka: " + failures.second;

		__COUT_INFO__ << "User '" << user << "' sent " << sentCount << " '"
		              << (acknowledge ? "acknowledge" : "unacknowledge")
		              << "' commands to the Phoebus alarm servers"
		              << (error != "" ? " (" + error + ")" : "") << __E__;
	}
#else
	(void)acknowledge;
	(void)user;
	(void)targets;
	if(error == "")
		error = disabledReason_;
#endif

	return "{\"sentCount\":" + std::to_string(sentCount) +
	       ",\"skippedCount\":" + std::to_string(skippedCount) + ",\"error\":\"" +
	       escapeJSON(error) + "\"}";
}  // end sendCommands()

//==============================================================================
/// getAlarmsJSON
///	Returns the alarm state as shown by the Phoebus alarm table, i.e. the pvs with a
/// 	(latched) severity that is not OK.
///
///	topicFilter is one alarm configuration name, or "" for all.
///	severities is the set of severities to include, without the _ACK suffix (empty set
/// 	for all severities except OK).
///	onlyCurrentOk is to include only the alarms of pvs that are OK now (latched alarms).
std::string KafkaAlarmReader::getAlarmsJSON(
    const std::string&                                    topicFilter,
    const std::set<std::string>&                          severities,
    bool                                                  includeAcknowledged,
    const std::string&                                    textFilter,
    bool                                                  onlyCurrentOk,
    size_t                                                maxRows,
    const std::function<std::string(const std::string&)>& getExtraJSONFields)
{
	start();

	struct Row_t
	{
		const std::string*  topic;
		const std::string*  path;
		const AlarmState_t* state;
		unsigned int        rank;
	};  //end Row_t struct
	std::vector<Row_t> rows;
	const std::string  filter = toLower(textFilter);

	std::lock_guard<std::mutex> lock(mutex_);

	std::string json       = "{" + getStatusJSONFields() + ",\"topics\":[";
	bool        firstTopic = true;
	for(const auto& topicPair : topics_)
	{
		const Topic_t&                topic = topicPair.second;
		std::map<std::string, size_t> counts;
		size_t                        pvCount = 0;

		for(const auto& statePair : topic.states)
		{
			const AlarmState_t& state = statePair.second;
			if(!state.isLeaf)
				continue;
			auto configIt = topic.configs.find(statePair.first);
			if(configIt == topic.configs.end() || !configIt->second.enabled)
				continue;  //pv was removed from the alarm configuration, or is disabled

			++pvCount;
			++counts[state.severity];

			if(topicFilter != "" && topicFilter != topicPair.first)
				continue;
			if(!isAlarmMatch(statePair.first,
			                 state,
			                 configIt->second,
			                 severities,
			                 includeAcknowledged,
			                 filter,
			                 onlyCurrentOk))
				continue;

			rows.push_back(Row_t{&topicPair.first,
			                     &statePair.first,
			                     &state,
			                     severityRank(state.severity)});
		}  //end state loop

		//the state of the root of the alarm tree is the summary of the configuration
		std::string rootSeverity;
		auto        rootIt = topic.states.find("/" + topicPair.first);
		if(rootIt != topic.states.end())
			rootSeverity = rootIt->second.severity;

		json += std::string(firstTopic ? "" : ",") + "{\"name\":\"" +
		        escapeJSON(topicPair.first) + "\",";
		json += "\"loaded\":" + std::string(topic.loaded ? "true" : "false") + ",";
		json += "\"severity\":\"" + escapeJSON(rootSeverity) + "\",";
		json += "\"pvCount\":" + std::to_string(pvCount) + ",";
		json += "\"lastUpdate\":" + std::to_string(topic.lastUpdate) + ",";
		json += "\"counts\":{";
		bool firstCount = true;
		for(const auto& count : counts)
		{
			json += std::string(firstCount ? "" : ",") + "\"" + escapeJSON(count.first) +
			        "\":" + std::to_string(count.second);
			firstCount = false;
		}
		json += "}}";
		firstTopic = false;
	}  //end topic loop
	json += "],";

	//most severe first, then most recent first
	std::sort(rows.begin(), rows.end(), [](const Row_t& a, const Row_t& b) {
		if(a.rank != b.rank)
			return a.rank > b.rank;
		if(a.state->time != b.state->time)
			return a.state->time > b.state->time;
		return *a.path < *b.path;
	});

	size_t acknowledgedCount = 0;
	for(const auto& row : rows)
		if(isAcknowledged(row.state->severity))
			++acknowledgedCount;

	json += "\"matchedCount\":" + std::to_string(rows.size()) + ",";
	json += "\"matchedAcknowledgedCount\":" + std::to_string(acknowledgedCount) + ",";
	json += "\"alarms\":[";
	for(size_t i = 0; i < rows.size() && i < maxRows; ++i)
	{
		const Row_t&        row      = rows[i];
		const AlarmState_t& state    = *row.state;
		auto                configIt = topics_.at(*row.topic).configs.find(*row.path);

		json += std::string(i ? "," : "") + "{";
		json += "\"topic\":\"" + escapeJSON(*row.topic) + "\",";
		json += "\"path\":\"" + escapeJSON(*row.path) + "\",";
		json += "\"pv\":\"" + escapeJSON(getPathLeafName(*row.path)) + "\",";
		json += "\"description\":\"" + escapeJSON(configIt->second.description) + "\",";
		json += "\"severity\":\"" + escapeJSON(state.severity) + "\",";
		json += "\"message\":\"" + escapeJSON(state.message) + "\",";
		json += "\"value\":\"" + escapeJSON(state.value) + "\",";
		json += "\"time\":" + std::to_string(state.time) + ",";
		if(getExtraJSONFields)
			json += getExtraJSONFields(getPathLeafName(*row.path)) + ",";
		json += "\"currentSeverity\":\"" + escapeJSON(state.currentSeverity) + "\",";
		json += "\"currentMessage\":\"" + escapeJSON(state.currentMessage) + "\"";
		json += "}";
	}
	json += "]}";
	return json;
}  // end getAlarmsJSON()

//==============================================================================
/// getOtsErrorsJSON
///	Returns the most recent ots error records (as published by the Console
/// 	Supervisors of all ots instances), newest first.
std::string KafkaAlarmReader::getOtsErrorsJSON(const std::string& textFilter,
                                               size_t             maxRows)
{
	start();

	const std::string filter = toLower(textFilter);

	std::lock_guard<std::mutex> lock(mutex_);

	std::string json = "{" + getStatusJSONFields() + ",";
	json += "\"loaded\":" + std::string(errorTopicLoaded_ ? "true" : "false") + ",";
	json += "\"cachedCount\":" + std::to_string(errors_.size()) + ",";
	json += "\"errors\":[";
	size_t count = 0;
	for(auto it = errors_.rbegin(); it != errors_.rend() && count < maxRows; ++it)
	{
		if(filter != "" && toLower(it->record).find(filter) == std::string::npos)
			continue;
		json += std::string(count ? "," : "") +
		        "{\"kafkaTime\":" + std::to_string(it->kafkaTime) + ",\"key\":\"" +
		        escapeJSON(it->key) + "\",\"record\":" + it->record + "}";
		++count;
	}
	json += "]}";
	return json;
}  // end getOtsErrorsJSON()
