


	//	Description of Subsystem Squares Functionality/Behavior:
	//
	//		One square for primary gateway and each secondary subsystem
	//		For each square, passive view of status and click to go to Landing Page
	//			Gateway Landing Page is Subsystem Squares
	//

//User note:
//	This is demonstrated in otsdaq_demo/UserWebGUI/html/SubsystemSquares.html
//
//	In short, remote subsystems comprise your ots instances


//Subsystem Quares desktop icon from:  App Status ?

var SubsystemSquares = SubsystemSquares || {}; //define SubsystemSquares namespace

if (typeof Debug == 'undefined')
	throw('ERROR: Debug is undefined! Must include Debug.js before SubsystemSquares.js');
else if (typeof Globals == 'undefined')
	throw('ERROR: Globals is undefined! Must include Globals.js before SubsystemSquares.js');

SubsystemSquares.MENU_PRIMARY_COLOR = "rgb(220, 187, 165)";
SubsystemSquares.MENU_SECONDARY_COLOR = "rgb(130, 51, 51)";

SubsystemSquares.SUBSYSTEM_FIELDS = ["name","url","status","progress","detail","lastStatusTime","configAlias","configAliasChoices","fsmMode","fsmIncluded","landingPage"];
SubsystemSquares.SUBSYSTEM_FIELDS_NAME = SubsystemSquares.SUBSYSTEM_FIELDS.indexOf("name");
SubsystemSquares.SUBSYSTEM_STATUS_FIELDS = ["name","url","status","progress","detail","lastStatusTime",//,"configAlias","configAliasChoices","fsmMode","fsmIncluded",
	"consoleErrCount","consoleWarnCount"];
SubsystemSquares.SUBSYSTEM_STATUS_FIELDS_STATUS = SubsystemSquares.SUBSYSTEM_STATUS_FIELDS.indexOf("status");
SubsystemSquares.SUBSYSTEM_STATUS_FIELDS_INCLUDED = SubsystemSquares.SUBSYSTEM_STATUS_FIELDS.indexOf("fsmIncluded");
SubsystemSquares.SUBSYSTEM_STATUS_FIELDS_ALIASES = SubsystemSquares.SUBSYSTEM_STATUS_FIELDS.indexOf("configAliasChoices");
SubsystemSquares.subsystems = [];
SubsystemSquares.system = {};
SubsystemSquares.iterator = {};

