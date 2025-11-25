//=====================================================================================
//
//	Created Nov, 2016
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	SimpleContextMenu.js
//
//  Requirements:
//   1. paste the following:
//
//				<script type="text/JavaScript" src="/WebPath/js/Globals.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/Debug.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/DesktopContent.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/js_lib/SimpleContextMenu.js"></script>
//
//		...anywhere inside the <head></head> tag of a window content html page
//	 2. for proper functionality certain handlers are used:
//   		cannot overwrite handlers for window: onfocus, onscroll, onblur, onmousemove
//			(if you must overwrite, try to call the DesktopContent handlers from your handlers)
//
//	Recommendations:
//	 1. use Debug to output status and errors, e.g.:
//				Debug.log("this is my status",Debug.LOW_PRIORITY); //LOW_PRIORITY, MED_PRIORITY, INFO_PRIORITY, WARN_PRIORITY, HIGH_PRIORITY
//	 2. call window.focus() to bring your window to the front of the Desktop
//
//	The code of Requirement #1 should be inserted in the header of each page that will be
//  the content of a window in the ots desktop.
//
//  This code handles bringing the window to the front when the content
//  is clicked or scrolled.
//
// Example usage: /WebPath/html/SimpleContextMenuTest.html
//
//=====================================================================================

var SimpleContextMenu = SimpleContextMenu || {}; //define SimpleContextMenu namespace

if (typeof Debug == 'undefined')
	alert('ERROR: Debug is undefined! Must include Debug.js before SimpleContextMenu.js');
if (typeof Globals == 'undefined')
	alert('ERROR: Globals is undefined! Must include Globals.js before SimpleContextMenu.js');
if (typeof DesktopContent == 'undefined' &&
		typeof Desktop == 'undefined')
	alert('ERROR: DesktopContent is undefined! Must include DesktopContent.js before SimpleContextMenu.js');


//"public" function list:
//	SimpleContextMenu.createMenu(menuItems,menuItemHandlers,popupID,topLeftX,topLeftY, primaryColor, secondaryColor, useDefaultHighlightColors)
//	SimpleContextMenu.createMenuCallAsString(menuItems,menuItemHandlers,popupID,topLeftX,topLeftY, primaryColor, secondaryColor, useDefaultHighlightColors)
//	SimpleContextMenu.closeMenu()

//"private" function list:
//	SimpleContextMenu.mouseMoveHandler(event)
//	SimpleContextMenu.callMenuItemHandler(event,index)
//	SimpleContextMenu.handleMouseOverMenuItem(event,index)

//"private" members:
SimpleContextMenu._popUpEl = 0;
SimpleContextMenu._menuItemHandlers = [];
SimpleContextMenu._primaryColor = "";
SimpleContextMenu._secondaryColor = "";

SimpleContextMenu._styleEl = 0;

