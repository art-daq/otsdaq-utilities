//=====================================================================================
//
//	Created Jan, 2013
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	DesktopContent.js
//
//  Requirements:
//   1. paste the following:
//
//				<script type="text/JavaScript" src="/WebPath/js/Globals.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/Debug.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/DesktopContent.js"></script>
//
//		...anywhere inside the <head></head> tag of a window content html page
//	 2. for proper functionality certain handlers are used:
//   		cannot override handlers for window: onfocus, onscroll, onblur, onmousemove
//			(try applying handlers to your body instead, or if you must override, try to call the DesktopContent handlers from your handlers)
//			cannot override handler for body keydown.
//			(try applying handlers to your window instead, or if you must override, try to call the DesktopContent handlers from your handlers)
//
//	 3. When all functionality is available init() be called in your page, if defined.
//
//	Recommendations:
//	 1. use Debug to output status and errors, e.g.:
//				Debug.log("this is my status",Debug.LOW_PRIORITY); //LOW_PRIORITY, MED_PRIORITY, HIGH_PRIORITY
//	 2. call window.focus() to bring your window to the front of the Desktop
//
//	The code of Requirement #1 should be inserted in the header of each page that will be
//  the content of a window in the ots desktop.
//
//  This code handles bringing the window to the front when the content
//  is clicked or scrolled.
//
//	This code also handles server requests and response handlers for the content code:
//		-DesktopContent.XMLHttpRequest(requestURL, data, returnHandler <optional>,
//			reqParam <optional>, progressHandler <optional>, callHandlerOnErr <optional>,
//			doNotShowLoadingOverlay <optional>, targetGatewaySupervisor <optional>, ignoreSystemBlock <optional>,
//			doNotOfferSequenceChange <optional>)
//
//			... here is an example request:
//
//			DesktopContent.XMLHttpRequest("Request?" +
//
//					//get data
//					"RequestType=exportFEMacro" +
//					"&MacroName=" + macroName +
//					"&PluginName=" + targetFEPluginName,
//
//					//post data
//					"MacroSequence=" + macroSequence +
//					"&MacroNotes=" + encodeURIComponent(macroNotes),
//
//					//request handler
//					function(req)
//					{
//						//..do something on successful response
//						Debug.log("Success!",Debug.INFO_PRIORITY);
//					}, //end request handler
//					0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
//					false /*doNotShowLoadingOverlay*/);  //end XMLHttpRequest() call
//
//			... after a server request, returnHandler is called with response in req and reqParam if user defined
//			... here is a returnHandler declaration example:
//
//					function returnHandler(req,reqParam,errStr)
//					{
//						if(errStr != "") return; //error occured!
//
//						var err = DesktopContent.getXMLValue(req,"Error"); //example application level error
//						if(err)
//						{
//							Debug.log(err,Debug.HIGH_PRIORITY);	//log error and create pop-up error box
//							return;
//						}
//
//						if(reqParam = 0)
//						{ //... do something }
//						else if(reqParam = 1)
//						{ //... do something else}
//						else
//						{ //... do something else}
//
//						//..do more things
//
//					}
//
//		-DesktopContent.getXMLValue(req, name)
//			... to get string value from XML server response. field name is needed.
//
//  ... or to get array of elements by tag name
//		var els = req.responseXML.getElementsByTagName(name);
//		for(var i=0;i<els.length;++i)
//			Debug.log(els[i].getAttribute("value"));
//
//
//	Additional Functionality:
//		DesktopContent.popUpVerification(prompt, continueFunc [optional], replaceVal [optional], bgColor [optional],
//			textColor [optional], borderColor [optional], getUserInput [optional],
//			dialogWidth [optional], cancelFunc [optional], yesButtonText [optional],
//			noAutoComplete [optional], defaultUserInputValue [optional],
//			cancelButtonText [optional], wantMultilineInput [optional])
//		DesktopContent.tooltip(uid,tip,alwaysShow)
//		DesktopContent.setWindowTooltip(tip)
//		DesktopContent.getWindowWidth()
//		DesktopContent.getWindowHeight()
//		DesktopContent.getWindowScrollLeft()
//		DesktopContent.getWindowScrollTop()
//		DesktopContent.setWindowScrollTop(scrollTop)
//		DesktopContent.getMouseX()
//		DesktopContent.getMouseY()
//		DesktopContent.getDefaultWindowColor() 	 // returns "rgb(#,#,#)"
//  	DesktopContent.getDefaultDashboardColor()// returns "rgb(#,#,#)"
//		DesktopContent.getDefaultDesktopColor()  // returns "rgb(#,#,#)"
//		DesktopContent.getUsername()
//		DesktopContent.openNewWindow(name,subname,windowPath,unique,completeHandler)
//		DesktopContent.openNewBrowserTab(name,subname,windowPath,unique,completeHandler)
//		DesktopContent.addDesktopIcon(iconName)
//		DesktopContent.htmlOpen(tag,attObj,innerHTML,doCloseTag)
//		DesktopContent.htmlClearDiv()
//		DesktopContent.parseCSV(text)
//
//=====================================================================================

var DesktopContent = DesktopContent || {}; //define DesktopContent namespace

if (typeof Debug == 'undefined')
	alert('ERROR: Debug is undefined! Must include Debug.js before DesktopContent.js');
if (typeof Globals == 'undefined')
	alert('ERROR: Globals is undefined! Must include Globals.js before DesktopContent.js');


//"public" function list:
//	DesktopContent.XMLHttpRequest(requestURL, data, returnHandler, reqParam, progressHandler, callHandlerOnErr, doNotShowLoadingOverlay, targetGatewaySupervisor, ignoreSystemBlock)
//	DesktopContent.getXMLValue(req, name)
//	DesktopContent.getXMLNode(req, name)
//	DesktopContent.getXMLDataNode(req)
//	DesktopContent.getXMLAttributeValue(req, name, attribute)
//	DesktopContent.getXMLChildren(req, nodeName)
//	DesktopContent.getXMLRequestErrors(req)
//	DesktopContent.systemBlackout(doBlackout)
//	DesktopContent.popUpVerification(prompt, continueFunc [optional], replaceVal [optional], bgColor [optional],
//			textColor [optional], borderColor [optional], getUserInput [optional],
//			dialogWidth [optional], cancelFunc [optional], yesButtonText [optional],
//			noAutoComplete [optional], defaultUserInputValue [optional],
//			cancelButtonText [optional], wantMultilineInput [optional])
//	DesktopContent.setPopUpPosition(el,w,h,padding,border,margin,doNotResize,offsetUp)
//	DesktopContent.tooltip(uid,tip)
//  DesktopContent.setWindowTooltip(tip)
//	DesktopContent.getWindowWidth()
//	DesktopContent.getWindowHeight()
//	DesktopContent.getWindowScrollLeft()
//	DesktopContent.getWindowScrollTop()
//	DesktopContent.setWindowScrollTop(scrollTop)
//	DesktopContent.getBodyWidth()
//	DesktopContent.getBodyHeight()
//	DesktopContent.getMouseX()
//	DesktopContent.getMouseY()
//	DesktopContent.getDefaultWindowColor()
//  DesktopContent.getDefaultDashboardColor()
//	DesktopContent.getDefaultDesktopColor()
//	DesktopContent.getUsername()
//	DesktopContent.openNewWindow(name,subname,windowPath,unique,completeHandler)
//	DesktopContent.mouseMoveSubscriber(newHandler)
//	DesktopContent.unmaximizeWindow()
//	DesktopContent.openNewBrowserTab(name,subname,windowPath,unique,completeHandler)
//	DesktopContent.addDesktopIcon(iconName)
//	DesktopContent.getParameter(index, name)
//	DesktopContent.getDesktopParameter(index, name)
//	DesktopContent.getDesktopWindowTitle()
//	DesktopContent.showLoading()
//	DesktopContent.hideLoading()
//	DesktopContent.isLoading()
//	DesktopContent.scrollIntoViewY(targetID, doHighlight)
//	DesktopContent.scrollIntoViewX(targetID, doHighlight)

//"private" function list:
//	DesktopContent.init()
//	DesktopContent.handleFocus(e)
//	DesktopContent.handleBlur(e)
//	DesktopContent.handleScroll(e)
//	DesktopContent.mouseMove(mouseEvent)
//////	DesktopContent.checkCookieCodeRace()
//	DesktopContent.clearPopUpVerification(func)
//	DesktopContent.parseColor(colorStr)
//	DesktopContent.tooltipSetAlwaysShow(srcFunc,srcFile,srcId,neverShow,temporarySilence)
//	DesktopContent.tooltipConditionString(str);

DesktopContent._theWindowId = -1;
DesktopContent._theWindowTitle = -1;
DesktopContent._userDisplayName = "No-Login";

DesktopContent._isFocused = false;
DesktopContent._theWindow;
DesktopContent._theDesktopWindow;
//DesktopContent._myDesktopFrame ;






//DesktopContent._zMailbox = 0;
//DesktopContent._mouseOverXmailbox;
//DesktopContent._mouseOverYmailbox;
DesktopContent._updateMouseOverMailboxTimer = 0;
DesktopContent._windowMouseX = -1;
DesktopContent._windowMouseY = -1;

DesktopContent._localUrnLid = 0;
DesktopContent._localOrigin = "";
DesktopContent._serverUrnLid = 0;
DesktopContent._serverOrigin = "";
DesktopContent._remoteServerUrnLid = 0;
DesktopContent._remoteServerOrigin = "";
DesktopContent._topServerUrnLid = 0;  //this refers to the primary top-level Gateway Supervisor (in primary/top & secondary/remote subsystem topologies)
DesktopContent._topServerOrigin = ""; //this refers to the primary top-level Gateway Supervisor (in primary/top & secondary/remote subsystem topologies)

DesktopContent._cookieCodeMailbox = 0;
DesktopContent._updateTimeMailbox = 0;
DesktopContent._lastCookieCode = 0;
DesktopContent._lastCookieTime = 0;
DesktopContent._updateCookieCodeTimer = 0;

DesktopContent._needToLoginMailbox = false;
//DesktopContent._openWindowMailbox = 0;
DesktopContent._blockSystemCheckMailbox = false;
DesktopContent._windowColorPostbox;
DesktopContent._dashboardColorPostbox;
DesktopContent._desktopColor;

DesktopContent._verifyPopUp = 0;
DesktopContent._verifyPopUpId = "DesktopContent-verifyPopUp";




DesktopContent._mouseMoveSubscribers = [];
DesktopContent._loginNotifyHandler = undefined; //User code should define this function if action desired when re-login occurs

DesktopContent._pageInitCalled = false;
DesktopContent._windowMessagingInactive = undefined;

DesktopContent._sequence = 0;

