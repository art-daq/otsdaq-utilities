

//	Description of Delete Wizard Configuration GUI Functionality/Behavior:
//	
//	Example call:
//		DeleteWiz.createWiz(
//				function(atLeastOneRecordWasDeleted)
//				{				
//			Debug.log("Done at Template! " + atLeastOneRecordWasDeleted,
//					Debug.INFO_PRIORITY);
//				});
//
//	- User can have LOCK
//
//	Display:
//		- walk through steps at center of window
//			- use popup dialog to place at center
//		- steps:
//			- (error if unrecognized base path)
//			- "what is the name of your <delete type>?"
//				- note the active context and table group being modified, with dropdown to 
//					change them.		
//			- "which one?"
//				- "How deep?"
//			
//

/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////

//public functions:
//	DeleteWiz.createWiz(doneHandler)
//		- when the user closes the wizard dialog, 
//		doneHandler is called with a bool parameter with true indicating
//		at least one record was deleted.


/////////////////////////////////////////////////////////////////////////////////////////
//functions:	
	//localParameterCheck()
	//xdaqContextTooltip()
	//xdaqApplicationTooltip()
	//initDeleteWizard()
	//showPrompt(stepIndex,paramObj)
	//	localAddContent()
	//		switch statements
	//			localAlsoDescendantContent()								_STEP_ALSO_DESCENDANTS
	//	localAddHandlers()
	//		switch statements
	//			localAlsoDescendantsHandlers								_STEP_ALSO_DESCENDANTS
	//				localRecurseDeleteChildren(children,table,depth)		_STEP_ALSO_DESCENDANTS	

	//		share scope functions (between switch and next/prev handlers)
	//			localDeleteRootRecord()

	//		localNextButtonHandler() switch
	//			localScopeSetRecordSaveModifiedDoIt()		_STEP_SAVE_MODIFIED
	//			scopeWhichRecordTypeNext() 					_STEP_WHICH_RECORD_TYPE

	//		localPrevButtonHandler() switch
	
	//DesktopContent.htmlOpen(tag,attObj,innerHTML,closeTag)
	//DesktopContent.htmlClearDiv()
	
	//getRecordConfiguration()
	//getRecordFilter()


/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////


/*
<script type="text/JavaScript" src="/WebPath/js/Globals.js"></script>	
<script type="text/JavaScript" src="/WebPath/js/Debug.js"></script>	
<script type="text/JavaScript" src="/WebPath/js/DesktopContent.js"></script>
<script type="text/JavaScript" src="/WebPath/js/js_lib/SimpleContextMenu.js"></script>
<script type="text/JavaScript" src="/WebPath/js/js_lib/ConfigurationAPI.js"></script>
*/

var DeleteWiz = DeleteWiz || {}; //define DeleteWiz namespace

if (typeof Debug == 'undefined') 
	console.log('ERROR: Debug is undefined! Must include Debug.js before DeleteWiz_ConfigurationGUI.js');
else if (typeof Globals == 'undefined')
    console.log('ERROR: Globals is undefined! Must include Globals.js before DeleteWiz_ConfigurationGUI.js');
else
	DeleteWiz.wiz; //this is THE DeleteWiz variable


