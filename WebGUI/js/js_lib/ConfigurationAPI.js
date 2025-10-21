//=====================================================================================
//
//	Created April, 2017
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	ConfigurationAPI.js
//
//  Requirements:
//   1. paste the following:
//
//				<script type="text/JavaScript" src="/WebPath/js/Globals.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/Debug.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/DesktopContent.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/js_lib/ConfigurationAPI.js"></script>
//				<link rel="stylesheet" type="text/css" href="/WebPath/css/ConfigurationAPI.css">
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
// Example usage: 	/WebPath/html/ConfigurationGUI.html
//					/WebPath/html/ConfigurationGUI_subset.html
//
//=====================================================================================

var ConfigurationAPI = ConfigurationAPI || {}; //define ConfigurationAPI namespace

if (typeof Debug == 'undefined')
	alert('ERROR: Debug is undefined! Must include Debug.js before ConfigurationAPI.js');
if (typeof Globals == 'undefined')
	alert('ERROR: Globals is undefined! Must include Globals.js before ConfigurationAPI.js');
if (typeof DesktopContent == 'undefined' &&
		typeof Desktop == 'undefined')
	alert('ERROR: DesktopContent is undefined! Must include DesktopContent.js before ConfigurationAPI.js');


//"public" function list:
//	ConfigurationAPI.init()
//	ConfigurationAPI.getDateString(date)
//	ConfigurationAPI.getActiveGroups(responseHandler)
//	ConfigurationAPI.getAliasesAndGroups(responseHandler,optionForNoAliases,optionForNoGroups)
// 	ConfigurationAPI.getSubsetRecords(subsetBasePath,filterList,responseHandler,modifiedTables)
//	ConfigurationAPI.getFieldsOfRecords(subsetBasePath,recordArr,fieldList,maxDepth,responseHandler,modifiedTables)
//	ConfigurationAPI.getFieldValuesForRecords(subsetBasePath,recordArr,fieldObjArr,responseHandler,modifiedTables,silenceErrors)
// 	ConfigurationAPI.getUniqueFieldValuesForRecords(subsetBasePath,recordArr,fieldList,responseHandler,modifiedTables)
//	ConfigurationAPI.setFieldValuesForRecords(subsetBasePath,recordArr,fieldObjArr,valueArr,responseHandler,modifiedTablesIn,silenceErrors)	)
//	ConfigurationAPI.popUpSaveModifiedTablesForm(modifiedTables,responseHandler)
//	ConfigurationAPI.saveModifiedTables(modifiedTables,responseHandler,doNotIgnoreWarnings,doNotSaveAffectedGroups,doNotActivateAffectedGroups,doNotSaveAliases,doNotIgnoreGroupActivationWarnings,doNotKillPopUpEl,tablesToAdd)
//	ConfigurationAPI.bitMapDialog(bitMapParams,initBitMapValue,okHandler,cancelHandler)
//	ConfigurationAPI.createEditableFieldElement(fieldObj,fieldIndex,depthIndex /*optional*/)
//	ConfigurationAPI.getEditableFieldValue(fieldObj,fieldIndex,depthIndex /*optional*/)
//	ConfigurationAPI.setEditableFieldValue(fieldObj,value,fieldIndex,depthIndex /*optional*/)
//	ConfigurationAPI.getSelectedEditableFieldIndex()
// 	ConfigurationAPI.addSubsetRecords(subsetBasePath,recordArr,responseHandler,modifiedTablesIn,silenceErrors)
// 	ConfigurationAPI.deleteSubsetRecords(subsetBasePath,recordArr,responseHandler,modifiedTablesIn,silenceErrors)
// 	ConfigurationAPI.renameSubsetRecords(subsetBasePath,recordArr,newRecordArr,responseHandler,modifiedTablesIn,silenceErrors)
// 	ConfigurationAPI.copySubsetRecords(subsetBasePath,recordArr,numberOfCopies,responseHandler,modifiedTablesIn,silenceErrors)
//	ConfigurationAPI.addTableToConfigurationGroup(tableName)
// 	ConfigurationAPI.getStructureStatus(rootTableOfStructure,responseHandler,modifiedTables)

//"public" helpers:
//	ConfigurationAPI.setCaretPosition(elem, caretPos, endPos)
//	ConfigurationAPI.removeAllPopUps()
//	ConfigurationAPI.setPopUpPosition(el,w,h,padding,border,margin,doNotResize,offsetUp)
//	ConfigurationAPI.addClass(elem,class)
//	ConfigurationAPI.removeClass(elem,class)
//	ConfigurationAPI.hasClass(elem,class)
//	ConfigurationAPI.extractActiveGroups(req)
//	ConfigurationAPI.incrementName(name)
//	ConfigurationAPI.createNewRecordName(startingName,existingArr)
//	ConfigurationAPI.createTableColumnHeaderHTML(colType,colDataType,colDefaultValue,colMinValue,colMaxValue)
//	ConfigurationAPI.encodeHTML(s)


//"public" members:
ConfigurationAPI._activeGroups = {}; //to fill, call ConfigurationAPI.getActiveGroups() or ConfigurationAPI.extractActiveGroups()
ConfigurationAPI._activeTables = {}; //to fill, call ConfigurationAPI.getFieldsOfRecords() among others

ConfigurationAPI._configUsername = "";  //to fill, call ConfigurationAPI.getActiveGroups() or ConfigurationAPI.extractActiveGroups()
ConfigurationAPI._versionTracking = "ON";  //to fill, call ConfigurationAPI.getActiveGroups() or ConfigurationAPI.extractActiveGroups()

ConfigurationAPI._contextMemberNames 	= [];
ConfigurationAPI._backboneMemberNames 	= [];
ConfigurationAPI._iterateMemberNames 	= [];

//"public" constants:
ConfigurationAPI._DEFAULT = "DEFAULT";
ConfigurationAPI._DEFAULT_COMMENT = "No comment.";
ConfigurationAPI._POP_UP_DIALOG_ID = "ConfigurationAPI-popUpDialog";


ConfigurationAPI._STRING_TYPE 	= "STRING";
ConfigurationAPI._NUMBER_TYPE 	= "NUMBER";
ConfigurationAPI._DATE_TYPE 	= "TIMESTAMP WITH TIMEZONE";

ConfigurationAPI._BOOL_DATA_TYPE 				= "Bool";
ConfigurationAPI._BOOL_YES_NO_DATA_TYPE 		= "YesNo";
ConfigurationAPI._BOOL_TRUE_FALSE_DATA_TYPE 	= "TrueFalse";
ConfigurationAPI._BOOL_ON_OFF_DATA_TYPE 		= "OnOff";
ConfigurationAPI._FIXED_CHOICE_DATA_TYPE 		= "FixedChoiceData";
ConfigurationAPI._LINK_FIXED_CHOICE_DATA_TYPE 	= "ChildLinkFixedChoice";
ConfigurationAPI._BITMAP_DATA_TYPE 				= "BitMap";

ConfigurationAPI._DATATYPE_LINK_DEFAULT			= "NO_LINK";

//"private" function list:
//	ConfigurationAPI.handleGroupCommentToggle(groupName,setHideVal)
//	ConfigurationAPI.handlePopUpHeightToggle(h,gh)
//	ConfigurationAPI.handlePopUpAliasEditToggle(i)
//	ConfigurationAPI.activateGroup(groupName,groupKey,ignoreWarnings,doneHandler)
//	ConfigurationAPI.setGroupAliasInActiveBackbone(groupAlias,groupName,groupKey,newBackboneNameAdd,doneHandler,doReturnParams)
//	ConfigurationAPI.setTableAliasInActiveBackbone(tableAlias,tableName,version,newBackboneNameAdd,doneHandler,doReturnParams)
//	ConfigurationAPI.newWizBackboneMemberHandler(req,params)
//	ConfigurationAPI.saveGroupAndActivate(groupName,tableMap,doneHandler,doReturnParams)
//	ConfigurationAPI.getOnePixelPngData(rgba)
//	ConfigurationAPI.getGroupTypeMemberNames(groupType,responseHandler)
//	ConfigurationAPI.getTree(treeBasePath,depth,modifiedTables,responseHandler,responseHandlerParam)
//	ConfigurationAPI.getTreeChildren(tree,pathToChildren)
//	ConfigurationAPI.getTreeRecordLinks(node)
//	ConfigurationAPI.getTreeRecordName(node)
//	ConfigurationAPI.getTreeLinkChildren(link)
//	ConfigurationAPI.getTreeLinkTable(link)

//
//		for Editable Fields
//	ConfigurationAPI.handleEditableFieldClick(depth,uid,editClick,type)
//	ConfigurationAPI.handleEditableFieldHover(depth,uid,event)
//	ConfigurationAPI.handleEditableFieldBodyMouseMove(event)
//	ConfigurationAPI.handleEditableFieldEditOK()
//	ConfigurationAPI.handleEditableFieldEditCancel()
//	ConfigurationAPI.handleEditableFieldKeyDown(event,keyEl)
//	ConfigurationAPI.fillEditableFieldElement(fieldEl,uid,depth,nodeName,value,valueType,choices,path,isGroupLink,childLinkIndex,linkId)

//"private" constants:
ConfigurationAPI._VERSION_ALIAS_PREPEND = "ALIAS:";
ConfigurationAPI._SCRATCH_VERSION = 2147483647;
ConfigurationAPI._SCRATCH_ALIAS = "Scratch";

ConfigurationAPI._OK_CANCEL_DIALOG_STR = "";
ConfigurationAPI._OK_CANCEL_DIALOG_STR += "<div title='' style='padding:5px;background-color:#eeeeee;border:1px solid #555555;position:relative;z-index:2000;" + //node the expander nodes in tree-view are z-index:1000
				"width:95px;height:20px;margin:0 -122px -64px 10px; font-size: 16px; white-space:nowrap; text-align:center;'>";
ConfigurationAPI._OK_CANCEL_DIALOG_STR += "<a class='popUpOkCancel' onclick='javascript:ConfigurationAPI.handleEditableFieldEditOK(); event.stopPropagation();' onmouseup='event.stopPropagation();' title='Accept Changes' style='color:green'>" +
				"<b style='color:green;font-size: 16px;'>OK</b></a> | " +
				"<a class='popUpOkCancel' onclick='javascript:ConfigurationAPI.handleEditableFieldEditCancel(); event.stopPropagation();' onmouseup='event.stopPropagation();' title='Discard Changes' style='color:red'>" +
				"<b style='color:red;font-size: 16px;'>Cancel</b></a>";
ConfigurationAPI._OK_CANCEL_DIALOG_STR += "</div>";

//=====================================================================================
//init ~~
ConfigurationAPI.init = function()
{
	//get context, backbone, and iterate member list
	DesktopContent.XMLHttpRequest("Request?RequestType=getContextMemberNames", "",
		function (req) {
			var memberNames = req.responseXML.getElementsByTagName("ContextMember");
			ConfigurationAPI._contextMemberNames = []; //reset
			for (var i = 0; i < memberNames.length; ++i)
				ConfigurationAPI._contextMemberNames[i] = memberNames[i].getAttribute("value");
			Debug.log("ConfigurationAPI._contextMemberNames =",ConfigurationAPI._contextMemberNames);
			if (ConfigurationAPI._contextMemberNames.length == 0)
				Debug.log("Empty context member list found!", Debug.HIGH_PRIORITY);
		}); //end request handler

	DesktopContent.XMLHttpRequest("Request?RequestType=getBackboneMemberNames", "",
		function (req) {
			var memberNames = req.responseXML.getElementsByTagName("BackboneMember");
			ConfigurationAPI._backboneMemberNames = []; //reset
			for (var i = 0; i < memberNames.length; ++i)
				ConfigurationAPI._backboneMemberNames[i] = memberNames[i].getAttribute("value");
			Debug.log("ConfigurationAPI._backboneMemberNames =",ConfigurationAPI._backboneMemberNames);
			if (ConfigurationAPI._backboneMemberNames.length == 0)
				Debug.log("Empty backbone member list found!", Debug.HIGH_PRIORITY);
		}); //end request handler

	DesktopContent.XMLHttpRequest("Request?RequestType=getIterateMemberNames", "",
		function (req) {
			var memberNames = req.responseXML.getElementsByTagName("IterateMember");
			ConfigurationAPI._iterateMemberNames = []; //reset
			for (var i = 0; i < memberNames.length; ++i)
				ConfigurationAPI._iterateMemberNames[i] = memberNames[i].getAttribute("value");
			Debug.log("ConfigurationAPI._iterateMemberNames =",ConfigurationAPI._iterateMemberNames);
			if (ConfigurationAPI._iterateMemberNames.length == 0)
				Debug.log("Empty iterate member list found!", Debug.HIGH_PRIORITY);
		}); //end request handler
} //end ConfigurationAPI.init()

//=====================================================================================
//getActiveGroups ~~
//	get currently active groups
//
//	when complete, the responseHandler is called with an object parameter.
//		on failure, the object will be empty.
//		on success, the object of Active Groups
//		Group := {}
//			obj.<groupType> = {}
//			obj.<groupType>.groupName
//			obj.<groupType>.groupKey
//
//		<groupType> = Context, Backbone, Iterate, or Configuration
//
ConfigurationAPI.getActiveGroups = function(responseHandler)
{
	if(ConfigurationAPI._contextMemberNames.length == 0)
	{
		Debug.log("Identified ConfigurationAPI was not initialized... calling init");
		ConfigurationAPI.init();
	}

	//get active configuration group
	DesktopContent.XMLHttpRequest("Request?RequestType=getActiveTableGroups",
			"", function(req)
			{
		responseHandler(ConfigurationAPI.extractActiveGroups(req));
			},
			0,0,true  //reqParam, progressHandler, callHandlerOnErr
	); //end of getActiveTableGroups handler
}
ConfigurationAPI.extractActiveGroups = function(req)
{
	//can call this at almost all API handlers
	try
	{
		var activeConfigGroups = [
			DesktopContent.getXMLValue(req,"Context-ActiveGroupName"),
			DesktopContent.getXMLValue(req,"Context-ActiveGroupKey"),
			DesktopContent.getXMLValue(req,"Backbone-ActiveGroupName"),
			DesktopContent.getXMLValue(req,"Backbone-ActiveGroupKey"),
			DesktopContent.getXMLValue(req,"Iterate-ActiveGroupName"),
			DesktopContent.getXMLValue(req,"Iterate-ActiveGroupKey"),
			DesktopContent.getXMLValue(req,"Configuration-ActiveGroupName"),
			DesktopContent.getXMLValue(req,"Configuration-ActiveGroupKey")];
		var i=0;
		var retObj = {};
		retObj.Context = {};
		retObj.Context.groupName = activeConfigGroups[i++];
		retObj.Context.groupKey = activeConfigGroups[i++];
		retObj.Backbone = {};
		retObj.Backbone.groupName = activeConfigGroups[i++];
		retObj.Backbone.groupKey = activeConfigGroups[i++];
		retObj.Iterate = {};
		retObj.Iterate.groupName = activeConfigGroups[i++];
		retObj.Iterate.groupKey = activeConfigGroups[i++];
		retObj.Configuration = {};
		retObj.Configuration.groupName = activeConfigGroups[i++];
		retObj.Configuration.groupKey = activeConfigGroups[i++];
	}
	catch(e)
	{
		Debug.log("Error extracting active groups: " + e);
		return undefined;
	}

	//do not modify global system setting readback if req failed
	if(!req) return retObj;

	ConfigurationAPI._activeGroups = {};
	ConfigurationAPI._activeGroups = retObj;

	ConfigurationAPI._configUsername = DesktopContent.getXMLValue(req,"configUsername");
	ConfigurationAPI._versionTracking = DesktopContent.getXMLValue(req,"versionTracking");

	return retObj;
} // end extractActiveGroups()

//=====================================================================================
//getVersionAliases
//
// when complete, the responseHandler is called with an object parameter.
//  of the form req.TABLENAME = []
//  with a lit of {version: VERSION, alias: ALIAS} objects
//  so an example would be:
//  { DataBufferTable : [ {version : '1' alias : 'Default'} ]}
//
ConfigurationAPI.getVersionAliases = function(responseHandler)
{
	//get aliases
	DesktopContent.XMLHttpRequest("Request?RequestType=getVersionAliases" +
		"", //end get data
		"", //end post data
		function(req)
		{
			let tableNames = req.responseXML.getElementsByTagName("TableName");
			let tableVersions = req.responseXML.getElementsByTagName("Version");
			let versionAlias = req.responseXML.getElementsByTagName("VersionAlias");

			var retObj = {};
			console.log(req.responseXML);
			console.log(tableNames);
			for(var i=0;i<tableNames.length;++i)
			{
				let name = tableNames[i].getAttribute('value');
				if(!retObj[name])
					retObj[name] = [];

				retObj[name].push({
					version:tableVersions[i].getAttribute('value'),
					alais:versionAlias[i].getAttribute('value')
				});
			}
			responseHandler(retObj);
			console.log(retObj);
		});
} //end getVersionAliases()

//=====================================================================================
//getAliasesAndGroups ~~
//	get system aliases, existing groups (w/ currently active groups)
//
//	when complete, the responseHandler is called with an object parameter.
//		on failure, the object will be empty.
//		on success, the object of Active Groups
//		Group := {}
//			obj.activeGroups = {}
//				obj.activeGroups.<groupType> = {}
//				obj.activeGroups.<groupType>.groupName
//				obj.activeGroups.<groupType>.groupKey
//			obj.groups = {}
//				obj.groups.<groupType> = {}
//					obj.groups.<groupType>.<groupName> = {}
//						obj.groups.<groupType>.<groupName>.keys = [latestKey, key, ...]
//						obj.groups.<groupType>.<groupName>.groupComment
//			obj.aliases = {}
//				obj.aliases.<groupType> = [ aliasObj,... ]
//					aliasObj = {}
//					aliasObj.alias
//					aliasObj.name
//					aliasObj.key
//					aliasObj.groupComment
//					aliasObj.groupType
//					aliasObj.aliasComment
//
//		<groupType> = Context, Backbone, Iterate, or Configuration
//
ConfigurationAPI.getAliasesAndGroups = function(responseHandler,optionForNoAliases,
		optionForNoGroups)
{
	var retObj = {};
	var reqCount = 0;

	//get aliases
	if(!optionForNoAliases)
		DesktopContent.XMLHttpRequest("Request?RequestType=getGroupAliases" +
				"", //end get data
				"", //end post data
				function(req)
				{

			Debug.log("getGroupAliases handler");

			var groupAliases = 	req.responseXML.getElementsByTagName("GroupAlias");
			var groupNames = 	req.responseXML.getElementsByTagName("GroupName");
			var groupKeys = 	req.responseXML.getElementsByTagName("GroupKey");
			var groupComments = req.responseXML.getElementsByTagName("GroupComment");
			var groupTypes = 	req.responseXML.getElementsByTagName("GroupType");
			var aliasComments = req.responseXML.getElementsByTagName("AliasComment");

			retObj.aliases = {};
			var type;

			for(var i=0;i<groupAliases.length;++i)
			{
				type = groupTypes[i].getAttribute('value');

				if(type == "") continue;

				if(!retObj.aliases[type])
					retObj.aliases[type] = []; //create array

				retObj.aliases[type].push({
						"alias" : 			groupAliases[i].getAttribute('value'),
						"name" : 			groupNames[i].getAttribute('value'),
						"key" : 			groupKeys[i].getAttribute('value'),
						"groupComment" : 	groupComments[i].getAttribute('value'),
						"groupComment" : 	groupTypes[i].getAttribute('value'),
						"aliasComment" : 	aliasComments[i].getAttribute('value')
				});
			}

			++reqCount;

			if(reqCount == 2 ||
					(reqCount == 1 && optionForNoGroups))
			{
				//done!
				console.log("getAliasesAndGroups retObj ",retObj);
				responseHandler(retObj);
			}

				}, //end getGroupAliases handler
				0, //handler param
				0,true, //progressHandler, callHandlerOnErr
				); //end get aliases


	//get aliases
	if(!optionForNoGroups)
		DesktopContent.XMLHttpRequest("Request?RequestType=getTableGroups"
				+"&doNotReturnMembers=1", //end get data
				"", //end post data
				function(req)
				{
		Debug.log("getTableGroups handler");

		retObj.activeGroups = {}; //clear
		retObj.activeGroups = ConfigurationAPI.extractActiveGroups(req);

		var groupNames = req.responseXML.getElementsByTagName("TableGroupName");
		var groupKeys = req.responseXML.getElementsByTagName("TableGroupKey");
		var groupTypes = req.responseXML.getElementsByTagName("TableGroupType");
		var groupComments = req.responseXML.getElementsByTagName("TableGroupComment");

		retObj.groups = {}; //clear

		var type, name;
		for(var i=0;i<groupNames.length;++i)
		{
			type = groupTypes[i].getAttribute('value');

			if(type == "") continue;

			//			obj.groups = {}
			//				obj.groups.<groupType> = {}
			//					obj.groups.<groupType>.<groupName> = {}
			//						obj.groups.<groupType>.<groupName>.keys = [latestKey, key, ...]
			//						obj.groups.<groupType>.<groupName>.groupComment

			if(!retObj.groups[type])
				retObj.groups[type] = {}; //create first of type

			name = groupNames[i].getAttribute('value');
			if(!retObj.groups[type][name])
			{
				retObj.groups[type][name] = {}; //create first of group name
				//set group comment the first time
				retObj.groups[type][name].groupComment = groupComments[i].getAttribute('value');
				retObj.groups[type][name].keys = []; //create empty keys array
			}
			//add key
			retObj.groups[type][name].keys.push(groupKeys[i].getAttribute('value'));
		}

		++reqCount;

		if(reqCount == 2 ||
				(reqCount == 1 && optionForNoAliases))
		{
			//done!
			console.log("getAliasesAndGroups retObj ",retObj);
			responseHandler(retObj);
		}
				}, //handler
				0, //handler param
				0,true); //progressHandler, callHandlerOnErr

} // end getAliasesAndGroups


//=====================================================================================
//getStructureStatus ~~
ConfigurationAPI.getStructureStatus = function(rootTableOfStructure,responseHandler,modifiedTables)
{
	Debug.log("ConfigurationAPI.getStructureStatus()", rootTableOfStructure);

	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}

	DesktopContent.XMLHttpRequest("Request?RequestType=getTableStructureStatusAsJSON" +
			"&tableGroup=" +
			"&tableGroupKey=-1" +
			"&tableName=" + rootTableOfStructure, //end get data
			"modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
				if(errStr)
				{
					Debug.log(errStr,Debug.HIGH_PRIORITY);
					if(responseHandler) responseHandler();
					return;
				}
				ConfigurationAPI.extractActiveGroups(req);

				var err = DesktopContent.getXMLValue(req,"Error");
				if(err)
				{
					Debug.log(err,Debug.HIGH_PRIORITY);
					if(responseHandler) responseHandler();
					return;
				}

				var json = DesktopContent.getXMLValue(req,"StructureStatusAsJSON");
				if(responseHandler) responseHandler(json);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr

} // end getStructureStatus

//=====================================================================================
//getSubsetRecords ~~
//	takes as input a base path where the desired records are,
//	  and a filter list.
//
// <filterList>
//	filterList := relative-to-record-path=value(,value,...);path=value... filtering
//		records with relative path not meeting all filter criteria
//		- can accept multiple values per field (values separated by commas) (i.e. OR)
//		- fields/value pairs separated by ; for AND
//			- Note: limitation here is there is no OR among fields/value pairs (in future, could separate field/value pairs by : for OR)
//		e.g. "LinkToFETypeConfiguration=NIMPlus,TemplateUDP;FEInterfacePluginName=NIMPlusPlugin"
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of records (their UIDs)
//			from the subset that match the filter list
//
ConfigurationAPI.getSubsetRecords = function(subsetBasePath,
		filterList,responseHandler,modifiedTables)
{
	Debug.log("ConfigurationAPI.getSubsetRecords()");

	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}
	if(filterList === undefined) filterList = "";

	DesktopContent.XMLHttpRequest("Request?RequestType=getTreeView" +
			"&tableGroup=" +
			"&tableGroupKey=-1" +
			"&hideStatusFalse=0" +
			"&depth=1", //end get data
			"startPath=/" + subsetBasePath +
			"&filterList=" + filterList +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		ConfigurationAPI.extractActiveGroups(req);

		var records = [];
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			Debug.err(err);
			if(responseHandler) responseHandler(records);
			return;
		}
		if(errStr)
		{
			Debug.err(errStr);
			if(responseHandler) responseHandler(records);
			return;
		}

		//console.log(req);

		var tree = DesktopContent.getXMLNode(req,"tree");
		var nodes = tree.children;
		for(var i=0;i<nodes.length;++i)
			records.push(nodes[i].getAttribute("value"));
		Debug.log("Records: " + records);
		if(responseHandler) responseHandler(records);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr
} //end getSubsetRecords()

//=====================================================================================
//getTree ~~
//	returns the currently active xml tree object specified by treeBasePath and depth
//		considering the modifiedTables.
//
//	on failure, calls response handler with undefined parameter
//
//	responseHandler is called with extra responseHandlerParam (to indicate source, e.g.)
ConfigurationAPI.getTree = function(treeBasePath,depth,modifiedTables,
		responseHandler,responseHandlerParam)
{
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}

	treeBasePath = treeBasePath.trim();
	if(treeBasePath == "/") treeBasePath = ""; //server does not like // for root

	DesktopContent.XMLHttpRequest("Request?RequestType=getTreeView" +
			"&tableGroup=" +
			"&tableGroupKey=-1" +
			"&hideStatusFalse=0" +
			"&depth=" + depth, //end get data
			"startPath=/" + treeBasePath +
			"&filterList=" + "" +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			if(responseHandler) responseHandler(undefined,responseHandlerParam);
			return;
		}
		if(errStr)
		{
			Debug.err(errStr);
			if(responseHandler) responseHandler(undefined,responseHandlerParam)
			return;
		}

		//console.log(req);

		//					var nodes = tree.children;
		//					for(var i=0;i<nodes.length;++i)
		//						if(nodeChildren[0].nodeName != "value")
		//							records.push(nodes[i].getAttribute("value"));
		//						else if(nodeChildren[j].nodeName == "node")
		//							child.push(nodes[i].getAttribute("value"));
		//
		//					Debug.log("Records: " + records);
		if(responseHandler) responseHandler(
				DesktopContent.getXMLNode(req,"tree"),
				responseHandlerParam);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr
} // end getTree()


//=====================================================================================
//getTreeChildren ~~
//	returns an array of children nodes at pathToChildren starting at root of tree (xml object).
//
ConfigurationAPI.getTreeChildren = function(tree,pathToChildren)
{
	var pathArr = pathToChildren?pathToChildren.split('/'):"";
	var children;
	var found;

	children = tree.children;

	//look through path elements and for all nodes
	for(var i=0;i<pathArr.length;++i)
	{
		if(pathArr[i].trim().length == 0) continue; //skip empty path segments

		Debug.log(i + ": " + pathArr[i]);

		found = false;
		for(var j=0;j<children.length;++j)
			if(children[j].getAttribute("value") == pathArr[i])
			{
				found = true;
				//new tree
				children = children[j].children;
				Debug.log("found " + pathArr[i]);
				break;
			}

		if(!found)
		{
			Debug.log("Invalid path '" + pathToChildren + "' through tree! How did you get here? Notify admins.", Debug.HIGH_PRIORITY);
			return undefined;
		}
	}

	//result is all children, but we just want nodes

	var retArr = [];
	for(var i=0;i<children.length;++i)
		if(children[i].nodeName == "node")
			retArr.push(children[i]);

	return retArr;

} //end getTreeChildren

//=====================================================================================
//getTreeRecordLinks ~~
//	returns an array of links within a record node
//
ConfigurationAPI.getTreeRecordLinks = function(node)
{
	var children = node.children;
	var retArr = [];
	var subchildren;

	//for each child, check if link
	for(var i=0;i<children.length;++i)
	{
		if(children[i].nodeName != "node") continue;

		subchildren = children[i].children;

		for(var j=0;j<subchildren.length;++j)
		{
			if(subchildren[j].nodeName == "LinkTableName")
			{
				retArr.push(children[i]);
				break;
			}
		}
	}

	return retArr;
} //end getTreeRecordLinks


//=====================================================================================
//getTreeRecordName ~~
//	returns name of a record node
//
ConfigurationAPI.getTreeRecordName = function(node)
{
	//if is UID link then give UID as name
	//	assume its in first two children
	var children = node.children;
	if(children.length > 2)
	{
		if(children[0].nodeName == "valueType" &&
				children[0].getAttribute("value") == "Disconnected")
			throw("Disconnected link!");

		if(children[0].nodeName == "UID")
			return children[0].getAttribute("value");

		if(children[1].nodeName == "UID")
			return children[0].getAttribute("value");
	}

	return node.getAttribute("value");
}  //end getTreeRecordName

//=====================================================================================
//getTreeLinkChildren ~~
//	returns an array of child nodes connected through the link
//
ConfigurationAPI.getTreeLinkChildren = function(link)
{
	var children = link.children;
	var retArr = [];

	for(var i=0;i<children.length;++i)
	{
		if(children[i].nodeName == "UID")
		{
			retArr.push(link);
			break; //done since UID link
		}
		else if(children[i].nodeName == "node")
			retArr.push(children[i]);
	}

	return retArr;
} //end getTreeLinkChildren

//=====================================================================================
//getTreeLinkTable ~~
//	returns the name of the table connected through the link
//
ConfigurationAPI.getTreeLinkTable = function(link)
{
	var children = link.children;
	for(var i=0;i<children.length;++i)
		if(children[i].nodeName == "LinkTableName")
			return children[i].getAttribute("value");
	throw("Table name not found!");
} //end getTreeLinkTable

//=====================================================================================
//getFieldsOfRecords ~~
//	takes as input a base path where the records are,
//	  and an array of records.
// <recordArr> is an array or record UIDs (as returned from
//		ConfigurationAPI.getSubsetRecords)
// <fieldList> is a CSV list of tree paths relative to <subsetBasePath>
//	 to the allowed fields. If empty, then all available fields are allowed.
//		e.g. "LinkToFETypeConfiguration,FEInterfacePluginName"
//		:= CSV of relative-to-record-path to filter common fields
//		(accept or reject [use ! as first character to reject])
//		[use leading*  to ignore relative path - note that only leading and trailing wildcards work]
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
// 	maxDepth is used to force an end to search for common fields
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of Field objects
//		Field := {}
//			obj.fieldTableName
//			obj.fieldUID
//			obj.fieldColumnName
//			obj.fieldRelativePath
//			obj.fieldColumnType
//			obj.fieldColumnDataType
//			obj.fieldColumnDataChoicesArr[]
//			obj.fieldColumnDefaultValue
//
//
ConfigurationAPI.getFieldsOfRecords = function(subsetBasePath,recordArr,fieldList,
		maxDepth,responseHandler,modifiedTables)
{
	Debug.log("ConfigurationAPI.getFieldsOfRecords()");

	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}

	var recordListStr = "";
	if(Array.isArray(recordArr))
		for(var i=0;i<recordArr.length;++i)
		{
			if(i) recordListStr += ",";
			recordListStr += encodeURIComponent(recordArr[i]);
		}
	else //handle single record case
		recordListStr = encodeURIComponent(recordArr);

	subsetBasePath = subsetBasePath.trim();
	if(subsetBasePath == "/") subsetBasePath = "";

	DesktopContent.XMLHttpRequest("Request?RequestType=getTreeNodeCommonFields" +
			"&tableGroup=" +
			"&tableGroupKey=-1" +
			"&depth=" + (maxDepth|0), //end get data
			"startPath=/" + subsetBasePath +
			"&recordList=" + recordListStr +
			"&fieldList=" + fieldList +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var recFields = [];
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			if(responseHandler) responseHandler(recFields);
			return;
		}
		if(errStr)
		{
			Debug.err(errStr);
			if(responseHandler) responseHandler(recFields);
			return;
		}

		//fill active tables
		{
			var tableNames = req.responseXML.getElementsByTagName("ActiveTableName");
			var tableVersions = req.responseXML.getElementsByTagName("ActiveTableVersion");
			ConfigurationAPI._activeTables = {};
			for(var i=0;i<tableNames.length;++i)
			{
				ConfigurationAPI._activeTables[DesktopContent.getXMLValue(tableNames[i])] =
						DesktopContent.getXMLValue(tableVersions[i]);
			}
			Debug.logv("ConfigurationAPI._activeTables =",ConfigurationAPI._activeTables);
		} //end fill active tables


		var fields = DesktopContent.getXMLNode(req,"fields");

		var FieldTableNames = fields.getElementsByTagName("FieldTableName");
		var FieldColumnNames = fields.getElementsByTagName("FieldColumnName");
		var FieldRelativePaths = fields.getElementsByTagName("FieldRelativePath");
		var FieldColumnTypes = fields.getElementsByTagName("FieldColumnType");
		var FieldColumnDataTypes = fields.getElementsByTagName("FieldColumnDataType");
		var FieldColumnDataChoices = fields.getElementsByTagName("FieldColumnDataChoices");
		var FieldColumnDefaultValues = fields.getElementsByTagName("FieldColumnDefaultValue");


		for(var i=0;i<FieldTableNames.length;++i)
		{
			var obj = {};
			obj.fieldTableName = DesktopContent.getXMLValue(FieldTableNames[i]);
			obj.fieldColumnName = DesktopContent.getXMLValue(FieldColumnNames[i]);
			obj.fieldRelativePath = DesktopContent.getXMLValue(FieldRelativePaths[i]);
			obj.fieldColumnType = DesktopContent.getXMLValue(FieldColumnTypes[i]);
			obj.fieldColumnDataType = DesktopContent.getXMLValue(FieldColumnDataTypes[i]);
			obj.fieldColumnDefaultValue = DesktopContent.getXMLValue(FieldColumnDefaultValues[i]);

			var FieldColumnDataChoicesArr = FieldColumnDataChoices[i].getElementsByTagName("FieldColumnDataChoice");
			obj.fieldColumnDataChoicesArr = [];
			for(var j=0; j<FieldColumnDataChoicesArr.length;++j)
				obj.fieldColumnDataChoicesArr.push(DesktopContent.getXMLValue(FieldColumnDataChoicesArr[j]));

			recFields.push(obj);
		}
		Debug.log("Records length: " + recFields.length);
		if(responseHandler) responseHandler(recFields);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr
} //end getFieldsOfRecords()