//=====================================================================================
//initialize content's place in the world
// caution when using "window" anywhere outside this function because
//  desktop window can be at different levels depending on page depth (page may be inside frame)
// use instead DesktopContent._theWindow
DesktopContent.init = function(onloadFunction)
{
	if(typeof Desktop !== 'undefined') return; //skip if Desktop exists (only using for tooltip), DesktopContent._theWindow will be undefined

	var tmpCnt = 0;
	DesktopContent._theWindow = self;
	while(tmpCnt++ < 5 && DesktopContent._theWindow &&  //while can not find the top window frame in the desktop
			DesktopContent._theWindow.window.name.search("DesktopWindowFrame") < 0)
		DesktopContent._theWindow = DesktopContent._theWindow.parent;

	DesktopContent._theWindow 				= DesktopContent._theWindow.window;
	DesktopContent._theDesktopWindow 		= DesktopContent._theWindow.parent.window;
	//DesktopContent._myDesktopFrame        	= DesktopContent._theWindow.parent.document.getElementById(DesktopContent._theWindow.name);


//	try
//	{
//	---	DesktopContent._myDesktopFrame        = DesktopContent._theWindow.parent.document.getElementById(DesktopContent._theWindow.name);
//	---	DesktopContent._zMailbox              = DesktopContent._theWindow.parent.document.getElementById("Desktop-windowZmailbox");
//	---	DesktopContent._mouseOverXmailbox     = DesktopContent._theWindow.parent.document.getElementById("Desktop-mouseOverXmailbox");
//	---	DesktopContent._mouseOverYmailbox     = DesktopContent._theWindow.parent.document.getElementById("Desktop-mouseOverYmailbox");
//
//		DesktopContent._cookieCodeMailbox     = DesktopContent._theWindow.parent.document.getElementById("DesktopContent-cookieCodeMailbox");
//		DesktopContent._updateTimeMailbox     = DesktopContent._theWindow.parent.document.getElementById("DesktopContent-updateTimeMailbox");
//		DesktopContent._needToLoginMailbox    = DesktopContent._theWindow.parent.document.getElementById("DesktopContent-needToLoginMailbox");
//		DesktopContent._openWindowMailbox	  = DesktopContent._theWindow.parent.document.getElementById("DesktopContent-openWindowMailbox");
//		DesktopContent._blockSystemCheckMailbox = DesktopContent._theWindow.parent.document.getElementById("DesktopContent-blockSystemCheckMailbox");
//
//		DesktopContent._windowColorPostbox	  = DesktopContent._theWindow.parent.document.getElementById("DesktopContent-windowColorPostbox");
//		DesktopContent._dashboardColorPostbox = DesktopContent._theWindow.parent.document.getElementById("DesktopContent-dashboardColorPostbox");
//
//
//		if(DesktopContent._theWindow.parent.document.body)
//			DesktopContent._desktopColor 		  = DesktopContent._theWindow.parent.document.body.style.backgroundColor;
//	}
//	catch(e)
//	{
//		Debug.log("Ignoring window mailbox error during init(): " + e);
//	}

	window.onfocus = DesktopContent.handleFocus;
	window.onmousedown = DesktopContent.handleFocus;
	window.onscroll = DesktopContent.handleScroll;
	window.onblur = DesktopContent.handleBlur;
	window.onmousemove = DesktopContent.mouseMove; //setup mouse move handler
	window.focus();
	DesktopContent._theWindow.focus();	//before this fix, full screen in new tab would not give window focus

	document.addEventListener('click', function (e) {
		const target = e.target.closest('a[href="#"]');
		if (target) {
		  e.preventDefault();    // stops the navigation or hash change
		//   e.stopPropagation();   // blocks onclick! ensures it stays inside the iframe
		  console.log("Blocked href='#' inside iframe but onclick still runs");
		}
	  }, true);

//	try
//	{
//		DesktopContent._serverUrnLid = DesktopContent.getDesktopWindowParameter(0,"urn");//((DesktopContent._theWindow.parent.window.location.search.substr(1)).split('='))[1];
//		if(typeof DesktopContent._serverUrnLid == 'undefined')
//			Debug.log("ERROR -- Gateway Supervisor Application URN-LID not found!"); //,Debug.HIGH_PRIORITY);
//		Debug.log("Gateway Supervisor Application URN-LID #" + DesktopContent._serverUrnLid);
//		DesktopContent._serverOrigin = DesktopContent._theWindow.parent.window.location.origin;
//		Debug.log("Gateway Supervisor Application Origin = " + DesktopContent._serverOrigin);
//	}
//	catch(e)
//	{
//		Debug.log("Ignoring Gateway extract error during init(): " + e);
//
//		DesktopContent._serverUrnLid = 200;
//		DesktopContent._serverOrigin = "http://correlator2.fnal.gov:2015";
//
//
//	}


	//can always get local server info from URL
	Debug.log("Window URL " + window.location.href);
	DesktopContent._localUrnLid = DesktopContent.getParameter(0,"urn");
	if(typeof DesktopContent._localUrnLid == 'undefined')
		DesktopContent._localUrnLid = 0;
	DesktopContent._localOrigin = window.location.origin;

	Debug.log("Local Application URN-LID #" + DesktopContent._localUrnLid);
	Debug.log("Local Application Origin = " + DesktopContent._localOrigin);

	DesktopContent._remoteServerUrnLid = DesktopContent.getParameter(0,"remoteServerUrnLid");
	if(typeof DesktopContent._remoteServerUrnLid == 'undefined')
		DesktopContent._remoteServerUrnLid = 0;
	DesktopContent._remoteServerOrigin = DesktopContent.getParameter(0,"remoteServerOrigin");

	if(DesktopContent._remoteServerUrnLid)
	{
		Debug.log("Remote Gateway Application URN-LID #" + DesktopContent._remoteServerUrnLid);
		Debug.log("Remote Gateway Application Origin = " + DesktopContent._remoteServerOrigin);
	}


	//get Wizard sequence (if in Wizard mode)
	try
	{
		DesktopContent._sequence = DesktopContent.getDesktopParameter(0,"code");
		if(!DesktopContent._sequence || DesktopContent._sequence == "")
			DesktopContent._sequence = 0; //normal desktop mode
		else
			Debug.log("In Wizard Mode with Sequence=" + DesktopContent._sequence);
	}
	catch(e)
	{
		Debug.log("Could not find wiz mode sequence. Assuming normal mode.");
		DesktopContent._sequence = 0; //normal desktop mode
	}



	//create message request listener for messages from desktop, to overcome same-origin policy
	//The first message is initiated by the Desktop once the window frame has been loaded.
	window.addEventListener('message', event => {

		// console.log(window.location.href,
		// 	"Child event.data",event.data);


		if(!event.data.windowId)
		{
			Debug.log("Illegal message received!");
			return;
		}

		if(event.data.request == "getRequestLIDInfo")
		{
			Debug.log("Received info request from child page; localUrnLid", DesktopContent._localUrnLid);
			event.source.postMessage(
				{

				"windowId":			"unknown",
				"request":			"giveRequestLIDInfo",
				"cookieCode":		DesktopContent._cookieCodeMailbox,
				"localURN": 		DesktopContent._localUrnLid,
				"gatewayURN" :		DesktopContent._serverUrnLid,
				"gatewayOrigin":	DesktopContent._serverOrigin,
				"topGatewayURN" :	DesktopContent._topServerUrnLid,
				"topGatewayOrigin":	DesktopContent._topServerOrigin
				}, "*");
			event.stopPropagation();
			event.stopImmediatePropagation();
			return;
		}
		else if(event.data.request == "getParentCookieCode")
		{

			Debug.log("Received info request from child page");
			event.source.postMessage(
				{

				"windowId":		"unknown",
				"request":		"giveParentCookieCode",
				"cookieCode":	DesktopContent._cookieCodeMailbox
				}, "*");
			return;
		}
		else if(event.data.request == "giveParentCookieCode")
		{
			Debug.log("Received cookie response from parent page");
			DesktopContent._cookieCodeMailbox = event.data.cookieCode;
		}
		else if(event.data.request == "updateWindowSequence")
		{
			Debug.log("Received updated sequence from parent page");
			DesktopContent._sequence = event.data.sequence;
		}
		else if(event.data.request == "giveRequestLIDInfo")
		{
			Debug.log("Received info response from parent page; localUrnLid", DesktopContent._localUrnLid);

			event.stopPropagation();
			event.stopImmediatePropagation();

			if(DesktopContent._pageInitCalled || !event.data.gatewayURN) return;

			Debug.log("Received info response from parent page");
			DesktopContent._localUrnLid = event.data.localURN;
			DesktopContent._serverUrnLid = event.data.gatewayURN;
			DesktopContent._serverOrigin = event.data.gatewayOrigin;
			DesktopContent._topServerUrnLid = event.data.topGatewayURN;
			DesktopContent._topServerOrigin = event.data.topGatewayOrigin;
			DesktopContent._cookieCodeMailbox = event.data.cookieCode;

			Debug.log("The Desktop Window ID = " + DesktopContent._theWindowId);
			Debug.log("The Desktop Window Title = " + DesktopContent._theWindowTitle);
			Debug.log("Local Application URN-LID #" + DesktopContent._localUrnLid);

			if(DesktopContent._remoteServerUrnLid) //overwrite with remote gateway info!
			{
				Debug.log("Gateway Supervisor overriding with Remote Supervisor info!");
				DesktopContent._serverUrnLid = DesktopContent._remoteServerUrnLid;
				DesktopContent._serverOrigin = DesktopContent._remoteServerOrigin;
			}

			Debug.log("Gateway Supervisor Application URN-LID #" + DesktopContent._serverUrnLid);
			Debug.log("Gateway Supervisor Application Origin = " + DesktopContent._serverOrigin);

			if(event.data.cookieCode)
			{
				DesktopContent._cookieCodeMailbox = event.data.cookieCode;

				//========
				function localUpdateCookieCode()
				{
					window.clearTimeout(DesktopContent._updateCookieCodeTimer);

					Debug.log("localUpdateCookieCode");
					var deltaTime = parseInt((new Date()).getTime()) - //in ms
							parseInt(DesktopContent._updateTimeMailbox);
					if(deltaTime > 30)
					{
						Debug.log("Requesting updated cooking code from desktop");

						DesktopContent._theWindow.postMessage(
								{
							"windowId":			"unknown",
							"request":  		"getParentCookieCode"
								},"*");
					}
					else
						Debug.log("No need to update deltaTime=" + deltaTime);

					DesktopContent._updateCookieCodeTimer = window.setTimeout(
							localUpdateCookieCode,30*1000 /*ms*/);
				} //end localUpdateCookieCode()

				//from now on check for a new cookie code every 30 seconds
				localUpdateCookieCode();
			}
			else if(!DesktopContent._sequence)
				Debug.log("No cookie code and no sequence!");

			localOnloadHandler();

			return;
		}
	});  //end parent/child desktop window handler


	//create message request listener for messages from desktop, to overcome same-origin policy
	//The first message is initiated by the Desktop once the window frame has been loaded.
	DesktopContent._theWindow.addEventListener('message', event => {

		// console.log(window.location.href,
		// 	"Desktop Window event.data",event.data);


		if(!event.data.windowId)
		{
			Debug.log("Illegal message received!");
			return;
		}

		if(!event.data.request)
		{

			Debug.log("First message from Gateway Desktop received!");

			DesktopContent._theWindowId		= event.data.windowId;
			DesktopContent._theWindowTitle	= event.data.windowTitle;
			DesktopContent._userDisplayName = event.data.userDisplayName;
			DesktopContent._serverUrnLid 	= event.data.gatewayURN;
			DesktopContent._serverOrigin 	= event.data.gatewayOrigin;

			DesktopContent._dashboardColorPostbox	= event.data.dashboardColor;
			DesktopContent._desktopColor			= event.data.desktopColor;
			DesktopContent._windowColorPostbox		= event.data.windowFrameColor;


			if(event.data.cookieCode)
			{
				DesktopContent._cookieCodeMailbox = event.data.cookieCode;

				//========
				function localUpdateCookieCode()
				{
					window.clearTimeout(DesktopContent._updateCookieCodeTimer);

					// Debug.log("localUpdateCookieCode");
					var deltaTime = parseInt((new Date()).getTime()) - //in ms
							parseInt(DesktopContent._updateTimeMailbox);
					if(deltaTime > 30)
					{
						// Debug.log("Requesting updated cooking code from desktop");

						DesktopContent._theDesktopWindow.postMessage(
								{
							"windowId":			DesktopContent._theWindowId,
							"request":  		"getCookieCode"
								},"*");
					}
					// else
					// 	Debug.log("No need to update deltaTime=" + deltaTime);

					DesktopContent._updateCookieCodeTimer = window.setTimeout(
							localUpdateCookieCode,30*1000 /*ms*/);
				} //end localUpdateCookieCode()

				//from now on check for a new cookie code every 30 seconds
				localUpdateCookieCode();
			}
			else if(!DesktopContent._sequence)
				Debug.log("No cookie code and no sequence!");

			if(DesktopContent._remoteServerUrnLid) //overwrite with remote gateway info!
			{
				Debug.log("Gateway Supervisor overriding with Remote Supervisor info!");
				DesktopContent._serverUrnLid = DesktopContent._remoteServerUrnLid;
				DesktopContent._serverOrigin = DesktopContent._remoteServerOrigin;
				DesktopContent._topServerUrnLid = event.data.gatewayURN;
				DesktopContent._topServerOrigin = event.data.gatewayOrigin;
				if(DesktopContent._topServerUrnLid)
				{
					Debug.log("Primary/Top Gateway Supervisor URN-LID #" + DesktopContent._topServerUrnLid);
					Debug.log("Primary/Top Gateway Supervisor Origin = " + DesktopContent._topServerOrigin);
				}
			}

			Debug.log("The Desktop Window ID = " + DesktopContent._theWindowId);
			Debug.log("The Desktop Window Title = " + DesktopContent._theWindowTitle);
			Debug.log("Local XDAQ Supervisor URN-LID #" + DesktopContent._localUrnLid);
			Debug.log("Local XDAQ Supervisor Origin = " + DesktopContent._localOrigin);
			Debug.log("Local Gateway Supervisor URN-LID #" + DesktopContent._serverUrnLid);
			Debug.log("Local Gateway Supervisor Origin = " + DesktopContent._serverOrigin);

			localOnloadHandler();

			//			DesktopContent._theWindow.parent.window.postMessage(
			//					{
			//				"windowId":	(event.data.windowId|0),
			//				"req":		"childWindowRequest"
			//					}, "*");
		}
		else
		{

			//Debug.log("Request or Response!");

			if(event.data.request == "getParentCookieCode")
			{
				Debug.log("Received info request from child page");
				event.source.postMessage(
					{

					"windowId":		"unknown",
					"request":		"giveParentCookieCode",
					"cookieCode":	DesktopContent._cookieCodeMailbox
					}, "*");
				return;
			}

			if(DesktopContent._theWindowId != event.data.windowId)
			{
				Debug.med("Impossible desktop message violation! Notify admins. May happen if users click around during window refresh?");
				return;
			}

			switch(event.data.request)
			{
			case "getCookieCode" + "Response":
				DesktopContent._cookieCodeMailbox = event.data.cookieCode;
				//console.log("getCookieCode" + "Response");
				break;
			case "loginNotify":
				DesktopContent._cookieCodeMailbox = event.data.cookieCode;
				DesktopContent._needToLoginMailbox = false;
				DesktopContent._arrayOfFailedHandlers = []; // clear
				console.log("loginNotify",DesktopContent._needToLoginMailbox);
				//Debug.info("This window has received notice of a successful login!");

				//call user login notify handler
				if(DesktopContent._loginNotifyHandler)
					DesktopContent._loginNotifyHandler();
				break;
			case "updateWindowSequence":
				Debug.log("Received updated sequence from parent desktop");
				DesktopContent._sequence = event.data.sequence;
				break;
			case "startNeedingMouseXY":
				DesktopContent._desktopNeedsMouseXY = true;
				//console.log("_desktopNeedsMouseXY", DesktopContent._desktopNeedsMouseXY);
				break;
			case "stopNeedingMouseXY":
				DesktopContent._desktopNeedsMouseXY = false;
				//console.log("_desktopNeedsMouseXY", DesktopContent._desktopNeedsMouseXY);
				break;
			case "doWindowTooltip":
				Debug.log("Received doWindowTooltip from parent desktop");
				var tooltipEl = document.getElementById("otsDesktopWindowTooltipElement");
				if(!tooltipEl) //a la Desktop.js:902
				{
					DesktopContent.tooltip("ALWAYS", "There is no tooltip for the '<b>" +
							DesktopContent.getDesktopWindowTitle() +
							"</b>' window. Try visiting <a href='https://otsdaq.fnal.gov' target='_blank'>otsdaq.fnal.gov</a> for further assistance.");
				}
				else
				{
					DesktopContent.tooltip("ALWAYS", decodeURIComponent(tooltipEl.innerText));
				}
				break;
			default:
				Debug.log("Illegal response received from Desktop! Notify admins", Debug.HIGH_PRIORITY);
				return;
			}

		}
	});  //end normal Desktop Window handler

	if(DesktopContent._localUrnLid == 0)
	{
		Debug.log("Attempting to ask parent for local and gateway info");
		DesktopContent._theWindow.postMessage(
				{
				"windowId" :	"unknown",
				"request":		"getRequestLIDInfo"
				}, "*");
	}

	//call self in a bit to try init (in case window messaging not active)
	var onloadWatchdogTimer = window.setTimeout(localOnloadWatchdog, 300 /*ms*/);

	return;

	//========
	function localOnloadWatchdog()
	{
		Debug.log("localOnloadWatchdog()",DesktopContent._serverUrnLid, document.readyState);

		window.clearTimeout(onloadWatchdogTimer);

		if(!document.body || document.readyState != "complete") //the document is not ready?!
		{
			//only allow watchdog test if document is loaded
			onloadWatchdogTimer = window.setTimeout(
				localOnloadWatchdog,300 /*ms*/);

			Debug.log("localOnloadWatchdog() body not loaded",DesktopContent._serverUrnLid);
			return;
		}

		Debug.log("localOnloadWatchdog() body loaded 1", DesktopContent._serverUrnLid);
		onloadWatchdogTimer = window.setTimeout(function()
		{
			Debug.log("localOnloadWatchdog() body loaded 2", DesktopContent._serverUrnLid);
			if(!DesktopContent._pageInitCalled)
			{
				Debug.log("Perhaps window messaging not active?",DesktopContent._serverUrnLid);
				DesktopContent._windowMessagingInactive = true;
			}
			localOnloadHandler();
		}, 300 /*ms*/);

	} //end localOnloadWatchdog()

	//========
	function localOnloadHandler()
	{
		window.clearTimeout(onloadWatchdogTimer);

		if(!document.body || document.readyState != "complete") //the document is not ready?!
		{
			//call self in a bit to try again
			onloadWatchdogTimer = window.setTimeout(
				localOnloadHandler,300 /*ms*/);
			return;
		}

		if(DesktopContent._pageInitCalled)
		{
			Debug.log("Page init already called.");
			return;
		}
		DesktopContent._pageInitCalled = true;

		document.body.removeEventListener("keydown",Debug.KeyDownListener);
		document.body.addEventListener("keydown",Debug.KeyDownListener);

		try
		{
			if(onloadFunction)
			{
				Debug.log("Calling page body onload!");
				onloadFunction(); //call page's init!
			}
			else if(init)
			{
				Debug.log("Calling page init!");
				init(); //call page's init!
			}
			else
				Debug.log("Ignoring missing init()");
		}
		catch(e)
		{
			Debug.log("Ignoring error in onload init():",e);
		}
	} //end localOnloadHandler()

} //end DesktopContent.init()

