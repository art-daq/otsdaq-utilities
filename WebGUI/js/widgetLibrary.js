//=====================================================================================
//
//	Created Aug, 2016
//	by Daniel Parilla ((parilla at fnal.gov))
//
//	OtsConfigurationWizard.js
//
//
//
//
//
//
//=====================================================================================
var widgetLibrary = widgetLibrary || {};
widgetLibrary.typeToSrc =		{
									"0" :"widget_text.html",
									"1" :"table.html",
									"2" :"gauge_widget.html",
									"3" :"plotly_bar_chart.html",
									"4" :"plotly_xy_chart.html",
									"5" :"thermometer.html",
									"6" :"siren_alarm.html",
									"7" :"label.html",
									"8" :"led.html",
									"9" :"picture.html",
									"10" :"2d_stop-light.html",
									"11" :"root_visualizer.html",
									"12" :"tabs.html",
									"13" :"navtabs.html",
									"14" :"progress_bar.html",
									"15" :"tank.html"
								}

widgetLibrary.typeToImgSrc =	{
									"0" :"txt-icon.png",
									"1" :"table-icon.png",
									"2" :"gauge-icon.png",
									"3" :"basic-chart-icon.png",
									"4" :"basic-xy-chart-icon.png",
									"5" :"thermometer-icon.png" ,
									"6" :"red_siren.png",
									"7" :"label-icon.png",
									"8" :"led-icon.png",
									"9" :"picture-icon.png",
									"10" :"2d_stop-light.png",
									"11" :"root-icon.png",
									"12" :"tabs-icon.png",
									"13" :"navtabs-icon.png",
									"14" :"progress_bar-icon.png",
									"15" :"tank-icon.png"
								}

widgetLibrary.typeToName =		{
									"0" : "Plain Text",
									"1" : "Basic PVs Table",
									"2" : "Basic Gauge Style Display",
									"3" : "Basic Time Line Chart",
									"4" : "Basic XY Line Chart",
									"5" : "Basic Thermometer",
									"6" : "Basic Siren Alarm",
									"7" : "Basic Label for widgets",
									"8" : "Basic Led",
									"9" : "Basic picture",
									"10" : "Basic 2D stop-light viewer",
									"11" : "Basic Root file widget",
									"12" : "Basic tabs widget",
									"13" : "Basic nav tabs widget",
									"14" : "Basic progress bar widget",
									"15" : "Basic tank widget"
								}

widgetLibrary.typeToPurpose =	{
									"0" : "Plain Text",
									"1" : "PVs Table",
									"2" : "Gauge",
									"3" : "Time Chart",
									"4" : "XY Chart",
									"5" : "Thermometer",
									"6" : "Siren Alarm",
									"7" : "Label widgets",
									"8" : "Led",
									"9" : "Picture",
									"10" : "2D stop-light",
									"11" : "Root file",
									"12" : "Tabs",
									"13" : "NavTabs",
									"14" : "Progress bar",
									"15" : "Tank"
								}

widgetLibrary.dimensions =		{

									"1": { /* PVs Table */
										"Min Width": "400",
										"Min Height": "200",
										"Default Width": "400",
										"Default Height": "200",
										"Scale": "True",
									},
									"2": { /* Gauge */
										"Min Width": "200",
										"Min Height": "200",
										"Default Width": "400",
										"Default Height": "400",
										"Aspect Ratio(W:H)": "200:200",
										"Scale": "True",
									},
									"3": { /* Time Chart */
										"Min Width": "200",
										"Min Height": "200",
										"Default Width": "350",
										"Default Height": "200",
										"Scale": "True",
									},
									"4": { /* XY Chart */
										"Min Width": "200",
										"Min Height": "200",
										"Default Width": "350",
										"Default Height": "200",
										"Scale": "True",
									},
									"10": { /* 2D stop-light */
										"Min Width": "200",
										"Min Height": "200",
										"Default Width": "420",
										"Default Height": "350",
										"Scale": "True",
									},
									"12": { /* Tabs */
										"Min Width": "200",
										"Min Height": "200",
										"Default Width": "350",
										"Default Height": "300",
										"Scale": "True",
									},
									"13": { /* NavTabs */
										"Min Width": "200",
										"Min Height": "200",
										"Default Width": "350",
										"Default Height": "300",
										"Scale": "True",
									},
								}

widgetLibrary.init = function()
{

}
