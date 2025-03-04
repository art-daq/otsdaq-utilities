
cet_make_library(LIBRARY_NAME SlowControlsDashboard
SOURCE SlowControlsDashboardSupervisor.cc version.cc
		 LIBRARIES PRIVATE
		 otsdaq::CoreSupervisors
		 otsdaq_plugin_support::slowControlsMaker
)

install_headers()
install_source()
