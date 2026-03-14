


	//	Description of Subsystem Launch Functionality/Behavior:
	//
	//		Start Run button at top
	//		Checkboxes on left to select remote subsystems to enable/include
	//			- For each subsystem, there is...
	//				* a dropdown for "FSM Mode": 'Follow FSM,' 'Do not Halt' (artdaq),  or 'Only Configure' (DCS/DQM)
	//				* a button for "Transition Alone" (that pops up for which transition action to do)
	//				* a dropdown for "Configuration Alias"
	//


//User note:
//	This is demonstrated in otsdaq_demo/UserWebGUI/html/SubsystemLaunch.html
//
//	In short, remote subsystems comprise your ots instances

//Subsystem Launch desktop icon from:
//	http://icons.iconarchive.com/icons/bokehlicia/captiva/256/rocket-icon.png


var SubsystemLaunch = SubsystemLaunch || {}; //define SubsystemLaunch namespace

if (typeof Debug == 'undefined')
	throw('ERROR: Debug is undefined! Must include Debug.js before SubsystemLaunch.js');
else if (typeof Globals == 'undefined')
	throw('ERROR: Globals is undefined! Must include Globals.js before SubsystemLaunch.js');

SubsystemLaunch.MENU_PRIMARY_COLOR = "rgb(220, 187, 165)";
SubsystemLaunch.MENU_SECONDARY_COLOR = "rgb(130, 51, 51)";

SubsystemLaunch.SUBSYSTEM_FIELDS = ["name","url","status","progress","detail","lastStatusTime","configAlias","configAliasChoices","fsmMode","fsmIncluded","landingPage"];
SubsystemLaunch.SUBSYSTEM_FIELDS_NAME = SubsystemLaunch.SUBSYSTEM_FIELDS.indexOf("name");
SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS = ["name","url","status","progress","detail","lastStatusTime","configAlias","configAliasChoices","fsmMode","fsmIncluded","consoleErrCount","consoleWarnCount"];
SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_STATUS = SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS.indexOf("status");
SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_INCLUDED = SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS.indexOf("fsmIncluded");
SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_ALIASES = SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS.indexOf("configAliasChoices");
SubsystemLaunch.SUBSYSTEM_STATUS_UNKOWN = "UNKNOWN";
SubsystemLaunch.subsystems = [];
SubsystemLaunch.system = {};
SubsystemLaunch.iterator = {};

