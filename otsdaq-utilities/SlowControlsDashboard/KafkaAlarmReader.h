#ifndef _ots_KafkaAlarmReader_h_
#define _ots_KafkaAlarmReader_h_

#include <atomic>
#include <ctime>
#include <deque>
#include <functional>
#include <map>
#include <mutex>
#include <set>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

namespace ots
{

// clang-format off

////// class define
/// KafkaAlarmReader
///	This class reads the alarm state published to Kafka by the Phoebus alarm servers,
/// 	so that ots shows the same alarms as the Phoebus alarm table (latched severity,
/// 	acknowledge state, current severity). It is a read-only consumer: nothing is ever
/// 	written to the alarm topics, and no consumer group offsets are committed.
///
///	The only writing is the acknowledge (or unacknowledge) command, on explicit user
/// 	request, sent as the Phoebus clients do: to topic 'XCommand' of configuration 'X'
///		command:/X/path/to/pv	:= {"user":"...","host":"...","command":"acknowledge"}
/// 	The path can also be a node of the alarm tree, i.e. all alarms below it.
/// 	The alarm server handles the command and publishes the new state.
///
///	Each Phoebus alarm configuration 'X' is one compacted Kafka topic 'X' with keys:
///		config:/X/path/to/pv	:= JSON configuration of tree node or pv (null value if deleted)
///		state:/X/path/to/pv		:= JSON alarm state of tree node or pv (null value if deleted)
///
///	The reader also keeps the most recent records of the ots error topic (see
/// 	otsdaq-utilities/Console/KafkaErrorPublisher.h).
///
///	Reading is enabled by environment variable:
///		OTS_KAFKA_BROKERS		:= Kafka bootstrap servers, e.g. "kafkahost:9092" (disabled if not set)
///		OTS_KAFKA_ALARM_TOPICS	:= comma-separated Phoebus alarm configurations, e.g. "Calo,CrvAll"
///		OTS_KAFKA_ERROR_TOPIC	:= ots error topic name (optional, default is "OtsErrors")
class KafkaAlarmReader
{
  public:
									KafkaAlarmReader					(void);
									~KafkaAlarmReader					(void);

	bool 							isEnabled							(void) const { return enabled_; }
	void 							start								(void); ///< starts the reading thread, if not already started

	/// returns JSON object with topic summaries and the (filtered) list of pv alarms
	std::string						getAlarmsJSON						(const std::string& topicFilter, const std::set<std::string>& severities,
																		 bool includeAcknowledged, const std::string& textFilter, size_t maxRows,
																		 const std::function<std::string(const std::string& /*pv*/)>& getExtraJSONFields = nullptr); ///< extra fields are added to each alarm
	/// returns JSON object with the rows (in display order) of the alarm tree, as in the Phoebus alarm tree: only the children of the open nodes are listed
	std::string						getAlarmTreeJSON					(const std::string& topicFilter, const std::set<std::string>& severities,
																		 bool includeAcknowledged, const std::string& textFilter, bool showAll,
																		 const std::set<std::string>& openPaths, bool openRoots, size_t maxRows,
																		 const std::function<std::string(const std::string& /*pv*/)>& getExtraJSONFields = nullptr); ///< extra fields are added to each pv row
	/// sends the command for the alarms (pv paths) given, returns JSON object with sentCount, skippedCount and error
	std::string						sendAcknowledgeJSON					(bool acknowledge, const std::string& user, const std::vector<std::string>& paths);
	/// sends the command for all alarms that match the filter (as getAlarmsJSON), if not many more than expectedCount
	std::string						sendAcknowledgeByFilterJSON			(bool acknowledge, const std::string& user, const std::string& topicFilter,
																		 const std::set<std::string>& severities, bool includeAcknowledged,
																		 const std::string& textFilter, size_t expectedCount);

	/// returns JSON object with the most recent ots error records, newest first
	std::string						getOtsErrorsJSON					(const std::string& textFilter, size_t maxRows);

	static unsigned int 			severityRank						(const std::string& severity);

	static const std::string 		DEFAULT_ERROR_TOPIC;
	static const size_t 			MAX_ERROR_RECORDS;
	static const std::string 		COMMAND_TOPIC_SUFFIX, COMMAND_KEY_PREFIX;

  private:
	struct AlarmState_t
	{
		std::string 				severity, message, value, currentSeverity, currentMessage;
		time_t 						time   = 0;
		bool 						isLeaf = false;
	}; //end AlarmState_t struct

	struct AlarmConfig_t
	{
		std::string 				description;
		bool 						enabled = true;
	}; //end AlarmConfig_t struct

	struct Topic_t
	{
		std::unordered_map<std::string /*path*/, AlarmState_t>	states;
		std::unordered_map<std::string /*path*/, AlarmConfig_t>	configs;
		bool 						loaded       = false; ///< true once the end of the topic was reached
		size_t 						messageCount = 0;
		time_t 						lastUpdate   = 0;
	}; //end Topic_t struct

	struct ErrorRecord_t
	{
		time_t 						kafkaTime = 0;
		std::string 				key, record /*JSON*/;
	}; //end ErrorRecord_t struct

	void 							readLoop							(void);
	void 							handleMessage						(const std::string& topic, const std::string& key,
																		 const char* payload, size_t payloadSize, time_t kafkaTime);
	std::string 					getStatusJSONFields					(void) const; ///< must be called with mutex_ locked
	static bool 					isAcknowledged						(const std::string& severity);
	static void 					countBelow							(const Topic_t& topic, const std::string& nodePath, size_t& activeCount, size_t& acknowledgedCount);
	static bool 					isAlarmMatch						(const std::string& path, const AlarmState_t& state, const AlarmConfig_t& config,
																		 const std::set<std::string>& severities, bool includeAcknowledged, const std::string& lowerCaseTextFilter);
	std::string 					sendCommands						(bool acknowledge, const std::string& user,
																		 const std::vector<std::pair<std::string /*topic*/, std::string /*path*/>>& targets,
																		 size_t skippedCount, std::string error);

	bool							enabled_ = false;
	std::string 					brokers_, errorTopic_, disabledReason_;
	std::vector<std::string>		alarmTopics_;

	std::mutex						mutex_; ///< protects everything below
	std::map<std::string /*topic*/, Topic_t>
									topics_;
	std::deque<ErrorRecord_t>		errors_;
	bool							errorTopicLoaded_ = false;
	std::string						lastKafkaError_;
	time_t							lastKafkaErrorTime_ = 0;

	std::mutex						producerMutex_; ///< protects producer_, which is created at the first command
	void*							producer_ = nullptr;

	std::thread						thread_;
	std::atomic<bool>				threadStarted_{false}, exitThread_{false};
};

// clang-format on
}  // namespace ots

#endif
