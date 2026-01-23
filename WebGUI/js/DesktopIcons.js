//=====================================================================================
//
//	Created Mar, 2013
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	DesktopIcons.js
//
//	This is the desktop code for the user interface for ots. ots is the DAQ
// 		and control software for the Fermi Strips Telescope.
//
//	The desktop consists of icons to launch windows
//
//=====================================================================================


if (typeof Debug == 'undefined')
	alert('ERROR: Debug is undefined! Must include Debug.js before DesktopIcons.js');

if (typeof SimpleContextMenu == 'undefined')
	Debug.log('ERROR: SimpleContextMenu is undefined! Must include SimpleContextMenu.js before DesktopIcons.js',Debug.HIGH_PRIORITY);
if (typeof MultiSelectBox == 'undefined') //used for folders
	Debug.log('ERROR: MultiSelectBox is undefined! Must include MultiSelectBox.js before DesktopIcons.js',Debug.HIGH_PRIORITY);
if (typeof DesktopContent == 'undefined') //used for getting solid window color for folders
	Debug.log('ERROR: DesktopContent is undefined! Must include DesktopContent.js before DesktopIcons.js',Debug.HIGH_PRIORITY);


if (typeof Desktop == 'undefined')
	Debug.log('ERROR: Desktop is undefined! Must include Desktop.js before DesktopIcons.js',Debug.HIGH_PRIORITY);