SubsystemLaunch.SUBSYSTEM_FSM_MODES = ["Follow FSM", "Do Not Halt", "Only Configure"];

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call create to create instance of a SubsystemLaunch
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
SubsystemLaunch.create = function() {


	//functions:
	//
	//	init()
	//	SubsystemLaunch.initSubsystemRecords()
	//	SubsystemLaunch.extractSystemStatus(req)
	//	SubsystemLaunch.extractIteratorStatus(req)
	//	SubsystemLaunch.resetConsoleCounts()
	//	SubsystemLaunch.copyText(el)
	//



	//		'private' member functions: -------
	//	createElements()
	//	redrawWindow()
	//	createFSMDisplay()
	//	handleFSMSelectionSubsystem(selectedValue)

	//	getCurrentStatus()
	//		- localGetStatusHandler()
	//	displayStatus()
	//
	//		'public' member functions: -------
	//	this.handleSubsystemActionSelect(el, subsystemIndex)
	//	this.handleSubsystemConfigAliasSelect(value, subsystemIndex)
	//	this.getSubsystemConfigAliasSelectInfo(subsystemIndex)
	//	this.bootSubsystem(subsystemIndex)
	//	this.handleSubsystemFsmModeSelect(value, subsystemIndex)
	//	this.handleDurationSelect(value)
	//
	//	this.start()
	//		- localStop()
	//		- localRun()
	//			- localIterateHaltFirst()
	//			- localIteratePlay()
	//	this.stop()
	//
	//	this.handleCheckbox(c)
	//	this.getFsmName()
	//	this.openChatWindow()
	//  this.updateSubsystemNames()




	//for display
	var _LAUNCH_MIN_W = 525;
	var _MARGIN = 20;


	var _needEventListeners = true;
	SubsystemLaunch.isFirstTime = function() { return _needEventListeners; }

	var _fsmName, _fsmWindowName;
	var _fsmNameArr;
	var _getStatusTimer = 0;
	var _getAutoInitCount = 2; // allow 2 auto inits to happen before giving up

	var _dotDotDot = "..."; //to add growing ... feedback to user

	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end variable declaration


	//=====================================================================================
	//init ~~
	  function init() {
		if(_needEventListeners) //only first time landing handling
		{
			var windowTooltip = "Welcome to the <b>Subsystem Launch</b> user interface. " +
				"Select which subsystems you want to enable/include, and then press the <b>Start</b> button!" +
				"\n\n" +
				"Subsystems can be set to '<b>Follow FSM</b>,' '<b>Do not Halt</b>,' or '<b>Only Configure</b>.'" +
				"\n\n" +
				"For example, for Slow Controls or Data Quality Monitoring subsystems, you may want to only configure and stay configured - in this case, choose '<b>Only Configure</b>.' Or if you have a subsystem (e.g. artdaq based) that takes a long time to configure, set to '<b>Do Not Halt</b>' and it will be left configured, until a user manually Halts.";
			Debug.log("Subsystem Launch init ");
			DesktopContent.tooltip("Subsystem Launch", windowTooltip);
			DesktopContent.setWindowTooltip(windowTooltip);

			_fsmName = DesktopContent.getParameter(0,"fsm_name");
			if(_fsmName && _fsmName != "")
				Debug.log("_fsmName=" + _fsmName);
			else
				_fsmName = "";

			_fsmWindowName = DesktopContent.getDesktopWindowTitle();
			if(_fsmWindowName && _fsmWindowName != "")
				Debug.log("_fsmWindowName=" + _fsmWindowName);
			else
				_fsmWindowName = "";


			window.onclick = function () {
				Debug.log("User clicked window, resetting timer...");
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(getCurrentStatus,1000);
			}; //end window onclick handler

		} //end first time landing handling
		else
		{
			//remove loading box if added during _loginNotifyHandler()
			DesktopContent._loadBoxRequestStack = 0; //clear
			DesktopContent.hideLoading();
		}

		window.clearTimeout(_getStatusTimer);
		_updatesubsystemNamesCounter = 0; //reset counter for updating subsystem names


		//get all needed info sequentially
		SubsystemLaunch.initSubsystemRecords(localHandleInitComplete);
		// localHandleInitComplete(); //for debugging position, skip initSubsystemRecords

		return;


		//////////////////////////////
		function localHandleInitComplete() {
			Debug.log("localHandleInitComplete()");

			//proceed with rest of init
			createElements(_lastRedrawMode);

			if (_needEventListeners) {
				window.addEventListener("resize",redrawWindow);
				_needEventListeners = false;

				 //define relogin handler
				DesktopContent._loginNotifyHandler = function () {
					Debug.log("Handling login notification...");
					Debug.closeErrorPop();
					DesktopContent.showLoading(); //to indicate to user the 5 seconds

					_getAutoInitCount = 2; // allow 2 auto inits to happen before giving up
					window.clearTimeout(_getStatusTimer);
					_getStatusTimer = window.setTimeout(init,5000); //in 5 sec (give some time for subsystem propagation)
				} //end login notify handler
			}

			//get run state always
			window.clearTimeout(_getStatusTimer);
			_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

			redrawWindow();


			//get view mode preferences for user
			DesktopContent.XMLHttpRequest(
				"Request?RequestType=stateMachinePreferences" +
				"", "",
				function (req) {
					//Same code as StateMachine.html:556

					//	altViewMode not used in SubsystemLaunch
					// var altViewMode = DesktopContent.getXMLValue(req, "Default_FSM_View");
					// Debug.log("Loaded altViewMode preference",altViewMode);
					// if (altViewMode && altViewMode != "")
					// 	toggleViewMode(altViewMode | 0);  //treat as integer
					// else //default to js default
					// 	toggleViewMode(_altStateDrawingMode);

					//if fsm name not defined by get parameter, create select box
					if(!DesktopContent.getParameter(0, "fsm_name")) {
						let lastFsmName = _fsmName;
						_fsmName = DesktopContent.getXMLValue(req, "Default_FSM_Name");
						Debug.log("Loaded FSM Name preference",_fsmName);
						if(!_fsmName)
						{
							Debug.log("No FSM Name preference was found for the user! " +
								"Defaulting to first FSM in list.");
							_fsmName = lastFsmName;
						}

						if(lastFsmName != _fsmName)
						{
							Debug.log("FSM name was set!",_fsmName);

							//re-init for fsmName change
							init();
							return;
						}

						//get possible state machine names
						DesktopContent.XMLHttpRequest(
							"Request?RequestType=getStateMachineNames", "",
							function(req) {
								var fsmNameArr = req.responseXML.getElementsByTagName("stateMachineName");
								_fsmNameArr = [];
								for(var i=0; i<fsmNameArr.length; ++i)
									_fsmNameArr.push(fsmNameArr[i].getAttribute('value'));
								Debug.logv({_fsmNameArr});

								if(_fsmName) //make sure is valid
								{
									let found = false;
									for(var i=0; i<_fsmNameArr.length; ++i)
										if(_fsmName == _fsmNameArr[i])
										{ found = true; break; }

									if(!found)
										_fsmName = ""; //clear
								}
								if(!_fsmName && _fsmNameArr.length)
								{
									Debug.log("Taking first in FSM records array:", _fsmNameArr[0]);
									if(_fsmNameArr[0] == "No FSM Records")
										_fsmName = ""; //stick with blank
									else
										_fsmName = _fsmNameArr[0];
									Debug.logv({_fsmName});

									//re-init for fsmName change
									init();
									return;
								}

								// Create and show dropdown for FSM selection
								createFSMDisplay();

								redrawWindow(); //do twice in case of new scroll bars

							},/*returnHandler*/
							0 /*reqParam*/,
							0 /*progressHandler*/,
							0 /*callHandlerOnErr*/,
							true /*doNotShowLoadingOverlay*/,
							true /*targetGatewaySupervisor*/); //end getStateMachineNames request
					} //end handle setup FSM name
					else
					{
						createFSMDisplay(); //for GET param selected FSM

						redrawWindow(); //do twice in case of new scroll bars
					}

				},/*returnHandler*/
				0 /*reqParam*/,
				0 /*progressHandler*/,
				0 /*callHandlerOnErr*/,
				true /*doNotShowLoadingOverlay*/,
				true /*targetGatewaySupervisor*/);

		} //end localGetContextRecordsHandler()


	} //end init()

	//=====================================================================================
	//createElements ~~
	//	called initially to create checkbox and button elements
	//	redrawMode of 1 for compact, 2 for wide
	function createElements(redrawMode) {
		Debug.log("createElements()", redrawMode);

		Debug.log("createElements() system", SubsystemLaunch.system);



		//		<!-- body content populated by javascript -->
		//		<div id='content'>
		//
		// 			<div id='runDiv'> <button>Start</button> <input>1</input> Run of <input>open-ended</input> duration</div>
		//			<div id='systemStatusDiv'>Next anticipated run number is </div>
		//			<div id='subsystemDiv'>TABLE</div>
		//
		//		</div>

		var cel,el,al,cl,il;
		var str = "";
		cel = document.getElementById("content");
		if (!cel) {
			cel = document.createElement("div");
			cel.setAttribute("id","content");
		}

		//cache existin run control values
		var tmp_runCountInput, tmp_runDurationInput, tmp_runDurationSelect;
		el = document.getElementById("runCountInput");
		if(el) tmp_runCountInput = el.value;
		el = document.getElementById("runDurationInput");
		if(el) tmp_runDurationInput = el.value;
		el = document.getElementById("runDurationSelect");
		if(el) tmp_runDurationSelect = el.value;
		tmp_runDurationSelect = tmp_runDurationSelect?tmp_runDurationSelect:"Open-ended";

		//clear all elements
		cel.innerHTML = "";


		{ //content div

			{ //run launch div -------------------------
				el = document.createElement("div");
				el.setAttribute("id","runDiv");

				cl = document.createElement("div");
				cl.setAttribute("id","runDivContainer");
				el.appendChild(cl);
				cel.appendChild(el);

				el = cl;

				al = document.createElement("a");
				al.setAttribute("id","startButtonLink");
				al.setAttribute("style","float: left;");
				al.onclick = function () {
					var val = this.childNodes[0].innerText;
					Debug.log("clicked start/stop",
						val);
					if(val == "Stop")
						SubsystemLaunch.launcher.stop();
					else
						SubsystemLaunch.launcher.start();
						}; //end onclick startButtonLink

				il = document.createElement("div");
				il.setAttribute("id","startButtonDiv");
				il.innerHTML = "Start";
				al.appendChild(il);
				el.appendChild(al);

				il = document.createElement("input");
				il.setAttribute("id","runCountInput");
				il.setAttribute("style","display: " +
					(tmp_runDurationSelect == "Open-ended"?"none":"block") +
					"; float: left; margin: 7px 0 0 10px;	width: 30px; text-align: center; padding: 4px; font-size: 14px;");
				il.value = tmp_runCountInput?tmp_runCountInput:"1";
				el.appendChild(il);

				il = document.createElement("div");
				il.setAttribute("id","runCountInputUnits");
				il.setAttribute("style","float: left; margin: 10px 0 0 10px;");
				il.innerHTML = "Run(s) of";
				el.appendChild(il);

				il = document.createElement("input");
				il.setAttribute("id","runDurationInput");
				il.setAttribute("style","display: " +
					(tmp_runDurationSelect == "Open-ended"?"none":"block") +
					"; float: left; margin: 7px 0 0 10px; width: 30px; text-align: center; padding: 4px; font-size: 14px;");
				il.value = tmp_runDurationInput?tmp_runDurationInput:"1";
				el.appendChild(il);

				il = document.createElement("div");
				il.setAttribute("id","runDurationDiv");
				il.setAttribute("style","float: left; margin: 7px 10px;");
				str = "<select id='runDurationSelect' style='padding: 4px; font-size: 14px;' "+
					"onchange='SubsystemLaunch.launcher.handleDurationSelect(this.value);'>";
				var tmpOptions = ["Open-ended","Second(s)","Minute(s)","Hour(s)"];
				for(var i=0;i<tmpOptions.length;++i)
					str += "<option " + (tmpOptions[i] == tmp_runDurationSelect?"selected":"") +
						">" + tmpOptions[i] + "</option>";
				str += "</select>";
				il.innerHTML = str;
				el.appendChild(il);

				il = document.createElement("div");
				il.setAttribute("id","runDurationText");
				il.setAttribute("style","float: left; margin-top: 10px;");
				il.innerHTML = "duration";
				el.appendChild(il);
			} //end run launch div

			el = document.createElement("div");
			el.setAttribute("id","clearDiv");

			if (0) { //debug manual update -------------------------
				al = document.createElement("a");
				al.setAttribute("id","debugGetStatusLink");
				al.setAttribute("style","float: left;");
				al.onclick = function () {
					Debug.log("clicked debug get status");
					// SubsystemLaunch.launcher.start();
					// getCurrentStatus();

					window.clearTimeout(_getStatusTimer);
						};
				al.innerText = "Pause ";
				cel.appendChild(al);

				al = document.createElement("a");
				al.setAttribute("id","debugGetStatusLink");
				al.setAttribute("style","float: left;");
				al.onclick = function () {
					Debug.log("clicked debug get status");
					// SubsystemLaunch.launcher.start();
					getCurrentStatus();
						};
				al.innerText = " Start ";
				cel.appendChild(al);

				el = document.createElement("div");
				el.setAttribute("id","clearDiv");
			} //end debug manual update

			{ //system status div -------------------------
				let numOfCols = 4;
				el = document.createElement("div");
				el.setAttribute("id","systemStatusDiv");
				str = "<table cellspacing='5px'>";
				str += "<tr><th colspan=" + numOfCols + ">System Status</th></tr>";
				str += "<tr><td id='systemStatusState'>";
				//add state
				str += SubsystemLaunch.system.state;
				str += "</td><td id='systemStatusTimeInState'>";
				str += "</td><td id='systemStatus_runNumber'>";
				str += "</td><td style='cursor: pointer; white-space: nowrap;' id='systemStatusActiveUsers' " +
					"onclick='SubsystemLaunch.openChatWindow();' title='Click to open Chat window'>";
				str += "</td></tr>";
				str += "<tr><td>";
				//add config alias select
				{
					str += "Configure Alias:<br>";
					str += "<select id='systemConfigAliasSelect' style='padding: 4px; font-size: 14px;' "+
						"onchange='SubsystemLaunch.launcher.handleSystemConfigAliasSelect(this.value);'>";
					if (SubsystemLaunch.system.systemAliases.length == 0) {
						str += "<option ></option>"; //empty option to start
						Debug.warn("No System Configure Aliases were found. " +
							"Please make sure you have a Backbone Group activated with at least one valid Group Alias to a Configure-type group, " +
							"And make sure the SystemAliasFilter field associated with selected Active State Machine record (in the StateMachineTable) accurately selects the desired Group Aliases.");
					}
					let selc = -1;
					for (var c = 0; c < SubsystemLaunch.system.systemAliases.length; ++c) {
						if(SubsystemLaunch.system.selectedSystemAlias ==
							SubsystemLaunch.system.systemAliases[c].name)
							selc = c;
						str += "<option " + (selc==c?"selected":"") + ">" +
							SubsystemLaunch.system.systemAliases[c].name +
							"</option>";
					}
					str += "</select>";
					str += "</td><td id='systemConfigAliasTranslation' colspan=" + (numOfCols-2) + " title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'>";
					var aliasTranslation = ""; //set as innerText to handle special HTML chars
					if (selc >= 0) {
						str += "Configure Alias '" + SubsystemLaunch.system.systemAliases[selc].name +
							"' translates to " + SubsystemLaunch.system.systemAliases[selc].translation;
						if(!SubsystemLaunch.system.systemAliases[selc].comment || SubsystemLaunch.system.systemAliases[selc].comment == "")
							str += " w/out a comment. <label id='systemConfigAliasTranslationNote' class='subtext'></label>"; //label will stay empty
						else {
							str += " w/comment:<br><label id='systemConfigAliasTranslationNote' class='subtext'></label>";
							aliasTranslation += SubsystemLaunch.system.systemAliases[selc].author +
								": " + decodeURIComponent(SubsystemLaunch.system.systemAliases[selc].comment) +
								" (" +
								ConfigurationAPI.getDateString(new Date((
									SubsystemLaunch.system.systemAliases[selc].createTime | 0) * 1000)) + ")";
						}
					}
					else
						str += "&lt;=== Please select a valid System Configure Alias!";

					str += "</td><td  >";
					str += "<button class='systemFsmActionButton' id='systemManualFsmAction_Configure' " +
						"onClick='SubsystemLaunch.launcher.handleSubsystemActionSelect(this, -1);'" +
						">Configure</button>";
					// str += "<button class='systemFsmActionButton' id='systemManualFsmAction' " +
					// 	"onClick='SubsystemLaunch.launcher.handleSubsystemActionSelect(this, -1);'" +
					// 	">Start</button>";
					str += "<button class='systemFsmActionButton' id='systemManualFsmAction_Stop' " +
						"onClick='SubsystemLaunch.launcher.handleSubsystemActionSelect(this, -1);'" +
						">Stop</button>";
					str += "<button class='systemFsmActionButton' id='systemManualFsmAction_Halt' " +
						"onClick='SubsystemLaunch.launcher.handleSubsystemActionSelect(this, -1);'" +
						">Halt</button>";
					str += "</td></tr>";
				}

				str += "<tr><td colspan=" + numOfCols + " style='text-align: left'>Active State Machine: <label id='systemStatus_activeFsm' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				str += "</td></tr>";
				if(SubsystemLaunch.system.lastRunLogEntry) //if not undefined
				{
					str += "<tr><td colspan=" + numOfCols + " style='text-align: left'>Last Run Type: <label id='systemStatus_lastRunLogEntry' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
					str += "</td></tr>";
				}
				str += "<tr><td colspan=" + numOfCols + " style='text-align: left'>Last Logbook Entry: <label id='systemStatus_lastLogbookEntry' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				str += "</td></tr>";
				str += "<tr><td colspan=" + numOfCols + " style='text-align: left'>Last System Message: <label id='systemStatus_lastSystemMessage' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				str += "</td></tr>";
				str += "<tr><td colspan=" + numOfCols + " style='text-align: left'>Log File Rollover Mode: <label id='systemStatus_logRolloverMode' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				str += "</td></tr>";

				//console err/warn count
				str += "<tr><td rowspan=1 style='text-align: right; padding-right: 5px; padding-left: 5px; white-space: nowrap;'>";
				str += "<a onclick='SubsystemLaunch.resetConsoleCounts(-1);' id='systemStatus_consoleInfoCount' class='hover_link' title='Click to reset Console counts and relatch first messages'>";
				str += SubsystemLaunch.system.consoleInfoCount;
				str += "</a>";
				str += "</td><td colspan=" + (numOfCols-1) + " style='text-align: left'>First Console Info: <label id='systemStatus_consoleFirstInfoMessage' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				// str += "</td></tr><tr><td colspan=" + (numOfCols-1) + " style='text-align: left'>";
				str += "<br>";
				str += "Last Console Info: <label id='systemStatus_consoleInfoMessage' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				str += "</td></tr>";
				str += "<tr><td rowspan=1 style='text-align: right; padding-right: 5px; padding-left: 5px; white-space: nowrap;'>";
				str += "<a onclick='SubsystemLaunch.resetConsoleCounts(-1);' id='systemStatus_consoleWarnCount' class='hover_link' title='Click to reset Console counts and relatch first messages'>";
				str += SubsystemLaunch.system.consoleWarnCount;
				str += "</a>";
				str += "</td><td colspan=" + (numOfCols-1) + " style='text-align: left'>First Console Warning: <label id='systemStatus_consoleFirstWarnMessage' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				// str += "</td></tr><tr><td colspan=" + (numOfCols-1) + " style='text-align: left'>";
				str += "<br>";
				str += "Last Console Warning: <label id='systemStatus_consoleWarnMessage' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				str += "</td></tr>";
				str += "<tr><td rowspan=1 style='text-align: right; padding-right: 5px; white-space: nowrap;'>";
				str += "<a onclick='SubsystemLaunch.resetConsoleCounts(-1);' id='systemStatus_consoleErrCount' class='hover_link' title='Click to reset Console counts and relatch first messages'>";
				str += SubsystemLaunch.system.consoleErrCount;
				str += "</a>";
				str += "</td><td colspan=" + (numOfCols-1) + " style='text-align: left'>First Console Error: <label id='systemStatus_consoleFirstErrMessage' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				// str += "</td></tr><tr><td colspan=" + (numOfCols-1) + " style='text-align: left'>";
				str += "<br>";
				str += "Last Console Error: <label id='systemStatus_consoleErrMessage' class='subtext' title='Click to copy text' onclick='SubsystemLaunch.copyText(this);'></label>";
				str += "</td></tr>";


				str += "</table>";
				el.innerHTML = str;
				cel.appendChild(el);
			} //end system status div

			el = document.createElement("div");
			el.setAttribute("id","clearDiv");

			{ //subsystem control div -------------------------

				var fields = ["Included", "Subsystem", "State", "Configure Alias", "Console", "Detail", "FSM Mode", "Manual FSM Action"];
				var fieldIds = ["fsmIncluded", "name", "status", "configAlias", "console", "detail", "fsmMode", "action"];

				var DETAIL_I = fieldIds.indexOf("detail");

				el = document.createElement("div");
				el.setAttribute("id","subsystemDiv");
				if(redrawMode != 1)
					str = "<table class='tableSingleRowMode' cellspacing='5px'>";
				else
					str = "<table class='tableDoubleRowMode' cellspacing='5px'>";

				str += "<tr><th colspan=" + fields.length + ">Subsystem Status</th></tr>";
				//make field header row
				str += "<tr>";
				for (var i = 0; i < fieldIds.length; ++i) {
					if (i == DETAIL_I && redrawMode == 1) {
						str += "</tr><tr>";
						str += "<th colspan=3>" + fields[i] + "</th>";
						continue;
					}

					if (fieldIds[i] == "fsmIncluded") {
						var allSubsystemsChecked = true;
						for(var s=0; s<SubsystemLaunch.subsystems.length; ++s)
							if(!SubsystemLaunch.subsystems[s].fsmIncluded) { allSubsystemsChecked = false; break; }

						str += "<th onclick='var el = document.getElementById(\"subsystem_" + fieldIds[i] + "_checkbox_all\");" +
									"var forFirefox = (el.checked = !el.checked); " +
									"SubsystemLaunch.launcher.handleCheckbox(" +
									-1 + ", el);' style='cursor: pointer; width:30px; padding-right: 0;' " +
									"title='Click to include/exclude all Subsystems from the next run transition.' " +
									">";
							str += "<div class='ssCheckbox' style='height: 20px; width: 20px;" +
								"' >";
								str += "<div class='pretty p-icon p-round p-smooth' >"; //p-smooth for slow transition
									str += " <input type='checkbox' id='subsystem_" + fieldIds[i] + "_checkbox_all' " +
											"onclick='SubsystemLaunch.launcher.handleCheckbox(" +
											-1 + ", this);' " +
											(allSubsystemsChecked?"checked":"") +
											"/>";
									str += "<div class='state p-success'>";
										str += "<i class='icon mdi mdi-check'></i>";
										str += "<label>" + "" + "</label>";
									str += "</div>";
								str += "</div>";
							str += "</div>";
						str += "</th>";


						// //create global toggle checkbox
						// str += DesktopContent.htmlOpen("input",
						// 	{
						// 			"style" : 	"",
						// 			"type"	: 	"checkbox",
						// 			"id"	: 	"subsystem_all_checkbox",
						// 			"class" :	"pretty p-icon p-round p-smooth",
						// 			"title" : 	"Click to include/exclude all Subsystems from the next run transition.",
						// 			"onclick" : SubsystemLaunch.launcher.handleCheckbox(-1 /* for all */ ),
						// 	},"",true);
					}
					else if(fields[i] == "State")
						str += "<th style='width:120px'>" + fields[i] + "</th>";
					else
						str += "<th>" + fields[i] + "</th>";
				}
				str += "</tr>";
				//make entry for each subsystem
				for (var s = 0; s < SubsystemLaunch.subsystems.length; ++s) {
					str += "<tr>";
					for (var i = 0; i < fieldIds.length; ++i) {
						if (i == DETAIL_I && redrawMode == 1) {
							str += "</tr><tr>";
						}

						if(fieldIds[i] == "fsmIncluded")
							str += "<td id='subsystem_" + s + "_" + fieldIds[i] +
								"' class='subsystem_" + fieldIds[i] +
								"' onclick='var el = document.getElementById(\"subsystem_" + fieldIds[i] + "_checkbox_" + s + "\");" +
								"var forFirefox = (el.checked = !el.checked); " +
								"SubsystemLaunch.launcher.handleCheckbox(" +
								s + ", el);' style='cursor: pointer;' " +
								"title='Click to include/exclude the Subsystem &apos;" +
									SubsystemLaunch.subsystems[s].name +
									"&apos; from the next run transition.' " +
								">";
						else if(fieldIds[i] == "console")
							str += "<td id='subsystem_" + s + "_" + fieldIds[i] +
								"' class='subsystem_" + fieldIds[i] +
								"' onclick='SubsystemLaunch.resetConsoleCounts(" + s + ");' " +
								"style='cursor: pointer' " +
								"title='Click to reset Subsystem &apos;" +
								SubsystemLaunch.subsystems[s].name +
								"&apos; Console counts and relatch first messages'" +
								"'>";
						else if(i == DETAIL_I && redrawMode == 1) //keep detail field small in compressed mode
						{
							str += "<td colspan=3 id='subsystem_" + s + "_" + fieldIds[i] +
								"' class='subsystem_" + fieldIds[i] + " compressed_detail'" +
								// " style='overflow:auto; width: 200px;' " +
								">";
						}
						else //other field <td>s
							str += "<td id='subsystem_" + s + "_" + fieldIds[i] +
								"' class='subsystem_" + fieldIds[i] + "'>";

						if (fieldIds[i] == "fsmIncluded") {
							//create subsystem toggle checkbox

							str += "<div class='ssCheckbox' style='height: 20px; width: 20px;" +
								"' >";
								str += "<div class='pretty p-icon p-round p-smooth' >"; //p-smooth for slow transition
									str += " <input type='checkbox' class='subsystemCheckboxes' id='subsystem_" + fieldIds[i] + "_checkbox_" + s + "' " +
											"onclick='SubsystemLaunch.launcher.handleCheckbox(" +
											s + ", this);' " +
											(SubsystemLaunch.subsystems[s].fsmIncluded?"checked":"") +
											"/>";
									str += "<div class='state p-success'>";
										str += "<i class='icon mdi mdi-check'></i>";
										str += "<label>" + "" + "</label>";
									str += "</div>";
								str += "</div>";
							str += "</div>";


							// str += DesktopContent.htmlOpen("input",
							// 	{
							// 			"style" : 	"",
							// 			"type"	: 	"checkbox",
							// 			"id"	: 	"subsystem_" + fieldIds[i] + "_checkbox_" + s,
							// 			"class" :	"pretty p-icon p-round p-smooth",
							// 			"title" : 	"Click to include/exclude all Subsystems from the next run transition.",
							// 			"onclick" : SubsystemLaunch.launcher.handleCheckbox(s),
							// 	},"",true);
						}
						else if (fieldIds[i] == "name") {
							var addLandingPage = false;
							str += "<div style='margin-right:30px;'>";
							if (SubsystemLaunch.subsystems[s].landingPage && SubsystemLaunch.subsystems[s].landingPage != "") {
								addLandingPage = true;
								str += "<a onclick='DesktopContent.openNewWindow(\"" +
									SubsystemLaunch.subsystems[s].landingPage + "\");' " +
									"title='Click to open Subsystem Landing Page of &apos;" +
									SubsystemLaunch.subsystems[s].name + "&apos;' >";
							}
							str += "<div id='subsystem_" + s + "_name_container'>";
							str += SubsystemLaunch.subsystems[s].name + " at " + SubsystemLaunch.subsystems[s].url;
							str += "</div>";
							if(addLandingPage)
								str += "</a>";
							str += "</div>";

							str += "<div class='power_button' " +
								"title='Click to reboot the the Remote Subsystem &apos;" +
									SubsystemLaunch.subsystems[s].name + "&apos;' " +
								"onclick='SubsystemLaunch.launcher.bootSubsystem(" + s + ");' " +
								"><div class='power_light'></div></div>";
						}
						else if (fieldIds[i] == "action") {
							str += "<button id='subsystem_" + fieldIds[i] + "_select_" + s +
								"' onClick='SubsystemLaunch.launcher.handleSubsystemActionSelect(this, " + s + ");'" +
								"style='margin-right:10px'" +
								">Configure</button>";
							str += "<button id='subsystem_" + fieldIds[i] + "_select_" + s +
								"' onClick='SubsystemLaunch.launcher.handleSubsystemActionSelect(this, " + s + ");'" +
								"style='margin-right:10px'" +
								">Stop</button>";
							str += "<button id='subsystem_" + fieldIds[i] + "_select_" + s +
								"' onClick='SubsystemLaunch.launcher.handleSubsystemActionSelect(this, " + s + ");'" +
								"style='margin-right:10px'" +
								">Halt</button>";
						}
						else if (fieldIds[i] == "configAlias") {
							// str += "<div style='white-space:nowrap'>";
							str += "<select id='subsystem_" + fieldIds[i] +
								"_select_" + s + "' style='padding: 4px; font-size: 14px; margin-right:20px;' "+
								"onchange='SubsystemLaunch.launcher.handleSubsystemConfigAliasSelect(this.value, " + s + ");'>";
							var csvSplit = [];
							if(SubsystemLaunch.subsystems[s].configAliasChoices)
								csvSplit = SubsystemLaunch.subsystems[s].configAliasChoices.split(',');
							Debug.logv({csvSplit});
							str += "<option ></option>"; //empty option to start
							for(var c=0; c < csvSplit.length; ++c)
								str += "<option " + (SubsystemLaunch.subsystems[s].configAlias ==
									csvSplit[c]?"selected":"") + ">" +
									csvSplit[c] +
									"</option>";
							str += "</select>";

							str += "<div id='subsystem_" + fieldIds[i] +
								"_select_" + s + "_info' class='subsystem_" + fieldIds[i] +
								"_select_info' " +
								"title='Click for more details on the selected Configuration Alias for subsystem &apos;" +
								SubsystemLaunch.subsystems[s].name + "&apos;' " +
								"onclick='SubsystemLaunch.launcher.getSubsystemConfigAliasSelectInfo(" + s + ");'>" +
								"i</div>";
						}
						else if (fieldIds[i] == "fsmMode") {
							str += "<select id='subsystem_" + fieldIds[i] +
								"_select_" + s + "' style='padding: 4px; font-size: 14px;' "+
								"title='Click to select the approach/mode for following the top-level Finite State Machine for subsystem &apos;" +
								SubsystemLaunch.subsystems[s].name + "&apos;' " +
								"onchange='SubsystemLaunch.launcher.handleSubsystemFsmModeSelect(this.value, " + s + ");'>";
							for(var c=0; c < SubsystemLaunch.SUBSYSTEM_FSM_MODES.length; ++c)
								str += "<option " + (SubsystemLaunch.subsystems[s].fsmMode ==
									SubsystemLaunch.SUBSYSTEM_FSM_MODES[c]?"selected":"") + ">" +
									SubsystemLaunch.SUBSYSTEM_FSM_MODES[c] +
									"</option>";
							str += "</select>";
						}
						// else
						// 	str += SubsystemLaunch.subsystems[s][fieldIds[i]];

						str += "</td>";
					}
					str += "</tr>";
				}

				str += "</table>";
				el.innerHTML = str;
				cel.appendChild(el);
			} //end subsystem control div

		} //end content div

		document.body.appendChild(cel);
		el = document.getElementById('systemConfigAliasTranslationNote');
		if(el) el.innerText = aliasTranslation;

		displayStatus(); //fill elements with data
	} //end createElements()

	//=====================================================================================
	//redrawWindow ~~
	//	called when page is resized
	var _lastRedrawMode = 1;
	function redrawWindow() {
		//adjust link divs to proper size
		//	use ratio of new-size/original-size to determine proper size

		var w = DesktopContent.getWindowWidth() | 0;
		var h = DesktopContent.getWindowHeight() | 0;

		if(w < _LAUNCH_MIN_W)
			w = _LAUNCH_MIN_W;
		if(h < _LAUNCH_MIN_W)
			h = _LAUNCH_MIN_W;

		var redrawMode = 1;
		if(w > 2400)
			redrawMode = 2;
		Debug.log("redrawWindow to " + w + " - " + h,redrawMode,_lastRedrawMode);


		if (_lastRedrawMode && redrawMode != _lastRedrawMode) {
			Debug.log("Redraw createElements",redrawMode);
			createElements(redrawMode);
		}
		_lastRedrawMode = redrawMode;

		var rdiv = document.getElementById("runDiv");
		var tdiv = document.getElementById("systemStatusDiv");
		var sdiv = document.getElementById("subsystemDiv");


		// sdiv.style.left = (sdivX-20) + "px";
		// sdiv.style.top = sdivY + "px";
		// sdiv.style.height = sdivH + "px";
		rdiv.style.width = (w-(2*_MARGIN)) + "px";
		rdiv.style.display = "block";

		tdiv.style.width = (w-(2*_MARGIN)) + "px";
		tdiv.style.display = "block";

		if(redrawMode == 1)
			sdiv.style.width = (w-(2*_MARGIN)) + "px";
		sdiv.style.display = "block";


		//check if need extra new line at top to avoid FSM select
		var dropdownContainer = document.getElementById('fsm-dropdown-div');
		var runButtonContainer = document.getElementById('runDivContainer');
		if(dropdownContainer && runButtonContainer) {
			if(dropdownContainer.offsetLeft + dropdownContainer.offsetWidth + 20 >
					runButtonContainer.offsetLeft) {
				Debug.log("Need extra space");
				document.getElementById("runDiv").style.paddingTop = "78px";
			}
			else
			{
				Debug.log("No space");
				document.getElementById("runDiv").style.paddingTop = "20px";
			}
		} //end check if need extra new line at top to avoid FSM select

	} //end redrawWindow()

	//=====================================================================================
	//getCurrentStatus ~~
	var _getStatusCounter = 0;
	var _updatesubsystemNamesCounter = 0;
	function getCurrentStatus() {
		// Debug.log("getCurrentStatus()");
		window.clearTimeout(_getStatusTimer);

		//getRemoteSubsystemStatus returns iterator status and does not request next run number (which is expensive)
		//	.. so only get run number 1:10

		DesktopContent.XMLHttpRequest("Request?RequestType=getRemoteSubsystemStatus" +
				"&fsmName=" + _fsmName +
				"&getRunNumber=" + (((_getStatusCounter++)%10)==0?"1":"0"),
				"",
				localGetStatusHandler,/*returnHandler*/
				0 /*reqParam*/,
				0 /*progressHandler*/,
				0 /*callHandlerOnErr*/,
				true /*doNotShowLoadingOverlay*/,
				true /*targetGatewaySupervisor*/);
		!(_updatesubsystemNamesCounter++ % 50) && updateSubsystemNames();
		//update updatesubsystemNames fetches and parses xml so is expensive to run
		//call once repeat every 50 cycles ~ 1 minute
		return;

		//===========
		function localGetStatusHandler(req) {

			//subsystems --------------------
			{
				var fields = SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS;

				//get all subsystem fields from xml
				var subsystemArrs = {};
				for(var i=0; i<fields.length; ++i)
					subsystemArrs[fields[i]] = req.responseXML.getElementsByTagName("subsystem_" + fields[i]);

				// Debug.log("subsystemArr", subsystemArrs);

				var foundSubsystemChange = false;
				if(subsystemArrs[fields[0]].length != SubsystemLaunch.subsystems.length)
					foundSubsystemChange = true;

				//advance ... feedback
				if(_dotDotDot.length == 3)
					_dotDotDot = "";
				else
					_dotDotDot += ".";

				//migrate xml values to subsystem struct
				var allFsmIncluded = true;
				for (var j = 0; !foundSubsystemChange && j < subsystemArrs[fields[0]].length; ++j) {
					if( SubsystemLaunch.subsystems[j][fields[SubsystemLaunch.SUBSYSTEM_FIELDS_NAME]] !=
						subsystemArrs[fields[SubsystemLaunch.SUBSYSTEM_FIELDS_NAME]][j].getAttribute('value')) {
						foundSubsystemChange = true; //name mismatch
						break;
					}

					if( SubsystemLaunch.subsystems[j][fields[SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_ALIASES]] !=
						subsystemArrs[fields[SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_ALIASES]][j].getAttribute('value')) {
						foundSubsystemChange = true; //config alias list mismatch
						break;
					}

					for (var i = 0; i < fields.length; ++i) {
						if (i == SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_STATUS) {
							var status = subsystemArrs[fields[i]][j].getAttribute('value');
							if(SubsystemLaunch.subsystems[j].fsmIncluded && //give popup warning if subsystem included and new unknown status
									status == SubsystemLaunch.SUBSYSTEM_STATUS_UNKOWN &&
								status != SubsystemLaunch.subsystems[j][fields[i]]) {
								Debug.warn("From Subsystem '" +
									SubsystemLaunch.subsystems[j].name + " (" + SubsystemLaunch.subsystems[j].url + ")... " +
									"Status is UNKNOWN. This may indicate that the Subsystem is offline or unreachable, or if intermittent, too many TRACE levels may be enabled.");
							}

							if (status.indexOf("Launching") == 0) {
								//give user ... feedback
								SubsystemLaunch.subsystems[j][fields[i]] = status + _dotDotDot;
								continue;
							}
							else if(SubsystemLaunch.subsystems[j][fields[i]] != status &&
									(status.indexOf("Fail") == 0 || status.indexOf("Error") == 0 || status.indexOf("Soft") == 0))
								Debug.err("From Subsystem '" +
									SubsystemLaunch.subsystems[j].name + "'... " +
									status); //show error to user

							SubsystemLaunch.subsystems[j][fields[i]] = status;
							continue;
						}
						else if (i == SubsystemLaunch.SUBSYSTEM_STATUS_FIELDS_INCLUDED) {
							//force fsmIncluded to bool AND warn if changed
							var fsmIncluded = subsystemArrs[fields[i]][j].getAttribute('value') | 0;
							if((fsmIncluded?1:0) != (SubsystemLaunch.subsystems[j].fsmIncluded?1:0))
								Debug.warn("There was a change identified at the server-side in the included Subsystems. Subsystem '" +
									SubsystemLaunch.subsystems[j].name + "' is now " +
									(fsmIncluded?"INCLUDED":"EXCLUDED") + "!"
									);
							SubsystemLaunch.subsystems[j].fsmIncluded = fsmIncluded;
							if(!fsmIncluded)
								allFsmIncluded  = false;
							continue;
						}

						SubsystemLaunch.subsystems[j][fields[i]] = subsystemArrs[fields[i]][j].getAttribute('value');
					} //end field/value push loop

					//change the all el based on allFsmIncluded
					var el = document.getElementById("subsystem_" + "fsmIncluded" + "_checkbox_" + "all");
					if(el) el.checked = allFsmIncluded;

				} //end subsystem loop

				if (foundSubsystemChange) {
					Debug.warn("A change in Subsystem records was identified, reloading Subsystem Launch info!");
					init();
					return;
				}
				// Debug.log("subsystem obj", SubsystemLaunch.subsystems);
			} //end subsystems ------


			//system state ------------------------
			{
				SubsystemLaunch.extractSystemStatus(req);
				SubsystemLaunch.extractIteratorStatus(req);
			} //end system state ----------

			if (displayStatus()) {
				//on success, get state again
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec
			}
		}
	} //end getCurrentStatus()

	//=====================================================================================
	//displayStatus ~~
	var TRANSLATE_ITERATOR_COMMANDS = {};
	TRANSLATE_ITERATOR_COMMANDS["CONFIGURE_ALIAS"] = "Configuring";
	TRANSLATE_ITERATOR_COMMANDS["CHOOSE_FSM"] = "Choosing FSM";
	TRANSLATE_ITERATOR_COMMANDS["BEGIN_LABEL"] = "Loop";
	TRANSLATE_ITERATOR_COMMANDS["RUN"] = "Start";
	TRANSLATE_ITERATOR_COMMANDS["START"] = "Start";
	TRANSLATE_ITERATOR_COMMANDS["RUREPEAT_LABEL"] = "Loop";
	function displayStatus() {
		// Debug.log("displayStatus");
		var el;


		//Run Launch Status ---------
		el = document.getElementById("startButtonDiv");
		if(SubsystemLaunch.system.state != "Running" &&
			(
				SubsystemLaunch.iterator.activePlan == "" ||
				(
					SubsystemLaunch.system.progress == 100 &&
					SubsystemLaunch.system.state == "Configured"
				)
			)
			&&
			(
				SubsystemLaunch.iterator.activePlanStatus === undefined ||
				SubsystemLaunch.iterator.activePlanStatus == "" ||
				SubsystemLaunch.iterator.activePlanStatus == "Inactive" ||
				SubsystemLaunch.iterator.activePlanStatus == "Error"
			))
		{
			el.innerHTML = "Start";
			el.setAttribute("class","greenBigButton");

			el = document.getElementById("runDurationSelect");
			var val = el.value;
			SubsystemLaunch.launcher.handleDurationSelect(val);
;
			el = document.getElementById("runDurationDiv");
			el.style.display = "block";
			el = document.getElementById("runDurationText");
			el.style.display = "block";

		}
		else //show iterator status
		{
			el.innerHTML = "Stop";
			el.setAttribute("class","redBigButton");

			el = document.getElementById("runCountInput");
			el.style.display = "none";
			el = document.getElementById("runDurationInput");
			el.style.display = "none";
			el = document.getElementById("runDurationDiv");
			el.style.display = "none";
			el = document.getElementById("runDurationText");
			el.style.display = "none";

			el = document.getElementById("runCountInputUnits");
			var str = "";
			var inRun = SubsystemLaunch.system.state == "Running" && !SubsystemLaunch.system.inTransition;

			if (SubsystemLaunch.iterator.activePlan == "---GENERATED_PLAN---") {
				// str += "Command #" + SubsystemLaunch.iterator.currentCommandIndex +
				// 	" of " + SubsystemLaunch.iterator.currentNumberOfCommands;
				Debug.log("SubsystemLaunch.system.state",SubsystemLaunch.system.state);

				if(inRun)
					str += "In Run";
				else
					str += "Preparing for Run";

				if (SubsystemLaunch.iterator.genNumberOfRuns > 1) {
					var runIt = SubsystemLaunch.iterator.currentCommandIteration;
					if(runIt > SubsystemLaunch.iterator.genNumberOfRuns)
						runIt = 1;

					str += " #" + runIt + " of " + SubsystemLaunch.iterator.genNumberOfRuns + " Run" +
						(SubsystemLaunch.iterator.genNumberOfRuns>1?"s":"");
				}

				if(inRun)
					str += ", Time-in-Run";
				else
					str += ", Time-on-command" +
						(SubsystemLaunch.system.inTransition && SubsystemLaunch.system.transition == "Stopping"?
						" Stop":
						(TRANSLATE_ITERATOR_COMMANDS[SubsystemLaunch.iterator.currentCommandType]?
							(" " + TRANSLATE_ITERATOR_COMMANDS[SubsystemLaunch.iterator.currentCommandType]):""));

				if(SubsystemLaunch.iterator.genRunDuration == -1 || !inRun)
					str += ": " + SubsystemLaunch.iterator.currentCommandDuration + " seconds";
				else
					str += ": " + SubsystemLaunch.iterator.currentCommandDuration +
							" of " + SubsystemLaunch.iterator.genRunDuration +
							" seconds";

			}
			else if(inRun) //likely, Iterator left open-ended run
				str += "In open-ended Run";
			else if(SubsystemLaunch.system.activeFsmWindow == "iterator")
				str += "Command #" + SubsystemLaunch.iterator.currentCommandIndex +
					" of " + SubsystemLaunch.iterator.currentNumberOfCommands +
					", Iteration #" + SubsystemLaunch.iterator.currentCommandIteration +
					", Time-on-command" +
					(SubsystemLaunch.system.inTransition && SubsystemLaunch.system.transition == "Stopping"?
					" Stop":
					(TRANSLATE_ITERATOR_COMMANDS[SubsystemLaunch.iterator.currentCommandType]?
						(" " + TRANSLATE_ITERATOR_COMMANDS[SubsystemLaunch.iterator.currentCommandType]):"")) +
					": " + SubsystemLaunch.iterator.currentCommandDuration + " seconds";
			el.innerText = str;
		} // end show stop button and iterator status




		//Display System Status ---------
		el = document.getElementById("systemStatusState");
		localDisplayState(el,
			(SubsystemLaunch.system.inTransition?
				SubsystemLaunch.system.transition:
				SubsystemLaunch.system.state),
			SubsystemLaunch.system.progress);

		el = document.getElementById("systemStatusTimeInState");
		//add time-in-state
		{
			//time in state display
			let tstr = "";
			var hours = (SubsystemLaunch.system.timeInState/60.0/60.0)|0;
			var mins = ((SubsystemLaunch.system.timeInState%(60*60))/60.0)|0;
			var secs = SubsystemLaunch.system.timeInState%60;

			tstr += hours + ":";
			if(mins < 10)	tstr += "0"; //keep to 2 digits
			tstr += mins + ":";
			if(secs < 10)	tstr += "0"; //keep to 2 digits
			tstr += secs;
			el.innerText = "Time in state: " + tstr;
		}

		el = document.getElementById("systemStatusActiveUsers");
		el.innerText = 	"# of Active Users: " + SubsystemLaunch.system.activeUserCount;
		var str = "Click to open the Chat window to send messages or page alerts to active users.";
		if (SubsystemLaunch.system.activeUserCount > 1) {
			str += "\n\nHere is the list of active users:";
			for(var i=0; i < SubsystemLaunch.system.activeUserList.length; ++i)
				str += ("\n  " + (i+1) + ". ") + SubsystemLaunch.system.activeUserList[i];
		}
		el.title = str;

		var fieldIds = ["runNumber", "activeFsm", "lastRunLogEntry", "lastLogbookEntry", "lastSystemMessage", "logRolloverMode",
			"consoleWarnCount", "consoleWarnMessage", "consoleErrCount", "consoleErrMessage", "consoleInfoCount", "consoleInfoMessage",
			"consoleFirstErrMessage", "consoleFirstWarnMessage", "consoleFirstInfoMessage"];
		for (var i = 0; i < fieldIds.length; ++i) {
			el = document.getElementById("systemStatus_" + fieldIds[i]);
			if(!el) continue; //some fields might not exist
			if(fieldIds[i] == "activeFsm")
				el.innerText = SubsystemLaunch.system.activeFsm +
					(SubsystemLaunch.system.activeFsmWindow != ""?
						(" (" + SubsystemLaunch.system.activeFsmWindow + ")"):"") +
					((SubsystemLaunch.system.activeFsmStatus && SubsystemLaunch.system.inTransition)?
						(" - " + SubsystemLaunch.system.activeFsmStatus):"");
			else
				el.innerText = SubsystemLaunch.system[fieldIds[i]];
		}




		//Display Subystem Status ---------
		var fieldIds = ["configAlias", "status", "console", "detail", "fsmMode", "fsmIncluded"];
		for (var s = 0; s < SubsystemLaunch.subsystems.length; ++s) {
			for (var i = 0; i < fieldIds.length; ++i) {
				if(fieldIds[i] == "configAlias" ||
					fieldIds[i] == "fsmMode") {
					el = document.getElementById("subsystem_" + fieldIds[i] +
						"_select_" + s);
					if (el.value != SubsystemLaunch.subsystems[s][fieldIds[i]]) {
						if(SubsystemLaunch.subsystems[s].configAliasChoices)
							Debug.warn("The selected " + fieldIds[i] + " for Subsystem '" +
								SubsystemLaunch.subsystems[s].name + "' has changed from '" +
								el.value + "' to '" + SubsystemLaunch.subsystems[s][fieldIds[i]] + ".'");

						//find selected index and select!
						for(var f=0; f < el.options.length; ++f)
							if (el.options[f].value == SubsystemLaunch.subsystems[s][fieldIds[i]]) {
								el.selectedIndex = f;
								break;
							}

						if (f == el.options.length) {
							if(_getAutoInitCount > 0)
								Debug.err("Could not find '" + SubsystemLaunch.subsystems[s][fieldIds[i]] +
									"' in the " + fieldIds[i] +" list of Subsystem '" +
									SubsystemLaunch.subsystems[s].name + "!' Maybe the system is still loading or credentials have expired (it may take 20+ seconds at startup)? Please fix the issue and refresh this page, or notify admins.");
							else
								Debug.log("Could not find '" + SubsystemLaunch.subsystems[s][fieldIds[i]] +
									"' in the " + fieldIds[i] +" list of Subsystem '" +
									SubsystemLaunch.subsystems[s].name + "!' Maybe the system is still loading or credentials have expired (it may take 20+ seconds at startup)? Please fix the issue and refresh this page, or notify admins.");


							if (_getAutoInitCount > 0) {
								--_getAutoInitCount;
								//stop updates, something is wrong!
								window.clearTimeout(_getStatusTimer);
								_getStatusTimer = window.setTimeout(
									function () {
										Debug.warn("Trying to auto-refresh the page...");
										init();
									}
									,5000); //in 5 sec (give some time for subsystem propagation)
								return false;
							}
							// else //no more allow auto-inits
						}
					}
				} //end select box update
				else if (fieldIds[i] == "console") {
					el = document.getElementById("subsystem_" + s + "_" + fieldIds[i]);
					el.innerText = SubsystemLaunch.subsystems[s].consoleErrCount + " Errs / " +
						SubsystemLaunch.subsystems[s].consoleWarnCount + " Warns";
				}
				else if (fieldIds[i] == "fsmIncluded") {
					el = document.getElementById("subsystem_" + fieldIds[i] +
						"_checkbox_" + s);
					el.checked = SubsystemLaunch.subsystems[s][fieldIds[i]];
				}
				else {
					el = document.getElementById("subsystem_" + s + "_" + fieldIds[i]);

					if(fieldIds[i] == "detail" && SubsystemLaunch.subsystems[s].lastStatusTime &&
							SubsystemLaunch.subsystems[s].lastStatusTime != "0")
					{
						//use a temporary element to decode html entities (like &lt; &apos; and &gt;)
						const tel = document.createElement("textarea");
						tel.innerHTML = decodeURIComponent(SubsystemLaunch.subsystems[s][fieldIds[i]]);

						el.innerText = tel.value + " ( " +
										SubsystemLaunch.subsystems[s].lastStatusTime + " )";
					}
					else if(fieldIds[i] == "status")
						localDisplayState(el,
							SubsystemLaunch.subsystems[s].status,
							SubsystemLaunch.subsystems[s].progress);
					else
						el.innerText = SubsystemLaunch.subsystems[s][fieldIds[i]];


				}

			} //end field update loop
		} //end subsystem update loop

		return true;

		//////////////////////////////
		function localDisplayState(cell, statusString, progressNum) {
			//copied from otsdaq-utilities/WebGUI/js/SystemStatus.js:551
			try { //some states can provide error detail after ":::" marker (ignore extra detail for now)
				statusString = statusString.split(":::")[0];
			}
			catch (e) { //ignore split error
				; // Debug.log("What happened? " + e);
			}

			//copied from otsdaq-utilities/WebGUI/js/SystemStatus.js:667
			progressNum |= 0; //force int
			if (progressNum > 100)
				progressNum = 99; //attempting to figure out max (or variable steps)
			else if(progressNum == 0)
				progressNum = 100; //dont show progress bar for 0% or 100%

			// progressNum = (Math.random() * 200)|0; //for debugging
			// if (progressNum > 100) progressNum = 100;  //for debugging

			if (progressNum == 100 || statusString == "Failed") //show solid state color
			{
				progressNum = 100; //force to 100 on Failed
				switch (statusString) {
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
						cell.onclick =
							function () {
								Debug.log("Cell " + this.id);

								if (this.id == "systemStatusState") {
									Debug.err("Current State: " + SubsystemLaunch.system.state + "\n\n" +
										(SubsystemLaunch.system.error?SubsystemLaunch.system.error:""));
									return;
								}
								//else subsystem div

								//id example: subsystem_0_status
								var s = this.id.split('_')[1] | 0;
								Debug.err("From Subsystem '" +
									SubsystemLaunch.subsystems[s].name + "'... " +
									SubsystemLaunch.subsystems[s].status);
							}; //end onclick()
						break;
					default: cell.style.background = "rgb(240,240,240)";
				} // end of switch
			}
			else  //scale progress bar to width of cell (66px)
			{
				cell.style.background = "rgb(240,240,240)";
				statusString += " " + progressNum + " %";
			}
			cell.innerHTML = "<div style='position:relative; z-index:2; white-space: nowrap;'>" + statusString + "</div>";

			// Debug.log("Status",progressNum, statusString, cell.offsetWidth, cell.offsetHeight);

			if (progressNum != 100) {
				cell.style.position = "relative"; //to enable absolute for progress bar
				cell.style.overflow = "hidden"; //to enable absolute for progress bar
				var pl = document.createElement("div");
				pl.setAttribute("class","progressBar");
				pl.style.width = (cell.offsetWidth * progressNum / 100) + "px";
				pl.style.height = (cell.offsetHeight) + "px";
				pl.style.top = "0px";
				pl.style.left = "0px";
				pl.style.zIndex = 1; //below text
				cell.appendChild(pl);
			}
		} //end localDisplayState()
	}	//end displayStatus()

	//=====================================================================================
	//updateSubsystemNames
	//This function queries getAppStatus from the AppStatus application. It matches
	//subsystems with their corresponding hostnames based on their IP addresses.
	function updateSubsystemNames() {
		DesktopContent.XMLHttpRequest("Request?RequestType=getAppStatus", "",
			function (req, param, err) {
				if (err) {
					Debug.err("Could not load app status: " + err);
				}

				let hostname = "";
				const ips = req.responseXML.getElementsByTagName("context");

				for (var s = 0; s < SubsystemLaunch.subsystems.length; ++s) {
					let ipFound = false;
					if (SubsystemLaunch.subsystems[s].status == SubsystemLaunch.SUBSYSTEM_STATUS_UNKOWN) //inactive subsystem/between states
						document.getElementById("subsystem_" + s + "_name_container").textContent = SubsystemLaunch.subsystems[s].name + " at " + SubsystemLaunch.subsystems[s].url;
					else {
						for (let i = 0; i < ips.length; i++) {
							const currentIp = ips[i].getAttribute("value");

							if (currentIp && currentIp == SubsystemLaunch.subsystems[s].name + " at " + SubsystemLaunch.subsystems[s].url) {
								hostname = ips[i].previousElementSibling.getAttribute("value");
								ipFound = true;
								break;
							}
						}

						if (!ipFound) {
							Debug.warn("Hostname for subsystem at " + SubsystemLaunch.subsystems[s].url + " was not found!");
							document.getElementById("subsystem_" + s + "_name_container").textContent = SubsystemLaunch.subsystems[s].name + " at " + SubsystemLaunch.subsystems[s].url;
							return;
						}
						document.getElementById("subsystem_" + s + "_name_container").textContent = SubsystemLaunch.subsystems[s].name + " at " + hostname;
					}
				}
			},
			0 /*reqParam*/,
			0 /*progressHandler*/,
			0 /*callHandlerOnErr*/,
			true /*doNotShowLoadingOverlay*/,
			true /*targetGatewaySupervisor*/);
	}    //end updateSubsystemNames()


	//=====================================================================================
	//createFSMDropdownContainer ~~
	// Helper function to create the FSM dropdown container with label
	// If isFormControl is true, adds the 'for' attribute to associate label with form control
	function createFSMDropdownContainer(isFormControl) {
		var dropdownContainer = document.createElement('div');
		dropdownContainer.id = 'fsm-dropdown-div';
		dropdownContainer.style.cssText = `
			position: absolute;
			top: 16px;
			left: 10px;
			z-index: 1000;
			display: block;
			color: white;
			font-size: 20px;
			font-family: "Comfortaa", arial;
			/* background: rgba(0, 0, 0, 0.8); */
			padding: 10px;
			border: 2px solid gray;
			border-radius: 5px;
		`;

		var label = document.createElement('label');
		if (isFormControl) {
			label.setAttribute('for', 'fsm-dropdown');
		}
		label.textContent = 'FSM:';
		label.style.cssText = 'float: left; margin: 3px 0 0 0;';
		dropdownContainer.appendChild(label);

		return dropdownContainer;
	} //end createFSMDropdownContainer()

	//=====================================================================================
	//createFSMDisplay ~~
	// Creates and displays a dropdown for FSM selection when fsm_name is empty
	function createFSMDisplay(fsmNamesStrArr) {

		Debug.log("createFSMDisplay()");

		var dropdownContainer;

		if(DesktopContent.getParameter(0, "fsm_name")) {

			dropdownContainer = createFSMDropdownContainer(false);  // Display only, not a form control

			var select = document.createElement('div');
			select.id = 'fsm-dropdown';
			select.style.cssText = 'float: left; margin-left: 10px; padding: 4px; font-size: 14px; margin-top: 3px;';
			select.innerText = _fsmName;

			dropdownContainer.appendChild(select);
			document.body.appendChild(dropdownContainer);

			return;
		} //end FSM selected by GET param handling


		// Create dropdown container if it doesn't exist
		dropdownContainer = document.getElementById('fsm-dropdown-div');
		if (!dropdownContainer) {
			dropdownContainer = createFSMDropdownContainer(true);  // Interactive form control

			var select = document.createElement('select');
			select.id = 'fsm-dropdown';
			select.style.cssText = 'float: left; margin-left: 10px; padding: 4px; font-size: 14px;';
			select.onchange = function() {
				handleFSMSelectionSubsystem(this.value);
			};

			dropdownContainer.appendChild(select);
			document.body.appendChild(dropdownContainer);
		}

		// Populate the dropdown
		var selectElement = document.getElementById('fsm-dropdown');
		if (selectElement) {
			// Clear existing options
			selectElement.innerHTML = "";

			// Add new options
			for(var i=0; i<_fsmNameArr.length; ++i) {
				var option = document.createElement('option');
				option.value = _fsmNameArr[i];
				if(_fsmNameArr[i] == "")
					option.text = "No FSM Records";
				else
					option.text = _fsmNameArr[i];

				if(_fsmName == _fsmNameArr[i])
					option.selected = true;

				selectElement.appendChild(option);
			}
		}

		// Make sure it's visible
		dropdownContainer.style.display = 'block';
	} //end createFSMDisplay()

	//=====================================================================================
	//handleFSMSelectionSubsystem ~~
	// Handles selection from the FSM dropdown in SubsystemLaunch
	function handleFSMSelectionSubsystem(selectedValue) {
		Debug.log("handleFSMSelectionSubsystem()",selectedValue)
		if (selectedValue) {
			// Set the fsmName and reload the page with the selected FSM
			_fsmName = selectedValue;

			//assume this toggle is caused by user
			//save setting to server for user
			DesktopContent.XMLHttpRequest("Request?RequestType=stateMachinePreferences" +
				"&set=1" +
				"&Default_FSM_Name=" + _fsmName,
				"",
				0 /*returnHandler*/,
				0 /*reqParam*/,
				0 /*progressHandler*/,
				0 /*callHandlerOnErr*/,
				true /*doNotShowLoadingOverlay*/,
				true /*targetGatewaySupervisor*/);

			//re-init for fsmName change
			init();
		}
	} //end handleFSMSelectionSubsystem()

	//=====================================================================================
	this.handleSubsystemConfigAliasSelect = function (value, subsystemIndex) {
		Debug.log("handleSubsystemConfigAliasSelect()", value, subsystemIndex);
		if(value == "") return; //do not allow empty value

		var targetSubsystem = SubsystemLaunch.subsystems[subsystemIndex].name;

		window.clearTimeout(_getStatusTimer);

		DesktopContent.XMLHttpRequest("Request?RequestType=setRemoteSubsystemFsmControl" +
				"&targetSubsystem=" + targetSubsystem +
				"&setValue=" + encodeURIComponent(value) +
				"&controlType=configAlias",
				"", //end post data,
			function (req) {
					window.clearTimeout(_getStatusTimer);
					_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec
				},  //end handler
				0, 0, false,//reqParam, progressHandler, callHandlerOnErr,
				false,//doNotShowLoadingOverlay,
				true //targetGatewaySupervisor
		); //end setRemoteSubsystemFsmControl request

	}	//end handleSubsystemConfigAliasSelect()

	//=====================================================================================
	this.getSubsystemConfigAliasSelectInfo = function (subsystemIndex) {
		Debug.log("getSubsystemConfigAliasSelectInfo()", subsystemIndex);

		var targetSubsystem = SubsystemLaunch.subsystems[subsystemIndex].name;

		DesktopContent.XMLHttpRequest("Request?RequestType=getSubsystemConfigAliasSelectInfo" +
				"&targetSubsystem=" + targetSubsystem,
				"", //end post data,
			function (req) {
					var alias_info = DesktopContent.getXMLValue(req,"alias_info");
					Debug.info(alias_info);

				},  //end handler
				0, 0, false,//reqParam, progressHandler, callHandlerOnErr,
				false,//doNotShowLoadingOverlay,
				true //targetGatewaySupervisor
		); //end setRemoteSubsystemFsmControl request

	}	//end getSubsystemConfigAliasSelectInfo()

	//=====================================================================================
	this.bootSubsystem = function (subsystemIndex) {
		Debug.log("bootSubsystem()", subsystemIndex);

		var targetSubsystem = SubsystemLaunch.subsystems[subsystemIndex].name;

		DesktopContent.popUpVerification(
			"Are you sure you want to reboot subsystem <b><u>" + targetSubsystem + "</b></u>?",
			function () {
				DesktopContent.popUpVerification(
					"Are you REALLY sure you want to reboot subsystem <b><u>" + targetSubsystem + "</b></u>?",
					function () {
						Debug.log("Rebooting",targetSubsystem);

						if (subsystemIndex >= SubsystemLaunch.subsystems.length) {
							Debug.err("The target subsystem-index #" + subsystemIndex +
								" was not found. Perhaps a refresh is needed.");
							return;
						}
						window.clearTimeout(_getStatusTimer);

						SubsystemLaunch.system.error = ""; //clear error for next command response
						//force state display for user feedback
						SubsystemLaunch.subsystems[subsystemIndex].status = "Rebooting...";
						SubsystemLaunch.subsystems[subsystemIndex].progress = 0;
						displayStatus();

						DesktopContent.XMLHttpRequest("Request?RequestType=gatewayLaunchOTSInstance" +
						"&targetSubsystem=" + targetSubsystem,
						"",
							function (req) {
								Debug.info("Reboot launched for '" + targetSubsystem + "'...!");

								window.clearTimeout(_getStatusTimer);
								_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

							}, //request handler
						0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
						false /*doNoShowLoadingOverlay*/,
						true /*targetGatewaySupervisor*/);


					}, //end handler
					0,"#efeaea",0,"#770000",0 /* getUserInput [optional] */ ,
					350 /* dialogWidth [optional] */); //end second verify
			},
			0,"#efeaea",0,"#770000",0 /* getUserInput [optional] */ ,
			350 /* dialogWidth [optional] */); //end first verify


	}	//end bootSubsystem()

	//=====================================================================================
	this.handleSubsystemFsmModeSelect = function (value, subsystemIndex) {
		Debug.log("handleSubsystemFsmModeSelect()", value, subsystemIndex);
		if(value == "") return; //assume user is clearing

		var targetSubsystem = SubsystemLaunch.subsystems[subsystemIndex].name;

		window.clearTimeout(_getStatusTimer);

		DesktopContent.XMLHttpRequest("Request?RequestType=setRemoteSubsystemFsmControl" +
				"&targetSubsystem=" + targetSubsystem +
				"&setValue=" + encodeURIComponent(value) +
				"&controlType=mode",
				"", //end post data,
			function (req) {
					_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec
				},  //end handler
				0, 0, false,//reqParam, progressHandler, callHandlerOnErr,
				false,//doNotShowLoadingOverlay,
				true //targetGatewaySupervisor
		); //end setRemoteSubsystemFsmControl request

	}	//end handleSubsystemFsmModeSelect()

	//=====================================================================================
	this.handleSubsystemActionSelect = function (el, subsystemIndex) {
		var command = el.value;
		if (el.tagName === "BUTTON") command = el.innerText;
		Debug.log("handleSubsystemActionSelect()", command, subsystemIndex);
		if(command == "" || command == "Select an action:") return; //assume user is clearing

		if (subsystemIndex === undefined || subsystemIndex >= SubsystemLaunch.subsystems.length)
		{
			Debug.err("Illegal subsystem index:",subsystemIndex,"ouf of",
				SubsystemLaunch.subsystems.length);
			el.selectedIndex = 0; //reset command select box
			return;
		}

		if (subsystemIndex == -1) {
			Debug.log("System action - activeFsm", SubsystemLaunch.system.activeFsm,
				SubsystemLaunch.system.activeFsmWindow
			);

			var configAlias;
			if(command == "Configure") //at config alias
			{
				configAlias = document.getElementById("systemConfigAliasSelect").value;
			}
			//at this point, ready to send command!
			//but need to determine target request

			if (command == "Halt" &&
					SubsystemLaunch.system.activeFsmWindow == "iterator")
			{
				Debug.log("Do haltIterator");

				window.clearTimeout(_getStatusTimer);
				SubsystemLaunch.system.error = ""; //clear error for next command response
				//force state display for user feedback
				SubsystemLaunch.system.inTransition = true;
				SubsystemLaunch.system.transition = "Launching " + command;
				SubsystemLaunch.system.progress = 0;
				displayStatus();

				//resume statusing and clear action
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(
					function () {
						el.selectedIndex = 0; //reset command select box
						getCurrentStatus();
					},2000); //in 2 sec

				DesktopContent.XMLHttpRequest("StateMachineXgiHandler?" +
						"fsmName=" + _fsmName +
						"&StateMachine=iterateHalt", //end get data
						"", //end post data
						function(req) //start handler
						{

					Debug.log("iterateHalt handler");

					var success = DesktopContent.getXMLValue(req,"state_transition_attempted") == "1";
					if(!success)
					{
						var err = DesktopContent.getXMLValue(req,"state_transition_attempted_err");
						if(err)
							Debug.log(err,Debug.HIGH_PRIORITY);
						Debug.err("Server indicated failure to attempt state transition.");
						return;
					}

						}, //end handler
						0, //handler param
						0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
						true /*targetGatewaySupervisor*/);
			}
			else if (command == "Stop"  &&
					SubsystemLaunch.system.activeFsmWindow == "iterator" &&
					SubsystemLaunch.system.state == "Running")
			{
				Debug.log("Do stop launcher");

				window.clearTimeout(_getStatusTimer);
				SubsystemLaunch.system.error = ""; //clear error for next command response
				//force state display for user feedback
				SubsystemLaunch.system.inTransition = true;
				SubsystemLaunch.system.transition = "Launching " + command;
				SubsystemLaunch.system.progress = 0;
				displayStatus();

				SubsystemLaunch.launcher.stop()
			}
			else if (command == "Stop") //likely this means Gateway failed somehow(?), but subsystems are left in runs
			{
				Debug.log("Do batch Stop fsmName",_fsmName);

				//send Stop to all checked subsystems individually

				DesktopContent.popUpVerification(
					"There does not appear to be an active top-level Run; do you want to attempt to Stop individual selected subsystems anyway?",
					function () {
						Debug.log("User chose to stop individual subsystems!");

						//make temporary command element
						const el = document.createElement("textarea");
						el.value = command;

						for(let s = 0; s < SubsystemLaunch.subsystems.length; ++s)
						{
							if(SubsystemLaunch.subsystems[s].fsmIncluded &&
								!SubsystemLaunch.subsystems[s].inTransition &&
								SubsystemLaunch.subsystems[s].status == "Running")
							{
								Debug.log("Sending stop to subsystem",s,SubsystemLaunch.subsystems[s]);
								SubsystemLaunch.launcher.handleSubsystemActionSelect(el,s);
							}
						}

					},
					0,"#efeaea",0,"#770000"); //end popUpVerification
			}
			else if (command == "Halt" && //likely this means state machines were moved independently, and user wants to do a batch 'Halt'
				(SubsystemLaunch.system.state == "Halted" ||
					SubsystemLaunch.system.state == "Failed"))
			{
				Debug.log("Do batch Halt fsmName",_fsmName);

				//send Halt to all checked subsystems individually


				window.clearTimeout(_getStatusTimer);
				SubsystemLaunch.system.error = ""; //clear error for next command response
				//force state display for user feedback
				SubsystemLaunch.system.inTransition = true;
				SubsystemLaunch.system.transition = "Launching " + command;
				SubsystemLaunch.system.progress = 0;
				displayStatus();


				//make temporary command element
				const el = document.createElement("textarea");
				el.value = command;

				for(let s = 0; s < SubsystemLaunch.subsystems.length; ++s)
				{
					if(SubsystemLaunch.subsystems[s].fsmIncluded &&
						!SubsystemLaunch.subsystems[s].inTransition)
					{
						Debug.log("Sending halt to subsystem",s,SubsystemLaunch.subsystems[s]);
						SubsystemLaunch.launcher.handleSubsystemActionSelect(el,s);
					}
				}

				//every 2 seconds, check if subsystems are halted
				if(SubsystemLaunch.system.state == "Failed")
				{
					var moveTopLevelAttempts = 0;
					localMoveTopLevelToHalted();

					//===================
					function localMoveTopLevelToHalted()
					{
						++moveTopLevelAttempts,
						Debug.log("Trying to move top-level to Halted",_fsmName,
								"moveTopLevelAttempts",moveTopLevelAttempts);
						window.clearTimeout(_getStatusTimer);
						SubsystemLaunch.system.error = ""; //clear error for next command response
						//force state display for user feedback
						SubsystemLaunch.system.inTransition = true;
						SubsystemLaunch.system.transition = "Launching " + command;
						SubsystemLaunch.system.progress = 0;
						displayStatus();

						window.setTimeout(
							function () {
								getCurrentStatus();

								window.clearTimeout(_getStatusTimer);
								//force state display for user feedback
								SubsystemLaunch.system.inTransition = true;
								SubsystemLaunch.system.transition = "Launching " + command;
								SubsystemLaunch.system.progress = 0;
								displayStatus();

								var allSubsystemsHalted = true;
								for(let s = 0; s < SubsystemLaunch.subsystems.length; ++s)
								{
									if(SubsystemLaunch.subsystems[s].fsmIncluded &&
										(SubsystemLaunch.subsystems[s].inTransition ||
											SubsystemLaunch.subsystems[s].status != "Halted"))
									{
										Debug.log("Not yet halted at subsystem",s,SubsystemLaunch.subsystems[s]);
										allSubsystemsHalted = false;
										break;
									}
								}

								if(allSubsystemsHalted)
								{
									Debug.log("All subsystems halted, so now halting top-level");
									//send Halt to top-level system

									DesktopContent.XMLHttpRequest("StateMachineXgiHandler?" +
												"fsmName=" + _fsmName +
												"&StateMachine=" + command, //end get data
												(configAlias?("ConfigurationAlias=" + configAlias):""), //end post data
											function(req) //start handler
											{
										Debug.log(command,"StateMachineXgiHandler FSM command handler");

										var success = DesktopContent.getXMLValue(req,"state_transition_attempted") == "1";
										if(!success)
										{
											var err = DesktopContent.getXMLValue(req,"state_transition_attempted_err");
											if(err)
												Debug.log(err,Debug.HIGH_PRIORITY);
											Debug.err("Server indicated failure to attempt state transition.");
											return;
										}

											}, //end handler
											0, //handler param
											0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
											true /*targetGatewaySupervisor*/);
								}
								else if(moveTopLevelAttempts > 10)
								{
									Debug.err("Could not move top-level to Halted! Timeout waiting for selected subsystems to halt...");
									getCurrentStatus();
								}
								else //try again
									localMoveTopLevelToHalted();
							},2000); //in 2 sec
					} //end localMoveTopLevelToHalted()
				}
			}
			else
			{
				Debug.log("Do fsmName",_fsmName);


				window.clearTimeout(_getStatusTimer);
				SubsystemLaunch.system.error = ""; //clear error for next command response
				//force state display for user feedback
				SubsystemLaunch.system.inTransition = true;
				SubsystemLaunch.system.transition = "Launching " + command;
				SubsystemLaunch.system.progress = 0;
				displayStatus();

				//resume statusing and clear action
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(
					function () {
						el.selectedIndex = 0; //reset command select box
						getCurrentStatus();
					},2000); //in 2 sec

				DesktopContent.XMLHttpRequest("StateMachineXgiHandler?" +
							"fsmName=" + _fsmName +
							"&StateMachine=" + command, //end get data
							(configAlias?("ConfigurationAlias=" + configAlias):""), //end post data
						function(req) //start handler
						{
					Debug.log(command,"StateMachineXgiHandler FSM command handler");

					var success = DesktopContent.getXMLValue(req,"state_transition_attempted") == "1";
					if(!success)
					{
						var err = DesktopContent.getXMLValue(req,"state_transition_attempted_err");
						if(err)
							Debug.log(err,Debug.HIGH_PRIORITY);
						Debug.err("Server indicated failure to attempt state transition.");
						return;
					}

						}, //end handler
						0, //handler param
						0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
						true /*targetGatewaySupervisor*/);
			}


			return;
		} //end system command
		//else if here, subsystem command

		var parameter;
		if(command == "Configure") //at config alias
		{
			parameter = document.getElementById("subsystem_" + "configAlias" +
				"_select_" + subsystemIndex).value;
		}

		//at this point, ready to send command!

		window.clearTimeout(_getStatusTimer);

		//force state display for user feedback
		SubsystemLaunch.subsystems[subsystemIndex].status = "Launching " + command;
		SubsystemLaunch.subsystems[subsystemIndex].progress = 0;
		displayStatus();

		DesktopContent.XMLHttpRequest("Request?RequestType=commandRemoteSubsystem" +
			"&fsmName=" + SubsystemLaunch.launcher.getFsmName() +
			"&command=" + command +
			(parameter?("&parameter=" + parameter):"") +
			"&targetSubsystem=" + SubsystemLaunch.subsystems[subsystemIndex].name
			, "", //post data
			function(req,param,err) //request handler
			{
				Debug.log("commandRemoteSubsystem handler()", command);

				var errs = DesktopContent.getXMLRequestErrors(req);
				if(!err) err = "";
				for(var e=0; e < errs.length; ++e)
					err += (err.length?"\n\n":"") + errs[e];

				if(err != "")
					Debug.err("Error received launching '" + command + "' action: " + err);

				//resume statusing and clear action
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(
					function () {
						el.selectedIndex = 0; //reset command select box
						getCurrentStatus();
					},2000); //in 2 sec

			}, //end request handler
			0 /*reqParam*/, 0 /*progressHandler*/, true /*callHandlerOnErr*/,
			true /*doNoShowLoadingOverlay*/,
			true /*targetGatewaySupervisor*/);

	} //end handleSubsystemActionSelect()

	//=====================================================================================
	//handleDurationSelect ~~
	this.handleDurationSelect = function (val) {
		// Debug.log("handleDurationSelect",val);
		if(val == "Open-ended") //then no input box
		{
			document.getElementById("runCountInputUnits").innerText =
				"Run of";
			document.getElementById("runCountInput").style.display = "none";
			document.getElementById("runDurationInput").style.display = "none";
		}
		else {
			var el = document.getElementById("runCountInput");
			var numOfRuns = el.value;
			document.getElementById("runCountInputUnits").innerText =
				"Run" + (numOfRuns>1?"s":"") + " of";

			document.getElementById("runCountInput").style.display = "block";
			document.getElementById("runDurationInput").style.display = "block";
		}
	} //end handleDurationSelect()

	//=====================================================================================
	//start ~~
	this.start = function () {
		Debug.log("start()");

		var units = "Open-ended";
		var el = document.getElementById("runDurationSelect");
		if(el) units = el.value;

		var numOfRuns = 1;
		el = document.getElementById("runCountInput");
		if(el) numOfRuns = el.value|0;
		if(numOfRuns < 1) numOfRuns = 1;

		var runDuration = -1;
		el = document.getElementById("runDurationInput");
		if(el) runDuration = el.value|0;


		Debug.log("start()",numOfRuns,runDuration,units);

		var humanPrompt = "";
		if (units == "Open-ended") {
			humanPrompt = "run";
			runDuration = -1;
			numOfRuns = 1;
		}
		else {

			if(numOfRuns == 1)
				humanPrompt = "run of " + runDuration +
					" " + units;
			else
				humanPrompt = "set of " + numOfRuns +" runs of " +
					runDuration + " " + units + " each";


			if(units == "Minute(s)")
				runDuration *= 60;
			if(units == "Hour(s)")
				runDuration *= 60*60;
			Debug.log("Run duration [s]",runDuration);
		}
		Debug.logv({humanPrompt});

		var transitionActionName = "Start";
		var lastLogEntry;
		var keepConfiguration = false;

		if (SubsystemLaunch.system.state == "Configured") {
			DesktopContent.popUpVerification(
				"Your system is already Configured, do you want to stay Configured and " +
				"immediately start the next run?<br><br>" +
				"Note: you can still cancel starting the run after this selection.",
				function () {
					Debug.log("User chose to stay configured");
					keepConfiguration = true;
					localHandleLogEntry();
				} //end continueFunc handler
				,
				0,"#efeaea",0,"#770000",
				/* getUserInput [optional] */ false,
				/* dialogWidth [optional] */ 350,
				/* cancelFunc [optional] */
				function () {
					Debug.log("User chose to Re-configure");
					keepConfiguration = false;
					localHandleLogEntry();
				} //end cancelFunc handler
				,
				/* yesButtonText [optional] */ "Stay Configured",
				/* noAutoComplete [optional] */ true,
				/* defaultUserInputValue [optional] */ (lastLogEntry?lastLogEntry:""),
				/* cancelButtonText [optional] */ "Re-Configure"
			); //end popUpVerification
		}
		else
			localHandleLogEntry();

		return;

		//===========
		function localHandleLogEntry() {
			Debug.log("localHandleLogEntry()");

			if (SubsystemLaunch.system.doRequireRunLogEntry) {
				Debug.log("Found logbook entry required to start run");

				//attempt to get last log entry
				DesktopContent.XMLHttpRequest("Request?RequestType=getStateMachineLastLogEntry" +
					"&fsmName=" + _fsmName +
					"&transition=" + transitionActionName, "",
					localPopUpVerify, //end request handler
					0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
					false /*doNoShowLoadingOverlay*/,
					true /*targetGatewaySupervisor*/);

				return;

				//================
				function localPopUpVerify(req) {
					lastLogEntry = DesktopContent.getXMLValue(req,"lastLogEntry");
					if(lastLogEntry && lastLogEntry != "")
						lastLogEntry = decodeURIComponent(lastLogEntry);

					DesktopContent.popUpVerification(
						/* prompt */
						"Please enter a logbook entry for the next " + humanPrompt + ":"
						,
						/* continueFunc [optional] */
						function (entry) {
							Debug.log("User entered logbook entry " + entry);

							//save last entry
							lastLogEntry = entry;
							localRun();
						} //end continueFunc handlere
						,
						/* val [optional] */ undefined,
						/* bgColor [optional] */ "#efeaea",
						/* textColor [optional] */ undefined,
						/* borderColor [optional] */ "#770000",
						/* getUserInput [optional] */ true,
						/* dialogWidth [optional] */ 500,
						/* cancelFunc [optional] */
						function (entry) {
							Debug.log("User cancelled transition action",entry);

						} //end cancelFunc handler
						,
						/* yesButtonText [optional] */ transitionActionName,
						/* noAutoComplete [optional] */ true,
						/* defaultUserInputValue [optional] */ (lastLogEntry?lastLogEntry:""),
						/* cancelButtonText [optional] */ undefined,
						/* wantMultilineInput [optional] */ true
					); //end popUpVerification

					return;
				} //end localPopUpVerify()
			} //end handle log entry required
			else {
				DesktopContent.popUpVerification(
					"Are you sure you want to start a " + humanPrompt + "?",
					localRun,
					0,"#efeaea",0,"#770000");
			}

		} //end localHandleLogEntry()

		//===========
		function localRun() {
			Debug.log("localRun()",lastLogEntry,
				"activePlan=",
				SubsystemLaunch.iterator.activePlan,
				"status=",
				SubsystemLaunch.iterator.activePlanStatus);

			window.clearTimeout(_getStatusTimer);

			//if there is an activePlan and status is inactive/error
			//	then Halt iterator first

			if (SubsystemLaunch.iterator.activePlanStatus == "Error") {
				localIterateHaltFirst();
			}
			else if (SubsystemLaunch.iterator.activePlan != "") {
				DesktopContent.popUpVerification(
					"There is already an active Iterator Plan; do you want to Halt the " +
					"currently active Iterator plan, and then Launch new run(s)?",
					localIterateHaltFirst,
					0,"#efeaea",0,"#770000");
			}
			else //can iteratePlay directly!
				localIteratePlay();


			return;


			//===========
			function localIterateHaltFirst() {
				Debug.log("localIterateHaltFirst()");

				//target plan = Iterator::RESERVED_GEN_PLAN_NAME = "---GENERATED_PLAN---"
				DesktopContent.XMLHttpRequest("StateMachineXgiHandler?" +
						"&StateMachine=iterateHalt", //end get data
						"", //end post data
						function(req) //start handler
						{

					Debug.log("iterateHalt handler");

					var success = DesktopContent.getXMLValue(req,"state_transition_attempted") == "1";
					if(!success)
					{
						var err = DesktopContent.getXMLValue(req,"state_transition_attempted_err");
						if(err)
							Debug.log(err,Debug.HIGH_PRIORITY);
						Debug.err("Server indicated failure to attempt state transition.");
						return;
					}

					var waitForHaltCount = 0;
					localWaitForHalt();
					return;

					//===========
						function localWaitForHalt() {
						Debug.log("localWaitForHalt()", ++waitForHaltCount);
							if (SubsystemLaunch.iterator.activePlan != "") {
								if (waitForHaltCount > 10) {
								Debug.err("Something is wrong! Unable to halt the Iterator... please contact admins.");
								return;
							}
							Debug.log("localWaitForHalt() still waiting...");
							window.clearTimeout(_getStatusTimer);
							_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

							window.setTimeout(localWaitForHalt,1500); //wait a sec
							return;
						}
						Debug.log("localWaitForHalt() ready!");
						localIteratePlay();

					} //end localWaitForHalt()

						}, //end handler
						0, //handler param
						0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
						true /*targetGatewaySupervisor*/);
			} //end localIterateHaltFirst()

			//===========
			function localIteratePlay() {
				Debug.log("localIteratePlay()");

				//Send parameters to Iterator gen plan through 'fsmWindowName' parameter
				//	Note: Log Entry needs to be double encoded.

				var parameters = "";
				// parameters[0] /*fsmName*/,
				// parameters[1] /*configAlias*/,
				// parameters[2] /*durationSeconds*/,
				// parameters[3] /*numberOfRuns*/,
				// parameters[4] /*keepConfiguration*/,
				// parameters[5] /*logEntry*/
				parameters += _fsmName;
				parameters += "," + SubsystemLaunch.system.selectedSystemAlias;
				parameters += "," + runDuration;
				parameters += "," + numOfRuns;
				parameters += "," + (keepConfiguration?"1":"0");
				parameters += "," + encodeURIComponent(lastLogEntry); //double encoded

				//target plan = Iterator::RESERVED_GEN_PLAN_NAME = "---GENERATED_PLAN---"
				DesktopContent.XMLHttpRequest("StateMachineXgiHandler?" +
							"&StateMachine=iteratePlayGenerated" +
							"&fsmName=" + _fsmName, //end get data
							"&fsmWindowName=" + encodeURIComponent(parameters), //end post data
							function(req) //start handler
							{
						Debug.log("startTargetIterationPlan handler");

						//resume updating
						window.clearTimeout(_getStatusTimer);
						_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

						var error_message		= DesktopContent.getXMLValue(req,"error_message");
						if(!error_message || error_message == "")
							error_message		= DesktopContent.getXMLValue(req,"state_transition_attempted_err");

						if(error_message && error_message != "")
							Debug.log(error_message,Debug.HIGH_PRIORITY);
						else {
							Debug.log("Launched the run(s)!",
									Debug.INFO_PRIORITY);
						}

							}, //end handler
							0, //handler param
							0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
							true /*targetGatewaySupervisor*/);
			} //end localIteratePlay()

		} //end localRun()

	} //end start()

	//=====================================================================================
	//stop ~~
	this.stop = function () {
		//if Iterator plan active, then Halt-Iterator
		//if not, then Stop FSM transition

		Debug.log("stop()");

		if(SubsystemLaunch.system.state != "Running" && (
			SubsystemLaunch.iterator.activePlanStatus == "Inactive" ||
			SubsystemLaunch.iterator.activePlanStatus == "Error"))
		{
			if (SubsystemLaunch.iterator.activePlan == "---GENERATED_PLAN---")
			{
				DesktopContent.popUpVerification(
					"There does not appear to be an active Run; do you want to Halt anyway?",
					function () {
						Debug.log("User chose to halt!");

						window.clearTimeout(_getStatusTimer);
						_getStatusTimer = window.setTimeout(getCurrentStatus,5000); //in 5 sec

						SubsystemLaunch.system.error = ""; //clear error for next command response
						//force state display for user feedback
						SubsystemLaunch.system.inTransition = true;
						SubsystemLaunch.system.transition = "Launching " + "Stop";
						SubsystemLaunch.system.progress = 0;
						displayStatus();

						//target plan = Iterator::RESERVED_GEN_PLAN_NAME = "---GENERATED_PLAN---"
						DesktopContent.XMLHttpRequest("StateMachineXgiHandler?" +
								"&StateMachine=iterateHalt", //end get data
								"", //end post data
								function(req) //start handler
								{
							Debug.log("stop() iterateHalt handler ");

							//resume updating
							window.clearTimeout(_getStatusTimer);
							_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

							var success = DesktopContent.getXMLValue(req,"state_transition_attempted") == "1";
							if(!success)
							{
								var err = DesktopContent.getXMLValue(req,"state_transition_attempted_err");
								if(err)
									Debug.log(err,Debug.HIGH_PRIORITY);
								Debug.err("Server indicated failure to attempt state transition.");
								return;
							}

								}, //end handler
								0, //handler param
								0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
								true /*targetGatewaySupervisor*/);

					},
					0,"#efeaea",0,"#770000"); //end popUpVerification
			}
			else {
				//should never happen!
				Debug.err("There does not appear to be an active Run - can not Stop. Perhaps you need to refresh this page to realign with FSM?");
			}
		}
		else if (SubsystemLaunch.iterator.activePlan == "---GENERATED_PLAN---") {
			DesktopContent.popUpVerification(
				"Are you sure you want to Halt in the middle of the run(s)?",
				function () {
					Debug.log("User chose to halt!");

					window.clearTimeout(_getStatusTimer);
					_getStatusTimer = window.setTimeout(getCurrentStatus,5000); //in 5 sec

					SubsystemLaunch.system.error = ""; //clear error for next command response
					//force state display for user feedback
					SubsystemLaunch.system.inTransition = true;
					SubsystemLaunch.system.transition = "Launching " + "Halt";
					SubsystemLaunch.system.progress = 0;
					displayStatus();

					//target plan = Iterator::RESERVED_GEN_PLAN_NAME = "---GENERATED_PLAN---"
					DesktopContent.XMLHttpRequest("StateMachineXgiHandler?" +
							"&StateMachine=iterateHalt", //end get data
							"", //end post data
							function(req) //start handler
							{
						Debug.log("stop() iterateHalt handler ");

						//resume updating
						window.clearTimeout(_getStatusTimer);
						_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

						var success = DesktopContent.getXMLValue(req,"state_transition_attempted") == "1";
						if(!success)
						{
							var err = DesktopContent.getXMLValue(req,"state_transition_attempted_err");
							if(err)
								Debug.log(err,Debug.HIGH_PRIORITY);
							Debug.err("Server indicated failure to attempt state transition.");
							return;
						}

							}, //end handler
							0, //handler param
							0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
							true /*targetGatewaySupervisor*/);

				},
				0,"#efeaea",0,"#770000"); //end popUpVerification
		}
		else if(SubsystemLaunch.system.state == "Running") //likely, Iterator left open-ended run
		{

			DesktopContent.popUpVerification(
				"Are you sure you want to Stop the open-ended run?",
				function () {
					Debug.log("User chose to stop!");

					localHandleLogEntry();
				},
				0,"#efeaea",0,"#770000"); //end popUpVerification
		}
		else {
			//should never happen!
			Debug.err("There does not appear to be an active Run - can not Stop. Perhaps you need to refresh this page to realign with FSM?");
		}


		return;

		//===========
		function localHandleLogEntry() {
			Debug.log("localHandleLogEntry() stop");
			var transitionActionName = "Stop";

			//attempt to get last log entry
			DesktopContent.XMLHttpRequest("Request?RequestType=getStateMachineLastLogEntry" +
				"&fsmName=" + _fsmName +
				"&transition=" + transitionActionName, "",
				localPopUpVerify, //end request handler
				0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
				false /*doNoShowLoadingOverlay*/,
				true /*targetGatewaySupervisor*/);

			return;

			//================
			function localPopUpVerify(req) {
				var lastLogEntry = DesktopContent.getXMLValue(req,"lastLogEntry");
				if(lastLogEntry && lastLogEntry != "")
					lastLogEntry = decodeURIComponent(lastLogEntry);

				DesktopContent.popUpVerification(
					/* prompt */
					"Please enter a logbook entry summarizing the run:"
					,
					/* continueFunc [optional] */
					function (entry) {
						Debug.log("User entered logbook entry " + entry);

						//save last entry
						lastLogEntry = entry;
						localStop(entry);
					} //end continueFunc handlere
					,
					/* val [optional] */ undefined,
					/* bgColor [optional] */ "#efeaea",
					/* textColor [optional] */ undefined,
					/* borderColor [optional] */ "#770000",
					/* getUserInput [optional] */ true,
					/* dialogWidth [optional] */ 500,
					/* cancelFunc [optional] */
					function (entry) {
						Debug.log("User cancelled transition action",entry);

					} //end cancelFunc handler
					,
					/* yesButtonText [optional] */ transitionActionName,
					/* noAutoComplete [optional] */ true,
					/* defaultUserInputValue [optional] */ (lastLogEntry?lastLogEntry:""),
					/* cancelButtonText [optional] */ undefined,
					/* wantMultilineInput [optional] */ true
				); //end popUpVerification

				return;
			} //end localPopUpVerify()

		} //end localHandleLogEntry()


		//===========
		function localStop(logEntry) {
			Debug.log("localStop()");
			Debug.logv({logEntry});

			window.clearTimeout(_getStatusTimer);
			_getStatusTimer = window.setTimeout(getCurrentStatus,5000); //in 5 sec

			SubsystemLaunch.system.error = ""; //clear error for next command response
			//force state display for user feedback
			SubsystemLaunch.system.inTransition = true;
			SubsystemLaunch.system.transition = "Launching " + "Stop";
			SubsystemLaunch.system.progress = 0;
			displayStatus();

			DesktopContent.XMLHttpRequest("StateMachineXgiHandler?" +
						"&fsmName=" + _fsmName +
						"&StateMachine=Stop", //end get data
						"logEntry=" + encodeURIComponent(logEntry), //end post data
					function(req) //start handler
					{
				Debug.log("stop() FSM handler");

				//resume updating
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

				var success = DesktopContent.getXMLValue(req,"state_transition_attempted") == "1";
				if(!success)
				{
					var err = DesktopContent.getXMLValue(req,"state_transition_attempted_err");
					if(err)
						Debug.log(err,Debug.HIGH_PRIORITY);
					Debug.err("Server indicated failure to attempt state transition.");
					return;
				}

					}, //end handler
					0, //handler param
					0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
					true /*targetGatewaySupervisor*/);

		} //end localStop()

	} //end stop()

	//=====================================================================================
	//handleCheckbox(i) ~~
	//	checkbox value already set when this function is called
	this.handleCheckbox = function (c, el) {
		var val = el.checked;
		Debug.log("handleCheckbox", c, val);
		event.stopPropagation();

		var field = "fsmIncluded";
		var targetSubsystem = "";
		if(c == -1) //toggle all
		{
			for (var s = 0; s < SubsystemLaunch.subsystems.length; ++s) {
				el = document.getElementById("subsystem_" + field + "_checkbox_" + s);
				el.checked = val;
				SubsystemLaunch.subsystems[s].fsmIncluded = val;
			}

			targetSubsystem = "*";
		}
		else //toggle one
		{
			targetSubsystem = SubsystemLaunch.subsystems[c].name;
			SubsystemLaunch.subsystems[c].fsmIncluded = val;

			var allTrue = true;
			for (var s = 0; s < SubsystemLaunch.subsystems.length; ++s) {
				el = document.getElementById("subsystem_" + field + "_checkbox_" + s);
				if(el && !el.checked) { allTrue = false; break; }
			}

			//change the all el based on allTrue
			el = document.getElementById("subsystem_" + field + "_checkbox_" + "all");
			el.checked = allTrue;
		}

		DesktopContent.XMLHttpRequest("Request?RequestType=setRemoteSubsystemFsmControl" +
				"&targetSubsystem=" + targetSubsystem +
				"&setValue=" + (val?1:0) +
				"&controlType=include",
				"", //end post data,
				undefined /* function(req) */,  //end handler
				0, 0, false,//reqParam, progressHandler, callHandlerOnErr,
				false,//doNotShowLoadingOverlay,
				true //targetGatewaySupervisor
		); //end setRemoteSubsystemFsmControl request

	} //end handleCheckbox()

	//=====================================================================================
	//getFsmName() ~~
	this.getFsmName = function() { Debug.logv({_fsmName}); return _fsmName; }

	//=====================================================================================
	this.openChatWindow = function () {
		Debug.log("this.openChatWindow()");

		DesktopContent.popUpVerification(
			"Do you want to open the Chat window to send messages or page alerts to active users?",
			localOpenChatWindow,
			0,"#efeaea",0,"#770000");
		return

		//===========
		function localOpenChatWindow() {
			Debug.log("localOpenChatWindow()","Chat");
			DesktopContent.openNewWindow("Chat");
		} //end localOpenChatWindow()

	} //end this.openChatWindow()

	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end 'member' function declaration

	SubsystemLaunch.launcher = this;
	Debug.log("SubsystemLaunch.launcher constructed");

	init();
	Debug.log("SubsystemLaunch.launcher initialized");
} //end create() SubsystemLaunch instance