//=====================================================================================
//SimpleContextMenu.createMenu
// 	if from event, for left and top use, e.g event.pageX-1,event.pageY-1
SimpleContextMenu.createMenu = function(menuItems,menuItemHandlers,
		popupID,topLeftX,topLeftY, primaryColor, secondaryColor, useDefaultHighlightColors)
{

	Debug.log("Creating SimpleContextMenu...");
	//	Debug.log("menuItems=" + menuItems);
	//	Debug.log("menuItemHandlers=" + menuItemHandlers);
	//	Debug.log("popupID=" + popupID);
	//	Debug.log("topLeftX=" + topLeftX);
	//	Debug.log("topLeftY=" + topLeftY);
	//	Debug.log("primaryColor=" + primaryColor);
	//	Debug.log("secondaryColor=" + secondaryColor);

	SimpleContextMenu._menuItemHandlers = menuItemHandlers;
	SimpleContextMenu._primaryColor = primaryColor;
	SimpleContextMenu._secondaryColor = secondaryColor;
	SimpleContextMenu._useDefaultHighlightColors = useDefaultHighlightColors;

	var body = document.getElementsByTagName("BODY")[0];
	var el = SimpleContextMenu._popUpEl;
	if(el)
	{
		Debug.log("Can not create SimpleContextMenu if one already exists. To force close, call SimpleContextMenu.closeMenu().",
				Debug.MED_PRIORITY);
		return;
	}

	//////////=======================
	//create the element
	el = document.createElement("div");
	el.setAttribute("id", popupID);
	el.style.display = "none";
	el.onmousemove = function(e){e.cancelBubble = true;};
	body.appendChild(el); //add element to body of page


	//////////=======================
	//add style for error to page HEAD tag
	var css = "";

	css += "#clearDiv {" +
			"clear: both;" +
			"}\n\n";

	//error close link style
	css += "#" + popupID + "" +
			"{" +
			"position:absolute;" +
			"left:" + topLeftX + "px;" +
			"top:" + topLeftY + "px;" +
			"z-index: 1000000;" + //one million!
			"background-color: " + primaryColor + ";" +
			//"border: 				0px solid " + secondaryColor + ";" +
			"padding: 				8px 0 8px 0;" +
			"border-radius:			2px;" +
			"box-shadow: 			inset rgba(255,254,255,0.6) 0 0 0 /*top-bottom glow*/," +
			"		inset rgba(0,0,0,0.35) 0 0 3px /* inner shadow */, " +
			"		rgb(150,150,150) 0 0 3px /* outer glow */," +
			"		rgb(175,175,175) 0 0 3px  /* color border */," +
			"		rgba(0,0,0,0.7) -5px 5px 5px /* drop shadow */;	" +
			"}\n\n";
	css += "#" + popupID + " div" +
			"{" +
			"padding: 				0 10px 0 10px;" +
			"color: " + secondaryColor + ";" +
			"-webkit-user-select: 	none;" +
			"-moz-user-select: 		none;" +
			"user-select:			none;" +
			"}\n\n";
	css += "#" + popupID + " div:hover" +
			"{" +
			"background-color: " + (useDefaultHighlightColors?"rgb(91,148,240)":secondaryColor) + ";" +
			"color: " + (useDefaultHighlightColors?"white":primaryColor) + ";" +
			"cursor: pointer;" +
			"}\n\n";
	css += "#" + popupID + " *" +
			"{" +
			"font-size:				14px;" +
			"font:					arial;" +
			"}\n\n";

	//add style element to HEAD tag
	var style = document.createElement('style');

	if (style.styleSheet) {
		style.styleSheet.cssText = css;
	} else {
		style.appendChild(document.createTextNode(css));
	}

	document.getElementsByTagName('head')[0].appendChild(style);

	SimpleContextMenu._styleEl = style;


	//////////=======================
	//add menu items to element
	var str = "";
	for(var i=0;i<menuItems.length;++i)
	{
		str +=
				"<div class='SimpleContextMenu-menuItem' " +
				"id='SimpleContextMenu-menuItem-" + i + "' " +
				"onmousemove='SimpleContextMenu.handleMouseOverMenuItem(event," + i + ");' " +
				"onmousedown='event.stopPropagation();' " +
				"onmouseup='SimpleContextMenu.callMenuItemHandler(event," + i + ");' " +
				">" +
				menuItems[i] +
				"</div>";
		str += "<div id='clearDiv'></div>";
	}

	el.innerHTML = str;
	el.style.display = "block";

	SimpleContextMenu._popUpEl = el;
} //end createMenu()

