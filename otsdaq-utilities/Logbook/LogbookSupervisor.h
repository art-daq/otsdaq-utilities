#ifndef _ots_LogbookSupervisor_h
#define _ots_LogbookSupervisor_h

#include "otsdaq/CoreSupervisors/CoreSupervisorBase.h"

// clang-format off
namespace ots
{
// LogbookSupervisor
//	This class handles the write and read requests for web users interfacing to the web
// desktop Logbook
class LogbookSupervisor : public CoreSupervisorBase
{
  public:
	XDAQ_INSTANTIATOR();
										LogbookSupervisor				(xdaq::ApplicationStub* s);
	virtual 							~LogbookSupervisor				(void);

	void 								init							(void);
	void 								destroy							(void);

	virtual void 						defaultPage						(xgi::Input* in, xgi::Output* out) override;
	virtual void 						request							(const std::string&               requestType,
	             						       							 cgicc::Cgicc&                    cgiIn,
	             						       							 HttpXmlDocument&                 xmlOut,
	             						       							 const WebUsers::RequestUserInfo& userInfo) override;
	virtual void 						nonXmlRequest					(const std::string&               requestType,
	             						             					 cgicc::Cgicc&                    cgiIn,
	             						             					 std::ostream&                    out,
	             						             					 const WebUsers::RequestUserInfo& userInfo) override;

	virtual void 						setSupervisorPropertyDefaults	(void) override;  // override to control supervisor specific defaults
	virtual void 						forceSupervisorPropertyValues	(void) override;  // override to force supervisor property values (and ignore user settings)

	// External Supervisor XOAP handlers
	xoap::MessageReference 				MakeSystemLogEntry				(xoap::MessageReference msg);

  private:
	bool        						validateExperimentName			(std::string& experiment);
	std::string 						getActiveExperiment				(void);
	void        						setActiveExperiment				(std::string experiment = "");
	void        						createExperiment				(std::string      experiment,
	            						                				 std::string      creator,
	            						                				 HttpXmlDocument* xmldoc = 0);
	void        						removeExperiment				(std::string      experiment,
	            						                				 std::string      remover,
	            						                				 HttpXmlDocument* xmldoc = 0);
	void        						getExperiments					(HttpXmlDocument* xmldoc = 0, std::ostringstream* out = 0);
	void 								webUserSetActiveExperiment		(std::string experiment, HttpXmlDocument* xmldoc = 0);
	void 								refreshLogbook					(time_t              date,
	     								              					 unsigned char       duration,
	     								              					 HttpXmlDocument*    xmldoc     = 0,
	     								              					 std::ostringstream* out        = 0,
	     								              					 std::string         experiment = "");
	void 								cleanUpPreviews					(void);
	void 								savePostPreview					(std::string&                        subject,
	                    												 std::string&                        text,
	                    												 const std::vector<cgicc::FormFile>& files,
	                    												 std::string                         creator,
	                    												 HttpXmlDocument*                    xmldoc = 0);
	void 								escapeLogbookEntry				(std::string& entry);
	std::string 						validateUploadFileType			(const std::string fileType);
	void        						movePreviewEntry				(std::string      previewNumber,
	            						                				 bool             approve,
	            						                				 HttpXmlDocument* xmldoc = 0);
	void        						hideLogbookEntry				(const std::string& entryId,
	            						                				 bool               hide,
	            						                				 const std::string& hider);

	enum
	{
		// ADMIN_PERMISSIONS_THRESHOLD     = 255,
		EXPERIMENT_NAME_MIN_LENTH       = 3,
		EXPERIMENT_NAME_MAX_LENTH       = 25,
		LOGBOOK_PREVIEW_EXPIRATION_TIME = 60 * 20,  // 20 minutes
	};
	std::vector<std::string> allowedFileUploadTypes_, matchingFileUploadTypes_;

	std::string  activeExperiment_;
	unsigned int mostRecentDayIndex_;
};
}  // namespace ots
// clang-format on

#endif