//=====================================================================================
//DesktopContent.getParameter ~
//	returns the value of the url GET parameter specified by index
//	if using name, then (mostly) ignore index
//	Note: in normal mode the first two params are only separated by = (no &'s) for historical reasons
DesktopContent.getParameter = function(index,name)
{
	var params = (window.location.search.substr(1)).split('&');
	var spliti, vs;
	//if name given, make it the priority
	if(name)
	{
		for(index=0;index<params.length;++index)
		{
			spliti = params[index].indexOf('=');
			if(spliti < 0) continue; //poorly formed parameter?
			vs = [params[index].substr(0,spliti),params[index].substr(spliti+1)];
			if(decodeURIComponent(vs[0]) == name)
				return decodeURIComponent(vs[1]);
		}

		Debug.log("name",name," not found in window.location.search:",window.location.search);
		return; //return undefined .. name not found
	}

	//using index
	if(index >= params.length) return; //return undefined

	spliti = params[index].indexOf('=');
	if(spliti < 0) return; //return undefined
	vs = [params[index].substr(0,spliti),params[index].substr(spliti+1)];
	return decodeURIComponent(vs[1]); //return value
} //end DesktopContent.getParameter()

//=====================================================================================
//DesktopContent.getDesktopParameter ~
//	returns the value of the url GET parameter specified by index of the Desktop url
//	if using name, then (mostly) ignore index
DesktopContent.getDesktopParameter = function(index, name)
{
	try{
	// Debug.log(window.location)

	var win = DesktopContent._theWindow;
	if(!win)	//for parameter directly from desktop code
		win = window.parent.window;
	else
		win = win.parent.parent.window;
	var params = (win.location.search.substr(1)).split('&');
	if(index >= params.length) return; //return undefined
	var spliti, vs;
	//if name given, make it the priority
	if(name)
	{
		for(var index=0;index<params.length;++index)
		{
			spliti = params[index].indexOf('=');
			if(spliti < 0) continue; //poorly formed parameter?
			vs = [params[index].substr(0,spliti),params[index].substr(spliti+1)];
			if(vs[0] == name)
				return decodeURIComponent(vs[1]);
		}
		return; //return undefined .. name not found
	}

	spliti = params[index].indexOf('=');
	if(spliti < 0) return; //return undefined
	vs = [params[index].substr(0,spliti),params[index].substr(spliti+1)];
	return decodeURIComponent(vs[1]); //return value
	}
	catch(e)
	{
		Debug.log("Ignoring get desktop parameter error :" + e);
		return;
	}
} //end DesktopContent.getDesktopParameter()

//=====================================================================================
//DesktopContent.getDesktopWindowParameter ~
//	returns the value of the url GET parameter specified by index of the Window frame url
//	if using name, then (mostly) ignore index
DesktopContent.getDesktopWindowParameter = function(index, name)
{
	// Debug.log(window.location)

	var win = DesktopContent._theWindow;
	if(!win)	//for parameter directly from desktop code
		win = window;
	else if(!win.location || !win.location.search)
		win = win.parent.window;

	//fix/standardize search string
	var searchStr = win.location.search.substr(1);
	var i = searchStr.indexOf("=securityType");
	if(i > 0) searchStr = searchStr.substr(0,i) + '&' + searchStr.substr(i+1);

	var params = ((searchStr)).split('&');
	if(index >= params.length) return; //return undefined
	var spliti, vs;
	//if name given, make it the priority
	if(name)
	{
		for(var index=0;index<params.length;++index)
		{
			spliti = params[index].indexOf('=');
			if(spliti < 0) continue; //poorly formed parameter?
			vs = [params[index].substr(0,spliti),params[index].substr(spliti+1)];
			if(vs[0] == name)
				return decodeURIComponent(vs[1]);
		}
		return; //return undefined .. name not found
	}

	spliti = params[index].indexOf('=');
	if(spliti < 0) return; //return undefined
	vs = [params[index].substr(0,spliti),params[index].substr(spliti+1)];
	return decodeURIComponent(vs[1]); //return value
} //end DesktopContent.getDesktopWindowParameter()

//=====================================================================================
//DesktopContent.handleFocus ~
DesktopContent.handleFocus = function(e)
{	//access z-index mailbox on desktop, increment by 1 and set parent's z-index

	if(DesktopContent._theWindowId < 0) return; //only happen if not part of desktop, or before init

	//Debug.log("Focus DesktopContent._isFocused ",DesktopContent._isFocused,
	//		DesktopContent._theWindowId);

	DesktopContent._isFocused = true;

	//make this window the desktop foreground window
	DesktopContent._theDesktopWindow.postMessage(
			{
		"windowId":			DesktopContent._theWindowId,
		"request":  		"makeForeWindow"
			},"*");

//	DesktopContent._myDesktopFrame.parentNode.parentNode.style.zIndex = DesktopContent._zMailbox.innerHTML;
//	DesktopContent._zMailbox.innerHTML = parseInt(DesktopContent._zMailbox.innerHTML) + 1;
	return true;
} //end DesktopContent.handleFocus()
//=====================================================================================
DesktopContent.handleBlur = function(e)
{
	//Debug.log("Blur DesktopContent._isFocused " + DesktopContent._isFocused);
	DesktopContent._isFocused = false;
} //end DesktopContent.handleBlur()
//=====================================================================================
DesktopContent.handleScroll = function(e)
{
	//console.log("Scroll DesktopContent.handleScroll", DesktopContent._isFocused, DesktopContent._theWindowId);
	window.focus();
} //end DesktopContent.handleScroll()

//=====================================================================================
DesktopContent.unmaximizeWindow = function(mouseEvent,onlyDesktopFunction)
{
	Debug.log("DesktopContent.unmaximizeWindow()");

	if(!DesktopContent._theWindow) return; //only happens if not part of desktop

	DesktopContent._theDesktopWindow.postMessage(
						{
		"windowId":			DesktopContent._theWindowId,
		"request":  		"unmaximizeWindow"
						},"*");


} //end DesktopContent.mouseMove()

//=====================================================================================
DesktopContent.mouseMove = function(mouseEvent,onlyDesktopFunction)
{
	//console.log("desktop move",DesktopContent._mouseMoveSubscribers.length);
	//Debug.log("Move DesktopContent._isFocused=" + DesktopContent._isFocused);

	//call each subscriber
	for(var i=0; !onlyDesktopFunction && i<DesktopContent._mouseMoveSubscribers.length; ++i)
		DesktopContent._mouseMoveSubscribers[i](mouseEvent);

	if(!DesktopContent._theWindow) return; //only happens if not part of desktop

	DesktopContent._windowMouseX = parseInt(mouseEvent.clientX);
	DesktopContent._windowMouseY = parseInt(mouseEvent.clientY);

	if(DesktopContent._desktopNeedsMouseXY)
		localUpdateMouseOverMailbox();

//	window.clearTimeout(DesktopContent._updateMouseOverMailboxTimer);
//	DesktopContent._updateMouseOverMailboxTimer = //avoid updating mailbox too often
//			window.setTimeout(localUpdateMouseOverMailbox,500);
	return;

	//==================
	//This is used by desktop for resizing the Dashboard and other Windows
	//	while mouse is in this window
	function localUpdateMouseOverMailbox()
	{
		console.log("Update desktop mouse");//,DesktopContent._mouseOverXmailbox,DesktopContent._mouseOverYmailbox);

		DesktopContent._theDesktopWindow.postMessage(
							{
			"windowId":			DesktopContent._theWindowId,
			"request":  		"updateMouseoverXY",
			"x":  				DesktopContent._windowMouseX,
			"y":				DesktopContent._windowMouseY
							},"*");


//		DesktopContent._mouseOverXmailbox.innerHTML = parseInt(DesktopContent._myDesktopFrame.parentNode.parentNode.offsetLeft) +
//				parseInt(DesktopContent._myDesktopFrame.offsetLeft) + DesktopContent._windowMouseX;
//		DesktopContent._mouseOverYmailbox.innerHTML = parseInt(DesktopContent._myDesktopFrame.parentNode.parentNode.offsetTop) +
//				parseInt(DesktopContent._myDesktopFrame.offsetTop) + DesktopContent._windowMouseY;
	} //end localUpdateMouseOverMailbox()


} //end DesktopContent.mouseMove()

//=====================================================================================
DesktopContent.mouseMoveSubscriber = function(newHandler)
{
	DesktopContent._mouseMoveSubscribers.push(newHandler);
} //end DesktopContent.mouseMoveSubscriber()


//=====================================================================================
//=====================================================================================
//=====================================================================================

		//document.body does not exist yet (always?)! Handled in DesktopContent.init()
		DesktopContent.init();

//=====================================================================================
//=====================================================================================
//=====================================================================================



//=====================================================================================
// XML request helpers
//=====================================================================================

//used by DesktopContent.XMLHttpRequest to reject multiple calls to same handler
//(this is a result of bad error handling in the desktop window page.. so this is meant to inform the developer to fix the issue)
DesktopContent._arrayOfFailedHandlers = [];

//=====================================================================================
//=====================================================================================
//Loading pop up helpers
DesktopContent._loadBox = 0;
DesktopContent._loadBoxId = "DesktopContent-load-box";
DesktopContent._loadBoxTimer = 0;
DesktopContent._loadBoxRequestStack = 0; //load box is not removed until back to 0

