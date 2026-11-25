#include "otsdaq-utilities/SlowControlsDashboard/ArchiveHistoryReader.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"

#ifdef OTS_HAVE_LIBPQ
#include <libpq-fe.h>
#endif

#include <cmath>    //for isfinite
#include <cstdio>   //for snprintf
#include <cstdlib>  //for getenv, strtod
#include <vector>

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "ArchiveHistoryReader"

const size_t ArchiveHistoryReader::MAX_CHART_POINTS   = 5000;
const size_t ArchiveHistoryReader::CHART_BUCKET_COUNT = 800;

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

#ifdef OTS_HAVE_LIBPQ
//==============================================================================
/// returns the first line of the libpq error message
std::string firstLine(const char* message)
{
	std::string retStr = message ? message : "";
	return retStr.substr(0, retStr.find('\n'));
}  // end firstLine()

//==============================================================================
/// returns the database field as JSON number, or null (e.g., for NULL, NaN and Infinity)
std::string getJSONNumber(PGresult* res, int row, int col)
{
	if(PQgetisnull(res, row, col))
		return "null";
	const char* value = PQgetvalue(res, row, col);
	char*       end   = nullptr;
	if(!std::isfinite(strtod(value, &end)) || end == value || *end != '\0')
		return "null";
	return value;
}  // end getJSONNumber()

//==============================================================================
/// appends one point [time, value, minimum, maximum] per row; rows have 2 or 4 columns
void appendPoints(std::string& json, bool& first, PGresult* res)
{
	const bool hasRange = PQnfields(res) >= 4;
	for(int i = 0; i < PQntuples(res); ++i)
	{
		json += first ? "[" : ",[";
		first = false;
		json += getJSONNumber(res, i, 0) + "," + getJSONNumber(res, i, 1) + ",";
		json += hasRange ? (getJSONNumber(res, i, 2) + "," + getJSONNumber(res, i, 3))
		                 : "null,null";
		json += "]";
	}
}  // end appendPoints()
#endif
}  // namespace

//==============================================================================
ArchiveHistoryReader::ArchiveHistoryReader(void)
{
#ifdef OTS_HAVE_LIBPQ
	// same database as the controls plugin, with the read-only account (from db_setup_ots.sh)
	const char* env = getenv("DCS_ARCHIVE_DATABASE_HOST");
	if(!env || !env[0])
	{
		disabledReason_ =
		    "not configured (environment variable DCS_ARCHIVE_DATABASE_HOST is not set)";
		return;
	}
	host_ = env;
	if((env = getenv("DCS_ARCHIVE_DATABASE_PORT")))
		port_ = env;
	env     = getenv("DCS_ARCHIVE_DATABASE");
	dbname_ = (env && env[0]) ? env : "dcs_archive";
	if((env = getenv("DCS_ARCHIVE_DATABASE_READER_USER")))
		user_ = env;
	if((env = getenv("DCS_ARCHIVE_DATABASE_READER_PWD")))
		password_ = env;
	if(user_ == "")
	{
		disabledReason_ =
		    "not configured (environment variable DCS_ARCHIVE_DATABASE_READER_USER is not set)";
		return;
	}
	enabled_ = true;
#else
	disabledReason_ = "libpq was not found at compile time";
#endif
}  // end constructor()

