# Look for the header file.
find_path(XSD_INCLUDE_DIR NAMES xsd/cxx/config.hxx HINTS $ENV{XDAQ_ROOT}) # Spack environment view?
mark_as_advanced(XSD_INCLUDE_DIR)

message("otsdaq_utilities considering ECLWriter...")

if(XSD_INCLUDE_DIR)
  foreach(_XSD_version_header version.hxx)
	if(EXISTS "${XSD_INCLUDE_DIR}/xsd/cxx/${_XSD_version_header}")
	  file(STRINGS "${XSD_INCLUDE_DIR}/xsd/cxx/${_XSD_version_header}" XSD_version_str REGEX "^#define[\t ]+XSD_STR_VERSION[\t ]+\".*\"")

	  string(REGEX REPLACE "^#define[\t ]+XSD_STR_VERSION[\t ]+\"([^\"]*)\".*" "\\1" XSD_VERSION_STRING "${XSD_version_str}")
	  unset(XSD_version_str)
	  break()
	endif()
  endforeach()
endif()

message("otsdaq_utilities looking for XSD for ECLWriter...")
include(FindPackageHandleStandardArgs)
FIND_PACKAGE_HANDLE_STANDARD_ARGS(XSD
								  REQUIRED_VARS XSD_INCLUDE_DIR
								  VERSION_VAR XSD_VERSION_STRING)

if(XSD_FOUND)
  set(XSD_INCLUDE_DIRS ${XSD_INCLUDE_DIR})
	#endif(XSD_FOUND)

	message("otsdaq_utilities looking for CURL for ECLWriter...")
	find_package(CURL)

	if(CURL_FOUND)

		message("otsdaq_utilities Found CURL, so building ECLWriter")

		include_directories(${CURL_INCLUDE_DIRS})
		#endif(CURL_FOUND)
		cet_make_library( LIBRARY_NAME ECLWriterCore
		SOURCE ECLConnection.cpp  ECL.cxx
			LIBRARIES PUBLIC
			${XDAQ_XERCES-C}
			PRIVATE
			${CURL_LIBRARIES}
			Boost::regex
			otsdaq::MessageFacility
			)
		cet_make_library( LIBRARY_NAME ECLWriter SOURCE ECLSupervisor.cc
			LIBRARIES PUBLIC
				otsdaq::CoreSupervisors
				PRIVATE
			otsdaq-utilities::ECLWriterCore
			)

		cet_make_exec(NAME ECLTest LIBRARIES PRIVATE otsdaq-utilities::ECLWriterCore TRACE::TRACE Boost::program_options)
	else(CURL_FOUND)
		message("otsdaq_utilities Did not find CURL, so not building ECLWriter")
	endif(CURL_FOUND)

else(XSD_FOUND)
	message("otsdaq_utilities Did not find XSD, so not building ECLWriter")
endif(XSD_FOUND)


install_headers(EXTRAS ECL.hxx)
install_source(EXTRAS ECL.hxx)