//=====================================================================================
SubsystemLaunch.initSubsystemRecords = function (returnHandler) {
	Debug.log("SubsystemLaunch.initSubsystemRecords()");

	SubsystemLaunch.subsystems = []; //clear
	DesktopContent.XMLHttpRequest("Request?RequestType=getRemoteSubsystems" +
		"&fsmName=" + SubsystemLaunch.launcher.getFsmName()
		, "", //post data
		function(req) //request handler
		{
			Debug.log("getRemoteSubsystems handler()");

			//subsystems --------------------
			{
				var fields = SubsystemLaunch.SUBSYSTEM_FIELDS;

				//get all subsystem fields from xml
				var subsystemArrs = {};
				for(var i=0; i<fields.length; ++i)
					subsystemArrs[fields[i]] = req.responseXML.getElementsByTagName("subsystem_" + fields[i]);

				Debug.log("subsystemArr", subsystemArrs);

				//migrate xml values to subsystem struct
				for (var j = 0; j < subsystemArrs[fields[0]].length; ++j) {
					SubsystemLaunch.subsystems.push({}); //create empty structure for each subsystem
					for (var i = 0; i < fields.length; ++i) {
						SubsystemLaunch.subsystems[j][fields[i]] = subsystemArrs[fields[i]][j].getAttribute('value');
					} //end field/value push loop

					//force fsmInclude to bool
					SubsystemLaunch.subsystems[j].fsmIncluded |= 0;

				} //end subsystem loop

				Debug.log("subsystem obj", SubsystemLaunch.subsystems);
			} //end subsystems ------

			//system aliases --------------------
			{
				//get all system aliases and put in drop-down
				var aliasArr = req.responseXML.getElementsByTagName("config_alias");
				var aliasGroupArr = req.responseXML.getElementsByTagName("config_key");
				var aliasGroupCommentArr = req.responseXML.getElementsByTagName("config_comment");
				var aliasCommentArr = req.responseXML.getElementsByTagName("config_alias_comment");
				var aliasAuthorArr = req.responseXML.getElementsByTagName("config_author");
				var aliasCreateTimeArr = req.responseXML.getElementsByTagName("config_create_time");

				SubsystemLaunch.system.selectedSystemAlias =
						DesktopContent.getXMLValue(req,"UserLastConfigAlias");

				//take last configured alias, if user has not selected anything yet
				if(!SubsystemLaunch.system.selectedSystemAlias)
					SubsystemLaunch.system.selectedSystemAlias = "";

				SubsystemLaunch.system.systemAliases = [];
				var alias;
				for (var i = 0; i < aliasArr.length; ++i) {
					alias = aliasArr[i].getAttribute('value');

					//require meta information for a 'good' alias
					if (!aliasCommentArr[i] || !aliasCreateTimeArr[i]) {
						Debug.err("Configuration alias '" + alias + "' has an illegal group translation or is missing meta data information. Please delete the alias or fix the translation in your active Backbone group.");
						continue;
					}
					SubsystemLaunch.system.systemAliases.push({
							name: alias,
							translation: aliasGroupArr[i].getAttribute('value'),
							comment: aliasGroupCommentArr[i].getAttribute('value'),
							author: aliasAuthorArr[i].getAttribute('value'),
							createTime: aliasCreateTimeArr[i].getAttribute('value')
						});


				} //end primary alias structure creation loop
				Debug.log("SubsystemLaunch.system.systemAliases",SubsystemLaunch.system.systemAliases);

			} //end system aliases -----

			//system state ------------------------
			{
				SubsystemLaunch.system.doRequireConfigureLogEntry = DesktopContent.getXMLValue(req,"RequireUserLogInputOnConfigureTransition")|0;
				SubsystemLaunch.system.doRequireRunLogEntry = DesktopContent.getXMLValue(req,"RequireUserLogInputOnRunTransition")|0;

				Debug.log("doRequireConfigureLogEntry",SubsystemLaunch.system.doRequireConfigureLogEntry);
				Debug.log("doRequireRunLogEntry",SubsystemLaunch.system.doRequireRunLogEntry);
				SubsystemLaunch.extractSystemStatus(req);
				SubsystemLaunch.extractIteratorStatus(req);
			} //end system state ----------

			if(returnHandler)
				returnHandler();

		}, //end request handler
		0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
		false /*doNoShowLoadingOverlay*/,
		true /*targetGatewaySupervisor*/);


} //end SubsystemLaunch.initSubsystemRecords()