//=====================================================================================
//getFieldValuesForRecords ~~
//	takes as input a base path where the record is,
//	  and the record uid.
// <recordArr> is an array or record UIDs (as returned from
//		ConfigurationAPI.getSubsetRecords)
// <fieldObjArr> is an array of field objects (as returned from
//		ConfigurationAPI.getFieldsOfRecords). This
//		is converted internally to a CSV list of tree paths relative to <subsetBasePath>
//	 	to the fields to be read.
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of FieldValue objects
//		FieldValue := {}
//			obj.fieldUID
//			obj.fieldPath
//			obj.fieldValue
//
ConfigurationAPI.getFieldValuesForRecords = function(subsetBasePath,
		recordArr,fieldObjArr,
		responseHandler,modifiedTables,silenceErrors)
{
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}

	var recordListStr = "";
	if(Array.isArray(recordArr))
		for(var i=0;i<recordArr.length;++i)
		{
			if(i) recordListStr += ",";
			recordListStr += encodeURIComponent(recordArr[i]);
		}
	else //handle single record case
		recordListStr = encodeURIComponent(recordArr);


	var fieldListStr = "";
	if(fieldObjArr.length && (typeof fieldObjArr[0] === "string"))
	{
		//assume fieldObjArr is a user generated array and not URI encoded

		if(Array.isArray(fieldObjArr))
			for(var i=0;i<fieldObjArr.length;++i)
			{
				if(i) fieldListStr += ",";
				fieldListStr += encodeURIComponent(fieldObjArr[i]);
			}
		else
			fieldListStr = encodeURIComponent(fieldObjArr);
	}
	else
	{
		//assume fieldObjArr already URI encoded (as returned by ConfigurationAPI.getFieldsOfRecords())

		for(var i=0;i<fieldObjArr.length;++i)
		{
			if(i) fieldListStr += ",";
			fieldListStr += fieldObjArr[i].fieldRelativePath +
					fieldObjArr[i].fieldColumnName;
		}
	}

	DesktopContent.XMLHttpRequest("Request?RequestType=getTreeNodeFieldValues" +
			"&tableGroup=" +
			"&tableGroupKey=-1", //end get data
			"startPath=/" + subsetBasePath +
			"&recordList=" + recordListStr +
			"&fieldList=" + fieldListStr +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var recFieldValues = [];
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			if(!silenceErrors) Debug.log(err,Debug.HIGH_PRIORITY);
			if(responseHandler) responseHandler(recFieldValues,err);
			return;
		}
		if(errStr)
		{
			Debug.err(errStr);
			if(responseHandler) responseHandler(recFieldValues,errStr);
			return;
		}

		var fieldValues = req.responseXML.getElementsByTagName("fieldValues");

		for(var f=0;f<fieldValues.length;++f)
		{
			var FieldPaths = fieldValues[f].getElementsByTagName("FieldPath");
			var FieldValues = fieldValues[f].getElementsByTagName("FieldValue");
			for(var i=0;i<FieldPaths.length;++i)
			{
				var obj = {};
				obj.fieldUID = DesktopContent.getXMLValue(fieldValues[f]);
				obj.fieldPath = DesktopContent.getXMLValue(FieldPaths[i]);
				obj.fieldValue = DesktopContent.getXMLValue(FieldValues[i]);
				recFieldValues.push(obj);

				//track last stable value, inject in object (e.g. used by child link fill field)
				fieldObjArr[i].fieldColumnValue = obj.fieldValue;
			}
		}

		if(responseHandler) responseHandler(recFieldValues);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr
} //end getFieldValuesForRecords()


//=====================================================================================
//getUniqueFieldValuesForRecords ~~
//	takes as input a base path where the records are,
//	  and an array of records.
// <recordArr> is an array or record UIDs (as returned from
//		ConfigurationAPI.getSubsetRecords)
// <fieldList> is a CSV list of tree paths relative to <subsetBasePath>/<recordUID>/
//	 to the fields for which to get the set of unique values.
//	If empty, then expect an empty array.
//		e.g. "LinkToFETypeConfiguration,FEInterfacePluginName"
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of UniqueValues objects
//		UniqueValues := {}
//			obj.fieldName
//			obj.fieldUniqueValueArray
//
//
ConfigurationAPI.getUniqueFieldValuesForRecords = function(subsetBasePath,recordArr,fieldList,
		responseHandler,modifiedTables)
{
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}

	var recordListStr = "";
	if(Array.isArray(recordArr))
		for(var i=0;i<recordArr.length;++i)
		{
			if(i) recordListStr += ",";
			recordListStr += encodeURIComponent(recordArr[i]);
		}
	else //handle single record case
		recordListStr = encodeURIComponent(recordArr);

	DesktopContent.XMLHttpRequest("Request?RequestType=getUniqueFieldValuesForRecords" +
			"&tableGroup=" +
			"&tableGroupKey=-1", //end get data
			"startPath=/" + subsetBasePath +
			"&recordList=" + recordListStr +
			"&fieldList=" + fieldList +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var fieldUniqueValues = [];
		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			if(responseHandler) responseHandler(fieldUniqueValues);
			return;
		}
		if(errStr)
		{
			Debug.err(errStr);
			if(responseHandler) responseHandler(fieldUniqueValues);
			return;
		}

		var fields = req.responseXML.getElementsByTagName("field");

		for(var i=0;i<fields.length;++i)
		{

			var uniqueValues = fields[i].getElementsByTagName("uniqueValue");
			var groupIdChildLinkIndex = DesktopContent.getXMLNode(
					fields[i],"childLinkIndex");

			var obj = {};
			obj.fieldName = DesktopContent.getXMLValue(fields[i]);

			if(groupIdChildLinkIndex)
				obj.childLinkIndex = DesktopContent.getXMLValue(groupIdChildLinkIndex);

			obj.fieldUniqueValueArray = [];
			for(var j=0;j<uniqueValues.length;++j)
				obj.fieldUniqueValueArray.push(DesktopContent.getXMLValue(uniqueValues[j]));
			fieldUniqueValues.push(obj);
		}
		Debug.log("fieldUniqueValues length: " + fieldUniqueValues.length);
		if(responseHandler) responseHandler(fieldUniqueValues);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr
} //end getUniqueFieldValuesForRecords()

//=====================================================================================
//setFieldValuesForRecords ~~
//	takes as input a base path where the records are,
//	  and an array of records.
// <recordArr> is an array or record UIDs (as returned from
//		ConfigurationAPI.getSubsetRecords)
// <fieldObjArr> is an array of field objects (as returned from
//		ConfigurationAPI.getFieldsOfRecords). This
//		is converted internally to a CSV list of tree paths relative to <subsetBasePath>
//	 	to the fields to be written.
//		ALTERNATIVELY: the user can pass an array of full path strings.
// <valueArr> is an array of values, with index corresponding to the associated
//	 	field in the <fieldObjArr>.
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of Table objects
//		Table := {}
//			obj.tableName
//			obj.tableVersion
//			obj.tableComment
//
//
ConfigurationAPI.setFieldValuesForRecords = function(subsetBasePath,recordArr,fieldObjArr,
		valueArr,responseHandler,modifiedTablesIn,silenceErrors)
{
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTablesIn && i<modifiedTablesIn.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTablesIn[i].tableName + "," +
				modifiedTablesIn[i].tableVersion;
	}

	var fieldListStr = "";
	if(fieldObjArr.length && (typeof fieldObjArr[0] === "string"))
	{
		//assume fieldObjArr is a user generated array and not URI encoded

		if(Array.isArray(fieldObjArr))
			for(var i=0;i<fieldObjArr.length;++i)
			{
				if(i) fieldListStr += ",";
				fieldListStr += encodeURIComponent(fieldObjArr[i]);
			}
		else
			fieldListStr = encodeURIComponent(fieldObjArr);
	}
	else
	{
		//assume fieldObjArr already URI encoded (as returned by ConfigurationAPI.getFieldsOfRecords())

		for(var i=0;i<fieldObjArr.length;++i)
		{
			if(i) fieldListStr += ",";
			fieldListStr += fieldObjArr[i].fieldRelativePath +
					fieldObjArr[i].fieldColumnName;
		}
	}


	var valueListStr = "";
	if(Array.isArray(valueArr))
		for(var i=0;i<valueArr.length;++i)
		{
			if(i) valueListStr += ",";
			valueListStr += encodeURIComponent(valueArr[i]);
		}
	else //handle single record case
		valueListStr = encodeURIComponent(valueArr);


	var recordListStr = "";
	if(Array.isArray(recordArr))
		for(var i=0;i<recordArr.length;++i)
		{
			if(i) recordListStr += ",";
			recordListStr += encodeURIComponent(recordArr[i]);
		}
	else //handle single record case
		recordListStr = encodeURIComponent(recordArr);

	DesktopContent.XMLHttpRequest("Request?RequestType=setTreeNodeFieldValues" +
			"&tableGroup=" +
			"&tableGroupKey=-1", //end get data
			"startPath=/" + subsetBasePath +
			"&recordList=" + recordListStr +
			"&valueList=" + valueListStr +
			"&fieldList=" + fieldListStr +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var modifiedTables = [];

		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			if(!silenceErrors)
				Debug.log(err,Debug.HIGH_PRIORITY);
			if(responseHandler) responseHandler(modifiedTables,err);
			return;
		}
		if(errStr)
		{
			Debug.err(errStr);
			if(responseHandler) responseHandler(modifiedTables,errStr);
			return;
		}

		//modifiedTables
		var tableNames = req.responseXML.getElementsByTagName("NewActiveTableName");
		var tableVersions = req.responseXML.getElementsByTagName("NewActiveTableVersion");
		var tableComments = req.responseXML.getElementsByTagName("NewActiveTableComment");
		var tableVersion;

		//add only temporary version
		for(var i=0;i<tableNames.length;++i)
		{
			tableVersion = DesktopContent.getXMLValue(tableVersions[i])|0; //force integer
			if(tableVersion >= -1) continue; //skip unless temporary
			var obj = {};
			obj.tableName = DesktopContent.getXMLValue(tableNames[i]);
			obj.tableVersion = DesktopContent.getXMLValue(tableVersions[i]);
			obj.tableComment = DesktopContent.getXMLValue(tableComments[i]);
			modifiedTables.push(obj);
		}

		if(responseHandler) responseHandler(modifiedTables);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr
} //end setFieldValuesForRecords()

//=====================================================================================
//popUpSaveModifiedTablesForm ~~
//	presents the user with the form to choose the options for ConfigurationAPI.saveModifiedTables
//
//	When ConfigurationAPI.saveModifiedTables is called,
//		it will generate popup messages indicating progress.
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with 3 array parameters.
//		on failure, the arrays will be empty.
//		on success, the arrays will be an array of Saved Table objects
//		SavedTable := {}
//			obj.tableName
//			obj.tableVersion
//			obj.tableComment
//
//			...and array of Saved Group objects
//		SavedGroup := {}
//			obj.groupName
//			obj.groupKey
//			obj.groupComment
//
//			...and array of Saved Alias objects
//		SavedAlias := {}
//			obj.groupName
//			obj.groupKey
//			obj.groupAlias
//
ConfigurationAPI.popUpSaveModifiedTablesForm = function(modifiedTables,responseHandler)
{
	//mimic ConfigurationGUI::popUpSaveTreeForm()

	Debug.log("ConfigurationAPI popUpSaveModifiedTablesForm");

	var str = "";

	var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
	if(!el)
	{
		el = document.createElement("div");
		el.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID);
	}
	el.style.display = "none";

	var gh = 50;
	var w = 380;
	var h = 330;
	ConfigurationAPI.setPopUpPosition(el,w /*w*/,h-gh*2 /*h*/);

	//set position and size
//	var w = 380;
//	var h = 330;
//	var gh = 50;
//	var ww = DesktopContent.getWindowWidth();
//	var wh = DesktopContent.getWindowHeight();
//	el.style.top = (DesktopContent.getWindowScrollTop() + ((wh-h-2)/2)- gh*2) + "px"; //allow for 2xgh growth for each affected group
//	el.style.left = (DesktopContent.getWindowScrollLeft() + ((ww-w-2)/2)) + "px";
//	el.style.width = w + "px";
//	el.style.height = h + "px";

	//always
	//	- save modified tables (show list of modified tables)
	//		(and which active group they are in)
	//
	//optionally
	//	- checkbox to bump version of modified active groups
	//	- checkbox to assign system alias to bumped active group


	var modTblCount = 0;
	var modTblStr = "";
	var modifiedTablesListStr = ""; //csv table, temporay version,...

	for(var j=0;j<modifiedTables.length;++j)
		if((modifiedTables[j].tableVersion|0) < -1)
		{
			if(modTblCount++)
				modTblStr += ",";
			modTblStr += modifiedTables[j].tableName;

			if(modifiedTablesListStr.length)
				modifiedTablesListStr += ",";
			modifiedTablesListStr += modifiedTables[j].tableName;
			modifiedTablesListStr += ",";
			modifiedTablesListStr += modifiedTables[j].tableVersion;
		}

	var str = "<a id='" +
			ConfigurationAPI._POP_UP_DIALOG_ID +
			"-cancel' href='#'>Cancel</a><br><br>";

	str += "<div id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-div'>";
	str += "Saving will create new persistent versions of each modified table." +
			"<br><br>" +
			"Here is the list of modified tables (count=" + modTblCount +
			"):" +
			"<br>";


	//display modified tables
	str += "<div style='white-space:nowrap; width:" + w + "px; height:40px; " +
			"overflow:auto; font-weight: bold;'>";
	str += modTblStr;
	str += "</div>";

	//get affected groups
	//	and save member map to hidden div for Save action
	///////////////////////////////////////////////////////////
	DesktopContent.XMLHttpRequest("Request?RequestType=checkAffectedActiveGroups" +
			"&groupName=" +
			"&groupKey=-1", //end get params
			"&modifiedTables=" + modifiedTablesListStr, //end post params
			function(req, reqParam, errStr)
			{
		if(errStr)
		{
			Debug.log(errStr,Debug.HIGH_PRIORITY);
			el.innerHTML = str;
			return;
		}

		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			el.innerHTML = str;
			return;
		}

		//for each affected group
		//	 put csv: name,key,memberName,memberVersion...
		var groups = req.responseXML.getElementsByTagName("AffectedActiveGroup");
		var memberNames, memberVersions;
		var xmlGroupName;
		modTblStr = ""; //re-use
		for(var i=0;i<groups.length;++i)
		{
			xmlGroupName = DesktopContent.getXMLValue(groups[i],"GroupName");
			str += "<div style='display:none' class='" + ConfigurationAPI._POP_UP_DIALOG_ID +
					"-affectedGroups' >";
			str += xmlGroupName;
			str += "," + DesktopContent.getXMLValue(groups[i],"GroupKey");

			memberNames = groups[i].getElementsByTagName("MemberName");
			memberVersions = groups[i].getElementsByTagName("MemberVersion");
			Debug.log("memberNames.length " + memberNames.length);
			for(var j=0;j<memberNames.length;++j)
				str += "," + DesktopContent.getXMLValue(memberNames[j]) +
				"," + DesktopContent.getXMLValue(memberVersions[j]);
			str += "</div>"; //close div " + ConfigurationAPI._POP_UP_DIALOG_ID + "-affectedGroups


			if(modTblStr.length)
				modTblStr += ",";


			modTblStr += "<a style='color:black' href='#' onclick='javascript:" +
					"var forFirefox = ConfigurationAPI.handleGroupCommentToggle(\"" +
					xmlGroupName + "\");" +
					" ConfigurationAPI.handlePopUpHeightToggle(" + h + "," + gh + ");'>";
			modTblStr += xmlGroupName;
			modTblStr += "</a>";

			//store cached group comment in hidden html
			modTblStr += "<div id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-" +
					xmlGroupName + "' " +
					"class='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-cache' " +
					"style='display:none'>" +
					decodeURIComponent(DesktopContent.getXMLValue(groups[i],"GroupComment")) +
					"</div>";
		}

		str += "Please choose the options you want and click 'Save':" +
				"<br>";

		//add checkbox to save affected groups
		str += "<input type='checkbox' id='" + ConfigurationAPI._POP_UP_DIALOG_ID +
				"-bumpGroupVersions' checked " +
				"onclick='ConfigurationAPI.handlePopUpHeightToggle(" + h + "," + gh + ");'>";
		//add link so text toggles checkbox
		str += "<a href='#' onclick='javascript:" +
				"var el = document.getElementById(\"" + ConfigurationAPI._POP_UP_DIALOG_ID +
				"-bumpGroupVersions\");" +
				"var forFirefox = (el.checked = !el.checked);" +
				" ConfigurationAPI.handlePopUpHeightToggle(" + h + "," + gh + "); return false;'>";
		str += "Save Affected Groups as New Keys";
		str += "</a>";
		str +=	"</input><br>";

		//add checkbox to activate saved affected groups
		str += "<input type='checkbox' id='" + ConfigurationAPI._POP_UP_DIALOG_ID +
				"-activateBumpedGroupVersions' checked " +
				">";
		//add link so text toggles checkbox
		str += "<a href='#' onclick='javascript:" +
				"var el = document.getElementById(\"" + ConfigurationAPI._POP_UP_DIALOG_ID +
				"-activateBumpedGroupVersions\");" +
				"if(el.disabled) return false; " +
				"var forFirefox = (el.checked = !el.checked);" +
				"return false;'>";
		str += "Also Activate New Groups";
		str += "</a>";
		str +=	"</input><br>";

		str += "Here is the list of affected groups (count=" + groups.length +
				"):" +
				"<br>";

		//display affected groups
		str += "<div style='white-space:nowrap; width:" + w + "px; margin-bottom:20px; " +
				"overflow:auto; font-weight: bold;'>";
		str += modTblStr;
		str += "<div id='clearDiv'></div>";
		str += "<center>";

		str += "<div id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-header'></div>";

		str += "<div id='clearDiv'></div>";

		str += "<textarea id='" + ConfigurationAPI._POP_UP_DIALOG_ID +
				"-groupComment' rows='4' cols='50' " +
				"style='width:417px;height:68px;display:none;margin:0;'>";
		str += ConfigurationAPI._DEFAULT_COMMENT;
		str += "</textarea>";
		str += "</center>";

		str += "</div>"; //end affected groups div

		str += "<div id='" + ConfigurationAPI._POP_UP_DIALOG_ID +
				"-groupAliasArea' ><center>";

		//get existing group aliases
		///////////////////////////////////////////////////////////
		DesktopContent.XMLHttpRequest("Request?RequestType=getGroupAliases" +
				"",
				"",
				function(req, reqParam, errStr)
				{
			if(errStr)
			{
				Debug.log(errStr,Debug.HIGH_PRIORITY);
				el.innerHTML = str;
				return;
			}

			var err = DesktopContent.getXMLValue(req,"Error");
			if(err)
			{
				Debug.log(err,Debug.HIGH_PRIORITY);
				el.innerHTML = str;
				return;
			}

			var aliases = req.responseXML.getElementsByTagName("GroupAlias");
			var aliasGroupNames = req.responseXML.getElementsByTagName("GroupName");
			var aliasGroupKeys = req.responseXML.getElementsByTagName("GroupKey");

			//for each affected group
			//	-Show checkbox for setting alias and dropdown for alias
			//	and a pencil to change dropdown to text box to free-form alias.
			//	-Also, identify if already aliased and choose that as default option
			//	in dropwdown.
			var alias, aliasGroupName, aliasGroupKey;
			var groupName, groupKey;
			var groupOptionIndex = []; //keep distance and index of option for each group, or -1 if none
			for(var i=0;i<groups.length;++i)
			{
				groupOptionIndex.push([-1,0]); //index and distance

				groupName = DesktopContent.getXMLValue(groups[i],"GroupName");
				groupKey = DesktopContent.getXMLValue(groups[i],"GroupKey");

				//find alias
				modTblStr = ""; //re-use
				for(var j=0;j<aliasGroupNames.length;++j)
				{
					alias = DesktopContent.getXMLValue(aliases[j]);
					aliasGroupName = DesktopContent.getXMLValue(aliasGroupNames[j]);
					aliasGroupKey = DesktopContent.getXMLValue(aliasGroupKeys[j]);

					//Debug.log("compare " + aliasGroupName + ":" +
					//		aliasGroupKey);

					//also build drop down
					modTblStr += "<option value='" + alias + "' ";

					//consider any alias with same groupName
					if(aliasGroupName == groupName)
					{
						if(groupOptionIndex[i][0] == -1 ||	//take best match
								Math.abs(groupKey - aliasGroupKey) < groupOptionIndex[i][1])
						{
							Debug.log("found alias");
							groupOptionIndex[i][0] = j; //index
							groupOptionIndex[i][1] = Math.abs(groupKey - aliasGroupKey); //distance
						}
					}
					modTblStr += ">";
					modTblStr += alias;	//can display however
					modTblStr += "</option>";
				}

				str += "<input type='checkbox' class='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-setGroupAlias' " +
						(groupOptionIndex[i][0] >= 0?"checked":"") + //check if has an alias already
						">";
				//add link so text toggles checkbox
				str += "<a href='#' onclick='javascript:" +
						"var el = document.getElementsByClassName(\"" + ConfigurationAPI._POP_UP_DIALOG_ID + "-setGroupAlias\");" +
						"var forFirefox = (el[" + i + "].checked = !el[" + i + "].checked);" +
						" return false;'>";
				str += "Set '<b style='font-size:16px'>" + groupName + "</b>' to System Alias:";
				str += "</a><br>";

				str += "<table cellpadding='0' cellspacing='0' border='0'><tr><td>";
				str += "<select " +
						"id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasSelect-" + (i) + "' " +
						"style='margin:2px; height:" + (25) + "px'>";
				str += modTblStr;
				str += "</select>";

				str += "<input type='text' " +
						"id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasTextBox-" + (i) + "' " +
						"style='display:none; margin:2px; width:150px; height:" +
						(19) + "px'>";
				str += "";
				str += "</input>";
				str += "</td><td>";

				str += "<div style='display:block' " +
						"class='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editIcon' id='" + ConfigurationAPI._POP_UP_DIALOG_ID +
						"-editIcon-" +
						(i) + "' " +
						"onclick='ConfigurationAPI.handlePopUpAliasEditToggle(" +
						i +
						");' " +
						"title='Toggle free-form system alias editing' " +
						"></div>";

				str += "<div class='" + ConfigurationAPI._POP_UP_DIALOG_ID +
						"-preloadImage' id='" + ConfigurationAPI._POP_UP_DIALOG_ID +
						"-preloadImage-editIconHover'></div>";

				str += "</td></tr></table>";

				str +=	"</input>";

				//increase height each time a group check is added
				h += gh;
				el.style.height = h + "px";
			}

			str += "</center></div>"; //close id='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupAliasArea'


			// done with system alias handling
			// continue with pop-up prompt

			str += "</div><br>"; //close main popup div
//
//			var onmouseupJS = "";
//			onmouseupJS += "document.getElementById(\"" + ConfigurationAPI._POP_UP_DIALOG_ID + "-submitButton\").disabled = true;";
//			onmouseupJS += "ConfigurationAPI.handleGroupCommentToggle(0,1);"; //force cache of group comment
//			onmouseupJS += "ConfigurationAPI.handlePopUpHeightToggle(" + h + "," + gh + ");";
//			onmouseupJS += "ConfigurationAPI.saveModifiedTables();";

			str += "<input id='" + ConfigurationAPI._POP_UP_DIALOG_ID +
					"-submitButton' type='button' " + //onmouseup='" +
					//onmouseupJS + "' " +
					"value='Save' title='" +
					"Save new versions of every modified table\n" +
					"(Optionally, save new active groups and assign system aliases)" +
					"'/>";
			el.innerHTML = str;

			//create submit onmouseup handler
			document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID +
					"-submitButton").onmouseup = function() {
				Debug.log("Submit mouseup");
				this.disabled = true;
				ConfigurationAPI.handleGroupCommentToggle(0,1); //force cache of group comment
				ConfigurationAPI.handlePopUpHeightToggle(h,gh);

				var savingGroups =
						document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID +
								"-bumpGroupVersions").checked;
				var activatingSavedGroups =
						document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID +
								"-activateBumpedGroupVersions").checked;

				ConfigurationAPI.saveModifiedTables(modifiedTables,responseHandler,
						true); //doNotIgnoreWarnings

			}; //end submit onmouseup handler

			//create cancel onclick handler
			document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID +
					"-cancel").onclick = function(event) {
				Debug.log("Cancel click");
				var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
				if(el) el.parentNode.removeChild(el); //close popup
				if(responseHandler) responseHandler([],[],[]); //empty array indicates nothing done
				return false;
			}; //end submit onmouseup handler


			//handle default dropdown selections for group alias
			for(var i=0;i<groups.length;++i)
				if(groupOptionIndex[i][0] != -1) //have a default
					document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasSelect-" +
							i).selectedIndex = groupOptionIndex[i][0];

				},0,0,true //reqParam, progressHandler, callHandlerOnErr
		); //end of getGroupAliases handler

			},0,0,true //reqParam, progressHandler, callHandlerOnErr
	); //end of getActiveTableGroups handler


	document.body.appendChild(el); //add element to display div
	el.style.display = "block";

}


//=====================================================================================
//handleGroupCommentToggle ~~
// toggles affected group comment box and handles details
ConfigurationAPI.handleGroupCommentToggle =  function(groupName,setHideVal)
{
	var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment");
	var hel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-header");
	var cel;

	var doHide = el.style.display != "none";
	if(setHideVal !== undefined)
		doHide = setHideVal;

	if(doHide) //cache (possibly modified) group comment
	{
		if(hel.textContent == "") return; //assume was a force hide when already hidden

		//get current groupName so we know where to cache comment
		var gn = hel.textContent.split("'")[1];
		Debug.log("gn " + gn);
		cel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-" +
				gn);
		cel.innerHTML = "";
		cel.appendChild(document.createTextNode(el.value));

		//setup group comment header properly
		hel.innerHTML = "";
		el.style.display = "none";

		//if for sure hiding, then done
		if(gn == groupName || setHideVal !== undefined)
			return;
		//else show immediately the new selection
	}

	//show groupName comment
	{
		cel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment-" +
				groupName);
		el.value = cel.textContent;
		el.style.display = "block"; //show display before set caret (for Firefox)
		ConfigurationAPI.setCaretPosition(el,0,cel.textContent.length);

		hel.innerHTML = ("&apos;" + groupName + "&apos; group comment:");
	}
}

//=====================================================================================
//handlePopUpHeightToggle ~~
//	checkbox was already set before this function call
//	this responds to current value
//
//	pass height and group height
ConfigurationAPI.handlePopUpHeightToggle = function(h,gh)
{
	var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-bumpGroupVersions");
	Debug.log("ConfigurationAPI.handlePopUpHeightToggle " + el.checked);

	var ael = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-activateBumpedGroupVersions");

	var groupCommentEl = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupComment");
	var groupCommentHeight = 0;

	if(groupCommentEl && groupCommentEl.style.display != "none")
		groupCommentHeight += 100;

	var popEl = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "");
	if(!el.checked)
	{
		//hide alias area and subtract the height

		document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupAliasArea").style.display = "none";
		popEl.style.height = (h + groupCommentHeight) + "px";
		ael.disabled = true;
	}
	else
	{
		//show alias area and add the height

		//count if grps is 1 or 2
		var grps = document.getElementsByClassName("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-affectedGroups");
		popEl.style.height = (h + grps.length*gh + groupCommentHeight) + "px";
		document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-groupAliasArea").style.display = "block";
		ael.disabled = false;
	}
}

//=====================================================================================
//handlePopUpAliasEditToggle ~~
ConfigurationAPI.handlePopUpAliasEditToggle = function(i)
{
	Debug.log("handlePopUpAliasEditToggle " + i);

	var sel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasSelect-"+i);
	var tel = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasTextBox-"+i);
	Debug.log("sel.style.display  " + sel.style.display);
	if(sel.style.display == "none")
	{
		sel.style.display = "block";
		tel.style.display = "none";
	}
	else
	{
		tel.style.width = (sel.offsetWidth-2) + "px";
		sel.style.display = "none";
		tel.style.display = "block";
		ConfigurationAPI.setCaretPosition(tel,0,tel.value.length);
	}
} //end handlePopUpAliasEditToggle()

//=====================================================================================
//saveModifiedTables ~~
ConfigurationAPI.addTableToConfigurationGroup = function(tableName)
{
	Debug.log("addTableToConfigurationGroup",tableName);

	ConfigurationAPI.saveModifiedTables([{"tableName":tableName,"tableVersion":-1}]);
} //end addTableToConfigurationGroup()

