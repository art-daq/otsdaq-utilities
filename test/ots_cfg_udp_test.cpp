#include "test/ots_cfg_udp_interface.h"

///==============================================================================
/// To access the Configuration GUI with this tool, before launching ots export...
///   export OTS_CONFIG_UDP_PORT=<YOUR_PORT>
///   export OTS_CONFIG_UDP_IP=127.0.0.1 #or the IP of the machine running ots
///
/// Any ConfigurationGUISupervisor request type can be sent, with its parameters
/// given as name=value, exactly as the browser would send them.
///
/// The author of any table edit is taken from the Kerberos principal (klist). If
/// none is found, the tool asks before proceeding anonymously; -y skips the prompt.
int main(int argc, char* argv[])
try
{
	if(argc < 4)
	{
		fprintf(stderr,
		        "usage: ots_cfg_udp_test [-y] <cfg IP> <cfg Port> <RequestType> "
		        "[name=value ...]\n\n");
		fprintf(stderr,
		        "  -y    proceed anonymously without asking if no Kerberos principal is "
		        "found\n\n");
		fprintf(stderr, "Common examples:\n");
		fprintf(stderr, "  getTables\n");
		fprintf(stderr, "  getTableGroups\n");
		fprintf(stderr, "  getActiveTableGroups\n");
		fprintf(stderr, "  getGroupAliases\n");
		fprintf(stderr, "  getVersionAliases\n");
		fprintf(stderr,
		        "  getSpecificTable tableName=<T> [version=<V>]   (omit version for "
		        "latest; an unknown version returns the row-less mockup)\n");
		fprintf(stderr, "  getSpecificTableGroup groupName=<G> groupKey=<K>\n");
		fprintf(stderr,
		        "  getTreeView tableGroup=<G> tableGroupKey=<K> startPath=/ depth=1\n");
		fprintf(stderr,
		        "  saveTreeNodeEdit targetTable=<T> targetTableVersion=<V> targetUID=<U> "
		        "targetColumn=<C> newValue=<X> editNodeType=value\n");
		fprintf(stderr,
		        "  addTreeNodeRecords tableGroup=<G> tableGroupKey=<K> startPath=<P> "
		        "recordList=<UID,...>\n");
		fprintf(stderr,
		        "  deleteTreeNodeRecords tableGroup=<G> tableGroupKey=<K> startPath=<P> "
		        "recordList=<UID,...>\n");
		fprintf(stderr,
		        "  setTreeNodeFieldValues tableGroup=<G> tableGroupKey=<K> startPath=<P> "
		        "recordList=<UID,...> fieldList=<F,...> valueList=<X,...>\n");
		fprintf(stderr,
		        "  saveSpecificTable tableName=<T> version=<V> temporary=1 data=<...>\n");
		fprintf(stderr,
		        "  saveNewTableGroup groupName=<G> tableList=<T,V,T,V,...> "
		        "groupComment=<...>\n");
		fprintf(stderr, "  checkAffectedActiveGroups modifiedTables=<T,V,...>\n");
		fprintf(stderr,
		        "  activateTableGroup groupName=<G> groupKey=<K> ignoreWarnings=0\n");
		fprintf(stderr,
		        "  setGroupAliasInActiveBackbone groupAlias=<A> groupName=<G> "
		        "groupKey=<K>\n");
		fprintf(stderr,
		        "  setTableAliasInActiveBackbone tableAlias=<A> tableName=<T> "
		        "version=<V>\n");
		fprintf(stderr, "  getArtdaqNodes modifiedTables=\n\n");
		fprintf(stderr,
		        "Values are sent raw, as the browser sends them. The server URL-decodes "
		        "only targetUID, targetColumn, newValue, comments, and the items of "
		        "recordList/fieldList/valueList, so %%-encode those yourself if they "
		        "contain special characters (e.g. a space as %%20).\n");
		fprintf(stderr,
		        "The reply is the same XML the Configuration GUI web page receives, or "
		        "'Error: ...'.\n");
		return 1;
	}

	int  argIndex          = 1;
	bool proceedWithoutAsk = false;
	if(std::string(argv[argIndex]) == "-y")
	{
		proceedWithoutAsk = true;
		++argIndex;
	}
	if(argc - argIndex < 3)
	{
		fprintf(stderr, "Missing <cfg IP> <cfg Port> <RequestType>\n");
		return 1;
	}

	std::string target_ip   = argv[argIndex++];
	int         target_port = atoi(argv[argIndex++]);
	std::string requestType = argv[argIndex++];

	ots_cfg_udp_interface::Params params;
	for(int i = argIndex; i < argc; ++i)
	{
		std::string arg = argv[i];
		size_t      eq  = arg.find('=');
		if(eq == std::string::npos)
		{
			fprintf(stderr, "Parameter '%s' is not of the form name=value\n", argv[i]);
			return 1;
		}
		params.push_back({arg.substr(0, eq), arg.substr(eq + 1)});
	}

	std::string username = ots_cfg_udp_interface::getKerberosUsername();
	if(username.empty())
	{
		fprintf(stderr,
		        "Identity could not be extracted from Kerberos principal (please kinit "
		        "for this to work).\n");
		if(!proceedWithoutAsk)
		{
			fprintf(stderr, "Otherwise, are you sure you want to proceed anonymously? [y/N] ");
			std::string answer;
			std::getline(std::cin, answer);
			if(answer != "y" && answer != "Y" && answer != "yes")
				return 1;
		}
	}
	else
		fprintf(stderr, "Acting as Kerberos user '%s'\n", username.c_str());

	ots_cfg_udp_interface cfg(target_ip.c_str(), target_port, username);

	std::string response = cfg.sendRequest(requestType, params);
	std::cout << response << std::endl;

	std::string err = ots_cfg_udp_interface::extractXmlField(response, "Error");
	if(!err.empty() || response.find("Error: ") == 0)
	{
		__COUT_ERR__ << "Request '" << requestType << "' returned an error." << __E__;
		return 1;
	}
	return 0;
}
catch(const std::runtime_error& e)
{
	__COUT_ERR__ << "Caught exception: " << e.what() << __E__;
	return 1;
}
