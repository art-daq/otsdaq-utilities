#ifndef _ots_RunDbViewerSupervisor_h
#define _ots_RunDbViewerSupervisor_h

#include "otsdaq/CoreSupervisors/CoreSupervisorBase.h"

// clang-format off
namespace ots
{
/// RunDbViewerSupervisor
///	This class handles the write and read requests for web users interfacing to the web
/// desktop RunDbViewer
class RunInfoVInterface;

class RunDbViewerSupervisor : public CoreSupervisorBase
{
  public:
	XDAQ_INSTANTIATOR();
										RunDbViewerSupervisor				(xdaq::ApplicationStub* s);
	virtual 							~RunDbViewerSupervisor				(void);

	void 								init							(void);
	void 								destroy							(void);

	virtual void 						request							(const std::string&               requestType,
																		 cgicc::Cgicc&                    cgiIn,
																		 HttpXmlDocument&                 xmlOut,
																		 const WebUsers::RequestUserInfo& userInfo) override;
	virtual void 						nonXmlRequest					(const std::string&               requestType,
																		 cgicc::Cgicc&                    cgiIn,
																		 std::ostream&                    out,
																		 const WebUsers::RequestUserInfo& userInfo) override;

	virtual void 						setSupervisorPropertyDefaults	(void) override;  ///< override to control supervisor specific defaults
	virtual void 						forceSupervisorPropertyValues	(void) override;  ///< override to force supervisor property values (and ignore user settings)

  private:
	void        						getCategories					(HttpXmlDocument* xmldoc = 0, std::ostringstream* out = 0);
	void 								refreshRunDbViewer				(time_t              date,
																		 uint32_t		     duration,
																		 HttpXmlDocument*    xmldoc     = 0,
																		 std::ostringstream* out        = 0,
																		 std::string  		 category  	= "",
																		 const std::string&  pluginName = "",
																		 const std::string&  runInfoUID = "");
	void								getRunConditionByID				(uint64_t		     condition_ID,
																		 HttpXmlDocument*    xmldoc     = 0,
																		 const std::string&  pluginName = "",
																		 const std::string&  runInfoUID = "");
	enum
	{
		CATEGORY_NAME_MIN_LENTH       = 3,
		CATEGORY_NAME_MAX_LENTH       = 300,
		RUNDBVIEWER_PREVIEW_EXPIRATION_TIME = 60 * 20,  ///< 20 minutes
	};

	std::string  activeCategory_;
	unsigned int mostRecentDayIndex_;
};
}  // namespace ots
// clang-format on

#endif
