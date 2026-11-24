cet_make_exec(NAME otsConsoleFwd SOURCE MF_ReceiveAndForward.cpp)


#For Console Supervisor
cet_make_library(LIBRARY_NAME Console
SOURCE ConsoleSupervisor.cc KafkaErrorPublisher.cc version.cc
		 LIBRARIES PUBLIC
		 otsdaq::CoreSupervisors
		 otsdaq::NetworkUtilities
		 Boost::regex
)

# Optional publishing of Console errors to Kafka (enabled if librdkafka is found)
#	Note: the header location can be given by environment variable RDKAFKA_ROOT
find_path(RDKAFKA_INCLUDE_DIR librdkafka/rdkafka.h
		 HINTS ENV RDKAFKA_ROOT PATH_SUFFIXES include)
find_library(RDKAFKA_LIBRARY NAMES rdkafka librdkafka.so.1
		 HINTS ENV RDKAFKA_ROOT PATH_SUFFIXES lib lib64)
if(RDKAFKA_INCLUDE_DIR AND RDKAFKA_LIBRARY)
	message(STATUS "Console: Kafka publishing enabled with ${RDKAFKA_LIBRARY}")
	target_include_directories(Console SYSTEM PRIVATE ${RDKAFKA_INCLUDE_DIR})
	target_link_libraries(Console PRIVATE ${RDKAFKA_LIBRARY})
	target_compile_definitions(Console PRIVATE OTS_HAVE_RDKAFKA)
else()
	message(STATUS "Console: Kafka publishing disabled, librdkafka not found")
endif()

install_headers()
install_source()