//=====================================================================================
//DesktopContent.showLoading
//	Pass nextFunction to launch something immediately after showing load box
//	with hideLoading() called after the function
DesktopContent.showLoading = function(nextFunction)
{

	localDoIt();
	if(nextFunction)
	{
		window.setTimeout(function()
				{
			nextFunction();
			DesktopContent.hideLoading();
				},10);
	}
	return;

	/////////////
	function localDoIt()
	{
		//Debug.log("DesktopContent.showLoading " + DesktopContent._loadBoxRequestStack);

		if(DesktopContent._loadBoxRequestStack++) //box should still be open, add to stack
		{
			//re-position to center of page before returning in case scroll has changed
			localPositionIt();
			return;
		}

		//check if DesktopContent._loadBox has been set
		if(!DesktopContent._loadBox)
		{
			//check if there is already an error box with same id and share
			var el = document.getElementById(DesktopContent._loadBoxId);
			if(!el) //element doesn't already exist, so we need to create the element
			{
				var body = document.getElementsByTagName("BODY")[0];
				if(!body) //maybe page not loaded yet.. so wait to report
				{
					//try again in 1 second
					window.setTimeout(function() { --DesktopContent._loadBoxRequestStack /*revert inc*/; localDoIt(); }, 1000);
					return;
				}

				//create the element
				el = document.createElement("div");
				el.setAttribute("id", DesktopContent._loadBoxId);
				el.style.display = "none";
				var str = "";

				str += "<table height='100%' width='100%'><td style='color: white' id='" +
						DesktopContent._loadBoxId + "-td'>Loading...</td></table>";
				el.innerHTML = str;
				body.appendChild(el); //add element to body of page


				//add style for loading to page HEAD tag
				var css = "";


				//load box style
				css += "#" + DesktopContent._loadBoxId +
						"{" +
						"position: absolute; display: none; border: 2px solid gray;" +
						"background-color: rgba(0,0,0,0.8); overflow-y: auto;" +
						"overflow-x: auto;	padding: 5px; -moz-border-radius: 2px;" +
						"-webkit-border-radius: 2px;	border-radius: 2px;" +
						"font-size: 18px; z-index: 2147483647;" + //max 32 bit number z-index
						"color: white; " +
						"font-family: 'Comfortaa', arial; text-align: left;" +
						"left: 8px; top: 8px; margin-right: 8px; height:400px; " +
						"}\n\n";
				css += "#" + DesktopContent._loadBoxId + " table" +
						"{" +
						"background-color: rgba(0,0,0,0.8);" +
						"border: 0;" +
						"}\n\n";

				//load box text style
				//			css += "#" + DesktopContent._loadBoxId + "-td" +
				//					"{" +
				//					"color: white; font-size: 18px;" +
				//					"font-family: 'Comfortaa', arial;" +
				//					"text-align: center;" +
				//					"}\n\n";

				//add style element to HEAD tag
				var style = document.createElement('style');

				if (style.styleSheet) {
					style.styleSheet.cssText = css;
				} else {
					style.appendChild(document.createTextNode(css));
				}

				document.getElementsByTagName('head')[0].appendChild(style);
			}
			DesktopContent._loadBox = el;
		}

		//have load popup element now, so display it at center of page
		localPositionIt();

		//===================
		//setup Loading.. animation
		var loadBoxStr = "..";
		var el = document.getElementById(DesktopContent._loadBoxId + "-td");
		el.innerHTML = "Loading" + loadBoxStr;

		/////////////////////////
		var loadBoxAnimationFunction = function() {
			if(loadBoxStr.length > 3) loadBoxStr = "";
			else
				loadBoxStr += ".";
			el.innerHTML = "Loading" + loadBoxStr;
			//console.log("loading",loadBoxStr.length);
		};  //end loadBoxAnimationFunction

		window.clearInterval(DesktopContent._loadBoxTimer);
		DesktopContent._loadBoxTimer = window.setInterval(loadBoxAnimationFunction, 300);
	} //end localDoIt()

	/////////////
	function localPositionIt()
	{
		var W = 100;
		var H = 60;

		var WW,WH; //window width and height
		//get width and height properly
		if(typeof DesktopContent != 'undefined') //define width using DesktopContent
		{
			WW = DesktopContent.getWindowWidth();
			WH = DesktopContent.getWindowHeight();
		}
		else if(typeof Desktop != 'undefined' && Desktop.desktop) //define width using Desktop
		{
			WW = DesktopContent.getDesktopWidth();
			WH = DesktopContent.getDesktopHeight();
		}

		var X = DesktopContent.getWindowScrollLeft() + (WW - W - 4)/2; //for 2px borders
		var Y = DesktopContent.getWindowScrollTop() + (WH - H -4)/2; //for 2px borders

		//show the load box whereever the current scroll is
		DesktopContent._loadBox.style.left = (X) + "px";
		DesktopContent._loadBox.style.top = (Y) + "px";
		DesktopContent._loadBox.style.width = (W) + "px";
		DesktopContent._loadBox.style.height = (H) + "px";

		DesktopContent._loadBox.style.display = "block";
	} //end localPositionIt()
} //end showLoading()
//=====================================================================================
DesktopContent._loadBoxHideTimer = 0;
DesktopContent.hideLoading = function()
{

	//console.log("DesktopContent.hideLoading PRE",DesktopContent._loadBoxRequestStack);
	window.setTimeout(localHideLoadBox, 300);

	/////////////////////////
	function localHideLoadBox()
	{
		//console.log("DesktopContent.hideLoading",DesktopContent._loadBoxRequestStack);
		if(--DesktopContent._loadBoxRequestStack) //subtract from stack, but dont hide if stack remains
			return;

		window.clearInterval(DesktopContent._loadBoxTimer); //kill loading animation
		//console.log("DesktopContent.hideLoading");
		var el = document.getElementById(DesktopContent._loadBoxId);
		if(el) el.style.display = "none";

	} //end localHideLoadBox


} //end hideLoading()
//=====================================================================================
//returns true if loading box is up/unresolved
DesktopContent.isLoading = function() { return DesktopContent._loadBoxRequestStack > 0; } //end isLoading()

//=====================================================================================
//DesktopContent.scrollIntoViewX / scrollIntoViewY
// is a function that allows for buttons to not scroll the main
// ots window. To use, wrap your button/link/anchor with a div
// and pass its id to scrollIntoView
DesktopContent.scrollIntoViewY = function(targetID, doHighlight)
{
	const el = document.getElementById(targetID) || document.getElementsByName(targetID)[0];
	
	if(!el)
		throw new Error("Scroll-into-view target element '" + targetID + "' not found!");

	el.scrollIntoView({ block: 'nearest', inline: 'start' });

	if(window.scrollX != 0)
		window.scroll({ left: 0 });

	if(doHighlight)
	{
		const bg = el.style.backgroundColor;
		if(bg == "yellow") return; //avoid multiple highlight effects

		el.style.transition = 'background-color 0.5s ease-in-out';
		el.style.backgroundColor = 'yellow';
		setTimeout(() => {
				el.style.backgroundColor = bg;
			}, 500);
		setTimeout(() => {
				el.style.backgroundColor = 'yellow';
			}, 1000);
		setTimeout(() => {
				el.style.backgroundColor = bg;
			}, 1500);
	}
} //end scrollIntoViewY()

//=====================================================================================
//DesktopContent.scrollIntoViewX / scrollIntoViewY
// is a function that allows for buttons to not scroll the main
// ots window. To use, wrap your button/link/anchor with a div
// and pass its id to scrollIntoView
DesktopContent.scrollIntoViewX = function (targetID, doHighlight)
{
	const el = document.getElementById(targetID) || document.getElementsByName(targetID)[0];

	if (!el)
	{
		Debug.err("Scroll-into-view target element '" + targetID + "' not found!");
		return;
	}

	el.scrollIntoView({ block: 'nearest', inline: 'start' });

	if (window.scrollY != 0)
		window.scroll({ top: 0 });

	if (doHighlight) 
	{
		const bg = el.style.backgroundColor;
		el.style.transition = 'background-color 0.5s ease-in-out';
		el.style.backgroundColor = 'yellow';
		setTimeout(() => {
				el.style.backgroundColor = bg;
			}, 500);
		setTimeout(() => {
				el.style.backgroundColor = 'yellow';
			}, 1000);
		setTimeout(() => {
				el.style.backgroundColor = bg;
			}, 1500);
	}
} //end scrollIntoViewX()

