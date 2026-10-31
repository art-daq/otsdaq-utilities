
if(DEFINED ENV{OTS_LITE})
cet_make_library(LIBRARY_NAME Visualization
SOURCE version.cc VisualSupervisor.cc
		 LIBRARIES PRIVATE
		 otsdaq::CoreSupervisors
)
else()
cet_make_library(LIBRARY_NAME Visualization
SOURCE version.cc VisualSupervisor.cc
		 LIBRARIES PRIVATE
		 otsdaq::CoreSupervisors
		 ROOT::RIO
		 ROOT::Gui
		 otsdaq::RootUtilities
		 Boost::regex
)
endif()


install_headers()
install_source()
