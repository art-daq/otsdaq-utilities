if(NOT DEFINED ENV{OTS_LITE}) # artdaq configuration helpers: not in ots-lite
	set(OTS_ARTDAQ_TABLE_BASE otsdaq-artdaqinterface::ARTDAQTableBase)
endif()

cet_make_library(LIBRARY_NAME ConfigurationGUI
SOURCE ConfigurationGUISupervisor.cc version.cc
		 LIBRARIES PUBLIC
		 otsdaq::CoreSupervisors
		 otsdaq::CgiDataUtilities
		 otsdaq::IterateTable
		 PRIVATE
		 otsdaq::NetworkUtilities
		 ${OTS_ARTDAQ_TABLE_BASE}
)

install_headers()
install_source()