SubsystemSquares.SUBSYSTEM_FSM_MODES = ["Follow FSM", "Do Not Halt", "Only Configure"];

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call create to create instance of a SubsystemSquares
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
SubsystemSquares.create = function() {


	//functions:
	//
	//	init()
	//	SubsystemSquares.initSubsystemRecords()
	//	SubsystemSquares.extractSystemStatus(req)
	//	SubsystemSquares.extractIteratorStatus(req)

	// 	SubsystemSquares.clickedSquare(s)


	//		'private' member functions: -------
	//	createElements()
	//	redrawWindow()

	//	getCurrentStatus()
	//		- localGetStatusHandler()
	//	displayStatus()
	//
	//		'public' member functions: -------
	//	this.getFsmName()




	//for display
	var _MARGIN = 10;

	var _needEventListeners = true;

	var _fsmName, _fsmWindowName;
	var _getStatusTimer = 0;

	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end variable declaration


	//=====================================================================================
	//init ~~
	function init()
	{
		if(_needEventListeners) //only first time landing handling
		{
			var windowTooltip = "Welcome to the <b>Subsystem Squares</b> user interface! " +
				"<br><br>Observe the status of each subsystem in terms of a colored rectangle; click a rectange to " +
				"visit that Subsystem's landing page.";
			Debug.log("Subsystem Squares init ");

			DesktopContent.tooltip("Subsystem Squares", windowTooltip);
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

		} //end first time landing handling

		window.clearTimeout(_getStatusTimer);


		//get all needed info sequentially
		SubsystemSquares.initSubsystemRecords(localHandleInitComplete);
		// localHandleInitComplete(); //for debugging position, skip initSubsystemRecords


		return;


		//////////////////////////////
		function localHandleInitComplete()
		{
			Debug.log("localHandleInitComplete()");

			//proceed with rest of init
			createElements();

			if(_needEventListeners)
			{
				window.addEventListener("resize",redrawWindow);
				_needEventListeners = false;

				 //define relogin handler
				DesktopContent._loginNotifyHandler = function()
				{
					Debug.log("Handling login notification...");
					Debug.closeErrorPop();

					window.clearTimeout(_getStatusTimer);
					_getStatusTimer = window.setTimeout(init,5000); //in 5 sec (give some time for subsystem propagation)
				} //end login notify handler
			}

			//get run state always
			window.clearTimeout(_getStatusTimer);
			_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec

			redrawWindow();

		} //end localGetContextRecordsHandler()


	} //end init()

	//=====================================================================================
	//createElements ~~
	//	called to clear and create html elements
	function createElements()
	{
		Debug.log("createElements()");

		Debug.log("createElements() system", SubsystemSquares.system);



		//		<!-- body content populated by javascript -->
		//		<div id='content'>
		//
		// 			<div id='sqaure_0'> </div>
		//
		//		</div>

		var cel,el,al,cl,il;
		var str = "";
		cel = document.getElementById("content");
		if(!cel)
		{
			cel = document.createElement("div");
			cel.setAttribute("id","content");
		}

		//clear all elements
		cel.innerHTML = "";


		{ //content div

			if(0)
			{ //debug manual update -------------------------
				el = document.createElement("div");
				el.setAttribute("id","debugDiv");
				el.setAttribute("style","position: absolute;");

				al = document.createElement("a");
				al.setAttribute("id","debugGetStatusLink");
				al.setAttribute("style","float: left;");
				al.onclick = function()
						{
					Debug.log("clicked debug get status");
					// SubsystemSquares.launcher.start();
					// getCurrentStatus();

					window.clearTimeout(_getStatusTimer);
						};
				al.innerText = "Pause ";
				el.appendChild(al);

				al = document.createElement("a");
				al.setAttribute("id","debugGetStatusLink");
				al.setAttribute("style","float: left;");
				al.onclick = function()
						{
					Debug.log("clicked debug get status");
					// SubsystemSquares.launcher.start();
					getCurrentStatus();
						};
				al.innerText = " Start ";
				el.appendChild(al);
				cel.appendChild(el);

				el = document.createElement("div");
				el.setAttribute("id","clearDiv");
				cel.appendChild(el);
			} //end debug manual update

			{ //Subsystem Squares -------------------------
				var fields = ["State", "Subsystem", "Console"];
				var fieldIds = ["status", "name", "console"];

				el = document.createElement("div");
				el.setAttribute("id","subsystemDiv");

				var s = -1; // for primary gateway
				localCreateSubsystemElements(-1);

				//make entry for each subsystem
				for(var s=0; s<SubsystemSquares.subsystems.length; ++s)
					localCreateSubsystemElements(s);

				el.innerHTML = str;
				cel.appendChild(el);
			} //end Subsystem Squares

		} //end content div

		document.body.appendChild(cel);
		return;

		//===========
		function localCreateSubsystemElements(s)
		{
			str += "<div id='subsystem_" + s + "_" + "square" +
				"' class='subsystem_square'";
			if(s == -1) //Landing Page link for Primary Gateway
				str += "' onclick='SubsystemSquares.clickedSquare(" + s + ");' " +
					"title='Click to show errors or open the Subsystem Launch GUI.' ";
			else if(SubsystemSquares.subsystems[s])// && SubsystemSquares.subsystems[s].landingPage)
				str += "' onclick='SubsystemSquares.clickedSquare(" + s + ");' " +
					"title='Click to show errors or open Subsystem Landing Page of &apos;" +
					SubsystemSquares.subsystems[s].name + "&apos;' ";
			str += ">";


			for(var i=0; i<fieldIds.length; ++i)
			{
				str += "<div id='subsystem_" + s + "_" + fieldIds[i] +
						"' class='subsystem_" + fieldIds[i] +
						"' >";
				str += "</div>";
				str += "<div id='clearDiv'></div>";
			}
			str += "</div>";
		} //end localCreateSubsystemElements()

	} //end createElements()

	//=====================================================================================
	//redrawWindow ~~
	//	called when page is resized
	function redrawWindow()
	{
		//adjust link divs to proper size
		//	use ratio of new-size/original-size to determine proper size

		var w = DesktopContent.getWindowWidth() | 0;
		var h = DesktopContent.getWindowHeight() | 0;

		var sdivs = document.getElementsByClassName("subsystem_square");
		Debug.log("sdivs",sdivs.length);

		{ //tile code - determine optimum rows and cols (a la DesktopDashboard.js::_windowDashboardOrganize)
			var rows = 1;
			var dw = (w-1*_MARGIN);
			var dh = (h-1*_MARGIN);
			var ww = Math.floor(dw/sdivs.length);
			var wh = dh;

			while(ww*2 < wh)
			{
				//Debug.log("Squares Organize " + ww + " , " + wh);
				ww = Math.floor(dw/Math.ceil(sdivs.length/++rows)); wh = Math.floor(dh/rows);
			}  //have too much height, so add row

			Debug.log("Squares Organize " + ww + " , " + wh);
			var cols = Math.ceil(sdivs.length/rows);
			Debug.log("Squares Organize r" + rows + " , c" + cols);


			var areaOfSquares = sdivs.length * ww * wh;
			var areaOfWindow = dw * dh;
			var extraWidths = 0;

			while (areaOfSquares < areaOfWindow - (ww * wh / 2))
			{
				//increase primary gateway size
				++extraWidths;
				areaOfSquares = sdivs.length * ww * wh + extraWidths * ww * wh;
			}
			Debug.logv({extraWidths});
		}

		//Now resize all squares
		var www, hhh;
		var redrawMode;
		var els, el;
		for(var i=0; i<sdivs.length; ++i)
		{
			hhh = (wh-(_MARGIN));
			if(i == 0) //add extra widths
				www = (ww*(extraWidths+1)-(_MARGIN));
			else
				www = (ww-(_MARGIN));

			sdivs[i].style.width = www + "px";
			sdivs[i].style.height = hhh + "px";

			redrawMode = 0; //no words
			if(www > 150 && hhh > 150)
				redrawMode = 1; //some words
			if(www > 300 && hhh > 150)
				redrawMode = 2; //more verbose
			Debug.log("redraw square to " + www + " - " + hhh,redrawMode);

			if(i == 0 && SubsystemSquares.system)
				SubsystemSquares.system.redrawMode = redrawMode;
			else if(i && SubsystemSquares.subsystems[i-1])
				SubsystemSquares.subsystems[i-1].redrawMode = redrawMode;

			els = sdivs[i].getElementsByClassName("subsystem_name");
			// els[0].style.display = "block";//redrawMode?"block":"none";
			els = sdivs[i].getElementsByClassName("subsystem_console");
			els[0].style.display = redrawMode?"block":"none";
			els = sdivs[i].getElementsByClassName("subsystem_status");
			// els[0].style.display = redrawMode?"block":"none";
			els[0].style.top = (hhh - 1*_MARGIN - 35) + "px";

		} //end square resize loop

		displayStatus();
	} //end redrawWindow()

	//=====================================================================================
	//getCurrentStatus ~~
	var _getStatusCounter = 0;
	function getCurrentStatus()
	{
		// Debug.log("getCurrentStatus()");
		window.clearTimeout(_getStatusTimer);

		//getIterationPlanStatus returns iterator status and does not request next run number (which is expensive)
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

		return;

		//===========
		function localGetStatusHandler(req)
		{

			//subsystems --------------------
			{
				var fields = SubsystemSquares.SUBSYSTEM_STATUS_FIELDS;

				//get all subsystem fields from xml
				var subsystemArrs = {};
				for(var i=0; i<fields.length; ++i)
					subsystemArrs[fields[i]] = req.responseXML.getElementsByTagName("subsystem_" + fields[i]);

				// Debug.log("subsystemArr", subsystemArrs);

				var foundSubsystemChange = false;
				if(subsystemArrs[fields[0]].length != SubsystemSquares.subsystems.length)
					foundSubsystemChange = true;


				//migrate xml values to subsystem struct
				var allFsmIncluded = true;
				for(var j=0; !foundSubsystemChange && j < subsystemArrs[fields[0]].length; ++j)
				{
					if( SubsystemSquares.subsystems[j][fields[SubsystemSquares.SUBSYSTEM_FIELDS_NAME]] !=
						subsystemArrs[fields[SubsystemSquares.SUBSYSTEM_FIELDS_NAME]][j].getAttribute('value'))
					{
						foundSubsystemChange = true; //name mismatch
						break;
					}

					for(var i=0; i<fields.length; ++i)
					{
						if(i == SubsystemSquares.SUBSYSTEM_STATUS_FIELDS_STATUS)
						{
							var status = subsystemArrs[fields[i]][j].getAttribute('value');
							if(status.indexOf("Launching") == 0)
							{
								//give user ... feedback
								SubsystemSquares.subsystems[j][fields[i]] = status + _dotDotDot;
								continue;
							}
							else if(SubsystemSquares.subsystems[j][fields[i]] != status &&
									(status.indexOf("Fail") == 0 || status.indexOf("Error") == 0 || status.indexOf("Soft") == 0))
								Debug.err("From Subsystem '" +
									SubsystemSquares.subsystems[j].name + "'... " +
									status); //show error to user

							SubsystemSquares.subsystems[j][fields[i]] = status;
							continue;
						}
						else if(i == SubsystemSquares.SUBSYSTEM_STATUS_FIELDS_INCLUDED)
						{
							//force fsmIncluded to bool AND warn if changed
							var fsmIncluded = subsystemArrs[fields[i]][j].getAttribute('value') | 0;
							if((fsmIncluded?1:0) != (SubsystemSquares.subsystems[j].fsmIncluded?1:0))
								Debug.warn("There was a change identified at the server-side in the included Subsystems. Subsystem '" +
									SubsystemSquares.subsystems[j].name + "' is now " +
									(fsmIncluded?"INCLUDED":"EXCLUDED") + "!"
									);
							SubsystemSquares.subsystems[j].fsmIncluded = fsmIncluded;
							if(!fsmIncluded)
								allFsmIncluded  = false;
							continue;
						}

						SubsystemSquares.subsystems[j][fields[i]] = subsystemArrs[fields[i]][j].getAttribute('value');
					} //end field/value push loop

				} //end subsystem loop

				if(foundSubsystemChange)
				{
					Debug.warn("A change in Subsystem records was identified, reloading Subsystem Squares info!");
					init();
					return;
				}
				// Debug.log("subsystem obj", SubsystemSquares.subsystems);
			} //end subsystems ------


			//system state ------------------------
			{
				SubsystemSquares.extractSystemStatus(req);
				SubsystemSquares.extractIteratorStatus(req);
			} //end system state ----------

			if(displayStatus())
			{
				//on success, get state again
				window.clearTimeout(_getStatusTimer);
				_getStatusTimer = window.setTimeout(getCurrentStatus,1000); //in 1 sec
			}
		}
	} //end getCurrentStatus()

	//=====================================================================================
	//displayStatus ~~
	// must return true to keep getting status
	var _dotDotDot = "..."; //to add growing ... feedback to user
	function displayStatus()
	{
		// Debug.log("displayStatus");

		//advance ... feedback
		if(_dotDotDot.length == 3)
			_dotDotDot = "";
		else
			_dotDotDot += ".";


		var els, el;
		var sdivs = document.getElementsByClassName("subsystem_square");
		var str;
		for(var i=0; i<sdivs.length; ++i)
		{
			if(i == 0) //Primary Gateawy "System" --------------------------
			{
				var isRed = false;
				var statusString =
					SubsystemSquares.system.inTransition?
						SubsystemSquares.system.transition:
						SubsystemSquares.system.state.split(":::")[0];

				if(statusString == "Shutting Down" ||
						statusString == "Failed" ||
						statusString == "Error" ||
						statusString == "Soft-Error")
					isRed = true;
				else if(statusString != "Initial" &&
						statusString != "Halted" &&
						statusString != "Configured" &&
						statusString != "Paused" &&
						statusString != "Running") //including SubsystemSquares.system.inTransition
					sdivs[i].style.background = "lightgray";
				else if(statusString == "Running")
					sdivs[i].style.background = "radial-gradient(circle at 50% 120%, rgb(119, 208, 255), rgb(119, 208, 255) 10%, rgb(7, 105, 191) 80%, rgb(6, 39, 69) 100%)";
				else if(statusString == "Configured")
					sdivs[i].style.background = "radial-gradient(circle at 50% 120%, rgb(80, 236, 199), rgb(147, 213, 195) 10%, rgb(5, 148, 122) 60%, rgb(6, 39, 69) 100%)";
				else
					sdivs[i].style.background = "rgb(6 176 6)"; //"green";


				if(isRed)
				{
					sdivs[i].style.background = "darkred";
					sdivs[i].style.color = "white";
					sdivs[i].style.border = "3px solid red";
					sdivs[i].style.margin = "2px";
					sdivs[i].style.textShadow = "";
				}
				else
				{
					if(statusString == "Running" || statusString == "Configured")
					{
						sdivs[i].style.color = "white";
						sdivs[i].style.textShadow = "1px 1px black";
					}
					else
					{
						sdivs[i].style.color = "black";
						sdivs[i].style.textShadow = "";
					}

					sdivs[i].style.border = "0";
					sdivs[i].style.margin = "5px";
				}

				SubsystemSquares.system.isRed = isRed;

				els = sdivs[i].getElementsByClassName("subsystem_name");
				els[0].innerText = "Primary Gateway";


				els = sdivs[i].getElementsByClassName("subsystem_status");
				str = ""; //clear
				if(SubsystemSquares.system.redrawMode > 0)
					str = statusString;
				if(SubsystemSquares.system.inTransition)
					str += _dotDotDot;
				else if(SubsystemSquares.system.redrawMode > 1) //add time-in-state
				{
					//time in state display
					let tstr = "";
					var hours = (SubsystemSquares.system.timeInState/60.0/60.0)|0;
					var mins = ((SubsystemSquares.system.timeInState%(60*60))/60.0)|0;
					var secs = SubsystemSquares.system.timeInState%60;

					tstr += hours + ":";
					if(mins < 10)	tstr += "0"; //keep to 2 digits
					tstr += mins + ":";
					if(secs < 10)	tstr += "0"; //keep to 2 digits
					tstr += secs;

					str += " <label style='font-size:14px; position: relative;" +
						"top: -2px;'>(Time-in-state: " + tstr + ")</label>";
				}
				els[0].innerHTML = str;


				els = sdivs[i].getElementsByClassName("subsystem_console");
				str = SubsystemSquares.system.consoleErrCount + " Errs / ";
				str += SubsystemSquares.system.consoleWarnCount + " Warns";
				els[0].innerText = str;
			} //end system
			else //Subsystem -------------------------------------------------
			{
				var s = i-1;
				if(!SubsystemSquares.subsystems[s]) continue; //skip missing subsystem

				var isRed = false;
				var statusString = SubsystemSquares.subsystems[s].status.split(":::")[0];
				if(statusString == "Shutting Down" ||
						statusString == "Failed" ||
						statusString == "Error" ||
						statusString == "Soft-Error")
					isRed = true;
				else if(statusString != "Initial" &&
						statusString != "Halted" &&
						statusString != "Configured" &&
						statusString != "Paused" &&
						statusString != "Running")
					sdivs[i].style.background = "lightgray";
				else if(statusString == "Running")
					sdivs[i].style.background = "radial-gradient(circle at 50% 120%, rgb(119, 208, 255), rgb(119, 208, 255) 10%, rgb(7, 105, 191) 80%, rgb(6, 39, 69) 100%)";
				else if(statusString == "Configured")
					sdivs[i].style.background = "radial-gradient(circle at 50% 120%, rgb(80, 236, 199), rgb(147, 213, 195) 10%, rgb(5, 148, 122) 60%, rgb(6, 39, 69) 100%)";
				else
					sdivs[i].style.background =  "rgb(6 176 6)"; //"green";

				SubsystemSquares.subsystems[s].isRed = isRed;

				if(isRed)
				{
					sdivs[i].style.background = "darkred";
					sdivs[i].style.color = "white";
					sdivs[i].style.border = "3px solid red";
					sdivs[i].style.margin = "2px";
					sdivs[i].style.textShadow = "";
				}
				else
				{
					if(statusString == "Running" || statusString == "Configured")
					{
						sdivs[i].style.color = "white";
						sdivs[i].style.textShadow = "1px 1px black";
					}
					else
					{
						sdivs[i].style.color = "black";
						sdivs[i].style.textShadow = "";
					}
					sdivs[i].style.border = "0";
					sdivs[i].style.margin = "5px";
				}

				els = sdivs[i].getElementsByClassName("subsystem_name");
				var name = "";
				if(1 || SubsystemSquares.subsystems[s].redrawMode == 0) //breakup name for word wrap
				{
					for(var c=0; c<SubsystemSquares.subsystems[s].name.length; ++c)
					{
						if(c && SubsystemSquares.subsystems[s].name[c] == '_')
						{
							name += " "; //convert underscore to space
							continue;
						}

						if(c &&
								SubsystemSquares.subsystems[s].name[c-1] >= 'a' &&
								SubsystemSquares.subsystems[s].name[c-1] <= 'z' &&
								SubsystemSquares.subsystems[s].name[c] >= 'A' &&
								SubsystemSquares.subsystems[s].name[c] <= 'Z') //caps change
							name += " "; //add space
						name += SubsystemSquares.subsystems[s].name[c]; //add char
					}
				}
				else
					name = SubsystemSquares.subsystems[s].name;
				els[0].innerText = name;


				els = sdivs[i].getElementsByClassName("subsystem_status");
				str = ""; //clear
				if(SubsystemSquares.subsystems[s].redrawMode > 0)
					str = statusString == "Failed"?statusString:SubsystemSquares.subsystems[s].status;
				if(SubsystemSquares.subsystems[s].progress != "100" && SubsystemSquares.subsystems[s].progress != "0")
					str += _dotDotDot;
				if(SubsystemSquares.subsystems[s].redrawMode > 1)
					str += " <label style='font-size:14px; position: relative;" +
						"top: -2px;'>(" + decodeURIComponent(SubsystemSquares.subsystems[s].detail) + ")</label>";

				els[0].innerHTML = str;


				els = sdivs[i].getElementsByClassName("subsystem_console");
				str = SubsystemSquares.subsystems[s].consoleErrCount + " Errs / ";
				str += SubsystemSquares.subsystems[s].consoleWarnCount + " Warns";
				els[0].innerText = str;

			} //end subsystem
		} //end primary square status loop

		return true; //to keep getting status
	} //end displayStatus()

	//=====================================================================================
	//getFsmName() ~~
	this.getFsmName = function() { Debug.logv({_fsmName}); return _fsmName; }


	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end 'member' function declaration

	SubsystemSquares.launcher = this;
	Debug.log("SubsystemSquares.launcher constructed");

	init();
	Debug.log("SubsystemSquares.launcher initialized");
} //end create() SubsystemSquares instance


