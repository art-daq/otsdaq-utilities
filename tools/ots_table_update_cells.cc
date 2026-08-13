#include "otsdaq/MessageFacility/MessageFacility.h"

#include <dirent.h>
#include <cassert>
#include <iostream>
#include <map>
#include <memory>
#include <string>

#include "otsdaq/ConfigurationInterface/ConfigurationInterface.h"
#include "otsdaq/ConfigurationInterface/ConfigurationManagerRW.h"

// Shared test utilities
#include "otsdaq/Macros/TestUtilities.h"

/// Updates specific cells in a table by UID and column name, then creates a new version.
/// Optionally assigns a version alias to the newly created version.
///
/// usage:
///     ots_table_update_cells <tableName> <updates> [--version <version>] [--source-alias <name>] [--alias <aliasName>]
///
/// where <updates> is a semicolon-separated list of row updates:
///     UID1:col1=val1,col2=val2;UID2:col1=val3
///
/// options:
///     --version <version>      : source version to modify (default: active version)
///     --source-alias <name>    : load source version from a version alias
///     --alias <aliasName>      : assign a version alias to the newly created version
///
/// examples:
///     ots_table_update_cells TrackerDTC "dtc0:FirmwareVersion=v3.2,Enabled=1;dtc1:Enabled=0"
///     ots_table_update_cells TrackerDTC "dtc0:FirmwareVersion=v3.2" --version 5
///     ots_table_update_cells TrackerDTC "dtc0:FirmwareVersion=v3.2" --alias MyConfig

using namespace ots;

std::map<std::string /*uid*/, std::map<std::string /*colName*/, std::string /*value*/>>
parseUpdates(const std::string& updateString)
{
	std::map<std::string, std::map<std::string, std::string>> updates;

	size_t rowStart = 0;
	while(rowStart < updateString.size())
	{
		size_t rowEnd = updateString.find(';', rowStart);
		if(rowEnd == std::string::npos)
			rowEnd = updateString.size();

		std::string rowEntry = updateString.substr(rowStart, rowEnd - rowStart);
		rowStart             = rowEnd + 1;

		if(rowEntry.empty())
			continue;

		size_t colonPos = rowEntry.find(':');
		if(colonPos == std::string::npos)
		{
			__SS__ << "Invalid update entry '" << rowEntry
			       << "'. Expected format: UID:col1=val1,col2=val2" << __E__;
			__SS_THROW__;
		}

		std::string uid         = rowEntry.substr(0, colonPos);
		std::string assignments = rowEntry.substr(colonPos + 1);

		size_t assignStart = 0;
		while(assignStart < assignments.size())
		{
			size_t assignEnd = assignments.find(',', assignStart);
			if(assignEnd == std::string::npos)
				assignEnd = assignments.size();

			std::string assignment =
			    assignments.substr(assignStart, assignEnd - assignStart);
			assignStart = assignEnd + 1;

			if(assignment.empty())
				continue;

			size_t eqPos = assignment.find('=');
			if(eqPos == std::string::npos)
			{
				__SS__ << "Invalid column assignment '" << assignment
				       << "'. Expected format: colName=value" << __E__;
				__SS_THROW__;
			}

			updates[uid][assignment.substr(0, eqPos)] = assignment.substr(eqPos + 1);
		}

		if(updates[uid].empty())
		{
			__SS__ << "No column assignments found for UID '" << uid << "'." << __E__;
			__SS_THROW__;
		}
	}

	return updates;
}

