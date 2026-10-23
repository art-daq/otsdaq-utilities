if(DEFINED ENV{OTS_LITE})
	set(OTS_ARTDAQ_DAQDATA otsdaq::XdaqLite) # provides artdaq::TimeUtils
else()
	set(OTS_ARTDAQ_DAQDATA artdaq::DAQdata)
endif()

cet_make_library(LIBRARY_NAME MacroMaker
SOURCE MacroMakerSupervisor.cc version.cc
		 LIBRARIES PUBLIC
		 otsdaq::CoreSupervisors
		 PRIVATE
		 ${OTS_ARTDAQ_DAQDATA}
		 otsdaq::CodeEditor
		 otsdaq::NetworkUtilities
)

install_headers()
install_source()