//=====================================================================================
//DesktopContent.XMLHttpRequest
// forms request properly for ots server, POSTs data
// and when request is returned, returnHandler is called with
// req result on success, if failure (e.g. due to bad url) called with 0 and
// error description in errStr.
//
// For proper request need: urnLid, cookieCode
//
// Handler always receives standard xml response if server is ok:
//  <ROOT>
//      <HEADER><CookieCode value=''/></HEADER>
//      <DATA> ... </DATA>
//  </ROOT>
//
// Where CookieCode and DisplayName can change upon every server response
//
// reqParam is used to give the returnHandler an index to route responses to.
// progressHandler can be given to receive progress updates (e.g. for file uploads)
// callHandlerOnErr can be set to true to have handler called with errStr parameter
//	otherwise, handler will not be called on error.
//
//	Use ignoreSystemBlock if request is expected to meet a down server (like restarting xdaq)
//	Use doNotOfferSequenceChange for requests that might fail based on permissions (like code editor switch to read only).
//
//  Here is an example for handling the error in handler if callHandlerOnErr is set true:
//			function (req, reqParam, errStr) {
//
//				var str = "";
//
//				if(!errStr)
//					errStr = "";
//				var err = DesktopContent.getXMLValue(req,"Error");
//				if(err && err != "")
//					errStr += "\n" + err;
//				if(errStr != "")
//				{
//					str += "Received error... " + getDateString(new Date);
//					str += "<br>";
//					Debug.log("Error while running FE Macro: " + errStr,
//							Debug.HIGH_PRIORITY);
//					el.innerHTML = str;
//					return;
//				}
//				...
//			}
DesktopContent.XMLHttpRequest = function(requestURL, data, returnHandler,
		reqParam, progressHandler, callHandlerOnErr, doNotShowLoadingOverlay,
		targetGatewaySupervisor, ignoreSystemBlock, doNotOfferSequenceChange)
{

	// Sequence is used as an alternative approach to cookieCode (e.g. ots Config Wizard).
	var sequence = DesktopContent._sequence;
	var errStr = "";
	var req;

	var callerLocation = "";
	try
	{
		callerLocation = (new Error).stack.split("\n")[2];
		var tmpCallerLocation = callerLocation.slice(0,callerLocation.indexOf(' ('));
		callerLocation = callerLocation.slice(tmpCallerLocation.length+2,
				callerLocation.length-1);
	}
	catch(e) {} //ignore error



	if((!ignoreSystemBlock && DesktopContent._blockSystemCheckMailbox) //we expect the system to be down during system block
			|| DesktopContent._needToLoginMailbox)
	{
		//check if already marked the mailbox.. and do nothing because we know something is wrong

		errStr = "The system appears to be down.";
		errStr += " (Try reconnecting/reloading the page, or alert ots admins if the problem persists.)";

		if(!callHandlerOnErr)
			Debug.log("Error: " + errStr,Debug.HIGH_PRIORITY);

		req = 0; //force to 0 to indicate error
		var found = false;
		if(DesktopContent._arrayOfFailedHandlers.length < 2) //only give pop up behavior for first 2 failures (then go quiet)
		{
			for(var rh in DesktopContent._arrayOfFailedHandlers)
				if(DesktopContent._arrayOfFailedHandlers[rh] == returnHandler)
				{
					errStr = "Blocking multiple error responses to same handler. \nRecurring error should be handled by returnHandler: " + returnHandler;

					if(!callHandlerOnErr)
						Debug.log(errStr.substr(0,200) + "...",Debug.HIGH_PRIORITY);

					found = true; break;
				}
		}
		else
		{
			errStr = "Quiet Mode. Blocking multiple error responses to ALL handlers. \nRecurring error should be handled by returnHandler:" + returnHandler;
			Debug.log(errStr.substr(0,200) + "...",Debug.HIGH_PRIORITY);
			found = true;
		}

		if(!found && !callHandlerOnErr)
			DesktopContent._arrayOfFailedHandlers.push(returnHandler);

		//only call return handler once
		if(returnHandler && !found && callHandlerOnErr)
			returnHandler(req, reqParam, errStr);
		return;
	}

	req = new XMLHttpRequest();

	if(progressHandler) req.upload.addEventListener("progress", progressHandler, false); //add progress listener if defined

	//set timeout to detect infinite loops or long waits
	var timeoutTimer;
	var timeoutFunction = function()
					{
						Debug.log("It has been 60 seconds.. still waiting for a response. " +
							"Is there an infinite loop occuring at the server? " +
							"Or is this just a really long request..",
							Debug.HIGH_PRIORITY);
						timeoutTimer = window.setTimeout(timeoutFunction, 60000);
					}
	timeoutTimer = window.setTimeout(timeoutFunction, 60000);

	//setup response handler
	req.onreadystatechange = function() {
		//Debug.log(req.readyState + " " + req.status);
		if (req.readyState==4)
		{  //when readyState=4 return complete, status=200 for success, status=400 for fail
			window.clearTimeout(timeoutTimer);

			if(!doNotShowLoadingOverlay)
				DesktopContent.hideLoading();

			if(req.status==200)
			{
				//Debug.log("Request Response Text " + req.responseText + " ---\nXML " + req.responseXML,Debug.LOW_PRIORITY);

				DesktopContent._lastCookieTime = parseInt((new Date()).getTime()); //in ms

				//check if failed due to cookieCode and go to login prompt
				if(req.responseText == Globals.REQ_NO_PERMISSION_RESPONSE)
				{
					var requestType = requestURL.indexOf("RequestType=");
					if(requestType > 0)
						requestType = " '" + requestURL.substr(requestType + ("RequestType=").length) + "'";
					else
						requestType = "";
					errStr = "Request " + requestType + " failed due to insufficient account permissions.";
					if(callHandlerOnErr && callHandlerOnErr < 2)
						Debug.err(errStr);

					if(!doNotOfferSequenceChange && DesktopContent._sequence)
					{
						Debug.log("In wiz mode, attempting to fix access code on the fly...");

						DesktopContent.popUpVerification(
							/*prompt*/ errStr + "<br><br>Please enter a valid access code: ",
							/*func*/
							function(newSequence)
							{
								DesktopContent._sequence = newSequence.trim();
								Debug.log("Resulting sequence code: " + DesktopContent._sequence);

								if(DesktopContent._sequence)
								{
									Debug.log("Retrying request with new access code...");
									DesktopContent.XMLHttpRequest(requestURL, data, returnHandler,
										reqParam, progressHandler, callHandlerOnErr, doNotShowLoadingOverlay,
										targetGatewaySupervisor, ignoreSystemBlock);

									Debug.log("Saving new access code to parent...");

									DesktopContent._theDesktopWindow.postMessage(
										{
										"windowId":		DesktopContent._theWindowId,
										"request":		"updateSequence",
										"sequence":		DesktopContent._sequence,
										}, "*");
									return;
								}

								DesktopContent._sequence = "a"; //set so retry is possible

							}, /*val*/ undefined,
							/*bgColor*/ undefined,
								/*textColor*/ undefined,
								/*borderColor*/ undefined,
								/*getUserInput*/ true,
								/*dialogWidth*/ undefined,
								/*cancelFunc*/ undefined,
								/*yesButtonText*/ "Retry",
								/*noAutoComplete*/ true);

						return;
					}
				}
				else if(req.responseText == Globals.REQ_USER_LOCKOUT_RESPONSE)
				{
					errStr = "Request failed because another user has locked ots. Put your mouse over the lock icon at the top of the dashboard to see who.";
					Debug.err(errStr);
				}
				else if(req.responseText == Globals.REQ_NO_LOGIN_RESPONSE)
				{
					errStr = "Login has expired.";
					Debug.err(errStr);

					if(ignoreSystemBlock || !DesktopContent._blockSystemCheckMailbox) //make sure system is alive
					{
						DesktopContent._needToLoginMailbox = true; //force to login screen on server failure
						if(DesktopContent._theDesktopWindow)
							DesktopContent._theDesktopWindow.postMessage(
									{
								"windowId":			DesktopContent._theWindowId,
								"request":  		"needToLogin"
									},"*");

					}
				}
				else if(req.responseText == Globals.REQ_LOCK_REQUIRED_RESPONSE)
				{
					errStr = "Request failed because the request requires the user to lockout the system. Please take over the lock in the Settings area to proceed.";
					Debug.err(errStr);
				}
				else if(!sequence)
				{
					if(!req.responseXML) //invalid XML received
					{
						errStr = "Request response is invalid XML!";
						Debug.err(errStr);
					}
					else
					{
						//handle cookie code mailbox
						DesktopContent._lastCookieCode = DesktopContent.getXMLValue(req,'CookieCode');
						if (typeof DesktopContent._lastCookieCode == 'undefined')
						{ //clear req, server failed
							errStr = "Request Failed - Missing Cookie in Response.";

							if(ignoreSystemBlock || !DesktopContent._blockSystemCheckMailbox)  //make sure system is alive
							{
								console.log(errStr); //make sure there is some record of this need-to-login!

								DesktopContent._needToLoginMailbox = true; //force to login screen on server failure
								if(DesktopContent._theDesktopWindow)
									DesktopContent._theDesktopWindow.postMessage(
											{
									"windowId":			DesktopContent._theWindowId,
									"request":  		"needToLogin"
											},"*");
							}

						}
						else if(DesktopContent._lastCookieCode != "AllowNoUser")
						{
							//update local cookieCode and post update to desktop
							//Debug.log("Updating cookie code.");

							var deltaTime = DesktopContent._lastCookieTime - DesktopContent._updateTimeMailbox;
							DesktopContent._cookieCodeMailbox = DesktopContent._lastCookieCode;

							if(DesktopContent._theDesktopWindow && deltaTime > 5*1000 /*ms*/)
							{
								//Debug.log("Posting cookie code to desktop.");

								DesktopContent._updateTimeMailbox = DesktopContent._lastCookieTime;
								DesktopContent._theDesktopWindow.postMessage(
										{
									"windowId":			DesktopContent._theWindowId,
									"request":  		"updateCookieCode",
									"cookieCode":		DesktopContent._cookieCodeMailbox,
									"cookieCodeTime":	DesktopContent._updateTimeMailbox
										},"*");
							}

//							//check twice to handle race conditions with other content code
//							if(DesktopContent._updateTimeMailbox && parseInt(DesktopContent._updateTimeMailbox.innerHTML) < DesktopContent._lastCookieTime) //then current code is newer
//							{
//								DesktopContent._updateTimeMailbox.innerHTML = DesktopContent._lastCookieTime;
//								 = ;
//
//								//setTimeout(DesktopContent.checkCookieCodeRace, Math.random()*1000|0+500); //random wait (500-1500ms) before checking if race conditions occured
//							}
						}
					}
				}
			}
			else if(req.status == 0)  //request was interrupted (probably window was closed)
			{
//				Debug.log("Status=0. Likely this means a window was closed, or the server crashed, in the middle of a request. " +
//						"\n(It also could mean 'potential security risk' like a cross-domain request) ",Debug.HIGH_PRIORITY);
				errStr = "Request was interrupted. " +
						"Likely this means the server crashed or connection was lost (or the desktop window making the request was closed; or did your ssh tunnel close?).";
				//return;
			}
			else //bad address response
			{

				errStr = "Request Failed (code: " + req.status +
						") - Bad Address: " + origin + "?urn=" + urn +
						"\n" + requestURL;
				Debug.log(errStr,Debug.HIGH_PRIORITY);

				//handle multiple failed handlers
				var found = false;
				if(DesktopContent._arrayOfFailedHandlers.length < 2) //only give pop up behavior for first 2 failures (then go quiet)
				{
					for(var rh in DesktopContent._arrayOfFailedHandlers)
						if(DesktopContent._arrayOfFailedHandlers[rh] == returnHandler)
						{
							errStr = "Blocking multiple error responses to same handler. \nDoes target exist? Here is the (would be) returnHandler: \n\n" + returnHandler;
							Debug.log(errStr.substr(0,200) + "...",Debug.HIGH_PRIORITY);
							found = true; break;
						}
				}
				else
				{
					errStr = "Quiet Mode. Blocking multiple error responses to ALL handlers. \nDoes target exist? Here is the (would be) returnHandler: \n\n " + returnHandler;
					Debug.log(errStr.substr(0,200) + "...",Debug.HIGH_PRIORITY);
					found = true;
				}
				if(!found) DesktopContent._arrayOfFailedHandlers.push(returnHandler);
				if(found) return; //do not call handler for failed server for user code multiple times..
			}

			//if not calling handler on error, then get and display errors for user
			var errArr = (callHandlerOnErr || !req.responseXML)?[]:DesktopContent.getXMLRequestErrors(req);
			if(errArr.length && !callHandlerOnErr)
			{
				for(var i=0;i<errArr.length;++i)
				{
					errStr += (i?"\n\n":"") + errArr[i];

					console.log("Initial request location: \n" + callerLocation);
					Debug.log("Error: " + errArr[i],
						(ignoreSystemBlock || requestURL.indexOf("TooltipRequest?") >= 0)?
								Debug.LOW_PRIORITY: //do not alert if tooltip (auto request) - problematic when not logged-in and causing unnecessary alerts
								Debug.HIGH_PRIORITY);
				}
			}
			else if(errStr != "")
			{
				errStr += "\n\n(Try refreshing the page and checking connections, or alert ots admins if problem persists.)";

				console.log("Initial request location: \n" + callerLocation);
				Debug.log("Error: " + errStr,
						(callHandlerOnErr ||
								ignoreSystemBlock ||
								requestURL.indexOf("TooltipRequest?") >= 0)?
						Debug.LOW_PRIORITY: //do not alert if tooltip (auto request) - problematic when not logged-in and causing unnecessary alerts
						Debug.HIGH_PRIORITY);
				//alert(errStr);
				req = 0; //force to 0 to indicate error
			}

			//success, call return handler
			if(returnHandler && (errStr=="" || callHandlerOnErr))
			{
				returnHandler(req, reqParam, errStr);

				//RAR commented out.. not sure if it is working as intended (weird desktop behavior is occurring during disconnects)
				//				if(errStr=="" && DesktopContent._arrayOfFailedHandlers.length)
				//				{
				//					//since we had success, search through failed handler and remove if there
				//					for(var i = 0; i<DesktopContent._arrayOfFailedHandlers.length; ++i)
				//						if(DesktopContent._arrayOfFailedHandlers[i] == returnHandler)
				//						{
				//							DesktopContent._arrayOfFailedHandlers.splice(i,1); //remove that handler
				//							break;
				//						}
				//				}
			}

		}
	}

	var reqData;
	if(!sequence)
	{
		//if(!DesktopContent._cookieCodeMailbox) //attempt to fix (e.g. for Desktop)
		//	DesktopContent._cookieCodeMailbox = document.getElementById("DesktopContent-cookieCodeMailbox");
		var cc = DesktopContent._cookieCodeMailbox;//DesktopContent._cookieCodeMailbox?DesktopContent._cookieCodeMailbox.innerHTML:""; //get cookie code from mailbox if available
		reqData = "RequestOrigin=" + DesktopContent._serverOrigin + 
			"&CookieCode="+cc+((data=="" || data===undefined)?"":("&"+data));
	}
	else //wiz mode
	{
		reqData = "sequence="+sequence+((data=="" || data===undefined)?"":("&"+data));
	}


	var urn = DesktopContent._localUrnLid;
	var origin = DesktopContent._localOrigin;

	if(!urn || targetGatewaySupervisor) //desktop supervisor, instead of local application
	{
		urn = DesktopContent._serverUrnLid;
		origin = DesktopContent._serverOrigin;
	}


	if(!doNotShowLoadingOverlay)
		DesktopContent.showLoading();


	var reqURL = origin+"/urn:xdaq-application:lid="+urn+"/"+requestURL;
	//Debug.log("Post " + reqURL + "\n\tData: " + reqData);
	req.open("POST", reqURL,true);
	req.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
	req.send(reqData);
} // end XMLHttpRequest()
//
////check cookie code race conditions
//DesktopContent.checkCookieCodeRace = function() {
//	//Debug.log("Checking cookie race conditions");
//	if(parseInt(DesktopContent._updateTimeMailbox.innerHTML) < DesktopContent._lastCookieTime) //then current code is newer
//	{
//		Debug.log("Cookie race occured!");
//
//		DesktopContent._updateTimeMailbox.innerHTML = DesktopContent._lastCookieTime;
//		DesktopContent._cookieCodeMailbox.innerHTML = DesktopContent._lastCookieCode;
//	}
//}

//=====================================================================================
//returns an array of error strings from xml request response
DesktopContent.getXMLRequestErrors = function(req) {
	//make sure to give an error if the response is bad
	if(!req || !req.responseXML)
		return ["Unknown error occured " +
				"(XML response may have been illegal)!"];

	var errNodes = DesktopContent.getXMLChildren(req,"Error");
	var errArr = [];
	for(var i=0;i<errNodes.length;++i)
		errArr.push(errNodes[i].getAttribute("value"));
	return errArr;
} //end getXMLRequestErrors()

//=====================================================================================
//returns xml entry value for an attribute
DesktopContent.getXMLAttributeValue = function(req, name, attribute) {
	var el;
	if(el = DesktopContent.getXMLNode(req,name))
		return el.getAttribute(attribute);
	else if(name == "Error" && //make sure Error gives an error if the response is bad
			(!req || !req.responseXML))
		return "Unknown error occured " +
				"(XML response may have been illegal)!";
	else
		return undefined;
} // end getXMLAttributeValue()

//=====================================================================================
//returns xml entry value for attribue 'value'
//	if !name assume req is xml node already
DesktopContent.getXMLValue = function(req, name) {
	if(!req) return undefined;

	if(!name)
		return req.getAttribute("value");

	return DesktopContent.getXMLAttributeValue(req,name,"value");
} //end getXMLValue()

//=====================================================================================
//returns array of xml children nodes
//	with tags that match nodeName
DesktopContent.getXMLChildren = function(req, nodeName) {

	if(req && req.responseXML) //to allow for arbitrary starting xml node
		req = req.responseXML;
	return req.getElementsByTagName(nodeName);
} //end getXMLChildren()

//=====================================================================================
//returns xml entry node (first node with name)
//	Note: could be any depth (not just depth 1)
//	...uses getElementsByTagName(name)
DesktopContent.getXMLNode = function(req, name) {
	var els;
	if(req && req.responseXML) //to allow for arbitrary starting xml node
		req = req.responseXML;
	if(req)
	{
		//find DATA
		var i;
		try
		{
			els = req.getElementsByTagName(name);//req.responseXML.childNodes[0].childNodes;
		}
		catch(e) {return undefined;}

		if(els.length)
			return els[0];
		//reverted to former way

		//for depth 1 sometime?
		//		for(var i=0;i<els.length;++i)
		//			if(els[i].nodeName == "DATA")
		//			{
		//				els = req.responseXML.childNodes[0].childNodes[i].childNodes;
		//
		//				for(i=0;i<els.length;++i)
		//					if(els[i].nodeName == name)
		//						return els[i];
		//				break;
		//			}
	}

	return undefined;
}

//=====================================================================================
//returns xml entry node (first node with name DATA)
DesktopContent.getXMLDataNode = function(req, name) {
	return DesktopContent.getXMLNode("DATA");
}

//=====================================================================================
//tooltipConditionString ~~
//	use to modify tooltip string with special keywords like INDENT and TAB
DesktopContent.tooltipConditionString = function(str) {
	return str.replace(/<INDENT>/g,
			"<div style='margin-left:60px;'>").replace(/<\/INDENT>/g,
					"</div>").replace(/<TAB>/g,
							"<div style='margin-left:60px;'>").replace(/<\/TAB>/g,
									"</div>").replace(/\n/g,
										"<br>");
} //end tooltipConditionString()

