//Hud "class" for ViewerRoot


ViewerRoot.createHud = function() {


	//"memeber" functions
	//	this.handleWindowResize()
	//	this.checkboxUpdate(i)
	//	this.handlerRefreshPeriodChange(v)
	//	this.radioSelect(i)
	//	this.handleDirContents(req)
	//	handleUserPreferences(req)
	//	findDir(path,currDir,currPath)
	//	redrawDirectoryDisplay(currDir,tabSz,path,str)
	//	this.collapseDirectory(dirPath)
	//	this.changeDirectory(dirPath)
	//	animateDropDown()
	//	mouseOverDropDown()
	//	mouseOutDropDown(event)
	//	this.toggleControls()
	//	this.toggleAdminControls(type, path)
	//	this.makeConfigDir()
	// 	this.saveConfigFile()
	// 	this.removeConfigPath()
	//	this.adminControlsReqHandler()
	//	this.popUpVerification()
	//	this.clearPopUpVerification()

	var hudMouseOverDiv;
	var animationTargetTop, isDropDownAnimating, isDropDownDown;

	var hudDirBrowserDiv;
	var hudAdminSettingsDiv;
	var hudPopUpDiv = 0;

	var displayingControls = false;
	var PRE_MADE_ROOT_CFG_DIR = "Pre-made Views";
	var adminControlsPath;

	var DIR_BRW_HDR_MAX_SIZE = 30;
	var DIR_DISP_TAB_SZ = 16;
	var TUPLE_TYPE = 0, TUPLE_NAME = 1, TUPLE_CONTENT = 2, TUPLE_PARENT = 3;
	var TUPLE_TYPE_FILE = 1, TUPLE_TYPE_DIR = 1<<1, TUPLE_TYPE_DIR_EXPANDED = 1<<2; //bit mask
	var dirStruct = [[TUPLE_TYPE_DIR,"",0,0]]; //always start with root existing and define from there
									//structure is embedded tuples [<file type>,<name>,<embedded directory contents> or <root file content> for file, <parent ptr>]
	var currDirPtr = dirStruct[0]; //pointer to the directory level that is currently displayed

	this.handleWindowResize = function() {
		//Debug.log("ViewerRoot Hud handleWindowResize");

		if(ViewerRoot.hudAutoHide)
			this.hudMouseOverDiv.style.left = window.innerWidth - this.hudMouseOverDiv.offsetWidth - ViewerRoot.HUD_MARGIN_RIGHT + "px";
		else
		{
			this.hudMouseOverDiv.style.left = window.innerWidth - this.hudMouseOverDiv.offsetWidth + "px";
			this.hudMouseOverDiv.style.top = -15 + "px";
		}

		hudDirBrowserDiv.style.width = this.hudDiv.offsetWidth - 45 + "px";
		hudDirBrowserDiv.style.height = window.innerHeight - 190 + "px";

		if(ViewerRoot.userPermissions >= ViewerRoot.ADMIN_PERMISSIONS_THRESHOLD)
			document.getElementById("ViewerRoot-hudControlsIcon").style.display = "block";
		else
			document.getElementById("ViewerRoot-hudControlsIcon").style.display = "none";
	} //end handleWindowResize()

	//should match response by handleUserPreferences()
	this.checkboxUpdate = function(i) {
		var chk;
		if (i == 3) {
			chk = document.getElementById("hardRefreshCheckbox");
			ViewerRoot.hardRefresh = chk.checked; 	//hard refresh
			console.log("checkboxUpdate: hardRefresh: " + chk.checked);
			DesktopContent.XMLHttpRequest("Request?RequestType=setUserPreferences&hardRefresh="+
					(chk.checked?1:0),
												"",
												"" /*reqHandler*/,
												0 /*reqParam*/,
												0 /*progressHandler*/,
												0 /*callHandlerOnErr*/,
												true /*doNoShowLoadingOverlay*/);
		}
		else
		{
			chk = document.getElementById("hudCheckbox" + i);
			Debug.log("ViewerRoot Hud checkboxUpdate " + i + "=" + chk.checked);

			if(i==0)
			{
				ViewerRoot.autoRefreshDefault = chk.checked; 	//auto refresh

				DesktopContent.XMLHttpRequest("Request?RequestType=setUserPreferences&autoRefresh="+
						(chk.checked?1:0),
						"",
						""/*reqHandler*/,
											0 /*reqParam*/,
											0 /*progressHandler*/,
											0 /*callHandlerOnErr*/,
											true /*doNoShowLoadingOverlay*/);
			}
			else if(i==1)
			{
				ViewerRoot.hudAutoHide = chk.checked; 				//auto hide
				ViewerRoot.handleWindowResize();

				DesktopContent.XMLHttpRequest("Request?RequestType=setUserPreferences&autoHide="+
						(chk.checked?1:0),
												"",
												""/*reqHandler*/,
												0 /*reqParam*/,
												0 /*progressHandler*/,
												0 /*callHandlerOnErr*/,
												true /*doNoShowLoadingOverlay*/);
			}
			else if(i==2)
			{
				ViewerRoot.pauseRefresh = chk.checked; 	//pause auto refresh

				//reset auto refresh array with re-activation of auto refresh
				//	just in case...
				if(!ViewerRoot.pauseRefresh) ViewerRoot.autoRefreshMatchArr = [];
			}

		}

	} //end checkboxUpdate()

	this.handlerRefreshPeriodChange = function(v) {
		v = parseInt(v);
		if(!v || v < 100) v = 100;
		if(v > 9999999) v = 9999999;
		Debug.log("ViewerRoot Hud handlerRefreshPeriodChange " + v);
		document.getElementById("hudAutoRefreshPeriod").value = v;
		ViewerRoot.autoRefreshPeriod = v;
		DesktopContent.XMLHttpRequest("Request?RequestType=setUserPreferences&autoRefreshPeriod="+
				ViewerRoot.autoRefreshPeriod,
												"",
												""/*reqHandler*/,
												0 /*reqParam*/,
												0 /*progressHandler*/,
												0 /*callHandlerOnErr*/,
												true /*doNoShowLoadingOverlay*/);
		if(ViewerRoot.autoRefreshTimer) window.clearInterval(ViewerRoot.autoRefreshTimer);
		ViewerRoot.autoRefreshTimer = window.setInterval(ViewerRoot.autoRefreshTick,
			ViewerRoot.autoRefreshPeriod);
	} //end handlerRefreshPeriodChange()

	this.radioSelect = function(i) {
		Debug.log("ViewerRoot Hud radioSelect " + i);
		ViewerRoot.nextObjectMode = i;

		DesktopContent.XMLHttpRequest("Request?RequestType=setUserPreferences&radioSelect="+i);
	} //end radioSelect()

	this.handleDirContents = function(req) {
		Debug.log("ViewerRoot Hud handleDirContents " + req.responseText);

		var path = DesktopContent.getXMLValue(req,'path');
		if(!path)
		{
			Debug.log("ViewerRoot Hud handleDirContents no path returned",Debug.HIGH_PRIORITY);
			return;
		}

		//add results into directory structure
		//var paths = path.split("/");
		//Debug.log("ViewerRoot Hud handleDirContents " + paths.length + ":" + paths);

		//find path
		var baseDir = findDir(path);
		if(!baseDir)
		{
			Debug.log("ViewerRoot Hud handleDirContents path not found");
			return;
		}
		//Debug.log("ViewerRoot Hud handleDirContents baseDir " + baseDir);


		baseDir[TUPLE_CONTENT] = []; //clear all current content
		baseDir[TUPLE_TYPE]	|= TUPLE_TYPE_DIR_EXPANDED;		//expand the directory

		var dirs = req.responseXML.getElementsByTagName("dir");
		var files = req.responseXML.getElementsByTagName("file");

		for(var i=0;i<dirs.length;++i) //add dirs
			baseDir[TUPLE_CONTENT][baseDir[TUPLE_CONTENT].length] = [TUPLE_TYPE_DIR,dirs[i].getAttribute("value").replace(/[\/]+/g, ''),0,baseDir];

		for(var i=0;i<files.length;++i) //add files
			baseDir[TUPLE_CONTENT][baseDir[TUPLE_CONTENT].length] = [TUPLE_TYPE_FILE,files[i].getAttribute("value").replace(/[\/]+/g, ''),0,baseDir];

		//Debug.log("ViewerRoot Hud handleDirContents baseDir " + baseDir);

		redrawDirectoryDisplay();
	} //end handleDirContents()

	//set user preferences based on server response
	//	should match response by this.checkboxUpdate() and this.radioSelect()
	var handleUserPreferences = function(req) {
		Debug.log("handleUserPreferences");
		var radioSelect = DesktopContent.getXMLValue(req,'radioSelect');
		if(radioSelect && radioSelect != "")
		{
			Debug.log("setting radioSelect=" + (radioSelect|0));
			ViewerRoot.nextObjectMode = radioSelect|0;
			document.getElementById("newRootObjectModeRadio" + (radioSelect|0)).checked = true;
		}
		var autoRefresh = DesktopContent.getXMLValue(req,'autoRefresh');
		if(autoRefresh && autoRefresh != "")
		{
			Debug.log("setting autoRefresh=" + (autoRefresh|0));
			var chk = document.getElementById("hudCheckbox" + 0);
			chk.checked = (autoRefresh|0)?true:false;
			Debug.log("setting autoRefresh=" + chk.checked);
			ViewerRoot.autoRefreshDefault = chk.checked; 	//auto refresh
		}
		var autoHide = DesktopContent.getXMLValue(req,'autoHide');
		if(autoHide && autoHide != "")
		{
			Debug.log("setting autoHide=" + (autoHide|0));
			var chk = document.getElementById("hudCheckbox" + 1);
			chk.checked = (autoHide|0)?true:false;
			Debug.log("setting autoHide=" + chk.checked);
			ViewerRoot.hudAutoHide = chk.checked; 	//auto hide
			ViewerRoot.handleWindowResize();
		}
		var hardRefresh = DesktopContent.getXMLValue(req,'hardRefresh');
		if(hardRefresh !== undefined && hardRefresh !== "")
		{
			hardRefresh = hardRefresh|0; //force to integer
			Debug.log("setting hardRefresh=" + hardRefresh);
			ViewerRoot.hardRefresh = hardRefresh; 	//hard refresh
		}
		var autoRefreshPeriod = DesktopContent.getXMLValue(req,'autoRefreshPeriod') | 0;
		if(autoRefreshPeriod)
		{
			Debug.log("setting autoRefreshPeriod=" + autoRefreshPeriod);
			if(autoRefreshPeriod < 100) autoRefreshPeriod = 100;
			if(autoRefreshPeriod > 9999999) autoRefreshPeriod = 9999999;
			ViewerRoot.autoRefreshPeriod = autoRefreshPeriod; 	//autoRefreshPeriod
			document.getElementById("hudAutoRefreshPeriod").value = ViewerRoot.autoRefreshPeriod;
		}
	} // end handleUserPreferences()

	//return tuple to path, if not found return 0
	//	recursive function
	// 	calling syntax is
	//			var baseDir = findDir(path);
	var findDir = function(path,currDir,currPath) {
		if(!currDir)
		{
			currDir = dirStruct[0];
			currPath = currDir[TUPLE_NAME] + "/";
			//Debug.log("ViewerRoot Hud findDir " + currPath);
			//Debug.log("ViewerRoot Hud findDir path to find " + path);
		}

		if(currDir[TUPLE_TYPE] & TUPLE_TYPE_DIR == 0) return 0; //current path is not a directory, path not found
		if(path == currPath) return currDir; //path is found
		if(!currDir[TUPLE_CONTENT]) return 0;	//no structure to current path, path not found

		//traverse directory content
		var retVal = 0;
		for(var i=0;i<currDir[TUPLE_CONTENT].length;++i)
		{
			if(currDir[TUPLE_CONTENT][i][TUPLE_TYPE] & TUPLE_TYPE_DIR == 0) continue; //child is not a directory so skip

			retVal = findDir(path,currDir[TUPLE_CONTENT][i],currPath + currDir[TUPLE_CONTENT][i][TUPLE_NAME] + "/");
			if(retVal) return retVal;
		}
	}

	//return complete path of tuplePtr, return "/" if failure
	var getPath = function(tuplePtr) {
		if(!tuplePtr) return "/";
		var path = tuplePtr[TUPLE_NAME] + "/";
		while(tuplePtr[TUPLE_PARENT])
		{
			path = tuplePtr[TUPLE_PARENT][TUPLE_NAME] + "/" + path;
			tuplePtr = tuplePtr[TUPLE_PARENT];
		}
		return path;
	} //end findDir()


	//draw for current directory, currDir, as starting level
	//	recursive function
	//	calling syntax redrawDirectoryDisplay(); //will redraw current directory
	var redrawDirectoryDisplay = function(currDir,tabSz,path,str) {

		var applyStr = false;
		var locPath;
		var dirClr;
		if(!currDir) //init first time
		{
			hudDirBrowserDiv.innerHTML = ""; //clear all
			str = "";
			currDir = currDirPtr;
			tabSz = 0;
			path = getPath(currDirPtr);
			applyStr = true;
			//Debug.log("ViewerRoot Hud redrawDirectoryDisplay FIRST path " + path);

			locPath = path.length>DIR_BRW_HDR_MAX_SIZE?("..." + path.substr(path.length-DIR_BRW_HDR_MAX_SIZE+3)):path;
			str += "<div id='ViewerRoot-hudDirBrowser-header'>";
			str += "<a title='Refresh\n" + path + "'  style='float:left'  href='Javascript:ViewerRoot.hud.changeDirectory(\"" +
				path + "\");'>" + locPath + "</a>";
			str += "<a title='Change to Parent Directory' style='float:right' href='Javascript:ViewerRoot.hud.changeDirectory(\"" +
				getPath(currDirPtr[TUPLE_PARENT]) + "\");'> cd .. </a>";
			str += "</div>";
			str += "<div style='clear:both'></div>";
		}

		for(var i=0;currDir[TUPLE_CONTENT] && i<currDir[TUPLE_CONTENT].length;++i)
		{
			locPath = path + currDir[TUPLE_CONTENT][i][TUPLE_NAME];
			if(currDir[TUPLE_CONTENT][i][TUPLE_TYPE] & TUPLE_TYPE_DIR) locPath += "/"; //if directory add slash

			str += "<div class='ViewerRoot-hudDirBrowser-item' style='margin-left:" + tabSz + "px;'>"; //item container

			dirClr = currDir[TUPLE_CONTENT][i][TUPLE_NAME].indexOf(".root") >= 0?"#B9E6E6":"gray";
			if(currDir[TUPLE_CONTENT][i][TUPLE_TYPE] & TUPLE_TYPE_DIR_EXPANDED)  //dir currently expanded, so action is to minimize it
			{
				str += "<a title='Collapse Directory\n" + locPath + "' href='Javascript:ViewerRoot.hud.collapseDirectory(\"" + locPath + "\");'> + </a> ";

				str += "<a title='Change Directory\n" + locPath + "' style='color:" + dirClr + "' href='Javascript:ViewerRoot.hud.changeDirectory(\"" + locPath + "\");'>" + currDir[TUPLE_CONTENT][i][TUPLE_NAME] + "</a>";
			}
			else if(currDir[TUPLE_CONTENT][i][TUPLE_TYPE] & TUPLE_TYPE_DIR)  //dir currently minimized, so action is to expand it
			{
				str += "<a title='Expand Directory\n" + locPath + "' style='color:gray' href='Javascript:ViewerRoot.getDirectoryContents(\"" + locPath + "\");'> - </a> ";

				str += "<a title='Change Directory\n" + locPath + "' style='color:" + dirClr + "' href='Javascript:ViewerRoot.hud.changeDirectory(\"" + locPath + "\");'>" + currDir[TUPLE_CONTENT][i][TUPLE_NAME] + "</a>";
			}
			else if(currDir[TUPLE_CONTENT][i][TUPLE_TYPE] & TUPLE_TYPE_FILE)	//file, so action is to launch it
			{
				if(locPath.indexOf(".root") > 0) //root file
				{
					str += "<a title='Open Root File\n" + locPath + "' href='Javascript:ViewerRoot.rootReq(\"" + locPath + "\");'>" +
							"<img style='margin:2px 2px -2px 0;' src='/WebPath/js/visualizers_lib/ViewerRoot_lib/img/histo.png'>";
					str += currDir[TUPLE_CONTENT][i][TUPLE_NAME] + "</a>";
				}
				else if(locPath.indexOf(".rcfg") > 0) //root config file
				{
					str += "<a title='Open Root File\n" + locPath + "' href='Javascript:ViewerRoot.rootConfigReq(\"" + locPath + "\");'>" +
							"<img style='margin:2px 2px -2px 0;' src='/WebPath/js/visualizers_lib/ViewerRoot_lib/img/histo3d.png'>";
					str += currDir[TUPLE_CONTENT][i][TUPLE_NAME] + "</a>";
				}
				else
					Debug.log("ViewerRoot Hud redrawDirectoryDisplay unknown file extension");
			}
			else
				alert("Impossible DIRECTORY error!! Notify admins");

			str += "</div>"; //close item container

			//recursive call
			if(currDir[TUPLE_CONTENT][i][TUPLE_TYPE] & TUPLE_TYPE_DIR_EXPANDED)
				str = redrawDirectoryDisplay(currDir[TUPLE_CONTENT][i],tabSz+DIR_DISP_TAB_SZ,
						path + currDir[TUPLE_CONTENT][i][TUPLE_NAME] + "/",str);
		}

		//if admin pre-made view directory, add ability to MAKE directory or SAVE new premade view
		if(ViewerRoot.userPermissions >= ViewerRoot.ADMIN_PERMISSIONS_THRESHOLD &&
				path.indexOf(PRE_MADE_ROOT_CFG_DIR) >= 0)
		{
			Debug.log("ViewerRoot Hud redrawDirectoryDisplay path " + path);

			var iconArr = ["folderopen","page","remove"];//,"refresh"];
			var captionArr = ["Make New Directory","Save New View","Delete Pre-made File/Folder!"];//,"Toggle Hard/Soft Refresh"];
			for(var i=0;i<captionArr.length;++i)
			{
				str += "<div class='ViewerRoot-hudDirBrowser-item' style='margin-left:" + tabSz + "px;'>"; //item container
				str += "<a style='color:gray' title='Admin action: " + captionArr[i] +
						"' href='Javascript:ViewerRoot.hud.toggleAdminControls(" + i + ",\"" + path + "\");'>" +
					"<img style='margin:2px 2px -2px 0;' src='/WebPath/js/visualizers_lib/ViewerRoot_lib/img/" + iconArr[i] + ".gif'>";
				str += captionArr[i] + "</a>";
				str += "</div>"; //close item container
			}
		}

		if(applyStr)
			hudDirBrowserDiv.innerHTML = str;
		else
			return str;
	} //end redrawDirectoryDisplay()


	//minimize directory is done by removing the structure from dirPath
	this.collapseDirectory = function(dirPath) {
		Debug.log("ViewerRoot Hud collapseDirectory  " + dirPath);

		var baseDir = findDir(dirPath);

		baseDir[TUPLE_CONTENT] = 0; //clear array to 0
		baseDir[TUPLE_TYPE] &= ~TUPLE_TYPE_DIR_EXPANDED; //unset dir expanded flag

		redrawDirectoryDisplay(); //redraw current directory
	} //end collapseDirectory()

	this.changeDirectory = function(dirPath) {
		Debug.log("ViewerRoot Hud changeDirectory  " + dirPath);
		currDirPtr = findDir(dirPath);
		ViewerRoot.getDirectoryContents(dirPath);
	} // end changeDirectory()


	// animateDropDown ~~
	var animateDropDown = function() {
		var dir = (animationTargetTop - hudMouseOverDiv.offsetTop > 0)? 1: -1;

		var tmpTop = hudMouseOverDiv.offsetTop + dir*ViewerRoot.HUD_DROP_DOWN_SPEED;
		if(Math.abs(tmpTop - animationTargetTop) <= ViewerRoot.HUD_DROP_DOWN_SPEED) //done
		{
			hudMouseOverDiv.style.top = animationTargetTop + "px";
			isDropDownAnimating = false;
			return;
		}
		//else still going towards target
		hudMouseOverDiv.style.top = tmpTop + "px";
		window.setTimeout(animateDropDown,30);
	} //end animateDropDown()

	// mouseOverDropDown ~~
	var mouseOverDropDown = function() {

		if(isDropDownAnimating) return; //do nothing if animating currently

		if(!ViewerRoot.hudAutoHide) return; //if not autohide lock size

		if(!isDropDownDown) //start animation
		{
			isDropDownDown = true;
			isDropDownAnimating = true;
			animationTargetTop = -15;
			window.setTimeout(animateDropDown,30);
		}
	} //end mouseOverDropDown()

	// mouseOutDropDown ~~
	var mouseOutDropDown = function(event) {
		if(isDropDownAnimating) return; //do nothing if animating currently

		if(event)
		{
			var e = event.toElement || event.relatedTarget;
			while(e)	//if moving within drop down menu ignore
			{
				if(e == this) return;
				e = e.parentNode;
			}
		}

		if(!ViewerRoot.hudAutoHide) return ViewerRoot.hud.handleWindowResize(); //if not autohide lock size

		if(isDropDownDown) //start animation
		{
			isDropDownDown = false;
			isDropDownAnimating = true;
			animationTargetTop = 15 - hudMouseOverDiv.offsetHeight;
			window.setTimeout(animateDropDown,30);
		}
	} //end mouseOutDropDown()

	//types
	this.toggleControls = function() {
		displayingControls = !displayingControls;
		Debug.log("ViewerRoot Hud toggleControls  " + displayingControls);

		if(displayingControls) //show admin controls in browser window
		{
			hudDirBrowserDiv.innerHTML = ""; //clear all
			var str = "";
			if(ViewerRoot.hardRefresh)
				str += "<input type='checkbox' id='hardRefreshCheckbox' checked ";
			else
				str += "<input type='checkbox' id='hardRefreshCheckbox' ";
			str += "onchange='if(this.checked) ViewerRoot.hardRefresh = 1; else ViewerRoot.hardRefresh = 0; ViewerRoot.hud.checkboxUpdate(3);'>Hard Refresh";

			str += "<br><div id='hudAdminControlStatus'></div>";
			str += "<br>";
			str += "<a href='javascript:ViewerRoot.hud.toggleControls();' title='Return to ROOT Browser' " +
					"<u>Return to Browser</u></a>";
			hudDirBrowserDiv.innerHTML = str;
		}
		else //return to showing current directory
			ViewerRoot.hud.changeDirectory(getPath(currDirPtr));	//return and refresh directory contents from server
	} //end this.toggleControls()

	//types
	//	0 - make directory
	//  1 - save file
	//  2 - delete
	this.toggleAdminControls = function(type, path) {
		displayingControls = !displayingControls;
		Debug.log("ViewerRoot Hud toggleAdminControls  " + displayingControls);

		if(displayingControls) //show admin controls in browser window
		{
			Debug.log("ViewerRoot Hud toggleAdminControls  " + type + ": " + path);

			adminControlsPath = path;
			hudDirBrowserDiv.innerHTML = ""; //clear all

			var str = "";

			if(type == 0) //make directory
			{
				str += "Make a new ROOT Viewer<br>Configuration Directory<br>at path:<br><br>" + path + "<br>";
				str += "<input type='text' id='hudAdminControlField' onkeyup='document.getElementById(\"hudAdminControlStatus\").innerHTML=\"\";' size='20' value=''><br>";
				str += "<input type='button' onmouseup=\"ViewerRoot.hud.popUpVerification(" +
					"'Are you sure you want to create directory with name &quot;REPLACE&quot;?','ViewerRoot.hud.makeConfigDir');\" value='Make New Directory'>";
			}
			else if(type == 1) //new file
			{
				str += "Save a new ROOT Viewer<br>Configuration File for all users <br>based on the current view<br>at path:<br><br>" + path + "<br>";
				str += "<input type='text' id='hudAdminControlField' size='20' value=''><br>";

				str += "<div ><input type='checkbox' id='hudSaveFileRunWildCardCheckbox'>" +
					"<label for='hudSaveFileRunWildCardCheckbox' >" + "Use Wildcard Run #" + "</label></div>";

				str += "<input type='button' onmouseup=\"ViewerRoot.hud.popUpVerification(" +
					"'Are you sure you want to save a file with name &quot;REPLACE&quot;?','ViewerRoot.hud.saveConfigFile');\" value='Save New File'>";
			}
			else if(type == 2) //delete path
			{
				str += "Delete a ROOT Viewer<br>Configuration Directory or File<br>at path:<br><br>" + path + "<br>";
				str += "<input type='text' id='hudAdminControlField' onkeyup='document.getElementById(\"hudAdminControlStatus\").innerHTML=\"\";' size='20' value=''><br>";
				str += "<input type='button' onmouseup=\"ViewerRoot.hud.popUpVerification(" +
					"'Are you sure you want to delete file or directory with name &quot;REPLACE&quot;?','ViewerRoot.hud.removeConfigPath');\" value='Delete Path'><br>";

			}
			else
			{
				Debug.log("Unknown admin type " + type);
				throw("Unknown type?");
			}

			str += "<br><div id='hudAdminControlStatus'></div>";
			str += "<br>";
			str += "<a href='javascript:ViewerRoot.hud.toggleAdminControls();' title='Return to ROOT Browser' " +
					"<u>Return to Browser</u></a>";
			hudDirBrowserDiv.innerHTML = str;

		}
		else //return to showing current directory
			ViewerRoot.hud.changeDirectory(getPath(currDirPtr));	//return and refresh directory contents from server
	} //end toggleAdminControls()

	this.makeConfigDir = function() {
		var dir = document.getElementById('hudAdminControlField').value;
		Debug.log("ViewerRoot Hud makeConfigDir  " + dir);

		DesktopContent.XMLHttpRequest("Request?RequestType=rootAdminControls&cmd=mkdir", "path="+adminControlsPath+"&name="+dir, ViewerRoot.hud.adminControlsReqHandler,
												""/*reqHandler*/,
												0 /*reqParam*/,
												0 /*progressHandler*/,
												0 /*callHandlerOnErr*/,
												true /*doNoShowLoadingOverlay*/);

	} //end makeConfigDir()

	this.saveConfigFile = function() {

		//create file string based on current configuration
		if(ViewerRoot.numPositionsTiled < 1)
		{
			document.getElementById('hudAdminControlStatus').innerHTML = "You must have at least 1 Root object in your configuration to save it.";
			return;
		}

		var file = document.getElementById('hudAdminControlField').value;
		var wildcard = document.getElementById('hudSaveFileRunWildCardCheckbox').checked;

		var fileStr = "";

		fileStr += "<ROOT><DATA>";
		fileStr += "<numPositionsTiled>" + ViewerRoot.numPositionsTiled + "</numPositionsTiled>";
		fileStr += "<runNumWildcard>" + (wildcard?1:0) + "</runNumWildcard>";

		for(var i=0;i<ViewerRoot.rootElArr.length;++i)
		{
			fileStr += "<rootObjName>" + ViewerRoot.rootObjNameArr[i] + "</rootObjName>";
			fileStr += "<rootPos>" + ViewerRoot.rootPosArr[i] + "</rootPos>";
			fileStr += "<rootIsTransparent>" + (ViewerRoot.rootIsTransparentArr[i]?1:0) + "</rootIsTransparent>";
			fileStr += "<rootIsAutoRefresh>" + (ViewerRoot.rootIsAutoRefreshArr[i]?1:0) + "</rootIsAutoRefresh>";
		}

		fileStr += "</DATA></ROOT>";
		Debug.log("ViewerRoot Hud saveConfigFile fileStr  " + fileStr);

		DesktopContent.XMLHttpRequest("Request?RequestType=rootAdminControls&cmd=save",
				"path="+adminControlsPath+"&name="+file+"&config="+fileStr, ViewerRoot.hud.adminControlsReqHandler);
	} //end saveConfigFile()

	this.removeConfigPath = function() {

		var target = document.getElementById('hudAdminControlField').value;
		Debug.log("ViewerRoot Hud removeConfigPath  " + target);

		DesktopContent.XMLHttpRequest("Request?RequestType=rootAdminControls&cmd=delete", "path="+adminControlsPath+"&name="+target, ViewerRoot.hud.adminControlsReqHandler);
	} //end removeConfigPath()

	this.adminControlsReqHandler = function(req) {
		Debug.log("ViewerRoot Hud adminControlsReqHandler  " + req.responseText);

		var status = DesktopContent.getXMLValue(req,'status');

		if(status == "1") //success indicated
			ViewerRoot.hud.toggleAdminControls();
		else
			document.getElementById('hudAdminControlStatus').innerHTML = status;
	} //end adminControlsReqHandler()

	//popUpVerification ~~
	//	asks user if sure
	//	replace REPLACE in prompt with value
	this.popUpVerification = function(prompt, func) {
		//remove pop up if already exist
		if(hudPopUpDiv) hudPopUpDiv.parentNode.removeChild(hudPopUpDiv);

		var path = document.getElementById('hudAdminControlField').value;

		var ptrn = /^([a-zA-Z0-9_-]+)$/;
		if(path.length < 3 || !ptrn.test(path))
		{
			document.getElementById('hudAdminControlStatus').innerHTML = "Entry must be at least 3 characters and alpha-numeric with only underscores and dashes.";
			return;
		}

		//replace REPLACE
		prompt = prompt.replace(/REPLACE/g, path);

		var el = this.hudDiv;//document.getElementById("adminArea");
		hudPopUpDiv = document.createElement("div");
		hudPopUpDiv.setAttribute("class", "hudPopUpDiv");
		var str = "<div id='hudPopUpText'>" + prompt + "</div>" +
			"<input type='submit' onmouseup='ViewerRoot.hud.clearPopUpVerification(" + func + ");' value='Yes'> " +
			"&nbsp;&nbsp;&nbsp;" +
			"<input type='submit' onmouseup='ViewerRoot.hud.clearPopUpVerification();' value='Cancel'>";
		hudPopUpDiv.innerHTML = str;
		el.appendChild(hudPopUpDiv);
	}	//end popUpVerification()

	//clearPopUpVerification ~~
	//	call func after clearing, if exists
	this.clearPopUpVerification = function(func) {
		//remove pop up if already exist
		if(hudPopUpDiv) hudPopUpDiv.parentNode.removeChild(hudPopUpDiv);
		hudPopUpDiv = 0;
		if(func) func();
		else	//Action was cancelled by user
			document.getElementById('hudAdminControlStatus').innerHTML = "Action was cancelled by user!";
	}	//end clearPopUpVerification()

	hudMouseOverDiv = this.hudMouseOverDiv = document.createElement('div');
	hudMouseOverDiv.setAttribute("id", "ViewerRoot-hudMouseOver");//ViewerRoot.hudAutoHide?"ViewerRoot-hudMouseOver":"ViewerRoot-hudMouseOver-locked");
	hudMouseOverDiv.style.position = "absolute";
	hudMouseOverDiv.style.zIndex = 100;

	this.hudDiv = document.createElement('div');
	this.hudDiv.setAttribute("id","ViewerRoot-hud");// ViewerRoot.hudAutoHide?"ViewerRoot-hud":"ViewerRoot-hud-locked");




	//create content elements
	var str = "";
	str += "With new Root objects...<br>";

	var chkLabels = ["Auto-Refresh"];
	var chkDefaults = [""]; //"checked" for default true
	str += "<div style='float:right'>"
	for(var i=0;i<chkLabels.length;++i)
		str += "<input type='checkbox' id='hudCheckbox" + i + "' onchange='ViewerRoot.hud.checkboxUpdate(" + i +
					");' " + chkDefaults[i] + "><label for='hudCheckbox" + i + "' >" + chkLabels[i] + "</label>";
	str += "</div>";

	var radioLabels = ["Tile","Replace"]; //FIXME superimpose is broken in jsroot v5.9.0 and v7.9.0 usage of this gui, "Superimpose"];
	var radioDefault = ViewerRoot.nextObjectMode;
	for(var i=0;i<radioLabels.length;++i)
		str += "<input type='radio' id='newRootObjectModeRadio" + i + "' " + (i==radioDefault?"checked":"") +
		" onchange='ViewerRoot.hud.radioSelect(" + i + ");'" +
		" name='newRootObjectModeRadio' value='0' /><label for='newRootObjectModeRadio" + i + "'>" + radioLabels[i] + "</label><br>";

	str += "<hr>";

	str += "<div id='ViewerRoot-hudDirBrowser'></div>";
	//var histos = ["TH1F","TH2F","TProfile","TCanvas"];
	//for(var i=0;i<histos.length;++i)
	//	str += "<a href='javascript:ViewerRoot.rootReq(\""+histos[i]+"\");'>"+histos[i]+"</a><br>";
	str += "<hr>";

	str += "<div id='ViewerRoot-hudControlsIcon' " +
		"style='float:left;margin: -2px 0 -20px 20px; cursor: pointer;' onmouseup='ViewerRoot.hud.toggleControls();' " +
		"title='Admin Controls'><img width='18px' src='/WebPath/images/dashboardImages/icon-Settings.png'></div>";

	str += "<div style='float:right; margin:-3px 0 -20px 0;'>";
	str += "Refresh Period: <input type='text' id='hudAutoRefreshPeriod' onchange='ViewerRoot.hud.handlerRefreshPeriodChange(this.value);' size='6' value='" +
		ViewerRoot.autoRefreshPeriod + "'> ms</div>";

	str += "<br>";

	str += "<a href='javascript:ViewerRoot.clearAll();' title='Clear ROOT objects from view'>Clear</a>";

	str += "<div style='float:right;' ><input type='checkbox' id='hudCheckbox" + chkLabels.length + "' onchange='ViewerRoot.hud.checkboxUpdate(" + chkLabels.length +
	");' " + "" + "><label for='hudCheckbox" + chkLabels.length + "' >" + "Auto-Hide" + "</label></div>";

	str += "<div style='float:right;margin-right:10px;' ><input type='checkbox' id='hudCheckbox" + (chkLabels.length+1) + "' onchange='ViewerRoot.hud.checkboxUpdate(" + (chkLabels.length+1) +
	");' " + "" + "><label for='hudCheckbox" + (chkLabels.length+1) + "' >" + "Pause Refresh" + "</label></div>";

	this.hudDiv.innerHTML = str;






	hudMouseOverDiv.appendChild(this.hudDiv);

	hudMouseOverDiv.style.width = ViewerRoot.HUD_WIDTH + "px";
	hudMouseOverDiv.onmouseover = mouseOverDropDown;
	hudMouseOverDiv.onmouseout = mouseOutDropDown;
	ViewerRoot.omni.appendChild(hudMouseOverDiv);

	hudDirBrowserDiv = document.getElementById('ViewerRoot-hudDirBrowser');

	/*
	hudAdminSettingsDiv = document.createElement('div');
	hudAdminSettingsDiv.setAttribute("id", "ViewerRoot-hudAdminSettings");
	hudMouseOverDiv.appendChild(hudAdminSettingsDiv);
	*/

	if(ViewerRoot.hudAutoHide)
	{
		//setup dropdown effect
		hudMouseOverDiv.style.top = 15 - hudMouseOverDiv.offsetHeight + "px";//hudMouseOverDiv.offsetHeight - 15 + "px";

		isDropDownDown = false;
		isDropDownAnimating = true;
		animationTargetTop = 15 - hudMouseOverDiv.offsetHeight;
		window.setTimeout(animateDropDown,30);
	}
	else
		this.handleWindowResize();

	//get user preferences from server
	DesktopContent.XMLHttpRequest("Request?RequestType=getUserPreferences","",handleUserPreferences);
}
