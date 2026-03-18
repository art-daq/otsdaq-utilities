
///////////-----------------
var _allAppsArray;// leave undefined to indicate first time in getAppsArray()
var _allContextNames = {}; //use map for unique keys
var _allClassNames = {}; //use map for unique keys
var _allHostNames = {}; //use map for unique keys
var _arrayOnDisplayTable = new Array(); // has the array values currently displayed on the table

var _updateAppsTimeout = 0;

var _contextRestartTime = {}; //map of context name to last restart time

var _displayingFilters = false; //set default here

var _statusDivElement, _filtersDivElement, _toggleFiltersLinkElement;

var _MARGIN = 5;
var _OFFSET_Y = 80;

//functions:
// init()
// paint()
// toggleFilters()
// ========= server calls ====================
// getContextNames()
// getAppsArray()
// updateAppsArray()
// ========== Display functions ==============
// displayTable(appsArray)
// ========= filtering functions =============
// createFilterList()
//		localRenderFilterList()
// collapsibleList()
// selectAll()
// applyFilterItemListeners()
// filter()
// getFilteredArray(className)
// isEquivalent(a, b)
// setIntersection(list1, list2)

var _windowTooltip = "To verify Status Monitoring is enabled, check the Gateway Supervisor parameter that " +
	"controls it. To check app status, set this field to YES in your Context Group Configuration Tree: \n\n" +
	"<b>XDAQApplicationTable --> \nGatewaySupervisor (record in XDAQApplicationTable) --> \nLinkToSuperivorTable --> \nEnableApplicationStatusMonitoring</b>" +
	"\n\n" +
	"Remember, to restart ots after a Context group configuration change.";
/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////

var _reloadRemoteContextsTimer = 0;

//=====================================================================================
//init called once body has loaded
function init() {
	Debug.log("App status init");

	window.clearTimeout(_reloadRemoteContextsTimer)
	_reloadRemoteContextsTimer = 0;

	DesktopContent.setWindowTooltip(_windowTooltip);


	_statusDivElement = document.getElementById("appStatusDiv");
	_filtersDivElement = document.getElementById("filtersDiv");
	_toggleFiltersLinkElement = document.getElementById("toggleFiltersLink");

	collapsibleList();

	//define relogin handler
	DesktopContent._loginNotifyHandler = function () {
		Debug.log("Handling login notification...");
		Debug.closeErrorPop();
		//updateAppsArray();
		init();
	} //end login notify handler

	window.onresize = paint;
	paint();

	// Use promises to make code execute in an intutive manner
	// 1. Get context names into an array...then
	// 2. Get app names into an array ....then
	// 3. display the table of array names and call filtering functions
	// 4. repeatedly update the _allAppsArray values
	getContextNames().
		then(getAppsArray).
		then(function (result) {
			// display table of apps
			displayTable(result);

			// populate filterDiv
			createFilterList();
		});

} // end of init()

//=====================================================================================
//paint sets size of divs, called on window resize
function paint() {
	var w = window.innerWidth;
	var h = window.innerHeight;

	Debug.log("paint to " + w + " - " + h);

	if (_displayingFilters) {
		_filtersDivElement.style.display = "block";
		_toggleFiltersLinkElement.innerHTML = "Hide Filters";
	}
	else {
		_filtersDivElement.style.display = "none";
		_toggleFiltersLinkElement.innerHTML = "Show Filters";
	}

	h -= _MARGIN * 2 + _OFFSET_Y;

	w = (w * .2) | 0;
	if (w < 200) w = 200;
	if (h < 200) h = 200;

	_filtersDivElement.style.width = w + "px";
	_filtersDivElement.style.height = h + "px";

	w = _filtersDivElement.scrollWidth;
	Debug.log("Resize filters " + _filtersDivElement.scrollWidth);

	var filterEls = document.getElementsByClassName("filterList");
	var filterBtns = document.getElementsByClassName("filterHeader");
	for (var i = 0; i < filterEls.length; ++i) {
		filterEls[i].style.width = (w - 30) + "px";
		filterBtns[i].style.width = w + "px";
	}


} //end paint()

//=====================================================================================
function toggleFilters() {
	Debug.log("toggleFilters()");
	_displayingFilters = !_displayingFilters;
	paint();
} //end toggleFilters()

//=====================================================================================
// The function below gets the available context names from the server
function getContextNames() {
	return new Promise(function (resolve, reject) {
		//get context
		DesktopContent.XMLHttpRequest("Request?RequestType=getContextNames", "",
			function (req) {
				var memberNames = req.responseXML.getElementsByTagName("ContextMember");
				var remoteNames = req.responseXML.getElementsByTagName("RemoteGateway");

				_allContextNames = {}; //reset and treat as count

				for (var i = 0; i < memberNames.length; ++i)
					if (_allContextNames[memberNames[i].getAttribute("value")])
						++_allContextNames[memberNames[i].getAttribute("value")];
					else
						_allContextNames[memberNames[i].getAttribute("value")] = 1;
				for (var i = 0; i < remoteNames.length; ++i)
					if (_allContextNames[remoteNames[i].getAttribute("value")])
						++_allContextNames[remoteNames[i].getAttribute("value")];
					else
						_allContextNames[remoteNames[i].getAttribute("value")] = 1;

				console.log("_allContextNames", Object.keys(_allContextNames).length, _allContextNames);

				if (Object.keys(_allContextNames).length == 0) {
					Debug.log("Empty context member list found!", Debug.HIGH_PRIORITY);
					reject("Empty context member list found!");
				}

				resolve(_allContextNames);

			}, //end request handler
			0, 0, //reqParam, progressHandler
			false /*callHandlerOnErr*/,
			true /*doNotShowLoadingOverlay*/); // end of XMLHttpRequest

	}); // end of Promise

} // end of getContextNames()

