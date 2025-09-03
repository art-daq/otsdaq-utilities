//=====================================================================================
//
//	Created Dec, 2012
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	Desktop.js
//
//	This is the desktop code for the user interface for ots. ots is the DAQ
// 		and control software for the Fermi Strips Telescope.
//
//	The desktop consists of a dashboard and an arbitrary amount of windows
//
//=====================================================================================

var Desktop = Desktop || {}; //define Desktop namespace

if (typeof Debug == 'undefined')
	console.log('ERROR: Debug is undefined! Must include Debug.js before Desktop.js');
else if (typeof Globals == 'undefined')
	console.log('ERROR: Globals is undefined! Must include Globals.js before Desktop.js');
else
	Desktop.desktop; //this is THE global desktop variable

Desktop.init = function(security) {

	Desktop.desktop = Desktop.createDesktop(security);
	if(Desktop.desktop)
		Debug.log("Desktop.desktop Initalized Successfully");

	// Enable navigation prompt
	//	(to prevent accidental/back/forward/nav leaving the page)
	window.onbeforeunload = function() {
		return true;
	};
} //end init()

Desktop.SECURITY_TYPE_NONE = "NoSecurity";
Desktop.SECURITY_TYPE_DIGEST_ACCESS = "DigestAccessAuthentication";

