


	//	Description of Code Editor Functionality/Behavior:
	//
	//		Folder Icon in top-left (and again if split pane for right side, or bottom)
	//		(when file open) Save Icon in top-left (and again if split pane for right side, or bottom)
	//
	//		Split Pane Icon in top-right (toggle horiz/vert split)
	//		Incremental Build Icon in top-right (mrb b)
	//		Clean Build Icon in top-right (mrb z)
	//
	//		Use console to view build results
	//
	//		Recent files at start of folder display
	//
	//		Selecting a file in folder, opens the Code Editor Box for that file.
	//			- Save Icon then appears next to Folder Icon



var CodeEditor = CodeEditor || {}; //define CodeEditor namespace

if (typeof DesktopContent == 'undefined')
	throw('ERROR: DesktopContent is undefined! Must include DesktopContent.js before CodeEditor.js');


CodeEditor.MENU_PRIMARY_COLOR = "rgb(220, 187, 165)";
CodeEditor.MENU_SECONDARY_COLOR = "rgb(130, 51, 51)";


CodeEditor.editor; //this is THE CodeEditor variable



//=====================================================================================
//define scrollIntoViewIfNeeded for Firefox
// NOTE: Chrome broke this functionality in Version 76.0.3809.100 (Official Build) (64-bit)
//	so just always redefine this behavior.
if (1 || !Element.prototype.scrollIntoViewIfNeeded)
{
	Element.prototype.scrollIntoViewIfNeeded = function (centerIfNeeded)
	{
		centerIfNeeded = arguments.length === 0 ? true : !!centerIfNeeded;

		var parent = this.parentNode,
				tdParent = parent.parentNode,
				editorParent = parent.parentNode.parentNode.parentNode.parentNode.parentNode, //"textEditorBody" which limits view
				parentComputedStyle = window.getComputedStyle(parent, null),
				parentBorderTopWidth = parseInt(parentComputedStyle.getPropertyValue('border-top-width')),
				parentBorderLeftWidth = parseInt(parentComputedStyle.getPropertyValue('border-left-width')),
				overTop = this.offsetTop - tdParent.offsetTop < editorParent.scrollTop,//this.offsetTop - parent.offsetTop < parent.scrollTop,
				overBottom = (this.offsetTop - tdParent.offsetTop + this.clientHeight - parentBorderTopWidth) > (editorParent.scrollTop + editorParent.clientHeight), //(this.offsetTop - parent.offsetTop + this.clientHeight - parentBorderTopWidth) > (parent.scrollTop + parent.clientHeight),
				overLeft = this.offsetLeft - tdParent.offsetLeft < editorParent.scrollLeft, //this.offsetLeft - parent.offsetLeft < parent.scrollLeft,
				overRight = (this.offsetLeft + tdParent.offsetLeft + this.clientWidth - parentBorderLeftWidth) > (editorParent.scrollLeft + editorParent.clientWidth), // (parent.scrollLeft + parent.clientWidth),// (this.offsetLeft - parent.offsetLeft + this.clientWidth - parentBorderLeftWidth) > (parent.scrollLeft + editorParent.clientWidth - tdParent.offsetLeft), // (parent.scrollLeft + parent.clientWidth),
				alignWithTop = overTop && !overBottom;

		if ((overTop || overBottom) && centerIfNeeded)
		{
			editorParent.scrollTop = this.offsetTop - tdParent.offsetTop - editorParent.clientHeight / 2 - parentBorderTopWidth + this.clientHeight / 2;
			//parent.scrollTop = this.offsetTop - parent.offsetTop - parent.clientHeight / 2 - parentBorderTopWidth + this.clientHeight / 2;
		}

		if ((overLeft || overRight) && centerIfNeeded)
		{
			editorParent.scrollLeft = this.offsetLeft + tdParent.offsetLeft - editorParent.clientWidth / 2 - parentBorderLeftWidth + this.clientWidth / 2;
			//parent.scrollLeft = this.offsetLeft - parent.offsetLeft  - parent.clientWidth / 2 - parentBorderLeftWidth + this.clientWidth / 2;
		}

		if ((overTop || overBottom || overLeft || overRight) && !centerIfNeeded)
		{
			this.scrollIntoView(alignWithTop);
		}
	};
} //end define scrollIntoViewIfNeeded


//=====================================================================================
//showTooltip ~~
var windowTooltip = "Welcome to the <b>Code Editor</b> user interface. " +
	"Edit your code, save it, and compile!\n\n" +
	"Hover your mouse over the icons and buttons to see what they do. " +
	"If you hover your mouse over the filename additional icons will appear for changing the filename, downloading, uploading, undo, and redo. The buttons in the top corners are described below followed by hot-keys:\n\n" +
	"<INDENT>" +
	"<b>Open a file:</b>\n<INDENT>Use the folder icon in the top-left to navigate to a code file to edit.</INDENT>\n" +
	"<b>Toggle view:</b>\n<INDENT>Use the split-pane icon in the top-right to toggle another code editor in the same window.</INDENT>\n" +
	"<b>Save:</b>\n<INDENT>Use the save icon in the top-left to save your changes.</INDENT>\n" +
	"<b>Compile:</b>\n<INDENT>Use the Incremmental Build or Clean Build icons in the top-right.</INDENT>\n" +

	"<b>Global Hot Keys:</b>\n<INDENT>" +

	"<table border=0 cellspacing=0 cellpadding=0 style='border: 1px solid grey;'>" +
	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + B </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Incremental Build</td></tr>" +
	"<tr><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + N </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Clean Build</td></tr>" +
	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + 2 </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Toggle Split-View Mode (single, dual-vertical, dual-horizontal)</td></tr>" +
	"</table></INDENT>\n" +


	"<b>Editor Pane Hot Keys:</b>\n<INDENT>" +

	"<table border=0 cellspacing=0 cellpadding=0 style='border: 1px solid grey;'>" +

	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + S </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Save File</td></tr>" +

	"<tr><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + D </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Toggle Directory Navigation</td></tr>" +

	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + F </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Find & Replace</td></tr>" +

	"<tr><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + U </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Undo Text Editing</td></tr>" +

	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> " +
	"Shift + Ctrl + U </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Redo Text Editing</td></tr>" +

	"<tr><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + L or G </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Goto Line Number</td></tr>" +

	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + 1 or ; </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Switch to Related File (associated .h or .cc)</td></tr>" +

	"<tr><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + 0 or &apos; </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Reload Current File from Server</td></tr>" +

	"</table></INDENT>\n" +


	"<b>Selected-Text Hot Keys:</b>\n<INDENT>" +

	"<table border=0 cellspacing=0 cellpadding=0 style='border: 1px solid grey;'>" +
	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> TAB</td><td style='padding:5px'> ==> </td><td style='padding:5px'> Add leading TAB character to all highlighted lines.</td></tr>" +
	"<tr><td style='white-space: nowrap; padding:5px;'> Shift + TAB </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Remove leading TAB character from all highlighted lines.</td></tr>" +
	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> Ctrl + T or Y </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Add TAB character at starting cursor position of all highlighted line (i.e. Block Tab effect).</td></tr>" +
	"<tr><td style='white-space: nowrap; padding:5px;'> Shift + Ctrl + T or Y</td><td style='padding:5px'> ==> </td><td style='padding:5px'> Remove TAB character from starting cursor position of all highlighted line (i.e. reverse Block Tab effect).</td></tr>" +
	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> Ctrl + / </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Add leading comment character(s) to all highlighted lines.</td></tr>" +
	"<tr><td style='white-space: nowrap; padding:5px;'> Shift + Ctrl + / </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Remove leading comment character(s) to all highlighted lines.</td></tr>" +
	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> Ctrl + I </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Auto-indent all highlighted lines.</td></tr>" +
	"</table></INDENT>\n" +
	"If you are an admin and want to set Code Editor in viewer mode for other users i,e. 'Code Viewer,' go to 'Desktop Icon Table' in Configure to set the parameter 'readOnlyMode.'" +
	"</INDENT>"
	;

var windowViewModeTooltip = "Welcome to the <b>Code Viewer</b> user interface. " +
	"You will only be able to view codes without modifying. Your text inputs won't be saved. " +
	"Contact your administrator if you think you should have modification access."+
	"<INDENT>\n" +
	"<b>Open a file:</b>\n<INDENT>Use the folder icon in the top-left to navigate to a code file to edit.</INDENT>\n" +
	"<b>Toggle view:</b>\n<INDENT>Use the split-pane icon in the top-right to toggle another code editor in the same window.</INDENT>\n" +

	"<b>Viewer Hot Keys:</b>\n<INDENT>" +

	"<table border=0 cellspacing=0 cellpadding=0 style='border: 1px solid grey;'>" +

	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + 2 </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Toggle Split-View Mode (single, dual-vertical, dual-horizontal)</td></tr>" +

	"<tr><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + L or G </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Goto Line Number</td></tr>" +

	"<tr style='background-color: rgb(106, 102, 119);'><td style='white-space: nowrap; padding:5px;'> " +
	"Ctrl + F </td><td style='padding:5px'> ==> </td><td style='padding:5px'> Find</td></tr>" +
	"</table></INDENT>\n" +

	"</INDENT>";

appMode = "Code Editor";

CodeEditor.showTooltipPrepend = "";
CodeEditor.showTooltip = function(alwaysShow)
{
	DesktopContent.tooltip(
		(alwaysShow? "ALWAYS" : appMode),
		CodeEditor.showTooltipPrepend + windowTooltip);

	DesktopContent.setWindowTooltip(windowTooltip);
} //end showTooltip()