//=====================================================================================
//tooltip ~~
//	use uid to determine if tip should still be displayed
//		- ask server about user/file/function/id combo
//		- if shouldShow:
//			then show
//			add checkbox to never show again
// id of "ALWAYS".. disables never show handling (no checkboxes)
//
DesktopContent.tooltip = function(id,tip,alwaysShow) {

	if(typeof Desktop !== 'undefined') //This call is from Desktop page.. so can use the urnLid_ & serverOrigin_
	{
		DesktopContent._serverUrnLid = urnLid_;
		DesktopContent._serverOrigin = serverOrigin_;

		DesktopContent._sequence = DesktopContent.getDesktopParameter(0,"code");
		if(!DesktopContent._sequence || DesktopContent._sequence == "")
			DesktopContent._sequence = 0; //normal desktop mode
		else
			Debug.log("In Wizard Mode with Sequence=" + DesktopContent._sequence);
	}


	var srcStackString,srcFunc,srcFile;

	if(Debug.BROWSER_TYPE == 1) //chrome
	{
		srcStackString = (new Error).stack.split("\n")[2];
		srcFunc = srcStackString.trim().split(' ')[1];
	}
	else if(Debug.BROWSER_TYPE == 2) //firefox
	{
		srcStackString = (new Error).stack.split("\n")[1];
		srcFunc = srcStackString.trim().split('@')[0];
	}

	srcFile = srcStackString.substr(srcStackString.lastIndexOf('/')+1);
	if(srcFile.indexOf('?') >= 0)
		srcFile = srcFile.substr(0,srcFile.indexOf('?'));
	if(srcFile.indexOf(':') >= 0)
		srcFile.substr(0,srcFile.indexOf(':'));


	if(tip === undefined)
	{
		Debug.log("Undefined tooltip string at " + srcStackString + "\n" +
				srcFunc + "\n" + srcFile +".\n\n Tooltip Usage: <id> <tip>", Debug.HIGH_PRIORITY);
		return;
	}


	var oldId = id;
	//remove all special characters from ID
	id = "";
	for(var i=0;i<oldId.length;++i)
		if((oldId[i] >= 'a' && oldId[i] <= 'z') ||
				(oldId[i] >= 'A' && oldId[i] <= 'Z') ||
				(oldId[i] >= '0' && oldId[i] <= '9'))
			id += oldId[i];


	if(alwaysShow || id == "ALWAYS") //no need to check
		localFinishTooltip();
	else
		DesktopContent.XMLHttpRequest(
			"TooltipRequest?RequestType=check" +
			"&srcFunc=" + srcFunc +
			"&srcFile=" + srcFile +
			"&srcId=" + id
			,"" //post data
			,localFinishTooltip //handler
			,0,0,0,true,true); //show loading, and target supervisor


	return;

	//:::::::::::::::::::::::::::::::::::::::::
	//popupResize ~~
	function localFinishTooltip(req)
	{

		var showTooltip = !req ||
				DesktopContent.getXMLValue(req,"ShowTooltip");

		//Debug.log("showTooltip: " + showTooltip);

		if(showTooltip|0)
		{
			var str = "";

			//add checkbox
			if(id != "ALWAYS")
			{
				str += "<input type='checkbox' " +
						"id='DesktopContent-tooltip-DisableALL-above-" +
						id + "' " +
						"onclick='" +
						"DesktopContent.tooltipSetAlwaysShow(\"" +
						"ALL" + "\",\"" +
						"ALL" + "\",\"" +
						"ALL" + "\", this.checked);" + "'>";
				str += " ";
				str += "<a onclick='" +
						"var el = document.getElementById(\"" +
						"DesktopContent-tooltip-DisableALL-above-" +
						id + "\");" +
						"el.checked = !el.checked;" +
						"DesktopContent.tooltipSetAlwaysShow(\"" +
						"ALL" + "\",\"" +
						"ALL" + "\",\"" +
						"ALL" + "\", el.checked);" +
						"'>";
				str += "Disable ALL your Tooltips, or...";
				str += "</a>";
				str +="</input> ";

				str += "<input type='checkbox' " +
						"id='DesktopContent-tooltip-SetNeverShowCheckbox-above-" +
						id + "' " +
						"onclick='" +
						"DesktopContent.tooltipSetAlwaysShow(\"" +
						srcFunc + "\",\"" +
						srcFile + "\",\"" +
						id + "\", this.checked);" + "'>";
				str += " ";
				str += "<a onclick='" +
						"var el = document.getElementById(\"" +
						"DesktopContent-tooltip-SetNeverShowCheckbox-above-" +
						id + "\");" +
						"el.checked = !el.checked;" +
						"DesktopContent.tooltipSetAlwaysShow(\"" +
						srcFunc + "\",\"" +
						srcFile + "\",\"" +
						id + "\", el.checked);" +
						"'>";
				str += "Never show the Tooltip below, or...";
				str += "</a>";
				str +="</input>";

				//snooze button
				str += "<br>"
				str += "<input type='checkbox' " +
						"id='DesktopContent-tooltip-SetNeverShowCheckbox-hour-" +
						id + "' " +
						"onclick='" +
						"DesktopContent.tooltipSetAlwaysShow(\"" +
						srcFunc + "\",\"" +
						srcFile + "\",\"" +
						id + "\", 0 /*neverShow*/, this.checked);" + "'>";
				str += " ";
				str += "<a onclick='" +
						"var el = document.getElementById(\"" +
						"DesktopContent-tooltip-SetNeverShowCheckbox-hour-" +
						id + "\");" +
						"el.checked = !el.checked;" +
						"DesktopContent.tooltipSetAlwaysShow(\"" +
						srcFunc + "\",\"" +
						srcFile + "\",\"" +
						id + "\", 0 /*neverShow*/, el.checked);" +
						"'>";
				str += "Silence this Tooltip for a week (can reset in Settings):";
				str += "</a>";
				str +="</input>";
			}

			//add title
			if(id != "ALWAYS")
			{
				str += "<br><br>";
				str += "<center><b>'" + oldId + "' Tooltip</b></center><br>";
			}
			else
				str += "<br><br>";

			str += DesktopContent.tooltipConditionString(tip);

			str += "<br><br>";

			//add checkbox
			if(id != "ALWAYS")
			{
				str += "<input type='checkbox' " +
						"id='DesktopContent-tooltip-SetNeverShowCheckbox-below-" +
						id + "' " +
						"onclick='" +
						"DesktopContent.tooltipSetAlwaysShow(\"" +
						srcFunc + "\",\"" +
						srcFile + "\",\"" +
						id + "\", this.checked);" + "'>";
				str += " ";
				str += "<a onclick='" +
						"var el = document.getElementById(\"" +
						"DesktopContent-tooltip-SetNeverShowCheckbox-below-" +
						id + "\");" +
						"el.checked = !el.checked;" +
						"DesktopContent.tooltipSetAlwaysShow(\"" +
						srcFunc + "\",\"" +
						srcFile + "\",\"" +
						id + "\", el.checked);" +
						"'>";
				str += "Never show the Tooltip above.";
				str += "</a>";
				str +="</input>";
			}

			Debug.log("srcStackString " + srcStackString);
			Debug.log(str,Debug.TIP_PRIORITY);
		}

	} //end localFinishTooltip()

} //end tooltip()

//=====================================================================================
DesktopContent.setWindowTooltip = function(tip)
{
	var windowTooltipElement = document.createElement("div");
	windowTooltipElement.setAttribute("id", "otsDesktopWindowTooltipElement");
	windowTooltipElement.setAttribute("style", "display:none");

	windowTooltipElement.innerText = encodeURIComponent(tip);
	document.body.appendChild(windowTooltipElement);
} //end setWindowTooltip()

//=====================================================================================
//setSecurityOne
//       make server request to enable random security sequence for URL
DesktopContent.setSecurityOn = function(on) 
{
		console.log("Reached");
	DesktopContent.XMLHttpRequest(
			"ToggleSecurityCodeGeneration?RequestType=TurnGenerationOn" +
			"&srcFunc=0"
			,""
			,DesktopContent.toggleSecurityCodeGenerationHandler
			,0,0,0,true,true);
} //end setSecurityOn()

//=====================================================================================
//toggleSecurityCodeGenerationHandler ~~
DesktopContent.toggleSecurityCodeGenerationHandler = function(req) 
{
	var status = DesktopContent.getXMLValue(req,"Status");
	Debug.log("Status: " + status);
	if (status == "Generation_Success") {
		Debug.log("Successfully switched to using authentication sequence!");
		Debug.closeErrorPop();
		Debug.log("If you wish to return to the default security generation, you can use the 'Reset User Information' in the " +
				"'Edit User Data' app.");
		Debug.log("Plase refer to the console for the new link!", Debug.INFO_PRIORITY);
	}
} //end toggleSecurityCodeGenerationHandler()

//=====================================================================================
//tooltipSetNeverShow ~~
//	set value of never show for target tip to 1/0 based on alwaysShow
DesktopContent.tooltipSetAlwaysShow = function(srcFunc,srcFile,id,neverShow,temporarySilence) {
	Debug.log("neverShow = " + neverShow + " tempSilence = " + temporarySilence);

	if(temporarySilence)
		neverShow = false; //force temporary to have priority
	DesktopContent.XMLHttpRequest(
			"TooltipRequest?RequestType=setNeverShow" +
			"&srcFunc=" + srcFunc +
			"&srcFile=" + srcFile +
			"&srcId=" + id +
			"&doNeverShow=" + (neverShow?1:0) +
			"&temporarySilence=" + (temporarySilence?1:0)
			,""
			,0,0,0,0,true,true); //show loading, and target supervisor

	if(temporarySilence) return;
	if(srcFunc == "ALL" && srcFile == "ALL" && id == "ALL") return;

	//make sure all checkboxes mirror choice
	document.getElementById("DesktopContent-tooltip-SetNeverShowCheckbox-below-" +
			id).checked = neverShow;
	document.getElementById("DesktopContent-tooltip-SetNeverShowCheckbox-above-" +
			id).checked = neverShow;
} //end DesktopContent.tooltipSetAlwaysShow

//=====================================================================================
//popUpVerification ~~
//	Asks user if sure with custom prompt.
//	Will replace REPLACE in prompt with value passed as replaceVal (e.g. pass document.getElementById("myElementId").value).
//	Calls continueFunc (if exists) when user selects "Yes."
//
//	Use justDisplayAndTimeoutPopup to show a temporary popup with no user input.
//
//	Can change background color and text color with strings bgColor and textColor (e.g. "rgb(255,0,0)" or "red")
//		Default is yellow bg with black text if nothing passed.
DesktopContent.popUpVerificationTimeout = 0;
DesktopContent.popUpVerification = function(prompt, continueFunc, replaceVal, bgColor,
		textColor, borderColor, getUserInput, dialogWidth, cancelFunc,
		yesButtonText, noAutoComplete, defaultUserInputValue,
		cancelButtonText, wantMultilineInput, justDisplayAndTimeoutPopup, zIndex) {

	//	Debug.log("X: " + DesktopContent._mouseOverXmailbox.innerHTML +
	//			" Y: " + DesktopContent._mouseOverYmailbox.innerHTML +
	//			" W: " + DesktopContent.getWindowWidth() +
	//			" H: " + DesktopContent.getWindowHeight());


	//remove pop up if already exist
	if(DesktopContent._verifyPopUp)
	{
		DesktopContent._verifyPopUp.parentNode.removeChild(DesktopContent._verifyPopUp);
		DesktopContent._verifyPopUp = 0;
	}

	//replace REPLACE with replaceVal
	if(replaceVal != undefined)
		prompt = prompt.replace(/REPLACE/g, replaceVal);


	//if only timeout and close, setup timeout
	if(justDisplayAndTimeoutPopup)
	{
		if(DesktopContent.popUpVerificationTimeout)
			window.clearTimeout(DesktopContent.popUpVerificationTimeout)
		DesktopContent.popUpVerificationTimeout = window.setTimeout(
			function()
			{
				Debug.log("Timeout close of DesktopContent.popUpVerification");
				if(DesktopContent._verifyPopUp)
				{
					DesktopContent._verifyPopUp.parentNode.removeChild(DesktopContent._verifyPopUp);
					DesktopContent._verifyPopUp = 0;
				}
			},1000); //in 1 sec;
	}


	//create popup and add to body



	//setup style first
	if(!bgColor) bgColor = "rgb(255,241,189)";	//set default
	if(!textColor) textColor = "black";	//set default
	if(!borderColor) borderColor = "black";
	if(!dialogWidth) dialogWidth = 200;

	var css = "";
	//pop up div style
	//note: z-index of 2000 is above config gui treeview
	css += "#" + DesktopContent._verifyPopUpId + " " +
			"{position: absolute; z-index: 10000; border-radius: 5px; padding: 10px;" +
			"background-color: " + bgColor + "; border: 2px solid " + borderColor + ";" +
			"color: " + textColor + ";text-align: center; overflow: auto;" +
			"}\n\n";
	//pop up text style
	css += "#" + DesktopContent._verifyPopUpId + "-text " +
			"{" +
			"color: " + textColor + ";width: " + dialogWidth + "px; " +
			(!justDisplayAndTimeoutPopup?"padding-bottom: 10px;":"") +
			"}\n\n";
	//..and anything in the text div
	css += "#" + DesktopContent._verifyPopUpId + " *" +
			"{" +
			"color: " + textColor + ";" +
			"}\n\n";
	css += "#" + DesktopContent._verifyPopUpId + " input" +
			"{" +
			"cursor: pointer;" +
			"}\n\n";

	//add style element to HEAD tag
	var style = document.createElement('style');

	if (style.styleSheet) {
		style.styleSheet.cssText = css;
	} else {
		style.appendChild(document.createTextNode(css));
	}

	document.getElementsByTagName('head')[0].appendChild(style);


	var body = document.getElementsByTagName("BODY")[0];

	var el = document.createElement("div");
	el.setAttribute("id", DesktopContent._verifyPopUpId);
	el.onmouseup = function(e) {e.stopPropagation();};
	el.onmousedown = function(e) {e.stopPropagation();};
	el.onmouseover = function(e) {e.stopPropagation();};

	var userInputStr = "";
	if(getUserInput)
	{
		userInputStr +=
				(wantMultilineInput?"<textarea style='width: 95%; margin-top:5px; height:110px;'":
					"<input ") +
				"type='text' id='DesktopContent_popUpUserInput' " +
				"onclick='event.stopPropagation();'" +
				(noAutoComplete?"autocomplete='off' ":"") +
				" value='" +
				(wantMultilineInput?"":(defaultUserInputValue!==undefined?defaultUserInputValue:"")) +
				"' " +
				">" +
				(wantMultilineInput?(
					(defaultUserInputValue!==undefined?defaultUserInputValue:"") + "</textarea>"
					):"</input>")
				;
	}

	var str = "<div id='" + DesktopContent._verifyPopUpId + "-text'>" +
			prompt + (!justDisplayAndTimeoutPopup?("<br>" + userInputStr):"") +
			"</div>";

	if(!justDisplayAndTimeoutPopup)
		str +=
			"<input class='DesktopContent_popUpUserInputButton' type='submit' value='" +
			(yesButtonText?yesButtonText:"Yes") +
			"' " +
			"onclick='event.stopPropagation();' " +
			"> " + //onmouseup added below so continueFunc can be a function object (and not a string)
			"&nbsp;&nbsp;&nbsp;" +
			"<input class='DesktopContent_popUpUserInputButton' type='submit' " +
			"onclick='event.stopPropagation();' " +
			"value='" + (cancelButtonText?cancelButtonText:"Cancel") + "'>";
	el.innerHTML = str;

	if(!justDisplayAndTimeoutPopup)
	{
		//onmouseup for "Yes" button
		el.getElementsByClassName('DesktopContent_popUpUserInputButton')[0].onmouseup =
				function(event){event.stopPropagation(); DesktopContent.clearPopUpVerification(continueFunc);};
		//onmouseup for "Cancel" button
		el.getElementsByClassName('DesktopContent_popUpUserInputButton')[1].onmouseup =
				function(event){event.stopPropagation(); DesktopContent.clearPopUpVerification(cancelFunc);};
	}

	Debug.log(prompt);
	DesktopContent._verifyPopUp = el;
	el.style.left = "-1000px"; //set off page so actual dimensions can be determined, and then div relocated
	body.appendChild(el);

	//add key handler to body too for enter & esc
	if(!justDisplayAndTimeoutPopup)
		el.onkeydown =
			function(event)
			{
		if(event.key == "Enter") // ENTER
		{
			Debug.log("Accepting enter key");
			event.preventDefault();
			event.stopPropagation();
			DesktopContent.clearPopUpVerification(continueFunc);
		}
		else if(event.key == "Escape") // ESC
		{
			Debug.log("Accepting escape key");
			event.preventDefault();
			event.stopPropagation();
			DesktopContent.clearPopUpVerification(cancelFunc);
		}
			}; //end keydown handler

	//determine position
	var w = el.offsetWidth;
	var h = el.offsetHeight;
	var x = DesktopContent.getMouseX();
	var y = DesktopContent.getMouseY();
	x -= w/2; //center on x, but try to avoid having mouse lineup with buttons to avoid accidental double click by user

	if(typeof Desktop !== 'undefined') //This call is from Desktop page.. so do not trust x and y
	{
		//center of page
		x = DesktopContent.getWindowWidth()/2 - w/2;
		y = DesktopContent.getWindowHeight()/2 - h/2;
	}
	else
	{
		while(x+w > DesktopContent.getWindowWidth())
			x -= w;
		if(y > DesktopContent.getWindowHeight()/2 + h/2)
			y -= h; //move to top half of screen
		while(y+h > DesktopContent.getWindowHeight())
			y -= h;

		if(x <= 0) x = 10;
		if(y <= 0) y = 10;
	}

	Debug.log("X: " + x +
			" Y: " + y +
			" W: " + w +
			" H: " + h);
	
	el.style.left = (DesktopContent.getWindowScrollLeft() + x) + "px";
	el.style.top = (DesktopContent.getWindowScrollTop() + y) + "px";
	if(zIndex) el.style.zIndex = zIndex;

	//control cursor and key input focus (after el position is set!)
	if(getUserInput) //place cursor
	{
		var tel = document.getElementById('DesktopContent_popUpUserInput');
		tel.focus();
		tel.setSelectionRange(0,tel.value.length);

		//accept enter to close if not multiline input
		if(!wantMultilineInput)
		{
			tel.onkeydown =
					function(event)
					{
				if(event.key == "Enter") // ENTER
				{
					Debug.log("Accepting enter key");
					event.preventDefault();
					event.stopPropagation();
					DesktopContent.clearPopUpVerification(continueFunc);
				}
				else if(event.key == "Escape") // ESC
				{
					Debug.log("Accepting escape key");
					event.preventDefault();
					event.stopPropagation();
					DesktopContent.clearPopUpVerification(cancelFunc);
				}
					}; //end keydown handler
		}
		else //allow newlinie behavior for multiline input
		{
			tel.onkeydown =
					function(event)
					{
				if(event.key == "Enter") // ENTER
				{
					Debug.log("Accepting enter key");
					// event.preventDefault();
					event.stopPropagation();
				}
					};
		}

	}
	else if(!justDisplayAndTimeoutPopup) //focus on button, since no text
		el.getElementsByClassName('DesktopContent_popUpUserInputButton')[0].focus();

} //end popUpVerification()
//=====================================================================================
//clearPopUpVerification ~~
//	call func after clearing, if exists
DesktopContent.clearPopUpVerification = function(func) {

	//get parameter value if exists

	var userEl = document.getElementById("DesktopContent_popUpUserInput");
	var param = userEl?userEl.value:undefined;

	//remove pop up if already exist
	if(DesktopContent._verifyPopUp) DesktopContent._verifyPopUp.parentNode.removeChild(DesktopContent._verifyPopUp);
	DesktopContent._verifyPopUp = 0;

	if(func)
		func(param); //return user input value if present
} //end clearPopUpVerification()


