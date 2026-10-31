

add_subdirectory(Chat)
add_subdirectory(ConfigurationGUI)
add_subdirectory(Console)
add_subdirectory(SlowControlsDashboard)
add_subdirectory(ECLWriter)
add_subdirectory(Logbook)
add_subdirectory(Visualization)
if(NOT DEFINED ENV{OTS_LITE})
	add_subdirectory(VisualizationV2) # needs ROOT
endif()
add_subdirectory(MacroMaker)
add_subdirectory(RunDbViewer)