Desktop.WIN_MANIP_MODE = {
	NONE : -1,
	NW : 1,
	SE : 2,
	NE : 3,
	SW : 4,
	W : 5,
	E : 6,
	N : 7,
	S : 8,
	MOVE : 0,
	SIDEBAR : 100,
};

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call createDesktop to create instance of a desktop
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
Desktop.createDesktop = function(security) {

	if (typeof Debug == 'undefined') return 0; //fail if debug not defined just to force consistent behavior

	if(false === (this instanceof Desktop.createDesktop)) {
		//here to correct if called as "var v = Desktop.createDesktop();"
		//	instead of "var v = new Desktop.createDesktop();"
		return new Desktop.createDesktop(security);
	}


	//------------------------------------------------------------------
	//list of members functions ----------------------
	//------------------------------------------------------------------
	//
	//public:
	//	Desktop.desktopTooltip()
	//	this.getDesktopWidth = function() { return _desktopElement.clientWidth;}
	//	this.getDesktopHeight = function() { return _desktopElement.clientHeight;}
	//	this.getDesktopX = function() { return _desktopElement.offsetLeft;}
	//	this.getDesktopY = function() { return _desktopElement.offsetTop;}
	//	this.getDesktopContentX = function() { return _desktopElement.offsetLeft+_dashboard.getDashboardWidth();}
	//	this.getDesktopContentY = function() { return _desktopElement.offsetTop+_dashboard.getDashboardHeight();}
	//	this.getDesktopContentWidth = function() { return _desktopElement.clientWidth-_dashboard.getDashboardWidth();}
	//	this.getDesktopContentHeight = function() { return _desktopElement.clientHeight-_dashboard.getDashboardHeight();}
	//	this.getNumberOfWindows = function() { return _windows.length;}
	//	this.getWindowNameByIndex = function(i) { return _windows[i].getWindowName();}
	//	this.getWindowSubNameByIndex = function(i) { return _windows[i].getWindowSubName();}
	//	this.getWindowByIndex = function(i) { return _windows[i];}
	//	this.getForeWindow = _getForeWindow;
	//	this.redrawDesktop = _handleDesktopResize;
	//	this.getLastFrameMouseX = function() { return parseInt(_mouseOverXmailbox.innerHTML);}
	//	this.getLastFrameMouseY = function() { return parseInt(_mouseOverYmailbox.innerHTML);}
	//	this.resetFrameMouse = function() { _mouseOverXmailbox.innerHTML = -1;_mouseOverYmailbox.innerHTML = -1;}
	//	this.getWindowLayoutStr = _getWindowLayoutStr;
	//	this.addWindow(name,subname,url,unique,extraStep)
	//	this.getWindowById(id)
	//	this.setForeWindow(win)
	//	this.closeWindowById(id)
	//	this.maximizeWindowById(id)
	//	this.toggleFullScreen(e)
	//	this.minimizeWindowById(id)
	//	this.toggleMinimize(e)
	//	this.clickedWindowDashboard(id)
	//	this.setDefaultWindowColor(color)
	//	this.defaultLayoutSelect(i)
	//	this.closeAllWindows()
	//	this.resetDesktop(permissions)
	//	this.actOnParameterAction()
	//	Desktop.XMLHttpRequest(requestURL, data, returnHandler, reqIndex)
	//	Desktop.getXMLAttributeValue(req, name, attribute)
	//	Desktop.getXMLValue(req, name)
	//	Desktop.logout()
	//	Desktop.formatTime(t)
	//	Desktop.closeSystemMessage(id)
	//	Desktop.isWizardMode()
	//	Desktop.openNewBrowserTab(name,subname,windowPath,unique)
	//	Desktop.desktopTooltip

	//"public" handlers:
	//	Desktop.mouseMoveSubscriber(newHandler)

	//private:
	//	_handleDesktopResize(event)
	//	_getWindowLayoutStr()
	//	_getForeWindow()
	//	_closeWindow(win)
	//	_checkMailboxes()
	//	_handleSystemMessages(req)

	//"private" handlers:
	// 	Desktop.handleTouchStart(touchEvent)
	//	Desktop.handleBodyTouchEnd(touchEvent)
	//	Desktop.handleTouchEnd(touchEvent)
	//	Desktop.handleBodyTouchMove(touchEvent)
	//	Desktop.handleTouchMove(touchEvent)
	//	Desktop.handleWindowMouseDown(mouseEvent)
	//	Desktop.handleWindowMouseUp(mouseEvent)
	//	Desktop.handleWindowMouseMove(mouseEvent)
	//	Desktop.handleBodyMouseMove(mouseEvent)
	//	Desktop.handleWindowManipulation(delta)
	//	Desktop.handleWindowButtonDown(mouseEvent)
	//	Desktop.handleWindowMinimize(mouseEvent)
	//	Desktop.handleWindowMaximize(mouseEvent)
	//	Desktop.handleWindowClose(mouseEvent)



	//------------------------------------------------------------------
	//create private members variables ----------------------
	//------------------------------------------------------------------

	var _defaultWindowMinZindex = 10;
	var _defaultWindowMaxZindex	= 10000;
	var _defaultDashboardZindex	= 11000;
	var _defaultWidth = 620;
	var _defaultHeight = 580;
	var _defaultLeft = 200;
	var _defaultTop = 70;
	var _defaultLeftOffset = 50;
	var _defaultTopOffset = 25;
	var _defaultOffsetTimes = 5;
	var _currentLeft = _defaultLeft;
	var _currentTop = _defaultTop;

	var _windows = new Array(); //windows are initialized to empty, array represents z-depth also
	var _lastTileWinPositions = {}; //initialize to empty, if windows are tiled, this map will be updated with wid => x,y,w,h of each window

	var _desktopElement;
	var _dashboard, _icons, _mouseOverXmailbox, _mouseOverYmailbox;
	var _updateSettingsMailbox,
		_settingsLayoutMailbox;
	var _MAILBOX_TIMER_PERIOD = 500; //timer period for checking mailbox and system messages: 500 ms
	var _sysMsgId = 0; //running counter to identify system message pop-ups
	var _SYS_MSG_SOUND_PATH = "/WebPath/sounds/fx-System-Message.wav"; // "http://www.soundjay.com/button/button-2.wav"; //must be .wav for firefox incompatibility
	var _sysMsgSound = new Audio(_SYS_MSG_SOUND_PATH);

	var _winId = 1000; //running window id number

	var _login;

	//for system messages
	var _sysMsgCounter = 0;
	var _SYS_MSG_MAX_COUNT = 10; //number of check mailbox timers to count through before checking for system messages

	var _firstCheckOfMailboxes = true;

	//------------------------------------------------------------------
	//create public members variables ----------------------
	//------------------------------------------------------------------
	this.dashboard;
	this.login;
	this.icons;
	this.checkMailboxTimer;
	this.serverConnected = true;
	this.security = security;

	this.defaultWindowFrameColor = "rgba(196,229,255,.9)";

	//------------------------------------------------------------------
	//create PRIVATE members functions ----------------------
	//------------------------------------------------------------------

	//===========================================================
	var _handleDesktopResize = function(event)
	{
		_desktopElement.style.height = (window.innerHeight-_desktopElement.offsetTop) + "px";
		_desktopElement.style.width = (window.innerWidth-_desktopElement.offsetLeft) + "px";
		if(!_dashboard) return; //initial calls dashboard might not be defined
		Debug.log("_handleDesktopResize()");

		_dashboard.redrawDashboard();
		if(_login) _login.redrawLogin();
		if(_icons) _icons.redrawIcons();

		//if top windows is maximized, then resize
		if(_windows.length && _windows[_windows.length-1].isMaximized())
		{
			var w = _windows[_windows.length-1];
			w.setWindowSizeAndPosition(w.getWindowX(),w.getWindowY(),w.getWindowWidth(),w.getWindowHeight());
		}

	} //end _handleDesktopResize()

	//===========================================================
	//return current window layout in string with parameters separated by commas
	//	Note: represent position in terms of 0-10000 for the entire Desktop Content area
	//		- this should allow for translation to any size Desktop Content area when loaded
	var _getWindowLayoutStr = function()
	{
		var dw = Desktop.desktop.getDesktopContentWidth()/10000.0; //to calc int % 0-10000
		var dh = Desktop.desktop.getDesktopContentHeight()/10000.0;//to calc int % 0-10000
		var dx = Desktop.desktop.getDesktopContentX();
		var dy = Desktop.desktop.getDesktopContentY();

		var layout = ""; //"[";
		for(var i=0;i<_windows.length;++i)
		{
			if(_windows[i].getWindowName() == "Settings") continue; //skip settings window

			layout += (i?",":"") +
					encodeURIComponent(_windows[i].getWindowName())
					+ "," + encodeURIComponent(_windows[i].getWindowSubName())
					+ "," + encodeURIComponent(_windows[i].getWindowUrl()) //_windows[i].getWindowUrl().replace(/&/g,'%38').replace(/=/g,'%61')  //global replace & and =
					+ "," + (((_windows[i].getWindowX()-dx)/dw)|0)
					+ "," + (((_windows[i].getWindowY()-dy)/dh)|0)
					+ "," + ((_windows[i].getWindowWidth()/dw)|0)
					+ "," + ((_windows[i].getWindowHeight()/dh)|0)
					+ "," + (_windows[i].isMinimized()?"0":(_windows[i].isMaximized()?"2":"1"));
					//+ ", "; //last comma (with space for settings display)
		}
		//layout += "]";
		return layout;
	} //end _getWindowLayoutStr()

	//===========================================================
	//for login
	var _scrambleEggs = function(u) { return u; }

	//===========================================================
	var _getForeWindow = function() { return _windows.length?_windows[_windows.length-1]:0; } //return last window in array as forewindow

	//===========================================================
	var _closeWindow = function(win)
	{
		Desktop.desktop.setForeWindow(win);
		win.windiv.parentNode.removeChild(win.windiv); //remove from page!

		//delete top window from windows array
		//		Debug.log("Desktop Window closed z:" + _windows[_windows.length-1].getWindowZ());
		_windows.splice(_windows.length-1,1);
		//		Debug.log("Desktop Windows left:" + _windows.length);

		_dashboard.updateWindows();
	} //end _closeWindow()

	//===========================================================
	//_checkMailboxes ~~~
	//	called periodically (e.g. every _MAILBOX_TIMER_PERIODms)
	//  check div mailboxes that are shared by window content code and take action if necessary
	//	check for settings change
	var _checkMailboxes = function()
	{
		window.clearTimeout(Desktop.desktop.checkMailboxTimer);
		Desktop.desktop.checkMailboxTimer = window.setTimeout(_checkMailboxes,
				_MAILBOX_TIMER_PERIOD);

		//console.log("_checkMailboxes sysMsgCounter=" +_sysMsgCounter);

		if(_firstCheckOfMailboxes)
		{
			Debug.log("First check of mailboxes!");
			if(Desktop.desktop.icons.iconNameToPathMap === undefined)
			{
				Debug.log("Icons have not been setup yet... need to try again!");
				window.clearTimeout(Desktop.desktop.checkMailboxTimer);
				Desktop.desktop.checkMailboxTimer = window.setTimeout(_checkMailboxes,
								100);
				return;
			}
			Debug.log("Checking for any shortcut work from get parameters...");
			_firstCheckOfMailboxes = false;
			Desktop.desktop.actOnParameterAction();    //this should be the second running and will always work (first time is at end of Desktop instance creation.. and may fail for opening icon by name)

		}

//		//windows can request a blackout, to avoid logging out (attempt to stop all other tabs by using browser cookie)
//		if(_blockSystemCheckMailbox.innerHTML == "1")
//		{
//			Desktop.desktop.login.blackout(true);
//		}
////		else if(_blockSystemCheckMailbox.innerHTML == "RefreshIcons") // windows can request icon refresh (e.g. after changing icons)
////		{
////			_blockSystemCheckMailbox.innerHTML = ""; //clear
////			//reset icons, if permissions undefined, keep permissions from before
////			Desktop.desktop.icons.resetWithPermissions(undefined /*undefined permissions*/, true /*keepSamePermissions*/);
////		}
//		else
//		{
//			Desktop.desktop.login.blackout(false);
//		}



//	    //check _openWindowMailbox to see if a window opening is being requested by a Desktop Window
//	    //	From requesting window (check that done=1):
//	    // 		innerHTML = requestingWindowId=<window uid>&windowPath=<window path to open>
//	    //	Response when done:
//	    //		innerHTML = requestingWindowId=<window uid>&done=1
//	    if(_openWindowMailbox.innerHTML != "")
//	    {
//	    	console.log("_openWindowMailbox.textContent=" + _openWindowMailbox.textContent);
//
//	    	//get parameters
//	    	var paramsStr = _openWindowMailbox.textContent;
//	    	var params = [];
//	    	var paramCnt = 5 ;
//	    	var spliti, splitiOld = 0;
//	    	for(var i=0;i<paramCnt;++i)
//	    	{
//	    		if(i == paramCnt-1) //last one take the whole thing (this is path, and could have &'s in it)
//	    		{
//	    			params.push(paramsStr.substr(splitiOld));
//	    			break;
//	    		}
//	    		//for others, handle like normal get param
//	    		spliti = paramsStr.indexOf('&', splitiOld);
//	    		params.push(paramsStr.substr(splitiOld,spliti-splitiOld))
//				splitiOld = spliti+1;
//	    	}
//
//	    	var varPair;
//	    	var requestingWindowId = "", windowPath = "";
//	    	var windowName, windowSubname, windowUnique;
//	    	for(var i=0;i<params.length;++i)
//	    	{
//	    		spliti = params[i].indexOf('=');
//	    		varPair = [params[i].substr(0,spliti),params[i].substr(spliti+1)];
//				if(varPair[0] 		== "requestingWindowId")
//					requestingWindowId 	= varPair[1];
//				else if(varPair[0] 	== "windowPath")
//					windowPath 			= varPair[1];
//				else if(varPair[0] 	== "windowName")
//					windowName 			= varPair[1];
//				else if(varPair[0] 	== "windowSubname")
//					windowSubname		= varPair[1];
//				else if(varPair[0] 	== "windowUnique")
//					windowUnique 		= varPair[1];
//	    	}
//	    	if(requestingWindowId != "" && windowPath != "")
//	    	{
//	    		//have work to do!
//	    		// Note: similar to L1000 in actOnParameterAction()
//	    		console.log("_openWindowMailbox.innerHTML=" + _openWindowMailbox.innerHTML);
//	    		console.log("requestingWindowId=" + requestingWindowId);
//	    		console.log("windowPath=" + windowPath);
//		    	while(windowPath.length && windowPath[0] == '?') windowPath = windowPath.substr(1); //remove leading ?'s
//		    	console.log("modified windowPath=" + windowPath);
//		    	console.log("windowName=" + windowName);
//		    	console.log("windowSubname=" + windowSubname);
//		    	console.log("windowUnique=" + windowUnique);
//
//		    	var newWin;
//
//		    	//if only windowName is defined, then attempt to open the icon on the
//		    	//	Desktop with that name (this helps resolve supervisor LIDs, etc.)
//		    	if(windowSubname == "undefined" &&
//		    			windowUnique == "undefined") //the string undefined is what comes through
//		    	{
//		    		console.log("Opening desktop window... " + windowName);
//
//		    		var pathUniquePair = Desktop.desktop.icons.iconNameToPathMap[windowName];
//		    		console.log("Desktop.desktop.icons.iconNameToPathMap",
//		    				Desktop.desktop.icons.iconNameToPathMap);
//
//		    		if(pathUniquePair ===
//		    				undefined)
//		    		{
//		    			Debug.log("An error occurred opening the window named '" +
//		    					windowName + "' - it was not found in the Desktop icons. " +
//								"Do you have permissions to access this window? Notify admins if the problem persists.",
//								Debug.HIGH_PRIORITY);
//
//		    			//respond done
//						var str = "requestingWindowId=" + requestingWindowId;
//						str += "&done=1";
//						_openWindowMailbox.innerHTML = str; //indicate done
//
//		    			return;
//		    		}
//
//					var pathStr = pathUniquePair[0];
//
//					if(windowPath != "undefined") //add parameters if defined
//					{
//						Debug.log("Adding parameter path " + windowPath);
//						if(pathStr.indexOf('?') >= 0) //then assume already parameters
//							pathStr += "&";
//						else if(pathStr.length) //then assume need ?
//							pathStr += '?';
//						windowPath = pathStr + windowPath;
//					}
//					else
//						windowPath = pathStr;
//
//		    		newWin = Desktop.desktop.addWindow(	//(name,subname,url,unique)
//		    				windowName,
//							"",
//							windowPath,		//e.g. "http://rulinux03.dhcp.fnal.gov:1983/WebPath/html/ConfigurationGUI.html?urn=280",
//							eval(pathUniquePair[1]));
//		    	}
//		    	else
//		    	{
//		    		newWin = Desktop.desktop.addWindow(	//(name,subname,url,unique)
//		    				windowName,
//							windowSubname,
//							windowPath,		//e.g. "http://rulinux03.dhcp.fnal.gov:1983/WebPath/html/ConfigurationGUI.html?urn=280",
//							eval(windowUnique));
//		    	}
//
//		    	//delay the setting of the fore window
//				window.setTimeout(function(){ Desktop.desktop.setForeWindow(newWin); }, 200);
//
//				var str = "requestingWindowId=" + requestingWindowId;
//				str += "&done=1";
//				_openWindowMailbox.innerHTML = str; //indicate done
//	    	}
//	    }

		//==============
		//other things besides opening windows
		//....

		if(!Desktop.desktop.login || !Desktop.desktop.login.getCookieCode(true /*doNotRefresh*/))
		{
			//if(_needToLoginMailbox.innerHTML == "1")
			//	 _needToLoginMailbox.innerHTML = ""; //reset

			return; //don't do things if not logged in
		}


//	    console.log("Checking iFrame z change focus");
//	    //	check if a window iFrame has taken focus and tampered with z mailbox. If so 'officially' set to fore window
//		if(_windowZmailbox > _defaultWindowMaxZindex)
//		{
//			Desktop.desktop.setForeWindow(); //should pass undefined window.. to just relabel Z depth
//			//Desktop.desktop.getForeWindow()
//			Debug.log("Desktop Foreground Window Refreshed by _checkMailboxes Timeout");
//		}

//	    //check need for login mailbox
//	    if(_needToLoginMailbox.innerHTML == "1")
//	    {
//	        _needToLoginMailbox.innerHTML = ""; //reset
//	        if(!document.getElementById("Desktop-loginDiv") &&
//	        		!Desktop.desktop.login.isBlackout())
//	        {
//	        	//only signal logout if login div is gone (login complete)
//				Debug.log("DesktopContent signaled new login needed!",Debug.HIGH_PRIORITY);
//				Desktop.logout();
//	        }
//	        else
//	        	Debug.log("Ignoring desktop content need for login signal due to blackout.");
//		}

//	    //check if cookie time from content is newer than cookie time in login
//	    if(parseInt(_updateTimeMailbox.innerHTML) > parseInt(Desktop.desktop.login.getCookieTime()))
//	        Desktop.desktop.login.updateCookieFromContent(parseInt(_updateTimeMailbox.innerHTML)); //update based on content value
//
		//check if update settings is necessary
		if(_updateSettingsMailbox.innerHTML != "")
		{
			//this mailbox defines read/write actions between settings dialog and desktop

			//Debug.log("Desktop Settings update " + _updateSettingsMailbox.innerHTML );

			if(_updateSettingsMailbox.innerHTML == "LAYOUT") //settings is reading from desktop
			{
				//return current window layout in mailbox with parameters separated by commas
				var layout = _getWindowLayoutStr();
				_settingsLayoutMailbox.innerHTML = layout;
				Debug.log("Desktop _updateSettingsMailbox " + layout);
			}
			else //settings is writing to destkop
			{
				//setup req with settings data
				var xml = _updateSettingsMailbox.innerHTML;
				var req = req || {};
				req.responseXML = ( new window.DOMParser() ).parseFromString(xml, "text/xml"); //get xml object
				_login.applyUserPreferences(req);
			}

			_updateSettingsMailbox.innerHTML = ""; //clear to prepare for next time
		}

		//system messages check (and submit current window layout)
		++_sysMsgCounter;
		if(_sysMsgCounter == _SYS_MSG_MAX_COUNT)
		{
			//windows can request a blackout, to avoid logging out
			if(//_blockSystemCheckMailbox.innerHTML == "1" ||
					Desktop.desktop.login.isBlackout())
			{
				Debug.log("System blackout (likely rebooting)...");
				_sysMsgCounter = 0; // reset since not going to handler
			}
			else // if(0) //uncomment when debugging and removing requests!!
				Desktop.XMLHttpRequest("Request?RequestType=getSystemMessages","",_handleSystemMessages);
		}
	} //end _checkMailboxes()

	//===========================================================
	var _lastSystemMessage = ""; //prevent repeats
	//_handleSystemMessages ~~~
	//	handles request returns periodically (ever _SYS_MSG_MAX_COUNT times through _checkMailboxes)
	var _handleSystemMessages = function(req)
	{
		//Debug.log("Desktop _handleSystemMessages " + req.responseText);

		_sysMsgCounter = 0; //reset system message counter to setup next request

		if(!req) return; //request failed

		Desktop.desktop.dashboard.displayUserLock(req);

		var tmp = Desktop.getXMLValue(req,"systemMessages");
		if(!tmp) return; //did not find return string

		//disallow repeats by skipping (due to broadcast messages hanging around, user messages are always 2nd)
		var tmpi;
		if((tmpi = tmp.indexOf(_lastSystemMessage)) >= 0)
		{
			// Debug.log("Skipping repeat System Message...");
			tmp = tmp.substr(tmpi+_lastSystemMessage.length+1);
		}

		var msgArr = tmp.split("|");
		// Debug.log("Desktop msgArr.length " + msgArr.length);

		if(msgArr.length < 2) return; //no new messages left

		Debug.log("Desktop _handleSystemMessages ========================== " + Desktop.formatTime(msgArr[0]) +
				" - " + msgArr[1]
				);

		++_sysMsgId; //increment to new ID
		var sysMsgEl = document.createElement("div");
		sysMsgEl.setAttribute("class", "Desktop-systemMessageBox");
		sysMsgEl.setAttribute("id", "Desktop-systemMessageBox-" + _sysMsgId);
		sysMsgEl.style.left = (50 + _sysMsgId % 5 * 10) + "px";
		sysMsgEl.style.top = (50 + _sysMsgId % 5 * 10) + "px";
		_desktopElement.appendChild(sysMsgEl);

		var str = "";

		for(var i=0; i+1 < msgArr.length; i+=2)
		{
			str += "<div style='font-size:12px'>System Message Received at " + Desktop.formatTime(msgArr[i]) + "</div>";
			str += "<div>" +
					//first decode URI, then convert html entities
					decodeURIComponent(msgArr[i+1]).replace(/[\u00A0-\u9999<>\&]/gim,
							function(i) {
								   return '&#'+i.charCodeAt(0)+';';
								}) + "</div><br>";
			_lastSystemMessage = msgArr[i] + "|" + msgArr[i+1];
		}

		str += "<div style='float:left; font-size:12px; margin-top:6px;'>Repeats are suppressed for 30 seconds.</div>";

		//dismiss link
		str += "<div style='float:right; margin-left:30px'>";
		str += "<a href='Javascript:Desktop.closeSystemMessage(" + _sysMsgId + ");' " +
				"title='Click here to dismiss system message'>Dismiss</a></div>";


		//play sound alert (play() is a promise, which can reject, after processing)
		//do not load over and over: _sysMsgSound.src = _SYS_MSG_SOUND_PATH; // buffers automatically when created
		_sysMsgSound.play().catch(e => {
			Debug.log("System Message Sound Play() error",e);
			str += "<br><br><div style='font-size:12px'>(Could not play alert sound because the uesr must interact with the page first)</div>";
			sysMsgEl.innerHTML = str;
		});

		sysMsgEl.innerHTML = str;

		if(sysMsgEl.clientHeight > 300)
			sysMsgEl.style.height = 300 + "px";

	} //end _handleSystemMessages()

	//------------------------------------------------------------------
	//create PUBLIC members functions ----------------------
	//------------------------------------------------------------------
	this.getDesktopWidth = function() { return _desktopElement.clientWidth;}
	this.getDesktopHeight = function() { return _desktopElement.clientHeight;}
	this.getDesktopX = function() { return _desktopElement.offsetLeft;}
	this.getDesktopY = function() { return _desktopElement.offsetTop;}
	this.getDesktopContentX = function() { return _desktopElement.offsetLeft+_dashboard.getDashboardWidth();}
	this.getDesktopContentY = function() { return _desktopElement.offsetTop+_dashboard.getDashboardHeight();}
	this.getDesktopContentWidth = function() { return _desktopElement.clientWidth-_dashboard.getDashboardWidth();}
	this.getDesktopContentHeight = function() { return _desktopElement.clientHeight-_dashboard.getDashboardHeight();}
	this.getNumberOfWindows = function() { return _windows.length;}
	this.getWindowNameByIndex = function(i) { return _windows[i].getWindowName();}
	this.getWindowSubNameByIndex = function(i) { return _windows[i].getWindowSubName();}
	this.getWindowByIndex = function(i) { return _windows[i];}
	this.getForeWindow = _getForeWindow;
	this.redrawDesktop = _handleDesktopResize;
	this.getLastFrameMouseX = function() { return parseInt(_mouseOverXmailbox);}
	this.getLastFrameMouseY = function() { return parseInt(_mouseOverYmailbox);}
	this.resetFrameMouse = function() { _mouseOverXmailbox = -1;_mouseOverYmailbox = -1;}
	this.getWindowLayoutStr = _getWindowLayoutStr;
	this.lastTileWinPositions = _lastTileWinPositions;

	//==============================================================================
	//addWindow ~~~
	//	Adds a window to desktop at default location, with default size
	// 	Window title bar will read "name - subname" and will be organized by name
	//	in dashboard. Window will display page at url.
	//	If unique, the window is not made if there already exists a window
	//	with the same "name - subname".
	//
	//	If subname = "" it is ignored.
	//
	//	If extraStep == 1, tile windows, if == 2, maximize
	//
	//  returns new window
	this.addWindow = function(name,subname,url,unique,extraStep)
	{
		Debug.log(name + " - " + subname + " - " + url + " - " + unique);

		if(name.indexOf(" loading...") > 0)
		{
			Debug.log("Assuming user is trying to reload icons!");

			//reset icons, if permissions undefined, keep permissions from before
			Desktop.desktop.icons.resetWithPermissions(
				undefined /*undefined permissions*/, true /*keepSamePermissions*/);
			return;
		}

		if(unique == 2) //open as stand-alone new tab page
		{
			Debug.log("Opening stand-alone new tab");
			window.open(url,'_blank');
			return;
		}

		if(unique)
		{
			Debug.log("Adding window uniquely");
			for(var i=0;i<_windows.length;++i)
				if(_windows[i].getWindowName() == name && _windows[i].getWindowSubName() == subname)
				{
					Debug.log("Window creation failed. Not unique.");
					if(_windows[i].isMinimized())
					{
						Debug.log(_windows[i].getWindowSubName() + "was minimized but will now be restored!");
						_windows[i].unminimize(); //restore window
					}
					else
						Desktop.desktop.setForeWindow(_windows[i]); //bring window to front
					return;
				}
		}

		if(_windows.length + _defaultWindowMinZindex >= _defaultWindowMaxZindex)
		{
			Debug.log("FAILED -- Desktop Window Added - too many windows!",Debug.HIGH_PRIORITY);
			return;
		}

		if(name == "/User Settings/Security Settings")
		{
			window_width  = 730;
			window_height = 410;
		}
		else if(name == "/User Settings/Edit User Data")
		{
			window_width  = 730;
			window_height = 730;
		}
		else
		{
			window_width  = _defaultWidth;
			window_height = _defaultHeight;
		}
		//KEEP..
		//subname += _winId; //for visual window debugging (but destroys uniqueness)
		//end KEEP.
		var newWin = Desktop.createWindow(_winId++,_windows.length + _defaultWindowMinZindex,name,subname,url,
			window_width,window_height,_dashboard.getDashboardWidth() + _currentLeft,_currentTop);

		//handle initial window left,top evolution
		if(_currentLeft > _defaultLeft+_defaultOffsetTimes*_defaultLeftOffset)
		{
			_currentLeft = _defaultLeft;
			if(_currentTop > _defaultTop + (_defaultOffsetTimes+1)*_defaultTopOffset)
				_currentTop = _defaultTop;
			else
				_currentTop = _defaultTop + _defaultTopOffset;
		}
		else
		{
			_currentLeft += _defaultLeftOffset;
			_currentTop += _defaultTopOffset;
		}

		_windows.push(newWin); //add to windows array

		_desktopElement.appendChild(newWin.windiv); //add to desktop element and show on screen!

		Debug.log("Desktop Window Added with id " + _windows[_windows.length-1].getWindowId());

		_dashboard.updateWindows();

		//usually the foreground happens automatically.. but sometimes
		//	it doesn't (?)
		//... so delay an extra setting of the fore window
		window.setTimeout(function()
				{
			Desktop.desktop.setForeWindow(newWin);
			Debug.log("extraStep=" + extraStep);
			switch(extraStep)
			{
			case 1: //tile
				Desktop.desktop.dashboard.windowDashboardOrganize();
				break;
			case 2: //maximize
				Desktop.desktop.toggleFullScreen();
				break;
			default:; //do nothing for default
			}

		}, 200);

		return newWin;
	} //end addWindow()

	//==============================================================================
	//getWindowById ~~~
	//	Find window by id
	this.getWindowById = function(id)
	{
		for(var i=0;i<_windows.length;++i)
			if(_windows[i].getWindowId() == id)
				return _windows[i];
		Debug.log("Window id="+id+" not found!",Debug.MED_PRIORITY);
		return -1;
	} //end getWindowById()

	//==============================================================================
	//setForeWindow ~~~
	//	handle bringing window to front
	this.setForeWindow = function(win)
	{
		//console.log("setForeWindow",win?win.getWindowId():-1);

		//resort by z and renumber - windows with Z out of range of array are due to iframe onFocus solution
		var tmp;
		for(var i=0;i<_windows.length-1;++i)
		{
			var min = i;
			for(var j=i+1;j<_windows.length;++j)
				if(_windows[j].getWindowZ() < _windows[min].getWindowZ())
					min = j;

			//have min, swap to i
			tmp = _windows[i];
			_windows[i] = _windows[min];
			_windows[min] = tmp;
			_windows[i].setWindowZ(i+_defaultWindowMinZindex); //done with new window i
		}
		_windows[_windows.length-1].setWindowZ(_windows.length-1+_defaultWindowMinZindex); // last window still needs z-fixed
		//_windowZmailbox = _defaultWindowMaxZindex;        //reset windowZmailbox for next set of foci
		//at this point windows are in standard Z arrangement

		//find win in windows array then bring to "top"
		var found = 0;
		for(var i=0;win && i<=_windows.length;++i)
		{	//only search, if win is valid (if not this function was likely called by timer watchdog _checkMailboxes())
			if(found) //copy each window down within windows array
			{
				var winToMov = i<_windows.length?_windows[i]:win; //if to the end, put the win in question
				winToMov.setWindowZ(i-1 + _defaultWindowMinZindex); //standardize window Z
				_windows[i-1] = winToMov;
			}
			else if(_windows[i] == win) found = 1; //found!
		}

		if(!found && win)
			Debug.log("Desktop Foreground window not Found!! Window: " +
				win.getWindowSubName());

		_dashboard.updateWindows();

		//if(win) Debug.log("Desktop Window Set to Foreground named " + win.getWindowSubName());
		//else  Debug.log("Desktop Foreground Window with no parameter");
	} //end setForeWindow()

	//==============================================================================
	//closeWindowById ~~~
	//	Find window by id
	this.closeWindowById = function(id)
	{
		var win = this.getWindowById(id);
		if(win == -1) return -1;
		_closeWindow(win);
	} //end closeWindowById()

	//==============================================================================
	//maximizeWindowById ~~~
	//	Find window by id
	this.maximizeWindowById = function(id)
	{
		var win = this.getWindowById(id);
		if(win == -1) return -1;
		this.setForeWindow(win);
		this.toggleFullScreen();
	} //end maximizeWindowById()

	//==============================================================================
	//toggleFullScreen ~~~
	//	Toggle current top window full screen (can be called as event)
	this.toggleFullScreen = function(e)
	{
		if(!_getForeWindow()) return;

		_getForeWindow().isMaximized() ? _getForeWindow().unmaximize(): _getForeWindow().maximize();

		Desktop.desktop.redrawDashboardWindowButtons();

		//_dashboard.redrawFullScreenButton();
		//_dashboard.redrawRefreshButton();
		Debug.log("Full Screen Toggled");
	} //end toggleFullScreen()

	//==============================================================================
	this.redrawDashboardWindowButtons = function()
	{
		_dashboard.redrawFullScreenButton();
		_dashboard.redrawRefreshButton();
		_dashboard.redrawShowDesktopButton();
	} //end redrawDashboardWindowButtons()

	//==============================================================================
	this.refreshWindowById = function(id)
	{
		var win = this.getWindowById(id);
		if(win == -1) return -1;

		this.setForeWindow(win);
		this.refreshWindow();
		Debug.log("Finished refreshWindow() " + id);
	} //end refreshWindowById()

	//==============================================================================
	this.windowHelpById = function (id)
	{
		var win = this.getWindowById(id);
		if (win == -1) return -1;

		this.setForeWindow(win);
		var tempwin = Desktop.desktop.getForeWindow();

		Debug.log(tempwin);
		Debug.log(tempwin.windiv);

		var tooltipEl;

		try //try no-frameset approach (if window is not in frame)
		{
			tooltipEl = tempwin.windiv.childNodes[2].childNodes[0].contentWindow.document.getElementById("otsDesktopWindowTooltipElement");
		}
		catch(e)
		{
			Debug.log("Ignoring error: " + e);
			tooltipEl = 0;
		}

		if(!tooltipEl)
		{
			try //try frameset approach (if window is in frame)
			{
				tooltipEl = tempwin.windiv.childNodes[2].childNodes[0].contentWindow.document.getElementsByTagName("frameset")[0].childNodes[0].contentWindow.document.getElementById("otsDesktopWindowTooltipElement");
			}
			catch(e)
			{
				Debug.log("Ignoring error: " + e);
				tooltipEl = 0;
			}
		}
		if(!tooltipEl)
		{
			try //try frameset cross-origin approach (if window is in cross-origin frame)
			{
				var reqObject = {
					"windowId":			id,
					"request": 			"doWindowTooltip"
				};
				Debug.log("Sending doWindowTooltip from Desktop");
				win.getFrame().contentWindow.postMessage(
					reqObject,"*");
				return; //assume handled by window!
			}
			catch(e)
			{
				Debug.log("Ignoring error: " + e);
				tooltipEl = 0;
			}
		}


		if(!tooltipEl)
		{
			DesktopContent.tooltip("ALWAYS", "There is no tooltip for the '<b>" + tempwin.getWindowName() +
					"</b>' window. Try visiting <a href='https://otsdaq.fnal.gov' target='_blank'>otsdaq.fnal.gov</a> for further assistance.");
		}
		else
		{
			DesktopContent.tooltip("ALWAYS", decodeURIComponent(tooltipEl.innerText));
		}
	} //end windowHelpById()

	//==============================================================================
	this.refreshWindow = function(e)
	{
		if(!_getForeWindow()) return;
		//Debug.log("Windows Length: " + _windows.length);

		var window = _getForeWindow();
		var id  = window.getWindowId();
		var z   = window.getWindowZ();
		var name    = window.getWindowName();
		var subname = window.getWindowSubName();
		var url     = window.getWindowUrl();
		var width   = window.getWindowWidth();
		var height  = window.getWindowHeight();
		var x = window.getWindowX();
		var y = window.getWindowY();
		var isMax = window.isMaximized();
		var isMin = window.isMinimized();

		_closeWindow(window);
		// console.log(window, id, z, name, width, height);

		var newWindow = this.addWindow(name,subname,url);
		newWindow.setWindowSizeAndPosition(x,y,width,height);
		newWindow.setWindowZ(z);

		if(isMax)
			newWindow.maximize();
		if(isMin)
			newWindow.minimize();

		//Debug.log("Windows Length: " + _windows.length);

		return newWindow;
	} //end refreshWindow()

	//==============================================================================
	//minimizeWindowById ~~~
	//	Find window by id
	this.minimizeWindowById = function(id) {
		var win = this.getWindowById(id);
		if(win == -1) return -1;

		this.setForeWindow(win);
		this.toggleMinimize();
	} //end minimizeWindowById()

	//==============================================================================
	//toggleMinimize ~~~
	//	Toggle current top window minimize functionality (can be called as event)
	this.toggleMinimize = function(e) {
		if(!_getForeWindow()) return;

		if(_getForeWindow().isMinimized())
			_getForeWindow().unminimize();
		else
			_getForeWindow().minimize();
		Debug.log("Minimize Toggled");
		//_dashboard.updateWindows();

	} //end toggleMinimize()


	//==============================================================================
	//clickedWindowDashboard ~~~
	//	Handle window selection using dashboard
	this.clickedWindowDashboard = function(id)
	{
		if(0)
		{
			var win = this.getWindowById(id);
			if(win == -1) return -1;
			if(_getForeWindow() != win)
			{ //if not currently foreground window, set as only
				if(_getForeWindow().isMaximized()) this.toggleFullScreen(); //if old foreground is full screen, toggle
				this.setForeWindow(win);
				if(_getForeWindow().isMinimized()) this.toggleMinimize(); //if new foreground is minimized, toggle
				return;
			}
			//else minimize
			this.toggleMinimize();
			return;
		}

		//old functionality above acted more like Windows (removing Maximize if clicking)
		//new functionality below acts like full screen tab system, to just select which window to show maximized


		var win = this.getWindowById(id);
		if(win == -1) return -1;
		if(_getForeWindow() != win)
		{ //if not currently foreground window, set as only
			var inMaxMode = false;
			if(_getForeWindow().isMaximized())
			{
				this.toggleFullScreen(); //if old foreground is full screen, toggle
				inMaxMode = true;
			}

			this.setForeWindow(win);

			if(_getForeWindow().isMinimized()) this.toggleMinimize(); //if new foreground is minimized, toggle
			if(inMaxMode) this.toggleFullScreen();

			return;
		}
		//else minimize if not maximized

		if(!_getForeWindow().isMaximized())
			this.toggleMinimize();

	} //end clickedWindowDashboard()

	//==============================================================================
	//setDefaultWindowColor() ~~~
	//	set background color for all windows
	this.setDefaultWindowColor = function(color)
	{
		this.defaultWindowFrameColor = color;
		//_windowColorPostbox.innerHTML = this.defaultWindowFrameColor; //set to color string

		//same color code as DesktopWindow.js Creation constructor L385
		//check if color is dark or light to determine text color
		//assume rgba format (.9 alpha)
		var rgbArr = color.split('(')[1].split(',');
		var brightVal = rgbArr[0]*rgbArr[0] + rgbArr[1]*rgbArr[1] + rgbArr[2]*rgbArr[2];
		var blueVal = (rgbArr[2]-rgbArr[0]) +
			(rgbArr[2]-rgbArr[1]);
		Debug.logv({brightVal});
		Debug.logv({blueVal});
		var lightText = false;
		//if too dark or too blue, make text light
		if(brightVal < 40000 || blueVal > 90)
			lightText = true;

		for(var i=0;i<_windows.length;++i)
		{
			_windows[i].windiv.style.backgroundColor = this.defaultWindowFrameColor;
			//1st child node is the window header text
			if(_windows[i].windiv.childNodes.length)
				_windows[i].windiv.childNodes[0].style.color = lightText?"white":"#0f2269";
		}

	} //end setDefaultWindowColor()

	//==============================================================================
	//defaultLayoutSelect() ~~~
	//	set default layout of windows
	//	0-1 are system defaults
	//	3-5 are user defaults
	//	6 is last saved layout checkpoint
	this.defaultLayoutSelect = function(i)
	{
		Debug.log("Desktop defaultLayoutSelect " + i);

		var layoutStr;
		var numOfUserLayouts = 5;
		var numOfSystemLayouts = 5;
		if(i >= numOfSystemLayouts+1 && //user layouts
				i <= numOfSystemLayouts+1+numOfUserLayouts)
			layoutStr = _login.getUserDefaultLayout(i-(numOfSystemLayouts+1));
		else if(i >= 0 && i <= numOfSystemLayouts) //system layouts
			layoutStr = _login.getSystemDefaultLayout(i);
		else //invalid
		{
			Debug.log("Invalid layout index: " + i, Debug.HIGH_PRIORITY);
			return;
		}
		var layoutArr = layoutStr.split(",");

		var numOfFields = 8;
		var numOfWins = parseInt(layoutArr.length/numOfFields);

		Debug.log("Desktop defaultLayoutSelect layout numOfFields=" + numOfFields);
		Debug.log("Desktop defaultLayoutSelect layout " + numOfWins +
				" windows - " + layoutStr);

		//clear all current windows
		Desktop.desktop.closeAllWindows();

		//open chosen default layout
		//	Note: represent position in terms of 0-10000 for the entire Desktop Content area
		//		- this should allow for translation to any size Desktop Content area when loaded
		//
		//	layout window fields:
		//		0: _windows[i].getWindowName()
		//		1: _windows[i].getWindowSubName()
		//		2: _windows[i].getWindowUrl().replace(/&/g,'%38').replace(/=/g,'%61')  //global replace & and =
		//		3: (((_windows[i].getWindowX()-dx)/dw)|0)
		//		4: (((_windows[i].getWindowY()-dy)/dh)|0)
		//		5: ((_windows[i].getWindowWidth()/dw)|0)
		//		6: ((_windows[i].getWindowHeight()/dh)|0)
		//		7: (_windows[i].isMinimized()?"0":(_windows[i].isMinimized()?"2":"1"))
		var dw = Desktop.desktop.getDesktopContentWidth()/10000.0; //to calc int % 0-10000
		var dh = Desktop.desktop.getDesktopContentHeight()/10000.0;//to calc int % 0-10000
		var dx = Desktop.desktop.getDesktopContentX();
		var dy = Desktop.desktop.getDesktopContentY();
		for(i=0;i<numOfWins;++i)
		{
			Debug.log("adding " + layoutArr[i*numOfFields].substr(1) + "-" + layoutArr[i*numOfFields+1]);
			this.addWindow(	//(name,subname,url,unique)
				decodeURIComponent(layoutArr[i*numOfFields]),
				decodeURIComponent(layoutArr[i*numOfFields+1]),
				decodeURIComponent(layoutArr[i*numOfFields+2]),//.replace(/%38/g,"&").replace(/%61/g,"="), //replace back = and &
				false);
			_windows[_windows.length-1].setWindowSizeAndPosition(		//(x,y,w,h)
				layoutArr[i*numOfFields+3]*dw + dx,
				layoutArr[i*numOfFields+4]*dh + dy,
				layoutArr[i*numOfFields+5]*dw,
				layoutArr[i*numOfFields+6]*dh);

			if((layoutArr[i*numOfFields+7]|0) == 0) //convert to integer, if 0 then minimize
				_windows[_windows.length-1].minimize();
			else if((layoutArr[i*numOfFields+7]|0) == 2) //convert to integer, if 0 then maximize
				_windows[_windows.length-1].maximize();
		}
	} //end defaultLayoutSelect()

	//==============================================================================
	//closeAllWindows() ~~~
	// close all windows is used when default layout is changed or a new user logs in
	this.closeAllWindows = function()
	{
		Debug.log("Desktop closeAllWindows");
		//clear all current windows
		while(_windows.length) _closeWindow(_windows[_windows.length-1]);
	} //end closeAllWindows()

	//==============================================================================
	//resetDesktop() ~~~
	// called by successful login to reset desktop based on user's permissions
	this.resetDesktop = function(permissions)
	{
		Debug.log("reset desktop()");

		//_needToLoginMailbox.innerHTML = ""; //reset mailbox
		//_blockSystemCheckMailbox.innerHTML = ""; //reset mailbox
		_sysMsgCounter = 0; //reset system message counter

		//update icons based on permissions	(if undefined, keep permissions from before)
		Desktop.desktop.icons.resetWithPermissions(permissions);

		//if not logged in -- attempt to fix it
		if(!Desktop.desktop.serverConnected &&
				(!Desktop.desktop.login ||
						!Desktop.desktop.login.getCookieCode(true)))
		{
			Debug.log("Reset is setting up login...");
			Desktop.desktop.login.setupLogin();
		}

		//re-start timer for checking foreground window changes due to iFrame content code

		window.clearTimeout(Desktop.desktop.checkMailboxTimer);
		_checkMailboxes();

		//setup lock the first time
		if(Desktop.desktop.login.getCookieCode(true))
			Desktop.XMLHttpRequest("Request?RequestType=getSystemMessages","",
				_handleSystemMessages);


		Desktop.turtle = document.getElementById('turtle');
		if(Desktop.turtle)
		{
			Desktop.turtle.motion = false;
			Desktop.turtle.x = 0;
			Desktop.turtle.y = 0;
			Desktop.turtleRedraw();
		}

	} //end resetDesktop()

	//==============================================================================
	//refreshDesktop() ~~~
	this.refreshDesktop = function()
	{
		for(var i=0; i<Desktop.desktop.getNumberOfWindows();++i)
			Desktop.desktop.refreshWindowById(Desktop.desktop.getWindowByIndex(i));

	} //end refreshDesktop()

	//actOnParameterAction() ~~~
	//	called during create desktop to handle any shortcuts to windows being maximized
	this.actOnParameterAction = function()
	{

		//get parameters
		var paramsStr = window.parent.window.location.search.substr(1); //skip the '?'
		var params = [];
		var paramCnt = 5 + (Desktop.isWizardMode()?1:0); //1 extra param in wiz mode
		var spliti, splitiOld = 0;
		for(var i=0;i<paramCnt;++i)
		{
			if(i == paramCnt-1) //last one take the whole thing (this is path, and could have &'s in it)
			{
				params.push(paramsStr.substr(splitiOld));
				break;
			}
			//for others, handle like normal get param
			spliti = paramsStr.indexOf('&', splitiOld);
			params.push(paramsStr.substr(splitiOld,spliti-splitiOld))
			splitiOld = spliti+1;
		}

		var varPair;
		var requestingWindowId = "", windowPath = "";
		var windowName, windowSubname, windowUnique, newWindowOps;
		for(var i=0;i<params.length;++i)
		{
			spliti = params[i].indexOf('=');
			varPair = [params[i].substr(0,spliti),params[i].substr(spliti+1)];
			if(varPair[0] 		== "requestingWindowId")
				requestingWindowId 	= varPair[1];
			else if(varPair[0] 	== "windowPath")
				windowPath 			= decodeURIComponent(varPair[1]);
			else if(varPair[0] 	== "windowName")
				windowName 			= varPair[1];
			else if(varPair[0] 	== "windowSubname")
				windowSubname		= varPair[1];
			else if(varPair[0] 	== "windowUnique")
				windowUnique 		= varPair[1];
		}

		if(windowPath.indexOf("newWindowOps") >= 0)
		{
			//extract newWindowOps
			newWindowOps = windowPath.split('&')[1].split('=')[1];
			windowPath = windowPath.split('&')[0];
		}

//		for(var i=0;i<params.length;++i)
//		{
//    		spliti = params[i].indexOf('=');
//    		varPair = [params[i].substr(0,spliti),params[i].substr(spliti+1)];
//			Debug.log(i + ": " + varPair[0] + "=" + varPair[1]);
//			if(varPair[0] 		== "requestingWindowId")
//				requestingWindowId 	= varPair[1];
//			else if(varPair[0] 	== "windowPath")
//				windowPath 			= decodeURIComponent(varPair[1]);
//			else if(varPair[0] 	== "windowName")
//				windowName 			= varPair[1];
//			else if(varPair[0] 	== "windowSubname")
//				windowSubname		= varPair[1];
//			else if(varPair[0] 	== "windowUnique")
//				windowUnique 		= varPair[1];
//			else if(varPair[0] 	== "newWindowOps")
//				newWindowOps 		= varPair[1];
//		}

		if(requestingWindowId != "" && windowPath != "")
		{
			//have work to do!
			//Debug.log("_openWindowMailbox.innerHTML=" + _openWindowMailbox.innerHTML);
			Debug.log("requestingWindowId=" + requestingWindowId);
			Debug.log("windowPath=" + windowPath);
			if(newWindowOps) newWindowOps = newWindowOps.replace(/%22/g, "\"");
			Debug.log("newWindowOps=" + newWindowOps);
			windowName = windowName.replace(/%20/g, " ");
			Debug.log("windowName=" + windowName);
			windowSubname = windowSubname.replace(/%20/g, " ");
			Debug.log("windowSubname=" + windowSubname);
			Debug.log("windowUnique=" + windowUnique);

			var newWin;


			//check if opening layout
			if(windowName.indexOf("Desktop.openLayout(") == 0)
			{
				var layoutIndex = windowName.substr(("Desktop.openLayout(").length,
						windowName.length-1-("Desktop.openLayout(").length) | 0;
				Debug.log("Opening layout... " + layoutIndex);

				if(pathUniquePair ===
						undefined)
				{

					if(_firstCheckOfMailboxes)
					{
						Debug.log("Perhaps user layout preferences have not been setup yet, try again at mailbox check.");
						return;
					}
				}


				_firstCheckOfMailboxes = false; //no need to check at mailbox check time, we are good to go already!

				Desktop.desktop.dashboard.toggleWindowDashboard(0,false);
				Desktop.desktop.defaultLayoutSelect(layoutIndex);
				return;
			} //end openLayout handling

			//if only windowName is defined, then attempt to open the icon on the
			//	Desktop with that name (this helps resolve supervisor LIDs, etc.)
			if(windowSubname == "undefined" &&
					windowUnique == "undefined") //the string undefined is what comes through
			{
				Debug.log("Opening desktop window... " + windowName);


				var pathUniquePair = Desktop.desktop.icons.iconNameToPathMap;
				if(pathUniquePair)
					pathUniquePair = Desktop.desktop.icons.iconNameToPathMap[windowName];
				Debug.log("Desktop.desktop.icons.iconNameToPathMap",
					pathUniquePair);

				if(pathUniquePair ===
						undefined)
				{
					if(_firstCheckOfMailboxes)
					{
						Debug.log("Perhaps icons have not been setup yet, try again at mailbox check.");
						return;
					}

					Debug.log("An error occurred opening the window named '" +
							windowName + "' - it was not found in the Desktop icons. Does it exist? " +
							"Do you have permissions to access this window? Notify admins if the problem persists.",
							Debug.HIGH_PRIORITY);

					//respond done
					//clear mailbox string since no window is listening for done when a new desktop begins
					//_openWindowMailbox.innerHTML = "";//str; //indicate done
					return;
				}
				var pathStr = pathUniquePair[0];

				if(windowPath != "undefined") //add parameters if defined
				{
					Debug.log("Adding parameter path " + windowPath);

					if(pathStr.indexOf('&amp;') > 0) //then assume already parameters
						pathStr += "&amp;";
					else if(pathStr.indexOf('?') > 0 &&  //then assume & for parameters is good
							pathStr[pathStr.length-1] != '?')
						pathStr += "&";
					else if(pathStr.length &&
							pathStr[pathStr.lengh-1] != '?') //then assume need ?
						pathStr += '?';
					windowPath = pathStr + windowPath;
				}
				else
					windowPath = pathStr;

				newWin = Desktop.desktop.addWindow(	//(name,subname,url,unique)
						windowName,
						"",
						windowPath +		//e.g. "http://rulinux03.dhcp.fnal.gov:1983/WebPath/html/ConfigurationGUI.html?urn=280",
						((windowPath.indexOf('?') < 0)? "?":"&amp;") + //add ? start of get parameters if necessary
						((newWindowOps)?"newWindowOps=" + newWindowOps:""), //add get parameter to path for further operations
						eval(pathUniquePair[1]));
			} //end handling of opening desktop window
			else
			{
				_firstCheckOfMailboxes = false; //no need to check at mailbox check time, we are good to go already!
				newWin = Desktop.desktop.addWindow(	//(name,subname,url,unique)
						windowName,
						windowSubname,
						windowPath +		//e.g. "http://rulinux03.dhcp.fnal.gov:1983/WebPath/html/ConfigurationGUI.html?urn=280",
						((windowPath.indexOf('?') < 0)? "?":"&amp;") + //add ? start of get parameters if necessary
						((newWindowOps)?"newWindowOps=" + newWindowOps:""), //add get parameter to path for further operations
						eval(windowUnique));
			}

			//set to fore window and full screen

			Desktop.desktop.dashboard.toggleWindowDashboard(0,false);

			//delay the setting of the fore window and fullscreen
			//	so that the window exists before changing it
			window.setTimeout(function(){
				Desktop.desktop.setForeWindow(newWin);
				Desktop.desktop.toggleFullScreen();
			}, 200);

			//clear mailbox string since no window is listening for done when a new desktop begins
			//_openWindowMailbox.innerHTML = "";//str; //indicate done
		}
	} //end actOnParameterAction()

	//------------------------------------------------------------------
	//handle class construction ----------------------
	//------------------------------------------------------------------

	//create a div just to direct style properly to contents of Desktop
	_desktopElement = document.createElement("div");
	_desktopElement.setAttribute("id", "Desktop");
	document.body.appendChild(_desktopElement);
	document.body.onmousemove = Desktop.handleBodyMouseMove;
	window.onmouseup = Desktop.handleWindowMouseUp; //added to fix firefox mouseup glitch with window moving
	document.body.addEventListener('touchmove',Desktop.handleBodyTouchMove);
	document.body.addEventListener('touchend',Desktop.handleBodyTouchEnd);
	window.onresize = _handleDesktopResize;
	Desktop.desktop = this;

//	//create windowZmailbox for focus switching through iFrame
//    _windowZmailbox = document.createElement("div");
//	_windowZmailbox.setAttribute("id", "Desktop-windowZmailbox");
//	_windowZmailbox.innerHTML = _defaultWindowMaxZindex;
//	_windowZmailbox.style.display = "none";
//    _desktopElement.appendChild(_windowZmailbox);

//	//create mouseOverXmailbox for focus switching through iFrame
//    _mouseOverXmailbox = document.createElement("div");
//	_mouseOverXmailbox.setAttribute("id", "Desktop-mouseOverXmailbox");
//	_mouseOverXmailbox.style.display = "none";
//    _desktopElement.appendChild(_mouseOverXmailbox);
//
//	//create mouseOverYmailbox for focus switching through iFrame
//    _mouseOverYmailbox = document.createElement("div");
//	_mouseOverYmailbox.setAttribute("id", "Desktop-mouseOverYmailbox");
//	_mouseOverYmailbox.style.display = "none";
//    _desktopElement.appendChild(_mouseOverYmailbox);

	this.resetFrameMouse();

	//create mailboxes for Window content code
//    var tmpHiddenDiv = document.createElement("div");
//    tmpHiddenDiv.setAttribute("id", "DesktopContent-cookieCodeMailbox");
//    tmpHiddenDiv.style.display = "none";
//    _desktopElement.appendChild(tmpHiddenDiv);
//    _updateTimeMailbox = document.createElement("div");
//    _updateTimeMailbox.setAttribute("id", "DesktopContent-updateTimeMailbox");
//    _updateTimeMailbox.style.display = "none";
//    _desktopElement.appendChild(_updateTimeMailbox);
//    _needToLoginMailbox = document.createElement("div");
//    _needToLoginMailbox.setAttribute("id", "DesktopContent-needToLoginMailbox");
//    _needToLoginMailbox.style.display = "none";
//    _desktopElement.appendChild(_needToLoginMailbox);

//    _blockSystemCheckMailbox = document.createElement("div");
//    _blockSystemCheckMailbox.setAttribute("id", "DesktopContent-blockSystemCheckMailbox");
//    _blockSystemCheckMailbox.style.display = "none";
//    _desktopElement.appendChild(_blockSystemCheckMailbox);



	//create mailbox for opening windows from Desktop Windows
//    _openWindowMailbox = document.createElement("div");
//    _openWindowMailbox.setAttribute("id", "DesktopContent-openWindowMailbox");
//    _openWindowMailbox.style.display = "none";
//    _desktopElement.appendChild(_openWindowMailbox);

	//create mailbox for settings update
	_updateSettingsMailbox = document.createElement("div");
	_updateSettingsMailbox.setAttribute("id", "DesktopContent-updateSettingsMailbox");
	_updateSettingsMailbox.style.display = "none";
	_updateSettingsMailbox.innerHTML = ""; //init to empty
	_desktopElement.appendChild(_updateSettingsMailbox);
	_settingsLayoutMailbox = document.createElement("div");
	_settingsLayoutMailbox.setAttribute("id", "DesktopContent-settingsLayoutMailbox");
	_settingsLayoutMailbox.style.display = "none";
	_settingsLayoutMailbox.innerHTML = ""; //init to empty
	_desktopElement.appendChild(_settingsLayoutMailbox);

	//create postbox for chosen color settings
//    _windowColorPostbox = document.createElement("div");
//    _windowColorPostbox.setAttribute("id", "DesktopContent-windowColorPostbox");
//    _windowColorPostbox.style.display = "none";
//    _windowColorPostbox.innerHTML = this.defaultWindowsFrameColor; //init to color string
//    _desktopElement.appendChild(_windowColorPostbox);


	//create message request listener from desktop windows, to overcome same-origin policy
	window.addEventListener('message', event => {

		// console.log("Parent event.data",event.data);

		if(event.data.windowId === undefined)
		{
			if(event.data.request)
				Debug.log("Illegal window  message received! Notify admins",
					Debug.HIGH_PRIORITY);
			else
				Debug.log("Illegal window  message received! Assuming this is a window not implementing DesktopContent.js")

			return;
		}

		var responseObject;
		switch(event.data.request)
		{
		case "updateMouseoverXY":
			//add window frame position(absolute) + iframe position within window + mouse position within iframe
			var el = document.getElementById("DesktopWindowFrame-" + event.data.windowId);
			if(el)
			{
				_mouseOverXmailbox = parseInt(el.parentNode.parentNode.offsetLeft) +
						parseInt(el.offsetLeft) + parseInt(event.data.x);
				_mouseOverYmailbox = parseInt(el.parentNode.parentNode.offsetTop) +
						parseInt(el.offsetTop) + parseInt(event.data.y);
			}
			else
			{
				_mouseOverXmailbox = event.data.x|0;
				_mouseOverYmailbox = event.data.y|0;
			}
			console.log("updateMouseoverXY",_mouseOverXmailbox,_mouseOverYmailbox);
			break;
		case "makeForeWindow":
			//console.log("makeForeWindow",event.data.windowId);
			Desktop.desktop.setForeWindow(this.getWindowById(event.data.windowId|0));
			break;
		case "unmaximizeWindow":
			console.log("unmaximizeWindow",event.data.windowId);
			Desktop.desktop.setForeWindow(this.getWindowById(event.data.windowId|0));
			if(!_getForeWindow()) return;

			if(_getForeWindow().isMaximized())
				Desktop.desktop.toggleFullScreen();

			break;
		case "openNewWindow":
			Debug.log("openNewWindow");

			var requestingWindowId = 	event.data.windowId|0;
			var windowPath = 			event.data.windowPath;
			var windowName = 			event.data.windowName;
			var windowSubname = 		event.data.windowSubname;
			var windowUnique = 			event.data.windowUnique;

			if(windowPath != "")
			{
				//have work to do!
				// Note: similar to L1000 in actOnParameterAction()
				Debug.log("requestingWindowId=" + requestingWindowId);
				Debug.log("windowPath=" + windowPath);
				while(windowPath && windowPath.length && windowPath[0] == '?')
					windowPath = windowPath.substr(1); //remove leading ?'s
				Debug.log("modified windowPath=" + windowPath);
				Debug.log("windowName=" + windowName);
				Debug.log("windowSubname=" + windowSubname);
				Debug.log("windowUnique=" + windowUnique);

				var newWin;

				//if only windowName is defined, then attempt to open the icon on the
				//	Desktop with that name (this helps resolve supervisor LIDs, etc.)
				if((windowSubname === undefined || windowSubname == "undefined") &&
						(windowUnique === undefined || windowUnique == "undefined")) //the string undefined is what comes through
				{
					Debug.log("Opening desktop window... " + windowName);

					var pathUniquePair = Desktop.desktop.icons.iconNameToPathMap[windowName];
					// console.log("Desktop.desktop.icons.iconNameToPathMap",
					// 		Desktop.desktop.icons.iconNameToPathMap);

					if(pathUniquePair ===
							undefined)
					{
						Debug.log("An error occurred opening the window named '" +
								windowName + "' - it was not found in the Desktop icons. " +
								"Do you have permissions to access this window? Notify admins if the problem persists.",
								Debug.HIGH_PRIORITY);

						//respond done
//						var str = "requestingWindowId=" + requestingWindowId;
//						str += "&done=1";
//						_openWindowMailbox.innerHTML = str; //indicate done

						return;
					}

					var pathStr = pathUniquePair[0];

					if(windowPath && windowPath != "undefined") //add parameters if defined
					{
						Debug.log("Adding parameter path " + windowPath);
						if(pathStr.indexOf('?') >= 0) //then assume already parameters
							pathStr += "&";
						else if(pathStr.length) //then assume need ?
							pathStr += '?';
						windowPath = pathStr + windowPath;
					}
					else
						windowPath = pathStr;

					newWin = Desktop.desktop.addWindow(	//(name,subname,url,unique)
							windowName,
							"",
							windowPath,		//e.g. "http://rulinux03.dhcp.fnal.gov:1983/WebPath/html/ConfigurationGUI.html?urn=280",
							eval(pathUniquePair[1]));
				}
				else
				{
					newWin = Desktop.desktop.addWindow(	//(name,subname,url,unique)
							windowName,
							windowSubname,
							windowPath,		//e.g. "http://rulinux03.dhcp.fnal.gov:1983/WebPath/html/ConfigurationGUI.html?urn=280",
							eval(windowUnique));
				}

				//delay the setting of the fore window
				window.setTimeout(function(){ Desktop.desktop.setForeWindow(newWin); }, 200);

//				var str = "requestingWindowId=" + requestingWindowId;
//				str += "&done=1";
//				_openWindowMailbox.innerHTML = str; //indicate done
			}

			break;
		case "refreshIcons":
			Debug.log("refreshIcons");

			//reset icons, if permissions undefined, keep permissions from before
			Desktop.desktop.icons.resetWithPermissions(
					undefined /*undefined permissions*/, true /*keepSamePermissions*/);

			break;
		case "startSystemBlackout":
			Debug.log("startSystemBlackout");
			//windows can request a blackout, to avoid logging out (attempt to stop all other tabs by using browser cookie)
			Desktop.desktop.login.blackout(true);
			break;
		case "stopSystemBlackout":
			Debug.log("stopSystemBlackout");
			Desktop.desktop.login.blackout(false);
			break;
		case "getCookieCode":
			responseObject = {
				"cookieCode":	Desktop.desktop.login.getCookieCode()
			};
			//Debug.log("getCookieCode");
			break;
		case "updateCookieCode":
			//do ms compare to decide if desktop cookie code should be updated with some throttling
			var delta = parseInt(event.data.cookieCodeTime) - parseInt(Desktop.desktop.login.getCookieTime());

			// Debug.log("updateCookieCode",delta);
			if(delta > 5*1000 /*ms*/) //update based on content value
			{
				// Debug.log("Updating desktop cookie code from content window");
				Desktop.desktop.login.updateCookieFromContent(
						event.data.cookieCode,
						parseInt(event.data.cookieCodeTime));
			}
			break;
		case "updateSequence":
			Debug.log("Received updated sequence from Content WindowID =", event.data.windowId);

			var newSequence = event.data.sequence;
			//verify that new sequence is alphanumeric only (to avoid parameter injection)
			for(var i=0;i<newSequence.length;++i)
				if(!((newSequence[i] >= '0' && newSequence[i] <= '9') ||
				(newSequence[i] >= 'A' && newSequence[i] <= 'Z') ||
				(newSequence[i] >= 'a' && newSequence[i] <= 'z')))
				{
					Debug.err("Invalid updated sequence received from desktop window with WindowID =", event.data.windowId,"Notify admins!");
					return;
				}

			var newSearch = window.parent.window.location.search;
			Debug.logv({newSearch});
			var ii = newSearch.indexOf("code=");
			if(ii < 0)
			{
				Debug.err("Cannot find code= paramaeter! Notify admins.");
				return;
			}
			newSearch = newSearch.substr(0,ii+("code=").length) +
				newSequence;
			Debug.logv({newSearch});

			//save as integer fraction of 1000 into URL
			var newURL = window.parent.window.location.pathname +
					newSearch +
					"#"+
					((Desktop.desktop.dashboard.getDashboardWidth()*1000/
					Desktop.desktop.dashboard.getDashboardDefaultWidth())|0);

			//update browser url so refresh will give same desktop experience
			if(!Desktop.isWizardMode())
				window.parent.window.history.replaceState('ots', 'ots', newURL);
			else
				window.parent.window.history.replaceState('ots wiz', 'ots wiz', newURL);

			Debug.log("Tell all open windows about new sequence", newSequence);

			var reqObject = {"request":		"updateWindowSequence",
							"sequence":		newSequence};
			for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i)
			{
				reqObject["windowId"] = Desktop.desktop.getWindowByIndex(i).getWindowId();
				Desktop.desktop.getWindowByIndex(i).getFrame().contentWindow.postMessage(
						reqObject,"*");
			}
			break;
		case "needToLogin":
			Debug.log("needToLogin");

			if(!document.getElementById("Desktop-loginDiv") &&
					!Desktop.desktop.login.isBlackout())
			{
				//use login div presence to only logout once
				Debug.log("DesktopContent signaled new login needed!");
				Desktop.logout();
			}
			else
				Debug.log("Ignoring desktop content need for login signal due to blackout.");

			break;
		default:
			Debug.log("Illegal window message request received! Notify admins", Debug.HIGH_PRIORITY);
			return;
		}

		if(responseObject !== undefined) //send response back
		{
			//send message to window (add windowId for 'security')
			responseObject["windowId"] = event.data.windowId;
			responseObject["request"] = event.data.request + "Response";
			// console.log("responseObject",responseObject);
			this.getWindowById(event.data.windowId|0).getFrame().contentWindow.postMessage(
					responseObject,"*");

		}
	}); //end Desktop window message listener


	//add dashboard
	this.dashboard = _dashboard = Desktop.createDashboard(_defaultDashboardZindex);
	_desktopElement.appendChild(_dashboard.dashboardElement);

	//add icons
	this.icons = _icons = Desktop.createIcons(0);
	_desktopElement.appendChild(_icons.iconsElement);

	_handleDesktopResize();

	window.clearTimeout(this.checkMailboxTimer);
	this.checkMailboxTimer = window.setTimeout(_checkMailboxes,_MAILBOX_TIMER_PERIOD); //start timer for checking foreground window changes due to iFrame content code

	//add login
	this.login = _login = new Desktop.login(!(this.security == Desktop.SECURITY_TYPE_NONE)); //pass true to enable login
	if(_login.loginDiv)
		_desktopElement.appendChild(_login.loginDiv); //add to desktop element for login to display things

	Debug.log("Desktop Created");

	Debug.log("Checking for any shortcut work from get parameters...");
	Desktop.desktop.actOnParameterAction();  //first time, _firstCheckOfMailboxes is true (then it will try again in checkMailboxes)
} //end Desktop constructor

