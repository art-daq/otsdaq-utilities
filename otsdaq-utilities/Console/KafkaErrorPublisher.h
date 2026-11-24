#ifndef _ots_KafkaErrorPublisher_h_
#define _ots_KafkaErrorPublisher_h_

#include <ctime>
#include <string>
#include <unordered_map>

// forward declarations of librdkafka handles (so that rdkafka.h is only needed in the .cc)
struct rd_kafka_s;
struct rd_kafka_topic_s;

namespace ots
{

// clang-format off

////// class define
/// KafkaErrorPublisher
///	This class publishes the Error messages seen by the Console Supervisor to a Kafka
/// 	topic, as one JSON record per message, so that there is one persistent error
/// 	record shared by all ots instances.
///
///	Publishing is enabled by environment variable:
///		OTS_KAFKA_BROKERS		:= Kafka bootstrap servers, e.g. "mu2e-dcs-02.fnal.gov:9092" (publishing is disabled if not set)
///		OTS_KAFKA_ERROR_TOPIC	:= Kafka topic name (optional, default is "OtsErrors")
///
///	Note: publish is non-blocking. If the broker is unreachable, records are queued
/// 	(and eventually dropped) by librdkafka, and never hold up the Console.
class KafkaErrorPublisher
{
  public:
								KafkaErrorPublisher					(void);
								~KafkaErrorPublisher				(void);

	bool 						isEnabled							(void) const { return producer_ != nullptr; }
	const std::string&			getBrokers							(void) const { return brokers_; }
	const std::string&			getTopic							(void) const { return topic_; }

	void 						publishError						(const std::string& time, const std::string& hostname,
																	 const std::string& source, const std::string& sourceID,
																	 const std::string& label, const std::string& file,
																	 const std::string& line, const std::string& msg);
	void 						poll								(void);
	std::string 				getStatusString						(void) const;

	static std::string			escapeJSON							(const std::string& str);

	static const std::string 	DEFAULT_TOPIC;
	static const time_t 		DEDUP_WINDOW_S;
	static const time_t 		RATE_WINDOW_S;
	static const size_t 		RATE_WINDOW_MAX_RECORDS;
	static const size_t 		MAX_MESSAGE_SIZE;

	///counters are public for the librdkafka callbacks
	size_t						publishedCount_ = 0, deliveredCount_ = 0, deliveryFailedCount_ = 0;
	size_t						duplicateCount_ = 0, rateLimitedCount_ = 0, queueFullCount_ = 0;
	std::string					lastKafkaError_;

  private:
	bool 						produce								(const std::string& record);

	struct DedupEntry_t
	{
		time_t 					lastPublishedTime = 0;
		size_t 					suppressedCount   = 0;
	}; //end DedupEntry_t struct

	std::string 				brokers_, topic_;
	std::string 				subsystem_, owner_, gateway_;
	rd_kafka_s*					producer_ 		= nullptr;
	rd_kafka_topic_s*			topicHandle_ 	= nullptr;

	std::unordered_map<size_t /*source+msg hash*/, DedupEntry_t>
								dedupMap_;
	time_t						rateWindowStart_ = 0;
	size_t						rateWindowCount_ = 0, rateWindowDropped_ = 0;
	time_t						lastStatusPrintTime_ = 0;
	size_t						lastStatusPrintFailures_ = 0;
};

// clang-format on
}  // namespace ots

#endif