//=====================================================================================
//extractErrorSecondsAgo
// Returns seconds since the most recent ots-style timestamp found in the string,
// e.g. "Fri Mar  6 10:46:02 2026 CST:"
// or -1 if no parseable timestamp is present.
SubsystemLaunch.extractErrorSecondsAgo = function (message) {
	if(!message)
		return -1;

	const timestampMatch = message.match(/([A-Z][a-z]{2} [A-Z][a-z]{2}\s+\d{1,2} \d{2}:\d{2}:\d{2} \d{4})(?:\s+([A-Za-z_+\/-]+|[+-]\d{4}))?:/);
	if(!timestampMatch)
		return -1;

	const timestampCore = timestampMatch[1].replace(/\s+/g, ' ').trim();
	const timezone = timestampMatch[2] ? timestampMatch[2].trim() : "";
	const parsedTime = Date.parse(
		timezone ? (timestampCore + " " + timezone) : timestampCore);

	if(Number.isNaN(parsedTime))
		return -1;

	return Math.floor((Date.now() - parsedTime) / 1000);
} //end SubsystemLaunch.extractErrorSecondsAgo()

//=====================================================================================
SubsystemLaunch.extractSystemStatus = function (req) {
	SubsystemLaunch.system.activeFsm = DesktopContent.getXMLValue(req,"active_fsmName");
	SubsystemLaunch.system.activeFsmWindow = DesktopContent.getXMLValue(req,"active_fsmWindowName");
	SubsystemLaunch.system.activeFsmStatus = DesktopContent.getXMLValue(req,"active_fsmStatus");
	SubsystemLaunch.system.state = DesktopContent.getXMLValue(req,"current_state");
	SubsystemLaunch.system.inTransition = DesktopContent.getXMLValue(req,"in_transition") == "1";
	SubsystemLaunch.system.transition = DesktopContent.getXMLValue(req,"current_transition");
	SubsystemLaunch.system.timeInState = DesktopContent.getXMLValue(req,"time_in_state") | 0;
	var tmpRunNumber = DesktopContent.getXMLValue(req,"run_number"); //undefined during transitions and 9:10 status requests
	if(tmpRunNumber) SubsystemLaunch.system.runNumber = tmpRunNumber;
	SubsystemLaunch.system.progress = DesktopContent.getXMLValue(req,"transition_progress") | 0;

	var err = DesktopContent.getXMLValue(req,"system_error");
	var fsmErr = DesktopContent.getXMLValue(req,"current_error");
	if (fsmErr && fsmErr != "") {
		if (err && err != "") { err += "\n\n"; err += fsmErr; }
		else
			err = fsmErr;
	}
	if(err && err != "" && SubsystemLaunch.system.error != err)
	{
		//do not show if err is old
		let secondsAgo = SubsystemLaunch.extractErrorSecondsAgo(err);
		Debug.logv({secondsAgo});

		if(SubsystemLaunch.isFirstTime()) //then is first time, so indicate this error may be old
		{
			let agoStr = "";
			if(secondsAgo != -1)
			{
				const hours = Math.floor(secondsAgo / 3600);
				const minutes = Math.floor((secondsAgo % 3600) / 60);
				const secs = secondsAgo % 60;

				agoStr = ` <b>(${hours}h ${minutes}m ${secs}s ago)</b>`;
			}

			Debug.warn("Here is the <b>last error</b> that occurred " + agoStr +
				" for reference:\n\n" + err);
		}
		else if(secondsAgo == -1 || secondsAgo < 60 /* 1 minute */)
			Debug.err(err);
	}

	SubsystemLaunch.system.error = err;

	SubsystemLaunch.system.activeUserCount = DesktopContent.getXMLValue(req,"active_user_count") | 0;
	SubsystemLaunch.system.activeUserList = DesktopContent.getXMLValue(req,"active_user_list").split(',');

	SubsystemLaunch.system.lastRunLogEntry = DesktopContent.getXMLValue(req,"last_run_log_entry").substr(0,200); //max length 200
	if (!SubsystemLaunch.system.lastRunLogEntry || SubsystemLaunch.system.lastRunLogEntry == "") {
		SubsystemLaunch.system.lastRunLogEntry = "No user entry found";
		if(SubsystemLaunch.system.doRequireRunLogEntry)
			SubsystemLaunch.system.lastRunLogEntry += ", please enter one when starting the the next run.";
	}
	else
		SubsystemLaunch.system.lastRunLogEntry = decodeURIComponent(SubsystemLaunch.system.lastRunLogEntry) +
			(SubsystemLaunch.system.lastRunLogEntry.length == 200?"...":"");

	SubsystemLaunch.system.lastLogbookEntry = DesktopContent.getXMLValue(req,"last_logbook_entry").substr(0,200); //max length 200
	if(SubsystemLaunch.system.lastLogbookEntry == "")
		SubsystemLaunch.system.lastLogbookEntry = "No logbook entry found.";
	else
		SubsystemLaunch.system.lastLogbookEntry += (SubsystemLaunch.system.lastLogbookEntry.length == 200?"... (":" (") + DesktopContent.getXMLValue(req,"last_logbook_entry_time") + ")";

	SubsystemLaunch.system.lastSystemMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_system_message")).substr(0,200); //max length 200
	if(SubsystemLaunch.system.lastSystemMessage == "")
		SubsystemLaunch.system.lastSystemMessage = "No System Message found.";
	else
		SubsystemLaunch.system.lastSystemMessage += (SubsystemLaunch.system.lastLogbookEntry.length == 200?"... (":" (") + DesktopContent.getXMLValue(req,"last_system_message_time") + ")";

	SubsystemLaunch.system.logRolloverMode = decodeURIComponent(DesktopContent.getXMLValue(req,"stateMachineLogRollover"));

	SubsystemLaunch.system.consoleErrCount = "Console Err #: " + (DesktopContent.getXMLValue(req,"console_err_count") | 0);
	SubsystemLaunch.system.consoleWarnCount = "Console Warn #: " + (DesktopContent.getXMLValue(req,"console_warn_count") | 0);
	SubsystemLaunch.system.consoleInfoCount = "Console Info #: " + (DesktopContent.getXMLValue(req,"console_info_count") | 0);


	SubsystemLaunch.system.consoleErrMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_err_msg")).substr(0,500); //max length 200
	if(SubsystemLaunch.system.consoleErrMessage == "")
		SubsystemLaunch.system.consoleErrMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleErrMessage += (SubsystemLaunch.system.consoleErrMessage.length == 500?"... ":" ") + DesktopContent.getXMLValue(req,"last_console_err_msg_time") + "";

	SubsystemLaunch.system.consoleWarnMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_warn_msg")).substr(0,500); //max length 200
	if(SubsystemLaunch.system.consoleWarnMessage == "")
		SubsystemLaunch.system.consoleWarnMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleWarnMessage += (SubsystemLaunch.system.consoleWarnMessage.length == 500?"... ":" ") + DesktopContent.getXMLValue(req,"last_console_warn_msg_time") + "";

	SubsystemLaunch.system.consoleInfoMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_info_msg")).substr(0,200); //max length 200
	if(SubsystemLaunch.system.consoleInfoMessage == "")
		SubsystemLaunch.system.consoleInfoMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleInfoMessage += (SubsystemLaunch.system.consoleInfoMessage.length == 200?"... ":" ") + DesktopContent.getXMLValue(req,"last_console_info_msg_time") + "";


	SubsystemLaunch.system.consoleFirstErrMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"first_console_err_msg")).substr(0,200); //max length 200
	if(SubsystemLaunch.system.consoleFirstErrMessage == "")
		SubsystemLaunch.system.consoleFirstErrMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleFirstErrMessage += (SubsystemLaunch.system.consoleFirstErrMessage.length == 200?"... ":" ") + DesktopContent.getXMLValue(req,"first_console_err_msg_time") + "";

	SubsystemLaunch.system.consoleFirstWarnMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"first_console_warn_msg")).substr(0,200); //max length 200
	if(SubsystemLaunch.system.consoleFirstWarnMessage == "")
		SubsystemLaunch.system.consoleFirstWarnMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleFirstWarnMessage += (SubsystemLaunch.system.consoleFirstWarnMessage.length == 200?"... ":" ") + DesktopContent.getXMLValue(req,"first_console_warn_msg_time") + "";

	SubsystemLaunch.system.consoleFirstInfoMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"first_console_info_msg")).substr(0,200); //max length 200
	if(SubsystemLaunch.system.consoleFirstInfoMessage == "")
		SubsystemLaunch.system.consoleFirstInfoMessage = "No console err message found.";
	else
		SubsystemLaunch.system.consoleFirstInfoMessage += (SubsystemLaunch.system.consoleFirstInfoMessage.length == 200?"... ":" ") + DesktopContent.getXMLValue(req,"first_console_info_msg_time") + "";

	// Debug.log("system obj", SubsystemLaunch.system);

} //end SubsystemLaunch.extractSystemStatus()