//=====================================================================================
SubsystemSquares.clickedSquare = function(s)
{
	Debug.log("clickedSquare()",s);

	if(s == -1) //Landing Page link for Primary Gateway
	{
		if(SubsystemSquares.system.isRed)
		{
			Debug.err("Current State: " + SubsystemSquares.system.state + "\n\n" +
				(SubsystemSquares.system.error?SubsystemSquares.system.error:""));
		}
		DesktopContent.popUpVerification(
			"Do you want to open the Subsystem Launch GUI?",
			function()
			{
				DesktopContent.openNewWindow("Subsystem Launch");
			},
			0,"#efeaea",0,"#770000");
	}
	else if(SubsystemSquares.subsystems[s])//subsystem
	{
		if(SubsystemSquares.subsystems[s].isRed)
		{
			Debug.err("From Subsystem '" +
				SubsystemSquares.subsystems[s].name + "'... " +
				SubsystemSquares.subsystems[s].status);

		}

		if(SubsystemSquares.subsystems[s].landingPage)
			DesktopContent.popUpVerification(
				"Do you want to open the landing page of Subsystem &apos;" +
				SubsystemSquares.subsystems[s].name + "?&apos;",
				function()
				{
					DesktopContent.openNewWindow(SubsystemSquares.subsystems[s].landingPage);
				},
				0,"#efeaea",0,"#770000");
		else
			Debug.err("No Subsystem Landing page found for subsystem '" +
				SubsystemSquares.subsystems[s].name + ".'");
	}
	else
		Debug.err("Notify admins. No Subsystem found for index",s);
} //end clickedSquare()