//=====================================================================================
//saveModifiedTables ~~
//	Takes as input an array of modified tables and saves
//		those table temporary versions to persistent versions.
//		Optionally, save/activate affected groups and setup associated aliases.
//
//	By default, it will ignore warnings, save affected groups, and save
//		the system aliases for affected groups (most similar system alias)
//
//	It will also generate popup messages indicating progress.
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
// <tablesToAdd> is an array of Table objects to add to modified group. -1 would be empty mockup table.
//
//	Note: when called from popup, uses info from popup.
//
//	when complete, the responseHandler is called with 3 array parameters.
//		on failure, the arrays will be empty.
//		on success, the arrays will be an array of Saved Table objects
//		SavedTable := {}
//			obj.tableName
//			obj.tableVersion
//			obj.tableComment
//
//			...and array of Saved Group objects
//		SavedGroup := {}
//			obj.groupName
//			obj.groupKey
//			obj.groupComment
//
//			...and array of Saved Alias objects
//		SavedAlias := {}
//			obj.groupName
//			obj.groupKey
//			obj.groupAlias
//
//
ConfigurationAPI.saveModifiedTables = function(modifiedTables,responseHandler,
		doNotIgnoreWarnings,doNotSaveAffectedGroups,
		doNotActivateAffectedGroups,doNotSaveAliases,
		doNotIgnoreGroupActivationWarnings,
		doNotKillPopUpEl, tablesToAdd)
{
	//copy from ConfigurationGUI::saveModifiedTree

	var savedTables = [];
	var savedGroups = [];
	var savedAliases = [];

	if(!modifiedTables.length)
	{
		Debug.log("No tables were modified. Nothing to do.", Debug.WARN_PRIORITY);
		if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
		return;
	}

	//for each modified table
	//	save new version
	//	update tree member table version based on result
	//if saving groups
	//	for each affected group
	//		save member list but with tree table versions
	//		modify root group name if changed
	//if saving aliases
	//	for each alias
	//		set alias for new group


	var numberOfRequests = 0;
	var numberOfReturns = 0;
	var allRequestsSent = false;

	//::::::::::::::::::::::::::::::::::::::::::
	//localHandleAffectedGroups ~~
	function localHandleAffectedGroups()
	{
		Debug.log("Done with table saving.");

		//check if saving groups
		var savingGroups;
		var activatingSavedGroups;
		var doRequestAffectedGroups = false;
		try
		{
			savingGroups =
				document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-bumpGroupVersions").checked;

			activatingSavedGroups =
				document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-activateBumpedGroupVersions").checked;
		}
		catch(err)
		{
			savingGroups = !doNotSaveAffectedGroups;
			activatingSavedGroups = !doNotActivateAffectedGroups;
			doRequestAffectedGroups = true; //popup doesn't exist, so need to do the work on own
		}

		if(!savingGroups) //then no need to proceed. exit!
		{
			//kill popup dialog
			var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "");
			if(el && !doNotKillPopUpEl) el.parentNode.removeChild(el);
			if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
			return;
		}

		//identify root group name/key
		//var rootGroupEl = document.getElementById("treeView-ConfigGroupLink");
		//var rootGroupName = rootGroupEl.childNodes[0].textContent;
		//var rootGroupKey = rootGroupEl.childNodes[1].textContent;

		//Debug.log("rootGroup = " + rootGroupName + "(" + rootGroupKey + ")");
		Debug.log("On to saving groups");

		numberOfRequests = 0;		//re-use
		numberOfReturns = 0;		//re-use
		allRequestsSent = false; 	//re-use

		var affectedGroupNames = []; //to be populated for use by alias setting
		var affectedGroupComments = []; //to be populated for use by alias setting
		var affectedGroupTableMap = []; //to be populated for use by alias setting

		var affectedGroupKeys = []; //to be populated after group save for use by alias setting

		if(doRequestAffectedGroups)
		{
			//replace temporary versions with new persistent versions
			var modifiedTablesListStr = ""; //csv table, temporay version,...
			var modTblCount = 0;
			var modTblStr = "";
			for(var j=0;j<modifiedTables.length;++j)
				if((modifiedTables[j].tableVersion|0) < 0)
				{
					if(modTblCount++)
						modTblStr += ",";
					modTblStr += modifiedTables[j].tableName;

					if(modifiedTablesListStr.length)
						modifiedTablesListStr += ",";
					modifiedTablesListStr += modifiedTables[j].tableName;
					modifiedTablesListStr += ",";
					modifiedTablesListStr += modifiedTables[j].tableVersion;
				}

			//get affected groups
			//	and save member map to hidden div for Save action
			///////////////////////////////////////////////////////////
			DesktopContent.XMLHttpRequest("Request?RequestType=checkAffectedActiveGroups" +
					"&groupName=" +
					"&groupKey=-1", //end get params
					"&modifiedTables=" + modifiedTablesListStr, //end post params
					function(req, reqParam, errStr)
					{
				if(errStr)
				{
					Debug.log(errStr,Debug.HIGH_PRIORITY);
					el.innerHTML = str;
					if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
					return;
				}

				var err = DesktopContent.getXMLValue(req,"Error");
				if(err)
				{
					Debug.log(err,Debug.HIGH_PRIORITY);
					el.innerHTML = str;
					if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
					return;
				}
				//for each affected group
				//	 put csv: name,key,memberName,memberVersion...
				var groups = req.responseXML.getElementsByTagName("AffectedActiveGroup");
				var memberNames, memberVersions;
				var xmlGroupName;
				modTblStr = ""; //re-use
				for(var i=0;i<groups.length;++i)
				{
					affectedGroupNames.push( DesktopContent.getXMLValue(groups[i],"GroupName"));
					affectedGroupComments.push(decodeURIComponent(DesktopContent.getXMLValue(groups[i],"GroupComment")));

					memberNames = groups[i].getElementsByTagName("MemberName");
					memberVersions = groups[i].getElementsByTagName("MemberVersion");

					Debug.log("memberNames.length " + memberNames.length);

					//build member table map
					affectedGroupTableMap[i] = "tableList=";
					var memberVersion, memberName;
					for(var j=0;j<memberNames.length;++j)
					{
						memberVersion = DesktopContent.getXMLValue(memberVersions[j])|0; //force integer
						memberName = DesktopContent.getXMLValue(memberNames[j]);
						if(memberVersion < -1) //there should be a new modified version
						{
							Debug.log("affectedArr " + memberName + "-v" + memberVersion);
							//find version
							for(var k=0;k<savedTables.length;++k)
								if(memberName == savedTables[k].tableName)
								{
									Debug.log("found " + savedTables[k].tableName + "-v" +
											savedTables[k].tableVersion);
									affectedGroupTableMap[i] += memberName + "," +
											savedTables[k].tableVersion + ",";
									break;
								}
						}
						else
							affectedGroupTableMap[i] += memberName +
								"," + memberVersion + ",";

						//check tables to add and remove if already in the list
						for(var t=0;tablesToAdd && t<tablesToAdd.length;++t)
							if(memberName == tablesToAdd[t].tableName)
							{
								Debug.log("Removing table to add '" +
										memberName + "', already in group.");
								tablesToAdd.splice(t,1); //remove 1 element at position t
								console.log("Now tablesToAdd",tablesToAdd);
								break;
							}
					} //end primary member loop

					//for the last group, add tables (-1 means mockup)
					if(i==groups.length-1 && tablesToAdd)
					{
						for(var j=0;j<tablesToAdd.length;++j)
							affectedGroupTableMap[i] += tablesToAdd[j].tableName +
								"," + tablesToAdd[j].tableVersion + ",";
					} //end mockup table add
				}

				localHandleSavingAffectedGroups();
					},0,0,true //reqParam, progressHandler, callHandlerOnErr
			); //end of checkAffectedActiveGroups req
		}
		else
		{
			var affectedGroupEls =
					document.getElementsByClassName(ConfigurationAPI._POP_UP_DIALOG_ID +
							"-affectedGroups");
			var affectedGroupCommentEls =
					document.getElementsByClassName(ConfigurationAPI._POP_UP_DIALOG_ID +
							"-groupComment-cache");

			//	for each affected group element
			for(var i=0;i<affectedGroupEls.length;++i)
			{
				Debug.log(affectedGroupEls[i].textContent);
				Debug.log("group comment: " + affectedGroupCommentEls[i].textContent);

				var affectedArr = affectedGroupEls[i].textContent.split(',');

				affectedGroupComments.push(affectedGroupCommentEls[i].textContent);
				affectedGroupNames.push(affectedArr[0]);

				//build member table map
				affectedGroupTableMap[i] = "tableList=";
				//member map starts after group name/key (i.e. [2])
				for(var a=2;a<affectedArr.length;a+=2)
					if((affectedArr[a+1]|0) < -1) //there should be a new modified version
					{
						Debug.log("affectedArr " + affectedArr[a] + "-v" + affectedArr[a+1]);
						//find version
						for(var k=0;k<savedTables.length;++k)
							if(affectedArr[a] == savedTables[k].tableName)
							{
								Debug.log("found " + savedTables[k].tableName + "-v" +
										savedTables[k].tableVersion);
								affectedGroupTableMap[i] += affectedArr[a] + "," +
										savedTables[k].tableVersion + ",";
								break;
							}
					}
					else //use existing version
						affectedGroupTableMap[i] += affectedArr[a] + "," + affectedArr[a+1] + ",";
			}

			localHandleSavingAffectedGroups();
		}

		//::::::::::::::::::::::::::::::::::::::::::
		//localHandleSavingAffectedGroups ~~
		function localHandleSavingAffectedGroups()
		{
			//	for each affected group
			for(var i=0;i<affectedGroupNames.length;++i)
			{
				reqStr = ""; //reuse
				reqStr = "Request?RequestType=saveNewTableGroup" +
						"&groupName=" + affectedGroupNames[i] +
						"&allowDuplicates=0" +
						"&lookForEquivalent=1" +
						"&ignoreWarnings=" + (doNotIgnoreWarnings?0:1) +
						"&groupComment=" + encodeURIComponent(affectedGroupComments[i]);
				Debug.log(reqStr);
				Debug.log(affectedGroupTableMap[i]);

				++numberOfRequests;
				///////////////////////////////////////////////////////////
				DesktopContent.XMLHttpRequest(reqStr, affectedGroupTableMap[i],
						function(req,affectedGroupIndex)
						{

					var attemptedNewGroupName = DesktopContent.getXMLValue(req,"AttemptedNewGroupName");
					var treeErr = DesktopContent.getXMLValue(req,"TreeErrors");
					if(treeErr)
					{
						Debug.log(treeErr,Debug.HIGH_PRIORITY);
						Debug.log("There were problems identified in the tree view of the " +
								"attempted new group '" +
								attemptedNewGroupName +
								"'.\nThe new group was not created.\n" +
								"(Note: Other tables and groups may have been successfully created, " +
								"and would have success indications below this error info)\n\n" +
								"You can save the group anyway (if you think it is a good idea) by clicking " +
								"the button in the pop-up dialog " +
								"'<u>Save Groups with Warnings Ignored</u>.' " +
								"\n\nOtherwise, you can hit '<u>Cancel</u>.' and fix the tree. " +
								"Below you will find the description of the problem:",
								Debug.HIGH_PRIORITY);

						//change dialog save button
						var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-submitButton");
						if(el)
						{
							el.onmouseup = function() {
								Debug.log("Submit mouseup");
								this.disabled = true;
								ConfigurationAPI.handleGroupCommentToggle(0,1); //force cache of group comment
								ConfigurationAPI.handlePopUpHeightToggle(h,gh);

								var savingGroups =
										document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID +
												"-bumpGroupVersions").checked;
								var activatingSavedGroups =
										document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID +
												"-activateBumpedGroupVersions").checked;

								ConfigurationAPI.saveModifiedTables(modifiedTables,responseHandler,
										false, //doNotIgnoreWarnings
										doNotSaveAffectedGroups,
										doNotActivateAffectedGroups,doNotSaveAliases
								);
							};
							el.value = "Save Groups with Warnings Ignored";
							el.disabled = false;
						}
						return;
					}

					var err = DesktopContent.getXMLValue(req,"Error");
					if(err)
					{
						Debug.log(err,Debug.HIGH_PRIORITY);

						//kill popup dialog
						var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "");
						if(el && !doNotKillPopUpEl) el.parentNode.removeChild(el);
						if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
						return;
					}

					++numberOfReturns;

					var newGroupKey = DesktopContent.getXMLValue(req,"TableGroupKey");
					affectedGroupKeys.push(newGroupKey);

					{
						var obj = {};
						obj.groupName = attemptedNewGroupName;
						obj.groupKey = newGroupKey;
						obj.groupComment = affectedGroupComments[affectedGroupIndex];
						savedGroups.push(obj);
					}


					var foundEquivalentKey = DesktopContent.getXMLValue(req,"foundEquivalentKey");
					if(foundEquivalentKey)
						Debug.log("Using existing group '" + attemptedNewGroupName +
							" (" + newGroupKey + ")'", Debug.INFO_PRIORITY);
					else
						Debug.log("Successfully created new group '" + attemptedNewGroupName +
							" (" + newGroupKey + ")'", Debug.INFO_PRIORITY);

					//need to modify root group name if changed

					//activate if option was selected
					if(activatingSavedGroups) //allow to happen in parallel
						ConfigurationAPI.activateGroup(attemptedNewGroupName,newGroupKey,
								doNotIgnoreGroupActivationWarnings?false:true /* ignoreWarnings */);


					if(allRequestsSent &&
							numberOfReturns == numberOfRequests)
					{
						Debug.log("Done with group saving.");

						Debug.log("Moving on to Alias creation...");

						//check each alias checkbox
						//	for each alias that is checked
						//		set alias for new group
						//if any aliases modified, save and activate backbone

						//get checkboxes
						var setAliasCheckboxes;

						var groupAlias, groupName, groupKey;
						var setAliasCheckboxIndex = -1;
						var groupAliasName, groupAliasVersion;

						var affectedGroupAliases = [];

						//in order to set alias, we need:
						//	groupAlias
						//	groupName
						//	groupKey

						//for each set alias checkbox that is checked
						//	modify the active group alias table one after the other
						//if no checkboxes, then take queue from input parameters
						//	(and request group aliases)
						try
						{
							setAliasCheckboxes =
									document.getElementsByClassName("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-setGroupAlias");
							//Not sure if the above may throw under certain cicumstances with popup,
							//	so keeping above and below for now
							if(setAliasCheckboxes.length != affectedGroupNames.length)
								throw("no popup"); //if no popup, throw


							localNextAliasHandler();
							Debug.log("Aliases set in motion");
						}
						catch(err)
						{
							//no popup, so take from input and set for all affected groups
							setAliasCheckboxes = [];
							for(var i in affectedGroupNames)
								setAliasCheckboxes.push({"checked" : ((!doNotSaveAliases)?1:0) });

							//get group aliases and then set alias setting in motion
							//	-- i.e. build affectedGroupAliases
							//	-- (already have affectedGroupNames and affectedGroupKeys)
							//	-- also, modify setAliasCheckboxes as unchecked if no default alias can be found


							//get existing group aliases
							///////////////////////////////////////////////////////////
							DesktopContent.XMLHttpRequest("Request?RequestType=getGroupAliases" +
									"",
									"",
									function(req, reqParam, errStr)
									{
								if(errStr)
								{
									Debug.log(errStr,Debug.HIGH_PRIORITY);
									if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
									return;
								}

								var err = DesktopContent.getXMLValue(req,"Error");
								if(err)
								{
									Debug.log(err,Debug.HIGH_PRIORITY);
									if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
									return;
								}

								var aliases = req.responseXML.getElementsByTagName("GroupAlias");
								var aliasGroupNames = req.responseXML.getElementsByTagName("GroupName");
								var aliasGroupKeys = req.responseXML.getElementsByTagName("GroupKey");

								//for each affected group
								//	identify if already aliased and choose that as default option

								var alias, aliasGroupName, aliasGroupKey;
								var groupName, groupKey;
								var groupOptionIndex = []; //keep distance and index of option for each group, or -1 if none
								for(var i=0;i<affectedGroupNames.length;++i)
								{
									groupOptionIndex.push([-1,0]); //index and distance

									groupName = affectedGroupNames[i];
									groupKey = affectedGroupKeys[i];

									//find alias
									for(var j=0;j<aliasGroupNames.length;++j)
									{
										alias = DesktopContent.getXMLValue(aliases[j]);
										aliasGroupName = DesktopContent.getXMLValue(aliasGroupNames[j]);
										aliasGroupKey = DesktopContent.getXMLValue(aliasGroupKeys[j]);

										//Debug.log("compare " + aliasGroupName + ":" +
										//		aliasGroupKey);

										//consider any alias with same groupName
										if(aliasGroupName == groupName)
										{
											if(groupOptionIndex[i][0] == -1 ||	//take best match
													Math.abs(groupKey - aliasGroupKey) < groupOptionIndex[i][1])
											{
												Debug.log("found alias");
												groupOptionIndex[i][0] = j; //index
												groupOptionIndex[i][1] = Math.abs(groupKey - aliasGroupKey); //distance
											}
										}
									}

									//modify setAliasCheckboxes as unchecked if no default alias can be found
									setAliasCheckboxes[i].checked = (groupOptionIndex[i][0] >= 0?1:0);

									affectedGroupAliases.push(groupOptionIndex[i][0] >= 0?
											DesktopContent.getXMLValue(aliases[groupOptionIndex[i][0]]):"");
								} //end affected groups loop, choosing alias match


								localNextAliasHandler();
								Debug.log("Aliases set in motion");

									},0,0,true //reqParam, progressHandler, callHandlerOnErr
							); //end of getGroupAliases handler

						} //end of catch scope



						//localNextAliasHandler
						//	uses setAliasCheckboxIndex to iterate through setAliasCheckboxes
						//	and send the next request to modify the activegroupAlias table
						//	sequentially
						function localNextAliasHandler(retParams)
						{
							//first time there is no setAliasCheckboxIndex == -1
							if(setAliasCheckboxIndex >= 0)
							{
								if(retParams)
								{
									if(!retParams.foundEquivalentKey)
									{
										Debug.log("Successfully modified the active Backbone group " +
												" to set the System Alias '" + groupAlias + "' to " +
												" refer to the current group '" + groupName +
												" (" + groupKey + ").'" +
												"\n\n" +
												"Backbone group '" + retParams.groupName + " (" +
												retParams.groupKey + ")' was created and activated.",
												Debug.INFO_PRIORITY);

										{
											var obj = {};
											obj.groupName = groupName;
											obj.groupKey = groupKey;
											obj.groupAlias = groupAlias;
											savedAliases.push(obj);
										}
									}
									else
										Debug.log("Success, but no need to create a new Backbone group. " +
												"An existing Backbone group " +
												" already has the System Alias '" + groupAlias + "' " +
												" referring to the current group '" + groupName +
												" (" + groupKey + ").'" +
												"\n\n" +
												"Backbone group '" + retParams.groupName + " (" +
												retParams.groupKey + ")' was activated.",
												Debug.INFO_PRIORITY);
								}
								else
								{
									Debug.err("Process interrupted. Failed to modify the currently active Backbone!");

									//kill popup dialog
									var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "");
									if(el && !doNotKillPopUpEl) el.parentNode.removeChild(el);
									if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
									return;
								}

								++setAliasCheckboxIndex; //req back, so ready for next index
							}
							else
								setAliasCheckboxIndex = 0; //ready for first checkbox

							//get next affected group index
							while(setAliasCheckboxIndex < setAliasCheckboxes.length &&
									!setAliasCheckboxes[setAliasCheckboxIndex].checked)
								Debug.log("Skipping checkbox " + (++setAliasCheckboxIndex));

							if(setAliasCheckboxIndex >= setAliasCheckboxes.length)
							{
								Debug.log("Done with alias checkboxes ");

								if(!retParams)//req)
								{
									Debug.log("No System Aliases were changed, so Backbone was not modified. Done.");

									//kill popup dialog
									var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "");
									if(el && !doNotKillPopUpEl) el.parentNode.removeChild(el);
									if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
									return;
								}

								Debug.log("Saving and activating Backbone done.");

								//kill popup dialog
								var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "");
								if(el && !doNotKillPopUpEl) el.parentNode.removeChild(el);
								if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
								return;
							}

							//get next alias
							try
							{
								var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasSelect-" +
										setAliasCheckboxIndex);
								if(el.style.display == "none")
								{
									//get value from text box
									el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "-editAliasTextBox-" +
											setAliasCheckboxIndex);
								}
								groupAlias = el.value;
							}
							catch(err)
							{
								//if exception, then no popup, and get alias from
								//	affectedGroupAliases
								groupAlias = affectedGroupAliases[setAliasCheckboxIndex];
							}

							groupName = affectedGroupNames[setAliasCheckboxIndex];
							groupKey = affectedGroupKeys[setAliasCheckboxIndex];

							Debug.log("groupAlias = " + groupAlias);
							Debug.log("groupName = " + groupName);
							Debug.log("groupKey = " + groupKey);

							ConfigurationAPI.setGroupAliasInActiveBackbone(groupAlias,groupName,groupKey,
									0 /*newBackboneName*/,
									localNextAliasHandler,
									true); //request return parameters
						}

					} // end of if statement to check if done with group saving

						},i,0,true  //reqParam, progressHandler, callHandlerOnErr
				); //end save new group request
			} //end affected group for loop

			allRequestsSent = true;
			if(numberOfRequests == 0) //no groups to save
			{
				//this could happen if editing tables with no current active groups
				Debug.log("There were no groups to save!", Debug.INFO_PRIORITY);

				//kill popup dialog
				var el = document.getElementById("" + ConfigurationAPI._POP_UP_DIALOG_ID + "");
				if(el && !doNotKillPopUpEl) el.parentNode.removeChild(el);
			}
		} //end localHandleSavingAffectedGroups
	}	//end localHandleAffectedGroups


	//go through each modified table
	//	if modified table
	//		save new version
	//		update return object based on result
	for(var j=0;j<modifiedTables.length;++j)
		if((modifiedTables[j].tableVersion|0) < 0) //for each modified and mockup table
		{
			var reqStr = "Request?RequestType=saveSpecificTable" +
					"&dataOffset=0&chunkSize=0" +
					"&tableName=" + modifiedTables[j].tableName +
					"&version="+modifiedTables[j].tableVersion +
					"&temporary=0" +
					"&tableComment=" +
					encodeURIComponent(modifiedTables[j].tableComment?modifiedTables[j].tableComment:"") +
					"&sourceTableAsIs=1" +
					"&lookForEquivalent=1"; //accept equivalent tables! (ignoring author and timestamp)
			Debug.log(reqStr);

			++numberOfRequests;

			//	save new version
			///////////////////////////////////////////////////////////
			DesktopContent.XMLHttpRequest(reqStr, "",
					function(req, modifiedTableIndex, errStr)
					{
				var err = DesktopContent.getXMLValue(req,"Error");
				if(err)
				{
					Debug.log(err,Debug.HIGH_PRIORITY);

					//kill popup dialog
					var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
					//do not kill on error --- if(el && !doNotKillPopUpEl) el.parentNode.removeChild(el);
					if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
					return;
				}
				if(errStr)
				{
					Debug.log(errStr,Debug.HIGH_PRIORITY);

					//kill popup dialog
					var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
					//do not kill on error --- if(el && !doNotKillPopUpEl) el.parentNode.removeChild(el);
					if(responseHandler) responseHandler(savedTables,savedGroups,savedAliases);
					return;
				}

				var tableName = DesktopContent.getXMLValue(req,"savedName");
				var version = DesktopContent.getXMLValue(req,"savedVersion");
				var foundEquivalentVersion = DesktopContent.getXMLValue(req,"foundEquivalentVersion") | 0;

				if(foundEquivalentVersion)
					Debug.log("Using existing table '" + tableName + "-v" +
							version + "'",Debug.INFO_PRIORITY);
				else
					Debug.log("Successfully created new table '" + tableName + "-v" +
						version + "'",Debug.INFO_PRIORITY);

				//update saved table version based on result
				{
					var obj = {};
					obj.tableName = tableName;
					obj.tableVersion = version;
					obj.tableComment = modifiedTables[modifiedTableIndex].tableComment;
					savedTables.push(obj);
				}

				++numberOfReturns;

				if(allRequestsSent &&
						numberOfReturns == numberOfRequests)
				{
					if(!doNotSaveAffectedGroups)
						localHandleAffectedGroups();
				}
					},j,0,true  //reqParam, progressHandler, callHandlerOnErr
			);	//end save new table request
		}	//end modified table for loop

	allRequestsSent = true;
	if(numberOfRequests == 0) //no requests were sent, so go on to affected groups
	{
		//localHandleAffectedGroups();
		Debug.log("No tables were modified. Should be impossible to get here.", Debug.HIGH_PRIORITY);
	}
} //end saveModifiedTables()


//=====================================================================================
//activateGroup ~~
ConfigurationAPI.activateGroup = function(groupName, groupKey,
		ignoreWarnings, doneHandler)
{
	DesktopContent.XMLHttpRequest("Request?RequestType=activateTableGroup" +
			"&groupName=" +	groupName +
			"&groupKey=" + groupKey +
			"&ignoreWarnings=" + (ignoreWarnings?"1":"0") +
			"", //end get data
			"", //end post data
			function(req, reqParam, errStr)
			{
		if(errStr)
		{
			Debug.log(errStr,Debug.HIGH_PRIORITY);
			return;
		}

		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			Debug.log(err,Debug.HIGH_PRIORITY);

			//Debug.log(_OTS_RELAUNCH_STR,Debug.INFO_PRIORITY);

			//show activate with warnings link
			var str = "";

				//add ignore warnings Activate link
			str += " <a href='#' onclick='javascript:ConfigurationAPI.activateGroup(\"" +
					groupName +
					"\",\"" + groupKey + "\",true); return false;'>"; //ignore warnings
			str += "Activate " +
					groupName + "(" + groupKey + ") w/warnings ignored</a>";

			Debug.log("If you are are sure it is a good idea you can try to " +
					"activate the group with warnings ignored: " +
					str,Debug.HIGH_PRIORITY);
			return;
		}

		if(doneHandler) doneHandler();
			},
			true, 0 , true); //reqIndex, progressHandler, callHandlerOnErr
} //end activateGroup()

//=====================================================================================
//setGroupAliasInActiveBackbone ~~
//	Used to set a group alias.
//	This function will activate the resulting backbone group and
//		call a done handler
//
//      if doReturnParms
//          then the handler is called with an object
//          describing the new backbone group object:
//                 retParams.foundEquivalentKey //true if did not have to create new group, equivalent already existed
//                 retParams.groupName   //backbone group name
//                 retParams.groupKey    //backbone group key
//
ConfigurationAPI.setGroupAliasInActiveBackbone = function(groupAlias,groupName,groupKey,
	newBackboneName,doneHandler,doReturnParams)
{
	Debug.log("setGroupAliasInActiveBackbone groupAlias=" + groupAlias);
	Debug.log("setGroupAliasInActiveBackbone groupName=" + groupName);
	Debug.log("setGroupAliasInActiveBackbone groupKey=" + groupKey);

	if(!groupAlias || groupAlias.trim() == "")
	{
		Debug.err("Process interrupted. Invalid empty alias given!");
		if(doneHandler) doneHandler(); //error so call done handler
		return;
	}

	if(!groupName || groupName.trim() == "" || !groupKey || groupKey.trim() == "")
	{
		Debug.err("Process interrupted. Invalid group name and key given!");
		if(doneHandler) doneHandler(); //error so call done handler
		return;
	}

	if(!newBackboneName || newBackboneName == "")
		newBackboneName = ConfigurationAPI._activeGroups.Backbone.groupName;
	// newBackboneName += "Backbone";
	Debug.log("setGroupAliasInActiveBackbone newBackboneName=" + newBackboneName);

	//if no active backbone, create it
	if(ConfigurationAPI._activeGroups.Backbone.groupName == "")
	{
		newBackboneName = "WizBackbone";

		var tableMap = "tableList=";
		for (var i = 0; i < ConfigurationAPI._backboneMemberNames.length; ++i)
			tableMap += ConfigurationAPI._backboneMemberNames[i] + ",-1,";

		Debug.log("Identified missing backbone, attempting to create it.");
		ConfigurationAPI.saveGroupAndActivate(newBackboneName,
			tableMap,
			function(retParams)
			{
				Debug.log("Save and activate is done.");

				DesktopContent.XMLHttpRequest("Request?RequestType=setGroupAliasInActiveBackbone" +
					"&groupAlias=" + groupAlias +
					"&groupName=" + groupName +
					"&groupKey=" + groupKey, "",
					ConfigurationAPI.newWizBackboneMemberHandler,
					[newBackboneName,doneHandler,doReturnParams],
					0,true  //progressHandler, callHandlerOnErr
				);
			},	//end of done handler for saveGroupAndActivate
			true, //request return parameters
			true  //lookForEquivalent
		); //end saveGroupAndActivate call
	}
	else //backbone is already in place
		DesktopContent.XMLHttpRequest("Request?RequestType=setGroupAliasInActiveBackbone" +
			"&groupAlias=" + groupAlias +
			"&groupName=" + groupName +
			"&groupKey=" + groupKey, "",
			ConfigurationAPI.newWizBackboneMemberHandler,
			[newBackboneName,doneHandler,doReturnParams],
			0,true  //progressHandler, callHandlerOnErr
		);
} //end setGroupAliasInActiveBackbone()


//=====================================================================================
//setTableAliasInActiveBackbone ~~
//	Used to set a group alias.
//	This function will activate the resulting backbone group and
//		call a done handler
//
//      if doReturnParms
//          then the handler is called with an object
//          describing the new backbone group object:
//                 retParams.foundEquivalentKey //true if did not have to create new group, equivalent already existed
//                 retParams.groupName   //backbone group name
//                 retParams.groupKey    //backbone group key
//
ConfigurationAPI.setTableAliasInActiveBackbone = function(tableAlias, tableName, version,
	newBackboneName, doneHandler, doReturnParams)
{
	Debug.log("setTableAliasInActiveBackbone tableAlias " + tableAlias);
	Debug.log("setTableAliasInActiveBackbone tableName " + tableName);
	Debug.log("setTableAliasInActiveBackbone version " + version);

	if(!tableAlias || tableAlias.trim() == "")
	{
		Debug.err("Process interrupted. Invalid empty alias given!");
		if(doneHandler) doneHandler(); //error so call done handler
		return;
	}

	if (!tableName || tableName.trim() == "" || !version || version.trim() == "")
	{
		Debug.log("Process interrupted. Invalid table name and version given!", Debug.HIGH_PRIORITY);
		if(doneHandler) doneHandler(); //error so call done handler
		return;
	}

	if(!newBackboneName || newBackboneName == "")
		newBackboneName = ConfigurationAPI._activeGroups.Backbone.groupName;
	// newBackboneName += "Backbone";
	Debug.log("setTableAliasInActiveBackbone newBackboneName=" + newBackboneName);

	//if no active backbone, create it
	if(ConfigurationAPI._activeGroups.Backbone.groupName == "")
	{
		newBackboneName = "WizBackbone";

		var tableMap = "tableList=";
		for (var i = 0; i < ConfigurationAPI._backboneMemberNames.length; ++i)
			tableMap += ConfigurationAPI._backboneMemberNames[i] + ",-1,";

		Debug.log("Identified missing backbone, attempting to create it.");
		ConfigurationAPI.saveGroupAndActivate(newBackboneName,
			tableMap,
			function(retParams)
			{
				Debug.log("Save and activate is done.");

				DesktopContent.XMLHttpRequest("Request?RequestType=setTableAliasInActiveBackbone" +
					"&tableAlias=" + tableAlias +
					"&tableName=" + tableName +
					"&version=" + version, "",
					ConfigurationAPI.newWizBackboneMemberHandler,
					[newBackboneName, doneHandler, doReturnParams],
					0,true  //progressHandler, callHandlerOnErr
				);
			},	//end of done handler for saveGroupAndActivate
			true, //request return parameters
			true  //lookForEquivalent
		); //end saveGroupAndActivate call
	}
	else //backbone is already in place
		DesktopContent.XMLHttpRequest("Request?RequestType=setTableAliasInActiveBackbone" +
			"&tableAlias=" + tableAlias +
			"&tableName=" + tableName +
			"&version=" + version, "",
			ConfigurationAPI.newWizBackboneMemberHandler,
			[newBackboneName, doneHandler, doReturnParams],
			0, true  //progressHandler, callHandlerOnErr
);
} //end setTableAliasInActiveBackbone()

//=====================================================================================
//newWizBackboneMemberHandler
//	Used to handle the response from modifying a member of the backbone.
//	This handler will activate the resulting backbone group and
//		call a done handler.
//
//	params = [newBackboneGroupName, doneHandler, doReturnParams]
ConfigurationAPI.newWizBackboneMemberHandler = function(req,params,errStr)
{
	var err = DesktopContent.getXMLValue(req,"Error");
	if(err)
	{
		Debug.err(err);
		Debug.err("Process interrupted. Failed to modify the currently active Backbone!");

		if(params[1])
			params[1](); //error so call done handler
		return;
	}
	if(errStr)
	{
		Debug.err(errStr);
		Debug.err("Process interrupted. Failed to modify the currently active Backbone!");

		if(params[1])
			params[1](); //error so call done handler
		return;
	}


	var groupAliasName = DesktopContent.getXMLValue(req,"savedName");
	var groupAliasVersion = DesktopContent.getXMLValue(req,"savedVersion");

	Debug.log("groupAliasName=" + groupAliasName);
	Debug.log("groupAliasVersion=" + groupAliasVersion);

	var configNames = req.responseXML.getElementsByTagName("oldBackboneName");
	var tableVersions = req.responseXML.getElementsByTagName("oldBackboneVersion");

	//make a new backbone with old versions of everything except Group Alias
	var tableMap = "tableList=";
	var name;
	for(var i=0;i<configNames.length;++i)
	{
		name = configNames[i].getAttribute("value");

		if(name == groupAliasName)
		{
			tableMap += name + "," +
					groupAliasVersion + ",";
			continue;
		}
		//else use old member
		tableMap += name + "," +
				tableVersions[i].getAttribute("value") + ",";
	}

	console.log("backbone tableMap",tableMap);

	var newBackboneName = params[0];
	if(!params[0] || params[0] == "")
		newBackboneName = "WizBackbone";
	ConfigurationAPI.saveGroupAndActivate(newBackboneName,tableMap,params[1],params[2],
			true /*lookForEquivalent*/);
} // end ConfigurationAPI.newWizBackboneMemberHandler()

