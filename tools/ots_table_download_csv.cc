#include "otsdaq/MessageFacility/MessageFacility.h"

#include <dirent.h>
#include <cassert>
#include <iostream>
#include <memory>
#include <string>

#include "otsdaq/ConfigurationInterface/ConfigurationInterface.h"
#include "otsdaq/ConfigurationInterface/ConfigurationManagerRW.h"

/// Downloads a table name/version as CSV file (compatible with Excel, Google Docs, etc.),
///     Same format as downloaded by the web app Configuration GUI.
///     If not path is given, the CSV file will be saved as <tableName>_v<tableVersion>_<linuxTime>.csv
///
/// usage:
///     ots_table_download_csv <table name> <table version> <optional: file path to save CSV>
///
/// Note: CSV file format is compatible with ots_table_upload_csv

using namespace ots;

void DownloadTableCSV(int argc, char* argv[])
{
	// The configuration uses __ENV__("SERVICE_DATA_PATH") in init() so define it if it is not defined
	if(getenv("SERVICE_DATA_PATH") == NULL)
		setenv("SERVICE_DATA_PATH",
		       (std::string(__ENV__("USER_DATA")) + "/ServiceData").c_str(),
		       1);

	std::cout << "=================================================\n";
	std::cout << "=================================================\n";
	std::cout << "=================================================\n";
	__COUT_INFO__ << "Downloading Table CSV!" << std::endl;

	std::cout << "\n\nusage: 2 or 3 arguments:\n\t <table name> <table version> "
	             "<optional: file path to save CSV> \n\n"
	          << std::endl;

	std::cout << "argc = " << argc << std::endl;
	for(int i = 0; i < argc; i++)
		std::cout << "argv[" << i << "] = " << argv[i] << std::endl;

	if(argc < 3)
	{
		std::cout << "Error! Must provide two parameters.\n\n" << std::endl;
		return;
	}

	std::string tableName = argv[1];
	__COUTV__(tableName);
	auto tablePos = tableName.find("Table");
	if(tablePos == std::string::npos ||  //avoid case when tableName is length 4
	   tablePos != tableName.size() - strlen("Table"))
		tableName += "Table";
	__COUTV__(tableName);
	TableVersion tableVersion(atoi(argv[2]));
	__COUTV__(tableVersion);
	std::string downloadPath = "";
	if(argc > 3)
		downloadPath = argv[3];
	else
	{
		std::stringstream ss;
		ss << tableName << "_v" << tableVersion << "_" << time(0) << ".csv";
		downloadPath = ss.str();
	}
	__COUTV__(downloadPath);

	// return;

	//==============================================================================
	// Define environment variables
	//	Note: normally these environment variables are set by ots script

	// These are needed by
	// otsdaq/otsdaq/ConfigurationDataFormats/ConfigurationInfoReader.cc [207]
	setenv("CONFIGURATION_TYPE", "File", 1);  // Can be File, Database, DatabaseTest
	setenv("CONFIGURATION_DATA_PATH",
	       (std::string(getenv("USER_DATA")) + "/ConfigurationDataExamples").c_str(),
	       1);
	setenv(
	    "TABLE_INFO_PATH", (std::string(getenv("USER_DATA")) + "/TableInfo").c_str(), 1);
	////////////////////////////////////////////////////

	// Some configuration plug-ins use __ENV__("OTSDAQ_LIB") and
	// __ENV__("OTSDAQ_UTILITIES_LIB") in init() so define it 	to a non-sense place is ok
	setenv("OTSDAQ_LIB", (std::string(getenv("USER_DATA")) + "/").c_str(), 1);
	setenv("OTSDAQ_UTILITIES_LIB", (std::string(getenv("USER_DATA")) + "/").c_str(), 1);

	// Some configuration plug-ins use __ENV__("OTS_MAIN_PORT") in init() so define it
	setenv("OTS_MAIN_PORT", "2015", 1);

	// also xdaq envs for XDAQContextTable
	setenv("XDAQ_CONFIGURATION_DATA_PATH",
	       (std::string(getenv("USER_DATA")) + "/XDAQConfigurations").c_str(),
	       1);
	setenv("XDAQ_CONFIGURATION_XML", "otsConfigurationNoRU_CMake", 1);
	////////////////////////////////////////////////////

	//==============================================================================
	// get prepared with initial source db

	// ConfigurationManager instance immediately loads active groups
	__COUT_INFO__ << "Initializing..." << std::endl;

	std::string ARTDAQ_DATABASE_URI = __ENV__("ARTDAQ_DATABASE_URI");
	__COUTV__(ARTDAQ_DATABASE_URI);

	// return;

	ConfigurationManagerRW  cfgMgrInst("export_admin");
	ConfigurationManagerRW* cfgMgr = &cfgMgrInst;

	//load all table info to fill nameToTableMap_
	{
		std::string                             accumulatedWarnings;
		const std::map<std::string, TableInfo>& allTableInfo =
		    cfgMgr->getAllTableInfo(true /* refresh */,
		                            &accumulatedWarnings,
		                            "" /* errorFilterName */,
		                            false /* getGroupKeys*/,
		                            false /* getGroupInfo */,
		                            false /* initializeActiveGroups */);
		__COUTV__(allTableInfo.size());
	}

	std::stringstream csv;
	cfgMgr->getVersionedTableByName(tableName, tableVersion)->getViewP()->printCSV(csv);

	//Uploade should use similar to fillFromCSV

	FILE* fp = std::fopen(downloadPath.c_str(), "w");
	if(!fp)
	{
		__COUT_ERR__ << "\n\nERROR! Could not open file at " << downloadPath
		             << ". Error: " << errno << " - " << strerror(errno) << __E__;
		return;
	}
	fputs(csv.str().c_str(), fp);
	fclose(fp);

	__COUT_INFO__ << "Table " << tableName << "-v" << tableVersion
	              << "was successfully downloaded as CSV to " << downloadPath << __E__;

}  //end DownloadTableCSV()

int main(int argc, char* argv[])
{
	if(getenv("OTSDAQ_LOG_FHICL") == NULL)
		setenv("OTSDAQ_LOG_FHICL",
		       (std::string(__ENV__("USER_DATA")) +
		        "/MessageFacilityConfigurations/MessageFacilityWithCout.fcl")
		           .c_str(),
		       1);

	if(getenv("OTSDAQ_LOG_ROOT") == NULL)
		setenv(
		    "OTSDAQ_LOG_ROOT", (std::string(__ENV__("USER_DATA")) + "/Logs").c_str(), 1);

	INIT_MF("DownloadTableCSV");
	DownloadTableCSV(argc, argv);
	return 0;
}
// BOOST_AUTO_TEST_SUITE_END()