//=====================================================================================
SubsystemSquares.initSubsystemRecords = function(returnHandler)
{
	Debug.log("SubsystemSquares.initSubsystemRecords()");

	SubsystemSquares.subsystems = []; //clear
	DesktopContent.XMLHttpRequest("Request?RequestType=getRemoteSubsystems" +
		"&fsmName=" + SubsystemSquares.launcher.getFsmName()
		, "", //post data
		function(req) //request handler
		{
			Debug.log("getRemoteSubsystems handler()");

			//subsystems --------------------
			{
				var fields = SubsystemSquares.SUBSYSTEM_FIELDS;

				//get all subsystem fields from xml
				var subsystemArrs = {};
				for(var i=0; i<fields.length; ++i)
					subsystemArrs[fields[i]] = req.responseXML.getElementsByTagName("subsystem_" + fields[i]);

				Debug.log("subsystemArr", subsystemArrs);

				//migrate xml values to subsystem struct
				for(var j=0; j < subsystemArrs[fields[0]].length; ++j)
				{
					SubsystemSquares.subsystems.push({}); //create empty structure for each subsystem
					for(var i=0; i<fields.length; ++i)
					{
						SubsystemSquares.subsystems[j][fields[i]] = subsystemArrs[fields[i]][j].getAttribute('value');
					} //end field/value push loop

					//force fsmInclude to bool
					SubsystemSquares.subsystems[j].fsmIncluded |= 0;

				} //end subsystem loop

				Debug.log("subsystem obj", SubsystemSquares.subsystems);
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

				SubsystemSquares.system.selectedSystemAlias =
						DesktopContent.getXMLValue(req,"UserLastConfigAlias");

				//take last configured alias, if user has not selected anything yet
				if(!SubsystemSquares.system.selectedSystemAlias)
					SubsystemSquares.system.selectedSystemAlias = "";

				SubsystemSquares.system.systemAliases = [];
				var alias, aliasTraslation;
				for(var i=0;i<aliasArr.length;++i)
				{
					alias = aliasArr[i].getAttribute('value');

					//require meta information for a 'good' alias
					if(!aliasCommentArr[i] || !aliasCreateTimeArr[i])
					{
						Debug.err("Configuration alias '" + alias + "' has an illegal group translation or is missing meta data information. Please delete the alias or fix the translation in your active Backbone group.");
						continue;
					}
					SubsystemSquares.system.systemAliases.push({
							name: alias,
							translation: aliasGroupArr[i].getAttribute('value'),
							comment: aliasGroupCommentArr[i].getAttribute('value')
						});


				} //end primary alias structure creation loop
				Debug.log("SubsystemSquares.system.systemAliases",SubsystemSquares.system.systemAliases);

			} //end system aliases -----

			//system state ------------------------
			{
				SubsystemSquares.system.doRequireConfigureLogEntry = DesktopContent.getXMLValue(req,"RequireUserLogInputOnConfigureTransition")|0;
				SubsystemSquares.system.doRequireRunLogEntry = DesktopContent.getXMLValue(req,"RequireUserLogInputOnRunTransition")|0;

				Debug.log("doRequireRunLogEntry",SubsystemSquares.system.doRequireRunLogEntry);
				SubsystemSquares.extractSystemStatus(req);
				SubsystemSquares.extractIteratorStatus(req);
			} //end system state ----------

			if(returnHandler)
				returnHandler();

		}, //end request handler
		0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
		false /*doNoShowLoadingOverlay*/,
		true /*targetGatewaySupervisor*/);


} //end SubsystemSquares.initSubsystemRecords()

