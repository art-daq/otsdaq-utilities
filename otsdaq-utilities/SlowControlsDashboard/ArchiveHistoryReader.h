#ifndef _ots_ArchiveHistoryReader_h_
#define _ots_ArchiveHistoryReader_h_

#include <string>

namespace ots
{

// clang-format off

////// class define
/// ArchiveHistoryReader
///	This class reads the history of one pv from the archiver database (CSS/Phoebus RDB
/// 	schema, PostgreSQL), to be shown as a time chart. It is read-only: one short-lived
/// 	read-only connection is opened per request, independent of the controls plugin.
///
///	When there are too many samples in the requested time window, the samples are
/// 	reduced by the database to buckets of mean, minimum and maximum.
///
///	The connection is defined by environment variable:
///		OTS_ARCHIVE_READER_CONNINFO	:= libpq connection string of a READ-ONLY account (optional)
///	If not set, the connection is made to the archiver database of the controls plugin
///		DCS_ARCHIVE_DATABASE_HOST, DCS_ARCHIVE_DATABASE_PORT, DCS_ARCHIVE_DATABASE
///	as user OTS_ARCHIVE_READER_USER (default is "dcs_reader").
///	The password is never taken from here: keep it in ~/.pgpass
class ArchiveHistoryReader
{
  public:
									ArchiveHistoryReader				(void);

	bool 							isEnabled							(void) const { return enabled_; }

	/// returns JSON object with the points [time, value, minimum, maximum] of the pv in the time window [s since epoch]
	std::string						getHistoryJSON						(const std::string& pvName, double fromSeconds, double toSeconds) const;

	static const size_t 			MAX_CHART_POINTS; 	///< above this the samples are reduced to buckets
	static const size_t 			CHART_BUCKET_COUNT;

  private:
	bool							enabled_ = false;
	std::string 					connectionInfo_, disabledReason_;
};

// clang-format on
}  // namespace ots

#endif