//==============================================================================
/// getHistoryJSON
///	Returns JSON object:
///		points 				:= array of [time, value, minimum, maximum], oldest first. The first point
///								is the last sample before the time window (its value holds into the window).
///		reducedToBuckets 	:= true if points are the mean (and minimum, maximum) of time buckets
///		archiveProblem 		:= empty, or the reason why there are no points
///		units, lowLimit, highLimit := from the archived display metadata (alarm limits), if any
std::string ArchiveHistoryReader::getHistoryJSON(const std::string& pvName,
                                                 double             fromSeconds,
                                                 double             toSeconds) const
{
	std::string points, meta, problem;
	bool        reducedToBuckets = false;

#ifdef OTS_HAVE_LIBPQ
	// Note: the archive engine marks the times without a value (e.g., pv disconnected or
	//	archive engine stopped) with samples that have a special status and a meaningless
	//	value (e.g., 0), so those are returned as null, i.e. as a gap in the chart.
	const std::string VALUE =
	    "CASE WHEN status_id IN (SELECT status_id FROM status WHERE name IN "
	    "('NaN','Disconnected','Archive_Off','Archive_Disabled','Write_Error')) THEN NULL "
	    "ELSE COALESCE(float_val, num_val::double precision) END";

	PGconn*   connection = nullptr;
	PGresult* res        = nullptr;

	// executes query, returns false (and sets problem) on failure
	auto query = [&](const std::string& sql, const std::vector<std::string>& parameters) {
		std::vector<const char*> values;
		for(const auto& parameter : parameters)
			values.push_back(parameter.c_str());
		if(res)
			PQclear(res);
		res = PQexecParams(connection,
		                   sql.c_str(),
		                   values.size(),
		                   nullptr /*paramTypes*/,
		                   values.data(),
		                   nullptr /*paramLengths*/,
		                   nullptr /*paramFormats*/,
		                   0 /*resultFormat text*/);
		if(PQresultStatus(res) == PGRES_TUPLES_OK)
			return true;
		problem = "query failed: " + firstLine(PQresultErrorMessage(res));
		return false;
	};  // end query()

	if(!enabled_)
		problem = disabledReason_;
	else
	{
		// protect the database: short timeouts and read-only transactions
		//	(if the password is empty, libpq looks for it in ~/.pgpass)
		const char* const keywords[] = {
		    "host", "port", "dbname", "user", "password", "connect_timeout", "options", nullptr};
		const char* const values[] = {
		    host_.c_str(),
		    port_.c_str(),
		    dbname_.c_str(),
		    user_.c_str(),
		    password_.c_str(),
		    "5",
		    "-c statement_timeout=20000 -c default_transaction_read_only=on",
		    nullptr};
		connection = PQconnectdbParams(keywords, values, 0 /*expand_dbname*/);
		if(PQstatus(connection) != CONNECTION_OK)
			problem = "cannot connect: " + firstLine(PQerrorMessage(connection));
	}

	// the alarm server pv names may have a protocol prefix
	std::string name = pvName;
	if(name.find("://") != std::string::npos)
		name = name.substr(name.find("://") + 3);

	const std::string from = std::to_string(fromSeconds), to = std::to_string(toSeconds);
	std::string       channelId;

	do  // once, to break out at first problem
	{
		if(problem != "")
			break;

		if(!query("SELECT channel_id FROM channel WHERE name = $1 ORDER BY channel_id "
		          "DESC LIMIT 1",
		          {name}))
			break;
		if(PQntuples(res) < 1)
		{
			problem = "this variable is not archived";
			break;
		}
		channelId = PQgetvalue(res, 0, 0);

		if(query("SELECT unit, low_alarm_lmt, high_alarm_lmt FROM num_metadata WHERE "
		         "channel_id = $1",
		         {channelId}) &&
		   PQntuples(res) > 0)
			meta = "\"units\":\"" + escapeJSON(PQgetvalue(res, 0, 0)) +
			       "\",\"lowLimit\":" + getJSONNumber(res, 0, 1) +
			       ",\"highLimit\":" + getJSONNumber(res, 0, 2) + ",";
		problem = "";  //metadata is optional

		bool first = true;

		// Note: every lookup goes through channel_id, and orders by channel_id too, to keep
		//	the planner on the (channel_id, smpl_time) index.

		// last sample before the time window
		if(!query("SELECT extract(epoch FROM smpl_time), " + VALUE +
		              " FROM sample WHERE channel_id = $1 AND smpl_time < "
		              "to_timestamp($2::double precision) ORDER BY channel_id DESC, "
		              "smpl_time DESC LIMIT 1",
		          {channelId, from}))
			break;
		appendPoints(points, first, res);

		if(!query("SELECT extract(epoch FROM smpl_time), " + VALUE +
		              " FROM sample WHERE channel_id = $1 AND smpl_time >= "
		              "to_timestamp($2::double precision) AND smpl_time <= "
		              "to_timestamp($3::double precision) ORDER BY channel_id, smpl_time "
		              "LIMIT " +
		              std::to_string(MAX_CHART_POINTS + 1),
		          {channelId, from, to}))
			break;

		if((size_t)PQntuples(res) <= MAX_CHART_POINTS)
		{
			appendPoints(points, first, res);
			break;
		}

		// too many samples, so reduce to buckets
		const double bucketSeconds = (toSeconds - fromSeconds) / CHART_BUCKET_COUNT;
		if(!query("SELECT min(extract(epoch FROM smpl_time)), avg(sampleValue), "
		          "min(sampleValue), max(sampleValue) FROM (SELECT smpl_time, " +
		              VALUE +
		              " AS sampleValue FROM sample WHERE channel_id = $1 AND smpl_time "
		              ">= to_timestamp($2::double precision) AND smpl_time <= "
		              "to_timestamp($3::double precision)) AS windowSamples GROUP BY "
		              "floor((extract(epoch FROM smpl_time) - $2::double precision) / "
		              "$4::double precision) ORDER BY 1",
		          {channelId,
		           from,
		           to,
		           std::to_string(bucketSeconds > 1e-6 ? bucketSeconds : 1e-6)}))
			break;
		appendPoints(points, first, res);
		reducedToBuckets = true;
	} while(0);

	if(res)
		PQclear(res);
	if(connection)
		PQfinish(connection);

	if(problem != "")
	{
		__COUT__ << "No archiver history for '" << pvName << "': " << problem << __E__;
		points = "";
	}
#else
	(void)fromSeconds;
	(void)toSeconds;
	problem = disabledReason_;
#endif

	return "{" + meta + "\"pv\":\"" + escapeJSON(pvName) + "\",\"points\":[" + points +
	       "],\"reducedToBuckets\":" + (reducedToBuckets ? "true" : "false") +
	       ",\"archiveProblem\":\"" + escapeJSON(problem) + "\"}";
}  // end getHistoryJSON()