void UpdateTableCells(int argc, char* argv[])
{
	std::cout << "=================================================\n";
	std::cout << "=================================================\n";
	std::cout << "=================================================\n";
	__COUT_INFO__ << "Update Table Cells!" << std::endl;

	std::cout
	    << "\n\nusage:\n"
	    << "\t ots_table_update_cells <tableName> <updates> [--version <ver>] [--alias "
	       "<aliasName>] [--notes <text>]\n\n"
	    << "\t <updates> format: UID1:col1=val1,col2=val2;UID2:col1=val3\n"
	    << "\t --version <ver>       : source version to modify (default: active "
	       "version)\n"
	    << "\t --source-alias <name> : load source version from a version alias\n"
	    << "\t --alias <alias>       : assign version alias to newly created version\n"
	    << "\t --notes <text>        : comment/notes to store with the new version\n\n"
	    << std::endl;

	std::cout << "argc = " << argc << std::endl;
	for(int i = 0; i < argc; i++)
		std::cout << "argv[" << i << "] = " << argv[i] << std::endl;

	if(argc < 3)
	{
		std::cout
		    << "Error! Must provide at least 2 parameters: <tableName> <updates>\n\n"
		    << std::endl;
		return;
	}

	// parse table name (auto-append "Table" suffix if needed)
	std::string tableName = argv[1];
	__COUTV__(tableName);
	auto tablePos = tableName.find("Table");
	if(tablePos == std::string::npos || tablePos != tableName.size() - strlen("Table"))
		tableName += "Table";
	__COUTV__(tableName);

	// parse update string
	auto cellUpdates = parseUpdates(argv[2]);
	__COUT_INFO__ << "Parsed " << cellUpdates.size() << " row update(s)." << std::endl;

	// parse optional flags
	std::string  aliasName   = "";
	std::string  sourceAlias = "";
	std::string  notes       = "";
	TableVersion sourceVersion;  // default = invalid, meaning use active version
	for(int i = 3; i < argc; i++)
	{
		std::string arg = argv[i];
		if(arg == "--alias" && i + 1 < argc)
		{
			aliasName = argv[++i];
			__COUTV__(aliasName);
		}
		else if(arg == "--version" && i + 1 < argc)
		{
			sourceVersion = TableVersion(std::string(argv[++i]));
			__COUT__ << "Source version: " << sourceVersion << __E__;
		}
		else if(arg == "--source-alias" && i + 1 < argc)
		{
			sourceAlias = argv[++i];
			__COUTV__(sourceAlias);
		}
		else if(arg == "--notes" && i + 1 < argc)
		{
			notes = argv[++i];
			__COUTV__(notes);
		}
		else
		{
			__SS__ << "Unknown option '" << arg
			       << "'. Expected '--alias <name>', '--version <ver>', "
			          "'--source-alias <name>', or '--notes <text>'."
			       << __E__;
			__SS_THROW__;
		}
	}

	// get kerberos author
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

	//==============================================================================
	// initialize configuration manager

	__COUT_INFO__ << "Initializing..." << std::endl;

	std::string ARTDAQ_DATABASE_URI = __ENV__("ARTDAQ_DATABASE_URI");
	__COUTV__(ARTDAQ_DATABASE_URI);

	ConfigurationManagerRW  cfgMgrInst("export_admin");
	ConfigurationManagerRW* cfgMgr = &cfgMgrInst;

	{
		std::string                             accumulatedWarnings;
		const std::map<std::string, TableInfo>& allTableInfo =
		    cfgMgr->getAllTableInfo(true /* refresh */,
		                            &accumulatedWarnings,
		                            "" /* errorFilterName */,
		                            false /* getGroupKeys */,
		                            false /* getGroupInfo */,
		                            true /* initializeActiveGroups */);
		__COUTV__(allTableInfo.size());
	}

	//==============================================================================
	// call the reusable updateTableCells workflow

	TableVersion newVersion = cfgMgr->updateTableCells(
	    tableName, cellUpdates, author, sourceVersion, aliasName, sourceAlias, notes);

	__COUT_INFO__ << "Done. New version: " << tableName << "-v" << newVersion
	              << std::endl;

}  // end UpdateTableCells()

int main(int argc, char* argv[])
{
	test::util::check_and_make_envs();

	INIT_MF("UpdateTableCells");
	UpdateTableCells(argc, argv);
	return 0;
}
