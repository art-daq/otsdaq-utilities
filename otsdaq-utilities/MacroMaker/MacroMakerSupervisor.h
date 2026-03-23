#ifndef _ots_MacroMakerSupervisor_h_
#define _ots_MacroMakerSupervisor_h_

#include "otsdaq/CoreSupervisors/CoreSupervisorBase.h"
#include "otsdaq/ProgressBar/ProgressBar.h"

#include <atomic>
#include <memory>
#include <mutex>

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

	/// runFEMacroStruct is used to track the detached thread
	///		executing a FE Macro through completion.
	struct runFEMacroStruct
	{
		///runFEMacroParameterStruct is a sub-struct
		/// to isolate from special atomic bool handling (and repetitive member usage for copy/move constructors)
		struct runFEMacroParameterStruct
		{
			HttpXmlDocument xmldoc_;
			std::string     feClassSelected_;
			std::string     feUIDSelected_;
			std::string     macroType_;
			std::string     macroName_;
			std::string     inputArgs_;
			std::string     outputArgs_;
			bool            saveOutputs_;
			std::string     runningUsername_;
			std::string     userGroupPermissions_;

			time_t      startTime_       = time(0);
			time_t      doneTime_        = -1;
			std::string feMacroRunError_ = "";
			uint64_t    threadID_        = 0;  //Note: std::thread::id() is invalid thread id;
		};                                     // end runFEMacroParameterStruct struct

		runFEMacroStruct(
		    const HttpXmlDocument& xmldoc,
		    const std::string&     feClassSelected,
		    const std::string&     feUIDSelected,
		    const std::string&     macroType,
		    const std::string&     macroName,
		    const std::string&     inputArgs,
		    const std::string&     outputArgs,
		    bool                   saveOutputs,
		    const std::string&     runningUsername,
		    const std::string&     userGroupPermissions)
		{
			parameters_.xmldoc_               = xmldoc;
			parameters_.feClassSelected_      = feClassSelected;
			parameters_.feUIDSelected_        = feUIDSelected;
			parameters_.macroType_            = macroType;
			parameters_.macroName_            = macroName;
			parameters_.inputArgs_            = inputArgs;
			parameters_.outputArgs_           = outputArgs;
			parameters_.saveOutputs_          = saveOutputs;
			parameters_.runningUsername_      = runningUsername;
			parameters_.userGroupPermissions_ = userGroupPermissions;
		}  //end runFEMacroStruct() constructor

		/// Delete copy constructor because std::atomic is not copyable
		runFEMacroStruct(const runFEMacroStruct&)            = delete;
		runFEMacroStruct& operator=(const runFEMacroStruct&) = delete;

		/// Allow move constructor because std::atomic is not copyable
		runFEMacroStruct(runFEMacroStruct&& other) noexcept
		    : parameters_(other.parameters_)
		    , feMacroRunDone_(other.feMacroRunDone_.load())
		{
		}
		/// Allow move constructor because std::atomic is not copyable, for vector erase
		runFEMacroStruct& operator=(runFEMacroStruct&& other) noexcept
		{
			if(this != &other)
			{
				parameters_ = other.parameters_;
				feMacroRunDone_.store(other.feMacroRunDone_.load());
			}
			return *this;
		}

		runFEMacroParameterStruct    parameters_;
		std::atomic<bool>            feMacroRunDone_ = false;
		std::unique_ptr<ProgressBar> bar_;
	};  //end runFEMacroStruct struct

	/// runFEMacroGroupStruct groups per-UID tasks launched in parallel under one NotDoneID
	struct runFEMacroGroupStruct
	{
		uint64_t                                       groupID_   = 0;
		time_t                                         startTime_ = time(0);
		time_t                                         completeTime_ = 0;
		std::string                                    historyFeClassSelected_;
		std::string                                    historyFeUIDSelected_;
		std::string                                    historyMacroType_;
		std::string                                    historyMacroName_;
		std::string                                    historyInputArgs_;
		std::string                                    historyOutputArgs_;
		bool                                           historySaveOutputs_ = false;
		std::string                                    historyUsername_;
		bool                                           historySaved_ = false;
		std::vector<std::shared_ptr<runFEMacroStruct>> tasks_;

		bool allDone() const
		{
			for(const auto& t : tasks_)
				if(!t->feMacroRunDone_)
					return false;
			return !tasks_.empty();
		}
	};  //end runFEMacroGroupStruct struct

	MacroMakerSupervisor(xdaq::ApplicationStub* s);
	virtual ~MacroMakerSupervisor(void);

	void init(void);
	void destroy(void);

	virtual void request(const std::string&               requestType,
	                     cgicc::Cgicc&                    cgiIn,
	                     HttpXmlDocument&                 xmlOut,
	                     const WebUsers::RequestUserInfo& userInfo) override;

	virtual void forceSupervisorPropertyValues(void) override;  ///< override to force supervisor property values (and ignore user settings)

  private:
	/// start MacroMaker only functions
	void generateURL(void);
	void verification(xgi::Input* in, xgi::Output* out);
	void requestIcons(xgi::Input* in, xgi::Output* out);
	void tooltipRequest(xgi::Input* in, xgi::Output* out);
	void requestWrapper(xgi::Input* in, xgi::Output* out);
	/// end MacroMaker only functions

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
	void        appendCommandToHistory(std::string        command,
	                                   std::string        Format,
	                                   std::string        time,
	                                   std::string        interfaces,
	                                   const std::string& username);
	void        appendCommandToHistory(std::string        feClass,
	                                   std::string        feUID,
	                                   std::string        macroType,
	                                   std::string        macroName,
	                                   std::string        inputArgs,
	                                   std::string        outputArgs,
	                                   bool               saveOutputs,
	                                   const std::string& username,
	                                   time_t             launchTime   = 0,
	                                   time_t             completeTime = 0);
	void        loadFEMacroSequences(HttpXmlDocument& xmldoc, const std::string& username);
	void        saveFEMacroSequence(cgicc::Cgicc& cgi, const std::string& username);
	void        getFEMacroSequence(HttpXmlDocument&   xmldoc,
	                               cgicc::Cgicc&      cgi,
	                               const std::string& username);
	void        runFEMacroSequence(HttpXmlDocument&   xmldoc,
	                               cgicc::Cgicc&      cgi,
	                               const std::string& username);
	void        deleteFEMacroSequence(cgicc::Cgicc& cgi, const std::string& username);
	void        makeSequencePublic(cgicc::Cgicc& cgi, const std::string& username);
	void        loadHistory(HttpXmlDocument& xmldoc, const std::string& username);
	void        loadFEHistory(HttpXmlDocument& xmldoc, const std::string& username);
	void        deleteMacro(HttpXmlDocument&   xmldoc,
	                        cgicc::Cgicc&      cgi,
	                        const std::string& username);
	void        editMacro(HttpXmlDocument&   xmldoc,
	                      cgicc::Cgicc&      cgi,
	                      const std::string& username);
	void        clearHistory(const std::string& username);
	void        clearFEHistory(const std::string& username);
	void        exportMacro(HttpXmlDocument&   xmldoc,
	                        cgicc::Cgicc&      cgi,
	                        const std::string& username);
	void        exportFEMacro(HttpXmlDocument&   xmldoc,
	                          cgicc::Cgicc&      cgi,
	                          const std::string& username);
	void        runFEMacro(HttpXmlDocument&                 xmldoc,
	                       cgicc::Cgicc&                    cgi,
	                       const WebUsers::RequestUserInfo& userInfo);
	void        runFEMacro(HttpXmlDocument&   xmldoc,
	                       std::string        feClassSelected,
	                       std::string        feUIDSelected,
	                       const std::string& macroType,
	                       const std::string& macroName,
	                       const std::string& inputArgs,
	                       const std::string  outputArgs,
	                       bool               saveOutputs,
	                       const std::string& username,
	                       const std::string& userGroupPermissions,
	                       bool               saveToHistory = true);
	static void runFEMacroGroupSchedulerThread(std::shared_ptr<runFEMacroGroupStruct> group,
	                                           MacroMakerSupervisor*                  mmSupervisor);
	static void runFEMacroThread(std::shared_ptr<runFEMacroStruct> feMacroRunThreadStruct,
	                             MacroMakerSupervisor*             mmSupervisor);

	std::string generateHexArray(const std::string& sourceHexString, int& numOfBytes);
	bool        isArgumentVariable(const std::string& argumentString);
	void        createCode(std::ostream&                   out,
	                       const std::vector<std::string>& commands,
	                       const std::string&              tabOffset   = "",
	                       bool                            forFeMacro  = false,
	                       std::set<std::string>*          inArgNames  = 0,
	                       std::set<std::string>*          outArgNames = 0);

	SupervisorInfoMap                                                    allFESupervisorInfo_;
	std::map<std::string /*FE UID*/, unsigned int /*superivisor index*/> FEtoSupervisorMap_;
	std::map<std::string /*FE Type*/, std::set<std::string> /*FE UIDs*/> FEPluginTypetoFEsMap_;
	std::map<std::string /*FE UID*/, std::string /*FE Type*/>            FEtoPluginTypeMap_;

	std::string securityCode_;
	bool        defaultSequence_;

	std::map<std::string /* username */,
	         std::vector<std::string> /* last command */>
	    lastFeCommandToHistory_;  ///<prevent repeats to history

	std::vector<std::shared_ptr<runFEMacroGroupStruct>> feMacroRunThreadStruct_;
	std::atomic<uint64_t>                               feMacroRunGroupIDCounter_{0};

	std::mutex feMacroRunThreadStructMutex_;

};  // end MacroMakerSupervisor declaration
}  // namespace ots

#endif
