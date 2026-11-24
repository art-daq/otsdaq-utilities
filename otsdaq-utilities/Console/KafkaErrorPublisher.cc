#include "otsdaq-utilities/Console/KafkaErrorPublisher.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"

#ifdef OTS_HAVE_RDKAFKA
#include <librdkafka/rdkafka.h>
#endif

#include <unistd.h>  //for gethostname
#include <cstdlib>   //for getenv
#include <cstdio>    //for snprintf
#include <functional>
#include <sstream>
#include <vector>

using namespace ots;

// Note: Label must be Console, so that messages from this class can never be
// 	published (the Console Supervisor does not publish its own messages),
//	i.e., to avoid a recursive publish of Kafka failures.
#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "Console"

const std::string KafkaErrorPublisher::DEFAULT_TOPIC           = "OtsErrors";
const time_t      KafkaErrorPublisher::DEDUP_WINDOW_S          = 60;
const time_t      KafkaErrorPublisher::RATE_WINDOW_S           = 10;
const size_t      KafkaErrorPublisher::RATE_WINDOW_MAX_RECORDS = 100;
const size_t      KafkaErrorPublisher::MAX_MESSAGE_SIZE        = 8000;

#ifdef OTS_HAVE_RDKAFKA
namespace
{
//==============================================================================
/// delivery report callback, called from poll() for every produced record
void deliveryReportCallback(rd_kafka_t* /*rk*/,
                            const rd_kafka_message_t* rkmessage,
                            void*                     opaque)
{
	KafkaErrorPublisher* publisher = (KafkaErrorPublisher*)opaque;
	if(rkmessage->err)
	{
		++publisher->deliveryFailedCount_;
		publisher->lastKafkaError_ = rd_kafka_err2str(rkmessage->err);
	}
	else
		++publisher->deliveredCount_;
}  // end deliveryReportCallback()

//==============================================================================
/// error callback, called from poll(), e.g. when all brokers are down
void errorCallback(rd_kafka_t* /*rk*/, int /*err*/, const char* reason, void* opaque)
{
	((KafkaErrorPublisher*)opaque)->lastKafkaError_ = reason;
}  // end errorCallback()

//==============================================================================
/// log callback, to keep librdkafka from printing to stderr at every reconnect attempt
void logCallback(const rd_kafka_t* /*rk*/,
                 int /*level*/,
                 const char* /*fac*/,
                 const char* /*buf*/)
{
}  // end logCallback()
}  // namespace
#endif