//=====================================================================================
//saveGroupAndActivate
ConfigurationAPI.saveGroupAndActivate = function(groupName,tableMap,
		doneHandler,doReturnParams,
		lookForEquivalent)
{
	DesktopContent.XMLHttpRequest("Request?RequestType=saveNewTableGroup&groupName=" +
			groupName +
			"&allowDuplicates=" + (lookForEquivalent?"0":"1") +
			"&lookForEquivalent=" + (lookForEquivalent?"1":"0") +
			"", //end get data
			tableMap, //end post data
			function(req, reqParam, errStr)
			{
		if(errStr)
		{
			Debug.log(errStr,Debug.HIGH_PRIORITY);
			Debug.log("Process interrupted. Failed to create a new group!" +
				" Please see details below.",
				Debug.HIGH_PRIORITY);

			if(doneHandler)	doneHandler(); //error so call done handler
			return;
		}

		var err = DesktopContent.getXMLValue(req,"Error");
		var name = DesktopContent.getXMLValue(req,"TableGroupName");
		var key = DesktopContent.getXMLValue(req,"TableGroupKey");
		var foundEquivalentKey = DesktopContent.getXMLValue(req,"foundEquivalentKey") == "1"?true:false;
		
		Debug.logv({foundEquivalentKey});

		if(err)
		{
			if(!name || !key)
			{
				Debug.log(err,Debug.HIGH_PRIORITY);
				Debug.log("Process interrupted. Failed to create a new group!" +
						" Please see details below.",
						Debug.HIGH_PRIORITY);

				if(doneHandler)	doneHandler(); //error so call done handler
				return;
			}
			else
			{
				//treat as warning and try to power through with activation
				Debug.log(err,Debug.WARN_PRIORITY);
				Debug.log("Process interrupted. Failed to create a new group!" +
						" (Likely the currently active group already represents what is being requested)\n\n" +
						"Going on with existing backbone group, name=" + name + " & key=" + key,
						Debug.WARN_PRIORITY);				
			}
		}

		//now activate the new group

		DesktopContent.XMLHttpRequest("Request?RequestType=activateTableGroup" +
				"&groupName=" + name +
				"&groupKey=" + key, "",
				function(req)
				{
			try
			{
				activateTableGroupHandler(req);
			}
			catch(err) {} //ignore error, this is a place holder for users to define a handler for updating displays when the active groups changed (e.g used by ConfigurationGUI)

			if(doneHandler)
			{
				//done so call done handler (and indicate success)
				if(!doReturnParams)
					doneHandler(); //done so call done handler
				else
				{
					var retParams = {
							"groupName" : name,
							"groupKey" : key,
							"foundEquivalentKey" : foundEquivalentKey
					}
					doneHandler(retParams); 	 //(and indicate success)
				}
			}
				});	//end of activate new backbone handler

			},0,0,true  //reqParam, progressHandler, callHandlerOnErr
	); //end of backbone saveNewTableGroup handler
} //end ConfigurationAPI.saveGroupAndActivate

//=====================================================================================
//getGroupTypeMemberNames
//	groupType can be
//		Backbone
//		Context
//		Iterate
//
//	on failure, return empty array
//	on success, return array of members
ConfigurationAPI.getGroupTypeMemberNames = function(groupType,responseHandler)
{
	DesktopContent.XMLHttpRequest("Request?RequestType=get" + groupType + "MemberNames", "",
			function (req, reqParam, errStr)
			{

		var retArr = [];

		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			Debug.log(err,Debug.HIGH_PRIORITY);
			if(responseHandler)	responseHandler(retArr);
			return;
		}
		if(errStr)
		{
			Debug.log(errStr,Debug.HIGH_PRIORITY);
			if(responseHandler)	responseHandler(retArr);
			return;
		}
		var memberNames = req.responseXML.getElementsByTagName(groupType + "Member");

		for(var i=0;i<memberNames.length;++i)
			retArr[i] = memberNames[i].getAttribute("value");

		Debug.log("Members found for group type " + groupType + " = " + retArr.length);
		if(responseHandler)	responseHandler(retArr);

			}, //end request handler
			0,0,true  //reqParam, progressHandler, callHandlerOnErr
	); //end request

} //end getGroupTypeMemberNames()


