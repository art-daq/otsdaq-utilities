#ifndef _ots_MacroMakerSupervisor_h_
#define _ots_MacroMakerSupervisor_h_

#include "otsdaq/CoreSupervisors/CoreSupervisorBase.h"

namespace ots
{
/// MacroMakerSupervisor
///	This class handles the user interface to the web desktop MacroMaker. MacroMaker
///	is a tool to conduct read and write commands with front-end interfaces and to manage
///	sequence of commands on a per user basis.
class MacroMakerSupervisor : public CoreSupervisorBase
{
  public:
	XDAQ_INSTANTIATOR();

	MacroMakerSupervisor(xdaq::ApplicationStub* s);
	virtual ~MacroMakerSupervisor(void);

	void init(void);
	void destroy(void);

	virtual void request(const std::string&               requestType,
	                     cgicc::Cgicc&                    cgiIn,
	                     HttpXmlDocument&                 xmlOut,
	                     const WebUsers::RequestUserInfo& userInfo) override;

	virtual void forceSupervisorPropertyValues(void) override;  ///< override to force
	                                                            ///< supervisor property
	                                                            ///< values (and ignore user
	                                                            ///< settings)

  private:
	/// start MacroMaker only functions
	void generateURL(void);
	void verification(xgi::Input* in, xgi::Output* out);
	void requestIcons(xgi::Input* in, xgi::Output* out);
	void tooltipRequest(xgi::Input* in, xgi::Output* out);
	void requestWrapper(xgi::Input* in, xgi::Output* out);
	/// end MacroMaker only functions
	///
	static void RemoteControlWorkLoop(MacroMakerSupervisor* supervisorPtr);

	void handleRequest(const std::string                Command,
	                   HttpXmlDocument&                 xmldoc,
	                   cgicc::Cgicc&                    cgi,
	                   const WebUsers::RequestUserInfo& userInfo);

	xoap::MessageReference frontEndCommunicationRequest(xoap::MessageReference message);
	xoap::MessageReference supervisorSequenceCheck(xoap::MessageReference message);

	void getFElist(HttpXmlDocument& xmldoc);
	void getFEMacroList(HttpXmlDocument& xmldoc, const std::string& username);

	void writeData(HttpXmlDocument&   xmldoc,
	               cgicc::Cgicc&      cgi,
	               const std::string& username);
	void readData(HttpXmlDocument&   xmldoc,
	              cgicc::Cgicc&      cgi,
	              const std::string& username);
	void createMacro(HttpXmlDocument&   xmldoc,
	                 cgicc::Cgicc&      cgi,
	                 const std::string& username);
	void loadMacro(const std::string& macroName,
	               std::string&       macroString,
	               const std::string& username = "");
	void loadMacros(HttpXmlDocument& xmldoc, const std::string& username);
	void loadMacroNames(
	    const std::string&                                      username,
	    std::pair<std::vector<std::string> /*public macros*/,
	              std::vector<std::string> /*private macros*/>& returnMacroNames);
	void appendCommandToHistory(std::string        command,
	                            std::string        Format,
	                            std::string        time,
	                            std::string        interfaces,
	                            const std::string& username);
	void appendCommandToHistory(std::string        feClass,
	                            std::string        feUID,
	                            std::string        macroType,
	                            std::string        macroName,
	                            std::string        inputArgs,
	                            std::string        outputArgs,
	                            bool               saveOutputs,
	                            const std::string& username);
	void loadFEMacroSequences(HttpXmlDocument& xmldoc, const std::string& username);
	void saveFEMacroSequence(cgicc::Cgicc& cgi, const std::string& username);
	void getFEMacroSequence(HttpXmlDocument&   xmldoc,
	                        cgicc::Cgicc&      cgi,
	                        const std::string& username);
	void runFEMacroSequence(HttpXmlDocument&   xmldoc,
	                        cgicc::Cgicc&      cgi,
	                        const std::string& username);
	void deleteFEMacroSequence(cgicc::Cgicc& cgi, const std::string& username);
	void loadHistory(HttpXmlDocument& xmldoc, const std::string& username);
	void loadFEHistory(HttpXmlDocument& xmldoc, const std::string& username);
	void deleteMacro(HttpXmlDocument&   xmldoc,
	                 cgicc::Cgicc&      cgi,
	                 const std::string& username);
	void editMacro(HttpXmlDocument&   xmldoc,
	               cgicc::Cgicc&      cgi,
	               const std::string& username);
	void clearHistory(const std::string& username);
	void clearFEHistory(const std::string& username);
	void exportMacro(HttpXmlDocument&   xmldoc,
	                 cgicc::Cgicc&      cgi,
	                 const std::string& username);
	void exportFEMacro(HttpXmlDocument&   xmldoc,
	                   cgicc::Cgicc&      cgi,
	                   const std::string& username);
	void runFEMacro(HttpXmlDocument&                 xmldoc,
	                cgicc::Cgicc&                    cgi,
	                const WebUsers::RequestUserInfo& userInfo);
	void runFEMacro(HttpXmlDocument&   xmldoc,
	                std::string        feClassSelected,
	                std::string        feUIDSelected,
	                const std::string& macroType,
	                const std::string& macroName,
	                const std::string& inputArgs,
	                const std::string  outputArgs,
	                bool               saveOutputs,
	                const std::string& username,
	                const std::string& userGroupPermissions);

	std::string generateHexArray(const std::string& sourceHexString, int& numOfBytes);
	bool        isArgumentVariable(const std::string& argumentString);
	void        createCode(std::ostream&                   out,
	                       const std::vector<std::string>& commands,
	                       const std::string&              tabOffset   = "",
	                       bool                            forFeMacro  = false,
	                       std::set<std::string>*          inArgNames  = 0,
	                       std::set<std::string>*          outArgNames = 0);

	SupervisorInfoMap allFESupervisorInfo_;
	std::map<std::string /*FE UID*/, unsigned int /*superivisor index*/>
	    FEtoSupervisorMap_;
	std::map<std::string /*FE Type*/, std::set<std::string> /*FE UIDs*/>
	                                                          FEPluginTypetoFEsMap_;
	std::map<std::string /*FE UID*/, std::string /*FE Type*/> FEtoPluginTypeMap_;

	std::string securityCode_;
	bool        defaultSequence_;

	std::map<std::string /* username */, std::vector<std::string> /* last command */>
	    lastFeCommandToHistory_;  ///<prevent repeats to history

};  // end MacroMakerSupervisor declaration

}  // namespace ots

#endif