//==============================================================================
KafkaErrorPublisher::KafkaErrorPublisher(void)
{
	const char* env = getenv("OTS_KAFKA_BROKERS");
	brokers_        = env ? env : "";
	env             = getenv("OTS_KAFKA_ERROR_TOPIC");
	topic_          = (env && env[0]) ? env : DEFAULT_TOPIC;

	if(brokers_ == "")
	{
		__COUT__ << "Kafka publishing of Console errors is disabled (to enable, set "
		            "environment variable OTS_KAFKA_BROKERS)."
		         << __E__;
		return;
	}

#ifdef OTS_HAVE_RDKAFKA
	env        = getenv("OTS_SETUP_TYPE");
	subsystem_ = env ? env : "";
	env        = getenv("OTS_OWNER");
	owner_     = env ? env : "";
	{
		char hostname[256] = "";
		gethostname(hostname, sizeof(hostname) - 1);
		const char* host = getenv("OTS_GATEWAY_HOST");
		const char* port = getenv("OTS_MAIN_PORT");
		gateway_ = std::string(host ? host : hostname) + ":" + std::string(port ? port : "");
	}

	char             errstr[512];
	rd_kafka_conf_t* conf = rd_kafka_conf_new();

	std::vector<std::pair<std::string, std::string>> settings(
	    {{"bootstrap.servers", brokers_},
	     {"client.id", "ots-console-" + gateway_},
	     //drop records that could not be delivered after 5 minutes, e.g. broker is down
	     {"message.timeout.ms", "300000"},
	     //limit the memory held while the broker is down
	     {"queue.buffering.max.messages", "10000"},
	     {"socket.keepalive.enable", "true"}});
	for(const auto& setting : settings)
		if(rd_kafka_conf_set(conf,
		                     setting.first.c_str(),
		                     setting.second.c_str(),
		                     errstr,
		                     sizeof(errstr)) != RD_KAFKA_CONF_OK)
		{
			__COUT_WARN__ << "Kafka publishing of Console errors is disabled, illegal "
			              << setting.first << " = '" << setting.second
			              << "': " << errstr << __E__;
			rd_kafka_conf_destroy(conf);
			return;
		}

	rd_kafka_conf_set_opaque(conf, this);
	rd_kafka_conf_set_dr_msg_cb(conf, deliveryReportCallback);
	rd_kafka_conf_set_error_cb(conf, errorCallback);
	rd_kafka_conf_set_log_cb(conf, logCallback);

	producer_ = rd_kafka_new(RD_KAFKA_PRODUCER, conf, errstr, sizeof(errstr));
	if(!producer_)
	{
		__COUT_WARN__ << "Kafka publishing of Console errors is disabled, the producer "
		                 "could not be created: "
		              << errstr << __E__;
		rd_kafka_conf_destroy(conf);  //conf is only owned by producer on success
		return;
	}

	topicHandle_ = rd_kafka_topic_new(producer_, topic_.c_str(), nullptr);
	if(!topicHandle_)
	{
		__COUT_WARN__ << "Kafka publishing of Console errors is disabled, illegal topic '"
		              << topic_ << "': " << rd_kafka_err2str(rd_kafka_last_error())
		              << __E__;
		rd_kafka_destroy(producer_);
		producer_ = nullptr;
		return;
	}

	__COUT_INFO__ << "Console errors will be published to Kafka topic '" << topic_
	              << "' at " << brokers_ << " with key '" << subsystem_ << "'" << __E__;
#else
	__COUT_WARN__ << "Environment variable OTS_KAFKA_BROKERS is set to '" << brokers_
	              << ",' but Kafka publishing of Console errors is disabled because "
	                 "librdkafka was not found at compile time."
	              << __E__;
#endif
}  // end constructor()

//==============================================================================
KafkaErrorPublisher::~KafkaErrorPublisher(void)
{
#ifdef OTS_HAVE_RDKAFKA
	if(!producer_)
		return;
	rd_kafka_flush(producer_, 2000 /*timeout_ms*/);
	rd_kafka_topic_destroy(topicHandle_);
	rd_kafka_destroy(producer_);
#endif
}  // end destructor()

//==============================================================================
/// escapeJSON
///	Returns str ready to be placed inside a JSON string, i.e. with quotes, backslashes,
/// 	and all control characters (e.g. terminal color codes) escaped.
std::string KafkaErrorPublisher::escapeJSON(const std::string& str)
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
/// publishError
///	Publishes one Error message as a JSON record. Identical messages from the same
/// 	source are only published once per DEDUP_WINDOW_S, and at most
/// 	RATE_WINDOW_MAX_RECORDS are published per RATE_WINDOW_S; the next published
/// 	record indicates how many were suppressed.
///
///	Record type is "fsm" for a state machine failure, and "error" otherwise.
void KafkaErrorPublisher::publishError(const std::string& time,
                                       const std::string& hostname,
                                       const std::string& source,
                                       const std::string& sourceID,
                                       const std::string& label,
                                       const std::string& file,
                                       const std::string& line,
                                       const std::string& msg)
{
	if(!producer_)
		return;

	const time_t now = ::time(0);

	//prune expired entries, if dedup map is getting large
	if(dedupMap_.size() > 1000)
	{
		for(auto it = dedupMap_.begin(); it != dedupMap_.end();)
		{
			if(now - it->second.lastPublishedTime >= DEDUP_WINDOW_S)
				it = dedupMap_.erase(it);
			else
				++it;
		}
	}

	//suppress duplicates within window
	DedupEntry_t& dedup = dedupMap_[std::hash<std::string>{}(source + "|" + msg)];
	if(dedup.lastPublishedTime && now - dedup.lastPublishedTime < DEDUP_WINDOW_S)
	{
		++dedup.suppressedCount;
		++duplicateCount_;
		return;
	}

	//limit the record rate
	size_t rateDropped = 0;
	if(now - rateWindowStart_ >= RATE_WINDOW_S)
	{
		rateDropped        = rateWindowDropped_;  //report drops of previous window
		rateWindowStart_   = now;
		rateWindowCount_   = 0;
		rateWindowDropped_ = 0;
	}
	if(rateWindowCount_ >= RATE_WINDOW_MAX_RECORDS)
	{
		++rateWindowDropped_;
		++rateLimitedCount_;
		return;
	}
	++rateWindowCount_;

	const bool isFSM =
	    msg.find("Failure performing transition from") != std::string::npos ||
	    msg.find("An asynchronous failure was encountered") != std::string::npos;

	std::stringstream record;
	record << "{\"time\":" << (time.size() ? time : std::to_string(now)) << ",\"type\":\""
	       << (isFSM ? "fsm" : "error") << "\""
	       << ",\"level\":\"Error\""
	       << ",\"subsystem\":\"" << escapeJSON(subsystem_) << "\""
	       << ",\"owner\":\"" << escapeJSON(owner_) << "\""
	       << ",\"gateway\":\"" << escapeJSON(gateway_) << "\""
	       << ",\"host\":\"" << escapeJSON(hostname) << "\""
	       << ",\"source\":\"" << escapeJSON(source) << "\""
	       << ",\"pid\":\"" << escapeJSON(sourceID) << "\""
	       << ",\"label\":\"" << escapeJSON(label) << "\""
	       << ",\"file\":\"" << escapeJSON(file) << "\""
	       << ",\"line\":\"" << escapeJSON(line) << "\""
	       << ",\"repeats\":" << dedup.suppressedCount
	       << ",\"dropped\":" << rateDropped << ",\"message\":\""
	       << escapeJSON(msg.size() > MAX_MESSAGE_SIZE
	                         ? msg.substr(0, MAX_MESSAGE_SIZE) + "..."
	                         : msg)
	       << "\"}";

	if(produce(record.str()))
	{
		dedup.lastPublishedTime = now;
		dedup.suppressedCount   = 0;
	}

	poll();
}  // end publishError()