//=====================================================================================
// This function makes a call to the server and returns an array of objects
// each object contains the details of an application such as the id, name, status etc.
function getAppsArray() {
	return new Promise(function (resolve, reject) {

		var pingTime = parseInt((new Date()).getTime()); //in ms

		DesktopContent.XMLHttpRequest("Request?RequestType=getAppStatus", "",
			function (req, param, err) {

				if (err) {
					Debug.log("Error received updating status: " + err);

					//try again in a few seconds
					// update the _allAppsArray variable with repeated calls to server
					if (_updateAppsTimeout) window.clearTimeout(_updateAppsTimeout);
					_updateAppsTimeout = window.setTimeout(updateAppsArray, 5000 /*ms*/);

					return;
				}
				var appNames, appUrls, appIds, appStatus, appTime,
					appStale, appClasses, appProgress, appDetail, appContexts,
					appSubapps, availableLogSpaceGB, availableDataSpaceGB, logUsageRateKBps, dataUsageRateKBps;

				appNames = req.responseXML.getElementsByTagName("name");
				appIds = req.responseXML.getElementsByTagName("id");
				appStatus = req.responseXML.getElementsByTagName("status");
				appTime = req.responseXML.getElementsByTagName("time");
				appStale = req.responseXML.getElementsByTagName("stale");
				appProgress = req.responseXML.getElementsByTagName("progress");
				appDetail = req.responseXML.getElementsByTagName("detail");
				availableLogSpaceGB = req.responseXML.getElementsByTagName("availableLogSpaceGB");
				availableDataSpaceGB = req.responseXML.getElementsByTagName("availableDataSpaceGB");
				logUsageRateKBps = req.responseXML.getElementsByTagName("logUsageRateKBps");
				dataUsageRateKBps = req.responseXML.getElementsByTagName("dataUsageRateKBps");
				appClasses = req.responseXML.getElementsByTagName("class");
				appUrls = req.responseXML.getElementsByTagName("url");
				appContexts = req.responseXML.getElementsByTagName("context");
				appSubapps = req.responseXML.getElementsByTagName("subapps");

				if (_allAppsArray === undefined && appTime.length > 1) {
					//first time, check for app status monitoring enabled
					//	time of 0, indicates app status not updating

					var all0 = true;
					for (var i = 1; i < appTime.length; ++i) {
						//if bad time or status == "Not Monitored"

						if (appStatus[i].getAttribute("value") == "Not Monitored")
							continue;

						//e.g. Wed Oct 14 05:20:48 1970 CDT
						var appTimeSplit = appTime[i].getAttribute("value").split(' ');
						if (appTime[i].getAttribute("value") != "0" &&
							(appTimeSplit.length > 2 &&
								(appTimeSplit[appTimeSplit.length - 2] | 0) != 1970
								&&
								(appTimeSplit[appTimeSplit.length - 2] | 0) < 4000
							) //i.e. real if year is not 0 or -1
						) {
							all0 = false;
							break;
						}
					}

					if (all0) {
						Debug.log("It appears that active application status monitoring is currently OFF! " +
							"\n\n\n" + _windowTooltip,
							Debug.HIGH_PRIORITY);
					}
				}

				var oldAppsArrayLength = (_allAppsArray ? _allAppsArray.length : 0);
				_allAppsArray = new Array();
				_allClassNames = {}; //reset and treat as count
				_allHostNames = {}; //reset and treat as count

				for (var i = 0; i < appNames.length; i++) {
					_allAppsArray.push({
						"name": appNames[i].getAttribute("value"),
						"id": appIds[i].getAttribute("value"),
						"status": appStatus[i].getAttribute("value"),
						"time": appTime[i].getAttribute("value"),
						"stale": appStale[i].getAttribute("value"),
						"progress": appProgress[i].getAttribute("value"),
						"detail": appDetail[i].getAttribute("value"),
						"availableLogSpaceGB": availableLogSpaceGB[i].getAttribute("value"),
						"availableDataSpaceGB": availableDataSpaceGB[i].getAttribute("value"),
						"logUsageRateKBps": logUsageRateKBps[i].getAttribute("value"),
						"dataUsageRateKBps": dataUsageRateKBps[i].getAttribute("value"),
						"class": appClasses[i].getAttribute("value"),
						"url": appUrls[i].getAttribute("value"),
						"context": appContexts[i].getAttribute("value")
					});

					if (appSubapps != undefined && appSubapps[i] != undefined) {
						var subappNames = appSubapps[i].getElementsByTagName("subapp_name");
						var subappStatus = appSubapps[i].getElementsByTagName("subapp_status");
						var subappTime = appSubapps[i].getElementsByTagName("subapp_time");
						var subappStale = appSubapps[i].getElementsByTagName("subapp_stale");
						var subappProgress = appSubapps[i].getElementsByTagName("subapp_progress");
						var subappDetail = appSubapps[i].getElementsByTagName("subapp_detail");
						var subappAvailableLogSpaceGB = appSubapps[i].getElementsByTagName("subapp_availableLogSpaceGB");
						var subappAvailableDataSpaceGB = appSubapps[i].getElementsByTagName("subapp_availableDataSpaceGB");
						var subappLogUsageRateKBps = appSubapps[i].getElementsByTagName("subapp_logUsageRateKBps");
						var subappDataUsageRateKBps = appSubapps[i].getElementsByTagName("subapp_dataUsageRateKBps");
						var subappUrl = appSubapps[i].getElementsByTagName("subapp_url");
						var subappID = appSubapps[i].getElementsByTagName("subapp_id");
						var subappClass = appSubapps[i].getElementsByTagName("subapp_class");

						_allAppsArray[_allAppsArray.length - 1].subappStatus = new Array();
						for (var j = 0; j < subappNames.length; j++) {
							_allAppsArray[_allAppsArray.length - 1].subappStatus.push({
								"name": subappNames[j].getAttribute("value"),
								"status": subappStatus[j].getAttribute("value"),
								"time": subappTime[j].getAttribute("value"),
								"stale": subappStale[j].getAttribute("value"),
								"progress": subappProgress[j].getAttribute("value"),
								"detail": subappDetail[j].getAttribute("value"),
								"availableLogSpaceGB": subappAvailableLogSpaceGB[j].getAttribute("value"),
								"availableDataSpaceGB": subappAvailableDataSpaceGB[j].getAttribute("value"),
								"logUsageRateKBps": subappLogUsageRateKBps[j].getAttribute("value"),
								"dataUsageRateKBps": subappDataUsageRateKBps[j].getAttribute("value"),
								"class": subappClass[j].getAttribute("value"),
								"id": subappID[j].getAttribute("value"),
								"url": subappUrl[j].getAttribute("value")
							});
						}
					}

					var appTimeSplit = _allAppsArray[_allAppsArray.length - 1].time.split(' ');
					if (!(appTimeSplit.length > 2 &&
						(appTimeSplit[appTimeSplit.length - 2] | 0) != 1970
						&&
						(appTimeSplit[appTimeSplit.length - 2] | 0) < 4000
					)) //i.e. real if year is not 0 or -1
						_allAppsArray[_allAppsArray.length - 1].progress = 0;

					// populate the array of classes
					if (_allClassNames[appClasses[i].getAttribute("value")])
						++_allClassNames[appClasses[i].getAttribute("value")];
					else
						_allClassNames[appClasses[i].getAttribute("value")] = 1;

					// populate the array of hostnames
					var hostname = appUrls[i].getAttribute("value");
					if (hostname && hostname.length) {
						if (hostname.lastIndexOf(':') >= 0)  //remove port
							hostname = hostname.substr(0, hostname.lastIndexOf(':'));
						if (hostname.lastIndexOf('/') >= 0)  //remove http://
							hostname = hostname.substr(hostname.lastIndexOf('/') + 1);

						if (_allHostNames[hostname])
							++_allHostNames[hostname];
						else
							_allHostNames[hostname] = 1;
					}

				} //end app parameter extration loop


				if (_allAppsArray.length == 0) {
					Debug.log("Empty apps array!", Debug.HIGH_PRIORITY);
					reject("Empty Empty apps array!");
				}

				//return _allAppsArray;
				resolve(_allAppsArray);


				if (oldAppsArrayLength == _allAppsArray.length)
					_arrayOnDisplayTable = setIntersection(_allAppsArray, _arrayOnDisplayTable);
				else //a context change was identified
					_arrayOnDisplayTable = _allAppsArray;


				ping_ = parseInt((new Date()).getTime()) - pingTime; //in ms
				while (("" + ping_).length < 3) ping_ = "0" + ping_;
				displayTable(_arrayOnDisplayTable);

				// update the _allAppsArray variable with repeated calls to server
				if (_updateAppsTimeout) window.clearTimeout(_updateAppsTimeout);
				_updateAppsTimeout = window.setTimeout(updateAppsArray, 1000 /*ms*/);

			},  //end request handler
			0, 0, //reqParam, progressHandler
			true /*callHandlerOnErr*/,
			true /*doNotShowLoadingOverlay*/); // end of XMLHttpRequest
	});// end of Promise

}// end of getAppsArray()

