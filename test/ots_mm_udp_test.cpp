
#include "test/ots_mm_udp_interface.h"

#include <limits>

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
		        "       ots_mm_udp_test <mm IP> <mm Port> <Sequence Name> <iterations> "
		        "[[varName,value,step,max] ...]\n\n");
		fprintf(stderr,
		        "\t If <Front-end UID> not specified, then the list of existing FE UIDs "
		        "and MoM Sequences will be output \n");
		fprintf(stderr,
		        "\t If <FEMacro Name> not specified, then the list of existing FE Macro "
		        "Names will be output associated with the specified FE UID\n");
		fprintf(stderr,
		        "\t If only a <Sequence Name> is given (no iterations), lists the "
		        "sequence's commands and Input Variables with their saved defaults.\n");
		fprintf(stderr,
		        "\t Variable overrides use bracket syntax, e.g. [num_of_packets,200], "
		        "and are named. Step and max are optional (default 0).\n");
		fprintf(stderr, "\t The $ prefix on variable names is optional.\n");
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
	if(fes.size() == 0 || (fes.size() == 1 && fes[0] == ""))
	{
		__COUT_ERR__
		    << "No Front-ends found in FE list! Check that a MacroMaker Supervisor is "
		    << "configured with UDP Remote Control enabled and accessible at "
		    << target_mm_ip << ":" << target_mm_port << "." << __E__;
		return 1;
	}

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
			// not a FE UID — check if it is a MoM sequence name
			std::string              sequenceListStr = mm.getSequenceList();
			std::vector<std::string> sequenceNames =
			    getVectorFromString(sequenceListStr, {';'});

			std::string strippedTargetName = target_fe;
			if(strippedTargetName.find("public/") == 0)
				strippedTargetName =
				    strippedTargetName.substr(std::string("public/").size());

			bool isSequenceMatch = false;
			for(size_t sequenceIndex = 0; sequenceIndex < sequenceNames.size();
			    ++sequenceIndex)
			{
				std::string candidateName = sequenceNames[sequenceIndex];
				if(candidateName.find("public/") == 0)
					candidateName = candidateName.substr(std::string("public/").size());
				if(candidateName == strippedTargetName)
				{
					isSequenceMatch = true;
					break;
				}
			}

			if(isSequenceMatch)
			{
				// ======== Sequence mode ========
				// keep the user's exact name (including any public/ qualifier) so the
				// server resolves the intended directory
				std::string sequenceName = target_fe;

				if(argc == 4)
				{
					// Discovery mode — print commands and variables, then exit
					__COUT_INFO__ << "Loading sequence '" << sequenceName << "'..."
					              << __E__;

					std::string sequenceJSON        = mm.getSequenceInfo(sequenceName);
					std::string sequenceDescription = mm.describeSequence(sequenceJSON);

					__COUT_INFO__ << "\nSequence '" << sequenceName << "':\n"
					              << sequenceDescription << __E__;

					__COUT_INFO__ << "To run: ots_mm_udp_test " << target_mm_ip << " "
					              << target_mm_port << " \"" << sequenceName
					              << "\" <iterations> [varName,value] ..." << __E__;
					__COUT_INFO__ << "  e.g.: ots_mm_udp_test " << target_mm_ip << " "
					              << target_mm_port << " \"" << sequenceName
					              << "\" 1 [var1,0]" << __E__;
					return 0;
				}

				// Run mode — argv[4] is iteration count, argv[5..] are variable overrides
				unsigned int iterationCount = 0;
				if(!ots_mm_udp_interface::parseIterationCount(argv[4], iterationCount))
				{
					__COUT_ERR__
					    << "Invalid iteration count: '" << argv[4]
					    << "'. Must be a positive integer (digits only) no larger than "
					    << std::numeric_limits<unsigned int>::max() << "." << __E__;
					return 1;
				}

				// Parse variable overrides from [value,step,max] arguments
				// First, load the sequence to get variable names in order
				std::string sequenceJSON = mm.getSequenceInfo(sequenceName);

				// Extract variable names in order from __variables__ block
				// (Same approach as discovery mode but just collecting names)
				std::vector<std::string> variableNamesInOrder;
				{
					size_t variablesKeyPosition = sequenceJSON.find("\"__variables__\"");
					if(variablesKeyPosition != std::string::npos)
					{
						size_t variablesObjectStart =
						    sequenceJSON.find('{', variablesKeyPosition);
						if(variablesObjectStart != std::string::npos)
						{
							size_t scanPosition = variablesObjectStart + 1;
							int    depth        = 1;
							while(scanPosition < sequenceJSON.size() && depth > 0)
							{
								size_t nameStart = sequenceJSON.find('"', scanPosition);
								if(nameStart == std::string::npos)
									break;

								// check if we've left the __variables__ block
								bool insideQuote = false;
								bool leftBlock   = false;
								for(size_t checkPos = variablesObjectStart + 1;
								    checkPos < nameStart;
								    ++checkPos)
								{
									if(sequenceJSON[checkPos] == '\\' && insideQuote)
									{
										++checkPos;
										continue;
									}
									if(sequenceJSON[checkPos] == '"')
										insideQuote = !insideQuote;
									if(!insideQuote)
									{
										if(sequenceJSON[checkPos] == '{')
											++depth;
										else if(sequenceJSON[checkPos] == '}')
										{
											--depth;
											if(depth <= 0)
											{
												leftBlock = true;
												break;
											}
										}
									}
								}
								if(leftBlock)
									break;

								size_t nameEnd = std::string::npos;
								for(size_t i = nameStart + 1; i < sequenceJSON.size();
								    ++i)
								{
									if(sequenceJSON[i] == '\\')
									{
										++i;
										continue;
									}
									if(sequenceJSON[i] == '"')
									{
										nameEnd = i;
										break;
									}
								}
								if(nameEnd == std::string::npos)
									break;

								std::string variableName = sequenceJSON.substr(
								    nameStart + 1, nameEnd - nameStart - 1);

								// skip past the value object {value, step, max}
								size_t objectStart = sequenceJSON.find('{', nameEnd + 1);
								if(objectStart == std::string::npos)
									break;
								int    objectDepth = 1;
								bool   objectQuote = false;
								size_t objectEnd   = std::string::npos;
								for(size_t i = objectStart + 1; i < sequenceJSON.size();
								    ++i)
								{
									if(sequenceJSON[i] == '\\' && objectQuote)
									{
										++i;
										continue;
									}
									if(sequenceJSON[i] == '"')
										objectQuote = !objectQuote;
									if(!objectQuote)
									{
										if(sequenceJSON[i] == '{')
											++objectDepth;
										else if(sequenceJSON[i] == '}')
										{
											--objectDepth;
											if(objectDepth == 0)
											{
												objectEnd = i;
												break;
											}
										}
									}
								}
								if(objectEnd == std::string::npos)
									break;

								variableNamesInOrder.push_back(variableName);
								scanPosition = objectEnd + 1;
							}
						}
					}
				}

				// Parse [$varName,value,step,max] arguments from argv[5..argc-1]
				unsigned int numberOfOverrides = argc - 5;

				// Build variablesJSON from overrides
				std::string variablesJSON;
				if(numberOfOverrides > 0)
				{
					variablesJSON                   = "{";
					unsigned int validOverrideCount = 0;
					for(unsigned int overrideIndex = 0; overrideIndex < numberOfOverrides;
					    ++overrideIndex)
					{
						std::string overrideArg = argv[5 + overrideIndex];

						// Strip brackets
						if(overrideArg.size() >= 2 && overrideArg[0] == '[' &&
						   overrideArg[overrideArg.size() - 1] == ']')
							overrideArg = overrideArg.substr(1, overrideArg.size() - 2);

						std::vector<std::string> overrideParts =
						    getVectorFromString(overrideArg, {','}, {} /*whitespace*/);

						if(overrideParts.size() < 2)
						{
							__COUT_ERR__ << "Invalid variable override: '"
							             << argv[5 + overrideIndex]
							             << "'. Expected [varName,value,step,max]."
							             << __E__;
							return 1;
						}

						std::string overrideName = overrideParts[0];
						if(!overrideName.empty() && overrideName[0] != '$')
							overrideName = "$" + overrideName;
						std::string overrideValue =
						    overrideParts.size() > 1 ? overrideParts[1] : "0";
						std::string overrideStep =
						    overrideParts.size() > 2 ? overrideParts[2] : "0";
						std::string overrideMax =
						    overrideParts.size() > 3 ? overrideParts[3] : "0";

						// Verify the variable name exists in the sequence
						bool foundVariable = false;
						for(size_t variableIndex = 0;
						    variableIndex < variableNamesInOrder.size();
						    ++variableIndex)
						{
							if(variableNamesInOrder[variableIndex] == overrideName)
							{
								foundVariable = true;
								break;
							}
						}
						if(!foundVariable)
						{
							__COUT_ERR__ << "Unknown variable '" << overrideName
							             << "'. Available variables:" << __E__;
							for(size_t variableIndex = 0;
							    variableIndex < variableNamesInOrder.size();
							    ++variableIndex)
								__COUT_ERR__ << "\t"
								             << variableNamesInOrder[variableIndex]
								             << __E__;
							return 1;
						}

						if(validOverrideCount > 0)
							variablesJSON += ",";
						variablesJSON +=
						    "\"" + ots_mm_udp_interface::escapeJsonString(overrideName) +
						    "\":{\"value\":\"" +
						    ots_mm_udp_interface::escapeJsonString(overrideValue) +
						    "\",\"step\":\"" +
						    ots_mm_udp_interface::escapeJsonString(overrideStep) +
						    "\",\"max\":\"" +
						    ots_mm_udp_interface::escapeJsonString(overrideMax) + "\"}";
						++validOverrideCount;
					}
					variablesJSON += "}";
				}

				__COUT_INFO__ << "Running sequence '" << sequenceName << "' for "
				              << iterationCount << " iteration(s)" << __E__;

				if(numberOfOverrides > 0)
				{
					__COUT_INFO__ << "Variable overrides:" << __E__;
					for(unsigned int overrideIndex = 0; overrideIndex < numberOfOverrides;
					    ++overrideIndex)
						__COUT_INFO__ << "\t" << argv[5 + overrideIndex] << __E__;
				}

				mm.runSequence(sequenceName, variablesJSON, iterationCount);

				__COUT_INFO__ << "Done." << __E__;
				return 0;
			}

			// neither FE UID nor sequence name
			__COUT_ERR__ << "'" << target_fe
			             << "' not found as a front-end UID or MoM sequence name."
			             << __E__;
			__COUT_INFO__ << "\nAvailable Front-end UIDs:" << __E__;
			for(size_t feIndex = 0; feIndex < fes.size(); ++feIndex)
				__COUT_INFO__ << "\t\t" << fes[feIndex] << __E__;

			__COUT_INFO__ << "\nAvailable MoM Sequences:" << __E__;
			for(size_t sequenceIndex = 0; sequenceIndex < sequenceNames.size();
			    ++sequenceIndex)
			{
				if(sequenceNames[sequenceIndex].empty() ||
				   sequenceNames[sequenceIndex] == "." ||
				   sequenceNames[sequenceIndex] == "..")
					continue;
				__COUT_INFO__ << "\t\t" << sequenceNames[sequenceIndex] << __E__;
			}
			return 1;
		}
	}
	else
	{
		__COUT_INFO__
		    << "No front-end UID specified, here is the list of existing Front-end UIDs:"
		    << __E__;
		for(fe = 0; fe < fes.size(); ++fe)
			__COUT_INFO__ << "\t\t" << fes[fe] << __E__;

		// Also list available sequences
		try
		{
			std::string              sequenceListStr = mm.getSequenceList();
			std::vector<std::string> sequenceNames =
			    getVectorFromString(sequenceListStr, {';'});

			bool hasSequences = false;
			for(size_t sequenceIndex = 0; sequenceIndex < sequenceNames.size();
			    ++sequenceIndex)
			{
				if(sequenceNames[sequenceIndex].empty() ||
				   sequenceNames[sequenceIndex] == "." ||
				   sequenceNames[sequenceIndex] == "..")
					continue;
				if(!hasSequences)
				{
					__COUT_INFO__ << "\nAvailable MoM Sequences:" << __E__;
					hasSequences = true;
				}
				__COUT_INFO__ << "\t\t" << sequenceNames[sequenceIndex] << __E__;
			}
		}
		catch(const std::runtime_error& sequenceListError)
		{
			__COUT_WARN__ << "Could not retrieve sequence list: "
			              << sequenceListError.what() << __E__;
		}

		return 0;
	}

	if(fe >= fes.size())
	{
		__COUT_ERR__ << "Illegal front-end index " << fe << " vs " << fes.size()
		             << " count." << __E__;
		return 1;
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
			return 1;
		}
	}
	else
	{
		__COUT_INFO__ << "No FE Macro Name specified, here is the list of existing FE "
		                 "Macro Names corresponding to the specified Front-end UID '"
		              << argv[3] << "':" << __E__;
		for(cmd = 0; cmd < commands.size(); ++cmd)
			__COUT_INFO__ << "\t\t" << commands[cmd] << __E__;

		return 0;
	}

	if(cmd >= commands.size())
	{
		__COUT_ERR__ << "Illegal command index " << cmd << " vs " << commands.size()
		             << " count." << __E__;
		return 1;
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
		__COUT_INFO__ << "\tInput #" << i << ": " << inputName << " = "
		              << ots_mm_udp_interface::decodeURIComponent(inputs.back()) << __E__;
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
		return 1;
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
