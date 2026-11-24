
cet_make_library(LIBRARY_NAME SlowControlsDashboard
SOURCE SlowControlsDashboardSupervisor.cc KafkaAlarmReader.cc ArchiveHistoryReader.cc LiveValueReader.cc version.cc
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

# Optional reading of pv history from the archiver database (enabled if libpq is found)
find_path(LIBPQ_INCLUDE_DIR libpq-fe.h PATH_SUFFIXES postgresql pgsql)
find_library(LIBPQ_LIBRARY NAMES pq)
if(LIBPQ_INCLUDE_DIR AND LIBPQ_LIBRARY)
	message(STATUS "SlowControlsDashboard: archive history reading enabled with ${LIBPQ_LIBRARY}")
	target_include_directories(SlowControlsDashboard SYSTEM PRIVATE ${LIBPQ_INCLUDE_DIR})
	target_link_libraries(SlowControlsDashboard PRIVATE ${LIBPQ_LIBRARY})
	target_compile_definitions(SlowControlsDashboard PRIVATE OTS_HAVE_LIBPQ)
else()
	message(STATUS "SlowControlsDashboard: archive history reading disabled, libpq not found")
endif()

# Optional reading of live pv values (enabled if EPICS Channel Access is found)
find_path(EPICS_CA_INCLUDE_DIR cadef.h HINTS ENV EPICS_BASE PATH_SUFFIXES include)
find_library(EPICS_CA_LIBRARY NAMES ca HINTS ENV EPICS_BASE PATH_SUFFIXES lib/linux-x86_64 lib)
find_library(EPICS_COM_LIBRARY NAMES Com HINTS ENV EPICS_BASE PATH_SUFFIXES lib/linux-x86_64 lib)
if(EPICS_CA_INCLUDE_DIR AND EPICS_CA_LIBRARY AND EPICS_COM_LIBRARY)
	message(STATUS "SlowControlsDashboard: live value reading enabled with ${EPICS_CA_LIBRARY}")
	target_include_directories(SlowControlsDashboard SYSTEM PRIVATE ${EPICS_CA_INCLUDE_DIR}
			 ${EPICS_CA_INCLUDE_DIR}/os/Linux ${EPICS_CA_INCLUDE_DIR}/compiler/gcc)
	target_link_libraries(SlowControlsDashboard PRIVATE ${EPICS_CA_LIBRARY} ${EPICS_COM_LIBRARY})
	target_compile_definitions(SlowControlsDashboard PRIVATE OTS_HAVE_EPICS_CA)
else()
	message(STATUS "SlowControlsDashboard: live value reading disabled, EPICS Channel Access not found")
endif()

install_headers()
install_source()
