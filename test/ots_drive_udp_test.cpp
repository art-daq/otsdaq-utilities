#include "test/ots_drive_udp_interface.h"

#include <chrono>
#include <thread>

///==============================================================================
/// Drives the Gateway (FSM transitions) and queries it, over the Gateway UDP remote
/// control. It is enabled in the Context group's GatewaySupervisorTable
/// (EnableStateChangesOverUDP with IPAddress/PortForStateChangesOverUDP), not by env
/// vars; `ots` prints its address at launch. Status needs
/// EnableApplicationStatusMonitoring on.
///
/// FSM commands are not acknowledged unless EnableAckForStateChangesOverUDP is on, so
/// after sending one this tool polls the Gateway status until the target state is
/// reached or the Gateway reports Failed:::.

static void usage(void)
{
	fprintf(
	    stderr,
	    "usage: ots_drive_udp_test <gateway IP> <gateway Port> [mode ...]\n\n"
	    "Modes:\n"
	    "  (none)                         list the state machines and the app status\n"
	    "  status                         app status table (name, status, progress, "
	    "url)\n"
	    "  fsms                           state machine names\n"
	    "  <FSM> <Command> [param ...]    FSM transition, then wait for its target "
	    "state\n"
	    "      Commands: Initialize, Configure <ConfigAlias>, Start [runNumber], Pause,\n"
	    "                Resume, Stop, Halt, Abort, Shutdown (from Halted or Failed),\n"
	    "                Startup (from Shutdown, ends in Initial; re-reads the Context)\n"
	    "      options (after the command): --no-wait, --timeout <seconds> (default "
	    "300)\n"
	    "  raw \"<message>\"                 send any Gateway UDP message and print the "
	    "reply\n"
	    "                                 (e.g. Help, GetRemoteDesktopIcons,\n"
	    "                                 GetRemoteGatewayStatusXML)\n\n"
	    "Examples:\n"
	    "  ots_drive_udp_test 127.0.0.1 2014\n"
	    "  ots_drive_udp_test 127.0.0.1 2014 PhysicsRuns0 Configure defaultSystemAlias\n"
	    "  ots_drive_udp_test 127.0.0.1 2014 PhysicsRuns0 Start\n"
	    "  ots_drive_udp_test 127.0.0.1 2014 PhysicsRuns0 Halt\n"
	    "  ots_drive_udp_test 127.0.0.1 2014 raw Help\n\n"
	    "Exit status: 0 success, 1 transition failed or error, 2 timed out.\n");
}  // end usage()

//==============================================================================
static void printStatusTable(ots_drive_udp_interface& gw)
{
	auto apps = gw.getAppStatus();
	__COUT_INFO__ << "App status (" << apps.size() << " applications):" << __E__;
	for(const auto& a : apps)
	{
		std::string status = a.status;
		if(status.size() > 70)
			status = status.substr(0, 70) + "...";
		printf("\t%-30s %-5s %-24s %4s%%  %s\n",
		       a.name.c_str(),
		       a.id.c_str(),
		       status.c_str(),
		       a.progress.c_str(),
		       a.url.c_str());
	}
}  // end printStatusTable()