//=====================================================================================
// this function updates the _allAppsArray by making repeated requests to the server
// at specific time intervals. The function is called by setTimeout()
// because setInterval() can get unwieldy.
var ping_ = 0;
function updateAppsArray() {
	getAppsArray();
}; // end of updateAppsArray()


//=====================================================================================
// this function start stop Apps on a server
function restartApps(contextName, serverName) {
	Debug.log("Restart " + contextName + "'s Apps");
	//cancel update apps timer
	if (_updateAppsTimeout) window.clearTimeout(_updateAppsTimeout);

	DesktopContent.popUpVerification(
		"Restarting server " + serverName + " for 'non-gateway apps'. Are you sure?",
		function () /* yes-to-restart servers */ {
			//modify status to indicate shutting down
			if (_arrayOnDisplayTable && _arrayOnDisplayTable.length) {
				Debug.log("Modifying status of", contextName, "to shutting down...");

				for (var i = 0; i < _arrayOnDisplayTable.length; i++) {
					if (_arrayOnDisplayTable[i].context != contextName) continue;
					_arrayOnDisplayTable[i].status = "Shutting Down"; //force to shutting down
				}
				displayTable(_arrayOnDisplayTable);

				//return update apps timer with some extra time for user to see "Shutting Down"
				// _updateAppsTimeout = window.setTimeout(updateAppsArray, 3000 /*ms*/);
			}

			DesktopContent.XMLHttpRequest(
				"Request?RequestType=restartApps&contextName=" + contextName,
				"",
				function (req) {
					var status = DesktopContent.getXMLValue(req, "status");
					Debug.log("Response", status);
					if (status != "restarted") {
						Debug.warn("Unexpected response when restarting apps on server '" +
							serverName + "' targeting context '" + contextName + "': " + status);

						if (_updateAppsTimeout) window.clearTimeout(_updateAppsTimeout);
						_updateAppsTimeout = window.setTimeout(updateAppsArray, 1000 /*ms*/);
					}
					else {
						Debug.log("Successfully launched process to restart apps on server '" +
							serverName + "' targeting context '" + contextName + ".'");

						//record time of restart
						_contextRestartTime[contextName] = (new Date()).getTime();

						//modify status to indicate shutting down
						if (_arrayOnDisplayTable && _arrayOnDisplayTable.length) {
							Debug.log("Modifying status of", contextName, "to start up...");


							for (var i = 0; i < _arrayOnDisplayTable.length; i++) {
								if (_arrayOnDisplayTable[i].context != contextName) continue;
								_arrayOnDisplayTable[i].status = "Starting Up"; //force to starting up
							}
							displayTable(_arrayOnDisplayTable);

							//return update apps timer with some extra time for user to see "Starting Up"
							if (_updateAppsTimeout) window.clearTimeout(_updateAppsTimeout);
							_updateAppsTimeout = window.setTimeout(updateAppsArray, 3000 /*ms*/);
						}
					}
				} /*returnStatus*/,
				0 /*reqParam*/,
				0 /*progressStatus*/,
				true /*callStatusHandlerOnErr*/,
				true /*doNoShowLoadingOverlay*/);
		},
		0, 0,// val [optional], bgColor [optional],
		0, 0, 0, //			textColor [optional], borderColor [optional], getUserInput [optional],
		0, //			dialogWidth [optional],
		function () /* no/cancel-to-restart servers */ {
			//return update apps timer
			_updateAppsTimeout = window.setTimeout(updateAppsArray, 1000 /*ms*/);
		}
	);
} // end of restartApps()

