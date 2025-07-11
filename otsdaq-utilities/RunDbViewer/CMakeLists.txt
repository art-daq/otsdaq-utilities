
cet_make_library(LIBRARY_NAME RunDbViewer
SOURCE RunDbViewerSupervisor.cc version.cc
		 LIBRARIES PUBLIC
		 otsdaq::CoreSupervisors
		 otsdaq_plugin_support::runInfoMaker
)

install_headers()
install_source()