//==============================================================================
int main(int argc, char* argv[])
try
{
	if(argc < 3)
	{
		usage();
		return 1;
	}
	ots_drive_udp_interface gw(argv[1], atoi(argv[2]));

	std::vector<std::string> args;
	for(int i = 3; i < argc; ++i)
		args.push_back(argv[i]);

	if(args.empty() || args[0] == "status" || args[0] == "fsms")
	{
		if(args.empty() || args[0] == "fsms")
		{
			auto        fsms = gw.getStateMachineNames();
			std::string list;
			for(const auto& f : fsms)
				list += (list.size() ? ", " : "") + f;
			__COUT_INFO__ << "State machines: " << (list.size() ? list : "(none)")
			              << __E__;
		}
		if(args.empty() || args[0] == "status")
			printStatusTable(gw);
		return 0;
	}

	if(args[0] == "raw")
	{
		if(args.size() < 2)
		{
			usage();
			return 1;
		}
		std::string reply = gw.send(args[1]);
		if(reply.empty())
		{
			__COUT_WARN__ << "No reply to '" << args[1]
			              << "' (FSM commands are acknowledged only if "
			                 "EnableAckForStateChangesOverUDP is on)."
			              << __E__;
			return 0;
		}
		std::cout << reply << std::endl;
		return 0;
	}

	// FSM command: <FSM> <Command> [param ...] [--no-wait] [--timeout N]
	if(args.size() < 2)
	{
		usage();
		return 1;
	}
	std::string              fsm = args[0], command = args[1];
	std::vector<std::string> params;
	bool                     wait           = true;
	int                      timeoutSeconds = 300;
	for(size_t i = 2; i < args.size(); ++i)
	{
		if(args[i] == "--no-wait")
			wait = false;
		else if(args[i] == "--timeout" && i + 1 < args.size())
			timeoutSeconds = atoi(args[++i].c_str());
		else
			params.push_back(args[i]);
	}
	if(command == "Configure" && params.empty())
	{
		__SS__ << "Configure needs the Configuration Alias as its first parameter, e.g. "
		          "ots_drive_udp_test <ip> <port> "
		       << fsm << " Configure defaultSystemAlias" << __E__;
		__SS_THROW__;
	}
	std::string target = ots_drive_udp_interface::expectedState(command);

	ots_drive_udp_interface::AppStatus before = gw.getGatewayStatus();
	__COUT_INFO__ << "Gateway status before: " << before.status << __E__;

	std::string ack = gw.sendCommand(fsm, command, params);
	if(ack.size())
		__COUT_INFO__ << "Acknowledgement: " << ack << __E__;

	if(!wait || target.empty())
	{
		if(target.empty())
			__COUT_WARN__ << "Unknown command '" << command
			              << "', not waiting for a target state." << __E__;
		return 0;
	}

	// A failure reported before this command stays in the status until the next
	// transition, so only a Failed::: status that changed (time or text) is ours.
	std::string lastShown;
	auto        start = std::chrono::steady_clock::now();
	while(std::chrono::steady_clock::now() - start < std::chrono::seconds(timeoutSeconds))
	{
		std::this_thread::sleep_for(std::chrono::milliseconds(1000));
		ots_drive_udp_interface::AppStatus now = gw.getGatewayStatus();

		bool fresh = now.statusChangeTime != before.statusChangeTime ||
		             now.status != before.status;
		if(now.status.find("Failed:::") == 0 && fresh)
		{
			__COUT_ERR__ << "Transition '" << command << "' failed:\n\t"
			             << now.status.substr(9) << __E__;
			return 1;
		}
		if(now.status == target && fresh)
		{
			__COUT_INFO__ << "Reached " << target << "." << __E__;
			return 0;
		}

		if(!fresh && std::chrono::steady_clock::now() - start > std::chrono::seconds(10))
		{
			__COUT_ERR__ << "The Gateway status has not changed 10 s after '" << command
			             << "' (still '" << now.status
			             << "'): the command was probably rejected (wrong state, unknown "
			                "FSM or alias). See the Gateway log."
			             << __E__;
			return 1;
		}

		std::string shown = now.status + " " + now.progress + "%";
		if(shown != lastShown)
		{
			__COUT_INFO__ << "Gateway status: "
			              << (now.status.size() > 100 ? now.status.substr(0, 100) + "..."
			                                          : now.status)
			              << " (" << now.progress << "%)" << __E__;
			lastShown = shown;
		}
	}
	__COUT_ERR__ << "Timed out after " << timeoutSeconds << " s waiting for " << target
	             << "." << __E__;
	return 2;
}
catch(const std::exception& e)
{
	__COUT_ERR__ << "Caught exception: " << e.what() << __E__;
	return 1;
}  // end main()