////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//define Desktop mouse helper functions
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////

Desktop.foreWinLastMouse = [-1,-1];
Desktop.winManipMode = Desktop.WIN_MANIP_MODE.NONE;
Desktop.stretchAndMoveInterval = 0; //used to stretch and move even while moving over iFrames
Desktop.disableMouseDown = 0;

////////////// TOUCHES START CODE ////////////////////

//==============================================================================
//Desktop.handleTouchStart ~~
//  touch start is called before mouse down, so need to prepare mousedown
//		as though mousemove has been called. Only allow moving window.
//		Disallow dashboard resizing.
Desktop.handleTouchStart = function(touchEvent)
{
	Desktop.disableMouseDown = 1; //Disable mouse down on windows if touches are happening
	var touch = touchEvent.targetTouches[0];

	var winId = this.id.split('-')[1]; //get id string from div container id
	var isDashboard = (winId == "windowDashboard");
	var win;
	if(!isDashboard)
	{
		win = Desktop.desktop.getWindowById(winId);
		if(win == -1) return false;
		if(win.isMaximized()) {this.style.cursor = "default";return false;}

		//bring window to front if newly selected
		if(Desktop.desktop.getForeWindow() != win)
			Desktop.desktop.setForeWindow(win);
	}
	else return false; //disable dashboard sizing

	//if not manipulating the foreground window
	if(Desktop.foreWinLastMouse[0] == -1)
	{
		var locX = touch.pageX - this.offsetLeft;
		var locY = touch.pageY - this.offsetTop;

		Debug.log("Touch Down " + locX + " - " + locY);

		Desktop.desktop.getForeWindow().hideFrame();

		Desktop.foreWinLastMouse = [touch.pageX,touch.pageY];

		if(locY < win.getWindowHeaderHeight())
		{ //move
			Desktop.winManipMode = Desktop.WIN_MANIP_MODE.MOVE;
		}
	}

	return false; //to disable drag and drops
} //end handleTouchStart()

