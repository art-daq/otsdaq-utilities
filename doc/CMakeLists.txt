include(artdaq_doxygen)

create_doxygen_documentation(DEPENDS otsdaq
EXCLUDE
WebGUI/js/visualizers_lib/ViewerRoot_lib
WebGUI/fonts
WebGUI/css/library
WebGUI/html/widgets/libraries
WebGUI/js/js_lib/d3.v2.min.js
WebGUI/js/js_lib/glMatrix-0.9.5.min.js
WebGUI/js/js_lib/jquery-ui.min.js
WebGUI/js/js_lib/jquery.min.js
WebGUI/js/js_lib/plotly.min.js
WebGUI/js/js_lib/three.min.js
WebGUI/js/js_lib/webgl-utils.js
)