//=====================================================================================
//setPopUpPosition ~~
//	centers element based on width and height constraint
//
//	Note: assumes a padding and border size if not specified
//  Note: if w,h not specified then fills screen (minus margin)
//	Note: offsetUp and can be used to position the popup vertically (for example if the dialog is expected to grow, then give positive offsetUp to compensate)
//
// 	Note: the input element el will need local styling, e.g.:
//		#popUpDialog * {
//			color: black;
//		}
//		#popUpDialog a {
//			color: rgb(44, 44, 187);
//			font-size: 13px;
//		}
DesktopContent.setPopUpPosition = function(el,w,h,padding,border,
		margin,doNotResize,offsetUp) {

	Debug.log("DesktopContent.setPopUpPosition");

	if(padding === undefined) padding = 10;
	if(border === undefined) border = 1;
	if(margin === undefined) margin = 0;

	var x,y;

	//:::::::::::::::::::::::::::::::::::::::::
	//popupResize ~~
	//	set position and size
	DesktopContent.setPopUpPosition.stopPropagation = function(event) {
		//Debug.log("DesktopContent.setPopUpPosition stop propagation");
		event.stopPropagation();
	}

	//:::::::::::::::::::::::::::::::::::::::::
	//popupResize ~~
	//	set position and size
	DesktopContent.setPopUpPosition.popupResize = function() {

		try //check if element still exists
		{
			if(!el) //if element no longer exists.. then remove listener and exit
			{
				window.removeEventListener("resize",DesktopContent.setPopUpPosition.popupResize);
				window.removeEventListener("scroll",DesktopContent.setPopUpPosition.popupResize);
				return;
			}
		}
		catch(err) {return;} //do nothing on errors

		//else resize el
		//Debug.log("DesktopContent.setPopUpPosition.popupResize");


		var ww = DesktopContent.getWindowWidth()-(padding+border)*2;
		var wh = DesktopContent.getWindowHeight()-(padding+border)*2;

		//ww & wh are max window size at this point

		var ah = el.offsetHeight;//actual height, in case of adjustments

		if(w === undefined || h === undefined)
		{
			w = ww - (margin)*2;
			h = wh - (margin)*2;
		}
		//else w,h are inputs and margin is ignored

		x = (DesktopContent.getWindowScrollLeft() + ((ww-w)/2));
		y = (DesktopContent.getWindowScrollTop() + ((wh-h)/2)) - (offsetUp|0) - 100; //bias up (looks nicer)

		if(y < DesktopContent.getWindowScrollTop() +
				margin + padding)
			y = DesktopContent.getWindowScrollTop() + margin +
				padding; //don't let it bottom out though

		//if dialog is smaller than window, allow scrolling to see the whole thing
		if(w > ww-margin-padding)
			x = -DesktopContent.getWindowScrollLeft();
		if(ah > wh-margin-padding)
			y = -DesktopContent.getWindowScrollTop();

		el.style.left = x + "px";
		el.style.top = y + "px";
	};
	DesktopContent.setPopUpPosition.popupResize();

	//window width and height are not manipulated on resize, only setup once
	el.style.width = w + "px";
	el.style.height = h + "px";


	//#popUpDialog {
	//	position: absolute;
	//	z-index: 10000;
	//	border: 1px solid #770000;
	//	background-color: #efeaea;
	//	text-align: center;
	//	padding: 10px;
	//	color: black;
	//}
	el.style.position = "absolute";
	el.style.zIndex = "10000";
	el.style.border = "1px solid #770000";
	el.style.backgroundColor = "#efeaea";
	el.style.textAlign = "center";
	el.style.padding = "10px";
	el.style.color = "black";

	if(!doNotResize)
	{
		window.addEventListener("resize",DesktopContent.setPopUpPosition.popupResize);
		window.addEventListener("scroll",DesktopContent.setPopUpPosition.popupResize);
	}
	el.addEventListener("keydown",DesktopContent.setPopUpPosition.stopPropagation);
	el.addEventListener("mousemove",DesktopContent.setPopUpPosition.stopPropagation);
	el.addEventListener("mousemove",DesktopContent.mouseMove);

	el.style.overflow = "auto";

	return {"w" : w, "h" : h, "x" : x, "y" : y};

} //end setPopUpPosition()

//=====================================================================================
//parseColor ~~
DesktopContent.parseColor = function(colorStr)
{
	//used to ignore the alpha in the color when returning to user

	//in general need to create an element.. but since all the color strings are rgb or rgba from settings, can simplify
	var m = colorStr.split("(")[1].split(")")[0].split(",");
	if( m) return "rgb("+m[0]+","+m[1]+","+m[2]+")";
	else throw new Error("Color "+colorStr+" could not be parsed.");
} //end parseColor()

//=====================================================================================
//getColorAsRGBA ~~
//	http://stackoverflow.com/questions/11068240/what-is-the-most-efficient-way-to-parse-a-css-color-in-javascript
// 	except the solution is broken.. unless you add element to page
DesktopContent.getColorAsRGBA = function(colorStr)
{

	//in general need to create an element..
	var div = document.createElement('div');
	var m;

	div.style.color = colorStr;
	div.style.display = "none";
	document.body.appendChild(div);

	m = getComputedStyle(div).color.split("(")[1].split(")")[0].split(",");

	document.body.removeChild(div);

	if(m && m.length == 3) return "rgba("+m[0]+","+m[1]+","+m[2]+",255)";
	else if(m && m.length == 4) return "rgba("+m[0]+","+m[1]+","+m[2]+","+m[3]+")";
	else throw new Error("Color "+colorStr+" could not be parsed.");
} //end getColorAsRGBA()

//=====================================================================================
//get window and mouse info ~~
DesktopContent.getWindowWidth = function() { return document.documentElement.clientWidth - 1; } //clientWidth excludes the scroll bards... window.innerWidth-1; } //-1 to avoid weird rounding effects by browser that cause scroll bars
DesktopContent.getWindowHeight = function() { return document.documentElement.clientHeight - 1; } //clientHeight excludes the scroll bards... window.innerHeight-1; } //-1 to avoid weird rounding effects by browser that cause scroll bars
DesktopContent.getBodyWidth = function() { return document.body.offsetWidth; }
DesktopContent.getBodyHeight = function() { return document.body.offsetHeight; }
DesktopContent.getWindowScrollLeft = function() { return document.documentElement.scrollLeft || document.body.scrollLeft || 0; }
DesktopContent.getWindowScrollTop = function() { return document.documentElement.scrollTop || document.body.scrollTop || 0; }
DesktopContent.setWindowScrollTop = function(scrollTop)
{
	if(document.documentElement.scrollTop === undefined)
		document.body.scrollTop = scrollTop;
	else
		document.documentElement.scrollTop = scrollTop;
} //end setWindowScrollTop()
DesktopContent.getMouseX = function() { return DesktopContent._windowMouseX | 0; } //force to int
DesktopContent.getMouseY = function() { return DesktopContent._windowMouseY | 0; } //force to int
DesktopContent.getDefaultWindowColor = function() {
	//return the alpha mix of window color and desktop color
	if(!DesktopContent._windowColorPostbox || !DesktopContent._desktopColor)
	{
		//likely in wizard mode
		Debug.log("Color post boxes not setup! So giving default.",Debug.MED_PRIORITY);
		return "rgb(178,210,240)";
	}

	wrgba = DesktopContent._windowColorPostbox.split("(")[1].split(")")[0].split(",");
	drgb = DesktopContent._desktopColor.split("(")[1].split(")")[0].split(",");
	for(var i in drgb)
		drgb[i] = (drgb[i]*(1-wrgba[3]) + wrgba[i]*wrgba[3])|0; //floor of blend
	return "rgb("+drgb[0]+","+drgb[1]+","+drgb[2]+")";
} //end getDefaultWindowColor()

//=====================================================================================
//get color scheme ~~
DesktopContent.getDefaultDashboardColor = function() {
	if(!DesktopContent._dashboardColorPostbox)
	{
		//likely in wizard mode
		Debug.log("Color post boxes not setup! So giving default.",Debug.MED_PRIORITY);
		return "rgb(0,40,85)";
	}
	Debug.log("Returning dashboard color");
	return DesktopContent.parseColor(DesktopContent._dashboardColorPostbox);
	//DesktopContent.parseColor(DesktopContent._dashboardColorPostbox.innerHTML); }
} //end getDefaultDashboardColor()
DesktopContent.getDefaultDesktopColor = function() {
	if(!DesktopContent._desktopColor)
	{
		//likely in wizard mode
		Debug.log("Color post boxes not setup! So giving default.",Debug.MED_PRIORITY);
		return "rgb(15,34,105)";
	}
	Debug.log("Returning desktop color");
	return DesktopContent._desktopColor;
} //end getDefaultDesktopColor()
DesktopContent.getInvertedColor = function(hexOrRGB) {
	var rgb = [];
	if(hexOrRGB.indexOf("#") == 0)
	{
		rgb = [
			parseInt(hex.substring(1, 3), 16),
			parseInt(hex.substring(3, 5), 16),
			parseInt(hex.substring(5, 7), 16),
		];
	}
	else if(hexOrRGB.indexOf("rgb(") == 0)
	{
		rgb = hexOrRGB.split("(")[1].split(")")[0].split(",");
	}
	else
		throw("Illegal hexOrRGB value to DesktopContent.getInvertedColor");

	return "rgb(" + ((255-parseInt(rgb[0]))%256) +
		"," + ((255-parseInt(rgb[1]))%256) +
		"," + ((255-parseInt(rgb[2]))%256) + ")";
} //end getDefaultDesktopColor()

//=====================================================================================
//getUsername ~~
DesktopContent.getUsername = function() {

	Debug.log("DesktopContent._userDisplayName: " + DesktopContent._userDisplayName);
	return DesktopContent._userDisplayName;
	//KEEP two historical solutions (oldest violates CORS, other requires async request handling):
	// DesktopContent.XMLHttpRequest(
	// 	"Request?RequestType=GetUserDisplayName",
	// 	"",
	// 	function(req)
	// 	{
	// 		console.log(req);

	// 	});
	// var dispName = DesktopContent._theWindow.parent.document.getElementById("DesktopDashboard-user-displayName").innerHTML
	// return dispName.substr(dispName.indexOf(",")+2);
} //end getUsername()