//=====================================================================================
SubsystemSquares.extractSystemStatus = function(req)
{
	SubsystemSquares.system.state = DesktopContent.getXMLValue(req,"current_state");
	SubsystemSquares.system.inTransition = DesktopContent.getXMLValue(req,"in_transition") == "1";
	SubsystemSquares.system.transition = DesktopContent.getXMLValue(req,"current_transition");
	SubsystemSquares.system.timeInState = DesktopContent.getXMLValue(req,"time_in_state") | 0;
	var tmpRunNumber = DesktopContent.getXMLValue(req,"run_number"); //undefined during transitions and 9:10 status requests
	if(tmpRunNumber) SubsystemSquares.system.runNumber = tmpRunNumber;
	SubsystemSquares.system.progress = DesktopContent.getXMLValue(req,"transition_progress") | 0;

	var err = DesktopContent.getXMLValue(req,"system_error");
	var fsmErr = DesktopContent.getXMLValue(req,"current_error");
	if(fsmErr && fsmErr)
	{
		if(err && err != "")
		{	err += "\n\n"; err += fsmErr; }
		else
			err = fsmErr;
	}
	// if(err && err != "" && SubsystemSquares.system.error != err)
	// 	Debug.err(err);

	SubsystemSquares.system.error = err;

	SubsystemSquares.system.activeUserCount = DesktopContent.getXMLValue(req,"active_user_count") | 0;

	SubsystemSquares.system.lastRunLogEntry = DesktopContent.getXMLValue(req,"last_run_log_entry");
	if(!SubsystemSquares.system.lastRunLogEntry || SubsystemSquares.system.lastRunLogEntry == "")
	{
		SubsystemSquares.system.lastRunLogEntry = "No user entry found";
		if(SubsystemSquares.system.doRequireRunLogEntry)
			SubsystemSquares.system.lastRunLogEntry += ", please enter one when starting the the next run.";
	}
	else
		SubsystemSquares.system.lastRunLogEntry = decodeURIComponent(SubsystemSquares.system.lastRunLogEntry);

	SubsystemSquares.system.lastLogbookEntry = DesktopContent.getXMLValue(req,"last_logbook_entry");
	if(SubsystemSquares.system.lastLogbookEntry == "")
		SubsystemSquares.system.lastLogbookEntry = "No logbook entry found.";
	else
		SubsystemSquares.system.lastLogbookEntry += " (" + DesktopContent.getXMLValue(req,"last_logbook_entry_time") + ")";

	SubsystemSquares.system.lastSystemMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_system_message"));
	if(SubsystemSquares.system.lastSystemMessage == "")
		SubsystemSquares.system.lastSystemMessage = "No System Message found.";
	else
		SubsystemSquares.system.lastSystemMessage += " (" + DesktopContent.getXMLValue(req,"last_system_message_time") + ")";

	SubsystemSquares.system.consoleErrCount = //"Console Err #: " +
		(DesktopContent.getXMLValue(req,"console_err_count") | 0);
	SubsystemSquares.system.consoleWarnCount = //"Console Warn #: " +
		(DesktopContent.getXMLValue(req,"console_warn_count") | 0);
	SubsystemSquares.system.consoleInfoCount = "Console Info #: " + (DesktopContent.getXMLValue(req,"console_info_count") | 0);

	SubsystemSquares.system.consoleErrMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_err_msg"));
	if(SubsystemSquares.system.consoleErrMessage == "")
		SubsystemSquares.system.consoleErrMessage = "No console err message found.";
	else
		SubsystemSquares.system.consoleErrMessage += " " + DesktopContent.getXMLValue(req,"last_console_err_msg_time") + "";

	SubsystemSquares.system.consoleErrMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_err_msg"));
	if(SubsystemSquares.system.consoleErrMessage == "")
		SubsystemSquares.system.consoleErrMessage = "No console err message found.";
	else
		SubsystemSquares.system.consoleErrMessage += " " + DesktopContent.getXMLValue(req,"last_console_err_msg_time") + "";

	SubsystemSquares.system.consoleWarnMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_warn_msg"));
	if(SubsystemSquares.system.consoleWarnMessage == "")
		SubsystemSquares.system.consoleWarnMessage = "No console err message found.";
	else
		SubsystemSquares.system.consoleWarnMessage += " " + DesktopContent.getXMLValue(req,"last_console_warn_msg_time") + "";

	SubsystemSquares.system.consoleInfoMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"last_console_info_msg"));
	if(SubsystemSquares.system.consoleInfoMessage == "")
		SubsystemSquares.system.consoleInfoMessage = "No console err message found.";
	else
		SubsystemSquares.system.consoleInfoMessage += " " + DesktopContent.getXMLValue(req,"last_console_info_msg_time") + "";


	SubsystemSquares.system.consoleFirstErrMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"first_console_err_msg"));
	if(SubsystemSquares.system.consoleFirstErrMessage == "")
		SubsystemSquares.system.consoleFirstErrMessage = "No console err message found.";
	else
		SubsystemSquares.system.consoleFirstErrMessage += " " + DesktopContent.getXMLValue(req,"first_console_err_msg_time") + "";

	SubsystemSquares.system.consoleFirstWarnMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"first_console_warn_msg"));
	if(SubsystemSquares.system.consoleFirstWarnMessage == "")
		SubsystemSquares.system.consoleFirstWarnMessage = "No console err message found.";
	else
		SubsystemSquares.system.consoleFirstWarnMessage += " " + DesktopContent.getXMLValue(req,"first_console_warn_msg_time") + "";

	SubsystemSquares.system.consoleFirstInfoMessage = decodeURIComponent(DesktopContent.getXMLValue(req,"first_console_info_msg"));
	if(SubsystemSquares.system.consoleFirstInfoMessage == "")
		SubsystemSquares.system.consoleFirstInfoMessage = "No console err message found.";
	else
		SubsystemSquares.system.consoleFirstInfoMessage += " " + DesktopContent.getXMLValue(req,"first_console_info_msg_time") + "";

	// Debug.log("system obj", SubsystemSquares.system);

} //end SubsystemSquares.extractSystemStatus()

