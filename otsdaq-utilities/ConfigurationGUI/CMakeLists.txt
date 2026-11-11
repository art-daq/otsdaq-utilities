cet_make_library(LIBRARY_NAME ConfigurationGUI
SOURCE ConfigurationGUISupervisor.cc version.cc
		 LIBRARIES PUBLIC
		 otsdaq::CoreSupervisors
		 otsdaq::CgiDataUtilities
		 otsdaq::IterateTable
		 PRIVATE
		 otsdaq::NetworkUtilities
)

install_headers()
install_source()