//=====================================================================================
// this function displays a table with the app array passed into it
function displayTable(appsArray) {
	// clear the appStatusDiv
	var statusDivElement = document.getElementById("appStatusDiv");
	statusDivElement.innerHTML = "";

	//Create a last update timestamp
	if (appsArray && appsArray.length)
		document.getElementById(
			"lastUpdateTimeDiv").innerHTML =
			"Showing " + appsArray.length +
			"/" + _allAppsArray.length + " Apps " +
			"(Last update: " + appsArray[0].time + ")";

	//Create a HTML Table element.
	var table = document.createElement("TABLE");
	table.border = "0";

	//Get the count of columns.
	var columnNames = ["Context Name", "App Name", "Status", "Progress", "Detail",
		//add white space so changing ping has less update effect
		"&nbsp;&nbsp;Last Update&nbsp;&nbsp;",
		"App Type", "App URL", "App ID", "Action", "Available Space"];
	var columnKeys = ["context", "name", "status", "progress", "detail",
		"stale", "class", "url", "id", "action", "availableSpace"];
	var columnCount = columnNames.length;

	//Add the header row.
	var row = table.insertRow(-1);
	for (var i = 0; i < columnCount; i++) {
		var headerCell = document.createElement("TH");
		headerCell.innerHTML = columnNames[i];
		if (columnNames[i] == "Detail")
			headerCell.style = 'text-align: left; padding-left: 50px;';
		else if(columnNames[i] == "Status")
			headerCell.style = "max-width: 120px; min-width: 120px;";
		row.appendChild(headerCell);
	}

	//Add the data rows.
	for (var contextName in _allContextNames) {
		row = table.insertRow(-1);
		row.setAttribute("class", "collapsibleRow");
		row.id = contextName;
		var cell = row.insertCell(-1);
		cell.title = contextName + "'s apps";
		cell.innerHTML = contextName;

		var appRowId = 0; //using this id to make a subRow id for apps in each context
		for (var i = 0; i < appsArray.length; i++) {
			if (appsArray[i].context != contextName) continue;

			row = table.insertRow(-1);
			row.setAttribute("class", "subRow");
			row.id = contextName + "-" + appRowId;

			appRowId++;

			for (var j = 0; j < columnKeys.length; ++j) {
				cell = row.insertCell(-1);

				//add mouseover tooltip
				cell.title = appsArray[i].name + "'s " +
					columnNames[j];

				if (columnKeys[j] == "action") {
					var url = appsArray[i].url;
					url = url.substring(url.indexOf("://") + 3, url.lastIndexOf(":"));
					if (!appsArray[i].class.includes("Gateway"))
						cell.innerHTML = "<button onclick = 'restartApps(\"" +
							contextName + "\", \"" + url + "\")' title = 'Restart " +
							" no gateway apps on " + url + "' class = 'contextButton'>" +
							"Restart server</button>";
				}
				else if (columnKeys[j] == "stale") {
					cell.style.fontSize = "12px";

					var staleString = "";
					var staleSeconds = appsArray[i][columnKeys[j]] | 0;
					if (appsArray[i].time == "0")
						staleString = "No status";
					else if (staleSeconds < 1)
						staleString = "0." + ping_ + " seconds ago";
					else if (staleSeconds < 2)
						staleString = "1." + ping_ + " seconds ago";
					else if (staleSeconds < 46)
						staleString = staleSeconds + " seconds ago";
					else if (staleSeconds < 90)
						staleString = "One minute ago";
					else if (staleSeconds < 40 * 60)
						staleString = (((staleSeconds / 60) | 0) + 1) + " minutes ago";
					else if (staleSeconds < 75 * 60)
						staleString = "One hour ago";
					else if (staleSeconds < 60 * 60 * 2)
						staleString = (((staleSeconds / 60 / 60) | 0) + 1) + " hours ago";
					else if (staleSeconds < 60 * 60 * 48)
						staleString = (((staleSeconds / 60 / 60 / 24) | 0) + 1) + " days ago";

					cell.innerHTML = staleString;
				}
				else if (columnKeys[j] == "progress") {
					var progressNum = appsArray[i][columnKeys[j]] | 0;
					if (progressNum > 100)
						progressNum = 99; //attempting to figure out max (or variable steps)

					if (progressNum == 100)
						cell.innerHTML = "Done";
					else {
						//scale progress bar to width of cell (66px)

						var progressPX = ((66 * progressNum / 100) | 0);
						if (progressPX > 0 && progressPX < 3) progressPX = 3; //show something non-zero

						cell.innerHTML = "&nbsp;" + progressNum + " %<div class='progressBar' style='width:" +
							progressPX + "px;'></div>";

					}

					// if(progressNum != 100)
					// 	Debug.log("Progress for " + appsArray[i].name + ": " + progressNum + "%");
				}
				else if (columnKeys[j] == "status") {
					var statusString = appsArray[i][columnKeys[j]];

					try { //some states can provide error detail after ":::" marker (ignore extra detail for now)
						statusString = statusString.split(":::")[0];
					}
					catch (e) { //ignore split error
						Debug.log("statusString split error, What happened? " + e);
					}

					if (statusString == "UNKNOWN") //change if restarting recently
					{
						var restartTime = _contextRestartTime[appsArray[i].context];
						if (restartTime) {
							var currentTime = (new Date()).getTime();
							if (currentTime - restartTime < 30 * 1000) //30 seconds
								statusString = "Starting Up";
						}
					}

					switch (statusString) {
						case "Starting Up":
						case "Initial":
							cell.style.background = "radial-gradient(circle at 50% 120%, rgb(119, 208, 255), rgb(119, 208, 255) 10%, rgb(7, 105, 191) 80%, rgb(6, 39, 69) 100%)";
							break;
						case "Halted":
							cell.style.background = "radial-gradient(circle at 50% 120%, rgb(255, 207, 105), rgb(245, 218, 179) 10%, rgb(234, 131, 3) 80%, rgb(121, 68, 0) 100%)";
							break;
						case "Configured":
						case "Paused":
							cell.style.background = "radial-gradient(circle at 50% 120%, rgb(80, 236, 199), rgb(179, 204, 197) 10%, rgb(5, 148, 122) 80%, rgb(6, 39, 69) 100%)";
							break;
						case "Running":
							cell.style.background = "radial-gradient(circle at 50% 120%, rgb(0, 255, 67), rgb(142, 255, 172) 10%, rgb(5, 148, 42) 80%, rgb(6, 39, 69) 100%)";
							break;
						case "Shutting Down":
						case "Failed":
						case "Error":
						case "Soft-Error":
							cell.style.background = "radial-gradient(circle at 50% 120%, rgb(255, 124, 124), rgb(255, 159, 159) 10%, rgb(218, 0, 0) 80%, rgb(144, 1, 1) 100%)";

							cell.style.cursor = "pointer";
							cell.id = "cell-" + i + "-" + j;
							cell.onclick =
								function () {
									Debug.log("Cell " + this.id);

									var i = this.id.split('-');
									var j = i[2] | 0;
									var i = i[1] | 0;
									Debug.log(
										appsArray[i][columnKeys[j]],
										Debug.HIGH_PRIORITY);
								}; //end onclick()
							break;
						default:
					} // end of switch

					cell.innerHTML = statusString;
				}
				else if (columnKeys[j] == "detail") {
					var tmpDetail = decodeURIComponent(appsArray[i][columnKeys[j]]);
					if (tmpDetail.length > 150)
						tmpDetail = tmpDetail.substr(0, 150) + "...";
					cell.innerHTML = tmpDetail;
				}
				else if (columnKeys[j] == "availableSpace") {
					var logSpace = parseFloat(appsArray[i]["availableLogSpaceGB"]) || 0;
					var dataSpace = parseFloat(appsArray[i]["availableDataSpaceGB"]) || 0;
					var logUsage = parseFloat(appsArray[i]["logUsageRateKBps"]) || 0;
					var dataUsage = parseFloat(appsArray[i]["dataUsageRateKBps"]) || 0;

					if (!logSpace)
						cell.innerHTML = ""; //leave blank if no value
					else if (logSpace == dataSpace)
						cell.innerHTML = (logSpace).toFixed(2) + " GB, Usage: " + logUsage.toFixed(1) + " KB/s";
					else
						cell.innerHTML = "Log: " + (logSpace).toFixed(2) + " GB, Log Usage: " +
							logUsage.toFixed(1) + " KB/s; Data: " +
							(dataSpace).toFixed(2) + " GB, Data Usage: " +
							dataUsage.toFixed(1) + " KB/s";
				}
				else if (columnKeys[j] == "context") {
					// Skip to make things look better
				}
				else
					cell.innerHTML = appsArray[i][columnKeys[j]];

				if (columnKeys[j] == "status") {
					cell.style.textAlign = "center";
					cell.className = "statusCell";

				}// end of status style handling
				else if (columnKeys[j] == "progress" || columnKeys[j] == "id")
					cell.style.textAlign = "center";
			} //end app column loop

			for (var subapp in appsArray[i].subappStatus) {
				var subappInfo = appsArray[i].subappStatus[subapp];
				row = table.insertRow(-1);
				for (var j = 0; j < columnKeys.length; ++j) {
					cell = row.insertCell(-1);

					//add mouseover tooltip
					cell.title = subappInfo.name + "'s " +
						columnNames[j];

					if (columnKeys[j] == "name") {
						cell.innerHTML = "---> " + subappInfo.name;
					}
					else if (columnKeys[j] == "stale") {
						cell.style.fontSize = "12px";

						var staleString = "";
						var staleSeconds = subappInfo[columnKeys[j]] | 0;
						if (subappInfo.time == "0")
							staleString = "No status";
						else if (staleSeconds < 1)
							staleString = "0." + ping_ + " seconds ago";
						else if (staleSeconds < 2)
							staleString = "1." + ping_ + " seconds ago";
						else if (staleSeconds < 46)
							staleString = staleSeconds + " seconds ago";
						else if (staleSeconds < 90)
							staleString = "One minute ago";
						else if (staleSeconds < 40 * 60)
							staleString = (((staleSeconds / 60) | 0) + 1) + " minutes ago";
						else if (staleSeconds < 75 * 60)
							staleString = "One hour ago";
						else if (staleSeconds < 60 * 60 * 2)
							staleString = (((staleSeconds / 60 / 60) | 0) + 1) + " hours ago";
						else if (staleSeconds < 60 * 60 * 48)
							staleString = (((staleSeconds / 60 / 60 / 24) | 0) + 1) + " days ago";

						cell.innerHTML = staleString;
					}
					else if (columnKeys[j] == "progress") {
						var progressNum = subappInfo[columnKeys[j]] | 0;
						if (progressNum > 100)
							progressNum = 99; //attempting to figure out max (or variable steps)

						if (progressNum == 100)
							cell.innerHTML = "Done";
						else {
							//scale progress bar to width of cell (66px)

							var progressPX = ((66 * progressNum / 100) | 0);
							if (progressPX > 0 && progressPX < 3) progressPX = 3; //show something non-zero

							cell.innerHTML = "&nbsp;" + progressNum + " %<div class='progressBar' style='width:" +
								progressPX + "px;'></div>";

						}
					}
					else if (columnKeys[j] == "status") {
						var statusString = subappInfo[columnKeys[j]];

						try {
							statusString = statusString.split(":::")[0];
						}
						catch (e) {	//ignore split error
							Debug.log("statusString split error, What happened? " + e);
						}

						switch (statusString) {
							case "Starting Up":
							case "Initial":
								cell.style.background = "radial-gradient(circle at 50% 120%, rgb(119, 208, 255), rgb(119, 208, 255) 10%, rgb(7, 105, 191) 80%, rgb(6, 39, 69) 100%)";
								break;
							case "Halted":
								cell.style.background = "radial-gradient(circle at 50% 120%, rgb(255, 207, 105), rgb(245, 218, 179) 10%, rgb(234, 131, 3) 80%, rgb(121, 68, 0) 100%)";
								break;
							case "Configured":
							case "Paused":
								cell.style.background = "radial-gradient(circle at 50% 120%, rgb(80, 236, 199), rgb(179, 204, 197) 10%, rgb(5, 148, 122) 80%, rgb(6, 39, 69) 100%)";
								break;
							case "Running":
								cell.style.background = "radial-gradient(circle at 50% 120%, rgb(0, 255, 67), rgb(142, 255, 172) 10%, rgb(5, 148, 42) 80%, rgb(6, 39, 69) 100%)";
								break;
							case "Shutting Down":
							case "Failed":
							case "Error":
							case "Soft-Error":
								cell.style.background = "radial-gradient(circle at 50% 120%, rgb(255, 124, 124), rgb(255, 159, 159) 10%, rgb(218, 0, 0) 80%, rgb(144, 1, 1) 100%)";

								cell.style.cursor = "pointer";
								cell.id = "cell-" + i + "-" + subapp + "-" + j;
								cell.onclick =
									function () {
										Debug.log("Cell " + this.id);

										var isplit = this.id.split('-');
										var j = isplit[3] | 0;
										var i = isplit[1] | 0;
										var subapp = isplit[2] | 0;
										Debug.log(
											appsArray[i].subappStatus[subapp][columnKeys[j]],
											//subappInfo[columnKeys[j]],
											Debug.HIGH_PRIORITY);
									}; //end onclick()
								break;
							default:
						} // end of switch

						cell.innerHTML = statusString;
					}
					else if (columnKeys[j] == "detail") {
						// cell.innerText = //decodeURIComponent(
						//     subappInfo[columnKeys[j]];
						//     //);
						var tmpDetail = decodeURIComponent(subappInfo[columnKeys[j]]);
						if (tmpDetail.length > 150)
							tmpDetail = tmpDetail.substr(0, 150) + "...";
						cell.innerHTML = tmpDetail;
					}
					else if (columnKeys[j] == "availableSpace") {
						var logSpace = parseFloat(subappInfo["availableLogSpaceGB"]) || 0;
						var dataSpace = parseFloat(subappInfo["availableDataSpaceGB"]) || 0;
						var logUsage = parseFloat(subappInfo["logUsageRateKBps"]) || 0;
						var dataUsage = parseFloat(subappInfo["dataUsageRateKBps"]) || 0;

						if (!logSpace)
							cell.innerHTML = ""; //leave blank if no value
						else if (logSpace == dataSpace)
							cell.innerHTML = (logSpace).toFixed(2) + " GB, Usage: " + logUsage.toFixed(1) + " KB/s";
						else
							cell.innerHTML = "Log: " + (logSpace).toFixed(2) + " GB, Log Usage:" +
								logUsage.toFixed(1) + " KB/s; Data: " +
								(dataSpace).toFixed(2) + " GB, Data Usage:" +
								dataUsage.toFixed(1) + " KB/s";
					}
					else if (columnKeys[j] == "context" || columnKeys[j] == "action") {
						// Subapps don't have these
					}
					else
						cell.innerHTML = subappInfo[columnKeys[j]];

					if (columnKeys[j] == "status")
					{
						cell.style.textAlign = "center";
						cell.className = "statusCell";

					}// end of status style handling
					else if (columnKeys[j] == "progress" || columnKeys[j] == "id")
						cell.style.textAlign = "center";
				}
			} //end of subapp loop
		}  //end of apps in context loop

		if (appRowId == 0) //no apps found
		{
			var a = contextName.indexOf(" at ");
			if (!_reloadRemoteContextsTimer &&  //have not scheduled init
				a == contextName.length - (" at ").length) //is a remote context missing url
			{
				Debug.log("Emtpy context missing url, scheduling init!");
				_reloadRemoteContextsTimer = window.setTimeout(init, 3000 /* seconds */);
			}
			else if (a > 0) //is a remote context with no app info
			{
				var cell = row.insertCell(-1);
				cell.innerHTML = contextName.substr(0, a);

				var cell = row.insertCell(-1);
				cell.innerHTML = "UNKNOWN";
				cell.style.textAlign = "center";
				cell.className = "statusCell";
			}
		}
	} // done with adding data rows

	collapsibleList()

	// add table to appStatusDiv
	statusDivElement.appendChild(table);

	// keep record of current array on display. This variable is later used to redisplay table after user does filtering
	_arrayOnDisplayTable = appsArray;

	return 1;

}// end of displayTable()