//=====================================================================================
//openNewWindow ~~
//	first wait for mailbox to be clear
//	then take mailbox
DesktopContent.openNewWindow = function(name,subname,windowPath,unique,completeHandler) {

	Debug.log("DesktopContent.openNewWindow= " + windowPath);
	Debug.log("name= " + name);
	Debug.log("subname= " + subname);
	Debug.log("unique= " + unique);

	//if window path is relative to local gateway, then be explict for cases that top level gateway differs
	if(windowPath[0] == '/' &&
		DesktopContent._topServerUrnLid &&
		DesktopContent._topServerOrigin != DesktopContent._serverOrigin)
	{
		Debug.log("Adding local server detail to relative url in window path",windowPath);
		windowPath = DesktopContent._serverOrigin + windowPath;
		Debug.log("Modified window path url",windowPath);
	}

	//propagate remote gateway info (if not already defined)!
	if(DesktopContent._remoteServerUrnLid &&
		windowPath.indexOf("remoteServerUrnLid") < 0)
	{
		Debug.log("Adding Remote Gateway info to window path",windowPath);

		//determine if need & or ?
		var qi = windowPath.indexOf('?');
		if(qi > 0)
		{
			if(qi != windowPath.length - 1) //then need &
				windowPath += '&';
			//else ? is last character, so no need for &
		}
		else
			windowPath += '?';

		windowPath += "remoteServerOrigin=" +
			encodeURIComponent(DesktopContent._remoteServerOrigin) +
			"&remoteServerUrnLid=" + DesktopContent._remoteServerUrnLid;

		Debug.log("Modified window path url",windowPath);
	}

	//launch request to desktop
	DesktopContent._theDesktopWindow.postMessage(
			{
		"windowId":			DesktopContent._theWindowId,
		"request":  		"openNewWindow",
		"windowName":  		name,
		"windowSubname":  	subname,
		"windowUnique":  	unique,
		"windowPath":  		windowPath
			},"*");

	if(completeHandler)
		completeHandler(); //call parameter handler

} // end openNewWindow

//=====================================================================================
//openNewBrowserTab ~~
//	first wait for mailbox to be clear
//	then take mailbox
//
// Note: to open a window just using the Desktop icon name, leave subname and unique undefined
//	window path can optionially be used to send the window additional parameters, or left undefined.
DesktopContent.openNewBrowserTab = function(name,subname,windowPath,unique)
{
	if(windowPath !== undefined)
	{
		//remove leading ? because Desktop.js handling expects no leading ?
		if(windowPath[0] == '?')
			windowPath = windowPath.substr(1);

		//for windowPath, need to check lid=## is terminated with /
		// check from = that there is nothing but numbers
		try
		{
			var i = windowPath.indexOf("urn:xdaq-application:lid=");
			if(i >= 0)
			{
				i += ("urn:xdaq-application:lid=").length;
				var isAllNumbers = true;
				for(i;i<windowPath.length;++i)
				{
					//Debug.log(windowPath[i]);

					if(windowPath[i] < "0" || windowPath[i] > "9")
					{
						isAllNumbers = false;
						break;
					}
				}
				if(isAllNumbers)
					windowPath += "/";
			}
		}
		catch(e)
		{
			Debug.log("An error occurred while trying to open the window. " +
					"The window path seems to be invalid:[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e, Debug.HIGH_PRIORITY);
			return;
		}

		//if window path is relative to local gateway, then be explict for cases that top level gateway differs
		if(windowPath[0] == '/' &&
			DesktopContent._topServerUrnLid &&
			DesktopContent._topServerOrigin != DesktopContent._serverOrigin)
		{
			Debug.log("Adding local server detail to relative url in window path",windowPath);
			windowPath = DesktopContent._serverOrigin + windowPath;
			Debug.log("Modified window path url",windowPath);
		}

		//propagate remote gateway info (if not already defined)!
		if(DesktopContent._remoteServerUrnLid &&
				windowPath.indexOf("remoteServerUrnLid") < 0)
		{
			Debug.log("Adding Remote Gateway info to window path",windowPath);

			//determine if need & or ?
			var qi = windowPath.indexOf('?');
			if(qi > 0)
			{
				if(qi != windowPath.length - 1) //then need &
					windowPath += '&';
				//else ? is last character, so no need for &
			}
			else
				windowPath += '?';

			windowPath += "remoteServerOrigin=" +
				encodeURIComponent(DesktopContent._remoteServerOrigin) +
				"&remoteServerUrnLid=" + DesktopContent._remoteServerUrnLid;

			Debug.log("Modified window path url",windowPath);
		}
	} //end windowPath defined handling

	Debug.log("DesktopWindow= " + windowPath);
	Debug.log("name= " + name);
	Debug.log("subname= " + subname);
	Debug.log("unique= " + unique);

	//var search = DesktopContent._theWindow.parent.parent.window.location.search;

	if(DesktopContent._topServerUrnLid)
		url = DesktopContent._topServerOrigin +
			"/urn:xdaq-application:lid="+DesktopContent._topServerUrnLid+"/";//DesktopContent._theWindow.parent.parent.window.location.pathname;
	else
		url = DesktopContent._serverOrigin +
			"/urn:xdaq-application:lid="+DesktopContent._serverUrnLid+"/";//DesktopContent._theWindow.parent.parent.window.location.pathname;



	var str = "requestingWindowId=" + DesktopContent._theWindowId;//DesktopContent._myDesktopFrame.id.split('-')[1];
	str += "&windowName=" + name;
	str += "&windowSubname=" + subname;
	str += "&windowUnique=" + unique;
	str += "&windowPath=" + windowPath;


	if(DesktopContent._sequence)
		url += "Verify?code=" + DesktopContent._sequence + "&" + str;
	else
		url += "?" + str;

	Debug.log("DesktopContent.openNewBrowserTab= " + url);
	//DesktopContent.openNewBrowserTab= /urn:xdaq-application:lid=200/?requestingWindowId=1002&windowName=ARTDAQ Config&windowSubname=&windowUnique=false&windowPath=/WebPath/html/ConfigurationGUI_artdaq.html?urn=281
	window.open(url,'_blank');

} // end openNewBrowserTab()

//=====================================================================================
//addDesktopIcon ~~
//	modify active context to include the new desktop icon
//	reset desktop icons
//
//	Note: linkedApp can be the app LID, UID, or class type
DesktopContent.addDesktopIcon = function(caption, altText,
		folderPath, unique, permissionString,
		imageURL, windowContentURL, linkedApp, parameters) {

	var iconParameters = "";
	if(parameters && parameters.length)
	{
		if(typeof parameters === "string")
			iconParameters = parameters; //just take string, if not object
		else //take parameters from object
			for(var i in parametersObject)
			{
				iconParameters += encodeURIComponent(i) + "=" +
						encodeURIComponent(iconParameters[i]) + "&";
			}
	}

	Debug.log("iconParameters = " + iconParameters);

	var iconLinkedApp = "";
	var iconLinkedAppLID = 0;
	if(linkedApp)
	{
		if((linkedApp|0) > 0)
			iconLinkedAppLID =  linkedApp|0;
		else
			iconLinkedApp = linkedApp; //could be app UID or class
	}

	var req = "Request?RequestType=addDesktopIcon"
			/*get data*/
			+ "&iconCaption=" + encodeURIComponent(caption)
			+ "&iconAltText=" + encodeURIComponent(altText)
			+ "&iconFolderPath=" + encodeURIComponent(folderPath)
			+ "&iconPermissions=" + encodeURIComponent(permissionString)
			+ "&iconImageURL=" + encodeURIComponent(imageURL)
			+ "&iconWindowURL=" + encodeURIComponent(windowContentURL)
			+ "&iconEnforceOneWindowInstance=" + (unique?"1":"0")
			+ (iconLinkedAppLID?
					("&iconLinkedAppLID=" + iconLinkedAppLID):
					("&iconLinkedApp=" + iconLinkedApp)
			);

	Debug.log("Create Icon req = " + req);

	DesktopContent.XMLHttpRequest(req,
			/*post data*/
			"iconParameters=" + encodeURIComponent(iconParameters)
			,
			function(req)
			{
		Debug.log("Successfully added icon '" +
				caption +
				"!'",Debug.INFO_PRIORITY);

		//if available update active system configuration handler, to display changes
		try
		{
			activateTableGroupHandler(req);
		}
		catch(err) {} //ignore error, this is a place holder for users to define a handler for updating displays when the active groups changed (e.g used by ConfigurationGUI)

		//inform Desktop.js to refresh icons (handled by _checkMailboxes())
		DesktopContent._theDesktopWindow.postMessage(
				{
			"windowId":			DesktopContent._theWindowId,
			"request":  		"refreshIcons"
				},"*");

			}, //end request handler
			0 /*reqParam*/, 0 /*progressHandler*/, false /*callHandlerOnErr*/,
			false /*doNotShowLoadingOverlay*/,
			true /*targetGatewaySupervisor*/);  //end XMLHttpRequest() call

} //end addDesktopIcon()

//=====================================================================================
DesktopContent.systemBlackout = function(doBlackout)
{
	Debug.log("systemBlackout =" + doBlackout);
	//inform Desktop.js to refresh icons (handled by _checkMailboxes())
	DesktopContent._theDesktopWindow.postMessage(
			{
		"windowId":			DesktopContent._theWindowId,
		"request":  		(doBlackout?"startSystemBlackout":"stopSystemBlackout")
			},"*");
} //end systemBlackout()

//=====================================================================================
//getDesktopWindowTitle ~~
//	returns the text in header of the current desktop window
DesktopContent.getDesktopWindowTitle = function()
{
	if(!DesktopContent._theWindowTitle ||
		DesktopContent._theWindowTitle == -1)
		return DesktopContent._theWindow.parent.document.getElementById(
			"DesktopWindowHeader-" +
			DesktopContent._theWindow.name.split('-')[1]).innerHTML;
	else
		return DesktopContent._theWindowTitle;
} //end getDesktopWindowTitle()

DesktopContent.getExceptionLineNumber = function(e)
{
	try
	{
		console.log(e);
		return e.stack.split('\n')[1].split(':')[4].split(')')[0]|0; }
	catch(newError) { return -1; } //hide error and give invalid line number
} //end getExceptionLineNumber()

//=====================================================================================
//	provide html tag name and attribute/value map object
//		To escape quotes in usage, use \" for example and use encodeURIComponent(str) to avoid special characters:
//
// 		str += DesktopContent.htmlOpen("span",{
// 			"class" : "macroInfo",
// 			"style" : "cursor:pointer",
// 			"onclick" : ("DesktopContent.tooltip(\"" +
// 				encodeURIComponent(macroName) + "\", \"" +
// 				encodeURIComponent(tooltip) + "\");"),
// 			"title" : "Click to open the tooltip for FE Macro &apos;" + encodeURIComponent(macroName) + "&apos;"
// 		},"" /*innerHTML*/,true /*doCloseTag*/);
DesktopContent.htmlOpen = function(tag, attObj, innerHTML, doCloseTag)
{
	var str = "";
	var detectedCheckbox = false;
	var attKeys = attObj?Object.keys(attObj):[];
	str += "<" + tag + " ";
	for(var i=0;i<attKeys.length;++i)
	{
		if(attKeys[i] == "type" && attObj[attKeys[i]] == "checkbox")
			detectedCheckbox = true;

		if(attKeys[i] == "selected") str += (attObj[attKeys[i]]|0)?" selected ":""; //no value
		else if(attKeys[i] == "checked") str += (attObj[attKeys[i]]|0)?" checked ":""; //no value
		else if(attKeys[i] == "") continue; //skip empty key
		else
		{
			var tmpStr = attObj[attKeys[i]];
			if(typeof(tmpStr) == "string")
				tmpStr = tmpStr.replaceAll("'","\\'");
			str += " " + attKeys[i] + "='" +
				tmpStr + "' ";
		}
	}
	str += ">";
	if(innerHTML)
	{
		//if not internal tags on inner HTML of checkbox, then add link to manipulate checkbox
		if(detectedCheckbox && doCloseTag && innerHTML.indexOf("<a") < 0)
		{
			var childAtt = {"style": "text-decoration:none;color:inherit;",
				"onclick": "var el = this.previousSibling; Debug.log(el.id); " + //= document.getElementsByClassName(\"enableMultiNodeCheckbox\");" +
					"var forFirefox = (el.checked = !el.checked); " +
					"if (typeof el.onclick == \"function\") { " +
						"el.onclick.apply(el); }"
			}
			if(attObj["title"])
				childAtt["title"] = attObj["title"];

			str += DesktopContent.htmlOpen("a",childAtt,
				innerHTML /*innerHTML*/,
				true /*doCloseTag*/
				);
		}
		else
			str += innerHTML;
	}
	if(doCloseTag)
		str += "</" + tag + ">";
	return str;
} //end htmlOpen()

//=====================================================================================
DesktopContent.htmlClearDiv = function()
{
	return "<div id='clearDiv'></div>";
} //end htmlClearDiv()

//=====================================================================================
DesktopContent.parseCSV = function(text) 
{
	const rows = [];
	let currentRow = [];
	let currentValue = '';
	let insideQuotes = false;

	for (let i = 0; i < text.length; i++) 
	{
		const char = text[i];
		const nextChar = (i+1 < text.length ? text[i+1] : '');

		if (char === '"') 
		{
			if (insideQuotes && nextChar === '"') // "" will escape a double-quote in CSV
			{
				// Escaped double-quote
				currentValue += '"';
				++i; //skip next quote
			} 
			else 
			{
				// Toggle quote mode
				insideQuotes = !insideQuotes;
			}
		} 
		else if (char === ',' && !insideQuotes) 
		{
			currentRow.push(currentValue);
			currentValue = '';
		} 
		else if ((char === '\n' || char === '\r') && !insideQuotes) 
		{
			if (currentValue || currentRow.length > 0) 
			{
				currentRow.push(currentValue);
				rows.push(currentRow);
				currentRow = [];
				currentValue = '';
				prevChar = '';
			}
		} 
		else 
		{
			currentValue += char;
		}
	} //end text loop

	// Add last value if any
	if (currentValue || currentRow.length > 0) 
	{
		currentRow.push(currentValue);
		rows.push(currentRow);
	}

	return rows;
} //end parseCSV()