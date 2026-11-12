cet_make_exec(NAME otsConsoleFwd SOURCE MF_ReceiveAndForward.cpp)


#For Console Supervisor
cet_make_library(LIBRARY_NAME Console
SOURCE ConsoleSupervisor.cc version.cc
		 LIBRARIES PUBLIC
		 otsdaq::CoreSupervisors
		 otsdaq::NetworkUtilities
)

install_headers()
install_source()
