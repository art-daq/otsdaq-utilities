#include "otsdaq-utilities/ECLWriter/ECLSupervisor.h"
#include "otsdaq/CgiDataUtilities/CgiDataUtilities.h"
#include "otsdaq/ConfigurationInterface/ConfigurationManager.h"
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/MessageFacility/MessageFacility.h"
#include "otsdaq/SOAPUtilities/SOAPCommand.h"
#include "otsdaq/SOAPUtilities/SOAPParameters.h"
#include "otsdaq/SOAPUtilities/SOAPUtilities.h"
#include "otsdaq/TablePlugins/XDAQContextTable/XDAQContextTable.h"
#include "otsdaq/XmlUtilities/HttpXmlDocument.h"

#include "otsdaq-utilities/ECLWriter/ECLConnection.h"

#include <dirent.h>   /*DIR and dirent*/
#include <sys/stat.h> /*mkdir*/

#include <xdaq/NamespaceURI.h>

#include <iomanip>
#include <iostream>
#include "otsdaq/TableCore/TableGroupKey.h"

using namespace ots;

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "ECL"

XDAQ_INSTANTIATOR_IMPL(ECLSupervisor)

//==============================================================================
ECLSupervisor::ECLSupervisor(xdaq::ApplicationStub* stub) : CoreSupervisorBase(stub)
{
	__SUP_COUT__ << "Constructor." << __E__;

	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	xoap::bind(
	    this, &ECLSupervisor::MakeSystemLogEntry, "MakeSystemLogEntry", XDAQ_NS_URI);

	init();

	__SUP_COUT__ << "Constructed." << __E__;
}  // end constructor

//==============================================================================
void ECLSupervisor::init(void)
{
	// called by constructor
	// allSupervisorInfo_.init(getApplicationContext());

	// do not put username/pw in saved/committed text files
	ECLUser_     = __ENV__("ECL_USER_NAME");
	ECLHost_     = __ENV__("ECL_URL");  // e.g. https://dbweb6.fnal.gov:8443/ECL/test_beam
	ECLPwd_      = __ENV__("ECL_PASSWORD");
	ECLCategory_ = __ENV__("ECL_CATEGORY");
	ExperimentName_ = __ENV__("OTS_OWNER") + std::string(" ots");

}  // end init()

//==============================================================================
ECLSupervisor::~ECLSupervisor(void) { destroy(); }
//==============================================================================
void ECLSupervisor::destroy(void)
{
	// // called by destructor
	// delete theConfigurationManager_;

	__SUP_COUT__ << "Destructed." << __E__;
}  // end destroy()

//==============================================================================
// xoap::MakeSystemLogEntry
//	make a system logbook entry into active experiment's logbook from Supervisor only
//	TODO: (how to enforce?)
xoap::MessageReference ECLSupervisor::MakeSystemLogEntry(xoap::MessageReference msg)
{
	SOAPParameters parameters("EntryText");
	//	SOAPParametersV parameters(1);
	//	parameters[0].setName("EntryText");
	SOAPUtilities::receive(msg, parameters);
	std::string EntryText =
	    StringMacros::decodeURIComponent(parameters.getValue("EntryText"));

	__COUT__ << "Received External Supervisor System Entry " << EntryText << std::endl;

	std::string retStr = "Success";

	ECLEntry_t eclEntry;
	eclEntry.author(StringMacros::escapeString(ECLUser_));
	eclEntry.category(StringMacros::escapeString(ECLCategory_));

	Form_t                 form;
	Field_t                field;
	Form_t::field_sequence fields;
	std::string            users = theRemoteWebUsers_.getActiveUserList();

	form.name("default");  // these form names must be created in advance? ... default
	                       // seems to have one field and be generic: 'text' field

	{
		std::stringstream ss;
		ss << "System Generated Log Entry from '" << ExperimentName_ << "'" << __E__;
		ss << "Active ots users: " << users << __E__;
		ss << "Message: " << __E__ << EntryText << __E__ << __E__;
		field = Field_t(StringMacros::escapeString(ss.str(), true /* keep white space */),
		                "text");
		fields.push_back(field);
	}

	// field = Field_t(EscapeECLString(ExperimentName_), "Experiment");
	// fields.push_back(field);

	// field = Field_t(EscapeECLString(users), "ActiveUsers");
	// fields.push_back(field);

	// field = Field_t(EscapeECLString(EntryText), "Entry");
	// fields.push_back(field);

	form.field(fields);
	eclEntry.form(form);
	try
	{
		ECLConnection eclConn(ECLUser_, ECLPwd_, ECLHost_);
		if(!eclConn.Post(eclEntry))
			retStr = "Failure";
	}
	catch(const std::runtime_error& e)
	{
		__SS__ << "Exception caught during Logbook ECL connection: " << e.what();
		__COUT_ERR__ << ss.str();
		retStr = ss.str();
	}	
	
	// fill return parameters
	SOAPParameters retParameters("Status", retStr);

	return SOAPUtilities::makeSOAPMessageReference("SystemLogEntryStatusResponse",
	                                               retParameters);
}  // end MakeSystemLogEntry()
