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
///	The connection is made to the archiver database of the controls plugin, with a
///	READ-ONLY account, defined by the environment variables (e.g., in db_setup_ots.sh)
///		DCS_ARCHIVE_DATABASE_HOST, DCS_ARCHIVE_DATABASE_PORT, DCS_ARCHIVE_DATABASE,
///		DCS_ARCHIVE_DATABASE_READER_USER, DCS_ARCHIVE_DATABASE_READER_PWD
///	The transactions are also forced to be read-only.
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
	std::string 					host_, port_, dbname_, user_, password_, disabledReason_;
};

// clang-format on
}  // namespace ots

#endif