//=====================================================================================
// this function creates list elements and checkboxes to
// be displayed in the filterDiv
function createFilterList() {
	Debug.log("createFilterList()");

	localRenderFilterList(
		_allContextNames,
		document.getElementById('contextUl'),
		"ContextName");
	localRenderFilterList(
		_allClassNames,
		document.getElementById('classUl'),
		"ClassName");
	localRenderFilterList(
		_allHostNames,
		document.getElementById('hostUl'),
		"HostName");

	// if user clicks on list item instead, tick the checkbox and call filter function
	applyFilterItemListeners();

	return;

	//========================
	function localRenderFilterList(elemObject, ulelem, cbName) {
		//create select all at top
		{
			var li = document.createElement('li'); // create a list element
			var cb_input = document.createElement('input'); // create a checkbox
			cb_input.setAttribute("type", "checkbox");
			cb_input.setAttribute("class", cbName);
			cb_input.checked = true; // default checkboxes to false
			cb_input.setAttribute("value", "selectAll");

			//stop normal checkbox behavior by re-inverting it
			cb_input.onclick = function (e) { console.log("cb"); this.checked = !this.checked; }

			li.setAttribute('class', 'item');
			li.appendChild(cb_input);
			var textnode;
			textnode = document.createTextNode(" " + "Select All" + "  ");

			li.appendChild(textnode);
			ulelem.appendChild(li);
		} //end create select all

		//add all keys in elements object
		for (var key in elemObject) {
			var li = document.createElement('li'); // create a list element
			var cb_input = document.createElement('input'); // create a checkbox
			cb_input.setAttribute("type", "checkbox");
			cb_input.setAttribute("class", cbName);
			cb_input.checked = true; // default checkboxes to false
			cb_input.setAttribute("value", key);

			//stop normal checkbox behavior by re-inverting it
			cb_input.onclick = function (e) { console.log("cb"); this.checked = !this.checked; }


			li.setAttribute('class', 'item');
			li.appendChild(cb_input);

			var textnode;
			//add space before and after for 'margin'
			if (cbName == "className")
				textnode = document.createTextNode(" " + key.slice(5) + "  ");// remove "ots::" in display text
			else
				textnode = document.createTextNode(" " + key + "  ");

			li.appendChild(textnode);
			ulelem.appendChild(li);

		}  // list element loop

	}// end of localRenderFilterList()

}// end of createFilterList()