//=====================================================================================
SubsystemSquares.extractIteratorStatus = function(req)
{
	SubsystemSquares.iterator.activePlan = DesktopContent.getXMLValue(req,"active_plan");
	SubsystemSquares.iterator.currentCommandIndex = (DesktopContent.getXMLValue(req,"current_command_index")|0) + 1;
	SubsystemSquares.iterator.currentNumberOfCommands = (DesktopContent.getXMLValue(req,"current_number_of_commands")|0);
	SubsystemSquares.iterator.currentCommandType = DesktopContent.getXMLValue(req,"current_command_type");
	SubsystemSquares.iterator.currentCommandDuration = DesktopContent.getXMLValue(req,"current_command_duration")|0;
	SubsystemSquares.iterator.currentCommandIteration = (DesktopContent.getXMLValue(req,"current_command_iteration")|0) + 1;
	SubsystemSquares.iterator.activePlanStatus = DesktopContent.getXMLValue(req,"active_plan_status");

	SubsystemSquares.iterator.genNumberOfRuns = DesktopContent.getXMLValue(req,"generated_number_of_runs")|0;
	SubsystemSquares.iterator.genRunDuration = DesktopContent.getXMLValue(req,"generated_duration_of_runs")|0;

	var err = DesktopContent.getXMLValue(req,"error_message");
	// if(err && err != "" && SubsystemSquares.iterator.error != err)
	// 	Debug.err(err);

	SubsystemSquares.iterator.error = err;

	// Debug.log("iterator obj", SubsystemSquares.iterator);

} //end SubsystemSquares.extractIteratorStatus()