////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call create to create instance of a SmartLaunch
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
CodeEditor.create = function(standAlone) {

	//STAND ALONE mode allows for single upload/download file features only
	//	no directory notion.
	console.log("standAlone",standAlone);
	var _STAND_ALONE = standAlone;

	//outline:
	//
	//	"private":
	//	================
	//	init()
	//	redrawWindow()
	//	createElements()
	//		localCreatePaneControls()
	//	createTextEditor(forPrimary)
	//	createDirectoryNav(forPrimary)

	//  "public":
	//	================
	//	showTooltip(alwaysShow)
	//	toggleDirectoryNav(forPrimary,v)
	//	saveFile(forPrimary)
	//	toggleView(v)
	//	build(cleanBuild)
	//	undo(forPrimary,redo)
	//	openDirectory(forPrimary,path,doNotOpenPane)
	//	handleDirectoryContent(forPrimary,req)
	//	openFile(forPrimary,path,extension,doConfirm,gotoLine,altPaths,altExtensions,propagateErr)
	//	openRelatedFile(forPrimary,inOtherPane)
	//	gotoLine(forPrimary,line,selectionCursor,topOfView)
	//	handleFileContent(forPrimary,req,fileObj)
	//	getLine(forPrimary)
	//	setCursor(el,cursor,scrollIntoView)
	//	createCursorFromContentPosition(el,startPos,endPos)
	//	getCursor(el)
	//	updateDecorations(forPrimary,forceDisplayComplete,forceDecorations)
	//		localInsertLabel(startPos)
	//	autoIndent(forPrimary,cursor)
	//	updateDualView(forPrimary)
	//	updateOutline(forPrimary,{text,time})
	//		localHandleStackManagement()
	//		localHandleCcOutline()
	//		localHandleJsOutline()
	//	handleOutlineSelect(forPrimary)
	//	updateLastSave(forPrimary)
	//	keyDownHandler(e,forPrimary,shortcutsOnly)
	//		localInsertCharacter(c)
	//	handleFileNameMouseMove(forPrimary,doNotStartTimer)
	//	startEditFileName(forPrimary)
	//	editCellOK(forPrimary)
	//	editCellCancel(forPrimary)
	//	updateFileHistoryDropdowns(forPrimarySelect)
	//	handleFileNameHistorySelect(forPrimary)
	//	showFindAndReplace(forPrimary)
	//	showFindAndReplaceSelection(forPrimary)
	//	doFindAndReplaceAction(forPrimary,action)
	//	displayFileHeader(forPrimary)
	//	updateFileSnapshot(forPrimary,{text,time},ignoreTimeDelta)
	//	startUpdateHandling(forPrimary)
	//	stopUpdateHandling(event)
	//	updateTimeoutHandler()
	//	doubleClickHandler(forPrimary)
	//	download(forPrimary)
	//	upload(forPrimary)
	//	uploadTextFromFile(forPrimary)


	//for display
	var _WINDOW_MIN_SZ = 525;

	var _ALLOWED_FILE_EXTENSIONS = [];

	var _needEventListeners = true;

	var _viewMode = 0; //0: only primary, 1: vertical split, 2: horizontal split
	var _navMode = [0,0]; //1 for showing directory nav
	var _filePath = ["",""]; //file path for primary and secondary
	var _fileExtension = ["",""]; //file extension for primary and secondary
	var _fileLastSave = [0,0]; //file last save time for primary and secondary
	var _fileWasModified = [false,false]; //file wasModified for primary and secondary
	var _numberOfLines = [0,0];
	var _fileLastLineNumberHighlight = [-1,-1];

	var _eel = [undefined,undefined]; //editor elements for primary and secondary

	var _updateTimerHandle = 0;
	var _updateHandlerTargetPane = [false,false];
	var _commandKeyDown = false;
	var _lastPageUpDownLine = -1;
	var _startPageUpDownLine = -1;
	var _startPageUpDownNodeIndex = -1;
	var _startPageUpDownPos = -1;

	var _fileNameMouseMoveTimerHandle = 0;
	var _fileNameEditing = [false,false]; //for primary and secondary
	var _fileUploadString;

	var _activePaneIsPrimary = 1; //default to primary, and switch based on last click

	var _undoStackLatestIndex = [-1,-1]; //when empty, -1, for secondary/primary
	var _undoStack_MAX_SIZE = 10;
	var _undoStack = [[],[]]; //newest,time are placed at _undoStackLatestIndex+1, for secondary/primary

	var _fileHistoryStack = {}; //map of filename => [content,timestamp ms,fileWasModified,fileLastSave]

	var _findAndReplaceCursorInContent = [undefined,undefined];

	var _fileStringHoverEl = 0; //element for hoverable buttons to open file
	var _fileStringHoverTimeout = 0; //timeout to remove hoverable buttons to open file

	var _UPDATE_DECOR_TIMEOUT = 2000; //ms

	var _TAB_SIZE = 4; //to match eclipse!

	var _READ_ONLY = false;
	var _requestPreamble = ""; // to choose readonly request or fullaccess

	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end variable declaration
	CodeEditor.editor = this;
	Debug.log("CodeEditor.editor constructed");

	// start "public" members
	//this.lastFileNameHistorySelectIndex = -1; //now unused (?)
	this.findAndReplaceFind = ["",""];	 //save find & replace state
	this.findAndReplaceReplace = ["",""]; //save find & replace state
	this.findAndReplaceScope = [0,0]; //save find & replace state
	this.findAndReplaceDirection = [0,0]; //save find & replace state
	this.findAndReplaceCaseSensitive = [0,0]; //save find & replace state
	this.findAndReplaceWholeWord = [1,1]; //save find & replace state
	this.findAndReplaceLastButton = [-1,-1]; //1,2,3,4 := Find, Replace, Find&Replace, Replace All //save find & replace state
	// end "public" members

	init();
	Debug.log("CodeEditor.editor initialized");


	//=====================================================================================
	//init ~~
	function init()
	{
		Debug.log("Code Editor init ");

		//extract GET parameters
		var parameterStartFile = [
			//"/otsdaq/otsdaq-core/CoreSupervisors/version.h",
			//"/otsdaq_components/otsdaq-components/FEInterfaces/FEOtsUDPTemplateInterface.h",
			//"/otsdaq_components/otsdaq-components/FEInterfaces/FEOtsUDPTemplateInterface_interface.cc",
			//"/CMakeLists.txt",
			//"/CMakeLists.txt",
			DesktopContent.getParameter(0,"startFilePrimary"),
			DesktopContent.getParameter(0,"startFileSecondary")
			];
		var parameterGotoLine = [
			DesktopContent.getParameter(0,"gotoLinePrimary"),
			DesktopContent.getParameter(0,"gotoLineSecondary")
			];
		var parameterOpenDirectory = [
			DesktopContent.getParameter(0,"openDirectoryPrimary"),
			DesktopContent.getParameter(0,"openDirectorySecondary")
			];

		if(parameterStartFile[0] === undefined && parameterOpenDirectory[0] === undefined) //attempt to get Desktop Window Parameter
		{
			parameterStartFile = [
				DesktopContent.getDesktopWindowParameter(0,"startFilePrimary"),
				DesktopContent.getDesktopWindowParameter(0,"startFileSecondary")
				];
			parameterGotoLine = [
				DesktopContent.getDesktopWindowParameter(0,"gotoLinePrimary"),
				DesktopContent.getDesktopWindowParameter(0,"gotoLineSecondary")
				];
			parameterOpenDirectory = [
				DesktopContent.getDesktopWindowParameter(0,"openDirectoryPrimary"),
				DesktopContent.getDesktopWindowParameter(0,"openDirectorySecondary")
				];
		}

		if(parameterOpenDirectory[0] === undefined)
			parameterOpenDirectory[0] = "/";
		if(parameterOpenDirectory[1] === undefined)
			parameterOpenDirectory[1] = "/";

		var parameterViewMode = DesktopContent.getParameter(0,"startViewMode");
		if(parameterViewMode !== undefined) //set view mode if parameter
		{
			_viewMode = parameterViewMode|0;
		}


		var readOnlyMode = DesktopContent.getParameter(0, "readOnlyMode");
		if (readOnlyMode !== undefined) //set read mode if parameter
		{
			Debug.log("Launching readonly mode to true!");
			_READ_ONLY = true; //readOnlyMode | 0;


		}
		console.log("parameterStartFile",parameterStartFile);
		console.log("parameterGotoLine",parameterGotoLine);
		for(var ii=0;ii<2;++ii) //for both files, get goto line and cleanup leading :
		{
			var i;
			if(parameterStartFile[ii] !== undefined)
			{
				if( parameterGotoLine[ii] === undefined && (i=parameterStartFile[ii].lastIndexOf(':')) > 4) //see if line number can be extracted from filename
				{
					//if all numbers, then treat as line number
					var allNumbers = true;
					for(var j=i+1;j<parameterStartFile[ii].length;++j)
						if(parameterStartFile[ii][j] < '0' || parameterStartFile[ii][j] > '9')
						{
							allNumbers = false;
							break;
						}
					if(allNumbers)
					{
						parameterGotoLine[ii] = parameterStartFile[ii].substr(i+1) | 0;
						parameterStartFile[ii] = parameterStartFile[ii].substr(0,i);
					}
				} //end get line number

				//now cleanup leading : (for example from Debug.js popup links)
				i=parameterStartFile[ii].lastIndexOf(':');
				parameterStartFile[ii] = parameterStartFile[ii].substr(i+1);
			}
		} //end goto line handling
		console.log("parameterStartFile",parameterStartFile);
		console.log("parameterGotoLine",parameterGotoLine);
		console.log("parameterViewMode",parameterViewMode);
		console.log("parameterOpenDirectory", parameterOpenDirectory);
		console.log("_READ_ONLY", _READ_ONLY);

		if(_READ_ONLY == true)
		{
			_requestPreamble = "readOnly";
			appMode = "Code Viewer";
			windowTooltip = windowViewModeTooltip;


		//_viewMode = 2; for debugging
		}



		//proceed

		createElements();
		redrawWindow();

		if(_needEventListeners)
		{
			window.addEventListener("resize",redrawWindow);
			_needEventListeners = false;
		}

		//stop here if standalone with no server
		if(_STAND_ALONE)
		{

			//set directory situation after CodeEditor has been fully instantiated
			window.setTimeout(
					function()
					{
				//at this point, CodeEditor is intantiated
				Debug.log("CodeEditor stand alone setup...");
				CodeEditor.editor.toggleDirectoryNav(true /*forPrimary*/,false /*value*/);

				//open upload window to get the ball rolling
				CodeEditor.editor.upload(true /*forPrimary*/);
					}, 100);


			return;
		}

		var tmpSequence = DesktopContent._sequence;

		DesktopContent.XMLHttpRequest("Request?RequestType=" + _requestPreamble +
			"codeEditor" +
			"&option=getAllowedExtensions"
			, "" /* data */,
			function(req, reqParam, errStr)
			{
				console.log("getAllowedExtensions",req,errStr);

				CodeEditor.showTooltipPrepend = "";
				if(!_READ_ONLY && !req)
				{
					if(DesktopContent._sequence)
						CodeEditor.showTooltipPrepend = "Assuming <b>read-only</b> access (remember the wiz mode sequence access code must be at least 8 characters to allow write access)!\n\nReverting to read-only mode.\n\n";
					else
						CodeEditor.showTooltipPrepend = "Assuming <b>read-only</b> access (remember only named users can have write access, not the anonymous admin user)!\n\nReverting to read-only mode.\n\n";
					Debug.log(CodeEditor.showTooltipPrepend);
					_READ_ONLY = true;

					CodeEditor.showTooltip(_STAND_ALONE);
					init();
					return;
				}

				CodeEditor.showTooltip(_STAND_ALONE);

				if(errStr && errStr != "")
					Debug.log(errStr,Debug.HIGH_PRIORITY);

				if(!req) //request failed
				{
					Debug.log("Does the Code Editor Supervisor exist? You must connect the web editor to a valid Code Editor Supervisor application (please check your Configuration Tree and then restart ots).",Debug.HIGH_PRIORITY);
					return;
				}
				else //check for error
				{
					if(!errStr || errStr == "")
						errStr = DesktopContent.getXMLValue(req,"Error");

					if(errStr && errStr != "")
					{
						Debug.log(errStr,Debug.HIGH_PRIORITY);
						Debug.log("Does the Code Editor Supervisor exist? You must connect the web editor to a valid Code Editor Supervisor application (please check your Configuration Tree and then restart ots).",Debug.HIGH_PRIORITY);
						return;
					}
				}

				if(tmpSequence != DesktopContent._sequence && _READ_ONLY)
				{
					Debug.info("Security sequence was changed, retrying for write access...");
					_READ_ONLY = false;
					init();
					return;
				}

				_ALLOWED_FILE_EXTENSIONS = DesktopContent.getXMLValue(req,"AllowedExtensions");
				console.log("_ALLOWED_FILE_EXTENSIONS",_ALLOWED_FILE_EXTENSIONS);
				_ALLOWED_FILE_EXTENSIONS = _ALLOWED_FILE_EXTENSIONS.split(',');
				console.log("_ALLOWED_FILE_EXTENSIONS",_ALLOWED_FILE_EXTENSIONS);

				DesktopContent.XMLHttpRequest("Request?RequestType=" + _requestPreamble +
						"codeEditor" +
					"&option=getDirectoryContent" +
					"&path=/"
					, "" /* data */,
					function(req)
					{
						var filePath, fileExtension;

						//console.log("getDirectoryContent",req);


						CodeEditor.editor.handleDirectoryContent(1 /*forPrimary*/, req);
						CodeEditor.editor.handleDirectoryContent(0 /*forPrimary*/, req);

						//decide how to start display(file or directory)
						filePath = "";
						if(parameterStartFile[0] && parameterStartFile[0] != "")
						{
							i = parameterStartFile[0].lastIndexOf('.');
							//filePath = parameterStartFile[0];
							if(i > 0) //up to extension
							{
								filePath = parameterStartFile[0].substr(0,i);
								fileExtension = parameterStartFile[0].substr(i+1);
							}
							else
							{
								filePath = parameterStartFile[0];
								fileExtension = "";
							}
						}



						if(filePath != "") //show shortcut file
							CodeEditor.editor.openFile(
									1 /*forPrimary*/,
									filePath	/*path*/,
									fileExtension /*extension*/,
									false /*doConfirm*/,
									parameterGotoLine[0 /*primary goto line*/] /*gotoLine*/);
						else //show base directory nav
						{
							CodeEditor.editor.openDirectory(
									1 /*forPrimary*/,
									parameterOpenDirectory[0] /*path*/,
									true /*doNotOpenPane*/
							);
							//CodeEditor.editor.toggleDirectoryNav(1 /*forPrimary*/, 1 /*showNav*/);
						}

						//for secondary pane
						filePath = "";
						if(parameterStartFile[1] && parameterStartFile[1] != "")
						{
							i = parameterStartFile[1].lastIndexOf('.');
							//filePath = parameterStartFile[1];
							if(i > 0) //up to extension
							{
								filePath = parameterStartFile[1].substr(0,i);
								fileExtension = parameterStartFile[1].substr(i+1);
							}
							else
							{
								filePath = parameterStartFile[1];
								fileExtension = "";
							}
						}

						if(filePath != "") //show shortcut file
							CodeEditor.editor.openFile(
									0 /*forPrimary*/,
									filePath	/*path*/,
									fileExtension /*extension*/,
									false /*doConfirm*/,
									parameterGotoLine[1 /*secondary goto line*/] /*gotoLine*/);
						else //show base directory nav
						{

							CodeEditor.editor.openDirectory(
									0 /*forPrimary*/,
									parameterOpenDirectory[1] /*path*/,
									true /*doNotOpenPane*/
							);
							//CodeEditor.editor.toggleDirectoryNav(0 /*forPrimary*/, 1 /*showNav*/);
						}


						_activePaneIsPrimary = 1; //default active pane to primary

					}	//end get directory contents handler
				); //end get directory contents

			}, //end get allowed file extensions handler
			0 /*reqParam*/, 0 /*progressHandler*/,
			2 /*callHandlerOnErr*/,
			0 /*doNotShowLoadingOverlay*/, 0 /*targetGatewaySupervisor*/,
			0 /*ignoreSystemBlock*/,
			_requestPreamble != "readOnly" /*doNotOfferSequenceChange*/ //so read-only switch can happen
		); //end get allowed file extensions

	} //end init()

	//=====================================================================================
	//createElements ~~
	//	called initially to create checkbox and button elements
	function createElements()
	{
		Debug.log("createElements");




		//		<!-- body content populated by javascript -->
		//		<div id='content'>
		//			<div id='primaryPane'></div>	<!-- for primary view -->
		//			<div id='secondaryPane'></div>	<!-- for horiz/vert split view -->
		//			<div id='controlsPane'></div>  	<!-- for view toggle and compile -->
		//		</div>

		var cel,el,al,sl,str;

		cel = document.getElementById("content");
		if(!cel)
		{
			cel = document.createElement("div");
			cel.setAttribute("id","content");
		}

		//clear all elements
		cel.innerHTML = "";

		{ //content div

			//================
			//primaryPane and secondaryPane div
			var forPrimary;
			for(forPrimary=1;forPrimary >= 0;--forPrimary)
			{
				el = document.createElement("div");
				el.setAttribute("class","editorPane");
				el.setAttribute("id","editorPane" + forPrimary);
				{
					var str = "";
					str += createTextEditor(forPrimary);
					str += createDirectoryNav(forPrimary);
					str += localCreatePaneControls(forPrimary);
					el.innerHTML = str;
				} //end fill editor pane
				cel.appendChild(el);
			}

			//================
			function localCreatePaneControls(forPrimary)
			{
				//add folder, and save buttons
				//add directory nav and editor divs

				str = "";

				//local pane controls
				str += DesktopContent.htmlOpen("div",
					{
						"class":"controlsPane",
					},"" /*innerHTML*/, 0 /*doCloseTag*/);
				{
					//folder
					str += DesktopContent.htmlOpen("div",
						{
							"id":"directoryNavToggle",
							"class":"controlsButton",
							"style":"float:left;" +
							(_STAND_ALONE ?
									"display:none":""),
							"onclick":"CodeEditor.editor.toggleDirectoryNav(" + forPrimary + ");",
							"title": "Open a file... (Ctrl + D)",
						},"" /*innerHTML*/, 0 /*doCloseTag*/);
					{
						str += DesktopContent.htmlOpen("div",
							{
								"id":"directoryNavToggleTop",

							},"" /*innerHTML*/, 1 /*doCloseTag*/);
						str += DesktopContent.htmlOpen("div",
							{
								"id":"directoryNavToggleBottom",

							},"" /*innerHTML*/, 1 /*doCloseTag*/);
					} //end directoryNavToggle
					str += "</div>"; //close directoryNavToggle

					//save
					str += DesktopContent.htmlOpen("div",
						{
							"id": "saveFile",
							"class": "controlsButton",
							"style": "float:left;" +
							((_STAND_ALONE || _READ_ONLY)?
									"display:none":""),
							"onclick": "CodeEditor.editor.saveFile(" + forPrimary + ");",
							"title": "Click to Save the File (Ctrl + S)\nUndo changes (Ctrl + U)\nRedo changes (Shift + Ctrl + U)",
						}, "" /*innerHTML*/, 0 /*doCloseTag*/);
					{
						str += DesktopContent.htmlOpen("div",
							{
								"id":"saveFileMain",

							},"" /*innerHTML*/, 1 /*doCloseTag*/);
						str += DesktopContent.htmlOpen("div",
							{
								"id":"saveFileMainTop",

							},"" /*innerHTML*/, 1 /*doCloseTag*/);
						str += DesktopContent.htmlOpen("div",
							{
								"id":"saveFileMainBottom",

							},"" /*innerHTML*/, 1 /*doCloseTag*/);
					} //end save content
					str += "</div>"; //close saveFile

				} //end locals controlsPane
				str += "</div>"; //close controlsPane
				return str;
			} //end localCreatePaneControls


			//================
			//controlsPane div
			el = document.createElement("div");
			el.setAttribute("class", "controlsPane");

			{
				//add view toggle, incremental compile, and clean compile buttons

				str = "";

				//view toggle
				str += DesktopContent.htmlOpen("div",

						{
							"id":"viewToggle",
							"class":"controlsButton",
							"style":"float:right",
							"onclick":"CodeEditor.editor.toggleView();",
							"title":"Toggle Verical/Horizontal Split-view (Ctrl + W)",
						},"" /*innerHTML*/, 0 /*doCloseTag*/);

				{

					str += DesktopContent.htmlOpen("div",
						{
							"id":"viewToggleRight",

						},"" /*innerHTML*/, 1 /*doCloseTag*/);
					str += DesktopContent.htmlOpen("div",
						{
							"id":"viewToggleLeftTop",

						},"" /*innerHTML*/, 1 /*doCloseTag*/);
					str += DesktopContent.htmlOpen("div",
						{
							"id":"viewToggleLeftBottom",

						},"" /*innerHTML*/, 1 /*doCloseTag*/);
				}
				str += "</div>"; //close viewToggle

				//incremental compile

				str += DesktopContent.htmlOpen("div",
					{
						"id": "incrementalBuild",
						"class": "controlsButton",
						"style": "float:right;" +
						((_STAND_ALONE || _READ_ONLY)?
								"display:none":""),
						"onclick": "CodeEditor.editor.build(0 /*cleanBuild*/);",
						"title": "Incremental Build... (Ctrl + B)",
					}, "" /*innerHTML*/, 0 /*doCloseTag*/);
				{

					str += DesktopContent.htmlOpen("div",
						{
							"style":"margin:11px 0 0 13px;",
						},"b" /*innerHTML*/, 1 /*doCloseTag*/);
				}
				str += "</div>"; //close incrementalBuild

				//clean compile
				str += DesktopContent.htmlOpen("div",
					{
						"id": "cleanBuild",
						"class": "controlsButton",
						"style": "float:right;" +
						((_STAND_ALONE || _READ_ONLY)?
								"display:none":""),
						"onclick": "CodeEditor.editor.build(1 /*cleanBuild*/);",
						"title": "Clean Build... (Ctrl + N)",
					}, "" /*innerHTML*/, 0 /*doCloseTag*/);
				{

					str += DesktopContent.htmlOpen("div",
						{
							"style":"margin:10px 0 0 13px;",
						},"z" /*innerHTML*/, 1 /*doCloseTag*/);
				}
				str += "</div>"; //close cleanBuild


				el.innerHTML = str;
			}
			cel.appendChild(el);

		} //end content div


		document.body.appendChild(cel);
		_eel = [document.getElementById("editableBox" + 0),
			document.getElementById("editableBox" + 1)];


		/////////////
		//add event listeners
		var box;
		for(var i=0;i<2;++i)
		{
			_eel[i].addEventListener("input",
					function(e)
				{
					e.stopPropagation();

					var forPrimary = this.id[this.id.length-1]|0;
					forPrimary = forPrimary?1:0;

					Debug.log("input forPrimary=" + forPrimary);

					_fileWasModified[forPrimary] = true;
					CodeEditor.editor.updateLastSave(forPrimary);

					CodeEditor.editor.startUpdateHandling(forPrimary);

				}); //end addEventListener

			_eel[i].addEventListener("keydown",
					function(e)
				{
					if(e.keyCode == 91 || e.keyCode == 93 ||
							e.keyCode == 224) //apple command keys chrome left/right and firefox
						_commandKeyDown = true;

					var forPrimary = this.id[this.id.length-1]|0;
					forPrimary = forPrimary?1:0;

					//Debug.log("keydown handler for editableBox" + forPrimary);
					CodeEditor.editor.keyDownHandler(e,forPrimary);
					e.stopPropagation();
				}); //end addEventListener

			_eel[i].addEventListener("keyup",
					function(e)
				{
					if(e.keyCode == 91 || e.keyCode == 93 ||
							e.keyCode == 224) //apple command keys chrome left/right and firefox
						_commandKeyDown = false;
				}); //end addEventListener

			_eel[i].addEventListener("click",
					function(e)
				{

					if(e.which > 1)
					{
						Debug.log("Special mouse click handling");

						e.preventDefault();
						e.stopPropagation();
						return;
					}

					e.stopPropagation(); //to stop click body behavior
				}); //end addEventListener

			_eel[i].addEventListener("dblclick",
					function(e)
				{

					var forPrimary = this.id[this.id.length-1]|0;
					forPrimary = forPrimary?1:0;

					Debug.log("dblclick handler for editor" + forPrimary);
					e.stopPropagation(); //to stop click body behavior

					CodeEditor.editor.doubleClickHandler(forPrimary);
				}); //end addEventListener

			_eel[i].addEventListener("contextmenu",
					function(e)
				{

					if(e.which > 1)
					{
						Debug.log("Special context menu handling");

						e.preventDefault();
						e.stopPropagation();
						return;
					}

				}); //end addEventListener

			_eel[i].addEventListener("mousedown",
					function(e)
				{
					if(e.which > 1)
					{
						Debug.log("Special mouse down handling");

						e.preventDefault();
						e.stopPropagation();
						return;
					}

					CodeEditor.editor.stopUpdateHandling(e);

					var forPrimary = this.id[this.id.length-1]|0;
					forPrimary = forPrimary?1:0;

					Debug.log("mousedown handler for editor" + forPrimary + " " + e.which);

					//update dual view in case other has been modified
					if(_activePaneIsPrimary != forPrimary)
						CodeEditor.editor.updateDualView(!forPrimary);

					_activePaneIsPrimary = forPrimary;


				}); //end addEventListener

			_eel[i].addEventListener("mouseup",
					function(e)
				{
					var forPrimary = this.id[this.id.length-1]|0;
					forPrimary = forPrimary?1:0;

					Debug.log("mouseup handler for editor" + forPrimary);

					if(e.which > 1)
					{
						Debug.log("Special mouse up handling");

						e.preventDefault();
						e.stopPropagation();
						return;
					}

					CodeEditor.editor.startUpdateHandling(forPrimary);

				}); //end addEventListener

			_eel[i].addEventListener('paste',
					function(e)
					{
				var forPrimary = this.id[this.id.length-1]|0;
				forPrimary = forPrimary?1:0;

				Debug.log("paste handler() for editor" + forPrimary);
				var paste = (e.clipboardData || window.clipboardData).getData('text');

				var selection = window.getSelection();
				if (!selection.rangeCount) return false;
				selection.deleteFromDocument();
				selection.getRangeAt(0).insertNode(document.createTextNode(paste));

				//leaves cursor selecting insert, so now move cursor to end of paste
				var pasteTextEl = selection.baseNode.nextSibling;//.textContent
				var range = document.createRange();
				range.setStart(pasteTextEl,
						pasteTextEl.textContent.length);
				range.setEnd(pasteTextEl,
						pasteTextEl.textContent.length);
				selection.removeAllRanges();
				selection.addRange(range);

//				var cursor = CodeEditor.editor.getCursor(_eel[forPrimary]);
// 				cursor.startNodeIndex = cursor.endNodeIndex;
// 				cursor.startPos = cursor.endPos;
// 				CodeEditor.editor.setCursor(_eel[forPrimary],cursor);

				e.preventDefault();
					});  //end addEventListener

			//add click handler to track active pane
			box = document.getElementById("editorPane" + i);
			box.addEventListener("click",
					function(e)
				{
					var forPrimary = this.id[this.id.length-1]|0;
					forPrimary = forPrimary?1:0;

					Debug.log("click handler for pane" + forPrimary);


					//update dual view in case other has been modified
					if(_activePaneIsPrimary != forPrimary)
						CodeEditor.editor.updateDualView(!forPrimary);

					_activePaneIsPrimary = forPrimary;


					CodeEditor.editor.showFindAndReplaceSelection(forPrimary);

					//focus on edit box
					var el = document.getElementById("textEditorBody" + forPrimary);
					var scrollLeft = el.scrollLeft;
					var scrollTop = el.scrollTop;
					//var cursor = CodeEditor.editor.getCursor(el);
					_eel[forPrimary].focus();
					//CodeEditor.editor.setCursor(el,cursor);
					el.scrollLeft = scrollLeft;
					el.scrollTop = scrollTop;


				}); //end addEventListener



		} //end handler creation
		box = document.body;
		box.addEventListener("keydown",
				function(e)
			{
				if(e.keyCode == 91 || e.keyCode == 93 ||
						e.keyCode == 224) //apple command keys chrome left/right and firefox
					_commandKeyDown = true;

				var forPrimary = _activePaneIsPrimary; //take last active pane
				Debug.log("keydown handler for body" + forPrimary);
				CodeEditor.editor.keyDownHandler(e,forPrimary,true /*shortcutsOnly*/);
				//e.stopPropagation();
			}); //end addEventListener
		box.addEventListener("keyup",
				function(e)
			{
				if(e.keyCode == 91 || e.keyCode == 93 ||
						e.keyCode == 224) //apple command keys chrome left/right and firefox
					_commandKeyDown = false;
			}); //end addEventListener
		box.addEventListener("mouseover",
				function()
				{
			//Debug.log("body onmouseover");
			if(_fileStringHoverEl.parentNode) //then delete the element
			{
				Debug.log("body removing string hover");
				window.clearTimeout(_fileStringHoverTimeout);
				_fileStringHoverTimeout = window.setTimeout(
						function()
						{
					Debug.log("body removed string hover");
					try
					{
						_fileStringHoverEl.parentNode.removeChild(_fileStringHoverEl);
					}
					catch(e)
					{} //ignore error
						}, 1000 /* 1 sec*/);
			}

				}); //end addEventListener

	} //end createElements()

	//=====================================================================================
	//createTextEditor ~~
	function createTextEditor(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("createTextEditor forPrimary=" + forPrimary);

		var str = "";

		str += DesktopContent.htmlOpen("div",
			{
				"class":"textEditor",
				"id":"textEditor" + forPrimary,
				"style":"overflow:hidden;",
			},0 /*innerHTML*/, false /*doCloseTag*/);

		//add header
		//add body with overflow:auto
		//add leftMargin
		//add editorBox


		str += DesktopContent.htmlOpen("div",
			{
				"class":"textEditorHeader",
				"id":"textEditorHeader" + forPrimary,
			},0 /*"<div>File</div><div>Save Date</div>"*/ /*innerHTML*/,
			true /*doCloseTag*/);

		str += DesktopContent.htmlOpen("div",
			{
				"class":"textEditorBody",
				"id":"textEditorBody" + forPrimary,
			},0 /*innerHTML*/, false /*doCloseTag*/);

		str += "<table class='editableBoxTable' style='margin-bottom:200px'>" + //add white space to bottom for expected scroll behavior
			"<tr><td valign='top'>";
		str += DesktopContent.htmlOpen("div",
			{
				"class":"editableBoxLeftMargin",
				"id":"editableBoxLeftMargin" + forPrimary,
			},"0\n1\n2" /*html*/,true /*closeTag*/);
		str += "</td><td valign='top'>";
		str += DesktopContent.htmlOpen("div",
			{
				"class":"editableBox",
				"id":"editableBox" + forPrimary,
				"contenteditable":"true",
				"autocomplete":"off",
				"autocorrect":"off",
				"autocapitalize":"off",
				"spellcheck":"false",
			},0 /*html*/,true /*closeTag*/);
		str += "</td></tr></table>"; //close table

		str += "</div>"; //close textEditorBody tag

		str += "</div>"; //close textEditor tag

		return str;
	} //end createTextEditor()

	//=====================================================================================
	//createDirectoryNav ~~
	function createDirectoryNav(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("createDirectoryNav forPrimary=" + forPrimary);

		var str = "";

		str += DesktopContent.htmlOpen("div",
			{
				"class":"directoryNav",
				"id":"directoryNav" + forPrimary,
			},"Directory" /*innerHTML*/, 1 /*doCloseTag*/);

		return str;

	} //end createDirectoryNav()

	//=====================================================================================
	//redrawWindow ~~
	//	called when page is resized
	function redrawWindow()
	{
		//adjust link divs to proper size
		//	use ratio of new-size/original-size to determine proper size

		var w = window.innerWidth | 0;
		var h = window.innerHeight | 0;

		if(w < _WINDOW_MIN_SZ)
			w = _WINDOW_MIN_SZ;
		if(h < _WINDOW_MIN_SZ)
			h = _WINDOW_MIN_SZ;

		Debug.log("redrawWindow to " + w + " - " + h);

		var eps = document.getElementsByClassName("editorPane");
		var epHdrs = document.getElementsByClassName("textEditorHeader");
		var epBdys = document.getElementsByClassName("textEditorBody");
		var dns = document.getElementsByClassName("directoryNav");
		var rect = [{},{}];


		eps[0].style.position = "absolute";
		eps[1].style.position = "absolute";

		var DIR_NAV_MARGIN = 50;
		var EDITOR_MARGIN = 20;
		var EDITOR_HDR_H = 56;
		switch(_viewMode)
		{
		case 0: //only primary

			rect = [{"left":0,"top":0,"w":w,"h":h},
				undefined];
			break;
		case 1: //vertical split

			rect = [{"left":0,"top":0,"w":((w/2)|0),"h":h},
				{"left":((w/2)|0),"top":0,"w":(w-((w/2)|0)),"h":h}];

			break;
		case 2: //horizontal split

			rect = [{"left":0,"top":0,"h":((h/2)|0),"w":w},
				{"top":((h/2)|0),"left":0,"h":(h-((h/2)|0)),"w":w}];

			break;
		default:
			Debug.log("Invalid view mode encountered: " + _viewMode);
		} //end switch

		//place all editor components
		for(var i=0;i<2;++i)
		{
			if(!rect[i])
			{
				eps[i].style.display = "none";
				continue;
			}

			dns[i].style.left 		= (DIR_NAV_MARGIN) + "px";
			dns[i].style.top 		= (DIR_NAV_MARGIN) + "px";
			dns[i].style.width 		= (rect[i].w - 2*DIR_NAV_MARGIN) + "px";
			dns[i].style.height 	= (rect[i].h - 2*DIR_NAV_MARGIN) + "px";

			eps[i].style.left 		= rect[i].left + "px";
			eps[i].style.top 		= rect[i].top + "px";
			eps[i].style.height 	= rect[i].h + "px";
			eps[i].style.width 		= rect[i].w + "px";

			epHdrs[i].style.left 	= EDITOR_MARGIN + "px";
			epHdrs[i].style.top 	= (DIR_NAV_MARGIN - 2*EDITOR_MARGIN) + "px";
			epHdrs[i].style.height 	= (EDITOR_HDR_H + 2*EDITOR_MARGIN) + "px";
			epHdrs[i].style.width 	= (rect[i].w - 2*EDITOR_MARGIN) + "px";

			//offset body by left and top, but extend to border and allow scroll
			epBdys[i].style.left 	= 0 + "px";
			epBdys[i].style.top 	= (DIR_NAV_MARGIN + EDITOR_HDR_H) + "px";
			epBdys[i].style.height	= (rect[i].h - DIR_NAV_MARGIN - EDITOR_HDR_H) + "px";
			epBdys[i].style.width	= (rect[i].w - 0) + "px";

			eps[i].style.display = "block";
		} //end place editor components

	} //end redrawWindow()


	//=====================================================================================
	//toggleView ~~
	//	does primary only, vertical, or horizontal
	this.toggleView = function(v)
	{
		if(v !== undefined)
			_viewMode = v;
		else
			_viewMode = (_viewMode+1)%3;
		Debug.log("toggleView _viewMode=" + _viewMode);
		redrawWindow();
	} //end toggleView()

	//=====================================================================================
	//toggleDirectoryNav ~~
	//	toggles directory nav
	this.toggleDirectoryNav = function(forPrimary, v)
	{
		forPrimary = forPrimary?1:0;
		_activePaneIsPrimary = forPrimary;

		Debug.log("toggleDirectoryNav forPrimary=" + forPrimary);

		if(v !== undefined) //if being set, take value
			_navMode[forPrimary] = v?1:0;
		else				//else toggle
			_navMode[forPrimary] = _navMode[forPrimary]?0:1;
		Debug.log("toggleDirectoryNav _navMode=" + _navMode[forPrimary]);

		var el = document.getElementById("directoryNav" + forPrimary);
		var wasHidden = el.style.display == "none";
		el.style.display =
			_navMode[forPrimary]?"block":"none";

		if(_navMode[forPrimary] && wasHidden)
		{
			var paths = document.getElementById("directoryNav" +
					forPrimary).getElementsByClassName("dirNavPath");
			var buildPath = "/";
			for(var i=1;i<paths.length;++i)
				buildPath += (i>1?"/":"") + paths[i].textContent;
			Debug.log("refresh " + buildPath);

			CodeEditor.editor.openDirectory(forPrimary,buildPath);
		}
	} //end toggleDirectoryNav()

	//=====================================================================================
	//saveFile ~~
	//	save file for pane
	this.saveFile = function(forPrimary, quiet)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("saveFile forPrimary=" + forPrimary);

		Debug.log("saveFile _filePath=" + _filePath[forPrimary]);
		Debug.log("saveFile _fileExtension=" + _fileExtension[forPrimary]);

		if(_filePath[forPrimary] == "")
		{
			Debug.log("Error, can not save to empty file name!",
					Debug.HIGH_PRIORITY);
			return;
		}

		if(!quiet)
		{
			DesktopContent.popUpVerification(
					"Are you sure you want to save...<br>" +
					_filePath[forPrimary] + "." + _fileExtension[forPrimary] + "?",
					localDoIt,
					undefined,undefined,undefined,
					undefined,undefined,//val, bgColor, textColor, borderColor, getUserInput,
					"90%" /*dialogWidth*/
					);
			return;
		}
		else
			localDoIt();

		function localDoIt()
		{
			//Note: innerText is the same as textContent, except it is the only
			//	the human readable text (ignores hidden elements, scripts, etc.)
			var textObj = {"text":
					_eel[forPrimary].innerText,
				"time":undefined};

			//console.log(content,content.length);

			//remove crazy characters
			// (looks like they come from emacs tabbing -- they seem to be backwards (i.e. 2C and 0A are real characters))
			textObj.text = textObj.text.replace(/%20%20/g,"%20%20").replace(/%20/g, //convert two to tab, otherwise space
					"%20").replace(/%20/g,"%20").replace(/%20/g,"%20");
			textObj.text = textObj.text.replace(/\r/g,''); //pasting can introduce carriage returns


			DesktopContent.XMLHttpRequest("Request?RequestType=codeEditor" +
					"&option=saveFileContent" +
					"&path=" + _filePath[forPrimary] +
					"&ext=" + _fileExtension[forPrimary]
					, "content=" + encodeURIComponent(textObj.text) /* data */,
					function(req)
				{
					Debug.log("Successfully saved " +
							_filePath[forPrimary] + "." +
							_fileExtension[forPrimary],quiet?Debug.LOW_PRIORITY:Debug.INFO_PRIORITY);

					_fileWasModified[forPrimary] = false;
					textObj.time = Date.now();
					_fileLastSave[forPrimary] = textObj.time; //record last Save time

					//update last save field
					CodeEditor.editor.updateLastSave(forPrimary);

					if(_filePath[0] == _filePath[1] &&
							_fileExtension[0] == _fileExtension[1])
					{
						CodeEditor.editor.updateDualView(forPrimary);
						//capture right now if different, ignore time delta
						CodeEditor.editor.updateFileSnapshot(!forPrimary,
								textObj,
								true /*ignoreTimeDelta*/);
					}

					//capture right now if different, ignore time delta
					CodeEditor.editor.updateFileSnapshot(forPrimary,
							textObj,
							true /*ignoreTimeDelta*/);

				}); // end codeEditor saveFileContent handler

		} //end localDoIt()
	} //end saveFile()

	//=====================================================================================
	//build ~~
	//	launch compile
	this.build = function(cleanBuild)
	{
		cleanBuild = cleanBuild?1:0;

		Debug.log("build cleanBuild=" + cleanBuild);

		if(cleanBuild)
		{
			DesktopContent.popUpVerification(
					"Are you sure you want to do a clean build?!",
					localDoIt
					);
			return;
		}
		else
			localDoIt();

		function localDoIt()
		{
			DesktopContent.XMLHttpRequest("Request?RequestType=codeEditor" +
					"&option=build" +
					"&clean=" + (cleanBuild?1:0)
					, "" /* data */,
					function(req)
				{
					Debug.log("Build was launched! Check " +
							"<a onclick='DesktopContent.openNewBrowserTab(" +
							"\"Console\");' " +
							"title='Click to open the Console web app in a new browser tab.'>" +
							"console</a> for result!", Debug.INFO_PRIORITY);

				}); //end codeEditor build handler
		} //end localDoIt()

	} //end build()

	//=====================================================================================
	//undo ~~
	//	manage undo stack
	this.undo = function(forPrimary,redo)
	{
		DesktopContent.showLoading(localDoIt);
		return;

		function localDoIt()
		{
			forPrimary = forPrimary?1:0;

			Debug.log("undo() forPrimary=" + forPrimary + " redo=" + redo);
			console.log("undo stack index",_undoStackLatestIndex[forPrimary]);
			console.log("undo stack length",_undoStack[forPrimary].length);

			console.log("undo stack",_undoStack[forPrimary]);

			var el = _eel[forPrimary];

			//capture right now if different, ignore time delta
			CodeEditor.editor.updateFileSnapshot(forPrimary,
					{"text":el.textContent,
							"time":Date.now()},
							true /*ignoreTimeDelta*/);

			var newIndex = _undoStackLatestIndex[forPrimary];
			newIndex += redo?1:-1;
			if(newIndex >= _undoStack_MAX_SIZE)
				newIndex = 0; //wrap around
			else if(newIndex < 0)
				newIndex = _undoStack[forPrimary].length-1; //wrap around

			console.log("new stack index",newIndex);

			//do not allow wrap around in time
			if(!redo && //assert back in time
					_undoStack[forPrimary][newIndex][1] >=
					_undoStack[forPrimary][_undoStackLatestIndex[forPrimary]][1])
			{
				Debug.log("Reached end of undo history...",Debug.WARN_PRIORITY);
				return;
			}
			if(redo && //assert forward in time
					(newIndex >= _undoStack[forPrimary].length ||
							_undoStack[forPrimary][newIndex][1] <=
							_undoStack[forPrimary][_undoStackLatestIndex[forPrimary]][1]))
			{
				Debug.log("Reached end of redo history...",Debug.WARN_PRIORITY);
				return;
			}

			//here, accept change!
			_undoStackLatestIndex[forPrimary] = newIndex;
			console.log("result stack index",newIndex);

			var cursor = CodeEditor.editor.getCursor(el);

			el.textContent =
					_undoStack[forPrimary][_undoStackLatestIndex[forPrimary]][0];
			_fileWasModified[forPrimary] = true;

			CodeEditor.editor.updateDecorations(forPrimary,
					false /*forceDisplayComplete*/,
					true /*forceDecorations*/);

			CodeEditor.editor.setCursor(el,cursor,true /*scrollIntoView*/);
		} //end localDoIt()
	} //end undo()

	//=====================================================================================
	//handleDirectoryContent ~~
	//	redraw directory content based on req response
	this.handleDirectoryContent = function(forPrimary,req)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("handleDirectoryContent forPrimary=" + forPrimary);
		console.log(req);

		var path = DesktopContent.getXMLValue(req,"path");
		if(path == "/") path = ""; //default to empty to avoid //

		var specials = req.responseXML.getElementsByTagName("special");
		var dirs = req.responseXML.getElementsByTagName("directory");
		var files = req.responseXML.getElementsByTagName("file");
		var specialFiles = req.responseXML.getElementsByTagName("specialFile");

		Debug.log("handleDirectoryContent path=" + path);
		console.log(dirs);console.log(files);

		var str = "";
		var i;
		var name;
		str += DesktopContent.htmlOpen("div",
			{
				"style":"margin:20px;" +
				"white-space: nowrap;",
			});

		/////////////
		//show path with links
		{
			var pathSplit = path.split('/');
			var buildPath = "";
			var pathSplitName;

			str += "Path: <a class='dirNavPath' onclick='CodeEditor.editor.openDirectory(" +
				forPrimary + ",\"" +
				"/" + "\"" +
				")'>" +
				"srcs</a>";

			name = "srcs"; //take last name encoutered as folder name
			for(i=0;i<pathSplit.length;++i)
			{
				pathSplitName = pathSplit[i].trim();
				if(pathSplitName == "") continue; //skip blanks
				Debug.log("pathSplitName " + pathSplitName);
				name = pathSplitName; //take last name encoutered as folder name

				buildPath += "/" + pathSplitName;

				str += "/";
				str += "<a class='dirNavPath' onclick='CodeEditor.editor.openDirectory(" +
					forPrimary + ",\"" +
					buildPath + "\"" +
					")' title='Open folder: \nsrcs" + buildPath +
					"' >" +
					pathSplitName + "</a>";

			}
			str += "/";

			//open in other pane
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open folder in the other editor pane of the split-view: \n" +
					"srcs" + buildPath,
					"onclick":"CodeEditor.editor.openDirectory(" +
					(!forPrimary) + ",\"" +
						buildPath+ "\");", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewPane' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInOtherPane.png'>"
				/*innerHTML*/, true /*doCloseTag*/);

			//open in new window
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open folder in a new browser tab: \n" +
					"srcs" + buildPath,
					"onclick":"DesktopContent.openNewBrowserTab(" +
					"\"" + name  + "\",\"\"," +
					"\"/WebPath/html/CodeEditor.html?urn=" +
					DesktopContent._localUrnLid + "&" +
					"openDirectoryPrimary=" +
					buildPath + "\",0 /*unique*/);' ", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewWindow' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInNewWindow.png'>"
				/*innerHTML*/, true /*doCloseTag*/);


			str += "<br><br>";
		}

		/////////////
		//show specials
		for(i=0;i<specials.length;++i)
		{
			name = specials[i].getAttribute('value');

			//open in new window
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open folder in a new browser tab: \n" +
					"srcs" + path + "/" + name,
					"onclick":"DesktopContent.openNewBrowserTab(" +
					"\"" + name + "\",\"\"," +
					"\"/WebPath/html/CodeEditor.html?urn=" +
					DesktopContent._localUrnLid + "&" +
					"openDirectoryPrimary=" +
					path + "/" + name + "\",0 /*unique*/);' ", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewWindow' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInNewWindow.png'>"
				/*innerHTML*/, true /*doCloseTag*/);

			//open in other pane
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open folder in the other editor pane of the split-view: \n" +
					"srcs" + path + "/" + name,
					"onclick":"CodeEditor.editor.openDirectory(" +
					(!forPrimary) + ",\"" +
						path + "/" + name + "\");", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewPane' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInOtherPane.png'>"
				/*innerHTML*/, true /*doCloseTag*/);

			//open in this pane
			str += "<a class='dirNavSpecial' onclick='CodeEditor.editor.openDirectory(" +
				forPrimary + ",\"" +
				path + "/" + name + "\"" +
				")' title='Open folder: \nsrcs" + path + "/" + name + "' >" +
				name + "</a>";


			str += "<br>";

		}
		/////////////
		//show special files
		var nameSplit;
		if(specialFiles.length)
		{
			str += "<table>";
			str += "<tr><th>" + path.substr(1,path.length-2) + " Files</th><th style='padding-left:20px'>Repository</th></tr>";
		}
		for(i=0;i<specialFiles.length;++i)
		{
			name = specialFiles[i].getAttribute('value');
			nameSplit = name.split('/');

			var filePath, fileExtension;
			var n = name.lastIndexOf('.');
			if(n > 0) //up to extension
			{
				filePath = name.substr(0,n);
				fileExtension = name.substr(n+1);
			}
			else
			{
				filePath = name;
				fileExtension = "";
			}

			str += "<tr><td>";

			//open in new window
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open file in a new browser tab: \n" +
					"srcs" + name,
					"onclick":"DesktopContent.openNewBrowserTab(" +
					"\"" + nameSplit[nameSplit.length-1] + "\",\"\"," +
					"\"/WebPath/html/CodeEditor.html?urn=" +
					DesktopContent._localUrnLid + "&" +
					"startFilePrimary=" +
					name + "\",0 /*unique*/);' ", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewWindow' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInNewWindow.png'>"
				/*innerHTML*/, true /*doCloseTag*/);

			//open in other pane
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open file in the other editor pane of the split-view: \n" +
					"srcs" + name,
					"onclick":"CodeEditor.editor.openFile(" +
					(!forPrimary) + ",\"" +
					filePath + "\", \"" +
					fileExtension + "\"" +
						");", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewPane' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInOtherPane.png'>"
				/*innerHTML*/, true /*doCloseTag*/);

			//open in this pane
			str += "<a class='dirNavFile' onclick='CodeEditor.editor.openFile(" +
				forPrimary + ",\"" +
				filePath + "\", \"" +
				fileExtension + "\"" +
				")' title='Open file: \nsrcs" + name + "' >";

			str += nameSplit[nameSplit.length-1] + "</a>";



			str += "</td><td style='padding-left:20px'>" + nameSplit[1] + "</td></tr>";

		}
		if(specialFiles.length)
		{
			str += "</table>";
		}
		/////////////
		//show folders
		for(i=0;i<dirs.length;++i)
		{
			name = dirs[i].getAttribute('value');

			//open in new window
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open folder in a new browser tab: \n" +
					"srcs" + path + "/" + name,
					"onclick":"DesktopContent.openNewBrowserTab(" +
					"\"" + name + "\",\"\"," +
					"\"/WebPath/html/CodeEditor.html?urn=" +
					DesktopContent._localUrnLid + "&" +
					"openDirectoryPrimary=" +
					path + "/" + name + "\",0 /*unique*/);' ", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewWindow' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInNewWindow.png'>"
				/*innerHTML*/, true /*doCloseTag*/);

			//open in other pane
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open folder in the other editor pane of the split-view: \n" +
					"srcs" + path + "/" + name,
					"onclick":"CodeEditor.editor.openDirectory(" +
					(!forPrimary) + ",\"" +
						path + "/" + name + "\");", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewPane' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInOtherPane.png'>"
				/*innerHTML*/, true /*doCloseTag*/);

			//open in this pane
			str += "<a class='dirNavFolder' onclick='CodeEditor.editor.openDirectory(" +
				forPrimary + ",\"" +
				path + "/" + name + "\"" +
				")' title='Open folder: \nsrcs" + path + "/" + name + "' >" +
				name + "</a>";


			str += "<br>";

		}
		/////////////
		//show files
		for(i=0;i<files.length;++i)
		{
			name = files[i].getAttribute('value');

			var filePath, fileExtension;
			filePath = path + "/" + name;
			var n = filePath.lastIndexOf('.');
			if(n > 0) //up to extension
			{
				fileExtension = filePath.substr(n+1);
				filePath = filePath.substr(0,n);
			}
			else
			{
				filePath = filePath;
				fileExtension = "";
			}

			//open in new window
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open file in a new browser tab: \n" +
					"srcs" + path + "/" + name,
					"onclick":"DesktopContent.openNewBrowserTab(" +
					"\"" + name + "\",\"\"," +
					"\"/WebPath/html/CodeEditor.html?urn=" +
					DesktopContent._localUrnLid + "&" +
					"startFilePrimary=" +
					path + "/" + name + "\",0 /*unique*/);' ", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewWindow' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInNewWindow.png'>"
				/*innerHTML*/, true /*doCloseTag*/);

			//open in other pane
			str += DesktopContent.htmlOpen("a",
				{
					"title":"Open file in the other editor pane of the split-view: \n" +
					"srcs" + path + "/" + name,
					"onclick":"CodeEditor.editor.openFile(" +
					(!forPrimary) + ",\"" +
					filePath + "\", \"" +
					fileExtension + "\"" +
						");", //end onclick
				},
				"<img class='dirNavFileNewWindowImgNewPane' " +
				"src='/WebPath/images/windowContentImages/CodeEditor-openInOtherPane.png'>"
				/*innerHTML*/, true /*doCloseTag*/);


			//open in this pane
			str += "<a class='dirNavFile' onclick='CodeEditor.editor.openFile(" +
				forPrimary + ",\"" +
				filePath + "\", \"" +
				fileExtension + "\"" +
				")' title='Open file: \nsrcs" + path + "/" + name + "' >" +
				name + "</a>";


			str += "<br>";

		}
		str += "</div>";
		document.getElementById("directoryNav" + forPrimary).innerHTML = str;
	} //end handleDirectoryContent()

	//=====================================================================================
	//openDirectory ~~
	//	open directory to directory nav
	this.openDirectory = function(forPrimary,path,doNotOpenPane)
	{
		forPrimary = forPrimary?1:0;

		if(!path || path == "") path = "/"; //defualt to root
		Debug.log("openDirectory forPrimary=" + forPrimary +
				" path=" + path);

		DesktopContent.XMLHttpRequest("Request?RequestType=" + _requestPreamble +
				"codeEditor" +
				"&option=getDirectoryContent" +
				"&path=" + path
				, "" /* data */,
				function(req)
			{
				CodeEditor.editor.handleDirectoryContent(forPrimary, req);
				CodeEditor.editor.toggleDirectoryNav(forPrimary,1 /*set nav mode*/);


				//if secondary and not shown, show
				if(!doNotOpenPane && !forPrimary && _viewMode == 0)
					CodeEditor.editor.toggleView();

			}); // end codeEditor getDirectoryContent handler
	} //end openDirectory()

	//=====================================================================================
	//openRelatedFile ~~
	//	open the related file in text editor
	this.openRelatedFile = function(forPrimary,inOtherPane)
	{
		Debug.log("openRelatedFile forPrimary=" + forPrimary +
				" path=" + _filePath[forPrimary]);

		var relatedPath = _filePath[forPrimary];
		var relatedExtension = _fileExtension[forPrimary];
		var targetPane = inOtherPane?!forPrimary:forPrimary;

		var altPaths = [];
		var altExtensions = [];

		if(relatedExtension == "html")
		{
			relatedExtension = "js";
			var i = relatedPath.indexOf("/html/");
			if(i >= 0)
			{
				altPaths.push(relatedPath.substr(0,i) + "/css/" +
						relatedPath.substr(i + ("/html/").length));
				altExtensions.push("css");

				relatedPath = relatedPath.substr(0,i) + "/js/" +
						relatedPath.substr(i + ("/html/").length);
			}
			else
			{
				altPaths.push(relatedPath);
				altExtensions.push("css");
			}

			CodeEditor.editor.openFile(targetPane,relatedPath,relatedExtension,
					undefined /*doConfirm*/, undefined/*gotoLine*/,
					altPaths /*altPaths*/, altExtensions/*altExtensions*/);
			return;
		}
		else if(relatedExtension[0] == "h")
		{
			relatedExtension = "cc";

			altPaths.push(relatedPath);
			altExtensions.push("cc");

			altPaths.push(relatedPath+"_interface");
			altExtensions.push("cc");
			altPaths.push(relatedPath+"_processor");
			altExtensions.push("cc");
			altPaths.push(relatedPath+"_slowcontrols");
			altExtensions.push("cc");
			altPaths.push(relatedPath+"_table");
			altExtensions.push("cc");

			altPaths.push(relatedPath);
			altExtensions.push("cpp");
			altPaths.push(relatedPath);
			altExtensions.push("CC");
			altPaths.push(relatedPath);
			altExtensions.push("cxx");
			altPaths.push(relatedPath);
			altExtensions.push("c");
			altPaths.push(relatedPath);
			altExtensions.push("C");
			altPaths.push(relatedPath);
			altExtensions.push("icc");

			//try special plugin addons
			if(relatedPath.indexOf("Interface") >= 0)
				relatedPath += "_interface";
			else if(relatedPath.indexOf("Processor") >= 0)
				relatedPath += "_processor";
			else if(relatedPath.indexOf("Consumer") >= 0)
				relatedPath += "_processor";
			else if(relatedPath.indexOf("Producer") >= 0)
				relatedPath += "_processor";
			else if(relatedPath.indexOf("Controls") >= 0)
				relatedPath += "_slowcontrols";
			else if(relatedPath.indexOf("Table") >= 0)
				relatedPath += "_table";

			CodeEditor.editor.openFile(targetPane,relatedPath,relatedExtension,
					undefined /*doConfirm*/, undefined/*gotoLine*/,
					altPaths /*altPaths*/, altExtensions/*altExtensions*/);
			return;
		}
		else if(relatedExtension == "css")
		{
			relatedExtension = "js";
			var i = relatedPath.indexOf("/css/");

			if(i >= 0)
			{
				altPaths.push(relatedPath.substr(0,i) + "/html/" +
						relatedPath.substr(i + ("/css/").length));
				altExtensions.push("html");

				relatedPath = relatedPath.substr(0,i) + "/js/" +
						relatedPath.substr(i + ("/css/").length);
			}
			else
			{
				altPaths.push(relatedPath);
				altExtensions.push("html");
			}

			CodeEditor.editor.openFile(targetPane,relatedPath,relatedExtension,
					undefined /*doConfirm*/, undefined/*gotoLine*/,
					altPaths /*altPaths*/, altExtensions/*altExtensions*/);
			return;
		}
		else if(relatedExtension[0] == 'c' ||
				relatedExtension[0] == 'C' ||
				relatedExtension == "icc")
		{
			relatedExtension = "h";

			altPaths.push(relatedPath); //with _interface left in
			altExtensions.push("h");

			var i;
			if((i = relatedPath.indexOf("_interface")) > 0 &&
					i == relatedPath.length-("_interface").length)
				relatedPath = relatedPath.substr(0,i); //remove interface
			if((i = relatedPath.indexOf("_processor")) > 0 &&
					i == relatedPath.length-("_processor").length)
				relatedPath = relatedPath.substr(0,i); //remove processor
			if((i = relatedPath.indexOf("_slowcontrols")) > 0 &&
					i == relatedPath.length-("_slowcontrols").length)
				relatedPath = relatedPath.substr(0,i); //remove controls
			if((i = relatedPath.indexOf("_table")) > 0 &&
					i == relatedPath.length-("_table").length)
				relatedPath = relatedPath.substr(0,i); //remove table

			altPaths.push(relatedPath);
			altExtensions.push("hh");
			altPaths.push(relatedPath);
			altExtensions.push("hpp");
			altPaths.push(relatedPath);
			altExtensions.push("hxx");
			altPaths.push(relatedPath);
			altExtensions.push("H");

			CodeEditor.editor.openFile(targetPane,relatedPath,relatedExtension,
					undefined /*doConfirm*/, undefined/*gotoLine*/,
					altPaths /*altPaths*/, altExtensions/*altExtensions*/);
			return;
		}
		else if(relatedExtension == "js")
		{
			relatedExtension = "css";
			var i = relatedPath.indexOf("/js/");

			if(i >= 0)
			{
				altPaths.push(relatedPath.substr(0,i) + "/html/" +
						relatedPath.substr(i + ("/js/").length));
				altExtensions.push("html");

				relatedPath = relatedPath.substr(0,i) + "/css/" +
					relatedPath.substr(i + ("/js/").length);
			}
			else
			{
				altPaths.push(relatedPath);
				altExtensions.push("html");
			}

			CodeEditor.editor.openFile(targetPane,relatedPath,relatedExtension,
					undefined /*doConfirm*/, undefined/*gotoLine*/,
					altPaths /*altPaths*/, altExtensions/*altExtensions*/);
			return;
		}

		Debug.log("Giving up on attempt to open a related file for " +
				relatedPath + "." + relatedExtension +
				"... no known related file.", Debug.HIGH_PRIORITY);

	} //end openRelatedFile ()

	//=====================================================================================
	//openFile ~~
	//	open the file in text editor
	//
	//	Before opening on disk, check the file history stack.
	//
	//	If altPaths provided, they are tried on error
	this.openFile = function(forPrimary,path,extension,doConfirm,gotoLine,
			altPaths,altExtensions,propagateErr)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("openFile forPrimary=" + forPrimary +
				" path=" + path);
		var i = path.lastIndexOf('.');

		//extension should not be included anymore!!
		if(i > 0) //up to extension
		{
			//path = path.substr(0,i);
			if(extension == path.substr(i+1))
				Debug.warn("Does this file have a double extension?! If not, notify admins, this extension is being handled the wrong way!");
		}

		if(!propagateErr) propagateErr = "";

		if(doConfirm)
		{
			DesktopContent.popUpVerification(
					"Do you want to reload the file from the server (and discard your changes)?",
					localDoIt
					);
			return;
		}
		else
		{
			//check the file history stack first
			var keys = Object.keys(_fileHistoryStack);
			var filename = path + "." + extension;
			for(i;i<keys.length;++i)
				if(filename == keys[i])
			{
				Debug.log("Found " + filename + " in file history.");

				//do not open file, just cut to the existing content in stack

				var fileObj = {};
				fileObj.path 			= path;
				fileObj.extension 		= extension;
				fileObj.text 			= _fileHistoryStack[filename][0];
				fileObj.fileWasModified = _fileHistoryStack[filename][2];
				fileObj.fileLastSave 	= _fileHistoryStack[filename][3];

				console.log("fileObj",fileObj);

				CodeEditor.editor.handleFileContent(forPrimary,0,fileObj);

				CodeEditor.editor.toggleDirectoryNav(forPrimary, false /*set val*/);

				//if secondary and not shown, show
				if(!forPrimary && _viewMode == 0)
					CodeEditor.editor.toggleView();

				return;
			}

			localDoIt();
		}

		function openGitLink(path, extension, gotoLine) {
			const gitPath = path.includes("/include/")
				? path.substr(path.indexOf("/include/") + 9)
				: path;
			DesktopContent.XMLHttpRequest(
				"Request?RequestType=readOnlycodeEditor&option=getFileGitURL&path=" + gitPath + "&ext=" + extension,
				"",
				function (req) {
					const xml = DesktopContent.getXMLValue(req, "gitPath");
					if (xml) window.open(xml, '_blank');
				}
			);
		}

		function localDoIt()
		{
			if (path && path.includes("spack")) {
				Debug.warn("File is not in sources. Opening in repo...")
				openGitLink(path, extension);
				window.close();
				return;
			}
			CodeEditor.editor.toggleDirectoryNav(forPrimary,false /*set val*/);

			DesktopContent.XMLHttpRequest("Request?RequestType=" + _requestPreamble +
					"codeEditor" +
					"&option=getFileContent" +
					"&path=" + path +
					"&ext=" + extension
					, "" /* data */,
					function(req)
				{

					var err = DesktopContent.getXMLValue(req,"Error"); //example application level error
					if(err)
					{
						if(altPaths && altPaths.length &&
								altExtensions && altExtensions.length) //if other files to try, try them
						{
							//Debug.log(err,Debug.INFO_PRIORITY);	//do not call error until final attempt
							CodeEditor.editor.openFile(forPrimary,
									altPaths.splice(0,1)[0], //try first alt path
									altExtensions.splice(0,1)[0], //try first alt extension
									undefined /*doConfirm*/, undefined/*gotoLine*/,
									altPaths /*altPaths*/, altExtensions/*altExtensions*/,
									propagateErr + err /* propagateErr */ );
						}
						else //not alt files, so this is an error
							Debug.log(propagateErr + err,Debug.HIGH_PRIORITY);	//log error and create pop-up error box


						return;
					}


					try
					{
						CodeEditor.editor.toggleDirectoryNav(forPrimary,0 /*set nav mode*/);
						CodeEditor.editor.handleFileContent(forPrimary, req, undefined /*fileObj*/,
							function()
							{
								Debug.log("Goto line handler after file content loaded...");
								if(gotoLine !== undefined)
									CodeEditor.editor.gotoLine(forPrimary,gotoLine);
							});

						//if secondary and not shown, show
						if(!forPrimary && _viewMode == 0)
							CodeEditor.editor.toggleView();

					}
					catch(e)
					{
						Debug.log("Ignoring error handling file open:[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e);
					}
					console.log(DesktopContent._loadBox.style.display);

				}, //end codeEditor getFileContent handler
				0 /*reqParam*/, 0 /*progressHandler*/, 1 /*callHandlerOnErr*/);
		} //end localDoIt()
	} //end openFile()

	//=====================================================================================
	//getLine ~~
	//	returns current cursor with line number
	this.getLine = function(forPrimary)
	{
		Debug.log("getLine() forPrimary=" + forPrimary);


		var el = _eel[forPrimary];
		var cursor = CodeEditor.editor.getCursor(el);
		cursor.line = 1;
		if(cursor.startNodeIndex === undefined)
		{
			Debug.log("No cursor, so defaulting to top");
			return cursor;
		}


		var i,n,node,val;
		for(n=0; n<el.childNodes.length; ++n)
		{
			node = el.childNodes[n];
			val = node.textContent;


			for(i=0;i<val.length;++i)
			{
				//want to be one character past new line
				if(!cursor.focusAtEnd &&
						n == cursor.startNodeIndex &&
						i == cursor.startPos)
					break; //done counting lines in this value
				else if(cursor.focusAtEnd &&
						n == cursor.endNodeIndex &&
						i == cursor.endPos)
					break; //done counting lines in this value

				if(val[i] == '\n')
					++cursor.line;
			}

			//when completed start node, done
			if(!cursor.focusAtEnd &&
					n == cursor.startNodeIndex)
			{
				Debug.log("Found cursor at line " + cursor.line);
				break; //done!
			}
			else if(cursor.focusAtEnd &&
					n == cursor.endNodeIndex)
			{
				Debug.log("Found cursor at line " + cursor.line);
				break; //done!
			}
		} //end line count loop

		return cursor;
	} //end getLine()

	//=====================================================================================
	//gotoLine ~~
	this.gotoLine = function(forPrimary,line,selectionCursor,topOfView)
	{
		line = line | 0;
		if(line < 1) line = 1;
		if(line > _numberOfLines[forPrimary])
			line = _numberOfLines[forPrimary];
		console.log("Goto line number ",line,selectionCursor);

		if(topOfView)
			window.location.href = "#" + forPrimary + "L" + line;

		//then set cursor, so moving the cursor does not lose position
		// steps:
		//	count new lines while going through elements, then set cursor there

		var el = _eel[forPrimary];

		if(line < 2)
		{
			//cursor is placed at line 1
			//0 element and index, set cursor
			var cursor = {
				"startNodeIndex": 0,
				"startPos":0,
				"endNodeIndex":0,
				"endPos":0,
			};

			//if selection cursor, handle highlighting
			if(selectionCursor)
			{
				cursor.endNodeIndex = selectionCursor.startNodeIndex;
				cursor.endPos = selectionCursor.startPos;
				cursor.focusAtEnd = selectionCursor.focusAtEnd;
			}
			CodeEditor.editor.setCursor(el,cursor,true /*scrollIntoView*/);

			return line;
		}

		var i,n,node,el,val;
		var lineCount = 1;
		var found = false;
		var newLine = false;

		var lastNode = 0;
		var lastPos = 0;
		for(n=0; n<el.childNodes.length; ++n)
		{
			node = el.childNodes[n];
			val = node.textContent;


			for(i=0;i<val.length;++i)
			{
				if(newLine)
				{
					lastNode = n;
					lastPos = i;
				}

				//want to be one character past new line
				if(line == lineCount)
				{

					Debug.log("Found line " + line);
					found = true;
					try // highlight line number
					{
						document.getElementsByName(forPrimary + "L" + line)[0].style.backgroundColor = "yellow";
						document.getElementsByName(forPrimary + "L" + line)[0].style.color = "red";
						if(_fileLastLineNumberHighlight[forPrimary] != -1) //unhighlight previous
						{
							Debug.log("Found line " + _fileLastLineNumberHighlight[forPrimary]);
							document.getElementsByName(forPrimary + "L" + _fileLastLineNumberHighlight[forPrimary])[0].style.backgroundColor = "inherit";
							document.getElementsByName(forPrimary + "L" + _fileLastLineNumberHighlight[forPrimary])[0].style.color = "black";
							_fileLastLineNumberHighlight[forPrimary] = -1;
						}
					}
					catch(e){} //ignore highlight errors
					_fileLastLineNumberHighlight[forPrimary] = line;
					break;
				}

				newLine = false;
				if(val[i] == '\n')
				{
					++lineCount;
					newLine = true;
				}
			}
			if(found) break;
		} //end line count loop


		//have element in index, set cursor
		var cursor = {
			"startNodeIndex":lastNode,
			"startPos":lastPos,
			"endNodeIndex":lastNode,
			"endPos":lastPos,
		};


		//if selection cursor, handle highlighting
		if(selectionCursor)
		{
			cursor.focusAtEnd = selectionCursor.focusAtEnd;

			if(lastNode < selectionCursor.startNodeIndex ||
					(	lastNode == selectionCursor.startNodeIndex &&
						lastPos < selectionCursor.startPos))
			{
				cursor.endNodeIndex = selectionCursor.startNodeIndex;
				cursor.endPos = selectionCursor.startPos;
			}
			else
			{
				cursor.startNodeIndex = selectionCursor.startNodeIndex;
				cursor.startPos = selectionCursor.startPos;
			}


			CodeEditor.editor.setCursor(el,cursor,
					true /*scrollIntoView*/);
			return line;
		}


		CodeEditor.editor.setCursor(el,cursor,true /*scrollIntoView*/);

		return line;

	} //end gotoLine

	//=====================================================================================
	//handleFileContent ~~
	//	redraw text editor based on file content in req response
	//
	//	if req is undefined, attempts to use
	//		fileObj:={path, extension, text, fileWasModified, fileLastSave}
	this.handleFileContent = function(forPrimary,req,fileObj,handlerAfterLoading)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("handleFileContent forPrimary=" + forPrimary);
		console.log(req);

		var path;
		var extension;
		var text;
		var fileWasModified, fileLastSave;

		if(req)
		{
			path 				= DesktopContent.getXMLValue(req,"path");
			extension 			= DesktopContent.getXMLValue(req,"ext");
			text 				= DesktopContent.getXMLValue(req,"content");
			fileWasModified 	= false;
			fileLastSave 		= 0; //default time to 0
		}
		else
		{
			path 				= fileObj.path;
			extension 			= fileObj.extension;
			text 				= fileObj.text;
			fileWasModified 	= fileObj.fileWasModified;
			fileLastSave 		= fileObj.fileLastSave;
		}

		//replace weird space characters (e.g. from emacs tab character two &#160's)
		//	with spaces
		text = text.replace(new RegExp(
					String.fromCharCode(160),'g'),' ');//String.fromCharCode(160,160),'g'),'\t');

		//console.log(text);

		_filePath[forPrimary] = path;
		_fileExtension[forPrimary] = extension;
		_fileWasModified[forPrimary] = fileWasModified;
		_fileLastSave[forPrimary] = fileLastSave;

		_undoStack[forPrimary] = []; //clear undo stack
		_undoStackLatestIndex[forPrimary] = -1; //reset latest undo index

		var el = _eel[forPrimary];

		//do decor in timeout to show loading
		DesktopContent.showLoading(function()
				{
					try
					{
						el.textContent = text;
						CodeEditor.editor.displayFileHeader(forPrimary);
						if(handlerAfterLoading)
							handlerAfterLoading();
					}
					catch(e)
					{ Debug.log("Ignoring error:[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e); }
				});	 //end show loading

	} //end handleFileContent()

	//=====================================================================================
	//setCursor ~~
	this.setCursor = function(el,inCursor,scrollIntoView)
	{
		if(inCursor.startNodeIndex !== undefined)
		{
			//make a copy of cursor, in case modifications are needed
			var cursor = {
				"startNodeIndex":	inCursor.startNodeIndex,
				"startPos":			inCursor.startPos,
				"endNodeIndex":		inCursor.endNodeIndex,
				"endPos":			inCursor.endPos,
				"focusAtEnd":		inCursor.focusAtEnd,
			};

			//if focus is at end, set scrollEndIntoView
			var scrollEndIntoView = cursor.focusAtEnd?true:false;

			try
			{
				console.log("set cursor",cursor,"scrollIntoView=",scrollIntoView,
						"scrollEndIntoView=",scrollEndIntoView);

				var range = document.createRange();

				var firstEl = el.childNodes[cursor.startNodeIndex];
				//if(firstEl.firstChild)
				//	firstEl = firstEl.firstChild;

				var secondEl = el.childNodes[cursor.endNodeIndex];
				//if(secondEl.firstChild)
				//	secondEl = secondEl.firstChild;

				if(scrollIntoView)
				{
					Debug.log("scrollIntoView");

					//try to scroll end element and then first element,
					//	but if it fails then it is likely text
					//Note: for scrollIntoView() to work, it seems
					//	browser requires at least one character in the
					//	scrolling element.


					Debug.log("inserting scroll 2nd element");
					try
					{
						//add an element to scroll into view and then remove it
						var val = secondEl.textContent;
						if(cursor.endPos < val.length)
						{
							var newNode1 = document.createTextNode(
									val.substr(0,cursor.endPos)); //pre-special text
							el.insertBefore(newNode1,secondEl);

							var newNode = document.createElement("label");
							newNode.textContent = val[cursor.endPos]; //special text
							el.insertBefore(newNode,secondEl);

							if(cursor.endPos+1 < val.length)
								secondEl.textContent = val.substr(cursor.endPos+1); //post-special text
							else
								secondEl.textContent = "";

							newNode.scrollIntoViewIfNeeded(); //target the middle special text

							el.removeChild(newNode);
							el.removeChild(newNode1);
							secondEl.textContent = val;
						}
						else if(cursor.endNodeIndex+1 < el.childNodes.length) //if is the end of the first element, focus on next element
						{
							//el.childNodes[cursor.endNodeIndex+1].scrollIntoViewIfNeeded();
							//Note: #text type is not scrollable and neither is an empty node
							// instead of toying with it, just add a node that can be scrolled to
							var newNode = document.createElement("label");
							newNode.textContent = " "; //special text
							el.insertBefore(newNode,el.childNodes[cursor.endNodeIndex+1]);
							newNode.scrollIntoViewIfNeeded(); //target the middle special text
							el.removeChild(newNode);
						}

					}
					catch(e)
					{
						Debug.log("Failed to scroll to inserted 2nd element:[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e);
						//the following tends to cause the jump to the top
//						try
//						{
//							secondEl.scrollIntoViewIfNeeded();
//						}
//						catch(e)
//						{
//							Debug.log("Failed to scroll 2nd element:[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e);
//						}
					}


					Debug.log("inserting scroll 1st element");
					try
					{


						if(!scrollEndIntoView)
						{
							//add an element to scroll into view and then remove it
							firstEl = el.childNodes[cursor.startNodeIndex];
							var val = firstEl.textContent;
							if(cursor.startPos < val.length)
							{
								var newNode1 = document.createTextNode(
										val.substr(0,cursor.startPos)); //pre-special text

								el.insertBefore(newNode1,firstEl);

								var newNode = document.createElement("label");
								newNode.textContent = val[cursor.startPos]; //special text
								el.insertBefore(newNode,firstEl);

								firstEl.textContent = val.substr(cursor.startPos+1); //post-special text

								newNode.scrollIntoViewIfNeeded();

								//now remove new nodes
								el.removeChild(newNode);
								el.removeChild(newNode1);
								firstEl.textContent = val;
							}
							else if(cursor.startNodeIndex+1 < el.childNodes.length) //if is the end of the first element, focus on next element
							{
								//el.childNodes[cursor.startNodeIndex+1].scrollIntoViewIfNeeded();
								//Note: #text type is not scrollable and neither is an empty node
								// instead of toying with it, just add a node that can be scrolled to
								var newNode = document.createElement("label");
								newNode.textContent = " "; //special text
								el.insertBefore(newNode,el.childNodes[cursor.startNodeIndex+1]);
								newNode.scrollIntoViewIfNeeded(); //target the middle special text
								el.removeChild(newNode);
							}
						}
						else
							Debug.log("scrollEndIntoView only");
					}
					catch(e)
					{
						Debug.log("Failed to scroll to inserted 1st element:[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e);

						//the following tends to cause the jump to the top
//						try
//						{
//							firstEl.scrollIntoViewIfNeeded();
//						}
//						catch(e)
//						{
//							Debug.log("Failed to scroll 1st element:[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e);
//						}
					}




				} //end scrollIntoView

				if(firstEl.firstChild)
					firstEl = firstEl.firstChild;
				if(secondEl.firstChild)
					secondEl = secondEl.firstChild;

				range.setStart(firstEl,
						cursor.startPos);
				range.setEnd(secondEl,
						cursor.endPos);

				//el.focus();
				var selection = window.getSelection();
				selection.removeAllRanges();
				selection.addRange(range);

				//if selecting forward, then place focus on end element
				if(scrollEndIntoView)
					selection.extend(secondEl,cursor.endPos);
				//else
				//	selection.extend(firstEl,cursor.startPos);

				if(scrollIntoView)
					el.focus();



			}
			catch(err)
			{
				console.log("set cursor err:",err);
			}
		} //end set cursor placement
	} //end setCursor()

	//=====================================================================================
	//createCursorFromContentPosition ~~
	this.createCursorFromContentPosition = function(el,startPos,endPos)
	{
		//handle get cursor location
		var cursor = {
			"startNodeIndex":undefined,
			"startPos":undefined,
			"endNodeIndex":undefined,
			"endPos":undefined
		};


		var sum = 0;
		var oldSum = 0;

		try
		{
			//find start and end node index
			for(i=0;i<el.childNodes.length;++i)
			{
				sum += el.childNodes[i].textContent.length;

				if(cursor.startNodeIndex === undefined &&
						startPos >= oldSum &&
						startPos < sum)
				{
					//found start node
					cursor.startNodeIndex = i;
					cursor.startPos = startPos - oldSum;
				}
				if(endPos >= oldSum &&
						endPos < sum)
				{
					//found start node
					cursor.endNodeIndex = i;
					cursor.endPos = endPos - oldSum;
					break; //done!
				}

				oldSum = sum;
			}

			console.log("createCursorFromContentPosition:",cursor);

		}
		catch(err)
		{
			console.log("get cursor err:",err);
		}
		return cursor;

	} //end createCursorFromContentPosition()

	//=====================================================================================
	//getCursor ~~
	this.getCursor = function(el)
	{
		//handle get cursor location
		var cursor = {
			"startNodeIndex":undefined,
			"startPos":undefined,
			"endNodeIndex":undefined,
			"endPos":undefined,
			"startPosInContent":undefined,
			"endPosInContent":undefined,
			"focusAtEnd":undefined
		};

		var sum = 0;
		try
		{
			var selection = window.getSelection();
			var range = selection.getRangeAt(0);
			var focusNode = selection.focusNode;
			var extentNode = selection.extentNode;

			cursor.startPos = range.startOffset;
			cursor.endPos = range.endOffset;

			//find start and end node index
			for(i=0;i<el.childNodes.length;++i)
			{
				if(cursor.startNodeIndex === undefined &&
						(
							el.childNodes[i] == range.startContainer ||
							el.childNodes[i] == range.startContainer.parentNode ||
							el.childNodes[i] == range.startContainer.parentNode.parentNode ||
							el.childNodes[i] == range.startContainer.parentNode.parentNode.parentNode) )
				{
					cursor.startNodeIndex = i;
					cursor.startPosInContent = sum + cursor.startPos;

					if(focusNode == range.startContainer ||
							extentNode == range.startContainer)
						cursor.focusAtEnd = false; //focus is at start
				}

				if(el.childNodes[i] == range.endContainer ||
						el.childNodes[i] == range.endContainer.parentNode ||
						el.childNodes[i] == range.endContainer.parentNode.parentNode ||
						el.childNodes[i] == range.startContainer.parentNode.parentNode.parentNode)
				{
					cursor.endNodeIndex = i;
					cursor.endPosInContent = sum + cursor.endPos;

					if(cursor.focusAtEnd == undefined &&
							(focusNode == range.endContainer ||
								extentNode == range.endContainer))
						cursor.focusAtEnd = true; //focus is at end

					break; //done!
				}

				sum += el.childNodes[i].textContent.length;
			}

			//console.log("get cursor",cursor);


		}
		catch(err)
		{
			console.log("get cursor err:",err);
		}
		return cursor;
	} //end getCursor()

	//=====================================================================================
	//updateDecorations ~~
	//	redraw text editor based on file content in req response
	var _DECORATION_RED = "rgb(202, 52, 52)";
	var _DECORATION_BLUE = "rgb(64, 86, 206)";
	var _DECORATION_GREEN = "rgb(33, 175, 60)";
	var _DECORATION_BLACK = "rgb(5, 5, 5)";
	var _DECORATION_GRAY = "rgb(162, 179, 158)";
	var _DECORATIONS = {
		"txt": {
			"ADD_SUBDIRECTORY" 		: _DECORATION_RED,
			"include_directories"	: _DECORATION_RED,
			"simple_plugin"			: _DECORATION_RED,
			"set" 					: _DECORATION_RED,
			"install_headers" 		: _DECORATION_RED,
			"install_source"		: _DECORATION_RED,
			"enable_testing"		: _DECORATION_RED,
			"CMAKE_MINIMUM_REQUIRED": _DECORATION_RED,
			"include"				: _DECORATION_RED,
			"create_doxygen_documentation": _DECORATION_RED,
			"Not"					: _DECORATION_RED,
			"FAILED"				: _DECORATION_RED,
			"FAIL"					: _DECORATION_RED,
			"ERROR"					: _DECORATION_RED,
			"BAD"					: _DECORATION_RED,
			"OK"					: _DECORATION_GREEN,
			"DONE"					: _DECORATION_GREEN,
			"GOOD"					: _DECORATION_GREEN,
			"LOCKED"				: _DECORATION_GREEN,
		},
		"c++": {
			"#define" 				: _DECORATION_RED,
			"#undef" 				: _DECORATION_RED,
			"#include" 				: _DECORATION_RED,
			"#ifndef" 				: _DECORATION_RED,
			"#if"	 				: _DECORATION_RED,
			"#else" 				: _DECORATION_RED,
			"#endif" 				: _DECORATION_RED,
			"using"					: _DECORATION_RED,
			"namespace" 			: _DECORATION_RED,
			"class" 				: _DECORATION_RED,
			"public" 				: _DECORATION_RED,
			"private" 				: _DECORATION_RED,
			"protected"				: _DECORATION_RED,
			"static" 				: _DECORATION_RED,
			"virtual" 				: _DECORATION_RED,
			"override" 				: _DECORATION_RED,
			"const" 				: _DECORATION_RED,
			"void"	 				: _DECORATION_RED,
			"bool"	 				: _DECORATION_RED,
			"unsigned" 				: _DECORATION_RED,
			"int"	 				: _DECORATION_RED,
			"uint64_t" 				: _DECORATION_RED,
			"uint32_t" 				: _DECORATION_RED,
			"uint16_t" 				: _DECORATION_RED,
			"uint8_t" 				: _DECORATION_RED,
			"size_t" 				: _DECORATION_RED,
			"time_t" 				: _DECORATION_RED,
			"long"	 				: _DECORATION_RED,
			"float"	 				: _DECORATION_RED,
			"double" 				: _DECORATION_RED,
			"return" 				: _DECORATION_RED,
			"char" 					: _DECORATION_RED,
			"if" 					: _DECORATION_RED,
			"else" 					: _DECORATION_RED,
			"for" 					: _DECORATION_RED,
			"while" 				: _DECORATION_RED,
			"do"	 				: _DECORATION_RED,
			"switch" 				: _DECORATION_RED,
			"case" 					: _DECORATION_RED,
			"default" 				: _DECORATION_RED,
			"try" 					: _DECORATION_RED,
			"catch"					: _DECORATION_RED,
			"this"					: _DECORATION_RED,
			"true"					: _DECORATION_RED,
			"false"					: _DECORATION_RED,
			"auto"					: _DECORATION_RED,

			"fstream"				: _DECORATION_GREEN,
			"sstream"				: _DECORATION_GREEN,
			"istream"				: _DECORATION_GREEN,
			"ostream"				: _DECORATION_GREEN,

			"std"					: _DECORATION_GREEN,
			"ots"					: _DECORATION_GREEN,
			"ConfigurationTree"		: _DECORATION_GREEN,
			"string" 				: _DECORATION_GREEN,
			"set" 					: _DECORATION_GREEN,
			"vector"				: _DECORATION_GREEN,
			"array"					: _DECORATION_GREEN,
			"pair"					: _DECORATION_GREEN,
			"get" 					: _DECORATION_GREEN,
			"map" 					: _DECORATION_GREEN,
			"endl" 					: _DECORATION_GREEN,
			"runtime_error"			: _DECORATION_GREEN,
			"memcpy"				: _DECORATION_GREEN,
			"cout"					: _DECORATION_GREEN,
		},
		"js": {
			"this" 					: _DECORATION_RED,
			"var" 					: _DECORATION_RED,
			"return" 				: _DECORATION_RED,
			"function"				: _DECORATION_RED,
			"if" 					: _DECORATION_RED,
			"else" 					: _DECORATION_RED,
			"for" 					: _DECORATION_RED,
			"while" 				: _DECORATION_RED,
			"do"	 				: _DECORATION_RED,
			"switch" 				: _DECORATION_RED,
			"case" 					: _DECORATION_RED,
			"default" 				: _DECORATION_RED,
			"try" 					: _DECORATION_RED,
			"catch"					: _DECORATION_RED,
			"new" 					: _DECORATION_RED,
			"instanceof" 			: _DECORATION_RED,
			"true"					: _DECORATION_RED,
			"false"					: _DECORATION_RED,

			"Debug"					: _DECORATION_GREEN,
			"DesktopContent"		: _DECORATION_GREEN,
			"HIGH_PRIORITY"			: _DECORATION_GREEN,
			"WARN_PRIORITY"			: _DECORATION_GREEN,
			"INFO_PRIORITY"			: _DECORATION_GREEN,
			"LOW_PRIORITY"			: _DECORATION_GREEN,

			"Math"					: _DECORATION_GREEN,
			"String"				: _DECORATION_GREEN,
			"window"				: _DECORATION_GREEN,
			"document"				: _DECORATION_GREEN,
			"textContent"			: _DECORATION_GREEN,
			"innerHTML"				: _DECORATION_GREEN,
		},
		"sh" : {
			"if" 					: _DECORATION_RED,
			"then" 					: _DECORATION_RED,
			"else" 					: _DECORATION_RED,
			"fi" 					: _DECORATION_RED,
			"for" 					: _DECORATION_RED,
			"in" 					: _DECORATION_RED,
			"while" 				: _DECORATION_RED,
			"do"	 				: _DECORATION_RED,
			"done"	 				: _DECORATION_RED,
			"switch" 				: _DECORATION_RED,
			"case" 					: _DECORATION_RED,
			"default" 				: _DECORATION_RED,
			"export" 				: _DECORATION_RED,

			"echo" 					: _DECORATION_GREEN,
			"cd"					: _DECORATION_GREEN,
			"cp"					: _DECORATION_GREEN,
			"rm"					: _DECORATION_GREEN,
			"cat"					: _DECORATION_GREEN,
			"wget"					: _DECORATION_GREEN,
			"chmod"					: _DECORATION_GREEN,
			"sleep"					: _DECORATION_GREEN,
		}
	};
	this.updateDecorations = function(forPrimary,forceDisplayComplete,forceDecorations)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("updateDecorations forPrimary=" + forPrimary + " forceDisplayComplete=" + forceDisplayComplete);

		var el = _eel[forPrimary];
		var elTextObj = {"text":el.textContent,"time":Date.now()};
		var wasSnapshot = CodeEditor.editor.updateFileSnapshot(forPrimary,
				elTextObj);

		if(wasSnapshot || forceDisplayComplete)
			CodeEditor.editor.updateOutline(forPrimary,elTextObj);

		if(!forceDecorations && !wasSnapshot)
		{
			Debug.log("unchanged, skipping decorations");

			return;
		}


		var i, j;
		var val;

		//get cursor location
		var cursor = CodeEditor.editor.getCursor(el);


		//update last save field
		CodeEditor.editor.updateLastSave(forPrimary);


		var n;
		var decor, fontWeight;
		var specialString;
		var commentString = "#";
		//var blockCommentStartString,blockCommentEndString; //TODO

		if(_fileExtension[forPrimary][0] == 'c' ||
				_fileExtension[forPrimary][0] == 'C' ||
				_fileExtension[forPrimary][0] == 'h' ||
				_fileExtension[forPrimary][0] == 'j' ||
				_fileExtension[forPrimary] == "icc")
		{
			commentString = "//"; //comment string
			//blockCommentStartString = "/*"; //TODO
			//blockCommentEndString = "*/"; //TODO
		}

//		if(_fileExtension[forPrimary].length > 2 &&
//				_fileExtension[forPrimary].substr(0,3) == "htm")
//		{
//			blockCommentStartString = "<!--"; //TODO
//			blockCommentEndString = "-->";		//TODO
//		}


		var fileDecorType = "txt";
		if(	_fileExtension[forPrimary] == "html" ||
				_fileExtension[forPrimary] == "js")
			fileDecorType = "js"; //js style
		else if(_fileExtension[forPrimary][0] == 'c' ||
				_fileExtension[forPrimary][0] == 'C' ||
				_fileExtension[forPrimary][0] == 'h' ||
				_fileExtension[forPrimary][0] == 'j' ||
				_fileExtension[forPrimary] == "icc")
			fileDecorType = "c++"; //c++ style
		else if(_fileExtension[forPrimary] == 'sh' ||
				_fileExtension[forPrimary] == 'py')
			fileDecorType = "sh"; //script style

		var newNode;
		var node;

		var startOfWord = -1;
		var startOfString = -1;
		var stringQuoteChar; // " or '
		var escapeCount; //to identify escape \\ even number
		var startOfComment = -1;
		var firstSpecialStringStartHandling = true;
		var firstSpecialStringEndHandling = true;
		var endPositionCache; //used to restore end position if special string not closed

		var done = false; //for debuggin

		var eatNode;
		var eatVal;
		var closedString;

		var prevChar;

		/////////////////////////////////
		function localInsertLabel(startPos, isQuote)
		{
			//split text node into 3 nodes.. text | label | text

			newNode = document.createTextNode(val.substr(0,startPos)); //pre-special text
			el.insertBefore(newNode,node);

			newNode = document.createElement("label");
			newNode.style.fontWeight = fontWeight; //bold or normal
			newNode.style.color = decor;
			newNode.textContent = specialString; //special text

			el.insertBefore(newNode,node);

			if(isQuote)
			{
				var str = newNode.textContent;
				str = str.substr(str.lastIndexOf('.')+1);

				//note that trailing " or ' is still there
				if(str.length > 0 && str.length <= 4 && (
						str[0] == 'c' ||
						str[0] == 'C' ||
						str[0] == 'h' ||
						str.substr(0,3) == "txt" ||
						str.substr(0,2) == "py" ||
						str.substr(0,2) == "sh" ||
						str[0] == "j"
				))
				{
					Debug.log("is quote " + str);

					newNode.onmouseover = function(e)
					{
						window.clearTimeout(_fileStringHoverTimeout);

						var x = this.offsetWidth + this.offsetLeft + 64;
						var y = this.offsetTop;
						e.stopPropagation();//to stop body behavior
						//Debug.log("loc " + x + " " + y);

						if(_fileStringHoverEl.parentNode)
						{ //then delete the element
							_fileStringHoverEl.parentNode.removeChild(_fileStringHoverEl);
						}
						else
						{
							//make the element
							_fileStringHoverEl = document.createElement("div");
							_fileStringHoverEl.setAttribute("id","fileStringHoverEl");
							_fileStringHoverEl.setAttribute("contentEditable","false");
							_fileStringHoverEl.onmouseover = function(e)
								{ //prevent body mouseover handling
								window.clearTimeout(_fileStringHoverTimeout);
								e.stopPropagation();
								};
						}

						_fileStringHoverEl.style.display = 'none';

						var str = "";
						var name = this.textContent;

						//translate to proper path
						name = name.substr(1,name.length-2); //remove quotes
						var nameArr = name.split('/');
						if(nameArr.length == 0)
						{
							Debug.log("empty name array, error! name = " + name);
							return;
						}
						else if(nameArr.length > 1 && nameArr[0] == "" &&
								nameArr[1] == "WebPath")
						{
							name = "/otsdaq_utilities/WebGUI" +
									name.substr(("/WebPath").length);
						}
						else if(nameArr[0] != "")
						{
							//look-up first entry
							var i = nameArr[0].indexOf('-');
							if(i > 0) //change -'s to _
							{
								var repo = "";
								if(nameArr[0] != "otsdaq-core")
								{
									nameArr[0] = nameArr[0].substr(0,i) + '_'
											+ nameArr[0].substr(i+1); //change - to _
								}
								else
									nameArr[0] = "otsdaq";


							}
							//add repo name first
							name = "/" + nameArr[0] + "/" + name;
						}


						Debug.log("name " + name);

						var filePath, fileExtension;
						var n = name.lastIndexOf('.');
						if(n > 0) //up to extension
						{
							filePath = name.substr(0,n);
							fileExtension = name.substr(n+1);
						}
						else
						{
							filePath = name;
							fileExtension = "";
						}

						//open in this pane
						str += DesktopContent.htmlOpen("a",
								{
										"title":"Open file in this editor pane: \n" +
										"srcs" + name,
										"onclick":"CodeEditor.editor.openFile(" +
										(forPrimary) + ",\"" +
										filePath + "\", \"" +
										fileExtension + "\"" +
										");", //end onclick
								},
								"<div " +
								"style='float: left; padding: 1px 0 1px 6px;'>" +
								"<div " +
								"style='border:1px solid rgb(99, 98, 98); border-radius: 2px; width: 9px;" +
								"height: 9px;  '></div></div>"
								/*innerHTML*/, true /*doCloseTag*/);
						//open in other pane
						str += DesktopContent.htmlOpen("a",
								{
										"title":"Open file in the other editor pane of the split-view: \n" +
										"srcs" + name,
										"onclick":"CodeEditor.editor.openFile(" +
										(!forPrimary) + ",\"" +
										filePath + "\", \"" +
										fileExtension + "\"" +
										");", //end onclick
								},
								"<div " +
								"style='float: left; padding: 0;'>" +
								"<img class='dirNavFileNewWindowImgNewPane' " +
								"src='/WebPath/images/windowContentImages/CodeEditor-openInOtherPane.png'></div>"
								/*innerHTML*/, true /*doCloseTag*/);
						//open in new window
						str += DesktopContent.htmlOpen("a",
								{
										"title":"Open file in a new browser tab: \n" +
										"srcs" + name,
										"onclick":"DesktopContent.openNewBrowserTab(" +
										"\"" + nameArr[nameArr.length-1] + "\",\"\"," +
										"\"/WebPath/html/CodeEditor.html?urn=" +
										DesktopContent._localUrnLid + "&" +
										"startFilePrimary=" +
										name + "\",0 /*unique*/);' ", //end onclick
								},
								"<div " +
								"style='float: left; padding: 0 6px 0 0;'>" +
								"<img class='dirNavFileNewWindowImgNewWindow' " +
								"src='/WebPath/images/windowContentImages/CodeEditor-openInNewWindow.png'></div>"
								/*innerHTML*/, true /*doCloseTag*/);

						_fileStringHoverEl.innerHTML = str;

						this.parentNode.appendChild(_fileStringHoverEl);

						//position + left for line numbers
						_fileStringHoverEl.style.left = x + "px";
						_fileStringHoverEl.style.top = y + "px";

						_fileStringHoverEl.style.display = 'block';

					} //end special file name string mouseover
				} //end special file string handling
			} //end quote handling


			node.textContent = val.substr(i); //post-special text


			//handle cursor position update
			if(cursor.startNodeIndex !== undefined)
			{
				if(n < cursor.startNodeIndex)
				{
					//cursor is in a later node
					cursor.startNodeIndex += 2; //two nodes were inserted
					cursor.endNodeIndex += 2; //two nodes were inserted
				}
				else
				{
					//handle start and stop independently

					//handle start
					if(n == cursor.startNodeIndex)
					{
						//determine if cursor is in one of of new nodes
						if(cursor.startPos < startPos)
						{
							//then in first new element, and
							// start Node and Pos are still correct
						}
						else if(cursor.startPos < i)
						{
							//then in second new element, adjust Node and Pos
							++cursor.startNodeIndex;
							cursor.startPos -= startPos;
						}
						else
						{
							//then in original last element, adjust Node and Pos
							cursor.startNodeIndex += 2;
							if(val[cursor.startPos-1] == '\r') --cursor.startPos; //get before any \r
							cursor.startPos -= i;
						}
					} //end start handling

					//handle end
					if(n == cursor.endNodeIndex)
					{
						//determine if cursor is in one of of new nodes
						if(cursor.endPos < startPos)
						{
							//then in first new element, and
							// end Node and Pos are still correct
						}
						else if(cursor.endPos < i)
						{
							//then in second new element, adjust Node and Pos
							++cursor.endNodeIndex;
							cursor.endPos -= startPos;
						}
						else
						{
							//then in original last element, adjust Node and Pos
							cursor.endNodeIndex += 2;
							if(val[cursor.endPos-1] == '\r') --cursor.endPos; //get before any \r
							cursor.endPos -= i;

						}
					}
					else if(n < cursor.endNodeIndex)
					{
						cursor.endNodeIndex += 2; //two new elements were added in front
					}//end end handling

				}
			} //end cursor position update

			n += 1; //to return to same modified text node

		} //end localInsertLabel

		for(n=0;!done && n<el.childNodes.length;++n)
		{
			node = el.childNodes[n];
			val = node.textContent; //.nodeValue; //.wholeText

			if(node.nodeName == "LABEL" ||
					node.nodeName == "FONT" ||
					node.nodeName == "SPAN" ||
					node.nodeName == "PRE")
			{
				//console.log("Label handling...",val);

				//if value is no longer a special word, quote, nor comment, then remove label
				if((_DECORATIONS[fileDecorType][val] === undefined &&
							(val[0] != commentString[0] || //break up comment if there is a new line
								val.indexOf('\n') >= 0)	&&
							val[0] != '"') ||
						//or if cursor is nearby
						(n+1 >= cursor.startNodeIndex && n-1 <= cursor.endNodeIndex))
				{
					//Debug.log("val lost " + val);

					//add text node and delete node
					newNode = document.createTextNode(val);
					el.insertBefore(newNode,node);
					el.removeChild(node);

					//should have no effect on cursor

					--n; //revisit this same node for text rules, now that it is not a special label
					continue;
				}

			}	//end LABEL type handling
			else if(node.nodeName == "DIV" ||
					node.nodeName == "BR") //adding new lines causes chrome to make DIVs and BRs
			{
				//get rid of divs as soon as possible
				//convert div to text node and then have it reevaluated
				eatVal = node.innerHTML; //if html <br> then add another new line
				//console.log("div/br",eatVal,val);

				i = 1;
				if(node.nodeName == "DIV") 	//for DIV there may be more or less new lines to add
				{							//	depending on previous new line and <br> tag
					if(n > 0) //check for \n in previous node
					{
						specialString = el.childNodes[n-1].textContent;
						if(specialString[specialString.length-1] == '\n')
							--i; //remove a new line, because DIV does not cause a new line if already done
					}
					//check for new line at start of this node
					if(eatVal.indexOf("<br>") == 0 ||
							eatVal[0] == '\n')
						++i;
				}

				if(i == 2)
					val = "\n\n" + val;
				else if(i == 1)
					val = "\n" + val;
				//else sometimes i == 0

				//add text node and delete node
				newNode = document.createTextNode(val); //add new line to act like div
				el.insertBefore(newNode,node);
				el.removeChild(node);

				//if cursor was here, then advance to account for added newline
				if(n == cursor.startNodeIndex)
					cursor.startPos += i;
				if(n == cursor.endNodeIndex)
					cursor.endPos += i;

				--n; //revisit this same node for text rules
				continue;

			}	//end DIV type handling
			else if(node.nodeName == "#text")
			{
				if(n > 0 &&
						el.childNodes[n-1].nodeName == "#text")
				{
					//if prev child is text, go back!
					n -= 2;
					continue;
				}

				//merge text nodes
				if(n + 1 < el.childNodes.length &&
						el.childNodes[n+1].nodeName == "#text")
				{
					//Debug.log("Merging nodes at " + n);


					//merging may have an effect on cursor!
					//handle cursor position update
					if(cursor.startNodeIndex !== undefined)
					{
						if(n+1 < cursor.startNodeIndex)
						{
							//cursor is in a later node
							cursor.startNodeIndex -= 1; //one node was removed
							cursor.endNodeIndex -= 1; //one node was removed
						}
						else
						{
							//handle start and stop independently

							//handle start
							if(n+1 == cursor.startNodeIndex)
							{
								//then cursor is in second part of merger
								--cursor.startNodeIndex;
								cursor.startPos += val.length;
							} //end start handling

							//handle end
							if(n+1 == cursor.endNodeIndex)
							{
								//then cursor is in second part of merger
								--cursor.endNodeIndex;
								cursor.endPos += val.length;
							}
							else if(n+1 < cursor.endNodeIndex)
							{
								//then cursor is in a later node
								--cursor.endNodeIndex; //one node was removed
							}//end end handling
						}
					} //end cursor position update

					//place in next node and delete this one
					newNode = el.childNodes[n+1];
					val += newNode.textContent;
					newNode.textContent = val;
					el.removeChild(node);

					--n; //revisit this same node for text rules, now that it is merged
					continue;
				} //end merge text nodes

				startOfWord = -1;

				for(i=0;i<val.length;++i)
				{

					//if(n==9 && i ==0) //(n==6 && i == 22)
					//	console.log("Case ERR!?");

					//for each character:
					//	check if in quoted string
					//	then if in comment
					//	then if special word
					if(startOfComment == -1 && ( //string handling
								startOfString != -1 ||
								(prevChar != '\\' && val[i] == '"') ||
								(prevChar != '\\' && val[i] == "'")
								))
					{
						if(startOfString == -1 && //start string
								//dont start string immediately after alpha-numeric
								!((prevChar >= 'a' && prevChar <= 'z') ||
										(prevChar >= 'A' && prevChar <= 'Z') ||
										(prevChar >= '0' && prevChar <= '9')
										) &&
								(val[i] == '"' || val[i] == "'"))
						{


							startOfString = i;
							stringQuoteChar = val[i];

							//if(n < 10)
							//	console.log("string",n,val.substr(i,20));

							firstSpecialStringStartHandling = true;
							firstSpecialStringEndHandling = true;
						}
						else if(startOfString != -1 &&
							((prevChar != '\\' && val[i] == stringQuoteChar) ||
							val[i] == '\n'))	//end string due to quote or new line
						{
							++i; //include " in label
							specialString = val.substr(startOfString,i-startOfString);
							//console.log("string",startOfString,val.length,specialString);

							decor = _DECORATION_BLUE;
							fontWeight = "normal";
							localInsertLabel(startOfString, true /*isQuote*/);
							startOfString = -1;
							//done = true; //for debugging
							break;
						}
					}
					else if(startOfString == -1 && ( //comment handling
								startOfComment != -1 ||
								(i+commentString.length-1 < val.length &&
									val.substr(i,commentString.length) ==
									commentString)))
					{
						if(startOfComment == -1 && val[i] == commentString[0]) //start comment
						{
							startOfComment = i;
							firstSpecialStringStartHandling = true;
							firstSpecialStringEndHandling = true;
						}
						else if(startOfComment != -1 && val[i] == '\n')	//end comment
						{
							//++i; //do not include \n in label
							specialString = val.substr(startOfComment,i-startOfComment);
							//console.log("comment",startOfComment,val.length,specialString);

							decor = _DECORATION_GRAY;
							fontWeight = "normal";
							localInsertLabel(startOfComment);
							startOfComment = -1;
							//done = true; //for debugging
							break;
						}
					}
					else if(	//special word handling
							(val[i] >= 'a' && val[i] <= 'z') ||
							(val[i] >= 'A' && val[i] <= 'Z') ||
							(val[i] >= '0' && val[i] <= '9') ||
							(val[i] == '_' || val[i] == '-') ||
							val[i] == '#')
					{
						if(startOfWord == -1)
							startOfWord = i;
						//else still within word
					}
					else if(startOfWord != -1) //found end of word, check for special word
					{
						specialString = val.substr(startOfWord,i-startOfWord);
						decor = _DECORATIONS[fileDecorType][specialString];
						//console.log(specialString);

						if(decor) //found special word
						{
							//console.log(specialString);
							fontWeight = "bold";
							localInsertLabel(startOfWord);
							startOfWord = -1;
							//done = true; //for debugging
							break;
						}
						else
							startOfWord = -1;
					}

					//track previous character and handle escape count
					if(prevChar == '\\' && val[i] == '\\')
					{
						++escapeCount; //increase escape count
						if(escapeCount%2 == 0) //if even, then not an escape
							prevChar = ''; //clear escape
						else //if odd, then treat as an escape
							prevChar = '\\';
					}
					else
					{
						escapeCount = 1;
						prevChar = val[i]; //save previous character (e.g. to check for quote escape)
					}
				} //end node string value loop





				//////////////
				//if still within string or comment, handle crossing nodes
				if(startOfString != -1 || startOfComment != -1)
				{
					console.log("In string/comment crossing Nodes!");
					//acquire nodes into string until a quote is encountered

					closedString = false;
					for(++n;n<el.childNodes.length;++n)
					{
						eatNode = el.childNodes[n];
						eatVal = eatNode.textContent; //.nodeValue; //.wholeText

						//merging may have an effect on cursor!
						//handle cursor position update
						if(cursor.startNodeIndex !== undefined)
						{
							if(firstSpecialStringStartHandling) //do nothing, for now
								firstSpecialStringStartHandling = false;

							if(firstSpecialStringEndHandling)
							{
								//first time, add initial comment node string contribution to endPos

								endPositionCache = cursor.endPos; //cache end position in case this is not the last line
								firstSpecialStringEndHandling = false;
							}

							if(n < cursor.startNodeIndex)
							{
								//cursor is in a later node
								cursor.startNodeIndex -= 1; //one node was removed
								cursor.endNodeIndex -= 1; //one node was removed
							}
							else
							{
								//handle start and stop independently

								//handle start
								if(n == cursor.startNodeIndex)
								{
									//then cursor is in second part of merger
									--cursor.startNodeIndex;
									cursor.startPos += val.length;
								} //end start handling

								//handle end
								if(n == cursor.endNodeIndex)
								{
									//then cursor is in second part of merger
									--cursor.endNodeIndex;
									cursor.endPos += val.length;
								}
								else if(n < cursor.endNodeIndex)
								{
									//then cursor is in a later node
									--cursor.endNodeIndex; //one node was removed
								}//end end handling
							}
						} //end cursor position update

//						//deleteing the node may have an effect on cursor!
//						//handle cursor position update
//						if(cursor.startNodeIndex !== undefined)
//						{
//							if(firstSpecialStringStartHandling)
//							{
//								//first time, add initial comment node string contribution to startPos
//
//								cursor.startPos += val.length;
//								if(startOfString != -1)
//									cursor.startPos -= startOfString;
//								else if(startOfComment != -1)
//									cursor.startPos -= startOfComment;
//
//								firstSpecialStringStartHandling = false;
//							}
//
//							if(firstSpecialStringEndHandling)
//							{
//								//first time, add initial comment node string contribution to endPos
//
//								endPositionCache = cursor.endPos; //cache end position in case this is not the last line
//
//								cursor.endPos += val.length+1;
//								if(startOfString != -1)
//									cursor.endPos -= startOfString;
//								else if(startOfComment != -1)
//									cursor.endPos -= startOfComment;
//
//								firstSpecialStringEndHandling = false;
//							}
//
//
//							if(n < cursor.startNodeIndex)
//							{
//								//cursor is in a later node
//								cursor.startNodeIndex -= 1; //one node was removed
//								cursor.endNodeIndex -= 1; //one node was removed
//
//								cursor.startPos += eatVal.length; //add cursor position	in preparation for concat text
//								cursor.endPos += eatVal.length;
//							}
//							else
//							{
//								//handle start and stop independently
//
//								//handle start
//								if(n == cursor.startNodeIndex)
//								{
//									//then cursor is in second part of merger
//									--cursor.startNodeIndex;
//								} //end start handling
//
//								//handle end
//								if(n == cursor.endNodeIndex)
//								{
//									//then cursor is in second part of merger
//									--cursor.endNodeIndex;
//								}
//								else if(n < cursor.endNodeIndex)
//								{
//									//then cursor is in a later node
//									--cursor.endNodeIndex; //one node was removed
//									cursor.endPos += eatVal.length;
//								}//end end handling
//							}
//						} //end cursor position update


						//eat text and delete node
						val += eatVal;
						el.removeChild(eatNode);
						--n; //after removal, move back index for next node


						//look for quote close or comment close
						for(i;i<val.length;++i)
						{
							//string handling
							if(startOfString != -1 &&
								((prevChar != '\\' && val[i] == '"') ||
								val[i] == '\n'))	//end string due to quote or new line
							{
								Debug.log("Closing node crossed string.");

								++i; //include " in label
								specialString = val.substr(startOfString,i-startOfString);
								//console.log("string",startOfString,val.length,specialString);

								decor = _DECORATION_BLUE;
								fontWeight = "normal";
								localInsertLabel(startOfString,true /*isQuote*/);
								startOfString = -1;
								closedString = true;
								break;
							}

							//comment handling
							if(startOfComment != -1 && val[i] == '\n') //end comment
							{
								Debug.log("Closing node crossed comment.");

								//++i; //do not include \n in label

								specialString = val.substr(startOfComment,i-startOfComment);
								//console.log("string",startOfComment,val.length,specialString);

								decor = _DECORATION_GRAY;
								fontWeight = "normal";
								localInsertLabel(startOfComment);
								startOfComment = -1;

								closedString = true;
								break; //exit inner loop

							}

							//track previous character and handle escape count
							if(prevChar == '\\' && val[i] == '\\')
							{
								++escapeCount; //increase escape count
								if(escapeCount%2 == 0) //if even, then not an escape
									prevChar = ''; //clear escape
								else //if odd, then treat as an escape
									prevChar = '\\';
							}
							else
							{
								escapeCount = 1;
								prevChar = val[i]; //save previous character (e.g. to check for quote escape)
							}

						} //end node string value loop

						if(closedString) break; //exit outer loop

					} //end string node crossing node loop

					if(!closedString && startOfString != -1)
					{
						Debug.log("String is never closed!");
						specialString = val.substr(startOfString,i-startOfString);
						//console.log("string",startOfString,val.length,specialString);

						decor = _DECORATION_BLUE;
						--n; //move back index (because it was incremented past bounds in end search)
						localInsertLabel(startOfString, true /*isQuote*/);
						startOfString = -1;
					}
					if(!closedString && startOfComment != -1)
					{
						Debug.log("Comment is never closed!");
						specialString = val.substr(startOfComment,i-startOfComment);
						//console.log("string",startOfString,val.length,specialString);

						decor = _DECORATION_GRAY;
						--n; //move back index (because it was incremented past bounds in end search)
						localInsertLabel(startOfComment);
						startOfComment = -1;
					}

					if(n < cursor.endNodeIndex)
					{
						//if did not close string including the endNodeIndex,
						//	then reset the end of string handling
						firstSpecialStringEndHandling = true;
						cursor.endPos = endPositionCache;
					}


				} //end crossing nodes with string

			} //end #text type node handling
			else
			{
				console.log("unknown node.nodeName",node.nodeName);
				throw("node error!");
			}
		} //end node loop

		//set cursor placement
		CodeEditor.editor.setCursor(el,cursor);

		CodeEditor.editor.updateDualView(forPrimary);

	} //end updateDecorations()

	//=====================================================================================
	//autoIndent ~~
	this.autoIndent = function(forPrimary, cursor)
	{
		if(!cursor || cursor.startNodeIndex === undefined)
		{
			Debug.log("Invalid text selection for auto-indent. Please select text in the text editor.",
					Debug.HIGH_PRIORITY);
			return;
		}
		forPrimary = forPrimary?1:0;

		Debug.log("autoIndent " + forPrimary);

		DesktopContent.showLoading(localDoIt);
		return;
//		window.setTimeout(function()
//			{
//				localDoIt();
//				DesktopContent.hideLoading();
//			},100);

		/////////////////
		function localDoIt()
		{

			//steps:
			//	get text content for selection back to start of previous new line
			//	tab it properly
			//	replace selected lines with modified text



			var el = _eel[forPrimary];
			var node,val;
			var found = false;
			var n,i;

			//reverse-find new line
			for(n=cursor.startNodeIndex;n>=0; --n)
			{
				node = el.childNodes[n];
				val = node.textContent;

				for(i=(n==cursor.startNodeIndex?cursor.startPos-1:
							val.length-1); i>=0; --i)
				{
					if(val[i] == '\n')
					{
						//found start of line
						found = true;
						break;
					}
				}
				if(found) break;
			} //end reverse find new line loop

			//assume at new line point (or start of file)
			console.log("at leading newline - n",n,"i",i);

			if(n < 0) n = 0;
			if(i < 0) i = 0;
			else ++i; //skip past new line

			cursor.startNodeIndex = n;
			cursor.startPos = i;

			//preText and postText are to be left unchanged
			//	text is to be auto-indented
			var preText = "";
			var text = "";
			var postText = "";

			for(n=0; n<el.childNodes.length; ++n)
			{
				val = el.childNodes[n].textContent;
				if(n < cursor.startNodeIndex)
					preText += val;
				else if(n == cursor.startNodeIndex)
				{
					preText += val.substr(0,cursor.startPos);

					if(n < cursor.endNodeIndex)
						text += val.substr(cursor.startPos);
					else //n == cursor.endNodeIndex
					{
						text += val.substr(cursor.startPos,
								cursor.endPos-cursor.startPos);
						postText += val.substr(cursor.endPos);
					}
				}
				else if(n < cursor.endNodeIndex)
					text += val;
				else if(n == cursor.endNodeIndex)
				{
					text += val.substr(0,cursor.endPos);
					postText += val.substr(cursor.endPos);
				}
				else // n > cursor.endNodeIndex
					postText += val;
			}

			//Debug.log("preText " + preText);
			//Debug.log("postText " + postText);
			//Debug.log("text " + text);

			var fileExtension = _fileExtension[forPrimary];
			if(1
//					fileExtension == "cc" ||
//					fileExtension == "cpp" ||
//					fileExtension == "h" ||
//					fileExtension == "js" ||
//					fileExtension == "html"
					)
			{
				// find leading whitespace count
				var x = 0;
				for(i=0;i<text.length;++i)
					if(text[i] == ' ')
					++x;
				else if(text[i] == '\t')
					x += _TAB_SIZE - (x+_TAB_SIZE)%_TAB_SIZE;
				else
					break; //found white space
				Debug.log("Whitespace size =" + x + " tabs=" + ((x/_TAB_SIZE)|0));

				//have starting point in units of number of tabs
				var tabStr = "";
				for(n=0;n<((x/_TAB_SIZE)|0);++n)
					tabStr += '\t';

				//continue through text string, setting leading whitespace as tabStr
				newText = "";
				i = -1; //start at beginning

				var nextTabStr;

				var lastChar,firstChar;
				var prevLastChar,prevFirstChar;

				var inCmdTabStr = "";
				var nextInCmdTabStr = "";
				var isCmdTabStr = "";
				var nextIsCmdTabStr = "";



				var foundComment;
				var firstColonCommand = false;
				var lastColonCommand = false;
				var foundDoubleQuote,foundSingleQuote;
				var tradeInCmdStack = [];
				var tradeIsCmdStack = [];

				do
				{
					//start of each loop text[i] is \n
					//find next newline and last char

					lastChar = '';
					firstChar = '';

					foundComment = false;
					foundDoubleQuote = false;
					foundSingleQuote = false;

					for(n=i+1;n<text.length;++n)
					{
						if(text[n] == '\n')
							break;

						if(foundComment)
							continue; //do not proceed with command tabbing if in comment

						if(!foundSingleQuote && text[n] == '"')
							foundDoubleQuote = !foundDoubleQuote;
						else if(!foundDoubleQuote && text[n] == "'")
							foundSingleQuote = !foundSingleQuote;
						else if(text[n] == '/' && n+1 < text.length &&
								text[n+1] == '/')
						{
							foundComment = true;
							continue; //do not proceed with command tabbing if in comment
						}

						if(foundDoubleQuote || foundSingleQuote)
							continue; //skip if in quote

						if(text[n] != ' ' && text[n] != '\t')
						{
							lastChar = text[n];
							if(firstChar == '')
								firstChar = text[n];
						}


						if(text[n] == '(') //add in-command tab
							inCmdTabStr += '\t';
						else if(text[n] == ')') //remove in-command tab
							inCmdTabStr = inCmdTabStr.substr(0, inCmdTabStr.length-1);
						else if(inCmdTabStr.length == 0 &&
								text[n] == ';') //clear all in-command tabs
						{
							inCmdTabStr = "";
							isCmdTabStr = "";
							firstColonCommand = false;
							lastColonCommand = false;
						}

					} //end main loop looking for next newline

					nextTabStr = tabStr;

					//handle tabStr before putting together string
					if(firstChar == '}')
					{
						nextIsCmdTabStr = "";

						//trade back if closing } at traded tab point
						if(tradeInCmdStack.length &&
								tradeInCmdStack[tradeInCmdStack.length-1][0] ==
								tabStr.length)
						{
							//remove a tab
							inCmdTabStr = tradeInCmdStack.pop()[1];
							nextInCmdTabStr = inCmdTabStr;
							isCmdTabStr = tradeIsCmdStack.pop();
							tabStr = tabStr.substr(0,tabStr.length-1);
						}

						//remove a tab
						isCmdTabStr = "";
						firstColonCommand = false;
						//lastColonCommand = false;
						tabStr = tabStr.substr(0,tabStr.length-1);
						nextTabStr = tabStr;
					}
					else if(lastChar == ':' && //ends with :
							(firstChar == 'p' || 	//and start with public/private/protected
								firstChar == 'd' ||  	//or default
								firstChar == 'c'))		//or case
					{
						nextIsCmdTabStr = "";

						//remove a tab for now
						isCmdTabStr = "";
						firstColonCommand = false;
						lastColonCommand = false;
						nextTabStr = tabStr.substr(0,tabStr.length-1);
					}
					else if(firstChar == ':') //starts with :
					{
						//remove cmd tab
						nextIsCmdTabStr = "";
						isCmdTabStr = "";
						firstColonCommand = true;
					}
					else if(firstChar == '#' || //starts with #, i.e. pragma
							firstChar == '{') 	//starts with {
					{
						//remove a tab, if no open (), things were lined up
						if(lastColonCommand)
							tabStr = tabStr.substr(0,tabStr.length-1);

						//only remove command tab, if we think we are not in a command
						//	ending in comma previously, seems like an array
						if(nextInCmdTabStr.length != 0 ||
								nextIsCmdTabStr.length != 1 ||
								prevLastChar != ',')
						{
							//remove cmd tab
							nextIsCmdTabStr = "";
							isCmdTabStr = "";
						}
					}
					else if(!firstColonCommand &&
							!lastColonCommand &&
							lastChar != '' &&
							lastChar != ';' &&
							firstChar != '"' &&
							firstChar != "'") //do one and only tab for a command content that should stack up
						isCmdTabStr = '\t';
					else if(lastColonCommand &&
							prevLastChar == ',' &&
							inCmdTabStr.length == 0)
					{
						//remove a tab for json style definition
						lastColonCommand = false;
						tabStr = tabStr.substr(0,tabStr.length-1);
						isCmdTabStr = "\t";
						nextIsCmdTabStr = "\t";
					}
					else
						firstColonCommand = false;

					//if command ended
					if(lastChar == ';') //clear all in-command tabs
					{
						inCmdTabStr = "";
						isCmdTabStr = "";
						firstColonCommand = false;
						lastColonCommand = false;
					}

					console.log(
							"firstChar = " + firstChar +
							"lastChar = " + lastChar +
							"prevFirstChar = " + prevFirstChar +
							"prevLastChar = " + prevLastChar +
							" ... nextTab = " +
							tabStr.length +
							" + " +
							inCmdTabStr.length +
							" + " +
							isCmdTabStr.length +
							" ... nowTab = " +
							nextTabStr.length +
							" + " +
							nextInCmdTabStr.length +
							" + " +
							nextIsCmdTabStr.length +
							" stack=" +
							tradeInCmdStack.length +
							" " + firstColonCommand +
							" " + lastColonCommand);

					if(i >= 0)
						newText += text[i];
					newText += nextTabStr + nextInCmdTabStr + nextIsCmdTabStr;
					//add up to next newline
					newText += text.substr(i+1,n-(i+1)).trimLeft();


					//handle tabStr after putting together string
					if(lastChar == '{')	//add a tab
					{
						tabStr += '\t';
						isCmdTabStr = "";

						if(inCmdTabStr.length) //if in command then trade to tabStr
						{
							tabStr += '\t';

							tradeInCmdStack.push([tabStr.length,inCmdTabStr]); //push to stack
							tradeIsCmdStack.push(isCmdTabStr); //push to stack

							inCmdTabStr = ""; //clear
							isCmdTabStr = ""; //clear
						}
					}
					//					else if(lastChar == ':')
					//					{
					//						if(inCmdTabStr.length == 0) //this is like a case:, where we want to indent from here
					//							tabStr += '\t';
					//						isCmdTabStr = "";
					//						lastColonCommand = true;
					//					}
					//					else
					//						lastColonCommand = false;

					nextInCmdTabStr = inCmdTabStr;
					nextIsCmdTabStr = isCmdTabStr;

					if(lastChar != '')
						prevLastChar = lastChar;
					if(firstChar != '')
						prevFirstChar = firstChar;

					i = n;

				} while(i+1<text.length);

				//if last character is new line, then add it
				//  otherwise, all characters before next new line were added already
				if(text[i] == '\n') newText += '\n';

				//Debug.log("Done newText\n" + newText);
			}
			else
			{
				Debug.log("Unknown operation to auto-indent file with extension " +
						fileExtension,Debug.HIGH_PRIORITY);
				return;
			}

			//place text back
			el.textContent = preText + newText + postText;

			_fileWasModified[forPrimary] = true;

			CodeEditor.editor.updateDecorations(forPrimary,
					false /*forceDisplayComplete*/,
					true /*forceDecorations*/);

		} //end localDoIt()
	} //end autoIndent

	//=====================================================================================
	//updateDualView ~~
	this.updateDualView = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("updateDualView " + forPrimary);


		//if other pane is same path and extension, update it too
		if(_filePath[0] == _filePath[1] &&
				_fileExtension[0] == _fileExtension[1])
		{
			var val,node, newNode;
			var el = _eel[forPrimary];

			Debug.log("Update dual view");

			_fileLastSave[(!forPrimary)?1:0] = _fileLastSave[forPrimary];
			_fileWasModified[(!forPrimary)?1:0] = _fileWasModified[forPrimary];
			CodeEditor.editor.updateLastSave(!forPrimary);

			//copy all elements over

			var elAlt = _eel[(!forPrimary)?1:0];
			elAlt.innerHTML = ""; //clear all children
			for(i=0;i<el.childNodes.length;++i)
			{
				node = el.childNodes[i];
				val = node.textContent;
				if(node.nodeName == "LABEL")
				{
					newNode = document.createElement("label");
					newNode.style.fontWeight = node.style.fontWeight; //bold or normal
					newNode.style.color = node.style.color;
					newNode.textContent = val; //special text
				}
				else if(node.nodeName == "#text")
				{
					newNode = document.createTextNode(val);
				}
				else
					Debug.log("Skipping unknown node " + node.nodeName);
				elAlt.appendChild(newNode);
			}
		}

	} //end updateDualView()

	//=====================================================================================
	//updateOutline ~~
	//	elTextObj := {text,time}
	this.updateOutline = function(forPrimary,elTextObj)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("updateOutline " + forPrimary);

		var starti;
		var endi;
		var strLength;
		var str;
		var endPi, startCi, lastWhiteSpacei;
		var newLinei;
		var localNewLineCount;

		var newLineCount = 0;
		var outline = []; //line number and name
		outline.push([1,"Top"]); //always include top
		var i,j,k;
		var fail, found;

		var isCcSource = _fileExtension[forPrimary][0] == 'c' ||
			_fileExtension[forPrimary][0] == 'C' ||
			_fileExtension[forPrimary] == "icc";
		var isJsSource = _fileExtension[forPrimary] == "js" ||
			_fileExtension[forPrimary] == "html";

		var indicatorIndex = 0;
		var indicator = "";
		if(isCcSource) indicator = "::";
		if(isJsSource) indicator = "function";

		var inComment = false; //ignore indicator in comment
		var inBlockComment = false; //ignore indicator in comment

		for(i=0;i<elTextObj.text.length;++i)
		{
			if(elTextObj.text[i] == '\n')
			{
				++newLineCount;
				indicatorIndex = 0; //reset
				inComment = false; //reset
				continue;
			}
			else if(inBlockComment && i+1 < elTextObj.text.length &&
					elTextObj.text[i] == '*' &&
					elTextObj.text[i+1] == '/')
				inBlockComment = false;
			else if(inComment || inBlockComment) continue;
			else if(i+1 < elTextObj.text.length)
			{
				if(elTextObj.text[i] == '/' &&
						elTextObj.text[i+1] == '*')
				{
					inBlockComment = true;
					continue;
				}
				else if(elTextObj.text[i] == '/' &&
						elTextObj.text[i+1] == '/')
				{
					inComment = true;
					continue;
				}
			} //end comment handling

			//find indicators
			if(elTextObj.text[i] == indicator[indicatorIndex])
			{
				++indicatorIndex;
				if(indicatorIndex == indicator.length)
				{
					//found entire indicator!
					//Debug.log("found indicator " + indicator + " i:" + i);

					//look for thing to outline
					if(isCcSource)
						str = localHandleCcOutline();
					else if(isJsSource)
						str = localHandleJsOutline();

					if(str)
					{
						//have a new outline thing
						outline.push([newLineCount+1,
								str +
								"()"]);
					}
					else
					{
						inComment = false;
						inBlockComment = false;
					}
				}
			}
			else
				indicatorIndex = 0; //reset

		} // end text content char loop

		++newLineCount; //always add 1 for good luck

		Debug.log("Number of lines " + newLineCount);
		console.log("Done with outline", outline);

		//handle create line numbers
		str = "";
		for(i=0;i<newLineCount;++i)
		{
			str += "<a name='" + forPrimary + "L" + (i+1) + "'>"; //add anchor tag
			str += (i+1);
			str += "</a><br>";
		}
		document.getElementById("editableBoxLeftMargin" + forPrimary).innerHTML = str;

		_numberOfLines[forPrimary] = newLineCount;
		//window.location.href = "#L220";

		if(!isCcSource && !isJsSource)
		{
			//generate simple outline for non C++ source
			i = (newLineCount/2)|0;
			if(i > 40)
			{
				outline.push([i,"Middle"]);
			}
		} //end simple outline generate
		outline.push([newLineCount,"Bottom"]); //always include bottom

		var text;
		//handle create outline
		str = "";
		str += "<center>";
		str += "<table><td>"
			str += "Outline: ";
		str += "</td><td>"; //do select in table so that width plays nice
		str += DesktopContent.htmlOpen("select",
			{
				"class":"textEditorOutlineSelect",
				"id":"textEditorOutlineSelect" + forPrimary,
				"style":"text-align-last: center; width: 100%;",
				"title":"Jump to a section of code.",
				"onchange":
				"CodeEditor.editor.handleOutlineSelect(" + forPrimary + ");",
				"onclick":
				"CodeEditor.editor.stopUpdateHandling(event);",
			},0 /*innerHTML*/, false /*doCloseTag*/);
		str += "<option value='0'>Jump to a Line Number (Ctrl + L)</option>"; //blank option

		found = false;
		for(i=0;i<outline.length;++i)
		{
			str += "<option value='" + (outline[i][0]) + "'>";
			text = "#" + outline[i][0];
			str += text;

			//if local then put more spacing
			found = (outline[i][1].indexOf("local") == 0);

			for(j=text.length;j<(found?20:12);++j)
				str += "&nbsp;"; //create fixed spacing for name
			str += outline[i][1];
			str += "</option>";
		}
		str += "</select>"; //end textEditorOutlineSelect
		str += "</td></table>";
		str += "</center>";
		try
		{
			document.getElementById("textEditorOutline" + forPrimary).innerHTML = str;
		}
		catch(e)
		{
			Debug.log("Ignoring missing outline element. Assuming header not shown.");
			return;
		}

		///////////////////////////
		// localHandleCcOutline
		function localHandleCcOutline()
		{
			if(startCi && i < startCi)
				return undefined; //reject if within last outlined thing

			starti = i-1; //text.indexOf("::",starti)+2

			endi = -1;
			startCi = -1;
			endPi = -1;
			lastWhiteSpacei = -1;

			//do this:
			//			endi = elTextObj.text.indexOf('(',starti+3);
			//			startCi = elTextObj.text.indexOf('{',endi+2);
			//			endPi = elTextObj.text.lastIndexOf(')',startCi-1);

			for(j=i+2;j<elTextObj.text.length;++j)
			{
				if(inComment && elTextObj.text[j] == '\n')
					inComment = false; //reset
				else if(inBlockComment && j+1 < elTextObj.text.length &&
						elTextObj.text[j] == '*' &&
						elTextObj.text[j+1] == '/')
					inBlockComment = false;
				else if(inComment || inBlockComment) continue;
				else if(j+1 < elTextObj.text.length)
				{
					if(elTextObj.text[j] == '/' &&
							elTextObj.text[j+1] == '*')
					{
						inBlockComment = true;
						continue;
					}
					else if(elTextObj.text[j] == '/' &&
							elTextObj.text[j+1] == '/')
					{
						inComment = true;
						continue;
					}
				} //end comment handling

				if(elTextObj.text[j] == ';' || //any semi-colon is a deal killer
						elTextObj.text[j] == '+' || //or non-function name characters
						elTextObj.text[j] == '"' ||
						elTextObj.text[j] == "'" ||
						elTextObj.text[j] == "!" ||
						elTextObj.text[j] == "|")
					return undefined;



				if(endi < 0) //first find end of name
				{
					if(elTextObj.text[j] == '(')
						endi = j++; //found end of name, and skip ahead
					else
					{
						if(elTextObj.text[j] == ')')
							return undefined; //found wrong direction brace

						//if space, then moveup start index
						if(elTextObj.text[j] == ' ' ||
								elTextObj.text[j] == '\t' ||
								elTextObj.text[j] == '\n')
							lastWhiteSpacei = j;
						else if(lastWhiteSpacei != -1 &&
								elTextObj.text[j] == ':')
						{
							//then found a white space after indicator
							// then another indicator started, so give up
							return undefined;
						}

					}
				}
				else if(startCi < 0)
				{
					if(elTextObj.text[j] == '{')
					{
						startCi = j--; //found start of curly brackets, and exit loop
						break;
					}
				}
			}

			//have endi and startCi

			if(endi < 0 || startCi < 0)
			{
				return undefined;
			}

			//find endPi

			for(j;j>endi;--j)
			{
				if(elTextObj.text[j] == ')')
				{
					endPi = j; //found end of parameters
					break;
				}
			}

			if(endPi < 0)
			{
				return undefined;
			}

			//found key moments with no ';', done!

			return elTextObj.text.substr(starti+2,endi-starti-2).replace(/\s+/g,'');

		} //end localHandleCcOutline()

		///////////////////////////
		// localHandleJsOutline
		function localHandleJsOutline()
		{
			if(elTextObj.text[i + 1] == '(')
			{
				//console.log("=style",text.substr(i-30,100));

				found = false; //init

				//look backward for =, and only accept \t or space
				for(j=i-1-("function").length;j>=0;--j)
				{
					if(elTextObj.text[j] == '=')
					{
						//found next phase
						found = true;
						k = j; //save = pos
					}
					else if(!(elTextObj.text[j] == ' ' || elTextObj.text[j] == '\t' ||
								(elTextObj.text[j] == '=' && !found)))
						break; //give up on this function if not white space or =
				}

				if(found)
				{
					//found = sign so now find last character
					for(j;j>=0;--j)
					{
						if(elTextObj.text[j] == ' ' || elTextObj.text[j] == '\t' ||
								elTextObj.text[j] == '\n')
						{
							//found white space on other side, so done!
							return elTextObj.text.substr(j+1,k-j-1).trim();
						}
					}
				}
			} //end handling for backward = style js function
			else
			{
				//console.log("fwd style",text.substr(i,30));

				//look forward until new line or (
				for(j=i+2;j<elTextObj.text.length;++j)
				{
					if(elTextObj.text[j] == '\n')
						break;
					else if(elTextObj.text[j] == '(')
					{
						//found end
						return elTextObj.text.substr(i+2,j-(i+2)).trim();
					}
				}
			} //end handling for forward tyle js function

			return undefined; //if no function found
		} //end localHandleJsOutline()

	} //end updateOutline()

	//=====================================================================================
	//handleOutlineSelect ~~
	this.handleOutlineSelect = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("handleOutlineSelect() " + forPrimary);

		var val = document.getElementById("textEditorOutlineSelect" + forPrimary).value | 0;
		if(val < 1) val = 1;
		console.log("line val",val);

		CodeEditor.editor.gotoLine(forPrimary,val,
				undefined /*selectionCursor*/,
				true /*topOfView*/);

	} //end handleOutlineSelect()

	//=====================================================================================
	//keyDownHandler ~~
	var TABKEY = 9;
	var SPACEKEY = 32;
	this.keyDownHandler = function(e,forPrimary,shortcutsOnly)
	{
		forPrimary = forPrimary?1:0;

		var keyCode = e.keyCode;

		CodeEditor.editor.stopUpdateHandling();

		//if just pressing shiftKey, ignore
		if(keyCode == 16 /*shift*/)
			return;

		//if command key pressed, ignore
		if(_commandKeyDown)
			return;

		var c = e.key;
		Debug.log("keydown c=" + keyCode + " " + c + " shift=" + e.shiftKey +
				" ctrl=" + e.ctrlKey + " command=" + _commandKeyDown);

		//ignore and bring back Debog popup
		if(e.shiftKey && c == "Escape")
		{
			e.preventDefault();
			e.stopPropagation();
			try{ Debug.bringBackErrorPop();	} catch(e){;}
			return;
		}

		//set timeout for decoration update
		CodeEditor.editor.startUpdateHandling(forPrimary);

		var el = _eel[forPrimary];
		var cursor;
		var cursorSelection = false;


		//handle preempt keys
		if(!shortcutsOnly)
		{
			cursor = CodeEditor.editor.getCursor(el);

			cursorSelection = (cursor.startNodeIndex !== undefined &&
					(cursor.startNodeIndex != cursor.endNodeIndex ||
						cursor.startPos != cursor.endPos));

			if(!cursorSelection)
				_lastPageUpDownLine = -1;

			/////////////////////////////////
			function localInsertCharacter(c)
			{
				Debug.log("Inserting character... " + c);

				var node,val;
				var found;

				//steps:
				//	delete all text in selection (to be replaced by newline)
				//	reverse find previous new line
				//	capture previous line tabbing/whitespace
				//	use previous line tabbing/whitespace to insert white space after newline
				//		if { then give extra tab

				//delete all nodes between endNode and startNode
				if(cursor.endNodeIndex > cursor.startNodeIndex)
				{
					//handle end node first, which is a subset effect
					val = el.childNodes[cursor.endNodeIndex].textContent;
					val = val.substr(cursor.endPos);
					el.childNodes[cursor.endNodeIndex].textContent = val;
					--cursor.endNodeIndex;
					while(cursor.endNodeIndex > cursor.startNodeIndex)
					{
						//delete node
						el.removeChild(el.childNodes[cursor.endNodeIndex]);
						--cursor.endNodeIndex;
					}
					//place end pos to delete the remainder of current node
					cursor.endPos = el.childNodes[cursor.startNodeIndex].textContent.length;
				}

				var whiteSpaceString = "";
				var postWhiteSpaceString = "";
				var text = el.childNodes[cursor.startNodeIndex].textContent;
				var preCharString = text.substr(0,cursor.startPos);
				var cursorPosDelta = 0;

				if(c == '\n')
				{
					//for newline case, determine whitespace before cursor to add
					//	or if previous character is a {, then close brackets

					var firstChar = ''; //init to empty char

					//reverse-find new line
					found = false;
					for(n=cursor.startNodeIndex;n>=0; --n)
					{
						node = el.childNodes[n];
						val = node.textContent;

						for(i=(n==cursor.startNodeIndex?cursor.startPos-1:
									val.length-1); i>=0; --i)
						{
							if(val[i] == '\n')
							{
								//found start of line
								found = true;
								break;
							}
							else if(firstChar == '' &&
									val[i] != '\t' && val[i] != ' ')
								firstChar = val[i]; //found first encountered character
						}
						if(found) break;
					} //end reverse find new line loop

					//assume at new line point (or start of file)
					console.log("at leading newline - n",n,"i",i,"firstChar",firstChar);
					if(n < 0) n = 0;
					if(i < 0) i = 0;
					else ++i; //skip past new line

					//now return to cursor and aggregate white space
					found = false;
					for(n; n<el.childNodes.length; ++n)
					{
						node = el.childNodes[n];
						val = node.textContent;

						for(i;i<val.length;++i)
						{
							//exit loop when not white space found
							if((val[i] != '\t' && val[i] != ' ') ||
									(n == cursor.startNodeIndex &&
										i >= cursor.startPos))
							{
								found = true;
								break;
							}

							whiteSpaceString += val[i];
						}

						if(found || n == cursor.startNodeIndex) break;

						i = 0; //reset i for next loop
					} //end white non-white space loop

					if(firstChar == '{')
					{
						postWhiteSpaceString += "\n" + whiteSpaceString + "}";
						whiteSpaceString += '\t';
						postWhiteSpaceString += text.substr(cursor.endPos);
					}
					else //cut off leading white-space to pull text to cursor position on new line
					{
						val = text.substr(cursor.endPos);
						i = val.indexOf('\n');
						if(i >= 0)
						{
							//if there is a newline, stop removing whitespace there
							postWhiteSpaceString += val.substr(0,
									i).trimLeft();
							postWhiteSpaceString += val.substr(i);
						}
						else //else remove all leading white space
							postWhiteSpaceString += val.trimLeft();
					}

				} //end special newline handling
				else if(c == '}') //start special closing bracket handling
				{
					//determine the white space before previous open bracket
					//	and match it

					//reverse find matching bracket
					var openCount = 1; //init to 1, when 0 done
					var foundFirstNewLine = false;

					//reverse-find new line
					found = false;
					for(n=cursor.startNodeIndex;n>=0; --n)
					{
						node = el.childNodes[n];
						val = node.textContent;

						for(i=(n==cursor.startNodeIndex?cursor.startPos-1:
									val.length-1); i>=0; --i)
						{
							if(val[i] == '{')
							{
								//close bracket
								--openCount;

								if(openCount == 0)
								{
									Debug.log("Found matching bracket n=" + n +
											" i=" + i);
									found = true;
									break;
								}
								//else keep looking for closing bracket
							}
							else if(val[i] == '}')
								++openCount;
							else if(!foundFirstNewLine &&
									val[i] == '\n')
							{
								foundFirstNewLine = true;

								Debug.log("pre-deleted white space preCharString=" +
										preCharString.length + " " + preCharString);

								//delete all white space forward until start position
								var nn = n;
								var ii = i+1;
								for(nn;nn<el.childNodes.length;++nn)
								{
									if(nn < cursor.startNodeIndex)
									{
										//completely delete text
										el.childNodes[nn].textContent = "";
									}
									else if(nn == cursor.startNodeIndex)
									{
										//partially delete text by clearing preCharString
										preCharString = el.childNodes[nn].textContent.substr(
												0,ii);
										break; //done
									}
									ii = 0;
								} //end of delete white space to newline loop

								Debug.log("deleted white space preCharString=" +
										preCharString.length + " " + preCharString);
							}
							else if(!foundFirstNewLine && val[i] != ' ' &&
									val[i] != '\t')
							{
								Debug.log("Found character between } and new line, so doing nothing.");
								return false;
							}
						}
						if(found) break;
					} //end reverse find matching bracket loop


					//assume at matching bracket (or start of file)
					console.log("at closing bracket - n",n,"i",i);

					if(n < 0 || i < 0) //at beginning, so kill leading white space
						preCharString = preCharString.trimRight();
					else
					{
						//find previous new line to determine white space to match
						var matchingWhiteSpace = "";
						found = false;
						var firstTime = true;

						for(n;n>=0; --n)
						{
							node = el.childNodes[n];
							val = node.textContent;

							for(i=(firstTime?i:
										val.length-1); i>=0; --i)
							{
								if(val[i] == '\n')
								{
									//fully defined matching white space
									found = true;
									break;
								}
								else if(val[i] == ' ' ||
										val[i] == '\t')
									matchingWhiteSpace += val[i];
								else //clear white space if not white space encountered
									matchingWhiteSpace = "";
							}
							if(found) break;

							firstTime = false;
						} //end reverse find new line loop
					}


					preCharString += matchingWhiteSpace;
					Debug.log("matching white space preCharString=" +
							preCharString.length + " " + preCharString);

					postWhiteSpaceString += text.substr(cursor.endPos);

				} //end special closing bracket handling
				else
					postWhiteSpaceString += text.substr(cursor.endPos);

				val = preCharString + c +
					whiteSpaceString +
					postWhiteSpaceString;

				el.childNodes[cursor.startNodeIndex].textContent = val;


				console.log("cursorPosDelta",cursorPosDelta);

				cursor.startPos = c.length + preCharString.length + whiteSpaceString.length;
				cursor.endNodeIndex = cursor.startNodeIndex;
				cursor.endPos = cursor.startPos;

				console.log("cursor after newline",cursor);

				CodeEditor.editor.setCursor(el,cursor,true /*scrollIntoView*/);

				_fileWasModified[forPrimary] = true;

				return true; //character was inserted
			} //end localInsertCharacter()

			if(keyCode == 13) // ENTER -- should trigger updateDecorations immediately
			{
				//to avoid DIVs, ENTER should trigger updateDecorations immediately


				//document.execCommand('insertHTML', false, '&#010;&#013;');
				//document.execCommand('insertText', false, '\n');
				//CodeEditor.editor.updateDecorations(forPrimary, true /*insertNewLine*/,
				//	keyCode == 46 /*delete highlight*/);

				localInsertCharacter('\n');
				e.preventDefault();
				//CodeEditor.editor.stopUpdateHandling(e);

				return;
			}
			else if(keyCode == 36) // HOME
			{
				//to position the cursor at text, rather than line start
				e.preventDefault();

				//Steps:
				//	get cursor
				//	reverse find new line
				//		track last non-whitespace
				// 	set cursor

				var i,n,node,val;
				var found = false;

				var lastNonWhitespacePos = cursor.startPos;
				var lastNonWhitespaceNodeIndex = cursor.startNodeIndex;
				var lastPos = cursor.startPos;
				var lastNodeIndex = cursor.startNodeIndex;

				//reverse find new line
				for(n=cursor.startNodeIndex; n>=0; --n)
				{
					node = el.childNodes[n];
					val = node.textContent;

					for(i=(n==cursor.startNodeIndex?
								cursor.startPos-1:val.length-1);i>=0;--i)
					{
						if(val[i] == '\n')
						{
							found = true;
							break;
						}
						else if(!(val[i] == ' ' ||
									val[i] == '\t'))
						{
							lastNonWhitespacePos = i;
							lastNonWhitespaceNodeIndex = n;
						}

						lastPos = i;
						lastNodeIndex = n;
					}
					if(found) break;
				}
				console.log("lastNonWhitespacePos",lastNonWhitespacePos);
				console.log("lastNonWhitespaceNodeIndex",lastNonWhitespaceNodeIndex);

				if(lastNonWhitespacePos == cursor.startPos &&
						lastNonWhitespaceNodeIndex == cursor.startNodeIndex)
				{
					//if already at non-whitespace character, go to the new line
					lastNonWhitespacePos = lastPos;
					lastNonWhitespaceNodeIndex = lastNodeIndex;
				}

				//if to edge, force view to go all the way left
				if(lastNonWhitespacePos == lastPos &&
						lastNonWhitespaceNodeIndex == lastNodeIndex)
					document.getElementById("textEditorBody" + forPrimary).scrollLeft = 0;

				cursor.startNodeIndex = lastNonWhitespaceNodeIndex
					cursor.startPos = lastNonWhitespacePos;

				if(!e.shiftKey)
				{
					cursor.endNodeIndex = cursor.startNodeIndex;
					cursor.endPos = cursor.startPos;
				}
				//else leave end position for highlight effect

				CodeEditor.editor.setCursor(el,cursor,true /*scrollIntoView*/);

				return;
			}
			else if(keyCode == 35) // END
			{
				//to position the cursor at end of line, rather than end of file

				e.preventDefault();


				//Steps:
				//	get cursor
				//	forward find new line
				//		track last non-whitespace
				// 	set cursor

				var i,n,node,val;
				var found = false;

				var wantNext = false;
				var lastNonWhitespacePos = cursor.startPos;
				var lastNonWhitespaceNodeIndex = cursor.startNodeIndex;

				//reverse find new line
				for(n=cursor.startNodeIndex; n<el.childNodes.length; ++n)
				{
					node = el.childNodes[n];
					val = node.textContent;

					for(i=(n==cursor.startNodeIndex?
								cursor.startPos:0);i<val.length;++i)
					{
						if(wantNext)
						{
							lastNonWhitespacePos = i;
							lastNonWhitespaceNodeIndex = n;
						}

						if(val[i] == '\n')
						{
							found = true;
							break;
						}
						else if(!(val[i] == ' ' ||
									val[i] == '\t'))
							wantNext = true;
						else
							wantNext = false;
					}
					if(found) break;
				}
				console.log("lastNonWhitespacePos",lastNonWhitespacePos);
				console.log("lastNonWhitespaceNodeIndex",lastNonWhitespaceNodeIndex);

				if(lastNonWhitespacePos == cursor.startPos &&
						lastNonWhitespaceNodeIndex == cursor.startNodeIndex)
				{
					//if already at non-whitespace character, go to the new line
					lastNonWhitespacePos = i;
					lastNonWhitespaceNodeIndex = n;
				}

				cursor.endNodeIndex = lastNonWhitespaceNodeIndex
					cursor.endPos = lastNonWhitespacePos;

				if(!e.shiftKey)
				{
					cursor.startNodeIndex = cursor.endNodeIndex;
					cursor.startPos = cursor.endPos;
				}
				//else leave end position for highlight effect

				CodeEditor.editor.setCursor(el,cursor,true /*scrollIntoView*/);
				return;
			}
		} //end non-shortcuts early handling

		//handle page-up and down for shortcut or not shortcut
		//	because it can cause body to become selected
		if(keyCode == 33) // PAGE-UP
		{
			//to position the cursor at text, rather than only moving scroll bar
			e.preventDefault();
			e.stopPropagation();

			//Steps:
			//	get cursor line
			// 	goto line-N


			var N = 50; //number of lines for page up

			var gotoLineCursor = {};

			//manage start and last line
			if(_lastPageUpDownLine == -1)
			{
				var cursorWithLine = CodeEditor.editor.getLine(forPrimary);

				_startPageUpDownNodeIndex = cursorWithLine.startNodeIndex;
				_startPageUpDownPos = cursorWithLine.startPos;

				_startPageUpDownLine = cursorWithLine.line;
				_lastPageUpDownLine = _startPageUpDownLine;
			}

			gotoLineCursor.startNodeIndex = _startPageUpDownNodeIndex;
			gotoLineCursor.startPos = _startPageUpDownPos;


			_lastPageUpDownLine -= N;
			gotoLineCursor.focusAtEnd = (_lastPageUpDownLine > _startPageUpDownLine);

			Debug.log("Page up to line " + _lastPageUpDownLine + " dir=" +
					gotoLineCursor.focusAtEnd);

			_lastPageUpDownLine = CodeEditor.editor.gotoLine(forPrimary,_lastPageUpDownLine,
					e.shiftKey?gotoLineCursor:undefined);

			return;
		}
		else if(keyCode == 34) // PAGE-DOWN
		{
			//to position the cursor at text, rather than only moving scroll bar
			e.preventDefault();
			e.stopPropagation();

			//Steps:
			//	get cursor line
			// 	goto line-N


			var N = 50; //number of lines for page up

			var gotoLineCursor = {};

			//manage start and last line
			if(_lastPageUpDownLine == -1)
			{
				var cursorWithLine = CodeEditor.editor.getLine(forPrimary);

				_startPageUpDownNodeIndex = cursorWithLine.startNodeIndex;
				_startPageUpDownPos = cursorWithLine.startPos;

				_startPageUpDownLine = cursorWithLine.line;
				_lastPageUpDownLine = _startPageUpDownLine;
			}

			gotoLineCursor.startNodeIndex = _startPageUpDownNodeIndex;
			gotoLineCursor.startPos = _startPageUpDownPos;


			_lastPageUpDownLine += N;
			gotoLineCursor.focusAtEnd = (_lastPageUpDownLine > _startPageUpDownLine);

			Debug.log("Page down to line " + _lastPageUpDownLine + " dir=" +
					gotoLineCursor.focusAtEnd);

			_lastPageUpDownLine = CodeEditor.editor.gotoLine(forPrimary,_lastPageUpDownLine,
					e.shiftKey?gotoLineCursor:undefined);

			return;
		}
		else if(keyCode == 13) // ENTER
		{
			//ENTER may be hit when doing something in header
			//	and we want to act.
			//e.g. Find and Replace

			if(CodeEditor.editor.findAndReplaceLastButton[forPrimary] > 0)
			{
				e.preventDefault();
				e.stopPropagation();

				Debug.log("Launch find and replace action " +
						CodeEditor.editor.findAndReplaceLastButton[forPrimary]);
				CodeEditor.editor.doFindAndReplaceAction(forPrimary,
						CodeEditor.editor.findAndReplaceLastButton[forPrimary]);
				return;
			}
		}
		else if(keyCode == 27) // ESCAPE
		{
			//ESCAPE may be hit when doing something in header
			//	and we want to act.
			//e.g. Find and Replace
			//console.log(CodeEditor.editor.findAndReplaceLastButton,forPrimary);
			if(CodeEditor.editor.findAndReplaceLastButton[forPrimary] > 0)
			{
				e.preventDefault();
				e.stopPropagation();

				//close find and replace
				CodeEditor.editor.displayFileHeader(forPrimary);
				return;
			}
		}

		//end preempt key handling


		if(e.ctrlKey) //handle shortcuts
		{
			if(keyCode == 83) 		// S for file save
			{
				if (!_STAND_ALONE && !_READ_ONLY) {
					CodeEditor.editor.saveFile(forPrimary,true /*quiet*/);
					e.preventDefault();
					return;
				}
			}
			else if(keyCode == 68) 	// D for directory toggle
			{
				if (!_STAND_ALONE) {
					CodeEditor.editor.toggleDirectoryNav(forPrimary);
					e.preventDefault();
					return;
				}
			}
			else if(keyCode == 66) 	// B for incremental build
			{
				if (!_STAND_ALONE && !_READ_ONLY) {
					CodeEditor.editor.build();
					e.preventDefault();
					return;
				}
			}
			else if(keyCode == 70) 	// F for Find and Replace
			{
				CodeEditor.editor.showFindAndReplace(forPrimary);
				e.preventDefault();
				return;
			}
			else if(keyCode == 73) 	// I for auto indent
			{
				CodeEditor.editor.autoIndent(forPrimary, cursor);
				e.preventDefault();
				return;
			}
			else if(keyCode == 78) 	// N for clean build
			{
				if (!_STAND_ALONE && !_READ_ONLY) {
					CodeEditor.editor.build(true /*clean*/);
					e.preventDefault();
					return;
				}
			}
			else if(keyCode == 222 || 	// ' or
					keyCode == 48)  // 0 for refresh file
			{
				CodeEditor.editor.openFile(forPrimary,
						_filePath[forPrimary],
						_fileExtension[forPrimary],
						true /*doConfirm*/);
				e.preventDefault();
				return;
			}
			else if(keyCode == 50) 	// 2 for view toggle
			{
				CodeEditor.editor.toggleView();
				e.preventDefault();
				return;
			}
			else if(keyCode == 85) 	// U for undo
			{
				CodeEditor.editor.undo(forPrimary, e.shiftKey /*redo*/);
				e.preventDefault();
				return;
			}
			else if(keyCode == 76 ||	// L or
					keyCode == 71) 	// G for go to line number
			{
				DesktopContent.popUpVerification(
						/*prompt*/ "Goto line number: ",
						/*func*/
						function(line)
					{
						Debug.log("Going to line... " + line);
						CodeEditor.editor.gotoLine(forPrimary,line);
					}, /*val*/ undefined,
					/*bgColor*/ undefined,
						/*textColor*/ undefined,
						/*borderColor*/ undefined,
						/*getUserInput*/ true,
						/*dialogWidth*/ undefined,
						/*cancelFunc*/ undefined,
						/*yesButtonText*/ "Go");

				e.preventDefault();
				return;
			}
			else if(keyCode == 186 ||  // ; or
					keyCode == 49) 	// 1 for switch to related file
			{
				CodeEditor.editor.openRelatedFile(forPrimary);
				e.preventDefault();
				return;
			}

	}//end shortcut cases
		if(shortcutsOnly)
			return; //if only doing short-cuts, dont handle text



		var rectangularTAB = false;
		var blockCOMMENT = false;

		//		if(!e.shiftKey && e.ctrlKey &&
		//				keyCode == 191) 	// ctrl+/ for block comment
		//			blockCOMMENT = true;
		if(e.ctrlKey)//else if(e.ctrlKey)
		{

			if(keyCode == 84 ||
					keyCode == 89) // T or Y for rectangular TAB
			{
				rectangularTAB = true;
				e.preventDefault();
				//continue to tab handling below
			}
			else if(keyCode == 191) 	// ctrl+/ for block comment
			{
				blockCOMMENT = true;
				e.preventDefault();
				//continue to tab handling below
			}
			else
				return;
		} //end ctrl key editor handling




		if(keyCode == TABKEY ||
				(cursorSelection && keyCode == SPACEKEY) ||
				rectangularTAB ||
				blockCOMMENT)
		{
			_fileWasModified[forPrimary] = true;
			CodeEditor.editor.updateLastSave(forPrimary);
			e.preventDefault();

			//manage tabs
			//	if selection, then tab selected lines
			// 	else insert tab character

			var i,j,k;

			if(cursorSelection)
			{
				//handle tabbing selected lines
				Debug.log("special key selected lines " + cursor.startNodeIndex + " - " +
						cursor.endNodeIndex);


				/////////////////////////
				//start rectangular tab handling
				if(rectangularTAB)
				{
					Debug.log("Rectangular TAB");

					//steps:
					//	determine x coordinate by
					//		going backwards from start until a new line is found
					//		and then going forward and counting spots back to cursor
					//	then for each line in selection
					//		add a tab at that x coordinate (offset from newline)


					var node,val;
					var found = false;
					var x = 0;

					//reverse-find new line
					for(n=cursor.startNodeIndex;n>=0; --n)
					{
						node = el.childNodes[n];
						val = node.textContent; //.nodeValue; //.wholeText

						for(i=(n==cursor.startNodeIndex?cursor.startPos-1:
									val.length-1); i>=0; --i)
						{
							if(val[i] == '\n')
							{
								//found start of line
								found = true;
								break;
							}
						}
						if(found) break;
					}
					//assume at new line point (or start of file)
					console.log("at leading newline - n",n,"i",i);

					//now return to cursor and count spots
					found = false;
					for(n; n<el.childNodes.length; ++n)
					{
						node = el.childNodes[n];
						val = node.textContent;

						for(i;i<val.length;++i)
						{
							//exit loop when back to cursor start position
							if(n == cursor.startNodeIndex &&
									i == cursor.startPos)
							{
								found = true;

								//insert tab at first position
								var prelength = val.length;

								if(e.shiftKey) //delete leading tab
								{
									if(i-1 >= 0 && val[i-1] == '\t')
										node.textContent = val.substr(0,i-1) + val.substr(i);
								}
								else //add leading tab
								{
									node.textContent = val.substr(0,i) + "\t" + val.substr(i);

								}

								//adjust selection to follow rectangular tabbing
								//	so future rectangular tabbing works as expected
								cursor.startPos += node.textContent.length - prelength;
								break;
							}

							//console.log(xcnt," vs ",x,val[i]);
							if(val[i] == '\t')
								x +=  _TAB_SIZE - (x+_TAB_SIZE)%_TAB_SIZE; //jump to next multiple of _TAB_SIZE
							else
								++x; //add single character spot
						}

						if(found) break;

						i = 0; //reset i for next loop
					}

					console.log("x",x);


					//fast-forward to endPos through each line and handle tab at x coord

					var xcnt = -1;
					for(n=cursor.startNodeIndex; n<el.childNodes.length; ++n)
					{
						node = el.childNodes[n];
						val = node.textContent; //.nodeValue; //.wholeText

						for(i=(n==cursor.startNodeIndex?cursor.startPos:
									0);
								i<
								(n==cursor.endNodeIndex?cursor.endPos:
										val.length);
								++i)
						{
							//console.log(xcnt," vs ",x,val[i]);
							if(val[i] == '\n')
							{
								//reset x coord count
								xcnt = 0;
							}
							else if(xcnt == x)
							{
								//console.log("x match at ",xcnt,val.substr(0,i),"TTT",val.substr(i));
								xcnt = -1;

								if(e.shiftKey) //delete leading tab
								{
									if(i-1 < val.length && val[i-1] == '\t')
									{
										val = val.substr(0,i-1) + val.substr(i);
										node.textContent = val;
										if(n == cursor.endNodeIndex) --cursor.endPos;
									}
								}
								else //add leading tab
								{
									val = val.substr(0,i) + "\t" + val.substr(i);
									node.textContent = val;
									if(n == cursor.endNodeIndex) ++cursor.endPos;
								}

							}
							else if(xcnt != -1) //if counting, increase
							{
								if(val[i] == '\t')
									xcnt += _TAB_SIZE - (xcnt+_TAB_SIZE)%_TAB_SIZE; //jump to next multiple of _TAB_SIZE
								else
									++xcnt; //add single character spot
							}
						} //end node text character loop

						if(n == cursor.endNodeIndex)
							break; //reached end of selection
					} //end node loop



					//need to set cursor
					CodeEditor.editor.setCursor(el,cursor,true /*scrollIntoView*/);

					return;
				} //end rectangular TAB handling





				/////////////////////////
				// normal block TAB handling
				//steps:
				//	go backwards from start until a new line is found
				//	then add tab after each new line until end of selection reached

				//reverse-find new line
				var node,val;
				var found = false;
				var specialStr = keyCode == SPACEKEY?' ':'\t';
				if(blockCOMMENT)
				{
					if(_fileExtension[forPrimary][0] == 'c' ||
							_fileExtension[forPrimary][0] == 'C' ||
							_fileExtension[forPrimary][0] == 'h' ||
							_fileExtension[forPrimary][0] == 'H' ||
							_fileExtension[forPrimary][0] == 'j')
						specialStr = "//"; //comment string
						else
						specialStr = "#"; //comment string
				}

				for(n=cursor.startNodeIndex; n>=0; --n)
				{
					node = el.childNodes[n];
					val = node.textContent;

					for(i=(n==cursor.startNodeIndex?cursor.startPos-1:
								val.length-1); i>=0; --i)
					{
						if(val[i] == '\n')
						{
							//found new line, now continue forward to end
							found = true;
							break;
						}

					} //end node text character loop

					if(found) break; //exit outer loop
				} //end node loop

				//fast-forward to endPos and insert tab after each new line encountered
				found = false;
				var prevCharIsNewLine = false;
				var lookForNewLineIndex; //index into string

				for(; n<el.childNodes.length &&
						n <= cursor.endNodeIndex; ++n)
				{
					node = el.childNodes[n];
					val = node.textContent;

					lookForNewLineIndex = 0;
					for(;i<val.length;++i)
					{
						if(n == cursor.endNodeIndex && i >= cursor.endPos)
						{
							//reached end of selection
							found = true;
							break;
						}

						if(val[i] == '\n' ||
								(i == 0 && prevCharIsNewLine))
						{
							if(i == 0 && prevCharIsNewLine) --i; //so that tab goes in the right place

							if(e.shiftKey) //delete leading special string
							{
								var didDelete = false;
								if(i + specialStr.length < val.length &&
										(
											//if special string is found, or
											//only white space between new line and special string
											(j=val.indexOf(specialStr,i+1)) == i+1 ||
											(
												(
													(k=val.indexOf('\n',i+1)) < 0 ||
													k > j
													) &&
												(
													j >= 0 &&
													val.substr(i+1,j-(i+1)).trim().length == 0
													)
												)
											)
										)
								{
									val = val.substr(0,j) +
										val.substr(j+specialStr.length);
									node.textContent = val;
									didDelete = true;
									lookForNewLineIndex = j+specialStr.length;
								}
								else if(specialStr == '\t')
								{
									//for tab case also get rid of 4-3-2-1 spaces after new line
									if((specialStr = " 	 ") && //4 spaces
											i + specialStr.length < val.length &&
											val.indexOf(specialStr,i+1) == i+1)
									{
										val = val.substr(0,i+1) +
											val.substr(i+1+specialStr.length);
										node.textContent = val;
										didDelete = true;
									}
									else if((specialStr = " 	") && //3 spaces
											i + specialStr.length < val.length &&
											val.indexOf(specialStr,i+1) == i+1)
									{
										val = val.substr(0,i+1) +
											val.substr(i+1+specialStr.length);
										node.textContent = val;
										didDelete = true;
									}
									else if((specialStr = "  ") && //2 spaces
											i + specialStr.length < val.length &&
											val.indexOf(specialStr,i+1) == i+1)
									{
										val = val.substr(0,i+1) +
											val.substr(i+1+specialStr.length);
										node.textContent = val;
										didDelete = true;
									}
									else if((specialStr = " ") && //1 spaces
											i + specialStr.length < val.length &&
											val.indexOf(specialStr,i+1) == i+1)
									{
										val = val.substr(0,i+1) +
											val.substr(i+1+specialStr.length);
										node.textContent = val;
										didDelete = true;
									}

									specialStr = '\t'; //return special string value
								}

								//fix cursor if deleted special string
								if(didDelete)
								{
									//update position after text was removed
									if(n == cursor.startNodeIndex &&
											i < cursor.startPos)
									{
										cursor.startPos -= specialStr.length;
									}
									if(n == cursor.endNodeIndex &&
											i < cursor.endPos)
									{
										cursor.endPos -= specialStr.length;
									}

									//if running out of string to keep line selected.. jump to next node
									//	with selection
									if(n == cursor.endNodeIndex &&
											cursor.endPos >= val.length)
									{
										++cursor.endNodeIndex;
										cursor.endPos = 0;
									}

									//									if(n < cursor.startNodeIndex)
									//									{
									//										cursor.startNodeIndex = n;
									//										cursor.startPos = val.length-1;
									//									}
									//									else if(n == cursor.startNodeIndex &&
									//											i < cursor.startPos)
									//									{
									//										cursor.startPos = i+1;
									//									}
								}

							} //end delete leading tab
							else //add leading tab
							{
								if(specialStr == ' ') //handle white-space appending special string
								{
									//add safter white space
									var ii = i+1;
									while(ii < val.length &&
											(val[ii] == ' ' || val[ii] == '\t' || val[ii] == '\n'))
										++ii;
									val = val.substr(0,ii) + specialStr + val.substr(ii);
									prevCharIsNewLine = (val[ii] == '\n');
									i = ii+1;
								}
								else //handle line-leading special string
									val = val.substr(0,i+1) + specialStr + val.substr(i+1);
								node.textContent = val;
							}

							if(i == -1 && prevCharIsNewLine) ++i; //so that loop continues properly
						}
					} //end node text character loop
					i = 0; //reset i for next character loop

					if(found) break; //exit outer loop

					if(e.shiftKey)
					{ //for reverse special string, except prev newline
						//if white space after
						j = val.lastIndexOf('\n');
						if(j >= lookForNewLineIndex &&
								(
									j == val[val.length-1] ||
									val.substr(j+1).trim().length == 0
									))
							prevCharIsNewLine = true;
						else if(j < 0 && prevCharIsNewLine &&
								val.trim().length == 0)
							prevCharIsNewLine = true; //last new line persists
						else
							prevCharIsNewLine = false;
					}
					else
						prevCharIsNewLine = (val.length && //handle last char newline case
							val[val.length-1] == '\n');
				} //end node loop

				//need to set cursor
				CodeEditor.editor.setCursor(el,cursor,true /*scrollIntoView*/);
			}
			else if(!blockCOMMENT) //not tabbing a selection, just add or delete single tab in place
			{
				if(e.shiftKey)
				{
					if(cursor.startNodeIndex !== undefined)
					{
						try
						{
							var node,val,i;
							i = cursor.startPos;
							node = el.childNodes[cursor.startNodeIndex];
							val = node.textContent; //.nodeValue; //.wholeText

							//console.log(node,val,val[i-1]);

							if(val[i-1] == '\t')
							{
								node.textContent = val.substr(0,i-1) + val.substr(i);

								//need to set cursor
								var range = document.createRange();
								range.setStart(node,i-1);
								range.setEnd(node,i-1);

								var selection = window.getSelection();
								selection.removeAllRanges();
								selection.addRange(range);
							}
						}
						catch(err)
						{
							console.log(err);
							return;
						}
					}
					else
						Debug.log("No cursor for reverse tab.");
				}
				else
					document.execCommand('insertHTML', false, '&#009');
			}

			return;

		} //end handle tab key
		else if(cursorSelection)
		{
			Debug.log("cursorSelection handling for speed-up");
			//Note: the default browser behavior really struggles
			//	editing many elements in a selection when there are
			//	a lot of elements (e.g. when the file is large)
			//	so... let's be smarter.


			//Note: looks like the browser gives character in a e.key
			//	but then there is also "Backspace" and "Delete"

			console.log("cursorSelection char",keyCode,c);

			if(e.key.length > 1)
			{
				if( keyCode != 46 && //delete
						keyCode != 8)  //backspace
					return; //do default handling for other special characters
				c = ''; //default weird characters to blanks
			}

			e.preventDefault();
			e.stopPropagation();
			localInsertCharacter(c);
		}
		else //special single key handling
		{
			if(c == '}')
			{
				if(localInsertCharacter(c))
				{
					//if true, then character was added, otherwise do default
					e.preventDefault();
					e.stopPropagation();
				}
			}
		}

	} //end keyDownHandler()

	//=====================================================================================
	//updateLastSave ~~
	//	update display based on lastSave and wasModified member variables
	this.updateLastSave = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		var el = document.getElementById("textEditorLastSave" + forPrimary);
		if(!el) return; //if not displayed, quick exit

		Debug.log("updateLastSave() forPrimary=" + forPrimary);
		var str = "";
		if(_fileWasModified[forPrimary])
			str += "<label style='color:red'>Unsaved changes!</label> ";
		else
			str += "Unmodified. ";

		if(_fileLastSave[forPrimary])
		{
			var now = new Date();
			var d = new Date(_fileLastSave[forPrimary]);
			var tstr = d.toLocaleTimeString();
			tstr = tstr.substring(0,tstr.lastIndexOf(' ')) + //convert AM/PM to am/pm with no space
				(tstr[tstr.length-2]=='A'?"am":"pm");

			var diff = ((now.getTime() - d.getTime())/1000)|0; //in seconds
			var diffStr = "";

			if(diff < 5)
				diffStr = "(just now) ";
			else if(diff < 10)
				diffStr = "(5 seconds ago) ";
			else if(diff < 20)
				diffStr = "(15 seconds ago) ";
			else if(diff < 40)
				diffStr = "(30 seconds ago) ";
			else if(diff < 50)
				diffStr = "(45 seconds ago) ";
			else if(diff < 120)
				diffStr = "(one minute ago) ";
			else if(diff < 15*60)
				diffStr = "(" + ((diff/60)|0) + " minutes ago) ";
			else if(diff < 20*60) //about 15 minutes
				diffStr = "(15 minutes ago) ";
			else if(diff < 40*60) //about 30 minutes
				diffStr = "(30 minutes ago) ";
			else if(diff < 50*60) //about 45 minutes
				diffStr = "(45 minutes ago) ";
			else if(diff < 90*60) //about an hour
				diffStr = "(an hour ago) ";
			else	//hours
				diffStr = "(" + (Math.round(diff/60/60)) + " hours ago) ";


			str += "Last save was " + diffStr + tstr;
		}
		el.innerHTML = str;
	} //end updateLastSave()

	//=====================================================================================
	//handleFileNameMouseMove ~~
	this.handleFileNameMouseMove = function(forPrimary,doNotStartTimer)
	{
		forPrimary = forPrimary?1:0;

		//console.log("handleFileNameMouseMove " + forPrimary + " - " + doNotStartTimer);

		if(_fileNameEditing[forPrimary]) return;

		var el = document.getElementById("fileButtonContainerShowHide" + forPrimary);
		el.style.display = "block";

		window.clearTimeout(_fileNameMouseMoveTimerHandle);

		if(doNotStartTimer) return;

		_fileNameMouseMoveTimerHandle = window.setTimeout(
				function()
			{
				el.style.display = "none";
			} //end mouse move timeout handler
			,1000);

	} //end handleFileNameMouseMove()

	//=====================================================================================
	//startEditFileName ~~
	this.startEditFileName = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		if(_fileNameEditing[forPrimary]) return;
		_fileNameEditing[forPrimary] = true;

		//hide edit button
		document.getElementById("fileButtonContainerShowHide" + forPrimary).style.display = "none";


		console.log("startEditFileName " + forPrimary);

		var el = document.getElementById("fileNameDiv" + forPrimary);

		var keys = Object.keys(_fileHistoryStack);
		var initVal = keys[document.getElementById("fileNameHistorySelect" +
				forPrimary).value|0].trim();//el.textContent.trim();

		var _OK_CANCEL_DIALOG_STR = "";

		_OK_CANCEL_DIALOG_STR += "<div title='' style='padding:5px;background-color:#eeeeee;border:1px solid #555555;position:relative;z-index:2000;" + //node the expander nodes in tree-view are z-index:1000
			"width:105px;height:20px;margin: 4px -122px -32px -120px; font-size: 16px; white-space:nowrap; text-align:center;'>";
		_OK_CANCEL_DIALOG_STR += "<a class='popUpOkCancel' onclick='" +
			"CodeEditor.editor.editCellOK(" + forPrimary +
			"); event.stopPropagation();' onmouseup='event.stopPropagation();' title='Accept Changes' style='color:green'>" +
			"<b style='color:green;font-size: 16px;'>OK</b></a> | " +
			"<a class='popUpOkCancel' onclick='" +
			"CodeEditor.editor.editCellCancel(" + forPrimary +
			"); event.stopPropagation();' onmouseup='event.stopPropagation();' title='Discard Changes' style='color:red'>" +
			"<b style='color:red;font-size: 16px;'>Cancel</b></a>";
		_OK_CANCEL_DIALOG_STR += "</div>";

		//create input box and ok | cancel
		var str = "";
		str += DesktopContent.htmlOpen("input",
			{
				"type":"text",
				"style":"text-align:center;margin:-4px -2px -4px -1px;width:100%;" +
				" height:" + (el.offsetHeight>20?el.offsetHeight:20) + "px",
				"value": initVal,
				"onclick":"event.stopPropagation();",
			},0 /*innerHTML*/, true /*doCloseTag*/);


		//		"<input type='text' style='text-align:center;margin:-4px -2px -4px -1px;width:90%;" +
		//				" height:" + (el.offsetHeight>20?el.offsetHeight:20) + "px' value='";
		//		str += initVal;
		//		str += "' >";

		str += _OK_CANCEL_DIALOG_STR;

		el.innerHTML = str;

		//select text in new input
		el = el.getElementsByTagName("input")[0];
		var startPos = initVal.lastIndexOf('/')+1;
		var endPos = initVal.lastIndexOf('.');
		if(endPos < 0) endPos = initVal.length;
		el.setSelectionRange(startPos, endPos);
		el.focus();

	} //end startEditFileName()

	//=====================================================================================
	//editCellOK ~~
	this.editCellOK = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		var val = document.getElementById("fileNameDiv" + forPrimary).getElementsByTagName("input")[0].value;
		console.log("editCellOK " + forPrimary + " = " + val);
		_fileNameEditing[forPrimary] = false;

		var extPos = val.lastIndexOf('.');

		//set path and extension

		_filePath[forPrimary] = val.substr(0,extPos);
		_fileExtension[forPrimary] = extPos > 0?val.substr(extPos+1):"";


		//indicate file was not saved
		_fileWasModified[forPrimary] = true;
		_fileLastSave[forPrimary] = 0; //reset
		CodeEditor.editor.updateLastSave(forPrimary);




		//	update file history stack to be displayed
		//	in dropdown at filename position
		//	place them in by time, so they are in time order
		//	and in case we want to remove old ones


		_fileHistoryStack[_filePath[forPrimary] + "." +
			_fileExtension[forPrimary]] = [
			_eel[forPrimary].textContent,
			Date.now(),
			_fileWasModified[forPrimary],
			_fileLastSave[forPrimary]];
		console.log("_fileHistoryStack",_fileHistoryStack);

		CodeEditor.editor.updateFileHistoryDropdowns(); //both

	} //end editCellOK()

	//=====================================================================================
	//editCellCancel ~~
	this.editCellCancel = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("editCellCancel " + forPrimary);
		_fileNameEditing[forPrimary] = false;

		//revert to same path and extension
		CodeEditor.editor.updateFileHistoryDropdowns(forPrimary);

	} //end editCellCancel()



	//=====================================================================================
	//updateFileHistoryDropdowns ~~
	//	if forPrimarySelect is undefined, do both
	this.updateFileHistoryDropdowns = function(forPrimarySelect)
	{
		Debug.log("updateFileHistoryDropdowns forPrimarySelect=" + forPrimarySelect);

		var el;
		var str = "";
		var i;

		//_fileHistoryStack is map from filename to [content,time]
		var keys = Object.keys(_fileHistoryStack);

		var currentFile;
		for(var forPrimary=0;forPrimary<2;++forPrimary) //for primary and secondary
		{
			if(forPrimarySelect !== undefined && //target forPrimarySelect unless undefined
					forPrimarySelect != forPrimary) continue;

			currentFile = _filePath[forPrimary] + "." + _fileExtension[forPrimary];
			str = "";
			str += DesktopContent.htmlOpen("select",
				{
					"class":"fileNameHistorySelect",
					"id":"fileNameHistorySelect" + forPrimary,
					"style":"width:100%;" +
					"text-align-last: center;",
					"title":"The current file is\n" + currentFile,
					"onchange":
					"CodeEditor.editor.handleFileNameHistorySelect(" +
					forPrimary + ");",
					"onclick":"CodeEditor.editor.stopUpdateHandling(event);",
					//"onfocus":"CodeEditor.editor.lastFileNameHistorySelectIndex = this.value;" +
					//"this.value = -1;", //force action even if same selected
					//"onblur":"this.value = CodeEditor.editor.lastFileNameHistorySelectIndex;",

				},0 /*innerHTML*/, false /*doCloseTag*/);

			//insert filename options
			for(i=0;i<keys.length;++i)
			{
				//Debug.log("key " + keys[i]);

				str += "<option value='" + i + "' ";
				if(currentFile == keys[i])
					str += "selected";
				str += ">";
				if(_fileHistoryStack[keys[i]][2])
					str += "*MODIFIED* ";
				str += keys[i];
				str += "</option>";
			} //end filaname option loop

			str += "</select>";

			try
			{
				el = document.getElementById("fileNameDiv" + forPrimary);
				el.innerHTML = str;
			}
			catch(e)
			{
				Debug.log("Ignoring error since file forPrimary=" +
						forPrimary + " is probably not opened:[" + DesktopContent.getExceptionLineNumber(e) + "]: " +
						e);
			}
		} // end primary and secondary loop

	} //end updateFileHistoryDropdowns()


	//=====================================================================================
	//handleFileNameHistorySelect ~~
	this.handleFileNameHistorySelect = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		var selectedFileIndex = document.getElementById("fileNameHistorySelect" + forPrimary).value | 0;
		Debug.log("updateFileHistoryDropdowns " + forPrimary +
				"selected=" + selectedFileIndex);

		var keys = Object.keys(_fileHistoryStack);
		var selectedFileName = keys[selectedFileIndex];

		Debug.log("selectedFileName " + selectedFileName);


		//do not open file, just cut to the existing content in stack

		var fileObj = {};
		var fileArr = selectedFileName.split('.');

		//if same file, ask if user wants to reload
		if(fileArr[0] == _filePath[forPrimary] &&
				fileArr[1] == _fileExtension[forPrimary])
		{
			CodeEditor.editor.openFile(forPrimary,
					_filePath[forPrimary],
					_fileExtension[forPrimary],
					true /*doConfirm*/);
			return;
		}

		fileObj.path 			= fileArr[0];
		fileObj.extension 		= fileArr[1];
		fileObj.text 			= _fileHistoryStack[selectedFileName][0];
		fileObj.fileWasModified = _fileHistoryStack[selectedFileName][2];
		fileObj.fileLastSave 	= _fileHistoryStack[selectedFileName][3];

		console.log("fileObj",fileObj);

		CodeEditor.editor.handleFileContent(forPrimary,0,fileObj);

	} //end handleFileNameHistorySelect()


	//=====================================================================================
	//showFindAndReplace ~~
	this.showFindAndReplace = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;
		_activePaneIsPrimary = forPrimary;

		Debug.log("showFindAndReplace forPrimary=" + forPrimary + " activePane=" + _activePaneIsPrimary);

		CodeEditor.editor.findAndReplaceLastButton[forPrimary] = 1;//default action is find

		//get cursor selection to use as starting point for action
		var el = _eel[forPrimary];
		var cursor = _findAndReplaceCursorInContent[forPrimary] =
			CodeEditor.editor.getCursor(el);

		//replace header with find and replace dialog
		el = document.getElementById("textEditorHeader" + forPrimary);
		var str = "";

		str += "<center>";

		str += "<table style='margin-top: 2px;'>";


		//row 1 -- Find
		str += "<tr><td style='text-align:right'>"; //col 1
		str += "Find:";
		str += "</td><td>"; //col 2
		str += DesktopContent.htmlOpen("input",
			{
				"type":"text",
				"id":"findAndReplaceFind" + forPrimary,
				"style":"text-align:left; width:90%;" +
				" height:" + (20) + "px",
				"value": CodeEditor.editor.findAndReplaceFind[forPrimary],
				"onclick":"event.stopPropagation();",
				"onchange":"CodeEditor.editor.findAndReplaceFind[" +
				forPrimary + "] = this.value;" +
					"CodeEditor.editor.showFindAndReplaceSelection(" +
					forPrimary + ");",
			},0 /*innerHTML*/, true /*doCloseTag*/);

		str += "</td><td>"; //col 3

		//Scope options
		str += DesktopContent.htmlOpen("select",
			{
				"id":"findAndReplaceScope" + forPrimary,
				"style":"width:100%;" +
				"text-align-last: center;",
				"title":"Choose the scope for Replace All",
				"onclick":"event.stopPropagation();" ,
				"onchange":"CodeEditor.editor.findAndReplaceScope[" +
				forPrimary + "] = this.value;" +
					"CodeEditor.editor.showFindAndReplaceSelection(" +
					forPrimary + ");",

			},0 /*innerHTML*/, false /*doCloseTag*/);
		str += "<option value='0'>All Lines</option>";
		str += "<option value='1' " + (CodeEditor.editor.findAndReplaceScope[forPrimary] ==
				1?"selected":"") + ">Selected Lines</option>";
		str += "</select>";

		str += "</td><td>"; //col 4

		//Option case-sensitive
		str += DesktopContent.htmlOpen("input",
			{
				"type":"checkbox",
				"id":"findAndReplaceCaseSensitive" + forPrimary,
				"title":"Toggle case sensitive search",
				"onclick":"event.stopPropagation();",
				"style":"margin-left:10px;",
				"onchange":"CodeEditor.editor.findAndReplaceCaseSensitive[" +
				forPrimary + "] = this.checked;" +
					"CodeEditor.editor.showFindAndReplaceSelection(" +
					forPrimary + ");",

			},
			DesktopContent.htmlOpen("a",
				{
				"title":"Toggle case sensitive search",
				"style":"margin-left:5px;",
				"onclick":"event.stopPropagation();" +
				"var el = document.getElementById(\"findAndReplaceCaseSensitive" +
				forPrimary + "\"); el.checked = !el.checked;" +
				"CodeEditor.editor.findAndReplaceCaseSensitive[" +
				forPrimary + "] = el.checked;" +
					"CodeEditor.editor.showFindAndReplaceSelection(" +
					forPrimary + ");",

				},
				"Case sensitive" /*innerHTML*/, true /*doCloseTag*/
				)/*innerHTML*/, true /*doCloseTag*/);

		str += "</td></tr>";

		//row 2 -- Replace
		str += "<tr><td style='text-align:right'>"; //col 1
		str += "Replace with:";
		str += "</td><td>"; //col 2
		str += DesktopContent.htmlOpen("input",
			{
				"type":"text",
				"id":"findAndReplaceReplace" + forPrimary,
				"style":"text-align:left; width:90%;" +
				" height:" + (20) + "px",
				"value": CodeEditor.editor.findAndReplaceReplace[forPrimary],
				"onclick":"event.stopPropagation();",
				"onchange":"CodeEditor.editor.findAndReplaceReplace[" +
				forPrimary + "] = this.value; " +
					"CodeEditor.editor.showFindAndReplaceSelection(" +
					forPrimary + ");",
			},0 /*innerHTML*/, true /*doCloseTag*/);

		str += "</td><td>"; //col 3

		//Direction options
		str += DesktopContent.htmlOpen("select",
			{
				"id":"findAndReplaceDirection" + forPrimary,
				"style":"width:100%;" +
				"text-align-last: center;",
				"title":"Choose the search direction for the Find & Replace",
				"onclick":"event.stopPropagation();",
				"onchange":"CodeEditor.editor.findAndReplaceDirection[" +
				forPrimary + "] = this.value;" +
					"CodeEditor.editor.showFindAndReplaceSelection(" +
					forPrimary + ");",

			},0 /*innerHTML*/, false /*doCloseTag*/);
		str += "<option value='0'>Search Forward</option>";
		str += "<option value='1' " + (CodeEditor.editor.findAndReplaceDirection[forPrimary] ==
				1?"selected":"") +
			">Search Backward</option>";
		str += "</select>";

		str += "</td><td>"; //col 4

		//Option whole word
		str += DesktopContent.htmlOpen("input",
			{
				"type":"checkbox",
				"id":"findAndReplaceWholeWord" + forPrimary,
				"title":"Toggle whole word search",
				"onclick":"event.stopPropagation();",
				"style":"margin-left:10px;",
				"onchange":"CodeEditor.editor.findAndReplaceWholeWord[" +
				forPrimary + "] = this.checked;" +
					"CodeEditor.editor.showFindAndReplaceSelection(" +
					forPrimary + ");",

			},
			DesktopContent.htmlOpen("a",
				{
				"style":"margin-left:5px;",
				"title":"Toggle whole word search",
				"onclick":"event.stopPropagation();" +
				"var el = document.getElementById(\"findAndReplaceWholeWord" +
				forPrimary + "\"); el.checked = !el.checked;" +
				"CodeEditor.editor.findAndReplaceWholeWord[" +
				forPrimary + "] = el.checked;" +
					"CodeEditor.editor.showFindAndReplaceSelection(" +
					forPrimary + ");",
				},
				"Whole word" /*innerHTML*/, true /*doCloseTag*/
				)/*innerHTML*/, true /*doCloseTag*/);

		str += "</td></tr>";


		//Buttons row
		str += "<tr><td colspan='4' style='text-align:center'>";
		str += DesktopContent.htmlOpen("div",
			{
				"id":		"findAndReplaceWrapped" + forPrimary,
				"style":	"text-align:right; margin: 4px; width:115px;" +
				"color: red; float: left;",
			},0 /*innerHTML*/, true /*doCloseTag*/);
		str += "<div style='float:left;'>";
		str += DesktopContent.htmlOpen("input",
			{
				"type":		"button",
				"value": 	"Find",

				"style":	"text-align:center; margin: 4px;" ,
				"onclick":	"event.stopPropagation();" +
				"CodeEditor.editor.doFindAndReplaceAction(" + forPrimary + ",1)",
			},0 /*innerHTML*/, true /*doCloseTag*/);

		str += DesktopContent.htmlOpen("input",
			{
				"type":		"button",
				"value": 	"Replace",

				"style":	"text-align:center; margin: 4px;" ,
				"onclick":	"event.stopPropagation();" +
				"CodeEditor.editor.doFindAndReplaceAction(" + forPrimary + ",2)",
			},0 /*innerHTML*/, true /*doCloseTag*/);

		str += DesktopContent.htmlOpen("input",
			{
				"type":		"button",
				"value": 	"Replace & Find",

				"style":	"text-align:center; margin: 4px;" ,
				"onclick":	"event.stopPropagation();" +
				"CodeEditor.editor.doFindAndReplaceAction(" + forPrimary + ",3)",
			},0 /*innerHTML*/, true /*doCloseTag*/);

		str += DesktopContent.htmlOpen("input",
			{
				"type":		"button",
				"value": 	"Replace All",

				"style":	"text-align:center; margin: 4px;" ,
				"onclick":	"event.stopPropagation();" +
				"CodeEditor.editor.doFindAndReplaceAction(" + forPrimary + ",4)",
			},0 /*innerHTML*/, true /*doCloseTag*/);

		str += DesktopContent.htmlOpen("input",
			{
				"type":		"button",
				"value": 	"Cancel",
				"title":	"Close find and replace controls.",
				"style":	"text-align:center; margin: 4px;" ,

				"onclick":	"event.stopPropagation();" +
				"CodeEditor.editor.displayFileHeader(" + forPrimary + ")",
			},0 /*innerHTML*/, true /*doCloseTag*/);

		str += "</div>";
		str += "</td></tr>";

		str += "</table>";
		str += "</center>";

		el.innerHTML = str;

		el = document.getElementById("findAndReplaceFind" + forPrimary);
		el.setSelectionRange(0, el.value.length);
		el.focus();

		el = document.getElementById("findAndReplaceCaseSensitive" + forPrimary);
		el.checked = CodeEditor.editor.findAndReplaceCaseSensitive[forPrimary];

		el = document.getElementById("findAndReplaceWholeWord" + forPrimary);
		el.checked = CodeEditor.editor.findAndReplaceWholeWord[forPrimary];

	} //end showFindAndReplace()


	//=====================================================================================
	//showFindAndReplaceSelection ~~
	this.showFindAndReplaceSelection = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;
		Debug.log("showFindAndReplaceSelection forPrimary=" + forPrimary);

		var el = _eel[forPrimary];
		var cursor = CodeEditor.editor.getCursor(el);

		if(cursor.startPosInContent !== undefined)
			CodeEditor.editor.setCursor(el,
				cursor,
				true /*scrollIntoView*/);
		else if( //if find is open, then go to find cursor
				CodeEditor.editor.findAndReplaceLastButton[forPrimary] > 0 &&
				_findAndReplaceCursorInContent[forPrimary] !== undefined)
			CodeEditor.editor.setCursor(el,
				_findAndReplaceCursorInContent[forPrimary],
				true /*scrollIntoView*/);


	} //end showFindAndReplaceSelection()

	//=====================================================================================
	//doFindAndReplaceAction ~~
	//	actions:
	//		1 := Find
	//		2 := Replace
	//		3 := Replace & Find
	//		4 := Replace All
	this.doFindAndReplaceAction = function(forPrimary,action)
	{
		forPrimary = forPrimary?1:0;
		action = action | 0; //force integer

		CodeEditor.editor.findAndReplaceLastButton[forPrimary] = action; //record last action

		var find = document.getElementById("findAndReplaceFind" + forPrimary).value;//CodeEditor.editor.findAndReplaceFind[forPrimary];
		var originalFind = find;
		if(!find || find == "")
		{
			Debug.log("Illegal empty string to find.", Debug.HIGH_PRIORITY);
			return;
		}
		var replace = CodeEditor.editor.findAndReplaceReplace[forPrimary];
		var scope = CodeEditor.editor.findAndReplaceScope[forPrimary]|0;
		var direction = CodeEditor.editor.findAndReplaceDirection[forPrimary]|0;
		if(action == 4) //always go forward for Replace All
			direction = 0;
		var caseSensitive = CodeEditor.editor.findAndReplaceCaseSensitive[forPrimary]?1:0;
		var wholeWord = CodeEditor.editor.findAndReplaceWholeWord[forPrimary]?1:0;

		Debug.log("doFindAndReplaceAction forPrimary=" + forPrimary +
				" action=" + action +
				" find=" + find +
				" replace=" + replace +
				" scope=" + scope +
				" direction=" + direction +
				" caseSensitive=" + caseSensitive +
				" wholeWord=" + wholeWord);

		//Steps:
		//	loop
		//		if 2, 3, 4
		//			replace current found word
		//		if 1, 3, 4
		//			find a word based on criteria
		//		if 4 and found a word
		//			continue loop, else done!

		var el = _eel[forPrimary];
		var originalText = el.textContent;

		if(caseSensitive)
			text = originalText;
		else //case insensitive, so force lower case
		{
			text = originalText.toLowerCase();
			find = find.toLowerCase();
		}

		var i = direction?text.length:-1; //init to 1 off the end
		var j = text.length-1;
		//,n,node,el,val;
		var cursor = CodeEditor.editor.getCursor(el);

		//if there is a cursor and havent wrapped around, use the cursor
		if(cursor.startPosInContent !== undefined &&
				(action == 4 ||
					document.getElementById("findAndReplaceWrapped" + forPrimary).textContent == ""))
			i = cursor.startPosInContent;
		else if(_findAndReplaceCursorInContent[forPrimary] !== undefined &&
				_findAndReplaceCursorInContent[forPrimary].startPosInContent !== undefined &&
				_findAndReplaceCursorInContent[forPrimary].startPosInContent >= 0 &&
				(action == 4 ||
					document.getElementById("findAndReplaceWrapped" + forPrimary).textContent == ""))
		{
			i = _findAndReplaceCursorInContent[forPrimary].startPosInContent;

			if(action == 4)
				CodeEditor.editor.setCursor(el,
					_findAndReplaceCursorInContent[forPrimary],
					true /*scrollIntoView*/);
		}

		//clear wrapped
		document.getElementById("findAndReplaceWrapped" + forPrimary).innerHTML = "";

		Debug.log("Starting position: " + i);

		if(scope == 1) //only selected lines
		{
			if(cursor.endPosInContent !== undefined)
				j = cursor.endPosInContent;
			else if(_findAndReplaceCursorInContent[forPrimary] !== undefined &&
					_findAndReplaceCursorInContent[forPrimary].endPosInContent != undefined &&
					_findAndReplaceCursorInContent[forPrimary].endPosInContent >= 0)
				j = _findAndReplaceCursorInContent[forPrimary].endPosInContent;

			Debug.log("Ending position: " + j);
		}
		else if(action ==  4) //if all lines, replace all, then start i at beginning
			i = -1;

		var replaceCount = 0;
		var done;
		var found = false;
		do
		{
			done = true; //init to one time through

			/////////////////////
			//replace current found word
			switch(action)
			{
			case 2: //Replace
			case 3: //Replace & Find
				if(i > 0 && i + find.length <= text.length)
					found = true; //replace first time through
			case 4: //Replace All

				if(found)
				{
					Debug.log("Replacing");
					++replaceCount;

					//do replace
					originalText =
						originalText.substr(0,i) +
						replace +
						originalText.substr(i+find.length);

					//update text, so indices still matchup
					if(caseSensitive)
						text = originalText;
					else //case insensitive, so force lower case
						text = originalText.toLowerCase();
				}

				break;
			case 1: //Find
				break; //do nothing
			default:
				Debug.log("Unrecognized action! " + action, Debug.HIGH_PRIORITY);
				return;
			} //end replace word


			//////////////////////////
			//find a word based on criteria
			switch(action)
			{
			case 1: //Find
			case 3: //Replace & Find
			case 4: //Replace All

				if(direction == 0) //forward
					i = text.indexOf(find,i+1);
				else if(direction == 1) //reverse
					i = text.lastIndexOf(find,i-1);

				if(wholeWord)
				{
					//confirm non-alpha-numeric before and after
					if(i>0 && (
								(text[i-1] >= 'a' && text[i-1] <= 'z') ||
								(text[i-1] >= 'A' && text[i-1] <= 'Z') ||
								(text[i-1] >= '0' && text[i-1] <= '9') ||
								text[i-1] == '_'
								)) //if leading character is alpha-numeric
					{
						//invalidate find!
						done = false; //look for next
					}
					else if(i>0 && i+find.length<text.length && (
								(text[i+find.length] >= 'a' && text[i+find.length] <= 'z') ||
								(text[i+find.length] >= 'A' && text[i+find.length] <= 'Z') ||
								(text[i+find.length] >= '0' && text[i+find.length] <= '9') ||
								text[i+find.length] == '_'
								)) //if trailing character is alpha-numeric
					{
						//invalidate find!
						done = false; //look for next
					}
				}

				console.log(i);//,text.substr(i,find.length));

				if(done) //handle end game, done overloaded to handle wholeWord functionality
				{
					if(i >= 0) //found something
					{
						found = true;

						//if Replace All, then keep going
						if(action == 4)
						{
							//keep going if within selection
							if(i + find.length < j)
								done = false;
							//else outside of selected lines
						}
					}
					else //found nothing
					{
						found = false;
						document.getElementById("findAndReplaceWrapped" + forPrimary).innerHTML = "Reached end";
					}
				} //end end game handling
				else
					found = false;

				break;
			case 2: //Replace
				break; //do nothing
			default:
				Debug.log("Unrecognized action! " + action, Debug.HIGH_PRIORITY);
				return;
			} //end find word

			//Debug.log("done " + done);
		} while(!done); //end main replace & find loop


		/////////////////////
		//wrap it up
		switch(action)
		{
		case 2: //Replace
		case 3: //Replace & Find
		case 4: //Replace All

			//set to modified original text
			//	then re-decorate
			el.textContent = originalText;
			CodeEditor.editor.updateDecorations(forPrimary);

			//select the find
			if(action == 3)
			{
				_findAndReplaceCursorInContent[forPrimary] =
					CodeEditor.editor.createCursorFromContentPosition(el,
						i, i + find.length);
				CodeEditor.editor.setCursor(
						el,
						_findAndReplaceCursorInContent[forPrimary],
						true /*scrollIntoView*/);
			}


			break;
		case 1: //Find

			//select the find
			_findAndReplaceCursorInContent[forPrimary] =
				CodeEditor.editor.createCursorFromContentPosition(el,
					i, i + find.length)
				CodeEditor.editor.setCursor(
					el,
					_findAndReplaceCursorInContent[forPrimary],
					true /*scrollIntoView*/);

			break;
		default:
			Debug.log("Unrecognized action! " + action, Debug.HIGH_PRIORITY);
			return;
		} //end wrap it up



		//display replace count for Replace All
		if(action == 4)
			document.getElementById("findAndReplaceWrapped" + forPrimary).innerHTML =
			replaceCount + " Replaced";


	} //end doFindAndReplaceAction()

	//=====================================================================================
	//displayFileHeader ~~
	this.displayFileHeader = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		var forceDisplayComplete = false;
		if(CodeEditor.editor.findAndReplaceLastButton[forPrimary] != -1)
		{
			CodeEditor.editor.findAndReplaceLastButton[forPrimary] = -1; //clear default find and replace action
			forceDisplayComplete = true;
		}

		Debug.log("displayFileHeader forPrimary=" + forPrimary);

		//set path and extension and last save to header
		var el = document.getElementById("textEditorHeader" + forPrimary);


		var path = _filePath[forPrimary];
		var extension = _fileExtension[forPrimary];
		//		var fileWasModified = _fileWasModified[forPrimary];
		//		var fileLastSave = _fileLastSave[forPrimary];

		var str = "";

		//add file name div
		str += DesktopContent.htmlOpen("div",
			{
				"onmousemove" :
				"CodeEditor.editor.handleFileNameMouseMove(" + forPrimary + ");",
			},0 /*innerHTML*/, false /*doCloseTag*/);
		str += "<center>";


		str += DesktopContent.htmlOpen("div", //this is place holder, that keeps height spacing
				{

						"style": "width: 172px;", //_READ_ONLY make different width
						"class": "fileButtonContainer",
						"id": "fileButtonContainer" + forPrimary,

				}, 0 /*innerHTML*/, false /*doCloseTag*/);

		str += DesktopContent.htmlOpen("div", //this is el that gets hide/show toggle
			{
				"class":"fileButtonContainerShowHide",
				"id":"fileButtonContainerShowHide" + forPrimary,
				"onmousemove":
				"event.stopPropagation(); " +
				"CodeEditor.editor.handleFileNameMouseMove(" + forPrimary +
				",1 /*doNotStartTimer*/);",

			},0 /*innerHTML*/, false /*doCloseTag*/);

		//add rename button
		if (!_READ_ONLY)
		{
			str += DesktopContent.htmlOpen("div",
					{
							"class":"fileButton",
							"id":"fileRenameButton" + forPrimary,
							"title": "Change the filename\n" + path + "." + extension,
							"onclick":
							"event.stopPropagation(); " +
							"CodeEditor.editor.startEditFileName(" + forPrimary + ");",
					},0 /*innerHTML*/, true /*doCloseTag*/);
		}
		str += DesktopContent.htmlOpen("div",
			{
				"class":"fileButton",
				"id":"fileDownloadButton" + forPrimary,
				"title": "Download the file content from\n" + path + "." + extension,
				"onclick":
				"event.stopPropagation(); " +
				"CodeEditor.editor.download(" + forPrimary + ");",
			},
			//make download arrow
			"<div class='fileDownloadButtonBgChild' style='display: ; margin-left: 0px; margin-top: 1px; height:7px; width: 6px; background-color: rgb(202, 204, 210);'></div>" +
			"<div class='fileDownloadButtonBorderChild' style='display: block; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid rgb(202, 204, 210);'></div>" +
			"<div class='fileDownloadButtonBgChild' style='position: relative; top: 2px; width: 12px; height: 2px; display: block; background-color: rgb(202, 204, 210);'></div>"
			/*innerHTML*/, true /*doCloseTag*/);
		if (!_READ_ONLY) {
			str += DesktopContent.htmlOpen("div",
				{
					"class":"fileButton",
					"id":"fileUploadButton" + forPrimary,
					"title": "Upload file content to\n" + path + "." + extension,
					"onclick":
					"event.stopPropagation(); " +
					"CodeEditor.editor.upload(" + forPrimary + ");",
				},

			//make upload arrow
			"<div class='fileDownloadButtonBorderChild' style='display: block; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 8px solid rgb(202, 204, 210);'></div>" +
			"<div class='fileDownloadButtonBgChild' style='display: block; margin-left: 0px; height:7px; width: 6px; background-color: rgb(202, 204, 210);'></div>" +
			"<div class='fileDownloadButtonBgChild' style='position: relative; top: 3px; width: 12px; height: 2px; display: block; background-color: rgb(202, 204, 210);'></div>"
			/*innerHTML*/, true /*doCloseTag*/);
		}
		if (!_READ_ONLY) {
			str += DesktopContent.htmlOpen("div",
				{
					"class":"fileButton fileUndoButton",
					"id":"fileUndoButton" + forPrimary,
					"title": "Undo to rewind to last recorded checkpoint for\n" + path + "." + extension,
					"style": "color: rgb(202, 204, 210);" +
						"padding: 0 5px 0;" +
						"font-size: 17px;" +
						"font-weight: bold;",
					"onclick":
					"event.stopPropagation(); " +
					"CodeEditor.editor.undo(" + forPrimary + ");",
				},
				//make undo arrow
				"&#8617;"
				/*innerHTML*/, true /*doCloseTag*/);

		str += DesktopContent.htmlOpen("div",
			{
				"class":"fileButton fileUndoButton",
				"id":"fileRedoButton" + forPrimary,
				"title": "Redo to fast-forward to last recorded checkpoint for\n" + path + "." + extension,
				"style": "color: rgb(202, 204, 210);" +
					"padding: 0 5px 0;" +
					"font-size: 17px;" +
					"font-weight: bold;",
				"onclick":
				"event.stopPropagation(); " +
				"CodeEditor.editor.undo(" + forPrimary + ",1 /*redo*/);",
			},
			//make redo arrow
			"&#8618;"
			/*innerHTML*/, true /*doCloseTag*/);
		}

		str += DesktopContent.htmlOpen("div",
			{
				"class":"fileButton openRelatedFileButton",
				"id":"openRelatedFileButton" + forPrimary,
				"title": "Open related file in other pane for\n" + path + "." + extension,
				"style": "color: rgb(202, 204, 210);" +
					"padding: 0 5px 0;" +
					"font-size: 17px;" +
					"font-weight: bold;",
				"onclick":
					"event.stopPropagation(); " +
					"CodeEditor.editor.openRelatedFile(" + forPrimary +
						", true /*inOtherPane*/);",
			},
			//make redo arrow
			":"
			/*innerHTML*/, true /*doCloseTag*/);

		str += DesktopContent.htmlOpen("div",
			{
				"class":"fileButton refreshFileButton",
				"id":"refreshFileButton" + forPrimary,
				"title": "Refresh file \n" + path + "." + extension,
				"style": "color: rgb(202, 204, 210);" +
					"padding: 0 5px 0;" +
					(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_FIREFOX? //firefox shows circle-arrow character smaller
							"font-size: 28px;margin-top:-6px;":"font-size: 17px;font-weight:bold;"),
				"onclick":
					"event.stopPropagation(); " +
					"CodeEditor.editor.openFile(" + forPrimary +
						",\"" + path + "\",\"" +
						extension + "\", true /*doConfirm*/);",
			},
			//make refresh circle arrow
			"&#8635;"
			/*innerHTML*/, true /*doCloseTag*/);



		str += "</div>"; //end fileButtonContainerShowHide
		str += "</div>"; //end fileButtonContainer

		str += DesktopContent.htmlClearDiv();

		var nameArr = path.split('/');

		//table for open icons and filename select
		str += "<table><tr><td>";
		//open in new window
		str += DesktopContent.htmlOpen("a",
			{
				"title":"Open file in a new browser tab: \n" +
				"srcs" + path + "." + extension,
				"onclick":"DesktopContent.openNewBrowserTab(" +
				"\"" + nameArr[nameArr.length-1] + "." + extension + "\",\"\"," +
				"\"/WebPath/html/CodeEditor.html?urn=" +
				DesktopContent._localUrnLid + "&" +
				"startFilePrimary=" +
				path + "." + extension + "\",0 /*unique*/);' ", //end onclick
			},
			"<img class='dirNavFileNewWindowImgNewWindow' " +
			"src='/WebPath/images/windowContentImages/CodeEditor-openInNewWindow.png'>"
			/*innerHTML*/, true /*doCloseTag*/);

		//open in other pane
		str += DesktopContent.htmlOpen("a",
			{
				"title":"Open file in the other editor pane of the split-view: \n" +
				"srcs" + path + "." + extension,
				"onclick":"CodeEditor.editor.openFile(" +
				(!forPrimary) + ",\"" +
					path + "\", \"" +
					extension + "\"" + //extension
					");", //end onclick
			},
			"<img class='dirNavFileNewWindowImgNewPane' " +
			"src='/WebPath/images/windowContentImages/CodeEditor-openInOtherPane.png'>"
			/*innerHTML*/, true /*doCloseTag*/);
		str += "</td><td style='width:90%'>";

		//add path div
		str += DesktopContent.htmlOpen("div",
			{
				"class":"fileNameDiv",
				"id":"fileNameDiv" + forPrimary,
				"style":"margin: 0 5px 0 5px",
			},0 /*innerHTML*/, false /*doCloseTag*/);
		str += "<a onclick='CodeEditor.editor.openFile(" + forPrimary +
			",\"" + path + "\",\"" + extension + "\",true /*doConfirm*/);' " +
			"title='Click to reload \n" + path + "." + extension + "' " +
			">" +
			path + "." + extension + "</a>";
		str += "</div>"; //end fileNameDiv

		str += "</td></tr></table>";
		str += "</center>";
		str += "</div>"; //end file name div

		str += DesktopContent.htmlClearDiv();

		//last modified div
		str += "<div class='textEditorLastSave' id='textEditorLastSave" +
			forPrimary + "'>Unmodified</div>";

		str += DesktopContent.htmlClearDiv();
		//outline div
		str += "<div class='textEditorOutline' id='textEditorOutline" +
			forPrimary + "'>Outline:</div>";

		el.innerHTML = str;

		CodeEditor.editor.updateDecorations(forPrimary,forceDisplayComplete);
		CodeEditor.editor.updateFileHistoryDropdowns();

	} //end displayFileHeader()

	//=====================================================================================
	//updateFileSnapshot ~~
	//	handle undo stack and file history stack management
	//		if new, then place in stacks
	//
	//	Note: pass text as object to avoid copy of giant string
	this.updateFileSnapshot = function(forPrimary,textObj /*{text,time}*/, ignoreTimeDelta)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("updateFileSnapshot forPrimary=" + forPrimary);


		var addSnapshot = false;
		//var now = textObj.time;//Date.now() /*milliseconds*/;
		if(_undoStackLatestIndex[forPrimary] != -1)
		{
			//compare with last to see if different
			//	and that it has been 2 seconds
			if((ignoreTimeDelta ||
						2*1000 < textObj.time - _undoStack[forPrimary][_undoStackLatestIndex[forPrimary]][1]) &&
					_undoStack[forPrimary][_undoStackLatestIndex[forPrimary]][0] != textObj.text)
				addSnapshot = true;
		}
		else //else first, so add to stack
			addSnapshot = true;


		if(addSnapshot)
		{ //add to stack
			++_undoStackLatestIndex[forPrimary];
			if(_undoStackLatestIndex[forPrimary] >= _undoStack_MAX_SIZE)
				_undoStackLatestIndex[forPrimary] = 0; //wrap around

			_undoStack[forPrimary][_undoStackLatestIndex[forPrimary]] =
				[textObj.text,
				textObj.time];

			console.log("snapshot added to stack",_undoStack[forPrimary]);


			//	update file history stack to be displayed
			//	in dropdown at filename position
			//	place them in by time, so they are in time order
			//	and in case we want to remove old ones

			_fileHistoryStack[_filePath[forPrimary] + "." +
				_fileExtension[forPrimary]] = [
				textObj.text,
				textObj.time,
				_fileWasModified[forPrimary],
				_fileLastSave[forPrimary]];
			console.log("_fileHistoryStack",_fileHistoryStack);

			CodeEditor.editor.updateFileHistoryDropdowns();
		}

		return addSnapshot;

	} //end updateFileSnapshot()

	//=====================================================================================
	//startUpdateHandling ~~
	//	unify update handling
	this.startUpdateHandling = function(forPrimary)
	{
		_updateHandlerTargetPane[forPrimary] = true; //mark need to update

		window.clearTimeout(_updateTimerHandle);
		_updateTimerHandle = window.setTimeout(
				CodeEditor.editor.updateTimeoutHandler,
				_UPDATE_DECOR_TIMEOUT /*ms*/);

	} //end startUpdateHandling()

	//=====================================================================================
	//stopUpdateHandling ~~
	//	unify update handling
	this.stopUpdateHandling = function(event)
	{
		if(event) event.stopPropagation();
		window.clearTimeout(_updateTimerHandle);
	} //end stopUpdateHandling()

	//=====================================================================================
	//updateTimeoutHandler ~~
	//	unify update handling
	this.updateTimeoutHandler = function()
	{
		if(_updateHandlerTargetPane[0])
		{
			CodeEditor.editor.updateDecorations(0 /*forPrimary*/);
			_updateHandlerTargetPane[0] = false;
		}
		if(_updateHandlerTargetPane[1])
		{
			CodeEditor.editor.updateDecorations(1 /*forPrimary*/);
			_updateHandlerTargetPane[1] = false;
		}
	} //end updateTimeoutHandler()


	//=====================================================================================
	//doubleClickHandler ~~
	this.doubleClickHandler = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("doubleClickHandler forPrimary=" + forPrimary);

		//get character before cursor
		//	if { or }
		//	then highlight entire section

		var el = _eel[forPrimary];
		var cursor = CodeEditor.editor.getCursor(el);

		if(!cursor || cursor.startNodeIndex === undefined)
			return;

		var n = cursor.startNodeIndex;
		var c = el.childNodes[n].textContent[
			cursor.startPos];

		var openCount = 0; //init

		if(c != '{' && c != '}')
		{
			if(cursor.startPos == 0)
			{
				//find character in previous node
				do
				{
					--n;
				} while(n >= 0 && el.childNodes[n].textContent.length);

				if(n < 0) return;
				c = el.childNodes[n].textContent[
					el.childNodes[n].textContent.length-1];
			}
			else
				c = el.childNodes[n].textContent[
					cursor.startPos-1];

			if(c == '{')
				openCount = 1; //already counted the 1
		}

		Debug.log("character before cursor " + c);

		if(c != '{' && c != '}') return;

		var i;
		var found = false;
		var foundDoubleQuote = false;
		var foundSingleQuote = false;
		var foundComment = false;

		if(c == '}')
		{
			//go backwards looking for matching bracket
			cursor.endNodeIndex = -1;
			cursor.endPos = -1;


			//if a comment is found, restore start of line
			//	openCount value

			var openCountSave = openCount; //init
			var prelimFound = false;

			for(n;n>=0; --n)
			{
				node = el.childNodes[n];
				val = node.textContent;
				for(i=(n==cursor.startNodeIndex?cursor.startPos-1:
							val.length-1); i>=0; --i)
				{
					if(cursor.endNodeIndex == -1) //first time take first position
					{
						cursor.endNodeIndex = n;
						cursor.endPos = i;
					}

					if(val[i] == '\n')
					{
						foundSingleQuote = false;
						foundDoubleQuote = false;
						openCountSave = openCount; //save count at start of new line

						if(prelimFound) //if found end
						{
							Debug.log("confirmed found open count match ni " + n + " " + i);
							found = true;
							break;
						}
					}

					if(!foundSingleQuote && val[i] == '"')
						foundDoubleQuote = !foundDoubleQuote;
					else if(!foundDoubleQuote && val[i] == "'")
						foundSingleQuote = !foundSingleQuote;
					else if(val[i]== '/' && i-1 >= 0 &&
							val[i-1] == '/')
					{
						//found comment! invalidate findings in comment
						openCount = openCountSave; //restore count
						if(openCount > 0)
							prelimFound = false; //invalidate end reached

						--i; //skip previous / part of comment indicator
						continue; //do not proceed with command tabbing if in comment
					}

					if(foundDoubleQuote || foundSingleQuote ||
							prelimFound)
						continue; //skip if in quote, or if we think we are done

					if(val[i] == '}')
						++openCount;
					else if(val[i] == '{')
					{
						--openCount;
						if(openCount <= 0)
						{
							prelimFound = true;
							Debug.log("found open count match ni " + n + " " + i);

							//do NOT break right away, in case we are in a comment, to be
							//break;
						}
					}
					//take second to last position as start
					cursor.startNodeIndex = n;
					cursor.startPos = i;
				}

				if(found) break;
			} // end matching bracket search loop

		} //done handling } case
		else // c == '{'
		{
			//go forwards looking for matching bracket

			i = cursor.startPos;
			for(n=cursor.startNodeIndex;n<el.childNodes.length; ++n)
			{
				node = el.childNodes[n];
				val = node.textContent;

				for(; i<val.length; ++i)
				{
					if(val[i] == '\n')
					{
						foundSingleQuote = false;
						foundDoubleQuote = false;
						foundComment = false;
					}

					if(foundComment)
						continue;

					if(!foundSingleQuote && val[i] == '"')
						foundDoubleQuote = !foundDoubleQuote;
					else if(!foundDoubleQuote && val[i] == "'")
						foundSingleQuote = !foundSingleQuote;
					else if(val[i]== '/' && i+1 < val.length &&
							val[i+1] == '/')
					{
						foundComment = true;
						continue; //do not proceed with command tabbing if in comment
					}

					if(foundDoubleQuote || foundSingleQuote)
						continue; //skip if in quote

					if(val[i] == '{')
						++openCount;
					else if(val[i] == '}')
					{
						--openCount;
						if(openCount <= 0)
						{
							found = true;
							Debug.log("found open count match ni " + n + " " + i);
							break;
						}
					}
					//take second to last position as end
					cursor.endNodeIndex = n;
					cursor.endPos = i;
				}

				if(found) break;

				i = 0; //reset

			} // end matching bracket search loop
		} //done handling { case

		//set cursor selection
		CodeEditor.editor.setCursor(el,cursor);

	} //end doubleClickHandler()


	//=====================================================================================
	//download ~~
	this.download = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("download forPrimary=" + forPrimary);

		var dataStr = "data:text/plain;charset=utf-8," +
				encodeURIComponent(_eel[forPrimary].textContent);

		var filename = _filePath[forPrimary];
		var i = filename.lastIndexOf('/');
		if(i >= 0)
			filename = filename.substr(i+1); //only keep file name, discard path
		filename += "." + _fileExtension[forPrimary];

		Debug.log("Downloading to filename " + filename);

		var link = document.createElement("a");
		link.setAttribute("href", dataStr); //double encode, so encoding remains in CSV
		link.setAttribute("style", "display:none");
		link.setAttribute("download", filename);
		document.body.appendChild(link); // Required for FF

		link.click(); // This will download the data file named "my_data.csv"

		link.parentNode.removeChild(link);

	} //end download()

	//=====================================================================================
	//upload ~~
	this.upload = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("upload forPrimary=" + forPrimary);

		_fileUploadString = ""; //clear upload string

		var str = "";

		var el = document.getElementById("popUpDialog");
		if(!el)
		{
			el = document.createElement("div");
			el.setAttribute("id", "popUpDialog");
		}
		el.style.display = "none";

		//set position and size
		var w = 400;
		var h = 205;
		DesktopContent.setPopUpPosition(el,w /*w*/,h /*h*/);

		var str = "<a id='" +
				"popUpDialog" + //clear upload string on cancel!
				"-header' onclick='var el = document.getElementById(" +
				"\"popUpDialog\"); if(el) el.parentNode.removeChild(el); return false;'>Cancel</a><br><br>";

		str += "<div id='popUpDialog-div'>";

		str += "Please choose the file to upload which has the text content to place in the open source file:<br><br>" +
				_filePath[forPrimary] + "." + _fileExtension[forPrimary] +
				"<br><br>";

		str += "<center>";

		str += "<input type='file' id='popUpDialog-fileUpload' " +
				"accept='";
		for(var i=0;i<_ALLOWED_FILE_EXTENSIONS.length;++i)
			str += (i?", ":"") + "." + _ALLOWED_FILE_EXTENSIONS[i];
		str += "' enctype='multipart/form-data' />";
		str += "<br><br>";

		var onmouseupJS = "";
		onmouseupJS += "document.getElementById(\"popUpDialog-submitButton\").disabled = true;";
		onmouseupJS += "CodeEditor.editor.uploadTextFromFile(" + forPrimary + ");";

		str += "<input id='popUpDialog-submitButton' disabled type='button' onmouseup='" +
				onmouseupJS + "' " +
				"value='Upload File' title='" +
				"Upload the chosen file text content to\n" +
				_filePath[forPrimary] + "." + _fileExtension[forPrimary] +
				"'/>";

		el.innerHTML = str;
		document.body.appendChild(el); //add element to display div
		el.style.display = "block";

		document.getElementById('popUpDialog-fileUpload').addEventListener(
				'change', function(evt) {
			var files = evt.target.files;
			var file = files[0];
			var reader = new FileReader();
			reader.onload = function() {
				//store uploaded file and enable button
				_fileUploadString = this.result;
				Debug.log("_fileUploadString = " + _fileUploadString);
				document.getElementById('popUpDialog-submitButton').disabled = false;

				if(_STAND_ALONE)
				{
					var i=file.name.lastIndexOf('.');
					_filePath[forPrimary] = file.name.substr(0,i);
					_fileExtension[forPrimary] = file.name.substr(i+1);
				}
			}
			reader.readAsText(file);
		}, false);
	} //end upload()

	//=====================================================================================
	//uploadTextFromFile ~~
	this.uploadTextFromFile = function(forPrimary)
	{
		forPrimary = forPrimary?1:0;

		Debug.log("uploadTextFromFile forPrimary=" + forPrimary);

		//enable button so can retry if failure
		document.getElementById('popUpDialog-submitButton').disabled = false;

		Debug.log("uploadTextFromFile _fileUploadString = " + _fileUploadString);


		//do decor in timeout to show loading
		DesktopContent.showLoading(function()
				{
			try
			{
				//replace weird space characters (e.g. from emacs tab character two &#160's)
				//	with spaces
				_fileUploadString = _fileUploadString.replace(new RegExp(
						String.fromCharCode(160),'g'),' ');

				var el = _eel[forPrimary];
				el.textContent = _fileUploadString;
				CodeEditor.editor.displayFileHeader(forPrimary);
			}
			catch(e)
			{
				Debug.log("There was an error uploading the text:[" + DesktopContent.getExceptionLineNumber(e) + "]: " + e,
						Debug.HIGH_PRIORITY);
				return;
			}
			Debug.log("Source upload complete! (You can use undo to go back) ",
					Debug.INFO_PRIORITY);

			//on succes remove popup
			var el = document.getElementById("popUpDialog");
			if(el) el.parentNode.removeChild(el);

				});	 //end show loading

	} //end uploadTextFromFile()

} //end create() CodeEditor instance