//=====================================================================================
// this function does the setup for the collapsible menu in the filterDiv
function collapsibleList() {

	var collapsible = document.getElementsByClassName("collapsible");

	// Debug.log(collapsible.length + " collapsible lists found.");

	for (var i = 0; i < collapsible.length; i++) {
		collapsible[i].addEventListener("click",
			function (e) {
				e.stopImmediatePropagation();
				e.stopPropagation();
				Debug.log("click handler " + this.nextElementSibling.id);

				this.firstElementChild.style.visibility = "hidden";  // make help tooltip hidden

				this.classList.toggle("active");
				var content = this.nextElementSibling;
				if (content.style.display === "block")
					content.style.display = "none";
				else
					content.style.display = "block";

				paint();
			}); //end click handler

	}
}// end of collapsibleList()

//=====================================================================================
function applyFilterItemListeners() {
	Debug.log("applyFilterItemListeners()");

	var listElements = document.getElementsByTagName("li");

	for (let i = 0; i < listElements.length; i++) {

		//========================
		listElements[i].onmouseup = function (e) { e.stopPropagation(); }
		listElements[i].onmousedown = function (e) { e.stopPropagation(); }
		listElements[i].onclick =
			function (e) {
				var val = this.firstElementChild.value;
				var type = this.firstElementChild.className;

				Debug.log("Clicked list item " + val + " type" + type);

				//toggle checkbox
				this.firstElementChild.checked = !this.firstElementChild.checked;
				saveCheckedUserPreferences(this.firstElementChild.className, this.firstElementChild.value, this.firstElementChild.checked);

				// tick the checkbox and call filter function
				var listChildren = document.getElementsByClassName(type);
				console.log("listChildren", listChildren);

				if (val == "selectAll") {
					for (var j = 0; j < listChildren.length; j++) {
						listChildren[j].checked = this.firstElementChild.checked;
					}
				}

				filter();
			}; //end list item click handler

	} //end list item loop

}// end of applyFilterItemListeners()

