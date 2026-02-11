
#include "test/ots_mm_udp_interface.h"

///==============================================================================
/// To access Macro Maker with this tool
///  	first export...
/// export OTS_MACROMAKER_UDP_PORT=<YOUR_PORT>
/// export OTS_MACROMAKER_UDP_IP=127.0.0.1 #or the IP of the machine running Macro Maker
///		then run... Macro Maker app
int main(int argc, char* argv[])
try
{
	if(argc < 3)
	{
		fprintf(stderr,
		        "usage: ots_mm_udp_test <mm IP> <mm Port> <Front-end UID> <FEMacro "
		        "Name> <Macro Input args...> \n");
		fprintf(stderr,
		        "\t If <Front-end UID> not specified, then the list of existing FE UIDs "
		        "will be output \n");
		fprintf(stderr,
		        "\t If <FEMacro Name> not specified, then the list of existing FE Macro "
		        "Names will be output associated with the specified FE UID\n");
		fprintf(stderr,
		        "\t Note: use quotes around command line arguments with spaces to "
		        "prevent them from being interpreted as multiple arguments.\n");
		exit(1);
	}

	std::string target_mm_ip   = argv[1];
	int         target_mm_port = atoi(argv[2]);

	__COUTV__(target_mm_ip);
	__COUTV__(target_mm_port);

	__COUT__ << "instantiating..." << __E__;
	ots_mm_udp_interface mm(target_mm_ip.c_str(), target_mm_port);

	std::string feStr = mm.getFrontendList();
	__COUTV__(feStr);
	std::vector<std::string> fes = getVectorFromString(feStr, {';'});

	uint32_t fe  = -1;
	uint32_t cmd = -1;

	if(argc >= 4)
	{
		//look for FE
		std::string target_fe = argv[3];
		for(fe = 0; fe < fes.size(); ++fe)
			if(fes[fe] == target_fe)
				break;
		if(fe >= fes.size())
		{
			__COUT_ERR__ << "Illegal front-end UID " << target_fe
			             << " not found in FE list: " << vectorToString(fes, {';'}) << "."
			             << __E__;
			return 0;
		}
	}
	else
	{
		__COUT_ERR__
		    << "No front-end UID specified, here is the list of existing Front-end UIDs:"
		    << __E__;
		for(fe = 0; fe < fes.size(); ++fe)
			__COUT_ERR__ << "\t\t" << fes[fe] << __E__;

		return 0;
	}

	if(fe >= fes.size())
	{
		__COUT_ERR__ << "Illegal front-end index " << fe << " vs " << fes.size()
		             << " count." << __E__;
		return 0;
	}

	__COUTV__(fes[fe]);
	std::string commandStr = mm.getCommandList(fes[fe]);
	__COUTV__(commandStr);

	std::vector<std::string> commands = getVectorFromString(commandStr, {';'});

	if(argc >= 5)
	{
		//look for command
		std::string target_command = argv[4];
		for(cmd = 0; cmd < commands.size(); ++cmd)
			if(commands[cmd] == target_command)
				break;
		if(cmd >= commands.size())
		{
			__COUT_ERR__ << "Illegal Front-end Macro Command name '" << target_command
			             << "' not found in '" << fes[fe]
			             << "' Command list: " << vectorToString(commands, {';'}) << "."
			             << __E__;
			return 0;
		}
	}
	else
	{
		__COUT_ERR__ << "No FE Macro Name specified, here is the list of existing FE "
		                "Macro Names corresponding to the specified Front-end UID '"
		             << argv[3] << "':" << __E__;
		for(cmd = 0; cmd < commands.size(); ++cmd)
			__COUT_ERR__ << "\t\t" << commands[cmd] << __E__;

		return 0;
	}

	if(cmd >= commands.size())
	{
		__COUT_ERR__ << "Illegal command index " << cmd << " vs " << commands.size()
		             << " count." << __E__;
		return 0;
	}

	__COUTV__(commands[cmd]);

	uint32_t numberOfInputs = mm.getCommandInputCount(fes[fe], commands[cmd]);
	__COUTV__(numberOfInputs);

	uint32_t numberOfOutputs = mm.getCommandOutputCount(fes[fe], commands[cmd]);
	__COUTV__(numberOfOutputs);

	std::vector<std::string> inputs;
	if(argc != int(5 + numberOfInputs))
	{
		__COUT_WARN__
		    << "Incorrect number of inputs provided for Front-end Macro Command name '"
		    << commands[cmd] << "' on FE UID '" << fes[fe] << "': " << argc - 5 << " vs "
		    << numberOfInputs << " expected." << __E__;
		__COUT_INFO__ << "Will not run command." << __E__;

		for(uint32_t i = 0; i < numberOfInputs; ++i)
		{
			std::string inputName = mm.getCommandInputName(fes[fe], commands[cmd], i);
			__COUT_INFO__ << "\tExpected input #" << i + 1 << ": " << inputName << __E__;
		}
		return 0;
	}

	__COUTV__(vectorToString(inputs, {';'}));
	for(uint32_t i = 0; i < numberOfInputs; ++i)
	{
		inputs.push_back(ots_mm_udp_interface::encodeURIComponent(argv[5 + i]));
		std::string inputName = mm.getCommandInputName(fes[fe], commands[cmd], i);
		__COUT_INFO__ << "\tInput #" << i << ": " << inputName << " = " << inputs.back()
		              << __E__;
	}

	__COUT_INFO__ << "Running command with these expected outputs..." << __E__;
	for(uint32_t i = 0; i < numberOfOutputs; ++i)
	{
		std::string outputName = mm.getCommandOutputName(fes[fe], commands[cmd], i);
		__COUT_INFO__ << "\tOutput #" << i << ": " << outputName << __E__;
	}

	std::string commandResult =
	    mm.runCommand(fes[fe], commands[cmd], vectorToString(inputs, {';'}));

	std::vector<std::string> outputs = getVectorFromString(commandResult, {';'});

	if(numberOfOutputs != outputs.size())
	{
		__COUTV__(commandResult);
		__COUT_ERR__ << "Illegal response, mismatch in output arguments returned: "
		             << outputs.size() << " vs " << numberOfOutputs << " expected."
		             << __E__;
		return 0;
	}

	__COUTV__(vectorToString(outputs, {';'}));
	for(uint32_t i = 0; i < numberOfOutputs; ++i)
	{
		std::string outputName = mm.getCommandOutputName(fes[fe], commands[cmd], i);
		__COUT__ << "\tOutput #" << i << ": " << outputName << " = "
		         << mm.decodeURIComponent(outputs[i]) << __E__;
	}
	__COUT_INFO__ << "Done." << __E__;
	return 0;
}
catch(const std::runtime_error& e)
{
	__COUT_ERR__ << "Error caught during test execution: \n" << e.what() << __E__;
	return 1;
}