////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call createWiz to create instance of a DeleteWiz
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
DeleteWiz.createWiz = function(doneHandler) {
	
	
	var _TABLE_BOOL_TYPE_TRUE_COLOR = "rgb(201, 255, 201)";
	var _TABLE_BOOL_TYPE_FALSE_COLOR = "rgb(255, 178, 178)";



	//global vars for params		
	var _recordAlias;
	var _doneHandler = doneHandler;
	var _aRecordWasDeleted = false;
		
	var _RECORD_TYPE_CONTEXT = "Context";
	var _RECORD_TYPE_APP = "Supervisor";	
	var _validRecordTypes = [_RECORD_TYPE_CONTEXT,_RECORD_TYPE_APP];

	
	////////////////////////////
	function localParameterCheck() 
	{
		//check for valid record alias
		var i=_validRecordTypes.length-1;
		for(i;i>=0;--i)
			if(_validRecordTypes[i] == _recordAlias) break;
		if(i<0) //alias error!!
		{
			var str = "Invalid Record Alias '" + _recordAlias + "' was specified. " +
					"The only valid record aliases are as follows: ";

			for(i=_validRecordTypes.length-1;i>=0;--i)
				str += "<br>\t_validRecordTypes[i]";
			Debug.log(str,Debug.HIGH_PRIORITY);
			return;
		}
	} //end localParameterCheck()
	
	//global vars for creation
	var _subsetUIDs; //array of UIDs already defined at base path
	var _systemGroups; //object of aliases and groups w/active groups
	var _paramObjMap; //allows for lookup of parameter objects based on stepIndex
	var _furthestStep = -1;
	var _lastNextStep = -1;
	
	//global vars for saving tables
	var _modifiedTables;


	var _STEP_OUT_OF_SEQUENCE		= 1000; //steps greater or equal are ignored in _furthestStep
	
	var 
	//_STEP_ALSO_APP_CHILDREN 		= 200,
	
	//_STEP_WHICH_APP					= 103,
	//_STEP_SET_CONTEXT_HOST			= 102,
	_STEP_ALSO_DESCENDANTS 			= 101,
	_STEP_CHANGE_GROUP				= 1000,
	_STEP_GET_RECORD_NAME			= 100,
	_STEP_SAVE_MODIFIED				= 500,
	_STEP_WHICH_RECORD_TYPE			= 20;
	
	
	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end variable declaration
	Debug.log("DeleteWiz.wiz constructed");
	DeleteWiz.wiz = this; 
	


	var windowTooltip= "Welcome to the Record Deletion Wizard GUI. Here you can delete hierarchical records for " +
		"your <i>otsdaq</i> system. \n\n" +
		"The <b>Record Deletion Wizard</b> is presented as a step-by-step process that will walk you through deleting a record and its children.\n\n" +

		"Briefly, here is a description of the steps: " +
		"\n\t- 'What is the name of your record?'" +
		"\n\t- 'How deep into the hierachy do you want to delete?'";
	DesktopContent.tooltip("Delete Wizard Introduction",
		windowTooltip);
	DesktopContent.setWindowTooltip(windowTooltip);


	xdaqContextTooltip();
	xdaqApplicationTooltip();

	showPrompt(_STEP_WHICH_RECORD_TYPE);
	
	
	return;
	
	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// start funtion declaration
	

	//=====================================================================================
	//xdaqContextTooltip ~~
	function xdaqContextTooltip()
	{
		DesktopContent.tooltip("XDAQ Contexts",
			"What is a XDAQ Context? The lowest level parent for all records, in the <i>otsdaq</i> configuration tree, is a XDAQ Context. " + 
			"Why do I need a XDAQ Context? Do I want a new one for my " + (_recordAlias?"record":_recordAlias) + " or not?" + 
			"<br><br>" +
			"XDAQ Contexts are the fundamental executable program building blocks of <i>otsdaq</i>. " +
			"A XDAQ Context runs a group of XDAQ Applications inside of it. If one of those XDAQ Applications crashes, " +
			"then only the parent XDAQ Context will crash. This is one reason organizing your <i>otsdaq</i> entities into separate XDAQ Contexts makes sense." +
			"<br><br>" +
			"Two other useful features of XDAQ Contexts are that they can easily be turned on and off (enabled and disabled through the configuration editors), and " +
			"they can easily be distributed to other nodes (computers) in your DAQ system when your system scales up."
			);
	} //end xdaqContextTooltip()
	//=====================================================================================
	//xdaqApplicationTooltip ~~
	function xdaqApplicationTooltip()
	{
		DesktopContent.tooltip("XDAQ Applications",
				"What is a XDAQ Application? The second level parent for all records, in the <i>otsdaq</i> configuration tree, is a XDAQ Application. " + 
				"Why do I need a XDAQ Application? Do I want a new one for my " + (_recordAlias?"record":_recordAlias) + " or not?" + 
				"<br><br>" +
				"XDAQ Applications are server processes that can be controlled by <i>otsdaq</i> through network messages. " +
				"Ther can be one or many XDAQ Applciation in a XDAQ Context. If one of those XDAQ Applications crashes, " +
				"then all of the other XDAQ Applications in the parent XDAQ Context will crash. This is one reason organizing your <i>otsdaq</i> entities into separate XDAQ Contexts makes sense." +
				"<br><br>" +
				"Two other useful features of XDAQ Applications are that they can respond to web requests and state machine transitions."
		);
	} //end xdaqApplicationTooltip()
	
	//=====================================================================================
	//initDeleteWizard ~~
	//	get active groups and list of all groups
	//	get list of existing records at base path
	function initDeleteWizard() 
	{		
		_subsetUIDs = []; //reset			
		_modifiedTables = []; //reset
		_furthestStep = -1; // reset
		_paramObjMap = {}; //reset
		_systemGroups = {}; //reset

		{	//remove all existing dialogs

			var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
			while(el) 
			{
				el.parentNode.removeChild(el); //close popup
				el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
			}
		} //end remove all existing dialogs


		//	get groups and aliases
		ConfigurationAPI.getAliasesAndGroups(
				function(retObj)
				{
			_systemGroups = retObj;
			console.log("_systemGroups",_systemGroups);
			console.log("ConfigurationAPI._activeGroups",ConfigurationAPI._activeGroups);
			

			// get existing records
			ConfigurationAPI.getSubsetRecords(
					getRecordConfiguration(),
					getRecordFilter() /*_recordPreFilterList*/,
					function(records)
					{
				_subsetUIDs = records;
				Debug.log("records found = " + records.length);
				console.log(records);
				
				showPrompt(_STEP_GET_RECORD_NAME);

					},_modifiedTables); //end getSubsetRecords

				}); //end getAliasesAndGroups

	}	//end initDeleteWizard()

	//=====================================================================================
	//showPrompt ~~
	//	_paramObjMap allows for lookup parameters based on stepIndex
	//	paramObj is the new object for stepIndex
	function showPrompt(stepIndex,paramObj) 
	{
		//default to step 0
		if(!stepIndex) stepIndex = 0;

		if(stepIndex > _furthestStep &&
				_furthestStep < _STEP_OUT_OF_SEQUENCE)
			_furthestStep = stepIndex;
		
		Debug.log("showPrompt " + stepIndex);
		Debug.log("_furthestStep " + _furthestStep);

		//default to empty object
		if(!_paramObjMap) _paramObjMap = {};

		
		if(paramObj) //store to object map
			_paramObjMap[stepIndex] = paramObj;
		else if(_paramObjMap[stepIndex]) //load from object map
			paramObj = _paramObjMap[stepIndex];
		else 
		{	
			//default to empty object
			_paramObjMap[stepIndex] = {};
			paramObj = _paramObjMap[stepIndex];  
		}

		console.log("_paramObjMap",_paramObjMap);
		console.log("paramObj",paramObj);

		var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);

		//remove all existing dialogs
		while(el) 
		{
			el.parentNode.removeChild(el); //close popup
			el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
		}
		//note el is usable in code

		//set position and size
		var w = 480;
		var h = 340;//250;

		var str = "";
		var stepString = "stepIndex-" + stepIndex + "-";

		var showPrevButton = true;
		var showNextButton = true;
		var prevStepIndex =  stepIndex-1; //default back button to last next step //stepIndex-1;		
		if(prevStepIndex > _lastNextStep)
			prevStepIndex = _lastNextStep;
		_lastNextStep = stepIndex;
			
		var nextStepIndex = stepIndex+1;
		var prevButtonText = "Go Back";
		var nextButtonText = "Next Step";
		
		var recordName = "";
		try //try to get record name since used often
		{
			recordName = _paramObjMap[_STEP_GET_RECORD_NAME]["recordName"];
		} catch(e){;}

		///////////////////////////////////////////////////////
		///////////////////////////////////////////////////////
		// add content
		localAddContent();
		function localAddContent()
		{
			switch(stepIndex)
			{
			
				
			case _STEP_SAVE_MODIFIED:
				
				Debug.log("_STEP_SAVE_MODIFIED ");

				nextButtonText = "Done!";
								
				str += "<br>";
				str += "Things are getting real! Are you sure you want to proceed?<br><br>" +
						"To finalize your deletions, please click 'Done!'";	
				str += "<br>";
				str += "<br>";	
				
				Debug.log("All deletions, so far, were made temporarily. For them to persist, " + 
						"you must follow the prompt and click the 'Done!' button.",
						Debug.INFO_PRIORITY);		
				
				break; //end _STEP_SET_RECORD_FIELDS				

			case _STEP_ALSO_DESCENDANTS:
				
				localAlsoDescendantContent();
				function localAlsoDescendantContent()
				{
					showNextButton = false; //replace it		

					//take parameter recordName
					Debug.log("_STEP_ALSO_DESCENDANTS " + recordName);

					// " delete only target record or include descendants?"
					str += "<br>";

					var children = paramObj["rootChildren"];
					if(children.length)
					{
						str += "Do you want to delete all the descendants along with the parent " + _recordAlias + " named '" +  
								recordName + ",' or only the chosen " + _recordAlias + " record named '" +  
								recordName + "?'";
						str += "<br>";
						str += "<br>";
						
						str += "<b>For reference, here are the first-level children of the chosen " + _recordAlias + 
								" named '" +  
								recordName + "':</b><br>";
						{ //start contexts
							str += DesktopContent.htmlOpen("select",
									{
											"id" :		stepString + "rootChildren",
									});

							for(var i=0;i<children.length;++i)
							{
								str += DesktopContent.htmlOpen("option",
										{		
										},
										ConfigurationAPI.getTreeRecordName(children[i]) /*innerHTML*/, 
										true /*closeTag*/);
							}
							str += "</select>"; //end aliases dropdown

							str += DesktopContent.htmlClearDiv();
							str += DesktopContent.htmlOpen("input",
									{
											"id": stepString + "deleteDescendants",
											"type": "button",
											"value": "Delete " + _recordAlias + " and ALL Descendants",
											"title": "Delete all children of the chosen " + _recordAlias + " named &apos;" +  
											recordName + ".&apos;"
									},
									0 /*html*/, true /*closeTag*/);	
						} //end contexts
					} //end existing children
					else
						str += "There were no Supervisor children found for the parent " + _recordAlias + " named '" +  
						recordName + "' - do you want to delete the " + _recordAlias + " named '" +  
						recordName + "?'";
					

					str += DesktopContent.htmlClearDiv();
					
					str += DesktopContent.htmlOpen("input",
							{
								    "style": "margin:20px;",
									"id": stepString + "deleteOnlyRoot",
									"type": "button",
									"value": "Delete Only the " + _recordAlias,
									"title": "Delete only the chosen " + _recordAlias + " named &apos;" +  
									recordName + ".&apos;"
							},
							0 /*html*/, true /*closeTag*/);	
					
				} //end localAlsoDescendantContent
				
				
				
				
				
				break; //end _STEP_ALSO_DESCENDANTS

			case _STEP_CHANGE_GROUP:
				//take paramter groupType

				showNextButton = false; //replace it					
				nextStepIndex = _STEP_GET_RECORD_NAME;
				prevStepIndex = _STEP_GET_RECORD_NAME;

				str += "Choose a '" + paramObj["groupType"] +
						"' group to activate (either a System Alias or specific group):";

				str += DesktopContent.htmlClearDiv();

				str += "<center>"; 
				str += "<table style='margin-bottom: 10px;'>";
				if(_systemGroups.aliases[paramObj["groupType"]].length)
				{
					str += "<tr><td><b>System Aliases:</b></td><td>";
					{ //start aliases
						str += DesktopContent.htmlOpen("select",
								{
										"id" :		stepString + "aliases",
								});

						for(var i=0;i<_systemGroups.aliases[paramObj["groupType"]].length;++i)
						{
							str += DesktopContent.htmlOpen("option",
									{		
									},
									_systemGroups.aliases[paramObj["groupType"]]
														  [i].alias /*innerHTML*/, true /*closeTag*/);
						}
						str += "</select>"; //end aliases dropdown
						str += DesktopContent.htmlOpen("input",
								{
										"id": stepString + "activateAlias",
										"type": "button",
										"value": "Activate Alias",
										"title": "Activate chosen System Alias and return to creating your new " + _recordAlias + "."
								},
								0 /*html*/, true /*closeTag*/);	
					} //end aliases
					str += "</td></tr>";
				}
				else
					str += "<tr><td colspan='2'>No system aliases of type Context found.</td></tr>";

				var groupNames = Object.keys(_systemGroups.groups[paramObj["groupType"]]);
				if(groupNames.length)
				{
					str += "<tr><td><b>Group Names:</b></td><td>";
					{ //start groups
						str += DesktopContent.htmlOpen("select",
								{
										"id" :		stepString + "groupNames",
								});

						for(var i=0;i<groupNames.length;++i)
						{
							str += DesktopContent.htmlOpen("option",
									{		
									},
									groupNames[i] /*innerHTML*/, true /*closeTag*/);
						}
						str += "</select>"; //end group name dropdown

					} //end groups
					str += "</td></tr>";
				}
				else
					str += "<tr><td colspan='2'>No groups of type Context found.</td></tr>";

				if(groupNames.length)
				{
					str += "<tr><td><b>Group Keys:</b></td><td>";
					{ //start keys
						str += DesktopContent.htmlOpen("select",
								{
										"id" :		stepString + "groupKeys",
								});

						for(var i=0;i<_systemGroups.groups[paramObj["groupType"]]
														   [groupNames[0]].keys.length;++i)
						{
							str += DesktopContent.htmlOpen("option",
									{		
									},
									_systemGroups.groups[paramObj["groupType"]]
														 [groupNames[0]].keys[i] /*innerHTML*/, true /*closeTag*/);
						}
						str += "</select>"; //end group keys dropdown
						str += DesktopContent.htmlOpen("input",
								{
										"id": stepString + "activateGroup",
										"type": "button",
										"value": "Activate Group",
										"title": "Activate chosen Group and Key pair and return to creating your new " + _recordAlias + "."
								},
								0 /*html*/, true /*closeTag*/);	
					} //end keys
					str += "</td></tr>";
				}
				str += "</table>";
				str += "</center>";

				break; //end _STEP_CHANGE_GROUP				

			case _STEP_GET_RECORD_NAME:
				

				Debug.log("_STEP_GET_RECORD_NAME " + _recordAlias);
				
				_modifiedTables = []; //reset
				
				prevStepIndex = _STEP_WHICH_RECORD_TYPE;			

				///////////////////////
				// header
				str += DesktopContent.htmlOpen("div",
						{
								"style" : "font-weight:bold; margin: 6px 0 20px 0;"		
						}, 
						(_aRecordWasDeleted?
								("Would you like to delete another " + _recordAlias + "?"):
						("Welcome to the " + _recordAlias + " deletion Wizard!")) /*innerHTML*/,
						true /*closeTag*/);
				str += DesktopContent.htmlClearDiv();
				
				///////////////////////
				// existing records
				str += "Choose the " + _recordAlias + " record name to be deleted: ";
				str += DesktopContent.htmlClearDiv();

				str += DesktopContent.htmlOpen("select",
						{
								"id" :		stepString + "recordName",
								"style" :	"margin-bottom: 16px;"
						});


				for(var i=0;i<_subsetUIDs.length;++i)
				{
					str += "<option " + 
							(paramObj["recordName"] && 
											paramObj["recordName"]==_subsetUIDs[i]?"selected":"") +
											">";
					str += _subsetUIDs[i];
					str += "</option>";
				}
				str += "</select>"; //end existing records dropdown


				///////////////////////
				// active groups
				str += DesktopContent.htmlClearDiv();
				str += "Note you are currently editing these active groups:";
				str += "<center>"; 
				str += "<table style='margin-bottom: 10px;'>";
				str += "<tr><td><b>Active Context:</b></td><td>";
				str += ConfigurationAPI._activeGroups.Context.groupName + " (" + ConfigurationAPI._activeGroups.Context.groupKey + ")";
						//_systemGroups.activeGroups.Context.groupName + " (" + _systemGroups.activeGroups.Context.groupKey + ")";

				str += DesktopContent.htmlOpen("div",
						{
								"id":		stepString + "editContext",
								"class":	ConfigurationAPI._POP_UP_DIALOG_ID + "-editIcon",
								"style":	"float:right; display:block; margin: -3px 0 0 10px;",
								"title":	"Click to activate a different Context group.",

						}, 0 /*innerHTML*/, true /*closeTag*/);

				str += "</td></tr>";
				str += "<tr><td><b>Active Configuration:</b></td><td>";
				str += _systemGroups.activeGroups.Configuration.groupName + " (" + _systemGroups.activeGroups.Configuration.groupKey + ")";

				str += DesktopContent.htmlOpen("div",
						{
								"id":		stepString + "editConfig",
								"class":	ConfigurationAPI._POP_UP_DIALOG_ID + "-editIcon",
								"style":	"float:right; display:block; margin: -3px 0 0 10px;",
								"title":	"Click to activate a different Configuration group.",
						}, 0 /*innerHTML*/, true /*closeTag*/);

				str += "</td></tr>";
				str += "</table>";
				str += "</center>";


				break; // end _STEP_GET_RECORD_NAME
				
			case _STEP_WHICH_RECORD_TYPE:
				
				Debug.log("_STEP_WHICH_RECORD_TYPE ");
				
				nextStepIndex = _STEP_GET_RECORD_NAME;
				prevButtonText = "Close Wizard";
				
				///////////////////////
				// header
				str += DesktopContent.htmlOpen("div",
						{
								"style" : "font-weight:bold; margin: 6px 0 20px 0;"		
						}, 
						"Welcome to the record deletion Wizard!" /*innerHTML*/,
						true /*closeTag*/);
				str += DesktopContent.htmlClearDiv();
				
				///////////////////////
				// existing record types
				str += DesktopContent.htmlClearDiv();
				str += "Below is a dropdown of record types that this Wizard can help you delete. " + 
						" Choose one and proceed through the steps to delete the chosen record and its children:";
				str += DesktopContent.htmlClearDiv();
				str += DesktopContent.htmlOpen("select",
						{
								"id" :		stepString + "recordTypes",
								"style" :	"margin-bottom: 16px;"
						});

				for(var i=0;i<_validRecordTypes.length;++i)
				{
					str += DesktopContent.htmlOpen("option",
							{		
							},_validRecordTypes[i] /*innerHTML*/, true /*closeTag*/);
				}
				str += "</select>"; //end existing records dropdown	
						
				break; //end _STEP_WHICH_RECORD_TYPE
			default:
				Debug.log("Should never happen - bad stepIndex (" + stepIndex + 
						")!",Debug.HIGH_PRIORITY);
				return;
			}

			//add go back button
			//add proceed to next step button
			var ctrlStr = "";

			if(stepIndex && showPrevButton)
				ctrlStr += DesktopContent.htmlOpen("input",
						{
								"class": "prevButton " + stepString + "prevButton",
								"type": "button",
								"value": prevButtonText,
								"title": "Return to the previous step in the " + _recordAlias + " creation wizard."
						},
						0 /*html*/, true /*closeTag*/);	
			if(showNextButton)
				ctrlStr += DesktopContent.htmlOpen("input",
						{
								"class": "nextButton " + stepString + "nextButton",
								"type": "button",
								"value": nextButtonText,
								"title": "Proceed to the next step in the " + _recordAlias + " creation wizard."
						},
						0 /*html*/, true /*closeTag*/);	

			
			//make popup element
			el = document.createElement("div");			
			el.setAttribute("id", ConfigurationAPI._POP_UP_DIALOG_ID);
			
			ConfigurationAPI.setPopUpPosition(el,w /*w*/,h /*h*/);
			
			el.innerHTML = ctrlStr + DesktopContent.htmlClearDiv() + str + DesktopContent.htmlClearDiv() + ctrlStr;
			document.body.appendChild(el);	
		} //end localAddContent()


		///////////////////////////////////////////////////////
		///////////////////////////////////////////////////////
		// add handlers
		localAddHandlers();
		function localAddHandlers()
		{
			var newParamObj = {};

			///////////////////////////////////////////////////////
			//add handlers specific to the step
			//NOTE: apparently {} create "function scope" inside a switch case
			// and, apparently switch statements create "function scope" too.
			switch(stepIndex)
			{	
			
			case _STEP_ALSO_DESCENDANTS:

				localAlsoDescendantsHandlers();

				/////////////////////////////////
				function localAlsoDescendantsHandlers()
				{


					/////////////////////////////////
					document.getElementById(stepString + "deleteOnlyRoot").onclick = 
							function()
							{
						localDeleteRootRecord();
							}; //end deleteOnlyRoot button handler

					/////////////////////////////////
					var deleteDescendantsButton = document.getElementById(stepString + "deleteDescendants");
					if(!deleteDescendantsButton) return;
					
					deleteDescendantsButton.onclick = 
							function()
							{
						Debug.log("deleteDescendants " + recordName);


						//keep list of off-limit tables to avoid loops
						//	create a map to all deletion children by table
						//	add children to delete map until a repeat is reached.. or no more children

						var deleteMap = {}; //  map of table to array of records UIDs
						// i.e.:  map<table, array<records> > 

						if(_recordAlias == _RECORD_TYPE_CONTEXT)
							localRecurseDeleteChildren(_paramObjMap[_STEP_ALSO_DESCENDANTS]["rootChildren"],
									"XDAQApplicationConfiguration",0);
						else if(_recordAlias == _RECORD_TYPE_APP)
							localRecurseDeleteChildren([_paramObjMap[_STEP_ALSO_DESCENDANTS]["root"]],
									"XDAQApplicationConfiguration",0);
						else
							throw("?");
						/////////////////////////////////
						function localRecurseDeleteChildren(children, table, depth)
						{
							if(table == ConfigurationAPI._DATATYPE_LINK_DEFAULT) return; //skip disconnected links 

							console.log(depth,table,children);

							var childLinks;
							var name;
							
							//delete children
							for(var i=0;i<children.length;++i)
							{
								try
								{
									name = ConfigurationAPI.getTreeRecordName(children[i]);
								}
								catch(e)
								{
									Debug.log("Name extraction failed. Assuming disconnected link: " + e);
									console.log(deleteMap);
									continue;
								}

								if(!deleteMap[table]) deleteMap[table] = []; //init table records

								//if child already found in deleteMap, skip it
								if(deleteMap[table].indexOf(name) >= 0) continue;	
								//else add to delete map
								deleteMap[table].push(name);
								console.log(deleteMap);

								//for each link inside child, get children records
								childLinks = ConfigurationAPI.getTreeRecordLinks(children[i]);

								for(var j=0;j<childLinks.length;++j)
									localRecurseDeleteChildren(
											ConfigurationAPI.getTreeLinkChildren(childLinks[j]),
											ConfigurationAPI.getTreeLinkTable(childLinks[j]),
											depth+1);
							}
						} //end localRecurseDeleteChildren()

						console.log(deleteMap);

						//delete all records in map
						var requestCount = 0;
						var recordCount = 0;
						var tableCount = 0;		
						_modifiedTables = []; //reset
						for(var table in deleteMap)
						{
							Debug.log("table " + table);

							if(_recordAlias == _RECORD_TYPE_CONTEXT)
							{
								if( table == "XDAQContextTable")
									continue; //skip off-limit table
							}
							else if(table == "XDAQContextTable" || 
									table == "XDAQApplicationConfiguration")
								continue; //skip off-limit table

							++requestCount;
							/////////////////////
							//delete record
							ConfigurationAPI.deleteSubsetRecords(
									table,
									deleteMap[table],
									/////////////////////
									function(modifiedTables,err,table,deletionCount) //start deleteSubsetRecords handler
									{

								Debug.log("modifiedTables length " + modifiedTables.length);
								if(err)
								{
									//really an error
									Debug.log("There was an error while deleting " + deletionCount + 
											" records from table '" +
											table  + ".' " + err,
											Debug.HIGH_PRIORITY);
									return;
								}
								//do not decrement requestCount on error
								--requestCount;
								++tableCount;
								recordCount += deletionCount;

								//assuming just one modified table
								if(modifiedTables && modifiedTables[0])
									_modifiedTables.push(modifiedTables[0]);

								//at this point context was deleted in modified tables 
								Debug.log(deletionCount + " records in table '" + 
										table + " were successfully removed!", Debug.INFO_PRIORITY);

								if(requestCount == 0) 
								{
									Debug.log("Descendant Summary: " + recordCount + " records from " +
											tableCount + " tables were successfully removed!",
											Debug.INFO_PRIORITY);
									localDeleteRootRecord();
								}

									}, //end deleteSubsetRecords handler
									_modifiedTables,
									true /*silenceErrors*/);  //end deleteSubsetRecords

						}	
						
						if(!requestCount) //if no children tables, finish up anyway
							localDeleteRootRecord();

							}; //end deleteDescendants button handler


				} //end localAlsoDescendantsHandlers()
			
				break; //end _STEP_ALSO_DESCENDANTS

			case _STEP_GET_RECORD_NAME:
			
			{ //start scope of _STEP_GET_RECORD_NAME				
				

				/////////////////////////////////
				document.getElementById(stepString + "editConfig").onclick = 
						function()
						{
					newParamObj["groupType"] = "Configuration";
					//save name to param for this step
					paramObj["recordName"] = document.getElementById(stepString + "recordName").value.trim();
					showPrompt(_STEP_CHANGE_GROUP,newParamObj);
						};
				/////////////////////////////////
				document.getElementById(stepString + "editContext").onclick = 
						function()
						{
					newParamObj["groupType"] = "Context";
					//save name to param for this step
					paramObj["recordName"] = document.getElementById(stepString + "recordName").value.trim();
					showPrompt(_STEP_CHANGE_GROUP,newParamObj);
						};
			} //end scope of _STEP_GET_RECORD_NAME
			
				break; //end _STEP_GET_RECORD_NAME

			case _STEP_CHANGE_GROUP:
			
			{ //start scope of _STEP_CHANGE_GROUP				
			
				/////////////////////////////////
				document.getElementById(stepString + "activateAlias").onclick = 
						function()
						{
					//activate alias then go back to record name
					var alias = document.getElementById(stepString + "aliases").value;
					Debug.log("activateAlias " + alias);

					//find associated aliasObj
					var aliasObj;
					for(var i=0;i<
					_systemGroups.aliases[paramObj["groupType"]].length;++i)
						if(_systemGroups.aliases[paramObj["groupType"]][i].alias == 
								alias)
						{
							aliasObj = _systemGroups.aliases[paramObj["groupType"]][i];
							break;						
						}

					Debug.log("activateAlias group " + aliasObj.name + 
							"-" + aliasObj.key);

					ConfigurationAPI.activateGroup(aliasObj.name, aliasObj.key, 
							true /*ignoreWarnings*/, 
							/*doneHandler*/
							function()
							{
						Debug.log("The System Alias '" + alias + 
								"' (" + aliasObj.name + " (" + 
								aliasObj.key + ")) was successfully activated!", Debug.INFO_PRIORITY);

						initDeleteWizard();
							}); //end activate group handler
						}; //end activate alias handler

				/////////////////////////////////
				document.getElementById(stepString + "groupNames").onchange = 
						function()
						{
					//fill keys drop down
					Debug.log("Filling dropdown with keys for " + this.value);
					var str = "";
					for(var i=0;i<_systemGroups.groups[paramObj["groupType"]]
													   [this.value].keys.length;++i)
					{
						str += DesktopContent.htmlOpen("option",
								{		
								},
								_systemGroups.groups[paramObj["groupType"]]
													 [this.value].keys[i] /*innerHTML*/, true /*closeTag*/);
					}
					document.getElementById(stepString + "groupKeys").innerHTML = 
							str;
						}; //end group names dropdown handler

				/////////////////////////////////
				document.getElementById(stepString + "activateGroup").onclick = 
						function()
						{
					//activate alias then go back to record name
					var name = document.getElementById(stepString + "groupNames").value;
					var key = document.getElementById(stepString + "groupKeys").value;

					Debug.log("activateGroup " + name + 
							"-" + key);

					ConfigurationAPI.activateGroup(name, key, 
							true /*ignoreWarnings*/, 
							/*doneHandler*/
							function()
							{
						Debug.log("The Group '" + name + " (" + 
								key + ") was successfully activated!", Debug.INFO_PRIORITY);

						initDeleteWizard();
							}); //end activate group handler
						}; //end activate alias handler
				
			} //end scope of _STEP_CHANGE_GROUP
			
				break;  //end _STEP_CHANGE_GROUP
			default:;
			}
			
			


			///////////////////////////////////////////////////////
			//add functions shared by handlers above and below
			{ //fake scope for grouping

				/////////////////////////////////
				// localDeleteRootRecord 
				//	deletes chosen top level record	 
				function localDeleteRootRecord()
				{
					Debug.log("localDeleteRootRecord " + recordName);
					

					/////////////////////
					//delete record
					ConfigurationAPI.deleteSubsetRecords(
							getRecordConfiguration(),
							recordName,
							/////////////////////
							function(modifiedTables,err) //start deleteSubsetRecords handler
							{
						Debug.log("modifiedTables length " + modifiedTables.length);
						if(!modifiedTables.length)
						{
							//really an error
							Debug.log("There was an error while removing the " + _recordAlias +
									" named '" + 
									recordName  + ".' " + err,
									Debug.HIGH_PRIORITY);
							return;
						}
						_modifiedTables = modifiedTables;

						//at this point context was deleted in modified tables 
						Debug.log("The " + _recordAlias + " named '" +  
								recordName + "' was successfully removed!",
								Debug.INFO_PRIORITY);

						showPrompt(_STEP_SAVE_MODIFIED);

							}, //end deleteSubsetRecords handler
							_modifiedTables,
							true /*silenceErrors*/);  //end deleteSubsetRecords

						
				} //end localDeleteRootRecord()
				

			} //end fake scope for shared handler functions
			
			
			
			


			///////////////////////////////////////////////////////
			//add handlers for all steps
			try
			{
				document.getElementsByClassName(stepString + "nextButton")[0].onclick = 
						localNextButtonHandler;
				document.getElementsByClassName(stepString + "nextButton")[1].onclick = 
						localNextButtonHandler;

				function localNextButtonHandler()		
				{

					//extract specific step parameters
					switch(stepIndex)
					{
					case _STEP_SAVE_MODIFIED:

						//set record fields and save modified tables
						localScopeSetRecordSaveModifiedDoIt();

						/////////////////////////////////			
						function localScopeSetRecordSaveModifiedDoIt() //function just for scoped vars
						{				
							Debug.log("localScopeSetRecordSaveModifiedDoIt");

							//proceed to save (quietly) tables, groups, aliases
							ConfigurationAPI.saveModifiedTables(_modifiedTables,
									function(savedTables, savedGroups, savedAliases)
									{
								if(!savedTables.length)
								{
									Debug.log("There was an error while deleting the records.",
											Debug.HIGH_PRIORITY);
									return;					
								}

								Debug.log("The deletions were successfully completed!", Debug.INFO_PRIORITY);
								
//								Debug.log("The new " +
//										_recordAlias + " named '" + recordName + "' was successfully created!",
//										Debug.INFO_PRIORITY);

								_modifiedTables = []; //clear after save

								_aRecordWasDeleted = true;

								initDeleteWizard(); //start over if no done handler

									}); //end saveModifiedTables handler

						} //end localScopeSetRecordFieldsDoIt()
						
						return; //prevent default next action
						
						break; //end _STEP_SET_RECORD_FIELDS
						
					
						
					case _STEP_GET_RECORD_NAME:
							
						//save name to param for this step
						recordName = document.getElementById(stepString + "recordName").value.trim();
						paramObj["recordName"] = recordName;


						//get children of contexts and give as parameter
						ConfigurationAPI.getTree(
								getRecordConfiguration() + "/" + recordName,
								40 /*depth*/,
								_modifiedTables,
								function(tree)
								{
							console.log(tree);
							
							//setup for _STEP_ALSO_DESCENDANTS
							if(!_paramObjMap[_STEP_ALSO_DESCENDANTS]) _paramObjMap[_STEP_ALSO_DESCENDANTS] = {}; //init
							
							var links = ConfigurationAPI.getTreeRecordLinks(tree);
							
							_paramObjMap[_STEP_ALSO_DESCENDANTS]["root"] = tree; //save tree							
							_paramObjMap[_STEP_ALSO_DESCENDANTS]["rootChildren"] = []; //init array
							
							//concat all first level children (i.e. through links)
							for(var i=0;i<links.length;++i)
								 _paramObjMap[_STEP_ALSO_DESCENDANTS]["rootChildren"] = 
										 _paramObjMap[_STEP_ALSO_DESCENDANTS]["rootChildren"].concat(
										ConfigurationAPI.getTreeLinkChildren(links[i]));
							
							showPrompt(_STEP_ALSO_DESCENDANTS);
							
							
								});	//end getSubsetRecords handler	
						return; //prevent default show prompt, do in handler
						break; //end _STEP_GET_RECORD_NAME next handler
					
					case _STEP_WHICH_RECORD_TYPE:

						///////////////////////
						if(scopeWhichRecordTypeNext())
							return; //prevent default show prompt, do initDeleteWizard
						
						function scopeWhichRecordTypeNext() 
						{
							var newRecordAlias = document.getElementById(stepString + "recordTypes").value.trim();
							
							var needToInit = (_recordAlias != newRecordAlias);

							_recordAlias = newRecordAlias;
							Debug.log("_recordAlias chosen as " + _recordAlias);
							
							if(needToInit) initDeleteWizard();
							return needToInit;
						} //end scopeWhichRecordTypeNext()						
						
						break; //end _STEP_WHICH_RECORD_TYPE next handler
					default:;
					}
					showPrompt(nextStepIndex,newParamObj);
				} //end next handler
			}
			catch(e){ Debug.log("Caught ERROR: " + e.stack);}

			try
			{
				document.getElementsByClassName(stepString + "prevButton")[0].onclick = 
						localPrevButtonHandler;
				document.getElementsByClassName(stepString + "prevButton")[1].onclick = 
						localPrevButtonHandler;

				function localPrevButtonHandler()
				{
					//extract specific step parameters
					switch(stepIndex)
					{
					case _STEP_WHICH_RECORD_TYPE:
						
						//close window and clear data

						_subsetUIDs = []; //reset			
						_modifiedTables = []; //reset
						_furthestStep = -1; // reset
						_paramObjMap = {}; //reset
						_systemGroups = {}; //reset
						
						//remove all existing dialogs
						var el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
						while(el) 
						{
							el.parentNode.removeChild(el); //close popup
							el = document.getElementById(ConfigurationAPI._POP_UP_DIALOG_ID);
						}
						
						if(_doneHandler) _doneHandler(_aRecordWasDeleted);
						return; //prevent default prev showPrompt
						break;
					default:;
					}
					showPrompt(prevStepIndex);
				} //end prev handler
			}
			catch(e){ Debug.log("Caught ERROR: " + e.stack);}

		} //end localAddHandlers()

	}	//end showPrompt()

	
	//=====================================================================================
	//getRecordConfiguration ~~	
	function getRecordConfiguration() 
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_CONTEXT)
			retVal = "XDAQContextTable";
		else if(_recordAlias == _RECORD_TYPE_APP)
			retVal = "XDAQApplicationConfiguration";
		else
			throw("?");
		
		return retVal;		
	} //end getRecordConfiguration()
	
	//=====================================================================================
	//getRecordFilter ~~	
	function getRecordFilter() 
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_CONTEXT)
			retVal = "";
		else if(_recordAlias == _RECORD_TYPE_APP)
			retVal = "";//"ProcessorType=" + _recordAlias;
		
		return retVal;		
	} //end getRecordFilter()
	

}; //end DeleteWiz.createWiz()