//=====================================================================================
function filter() {
	var filteredClass = getFilteredArray("ClassName", "class"); // filter by class
	var filteredContext = getFilteredArray("ContextName", "context"); // filter by context
	var filteredHost = getFilteredArray("HostName", "host"); // filter by host

	// if filterByClass and filterByContext return empty arrays, display the full table
	if (filteredClass.length == 0 && filteredContext.length == 0 &&
		filteredHost.length == 0) {
		displayTable(_allAppsArray);
		return;
	}

	var found;

	var result = [];

	// loop through each app and keep if found in each filter
	for (var i = 0; i < _allAppsArray.length; i++) {
		///// filter class names
		found = false;
		for (var j = 0; j < filteredClass.length; j++)
			if (_allAppsArray[i].name == filteredClass[j].name) {
				found = true;
				break;
			}
		if (!found)
			continue;

		///// filter context names
		found = false;
		for (var j = 0; j < filteredContext.length; j++)
			if (_allAppsArray[i].name == filteredContext[j].name) {
				found = true;
				break;
			}
		if (!found)
			continue;

		///// filter hostnames
		found = false;
		for (var j = 0; j < filteredHost.length; j++)
			if (_allAppsArray[i].name == filteredHost[j].name) {
				found = true;
				break;
			}
		if (!found)
			continue;

		result.push(_allAppsArray[i]);
	} //end all apps loop

	// display the table
	displayTable(result);
} // end of filter()

