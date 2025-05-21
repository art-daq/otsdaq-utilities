# ======================================================================
#  otsdaq_utilities main build file
#
#  cd .../path/to/build/directory
#  source .../path/to/otsdaq-utilities/ups/setup_for_development
#  buildtool
# ======================================================================


# use cmake 3.17 or later
cmake_minimum_required (VERSION 3.19 FATAL_ERROR)

find_package(cetmodules 3.16.00 REQUIRED)

project(otsdaq-utilities VERSION 3.01.00)

include(CetCMakeEnv)
cet_cmake_env()
SET(CMAKE_INSTALL_RPATH_USE_LINK_PATH TRUE)

if (CMAKE_CXX_COMPILER_ID STREQUAL Clang AND
	 CMAKE_CXX_COMPILER_VERSION VERSION_GREATER_EQUAL 14.0.0)
  # Clang 14 has a bug in which it complains about destructors of template classes
  # e.g. ArtdaqInput<T>::~ArtdaqInput(), when it is expecting the destructor name to
  # match what is on the left-hand side of the ::. This is a violation, however, of
  # the C++20 standard. https://www.open-std.org/jtc1/sc22/wg21/docs/papers/2020/p1787r6.html
  set(DT_FLAG -Wno-dtor-name)
else()
  set(DT_FLAG)
endif()

cet_set_compiler_flags(
 DIAGS
 VIGILANT
 WERROR
 NO_UNDEFINED
 EXTRA_FLAGS -Werror -pedantic -D_LIBCPP_ENABLE_CXX17_REMOVED_FEATURES=1 ${DT_FLAG}
 )

# Debug streamer.
string(TOUPPER "x${CMAKE_BUILD_TYPE}" BTYPE_UC )
if(BTYPE_UC STREQUAL XDEBUG)
  add_definitions(-DDEBUGME)
	if(DEFINED ENV{USE_ASAN})
		if($ENV{USE_ASAN} GREATER 0)
			message("!!! Address Sanitizer Activated!!!")
			add_compile_options(-fsanitize=address -Wno-unused-command-line-argument)
			add_link_options(-lasan)
		endif()
	endif()
	if(DEFINED ENV{USE_TSAN})
		if($ENV{USE_TSAN} GREATER 0)
			message("!!! Thread Sanitizer Activated!!!")
			add_compile_options(-fsanitize=thread -Wno-unused-command-line-argument)
			add_link_options(-ltsan)
		endif()
	endif()
	if(DEFINED ENV{USE_UBSAN})
		if($ENV{USE_UBSAN} GREATER 0)
			message("!!! Undefined Behavior Sanitizer Activated!!!")
			add_compile_options(-fsanitize=undefined -Wno-unused-command-line-argument)
			add_link_options(-lubsan)
		endif()
	endif()
	if(DEFINED ENV{USE_GCOV})
		add_compile_options(-fprofile-arcs -ftest-coverage --coverage)
		add_link_options(--coverage)
	endif()
endif()

#cet_report_compiler_flags()

find_package(otsdaq 2.06.06 REQUIRED EXPORT)

 # XDAQ Extra setup
 include_directories($ENV{XDAQ_ROOT}/include/linux $ENV{XDAQ_ROOT}/include)
link_directories($ENV{XDAQ_ROOT}/lib)
 set(XDAQ_BASIC_LIB_LIST
   xcept
   xoap
   xdaq
   toolbox
   xerces-c
   cgicc
 )
 set(XDAQ_XERCES-C xerces-c)


#string(REGEX MATCHALL "[0-9][0-9]?[0-9]?" MESSAGEFACILITY_VERSION_LIST "$ENV{MESSAGEFACILITY_VERSION}")
#list(GET MESSAGEFACILITY_VERSION_LIST 0 MESSAGEFACILITY_MAJOR_VERSION)
#list(GET MESSAGEFACILITY_VERSION_LIST 1 MESSAGEFACILITY_MINOR_VERSION)
#list(GET MESSAGEFACILITY_VERSION_LIST 2 MESSAGEFACILITY_PATCH_VERSION)
#message("-DMESSAGEFACILITY_HEX_VERSION=0x${MESSAGEFACILITY_MAJOR_VERSION}${MESSAGEFACILITY_MINOR_VERSION}${MESSAGEFACILITY_PATCH_VERSION}")
#add_definitions(-DMESSAGEFACILITY_HEX_VERSION=0x${MESSAGEFACILITY_MAJOR_VERSION}${MESSAGEFACILITY_MINOR_VERSION}${MESSAGEFACILITY_PATCH_VERSION})

