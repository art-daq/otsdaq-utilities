#ifndef _ots_ECLSupervisor_h
#define _ots_ECLSupervisor_h

#include "otsdaq/FiniteStateMachine/RunControlStateMachine.h"
#include "otsdaq/SOAPUtilities/SOAPMessenger.h"
#include "otsdaq/WebUsersUtilities/RemoteWebUsers.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"
#pragma GCC diagnostic ignored "-Wunused-variable"
#pragma GCC diagnostic ignored "-Wunused-parameter"
#if __GNUC__ >= 8
#pragma GCC diagnostic ignored "-Wcatch-value"
#endif

#include <xdaq/Application.h>
#pragma GCC diagnostic pop
#include "otsdaq/Macros/XDAQApplicationMacros.h"

#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wunknown-pragmas"
#include <cgicc/HTMLClasses.h>
#include <cgicc/HTMLDoctype.h>
#include <cgicc/HTTPCookie.h>
#include <cgicc/HTTPHeader.h>
#include <xgi/Method.h>  //for cgicc::Cgicc
#pragma GCC diagnostic pop

#include <chrono>
#include <map>
#include <string>
#include "otsdaq/CoreSupervisors/CoreSupervisorBase.h"

#include "otsdaq-utilities/ECLWriter/ECLConnection.h"

// clang-format off
namespace ots
{
class ConfigurationManager;
class TableGroupKey;

class ECLSupervisor : public CoreSupervisorBase
{
  public:
	XDAQ_INSTANTIATOR();

											ECLSupervisor					(xdaq::ApplicationStub* s);
	virtual 								~ECLSupervisor					(void);
	void 									init							(void);
	void 									destroy							(void);


	virtual void							defaultPage						(xgi::Input* in, xgi::Output* out) override;
	static std::string						getIconHeaderString				(void);
	virtual void							request							(const std::string&               requestType,
	            							       							 cgicc::Cgicc&                    cgiIn,
	            							       							 HttpXmlDocument&                 xmlOut,
	            							       							 const WebUsers::RequestUserInfo& userInfo) override;
	// virtual void							nonXmlRequest					(const std::string&               requestType,
	//             							             					 cgicc::Cgicc&                    cgiIn,
	//             							             					 std::ostream&                    out,
	//             							             					 const WebUsers::RequestUserInfo& userInfo) override;

	virtual void							setSupervisorPropertyDefaults	(void) override;  // override to control supervisor specific defaults
	virtual void							forceSupervisorPropertyValues	(void) override;  // override to force supervisor property values (and ignore user settings)

	xoap::MessageReference 					MakeSystemLogEntry				(xoap::MessageReference msg);

  private:

	void        							getCategories					(HttpXmlDocument* xmldoc = 0, std::ostringstream* out = 0);
	void 									webUserSetActiveCategory		(std::string category, HttpXmlDocument* xmldoc = 0);
	void 									refreshLogbook					(time_t              date,
	     								              						 size_t		         duration,
	     								              						 HttpXmlDocument*    xmldoc     = 0,
	     								              						 std::ostringstream* out        = 0,
	     								              						 std::string  		 categoryFilter = "");

	std::string                           	ECLUser_;
	std::string                           	ECLHost_;
	std::string                           	ECLPwd_;
	std::string                           	ECLCategory_;
	std::string                           	CategoryName_;
	int64_t									timezoneHourOffset_ = 0;

	std::unique_ptr<ECLConnection>			eclConn_;

	const std::string						EscapeECLString					(const std::string& input = "");
};
}
// clang-format on

#endif
