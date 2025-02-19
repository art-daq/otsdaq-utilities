#ifndef _ots_VisualSupervisorV2_h
#define _ots_VisualSupervisorV2_h

#include "otsdaq-utilities/VisualizationV2/VisualDataManagerV2.h"
#include "otsdaq/CoreSupervisors/CoreSupervisorBase.h"
//================ new Dario
#include <dirent.h>
#include <stdio.h>
#include <string.h>
#include <sys/types.h>
#include <unistd.h>
#include <iostream>
#include <map>
#include <sstream>
#include <xercesc/dom/DOM.hpp>
#include <xercesc/framework/LocalFileFormatTarget.hpp>
#include <xercesc/framework/StdOutFormatTarget.hpp>
#include <xercesc/util/OutOfMemoryException.hpp>
#include <xercesc/util/PlatformUtils.hpp>
#include <xercesc/util/XMLString.hpp>

#if defined(XERCES_NEW_IOSTREAMS)
#include <iostream>
#else
#include <iostream.h>
#endif

#define X(str) XStr(str).unicodeForm()
//================ new Dario

namespace ots
{
/// VisualSupervisorV2
///	This class handles the web user interface to a VisualDataManager with reqgard to the
/// web desktop Visualizer. 	The Visualizer can display ROOT object in real-time, as well
/// as 2D and 3D displays of streaming data.
class VisualSupervisorV2 : public CoreSupervisorBase
{
  public:
	XDAQ_INSTANTIATOR();

	VisualSupervisorV2(xdaq::ApplicationStub* s);
	virtual ~VisualSupervisorV2(void);

	void destroy(void);

	/// virtual void 			defaultPage      				(xgi::Input* in,
	/// xgi::Output* out) override;  void 					safariDefaultPage (xgi::Input*
	/// in, xgi::Output* out) ;
	///
	virtual void request(const std::string&               requestType,
	                     cgicc::Cgicc&                    cgiIn,
	                     HttpXmlDocument&                 xmlOut,
	                     const WebUsers::RequestUserInfo& userInfo) override;

	virtual void setSupervisorPropertyDefaults(void) override;
	virtual void forceSupervisorPropertyValues(void) override;  ///< override to force
	                                                            ///< supervisor property
	///< values (and ignore user
	///< settings)

	/// RAR commented out below.. better/safer handling (of errors) done by
	/// CoreSupervisorBase
	///
	/// void 					stateRunning (toolbox::fsm::FiniteStateMachine&
	/// fsm)
	/// ;
	///
	virtual void transitionConfiguring(toolbox::Event::Reference e) override;
	virtual void transitionHalting(toolbox::Event::Reference e) override;
	// virtual void 			transitionInitializing (toolbox::Event::Reference e) ;
	///    virtual void 			transitionPausing     			(toolbox::Event::Reference
	///    e) ; virtual void 			transitionResuming (toolbox::Event::Reference e) ;
	///    virtual void 			transitionStarting (toolbox::Event::Reference e) ; virtual
	///    void 			transitionStopping (toolbox::Event::Reference e) ;
	/// virtual void 			enteringError         			(toolbox::Event::Reference
	/// e)
	/// ;
	///
  private:
	/// void						binaryBufferToHexString		(char *buff, unsigned int len,
	/// std::string& dest);
	///
	std::stringstream    ss;
	VisualDataManagerV2* theDataManager_;
	unsigned int         loadedRunNumber_;
};
}  // namespace ots

#endif
