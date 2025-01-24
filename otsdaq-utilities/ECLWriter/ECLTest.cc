#include "TRACE/trace.h"
#define TRACE_NAME "ECLTest"

#define __E__ std::endl
#define QQQQ(X) #X
#define QUOTE(X) QQQQ(X)

#define __SHORTFILE__                                   \
	(__builtin_strstr(&__FILE__[0], "/srcs/")           \
	     ? __builtin_strstr(&__FILE__[0], "/srcs/") + 6 \
	     : __FILE__)
#define __COUT_HDR_L__ ":" << std::dec << __LINE__ << " |\t"
#define __COUT_HDR__ __SHORTFILE__ << "" << __COUT_HDR_L__

#define __COUTV__(X) std::cout << __COUT_HDR__ << QUOTE(X) << " = " << X << __E__
#define __COUT__ std::cout << __COUT_HDR__

#include "otsdaq-utilities/ECLWriter/ECLConnection.h"

#include <boost/program_options.hpp>
namespace bpo = boost::program_options;

//==============================================================================
std::string encodeURIComponent(const std::string& sourceStr)
{
	std::string retStr = "";
	char        encodeStr[4];
	for(const auto& c : sourceStr)
		if((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9'))
			retStr += c;
		else
		{
			sprintf(encodeStr, "%%%2.2X", (uint8_t)c);
			retStr += encodeStr;
		}
	return retStr;
}  // end encodeURIComponent()

// IMPORTANT NOTE!!! avoid posting passwords to copied areas or repositories!
//  consider adding this to a setup script and using environment variables for your
//  passwords! 			#setup environment for eLOG ECL writing 			# NOTE! do not
//  put username/pw in saved/committed text files 			export ECL_USER_NAME="emdaq"
//  export ECL_CATEGORY="general" 			export
//  ECL_URL="https://hostname:8443/ECL/project" 			if [ "x$ECL_PASSWORD"
//  == "x" ]; then #when ECL password is not setup, prompt user 					stty
//  -echo printf "Please enter the ECL eLOG password for $ECL_USER_NAME: "
//  read eclpass 					stty echo export ECL_PASSWORD=$eclpass 			fi

// Note: add quotes for any input parameter with spaces

// use option -h or --help for help
int main(int argc, char* argv[])
{
	std::ostringstream descstr;
	descstr << argv[0]
	        << " --host <ECL host> --user <Username> --pwd <Password> [--cat <Category "
	           "name>] [--title <Message "
	           "title>] [--msg message] #add quotes for any entry with spaces";
	bpo::options_description desc(descstr.str());
	desc.add_options()("host,i", bpo::value<std::string>(), "ECL Instance Address")(
	    "user,u", bpo::value<std::string>(), "ECL Username")(
	    "pwd,p", bpo::value<std::string>(), "ECL Password")(
	    "cat,c", bpo::value<std::string>(), "ECL Category")(
	    "title,t", bpo::value<std::string>(), "Message title")(
	    "msg,m", bpo::value<std::string>(), "Log Message")("help,h",
	                                                       "produce help message");
	bpo::positional_options_description p;
	p.add("msg", -1);
	bpo::variables_map vm;
	try
	{
		bpo::store(bpo::command_line_parser(argc, argv).options(desc).positional(p).run(),
		           vm);
		bpo::notify(vm);
	}
	catch(bpo::error const& e)
	{
		std::cout << "Exception from command line processing in " << argv[0] << ": "
		          << e.what() << "\n";
		exit(-1);
	}
	if(vm.count("help"))
	{
		std::cout << desc << std::endl;
		exit(1);
	}

	std::string ECLUser = "", ECLPwd = "", ECLHost = "",
	            ECLCategory = "general" /* e.g. "TDAQ" */, title = "ECL Test Message",
	            message = "";
	if(vm.count("user"))
	{
		ECLUser = vm["user"].as<std::string>();
	}
	if(vm.count("pwd"))
	{
		ECLPwd = vm["pwd"].as<std::string>();
	}
	if(vm.count("host"))
	{
		ECLHost = vm["host"].as<std::string>();
	}
	if(vm.count("cat"))
	{
		ECLCategory = vm["cat"].as<std::string>();
	}
	if(vm.count("title"))
	{
		title = vm["title"].as<std::string>();
	}
	if(vm.count("msg"))
	{
		message = vm["msg"].as<std::string>();
	}
	__COUTV__(ECLUser);
	__COUTV__(ECLHost);
	__COUTV__(title);
	__COUTV__(message);

	ECLEntry_t eclEntry;
	eclEntry.author(ECLUser);
	eclEntry.category(ECLCategory);
	eclEntry.subject(title);
	Form_t                 form;
	Field_t                field;
	Form_t::field_sequence fields;

	form.name("default");

	field = Field_t(message, "text");
	fields.push_back(field);

	form.field(fields);

	eclEntry.form(form);

	ECLConnection eclConn(ECLUser, ECLPwd, ECLHost);

	if(ECLCategory == "GetRecent")
	{
		__COUT__ << "Getting posts... matching category=" << title << __E__;
		std::string response,
		    url = "/E/xml_search?l=100&c=" + encodeURIComponent(title);  //limit to 100
		eclConn.Get(url, response);
		__COUTV__(response);
		return 0;
	}
	else if(ECLCategory == "GetCategories")
	{
		__COUT__ << "Getting categories..." << __E__;
		std::string response, url = "/A/xml_category_list";
		eclConn.Get(url, response);
		__COUTV__(response);
		return 0;
	}
	else if(!eclConn.Post(eclEntry))
	{
		return -1;
	}

	return 0;
}