//==============================================================================
//Desktop.handleTouchEnd ~~
//  determine starting mouse position of move or resize
Desktop.handleBodyTouchEnd = function(touchEvent) {Desktop.handleTouchEnd(touchEvent);}
Desktop.handleTouchEnd = function(touchEvent)
{

	if(Desktop.foreWinLastMouse[0] != -1) //action was happening
	{
		Desktop.foreWinLastMouse = [-1,-1];
		Desktop.winManipMode = Desktop.WIN_MANIP_MODE.NONE;
		if(Desktop.desktop.getForeWindow()) Desktop.desktop.getForeWindow().showFrame();
		Debug.log("Touch End ");
	}
} //end handleTouchEnd()

//==============================================================================
//Desktop.handleTouchMove ~~
//  determine starting mouse position of move or resize
Desktop.handleBodyTouchMove = function(touchEvent) {Desktop.handleTouchMove(touchEvent);}
Desktop.handleTouchMove = function(touchEvent)
{
	if(Desktop.winManipMode != Desktop.WIN_MANIP_MODE.NONE &&
		Desktop.foreWinLastMouse[0] != -1) //action happen now
	{
		touchEvent.preventDefault(); //fix chrome issue of only 2 fires
		touchEvent.cancelBubble=true; //eat event away so scrolling doesnt happen

		var touch = touchEvent.targetTouches[0];
		var delta = [touch.pageX-Desktop.foreWinLastMouse[0], touch.pageY-Desktop.foreWinLastMouse[1]];
		//Debug.log("Touch move " + delta[0] + " , " + delta[1]);
		Desktop.desktop.getForeWindow().moveWindowByOffset(delta[0],delta[1]);
		Desktop.foreWinLastMouse = [touch.pageX,touch.pageY];
	}
} //end handleTouchMove()
////////////// TOUCHES END CODE ////////////////////

