


	//	Description of Smart Launch Functionality/Behavior:
	//	
	//		Checkboxes on left to select configuration subsystems to enable
	//		Giant RED button on right to (re)launch ots
	//		GREEN button on right to start ots run
	//
	//		Launch means:
	//			- enable associated contexts
	//			- save new context group, activate (do not alias)
	//			- save user active sessions
	//			- relaunch otsdaq normal mode
	//			- load active sessions
	//			- detect in GUI that system is back alive

//User note:
//	Users can define special launch context groupings by defining
//		global variables: SmartLaunch.subsystems and SmartLaunch.systemToContextMap. 
//	This is demonstrated in otsdaq_demo/UserWebGUI/html/SmartLaunch.html
//		
//	In short, subsystems comprise your configuration, and subsystem names map to
//		one or many context records that can be on/off as a group (activating/deactivating their segment of the full configuration).


//Smart Launch desktop icon from:
//	http://icons.iconarchive.com/icons/bokehlicia/captiva/256/rocket-icon.png


var SmartLaunch = SmartLaunch || {}; //define SmartLaunch namespace

if (typeof Debug == 'undefined')
	throw('ERROR: Debug is undefined! Must include Debug.js before SmartLaunch.js');
else if (typeof Globals == 'undefined')
    throw('ERROR: Globals is undefined! Must include Globals.js before SmartLaunch.js');

SmartLaunch.MENU_PRIMARY_COLOR = "rgb(220, 187, 165)";
SmartLaunch.MENU_SECONDARY_COLOR = "rgb(130, 51, 51)";
	
	
SmartLaunch.launcher; //this is THE SmartLaunch variable
SmartLaunch.doShowContexts = false; //default value for showing contexts or not
SmartLaunch.getConfigAliases = false; //if true, will show dropdown box of config aliases for user to select
SmartLaunch.configurationAlias = "defaultSystemAlias"; //for backwards compatibility, keep default