//==============================================================================
/// produce
///	Returns true if record was queued for delivery (non-blocking).
bool KafkaErrorPublisher::produce(const std::string& record)
{
#ifdef OTS_HAVE_RDKAFKA
	if(rd_kafka_produce(topicHandle_,
	                    RD_KAFKA_PARTITION_UA,
	                    RD_KAFKA_MSG_F_COPY,
	                    (void*)record.data(),
	                    record.size(),
	                    subsystem_.data(),
	                    subsystem_.size(),
	                    nullptr /*msg_opaque*/) == -1)
	{
		++queueFullCount_;
		lastKafkaError_ = rd_kafka_err2str(rd_kafka_last_error());
		return false;
	}
	++publishedCount_;
	return true;
#else
	(void)record;
	return false;
#endif
}  // end produce()

//==============================================================================
/// poll
///	Serves the delivery reports, and occasionally prints the status when records were
/// 	lost. To be called periodically, even when there is nothing to publish.
void KafkaErrorPublisher::poll(void)
{
	if(!producer_)
		return;
#ifdef OTS_HAVE_RDKAFKA
	rd_kafka_poll(producer_, 0 /*timeout_ms, i.e. non-blocking*/);
#endif

	const size_t failures = deliveryFailedCount_ + queueFullCount_;
	const time_t now      = ::time(0);
	if(failures != lastStatusPrintFailures_ && now - lastStatusPrintTime_ >= 5 * 60)
	{
		lastStatusPrintFailures_ = failures;
		lastStatusPrintTime_     = now;
		__COUT_WARN__ << "Console errors are failing to publish to Kafka. "
		              << getStatusString() << __E__;
	}
}  // end poll()

//==============================================================================
std::string KafkaErrorPublisher::getStatusString(void) const
{
	std::stringstream ss;
	if(!producer_)
	{
		ss << "Kafka publishing is disabled";
		return ss.str();
	}
	ss << "Kafka topic '" << topic_ << "' at " << brokers_ << ": published "
	   << publishedCount_ << ", delivered " << deliveredCount_ << ", delivery failed "
	   << deliveryFailedCount_ << ", queue full " << queueFullCount_
	   << ", duplicates suppressed " << duplicateCount_ << ", rate limited "
	   << rateLimitedCount_;
	if(lastKafkaError_.size())
		ss << ", last Kafka error: " << lastKafkaError_;
	return ss.str();
}  // end getStatusString()