//=====================================================================================
SubsystemLaunch.extractIteratorStatus = function (req) {
	SubsystemLaunch.iterator.activePlan = DesktopContent.getXMLValue(req,"active_plan");
	SubsystemLaunch.iterator.currentCommandIndex = (DesktopContent.getXMLValue(req,"current_command_index")|0) + 1;
	SubsystemLaunch.iterator.currentNumberOfCommands = (DesktopContent.getXMLValue(req,"current_number_of_commands")|0);
	SubsystemLaunch.iterator.currentCommandType = DesktopContent.getXMLValue(req,"current_command_type");
	SubsystemLaunch.iterator.currentCommandDuration = DesktopContent.getXMLValue(req,"current_command_duration")|0;
	SubsystemLaunch.iterator.currentCommandIteration = (DesktopContent.getXMLValue(req,"current_command_iteration")|0) + 1;
	SubsystemLaunch.iterator.activePlanStatus = DesktopContent.getXMLValue(req,"active_plan_status");

	SubsystemLaunch.iterator.genNumberOfRuns = DesktopContent.getXMLValue(req,"generated_number_of_runs")|0;
	SubsystemLaunch.iterator.genRunDuration = DesktopContent.getXMLValue(req,"generated_duration_of_runs")|0;

	var err = DesktopContent.getXMLValue(req,"error_message");
	if(err && err != "" && SubsystemLaunch.iterator.error != err)
	{
		//do not show if err is old
		let secondsAgo = SubsystemLaunch.extractErrorSecondsAgo(err);
		Debug.logv({secondsAgo});

		if(SubsystemLaunch.isFirstTime()) //then is first time, so indicate this error may be old
		{
			let agoStr = "";
			if(secondsAgo != -1)
			{
				const hours = Math.floor(secondsAgo / 3600);
				const minutes = Math.floor((secondsAgo % 3600) / 60);
				const secs = secondsAgo % 60;

				agoStr = ` <b>(${hours}h ${minutes}m ${secs}s ago)</b>`;
			}

			Debug.warn("Here is the <b>last error</b> that occurred " + agoStr +
				" for reference:\n\n" + err);
		}
		else if(secondsAgo == -1 || secondsAgo < 5*60 /* 5 minutes */)
			Debug.err(err);
	}

	SubsystemLaunch.iterator.error = err;

	// Debug.log("iterator obj", SubsystemLaunch.iterator);

} //end SubsystemLaunch.extractIteratorStatus()

