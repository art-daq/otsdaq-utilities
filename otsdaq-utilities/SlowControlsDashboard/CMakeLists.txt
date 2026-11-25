
cet_make_library(LIBRARY_NAME SlowControlsDashboard
SOURCE SlowControlsDashboardSupervisor.cc KafkaAlarmReader.cc version.cc
		 LIBRARIES PRIVATE
		 otsdaq::CoreSupervisors
		 otsdaq_plugin_support::slowControlsMaker
)

# Optional reading of Phoebus alarms from Kafka (enabled if librdkafka and nlohmann json are found)
#	Note: the header location can be given by environment variable RDKAFKA_ROOT
find_path(RDKAFKA_INCLUDE_DIR librdkafka/rdkafka.h
		 HINTS ENV RDKAFKA_ROOT PATH_SUFFIXES include)
find_library(RDKAFKA_LIBRARY NAMES rdkafka librdkafka.so.1
		 HINTS ENV RDKAFKA_ROOT PATH_SUFFIXES lib lib64)
find_path(NLOHMANN_JSON_INCLUDE_DIR nlohmann/json.hpp)
if(RDKAFKA_INCLUDE_DIR AND RDKAFKA_LIBRARY AND NLOHMANN_JSON_INCLUDE_DIR)
	message(STATUS "SlowControlsDashboard: Kafka alarm reading enabled with ${RDKAFKA_LIBRARY}")
	target_include_directories(SlowControlsDashboard SYSTEM PRIVATE ${RDKAFKA_INCLUDE_DIR} ${NLOHMANN_JSON_INCLUDE_DIR})
	target_link_libraries(SlowControlsDashboard PRIVATE ${RDKAFKA_LIBRARY})
	target_compile_definitions(SlowControlsDashboard PRIVATE OTS_HAVE_RDKAFKA)
else()
	message(STATUS "SlowControlsDashboard: Kafka alarm reading disabled, librdkafka or nlohmann json not found")
endif()

install_headers()
install_source()