//=====================================================================================
//SimpleContextMenu.createMenuCallAsString
//	create string version of call to SimpleContextMenu.createMenu(...)
//	this string can be put into an event handler string
//	  e.g. "onmousedown='" + createTreeLinkContextMenuString(...) + "'"
SimpleContextMenu.createMenuCallAsString = function(menuItems,menuItemHandlers,
		popupID, primaryColor, secondaryColor, useDefaultHighlightColors)	{

	var str = "";
	str += "SimpleContextMenu.createMenu([";

	//output item strings
	for(j=0;j<menuItems.length;++j)
	{
		if(j)
			str += ",";
		str += "\"" + menuItems[j] + "\"";
	}

	str += "]," +//end items and open array for item handlers
			"[";

	for(j=0;j<menuItemHandlers.length;++j)
	{
		//Debug.log("menuItemHandlers[j]= " + menuItemHandlers[j]);
		//need to escape all quotes by one more level
		menuItemHandlers[j] = menuItemHandlers[j].replace(/\\\"/g, "AAAAA");
				menuItemHandlers[j] = menuItemHandlers[j].replace(/"/g, "\\\"");
		menuItemHandlers[j] = menuItemHandlers[j].replace(/AAAAA/g, "\\\\\\\"");
		//Debug.log("menuItemHandlers[j]= " + menuItemHandlers[j]);
		//Debug.log("this works= " + "Debug.log(\\\"hi\\\");");
		//THIS WORKS: treeViewHandlerStr_ += "\"" + "Debug.log(\\\"hi\\\");" + "\"";
		str += "\"" + menuItemHandlers[j] + "\"";
		if(j != menuItemHandlers.length-1)
			str += ",";
	}
	str += "]" + //end menuItemHandlers array
			",\"" + popupID + "\",event.pageX-1,event.pageY-1, " +
			"\"" + primaryColor +
			"\", \"" + secondaryColor +
			"\", " + (useDefaultHighlightColors?1:0) + ");";

	return str;
} //end createMenuCallAsString()

SimpleContextMenu._removePopupTimer = 0;

//=====================================================================================
//SimpleContextMenu.mouseMoveHandler
//	subscribe the mouse move handler to DesktopContent.mouseMoveSubscriber
//	OR if (typeof DesktopContent == 'undefined' then subscribe to Desktop
SimpleContextMenu.mouseMoveHandler = function(e)
{
	//Debug.log("moving " + e.pageX + "-" + e.pageY);
	if(SimpleContextMenu._popUpEl && !SimpleContextMenu._removePopupTimer) //delete popup
	{
		//Debug.log("Starting timer to remove SimpleContextMenu");
		SimpleContextMenu._removePopupTimer = window.setTimeout(
				SimpleContextMenu.closeMenu,
				1000 /*in milliseconds*/);
	}
	else if(!SimpleContextMenu._popUpEl) SimpleContextMenu._removePopupTimer = 0; //clear if popup gone
} //end mouseMoveHandler
//subscribe the mouse move handler (if desktop content or part of actual desktop)
if(typeof DesktopContent == 'undefined')
	Desktop.mouseMoveSubscriber(SimpleContextMenu.mouseMoveHandler);
else
	DesktopContent.mouseMoveSubscriber(SimpleContextMenu.mouseMoveHandler);


//=====================================================================================
SimpleContextMenu.callMenuItemHandler = function(event,index)
{
	var handler = SimpleContextMenu._menuItemHandlers[index];

	Debug.log("Removing SimpleContextMenu");
	SimpleContextMenu._popUpEl.parentNode.removeChild(SimpleContextMenu._popUpEl);
	SimpleContextMenu._popUpEl = 0;

	if(SimpleContextMenu._styleEl)
	{
		SimpleContextMenu._styleEl.parentNode.removeChild(SimpleContextMenu._styleEl);
		SimpleContextMenu._styleEl = 0;
	}

	event.cancelBubble = true;
	event.preventDefault();
	event.stopPropagation();

	//Debug.log("SimpleContextMenu.callMenuItemHandler " + handler);
	if(handler && (typeof handler) == "string") //if handler supplied as string
	{
		Debug.log("evaluateJS = " + handler);
		eval(handler);
		return false;
	}
	else //assume it is a function
	{
		handler(event, index);
		return false;
	}
} //end callMenuItemHandler()

//=====================================================================================
//SimpleContextMenu.handleMouseOverMenuItem
SimpleContextMenu.handleMouseOverMenuItem = function(event,index)
{
	event.cancelBubble = true;

	//kill the popup removal, if user still interested
	if(SimpleContextMenu._removePopupTimer)
	{
		window.clearTimeout(SimpleContextMenu._removePopupTimer);
		SimpleContextMenu._removePopupTimer = 0;
	}

	//Debug.log(index);
	//set colors properly for mouse over

	var el;
	for(var i=0;i<SimpleContextMenu._menuItemHandlers.length;++i)
	{
		el = document.getElementById("SimpleContextMenu-menuItem-" + i);
		if(i == index) //hovered one
		{
			el.style.backgroundColor = 	(SimpleContextMenu._useDefaultHighlightColors?"rgb(91,148,240)":SimpleContextMenu._secondaryColor);
			el.style.color = 			(SimpleContextMenu._useDefaultHighlightColors?"white"			:SimpleContextMenu._primaryColor);
		}
		else
		{
			el.style.backgroundColor = 	SimpleContextMenu._primaryColor;
			el.style.color = 			SimpleContextMenu._secondaryColor;
		}
	}
} //end handleMouseOverMenuItem

//=====================================================================================
SimpleContextMenu.closeMenu = function()
{
	//kill timer
	if(SimpleContextMenu._removePopupTimer)
	{
		window.clearTimeout(SimpleContextMenu._removePopupTimer);
		SimpleContextMenu._removePopupTimer = 0;
	}

	//remove popup el
	if(SimpleContextMenu._popUpEl)
	{
		SimpleContextMenu._popUpEl.parentNode.removeChild(SimpleContextMenu._popUpEl);
		SimpleContextMenu._popUpEl = 0;
	}

	//remove popup style
	if(SimpleContextMenu._styleEl)
	{
		SimpleContextMenu._styleEl.parentNode.removeChild(SimpleContextMenu._styleEl);
		SimpleContextMenu._styleEl = 0;
	}
} //end handleMouseOverMenuItem