//=====================================================================================
SubsystemLaunch.resetConsoleCounts = function (s) {
	Debug.log("SubsystemLaunch.resetConsoleCounts()", s);

	if(s == -1) //system console reset
		DesktopContent.popUpVerification(
			"Are you sure you want to reset the Console Error/Warn/Info counts and relatch first messages?",
			localReset,
			0,"#efeaea",0,"#770000");
	else //subsystem console reset
	{
		var targetSubsystem = SubsystemLaunch.subsystems[s].name;

		DesktopContent.popUpVerification(
			"Are you sure you want to reset the Subsystem '" +
			targetSubsystem +
			"' Console Error/Warn/Info counts and relatch first messages?",
			localSubsystemReset,
			0,"#efeaea",0,"#770000");
	}

	return;

	//============
	function localReset() {
		DesktopContent.XMLHttpRequest("Request?RequestType=resetConsoleCounts",
			"", //post data
			undefined, //request handler
			0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
			false /*doNoShowLoadingOverlay*/,
			true /*targetGatewaySupervisor*/);
	} //end localReset()

	//============
	function localSubsystemReset() {
		DesktopContent.XMLHttpRequest("Request?RequestType=commandRemoteSubsystem" +
			"&targetSubsystem=" + targetSubsystem +
			"&command=ResetConsoleCounts",
			"", //post data
			undefined, //request handler
			0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
			false /*doNoShowLoadingOverlay*/,
			true /*targetGatewaySupervisor*/);
	} //end localSubsystemReset()

} //end SubsystemLaunch.resetConsoleCounts()

//=====================================================================================
SubsystemLaunch.copyText = function (el) {
	const text = el.innerText;

	navigator.clipboard.writeText(text)
		.then(() => {
			Debug.log("Text copied to clipboard!",text);
			DesktopContent.popUpVerification(
				"Text copied!",0,
				0,"#efeaea",0,"#770000",
				0,0,0,0,0,0,0,0,
				true /* justDisplayAndTimeoutPopup */);
		})
		.catch(err => {
			Debug.err("Failed to copy: ", err);
		});
} //end SubsystemLaunch.copyText()