//==============================================================================
//Desktop.handleWindowMouseDown ~~
//  determine starting mouse position of move or resize
Desktop.handleWindowMouseDown = function(mouseEvent)
{
	var winId = this.id.split('-')[1]; //get id string from div container id
	var isDashboard = (winId == "windowDashboard");
	var win;
	if(!isDashboard)
	{
		win = Desktop.desktop.getWindowById(winId);
		if(win == -1) return false;

		//bring window to front if newly selected
		if(Desktop.desktop.getForeWindow() != win)
			Desktop.desktop.setForeWindow(win);
	}

	//touches can disable window mouse ops
	if(!Desktop.disableMouseDown && Desktop.winManipMode != Desktop.WIN_MANIP_MODE.NONE &&
		this.style.cursor != "default") //if moving or resizing window
	{
		//register move cursor and window in question
		Desktop.foreWinLastMouse = [mouseEvent.clientX,mouseEvent.clientY];
		if(!isDashboard)
		{
			//Desktop.desktop.getForeWindow().hideFrame();

			for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i)
				Desktop.desktop.getWindowByIndex(i).hideFrame();

		}
		//Debug.log("Move/Resize Mode: " + Desktop.winManipMode);
	}

	//if(!isDashboard) Debug.log("Mouse Down WinId:" + win.getWindowId() + " - " + this.style.cursor);

	return false; //to disable drag and drops
} //end handleWindowMouseDown()

//==============================================================================
//handleWindowMouseUp ~~
//  indicate that no further movement is happening
Desktop.handleWindowMouseUp = function(mouseEvent)
{
	if(Desktop.foreWinLastMouse[0] != -1) //currently action happening on foreground window
	{
		if(Desktop.stretchAndMoveInterval)
		{
			window.clearInterval(Desktop.stretchAndMoveInterval);	//kill interval iframe mouse watchdog
			Desktop.stretchAndMoveInterval = 0;

			//stop needing mouse xy from desktop windows
			var reqObject = {"request":		"stopNeedingMouseXY"};
			for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i)
			{
				reqObject["windowId"] = Desktop.desktop.getWindowByIndex(i).getWindowId();
				Desktop.desktop.getWindowByIndex(i).getFrame().contentWindow.postMessage(
						reqObject,"*");
			}
		}

		Desktop.foreWinLastMouse = [-1,-1];	//indicate no movements happening
		Desktop.winManipMode = Desktop.WIN_MANIP_MODE.NONE;
		//if(Desktop.desktop.getForeWindow())
		if(1)
		{
			//Desktop.desktop.getForeWindow().showFrame();

			for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i)
				Desktop.desktop.getWindowByIndex(i).showFrame();
		}

		//Debug.log("Mouse was released! which=" + mouseEvent.which);
	}
	Desktop.desktop.icons.closeFolder();
	return false;
} //end handleWindowMouseUp()

//==============================================================================
//handle window move and resize
Desktop.handleWindowMouseMove = function(mouseEvent)
{
	var winId = this.id.split('-')[1]; //get id string from div container id
	var isDashboard = (winId == "windowDashboard");
	var win;
	if(!isDashboard)
	{
		win = Desktop.desktop.getWindowById(winId);
		if(win == -1) return false;
		if(win.isMaximized()) {this.style.cursor = "default";return false;}
	}

	//change mouse cursor if over a window object and not manipulating the foreground window
	if(Desktop.foreWinLastMouse[0] == -1) 
	{
		var locX = mouseEvent.clientX - this.offsetLeft;
		var locY = mouseEvent.clientY - this.offsetTop;

		var hotCornerSz = 7;
		if(isDashboard) 
		{
			if(locX > Desktop.desktop.dashboard.getDashboardWidth() - hotCornerSz) 
			{
				this.style.cursor = "e-resize";
				Desktop.winManipMode = Desktop.WIN_MANIP_MODE.SIDEBAR;
			}
			else
				this.style.cursor = "default";
		}
		else 
		{
			if((locX < hotCornerSz && locY < hotCornerSz) ||
				(locX > win.getWindowWidth() - hotCornerSz && locY > win.getWindowHeight() - hotCornerSz)) 
			{
				this.style.cursor = "nw-resize";
				Desktop.winManipMode = locY < hotCornerSz?
					Desktop.WIN_MANIP_MODE.NW:Desktop.WIN_MANIP_MODE.SE;
			}
			else if((locX > win.getWindowWidth() - hotCornerSz && locY < hotCornerSz) ||
				(locX < hotCornerSz && locY > win.getWindowHeight() - hotCornerSz)) 
			{
				this.style.cursor = "ne-resize";
				Desktop.winManipMode = locY < hotCornerSz?
					Desktop.WIN_MANIP_MODE.NE:Desktop.WIN_MANIP_MODE.SW;
			}
			else if(locX < hotCornerSz) 
			{
				this.style.cursor = "w-resize";
				Desktop.winManipMode = Desktop.WIN_MANIP_MODE.W;
			}
			else if(locX > win.getWindowWidth() - hotCornerSz) 
			{
				this.style.cursor = "e-resize";
				Desktop.winManipMode = Desktop.WIN_MANIP_MODE.E;
			}
			else if(locY < hotCornerSz) 
			{
				this.style.cursor = "n-resize";
				Desktop.winManipMode = Desktop.WIN_MANIP_MODE.N;
			}
			else if(locY > win.getWindowHeight() - hotCornerSz) 
			{
				this.style.cursor = "s-resize";
				Desktop.winManipMode = Desktop.WIN_MANIP_MODE.S;
			}
			else if(locY < win.getWindowHeaderHeight()) 
			{
				this.style.cursor = "all-scroll";
				Desktop.winManipMode = Desktop.WIN_MANIP_MODE.MOVE;
			}
			else
				this.style.cursor = "default";
		}
	}

	//handle mouse movements within the page for better user response
	Desktop.handleBodyMouseMove(mouseEvent);

	return false; //to disable drag and drops
} //end handleWindowMouseMove()