# For version.h
message("otsdaq_utilities PROJECT_VERSION ${PROJECT_VERSION}")
string(REGEX MATCHALL "[0-9][0-9]?" OTSDAQ_VERSION_LIST "${PROJECT_VERSION}")
list(GET OTSDAQ_VERSION_LIST 0 OTSDAQ_MAJOR_VERSION)
list(GET OTSDAQ_VERSION_LIST 1 OTSDAQ_MINOR_VERSION)
list(GET OTSDAQ_VERSION_LIST 2 OTSDAQ_PATCH_VERSION)
add_definitions(-DOTSDAQ_MAJOR_VERSION=${OTSDAQ_MAJOR_VERSION})
add_definitions(-DOTSDAQ_MINOR_VERSION=${OTSDAQ_MINOR_VERSION})
add_definitions(-DOTSDAQ_PATCH_VERSION=${OTSDAQ_PATCH_VERSION})

include(BuildPlugins)

# Extra parts for the XDAQ GUI
add_subdirectory(otsdaq-utilities)

# Scripts
add_subdirectory(tools)

# Documentation directory (to comment out if not needed DOXYGEN locally)
if( $ENV{OTS_DOXY} MATCHES "DOIT" )
	add_subdirectory(doc)
	add_subdirectory(onlineDoc)
endif()

if( NOT OTS_DEBUG_MODE )
	message("otsdaq_utilities checking WebGUI Debug Mode OTS_DEBUG_MODE=$ENV{OTS_DEBUG_MODE}")
	if(DEFINED ENV{OTS_DEBUG_MODE})
		message("otsdaq_utilities found WebGUI Debug Mode = $ENV{OTS_DEBUG_MODE}")
		set(OTS_DEBUG_MODE $ENV{OTS_DEBUG_MODE})
	else()
		set(OTS_DEBUG_MODE 0)
	endif()
endif()

message("otsdaq_utilities WebGUI Debug Mode = ${OTS_DEBUG_MODE}")

# WebGUI
#FILE(REMOVE [ ${CMAKE_CURRENT_SOURCE_DIR}/WebGUI/js/Debug.js ])
#FILE(REMOVE [ ${CMAKE_CURRENT_BINARY_DIR}/WebGUI/js/Debug.js ])
# configure_file(${CMAKE_CURRENT_SOURCE_DIR}/WebGUI/js/Debug.in.js ${CMAKE_CURRENT_BINARY_DIR}/WebGUI/js/Debug.js @ONLY)
if( $ENV{OTS_DEBUG_MODE} MATCHES "2" )
	message("otsdaq_utilities WebGUI skipping Debug.js handling in shared srcs/")
else()
	configure_file(${CMAKE_CURRENT_SOURCE_DIR}/WebGUI/js/Debug.in.js ${CMAKE_CURRENT_SOURCE_DIR}/WebGUI/js/Debug.js @ONLY)
endif()

FILE(COPY WebGUI DESTINATION . PATTERN "*.in.js" EXCLUDE)
INSTALL(DIRECTORY WebGUI DESTINATION . FILE_PERMISSIONS USE_SOURCE_PERMISSIONS PATTERN "*.in.js" EXCLUDE)
INSTALL(FILES ${CMAKE_CURRENT_BINARY_DIR}/WebGUI/js/Debug.js DESTINATION WebGUI/js)


message("otsdaq_utilities WebGUI created Debug.js at ${CMAKE_CURRENT_BINARY_DIR}/WebGUI/js/Debug.js}")
message("otsdaq_utilities WebGUI created Debug.js at ${CMAKE_CURRENT_SOURCE_DIR}/WebGUI/js/Debug.js}")

# tools
FILE(COPY tools DESTINATION .)
INSTALL(DIRECTORY tools DESTINATION . FILE_PERMISSIONS USE_SOURCE_PERMISSIONS)

# test programs
add_subdirectory(test)

cet_cmake_config()
