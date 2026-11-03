#include "otsdaq/MessageFacility/MessageFacility.h"

#include <dirent.h>
#include <cassert>
#include <iostream>
#include <memory>
#include <string>

#include "otsdaq/ConfigurationInterface/ConfigurationInterface.h"
#include "otsdaq/ConfigurationInterface/ConfigurationManagerRW.h"

// Shared test utilities
#include "otsdaq/Macros/TestUtilities.h"

/// Uploads a table name as CSV file (compatible with Excel, Google Docs, etc.) and creates a new version of the table on the configuration database,
///     Same format as downloaded/uploaded by the web app Configuration GUI.
///
/// usage:
///     ots_table_upload_csv <table name> <file path to CSV>
///
/// Note: CSV file format is same as created by ots_table_download_csv

using namespace ots;

void UploadTableCSV(int argc, char* argv[])
{
	std::cout << "=================================================\n";
	std::cout << "=================================================\n";
	std::cout << "=================================================\n";
	__COUT_INFO__ << "Uploading Table CSV!" << std::endl;

	std::cout << "\n\nusage: 2 arguments:\n\t <table name> <file path to CSV> \n\n"
	          << std::endl;

	std::cout << "argc = " << argc << std::endl;
	for(int i = 0; i < argc; i++)
		std::cout << "argv[" << i << "] = " << argv[i] << std::endl;

	if(argc != 3)
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

	std::string uploadPath = argv[2];
	__COUTV__(uploadPath);

	std::string author = "";
	try
	{
		author = __ENV__("OTS_KCACHE_USER");
	}
	catch(...)
	{
		__SS__ << "No valid ots kerberos user found, please kinit and source "
		          "setup_ots.sh or kint_setup.sh."
		       << __E__;
		__SS_THROW__;
	}
	__COUTV__(author);

	std::FILE* fp = std::fopen(uploadPath.c_str(), "rb");
	if(!fp)
	{
		__SS__ << "Could not open file at " << uploadPath << ". Error: " << errno << " - "
		       << strerror(errno) << __E__;
		__SS_THROW__;
	}

	std::string csv;
	std::fseek(fp, 0, SEEK_END);
	csv.resize(std::ftell(fp));
	std::rewind(fp);
	std::fread(&csv[0], 1, csv.size(), fp);
	std::fclose(fp);

	__COUTV__(csv);

	// return;

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

	//Note: similar to 'void ConfigurationSupervisorBase::handleCreateTableXML'

	TableVersion version;  //point to mockup
	TableBase*   table = cfgMgr->getTableByName(tableName);
	// create a temporary version from the source version
	TableVersion temporaryVersion = table->createTemporaryView(version);

	__COUT__ << "\t\ttemporaryVersion: " << temporaryVersion << __E__;

	TableView* cfgView = table->getTemporaryView(temporaryVersion);

	try
	{
		// returns -1 on error that data was unchanged, calls init to check table
		cfgView->fillFromCSV(csv, 0 /* dataOffset */, author);

		std::stringstream comment;
		comment << "Table CSV uploaded with 'ots_table_upload_csv.'" << __E__;
		cfgView->setComment(comment.str());
		__COUT__ << "Table comment was set to:\n\t" << cfgView->getComment() << __E__;
	}
	catch(...)  // erase temporary view before re-throwing error
	{
		__COUT__ << "Caught error while editing. Erasing temporary version." << __E__;
		table->eraseView(temporaryVersion);
		throw;
	}

	cfgView->print();

	// return;
	// note: if sourceTableAsIs, accept equivalent versions
	bool         foundEquivalent;
	TableVersion newVersion = cfgMgr->saveModifiedVersion(tableName,
	                                                      version,
	                                                      false /* makeTemporary */,
	                                                      table,
	                                                      temporaryVersion,
	                                                      false /* ignoreDuplicates */,
	                                                      true /* lookForEquivalent */,
	                                                      &foundEquivalent);

	if(foundEquivalent)
		__COUT_WARN__ << "Found equivalent version of CSV upload as Table " << tableName
		              << "-v" << newVersion << "... no need to create new version from "
		              << uploadPath << __E__;
	else
		__COUT_INFO__ << "Table " << tableName << "-v" << newVersion
		              << " was successfully uploaded as CSV from " << uploadPath << "!"
		              << __E__;

}  //end UploadTableCSV()

int main(int argc, char* argv[])
{
	//==============================================================================
	// Define environment variables
	//	Note: normally these environment variables are set by ots script

	test::util::check_and_make_envs();

	////////////////////////////////////////////////////

	INIT_MF("UploadTableCSV");
	UploadTableCSV(argc, argv);
	return 0;
}
// BOOST_AUTO_TEST_SUITE_END()