Desktop._mouseMoveSubscribers = [];
//==============================================================================
//Desktop.mouseMoveSubscriber ~~
Desktop.mouseMoveSubscriber = function(newHandler)
{
	Desktop._mouseMoveSubscribers.push(newHandler);
}

//==============================================================================
//Desktop.handleBodyMouseMove ~~
//	handle resizing and moving events for desktop
//	Returning true is important for allowing selection of text of Debug popup windows
//		(Does it break anything to return true?)
Desktop._openFolderTimer = 0;
Desktop.handleBodyMouseMove = function(mouseEvent)
{
	//if not moving for 3 seconds, close any open folders
	if(Desktop._openFolderTimer &&
		!Desktop.desktop.icons.wasFolderIconClicked())
	{
		window.clearTimeout(Desktop._openFolderTimer);
		Desktop._openFolderTimer = 0;
	}

	if(!Desktop._openFolderTimer &&
		Desktop.desktop.icons.isFolderOpen())
	{
		if(Desktop.desktop.icons.wasFolderIconClicked())
		{
			Desktop._openFolderTimer = window.setTimeout(
				function()
				{
			Debug.log("Closing folder...");
			Desktop.desktop.icons.closeFolder();
				},500);
		}
		else
		{
			Desktop._openFolderTimer = window.setTimeout(
				function()
				{
			Debug.log("Closing folder...");
			Desktop.desktop.icons.closeFolder();
				},3000);
		}
	}


	//call each subscriber
	for(var i=0; i<Desktop._mouseMoveSubscribers.length; ++i)
		Desktop._mouseMoveSubscribers[i](mouseEvent);

	Desktop.desktop.resetFrameMouse(); //reset last iFrame mouse move

	//handle special case for dashboard resize
	if(Desktop.foreWinLastMouse[0] != -1 &&
		Desktop.winManipMode == Desktop.WIN_MANIP_MODE.SIDEBAR) {

		if(mouseEvent.which == 0) //mouse button was released!!
			return Desktop.handleWindowMouseUp(mouseEvent);

		var delta = mouseEvent.clientX-Desktop.foreWinLastMouse[0];
		Desktop.desktop.dashboard.setDashboardWidth(Desktop.desktop.dashboard.getDashboardWidth()+delta);
		Desktop.foreWinLastMouse = [mouseEvent.clientX,mouseEvent.clientY];

		if(Desktop.stretchAndMoveInterval == 0)  //start timer for iframe mouse watchdog
		{
			//start needing mouse xy from desktop windows
			var reqObject = {"request":		"startNeedingMouseXY"};
			for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i)
			{
				reqObject["windowId"] = Desktop.desktop.getWindowByIndex(i).getWindowId();
				Desktop.desktop.getWindowByIndex(i).getFrame().contentWindow.postMessage(
						reqObject,"*");
			}

			Desktop.stretchAndMoveInterval = window.setInterval(
				function() { //handle dashboard resize remotely through iframe mouse event
					if(Desktop.desktop.getLastFrameMouseX() == -1) return; //if not in iframe do nothing

					var delta = Desktop.desktop.getLastFrameMouseX()-Desktop.foreWinLastMouse[0];
					Desktop.desktop.dashboard.setDashboardWidth(Desktop.desktop.dashboard.getDashboardWidth()+delta);
					Desktop.foreWinLastMouse = [Desktop.desktop.getLastFrameMouseX(),Desktop.desktop.getLastFrameMouseY()];
				}
				,10);
		}

		return true;
	}

	if(!Desktop.desktop.getForeWindow()) return true;

	if(Desktop.foreWinLastMouse[0] != -1)			//window selected and mouse moving now so do something
	{
		if(mouseEvent.which == 0) //mouse button was released!!
			return Desktop.handleWindowMouseUp(mouseEvent);

		var xy = [mouseEvent.clientX, mouseEvent.clientY];
		if(xy[0] < Desktop.desktop.getDesktopContentX() + 4)
			xy[0] = Desktop.desktop.getDesktopContentX() + 4; //get away from shadow
		if(xy[1] < Desktop.desktop.getDesktopContentY() + 6)
			xy[1] = Desktop.desktop.getDesktopContentY() + 6; //get away from shadow
		var delta = [xy[0]-Desktop.foreWinLastMouse[0], xy[1]-Desktop.foreWinLastMouse[1]];

		//console.log("MouseXY",mouseEvent.clientX,mouseEvent.clientY);

		Desktop.handleWindowManipulation(delta);

		Desktop.foreWinLastMouse = [xy[0],xy[1]];

		if(Desktop.stretchAndMoveInterval == 0)  //start timer for iframe mouse watchdog
		{
			//start needing mouse xy from desktop windows
			var reqObject = {"request":		"startNeedingMouseXY"};
			for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i)
			{
				reqObject["windowId"] = Desktop.desktop.getWindowByIndex(i).getWindowId();
				Desktop.desktop.getWindowByIndex(i).getFrame().contentWindow.postMessage(
						reqObject,"*");
			}

			Desktop.stretchAndMoveInterval = window.setInterval(
				function()
				{ //handle dashboard resize remotely through iframe mouse event
					if(Desktop.desktop.getLastFrameMouseX() == -1) return; //if not in iframe do nothing

					var delta = [Desktop.desktop.getLastFrameMouseX()-Desktop.foreWinLastMouse[0],
								 Desktop.desktop.getLastFrameMouseY()-Desktop.foreWinLastMouse[1]];
					Desktop.handleWindowManipulation(delta);
					Desktop.foreWinLastMouse = [Desktop.desktop.getLastFrameMouseX(),Desktop.desktop.getLastFrameMouseY()];
				}
				,10);
		}
	}

	return true;
} //end Desktop.handleBodyMouseMove()

//==============================================================================
//handle resizing and moving events for desktop
Desktop.handleWindowManipulation = function(delta)
{
	if(!Desktop.desktop.getForeWindow()) return false;

	var win = Desktop.desktop.getForeWindow();

	//check if windows are tiled
	var lastPositions = Desktop.desktop.lastTileWinPositions;
	var keepTile = Object.keys(lastPositions).length == Desktop.desktop.getNumberOfWindows() &&
		Desktop.winManipMode != Desktop.WIN_MANIP_MODE.MOVE /* window translation breaks tile always*/;
	//keep track of windows that should follow each side of target window
	var followTiledBottom = [];
	var followTiledTop = [];
	var followTiledLeft = [];
	var followTiledRight = [];
	var TOLERANCE = 5;

	for(var i=0;keepTile && i<Desktop.desktop.getNumberOfWindows();++i)
	{
		var w = Desktop.desktop.getWindowByIndex(i);

		// if(ignoreWindows && ignoreWindows.indexOf(w.getWindowId()) >= 0)
		// {
		// 	Debug.log("Skipping recursive ignore windows",w.getWindowId());
		// 	continue;
		// }

			//document.getElementById('DesktopDashboard-windowDashboard-winIndex'+i).innerHTML);

		if(	!lastPositions[w.getWindowId()] ||
			Math.abs(w.getWindowX() - lastPositions[w.getWindowId()][0]) > TOLERANCE ||
			Math.abs(w.getWindowY() - lastPositions[w.getWindowId()][1]) > TOLERANCE ||
			Math.abs(w.getWindowWidth() - lastPositions[w.getWindowId()][2]) > TOLERANCE  ||
			Math.abs(w.getWindowHeight() - lastPositions[w.getWindowId()][3]) > TOLERANCE )
		{
			Debug.log("mismatch wid",w.getWindowId());
			keepTile = false;
			break;
		}


		//build follow arrays
		//	if target win bottom is same Y as this window's top

		//skip the target window for constructing follow arrays
		if(win.getWindowId() == w.getWindowId()) continue;

		//find windows with bottoms aligned with top of target window
		//	and with edge within x bounds
		if(Desktop.winManipMode == Desktop.WIN_MANIP_MODE.NW ||  //size from top-left
			Desktop.winManipMode == Desktop.WIN_MANIP_MODE.NE ||  //size from top-right
			Desktop.winManipMode == Desktop.WIN_MANIP_MODE.N  //size from top
		)
		{
			if(Math.abs(w.getWindowY() + w.getWindowHeight() - win.getWindowY()) <= TOLERANCE)
			{
				followTiledTop.push(w);
			}
			else if(Math.abs(w.getWindowY() - win.getWindowY()) <= TOLERANCE)
				followTiledBottom.push(w);
		}

		//find windows with tops aligned with bottom of target window
		//	and with edge within x bounds
		if(Desktop.winManipMode == Desktop.WIN_MANIP_MODE.SE ||  //size from bottom-right
			Desktop.winManipMode == Desktop.WIN_MANIP_MODE.SW ||  //size from bottom-left
			Desktop.winManipMode == Desktop.WIN_MANIP_MODE.S  //size from bottom
		)
		{
			if(Math.abs(w.getWindowY() - (win.getWindowY() + win.getWindowHeight())) <= TOLERANCE)
			// &&
			// 	((w.getWindowY() >= win.getWindowY()-TOLERANCE &&
			// 		w.getWindowY() <= win.getWindowY() + win.getWindowHeight() + TOLERANCE) ||
			// 	 (w.getWindowY() + w.getWindowHeight() >= win.getWindowY()-TOLERANCE &&
			// 	 	w.getWindowY() + w.getWindowHeight() <= win.getWindowY() + win.getWindowHeight() + TOLERANCE)))
				followTiledBottom.push(w);
			else if(Math.abs(w.getWindowY() - win.getWindowY()) <= TOLERANCE)
				followTiledTop.push(w);
		}

		//find windows with rights aligned with left of target window
		//	and with edge within y bounds
		if(Desktop.winManipMode == Desktop.WIN_MANIP_MODE.NW ||  //size from top-left
			Desktop.winManipMode == Desktop.WIN_MANIP_MODE.SW ||  //size from bottom-left
			Desktop.winManipMode == Desktop.WIN_MANIP_MODE.W  //size from left
		)
		{
			if(Math.abs(w.getWindowX() + w.getWindowWidth() - win.getWindowX()) <= TOLERANCE)
			{
				// Debug.log("left",w.getWindowName());
				followTiledLeft.push(w);

				// //fix matching edge within tolerance
				// w.resizeAndPositionWindow(
				// 	w.getWindowX(),
				// 	w.getWindowY(),
				// 	w.getWindowWidth() - (w.getWindowX() + w.getWindowWidth() - win.getWindowX()),
				// 	w.getWindowHeight());
			}
			// OR if left edge aligned then grow with it
			else if(Math.abs(w.getWindowX() - win.getWindowX()) <= TOLERANCE)
			{
				// Debug.log("right",w.getWindowName());
				followTiledRight.push(w);

				// //fix matching edge within tolerance
				// w.resizeAndPositionWindow(
				// 	w.getWindowX() - (w.getWindowX() - win.getWindowX()),
				// 	w.getWindowY(),
				// 	w.getWindowWidth(),
				// 	w.getWindowHeight());
			}
		}

		//find windows with lefts aligned with right of target window
		//	and with edge within y bounds
		if(Desktop.winManipMode == Desktop.WIN_MANIP_MODE.SE ||  //size from bottom-right
			Desktop.winManipMode == Desktop.WIN_MANIP_MODE.NE ||  //size from top-right
			Desktop.winManipMode == Desktop.WIN_MANIP_MODE.E  //size from right
		)
		{
			if(Math.abs(w.getWindowX() - (win.getWindowX() + win.getWindowWidth())) <= TOLERANCE)
			{
				// Debug.log("right",w.getWindowName());
				followTiledRight.push(w);
			}
			// OR if right edge aligned then grow with it
			else if(Math.abs((w.getWindowX() + w.getWindowWidth()) - (win.getWindowX() + win.getWindowWidth())) <= TOLERANCE)
			{
				// Debug.log("left",w.getWindowName());
				followTiledLeft.push(w);
			}
		}

	} //end tiled prep loop

	// if(delta[0] || delta[1]) //for debugging tile behavior
	// 	Debug.log("keepTile",keepTile,Desktop.winManipMode,
	// 		"followTiledRight",followTiledRight.length,(followTiledRight.length?followTiledRight[0].getWindowName():""),
	// 		"followTiledTop",followTiledTop.length,(followTiledTop.length?followTiledTop[0].getWindowName():""),
	// 		"followTiledLeft",followTiledLeft.length,(followTiledLeft.length?followTiledLeft[0].getWindowName():""),
	// 		"followTiledBottom",followTiledBottom.length,(followTiledBottom.length?followTiledBottom[0].getWindowName():""),
	// 		delta);

	if(!keepTile)
		Desktop.desktop.lastTileWinPositions = {}; //clear to avoid future checks

	//if(keepTile) return false;
	var deltaResidual = [0,0,0,0]; //do not move other window if target window reached limits
	var winOriginal = [win.getWindowX(),
						win.getWindowY(),
						win.getWindowWidth(),
						win.getWindowHeight()];

	switch(Desktop.winManipMode)
	{
		case Desktop.WIN_MANIP_MODE.MOVE: //move
		if(delta[0] || delta[1])
			win.moveWindowByOffset(delta[0],delta[1]);
			break;
		case Desktop.WIN_MANIP_MODE.NW: //size from top-left
		if(delta[0] || delta[1])
			deltaResidual = win.resizeAndPositionWindow(
				win.getWindowX() + delta[0],
				win.getWindowY() + delta[1],
				win.getWindowWidth() - delta[0],
				win.getWindowHeight() - delta[1]);
			break;
		case Desktop.WIN_MANIP_MODE.SE: //size from bottom-right
		if(delta[0] || delta[1])
			deltaResidual = win.resizeAndPositionWindow(
				win.getWindowX(),
				win.getWindowY(),
				win.getWindowWidth() + delta[0],
				win.getWindowHeight() + delta[1]);
			break;
		case Desktop.WIN_MANIP_MODE.NE: //size from top-right
		if(delta[0] || delta[1])
			deltaResidual = win.resizeAndPositionWindow(
				win.getWindowX(),
				win.getWindowY() + delta[1],
				win.getWindowWidth() + delta[0],
				win.getWindowHeight() - delta[1]);
			break;
		case Desktop.WIN_MANIP_MODE.SW: //size from bottom-left
		if(delta[0] || delta[1])
			deltaResidual = win.resizeAndPositionWindow(
				win.getWindowX() + delta[0],
				win.getWindowY(),
				win.getWindowWidth() - delta[0],
				win.getWindowHeight() + delta[1]);
			break;
		case Desktop.WIN_MANIP_MODE.W: //size from left
		if(delta[0])
			deltaResidual = win.resizeAndPositionWindow(
				win.getWindowX() + delta[0],
				win.getWindowY(),
				win.getWindowWidth() - delta[0],
				win.getWindowHeight());
			break;
		case Desktop.WIN_MANIP_MODE.E: //size from right
		if(delta[0])
			deltaResidual = win.resizeAndPositionWindow(
				win.getWindowX(),
				win.getWindowY(),
				win.getWindowWidth() + delta[0],
				win.getWindowHeight());
			break;
		case Desktop.WIN_MANIP_MODE.N: //size from top
		if(delta[1])
			deltaResidual = win.resizeAndPositionWindow(
				win.getWindowX(),
				win.getWindowY() + delta[1],
				win.getWindowWidth(),
				win.getWindowHeight() - delta[1]);
			break;
		case Desktop.WIN_MANIP_MODE.S: //size from bottom
		if(delta[1])
			deltaResidual = win.resizeAndPositionWindow(
				win.getWindowX(),
				win.getWindowY(),
				win.getWindowWidth(),
				win.getWindowHeight() + delta[1]);
			break;
		default:
	}

	// if(delta[0] || delta[1]) //for debugging tile behavior
	// 	Debug.log(deltaResidual,delta);

	var winChangeStack = [];
	if(delta[1])
		for(var i=0;i<followTiledTop.length;++i)
		{
			winChangeStack.push([followTiledTop[i],followTiledTop[i].resizeAndPositionWindow(
				followTiledTop[i].getWindowX(),
				followTiledTop[i].getWindowY(),
				followTiledTop[i].getWindowWidth(),
				followTiledTop[i].getWindowHeight() + delta[1] - deltaResidual[1] - deltaResidual[3])]);
			lastPositions[followTiledTop[i].getWindowId()][3] = followTiledTop[i].getWindowHeight();

			//if affected window is in an illegal state, then stop movement in that direction
			if(winChangeStack[winChangeStack.length-1][1][1] || winChangeStack[winChangeStack.length-1][1][3])
			{
				Debug.log("Halt Y!");

				//revert all affected windows
				var j=i;
				for(var i=0;i<j;++i)
				{
					followTiledTop[i],followTiledTop[i].resizeAndPositionWindow(
						followTiledTop[i].getWindowX(),
						followTiledTop[i].getWindowY(),
						followTiledTop[i].getWindowWidth(),
						followTiledTop[i].getWindowHeight() - delta[1] + deltaResidual[1] + deltaResidual[3]);
					lastPositions[followTiledTop[i].getWindowId()][3] = followTiledTop[i].getWindowHeight();
				}

				//revert triggering window
				delta[1] = 0;
				win.resizeAndPositionWindow(
					winOriginal[0],
					winOriginal[1],
					winOriginal[2],
					winOriginal[3]);
				break;
			}
		}

	if(delta[0])
		for(var i=0;i<followTiledLeft.length;++i)
		{
			winChangeStack.push([followTiledLeft[i],followTiledLeft[i].resizeAndPositionWindow(
				followTiledLeft[i].getWindowX(),
				followTiledLeft[i].getWindowY(),
				followTiledLeft[i].getWindowWidth() + delta[0] - deltaResidual[0] - deltaResidual[2],
				followTiledLeft[i].getWindowHeight())]);
			lastPositions[followTiledLeft[i].getWindowId()][2] = followTiledLeft[i].getWindowWidth();

			//if affected window is in an illegal state, then stop movement in that direction
			if(winChangeStack[winChangeStack.length-1][1][0] || winChangeStack[winChangeStack.length-1][1][2])
			{
				Debug.log("Halt X!");
				//revert all affected windows
				var j=i;
				for(var i=0;i<j;++i)
				{
					followTiledLeft[i],followTiledLeft[i].resizeAndPositionWindow(
						followTiledLeft[i].getWindowX(),
						followTiledLeft[i].getWindowY(),
						followTiledLeft[i].getWindowWidth() - delta[0] + deltaResidual[0] + deltaResidual[2],
						followTiledLeft[i].getWindowHeight());
					lastPositions[followTiledLeft[i].getWindowId()][2] = followTiledLeft[i].getWindowWidth();
				}

				//revert triggering window
				delta[0] = 0;
				win.resizeAndPositionWindow(
					winOriginal[0],
					winOriginal[1],
					winOriginal[2],
					winOriginal[3]);
				break;
			}
		}

	if(delta[0])
		for(var i=0;i<followTiledRight.length;++i)
		{
			winChangeStack.push([followTiledRight[i],followTiledRight[i].resizeAndPositionWindow(
				followTiledRight[i].getWindowX() + delta[0]  - deltaResidual[0] - deltaResidual[2],
				followTiledRight[i].getWindowY(),
				followTiledRight[i].getWindowWidth() - delta[0] + deltaResidual[0] + deltaResidual[2],
				followTiledRight[i].getWindowHeight())]);
			lastPositions[followTiledRight[i].getWindowId()][0] = followTiledRight[i].getWindowX();
			lastPositions[followTiledRight[i].getWindowId()][2] = followTiledRight[i].getWindowWidth();

			//if affected window is in an illegal state, then stop movement in that direction
			if(winChangeStack[winChangeStack.length-1][1][0] || winChangeStack[winChangeStack.length-1][1][2])
			{
				Debug.log("Halt X!");
				//revert all affected windows
				var j=i;
				for(var i=0;i<j;++i)
				{
					followTiledRight[i].resizeAndPositionWindow(
						followTiledRight[i].getWindowX() - delta[0]  + deltaResidual[0] + deltaResidual[2],
						followTiledRight[i].getWindowY(),
						followTiledRight[i].getWindowWidth() + delta[0] - deltaResidual[0] - deltaResidual[2],
						followTiledRight[i].getWindowHeight());
					lastPositions[followTiledRight[i].getWindowId()][0] = followTiledRight[i].getWindowX();
					lastPositions[followTiledRight[i].getWindowId()][2] = followTiledRight[i].getWindowWidth();
				}
				for(var i=0;i<followTiledLeft.length;++i)
				{
					followTiledLeft[i],followTiledLeft[i].resizeAndPositionWindow(
						followTiledLeft[i].getWindowX(),
						followTiledLeft[i].getWindowY(),
						followTiledLeft[i].getWindowWidth() - delta[0] + deltaResidual[0] + deltaResidual[2],
						followTiledLeft[i].getWindowHeight());
					lastPositions[followTiledLeft[i].getWindowId()][2] = followTiledLeft[i].getWindowWidth();
				}

				//revert triggering window
				delta[0] = 0;
				win.resizeAndPositionWindow(
					winOriginal[0],
					winOriginal[1],
					winOriginal[2],
					winOriginal[3]);
				break;
			}
		}

	if(delta[1])
		for(var i=0;i<followTiledBottom.length;++i)
		{
			winChangeStack.push([followTiledBottom[i],followTiledBottom[i].resizeAndPositionWindow(
				followTiledBottom[i].getWindowX(),
				followTiledBottom[i].getWindowY() + delta[1] - deltaResidual[1] - deltaResidual[3],
				followTiledBottom[i].getWindowWidth(),
				followTiledBottom[i].getWindowHeight() - delta[1] + deltaResidual[1] + deltaResidual[3])]);
			lastPositions[followTiledBottom[i].getWindowId()][1] = followTiledBottom[i].getWindowY();
			lastPositions[followTiledBottom[i].getWindowId()][3] = followTiledBottom[i].getWindowHeight();

			//if affected window is in an illegal state, then stop movement in that direction
			if(winChangeStack[winChangeStack.length-1][1][1] || winChangeStack[winChangeStack.length-1][1][3])
			{
				Debug.log("Halt Y!");
				//revert all affected windows
				var j=i;
				for(var i=0;i<j;++i)
				{
					followTiledBottom[i].resizeAndPositionWindow(
						followTiledBottom[i].getWindowX(),
						followTiledBottom[i].getWindowY() - delta[1] + deltaResidual[1] + deltaResidual[3],
						followTiledBottom[i].getWindowWidth(),
						followTiledBottom[i].getWindowHeight() + delta[1] - deltaResidual[1] - deltaResidual[3]);
					lastPositions[followTiledBottom[i].getWindowId()][1] = followTiledBottom[i].getWindowY();
					lastPositions[followTiledBottom[i].getWindowId()][3] = followTiledBottom[i].getWindowHeight();
				}
				for(var i=0;i<followTiledTop.length;++i)
				{
					followTiledTop[i],followTiledTop[i].resizeAndPositionWindow(
						followTiledTop[i].getWindowX(),
						followTiledTop[i].getWindowY(),
						followTiledTop[i].getWindowWidth(),
						followTiledTop[i].getWindowHeight() - delta[1] + deltaResidual[1] + deltaResidual[3]);
					lastPositions[followTiledTop[i].getWindowId()][3] = followTiledTop[i].getWindowHeight();
				}

				//revert triggering window
				delta[1] = 0;
				win.resizeAndPositionWindow(
					winOriginal[0],
					winOriginal[1],
					winOriginal[2],
					winOriginal[3]);
				break;
			}
		}

	if(keepTile)
		lastPositions[win.getWindowId()] = [
			win.getWindowX(),
			win.getWindowY(),
			win.getWindowWidth(),
			win.getWindowHeight()];

	// //now launch any fallout from windows reaching extremes
	// for(var i=0;i<winChangeStack.length;++i)
	// {
	// 	if(winChangeStack[i][1][0] ||
	// 		winChangeStack[i][1][1] ||
	// 		winChangeStack[i][1][2] ||
	// 		winChangeStack[i][1][3] )
	// 	{
	// 		Debug.log("winChangeStack",i,winChangeStack[i][0],winChangeStack[i][1]);

	// 		if(!ignoreWindows) //create recursive ignore windows list
	// 			ignoreWindows = [];

	// 		if(winChangeStack[i][1][0])
	// 		{
	// 			Desktop.winManipMode = Desktop.WIN_MANIP_MODE.W;
	// 			Desktop.handleWindowManipulation(
	// 				[winChangeStack[i][1][0],0] /*delta*/,
	// 				winChangeStack[i][0] /*targetWindow*/,
	// 				ignoreWindows.concat([winChangeStack[i][0].getWindowId()])
	// 			);
	// 		}
	// 		if(winChangeStack[i][1][2])
	// 		{
	// 			Desktop.winManipMode = Desktop.WIN_MANIP_MODE.E;
	// 			Desktop.handleWindowManipulation(
	// 				[winChangeStack[i][1][2],0] /*delta*/,
	// 				winChangeStack[i][0] /*targetWindow*/,
	// 				ignoreWindows.concat([winChangeStack[i][0].getWindowId()])
	// 			);
	// 		}

	// 	}
	// }

} //end handleWindowManipulation()