//=====================================================================================
function getFilteredArray(filterName, type) {
	var filterObjects = document.getElementsByClassName(filterName);
	var checkedItems = new Array();

	// loop through elements and find those that are checked
	for (var i = 0; i < filterObjects.length; i++) {
		if (filterObjects[i].checked) {
			var val = filterObjects[i].getAttribute("value");
			checkedItems.push(val);
		}
	}

	// loop through _allAppsArray and get apps that match checked values
	var filtered = _allAppsArray.filter(
		function (app) {

			// returns apps that have class/context values in checkedItems array

			if (type == "host") {
				var hostname = app.url;
				if (hostname.lastIndexOf(':') >= 0)  //remove port
					hostname = hostname.substr(0, hostname.lastIndexOf(':'));
				if (hostname.lastIndexOf('/') >= 0)  //remove http://
					hostname = hostname.substr(hostname.lastIndexOf('/') + 1);

				return checkedItems.includes(hostname);
			} //end hostname handling

			// return array if value is in checkedItems
			return checkedItems.includes(app[type]);
		}); //end filter handler

	return filtered;
} // end of getFilteredArray()

//=====================================================================================
// generic function that can be used to get union/intersection of two arrays of objects
function setIntersection(list1, list2) {
	result = [];
	for (let i = 0; i < list1.length; i++) {

		for (let j = 0; j < list2.length; j++) {
			if (list1[i].id == list2[j].id) {
				result.push(list1[i]);
				break;
			}
		}// inner for loop

	}// outer for loop
	return result;
} // end of setIntersection()

//=====================================================================================
//saveCheckedUserPreferences ~
//	save one check user preference to server
function saveCheckedUserPreferences(className, elementName, checked) {
	//TODO if wanted
	// DesktopContent.XMLHttpRequest("Request?RequestType=SaveAppsStatusUserPreferences",
	//     "className=" + className +
	//     "&elementName=" + elementName +
	//     "&checked=" + (checked?1:0));
	Debug.log(className, elementName, checked);
} // end of saveCheckedUserPreferences()