else {


	////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////
	//define Desktop.createIcons to return dashboard class
	////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////
	Desktop.createIcons = function(userPermissions, z) {
		if(false === (this instanceof Desktop.createIcons)) {
			//here to correct if called as "var v = Desktop.createIcons();"
			//	instead of "var v = new Desktop.createIcons();"
			return new Desktop.createIcons(userPermissions, z);
		}


		//------------------------------------------------------------------
		//create private members variables ----------------------
		//------------------------------------------------------------------

		//all units in pixels unless otherwise specified

		var _defaultIconsMargin = 50; //margin to desktop border for all icons
		var _defaultIconWidth = 64;
		var _defaultIconHeight = 64;
		var _defaultIconTextWidth = 90;
		var _defaultIconTextHeight = 24;
		var _permissions = 0;

		var _iconsElement;

		var _numOfIcons = 0;

		var _deepClickTimer = 0;
		var _iconInFolderWasClicked = false;

		var _folders = [{},[]]; // a folder is a an Object of subfolders and an array of icons
							//	It has an array of icon objects (in case icon names are not unique,
							//		the array index makes them unique).
							//	Subfolder names must be unique.
		var _openFolderPtr;	// always points to the currently open folder within the _folders object
							//		so that subfolders can easily navigate
		var _openFolderPath = "";
		var _openFolderElement;

		var _iconNameToPathMap = undefined; // {/* "name": [path,unique] */} ...used to open icons programatically

		var _folderFocusPath = ""; //if set, only show icons in this folder path on desktop (and subfolders)
		var _folderFocusSettingsURL = ""; //if set, this URL is used to open the settings window for the focused folder (instead of the default settings icon URL)

		//------------------------------------------------------------------
		//create public members variables ----------------------
		//------------------------------------------------------------------
		this.iconsElement;
		this.folders = _folders;
		this.deepClickTimer = _deepClickTimer;
		this.iconNameToPathMap = _iconNameToPathMap;


		//------------------------------------------------------------------
		//create PRIVATE members functions ----------------------
		//------------------------------------------------------------------

		var _redrawIcons = function() {

			_iconsElement.style.left = Desktop.desktop.getDesktopContentX()+_defaultIconsMargin+"px";
			_iconsElement.style.top = Desktop.desktop.getDesktopContentY()+_defaultIconsMargin+"px";
			_iconsElement.style.width = Desktop.desktop.getDesktopContentWidth()-_defaultIconsMargin-_defaultIconsMargin+"px";
			_iconsElement.style.height = Desktop.desktop.getDesktopContentHeight()-_defaultIconsMargin-_defaultIconsMargin+"px";

		}

		//------------------------------------------------------------------
		//create PUBLIC members functions ----------------------
		//------------------------------------------------------------------

		this.redrawIcons = _redrawIcons;

		//=====================================================================================
		// this.resetWithPermissions ~~
		this.resetWithPermissions = function(permissions, keepSamePermissions, showRemoteGatewayErrors)
		{
			Debug.log("Desktop resetWithPermissions " + permissions +
					", " + keepSamePermissions + ", se" + showRemoteGatewayErrors);

			if(permissions === undefined && !keepSamePermissions)
				return;
			else if(!keepSamePermissions)
				_permissions = permissions;
			////////////

			Desktop.desktop.icons.iconNameToPathMap = undefined; //undefined as indication that icons are not setup yet

			if(!Desktop.isWizardMode())
			{ //This is satisfied for Digest Access Authorization and No Security on OTS
				Debug.log("Requesting desktop icons from...", window.parent.window.location.origin);
				Desktop.XMLHttpRequest("Request?RequestType=getDesktopIcons", 
						"RequestOrigin=" + encodeURIComponent(window.parent.window.location.origin),
						iconRequestHandler, showRemoteGatewayErrors);
				return;
			}
			else //it is the sequence for OtsWizardConfiguration
			{
				Debug.log("OtsWizardConfiguration");
				Desktop.XMLHttpRequest("requestIcons", "sequence=" +
						Desktop.desktop.security, iconRequestHandler);
				if(!_permissions) _permissions = 1;
				return;
			}

		} //end resetWithPermissions()

		//=====================================================================================
		//_iconRequestHandler
		//adds the icons from the hardcoded, C++ in OtsConfigurationWizard
		var iconRequestHandler = function(req, showRemoteGatewayErrors)
		{
			if(showRemoteGatewayErrors)
				Debug.logv({showRemoteGatewayErrors});
			
			//clear folder object
			Desktop.desktop.icons.folders = [{},[]];
			Desktop.desktop.icons.iconNameToPathMap = {} ; //clear map

			_iconsElement.innerHTML = ""; //clear existing icons
			_numOfIcons = 0;

			var iconArray;

			if(!Desktop.isWizardMode())
			{ //This is satisfied for  Digest Access Authorization and No Security on OTS

				var errs = DesktopContent.getXMLRequestErrors(req);
				if(errs.length)
				{
					for(var i=0;i<errs.length;++i)
					{
						if(!showRemoteGatewayErrors && 
								(errs[i].indexOf("Remote Gateway") > 0 || //demote to log
								errs[i].indexOf("Remote Subsystem") > 0))
							Debug.log("Warning: " + errs[i]);
						else
							Debug.err(errs[i]);
					}
					//try to power through error //return;
				}

				iconArray = Desktop.getXMLValue(req,"iconList");
				//Debug.log("icon Array unsplit: " + iconArray);

				if(iconArray)
					iconArray = iconArray.split(",");
				else
					iconArray = [];
			}
			else //it is the wizard
			{
				if(req && req.responseText)
					iconArray = req.responseText.split(",");
			}

			Debug.log("icon Array split: " + iconArray);
			//Debug.log(_permissions);

			//an icon is 7 fields.. give comma-separated
				//0 - subtext = text below icon
				//1 - altText = text icon if no image given
				//2 - uniqueWin = if true, only one window is allowed, else multiple instances of window
				//3 - permissions = security level needed to see icon
				//4 - picfn = icon image filename
				//5 - linkurl = url of the window to open
				//6 - folderPath = folder and subfolder location '/' separated

				//			//debugging
				//			var depth = 10;
				//			var breadth = 20;
				//			var folder = "";
				//			for(var i=0;i<depth;++i)
				//			{
				//				folder += "/folder-" +i;
				//				for(var j=0;j<breadth;++j)
				//					Desktop.desktop.icons.addIcon("title-"+i + "-"+j,
				//							"alt",
				//							iconArray[j%4*7+5],
				//							1,
				//							"0",//iconArray[j%4*7+4],
				//							folder);
				//			}
				//			Desktop.desktop.icons.openFolder(100,100,"folder-0");
				//			return;



			var numberOfIconFields = 7;
			Debug.logv({_folderFocusPath});
			var iconsAdded = 0;
			for(var i=0;i<(iconArray.length);i+=numberOfIconFields) //add icons
			{
				if(_permissions >= iconArray[i+3]) //check permissions
				{
					if(iconArray[i+6])
					{
						Debug.log("Folder path",iconArray[i+6], 
							"url",iconArray[i+5]);

						//check for folder path Settings URL
						if(_folderFocusPath != "" &&
							iconArray[i+6].indexOf(_folderFocusPath) == 0 &&
							iconArray[i+5].indexOf("/UserSettings.html") > 0)
						{						
							_folderFocusSettingsURL = iconArray[i+5];
							Debug.logv({_folderFocusSettingsURL});
						}
					}

					if(_folderFocusPath == "" ||
						iconArray[i+6].indexOf(_folderFocusPath) == 0)
					{
						//modify folder path if in focus path (to appear as zoomed in on folder contents)
						iconArray[i+6] = iconArray[i+6].substr(_folderFocusPath.length);
					}
					else if(_folderFocusPath != "")
						continue;

					++iconsAdded;
					Desktop.desktop.icons.addIcon(iconArray[i],iconArray[i+1],iconArray[i+5],iconArray[i+2]|0,iconArray[i+4],iconArray[i+6]);
				}
			} //end icon add loop

			if(_folderFocusPath != "" && iconsAdded == 0)
				Debug.err("No icons matched Folder path parameter provided: " + _folderFocusPath + 
						". Check that the Folder path is correct and that you have permission to access it." +
						"\n\nIf you are targeting a Folder path associated with a Remote Subsystem, perhaps it has not loaded yet or is disconnected. Contact admins if the problem persists.");

		} //end iconRequestHandler()

		//=====================================================================================
		// this.setFolderFocus ~~
		//	to setup the filter to only show icons in a particular folder path
		this.setFolderFocus = function(folderPath)
		{
			Debug.logv({folderPath});
			_folderFocusPath = folderPath;
		} //end setFolderFocus()
		this.getFolderFocus = function() { return _folderFocusPath?_folderFocusPath:""; }

		this.getFolderFocusSettingsURL = function() { return _folderFocusSettingsURL?_folderFocusSettingsURL:""; }
		this.getFolderFocusSubsystem = function() 
		{
			let i = _folderFocusPath.indexOf("/");
			if(i > 0)
				return _folderFocusPath.substr(0,i);
			else				
				return _folderFocusPath;
		} //end getFolderFocusSubsystem()

		//=====================================================================================
		// this.addIcon ~~
		//	adds an icon subtext wording underneath and image icon (if picfn defined, else alt text icon)
		this.addIcon = function(subtext, altText, linkurl, uniqueWin, picfn, folderPath)
		{
			if(altText == 'X')
				Debug.log("this.addIcon");

			//same as in DesktopContent.openNewBrowserTab
			//for linkurl, need to check lid=## is terminated with /
			// check from = that there is nothing but numbers
			try
			{
				var i = linkurl.indexOf("urn:xdaq-application:lid=") + ("urn:xdaq-application:lid=").length;
				var isAllNumbers = true;
				for(i;i<linkurl.length;++i)
				{
					//Debug.log(linkurl[i]);

					if(linkurl[i] < "0" || linkurl[i] > "9")
					{
						isAllNumbers = false;
						break;
					}
				}
				if(isAllNumbers)
					linkurl += "/";
			}
			catch(e)
			{
				Debug.log("An error occurred while trying to parse the window url. " +
						"The window path seems to be invalid: " + e, Debug.HIGH_PRIORITY);
				return;
			}

			var iconContainer = document.createElement("div");
			iconContainer.setAttribute("class", "DesktopIcons-iconContainer");

			var link;
			var div;


			//if folder path is non-empty,
			//	create the full folder structure in the _folders object
			//	and show the top level folder icon (if new to _folders object)
			//else
			//	just show icon

			while(folderPath.length && folderPath[0] == '/') //remove leading '/'s
				folderPath = folderPath.substr(1);
			while(folderPath.length && folderPath[folderPath.length-1] == '/') //remove trailing '/'s
				folderPath = folderPath.substr(0,folderPath.length-1);

			if(folderPath.length)
				this.iconNameToPathMap[folderPath + "/" + subtext] = [linkurl,uniqueWin];
			else
				this.iconNameToPathMap[subtext] = [linkurl,uniqueWin];

			var folderSplit = folderPath.split('/'); //root folder is first non empty index
			var rootFolderIndex;
			var folderPtr;
			var folders = this.folders;
			for(var i=0;i<folderSplit.length;++i)
			{
				if(folderSplit[i] == "")
				{
					if(folderSplit.length == 1) continue; //skip eempty folder path field

					Debug.warn("Empty folder names are not allowed. Icon '" + subtext +
						"' has an illegal folder path:", folderPath);
					folderPtr = undefined;
					break;
				}

				if(folderPtr === undefined)
					folderPtr = folders; //init to root folder first time

				//check if folder exists (this is root or subfolder level)
				if(folderPtr[0][folderSplit[i]] === undefined)
				{
					//need to create folder object
					folderPtr[0][folderSplit[i]] = [{},[]]; // a folder is a an Object of subfolders and an array of icons

					if(folderPtr == folders &&
							rootFolderIndex === undefined) //found new root icon
						rootFolderIndex = folderSplit[i]; //need to display icon on desktop
				}

				folderPtr = folderPtr[0][folderSplit[i]];
			}

			//if folderPath, add icon to structure at folderPtr
			if(folderPtr !== undefined)
			{
				Debug.log("folderPtr.length = " + folderPtr.length);

				//push new icon object
				folderPtr[1].push([subtext, altText, linkurl, uniqueWin, picfn]);
				// console.log(folders);

				//check if this is first icon encountered in this root folder
				//	if so, need to display on desktop
				if(rootFolderIndex !== undefined)
				{
					//there is a new folder to be displayed on desktop
					Debug.log("folderPath = " + folderPath);
					Debug.log("rootFolderIndex = " + rootFolderIndex);

					//add the folder icon to desktop
					subtext = rootFolderIndex;
					altText = "F";
					linkurl = "folder";
					uniqueWin = 1;
					picfn = "icon-Folder.png";
				}
				else	//this icon is in a folder, and the root folder is already displayed
					return;
			}



			//var jsCmd = "Javascript:var newWin = Desktop.desktop.addWindow(\""+ subtext + "\",\"" + ""
			//	 + "\",\"" + linkurl + "\","+uniqueWin+");";

			//create icon square
			link = document.createElement("a");
			link.setAttribute("class", "DesktopIcons-iconLink");
			link.title = subtext;
			//link.href = "#";//jsCmd;

			if(linkurl == "folder")
			{
				var iconsObj = this;
				link.addEventListener("click", function(e) {
					iconsObj.openFolder(
							e.clientX-this.parentNode.parentNode.offsetLeft,
							e.clientY-this.parentNode.parentNode.offsetTop,
							subtext);
				}, false);
			}
			else
			{
				if(altText == 'X' && linkurl == "/") //click unloaded icons to refresh icons
					link.addEventListener("click", function(e) {
						Desktop.desktop.addWindow(subtext,"",linkurl,uniqueWin);
					}, false);
				else
					link.addEventListener("click", function(e) {
						Desktop.desktop.addWindow(subtext,"",linkurl,uniqueWin);
					}, false);
			}

			div = document.createElement("div");
			div.setAttribute("class", "DesktopIcons-iconDiv");
			div.style.width = _defaultIconWidth + "px";
			div.style.height = _defaultIconHeight + "px";
			div.style.marginLeft = (_defaultIconTextWidth-_defaultIconWidth-2)/2 + "px"; //extra 2 for border

			//define icon content
			if(picfn != "0" && picfn != "DEFAULT" && picfn != "NO ICON" && picfn != "")
			{ //if icon image
				Debug.log("picfn",picfn.substr(0,4),picfn);
				if(picfn[0] != '/' && ( //avoid if http*: start as well
					picfn.length < 6 || picfn.substr(0,4) != "http" || picfn[5] != ':'))
					div.style.backgroundImage = "url(/WebPath/images/iconImages/" + picfn+")";
				else
					div.style.backgroundImage = "url(" + picfn+")";

				div.style.backgroundSize = _defaultIconWidth + "px " + _defaultIconHeight + "px";

				var div2 = document.createElement("div");
				div2.setAttribute("class", "DesktopIcons-iconDiv");
				div2.style.width = _defaultIconWidth + "px";
				div2.style.height = _defaultIconHeight + "px";
				div2.style.marginLeft = (-1) + "px"; //put effect over top	of background image and line up with border
				div2.style.marginTop = (-1) + "px";
				div.appendChild(div2);
			}
			else {	//if text only icon, gets effect from .css
				div.innerHTML = "<table width='100%' height='100%'><td width='100%' height='100%' valign='middle' align='center'>"+
					altText+"</td></table>";
			}

			link.appendChild(div);
			iconContainer.appendChild(link); //add square to icon container

			//create icon sub text
			link = document.createElement("a");
			link.setAttribute("class", "DesktopIcons-iconLink");
			link.title = subtext;
			//link.href = "#";////link.href = jsCmd;
			if(linkurl == "folder")
			{
				var iconsObj = this;
				link.addEventListener("click", function(e) {
					iconsObj.openFolder(
							e.clientX-this.parentNode.parentNode.offsetLeft,
							e.clientY-this.parentNode.parentNode.offsetTop,
							subtext);
				}, false);
			}
			else
			{
				link.addEventListener("click", function(e) {
					Desktop.desktop.addWindow(subtext,"",linkurl,uniqueWin);
				}, false);
			}


			div = document.createElement("div");
			div.setAttribute("class", "DesktopIcons-iconSubText");
			div.style.width = _defaultIconTextWidth + "px";
			div.style.height = _defaultIconTextHeight + "px";
			div.innerHTML = subtext;

			link.appendChild(div);
			iconContainer.appendChild(link); //add subtext to icon container

			if(1) //for folders too now! linkurl != "folder") //if not folder, add context click menu handlers
			{
				let isFolder = linkurl == "folder";

				//add context click menu handlers
				//	mouseup and contextMenu to stop default right-click behavior
				//	and mousedown to start the menu (so "deep clicks" work)
				iconContainer.addEventListener("mouseup", function(event) {
					if(_deepClickTimer)
					{
						window.clearTimeout(_deepClickTimer);
						_deepClickTimer = 0;
					}
				}); //end onmouseup event

				var deepClickHandler = function(event) {
					event.cancelBubble = true; //prevent default behavior
					event.preventDefault();
					_deepClickTimer = window.setTimeout(function() {

						Debug.log("Create Icon Menu");
						var menuItems = [];
						if(!isFolder) menuItems.push("Open and Maximize Window");
						menuItems.push("Open in New Browser Tab");
						if(!isFolder) menuItems.push("Open and Tile All Windows");

						var menuItemHandlers = [];
						if(!isFolder) menuItemHandlers.push(
										"Desktop.desktop.addWindow(\""+ subtext + "\",\"" + ""
										+ "\",\"" + linkurl + "\","+uniqueWin+",2);"); // 2 for maximize
						menuItemHandlers.push("Desktop.openNewBrowserTab(\""+ subtext + "\",\"" + ""
										+ "\",\"" + linkurl + "\","+uniqueWin+");");
						if(!isFolder) menuItemHandlers.push(
										"Desktop.desktop.addWindow(\""+ subtext + "\",\"" + ""
										+ "\",\"" + linkurl + "\","+uniqueWin+",1);"); // 1 for tile

						Debug.log("createEditTableMenu()");
						SimpleContextMenu.createMenu(
								menuItems,
								menuItemHandlers,
								"DesktopIconContextMenu",		//element ID
								event.pageX-1,event.pageY-1, 	//top left position
								Desktop.desktop.dashboard.getDefaultDashboardColor(), 	//primary color
								"white"				//secondary color
						);

					},500); //end timeout handler

				}; //end deepClickHandler event

				//FIXME ... debug touchstart on android to block browser context
				//			iconContainer.addEventListener("touchstart", function(event) {
				//				event.preventDefault();
				//
				//				deepClickHandler(event);
				//				return false;
				//			});
				iconContainer.addEventListener("mousedown",	deepClickHandler);
			
			} //end icon/folder context menu adding

			_iconsElement.appendChild(iconContainer); //add to desktop icon element

			++_numOfIcons; //maintain icon count

			//reset icon arrangement based on _numOfIcons
			if(_numOfIcons > 1)
			{
				{ //get rid of all clearDivs
					var cdArr;
					while((cdArr = _iconsElement.getElementsByClassName("iconsClearDiv")) &&
							cdArr.length)
						cdArr[0].parentNode.removeChild(cdArr[0]);
				}

				var newLine = Math.ceil((-1 + Math.sqrt(_numOfIcons*8+1))/2);
				var newLineOff = newLine;

				var currChild = _iconsElement.childNodes[0];
				for(var i=0;i<_numOfIcons;++i) {
					if(i == newLine) { //add new line before currChild
						div = document.createElement("div");
						div.setAttribute("id", "clearDiv");
						div.setAttribute("class", "iconsClearDiv");
						_iconsElement.insertBefore(div,currChild);
						newLine += --newLineOff; //update new line index
					}
					currChild = currChild.nextSibling; //get next child
				}
			}
		} //end this.addIcon()

		//=====================================================================================
		//this.openFolder ~~
		//	this version is called from desktop icons
		//		it opens up the div content at a position
		//	while openSubFolder is called by subfolder icons
		//		it navigates to the next level folder
		//	after the div is displayed openFolder makes use of openSubFolder.
		this.openFolder = function(x,y,folderName) {

			this.closeFolder(); //close any open folders

			_iconInFolderWasClicked = false; //reset for new folder

			var div = document.createElement("div");
			div.setAttribute("class", "DesktopIcons-folderDiv");
			div.style.padding = "0 5px 5px 12px";
			div.style.backgroundColor = DesktopContent.getDefaultWindowColor();//Desktop.desktop.defaultWindowFrameColor;
			div.style.position = "absolute";
			div.style.width = (300) + "px";
			div.style.left = (x) + "px";
			div.style.top = (y) + "px";
			//each mouse up events.. because mouseup on desktop closes folder
			div.onmouseup = function(event) {event.stopPropagation();};
			this.iconsElement.appendChild(div);
			_openFolderElement = div;

			div = document.createElement("div");
			//div.style.width = 300 + "px";
			div.style.height = 250 + "px";
			div.style.position = "relative";
			_openFolderElement.appendChild(div);
			_openFolderElement = div;

			this.openSubFolder(folderName);
		} //end this.openFolder()

		//=====================================================================================
		//this.openSubFolder ~~
		//	folderArray is a list of folder and icon objects
		this.openSubFolder = function(folderName) {

			//handle dot dots "../" to go back in path
			//	manipulate _openFolderPath, _openFolderPtr, and folderName

			if(folderName.indexOf("../") >= 0)
			{
				var folderSplit = _openFolderPath.split('/');
				var fullDepth = 0;
				//get depth
				for(var i=0;i<folderSplit.length;++i)
					if(folderSplit[i] != "") ++fullDepth;
				var backPathCount = 1;
				while(folderName.indexOf("../",backPathCount*3) >= 0) ++backPathCount;

				Debug.log("fullDepth " + fullDepth);
				Debug.log("backPathCount " + backPathCount);

				fullDepth -= backPathCount; //new depth
				_openFolderPtr = this.folders; //reset folder Ptr
				_openFolderPath = "/"; //reset folder path
				//repurpose backPathCount to count aggregate depth
				for(var i=0,backPathCount=0;backPathCount<fullDepth && i<folderSplit.length;++i)
					if(folderSplit[i] != "")
					{
						_openFolderPtr = _openFolderPtr[0][folderSplit[i]];
						_openFolderPath += folderSplit[i] + "/";
						++backPathCount;
					}

				Debug.log("_openFolderPath " + _openFolderPath);
				Debug.log("folderName " + folderName);
			}
			else if(folderName != ".") //normal subfolder handling (if not "stay here")
			{
				_openFolderPath += "/" + folderName;
				if(_openFolderPtr)
					_openFolderPtr = _openFolderPtr[0][folderName];
				else
					_openFolderPtr = this.folders[0][folderName];
			}

			Debug.log("_openFolderPath = " + _openFolderPath);
			// console.log(_openFolderPtr);

			if(!_openFolderPtr) {Debug.log("Should never happen??!"); return;}//throw("What");
			//if(!_openFolderPtr) this.resetWithPermissions = function(_permissions);

			var noMultiSelect = true; // true or false (false for multiselect functionality)
			var maintainPreviousSelections = false; //true or false (true means redraw select box using the js array selects left over from the last time this box was drawn using the same element id)


			var vals = [];//["One little piggy","two little piggies","three little piggies","one","two","three"];
			var keys = [];//["one","two","three","one","two","three"];
			var types = [];//["number","numbers","numbers","one","two","three"];
			var imgURLs = [];


			//show folders first, then icons

			//subfolders
			var subfolders = Object.keys(_openFolderPtr[0]);
			for(var i=0;i<subfolders.length;++i)
			{
				vals.push(subfolders[i]);
				types.push("folder");
				keys.push(i);

				imgURLs.push("/WebPath/images/iconImages/" +
						"icon-Folder.png");
			}
			//then icons
			//Icon object array (0-subtext, 1-altText, 2-linkurl, 3-uniqueWin, 4-picfn)
			for(var i=0;i<_openFolderPtr[1].length;++i)
			{
				vals.push(_openFolderPtr[1][i][0]);
				types.push("icon");
				keys.push(i);

				if(_openFolderPtr[1][i][4] != "0" &&
						_openFolderPtr[1][i][4] != "DEFAULT" &&
						_openFolderPtr[1][i][4] != "") //if icon image
				{

					if(_openFolderPtr[1][i][4][0] != '/')
						imgURLs.push("/WebPath/images/iconImages/" +
								_openFolderPtr[1][i][4]);
					else
						imgURLs.push(_openFolderPtr[1][i][4]);
				}
				else
					imgURLs.push("=" + _openFolderPtr[1][i][1]);
			}

			//make link title
			var str = "";
			var pathSplit = _openFolderPath.split("/");

			str += "/";
			var navPath;

			//count depth first
			var folderDepth = 0;
			for(var i=0;i<pathSplit.length;++i)
				if(pathSplit[i] != "") ++folderDepth;
			Debug.log("folderDepth " + folderDepth);

			var subfolderCount = 0;
			for(var i=0;i<pathSplit.length;++i)
			{
				if(pathSplit[i] == "") continue; //skip empty

				navPath = "";
				for(var j=0;j<folderDepth-i;++j)
					navPath += "../";
				if(navPath == "") navPath = "."; //already here


				Debug.log("navPath " + navPath);
				++subfolderCount;

				//need to do .. .. depending on depth
				str += "<a href='#' onclick='Desktop.desktop.icons.openSubFolder(\"" +
						navPath + "\");'>" +
						pathSplit[i] + "</a>/";
				Debug.log(str);

			}

			//write to a particular div
			//var el1 = document.getElementById('box1Div');
			MultiSelectBox.createSelectBox(_openFolderElement,
					"DesktopFolderMultiSelectBox",
					str,
					vals,keys,types,
					"Desktop.desktop.icons.clickFolderContents",
					noMultiSelect,
					0, //"Desktop.desktop.icons.mouseOverFolderContents"
					imgURLs,
					"Desktop.desktop.icons.mouseDownFolderContents",
					"Desktop.desktop.icons.mouseUpFolderContents",
					0,0, //requireCtrlMultiClick,titles,
					"Desktop.desktop.icons.mouseMoveFolderContents");
			MultiSelectBox.initMySelectBoxes(!maintainPreviousSelections);
		} //end this.openSubFolder()

		//=====================================================================================
		//this.closeFolder ~~
		this.closeFolder = function() {
			//Debug.log("Close folder");
			try
			{
				if(_openFolderElement)
					_openFolderElement.parentNode.parentNode.removeChild(_openFolderElement.parentNode);
			}
			catch(e)
			{
				Debug.log("Ignoring close folder error: " + e);
			}
			_openFolderElement = 0;
			_openFolderPath = ""; //clear
			_openFolderPtr = undefined; //clear
		} //end this.closeFolder()
		//=====================================================================================
		//this.isFolderOpen ~~
		this.isFolderOpen = function() { return _openFolderElement; }
		//=====================================================================================
		//this.wasFolderIconClicked ~~
		this.wasFolderIconClicked = function() { return _iconInFolderWasClicked; }

		//=====================================================================================
		//this.clickFolderContents ~~
		this.clickFolderContents = function(el)
		{
			var i = MultiSelectBox.getSelectedIndex(el);
			var selArr = MultiSelectBox.getSelectionArray(el);
			var val = el.textContent;
			var type = el.getAttribute("type-value");
			var key = el.getAttribute("key-value")|0;

			Debug.log("Clicked Folder Content item",val);

			MultiSelectBox.dbg("Chosen element index:",i,
					" value:",val,
					" key:",key,
					" type:",type);

			if(type == "icon")
			{
				var target = _openFolderPtr[1][key];
				//Icon object array (0-subtext, 1-altText, 2-linkurl, 3-uniqueWin, 4-picfn)

				//add folder path - to name
				var folderPath = _openFolderPath.length > 1?(_openFolderPath + "/"):"";
				Desktop.desktop.addWindow(folderPath + target[0],"",target[2],target[3]);

				//this.closeFolder();
				_iconInFolderWasClicked = true; //set flag to facilitate closing folder
			}
			else
				this.openSubFolder(val);
		} //end this.clickFolderContents()

		//=====================================================================================
		//this.mouseMoveFolderContents ~~
		this.mouseMoveFolderContents = function(el,event)
		{
			event.stopPropagation();
			//clear timer to keep folder popup open a bit longer
			if(Desktop._openFolderTimer)
			{
				window.clearTimeout(Desktop._openFolderTimer);
				Desktop._openFolderTimer = 0;
				Debug.log("Canceling close folder timer due to user movement.");
			}
			return false;
		} //end this.mouseMoveFolderContents()

		//=====================================================================================
		//this.mouseUpFolderContents ~~
		//	this functionality should mirror addIcon()
		this.mouseUpFolderContents = function(el,event)
		{
			if(this.deepClickTimer)
			{
				window.clearTimeout(this.deepClickTimer);
				this.deepClickTimer = 0;
			}
		} //end this.mouseUpFolderContents()

		//=====================================================================================
		//this.mouseDownFolderContents ~~
		//	this functionality should mirror local function
		//	deepClickHandler() in addIcon()
		this.mouseDownFolderContents = function(el,event)
		{
			var i = MultiSelectBox.getSelectedIndex(el);
			var selArr = MultiSelectBox.getSelectionArray(el);
			var val = el.textContent;
			var type = el.getAttribute("type-value");
			var key = el.getAttribute("key-value")|0;

			MultiSelectBox.dbg("mouseDownFolderContents Chosen element index:",i,
					" value:",val,
					" key:",key,
					" type:",type);

			if(type != "icon" && type != "folder") return;
			let isFolder = type == "folder";

			//only deep click functionality for icons and, now, folders

			var subtext, linkurl, uniqueWin;
			if(isFolder)
			{
				subtext = val;
				linkurl = "folder";
				uniqueWin = 1;

				//add folder path - to name
				let folderPath = _openFolderPath.length > 1?(_openFolderPath + "/"):"";
				Debug.logv({folderPath});
				if(folderPath)
					subtext = folderPath.substr(1) + subtext; //skip initial '/'
			}
			else
			{
				var target = _openFolderPtr[1][key];
				//Icon object array (0-subtext, 1-altText, 2-linkurl, 3-uniqueWin, 4-picfn)
				subtext = target[0];
				linkurl = target[2];
				uniqueWin = target[3];
			}


			//========================
			//	this functionality should mirror local function
			//	deepClickHandler() in addIcon() L483 above

			event.cancelBubble = true; //prevent default behavior
			event.preventDefault();
			this.deepClickTimer = window.setTimeout(function() {

				Debug.log("Create Icon Menu");
				var menuItems = [];
				if(!isFolder) menuItems.push("Open and Maximize Window");
				menuItems.push("Open in New Browser Tab");
				if(!isFolder) menuItems.push("Open and Tile All Windows");

				var menuItemHandlers = [];
				if(!isFolder) menuItemHandlers.push(
								"Desktop.desktop.addWindow(\""+ subtext + "\",\"" + ""
								+ "\",\"" + linkurl + "\","+uniqueWin+",2);"); // 2 for maximize
				menuItemHandlers.push("Desktop.openNewBrowserTab(\""+ subtext + "\",\"" + ""
								+ "\",\"" + linkurl + "\","+uniqueWin+");");
				if(!isFolder) menuItemHandlers.push(
								"Desktop.desktop.addWindow(\""+ subtext + "\",\"" + ""
								+ "\",\"" + linkurl + "\","+uniqueWin+",1);"); // 1 for tile

				Debug.log("createEditTableMenu()");
				SimpleContextMenu.createMenu(
						menuItems,
						menuItemHandlers,
						"DesktopIconContextMenu",		//element ID
						event.pageX-1,event.pageY-1, 	//top left position
						Desktop.desktop.dashboard.getDefaultDashboardColor(), 	//primary color
						"white"				//secondary color
				);

			},500); //end timeout handler

		} //end this.mouseDownFolderContents()

		//------------------------------------------------------------------
		//handle class construction ----------------------
		//------------------------------------------------------------------

		this.iconsElement = _iconsElement = document.createElement("div");
		this.iconsElement.setAttribute("class", "DesktopIcons");
		this.iconsElement.setAttribute("id", "DesktopIcons");
		this.iconsElement.style.position = "absolute";
		this.iconsElement.style.zIndex = z;



		Debug.log("Desktop Icons created",Debug.LOW_PRIORITY);
	} // end of createIcons()

}