//==============================================================================
Desktop.handleWindowButtonDown = function(mouseEvent)
{
	mouseEvent.cancelBubble=true; //do nothing but eat event away from window so window doesn't move
	return false;
} //end handleWindowButtonDown()

//==============================================================================
Desktop.handleWindowRefresh = function(mouseEvent)
		{
	Debug.log("Refresh " + this.id.split('-')[1]);
	Desktop.desktop.refreshWindowById(this.id.split('-')[1]);
	return false;
} //end handleWindowRefresh()

//==============================================================================
Desktop.handleWindowHelp = function (mouseEvent)
{
	Debug.log("Help " + this.id.split('-')[1]);
	Desktop.desktop.windowHelpById(this.id.split('-')[1]);
	return false;
} //end handleWindowHelp()

//==============================================================================
Desktop.handleDashboardHelp = function (mouseEvent)
{
	Debug.closeErrorPop();
	
	// Check if window exists and is maximized, then show its tooltip
	if(Desktop.desktop.getForeWindow() && 
		Desktop.desktop.getForeWindow().isMaximized())
	{
		Debug.log("Help " + Desktop.desktop.getForeWindow());
		Desktop.desktop.windowHelpById(Desktop.desktop.getForeWindow().getWindowId());
	}
	else //show main desktop tooltip
	{
		// window.open("https://github.com/art-daq/otsdaq#readme", "_blank");
		// window.open("https://otsdaq.fnal.gov", "_blank");
		Desktop.desktopTooltip(true /* alwaysShow */);
	}
	return false;
} //end handleWindowHelp()

//==============================================================================
Desktop.handleFullScreenWindowRefresh = function(mouseEvent)
{
		Debug.log("Refresh Full Screen Window");

		var foreWindowId = undefined;
		try
		{
			foreWindowId = Desktop.desktop.getForeWindow().getWindowId();
		}
		catch(e)
		{
			Debug.log("Could not find foreground window, ignoring.");
		}


		Desktop.desktop.resetDesktop();
		Desktop.desktop.refreshDesktop();

		var foreWindow = undefined;
		var isMaxWindow = undefined;


		//for Debugging:
		//		for(var i = 0; i < Desktop.desktop.getNumberOfWindows(); i++)
		//    	{
		//			var window =  Desktop.desktop.getWindowByIndex(i);
		//			var id = window.getWindowId();
		//			var z = window.getWindowZ();
		//
		//			Debug.log("name: " + i + " " + window.getWindowName());
		//			Debug.log("ID: " + id + " z=" + z);
		//
		//    	}

		//if in max window mode, only refresh the max window
		//else cycle through all windows and refresh

		//determine max window
		if(Desktop.desktop.getForeWindow() &&
				Desktop.desktop.getForeWindow().isMaximized())
		{
			Debug.log("Refreshing just maximized window...");

			Desktop.desktop.refreshWindow();

		} //end refresh maxed window
		else
		{
			Debug.log("Refreshing all windows...");
			//Note: refresh window takes foreground window
			//	and deletes it, then makes a new one that ends up being the
			//	last window in the array... so always take index 0 to iterate through them
			//	but save the encountered current foreWindow
			for(var i = 0; i < Desktop.desktop.getNumberOfWindows(); i++)
			{
				var window =  Desktop.desktop.getWindowByIndex(0);
				var id = window.getWindowId();

				Debug.log("name: " + i + " " + window.getWindowName());
				Debug.log("ID: " + id);

				var maximized = window.isMaximized();

				Desktop.desktop.setForeWindow(window);
				window = Desktop.desktop.refreshWindow();

				if(foreWindowId == id)
				{
					foreWindow = window;

					if(maximized)
						isMaxWindow = window;
				}
			}


			//for Debugging:
			//		for(var i = 0; i < Desktop.desktop.getNumberOfWindows(); i++)
			//    	{
			//			var window =  Desktop.desktop.getWindowByIndex(i);
			//			var id = window.getWindowId();
			//			var z = window.getWindowZ();
			//
			//			Debug.log("name: " + i + " " + window.getWindowName());
			//			Debug.log("ID: " + id + " z=" + z);
			//
			//    	}

			if(foreWindow)
				Desktop.desktop.setForeWindow(foreWindow);
			if(isMaxWindow)
				Desktop.desktop.setForeWindow(foreWindow);
		} //end refresh all windows


		//for Debugging:
		//		for(var i = 0; i < Desktop.desktop.getNumberOfWindows(); i++)
		//    	{
		//			var window =  Desktop.desktop.getWindowByIndex(i);
		//			var id = window.getWindowId();
		//			var z = window.getWindowZ();
		//
		//			Debug.log("name: " + i + " " + window.getWindowName());
		//			Debug.log("ID: " + id + " z=" + z);
		//
		//    	}


		//reset icons, if permissions undefined, keep permissions from before
		Desktop.desktop.icons.resetWithPermissions(
			undefined /*undefined permissions*/, true /*keepSamePermissions*/);

		return false;
} //end handleFullScreenWindowRefresh()

//==============================================================================
Desktop.handleWindowMinimize = function(mouseEvent)
{
	Debug.log("minimize " + this.id.split('-')[1]);
	Desktop.desktop.minimizeWindowById(this.id.split('-')[1]);
	return false;
}

//==============================================================================
Desktop.handleWindowMaximize = function(mouseEvent)
{
	Debug.log("maximize " + this.id.split('-')[1]);
	Desktop.desktop.maximizeWindowById(this.id.split('-')[1]);
	return false;
}

//==============================================================================
Desktop.handleWindowClose = function(mouseEvent)
{
//	Debug.log("close Window " + this.id.split('-')[1]);
	Desktop.desktop.closeWindowById(this.id.split('-')[1]);
	return false;
}

