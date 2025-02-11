include(artdaq_doxygen)

create_doxygen_documentation(DEPENDS otsdaq EXCLUDE WebGUI/)
#create_doxygen_documentation(EXCLUDE WebGUI/)
#create_doxygen_documentation(INCLUDE WebGUI/html/*.html)