//=====================================================================================
//bitMapDialog ~~
//	shows bitmap dialog at full window size (minus margins)
//	on ok, calls <okHandler> with finalBitMapValue parameter
//
//	<bitMapParams> is an array olf size 6:
//		rows,cols,cellFieldSize,minColor,midColor,maxColor
ConfigurationAPI.bitMapDialog = function(tableName,UIDName,fieldName,bitMapParams,initBitMapValue,okHandler,cancelHandler)
{
	Debug.log("ConfigurationAPI bitMapDialog");


	DesktopContent.tooltip("Bitmap Editor GUI",
		"Welcome to the <b>BitMap Editor GUI</b>. Use your left and right mouse " +
		"buttons to set the [row,column] values in the BitMap. You can click-and-drag your mouse to " +
		"set multiple cells in one motion. You can also adjust the values assigned to your left and right " +
		"mouse buttons by adjusting the sliders at the top. To use an external tool, download/upload the BitMap as comma-separated-variable (CSV)." +
		"<br><br>" +
		"Use the gray border buttons to set every cell, or an entire row or column." +
		"<br><br>" +
		"When you are done modifying the BitMap cells, click OK to save the aggregated result." +
		"<br><br>" +
		"Note: you can optionally modify various features like Min-value Color, Max-value Color, Display Aspect ratio, etc. in the Table Editor for this table in <i>ots</i> Wiz Mode."
		);

	var str = "";

	var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
	if(!el)
	{
		el = document.createElement("div");
		el.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID);
	}
	el.style.display = "none";
	el.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmapDialog");

	var padding = 10;
	var popSz;


	//create bit map dialog
	// 	- header at top with field name and parameters
	//	- bitMap, w/mouseover and click and drag (same as windows sw)
	//		- center vertically
	//  - OK, CANCEL buttons at top right
	//	- also upload download buttons

	// 	Input parameters must match Table Editor handling for bitmaps:
	//	var _bitMapFieldsArr = [0 "Number of Rows",
	//							1 "Number of Columns",
	//							2 "Cell Bit-field Size",
	//							3 "Min-value Allowed",
	//							4 "Max-value Allowed",
	//							5 "Value step-size Allowed",
	//							6 "Display Aspect H:W",
	//							7 "Min-value Cell Color",
	//							8 "Mid-value Cell Color",
	//							9 "Max-value Cell Color",
	//							10 "Absolute Min-value Cell Color",
	//							11 "Absolute Max-value Cell Color",
	//							12 "Display Rows in Ascending Order",
	//							13 "Display Columns in Ascending Order",
	//							14 "Snake Double Rows",
	//							15 "Snake Double Columns"];


	//
	//	Local functions:
	//		localCreateCancelClickHandler()
	//      localCreateOkClickHandler()
	//		localCreateMouseHandler()
	//			localGetRowCol(x,y)
	//			el.onmousemove
	//			el.onmousedown
	//			el.onmouseup
	//			el.oncontextmenu
	//			localSetBitMap(r,c)
	//		localValidateInputs()
	//		localInitBitmapData()
	//		localConvertGridToRowCol(r,c)
	//		localConvertValueToRGBA(val) --> ConfigurationAPI.bitMapDialogConvertValueToRGBA(val, minValue, maxValue, minValueColor, midValueColor, maxValueColor, 
	//					floorValueColor, ceilValueColor)
	//		localConvertFullGridToRowCol()
	//		localConvertFullRowColToGrid(srcMatrix)
	//		localCreateBitmap()
	//		localCreateGridButtons()
	//		localCreateHeader()
	//			ConfigurationAPI.bitMapDialog.localUpdateScroll(i)
	//			ConfigurationAPI.bitMapDialog.localUpdateTextInput(i)
	//			ConfigurationAPI.bitMapDialog.localUpdateButtonInput(i,dir)
	//			ConfigurationAPI.bitMapDialog.localDownloadCSV()
	//			ConfigurationAPI.bitMapDialog.localDownloadBMP()
	//			ConfigurationAPI.bitMapDialog.locaPopupUploadCSV()
	//			ConfigurationAPI.bitMapDialog.locaUploadCSV()
	//		localPaint()
	//		localOptimizeAspectRatio()

	var rows, cols;

	var bitFieldSize;
	var bitMask;

	var minValue, maxValue;
	var midValue; //used for color calcs
	var stepValue;

	var forcedAspectH, forcedAspectW;

	var minValueColor, midValueColor, maxValueColor;
	var ceilValueColor, floorValueColor;

	var doDisplayRowsAscending, doDisplayColsAscending;
	var doSnakeColumns, doSnakeRows, allowFloatingPoint;
	var valueMapToStrings, valueMapToStringsArr = [];

	var MAP_UNDEFINED = "UNDEFINED";

	//validate and load input params
	if(!localValidateInputs())
	{
		Debug.log("Input parameters array to the Bitmap Dialog was as follows:\n " +
				bitMapParams, Debug.HIGH_PRIORITY);
		Debug.log("Input parameters to the Bitmap Dialog are invalid. Aborting.", Debug.HIGH_PRIORITY);
		return cancelHandler();
	}

	//give 5 pixels extra for each digit necessary to label rows
	var numberDigitW = 8, numberDigitH = 12;
	var axisPaddingExtra = numberDigitW;
	function localCalcExtraAxisPadding() {
		var lrows = rows;
		while((lrows /= 10) > 1) axisPaddingExtra += numberDigitW;
	} localCalcExtraAxisPadding();
	var butttonSz = 20;
	var axisPaddingMargin = 5;
	var axisPadding = axisPaddingMargin + axisPaddingExtra + axisPaddingMargin + butttonSz + axisPaddingMargin;
	var bmpGridThickness = 1;
	var bmpBorderSize = 1;


	var hdr; //header element
	var hdrX;
	var hdrY;
	var hdrW;
	var hdrH;

	var bmp;  //bitmap element
	var bmpGrid; //bitmap grid element
	var allRowBtns, allColBtns, allBtn;
	var rowLeftNums, rowRightNums, colTopNums, colBottomNums;
	var bmpCanvas, bmpContext; //used to generate 2D bitmap image src
	var bmpData; //bitmap data shown and returned. 2D array
	var bmpDataImage; //visual interpretation of bitmap data
	var bmpX;
	var bmpY;
	var bmpW;
	var bmpH;
	var bmpOverlay;
	var cursorInfo, hdrCursorInfo;

	var cellW;
	var cellH;

	var clickColors = []; //2 element array: 0=left-click, 1=right-click
	var clickValues = []; //2 element array: 0=left-click, 1=right-click


	localCreateHeader(); //create header element content
	localCreateBitmap(); //create bitmap element and data
	localCreateGridButtons(); //create all buttons

	localInitBitmapData(); //load bitmap data from input string

	localPaint();
	window.addEventListener("resize",localPaint);

	document.body.appendChild(el); //add element to body
	el.style.display = "block";
	
	//:::::::::::::::::::::::::::::::::::::::::
	el.addEventListener("keydown",function(e) {		
		Debug.log("bitmap stop propagation");
		e.stopPropagation();
		
		Debug.log("key " + e.keyCode);

		if(e.key == "Escape")
			localCancelClickHandler();
		else if(e.key == "Enter")
			localOkClickHandler();
	}); //end bitmap onkey handler

	//:::::::::::::::::::::::::::::::::::::::::
	//localCreateCancelClickHandler ~~
	//	cancel onclick handler
	var localCancelClickHandler = function(event) {
		Debug.log("Cancel click");
		var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
		if(el) el.parentNode.removeChild(el); //close popup
		window.removeEventListener("resize",localPaint); //remove paint listener
		cancelHandler(); //empty array indicates nothing done
		return false;
	} //end localCancelClickHandler()

	//:::::::::::::::::::::::::::::::::::::::::
	//localOkClickHandler ~~
	//	create OK onclick handler
	var localOkClickHandler = function(event) {
		Debug.log("OK click");
		var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
		if(el) el.parentNode.removeChild(el); //close popup
		window.removeEventListener("resize",localPaint); //remove paint listener

		var transGrid = localConvertFullGridToRowCol();
		var dataJsonStr = "[\n";
		for(var r=0;r<transGrid.length;++r)
		{
			if(r) dataJsonStr += ",\n";
			dataJsonStr += "\t[";
			for(var c=0;c<transGrid[0].length;++c)
			{
				if(c) dataJsonStr += ",";				

				//convert strings to integers at start, then back to strings on OK
				if(valueMapToStrings != "" && valueMapToStrings != ConfigurationAPI._DEFAULT)
				{
					if(valueMapToStringsArr[(transGrid[r][c]|0) - minValue] !== undefined) 
						dataJsonStr += '"' + valueMapToStringsArr[(transGrid[r][c]|0) - minValue].trim() + '"';
					else 
						dataJsonStr += '"' + MAP_UNDEFINED + '"';
				}
				else 
					dataJsonStr += transGrid[r][c];
			}
			dataJsonStr += "]";
		}
		dataJsonStr += "\n]";
		okHandler(dataJsonStr); //empty array indicates nothing done
		return false;
	} //end localOkClickHandler()

	document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID +
				"-cancel").onclick = localCancelClickHandler;

	document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID +
				"-ok").onclick = localOkClickHandler;

	//:::::::::::::::::::::::::::::::::::::::::
	//localCreateMouseHandler ~~
	//	create mouseover handler
	function localCreateMouseHandler()
	{
		var stopProp = false; //used to stop contextmenu propagation
		var rLast = -1, cLast = -1; //to stop redoing calculations in mouse over
				//-2 is special all buttons
		var buttonDown = -1; //0 - left, 1 - middle, 2 - right

		//::::::::
		//localGetRowCol ~~
		//	returns -1 in r and c for nothing interesting
		//	returns -2 for special all buttons
		//	else returns r,c of cell identified by x,y
		function localGetRowCol(x,y) {
			x -= popSz.x + bmpX + 1;
			y -= popSz.y + bmpY + 1;
			var r = (y/cellH)|0;
			if(y < 0) r = -1; //handle negative fractions clipping to 0
			var c = (x/cellW)|0;
			if(x < 0) c = -1; //handle negative fractions clipping to 0
			var inRowBtnsX = (x >= - axisPaddingMargin - bmpBorderSize - butttonSz) &&
					(x <= - axisPaddingMargin - bmpBorderSize);
			var inColBtnsY = (y >= bmpH + axisPaddingMargin) &&
					(y <= bmpH + axisPaddingMargin + butttonSz + bmpBorderSize*2);

			//Debug.log("i x,y " + x + "," + y);
			//Debug.log("i r,c " + r + "," + c);
			//Debug.log("inRowBtnsX " + inRowBtnsX);
			//Debug.log("inColBtnsY " + inColBtnsY);

			//handle row buttons
			if(inRowBtnsX && r >= 0 && r < rows)
				return {"r":r, "c":-2};
			else if(inColBtnsY && c >= 0 && c < cols) //handle col buttons
				return {"r":-2, "c":c};
			else if(inRowBtnsX && inColBtnsY) //handle all button
				return {"r":-2, "c":-2};
			else if(r < 0 || c < 0 || r >= rows || c >= cols)
				return {"r":-1, "c":-1}; //is nothing
			return {"r":r, "c":c}; //else, is a cell
		} //end localGetRowCol()

		//::::::::
		//el.onmousemove ~~
		el.onmousemove = localHandleMouseMove;	
		//::::::::
		function localHandleMouseMove(event) 
		{
			var cell = localGetRowCol(event.pageX,event.pageY);
			var r = cell.r, c = cell.c;

			var cursorT = (event.pageX - popSz.x - bmpX);
			if(cursorT < 0) cursorT = 0;
			if(cursorT > bmpW) cursorT = bmpW;

			cursorInfo.style.left = (event.pageX - popSz.x +
					//(c >= cols/2?-cursorInfo.innerHTML.length*8-20:2)) +
					//smooth transition from left-most to right-most info position above cursor
					(cursorT)/bmpW*(-cursorInfo.innerHTML.length*8-20) + (bmpW-cursorT)/bmpW*(2))+
							"px";
			cursorInfo.style.top = (event.pageY - popSz.y - 35) + "px";

			//center header cursor info
			hdrCursorInfo.style.left = (bmpX + bmpW/2 +
					(-332)/2) + "px"; //hdrCursorInfo.style.width = "320px"; + padding*2 + border*2
			hdrCursorInfo.style.top = (bmpY - 45) + "px";


			if(rLast == r && cLast == c)
				return; //already done for this cell, so prevent excessive work
			rLast = r; cLast = c;

			if(r == -1 || c == -1) //handle no select case
			{
				//mouse off interesting things
				rLast = -1; cLast = -1;
				bmpOverlay.style.display = "none";
				cursorInfo.style.display = "none";
				hdrCursorInfo.style.display = "none";
				return;
			}

			cursorInfo.style.display = "block";
			//hdrCursorInfo.style.display = "block"; //removed from display.. could delete if unneeded?

			var transRC;
			var infoStr;

			//handle row buttons
			if(r != -2 && c == -2)
			{
				if(doSnakeColumns)
					transRC = localConvertGridToRowCol(r,
							doDisplayColsAscending?0:cols-1);
				else
					transRC = localConvertGridToRowCol(r,0);

				//make mouse over bitmap
				{
					bmpOverlay.src = ConfigurationAPI.getOnePixelPngData([216,188,188]);//canvas.toDataURL();

					bmpOverlay.style.left = (bmpX - axisPaddingMargin - bmpBorderSize - butttonSz) + "px";
					bmpOverlay.style.top = (bmpY + r*cellH - 1 + (r?bmpGridThickness+bmpBorderSize*2:0)) + "px";
					bmpOverlay.style.width = (butttonSz) + "px";
					bmpOverlay.style.height = (cellH - (r?bmpGridThickness+bmpBorderSize*2:0)) + "px";
					bmpOverlay.style.display = "block";
				}

				infoStr = "Set all pixels in row " + transRC[0] + ".";
			}
			else if(r == -2 && c != -2) //handle col buttons
			{
				if(doSnakeRows)
					transRC = localConvertGridToRowCol(
							doDisplayRowsAscending?0:rows-1,c);
				else
					transRC = localConvertGridToRowCol(0,c);


				//make mouse over bitmap
				{
					bmpOverlay.src = ConfigurationAPI.getOnePixelPngData([216,188,188]);//canvas.toDataURL();

					bmpOverlay.style.left = (bmpX + c*cellW - 1 + (c?bmpGridThickness+bmpBorderSize*2:0)) + "px";
					bmpOverlay.style.top = (bmpY + bmpH + axisPaddingMargin - bmpBorderSize) + "px";
					bmpOverlay.style.width = (cellW + 1 - (c?bmpGridThickness+bmpBorderSize*2:0)) + "px";
					bmpOverlay.style.height = (butttonSz) + "px";
					bmpOverlay.style.display = "block";
				}

				infoStr = "Set all pixels in column " + transRC[1] + ".";
			}
			else if(r == -2 && c == -2) //handle all button
			{
				//make mouse over bitmap
				{
					bmpOverlay.src = ConfigurationAPI.getOnePixelPngData([216,188,188]);//canvas.toDataURL();

					bmpOverlay.style.left = (bmpX - axisPaddingMargin - bmpBorderSize - butttonSz) + "px";
					bmpOverlay.style.top = (bmpY + bmpH + axisPaddingMargin - bmpBorderSize) + "px";
					bmpOverlay.style.width = (butttonSz) + "px";
					bmpOverlay.style.height = (butttonSz) + "px";
					bmpOverlay.style.display = "block";
				}

				infoStr = "Set all pixels.";
			}
			else //pixel case
			{
				transRC = localConvertGridToRowCol(r,c);

				//have mouse over bitmap
				{
					//make a partial alpha overlay that lightens or darkens
					//	depending on pixel color
					var overClr = (bmpDataImage.data[(r*cols+c)*4+0] +
							bmpDataImage.data[(r*cols+c)*4+1] +
							bmpDataImage.data[(r*cols+c)*4+2]) < (256+128)?255:0;

					bmpOverlay.src = ConfigurationAPI.getOnePixelPngData(
							[overClr,overClr,overClr,100]);

					bmpOverlay.style.left = (bmpX + c*cellW) + "px";
					bmpOverlay.style.top = (bmpY + r*cellH) + "px";
					bmpOverlay.style.width = (cellW) + "px";
					bmpOverlay.style.height = (cellH) + "px";
					bmpOverlay.style.display = "block";
				}

				//position cursor info
				infoStr = "Value = " + bmpData[r][c];
				if(valueMapToStrings != "" && valueMapToStrings != ConfigurationAPI._DEFAULT)
				{
					if(valueMapToStringsArr[(bmpData[r][c]|0) - minValue]) //minValue maps to index 0
						infoStr += "/" + valueMapToStringsArr[(bmpData[r][c]|0) - minValue].trim();
					else 
						infoStr += "/" + MAP_UNDEFINED;
				}
				infoStr += " @ (Row,Col) = (" +
						transRC[0] + "," + transRC[1] + ")";
			}
			cursorInfo.innerHTML = infoStr;
			hdrCursorInfo.innerHTML = infoStr;

			//Debug.log("r,c " + r + "," + c);
			if(r == -2 && c == -2)
				return;	//prevent mouse over execution of all button (assume it's accidental)

			if(buttonDown >= 0)
			{
				stopProp = true;
				localSetBitMap(r,c); //set bitmap data
			}

		} //end mouse move

		//::::::::
		//el.onmousedown ~~
		el.onmousedown = function(event) {

			var cell = localGetRowCol(event.pageX,event.pageY);
			var r = cell.r, c = cell.c;

			//Debug.log("click which " + event.which);
			//Debug.log("click button " + event.button);
			buttonDown = event.button;

			if(r == -1 || c == -1) //handle no select case
			{
				rLast = -1; cLast = -1; //reset for mouse move
				stopProp = false;
				return;
			}

			rLast = r; cLast = c;
			localSetBitMap(r,c); //set bitmap data

			stopProp = true;
			event.stopPropagation();

			rLast = -1; cLast = -1; //reset for mouse move
			localHandleMouseMove(event); //display change

		} //end mouse down

		//::::::::
		//el.onmouseup ~~
		el.onmouseup = function(event) {
			//Debug.log("click up ");
			buttonDown = -1;
		} //end mouse up

		//::::::::
		//el.oncontextmenu ~~
		el.oncontextmenu = function(event) {
			//Debug.log("click stopProp " + stopProp);

			if(stopProp)
			{
				stopProp = false;
				event.stopPropagation();
				return false;
			}
		} //end oncontextmenu

		//::::::::
		//localSetBitMap ~~
		function localSetBitMap(r,c)
		{

			Debug.log("set r,c " + buttonDown + " @ " + r + "," + c );
			buttonDown = buttonDown?1:0; //	0=left-click, 1=right-click

			var maxr = r==-2?rows-1:r;
			var minr = r==-2?0:r;
			var maxc = c==-2?cols-1:c;
			var minc = c==-2?0:c;

			for(r=minr;r<=maxr;++r)
				for(c=minc;c<=maxc;++c)
				{
					bmpData[r][c] = clickValues[buttonDown];
					bmpDataImage.data[(r*cols + c)*4 + 0] =
							clickColors[buttonDown][0];
					bmpDataImage.data[(r*cols + c)*4 + 1] =
							clickColors[buttonDown][1];
					bmpDataImage.data[(r*cols + c)*4 + 2] =
							clickColors[buttonDown][2];
					bmpDataImage.data[(r*cols + c)*4 + 3] =
							clickColors[buttonDown][3];
				}

			bmpContext.putImageData(bmpDataImage,0,0);
			bmp.src = bmpCanvas.toDataURL();
		}// end localSetBitMap

	} localCreateMouseHandler();

	//:::::::::::::::::::::::::::::::::::::::::
	//localValidateInputs ~~
	//	returns false if inputs are invalid
	//	else true.
	function localValidateInputs()
	{
		// extract bitMapInfo parameters:
		//	must match TableEditor js handling:

		//		[ //types => 0:string, 1:bool (default no),
		//		  //2:bool (default yes), 3:color
		//
		// 0		  0,//"Number of Rows",
		// 1		  0,//"Number of Columns",
		// 2		  0,//"Cell Bit-field Size",
		// 3		  0,//"Min-value Allowed",
		// 4		  0,//"Max-value Allowed",
		// 5		  0,//"Value step-size Allowed",
		// 6		  0,//"Display Aspect H:W",
		// 7		  3,//"Min-value Cell Color",
		// 8		  3,//"Mid-value Cell Color",
		// 9		  3,//"Max-value Cell Color",
		// 10		  3,//"Absolute Min-value Cell Color",
		// 11		  3,//"Absolute Max-value Cell Color",
		// 12		  1,//"Display Rows in Ascending Order",
		// 13		  2,//"Display Columns in Ascending Order",
		// 14		  1,//"Snake Double Rows",
		// 15		  1,//"Snake Double Columns",
		// 16		  1,//"Allow Floating Point",
		// 17		  0// "Value Map to Strings"
		// 	  ];

		//veryify bitmap params is expected size
		if(bitMapParams.length != 16 && bitMapParams.length != 18)
		{
			Debug.log("Illegal input parameters, expecting 18 parameters and count is " + bitMapParams.length + ". There is a mismatch in Table Editor handling of BitMap fields (contact an admin to fix)." +
					"\nHere is a printout of the input parameters: " + bitMapParams,Debug.HIGH_PRIORITY);
			return false;
		}

		rows = bitMapParams[0]|0;
		cols = bitMapParams[1]|0;
		bitFieldSize = bitMapParams[2]|0;

		//js can only handle 31 bits unsigned!! hopefully no one needs it?

		if(rows < 1 || rows >= 1<<30)
		{
			Debug.err("Illegal input parameters, rows of " + rows + " is illegal. " +
					"(rows possible values are from 1 to " + ((1<<30)-1) + ".)");
			return false;
		}
		if(cols < 1 || cols >= 1<<30)
		{
			Debug.err("Illegal input parameters, cols of " + cols + " is illegal. " +
					"(cols possible values are from 1 to " + ((1<<30)-1) + ".)");
			return false;
		}
		if(bitFieldSize < 1 || bitFieldSize > 32)
		{
			Debug.err("Illegal input parameters, bitFieldSize of " + bitFieldSize + " is illegal. " +
					"(bitFieldSize possible values are from 1 to " + (32) + ".)");
			return false;
		}
		bitMask = 0;
		for(let i=0;i<bitFieldSize;++i)
			bitMask |= 1 << i;
		bitMask = bitMask >>> 0; // >>> 0 converts to unsigned 32-bit integer

		minValue = bitMapParams[3] == ConfigurationAPI._DEFAULT || bitMapParams[3] == ""?0:(parseFloat(bitMapParams[3]));
		maxValue = bitMapParams[4] == ConfigurationAPI._DEFAULT || bitMapParams[4] == ""?bitMask:(parseFloat(bitMapParams[4]));
		if(maxValue < minValue)
			maxValue = bitMask;
		midValue = (maxValue + minValue)/2; //used for color calcs
		stepValue = bitMapParams[5] == ConfigurationAPI._DEFAULT || bitMapParams[5] == ""?1:(parseFloat(bitMapParams[5]));

		Debug.log("minValue, maxValue, stepValue",minValue, maxValue, stepValue);

		if(minValue < 0 || minValue > bitMask)
		{
			Debug.err("Illegal input parameters, minValue of " + minValue + " is illegal. " +
					"(minValue possible values are from 0 to " + bitMask + ".)");
			return false;
		}
		if(maxValue < 0 || maxValue > bitMask)
		{
			Debug.err("Illegal input parameters, maxValue of " + maxValue + " is illegal. " +
					"(maxValue possible values are from 0 to " + bitMask + ".)");
			return false;
		}
		if(minValue > maxValue)
		{
			Debug.err("Illegal input parameters, minValue > maxValue is illegal.");
			return false;
		}
		if(stepValue < 1 || stepValue > maxValue - minValue)
		{
			Debug.err("Illegal input parameters, stepValue of " + stepValue + " is illegal. " +
					"(stepValue possible values are from 1 to " + (maxValue - minValue) + ".)");
			return false;
		}
		if((((maxValue-minValue)/stepValue) >>> 0 /* force 32-bit integer */) != 
			(maxValue-minValue)/stepValue)
		{
			Debug.err("Illegal input parameters, maxValue of " + maxValue +
					" must be an integer number of stepValue (stepValue=" + stepValue +
					") steps away from minValue (minValue=" + minValue + ").");
			return false;
		}

		if(bitMapParams[6] != "" &&
				bitMapParams[6] != ConfigurationAPI._DEFAULT)
		{
			forcedAspectH = bitMapParams[6].split(':');
			if(forcedAspectH.length != 2)
			{
				Debug.err("Illegal input parameter, expecting ':' in string defining cell display aspect ratio " +
						"Height:Width (e.g. 100:150)." +
						"\nInput aspect ratio string '" + bitMapParams[6] + "' is invalid.");
				return false;
			}
			forcedAspectW = forcedAspectH[1].trim()|0;
			forcedAspectH = forcedAspectH[0].trim()|0;
		}
		else //default to 1:1
			forcedAspectW = forcedAspectH = 1;


		//colors
		minValueColor = bitMapParams[7] == ConfigurationAPI._DEFAULT || bitMapParams[7] == ""?"red":bitMapParams[7];
		midValueColor = bitMapParams[8] == ConfigurationAPI._DEFAULT || bitMapParams[8] == ""?"yellow":bitMapParams[8];
		maxValueColor = bitMapParams[9] == ConfigurationAPI._DEFAULT || bitMapParams[9] == ""?"green":bitMapParams[9];
		floorValueColor = bitMapParams[10] == ConfigurationAPI._DEFAULT || bitMapParams[10] == ""?minValueColor:bitMapParams[10];
		ceilValueColor = bitMapParams[11] == ConfigurationAPI._DEFAULT || bitMapParams[11] == ""?maxValueColor:bitMapParams[11];

		//convert to arrays
		minValueColor = DesktopContent.getColorAsRGBA(minValueColor).split("(")[1].split(")")[0].split(",");
		midValueColor = DesktopContent.getColorAsRGBA(midValueColor).split("(")[1].split(")")[0].split(",");
		maxValueColor = DesktopContent.getColorAsRGBA(maxValueColor).split("(")[1].split(")")[0].split(",");
		ceilValueColor = DesktopContent.getColorAsRGBA(ceilValueColor).split("(")[1].split(")")[0].split(",");
		floorValueColor = DesktopContent.getColorAsRGBA(floorValueColor).split("(")[1].split(")")[0].split(",");

		//load bools
		doDisplayRowsAscending = bitMapParams[12] == "Yes"?1:0;
		doDisplayColsAscending = bitMapParams[13] == "Yes"?1:0;
		doSnakeColumns = bitMapParams[14] == "Yes"?1:0;
		doSnakeRows = bitMapParams[15] == "Yes"?1:0;
		if(bitMapParams.length > 16)
		{
			allowFloatingPoint = bitMapParams[16] == "Yes"?1:0;
			valueMapToStrings = bitMapParams[17];
			valueMapToStringsArr = valueMapToStrings.split(',');
			//remove all white space
			for(let i=0; i<valueMapToStringsArr.length; ++i)
				valueMapToStringsArr[i] = valueMapToStringsArr[i].trim();		
			Debug.log("valueMapToStringsArr",valueMapToStringsArr);
		}

		if(doSnakeColumns && doSnakeRows)
		{
			Debug.err("Can not have a bitmap that snakes both rows and columns, please choose one or the other (or neither).");
			return false;
		}

		return true;
	} //end localValidateInputs()

	//:::::::::::::::::::::::::::::::::::::::::
	//localInitBitmapData ~~
	//	load bitmap data from input string <initBitMapValue>
	//		and initialize bmpDataImage
	//	treat <initBitMapValue> as JSON 2D array string
	function localInitBitmapData()
	{
		//create empty array for bmpData
		bmpData = [];

		var useDefault = initBitMapValue.length == 0 ||
			(initBitMapValue.length == ("default").length &&
			initBitMapValue.toLowerCase() == "default");
		if(!useDefault)
		{
			try
			{
				var jsonMatrix = JSON.parse(initBitMapValue);

				//create place holder 2D array for fill
				for(var r=0;r<rows;++r)
				{
					bmpData.push([]); //create empty row array

					for(var c=0;c<cols;++c)
					{
						if(valueMapToStrings != "" && valueMapToStrings != ConfigurationAPI._DEFAULT)
							bmpData[r][c] = MAP_UNDEFINED;
						else
							bmpData[r][c] = 0;
					}
				}
				localConvertFullRowColToGrid(jsonMatrix); //also sets bmpDataImage
			}
			catch(err)
			{
				Debug.log("The input initial value of the bitmap is illegal JSON format - forcing values to legal values. " +
						"See error below: \n\n" + err,Debug.HIGH_PRIORITY);
				// useDefault = true;
			}
		}

		if(useDefault)
		{
			Debug.log("Defaulting to initial bitmap with min-value fill.");

			//min-value fill
			var color;
			for(var r=0;r<rows;++r)
			{
				bmpData.push([]); //create empty row array

				for(var c=0;c<cols;++c)
				{
					bmpData[r][c] = minValue; //min-value entry in column

					color = //localConvertValueToRGBA(bmpData[r][c]);
						ConfigurationAPI.bitMapDialogConvertValueToRGBA(bmpData[r][c],
							minValue, maxValue, minValueColor, midValueColor, maxValueColor, 
							floorValueColor, ceilValueColor);
					bmpDataImage.data[(r*cols + c)*4+0]=color[0];
					bmpDataImage.data[(r*cols + c)*4+1]=color[1];
					bmpDataImage.data[(r*cols + c)*4+2]=color[2];
					bmpDataImage.data[(r*cols + c)*4+3]=color[3];
				}
			}

			bmpContext.putImageData(bmpDataImage,0,0);
			bmp.src = bmpCanvas.toDataURL();
		}
	} //end localInitBitmapData()

	//:::::::::::::::::::::::::::::::::::::::::
	//localConvertGridToRowCol ~~
	//	grid row col is always 0,0 in top left
	//	but there might be translation for user (imagine snaked columns)
	//		inputs: doDisplayRowsAscending, doDisplayColsAscending, doSnakeColumns, doSnakeRows,
	//			...rows, cols
	//	return translated row,col
	function localConvertGridToRowCol(r,c)
	{
		var retVal = [r,c];
		if(!doDisplayRowsAscending) //reverse row order so flip row
			retVal[0] = rows - 1 - retVal[0];
		if(!doDisplayColsAscending) //reverse col order so flip col
			retVal[1] = cols - 1 - retVal[1];
		if(doSnakeRows && retVal[0]%2 == 1) //snake row so flip col
			retVal[1] = cols + (cols - 1 - retVal[1]);
		if(doSnakeColumns && retVal[1]%2 == 1) //snake col so flip row
			retVal[0] = rows + (rows - 1 - retVal[0]);

		return retVal;
	} //end localConvertGridToRowCol()

	// //:::::::::::::::::::::::::::::::::::::::::
	// //localConvertValueToRGBA ~~
	// //	conver bitfield value to RGBA based on input parameters
	// function localConvertValueToRGBA(val)
	// {
	// 	if(val >= maxValue)
	// 		return [ceilValueColor[0],
	// 				ceilValueColor[1],
	// 				ceilValueColor[2],
	// 				  255]; //always max alpha

	// 	if(val <= minValue)
	// 		return [floorValueColor[0],
	// 				floorValueColor[1],
	// 				floorValueColor[2],
	// 				  255]; //always max alpha

	// 	if(val == midValue)	//avoid dividing by 0 in blend
	// 		return [midValueColor[0],
	// 				midValueColor[1],
	// 				midValueColor[2],
	// 				  255]; //always max alpha

	// 	//blend lower half
	// 	var t;
	// 	if(val <= midValue)
	// 	{
	// 		t = (val - minValue)/(midValue - minValue);
	// 		return [minValueColor[0]*(1-t) + t*midValueColor[0],
	// 				minValueColor[1]*(1-t) + t*midValueColor[1],
	// 				minValueColor[2]*(1-t) + t*midValueColor[2],
	// 				  255]; //always max alpha
	// 	}
	// 	//blend upper half
	// 	//if(val >= midValue)
	// 	{
	// 		t = (val - midValue)/(maxValue - midValue);
	// 		return [midValueColor[0]*(1-t) + t*maxValueColor[0],
	// 				midValueColor[1]*(1-t) + t*maxValueColor[1],
	// 				midValueColor[2]*(1-t) + t*maxValueColor[2],
	// 				  255]; //always max alpha
	// 	}
	// }


	//:::::::::::::::::::::::::::::::::::::::::
	//localConvertFullGridToRowCol ~~
	//	convert bmpData matrix to a matrix with translated Row,Col pairs
	function localConvertFullGridToRowCol()
	{
		var retArr = [];
		var convertedRC;
		for(var r=0;r<rows;++r)
			for(var c=0;c<cols;++c)
			{
				convertedRC = localConvertGridToRowCol(r,c);
				//if doSnakeColumns, odd columns are considered to be in even column
				if(doSnakeColumns)
					convertedRC[1] = (convertedRC[1]/2)|0;
				//if doSnakeRows, odd rows are considered to be in even row
				if(doSnakeRows)
					convertedRC[0] = (convertedRC[0]/2)|0;

				if(retArr[convertedRC[0]] === undefined)
					retArr[convertedRC[0]] = []; //create row for first time
				retArr[convertedRC[0]][convertedRC[1]] = bmpData[r][c];
			}
		return retArr;
	}

	//:::::::::::::::::::::::::::::::::::::::::
	//localConvertFullRowColToGrid ~~
	//	convert a matrix with translated Row,Col pairs to bmpData matrix
	//		updates bmpDataImage also and bmp display
	function localConvertFullRowColToGrid(srcMatrix)
	{
		var convertedRC;
		var color;
		var noErrors = true;
		var errStr = "";
		for(var r=0;r<rows;++r)
			for(var c=0;c<cols;++c)
			{
				convertedRC = localConvertGridToRowCol(r,c);

				//if doSnakeColumns, odd columns are considered to be in even column
				if(doSnakeColumns)
					convertedRC[1] = (convertedRC[1]/2)|0;
				//if doSnakeRows, odd rows are considered to be in even row
				if(doSnakeRows)
					convertedRC[0] = (convertedRC[0]/2)|0;
				try
				{
					//convert strings to integers at start, then back to strings on OK
					if(valueMapToStrings != "" && valueMapToStrings != ConfigurationAPI._DEFAULT)
					{
						if((srcMatrix[convertedRC[0]][convertedRC[1]]|0) == srcMatrix[convertedRC[0]][convertedRC[1]])
						{
							Debug.log("Interpreting as number.. so leaving as number. Perhaps map to string is newly setup.");
							bmpData[r][c] = srcMatrix[convertedRC[0]][convertedRC[1]];
						}
						else 
						{
							bmpData[r][c] = valueMapToStringsArr.indexOf(srcMatrix[convertedRC[0]][convertedRC[1]]);
							if(bmpData[r][c] < 0) 
								bmpData[r][c] = maxValue; //default to maxValue (more likely to map to UNDEFINED)
							else 
								bmpData[r][c] += minValue; //add offset
						}
					}
					else
						bmpData[r][c] = srcMatrix[convertedRC[0]][convertedRC[1]];

					if(bmpData[r][c] < minValue)
					{
						bmpData[r][c] = minValue; //force to legal value
						throw("There was an illegal value less than minValue: " +
								bmpData[r][c] + " < " + minValue + " @ (row,col) = (" +
								convertedRC[0] + "," + convertedRC[0] + ")");
					}
					if(bmpData[r][c] > maxValue)
					{
						bmpData[r][c] = maxValue; //force to legal value
						throw("There was an illegal value greater than maxValue: " +
								bmpData[r][c] + " > " + maxValue + " @ (row,col) = (" +
								convertedRC[0] + "," + convertedRC[0] + ")");
					}
					if((!allowFloatingPoint || stepValue != 1) &&
							(((bmpData[r][c]-minValue)/stepValue)|0) != (bmpData[r][c]-minValue)/stepValue)
					{
						let tmpVal = bmpData[r][c];
						bmpData[r][c] = (minValue + stepValue*(((bmpData[r][c]-minValue)/stepValue)|0)); //force to legal value
						throw("There was an illegal value not following stepValue from minValue: " +
								tmpVal + " != " +
								(minValue + stepValue*(((tmpVal-minValue)/stepValue)|0)) +
								" @ (row,col) = (" +
								convertedRC[0] + "," + convertedRC[0] + ")");
					}
					color = 
						ConfigurationAPI.bitMapDialogConvertValueToRGBA(bmpData[r][c],
							minValue, maxValue, minValueColor, midValueColor, maxValueColor, 
							floorValueColor, ceilValueColor);
					bmpDataImage.data[(r*cols + c)*4+0]=color[0];
					bmpDataImage.data[(r*cols + c)*4+1]=color[1];
					bmpDataImage.data[(r*cols + c)*4+2]=color[2];
					bmpDataImage.data[(r*cols + c)*4+3]=color[3];
				}
				catch(err)
				{noErrors = false; errStr += "\n" + err;} //ignore errors
			}
		bmpContext.putImageData(bmpDataImage,0,0);
		bmp.src = bmpCanvas.toDataURL();

		if(!noErrors)
			throw("Input matrix was " +
					"dimension [row,col] = [" + srcMatrix.length + "," +
					(srcMatrix.length?srcMatrix[0].length:0) + "].\n\n" + 
					errStr);
	}

	//:::::::::::::::::::::::::::::::::::::::::
	//localCreateBitmap ~~
	//	create bitmap
	function localCreateBitmap()
	{
		bmp =  document.createElement("img");
		bmp.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap");

		bmpGrid = document.createElement("div"); //div of row and col grid divs
		bmpGrid.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-grid");

		bmpOverlay =  document.createElement("img");
		bmpOverlay.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-overlay");

		cursorInfo = document.createElement("div"); //div of row and col grid divs
		cursorInfo.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-cursor-info");
		hdrCursorInfo = document.createElement("div"); //div of row and col grid divs
		hdrCursorInfo.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-cursor-hdrInfo");

		//create divs for r,c text display
		rowLeftNums = document.createElement("div");
		rowRightNums = document.createElement("div");
		colTopNums = document.createElement("div");
		colBottomNums = document.createElement("div");
		rowLeftNums.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-numbers-rowLeft");
		rowRightNums.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-numbers-rowRight");
		colTopNums.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-numbers-colTop");
		colBottomNums.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-numbers-colBottom");

		var tmpEl;

		//group creation of row/col elements
		{
			bmpCanvas=document.createElement("canvas");
			bmpCanvas.width = cols;
			bmpCanvas.height = rows;
			bmpContext = bmpCanvas.getContext("2d");

			if(bmpDataImage) delete bmpDataImage;
			bmpDataImage = bmpContext.createImageData(cols,rows);

			//add outside box div as child 0
			tmpEl = document.createElement("div");
			tmpEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-grid-box");
			bmpGrid.appendChild(tmpEl);

			for(var i=0;i<rows;++i)
			{
				if(i < rows - 1) //add internal row divs to start
				{
					tmpEl = document.createElement("div");
					tmpEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-grid-row-dark");
					bmpGrid.appendChild(tmpEl);
					tmpEl = document.createElement("div");
					tmpEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-grid-row");
					bmpGrid.appendChild(tmpEl);
				}

				for(var j=0;j<cols;++j)
				{
					if(i == rows-1 & j < cols-1) //add internal col divs at end
					{
						tmpEl = document.createElement("div");
						tmpEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-grid-col-dark");
						bmpGrid.appendChild(tmpEl);
						tmpEl = document.createElement("div");
						tmpEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-grid-col");
						bmpGrid.appendChild(tmpEl);
					}
				}
			}

			bmpContext.putImageData(bmpDataImage,0,0);
			bmp.src = bmpCanvas.toDataURL();
		}

		bmp.style.position = "absolute";
		bmp.draggable = false; //prevent dragging

		bmpGrid.style.position = "absolute";

		bmpOverlay.style.display = "none";
		bmpOverlay.style.position = "absolute";
		bmpOverlay.draggable = false; //prevent dragging

		cursorInfo.style.position = "absolute";
		cursorInfo.style.display = "none";
		hdrCursorInfo.style.position = "absolute";
		hdrCursorInfo.style.display = "none";
		hdrCursorInfo.style.width = "320px";

		rowLeftNums.style.position = "absolute";
		rowRightNums.style.position = "absolute";
		colTopNums.style.position = "absolute";
		colBottomNums.style.position = "absolute";

		el.appendChild(bmp);
		el.appendChild(bmpGrid);
		el.appendChild(bmpOverlay);

		el.appendChild(hdrCursorInfo); //insert hdrInfo first so cursorInfo goes over top of it
		el.appendChild(cursorInfo);

		el.appendChild(rowLeftNums);
		el.appendChild(rowRightNums);
		el.appendChild(colTopNums);
		el.appendChild(colBottomNums);
	} //end localCreateBitmap()

	//:::::::::::::::::::::::::::::::::::::::::
	//localCreateGridButtons ~~
	//	create all (row,col) buttons
	function localCreateGridButtons()
	{
		allRowBtns = document.createElement("div"); //div of all row button divs

		allColBtns = document.createElement("div"); //div of all col button divs

		allBtn = document.createElement("div"); //div of all button
		allBtn.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-btn-all");

		var tmpEl;
		for(var i=0;i<rows;++i)
		{
			tmpEl = document.createElement("div");
			tmpEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-btn-all");
			tmpEl.style.position = "absolute";
			allRowBtns.appendChild(tmpEl);
		}
		for(var i=0;i<cols;++i)
		{
			tmpEl = document.createElement("div");
			tmpEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-btn-all");
			tmpEl.style.position = "absolute";
			allColBtns.appendChild(tmpEl);
		}

		allRowBtns.style.position = "absolute";
		el.appendChild(allRowBtns);
		allColBtns.style.position = "absolute";
		el.appendChild(allColBtns);
		allBtn.style.position = "absolute";
		el.appendChild(allBtn);
	}

	//:::::::::::::::::::::::::::::::::::::::::
	//localCreateHeader ~~
	//	create header
	function localCreateHeader()
	{
		hdr = document.createElement("div");
		hdr.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-header");

		var str = "";

		str += "<div style='float:left; margin: 0 0 20px 0;'>"; //field name and info container
		str += "<div style='float:left; '>";
		str += "<b>Target Table/UID/Field:</b> &quot;" + tableName + "/" + UIDName + "/" + fieldName + "&quot;";
		str += "</div>";

		str += "<div style='float:left; margin-left: 50px;'>";
		str += "<b>Number of [Rows,Cols]:</b> " + "[" + rows + "," + cols + "]";
		if(allowFloatingPoint)
			str += "<br>Allowing Floating point!";
		if(valueMapToStrings != "" && valueMapToStrings != ConfigurationAPI._DEFAULT)
			str += "<br><b>Integer-to-String Map (starting at min-value):</b> " + valueMapToStrings;
		str += "</div>";
		str += "</div>";//end field name and info container

		str += "<div style='float:right; '>";
		str += "<a id='" +
				ConfigurationAPI._POP_UP_DIALOG_ID +
				"-cancel' href='#'>Cancel</a>";
		str += "</div>";

		str += "<div id='clearDiv'></div>";

		str += "<div style='float:right; margin: 40px 20px -50px 0;'>";
		str += "<a id='" +
				ConfigurationAPI._POP_UP_DIALOG_ID +
				"-ok' href='#'>OK</a>";
		str += "</div>";

		str += "<div style='float:left; margin: 0 0 0 0;'>";
		for(var clickIndex=0;clickIndex<2;++clickIndex)
		{
			str += "<div style='float:left; margin: 5px 0 0 0;'>";
			str += "<div style='float:left; width:180px; text-align:right; margin-top: 3px;'>";
			str += (clickIndex?"Right":"Left") + "-Click Value:";
			str += "</div>";
			str += "<input class='" + ConfigurationAPI._POP_UP_DIALOG_ID +
					"-bitmap-scrollbar' style='float:left;' " +
					"type='range' min='" + minValue +
					"' max='" + maxValue + "' value='" + (clickIndex?maxValue:minValue) +
					"' step='" + stepValue +
					"' oninput='ConfigurationAPI.bitMapDialog.localUpdateScroll(" + clickIndex + ")' />";
			str += "<input class='" + ConfigurationAPI._POP_UP_DIALOG_ID +
					"-bitmap-btnInput' style='float:left; margin: 0 1px 0 5px;' " +
					"type='button' value='<' " +
					"onmousedown='ConfigurationAPI.bitMapDialog.localUpdateButtonInput(" + clickIndex + ",0,0)' " +
					"onmouseup='ConfigurationAPI.bitMapDialog.localUpdateButtonInput(" + clickIndex + ",0,1)' " +
					"/> ";
			str += "<input class='" + ConfigurationAPI._POP_UP_DIALOG_ID +
					"-bitmap-btnInput' style='float:left;' " +
					"type='button' value='>' " +
					"onmousedown='ConfigurationAPI.bitMapDialog.localUpdateButtonInput(" + clickIndex + ",1,0)' " +
					"onmouseup='ConfigurationAPI.bitMapDialog.localUpdateButtonInput(" + clickIndex + ",1,1)' " +
					"/> ";
			str += "<input class='" + ConfigurationAPI._POP_UP_DIALOG_ID +
					"-bitmap-textInput' style='float:left; margin: 0 5px 0 5px; width: 50px;' " +
					"type='text' " + //value come from scroll update at start
					"onchange='ConfigurationAPI.bitMapDialog.localUpdateTextInput(" + clickIndex + ",1)' " +
					"onkeydown='ConfigurationAPI.bitMapDialog.localUpdateTextInput(" + clickIndex + ",0)' " +
					"onkeyup='ConfigurationAPI.bitMapDialog.localUpdateTextInput(" + clickIndex + ",0)' " +
					"/>";
			str += "<img class='" + ConfigurationAPI._POP_UP_DIALOG_ID +
					"-bitmap-colorSample' style='float:left;width:25px; height:25px; margin: -2px 0 2px 0;' " +
					"ondragstart='return false;' " + //ondragstart for firefox
					"draggable='false'" +	//draggable for chrome
					"'/>";


			str += "</div>";

			str += "<div id='clearDiv'></div>";
		}
		str += "</div>";

		//add download upload buttons
        str += "<div style='float:left; margin: 5px 0 0 40px; display: flex; flex-direction: row; align-items: center;'>";
        str += "<select id='bitmap-download-dropdown'" + 
			   "onChange='ConfigurationAPI.bitMapDialog.localDownloadDropdownHandler()'" + 
			   "class='" + ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-download-dropdown'" +
			   "style='background-color: rgb(239, 239, 239); outline: 1px solid rgb(118, 118, 118); border-radius: 1px; border: none; width: auto; height:22px'>";
        str += "<option value=''>Download as..</option>";
        str += "<option value='csv'>CSV</option>";
        str += "<option value='bmp'>BMP</option>";
		str += "</select>";
		
        str += "<input class='" + ConfigurationAPI._POP_UP_DIALOG_ID +
                "-bitmap-btnCsv' style='float:left; margin: 0 0 0 10px;' " +
                "type='button' value='Upload CSV' " +
                "onclick='ConfigurationAPI.bitMapDialog.locaPopupUploadCSV()' " +
                "/> ";
        str += "</div>";

		hdr.innerHTML = str;
		hdr.style.overflowY = "auto";
		hdr.style.position = "absolute";

		var scrollEls = hdr.getElementsByClassName(ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-scrollbar");
		var textInputEls = hdr.getElementsByClassName(ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-textInput");
		var colorSampleEls = hdr.getElementsByClassName(ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-colorSample");


		//::::::::::
		//localDownloadDropdownHandler ~~
		ConfigurationAPI.bitMapDialog.localDownloadDropdownHandler = function() {
			var selectedValue = document.getElementById("bitmap-download-dropdown").value;
			if (selectedValue === "csv")
				ConfigurationAPI.bitMapDialog.localDownloadCSV();
			else if (selectedValue === "bmp")
				ConfigurationAPI.bitMapDialog.localDownloadBMP();
			document.getElementById("bitmap-download-dropdown").value = "";
		}

		//::::::::::
		//localUpdateScroll ~~
		ConfigurationAPI.bitMapDialog.localUpdateScroll = function(i)
		{
			Debug.log("localUpdateScroll " + i);

			if(allowFloatingPoint)
				clickValues[i] = parseFloat(scrollEls[i].value);
			else
				clickValues[i] = scrollEls[i].value|0;

			clickColors[i] = //localConvertValueToRGBA(clickValues[i]);
				ConfigurationAPI.bitMapDialogConvertValueToRGBA(clickValues[i],
					minValue, maxValue, minValueColor, midValueColor, maxValueColor, 
					floorValueColor, ceilValueColor);

			textInputEls[i].value = clickValues[i];
			colorSampleEls[i].src = ConfigurationAPI.getOnePixelPngData(clickColors[i]);
		};  //end localUpdateScroll

		//::::::::::
		//localUpdateTextInput ~~
		ConfigurationAPI.bitMapDialog.localUpdateTextInput = function(i,finalChange)
		{
			Debug.log("localUpdateTextInput " + textInputEls[i].value + " " + finalChange);
			
			let tmpNumber = parseFloat(textInputEls[i].value);
			if(isNaN(tmpNumber))
			{
				if(finalChange) //show error for final change
					Debug.err("Input value",textInputEls[i].value,"is not a valid number!");
				return;
			}

			if(allowFloatingPoint)
				clickValues[i] = tmpNumber;
			else //force int
				clickValues[i] = tmpNumber|0;

			if(finalChange)
			{
				if(clickValues[i] < minValue) clickValues[i] = minValue;
				if(clickValues[i] > maxValue) clickValues[i] = maxValue;
				if(!allowFloatingPoint || stepValue != 1)
					clickValues[i] = (((clickValues[i]-minValue)/stepValue)|0)*stepValue + minValue; //lock to step
				textInputEls[i].value = clickValues[i]; //fix value
			}
			else //try to continue with change, but if invalid just return
			{
				if(clickValues[i] < minValue) return;
				if(clickValues[i] > maxValue) return;
				if((!allowFloatingPoint || stepValue != 1) &&
					(((clickValues[i]-minValue)/stepValue)|0) != (clickValues[i]-minValue)/stepValue)
					return; //no locked to step value
				Debug.log("displaying change");
			}
			clickColors[i] = //localConvertValueToRGBA(clickValues[i]);
				ConfigurationAPI.bitMapDialogConvertValueToRGBA(clickValues[i],
					minValue, maxValue, minValueColor, midValueColor, maxValueColor, 
					floorValueColor, ceilValueColor);

			scrollEls[i].value = clickValues[i];
			colorSampleEls[i].src = ConfigurationAPI.getOnePixelPngData(clickColors[i]);
		};  //end localUpdateTextInput

		//::::::::::
		//localUpdateButtonInput ~~
		var mouseDownTimer = 0;
		ConfigurationAPI.bitMapDialog.localUpdateButtonInput = function(i,dir,mouseUp,delay)
		{
			window.clearInterval(mouseDownTimer);
			if(mouseUp) //mouse up
			{
				Debug.log("cancel mouse down");
				return;
			}
			//else mouse is down so set repeat interval
			mouseDownTimer = window.setInterval(function()
					{
				//faster and faster
				if(delay > 50) delay -= 50;
				ConfigurationAPI.bitMapDialog.localUpdateButtonInput(i,dir,0,50); //same as this call
					},delay!==undefined?delay:300);

			Debug.log("localUpdateButtonInput " + textInputEls[i].value + " " + dir);

			clickValues[i] = clickValues[i] + (dir?stepValue:-stepValue);
			if(clickValues[i] < minValue) clickValues[i] = minValue;
			if(clickValues[i] > maxValue) clickValues[i] = maxValue;

			clickColors[i] = //localConvertValueToRGBA(clickValues[i]);
				ConfigurationAPI.bitMapDialogConvertValueToRGBA(clickValues[i],
					minValue, maxValue, minValueColor, midValueColor, maxValueColor, 
					floorValueColor, ceilValueColor);

			textInputEls[i].value = clickValues[i];
			scrollEls[i].value = clickValues[i];
			colorSampleEls[i].src = ConfigurationAPI.getOnePixelPngData(clickColors[i]);

		};  //end localUpdateButtonInput

		//::::::::::
		//localDownloadCSV ~~
		// online people complain that this doesn't work for big files.
		// Note: if files are too big, could have server create csv file
		//	then link to <a href='/WebPath/download.csv' download></a>
		//	Note: href must be  encodeURI(dataStr) if data not already encoded
		ConfigurationAPI.bitMapDialog.localDownloadCSV = function()
		{
			var transGrid = localConvertFullGridToRowCol();
			console.log(transGrid);

			var dataStr = "data:text/csv;charset=utf-8,";

			for(var r=0;r<transGrid.length;++r)
			{
				if(r) dataStr += encodeURI("\n"); //encoded \n
				for(var c=0;c<transGrid[0].length;++c)
				{
					if(c) dataStr += ",";
					dataStr += transGrid[r][c];
				}
			}

			Debug.log("ConfigurationAPI.bitMapDialog.localDownloadCSV dataStr=" + dataStr);

			var link = document.createElement("a");
			link.setAttribute("href", dataStr); //double encode, so encoding remains in CSV
			link.setAttribute("style", "display:none");
			link.setAttribute("download", tableName + "_" + UIDName + "_" +
					fieldName + "_download.csv");
			document.body.appendChild(link); // Required for FF

			link.click(); // This will download the data file named "my_data.csv"

			link.parentNode.removeChild(link);
		}; //end localDownloadCSV

		//::::::::::
		//localDownloadBMP ~~
		ConfigurationAPI.bitMapDialog.localDownloadBMP = function()
		{
			var transGrid = localConvertFullGridToRowCol();

			var height = transGrid.length;
			var width = transGrid[0].length;

			let maxVal = Math.max(...transGrid.flat());
			if (maxVal === 0) maxVal = 1;

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d');
			const imageData = ctx.createImageData(width, height);

			for (let i = 0; i < height; i++)
			{
				for (let j = 0; j < width; j++)
				{
					const normalized = transGrid[i][j] / maxVal;

					const r = Math.round(255 * (1 - normalized));
					const g = Math.round(255 * normalized);
					const b = 0;

					const flippedI = height - 1 - i;
					const index = (flippedI * width + j) * 4;
					imageData.data[index + 0] = r;
					imageData.data[index + 1] = g;
					imageData.data[index + 2] = b;
					imageData.data[index + 3] = 255;
				}
			}

			ctx.putImageData(imageData, 0, 0);

			const link = document.createElement('a');
			link.href = canvas.toDataURL('image/bmp');
			link.download = tableName + "_" + UIDName + "_" + fieldName + "_download.bmp";

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		};


		//::::::::::
		//locaUploadCSV ~~
		ConfigurationAPI.bitMapDialog._csvUploadDataStr; //uploaded csv table ends up here
		ConfigurationAPI.bitMapDialog.locaUploadCSV = function()
		{
			var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
			Debug.log("locaUploadCSV ConfigurationAPI.bitMapDialog._csvUploadDataStr = " + ConfigurationAPI.bitMapDialog._csvUploadDataStr);
			var srcDataStr = ConfigurationAPI.bitMapDialog._csvUploadDataStr.split('\n');
			var src = []; //src = [r][c]
			var expectedCols = null;
			
			for (var i=0; i<srcDataStr.length;++i)
			{
				var row = srcDataStr[i].split(',');

				if (expectedCols === null)
					expectedCols = row.length;

				if (row.length !== expectedCols)
				{
					Debug.warn("Row " + i + " has " + row.length +
						" columns, but expected " + expectedCols + " columns. " +
						"Row will be ignored in upload.", Debug.HIGH_PRIORITY);
					continue;
				}

				for (var j = 0; j < row.length; ++j)
				{
					if (row[j].trim() === "")
					{
						Debug.warn("Row " + i + ", Col " + j +
							" is empty. This will be interpreted as 0 in upload.", Debug.HIGH_PRIORITY);
						row[j] = "0";
					}

					var cellValue = Number(row[j]);
					if(isNaN(cellValue))
					{
						Debug.warn("Row " + i + ", Col " + j +
							" has non-numeric value '" + row[j] +
							"'. This will be interpreted as 0 in upload.", Debug.HIGH_PRIORITY);
						row[j] = "0";
					}
					else if (cellValue > maxValue)
					{
						Debug.warn("Row " + i + ", Col " + j +
							" has value " + cellValue +
							" which is greater than maxValue " + maxValue +
							". This will be interpreted as " + maxValue + " in upload.", Debug.HIGH_PRIORITY);
						row[j] = String(maxValue);
					}
				}
				src.push(row);
			}
			console.log(src);

			try
			{
				localConvertFullRowColToGrid(src);

				Debug.log("Successfully uploaded CSV file to bitmap!", Debug.INFO_PRIORITY);

				//on succes remove popup
				el = document.getElementById("popUpDialog");
				if(el) el.parentNode.removeChild(el); //removes from parent bitmap dialog
			}
			catch(err)
			{
				Debug.log("Errors occured during upload. Bitmap may not reflect contents of CSV file." +
						"\nHere is the error description: \n" + err, Debug.HIGH_PRIORITY);

				//enable button so upload can be tried again
				document.getElementById('popUpDialog-submitButton').disabled = false;
			}
		} //end locaUploadCSV()

		//::::::::::
		//locaPopupUploadCSV ~~
		ConfigurationAPI.bitMapDialog.locaPopupUploadCSV = function()
		{
			Debug.log("ConfigurationAPI.bitMapDialog.locaPopupUploadCSV");
			ConfigurationAPI.bitMapDialog._csvUploadDataStr = ""; //clear previous upload

			var str = "";

			var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID); //this is the parent bitmap dialog box
			var pel = document.getElementById("popUpDialog"); //this is the local child upload dialog box (attached to parent dialog)
			if(!pel)
			{
				pel = document.createElement("div");
				pel.setAttribute("id", "popUpDialog");
			}
			pel.style.display = "none";

			//set position and size
			var w = 380;
			var h = 195;
			ConfigurationAPI.setPopUpPosition(pel,w /*w*/,h /*h*/);

			var str = "<a id='" +
					"popUpDialog" + //clear upload string on cancel!
					"-header' href='#' onclick='javascript:ConfigurationAPI.bitMapDialog._csvUploadDataStr = \"\"; var pel = document.getElementById(" +
					"\"popUpDialog\"); if(pel) pel.parentNode.removeChild(pel); return false;'>Cancel</a><br><br>";

			str += "<div id='popUpDialog-div'>";

			str += "Please choose a CSV formatted data file (i.e. commas for columns, and new lines for rows) " +
					"to upload:<br><br>";

			str += "<center>";

			str += "<input type='file' id='popUpDialog-fileUpload' " +
					"accept='.csv' enctype='multipart/form-data' />";

			// done with special handling
			// continue with pop-up prompt
			str += "</center></div><br><br>"; //close main popup div

			var onmouseupJS = "";
			onmouseupJS += "document.getElementById(\"popUpDialog-submitButton\").disabled = true;";
			onmouseupJS += "ConfigurationAPI.bitMapDialog.locaUploadCSV();";

			str += "<input id='popUpDialog-submitButton' disabled type='button' onmouseup='" +
					onmouseupJS + "' " +
					"value='Upload File' title='" +
					"Upload the chosen file to replace the row,col data in the current bitmap." +
					"'/>";

			pel.innerHTML = str;
			el.appendChild(pel); //add element to bitmap div
			pel.style.display = "block";

			document.getElementById('popUpDialog-fileUpload').addEventListener(
					'change', function(evt) {
				var files = evt.target.files;
				var file = files[0];
				var reader = new FileReader();
				reader.onload = function() {
					//store uploaded file and enable button
					ConfigurationAPI.bitMapDialog._csvUploadDataStr = this.result;
					Debug.log("ConfigurationAPI.bitMapDialog._csvUploadDataStr = " + ConfigurationAPI.bitMapDialog._csvUploadDataStr);
					document.getElementById('popUpDialog-submitButton').disabled = false;
				}
				reader.readAsText(file);
			}, false);

		}; //end locaUploadCSV()


		el.appendChild(hdr);

		ConfigurationAPI.bitMapDialog.localUpdateScroll(0);
		ConfigurationAPI.bitMapDialog.localUpdateScroll(1);

	} //end localCreateHeader()

	//:::::::::::::::::::::::::::::::::::::::::
	//localPaint ~~
	//	called every time window is resized
	function localPaint()
	{
		Debug.log("localPaint");

		popSz = ConfigurationAPI.setPopUpPosition(el,undefined,undefined,padding,undefined,
				30 /*margin*/, true /*doNotResize*/);

		hdrW = popSz.w;
		//axisPadding = 40 + axisPaddingExtra;
		hdrX = padding;
		hdrY = padding;
		hdrW = popSz.w;
		hdrH = 150;
		bmpX = padding;
		bmpY = hdrY+hdrH+padding;
		bmpW = popSz.w - 2*axisPadding;
		bmpH = popSz.h - hdrH - padding - 2*axisPadding;

		cellW = bmpW/cols;
		cellH = bmpH/rows;

		localOptimizeAspectRatio();	//sets up bmpX,Y based on aspect ratio (inputs are cellW/cellH, bmpW/bmpH, rows/cols)

		//place header
		hdr.style.left = hdrX + "px";
		hdr.style.top = hdrY + "px";
		hdr.style.width = hdrW + "px";
		hdr.style.height = hdrH + "px";

		//place bitmap
		bmp.style.left = bmpX + "px";
		bmp.style.top = bmpY + "px";
		bmp.style.width = bmpW + "px";
		bmp.style.height = bmpH + "px";


		//place bitmap grid and buttons
		{

			bmpGrid.style.left = (bmpX-bmpBorderSize) + "px";
			bmpGrid.style.top = (bmpY-bmpBorderSize) + "px";
			bmpGrid.style.width = (bmpW) + "px";
			bmpGrid.style.height = (bmpH) + "px";

			var bmpGridChildren = bmpGrid.childNodes;

			//place all rows div
			allRowBtns.style.left = (bmpX - bmpBorderSize - axisPaddingMargin - bmpBorderSize - butttonSz) + "px";
			allRowBtns.style.top = (bmpY - bmpBorderSize) + "px";
			//place all cols div
			allColBtns.style.left = (bmpX - bmpBorderSize) + "px";
			allColBtns.style.top = (bmpY + bmpH + axisPaddingMargin - bmpBorderSize*2) + "px";
			//place all div
			allBtn.style.left = (bmpX - bmpBorderSize - axisPaddingMargin - bmpBorderSize - butttonSz) + "px";
			allBtn.style.top = (bmpY + bmpH + axisPaddingMargin - bmpBorderSize*2) + "px";
			allBtn.style.width = butttonSz + "px";
			allBtn.style.height = butttonSz + "px";

			var allRowsChildren = allRowBtns.childNodes;
			var allColsChildren = allColBtns.childNodes;


			//place number divs
			rowLeftNums.style.left = (bmpX - bmpBorderSize - axisPaddingMargin - bmpBorderSize - butttonSz + (- bmpBorderSize - axisPaddingMargin - axisPaddingExtra)) + "px";
			rowLeftNums.style.top = (bmpY - bmpBorderSize) + "px";
			rowRightNums.style.left = (bmpX + bmpW + axisPaddingMargin + bmpBorderSize) + "px";
			rowRightNums.style.top = (bmpY - bmpBorderSize) + "px";
			colTopNums.style.left = (bmpX - bmpBorderSize) + "px";
			colTopNums.style.top = (bmpY - bmpBorderSize*2 - numberDigitH - axisPaddingMargin) + "px";
			colBottomNums.style.left = (bmpX - bmpBorderSize) + "px";
			colBottomNums.style.top = (bmpY + bmpH + bmpBorderSize + axisPaddingMargin + bmpBorderSize + butttonSz + bmpBorderSize) + "px";
			rowLeftNums.innerHTML = ""; //clear all children
			rowRightNums.innerHTML = ""; //clear all children
			colTopNums.innerHTML = ""; //clear all children
			colBottomNums.innerHTML = ""; //clear all children

			var thresholdNumberSpacing = 100; //once threshold is reached another number is shown
			var numberLoc = []; //used to keep track of spacing
			var oldNumberLoc = [-thresholdNumberSpacing,-thresholdNumberSpacing]; //used to keep track of spacing
			var numberEl;
			var translatedRC;

			//outer box
			bmpGridChildren[0].style.left = 0 + "px";
			bmpGridChildren[0].style.top = 0 + "px";
			bmpGridChildren[0].style.width = (bmpW) + "px";
			bmpGridChildren[0].style.height = (bmpH) + "px";

			//place rows
			for(var i=0;i<rows;++i)
			{
				if(i<rows-1)
				{
					//dark
					bmpGridChildren[1+i*2].style.left = bmpBorderSize + "px";
					bmpGridChildren[1+i*2].style.top = ((i+1)*cellH) + "px";//((i+1)*cellH + bmpBorderSize) + "px";
					bmpGridChildren[1+i*2].style.width = (bmpW) + "px";
					bmpGridChildren[1+i*2].style.height = (bmpGridThickness+bmpBorderSize*2) + "px";

					//light
					bmpGridChildren[1+i*2+1].style.left = 0 + "px";
					bmpGridChildren[1+i*2+1].style.top = ((i+1)*cellH + bmpBorderSize) + "px";//((i+1)*cellH + bmpBorderSize*2) + "px";
					bmpGridChildren[1+i*2+1].style.width = (bmpW + bmpBorderSize*2) + "px";
					bmpGridChildren[1+i*2+1].style.height = bmpGridThickness + "px";//((doSnakeRows && i%2 == 1)?0:bmpGridThickness) + "px";

					bmpGridChildren[1+i*2+1].style.backgroundColor = //change color if snaking
							(doSnakeRows && i%2 == 1)?"rgb(100,100,100)":"#efeaea";
				}

				//row button
				allRowsChildren[i].style.left = 0 + "px";
				allRowsChildren[i].style.top = (i*cellH + (i?bmpGridThickness+bmpBorderSize*2-1:0)) + "px";
				allRowsChildren[i].style.width = (butttonSz) + "px";
				allRowsChildren[i].style.height = (cellH - 1 + (i?-bmpBorderSize*2:0)) + "px";

				//numbers
				{
					numberLoc[0] = (i*cellH - 1 + cellH/2 - numberDigitH/2 + (i?bmpGridThickness+bmpBorderSize*2:0));

					//rowLeft numbers
					translatedRC = localConvertGridToRowCol(i,0);
					if(numberLoc[0] - oldNumberLoc[0] >= thresholdNumberSpacing &&
							translatedRC[0]%5 == 0)
					{
						//add a number
						numberEl = document.createElement("div");
						numberEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-number");
						numberEl.innerHTML = translatedRC[0];
						numberEl.style.top = numberLoc[0] + "px";
						numberEl.style.width = axisPaddingExtra + "px";
						rowLeftNums.appendChild(numberEl);
						oldNumberLoc[0] = numberLoc[0];
					}

					//rowRight numbers
					translatedRC = localConvertGridToRowCol(i,cols>1?1:0);
					if(numberLoc[0] - oldNumberLoc[1] >= thresholdNumberSpacing &&
							translatedRC[0]%5 == 0)
					{
						//add a number
						numberEl = document.createElement("div");
						numberEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-number");
						numberEl.innerHTML = translatedRC[0];
						numberEl.style.top = numberLoc[0] + "px";
						numberEl.style.width = axisPaddingExtra + "px";
						rowRightNums.appendChild(numberEl);
						oldNumberLoc[1] = numberLoc[0];
					}
				}
			}

			oldNumberLoc = [-thresholdNumberSpacing,-thresholdNumberSpacing]; //reset, used to keep track of spacing
			//place cols
			for(var i=0;i<cols;++i)
			{
				if(i<cols-1)
				{
					//if snaking cols, then darken every other
					//	by making light width = 0

					//dark
					bmpGridChildren[1+(rows-1)*2+i*2].style.top = bmpBorderSize + "px";
					bmpGridChildren[1+(rows-1)*2+i*2].style.left = ((i+1)*cellW + bmpBorderSize) + "px";
					bmpGridChildren[1+(rows-1)*2+i*2].style.height = (bmpH) + "px";
					bmpGridChildren[1+(rows-1)*2+i*2].style.width = (bmpGridThickness+bmpBorderSize*2) + "px";

					//light
					bmpGridChildren[1+(rows-1)*2+i*2+1].style.top = 0 + "px";
					bmpGridChildren[1+(rows-1)*2+i*2+1].style.left = ((i+1)*cellW + bmpBorderSize*2) + "px";
					bmpGridChildren[1+(rows-1)*2+i*2+1].style.height = (bmpH + bmpBorderSize*2) + "px";
					bmpGridChildren[1+(rows-1)*2+i*2+1].style.width = bmpGridThickness + "px"; //((doSnakeColumns && i%2 == 1)?0:bmpGridThickness) + "px";

					bmpGridChildren[1+(rows-1)*2+i*2+1].style.backgroundColor = //change color if snaking
							(doSnakeColumns && i%2 == 1)?"rgb(100,100,100)":"#efeaea";
				}

				//row button
				allColsChildren[i].style.left = (i*cellW - 1 + (i?bmpGridThickness+bmpBorderSize*2:0)) + "px";
				allColsChildren[i].style.top = 0 + "px";
				allColsChildren[i].style.width = (cellW + 1 - (i?bmpGridThickness+bmpBorderSize*2:0)) + "px";
				allColsChildren[i].style.height = (butttonSz) + "px";

				//numbers
				{
					numberLoc[0] =  (i*cellW + cellW/2 - axisPaddingExtra/2 + (i?bmpGridThickness+bmpBorderSize*2:0));

					//colTop numbers
					translatedRC = localConvertGridToRowCol(0,i);
					if(numberLoc[0] - oldNumberLoc[0] >= thresholdNumberSpacing &&
							translatedRC[1]%5 == 0)
					{
						//add a number
						numberEl = document.createElement("div");
						numberEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-number");
						numberEl.innerHTML = translatedRC[1];
						numberEl.style.left = numberLoc[0] + "px";
						numberEl.style.width = axisPaddingExtra + "px";
						colTopNums.appendChild(numberEl);
						oldNumberLoc[0] = numberLoc[0];
					}

					//colBottom numbers
					translatedRC = localConvertGridToRowCol(rows>1?1:0,i);
					if(numberLoc[0] - oldNumberLoc[1] >= thresholdNumberSpacing &&
							translatedRC[1]%5 == 0)
					{
						//add a number
						numberEl = document.createElement("div");
						numberEl.setAttribute("class", ConfigurationAPI._POP_UP_DIALOG_ID + "-bitmap-number");
						numberEl.innerHTML = translatedRC[1];
						numberEl.style.left = numberLoc[0] + "px";
						numberEl.style.width = axisPaddingExtra + "px";
						colBottomNums.appendChild(numberEl);
						oldNumberLoc[1] = numberLoc[0];
					}
				}
			}
		}






	} //end localPaint()

	//:::::::::::::::::::::::::::::::::::::::::
	//localOptimizeAspectRatio ~~
	//	inputs are cellW/cellH, bmpW/bmpH, rows/cols
	//
	//	optimize aspect ratio for viewing window
	//	hdr and bmp positions are known after this
	function localOptimizeAspectRatio()
	{
		var cellSkew = (cellW>cellH)?cellW/cellH:cellH/cellW;
		var MAX_SKEW = 3;


		if(forcedAspectH !== undefined)
		{
			var offAspectH = forcedAspectH/cellH;
			var offAspectW = forcedAspectW/cellW;

			Debug.log("Adjusting skew factor = " + forcedAspectH + "-" + forcedAspectW);

			if(offAspectH < offAspectW) //height is too big
				bmpH = bmpW/cols*forcedAspectH/forcedAspectW*rows;
			else //width is too big
				bmpW = bmpH/rows*forcedAspectW/forcedAspectH*cols;
		}
		else if(cellSkew > MAX_SKEW) //re-adjust bitmap
		{
			var adj = cellSkew/MAX_SKEW;
			//to much skew in cell shape.. so let's adjust
			Debug.log("Adjusting skew factor = " + adj);
			if(cellW > cellH)
			{
				bmpW /= adj;
			}
			else
				bmpH /= adj;
		}
		//recalculate new cells
		cellW = bmpW/cols;
		cellH = bmpH/rows;

		//center bitmap
		bmpX = padding + (popSz.w-bmpW)/2;
		bmpY = bmpY + (popSz.h-bmpY-bmpH)/2;
		hdrY = bmpY - padding - hdrH;
	} //end localOptimizeAspectRatio()
} //end ConfigurationAPI.bitMapDialog()

//=====================================================================================
//bitMapDialogConvertValueToRGBA ~~
//	convert bitfield value to RGBA based on input parameters
ConfigurationAPI.bitMapDialogConvertValueToRGBA = function(
	val, minValue, maxValue, minValueColor, midValueColor, maxValueColor, 
	floorValueColor, ceilValueColor)
{
	if(val >= maxValue)
		return [ceilValueColor[0],
				ceilValueColor[1],
				ceilValueColor[2],
				255]; //always max alpha

	if(val <= minValue)
		return [floorValueColor[0],
				floorValueColor[1],
				floorValueColor[2],
				255]; //always max alpha
	
	let midValue = (maxValue + minValue)/2; //used for color calcs

	if(val == midValue)	//avoid dividing by 0 in blend
		return [midValueColor[0],
				midValueColor[1],
				midValueColor[2],
				255]; //always max alpha

	//blend lower half
	var t;
	if(val <= midValue)
	{
		t = (val - minValue)/(midValue - minValue);
		return [minValueColor[0]*(1-t) + t*midValueColor[0],
				minValueColor[1]*(1-t) + t*midValueColor[1],
				minValueColor[2]*(1-t) + t*midValueColor[2],
				255]; //always max alpha
	}
	//blend upper half
	//if(val >= midValue)
	{
		t = (val - midValue)/(maxValue - midValue);
		return [midValueColor[0]*(1-t) + t*maxValueColor[0],
				midValueColor[1]*(1-t) + t*maxValueColor[1],
				midValueColor[2]*(1-t) + t*maxValueColor[2],
				255]; //always max alpha
	}
} //end ConfigurationAPI.bitMapDialogConvertValueToRGBA()

//=====================================================================================
//getDateString ~~
//	Example call from linux timestamp:
//		groupCreationTime = ConfigurationAPI.getDateString(new Date((groupCreationTime|0)*1000));
ConfigurationAPI.getDateString;
{
ConfigurationAPI.getDateStringDayArr_ = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
ConfigurationAPI.getDateStringMonthArr_ = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
ConfigurationAPI.getDateString = function(date)
{
	var dateStr = "";

	dateStr += ConfigurationAPI.getDateStringDayArr_[date.getDay()];
	dateStr += " ";
	dateStr += ConfigurationAPI.getDateStringMonthArr_[date.getMonth()];
	dateStr += " ";
	dateStr += date.getDate();
	dateStr += " ";
	dateStr += date.getHours();
	dateStr += ":";
	dateStr += ((date.getMinutes()<10)?"0":"") + date.getMinutes();
	dateStr += ":";
	dateStr += ((date.getSeconds()<10)?"0":"") + date.getSeconds();
	dateStr += " ";
	dateStr += date.getFullYear();
	dateStr += " ";
	dateStr += date.toLocaleTimeString([],{timeZoneName: "short"}).split(" ")[2];
	return dateStr;
}
} //end ConfigurationAPI.getDateString()

//=====================================================================================
//setCaretPosition ~~
ConfigurationAPI.setCaretPosition = function(elem, caretPos, endPos)
{
	elem.focus();
	elem.setSelectionRange(caretPos, endPos);
} //end ConfigurationAPI.setCaretPosition()

//=====================================================================================
//ConfigurationAPI.removeAllPopUps()
ConfigurationAPI.removeAllPopUps = function()
{
	//remove all existing dialogs
	var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
	while(el)
	{
		el.parentNode.removeChild(el); //close popup
		el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
	}
} //end ConfigurationAPI.removeAllPopUps()

//=====================================================================================
//setPopUpPosition ~~
//	centers element based on width and height constraint
//
//	Note: assumes a padding and border size if not specified
//  Note: if w,h not specified then fills screen (minus margin)
//	Note: offsetUp and can be used to position the popup vertically (for example if the dialog is expected to grow, then give positive offsetUp to compensate)
ConfigurationAPI.setPopUpPosition = function(el,w,h,padding,border,margin,doNotResize,offsetUp)
{
	Debug.log("ConfigurationAPI.setPopUpPosition");

	if(padding === undefined) padding = 10;
	if(border === undefined) border = 1;
	if(margin === undefined) margin = 0;

	var x,y;

	//:::::::::::::::::::::::::::::::::::::::::
	//stopPropagation ~~
	//	stop event propagation below the popup
	ConfigurationAPI.setPopUpPosition.stopPropagation = function(event) {
		if(event.type != "mousemove")
			Debug.log("stop propagation");
		event.stopPropagation();
	}

	//:::::::::::::::::::::::::::::::::::::::::
	//popupResize ~~
	//	set position and size
	ConfigurationAPI.setPopUpPosition.popupResize = function() {

		try //check if element still exists
		{
			if(!el) //if element no longer exists.. then remove listener and exit
			{
				window.removeEventListener("resize",ConfigurationAPI.setPopUpPosition.popupResize);
				window.removeEventListener("scroll",ConfigurationAPI.setPopUpPosition.popupResize);
				return;
			}
		}
		catch(err) {return;} //do nothing on errors

		//else resize el
		//Debug.log("ConfigurationAPI.setPopUpPosition.popupResize");


		var ww = DesktopContent.getWindowWidth()-(padding+border)*2;
		var wh = DesktopContent.getWindowHeight()-(padding+border)*2;

		//ww & wh are max window size at this point

		var ah = el.offsetHeight;//actual height, in case of adjustments

		if(w === undefined || h === undefined)
		{
			w = ww-(margin)*2;
			h = wh-(margin)*2;
		}
		//else w,h are inputs and margin is ignored

		x = (DesktopContent.getWindowScrollLeft() + ((ww-w)/2));
		y = (DesktopContent.getWindowScrollTop() + ((wh-h)/2)) - (offsetUp|0);
		if(y > 110) y -= 100; //bias up (looks nicer)

		if(y<DesktopContent.getWindowScrollTop()+margin)//+padding)
			y = DesktopContent.getWindowScrollTop()+margin;//+padding; //don't let it bottom out though

		//if dialog is smaller than window, allow scrolling to see the whole thing
		if(w > ww-margin-padding)
			x = -DesktopContent.getWindowScrollLeft();
		if(ah > wh-margin-padding)
			y = -DesktopContent.getWindowScrollTop();

		el.style.left = (x|0) + "px";
		el.style.top = (y|0) + "px";
	};
	ConfigurationAPI.setPopUpPosition.popupResize();

	//window width and height are not manipulated on resize, only setup once
	el.style.width = (w|0) + "px";
	el.style.height = (h|0) + "px";

	if(!doNotResize)
	{
		window.addEventListener("resize",ConfigurationAPI.setPopUpPosition.popupResize);
		window.addEventListener("scroll",ConfigurationAPI.setPopUpPosition.popupResize);
	}
	el.addEventListener("keydown",ConfigurationAPI.setPopUpPosition.stopPropagation);
	el.addEventListener("mousemove",ConfigurationAPI.setPopUpPosition.stopPropagation);
	el.addEventListener("mousemove",DesktopContent.mouseMove);
	el.addEventListener("mousedown",ConfigurationAPI.setPopUpPosition.stopPropagation);
	el.addEventListener("mouseup",ConfigurationAPI.setPopUpPosition.stopPropagation);
	el.addEventListener("click",ConfigurationAPI.setPopUpPosition.stopPropagation);

	el.style.overflow = "auto";

	{ //gives div focus to handle keydown events first
		el.setAttribute("tabindex", "0");
		el.focus(); 
	}

	return {"w" : w, "h" : h, "x" : x, "y" : y};
} //end setPopUpPosition()

//=====================================================================================
//getOnePixelPngData ~~
//	alpha is optional, will assume full 255 alpha
ConfigurationAPI.getOnePixelPngData = function(rgba)
{
	if(ConfigurationAPI.getOnePixelPngData.canvas ===  undefined)
	{
		//create only first time this functino is called
		ConfigurationAPI.getOnePixelPngData.canvas = document.createElement("canvas");
		ConfigurationAPI.getOnePixelPngData.canvas.width = 1;
		ConfigurationAPI.getOnePixelPngData.canvas.height = 1;
		ConfigurationAPI.getOnePixelPngData.ctx = ConfigurationAPI.getOnePixelPngData.canvas.getContext("2d");
		ConfigurationAPI.getOnePixelPngData.bmpOverlayData = ConfigurationAPI.getOnePixelPngData.ctx.createImageData(1,1);
	}

	ConfigurationAPI.getOnePixelPngData.bmpOverlayData.data[0]=rgba[0];
	ConfigurationAPI.getOnePixelPngData.bmpOverlayData.data[1]=rgba[1];
	ConfigurationAPI.getOnePixelPngData.bmpOverlayData.data[2]=rgba[2];
	ConfigurationAPI.getOnePixelPngData.bmpOverlayData.data[3]=rgba[3]!==undefined?rgba[3]:255;

	ConfigurationAPI.getOnePixelPngData.ctx.putImageData(
			ConfigurationAPI.getOnePixelPngData.bmpOverlayData,0,0);
	return ConfigurationAPI.getOnePixelPngData.canvas.toDataURL();
} //end getOnePixelPngData()

//=====================================================================================
//createEditableFieldElement ~~
//
//	Creates div element with editable and highlight features.
//	Note: set ConfigurationAPI.editableField_SELECTED_COLOR_ = "transparent" to disable highlight features
//
//	Input field must be a value node.
//	Input object is single field as returned from ConfigurationAPI.getFieldsOfRecords
//
//	fieldIndex is unique integer for the field
//	depthIndex (optional) is indicator of depth, e.g. for tree display
//
//	Field := {}
//			obj.fieldTableName
//			obj.fieldUID
//			obj.fieldColumnName
//			obj.fieldRelativePath
//			obj.fieldColumnType
//			obj.fieldColumnDataType
//			obj.fieldColumnDataChoicesArr[]
//			obj.fieldColumnDefaultValue
//
ConfigurationAPI.editableFieldEditingCell_ = 0;
ConfigurationAPI.editableFieldEditingIdString_;
ConfigurationAPI.editableFieldEditingNodeType_;
ConfigurationAPI.editableFieldEditingOldValue_;
ConfigurationAPI.editableFieldEditingInitValue_;
ConfigurationAPI.editableFieldHoveringCell_ = 0;
ConfigurationAPI.editableFieldHoveringIdString_;
ConfigurationAPI.editableFieldSelectedIdString_ = 0;
ConfigurationAPI.editableFieldHandlersSubscribed_ = false;
ConfigurationAPI.editableFieldMouseIsSelecting_ = false;
ConfigurationAPI.editableField_SELECTED_COLOR_ = "rgb(251, 245, 53)";
ConfigurationAPI.createEditableFieldElement = function(fieldObj,fieldIndex,
		depthIndex /*optional*/, initValue /*optional*/)
{
	var str = "";
	var depth = depthIndex|0;
	var uid = fieldIndex|0;

	if(!ConfigurationAPI.editableFieldHandlersSubscribed_)
	{
		ConfigurationAPI.editableFieldHandlersSubscribed_ = true;

		//be careful to not override the window.onmousemove DesktopContent action
		DesktopContent.mouseMoveSubscriber(ConfigurationAPI.handleEditableFieldBodyMouseMove);
	}

	var fieldEl = document.createElement("div");
	fieldEl.setAttribute("class", "ConfigurationAPI-EditableField");
	fieldEl.setAttribute("id", "ConfigurationAPI-EditableField-" +
			( depth + "-" + uid ));

	Debug.log("Field type " + fieldObj.fieldColumnType);
	//console.log(fieldObj);

	var valueType = fieldObj.fieldColumnType;
	var choices = fieldObj.fieldColumnDataChoicesArr;
	var value = initValue === undefined?fieldObj.fieldColumnDefaultValue:initValue;
	Debug.logv({value});
	var path = fieldObj.fieldRelativePath;
	var nodeName = fieldObj.fieldColumnName;
	fieldObj.depthIndex = depth;
	fieldObj.fieldIndex = uid;
	fieldObj.fieldColumnValue = value; //track last stable value

	//if childLink, look up isGroupLink,childLinkIndex,linkId
	//	in matching field
	var isGroupLink,childLinkIndex,linkId;
	if(valueType.indexOf("ChildLink") == 0)
	{
		Debug.log("Looking up matching link pair for " + nodeName);

		childLinkIndex = valueType.split('-')[1];
		console.log("childLinkIndex",childLinkIndex);

		//should only be one other field with this childLinkIndex
		for(var i=0;i<_fields.length;++i)
			if(_fields[i].fieldColumnType.indexOf("ChildLink") == 0 &&
					(_fields[i].fieldColumnType[("ChildLink").length] == 'U' ||
					_fields[i].fieldColumnType[("ChildLink").length] == 'G') &&
					childLinkIndex == _fields[i].fieldColumnType.split('-')[1])
			{
				Debug.log("Found matching pair field " +
						_fields[i].fieldColumnName);
				if(_fields[i].fieldColumnType[("ChildLink").length] == 'U')
					isGroupLink = false; //UID link
				else
					isGroupLink = true; //GroupID link
				linkId = _fields[i].fieldColumnDefaultValue;
				break;
			}

		if(isGroupLink === undefined)
		{
			Debug.log("Invalid table! Could not find matching child link columns for " +
					nodeName, Debug.HIGH_PRIORITY);
			return;
		}
	} //end special child link handling

	return ConfigurationAPI.fillEditableFieldElement(fieldEl,uid,
			depth,nodeName,value,valueType,choices,path,
			isGroupLink,childLinkIndex,linkId);
} //end createEditableFieldElement()

//=====================================================================================
//getEditableFieldValue ~~
//	return value is the string value
//		loosely based ConfigurationGUI editTreeNodeOK()
ConfigurationAPI.getEditableFieldValue = function(fieldObj,fieldIndex,depthIndex /*optional*/)
{
	//Debug.log("getEditableFieldValue " + fieldObj.fieldColumnName + " of type " +
	//		fieldObj.fieldColumnType);

	ConfigurationAPI.handleEditableFieldEditOK(); //make sure OK|Cancel closed

	//make depthIndex and fieldIndex optional
	var depth = fieldObj.depthIndex === undefined?
			(depthIndex|0):fieldObj.depthIndex;
	var uid = fieldObj.fieldIndex === undefined?
			(fieldIndex|0):fieldObj.fieldIndex;

	var fieldEl = document.getElementById("editableFieldNode-Value-leafNode-" +
			( depth + "-" + uid ));
	if(!fieldEl)
	{
		Debug.log("getEditableFieldValue Error! Invalid target field element '" +
				( depth + "-" + uid ), Debug.HIGH_PRIORITY);
		return;
	}

	var valueType = fieldObj.fieldColumnType;
	var value = fieldEl.textContent;

	//Debug.log("get Value " + value);
	return value;
} //end getEditableFieldValue()

//=====================================================================================
//setEditableFieldValue ~~
//	set value of a single field element as specified by:
//		fieldObj (as returned from ConfigurationAPI.getFieldsOfRecords)
//		fieldIndex is unique integer for the field
//		depthIndex (optional) is indicator of depth, e.g. for tree display
//
//	input value is expected to be a string value
ConfigurationAPI.setEditableFieldValue = function(fieldObj,value,fieldIndex,depthIndex /*optional*/)
{
	//Debug.log("setEditableFieldValue " + fieldObj.fieldColumnName + " = " + value);

	//make depthIndex and fieldIndex optional
	var depth = fieldObj.depthIndex === undefined?
			(depthIndex|0):fieldObj.depthIndex;
	var uid = fieldObj.fieldIndex === undefined?
			(fieldIndex|0):fieldObj.fieldIndex;

	var fieldEl = document.getElementById("ConfigurationAPI-EditableField-" +
			( depth + "-" + uid ));
	if(!fieldEl)
	{
		Debug.log("setEditableFieldValue Error! Invalid target field element '" +
				( depth + "-" + uid ), Debug.HIGH_PRIORITY);
		return;
	}
	var valueType = fieldObj.fieldColumnType;
	var choices = fieldObj.fieldColumnDataChoicesArr;
	var path = fieldObj.fieldRelativePath;
	var nodeName = fieldObj.fieldColumnName;
	fieldObj.fieldColumnValue = value; //track last stable value

	//if childLink, look up isGroupLink,childLinkIndex,linkId
	//	in matching field
	var isGroupLink,childLinkIndex,linkId;
	if(valueType.indexOf("ChildLink") == 0)
	{
		Debug.log("Looking up matching link pair for " + nodeName);

		childLinkIndex = valueType.split('-')[1];
		console.log("childLinkIndex",childLinkIndex);

		//should only be one other field with this childLinkIndex
		for(var i=0;i<_fields.length;++i)
			if(_fields[i].fieldColumnType.indexOf("ChildLink") == 0 &&
					(_fields[i].fieldColumnType[("ChildLink").length] == 'U' ||
							_fields[i].fieldColumnType[("ChildLink").length] == 'G') &&
							childLinkIndex == _fields[i].fieldColumnType.split('-')[1])
			{
				Debug.log("Found matching pair field " +
						_fields[i].fieldColumnName);
				if(_fields[i].fieldColumnType[("ChildLink").length] == 'U')
					isGroupLink = false; //UID link
				else
					isGroupLink = true; //GroupID link
				linkId = _fields[i].fieldColumnValue;
				break;
			}

		if(isGroupLink === undefined)
		{
			Debug.log("Invalid table! Could not find matching child link columns for " +
					nodeName, Debug.HIGH_PRIORITY);
			return;
		}
	} //end special child link handling

	return ConfigurationAPI.fillEditableFieldElement(fieldEl,uid,
			depth,nodeName,value,valueType,choices,path,
			isGroupLink,childLinkIndex,linkId);
} //end setEditableFieldValue()

//=====================================================================================
//fillEditableFieldElement ~~
//	helper to fill element used by setEditableFieldValue and createEditableFieldElement
//
//	Caller should append extra parameters (isGroupLink,childLinkIndex,linkId) to ChildLink valueType
//	to guide subset links.
ConfigurationAPI.fillEditableFieldElement = function(fieldEl,uid,
		depth,nodeName,value,valueType,choices,path,
		isGroupLink,childLinkIndex,linkId)
{
	var str = "";

	var pathHTML = path;
	//make path html safe
	pathHTML = pathHTML.replace(/</g, "&lt");
	pathHTML = pathHTML.replace(/>/g, "&gt");

	str += "<div class='editableFieldNode-Path' style='display:none' id='editableFieldNode-path-" +
			( depth + "-" + uid ) + "'>" + // end path id
			pathHTML + //save path for future use.. and a central place to edit when changes occur
			"</div>";

	//track if this is a child link with fixed choice
	var childLinkFixedChoice = false; //init, but if it is, then change type handling to fixed choice style
	var isChildLink = valueType.indexOf("ChildLink") == 0;

	if(valueType == ConfigurationAPI._FIXED_CHOICE_DATA_TYPE ||
			(isChildLink && choices.length > 1))
	{
		//track if this is a child link with fixed choice
		childLinkFixedChoice = valueType.indexOf("ChildLink") == 0;

		//add CSV choices div
		str +=
				"<div class='editableFieldNode-FixedChoice-CSV' style='display:none' " +
				"id='editableFieldNode-FixedChoice-CSV-" +
				( depth + "-" + uid ) + "'>";

		for(var j=0;j<choices.length;++j)
		{
			if(j) str += ",";
			str += choices[j];
		}
		str += "</div>";


	}
	else if(valueType == "BitMap")
	{
		//add bitmap params div
		str +=
				"<div class='editableFieldNode-BitMap-Params' style='display:none' " +
				"id='editableFieldNode-BitMap-Params-" +
				( depth + "-" + uid ) + "'>";

		for(var j=1;j<choices.length;++j) //skip the first DEFAULT param
		{
			if(j-1) str += ";"; //assume no ';' in fields, so likely no issue to replace ; with ,
			str += choices[j].replace(/;/g,","); //change all ; to , for split safety
		}
		str += "</div>";
	}

	//normal value node and edit icon
	{
		//start value node
		str +=
				"<div class='editableFieldNode-Value editableFieldNode-ValueType-" +
				//if it is a fixed choice child link, then change type handling to fixed choice style
				(childLinkFixedChoice?"ChildLinkFixedChoice":valueType) +
				"' " +
				"id='editableFieldNode-Value-" +
				(depth + "-" + uid) + "' " +

				"onclick='ConfigurationAPI.handleEditableFieldClick(" +
				depth + "," + uid + "," +
				"0,\"value\")' " +

				"onmousemove='ConfigurationAPI.handleEditableFieldHover(" +
				depth + "," + uid + "," +
				"event)' " +

				">";

		titleStr = "~ Leaf Value Node ~\n";
		titleStr +=	"Path: \t" + path + nodeName + "\n";

		//left side of value
		str +=
				"<div style='float:left' title='" + titleStr + "'>" +
				"<b class='editableFieldNode-Value-leafNode-fieldName bold-header'>" +
				nodeName + "</b>" +
				"</div><div style='float:left'>&nbsp;:</div>";

		//normal edit icon
		str +=
				"<div class='editableFieldNode-Value-editIcon' id='editableFieldNode-Value-editIcon-" +
				(depth + "-" + uid) + "' " +
				"onclick='ConfigurationAPI.handleEditableFieldClick(" +
				depth + "," + uid + "," +
				"1,\"value\"); event.stopPropagation();' " +
				"title='Edit the value of this node.' " +
				"></div>";
	}

	str += "<div style='float:left; margin-left:9px;' id='editableFieldNode-Value-leafNode-" +
			(depth + "-" + uid) +
			"' class='editableFieldNode-Value-leafNode " +
			"editableFieldNode-Value-leafNode-ColumnName-" + nodeName +
			"' " + //also edit if click value:
			"onclick='ConfigurationAPI.handleEditableFieldClick(" +
				depth + "," + uid + "," +
				"1,\"value\"); event.stopPropagation();' " +
			">";


	if(valueType == "OnOff" ||
			valueType == "YesNo" ||
			valueType == "TrueFalse")
	{
		//colorize true false
		str += "<div style='float:left'>";
		str += value;
		str += "</div>";

		var color = (value == "On" || value == "Yes" || value == "True")?
				"rgb(16, 204, 16)":"rgb(255, 0, 0);";
		str += "<div style='width:10px;height:10px;" +
				"background-color:" + color + ";" +
				"float: left;" +
				"border-radius: 7px;" +
				"border: 2px solid white;" +
				"margin: 2px 0 0 6px;" +
				"'></div>";
	}
	else if(valueType == "Timestamp")
		str += ConfigurationAPI.getDateString(new Date((value|0)*1000));
	else
		str += value;

	str += "</div>";

	//make links to child subset configuration editor
	if(isChildLink &&
			value.indexOf("Table") == value.length - ("Table").length)
	{
		//make record alias with spaces instead of all one word
		// and remove table
		var recordAlias = "";
		for(var c=0;c<value.length - ("Table").length;++c)
		{
			if(c && c+1 < value.length &&
					(value[c] >= 'A' &&
							value[c] <= 'Z') &&
							(value[c+1] >= 'a' &&
									value[c+1] <= 'z'))
				recordAlias += ' ';
			recordAlias += value[c];
		}
		if(recordAlias.length && recordAlias[recordAlias.length-1] != 's')
			recordAlias += 's'; //make plural

		var newWindowStr = "/WebPath/html/ConfigurationGUI_subset.html?urn=" +
				DesktopContent._localUrnLid +
				"&subsetBasePath=" + value +
				"&groupingFieldList=AUTO" +
				"&recordAlias=" + recordAlias +
				"&editableFieldList=" + "!*CommentDescription";

		//include special parameters to focus on link targets
		if(isGroupLink)
		{
			//for group link, pre-select GroupID value
			newWindowStr += "&selectedGroupIDs=" +
					encodeURIComponent(
							childLinkIndex + "=" +
							linkId);

			if(childLinkIndex.split(' ').length >= 2)
				childLinkIndex = childLinkIndex.split(' ')[1]; //allow for targeting index syntax
			//add childLinkIndex to be used by getting groupId values in target table
			str += "<div id='editableFieldNode-ChildLink-groupIndex-" +
					(depth + "-" + uid) + "' " +
					" style='display:none;' >" +
					childLinkIndex + "</div>";
		}
		else
		{
			//for unique link, presect UID record
			newWindowStr += "&selectedRecords=" + linkId;
		}


		str += "<div style='float:left; margin-left:9px;' " +
				" id='editableFieldNode-ChildLink-SubConfigLinkWindow-" +
				(depth + "-" + uid) + "' " +
				" class='" +
				"editableFieldNode-ChildLink-SubConfigLink" +
				"' " +
				"onclick='" +
				"event.stopPropagation(); " +
				"DesktopContent.openNewWindow(" +
				"\"" + value +
				" Subset-Configuration\",\"\",\"" +
				//windowPath
				newWindowStr +
				"\",false /*unique*/);" +
				"'" +
				" title='Open " + value + " subset configuration in a new desktop window.' " +
				">Open Window</div>";

		str += "<div style='float:left; margin-left:9px;' " +
				" id='editableFieldNode-ChildLink-SubConfigLinkTab-" +
				(depth + "-" + uid) + "' " +
				" class='" +
				"editableFieldNode-ChildLink-SubConfigLink" +
				"' " +
				"onclick='" +
				"event.stopPropagation(); " +
				"DesktopContent.openNewBrowserTab(" +
				"\"" + value +
				" Subset-Configuration\",\"\",\"" +
				//windowPath
				newWindowStr +
				"\",false /*unique*/);" +
				"'" +
				" title='Open " + value + " subset configuration in a new browser tab.' " +
				">Open Tab</div>";
	}

	//Debug.log(str);

	fieldEl.innerHTML = str;

	//check if this field is currently the selected field
	//	if so, setup select color
	if(ConfigurationAPI.editableFieldSelectedIdString_ == (depth + "-" + uid))
		fieldEl.getElementsByClassName("editableFieldNode-Value")[0].style.backgroundColor =
							ConfigurationAPI.editableField_SELECTED_COLOR_;

	return fieldEl;
} //end fillEditableFieldElement()

//=====================================================================================
//handleEditableFieldClick ~~
//	handler for click event for editable field elements
//
//	copied from ConfigurationGUI.html handleTreeNodeClick() ..but only
//		defines functionality for value nodes.
ConfigurationAPI.handleEditableFieldClick = function(depth,uid,editClick,type)
{
	var idString = depth + "-" + uid;
	ConfigurationAPI.editableFieldEditingIdString_ = idString;

	Debug.log("handleEditableFieldClick editClick " + editClick);
	Debug.log("handleEditableFieldClick idString " + idString);

	var el = document.getElementById("editableFieldNode-Value-" + idString);

	if(!el)
	{
		Debug.log("Invalid element pointed to by idString. Ignoring and exiting.");
		return;
	}

	if(ConfigurationAPI.editableFieldHoveringCell_)
	{
		//Debug.log("handleTreeNodeClick editClick clearing ");
		ConfigurationAPI.handleEditableFieldBodyMouseMove();
	}

	if(ConfigurationAPI.editableFieldEditingCell_) //already have the edit box open, cancel it
	{
		if(ConfigurationAPI.editableFieldEditingCell_ == el) //if same cell do nothing
			return true;
		ConfigurationAPI.handleEditableFieldEditOK(); //if new cell, click ok on old cell before continuing
	}

	var path = document.getElementById("editableFieldNode-path-" + idString).textContent;

	//			Debug.log("handleEditableFieldClick el       " + el.innerHTML);
	//Debug.log("handleEditableFieldClick idString    " + idString);
	//Debug.log("handleEditableFieldClick uid      " + uid);
	//			Debug.log("handleEditableFieldClick nodeName " + nodeName);
	Debug.log("handleEditableFieldClick path     " + path);
	//Debug.log("handleEditableFieldClick editClick " + editClick);
	Debug.log("handleEditableFieldClick type     " + type);

	//determine type clicked:
	//	- value
	//
	//allow different behavior for each	depending on single or edit(2x) click
	//	- value
	//		1x = select node
	//		2x = edit record Value mode (up/down tab/shtab enter esc active)
	//
	//on tree node edit OK
	//	- value
	//		save value back to field element
	//
	//on tree node edit cancel
	//	return previous value back to field element


	//==================
	//take action based on editClick and type string:
	//	- value
	//
	//params:
	//	(el,depth,uid,path,editClick,type,delayed)

	if(editClick)	//2x click
	{

		if(type == "value")
		{
			//edit ID (no keys active)
			Debug.log("edit value mode");

			selectThisTreeNode(idString,type);
			//==================
			function selectThisTreeNode(idString,type)
			{
				//edit column entry in record
				//	data type matters here, also don't edit author, timestamp
				var el = document.getElementById("editableFieldNode-Value-leafNode-" + idString);
				var vel = document.getElementById("editableFieldNode-Value-" + idString);

				//if value node, dataType is in element class name
				var colType = vel.className.split(' ')[1].split('-');
				if(colType[1] == "ValueType")
					colType = colType[2];

				var fieldName = el.className.substr(("editableFieldNode-Value-leafNode-ColumnName-").length);

				Debug.log("fieldName=" + fieldName);
				Debug.log("colType=" + colType);

				if(colType == "Author" ||
						colType == "Timestamp")
				{
					Debug.log("Can not edit Author or Timestamp fields.",
							Debug.WARN_PRIORITY);
					return false;
				}
				else if(colType == "GroupID")
					DesktopContent.tooltip("GroupID Editing",
						"The GroupID field places this record in one or more " +
						"parent group link collections. The value must match the parent's value " +
						"in the parent's LinkGroupID field. \n\nTo speficify that this record is in " +
						"more than one group, use the '|' (vertical bar) character. For example, " +
						"'Parent0Group | Parent1Group' would place this record in two groups (the " +
						"Parent0Group and Parent1Group).");

				var str = "";
				var optionIndex = -1;


				if(colType == ConfigurationAPI._BOOL_YES_NO_DATA_TYPE ||
						colType == ConfigurationAPI._BOOL_TRUE_FALSE_DATA_TYPE ||
						colType == ConfigurationAPI._BOOL_ON_OFF_DATA_TYPE)  //if column type is boolean, use dropdown
				{
					type += "-bool";
					ConfigurationAPI.editableFieldEditingOldValue_ = el.innerHTML;

					var initVal = el.childNodes[0].textContent;
					ConfigurationAPI.editableFieldEditingInitValue_ = initVal;

					var boolVals = [];
					if(colType == ConfigurationAPI._BOOL_YES_NO_DATA_TYPE)
						boolVals = ["No","Yes"];
					else if(colType == ConfigurationAPI._BOOL_TRUE_FALSE_DATA_TYPE)
						boolVals = ["False","True"];
					else if(colType == ConfigurationAPI._BOOL_ON_OFF_DATA_TYPE)
						boolVals = ["Off","On"];


					str += "<select  onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event)' " +
							"onmousedown='ConfigurationAPI.editableFieldMouseIsSelecting_ = true; Debug.log(ConfigurationAPI.editableFieldMouseIsSelecting_);' " +
							"onmouseup='ConfigurationAPI.editableFieldMouseIsSelecting_ = false; Debug.log(ConfigurationAPI.editableFieldMouseIsSelecting_); event.stopPropagation();' " +
							"onclick='event.stopPropagation();'" +
							"style='margin:-8px -2px -2px -1px; height:" + (el.offsetHeight+6) + "px'>";
					for(var i=0;i<boolVals.length;++i)
					{
						str += "<option value='" + boolVals[i] + "'>";
						str += boolVals[i];	//can display however
						str += "</option>";
						if(boolVals[i] == initVal)
							optionIndex = i; //get starting sel index
					}
					str += "</select>";
					if(optionIndex == -1) optionIndex = 0; //use False option by default
				}
				else if(colType == ConfigurationAPI._FIXED_CHOICE_DATA_TYPE ||
						colType == ConfigurationAPI._LINK_FIXED_CHOICE_DATA_TYPE)
				{
					if(colType == ConfigurationAPI._LINK_FIXED_CHOICE_DATA_TYPE)
						type += "-childLink";

					ConfigurationAPI.editableFieldEditingOldValue_ = el.textContent;
					ConfigurationAPI.editableFieldEditingInitValue_ = ConfigurationAPI.editableFieldEditingOldValue_;

					var allowFixedChoiceArbitraryEdit = false;
					var optionCount = -1;

					str += "<div onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event)' " +
							"onmouseup='event.stopPropagation();' " +
							"onclick='event.stopPropagation();' " +
							"style='" +
							"white-space:nowrap;" +
							"margin:-3px -2px -2px -1px;" +
							"height:" + (el.offsetHeight+6) + "px'>";

					str += "<select  onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event)' " +
							"id='fixedChoice-editSelectBox' " +
							"onmouseup='event.stopPropagation();' " +
							"onclick='event.stopPropagation();' " +
							"style='" +
							"float:left;" +
							"margin:-2px -2px -2px -1px; height:" +
							(el.offsetHeight+6) + "px'>";

					//default value is assumed in list

					var vel = document.getElementById("editableFieldNode-FixedChoice-CSV-" +
							idString);
					var choices = vel.textContent.split(',');

					var isChildLinkFixedChoice = colType == "ChildLinkFixedChoice";

					if(isChildLinkFixedChoice)
					{
						try
						{
							document.getElementById("editableFieldNode-ChildLink-SubConfigLinkTab-" +
									(depth + "-" + uid) ).style.display = "none";
							document.getElementById("editableFieldNode-ChildLink-SubConfigLinkWindow-" +
									(depth + "-" + uid) ).style.display = "none";
						}
						catch(e) {} //ignore errors
					}

					if(choices.length > 1 &&
							choices[1].indexOf("arbitraryBool=") == 0)
					{
						//found arbitraryBool flag
						allowFixedChoiceArbitraryEdit =
								choices[1][("arbitraryBool=").length] == "1"?
										true:false;
						Debug.log("allowFixedChoiceArbitraryEdit " + allowFixedChoiceArbitraryEdit);
					}

					optionIndex = -1;
					for(var i=0;i<choices.length;++i)
					{
						if(i == 0 && isChildLinkFixedChoice && !allowFixedChoiceArbitraryEdit)
						{
							//skip default if child link fixed choice does not allow arbitrary edit
							continue;
						}
						else if(i==1)//check for arbitraryBool flag
						{
							if(choices[i].indexOf("arbitraryBool=") == 0)
							{
								//found arbitraryBool flag, skip it
								continue;
							}
							else
							{
								//else no flag found, so treat as fixed choice option
								++optionCount; //count as an option in dropdown
							}
						}
						else
							++optionCount; //count as an option in dropdown


						str += "<option>";
						str += ConfigurationAPI.encodeHTML(decodeURIComponent(choices[i]));	//can display however
						str += "</option>";
						if(decodeURIComponent(choices[i])
								== ConfigurationAPI.editableFieldEditingOldValue_)
							optionIndex = optionCount; //save selected index
					}		//if not found, add current tmp value (probably user created recently)
					if(optionIndex == -1)
					{
						if(allowFixedChoiceArbitraryEdit &&
								ConfigurationAPI.editableFieldEditingOldValue_.length)
						{
							str += "<option>";
							str += ConfigurationAPI.encodeHTML(ConfigurationAPI.editableFieldEditingOldValue_); //can display however
							str += "</option>";
							optionIndex = optionCount+1; //last index
						}
						else
							optionIndex = 0; //default to default
					}
					str += "</select>";

					if(allowFixedChoiceArbitraryEdit)
					{
						var ww = (el.offsetWidth-6);
						if(ww < 150) ww = 150;
						str += "<input type='text' " +
								"id='fixedChoice-editTextBox' " +
								"style='display:none;" +
								"float:left;" +
								"margin:-2px 0 -" + (el.offsetHeight+6) + "px 0;" +
								"width:" +
								ww + "px; height:" + (el.offsetHeight+6) + "px" +
								"' " + //end style
								"></input>";

						str += "<div style='display:block;" +
								"margin: -2px 0 -7px 14px;" +
								"' " +
								"class='editableFieldNode-Value-editIcon' id='fixedChoice-editIcon" +
								"' " +
								"onclick='ConfigurationAPI.handleEditableFieldFixedChoiceEditToggle();' " +
								"title='Toggle free-form editing' " +
								"></div>";
					}
					str += "</div>";
				}
				else if(colType == "BitMap")
				{
					Debug.log("Handling bitmap select");

					ConfigurationAPI.editableFieldEditingOldValue_ = el.textContent;

					//let API bitmap dialog handle it
					ConfigurationAPI.bitMapDialog(
							//_editingCellElOldTitle, //field name
							"Target Field: &quot;" +
							fieldName + "&quot;",
							document.getElementById("editableFieldNode-BitMap-Params-" +
														idString).textContent.split(';'),
							ConfigurationAPI.editableFieldEditingOldValue_,
							function(val)
							{
						Debug.log("yes " + val);
						el.innerHTML = "";
						el.appendChild(document.createTextNode(val));
						ConfigurationAPI.editableFieldEditingCell_ = el;

						type += "-bitmap";
						editTreeNodeOK();

							},
							function() //cancel handler
							{
								//remove the editing cell selection
								Debug.log("cancel bitmap");
								ConfigurationAPI.editableFieldEditingCell_ = 0;
							});
					return true;
				}
				else if(colType == "MultilineData")
				{
					ConfigurationAPI.editableFieldEditingOldValue_ = el.textContent;
					ConfigurationAPI.editableFieldEditingInitValue_ = ConfigurationAPI.editableFieldEditingOldValue_;

					str += "<textarea rows='4' onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event)' cols='50' style='font-size: 14px; " +
							"margin:-8px -2px -2px -1px;width:" +
							(el.offsetWidth-6) + "px; height:" + (el.offsetHeight-8) + "px' ";
					str += " onmousedown='ConfigurationAPI.editableFieldMouseIsSelecting_ = true; Debug.log(ConfigurationAPI.editableFieldMouseIsSelecting_);' " +
							"onmouseup='ConfigurationAPI.editableFieldMouseIsSelecting_ = false; Debug.log(ConfigurationAPI.editableFieldMouseIsSelecting_);event.stopPropagation();' " +
							"onclick='event.stopPropagation();'" +
							">";
					str += ConfigurationAPI.editableFieldEditingOldValue_;
					str += "</textarea>";
				}
				else // normal cells, with text input
				{
					ConfigurationAPI.editableFieldEditingOldValue_ = el.textContent;
					ConfigurationAPI.editableFieldEditingInitValue_ = ConfigurationAPI.editableFieldEditingOldValue_;


					if(colType == "GroupID") //track type if it is groupid field
						type += "-groupid";
					else if(colType == "ChildLinkGroupID" || colType == "ChildLinkUID")
					{
						type += "-" + colType;

						//get unique values of the groupID field, for all records

						//assume table is in value before this field
						var tableIdString = depth + "-" + ((uid|0)-1);
						var tableEl = document.getElementById("editableFieldNode-Value-leafNode-" +
								tableIdString);
						if(tableEl)
						{
							//put str now, just to give user visual feedback from click
							// because loading select box make take a little time
							ConfigurationAPI.editableFieldEditingCell_ = el;
							ConfigurationAPI.editableFieldEditingNodeType_ = type;
							el.innerHTML = str +
									localFinishUpTextValueCell();
							if(colType == "ChildLinkUID")
							{
								localHandleDropdownForLinkUID(tableEl); //localFinishUpSelectCell() called at completion
								return;
							}
							else
							{
								//pass groupID column index to look for in target table

								var indexEl = document.getElementById(
										"editableFieldNode-ChildLink-groupIndex-" +
										tableIdString);
								if(indexEl)
								{
									localHandleDropdownForLinkGroupID(
											tableEl.innerText,
											indexEl.innerText); //localFinishUpSelectCell() called at completion
									return;
								}
								else
									Debug.log("Could not find matching group link index at ",tableIdString);
							}

						}
						else
							Debug.log("Could not find matching table field at ",tableIdString);
					}

					str += localFinishUpTextValueCell();


				}

				localFinishUpSelectCell();
				return;


				///////////// localFinishUpTextValueCell
				function localFinishUpTextValueCell()
				{
					Debug.log("localFinishUpTextValueCell()");


					var ow = el.offsetWidth+6;
					if(ow < 150) //force a minimum input width
						ow = 150;
					var str = "";
					str += "<input type='text' onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event);' style='margin:-8px -2px -2px -1px;width:" +
							(ow) + "px; height:" + (el.offsetHeight>20?el.offsetHeight:20) + "px' value='";
					str += ConfigurationAPI.editableFieldEditingOldValue_;
					str += "' onmousedown='ConfigurationAPI.editableFieldMouseIsSelecting_ = true; Debug.log(ConfigurationAPI.editableFieldMouseIsSelecting_);' " +
							"onmouseup='ConfigurationAPI.editableFieldMouseIsSelecting_ = false; Debug.log(ConfigurationAPI.editableFieldMouseIsSelecting_);event.stopPropagation();' " +
							"onclick='event.stopPropagation();'" +
							">";
					return str;
				} //end localFinishUpTextValueCell()

				///////////// localFinishUpSelectCell
				function localFinishUpSelectCell()
				{
					Debug.log("localFinishUpSelectCell()");

					str += ConfigurationAPI._OK_CANCEL_DIALOG_STR;

					el.innerHTML = str;


					//handle default selection
					if(colType == "YesNo" ||
							colType == "TrueFalse" ||
							colType == "OnOff")  //if column type is boolean, use dropdown
					{					//select initial value
						el.getElementsByTagName("select")[0].selectedIndex = optionIndex;
						el.getElementsByTagName("select")[0].focus();
					}
					else if(colType == "FixedChoiceData" ||
							colType == "ChildLinkFixedChoice" ||
							colType == "ChildLinkGroupID" ||
							colType == "ChildLinkUID")
					{
						try
						{
							el.getElementsByTagName("select")[0].selectedIndex = optionIndex;
							el.getElementsByTagName("select")[0].focus();
						}
						catch(e) {
							//ignore error and assume text box
							ConfigurationAPI.setCaretPosition(el.getElementsByTagName("input")[0],0,ConfigurationAPI.editableFieldEditingOldValue_.length);
						}

					}
					else if(colType == "MultilineData")
						ConfigurationAPI.setCaretPosition(el.getElementsByTagName("textarea")[0],0,ConfigurationAPI.editableFieldEditingOldValue_.length);
					else 					//select text in new input
						ConfigurationAPI.setCaretPosition(el.getElementsByTagName("input")[0],0,ConfigurationAPI.editableFieldEditingOldValue_.length);


					//wrapping up
					ConfigurationAPI.editableFieldEditingCell_ = el;
					ConfigurationAPI.editableFieldEditingNodeType_ = type;
				} //end localFinishUpSelectCell()

				///////////// localHandleDropdownForLinkUID
				function localHandleDropdownForLinkUID()
				{
					Debug.log("localHandleDropdownForLinkUID()",tableEl.innerText);

					//get all UIDs
					ConfigurationAPI.getSubsetRecords(tableEl.innerText,
						undefined /*filterList*/,
						function (records)
						{

							Debug.logv({records});
							if(!records || !records.length)
							{
								//could not find any records so just show text value
								Debug.log("Aborting link group ID search.");
								str += localFinishUpTextValueCell();
								localFinishUpSelectCell();
								return;
							}

							//create dropdown
							str += "<div onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event)' " +
									"onmouseup='event.stopPropagation();' " +
									"onclick='event.stopPropagation();' " +
									"style='" +
									"white-space:nowrap;" +
									"margin:-3px -2px -2px -1px;" +
									"height:" + (el.offsetHeight+6) + "px'>";

							str += "<select  onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event)' " +
									"id='fixedChoice-editSelectBox' " +
									"onmouseup='event.stopPropagation();' " +
									"onclick='event.stopPropagation();' " +
									"style='" +
									"float:left;" +
									"margin:-2px -2px -2px -1px; height:" +
									(el.offsetHeight+6) + "px'>";

							optionIndex = -1;
							for (var i = 0; i < records.length; ++i)
							{
								str += "<option value='" + records[i]
									+ "'>";
								str += records[i]; //can display however
								str += "</option>";
								if (records[i]
									== ConfigurationAPI.editableFieldEditingOldValue_)
									optionIndex = i; //get starting sel index
							}
							//if not found, add current tmp value (probably user created recently)
							if(optionIndex == -1)
							{
								if(true /*arbitrary edit*/ &&
										ConfigurationAPI.editableFieldEditingOldValue_.length)
								{
									str += "<option value='" + ConfigurationAPI.encodeHTML(
											ConfigurationAPI.editableFieldEditingOldValue_)
										+ "'>";
									str += ConfigurationAPI.encodeHTML(ConfigurationAPI.editableFieldEditingOldValue_); //can display however
									str += "</option>";
									optionIndex = records.length;
								}
								else
									optionIndex = 0; //default to default
							}
							str += "</select>";

							//add arbitrary edit
							if (true)
							{
								var ww = (el.offsetWidth-6);
								if(ww < 150) ww = 150;
								str += "<input type='text' " +
										"id='fixedChoice-editTextBox' " +
										"style='display:none;" +
										"float:left;" +
										"margin:-2px 0 -" + (el.offsetHeight+6) + "px 0;" +
										"width:" +
										ww + "px; height:" + (el.offsetHeight+6) + "px" +
										"' " + //end style
										"></input>";

								str += "<div style='display:block;" +
										"margin: -2px 0 -7px 14px;" +
										"' " +
										"class='editableFieldNode-Value-editIcon' id='fixedChoice-editIcon" +
										"' " +
										"onclick='ConfigurationAPI.handleEditableFieldFixedChoiceEditToggle();' " +
										"title='Toggle free-form editing' " +
										"></div>";
							}

							str += "</div>";

							//finish up
							Debug.log("Finishing up select cell handling...");
							localFinishUpSelectCell();
						}); //end getSubsetRecords

					//successfully requested records
					return true;

				} //end localHandleDropdownForLinkUID()

				///////////// localHandleDropdownForLinkGroupID
				function localHandleDropdownForLinkGroupID(targetTable,childLinkIndex)
				{
					Debug.log("localHandleDropdownForLinkGroupID()",
							targetTable,
							childLinkIndex);

					//ready to get matching groupID field in destination table
					DesktopContent.XMLHttpRequest("Request?RequestType=getSpecificTable" +
							"&dataOffset=0&chunkSize=" + 0 +
							"&tableName=" + targetTable +
							"&version=" + "-1", //get mockup
							"",
							function (req)
							{

						var err = DesktopContent.getXMLValue(req, "Error");
						if (err)
						{
							Debug.log(err, Debug.HIGH_PRIORITY);

							Debug.log("There were errors loading the mockup version of '" +
									targetTable + "'.\n\n" +
									"Please see the detailed Errors below:", Debug.HIGH_PRIORITY);

							//try to power through
						}

						var warns = DesktopContent.getXMLValue(req, "TableWarnings");
						if (warns)
							Debug.log("There were warnings found when loading table '" +
									targetTable +
									"' (you can treat them as informational):\n\n" +
									warns, Debug.WARN_PRIORITY);

						var colTypeEls = req.responseXML.getElementsByTagName("CurrentVersionColumnHeaders")[0].getElementsByTagName("ColumnType");
						var colHdrs = req.responseXML.getElementsByTagName("CurrentVersionColumnHeaders")[0].getElementsByTagName("ColumnHeader");

						Debug.log("Looking for groupID column in linked to table matching " +
								childLinkIndex);

						var groupIdCol = -1;
						var groupIdField;
						for (var i = 0; i < colTypeEls.length; ++i)
							if (colTypeEls[i].getAttribute("value").split('-')[1] == childLinkIndex)
							{
								groupIdField = colHdrs[i].getAttribute("value");
								Debug.log("Found link groupid col " + i + " - " + groupIdField);
								groupIdCol = i;
								break;
							}

						var groupIds = [];
						if (groupIdCol == -1)
						{
							Debug.log("No matching GroupID column found at linked to table!", Debug.HIGH_PRIORITY);
						}
						else
						{

							//get unique values of the groupID field, for all records
							// a la ConfigurationGUI.html:L7868
							ConfigurationAPI.getSubsetRecords(tableEl.innerText,
									undefined /*filterList*/,
									function (records)
									{

								Debug.logv({records});
								if(!records || !records.length)
								{
									//could not find any records so just show text value
									Debug.log("Aborting link group ID search.");
									str += localFinishUpTextValueCell();
									localFinishUpSelectCell();
									return;
								}

								ConfigurationAPI.getUniqueFieldValuesForRecords(
										tableEl.innerText,
										records,
										groupIdField,
										function (obj)
										{
									Debug.logv({obj});

									if(!obj || !obj.length)
									{
										//could not find any records so just show text value
										Debug.log("Aborting link group ID search.");
										str += localFinishUpTextValueCell();
										localFinishUpSelectCell();
										return;
									}

									try
									{
										groupIds = obj[0].fieldUniqueValueArray;
									}
									catch (e)
									{
										Debug.log("Caught error: " + e);
									}

									localFinishGroupIdDropdown();

										}); //end getUniqueFieldValuesForRecords
									}); //end getSubsetRecords
						}

						///////////////////// localFinishGroupIdDropdown
						function localFinishGroupIdDropdown()
						{
							//create dropdown
							str += "<div onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event)' " +
									"onmouseup='event.stopPropagation();' " +
									"onclick='event.stopPropagation();' " +
									"style='" +
									"white-space:nowrap;" +
									"margin:-3px -2px -2px -1px;" +
									"height:" + (el.offsetHeight+6) + "px'>";

							str += "<select  onkeydown='ConfigurationAPI.handleEditableFieldKeyDown(event)' " +
									"id='fixedChoice-editSelectBox' " +
									"onmouseup='event.stopPropagation();' " +
									"onclick='event.stopPropagation();' " +
									"style='" +
									"float:left;" +
									"margin:-2px -2px -2px -1px; height:" +
									(el.offsetHeight+6) + "px'>";
							optionIndex = -1;
							for (var i = 0; i < groupIds.length; ++i)
							{
								str += "<option value='" + groupIds[i]
																	+ "'>";
								str += groupIds[i]; //can display however
								str += "</option>";
								if (groupIds[i]
											 == ConfigurationAPI.editableFieldEditingOldValue_)
									optionIndex = i; //get starting sel index
							}
							//if not found, add current tmp value (probably user created recently)
							if(optionIndex == -1)
							{
								if(true /*arbitrary edit*/ &&
										ConfigurationAPI.editableFieldEditingOldValue_.length)
								{
									str += "<option value='" + ConfigurationAPI.encodeHTML(
											ConfigurationAPI.editableFieldEditingOldValue_)
															+ "'>";
									str += ConfigurationAPI.encodeHTML(ConfigurationAPI.editableFieldEditingOldValue_); //can display however
									str += "</option>";
									optionIndex = groupIds.length;
								}
								else
									optionIndex = 0; //default to default
							}
							str += "</select>";

							//add arbitrary edit
							if (true)
							{
								var ww = (el.offsetWidth-6);
								if(ww < 150) ww = 150;
								str += "<input type='text' " +
										"id='fixedChoice-editTextBox' " +
										"style='display:none;" +
										"float:left;" +
										"margin:-2px 0 -" + (el.offsetHeight+6) + "px 0;" +
										"width:" +
										ww + "px; height:" + (el.offsetHeight+6) + "px" +
										"' " + //end style
										"></input>";

								str += "<div style='display:block;" +
										"margin: -2px 0 -7px 14px;" +
										"' " +
										"class='editableFieldNode-Value-editIcon' id='fixedChoice-editIcon" +
										"' " +
										"onclick='ConfigurationAPI.handleEditableFieldFixedChoiceEditToggle();' " +
										"title='Toggle free-form editing' " +
										"></div>";
							}

							str += "</div>";

							//finish up
							Debug.log("Finishing up group-id select cell handling...");
							localFinishUpSelectCell();

						}	//end localFinishGroupIdDropdown
							}, //end getSpecificTable request handler
							0, 0, true  //reqParam, progressHandler, callHandlerOnErr
					); //end XML Request for getSpecificTable
				} //end localHandleDropdownForLinkGroupID()

			} //end selectThisTreeNode();
		}
		else
		{
			Debug.log("This should be impossible - tell a developer how you got here!", Debug.HIGH_PRIORITY);
			return;
		}
	}
	else		//1x click
	{
		if(type == "value")
		{
			//Mark selected
			Debug.log("Toggling selection of target field " + idString);

			//remove previously selected
			var vel;
			if(ConfigurationAPI.editableFieldSelectedIdString_ &&
					(vel = document.getElementById("editableFieldNode-Value-" +
										ConfigurationAPI.editableFieldSelectedIdString_)))
				vel.style.backgroundColor = "transparent";

			//add newly selected
			vel = document.getElementById("editableFieldNode-Value-" +
					idString);
			if(ConfigurationAPI.editableFieldSelectedIdString_ == idString)
			{
				//same field was clicked
				//	so toggle (deselect) the previously selected field
				ConfigurationAPI.editableFieldSelectedIdString_ = undefined;
				return;
			}
			vel.style.backgroundColor = ConfigurationAPI.editableField_SELECTED_COLOR_;
			ConfigurationAPI.editableFieldSelectedIdString_ = idString;
		}
		else
		{
			Debug.log("This should be impossible - tell a developer how you got here!", Debug.HIGH_PRIORITY);
			return;
		}
	}

} //end handleEditableFieldClick()

//=====================================================================================//==============================================================================
//encodeHTML ~~
ConfigurationAPI.encodeHTML = function(s)
{
	// Debug.log("encodeHTML()",s);
	var el = document.createElement("div");
	el.innerText = el.textContent = s;
	s = el.innerHTML;
	return s.replace(/'/g, '&apos;').replace(/"/g, '&quot;');
} //end encodeHTML()

//=====================================================================================
//getSelectedEditableFieldIndex ~~
//	returns the unique field index value for the selected field
//	if no selected field
//		returns -1
ConfigurationAPI.getSelectedEditableFieldIndex = function()
{
	if(!ConfigurationAPI.editableFieldSelectedIdString_)
		return -1;

	var idStr = ConfigurationAPI.editableFieldSelectedIdString_;
	return idStr.split('-')[1]; // depth + "-" + fieldId
} //end getSelectedEditableFieldIndex()

//=====================================================================================
//handleEditableFieldHover ~~
//	handler for mousemove event for editable field elements
ConfigurationAPI.handleEditableFieldHover = function(depth,uid,event)
{
	var idString = depth + "-" + uid;

	//Debug.log("handleEditableFieldHover idString " + idString);

	event.stopPropagation();
	DesktopContent.mouseMove(event); //keep desktop content happy


	if(ConfigurationAPI.editableFieldEditingCell_) return; //no setting while editing

	var el = document.getElementById("editableFieldNode-Value-editIcon-" + idString);
	if(ConfigurationAPI.editableFieldHoveringCell_ == el) return;

	if(ConfigurationAPI.editableFieldHoveringCell_)
	{
		//Debug.log("bodyMouseMoveHandler clearing ");
		bodyMouseMoveHandler();
	}

	//Debug.log("handleTreeNodeMouseMove setting ");
	ConfigurationAPI.editableFieldHoveringIdString_ = idString;
	ConfigurationAPI.editableFieldHoveringCell_ = el;
	ConfigurationAPI.editableFieldHoveringCell_.style.display = "block";
	var vel = document.getElementById("editableFieldNode-Value-" +
			ConfigurationAPI.editableFieldHoveringIdString_);
	vel.style.backgroundColor = "rgb(218, 194, 194)";
} //end handleEditableFieldHover()

//=====================================================================================
//handleEditableFieldFixedChoiceEditToggle ~~
ConfigurationAPI.handleEditableFieldFixedChoiceEditToggle = function()
{
	Debug.log("handleEditableFieldFixedChoiceEditToggle");

	var sel = document.getElementById("fixedChoice-editSelectBox");
	var tel = document.getElementById("fixedChoice-editTextBox");

	Debug.log("sel.style.display  " + sel.style.display);
	if(sel.style.display == "none")
	{
		sel.style.display = "block";
		tel.style.display = "none";
	}
	else
	{
		tel.style.width = ((sel.offsetWidth>150?sel.offsetWidth:150)-2) + "px";
		tel.parentNode.style.width = ((sel.offsetWidth>150?sel.offsetWidth:150)+50) + "px"; //div may need to expand to accommodate pencil in display
		sel.style.display = "none";

		if(tel.value == "") //fill with oldvalue for user convenience, if blank
			tel.value = ConfigurationAPI.editableFieldEditingOldValue_;

		tel.style.display = "block";
		ConfigurationAPI.setCaretPosition(tel,0,tel.value.length);
	}
} //end handleEditableFieldFixedChoiceEditToggle()

//=====================================================================================
//handleEditableFieldBodyMouseMove ~~
ConfigurationAPI.handleEditableFieldBodyMouseMove = function(e)
{
	if(ConfigurationAPI.editableFieldHoveringCell_)
	{
		//Debug.log("bodyMouseMoveHandler clearing ");
		ConfigurationAPI.editableFieldHoveringCell_.style.display = "none";
		ConfigurationAPI.editableFieldHoveringCell_ = 0;

		var vel = document.getElementById("editableFieldNode-Value-" +
				ConfigurationAPI.editableFieldHoveringIdString_);
		if(vel)
		{
			if(ConfigurationAPI.editableFieldHoveringIdString_ ==
					ConfigurationAPI.editableFieldSelectedIdString_)
				vel.style.backgroundColor = ConfigurationAPI.editableField_SELECTED_COLOR_;
			else
				vel.style.backgroundColor = "transparent";
		}
	}
} //end handleEditableFieldBodyMouseMove()

//=====================================================================================
//handleEditableFieldKeyDown ~~
//	copied from ConfigurationGUI keyHandler but modified for only value cells
ConfigurationAPI.handleEditableFieldKeyDown = function(e,keyEl)
{
	// var TABKEY = 9;
	// var ENTERKEY = 13;
	// var UPKEY = 38;
	// var DNKEY = 40;
	// var ESCKEY = 27;
	//Debug.log("key " + e.keyCode);
	//keyCode is deprecated, switching to key

	var shiftIsDown;
	// var key;
	if (window.event)
	{
		// key = window.event.keyCode;
		shiftIsDown = !!window.event.shiftKey; // typecast to boolean
	}
	else
	{
		// key = e.which;
		shiftIsDown = !!e.shiftKey;	// typecast to boolean
	}
	//Debug.log("shift=" + shiftIsDown);


	//handle text area specially
	if(!shiftIsDown)
	{
		var tel;
		if(ConfigurationAPI.editableFieldEditingCell_ &&
				(tel = ConfigurationAPI.editableFieldEditingCell_.getElementsByTagName("textarea")).length)
		{
			tel = tel[0];
			//handle special keys for text area
			if(e.key == "Tab")
			{
				Debug.log("tab.");
				if(e.preventDefault)
					e.preventDefault();

				var i = tel.selectionStart;
				var j = tel.selectionEnd;
				tel.value =  tel.value.substr(0,i) +
						'\t' + tel.value.substr(j);
				tel.selectionStart = tel.selectionEnd = j+1;
			}
			return false; //done if text area was identified
		}
	}

	//tab key jumps to next cell with a CANCEL
	//	(enter key does same except saves/OKs value)
	//	shift is reverse jump
	if(e.key == "Tab" || e.key == "Enter" ||
			e.key == "ArrowUp" || e.key == "ArrowDown")
	{
		//this.value += "    ";
		if(e.preventDefault)
			e.preventDefault();

		//save idString
		var idString = ConfigurationAPI.editableFieldEditingIdString_;

		ConfigurationAPI.handleEditableFieldEditOK();


		//enter key := done
		//tab/shift+tab := move to next field at depth
		//down/up	:= move to next field at depth


		if(e.key == "Enter") //dont move to new cell
			return false;

		var depth = idString.split('-')[0];
		var uid = idString.split('-')[1];

		if((!shiftIsDown && e.key == "Tab") || e.key == "ArrowDown") //move to next field
			++uid;
		else if((shiftIsDown && e.key == "Tab") || e.key == "ArrowUp") //move to prev field
			--uid;
		if(uid < 0) return false; //no more fields, do nothing

		//assume handleEditableFieldClick handles invalid uids on high side gracefully
		ConfigurationAPI.handleEditableFieldClick(depth,uid,1,"value");
		Debug.log("new uid=" + uid);

		return false;
	}
	else if(e.key == "Escape")
	{
		if(e.preventDefault)
			e.preventDefault();
		ConfigurationAPI.handleEditableFieldEditCancel();
		return false;
	}
	else if(e.key == "0" || // numbers 0-9
		((e.key|0) >= 1 && (e.key|0) <= 9))
	{
		//if child link cell or boolean cell
		var sel;
		if((sel = ConfigurationAPI.editableFieldEditingCell_.getElementsByTagName("select")).length)
		{
			if(keyEl) //if input element, use it
				sel = keyEl;
			else
				sel = sel[sel.length-1]; //assume the last select in the cell is the select

			//select based on number
			var selNum = (e.key|0);

			sel.selectedIndex = selNum % (sel.options.length);
			sel.focus();

			Debug.log("number select =" + sel.selectedIndex);
			if(sel.onchange) //if onchange implemented call it
				sel.onchange();
		}
	}
} //end handleEditableFieldKeyDown()

//=====================================================================================
//handleEditableFieldEditCancel ~~
//	copied from ConfigurationGUI editCellCancel but modified for only value cells
ConfigurationAPI.handleEditableFieldEditCancel = function()
{
	if(!ConfigurationAPI.editableFieldEditingCell_) return;
	Debug.log("handleEditableFieldEditCancel type " + ConfigurationAPI.editableFieldEditingNodeType_);

	try //try to return link visibility
	{
		var idSplit = ConfigurationAPI.editableFieldEditingCell_.id.split('-');
		var depth = idSplit[idSplit.length-2];
		var uid = idSplit[idSplit.length-1];
		document.getElementById("editableFieldNode-ChildLink-SubConfigLinkTab-" +
				(depth + "-" + uid) ).style.display = "block";
		document.getElementById("editableFieldNode-ChildLink-SubConfigLinkWindow-" +
				(depth + "-" + uid) ).style.display = "block";
	}
	catch(e) {} //ignore error


	if(ConfigurationAPI.editableFieldEditingNodeType_ == "value-bool")
	{
		//take old value as HTML for bool values
		ConfigurationAPI.editableFieldEditingCell_.innerHTML = ConfigurationAPI.editableFieldEditingOldValue_;
	}
	else
	{
		ConfigurationAPI.editableFieldEditingCell_.innerHTML = "";
		ConfigurationAPI.editableFieldEditingCell_.appendChild(
				document.createTextNode(ConfigurationAPI.editableFieldEditingOldValue_));
	}

	ConfigurationAPI.editableFieldEditingCell_ = 0;
} //end handleEditableFieldEditCancel()

//=====================================================================================
//handleEditableFieldEditOK ~~
//	copied from ConfigurationGUI editCellOK but modified for only value cells
ConfigurationAPI.handleEditableFieldEditOK = function()
{
	if(!ConfigurationAPI.editableFieldEditingCell_) return;
	Debug.log("handleEditableFieldEditOK type " + ConfigurationAPI.editableFieldEditingNodeType_);

	try //try to return link visibility
	{
		var idSplit = ConfigurationAPI.editableFieldEditingCell_.id.split('-');
		var depth = idSplit[idSplit.length-2];
		var uid = idSplit[idSplit.length-1];
		document.getElementById("editableFieldNode-ChildLink-SubConfigLinkTab-" +
				(depth + "-" + uid) ).style.display = "block";
		document.getElementById("editableFieldNode-ChildLink-SubConfigLinkWindow-" +
				(depth + "-" + uid) ).style.display = "block";
	}
	catch(e) {} //ignore error

	var el = ConfigurationAPI.editableFieldEditingCell_;
	var type = ConfigurationAPI.editableFieldEditingNodeType_;

	///////////////////////////////////////////////
	//localEditTreeNodeOKRequestsComplete
	function localEditTreeNodeOKRequestsComplete(newValue)
	{
		// all value types, clear the cell first
		el.innerHTML = "";


		if(type == "value" ||
				type == "value-bitmap" ||
				type == "value-groupid" ||
				type == "value-childLink" ||
				type == "value-ChildLinkGroupID" ||
				type == "value-ChildLinkUID")
		{
			//MultilineData, select, and normal
			//also bitmap data (do nothing would be ok, value already set)
			el.appendChild(document.createTextNode(decodeURIComponent(newValue)));
		}
		else if(type == "value-bool")
		{
			var str = "";

			//colorize true false
			str += "<div style='float:left'>";
			str += newValue;
			str += "</div>";

			var color = (newValue == "On" || newValue == "Yes" || newValue == "True")?
					"rgb(16, 204, 16)":"rgb(255, 0, 0);";
			str += "<div style='width:10px;height:10px;" +
					"background-color:" + color + ";" +
					"float: left;" +
					"border-radius: 7px;" +
					"border: 2px solid white;" +
					"margin: 2px 0 0 6px;" +
					"'></div>";
			el.innerHTML = str;
		}
		else	//unrecognized type!?
		{
			Debug.err("Unrecognizd tree edit type '" +
					type + "'! Should be impossible!");
			ConfigurationAPI.handleEditableFieldEditCancel(); return;
		}

		//requests are done, so end editing
		ConfigurationAPI.editableFieldEditingCell_ = 0;
	} //end localEditTreeNodeOKRequestsComplete
	///////////////////////////////////////////////


	if(
			type == "value" ||
			type == "value-bool" ||
			type == "value-bitmap" ||
			type == "value-groupid" ||
			type == "value-childLink" ||
			type == "value-ChildLinkGroupID" ||
			type == "value-ChildLinkUID")

	{
		var newValue;

		if(type == "value-bool")
		{
			var sel = el.getElementsByTagName("select")[0];
			newValue = sel.options[sel.selectedIndex].value;
		}
		else if(type == "value-bitmap")
		{
			newValue = encodeURIComponent(el.textContent);
		}
		else	//value (normal, select, or multiline data)
		{
			var sel;
			if((sel = el.getElementsByTagName("textarea")).length) //for MultilineData
				newValue = sel[0].value; //assume the first textarea in the cell is the textarea
			else if((sel = el.getElementsByTagName("select")).length) //for FixedChoiceData
			{
				//check if displayed
				if(sel[0].style.display == "none")
				{
					//if not displayed assume first input field is ours!
					//take "normal cell" approach from below
					newValue = el.getElementsByTagName("input")[0].value;
				}
				else
					newValue = sel[0].options[sel[0].selectedIndex].value; //assume the first select dropbox in the cell is the one
			}
			else
				newValue = el.getElementsByTagName("input")[0].value;

			newValue = encodeURIComponent(newValue.trim());

			if(type == "value-childLink")
			{
				Debug.log("Checking link value against active tables");
				var found = false;
				for(var activeTable in ConfigurationAPI._activeTables)
					if(newValue == activeTable)
					{
						found = true; break;
					}
				if(!found)
				{
					Debug.warn("We noticed the child link target table '" +
							newValue + "' was not found in the list of active tables. " +
							"You may be able to ignore this issue, or your table group might fail to activate during State Machine transitions. " +
							"\n\n" +
							"To add a table to a group, in the Configuration Editor GUI, go to go to the " +
							"group view, then click 'Add/Remove/Modify Member Tables.' You " +
							"can then add or remove tables and save the new group." +
							"\n\n" +
							"OR!!! Click the following button to add the table '" + newValue +
							"' to the Configuration Group: " +
							"<input type='button' style='color:black !important;' " +
							"title='Click to add table to the active Configuration Group' " +
							"onclick='ConfigurationAPI.addTableToConfigurationGroup(\"" +
							newValue + "\"); Debug.closeErrorPop();event.stopPropagation(); ' value='Add Table'>" +
							"</input>");
				}
			} //end childLink special handling
		} //end standard value handling

		Debug.log("CfgGUI editTreeNodeOK editing " + type + " node = " +
				newValue);

		if(ConfigurationAPI.editableFieldEditingInitValue_ == newValue)
		{
			Debug.log("No change. Do nothing.");
			ConfigurationAPI.handleEditableFieldEditCancel();
			return;
		}


		//		if saved successfully
		//			update value in field

		localEditTreeNodeOKRequestsComplete(newValue);

	}
	else	//unrecognized type!?
	{
		Debug.err("Unrecognizd tree edit type '" +
				type + "'! Should be impossible!");
		ConfigurationAPI.handleEditableFieldEditCancel(); return;
	}
} //end handleEditableFieldEditOK()


//=====================================================================================
//hasClass ~~
ConfigurationAPI.hasClass = function(ele,cls)
{
	return !!ele.className.match(new RegExp('(\\s|^)'+cls+'(\\s|$)'));
}

//=====================================================================================
//addClass ~~
ConfigurationAPI.addClass = function(ele,cls)
{
	if (!ConfigurationAPI.hasClass(ele,cls)) ele.className += " "+cls;
}

//=====================================================================================
//removeClass ~~
ConfigurationAPI.removeClass = function(ele,cls)
{
	if (ConfigurationAPI.hasClass(ele,cls))
	{
		var reg = new RegExp('(\\s|^)'+cls+'(\\s|$)');
		ele.className=ele.className.replace(reg,'');
	}
}


//=====================================================================================
//addSubsetRecords ~~
//	Takes as input a base path where the desired records should be created.
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of Table objects
//		Table := {}
//			obj.tableName
//			obj.tableVersion
//			obj.tableComment
//
ConfigurationAPI.addSubsetRecords = function(subsetBasePath,
		recordArr,responseHandler,modifiedTablesIn,silenceErrors)
{
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTablesIn && i<modifiedTablesIn.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTablesIn[i].tableName + "," +
				modifiedTablesIn[i].tableVersion;
	}

	var recordListStr = "";
	if(Array.isArray(recordArr))
		for(var i=0;i<recordArr.length;++i)
		{
			if(i) recordListStr += ",";
			recordListStr += encodeURIComponent(recordArr[i]);
		}
	else //handle single record case
		recordListStr = encodeURIComponent(recordArr);

	DesktopContent.XMLHttpRequest("Request?RequestType=addTreeNodeRecords" +
			"&tableGroup=" +
			"&tableGroupKey=-1", //end get data
			"startPath=/" + subsetBasePath +
			"&recordList=" + recordListStr +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var modifiedTables = [];

		var err = DesktopContent.getXMLValue(req,"Error");
		if(err)
		{
			if(!silenceErrors)
				Debug.log(err,Debug.HIGH_PRIORITY);
			responseHandler(modifiedTables,err);
			return;
		}
		if(errStr)
		{
			if(!silenceErrors)
				Debug.log(errStr,Debug.HIGH_PRIORITY);
			responseHandler(modifiedTables,err);
			return;
		}

		//console.log(req);

		//modifiedTables
		var tableNames = req.responseXML.getElementsByTagName("NewActiveTableName");
		var tableVersions = req.responseXML.getElementsByTagName("NewActiveTableVersion");
		var tableComments = req.responseXML.getElementsByTagName("NewActiveTableComment");
		var tableVersion;

		//add only temporary version
		for(var i=0;i<tableNames.length;++i)
		{
			tableVersion = DesktopContent.getXMLValue(tableVersions[i])|0; //force integer
			if(tableVersion >= -1) continue; //skip unless temporary
			var obj = {};
			obj.tableName = DesktopContent.getXMLValue(tableNames[i]);
			obj.tableVersion = DesktopContent.getXMLValue(tableVersions[i]);
			obj.tableComment = DesktopContent.getXMLValue(tableComments[i]);
			modifiedTables.push(obj);
		}
		responseHandler(modifiedTables);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr

} // end ConfigurationAPI.addSubsetRecords()


//=====================================================================================
//deleteSubsetRecords ~~
//	Takes as input a base path where the desired records should be deleted.
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of Table objects
//		Table := {}
//			obj.tableName
//			obj.tableVersion
//			obj.tableComment
//
ConfigurationAPI.deleteSubsetRecords = function(subsetBasePath,
		recordArr,responseHandler,modifiedTablesIn,silenceErrors)
{
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTablesIn && i<modifiedTablesIn.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTablesIn[i].tableName + "," +
				modifiedTablesIn[i].tableVersion;
	}

	var recordListStr = "";
	var recordCount = 1;
	if(Array.isArray(recordArr))
	{
		for(var i=0;i<recordArr.length;++i)
		{
			if(i) recordListStr += ",";
			recordListStr += encodeURIComponent(recordArr[i]);
		}
		recordCount = recordArr.length;
	}
	else //handle single record case
		recordListStr = encodeURIComponent(recordArr);

	DesktopContent.XMLHttpRequest("Request?RequestType=deleteTreeNodeRecords" +
			"&tableGroup=" +
			"&tableGroupKey=-1", //end get data
			"startPath=/" + subsetBasePath +
			"&recordList=" + recordListStr +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var err = DesktopContent.getXMLValue(req,"Error");
		var modifiedTables = [];
		if(err)
		{
			if(!silenceErrors)
				Debug.log(err,Debug.HIGH_PRIORITY);
			responseHandler(modifiedTables,err);
			return;
		}
		if(errStr)
		{
			if(!silenceErrors)
				Debug.log(errStr,Debug.HIGH_PRIORITY);
			responseHandler(modifiedTables,err);
			return;
		}

		//console.log(req);

		//modifiedTables
		var tableNames = req.responseXML.getElementsByTagName("NewActiveTableName");
		var tableVersions = req.responseXML.getElementsByTagName("NewActiveTableVersion");
		var tableComments = req.responseXML.getElementsByTagName("NewActiveTableComment");
		var tableVersion;

		//add only temporary version
		for(var i=0;i<tableNames.length;++i)
		{
			tableVersion = DesktopContent.getXMLValue(tableVersions[i])|0; //force integer
			if(tableVersion >= -1) continue; //skip unless temporary
			var obj = {};
			obj.tableName = DesktopContent.getXMLValue(tableNames[i]);
			obj.tableVersion = DesktopContent.getXMLValue(tableVersions[i]);
			obj.tableComment = DesktopContent.getXMLValue(tableComments[i]);
			modifiedTables.push(obj);
		}
		responseHandler(modifiedTables,undefined,subsetBasePath,recordCount);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr

} // end ConfigurationAPI.deleteSubsetRecords()

//=====================================================================================
//renameSubsetRecords ~~
//	Takes as input a base path where the desired records should be renamed.
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of Table objects
//		Table := {}
//			obj.tableName
//			obj.tableVersion
//			obj.tableComment
//
ConfigurationAPI.renameSubsetRecords = function(subsetBasePath,
		recordArr,newRecordArr,responseHandler,modifiedTablesIn,silenceErrors)
{
	Debug.log("renameSubsetRecords()");

	var modifiedTablesListStr = "";
	for(var i=0;modifiedTablesIn && i<modifiedTablesIn.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTablesIn[i].tableName + "," +
				modifiedTablesIn[i].tableVersion;
	}

	var recordListStr = "";
	var recordCount = 1;
	if(Array.isArray(recordArr))
	{
		for(var i=0;i<recordArr.length;++i)
		{
			if(i) recordListStr += ",";
			recordListStr += encodeURIComponent(recordArr[i]);
		}
		recordCount = recordArr.length;
	}
	else //handle single record case
		recordListStr = encodeURIComponent(recordArr);

	var newRecordListStr = "";
	var newRecordCount = 1;
	if(Array.isArray(newRecordArr))
	{
		for(var i=0;i<newRecordArr.length;++i)
		{
			if(i) newRecordListStr += ",";
			newRecordListStr += encodeURIComponent(newRecordArr[i]);
		}
		newRecordCount = newRecordArr.length;
	}
	else //handle single record case
		newRecordListStr = encodeURIComponent(newRecordArr);

	DesktopContent.XMLHttpRequest("Request?RequestType=renameTreeNodeRecords" +
			"&tableGroup=" +
			"&tableGroupKey=-1", //end get data
			"startPath=/" + subsetBasePath +
			"&recordList=" + recordListStr +
			"&newRecordList=" + newRecordListStr +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var err = DesktopContent.getXMLValue(req,"Error");
		var modifiedTables = [];
		if(err)
		{
			if(!silenceErrors)
				Debug.log(err,Debug.HIGH_PRIORITY);
			responseHandler(modifiedTables,err);
			return;
		}
		if(errStr)
		{
			if(!silenceErrors)
				Debug.log(errStr,Debug.HIGH_PRIORITY);
			responseHandler(modifiedTables,err);
			return;
		}

		//console.log(req);

		//modifiedTables
		var tableNames = req.responseXML.getElementsByTagName("NewActiveTableName");
		var tableVersions = req.responseXML.getElementsByTagName("NewActiveTableVersion");
		var tableComments = req.responseXML.getElementsByTagName("NewActiveTableComment");
		var tableVersion;

		//add only temporary version
		for(var i=0;i<tableNames.length;++i)
		{
			tableVersion = DesktopContent.getXMLValue(tableVersions[i])|0; //force integer
			if(tableVersion >= -1) continue; //skip unless temporary
			var obj = {};
			obj.tableName = DesktopContent.getXMLValue(tableNames[i]);
			obj.tableVersion = DesktopContent.getXMLValue(tableVersions[i]);
			obj.tableComment = DesktopContent.getXMLValue(tableComments[i]);
			modifiedTables.push(obj);
		}
		responseHandler(modifiedTables,undefined,subsetBasePath,recordCount);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr

} //end ConfigurationAPI.renameSubsetRecords()

//=====================================================================================
//copySubsetRecords ~~
//	Takes as input a base path where the desired records should be copied.
//  Incremental unique names will be created by the server.
//
// <modifiedTables> is an array of Table objects (as returned from
//		ConfigurationAPI.setFieldValuesForRecords)
//
//	when complete, the responseHandler is called with an array parameter.
//		on failure, the array will be empty.
//		on success, the array will be an array of Table objects
//		Table := {}
//			obj.tableName
//			obj.tableVersion
//			obj.tableComment
//
ConfigurationAPI.copySubsetRecords = function(subsetBasePath,
		recordArr,numberOfCopies,responseHandler,modifiedTablesIn,silenceErrors)
{
	if(!numberOfCopies) numberOfCopies = 1;
	Debug.log("copySubsetRecords() " + numberOfCopies);

	var modifiedTablesListStr = "";
	for(var i=0;modifiedTablesIn && i<modifiedTablesIn.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTablesIn[i].tableName + "," +
				modifiedTablesIn[i].tableVersion;
	}

	var recordListStr = "";
	var recordCount = 1;
	if(Array.isArray(recordArr))
	{
		for(var i=0;i<recordArr.length;++i)
		{
			if(i) recordListStr += ",";
			recordListStr += encodeURIComponent(recordArr[i]);
		}
		recordCount = recordArr.length;
	}
	else //handle single record case
		recordListStr = encodeURIComponent(recordArr);

	DesktopContent.XMLHttpRequest("Request?RequestType=copyTreeNodeRecords" +
			"&tableGroup=" +
			"&tableGroupKey=-1" +
			"&numberOfCopies=" + numberOfCopies, //end get data
			"startPath=/" + subsetBasePath +
			"&recordList=" + recordListStr +
			"&modifiedTables=" + modifiedTablesListStr, //end post data
			function(req, reqParam, errStr)
			{
		var err = DesktopContent.getXMLValue(req,"Error");
		var modifiedTables = [];
		if(err)
		{
			if(!silenceErrors)
				Debug.log(err,Debug.HIGH_PRIORITY);
			responseHandler(modifiedTables,err);
			return;
		}
		if(errStr)
		{
			if(!silenceErrors)
				Debug.log(errStr,Debug.HIGH_PRIORITY);
			responseHandler(modifiedTables,err);
			return;
		}

		//console.log(req);

		//modifiedTables
		var tableNames = req.responseXML.getElementsByTagName("NewActiveTableName");
		var tableVersions = req.responseXML.getElementsByTagName("NewActiveTableVersion");
		var tableComments = req.responseXML.getElementsByTagName("NewActiveTableComment");
		var tableVersion;

		//add only temporary version
		for(var i=0;i<tableNames.length;++i)
		{
			tableVersion = DesktopContent.getXMLValue(tableVersions[i])|0; //force integer
			if(tableVersion >= -1) continue; //skip unless temporary
			var obj = {};
			obj.tableName = DesktopContent.getXMLValue(tableNames[i]);
			obj.tableVersion = DesktopContent.getXMLValue(tableVersions[i]);
			obj.tableComment = DesktopContent.getXMLValue(tableComments[i]);
			modifiedTables.push(obj);
		}
		responseHandler(modifiedTables,undefined,subsetBasePath,recordCount);

			}, //handler
			0, //handler param
			0,true); //progressHandler, callHandlerOnErr

} //end ConfigurationAPI.copySubsetRecords()

//=====================================================================================
//incrementName ~~
ConfigurationAPI.incrementName = function(name)
{
	//find last non-numeric
	for(var i=name.length-1;i>=0;--i)
		if(!(name[i] >= '0' && name[i] <= '9'))
			break;
	//note: if all numbers, then i is -1, which still works
	var num = (name.substr(i+1)|0) + 1;
	name = name.substr(0,i+1);
	return name + num;
} //end incrementName()

//=====================================================================================
//createNewRecordName ~~
ConfigurationAPI.createNewRecordName = function(startingName,existingArr)
{
	var retVal = startingName;
	var found,i;
	try
	{
		var apps = existingArr;
		do
		{
			retVal = ConfigurationAPI.incrementName(retVal);
			found = false;
			for(i=0;i<apps.length;++i)
				if(apps[i] == retVal)
				{found = true; break;}
		} while(found);
		Debug.log("createNewRecordName " + retVal);
	}
	catch(e)
	{
		//ignore errors.. assume no all apps
		return ConfigurationAPI.incrementName(retVal);
	}

	return retVal;
} //end createNewRecordName()

//=====================================================================================
//createTableColumnHeaderHTML ~~
ConfigurationAPI.createTableColumnHeaderHTML = function(colType,colDataType,colChoices,
	colDefaultValue,colMinValue,colMaxValue)
{
	var colChoicesArr; //condition col choices
	if(colChoices)
	{
		if(Array.isArray(colChoices)) //if input is an array
			colChoicesArr = colChoices;
		else //else create the array from string
			colChoicesArr = colChoices.split(',');
	}
	else //no column choices, so create empty array
		colChoicesArr = [];

	var str = "";
	str += "<div style='font-size:12px' title='";
	str += colType;
	str += " &#60;" + colDataType + "&#62;";
	str += "\n[Default: " + colDefaultValue;

	// if any, show min and max
	if (colDataType == ConfigurationAPI._NUMBER_TYPE)
	{
		if (colMinValue && colMinValue != "")
			str += "\nMinimum: " + colMinValue;
		if (colMaxValue && colMaxValue != "")
			str += "\nMaximum: " + colMaxValue;

	}
	// if bitmap, show non-default params
	if (colType == ConfigurationAPI._BITMAP_DATA_TYPE)
	{
		// extract bitMapInfo parameters:
		//	must match TableEditor js handling:

		//		[ //types => 0:string, 1:bool (default no),
		//		  //2:bool (default yes), 3:color
		//
		// 0		  0,//"Number of Rows",
		// 1		  0,//"Number of Columns",
		// 2		  0,//"Cell Bit-field Size",
		// 3		  0,//"Min-value Allowed",
		// 4		  0,//"Max-value Allowed",
		// 5		  0,//"Value step-size Allowed",
		// 6		  0,//"Display Aspect H:W",
		// 7		  3,//"Min-value Cell Color",
		// 8		  3,//"Mid-value Cell Color",
		// 9		  3,//"Max-value Cell Color",
		// 10		  3,//"Absolute Min-value Cell Color",
		// 11		  3,//"Absolute Max-value Cell Color",
		// 12		  1,//"Display Rows in Ascending Order",
		// 13		  2,//"Display Columns in Ascending Order",
		// 14		  1,//"Snake Double Rows",
		// 15		  1,//"Snake Double Columns",
		// 16		  1,//"Allow Floating Point",
		// 17		  0// "Value Map to Strings"
		

		Debug.log("Bitmap colChoicesArr",colChoicesArr);
		if(colChoicesArr.length > 3)
		{
			str += "\nRow, Cols, Bits: " + colChoicesArr[0];
			str += ", " + colChoicesArr[1];
			str += ", " + colChoicesArr[2];
		}

		for(let i=3; i < colChoicesArr.length; ++i)
			if(colChoices[i] != ConfigurationAPI._DEFAULT)
			{
				switch(i)
				{
					case 3: 
						str += "\n" + "Min-value: " + colChoices[i]; 
						break;
					case 4: 
						str += "\n" + "Max-value: " + colChoices[i]; 
						break;
					case 5: 
						str += "\n" + "Step-size: " + colChoices[i]; 
						break;
					case 6: 
						str += "\n" + "Cell Aspect Ratio: " + colChoices[i]; 
						break;
					case 16:
						if(colChoices[i] == "Yes")
							str += "\n" + "Allow Floating Point: " + colChoices[i]; 
						break;
					case 17:						
						str += "\n" + "Value-Map: " + colChoices[i]; 
						break;
					default: //do not show some params
				}
			}

	}

	str += "]"; //end title
	str += "'><label style='font-weight:bold;color:black;font-size:12px;'>";
	str += colType;
	str += "</label><br>&#60;" + colDataType + "&#62;<br>";
	if(colDataType != ConfigurationAPI._DATE_TYPE)
	{
		str += "[Default: " + colDefaultValue;

		//if fixed choice, then show that Default= the first choice
		if(colType == ConfigurationAPI._FIXED_CHOICE_DATA_TYPE)
		{
			//colChoices is an array (not a map)..
			if(colChoicesArr.length > 1)
				str += " = " + decodeURIComponent(colChoicesArr[1]); //skip arbitrary bool entry [0]
		}

		if (colDataType == ConfigurationAPI._NUMBER_TYPE)
		{
			if (colMinValue && colMinValue != "")
				str += "<br>Minimum: " + colMinValue;
			if (colMaxValue && colMaxValue != "")
				str += "<br>Maximum: " + colMaxValue;
		}

		// if bitmap, show non-default key params
		if (colType == ConfigurationAPI._BITMAP_DATA_TYPE)
		{
			if(colChoicesArr.length > 3)
			{
				str += "<br>Row, Cols, Bits: " + colChoicesArr[0];
				str += ", " + colChoicesArr[1];
				str += ", " + colChoicesArr[2];

				for(let i=3; i < colChoicesArr.length; ++i)
					if(colChoices[i] != ConfigurationAPI._DEFAULT)
					{
						switch(i)
						{
							case 16:
								if(colChoices[i] == "Yes")
									str += ", " + "Float"; 
								break;
							case 17:						
								str += ", " + "Value-Map"; 
								break;
							default: //do not show some params
						}
					}
			}
		}
		str += "]";
	}
	else str += "&nbsp;"; //force matching vertical height
	str += "</div>";
	return str;
} //end createTableColumnHeaderHTML()