//==============================================================================
//Desktop.XMLHttpRequest ~~
// forms request properly for ots server, POSTs data
// and when request is returned, returnHandler is called with
// req result on success, if failure do to bad url called with 0
//
// reqIndex is used to give the returnHandler an index to route responses to.
//
Desktop.XMLHttpRequest = function(requestURL, data, returnHandler, reqIndex)
{

	var errStr = "";
	var req = new XMLHttpRequest();

	req.onreadystatechange = function()
	{
		if (req.readyState==4)
		{  //when readyState=4 return complete, status=200 for success, status=400 for fail
			if(req.status==200)
			{
				//response received

				if(!Desktop.desktop.serverConnected)	//mark as connected
				{
					Desktop.desktop.serverConnected = true;
					Desktop.desktop.dashboard.displayConnectionStatus(true);

					Desktop.desktop.resetDesktop(); //give no permissions, to do simple reset
					// and re-start timer for checking foreground window changes due to iFrame content code
				}

				//check if failed due to cookieCode and go to login prompt
				if(req.responseText == Globals.REQ_NO_PERMISSION_RESPONSE)
				{
					var requestType = requestURL.indexOf("RequestType=");
					if(requestType > 0)
						requestType = " '" + requestURL.substr(requestType + ("RequestType=").length) + "'";
					else
						requestType = "";
					errStr = "Request " + requestType + " failed due to insufficient account permissions.";
					//return;
				}
				else if(req.responseText == Globals.REQ_NO_LOGIN_RESPONSE)
				{
					errStr = "Login has expired.";

					window.clearTimeout(Desktop.desktop.checkMailboxTimer); //stop checking mailbox
					Desktop.logout();
					//return;
				}

				//Debug.log("Request Response Text " + req.responseText + " ---\nXML " + req.responseXML);
			}
			else
			{
				//response failure

				if(Desktop.desktop.serverConnected) //mark as disconnected
				{
					Desktop.desktop.serverConnected = false;
					Desktop.desktop.dashboard.displayConnectionStatus(false);
				}

				errStr = "Request Failed - Bad Address:\n" + requestURL;
				window.clearTimeout(Desktop.desktop.checkMailboxTimer);  //stop checking mailbox
				Desktop.logout();
			}

			if(errStr != "")
			{
				errStr += "\n\n(Try refreshing the page, or alert ots admins if problem persists.)";
				Debug.log("Error: " + errStr,Debug.HIGH_PRIORITY);
				Debug.log("Error occurred from req = " + requestURL);

				req = 0; //force to 0 to indicate error

				Debug.log("The user interface is disconnected from the ots Gateway server.",
						Debug.HIGH_PRIORITY);

				//hide user with lock icon (because it usually looks bad when disconnected)
				document.getElementById("DesktopDashboard-userWithLock").style.display = "none";
			}
			if(returnHandler) returnHandler(req,reqIndex,errStr);
		}
	}

	if(Desktop.desktop.login) //add cookie code if login instance has been created
		data = "CookieCode="+Desktop.desktop.login.getCookieCode()+"&"+data;
	requestURL = "/urn:xdaq-application:lid=" + urnLid_ + "/" + requestURL; //urnLid_ is from parent html page
	//Debug.log("Post " + requestURL + "\n\tData: " + data);
	req.open("POST",requestURL,true);
	//req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	req.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
	req.send(data);
} //end XMLHttpRequest()

//==============================================================================
//returns xml entry value for an attribute
Desktop.getXMLAttributeValue = function(req, name, attribute)
{
	if(req && req.responseXML && req.responseXML.getElementsByTagName(name).length > 0)
		return req.responseXML.getElementsByTagName(name)[0].getAttribute(attribute);
	else
		return undefined;
} //end getXMLAttributeValue()

//==============================================================================
//getXMLValue ~~
//	returns xml entry value for attribue 'value'
Desktop.getXMLValue = function(req, name)
{
	return Desktop.getXMLAttributeValue(req,name,"value");
} //end getXMLValue()

//==============================================================================
//logout ~~
//	logout and login prompt
Desktop.logout = function ()
{
	if(Desktop.desktop && Desktop.desktop.login &&
			!Desktop.desktop.login.isBlackout())
		Desktop.desktop.login.logout();
} //end logout()

//==============================================================================
//formatTime ~~
var monthArr_ = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
Desktop.formatTime = function(t)
{
	var date = new Date(t * 1000);
	var mm = date.getMinutes() < 10?"0"+date.getMinutes():date.getMinutes();
	var ss = date.getSeconds() < 10?"0"+date.getSeconds():date.getSeconds();
	var m = monthArr_[date.getMonth()]; //+ 1).format("02d");;
	var d = ('0' + date.getDate()).slice(-2); //zero pad day of month
	var y = date.getFullYear() - 2000;
	return d + m + y + "." + date.getHours() + ":" + mm + ":" + ss;
} //end formatTime()

//==============================================================================
////////////////////////////////////
Desktop.turtle;

////////////////////////////////////
Desktop.turtleRedraw = function()
{
	Debug.log("turtleRedraw()");
	Desktop.turtle.initx = Desktop.desktop.getDesktopContentX() + Desktop.desktop.getDesktopContentWidth()
		- Desktop.turtle.offsetWidth;
	Desktop.turtle.inity = Desktop.desktop.getDesktopContentY() + Desktop.desktop.getDesktopContentHeight()
		- Desktop.turtle.offsetHeight + 50;
	if(Desktop.turtle.x == 0)
	{
		Desktop.turtle.style.left = Desktop.turtle.initx + "px";
		Desktop.turtle.style.top = Desktop.turtle.inity + "px";
	}

} //end turtleRedraw()

//==============================================================================
////////////////////////////////////
Desktop.turtleClick = function()
{
	Debug.log("turtleClick()");
	Desktop.turtle.motion  = !Desktop.turtle.motion;

	if(Desktop.turtle.motion)
	{
		if(Desktop.turtle.childNodes[1].style.display == "none")
		{
			if(!Desktop.isWizardMode()) //only allow in 'normal' mode
				Desktop.turtle.childNodes[1].style.display = "block"; //show for first time!
			else
				Desktop.turtle.style.display = "none"; //totally disable (to stop clicking)
			Desktop.turtle.motion = false;
			return;
		}

		Desktop.turtle.speed = 5;
		Desktop.turtle.velx = Math.random()*2-1;
		Desktop.turtle.vely = Math.random()*2-1;
		var mag = Desktop.turtle.velx*Desktop.turtle.velx + Desktop.turtle.vely*Desktop.turtle.vely;
		if(mag == 0)
			Desktop.turtle.velx = -1;
		else
		{
			mag = Math.sqrt(mag);
			Desktop.turtle.velx /= mag;
			Desktop.turtle.vely /= mag;
		}
		setTimeout(Desktop.turtleMove,50);
	}
	else
	{
		//change turtle colors
		Desktop.XMLHttpRequest("XGI_Turtle","",Desktop.httpTurtleResponse);
	}
} //end turtleClick()

//==============================================================================
////////////////////////////////////
Desktop.turtleMove = function()
{
	Desktop.turtle.x = Desktop.turtle.x + Desktop.turtle.velx*Desktop.turtle.speed;
	Desktop.turtle.y = Desktop.turtle.y + Desktop.turtle.vely*Desktop.turtle.speed;

	if(Desktop.turtle.initx + Desktop.turtle.x + Desktop.turtle.offsetWidth < 0) //test x extreme wrap-arounds
		Desktop.turtle.x = document.body.clientWidth-1-Desktop.turtle.initx;
	else if(Desktop.turtle.initx + Desktop.turtle.x > document.body.clientWidth)
		Desktop.turtle.x = 1-Desktop.turtle.initx-Desktop.turtle.offsetWidth;

	if(Desktop.turtle.inity + Desktop.turtle.y + Desktop.turtle.offsetHeight < 0) //test y extreme wrap-arounds
		Desktop.turtle.y = document.body.clientHeight-1-Desktop.turtle.inity;
	else if(Desktop.turtle.inity + Desktop.turtle.y > document.body.clientHeight)
		Desktop.turtle.y = 1-Desktop.turtle.inity-Desktop.turtle.offsetHeight;

	Desktop.turtle.style.left = Desktop.turtle.initx + Desktop.turtle.x + "px";
	Desktop.turtle.style.top = Desktop.turtle.inity + Desktop.turtle.y + "px";

	if(Desktop.turtle.motion)
		setTimeout(Desktop.turtleMove,50);
} //end turtleMove()

//==============================================================================
////////////////////////////////////
Desktop.httpTurtleResponse = function(req)
{
	Debug.log("httpTurtleResponse()");
	if(req && req.responseText && req.responseText != "")
		Desktop.turtle.childNodes[1].src = req.responseText;
} //end httpTurtleResponse()

//==============================================================================
//closeSystemMessage ~~
Desktop.closeSystemMessage  = function(id)
{
	var el = document.getElementById("Desktop-systemMessageBox-" + id);
	el.parentNode.removeChild(el); //remove from page!
} //end closeSystemMessage()

//==============================================================================
//isWizardMode ~~
Desktop.isWizardMode = function()
{
	//return true if in --config desktop mode
	//Debug.log("Desktop Security: " + Desktop.desktop.security);

	return !(!Desktop.desktop.security ||
			Desktop.desktop.security == Desktop.SECURITY_TYPE_DIGEST_ACCESS ||
			Desktop.desktop.security == Desktop.SECURITY_TYPE_NONE);
} //end isWizardMode()

//==============================================================================
//openNewBrowserTab ~~
Desktop.openNewBrowserTab = function(name,subname,windowPath,unique)
{
	//for windowPath, need to check lid=## is terminated with /
	// check from = that there is nothing but numbers
	{
		var i = windowPath.indexOf("urn:xdaq-application:lid=") + ("urn:xdaq-application:lid=").length;
		var isAllNumbers = true;
		for(i;i<windowPath.length;++i)
		{
			Debug.log(windowPath[i]);

			if(windowPath[i] < "0" || windowPath[i] > "9")
			{
				isAllNumbers = false;
				break;
			}
		}
		if(isAllNumbers)
			windowPath += "/";
	}
	Debug.log("DesktopWindow= " + windowPath);

	Debug.log("name= " + name);
	Debug.log("subname= " + subname);
	Debug.log("unique= " + unique);
	var search = window.parent.window.location.search;
	url = window.parent.window.location.pathname;

	var str = "requestingWindowId=Desktop";
		str += "&windowName=" + name;
		str += "&windowSubname=" + subname;
		str += "&windowUnique=" + unique;
		str += "&windowPath=" + encodeURIComponent(windowPath);

	//if there is no search, need to check lid=## is terminated with /
	// check from = that there is nothing but numbers

	if(!Desktop.isWizardMode())
	{
		var i = url.indexOf("urn:xdaq-application:lid=") + ("urn:xdaq-application:lid=").length;
		var isAllNumbers = true;
		for(i;i<url.length;++i)
		{
			Debug.log(url[i]);

			if(url[i] < "0" || url[i] > "9")
			{
				isAllNumbers = false;
				break;
			}
		}
		if(isAllNumbers)
			url += "/";
		url += "?" + str;
	}
	else// if(Desktop.isWizardMode())
	{
		url += search.split('&')[0] + "&" + str; //take first parameter (for wiz mode)
	}

	Debug.log("DesktopContent.openNewBrowserTab= " + url);

	window.open(url,'_blank');
} //end openNewBrowserTab()

//==============================================================================
//call to show desktop tooltip
//	shown for wiz mode and normal mode, e.g.
Desktop.desktopTooltip = function(alwaysShow)
{

	DesktopContent.tooltip("Desktop Introduction",
			"<center><a href='https://otsdaq.fnal.gov' target='_blank' title='Click to navigate to the otsdaq homepage.'><img src='https://otsdaq.fnal.gov/logo.png' /></a></center>\n" +
			"Welcome to the <b><i>otsdaq</i> Desktop</b> environment. This is your portal " +
			"to all of the possibilities of <b><i>otsdaq</i></b>. For more in-depth <b>tutorials</b> and <b>documentation</b>, " +
			"please visit <a href='https://otsdaq.fnal.gov' target='_blank'>otsdaq.fnal.gov</a>. \n\n" +
			"Briefly, here are the features:" +

			"\n\t- <b>Desktop Window Icons:</b> " +
			"<INDENT>" +
			"Click the rounded-square icons on your Desktop to open " +
			"a particular window. If you hold down your click (for a second), you " +
			"can open the window in fullscreen, or in a new tab, or even open the window " +
			"then tile it on the screen with all other open windows!" +
			"</INDENT>" +

			"\n\t- <b>Desktop Dashboard (top pane):</b> " +
			"<INDENT>" +
			"Along the top and left margins of the Desktop, you will find the Desktop " +
			"Dashboard; the text below provides an introduction to the top portion of the Dashboard. " +
			"The top pane of the Dashboard " +
			"is made of buttons and icons going from left to right:" +

			"\n\n\t- <b>Left Pane Toggler:</b>" + 
			"<div style='padding: 5px 10px 5px 10px;"
			+ "display: inline-block;"
			+ "padding: 0px 10px 6px 10px;"
			+ "margin: 0 0 0px 6px;"
			+ "height: 16px;"
			+ "text-align: center;"
			+ "cursor: pointer;"
			+ "border-radius: 3px;"
			+ "border: 1px solid rgba(255,255,255,0.8);"
			+ "box-shadow: inset rgba(255,254,255,0.6) 0 0.3em .3em, inset rgba(0,0,0,0.15) 0 -0.1em .3em, /* inner shadow */ rgb(100,100,100) 0 .1em 3px, rgb(10,10,10) 0 .2em 1px, /* color border */ rgba(0,0,0,0.2) 0 .5em 5px;	/* drop shadow */'>" + 
			'<img id="dashboard_bi_arrow" src="/WebPath/images/dashboardImages/icon-Bi-arrow-gray.png"></div>' + 
			"<INDENT>" +
			"The first button you will encounter in the top pane looks like a horizontal double-arrow " +
			"icon. This button toggles the display of the left pane of the Dashboard. Note when you " +
			"refresh the page, the state of the left pane persists!" +
			"</INDENT>" +

			"\n\t- <b>Layouts Menu:</b> " +
			"<INDENT>" +
			"The next button you will encounter in the top pane reads 'Layouts.' " +
			"This button gives you access to your Window Layout Presets. You will see 2 'System' presets there " +
			"which can be setup by users with admin privileges. There are also 3 'User' presets which you can setup for " +
			"yourself in the User Settings window (get there with " +
			"the cog wheel icon in the upper-right of the Desktop)." +
			"</INDENT>" +

			"\n\t- <b>Tile Desktop Windows:</b> " +
			"<INDENT>" +
			"The next button you will encounter in the top pane reads 'Tile.' " +
			"This button will automatically tile all open Desktop Windows to fit in your browser window. " +
			"If you click the button multiple times, you will get a few different layout options." +
			"</INDENT>" +

			"\n\t- <b>Show Desktop:</b> " +
			"<INDENT>" +
			"The next button you will encounter in the top pane reads 'Show Desktop.' " +
			"This button will minimize all open Desktop Windows which is nice " +
			"when you want to see all of your Desktop Icons again." +
			"</INDENT>" +

			"\n\t- <b>Full Screen:</b> " +
			"<INDENT>" +
			"The next button you will encounter in the top pane reads 'Full Screen.' " +
			"This button will maximize to full screen the Desktop Window that was last used (i.e. the window that has the focus)." +
			"</INDENT>" +

			"\n\t- <b>Refresh:</b> " +
			"<INDENT>" +
			"The next button you will encounter in the top pane looks like a circular refresh arrow icon. " +
			"This button will reconnect to the server, refresh every open Desktop Window, and reload the Desktop Icons." +
			"</INDENT>" +

			"</INDENT>" +

			"\n\t- <b>Desktop Dashboard (left pane):</b> " +
			"<INDENT>" +
			"Along the top and left margins of the Desktop, you will find the Desktop " +
			"Dashboard; the text below provides an introduction to the left portion of the Dashboard. " +
			"The left pane of the Dashboard " +
			"is a listing of all open Desktop Windows. If you click one of the buttons in the list, " +
			"the associated window " +
			"will be minimized or restored. If you hold down your click (for one second) you can choose " +
			"to minimize, maximize, or close the window!" +
			"</INDENT>" +



			"\n\nNote, if you would like to take a look at the available online documentation, " +
			"click the question mark at the top-right of the Desktop."
	, alwaysShow);
} //end desktopTooltip()