//	var _NAME_STRIPS 	= "Strip Telescope";
//	var _NAME_MWPC 		= "Wire Chambers";
//	var _NAME_NIMPLUS 	= "NIM+ Trigger/Coincidence Module";
SmartLaunch.subsystems = [];
//					   _NAME_STRIPS,
//					   _NAME_MWPC,
//					   _NAME_NIMPLUS
//					   ]; 
SmartLaunch.systemToContextMap = {};
//	SmartLaunch.systemToContextMap[_NAME_STRIPS] = [
//										 "StripTelescopeContext"
//										 ];
//	SmartLaunch.systemToContextMap[_NAME_MWPC] = [
//									   "WireChamberContext",
//									   "ARTDAQBoardReader0", 
//									   "ARTDAQEventBuilder0",
//									   "ARTDAQEventBuilder1",
//									   "ARTDAQAggregator0"
//									   ];
//	SmartLaunch.systemToContextMap[_NAME_NIMPLUS] = [
//										  "NimPlusContext"
//										  ];

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call create to create instance of a SmartLaunch
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
SmartLaunch.create = function() {


	//functions:			
	//
	//	init()
	//	createElements()
	//	redrawWindow()
	//	readEnabledSubsystems()
	//	getCurrentState()
	//		- localGetStateHandler()
	//	displayState()
	//
	//	this.launch()
	//		- localLaunch()
	//		- localSetSequenceOfRecords()
	//	this.gatewayLaunchOts()
	//		- localDelayedLaunch()
	//			-- localCountDown()
	//	this.run()
	//		- localStop()	
	//		- localRun()
	//
	//	this.toggleCheckboxDiv(i)
	//	this.handleCheckbox(c)
	

	
	
	//for display
	var _CHECKBOX_H = 40;
	var _CHECKBOX_MIN_W = 240;
	var _CHECKBOX_MAX_W = 540;
	var _LAUNCH_MIN_W = 525;
	var _MARGIN = 40;


	var _needEventListeners = true;

	var _subsetBasePath = "XDAQContextTable";

	var _systemStatusArray = [];
	var _contextRecords = [];
	var _configAliasesObj = {};

	

	//for run state
	var _state = "";
	var _inTransition = false;
	var _wasInTransition = false;
	var _timeInState = 0;
	var _transitionPercentComplete = 0;
	var _runNumber;
	var _transitionName = "";

	var _fsmName, _fsmWindowName;
	var _getStateTimer = 0;
	var _runFSMTimer = 0;

	var _running = false;
	var _runStatusDiv, _runConfigAliasDiv;
	
	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end variable declaration
	

	//=====================================================================================
	//init ~~
	function init() 
	{				
		var windowTooltip = "Welcome to the Smart Launch user interface. " +
			"Select which pieces of the configuration you want to enable, and then press the launch button!" +
			"\n\n" +
			"Once the pieces you want are enabled, press the run button!";	
		Debug.log("Smart Launch init ");
		DesktopContent.tooltip("Smart Launch", windowTooltip);
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

		var configAliasParameter = DesktopContent.getParameter(0,"defaultConfigAlias");
		if(configAliasParameter && configAliasParameter != "")
			SmartLaunch.configurationAlias = configAliasParameter;
		Debug.log("SmartLaunch.getConfigAliases",SmartLaunch.getConfigAliases);
		Debug.log("SmartLaunch.configurationAlias",SmartLaunch.configurationAlias);


		//get all needed info sequentially
		if(SmartLaunch.getConfigAliases)
			SmartLaunch.helperGetConfigurationAliases(localGetConfiguAliasesHandler);
		else //get all existing contexts only
			ConfigurationAPI.getSubsetRecords(
				_subsetBasePath,
				"",//filterList,
				localGetContextRecordsHandler
			);


		//get run state always
		window.clearTimeout(_getStateTimer);
		_getStateTimer = window.setTimeout(getCurrentState,1000); //in 1 sec
		
		return;
		

		//////////////////////////////
		function localGetConfiguAliasesHandler(aliasObj)
		{
			_configAliasesObj = aliasObj;
			Debug.logv({_configAliasesObj});

			//get all existing contexts
			ConfigurationAPI.getSubsetRecords(
				_subsetBasePath,
				"",//filterList,
				localGetContextRecordsHandler
			);

		} //end localGetContextRecordsHandler()

		//////////////////////////////
		function localGetContextRecordsHandler(records)
		{
			//extract context records
			console.log(records);
			_contextRecords = records;
			
			//proceed with rest of init
			createElements();

			if(_needEventListeners)
			{
				window.addEventListener("resize",redrawWindow);
				_needEventListeners = false;
			}

			//redrawWindow();
			readEnabledSubsystems();
		} //end localGetContextRecordsHandler()
				

	} //end init()

	//=====================================================================================
	//createElements ~~
	//	called initially to create checkbox and button elements
	function createElements()
	{
		Debug.log("createElements");


		//		<!-- body content populated by javascript -->
		//		<div id='content'>
		//			<div id='refreshLink'><a onclick='init()'>Refresh</a></div>			
		//				
		//			<div id='subsystemDiv'><div id='subsystemDivContainer'></div></div>
		//
		//			<a id='launchLink' onclick='SmartLaunch.launcher.launch()'>
		//				<div id='launchDiv'>Launch</div>
		//			</a>
		//			
		//			<a id='runLink' onclick='SmartLaunch.launcher.run()'>
		//				<div id='runDiv'>Run</div>
		//			</a>
		//			
		//			<div id='runStatusDiv' style='top:10px;/*default to 10px for case when someone else has lock*/'></div>
		//
		//			<div id='runConfigAliasDiv'><select></select></div>
		//		
		//		</div>
		
		var cel,el,al,sl;
		
		cel = document.getElementById("content");
		if(!cel)
		{
			cel = document.createElement("div");
			cel.setAttribute("id","content");
		}

		//clear all elements
		cel.innerHTML = "";
		
		
		{ //content div		
				
			
			//subsystem div
			sl = document.createElement("div");
			sl.setAttribute("id","subsystemDiv");
			el = document.createElement("div");
			el.setAttribute("id","subsystemDivContainer");
			sl.appendChild(el);		
			cel.appendChild(sl);
			
			
			
			//launch link
			al = document.createElement("a");
			al.setAttribute("id","launchLink");
			al.onclick = function()
					{
				Debug.log("clicked launch");
				SmartLaunch.launcher.launch();
					};
			
			el = document.createElement("div");
			el.setAttribute("id","launchDiv");
			el.innerHTML = "Launch";
			al.appendChild(el);
			cel.appendChild(al);	
			
			//run link
			al = document.createElement("a");
			al.setAttribute("id","runLink");
			al.onclick = function()
					{
				Debug.log("clicked run");
				SmartLaunch.launcher.run();
					};
			
			el = document.createElement("div");
			el.setAttribute("id","runDiv");
			el.innerHTML = "Run";
			al.appendChild(el);
			cel.appendChild(al);
			
			//run status
			sl = document.createElement("div");
			sl.setAttribute("id","runStatusDiv");
			sl.style.top = "10px"; //default to 10px for case when someone else has lock
			cel.appendChild(sl);

			//run config alias select
			sl = document.createElement("div");
			sl.setAttribute("id","runConfigAliasDiv");
			cel.appendChild(sl);
			
		} //end content div		
		
		
		
		
		
		
		document.body.appendChild(cel);
		

	} //end createElements()

	//=====================================================================================
	//readEnabledSubsystems ~~
	//	call redrawWindow when complete
	function readEnabledSubsystems()
	{
		try
		{
			Debug.log("readEnabledSubsystems");
	
			var recordsArray = [];
	
			for(var i=0; i<SmartLaunch.subsystems.length; ++i)
			{ 
				for(var j=0; j<SmartLaunch.systemToContextMap[SmartLaunch.subsystems[i]].length; ++j)
					recordsArray.push(SmartLaunch.systemToContextMap[SmartLaunch.subsystems[i]][j]);
			}
			if(SmartLaunch.doShowContexts)
				for(var i=0; i<_contextRecords.length; ++i)
					recordsArray.push(_contextRecords[i]);
			
			console.log("recordsArray",recordsArray);
	
			ConfigurationAPI.getFieldValuesForRecords(
					_subsetBasePath,
					recordsArray,
					["Status"],
					localStatusForRecordsHandler
			);
			return;
		}
		catch(e)
		{
			Debug.log("There was error reading the status of the configuration subsystems (" +
					"were the subsystem variables setup properly?):[" + DesktopContent.getExceptionLineNumber(e) + "]: " + 
					e, Debug.HIGH_PRIORITY);
			return;
		}
	
		//////////////////////////////
		function localStatusForRecordsHandler(recFieldValues)
		{
			Debug.log("localStatusForRecordsHandler value-length=" + recFieldValues.length)
								var statusArray = []; //clear
			for(var i in recFieldValues)				
				statusArray.push(
						recFieldValues[i].fieldValue == "On"?true:false);//recFieldValues[i].fieldUID .. recFieldValues[i].fieldPath + ": " +

			console.log("statusArray",statusArray);

			_systemStatusArray = []; //clear
			var k=0;
			for(var i=0; i<SmartLaunch.subsystems.length; ++i)
			{ 
				_systemStatusArray.push(true);
				for(var j=0; j<SmartLaunch.systemToContextMap[SmartLaunch.subsystems[i]].length; ++j,++k)
					if(!statusArray[k]) //found one off exception
						_systemStatusArray[i] = false; //so consider entire subsystem off
			}
			if(SmartLaunch.doShowContexts)
				for(var i=0; i<_contextRecords.length; ++i, ++k)
					_systemStatusArray.push(statusArray[k]);

			console.log("_systemStatusArray",_systemStatusArray);

			redrawWindow();

		} //end localStatusForRecordsHandler()
		

	} //end readEnabledSubsystems()


	//=====================================================================================
	//redrawWindow ~~
	//	called when page is resized
	function redrawWindow()
	{
		//adjust link divs to proper size
		//	use ratio of new-size/original-size to determine proper size

		var w = window.innerWidth | 0;
		var h = window.innerHeight | 0;	  

		if(w < _LAUNCH_MIN_W)
			w = _LAUNCH_MIN_W;
		if(h < _LAUNCH_MIN_W)
			h = _LAUNCH_MIN_W;

		Debug.log("redrawWindow to " + w + " - " + h);	

		var sdiv = document.getElementById("subsystemDiv");
		var ldiv = document.getElementById("launchDiv");
		var rdiv = document.getElementById("runDiv");
		var runStatusDiv, runConfigAliasDiv;
		_runStatusDiv = runStatusDiv = document.getElementById("runStatusDiv");
		_runConfigAliasDiv = runConfigAliasDiv = document.getElementById("runConfigAliasDiv");

		var chkH = _CHECKBOX_H;
		var chkW = (w/3)|0; 
		if(chkW < _CHECKBOX_MIN_W) chkW = _CHECKBOX_MIN_W;
		if(chkW > _CHECKBOX_MAX_W) chkW = _CHECKBOX_MAX_W;
		
		var sdivH = 66 + chkH*SmartLaunch.subsystems.length; //header + chkboxes
		
		if(SmartLaunch.doShowContexts)
		{
			sdivH += 66 + chkH*_contextRecords.length;	//header + chkboxes 	
		}
		if(sdivH > 2/3*h)
			sdivH = 2/3*h; //clip height
		if(sdivH < 100)
			sdivH = 100; //clip min
		
		var sdivW = chkW;
		
		var sdivX = _MARGIN;
		var sdivY = (h-sdivH)/2;
		if(sdivY < _MARGIN)
			sdivY = _MARGIN;

//		var ldivX = _MARGIN + chkW;
//		var ldivSz = h;		
//		if(ldivSz > w - ldivX - _MARGIN*3) //pick min of w/h
//			ldivSz = w - ldivX - _MARGIN*3;
//		if(ldivSz < 120) //clip min
//			ldivSz = 120; 
//		var ldivY = (h-ldivSz)/2;
//		
//		var rdivX = _MARGIN + chkW;
//		var rdivSz = ldivSz;
//		var rdivY = ldivY + ldivSz;
//		var rratio = 180/300;

		var ldivX = _MARGIN + chkW;
		var ldivSz = h/2;		
		if(ldivSz > w - ldivX - _MARGIN*3) //pick min of w/h
			ldivSz = w - ldivX - _MARGIN*3;
		ldivSz *= 0.9;
		var ldivY = (h-ldivSz)/2 - ldivSz/2;
		var lratio = 180/300;

		var rdivX = _MARGIN + chkW;
		var rdivSz = ldivSz;
		var rdivY = ldivY + ldivSz;
		var rratio = 180/300;


		//draw checkboxes
		{			
			var str = "";
			var statusIndex = 0;
			
			var hideableSubsystems = SmartLaunch.subsystems.length && SmartLaunch.doShowContexts;
			var hideableContexts = SmartLaunch.subsystems.length;
			
			if(SmartLaunch.subsystems.length)
			{			
				if(hideableSubsystems)
					str += "<a onclick='SmartLaunch.launcher.toggleCheckboxDiv(0);' title='Hide/Show Subsystems'>";
				str += "<h3>Subsystems</h3>";
				if(hideableSubsystems)
					str += "</a>";
				
				str += "<div id='ssCheckboxDiv'>";
				for(var i=0;i<SmartLaunch.subsystems.length;++i,++statusIndex)
				{
					str += "<div class='ssCheckbox' style='height:" + chkH + "px;" +
							"' >";
					str += "<div class='pretty p-icon p-round p-smooth' onclick='SmartLaunch.launcher.handleCheckbox(" + 
							statusIndex + ");' >"; //p-smooth for slow transition
					str += " <input type='checkbox' class='subsystemCheckboxes' " +
							(_systemStatusArray[statusIndex]?"checked":"") +
							"/>";
					str += "<div class='state p-success'>";
					str += "<i class='icon mdi mdi-check'></i>";
					str += "<label>" + SmartLaunch.subsystems[i] + "</label>";
					str += "</div>";
					str += "</div>";
					str += "</div>";
					str += "<div id='clearDiv'></div>";
				}
				str += "</div>";
			}
			else if(!SmartLaunch.doShowContexts)
			{
				str += "No subsystem configuration definition found.";
			}
			

			if(SmartLaunch.doShowContexts)
			{
				if(hideableContexts)
					str += "<a onclick='SmartLaunch.launcher.toggleCheckboxDiv(1);' title='Hide/Show Contexts'>";
				str += "<h3>Individual Contexts</h3>";
				if(hideableContexts)
					str += "</a>";
				
				if(!_contextRecords.length)
					str += "No contexts found.";
					

				str += "<div id='ctxCheckboxDiv'>";
				for(var i=0; i<_contextRecords.length; ++i,++statusIndex)
				{
					str += "<div class='ssCheckbox' style='height:" + chkH + "px;" +
							"' >";
					str += "<div class='pretty p-icon p-round p-smooth' onclick='SmartLaunch.launcher.handleCheckbox(" + 
							statusIndex + ");' >"; //p-smooth for slow transition
					str += " <input type='checkbox' class='subsystemCheckboxes' " +
							(_systemStatusArray[statusIndex]?"checked":"") +
							"/>";
					str += "<div class='state p-success'>";
					str += "<i class='icon mdi mdi-check'></i>";
					str += "<label>" + _contextRecords[i] + "</label>";
					str += "</div>";
					str += "</div>";
					str += "</div>";
					str += "<div id='clearDiv'></div>";				
				}
				str += "</div>"
			}


			sdiv.style.left = (sdivX-20) + "px";
			sdiv.style.top = sdivY + "px";
			sdiv.style.height = sdivH + "px";
			sdiv.style.width = sdivW + "px";		
			sdiv.style.display = "block"; 
			

			sdiv = document.getElementById("subsystemDivContainer");
			sdiv.style.left = (sdivX-20) + "px";
			sdiv.style.top = sdivY + "px";
			sdiv.style.height = sdivH + "px";
			sdiv.style.width = sdivW + "px";
			sdiv.innerHTML = "";
			sdiv.innerHTML = str;	
			sdiv.style.display = "block"; 
		}		

		//draw launch button
		{			

//			ldiv.style.left = (ldivX + (w - ldivX - _MARGIN*2 - ldivSz)/2) + "px";
//			ldiv.style.top = (ldivY+((ldivSz-ldivSz*200/300)/2)) + "px";
//			
//			ldiv.style.width = ldivSz + "px";
//			var fontSize = ldivSz/10;
//			if(fontSize < 30) fontSize = 30;
//			ldiv.style.fontSize = (fontSize) + "px";
//			ldiv.style.paddingTop = (ldivSz*200/300/2 - (fontSize+6)/2) + "px"; //ratio of size minus font size
//			ldiv.style.paddingBottom = (ldivSz*200/300/2- (fontSize+6)/2) + "px";
//			ldiv.style.borderRadius = (ldivSz*300/100) + "px/" + (ldivSz*200/100) + "px";
//			
//			ldiv.style.display = "block";
			ldiv.style.left = (ldivX + (w - ldivX - _MARGIN*2 - ldivSz)/2) + "px";
			ldiv.style.top = (ldivY+((ldivSz-ldivSz*lratio)/2)) + "px";
			//ldiv.style.height = (ldivSz*200/300) + "px";
			ldiv.style.width = ldivSz + "px";
			ldiv.style.paddingTop = (ldivSz*lratio/2 - 36/2) + "px"; //ratio of size minus font size
			ldiv.style.paddingBottom = (ldivSz*lratio/2- 36/2) + "px";
			//ldiv.style.paddingLeft = (ldivSz/2) + "px";
			//ldiv.style.paddingRight = (ldivSz/2) + "px";

			ldiv.style.borderRadius = ldivSz + "px/" + (ldivSz*200/300) + "px";
			ldiv.style.fontSize = ldivSz/10 + "px";

			ldiv.style.display = "block"; 
		}


		//draw run button
		{			
			var rTop = (rdivY+((rdivSz-rdivSz*rratio)/2));
			rdiv.style.left = (rdivX + (w - rdivX - _MARGIN*2 - rdivSz)/2) + "px";
			rdiv.style.top = rTop + "px";
			//rdiv.style.height = (rdivSz*200/300) + "px";
			rdiv.style.width = rdivSz + "px";
			rdiv.style.paddingTop = (rdivSz*rratio/2 - 36/2) + "px"; //ratio of size minus font size
			rdiv.style.paddingBottom = (rdivSz*rratio/2- 36/2) + "px";
			//rdiv.style.paddingLeft = (rdivSz/2) + "px";
			//rdiv.style.paddingRight = (rdivSz/2) + "px";
			
			rdiv.style.borderRadius = rdivSz + "px/" + (rdivSz*200/300) + "px";
			rdiv.style.fontSize = rdivSz/10 + "px";
			
			rdiv.style.display = "block"; 
			//ldiv.innerHTML = str;		
			
			runStatusDiv.style.left = (rdivX + _MARGIN + (w - rdivX - _MARGIN*2 - rdivSz)/2) + "px";
			runStatusDiv.style.top = (h/2 - 50) + "px";
			runStatusDiv.style.width = (rdivSz + _MARGIN) + "px";
			runStatusDiv.style.fontSize = rdivSz/15 + "px";

			//draw config alias select box
			if(SmartLaunch.getConfigAliases)
			{
				runConfigAliasDiv.style.left = (rdivX + _MARGIN + (w - rdivX - _MARGIN*4 - rdivSz)/2) + "px";
				runConfigAliasDiv.style.top = (rTop + _MARGIN/2 + rdivSz*200/300) + "px";
				runConfigAliasDiv.style.width = (rdivSz + _MARGIN) + "px";
				runConfigAliasDiv.style.fontSize = rdivSz/15 + "px";

				var str = "";
				str += "Configuration Alias: <select id='runConfigAliasSelect' style='font-family: \"Comfortaa\", arial; padding: 2px; font-size: 16px;'>";
				
				for(alias in _configAliasesObj.aliasMap)
				{
					str += "<option value='" + alias + "' ";

					//otherwise, as priority, choose last alias (the first init)
					if(_configAliasesObj.lastUsedAlias == alias)
						str += "selected";
					
					str += ">" + alias + "</option>";
				} //end alias map loop
				runConfigAliasDiv.innerHTML = str;
				runConfigAliasDiv.style.display = "block";
			} //end draw config alias select box
		} //end draw run buton

		
	} //end redrawWindow()
	

	//=====================================================================================
	//getCurrentState ~~
	function getCurrentState() 
	{
		window.clearTimeout(_getStateTimer);
		
		DesktopContent.XMLHttpRequest("Request?RequestType=getCurrentState" + 
				"&fsmName=" + _fsmName, 
				"", 
				localGetStateHandler,/*returnHandler*/
				0 /*reqParam*/, 				
				0 /*progressHandler*/,
				0 /*callHandlerOnErr*/,
				true /*doNotShowLoadingOverlay*/, 
				true /*targetGatewaySupervisor*/, 
				true /*ignoreSystemBlock*/);

		//===========
		function localGetStateHandler(req,id,err)
		{
			if(!req) //error! stop handler
			{            		
				Debug.log("Error: " + err, Debug.HIGH_PRIORITY); 
				return;
			}            	
			
			
			_state = DesktopContent.getXMLValue(req,"current_state");
			_inTransition = DesktopContent.getXMLValue(req,"in_transition") == "1";
			_timeInState = DesktopContent.getXMLValue(req,"time_in_state") | 0;
			_runNumber = DesktopContent.getXMLValue(req,"run_number");			
			_transitionPercentComplete = DesktopContent.getXMLValue(req,"transition_progress") | 0; 
					
			if(_transitionPercentComplete > 100) 
			{
				//Debug.log("???" + _transitionPercentComplete);
				_transitionPercentComplete = 100;
			}
			
			
			//Debug.log("localGetStateHandler: " + _state + " -- " + _inTransition + 
			//		" -- t" + _timeInState + " " + _transitionPercentComplete + "%");

			
			
			displayState();
			
			
			//on success, get state again
			window.clearTimeout(_getStateTimer);
			_getStateTimer = window.setTimeout(getCurrentState,1000); //in 1 sec
		}
	} //getCurrentState


	//=====================================================================================
	//displayState ~~
	function displayState() 
	{
		//Debug.log("displayState");
		
		//update display

		//indicate running if detected
		if(_state == "Running")
		{
			if(!_running)
			{
				_running = true;
				document.getElementById("runDiv").innerHTML = "Stop";
			}
		}
		else //not running
		{
			if(_running)
			{
				_running = false;
				document.getElementById("runDiv").innerHTML = "Run";
			}
		}	
		

		let str = "";
		str += "<table cellspacing='0' cellpadding='0'>";

		//current state display
		if(_inTransition)
			str += "<tr><td style='font-weight: bold; padding-right:20px;'>Transition:</td><td>" + 
				_transitionName + "</td></tr>";
		else
			str += "<tr><td style='font-weight: bold; padding-right:20px;'>Current State:</td><td>" + 
				_state + "</td></tr>";
				
		

		//current run number display
		if(//_state == "Running" && 
				_runNumber) 
		{
			//extract run number components							
			let i = _runNumber.lastIndexOf(' ');
			if(i >= 0)
			{
				let hdr = _runNumber.substr(0,i);
				let num = _runNumber.substr(i+1);
				stateStr = "Running <br>&nbsp;&nbsp;&nbsp;&nbsp;" + _runNumber;
				str += "<tr><td style='font-weight: bold; padding-right:20px;'>" + 
						hdr + "</td><td>" + 
						num + "</td></tr>";
			}
		}

		

		//transitioning display
		let progressStr = "";
		if(_inTransition)
		{
			progressStr = _transitionPercentComplete + " %";

			str += "<tr><td style='font-weight: bold; padding-right:20px;'>Progress:</td><td>" +  
					progressStr + "</td></tr>";

			if(!_wasInTransition)
				_wasInTransition = true;					
		}
		else if(_wasInTransition)
		{
			//show 100% once to show some display
			_wasInTransition = false;
			progressStr = 100 + " %";

			str += "<tr><td style='font-weight: bold; padding-right:20px;'>Transitioning:</td><td>" +  
					progressStr + "</td></tr>";
		}
		else 
		{
			//time in state display				
			let tstr = "";
			var hours = (_timeInState/60.0/60.0)|0;
			var mins = ((_timeInState%(60*60))/60.0)|0;
			var secs = _timeInState%60;

			tstr += hours + ":";
			if(mins < 10)	tstr += "0"; //keep to 2 digits
			tstr += mins + ":";
			if(secs < 10)	tstr += "0"; //keep to 2 digits
			tstr += secs ;
			
			str += "<tr><td style='font-weight: bold; padding-right:20px;'>Time-in-State:</td><td>" + tstr + "</td></tr>";
		}

		try //in case no display
		{
			_runStatusDiv.innerHTML = str;
	
			_runStatusDiv.style.display = "block";
		}
		catch(e) {console.log(":[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e);}
	}	//end displayState()
	
	//=====================================================================================
	//launch ~~
	this.launch = function()
	{
		Debug.log("launch");
		DesktopContent.popUpVerification( 
				"Are you sure you want to relaunch otsdaq?",
				localLaunch,
				0,"#efeaea",0,"#770000");

		//============
		function localLaunch()
		{
			Debug.log("localLaunch");

			var checkboxes = document.getElementsByClassName('subsystemCheckboxes'); 
			console.log("checkboxes",checkboxes);
			var checkedArray = [];
			for(var i=0;i<checkboxes.length;++i)
				checkedArray.push(checkboxes[i].checked);
			console.log("checkedArray",checkedArray);

			var recordsArray = [];
			var valuesArray = [];
			
			//assemble records array
			
			if(SmartLaunch.doShowContexts)
			{
				//just use context checkbox settings
				for(var i=0; i<_contextRecords.length; ++i)
				{					
					recordsArray.push(_contextRecords[i]);
					valuesArray.push(checkedArray[SmartLaunch.subsystems.length+i]?
							"1":"0");
				}
			}
			else
			{
				//extract context settings from system to context map
				for(var i=0; i<SmartLaunch.subsystems.length; ++i)
				{ 
					for(var j=0; j<SmartLaunch.systemToContextMap[SmartLaunch.subsystems[i]].length; ++j)
					{
						recordsArray.push(SmartLaunch.systemToContextMap[SmartLaunch.subsystems[i]][j]);
						valuesArray.push(checkedArray[i]?"1":"0");
	
					}
				}
			}
			console.log("recordsArray",recordsArray);
			console.log("valuesArray",valuesArray);

			var recordIndex = 0;
			var localModifiedTables = undefined;
			//sequentially send request for each record until done
			localSetSequenceOfRecords();

			//===========================
			function localSetSequenceOfRecords()
			{
				ConfigurationAPI.setFieldValuesForRecords(
						_subsetBasePath,
						recordsArray[recordIndex],
						"Status", //fieldArr
						valuesArray[recordIndex], //valueArr
						function(modifiedTables)
						{
					Debug.log("recordIndex = " + recordIndex);
					
					if(modifiedTables.length == 0)
					{
						Debug.log("Something went very wrong. Notify administrators.",
								Debug.HIGH_PRIORITY);
						return;					
					}
					
					++recordIndex;
					if(recordIndex == recordsArray.length)
					{
						Debug.log("Done with sequence.");

						//proceed to save (quietly) tables, groups, aliases
						ConfigurationAPI.saveModifiedTables(modifiedTables,
								/////////////////////
								function(savedTables, savedGroups, savedAliases)
								{
							if(!savedTables.length)
							{
								Debug.log("Something went very wrong. Notify administrators.",
										Debug.HIGH_PRIORITY);
								return;					
							}

							Debug.log("Successfully applied subsystem selections!", Debug.INFO_PRIORITY);


							//relaunch
							Debug.log("Relaunching ots...");
							SmartLaunch.launcher.gatewayLaunchOts();


								}); //end saveModifiedTables handler
						return;
					}

					console.log("setFieldValuesForRecords modifiedTables",modifiedTables);
					localModifiedTables = modifiedTables;
					localSetSequenceOfRecords();

						} //end setFieldValuesForRecords handler
				,localModifiedTables);
			} //end localSetSequenceOfRecords()
		}
	} // end launch()

	//=====================================================================================
	//gatewayLaunchOts ~~
	this.gatewayLaunchOts = function() 
	{
		Debug.log("Relaunching otsdaq!",Debug.INFO_PRIORITY);

		//block checks
		window.clearTimeout(_getStateTimer);
		
		//start blackout
		DesktopContent.systemBlackout(true);
		//DesktopContent._blockSystemCheckMailbox.innerHTML = "1";
		window.setTimeout(localDelayedLaunch,1000); //gaurantee blackout starts
		//now in all future requests must ignoreSystemBlock

		//===========
		function localDelayedLaunch()
		{
			DesktopContent.XMLHttpRequest("Request?" + 
					"RequestType=gatewayLaunchOTS", //end get data 
					"", //end post data
					function(req) //start handler
					{
				Debug.log("gatewayLaunchOts handler ");


				var countDown = 10;
				localCountDown();
				//=================
				function localCountDown()
				{
					Debug.log("Waiting " + countDown + " seconds for startup sequence...",
							Debug.INFO_PRIORITY);

					window.setTimeout(function() {
						Debug.log("localCountDown handler ");
						--countDown;
						if(countDown == 0)
						{
							//end blackout
							DesktopContent.systemBlackout(false);
							//DesktopContent._blockSystemCheckMailbox.innerHTML = "";
							init();
							Debug.log("And we are back!",Debug.INFO_PRIORITY);
							return;
						}
						localCountDown();
					}, //end blackout-end handler 
					1000/*ms*/);
				}// end localCountDown

					}, //end gatewayLaunchOTS req handler
					0, //handler param
					0,0,false, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
					true /*targetGatewaySupervisor*/, true /*ignoreSystemBlock*/);
		} // end localDelayedLaunch()
		
	} //end gatewayLaunchOts()


	//=====================================================================================
	//run ~~
	this.run = function()
	{
		Debug.log("run");

		var timeoutCount = 0; //used to detect taking too long
		var operativeWord = "starting";
		var lastState = "";

		if(_running)
		{
			DesktopContent.popUpVerification( 
					"Are you sure you want to stop the run?",
					localStop,
					0,"#efeaea",0,"#770000");

			//===========
			function localStop()
			{
				Debug.log("localStop");
				//just change operative word and run (to stop)
				operativeWord = "stopping";
				localRun();
			}
			return;
		}

		DesktopContent.popUpVerification( 
				"Are you sure you want to start a run?",
				localRun,
				0,"#efeaea",0,"#770000");

		//===========
		function localRun()
		{
			Debug.log("localRun");

			window.clearTimeout(_runFSMTimer);

			++timeoutCount;			
			if(timeoutCount > 60) //if it has been one minute, too long
			{
				Debug.log("Timeout reached! Giving up on " + operativeWord + " the run. Check the App Status web app for more details.", Debug.HIGH_PRIORITY);
				return;
			}

			if(_inTransition) //wait
			{
				window.clearTimeout(_getStateTimer);
				_getStateTimer = window.setTimeout(getCurrentState,1000); //in 1 sec

				window.clearTimeout(_runFSMTimer);
				_runFSMTimer = window.setTimeout(localRun,1000); //wait a sec
				return;
			}

			if(lastState == _state)
			{
				Debug.log("State machine is not progressing! Stuck in '" + 
						_state + ".' Giving up on " + operativeWord + " the run. Check the App Status web app for more details.", Debug.HIGH_PRIORITY);
				return;
			}

			lastState = _state; 

			let transitionPostData = "";
			//keep transitioning to Run state
			if(_state == "Initial")
			{
				_transitionName = "Initialize";
			}
			else if(_state == "Failed")
			{
				if(timeoutCount > 1)
				{
					//if localRun activity caused failure, give up
					Debug.log("Fault encountered! Giving up on " + operativeWord + " the run. Check the App Status web app for more details.", Debug.HIGH_PRIORITY);
					return;
				}
				_transitionName = "Halt";
			}
			else if(_state == "Halted")
			{
				_transitionName = "Configure";

				if(SmartLaunch.getConfigAliases)
				{
					var el = document.getElementById("runConfigAliasSelect");
					if(el)
						SmartLaunch.configurationAlias = el.value;
				}

				Debug.log(_transitionName,"SmartLaunch.getConfigAliases",SmartLaunch.getConfigAliases);
				Debug.log(_transitionName,"SmartLaunch.configurationAlias",SmartLaunch.configurationAlias);

				//Note: User level could get system alias from somewhere (e.g. dropdown box, first alias in list, or icon parameter)
				transitionPostData = "ConfigurationAlias=" + SmartLaunch.configurationAlias;					
			}			
			else if(_state == "Configured")
			{
				if(operativeWord == "stopping")
				{
					//done!
					Debug.log("<i>otsdaq</i> has now Stopped! " + 
							_runNumber + ".", Debug.INFO_PRIORITY);
					return;				
				}

				_transitionName = "Start";
			}
			else if(_state == "Paused")
			{
				_transitionName = "Start";	
			}
			else if(_state == "Running")
			{
				if(operativeWord == "stopping")
				{
					_transitionName = "Stop";					
				}
				else //starting
				{				
					//done!
					Debug.log("<i>otsdaq</i> is now Running! " + 
							_runNumber + ".", Debug.INFO_PRIORITY);
					return;
				}
			}
			else
			{
				Debug.log("Unknown action for current state '" + _state + "'..." + 
						"Giving up on " + operativeWord + " the run. Check the App Status web app for more details.", Debug.HIGH_PRIORITY);
				return;
			}

			_inTransition = true;
			_transitionPercentComplete = 0;

			displayState();

			Debug.log("_transitionName = " + _transitionName + 
					" transitionPostData = " + transitionPostData);		

			DesktopContent.XMLHttpRequest("StateMachineXgiHandler?StateMachine=" + 
					_transitionName + 
					"&fsmName=" + _fsmName + 
					"&fsmWindowName=" + _fsmWindowName, 
					transitionPostData, 
					//===========
					function(req)
					{

				var success = DesktopContent.getXMLValue(req,"state_tranisition_attempted") == "1";
				if(!success) 
				{
					var err = DesktopContent.getXMLValue(req,"state_tranisition_attempted_err");
					if(err)
						Debug.log(err,Debug.HIGH_PRIORITY);
					Debug.log("Server indicated failure to attempt state transition. " + 
							"Giving up on " + operativeWord + " the run. Check the App Status web app for more details.",Debug.HIGH_PRIORITY);
					return;
				}

				//on success continue..
				window.clearTimeout(_runFSMTimer);
				_runFSMTimer = window.setTimeout(localRun,3000); //wait 3 seconds before doing anything
					},	 // end handler				
					0, //handler param				
					0,0,true, //progressHandler, callHandlerOnErr, doNotShowLoadingOverlay
					true /*targetGatewaySupervisor*/);

		}

	} //end run()

	//=====================================================================================
	//toggleCheckboxDiv(i) ~~
	this.toggleCheckboxDiv = function(i)
	{
		Debug.log("toggleCheckboxDiv(i) " + i);
		
		var el;
		if(i == 0) //toggle subsystems
		{
			el = document.getElementById("ssCheckboxDiv");
			el.style.display = (el.style.display == "none")?"block":"none";
		}
		else if(i == 1) //toggle contextx
		{
			el = document.getElementById("ctxCheckboxDiv");
			el.style.display = (el.style.display == "none")?"block":"none";
		}	
		else throw("Invalid index checkbox div " + i);
	} //end toggleCheckboxDiv()
	
	//=====================================================================================
	//handleCheckbox(i) ~~
	this.handleCheckbox = function(c)
	{
		Debug.log("handleCheckbox(c) " + c);

		var checkboxes = document.getElementsByClassName('subsystemCheckboxes'); 
		console.log("checkboxes",checkboxes);
		var checkedArray = [];
		for(var i=0;i<checkboxes.length;++i)
			checkedArray.push(checkboxes[i].checked);
		console.log("checkedArray",checkedArray);

		Debug.log("set to " + checkedArray[c]);
		
		//create a context map
		var contextEnabledMap = {}; //map to [enabled, index]
		for(var i=0; i<_contextRecords.length; ++i)
			contextEnabledMap[_contextRecords[i]] = [checkedArray[SmartLaunch.subsystems.length+i],
													 SmartLaunch.subsystems.length+i];
				
		//update for each context that was just affected
		if(c < SmartLaunch.subsystems.length)
		{
			//dealing with a subsystem
			for(var j=0; j<SmartLaunch.systemToContextMap[SmartLaunch.subsystems[c]].length; ++j)
			{
				//update map
				contextEnabledMap[ //context name
								  SmartLaunch.systemToContextMap[SmartLaunch.subsystems[c]][j]
																 ][0] = checkedArray[c]; //set to checked value
				//and set checkbox
				checkboxes[contextEnabledMap[ //context name
											  SmartLaunch.systemToContextMap[SmartLaunch.subsystems[c]][j]
																			 ][1]].checked = checkedArray[c];
			}
		}
		else
		{
			//dealing with a context
			
			//update map			
			contextEnabledMap[_contextRecords[c - SmartLaunch.subsystems.length]][0] = checkedArray[c]; //set to checked value			
														  
		}
		console.log("contextEnabledMap",contextEnabledMap);
		
		
		//update all subsystems based on this change
		for(var i=0;i<SmartLaunch.subsystems.length;++i)
		{
			if(i==c) continue; //skip box that was changed

			var enabled = true;
			//if any member contexts are disabled then disable subsystem
			for(var j=0; j<SmartLaunch.systemToContextMap[SmartLaunch.subsystems[i]].length; ++j)
			{
				if(!contextEnabledMap[
									 SmartLaunch.systemToContextMap[SmartLaunch.subsystems[i]][j]][0])
				{
					enabled = false;
					break;
				}
			}
			
			//set checkbox
			checkboxes[i].checked = enabled;			
		}
		
		
	} //end handleCheckbox()

	//=====================================================================================
	//getFsmName() ~~
	this.getFsmName = function() { Debug.logv({_fsmName}); return _fsmName; }


	
	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end 'member' function declaration

	SmartLaunch.launcher = this; 
	Debug.log("SmartLaunch.launcher constructed");

	init();
	Debug.log("SmartLaunch.launcher initialized");
} //end create() SmartLaunch instance



//=====================================================================================     
SmartLaunch.helperGetConfigurationAliases = function(returnHandler)
{
	Debug.log("SmartLaunch.helperGetConfigurationAliases()");

	DesktopContent.XMLHttpRequest("Request?RequestType=getAliasList" +
		"&fsmName=" + SmartLaunch.launcher.getFsmName(), "", 
		function(req) 
		{
			Debug.log("getAliasList handler()");

			//get all system aliases and put in drop-down
			var aliasArr = req.responseXML.getElementsByTagName("config_alias"); 
			var aliasGroupArr = req.responseXML.getElementsByTagName("config_key");
			var aliasGroupCommentArr = req.responseXML.getElementsByTagName("config_comment");
			var aliasCommentArr = req.responseXML.getElementsByTagName("config_alias_comment");                    
			var aliasAuthorArr = req.responseXML.getElementsByTagName("config_author");
			var aliasCreateTimeArr = req.responseXML.getElementsByTagName("config_create_time");
			
			var userLastConfigAlias = 
					DesktopContent.getXMLValue(req,"UserLastConfigAlias");
					
			//take last configured alias, if user has not selected anything yet
			if(!userLastConfigAlias) userLastConfigAlias = "";
			
			var aliasTranslationMap = {};
			var aliasTranslationMetaDataMap = {};
			var alias;
			for(var i=0;i<aliasArr.length;++i) 
			{                            
				alias = aliasArr[i].getAttribute('value');

				//require meta information for a 'good' alias
				if(!aliasCommentArr[i] || !aliasCreateTimeArr[i]) 
				{
					Debug.err("Configuration alias '" + alias + "' has an illegal group translation or is missing meta data information. Please delete the alias or fix the translation in your active Backbone group.");
					continue;
				}

				aliasTranslationMap[alias] = aliasGroupArr[i].getAttribute('value');
				
				if(aliasCommentArr[i])
					aliasTranslationMetaDataMap[alias] = [
						aliasCommentArr[i].getAttribute('value'),
						aliasAuthorArr[i].getAttribute('value'),
						aliasCreateTimeArr[i].getAttribute('value'),
						aliasGroupCommentArr[i].getAttribute('value')
						];
					
			} //end primary alias structure creation loop
			
			if(returnHandler)
				returnHandler({
						"aliasMap" : aliasTranslationMap,
						"aliasMetaDataMap" : aliasTranslationMetaDataMap,
						"lastUsedAlias" : userLastConfigAlias 
					});

		}, //end request handler
		0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/, 
		true /*doNoShowLoadingOverlay*/,
		true /*targetGatewaySupervisor*/);


} //end SmartLaunch.helperGetConfigurationAliases()







