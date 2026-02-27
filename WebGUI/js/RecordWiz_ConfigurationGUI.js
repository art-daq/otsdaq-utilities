

//	Description of Record Wizard Configuration GUI Functionality/Behavior:
//
//	Example call:
//		RecordWiz.createWiz(
//				function(atLeastOneRecordWasCreated)
//				{
//			Debug.log("Done at Template! " + atLeastOneRecordWasCreated,
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
//			- "what is the name of your <record type>?"
//				- note the active context and config group being modified, with dropdown to
//					change them.
//			- "do you want to add it to an existing context or create a new one?"
//				- if create a new one
//					- provide default name with edit pencil, and continue
//
//

/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////

//public functions:
//	RecordWiz.createWiz(doneHandler)
//		- when the user closes the wizard dialog,
//		doneHandler is called with a bool parameter with true indicating
//		at least one record was created.


/////////////////////////////////////////////////////////////////////////////////////////
//functions:
	//localParameterCheck()
	//xdaqContextTooltip()
	//xdaqApplicationTooltip()
	//initRecordWizard()
	//showPrompt(stepIndex,paramObj)
	//	localAddContent()
	//	localAddHandlers()
	//		switch statements
	//			scopeForSetRecordFieldsContent()
	//			localAppSelectHandler(event)
	//			localAddressSelectHandler(event)
	//			localPortSelectHandler(event)
	//			localContextSelectHandler(event)
	//			localGetAllHostInfo()
	//			localRecordsSelectHandler(event)
	//			(stepString + "editConfig").onclick
	//			(stepString + "editContext").onclick
	//			(stepString + "deleteRecordIcon").onclick
	//				localPromptAndHandleRecordDeletion(recordType,recordName)
	//					ConfigurationAPI.deleteSubsetRecords() handler
	//					ConfigurationAPI.saveModifiedTables() handler
	//					localCheckParentChildren()

	//		share scope functions (between switch and next/prev handlers)
	//			localHandleIntermediateLevel()
	//			localCreateIntermediateLevelRecord(name)
	//			localSetupIntermediateLevelRecord(name)
	//			localGetExistingIntermediateTargetGroupID(supervisorName)

	//			localCreateApp(name)
	//			localSetupApp(name)
	//			localCreateAppConfig(name)
	//			localSetupAppConfig(name)

	//			localGetExistingSupervisorTargetGroupID(supervisorName)
	//			localCreateRecord(table)
	//			localGetHelperValuesForRecord()

	//		localNextButtonHandler() switch
	//			localScopeSetRecordFieldsDoIt()		_STEP_SET_RECORD_FIELDS
	//			localHandleSetupContext() 			_STEP_SET_CONTEXT_HOST
	//				localGetAppInfo()
	//			scopeWhichRecordTypeNext() 			_STEP_WHICH_RECORD_TYPE

	//		localPrevButtonHandler() switch

	//DesktopContent.htmlOpen(tag,attObj,innerHTML,closeTag)
	//DesktopContent.htmlClearDiv()

	//getApp()
	//getAppClass()
	//getAppModule()
	//getAppConfiguration()
	//getRecordConfiguration()
	//getRecordGroupIDField()
	//getRecordFilter()

	//getIntermediateTable()
	//getIntermediateTypeName()
	//getParentTable(generationsBack)
	//getParentType(generationsBack)
	//getParentLinkField(generationsBack)
	//getParentFilter(generationsBack)


/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////


/*
<script type="text/JavaScript" src="/WebPath/js/Globals.js"></script>
<script type="text/JavaScript" src="/WebPath/js/Debug.js"></script>
<script type="text/JavaScript" src="/WebPath/js/DesktopContent.js"></script>
<script type="text/JavaScript" src="/WebPath/js/js_lib/SimpleContextMenu.js"></script>
<script type="text/JavaScript" src="/WebPath/js/js_lib/ConfigurationAPI.js"></script>
*/

var RecordWiz = RecordWiz || {}; //define RecordWiz namespace

if (typeof Debug == 'undefined')
	console.log('ERROR: Debug is undefined! Must include Debug.js before RecordWiz_ConfigurationGUI.js');
else if (typeof Globals == 'undefined')
	console.log('ERROR: Globals is undefined! Must include Globals.js before RecordWiz_ConfigurationGUI.js');
else
	RecordWiz.wiz; //this is THE RecordWiz variable


////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call createWiz to create instance of a RecordWiz
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
RecordWiz.createWiz = function(doneHandler, recordsAliasFastForward) {


	var _TABLE_BOOL_TYPE_TRUE_COLOR = "rgb(201, 255, 201)";
	var _TABLE_BOOL_TYPE_FALSE_COLOR = "rgb(255, 178, 178)";



	//global vars for params
	var _recordAlias;
	var _doneHandler = doneHandler;
	var _aRecordWasModified = false;

	var _RECORD_TYPE_FE = "Front-end";
	var _RECORD_TYPE_PROCESSOR = "Processor";
	var _RECORD_TYPE_CONSUMER = "Consumer";
	var _RECORD_TYPE_PRODUCER = "Producer";
	var _validRecordTypes = [_RECORD_TYPE_FE,_RECORD_TYPE_PROCESSOR];


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
				str += "<br>\t" + _validRecordTypes[i];
			Debug.log(str,Debug.HIGH_PRIORITY);
			return false;
		}
		return true;
	} //end localParameterCheck()

	//global vars for creation
	var _subsetUIDs; //array of UIDs already defined at base path
	var _systemGroups; //object of aliases and groups w/active groups
	var _paramObjMap; //allows for lookup of parameter objects based on stepIndex
	var _furthestStep = -1;
	var _lastNextStep = -1;
	var _intermediateLevel = -1;

	//global vars for saving tables
	var _modifiedTables;


	var _STEP_OUT_OF_SEQUENCE		= 1000; //steps greater or equal are ignored in _furthestStep

	var
	_STEP_PROC_WHICH_BUFFER 		= 200,
	_STEP_SET_RECORD_FIELDS			= 104,
	_STEP_WHICH_APP					= 103,
	_STEP_SET_CONTEXT_HOST			= 102,
	_STEP_WHICH_CONTEXT 			= 101,
	_STEP_CHANGE_GROUP				= 1000,
	_STEP_GET_RECORD_NAME			= 100,
	_STEP_WHICH_RECORD_TYPE			= 20;


	var _START_STEP_INDEX = _STEP_GET_RECORD_NAME;

	var _XDAQ_BASE_PATH 	= "XDAQContextTable";
	var _XDAQAPP_BASE_PATH 	= "XDAQApplicationTable";

	var _DEFAULT_WIZ_COMMENT= "Generated by Record Creation Wiz";

	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// end variable declaration
	Debug.log("RecordWiz.wiz constructed");
	RecordWiz.wiz = this;

	var windowTooltip = "Welcome to the Record Creation Wizard GUI. Here you can create new records for " +
		"your <i>otsdaq</i> system. \n\n" +
		"The <b>Record Creation Wizard</b> is presented as a step-by-step process that will walk you through creating the skeleton for your new record.\n\n" +

		"Briefly, here is a description of the steps: " +
		"\n\t- 'What type of record do you want to add?'" +
		"\n\t- 'Do you want to add it to an existing context or create a new one?'";
	if(!recordsAliasFastForward || recordsAliasFastForward == "")
	{
		DesktopContent.tooltip("Record Wizard Introduction",
			windowTooltip
		);
		DesktopContent.setWindowTooltip(windowTooltip);

		showPrompt(_STEP_WHICH_RECORD_TYPE);
	}
	else
	{
		_recordAlias = recordsAliasFastForward;
		if(!localParameterCheck())
		{
			Debug.log("Invalid parameters to the Record Creation Wizard!", Debug.HIGH_PRIORITY);
			return;
		}


		DesktopContent.tooltip(_recordAlias + " Wizard Introduction",
				"Welcome to the " + _recordAlias + " Wizard GUI. Here you can create new records for " +
				"your <i>otsdaq</i> system. \n\n" +
				"The " + _recordAlias + " Wizard is presented as a step-by-step process that will walk you through creating the skeleton for your new " +
				_recordAlias + ".\n\n" +
				"Briefly, here is a description of the steps: " +
				"\n\t- 'Do you want to add your " + _recordAlias + " to an existing context or create a new one?'"
		);

		initRecordWizard();
	}

	return;

	//////////////////////////////////////////////////
	//////////////////////////////////////////////////
	// start funtion declaration


	//=====================================================================================
	//xdaqContextTooltip ~~
	function xdaqContextTooltip()
	{
		DesktopContent.tooltip("XDAQ Contexts",
			"What is a XDAQ Context? The lowest level parent for your record, in the <i>otsdaq</i> configuration tree, is a XDAQ Context. " +
			"Why do I need a XDAQ Context? Do I want a new one for my " + _recordAlias + " or not?" +
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
				"What is a XDAQ Application? The second level parent for your record, in the <i>otsdaq</i> configuration tree, is a XDAQ Application. " +
				"Why do I need a XDAQ Application? Do I want a new one for my " + _recordAlias + " or not?" +
				"<br><br>" +
				"XDAQ Applications are server processes that can be controlled by <i>otsdaq</i> through network messages. " +
				"Ther can be one or many XDAQ Applciation in a XDAQ Context. If one of those XDAQ Applications crashes, " +
				"then all of the other XDAQ Applications in the parent XDAQ Context will crash. This is one reason organizing your <i>otsdaq</i> entities into separate XDAQ Contexts makes sense." +
				"<br><br>" +
				"Two other useful features of XDAQ Applications are that they can respond to web requests and state machine transitions."
		);
	} //end xdaqApplicationTooltip()

	//=====================================================================================
	//initRecordWizard ~~
	//	get active groups and list of all groups
	//	get list of existing records at base path
	function initRecordWizard()
	{
		_subsetUIDs = []; //reset
		_modifiedTables = undefined; //reset
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

	}	//end initRecordWizard()

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
		var h = 350;//250;

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
			case _STEP_PROC_WHICH_BUFFER:
				//xdaqApplicationTooltip();
				h = 370;

				showNextButton = false; //replace it

				//take parameter recordName
				Debug.log("_STEP_PROC_WHICH_BUFFER " + recordName);

				// " add to existing buffer or a new one?"
				str += "<br>";
				str += "Do you want to add the " + _recordAlias + " named '" +
						recordName + "' to a new Data Manager Buffer " +
						"or an existing one in the Data Manager '" +
						_paramObjMap[_STEP_WHICH_APP]["appName"] + "'?";

				str += "<center>";
				str += "<table style='margin-bottom: 10px;'>";

				///////////////////////
				{ // new app input
					str += "<tr><td><b>New Buffer:</b></td><td>";

					str += DesktopContent.htmlOpen("input",
							{
									"type" : 	"text",
									"id" : 		stepString + "bufferName",
									"value":	(paramObj["bufferName"]?paramObj["bufferName"]:
											ConfigurationAPI.createNewRecordName("Buffer",
													paramObj["allBuffers"])),
							}, "" /*innerHTML*/, true /*closeTag*/);

					str += DesktopContent.htmlOpen("input",
							{
									"id": stepString + "addToNew",
									"type": "button",
									"value": "Add to New",
									"title": "Create a new Buffer and add the new " +
									_recordAlias + " to it."
							},
							0 /*html*/, true /*closeTag*/);
					str += "</td></tr>";
				} //end new app input

				if(paramObj["buffers"].length)
				{
					str += "<tr><td><b>Existing Buffers:</b></td><td>";
					{ //start apps
						str += DesktopContent.htmlOpen("select",
								{
										"id" :		stepString + "buffers",
								});

						for(var i=0;i<paramObj["buffers"].length;++i)
						{
							str += DesktopContent.htmlOpen("option",
									{
									},
									paramObj["buffers"][i] /*innerHTML*/, true /*closeTag*/);
						}
						str += "</select>"; //end dropdown
						str += DesktopContent.htmlOpen("input",
								{
										"id": stepString + "addToExisting",
										"type": "button",
										"value": "Add to Existing",
										"title": "Add new " + _recordAlias +
											" to the chosen existing Buffer."
								},
								0 /*html*/, true /*closeTag*/);
					} //end buffers
					str += "</td></tr>";
				} //end existing buffers

				str += "</table>";


				if(paramObj["allBuffers"].length)
				{
					///////////////////////
					// existing addresses
					str += DesktopContent.htmlClearDiv();
					str += "Here is a dropdown of all existing Buffers " +
							" to help you in creating standardized names (Note: shown above are " +
							"only the Buffers in the chosen Data Manager '" +
							_paramObjMap[_STEP_WHICH_APP]["appName"] +
							"':";

					str += DesktopContent.htmlClearDiv();
					str += DesktopContent.htmlOpen("select",
							{
									"id" :		stepString + "allBuffers",
									"style" :	"margin-bottom: 16px;"
							});

					for(var i=0;i<paramObj["allBuffers"].length;++i)
					{
						str += DesktopContent.htmlOpen("option",
								{
								},
								paramObj["allBuffers"][i] /*innerHTML*/, true /*closeTag*/);
					}
					str += "</select>"; //end all buffers dropdown
				} //end existing all buffers



				str += "</center>";
				break; // _STEP_PROC_WHICH_BUFFER

			case _STEP_SET_RECORD_FIELDS:

				Debug.log("_STEP_SET_RECORD_FIELDS ");

				nextButtonText = "Done!";

				str += "<br>";
				str += "Please edit the fields for your record and then click 'Done!' to save " +
						" your new " + _recordAlias + " named '" + recordName + "':";

				str += DesktopContent.htmlClearDiv();
				str += DesktopContent.htmlOpen("div",
						{
								"id" :		stepString + "fields",
								"style" :	"margin: 20px;",

						}, "" /*innerHTML*/, true /*closeTag*/);
				str += DesktopContent.htmlClearDiv();

				break; //end _STEP_SET_RECORD_FIELDS

			case _STEP_WHICH_APP:

				h = 370;

				xdaqApplicationTooltip();

				showNextButton = false; //replace it

				//take parameter recordName
				Debug.log("_STEP_WHICH_APP " + recordName);

				// " add to existing XDAQ App or a new one?"
				str += "<br>";
				str += "Do you want to add the " + _recordAlias + " named '" +
						recordName + "' to a new XDAQ " + getAppClass() +
						" Application or an existing one in the context '" +
						_paramObjMap[_STEP_WHICH_CONTEXT]["contextName"] + "'?";

				str += "<center>";
				str += "<table style='margin-bottom: 10px;'>";

				///////////////////////
				{ // new app input
					str += "<tr><td><b>New XDAQ App:</b></td><td>";

					str += DesktopContent.htmlOpen("input",
							{
									"type" : 	"text",
									"id" : 		stepString + "appName",
									"value":	(paramObj["appName"]?paramObj["appName"]:
											ConfigurationAPI.createNewRecordName(getApp(),paramObj["allApps"])),
							}, "" /*innerHTML*/, true /*closeTag*/);

					str += DesktopContent.htmlOpen("input",
							{
									"id": stepString + "addToNew",
									"type": "button",
									"value": "Add to New",
									"title": "Create a new XDAQ Application and add the new " + _recordAlias + " to it."
							},
							0 /*html*/, true /*closeTag*/);
					str += "</td></tr>";
				} //end new app input

				if(paramObj["apps"].length)
				{
					str += "<tr><td><b>Existing Apps:</b></td><td>";
					{ //start apps
						str += DesktopContent.htmlOpen("select",
								{
										"id" :		stepString + "apps",
								});

						for(var i=0;i<paramObj["apps"].length;++i)
						{
							str += DesktopContent.htmlOpen("option",
									{
									},
									paramObj["apps"][i] /*innerHTML*/, true /*closeTag*/);
						}
						str += "</select>"; //end dropdown
						str += DesktopContent.htmlOpen("input",
								{
										"id": stepString + "addToExisting",
										"type": "button",
										"value": "Add to Existing",
										"title": "Add new " + _recordAlias + " to the chosen existing XDAQ Application."
								},
								0 /*html*/, true /*closeTag*/);
					} //end apps
					str += "</td></tr>";
				} //end existing apps

				str += "</table>";


				if(paramObj["allApps"].length)
				{
					///////////////////////
					// existing addresses
					str += DesktopContent.htmlClearDiv();
					str += "Here is a dropdown of all existing XDAQ Applications " +
							" to help you in creating standardized names (Note: shown above are " +
							"only apps with class " + getAppClass() + " and in the chosen context '" +
							_paramObjMap[_STEP_WHICH_CONTEXT]["contextName"] +
							"'):";

					str += DesktopContent.htmlClearDiv();
					str += DesktopContent.htmlOpen("select",
							{
									"id" :		stepString + "allApps",
									"style" :	"margin-bottom: 16px;"
							});

						for(var i=0;i<paramObj["allApps"].length;++i)
						{
							str += DesktopContent.htmlOpen("option",
									{
									},
									paramObj["allApps"][i] /*innerHTML*/, true /*closeTag*/);
						}
						str += "</select>"; //end all apps dropdown
				} //end existing all apps



				str += "</center>";
				break; // _STEP_WHICH_APP

			case _STEP_SET_CONTEXT_HOST:

				if(paramObj["isNewContext"])
					str += "Please enter the Host Address and Port for the " +
					"new Context named '" +
					_paramObjMap[_STEP_WHICH_CONTEXT]["contextName"] + "':";
				else
					str += "Please verify the Host Address and Port for the " +
					"existing Context named '" +
					_paramObjMap[_STEP_WHICH_CONTEXT]["contextName"] + "':";

				str += "<center>";
				str += "<table style=''>";

				///////////////////////
				{ // address input
					str += "<tr><td><b>Address:</b></td><td>";

					str += DesktopContent.htmlOpen("input",
							{
									"type" : 	"text",
									"id" : 		stepString + "address",
									"value" : (paramObj["address"]?paramObj["address"]:""),
							}, "" /*innerHTML*/, true /*closeTag*/);

					str += "</td></tr>";
				} //end new context input
				///////////////////////
				{ // port input
					str += "<tr><td><b>Port:</b></td><td>";

					str += DesktopContent.htmlOpen("input",
							{
									"type" : 	"text",
									"id" : 		stepString + "port",
									"value" : (paramObj["port"]?paramObj["port"]:""),
							}, "" /*innerHTML*/, true /*closeTag*/);

					str += "</td></tr>";
				} //end new context input

				str += "</table>";
				str += "</center>";

				///////////////////////
				// existing addresses
				str += DesktopContent.htmlClearDiv();
				str += "Here is a dropdown of existing Host Addresses " +
						" to help you in creating standardized addresses:";
				str += DesktopContent.htmlClearDiv();
				str += DesktopContent.htmlOpen("select",
						{
								"id" :		stepString + "addresses",
								"style" :	"margin-bottom: 16px;"
						});


				for(var i=0;i<paramObj["hostAddresses"].length;++i)
				{
					str += DesktopContent.htmlOpen("option",
							{
							},paramObj["hostAddresses"][i] /*innerHTML*/, true /*closeTag*/);
				}
				str += "</select>"; //end existing records dropdown

				///////////////////////
				// existing ports
				str += DesktopContent.htmlClearDiv();
				str += "Here is a dropdown of existing Host Ports " +
						" to help you in creating standardized ports:";
				str += DesktopContent.htmlClearDiv();
				str += DesktopContent.htmlOpen("select",
						{
								"id" :		stepString + "ports",
								"style" :	""
						});


				for(var i=0;i<paramObj["hostPorts"].length;++i)
				{
					str += DesktopContent.htmlOpen("option",
							{
							},paramObj["hostPorts"][i] /*innerHTML*/, true /*closeTag*/);
				}
				str += "</select>"; //end existing records dropdown

				break;  //end _STEP_SET_CONTEXT_HOST

			case _STEP_WHICH_CONTEXT:

				xdaqContextTooltip();

				showNextButton = false; //replace it

				//take parameter recordName
				Debug.log("_STEP_WHICH_CONTEXT " + recordName);

				// " add to existing XDAQ Context or a new one?"
				str += "<br>";
				str += "Do you want to add the " + _recordAlias + " named '" +
						recordName + "' to a new XDAQ Context or an existing one?";


				str += "<center>";
				str += "<table style='margin-bottom: 10px;'>";

				///////////////////////
				{ // new context input
					str += "<tr><td><b>New XDAQ Context:</b></td><td>";

					str += DesktopContent.htmlOpen("input",
							{
									"type" : 	"text",
									"id" : 		stepString + "contextName",
									"value":	(paramObj["contextName"]?paramObj["contextName"]:""),
							}, "" /*innerHTML*/, true /*closeTag*/);

					str += DesktopContent.htmlOpen("input",
							{
									"id": stepString + "addToNew",
									"type": "button",
									"value": "Add to New",
									"title": "Create a new XDAQ Context and add the new " + _recordAlias + " to it."
							},
							0 /*html*/, true /*closeTag*/);
					str += "</td></tr>";
				} //end new context input

				if(paramObj["contexts"].length)
				{
					str += "<tr><td><b>Existing Contexts:</b></td><td>";
					{ //start contexts
						str += DesktopContent.htmlOpen("select",
								{
										"id" :		stepString + "contexts",
								});

						for(var i=0;i<paramObj["contexts"].length;++i)
						{
							str += DesktopContent.htmlOpen("option",
									{
									},
									paramObj["contexts"][i] /*innerHTML*/, true /*closeTag*/);
						}
						str += "</select>"; //end aliases dropdown
						str += DesktopContent.htmlOpen("input",
								{
										"id": stepString + "addToExisting",
										"type": "button",
										"value": "Add to Existing",
										"title": "Add new " + _recordAlias + " to the chosen existing XDAQ Context."
								},
								0 /*html*/, true /*closeTag*/);
					} //end contexts
					str += "</td></tr>";
				} //end existing contexts

				str += "</table>";
				str += "</center>";

				break; //end _STEP_WHICH_CONTEXT

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


				prevStepIndex = _STEP_WHICH_RECORD_TYPE;

				///////////////////////
				// header
				str += DesktopContent.htmlOpen("div",
						{
								"style" : "font-weight:bold; margin: 6px 0 20px 0;"
						},
						(_aRecordWasModified?
								("Would you like to create another " + _recordAlias + "?"):
						("Welcome to the " + _recordAlias + " creation Wizard!")) /*innerHTML*/,
						true /*closeTag*/);
				str += DesktopContent.htmlClearDiv();

				///////////////////////
				// prompt
				str += "Enter the unique record name for your " + _recordAlias + ": ";
				str += DesktopContent.htmlClearDiv();
				str += DesktopContent.htmlOpen("input",
						{
								"type" : 	"text",
								"id" : 		stepString + "recordName",
								"style" :	"margin-bottom: 16px;",
								"value" : 	(paramObj["recordName"]?paramObj["recordName"]:""),
						}, "" /*innerHTML*/, true /*closeTag*/);



				///////////////////////
				// existing records
				str += DesktopContent.htmlClearDiv();
				str += "Here is a dropdown of existing " + _recordAlias +
						" records to help you in creating standardized record names:";
				str += DesktopContent.htmlClearDiv();


				str += DesktopContent.htmlOpen("select",
						{
								"id" :		stepString + "records",
								"style" :	"margin-bottom: 16px;",
						});


				for(var i=0;i<_subsetUIDs.length;++i)
				{
					str += DesktopContent.htmlOpen("option",
							{
							},_subsetUIDs[i] /*innerHTML*/, true /*closeTag*/);
				}
				str += "</select>"; //end existing records dropdown


				str += DesktopContent.htmlOpen("div",
						{
								"id" : 		stepString + "deleteRecordIcon",
								"class":	ConfigurationAPI._POP_UP_DIALOG_ID + "-deleteIcon",
								"style" :	"float: right; margin: 6px 112px -16px -200px; display: block;",

						}, 0 /*innerHTML*/, true /*closeTag*/);


				//preload hover images
				str += DesktopContent.htmlOpen("div",
						{
								"id" : 		ConfigurationAPI._POP_UP_DIALOG_ID +
									"-preloadImage-editIconHover",
								"class":	ConfigurationAPI._POP_UP_DIALOG_ID + "-preloadImage",
						}, 0 /*innerHTML*/, true /*closeTag*/);
				str += DesktopContent.htmlOpen("div",
						{
								"id" : 		ConfigurationAPI._POP_UP_DIALOG_ID +
									"-preloadImage-treeEditTrashIconHover",
								"class":	ConfigurationAPI._POP_UP_DIALOG_ID + "-preloadImage",
						}, 0 /*innerHTML*/, true /*closeTag*/);


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

				nextStepIndex = _STEP_GET_RECORD_NAME;
				prevButtonText = "Close Wizard";

				///////////////////////
				// header
				str += DesktopContent.htmlOpen("div",
						{
								"style" : "font-weight:bold; margin: 6px 0 20px 0;"
						},
						"Welcome to the record creation Wizard!" /*innerHTML*/,
						true /*closeTag*/);
				str += DesktopContent.htmlClearDiv();

				///////////////////////
				// existing record types
				str += DesktopContent.htmlClearDiv();
				str += "Below is a dropdown of record types that this Wizard can help you create. " +
						" Choose one and proceed through the steps to create your new record:";
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
			switch(stepIndex)
			{
			case _STEP_SET_RECORD_FIELDS:

			{ //start scope of _STEP_SET_RECORD_FIELDS localAddHandlers
				//add the fields content in after parent element exists
				scopeForSetRecordFieldsContent();
				///////////////////////
				function scopeForSetRecordFieldsContent()
				{
					var recordFields = paramObj["fields"];

					var fieldContainerEl = document.getElementById(stepString + "fields");

					//disable highlighting of fields
					ConfigurationAPI.editableField_SELECTED_COLOR_ = "transparent";

					//for each record,
					//	make an element that is "editable" and "selectable" (_selectedFieldIndex)
					//		- when clicked becomes selected element
					//	 	- when pencil is clicked is edit mode
					//		- tab should move from edit field to edit field
					for(var i=0;i<recordFields.length;++i)
					{
						el = document.createElement("div");
						el.setAttribute("id", "cfg_subset_field-" + i);
						el.setAttribute("style", "white-space:nowrap;" +
								"margin: 5px;");
						fieldContainerEl.appendChild(el); //add field to field container

						//fill field
						el.appendChild(ConfigurationAPI.createEditableFieldElement(
								recordFields[i],i));

						//add clear div
						el = document.createElement("div");
						el.setAttribute("id", "clearDiv");
						fieldContainerEl.appendChild(el);
					}
				} //end scopeForSetRecordFieldsContent

			} //end scope of _STEP_SET_RECORD_FIELDS localAddHandlers
				break;

			case _STEP_PROC_WHICH_BUFFER:

			{ //start scope of _STEP_WHICH_APP localAddHandlers

				//create select change handler for existing records
				document.getElementById(stepString + "buffers").onclick = localAppSelectHandler;
				document.getElementById(stepString + "buffers").onchange = localAppSelectHandler;
				document.getElementById(stepString + "allBuffers").onclick = localAppSelectHandler;
				document.getElementById(stepString + "allBuffers").onchange = localAppSelectHandler;

				function localAppSelectHandler(event) {
					Debug.log("Selected " + this.value);

					//increment index
					document.getElementById(stepString + "bufferName").value =
							ConfigurationAPI.incrementName(this.value);
				}; //end onchange handler

				/////////////////////////////////
				document.getElementById(stepString + "addToNew").onclick =
						function()
						{
					var name = document.getElementById(stepString + "bufferName").value.trim();
					Debug.log("addToNew " + name);

					//save name to param for this step
					paramObj["bufferName"] = name;

					localCreateIntermediateLevelRecord(name);
						}; //end addToNew button handler

				/////////////////////////////////
				document.getElementById(stepString + "addToExisting").onclick =
						function()
						{
					var name = document.getElementById(stepString + "buffers").value.trim();
					Debug.log("addToExisting " + name);

					//save name to param for this step
					paramObj["bufferName"] = name;

					if(!_paramObjMap[_STEP_PROC_WHICH_BUFFER]["buffers"]) _paramObjMap[_STEP_PROC_WHICH_BUFFER]["buffers"] = []; //initialize if needed
					_paramObjMap[_STEP_PROC_WHICH_BUFFER]["isNew" + getIntermediateTypeName()] = false;

					//get buffer child group name: _paramObjMap[_STEP_PROC_WHICH_BUFFER]["recordGroupName"]
					localGetExistingIntermediateTargetGroupID(name);

						}; //end addToExisting handler

			} //end scope of _STEP_WHICH_APP localAddHandlers
			//NOTE: below this, functions were moved outside of swtich because they must be accessible to other steps and handlers
			// and, apparently {} create "function scope" inside a switch case
			// and, apparently switch statements create "function scope" too.


			break; //end _STEP_WHICH_APP
			case _STEP_WHICH_APP:

			{ //start scope of _STEP_WHICH_APP localAddHandlers

				//create select change handler for existing records
				document.getElementById(stepString + "apps").onclick = localAppSelectHandler;
				document.getElementById(stepString + "apps").onchange = localAppSelectHandler;
				document.getElementById(stepString + "allApps").onclick = localAppSelectHandler;
				document.getElementById(stepString + "allApps").onchange = localAppSelectHandler;

				function localAppSelectHandler(event) {
					Debug.log("Selected " + this.value);

					//increment index
					document.getElementById(stepString + "appName").value =
							ConfigurationAPI.incrementName(this.value);
				}; //end onchange handler

				/////////////////////////////////
				document.getElementById(stepString + "addToNew").onclick =
						function()
						{
					var name = document.getElementById(stepString + "appName").value.trim();
					Debug.log("addToNew " + name);

					//save name to param for this step
					paramObj["appName"] = name;

					localCreateApp(name);
						}; //end addToNew button handler

				/////////////////////////////////
				document.getElementById(stepString + "addToExisting").onclick =
						function()
						{
					var name = document.getElementById(stepString + "apps").value.trim();
					Debug.log("addToExisting " + name);

					//save name to param for this step
					paramObj["appName"] = name;

					if(!_paramObjMap[_STEP_WHICH_APP]["apps"]) _paramObjMap[_STEP_WHICH_APP]["apps"] = []; //initialize if needed
					_paramObjMap[_STEP_WHICH_APP]["isNewApp"] = false;

					//check supervisor config
					localGetExistingSupervisorTargetGroupID(name);

						}; //end addToExisting handler

			} //end scope of _STEP_WHICH_APP localAddHandlers
			//NOTE: below this, functions were moved outside of switch because they must be accessible to other steps and handlers
			// and, apparently {} create "function scope" inside a switch case
			// and, apparently switch statements create "function scope" too.


				break; //end _STEP_WHICH_APP
			case _STEP_SET_CONTEXT_HOST:

			{ //start scope of _STEP_SET_CONTEXT_HOST localAddHandlers
				//create select change handler for existing records
				document.getElementById(stepString + "addresses").onclick = localAddressSelectHandler;
				document.getElementById(stepString + "addresses").onchange = localAddressSelectHandler;

				function localAddressSelectHandler(event) {
					Debug.log("Selected " + this.value);
					document.getElementById(stepString + "address").value =
							this.value;
				}; //end onchange handler

				//create select change handler for existing records
				document.getElementById(stepString + "ports").onclick = localPortSelectHandler;
				document.getElementById(stepString + "ports").onchange = localPortSelectHandler;

				function localPortSelectHandler(event) {
					Debug.log("Selected " + this.value);
					document.getElementById(stepString + "port").value =
							this.value;
				}; //end onchange handler

			} //end scop of _STEP_SET_CONTEXT_HOST localAddHandlers

				break; //end _STEP_SET_CONTEXT_HOST

			case _STEP_WHICH_CONTEXT:

			{ //start scope of _STEP_WHICH_CONTEXT localAddHandlers
				//create select change handler for existing records
				document.getElementById(stepString + "contexts").onclick = localContextSelectHandler;
				document.getElementById(stepString + "contexts").onchange = localContextSelectHandler;

				function localContextSelectHandler(event) {
					Debug.log("Selected " + this.value);

					//increment index
					document.getElementById(stepString + "contextName").value =
							ConfigurationAPI.incrementName(this.value);
				}; //end onchange handler

				/////////////////////////////////
				document.getElementById(stepString + "addToNew").onclick =
						function()
						{
					var name = document.getElementById(stepString + "contextName").value.trim();
					Debug.log("addToNew " + name);

					//save name to param for this step
					paramObj["contextName"] = name;


					/////////////////////
					//create new record
					ConfigurationAPI.addSubsetRecords(
							_XDAQ_BASE_PATH,
							name,
							/////////////////////
							function(modifiedTables,err) //start addSubsetRecords handler
							{
						Debug.log("modifiedTables length " + modifiedTables.length);
						if(!modifiedTables.length)
						{
							//really an error
							Debug.log("There was an error while creating the XDAQ Context '" +
									name  + ".' " + err,
									Debug.HIGH_PRIORITY);
							return;
						}
						_modifiedTables = modifiedTables;

						//at this point new context was created
						Debug.log("New context '" + name + "' was successfully created!");

						newParamObj["isNewContext"] = true;

						//add to context list for going back
						if(paramObj["contexts"].indexOf(name) == -1)
							paramObj["contexts"].push(name);

						localGetAllHostInfo();

							}, //end addSubsetRecords handler
							_modifiedTables,
							true /*silenceErrors*/);  //end addSubsetRecords

						}; //end addToNew button handler

				/////////////////////////////////
				document.getElementById(stepString + "addToExisting").onclick =
						function()
						{
					var name = document.getElementById(stepString + "contexts").value.trim();
					Debug.log("addToExisting " + name);

					//save name to param for this step
					paramObj["contextName"] = name;

					newParamObj["isNewContext"] = false;

					//get host info of
					ConfigurationAPI.getFieldValuesForRecords(
							_XDAQ_BASE_PATH,
							name,
							["Address","Port","LinkToApplicationGroupID"],
							function(objArr)
							{
						console.log(objArr);
						newParamObj["address"] 	= objArr[0].fieldValue;
						newParamObj["port"] 	= objArr[1].fieldValue;
						newParamObj["appGroupId"] 	= objArr[2].fieldValue;

						localGetAllHostInfo();
							}, //end getFieldValuesForRecords handler
							_modifiedTables); //end getFieldValuesForRecords



						}; //end addToExisting handler


				/////////////////////////////////
				function localGetAllHostInfo()
				{
					Debug.log("localGetExistingHostInfo()");
					//get existing host addresses and ports
					ConfigurationAPI.getUniqueFieldValuesForRecords(
							_XDAQ_BASE_PATH,
							"*",
							["Address","Port"],
							function(objArr)
							{
						console.log(objArr);
						newParamObj["hostAddresses"] 	= objArr[0].fieldUniqueValueArray;
						newParamObj["hostPorts"] 		= objArr[1].fieldUniqueValueArray;

						showPrompt(nextStepIndex,newParamObj);
							},
							_modifiedTables);
				} //end localGetAllHostInfo()
			} //end scope of _STEP_WHICH_CONTEXT localAddHandlers

				break; //end _STEP_WHICH_CONTEXT

			case _STEP_GET_RECORD_NAME:

			{ //start scope of _STEP_GET_RECORD_NAME localAddHandlers

				//create select change handler for existing records
				document.getElementById(stepString + "records").onclick = localRecordsSelectHandler;
				document.getElementById(stepString + "records").onchange = localRecordsSelectHandler;

				/////////////////////////////////
				function localRecordsSelectHandler(event) {
					Debug.log("Selected " + this.value);

					//increment index
					document.getElementById(stepString + "recordName").value =
							ConfigurationAPI.incrementName(this.value);
				}; //end onchange handler for existing records

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
				/////////////////////////////////
				document.getElementById(stepString + "deleteRecordIcon").onclick =
						function() //start deleteRecordIcon handler
						{
					var selectedIndex =  document.getElementById(stepString + "records").selectedIndex;
					var recordName = _subsetUIDs[selectedIndex];
					Debug.log("deleteRecord " + selectedIndex + " : " + recordName);
					Debug.log("getRecordConfiguration " + getRecordConfiguration());
					Debug.log("getAppConfiguration " + getAppConfiguration());
					try
					{
						Debug.log("getIntermediateTable " + getIntermediateTable());
						Debug.log("getIntermediateTypeName " + getIntermediateTypeName());
					}catch(e){
						Debug.log("No intermediate table: " + e);
					}

					var generationsBack = 0; //initialize generations back for recursive prompt and remove
					var lastGenerationsBack, parentCheckParentIndex;

					//reset modified tables at start of deletion process
					//	to not accidentally permanently save an incompletely created record
					_modifiedTables = undefined;

					localPromptAndHandleRecordDeletion(_recordAlias,recordName);
					/////////////////////////////////
					function localPromptAndHandleRecordDeletion(recordType,recordName)
					{
						//Steps:
						//	prompt user, are you sure?
						//	reset modified tables
						//	delete record
						//	save modified tables
						//	check parent level for any empty children groups
						//	for each parent found with no children.. offer to delete them
						//	when complete, re-initialize with initRecordWizard()

						var prompt;

						if(generationsBack == 0)
							prompt = "Are you sure you want to remove the " + recordType + " named '" +
								recordName + "' from the active configuration?";
						else
							prompt = "Alert! A parent node, " + generationsBack + " level(s) up in the " +
								"configuration tree from the " +
								"origial " + _recordAlias + " '" + _subsetUIDs[selectedIndex] + ",' was found to " +
								"have no children.<br><br>Do you want to remove the childless " + recordType + " named '" +
								recordName + "' from the active configuration?";

						DesktopContent.popUpVerification(
								prompt,
								function() //OK handler, delete the record handler
								{

							Debug.log("do deleteRecord " + recordType + " : " + recordName);


							/////////////////////
							//delete record
							ConfigurationAPI.deleteSubsetRecords(
									getParentTable(generationsBack),
									recordName,
									/////////////////////
									function(modifiedTables,err) //start deleteSubsetRecords handler
									{
								Debug.log("modifiedTables length " + modifiedTables.length);
								if(!modifiedTables.length)
								{
									//really an error
									Debug.log("There was an error while creating the XDAQ Context '" +
											recordName  + ".' " + err,
											Debug.HIGH_PRIORITY);
									return;
								}
								_modifiedTables = modifiedTables;
								console.log(_modifiedTables);

								//at this point context was deleted in modified tables
								Debug.log("The " + recordType + " named '" +
										recordName + "' was successfully removed!",
										Debug.INFO_PRIORITY);

								parentCheckParentIndex = 0; //reset when record is deleted


								//now save, then check parent level for no children

								//proceed to save (quietly) tables, groups, aliases
								ConfigurationAPI.saveModifiedTables(_modifiedTables,
										function(savedTables, savedGroups, savedAliases)
										{
									if(!savedTables.length)
									{
										Debug.log("There was an error while saving the changes.",
												Debug.HIGH_PRIORITY);
										return;
									}

									Debug.log("The " +
											_recordAlias + " named '" + recordName + "' was successfully removed!",
											Debug.INFO_PRIORITY);

									_modifiedTables = undefined; //clear after save

									_aRecordWasModified = true;

									if(generationsBack == 0)
									{
										generationsBack = 1;
										localCheckParentChildren();
									}
									else
										localCheckParentChildren();

										}, //end saveModifiedTables handler

										0, //doNotIgnoreWarnings,
										0, //doNotSaveAffectedGroups,
										0, //doNotActivateAffectedGroups,
										0, //doNotSaveAliases,
										0, //doNotIgnoreGroupActivationWarnings,
										true //doNotKillPopUpEl

										); //end saveModifiedTables handler



									}, //end deleteSubsetRecords handler
									_modifiedTables,
									true /*silenceErrors*/);  //end deleteSubsetRecords

								}, //end OK, delete the record handler
								0 /* REPLACE val*/,
								"#efeaea" /*bgColor*/, 0 /*textColor*/,
								"#770000" /*borderColor*/,0 /*getUserInput*/,300 /*dialogWidth*/,
								function() // on Cancel, check parent children handler
								{
									Debug.log("User opted not to delete node.");

									//even if one parent is cancelled.. keep checking
									if(generationsBack)
										localCheckParentChildren();
								} //end Cancel, check parent children handler
						); //end of DesktopContent.popUpVerification


						/////////////////////////////////
						function localCheckParentChildren()
						{
							if(lastGenerationsBack != generationsBack)
							{
								//new generation, so reset starting parent to consider
								Debug.log("Starting new generation of checking...");
								parentCheckParentIndex = 0;
								lastGenerationsBack = generationsBack;
							}
							Debug.log("localCheckParentChildren generationsBack=" + generationsBack +
									" parentCheckParentIndex=" + parentCheckParentIndex);

							//Steps:
							//	check parent level for any empty children groups
							//	for each parent found with no children.. offer to delete them
							//	when complete, re-initialize with initRecordWizard()

							//parent level table
							Debug.log("getAppConfiguration " + getAppConfiguration());

							var modifiedTablesListStr = "";
							for(var i=0;_modifiedTables && i<_modifiedTables.length;++i)
							{
								if(i) modifiedTablesListStr += ",";
								modifiedTablesListStr += _modifiedTables[i].tableName + "," +
										_modifiedTables[i].tableVersion;
							}

							// get tree looking for empty children
							DesktopContent.XMLHttpRequest("Request?RequestType=getTreeView" +
									"&tableGroup=" +
									"&tableGroupKey=-1" +
									"&hideStatusFalse=0" +
									"&depth=3", //make sure to see empty parents
									"startPath=/" + getParentTable(generationsBack) +
									"&filterList=" + getParentFilter(generationsBack) +
									"&modifiedTables=" + modifiedTablesListStr, //end post data
									function(req)
									{

								var tree = DesktopContent.getXMLNode(req,"tree");
								console.log(tree);

								//for each node record at parent level, check for empty children
								try
								{
									var i,j;
									var parentChildren;
									var parentName;
									for(i=parentCheckParentIndex;i<tree.children.length;++i)
									{
										++parentCheckParentIndex; //next time ensure check next parent record first

										parentName = tree.children[i].getAttribute("value");
										Debug.log("Checking parent record " +
												parentCheckParentIndex + ":" +
												parentName);

										//find link field
										for(j=0;j<tree.children[i].children.length;++j)
											if(tree.children[i].children[j].getAttribute("value") ==
													getParentLinkField(generationsBack))
											{
												//found link
												parentChildren = DesktopContent.getXMLChildren(
														tree.children[i].children[j],
														"node");
												Debug.log("Num of children " + parentChildren.length);

												if(parentChildren.length == 0)
												{
													localPromptAndHandleRecordDeletion(
															getParentType(generationsBack),
															parentName)
													return; //do just one parent at a time, so async requests dont go crazy
												}
												break;
											}
									}
									//if here then no childless parent nodes found
									Debug.log("No childless parent nodes found");

									//try next generation back, recursively
									++generationsBack;
									localCheckParentChildren();
								}
								catch(e)
								{
									//get here on error, or if completed tree traversal

									Debug.log("Giving up on childless parent node check. " +
											"Ignoring errors: " + e);

									initRecordWizard(); //start over to update list
								}


									}); //end getTreeView handler

						}
					} //end localPromptAndHandleRecordDeletion()
						}; //end deleteRecordIcon handler
			} //end scope of _STEP_GET_RECORD_NAME localAddHandlers

				break; //end _STEP_GET_RECORD_NAME

			case _STEP_CHANGE_GROUP:

			{ //start scope of _STEP_CHANGE_GROUP localAddHandlers

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

						initRecordWizard();
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

						initRecordWizard();
							}); //end activate group handler
						}; //end activate alias handler

			} //end scope of _STEP_CHANGE_GROUP localAddHandlers

				break;  //end _STEP_CHANGE_GROUP
			default:;
			}




			///////////////////////////////////////////////////////
			//add functions shared by handlers above and below
			{ //fake scope for grouping


				/////////////////////////////////
				function localCreateIntermediateLevelRecord(name)
				{
					Debug.log("localCreateIntermediateLevelRecord " + name);

					/////////////////////
					//create new record
					ConfigurationAPI.addSubsetRecords(
							getIntermediateTable(),
							name,
							/////////////////////
							function(modifiedTables,err) //start addSubsetRecords handler
							{
						Debug.log("modifiedTables length " + modifiedTables.length);
						if(!modifiedTables.length)
						{
							//really an error
							Debug.log("There was an error while creating the XDAQ Application '" +
									name  + ".' " + err,
									Debug.HIGH_PRIORITY);
							return;
						}
						_modifiedTables = modifiedTables;

						//at this point new app was created
						Debug.log("New intermediate record '" + name + "' was successfully created!");

						newParamObj["isNew" + getIntermediateTypeName()] = true;

						if(_recordAlias == _RECORD_TYPE_PROCESSOR)
						{
							if(_intermediateLevel == 0)
							{
								//add to app list for going back
								// Note may need to initialize things, if skipped _STEP_WHICH_APP to get here
								if(!_paramObjMap[_STEP_PROC_WHICH_BUFFER]) _paramObjMap[_STEP_PROC_WHICH_BUFFER] = {};//initialize if needed
								if(!_paramObjMap[_STEP_PROC_WHICH_BUFFER]["allBuffers"]) _paramObjMap[_STEP_PROC_WHICH_BUFFER]["allBuffers"] = []; //initialize if needed
								if(_paramObjMap[_STEP_PROC_WHICH_BUFFER]["allBuffers"].indexOf(name) == -1)
									_paramObjMap[_STEP_PROC_WHICH_BUFFER]["allBuffers"].push(name);
							}
							else
								throw("?");
						}
						else
							throw("?");

						localSetupIntermediateLevelRecord(name);

							}, //end addSubsetRecords handler
							_modifiedTables,
							true /*silenceErrors*/);  //end addSubsetRecords
				} //end localCreateIntermediateLevelRecord()

				/////////////////////////////////
				function localSetupIntermediateLevelRecord(name)
				{
					//get group id
					var recordGroupId = "";
					if(_recordAlias == _RECORD_TYPE_PROCESSOR)
					{
						if(_intermediateLevel == 0)
						{
							recordGroupId = _paramObjMap[_STEP_WHICH_APP]["appChildGroupName"];
						}
						else
							throw("?");
					}
					else
						throw("?");


					Debug.log("localSetupIntermediateLevelRecord " + name +
							" into groupId=" + recordGroupId);

					var fieldArr,valueArr;

					if(_recordAlias == _RECORD_TYPE_PROCESSOR)
					{
						if(_intermediateLevel == 0)
						{
							fieldArr = [
										"Status",
										"DataManagerGroupID",
										"LinkToDataProcessorTable",
										"LinkToDataBufferGroupID",
										"CommentDescription"
										];

							valueArr = [
										"1",//"Status",
										recordGroupId,//"DataManagerGroupID",
										getRecordConfiguration(),//"LinkToDataProcessorTable",
										name+"ProcessorGroup",//"LinkToDataBufferGroupID",
										_DEFAULT_WIZ_COMMENT//"CommentDescription"
										];
						}
						else
							throw("?");

					}

					ConfigurationAPI.setFieldValuesForRecords(
							getIntermediateTable(),
							name, 	//recordArr
							fieldArr, 	//fieldArr
							valueArr, 	//valueArr
							function(modifiedTables)
							{
						Debug.log("modifiedTables length " + modifiedTables.length);

						if(!modifiedTables.length)
						{
							Debug.log("There was an error while writing the values for the App.",
									Debug.HIGH_PRIORITY);
							return;
						}
						_modifiedTables = modifiedTables;

						//now create record

						//store group name for record setup later
						if(!_paramObjMap[_STEP_PROC_WHICH_BUFFER]) _paramObjMap[_STEP_PROC_WHICH_BUFFER] = {}; //init if needed
						_paramObjMap[_STEP_PROC_WHICH_BUFFER]["recordGroupName"] = name+"ProcessorGroup";

						localCreateRecord(getRecordConfiguration());

							}, //end setFieldValuesForRecords handler
							_modifiedTables);	//end setFieldValuesForRecords
				} //end localSetupApp()

				/////////////////////////////////
				function localCreateApp(name)
				{
					Debug.log("localCreateApp " + name);
					/////////////////////
					//create new record
					ConfigurationAPI.addSubsetRecords(
							_XDAQAPP_BASE_PATH,
							name,
							/////////////////////
							function(modifiedTables,err) //start addSubsetRecords handler
							{
						Debug.log("modifiedTables length " + modifiedTables.length);
						if(!modifiedTables.length)
						{
							//really an error
							Debug.log("There was an error while creating the XDAQ Application '" +
									name  + ".' " + err,
									Debug.HIGH_PRIORITY);
							return;
						}
						_modifiedTables = modifiedTables;

						//at this point new app was created
						Debug.log("New app '" + name + "' was successfully created!");

						//add to app list for going back
						// Note may need to initialize things, if skipped _STEP_WHICH_APP to get here
						if(!_paramObjMap[_STEP_WHICH_APP]) _paramObjMap[_STEP_WHICH_APP] = {};//initialize if needed
						if(!_paramObjMap[_STEP_WHICH_APP]["apps"]) _paramObjMap[_STEP_WHICH_APP]["apps"] = []; //initialize if needed
						if(_paramObjMap[_STEP_WHICH_APP]["apps"].indexOf(name) == -1)
							_paramObjMap[_STEP_WHICH_APP]["apps"].push(name);
						_paramObjMap[_STEP_WHICH_APP]["isNewApp"] = true;

						localSetupApp(name);

							}, //end addSubsetRecords handler
							_modifiedTables,
							true /*silenceErrors*/);  //end addSubsetRecords
				} //end localCreateApp()

				/////////////////////////////////
				function localSetupApp(name)
				{
					var context = _paramObjMap[_STEP_WHICH_CONTEXT]["contextName"];
					var appGroupId = _paramObjMap[_STEP_SET_CONTEXT_HOST]["appGroupId"];

					Debug.log("localSetupApp " + name + " in context=" + context + " groupId=" + appGroupId);

					var fieldArr,valueArr;

					if(1)//_recordAlias == _RECORD_TYPE_FE)
					{
						fieldArr = [
									"Status",
									"ApplicationGroupID",
									"LinkToSupervisorTable",
									"LinkToSupervisorUID",
									"Class",
									"Instance",
									"Module",
									"CommentDescription"
									];

						valueArr = [
									"1",//"Status",
									appGroupId,//"ApplicationGroupID",
									getAppConfiguration(),//"LinkToSupervisorTable",
									name+"Config",//"LinkToSupervisorUID",
									getAppClass(),//"Class",
									"1",//"Instance",
									getAppModule(),//"Module",
									_DEFAULT_WIZ_COMMENT//"CommentDescription"
									];
					}
					//					else if(_recordAlias == _RECORD_TYPE_PROCESSOR
					//							)
					//					{
					//						throw("TODO.");
					//					}

					ConfigurationAPI.setFieldValuesForRecords(
							_XDAQAPP_BASE_PATH,
							name, 	//recordArr
							fieldArr, 	//fieldArr
							valueArr, 	//valueArr
							function(modifiedTables)
							{
						Debug.log("modifiedTables length " + modifiedTables.length);

						if(!modifiedTables.length)
						{
							Debug.log("There was an error while writing the values for the App.",
									Debug.HIGH_PRIORITY);
							return;
						}
						_modifiedTables = modifiedTables;

						// now setup specific supervisor config
						localCreateAppConfig(name+"Config");

							}, //end setFieldValuesForRecords handler
							_modifiedTables);	//end setFieldValuesForRecords
				} //end localSetupApp()

				/////////////////////////////////
				function localCreateAppConfig(name)
				{
					Debug.log("localCreateAppConfig " + name);
					/////////////////////
					//create new record
					ConfigurationAPI.addSubsetRecords(
							getAppConfiguration(),
							name,
							/////////////////////
							function(modifiedTables,err) //start addSubsetRecords handler
							{
						Debug.log("modifiedTables length " + modifiedTables.length);
						if(!modifiedTables.length)
						{
							//really an error
							Debug.log("There was an error while creating the XDAQ Application '" +
									name  + ".' " + err,
									Debug.HIGH_PRIORITY);
							return;
						}
						_modifiedTables = modifiedTables;

						//at this point new app config was created
						Debug.log("New app config '" + name + "' was successfully created!");

						//now setup app config
						localSetupAppConfig(name);

							}, //end addSubsetRecords handler
							_modifiedTables,
							true /*silenceErrors*/);  //end addSubsetRecords
				} //end localCreateAppConfig()

				/////////////////////////////////
				function localSetupAppConfig(name)
				{
					var context = _paramObjMap[_STEP_WHICH_CONTEXT]["contextName"];
					Debug.log("localSetupAppConfig " + name + " in context=" + context);

					var fieldArr,valueArr;
					var groupSuffix;

					_intermediateLevel = 0; //reset

					if(_recordAlias == _RECORD_TYPE_FE)
					{
						fieldArr = [
									"LinkToFEInterfaceTable",
									"LinkToFEInterfaceGroupID",
									"CommentDescription"
									];
						groupSuffix = "FEGroup";

						valueArr = [
									getRecordConfiguration(),//"LinkToFEInterfaceTable",
									name+groupSuffix,//"LinkToFEInterfaceGroupID",
									_DEFAULT_WIZ_COMMENT//"CommentDescription"
									];
					}
					else if(_recordAlias == _RECORD_TYPE_PROCESSOR
							)
					{

						fieldArr = [
									"LinkToDataBufferTable",
									"LinkToDataManagerGroupID",
									"CommentDescription"
									];

						groupSuffix = "DMGroup";

						valueArr = [
									getIntermediateTable(),//"LinkToFEInterfaceTable",
									name+groupSuffix,//"LinkToFEInterfaceGroupID",
									_DEFAULT_WIZ_COMMENT//"CommentDescription"
									];
					}
					else throw("?");

					ConfigurationAPI.setFieldValuesForRecords(
							getAppConfiguration(),
							name, 	//recordArr
							fieldArr, 	//fieldArr
							valueArr, 	//valueArr
							function(modifiedTables)
							{
						Debug.log("modifiedTables length " + modifiedTables.length);

						if(!modifiedTables.length)
						{
							Debug.log("There was an error while writing the values for the App.",
									Debug.HIGH_PRIORITY);
							return;
						}
						_modifiedTables = modifiedTables;

						//save group name for later
						// Note may need to initialize things, if skipped _STEP_WHICH_APP to get here
						if(!_paramObjMap[_STEP_WHICH_APP]) _paramObjMap[_STEP_WHICH_APP] = {};//initialize if needed


						_paramObjMap[_STEP_WHICH_APP]["appChildGroupName"] = name+groupSuffix;

						if(_recordAlias == _RECORD_TYPE_FE)
						{
							Debug.log("Creating record...");
							// now setup specific plugin
							localCreateRecord(getRecordConfiguration());
						}
						else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
						{
							Debug.log("Setting up extra buffer level...");
							localHandleIntermediateLevel();
						}
						else throw("?");

							}, //end setFieldValuesForRecords handler
							_modifiedTables);	//end setFieldValuesForRecords
				} //end localSetupAppConfig()


				/////////////////////////////////
				// _intermediateLevel is incremented by some handler, if needed
				function localHandleIntermediateLevel()
				{
					if(_recordAlias == _RECORD_TYPE_PROCESSOR)
					{
						switch(_intermediateLevel)
						{
						case 0: //create Data Buffer in Data Manager
						{

							var bufferGroupId = _paramObjMap[_STEP_WHICH_APP]["appChildGroupName"];
							var appName =  _paramObjMap[_STEP_WHICH_APP]["appName"];


							Debug.log("localCreateIntermediateLevel-" + _intermediateLevel +
									" DataManager=" + appName);

							//Steps:
							//	get all buffers, then all buffers associated with data manager
							//		if 0, make new one
							//		if some, present choices to user (new or existing)

							// get all existing apps
							ConfigurationAPI.getSubsetRecords( ////////////////////////////////
									getIntermediateTable(),
									"" /*_recordPreFilterList*/,
									function(allRecords)
									{
								Debug.log("all buffers found = " + allRecords.length);
								console.log(allRecords);

								//store allBuffers for later
								if(!_paramObjMap[_STEP_PROC_WHICH_BUFFER]) _paramObjMap[_STEP_PROC_WHICH_BUFFER] = {}; //init if needed
								_paramObjMap[_STEP_PROC_WHICH_BUFFER]["allBuffers"] = allRecords;

								// get existing apps of appClass
								ConfigurationAPI.getSubsetRecords( ////////////////////////////////
										getIntermediateTable(),
										"DataManagerGroupID="+
										encodeURIComponent(bufferGroupId) /*_recordPreFilterList*/,
										function(records)
										{
									Debug.log("buffers of DataManager '" + appName +
											"' found = " + records.length);
									console.log(records);

									//									var bufferName = "";
									//									if(_paramObjMap[_STEP_PROC_WHICH_BUFFER]["bufferName"])
									//										bufferName = _paramObj["level" + _intermediateLevel + "RecordName"];
									//else
									//	_paramObj["level" + _intermediateLevel + "RecordName"] =
									//			(bufferName = ConfigurationAPI.createNewRecordName(listOfExisting)appName + "DB"); //generate the buffer name

									//Debug.log("bufferName " + bufferName);

									if(records.length == 0)
									{
										//if no buffers in context, create buffer
										//	with made up name

										var bufferName = ConfigurationAPI.createNewRecordName("Buffer",allRecords);

										//store bufferName for later
										_paramObjMap[_STEP_PROC_WHICH_BUFFER]["bufferName"] = bufferName;

										localCreateIntermediateLevelRecord(appName);
									}
									else //if buffers in context, ask if adding to existing
									{
										_paramObjMap[_STEP_PROC_WHICH_BUFFER]["buffers"] = records;
										showPrompt(_STEP_PROC_WHICH_BUFFER);
									}

										}, //end all getSubsetRecords handler
										_modifiedTables); //end all getSubsetRecords

									}, //end all getSubsetRecords handler
									_modifiedTables); //end all getSubsetRecords

							var bufferName
						}
							break; //end create Data Buffer in Data Manager
						default: throw("?");
						}

					}
					else throw("?");

				} //end localCreateIntermediateLevel()

				/////////////////////////////////
				//for case when using existing intermediate (e.g. Buffer)
				function localGetExistingIntermediateTargetGroupID(intermediateName)
				{

					Debug.log("localGetExistingSupervisorTargetGroupID " + intermediateName +
							" of type " + getIntermediateTypeName());

					ConfigurationAPI.getTree(
							getIntermediateTable() + "/" + intermediateName,
							4 /*depth*/,
							_modifiedTables,
							function(tree)
							{
						console.log(tree);

						var table;
						var groupId;

						try
						{ //accessing tree GroupID location directly

							if(_recordAlias == _RECORD_TYPE_PROCESSOR)
							{

								if(tree.children[1].children[0].nodeName !=
										"GroupID")
									throw("Invalid GroupID location in tree.");
								if(tree.children[1].children[1].nodeName !=
										"LinkTableName")
									throw("Invalid Link Table location in tree.");

								groupId =
										tree.children[1].children[0].getAttribute("value");
								table =
										tree.children[1].children[1].getAttribute("value");
							}
							else throw("?");
						}
						catch(e)
						{
							Debug.log("Error locating group in configuration for the new record. " + e,
									Debug.HIGH_PRIORITY);
							return;
						}
						Debug.log("Group Link found as " + table + ":" + groupId);

						//save group name for later
						// Note may need to initialize things, if skipped _STEP_WHICH_APP to get here


						if(_recordAlias == _RECORD_TYPE_PROCESSOR)
						{
							if(!_paramObjMap[_STEP_PROC_WHICH_BUFFER]) _paramObjMap[_STEP_PROC_WHICH_BUFFER] = {};//initialize if needed
							_paramObjMap[_STEP_PROC_WHICH_BUFFER]["recordGroupName"] = groupId;
							localCreateRecord(table);
							Debug.log("Setting up extra buffer level...");
						}
						else throw("?");


							}); //end getTree


				} //end localGetExistingIntermediateTargetGroupID()

				/////////////////////////////////
				//for case when using existing supervisor
				function localGetExistingSupervisorTargetGroupID(supervisorName)
				{
					Debug.log("localGetExistingSupervisorTargetGroupID " + supervisorName);

					ConfigurationAPI.getTree(
							_XDAQAPP_BASE_PATH + "/" + supervisorName,
							4 /*depth*/,
							_modifiedTables,
							function(tree)
							{
						console.log(tree);

						var table;
						var groupId;

						try
						{ //accessing tree GroupID location directly

							if(tree.children[1].children[4].children[0].nodeName !=
									"GroupID")
								throw("Invalid GroupID location in tree.");
							if(tree.children[1].children[4].children[1].nodeName !=
									"LinkTableName")
								throw("Invalid Link Table location in tree.");

							groupId =
									tree.children[1].children[4].children[0].getAttribute("value");
							table =
									tree.children[1].children[4].children[1].getAttribute("value");

						}
						catch(e)
						{
							Debug.log("Error locating group in configuration for the new record. " + e,
									Debug.HIGH_PRIORITY);
							return;
						}
						Debug.log("Group Link found as " + table + ":" + groupId);

						//save group name for later
						// Note may need to initialize things, if skipped _STEP_WHICH_APP to get here
						if(!_paramObjMap[_STEP_WHICH_APP]) _paramObjMap[_STEP_WHICH_APP] = {};//initialize if needed
						_paramObjMap[_STEP_WHICH_APP]["appChildGroupName"] = groupId;

						if(_recordAlias == _RECORD_TYPE_FE)
						{
							Debug.log("Creating record...");
							localCreateRecord(table);
						}
						else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
						{
							Debug.log("Setting up extra buffer level...");
							_intermediateLevel = 0; //reset
							localHandleIntermediateLevel();
						}
						else throw("?");


							}); //end getTree

				} //end localGetExistingSupervisorTargetGroupID()


				/////////////////////////////////
				function localCreateRecord(table)
				{
					Debug.log("localCreateRecord " + recordName + " in table=" + table);

					/////////////////////
					//create new record
					ConfigurationAPI.addSubsetRecords(
							table,
							recordName,
							/////////////////////
							function(modifiedTables,err) //start addSubsetRecords handler
							{
						Debug.log("modifiedTables length " + modifiedTables.length);
						if(!modifiedTables.length || err)
						{
							var reallyAnError = true;
							if(_furthestStep >= _STEP_SET_RECORD_FIELDS)
							{
								//then already created record, so ignore error that it exists
								if(err.indexOf("Entries in UID are not unique") >= 0)
								{
									Debug.log("Ignoring UID not unique error since likely already created..." +
											err);
									reallyAnError = false;
								}
							}

							if(reallyAnError)
							{
								//really an error
								Debug.log("There was an error while creating the " + _recordAlias +
										" record named '" +
										recordName  + ".' " + err,
										Debug.HIGH_PRIORITY);
								return;
							}
						}
						else
							_modifiedTables = modifiedTables;

						console.log("_modifiedTables",_modifiedTables);

						//at this point new app config was created
						Debug.log("New " + _recordAlias + " record named '" + recordName + "' was successfully created!");

						//now get helper valuse for record details
						localGetHelperValuesForRecord();

							}, //end addSubsetRecords handler
							_modifiedTables,
							true /*silenceErrors*/);  //end addSubsetRecords
				} //end localCreateRecord()

				/////////////////////////////////
				//localGetHelperValuesForRecord
				function localGetHelperValuesForRecord()
				{
					Debug.log("localGetHelperValuesForRecord " + recordName);

					ConfigurationAPI.getFieldsOfRecords(
							getRecordConfiguration(),
							recordName,
							"!*Comment*,!*SlowControls*,!Status,!" + getRecordGroupIDField()/*fieldList*/,
							-1 /*maxDepth*/,
							function(recordFields)
							{
						newParamObj["fields"] = recordFields;
						Debug.log("recordFields found = " + recordFields.length);
						console.log(recordFields);

						//specifically go to _STEP_SET_RECORD_FIELDS (because may have jumped here)
						showPrompt(_STEP_SET_RECORD_FIELDS,newParamObj);

							}, //end getFieldsOfRecords handler
							_modifiedTables); //end getFieldsOfRecords

				} //end localGetHelperValuesForRecord

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
					case _STEP_SET_RECORD_FIELDS:

						//set record fields and save modified tables
						localScopeSetRecordFieldsDoIt();

						/////////////////////////////////
						function localScopeSetRecordFieldsDoIt() //function just for scoped vars
						{
							Debug.log("localScopeSetRecordFieldsDoIt");

							var recordFields = paramObj["fields"];

							var groupName = "";

							if(_recordAlias == _RECORD_TYPE_FE)
								groupName = _paramObjMap[_STEP_WHICH_APP]["appChildGroupName"];
							else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
								groupName = _paramObjMap[_STEP_PROC_WHICH_BUFFER]["recordGroupName"];
							else throw("?");


							//make arrays for all field/values pairs
							var fieldArr = [];
							var valueArr = [];

							//for each field, get value
							for(var i=0;i<recordFields.length;++i)
							{
								fieldArr.push(recordFields[i].fieldRelativePath +
										recordFields[i].fieldColumnName);
								valueArr.push(ConfigurationAPI.getEditableFieldValue(
										recordFields[i],
										i));
							}

							//add groupId field to modify
							//	and comment, etc.
							fieldArr.push(getRecordGroupIDField());
							valueArr.push(groupName);
							fieldArr.push("CommentDescription");
							valueArr.push(_DEFAULT_WIZ_COMMENT);
							fieldArr.push("Status");
							valueArr.push("1");

							ConfigurationAPI.setFieldValuesForRecords(
									getRecordConfiguration(),
									recordName, 	//recordArr
									fieldArr, 	//fieldArr
									valueArr, 	//valueArr
									function(modifiedTables)
									{
								Debug.log("modifiedTables length " + modifiedTables.length);

								if(!modifiedTables.length)
								{
									Debug.log("There was an error while writing the values.",
											Debug.HIGH_PRIORITY);
									return;
								}

								_modifiedTables = modifiedTables;

								//proceed to save (quietly) tables, groups, aliases
								ConfigurationAPI.saveModifiedTables(_modifiedTables,
										function(savedTables, savedGroups, savedAliases)
										{
									if(!savedTables.length)
									{
										Debug.log("There was an error while saving the values.",
												Debug.HIGH_PRIORITY);
										return;
									}

									Debug.log("The new " +
											_recordAlias + " named '" + recordName + "' was successfully created!",
											Debug.INFO_PRIORITY);

									_modifiedTables = undefined; //clear after save

									_aRecordWasModified = true;

									initRecordWizard(); //start over if no done handler

										}); //end saveModifiedTables handler

									}, //end setFieldValuesForRecords handler
									_modifiedTables);	 //end setFieldValuesForRecords

						} //end localScopeSetRecordFieldsDoIt()

						return; //prevent default next action

						break; //end _STEP_SET_RECORD_FIELDS

					case _STEP_SET_CONTEXT_HOST:

						//set fields for selected context
						localHandleSetupContext();

						/////////////////////////////////
						function localHandleSetupContext() //function just for scoped vars
						{
							Debug.log("localHandleSetupContext");

							var context = _paramObjMap[_STEP_WHICH_CONTEXT]["contextName"];
							var address = document.getElementById(stepString + "address").value.trim();
							var port = document.getElementById(stepString + "port").value.trim();

							//save name to param for this step
							paramObj["address"] = address;

							//save name to param for this step
							paramObj["port"] = port;

							var appGroupId = context+"Apps";
							if(!paramObj["isNewContext"])
								appGroupId = paramObj["appGroupId"];
							else
								paramObj["appGroupId"] = appGroupId;

							var fieldArr = ["Status",
											"LinkToApplicationTable",
											"LinkToApplicationGroupID",
											"Address",
											"Port",
											"CommentDescription"
											];

							var valueArr = ["1",//"Status",
											_XDAQAPP_BASE_PATH,//"LinkToApplicationTable",
											appGroupId,//"LinkToApplicationGroupID",
											address,//"Address"
											port,//"Port"
											_DEFAULT_WIZ_COMMENT//"CommentDescription"
											];

							ConfigurationAPI.setFieldValuesForRecords(
											_XDAQ_BASE_PATH,
											context, 	//recordArr
											fieldArr, 	//fieldArr
											valueArr, 	//valueArr
											function(modifiedTables)
											{
										Debug.log("modifiedTables length " + modifiedTables.length);

										if(!modifiedTables.length)
										{
											Debug.log("There was an error while writing the values.",
													Debug.HIGH_PRIORITY);
											return;
										}
										_modifiedTables = modifiedTables;

										//create Apps now

										//if FE
										//	if no apps in context, create FESupervisor
										//	if apps in context, ask if adding to existing
										//if consumer/producer
										//	if no apps in context, create DataManagerSupervisor
										//	if apps in context, ask if adding to existing

										localGetAppInfo();

											}, //end setFieldValuesForRecords handler
											_modifiedTables);	//end setFieldValuesForRecords

							/////////////////////////////////
							function localGetAppInfo()
							{
								var appGroupId = paramObj["appGroupId"];
								Debug.log("localGetAppInfo for context app group " + appGroupId);

								// get all existing apps
								ConfigurationAPI.getSubsetRecords( ////////////////////////////////
										_XDAQAPP_BASE_PATH,
										"" /*_recordPreFilterList*/,
										function(allApps)
										{
									Debug.log("all apps found = " + allApps.length);

									console.log(allApps);

									if(!_paramObjMap[_STEP_WHICH_APP]) _paramObjMap[_STEP_WHICH_APP] = {}; //init if needed

									//store all apps for later
									_paramObjMap[_STEP_WHICH_APP]["allApps"] = allApps;

									// get existing apps of appClass
									ConfigurationAPI.getSubsetRecords( ////////////////////////////////
											_XDAQAPP_BASE_PATH,
											"Class=" +
											encodeURIComponent(getAppClass()) +
											";ApplicationGroupID="+
											//For DEBUG "testContextApps",
											encodeURIComponent(appGroupId) /*_recordPreFilterList*/,
											function(records)
											{
										Debug.log("apps of appClass found = " + records.length);
										console.log(records);

										if(records.length == 0)
										{
											//if no apps in context, create XDAQ App
											//	with made up name

											var appName = ConfigurationAPI.createNewRecordName(
													getApp() +
													_paramObjMap[_STEP_GET_RECORD_NAME].recordName,
													allApps);

											//store app name for later
											_paramObjMap[_STEP_WHICH_APP]["appName"] = appName;

											localCreateApp(appName);
										}
										else //if apps in context, ask if adding to existing
										{
											_paramObjMap[_STEP_WHICH_APP]["apps"] = records;
											showPrompt(_STEP_WHICH_APP);
										}

											}, //end type class getSubsetRecords handler
											_modifiedTables); //end type class getSubsetRecords
										}, //end all getSubsetRecords handler
										_modifiedTables); //end all getSubsetRecords
							} //end localGetAppInfo()

						} //end localHandleSetupContext()

						return; //stop standard next call

						break; //end _STEP_SET_CONTEXT_HOST next handler

					case _STEP_GET_RECORD_NAME:

						//save name to param for this step
						recordName = document.getElementById(stepString + "recordName").value.trim();
						paramObj["recordName"] = recordName;

						if(recordName.length < 1)
						{
							Debug.log("Invalid " + _recordAlias + " name ' " +
									recordName + "' (too short). Please enter a valid name.",
									Debug.HIGH_PRIORITY);
							return;
						}

						for(var i=0;i<_subsetUIDs.length;++i)
							if(_subsetUIDs[i] == recordName)
							{
								Debug.log("Invalid " + _recordAlias + " name ' " +
										recordName + "' (name already in use in the active configuration). Please enter a valid name.",
										Debug.HIGH_PRIORITY);
								return;
							}

						//get existing contexts and give as parameter
						ConfigurationAPI.getSubsetRecords(
								_XDAQ_BASE_PATH,
								"",
								function(records)
								{
							newParamObj["contexts"] = records;
							Debug.log("contexts found = " + records.length);
							console.log(records);

							showPrompt(nextStepIndex,newParamObj);

								});	//end getSubsetRecords handler
						return; //prevent default show prompt, do in handler
						break; //end _STEP_GET_RECORD_NAME next handler

					case _STEP_WHICH_RECORD_TYPE:

						///////////////////////
						if(scopeWhichRecordTypeNext())
							return; //prevent default show prompt, do initRecordWizard

						function scopeWhichRecordTypeNext()
						{
							var newRecordAlias = document.getElementById(stepString + "recordTypes").value.trim();

							var needToInit = (_recordAlias != newRecordAlias);

							_recordAlias = newRecordAlias;
							Debug.log("_recordAlias chosen as " + _recordAlias);

							if(needToInit) initRecordWizard();
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
						_modifiedTables = undefined; //reset
						_furthestStep = -1; // reset
						_paramObjMap = {}; //reset
						_systemGroups = {}; //reset

						//remove all existing dialogs
						ConfigurationAPI.removeAllPopUps();

						if(_doneHandler) _doneHandler(_aRecordWasModified);
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
	//getApp ~~
	function getApp()
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_FE)
			retVal = "FESupervisor";
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
			retVal = "DataManagerSupervisor";
		else
			throw("?");

		return retVal;
	} //end getApp()

	//=====================================================================================
	//getAppClass ~~
	function getAppClass()
	{
		return "ots::" + getApp();
	} //end getAppClass()

	//=====================================================================================
	//getAppModule ~~
	function getAppModule()
	{
		var otsModule = "";
		if(_recordAlias == _RECORD_TYPE_FE)
			otsModule = "${OTSDAQ_LIB}/libCoreSupervisors.so";
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
			otsModule = "${OTSDAQ_LIB}/libCoreSupervisors.so";
		else
			throw("?");

		return otsModule;
	} //end getAppModule()

	//=====================================================================================
	//getAppConfiguration ~~
	function getAppConfiguration()
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_FE)
			retVal = "FESupervisorTable";
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
			retVal = "DataManagerSupervisorTable";
		else
			throw("?");

		return retVal;
	} //end getAppConfiguration()

	//=====================================================================================
	//getRecordConfiguration ~~
	function getRecordConfiguration()
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_FE)
			retVal = "FEInterfaceTable";
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
			retVal = "DataBufferTable";
		else
			throw("?");

		return retVal;
	} //end getRecordConfiguration()

	//=====================================================================================
	//getRecordGroupIDField ~~
	function getRecordGroupIDField()
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_FE)
			retVal = "FEInterfaceGroupID";
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
			retVal = "DataBufferGroupID";
		else
			throw("?");

		return retVal;
	} //end getRecordGroupIDField()


	//=====================================================================================
	//getRecordFilter ~~
	function getRecordFilter()
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_FE)
			retVal = " ";
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
			retVal = " ";//"ProcessorType=" + _recordAlias;

		if(retVal == "")
			throw("Invalid getRecordFilter");

		return retVal;
	} //end getRecordFilter()


	//=====================================================================================
	//getIntermediateTable() ~~
	//	based on _intermediateLevel and _recordAlias
	function getIntermediateTable()
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_PROCESSOR)
		{
			if(_intermediateLevel == 0)
				retVal = "DataManagerTable";
		}

		if(retVal == "")
			throw("Invalid getIntermediateTable");

		return retVal;
	} //end getIntermediateTable()

	//=====================================================================================
	//getIntermediateTypeName() ~~
	//	based on _intermediateLevel and _recordAlias
	function getIntermediateTypeName()
	{
		var retVal = "";
		if(_recordAlias == _RECORD_TYPE_PROCESSOR)
		{
			if(_intermediateLevel == 0)
				retVal = "Buffer";
		}

		if(retVal == "")
			throw("Invalid getIntermediateTypeName");

		return retVal;
	} //end getIntermediateTypeName()

	//=====================================================================================
	//getParentTable() ~~
	//	based on generationsBack and _recordAlias
	function getParentTable(generationsBack)
	{
		if(generationsBack == 0) return getRecordConfiguration();

		var retVal = "";

		if(_recordAlias == _RECORD_TYPE_FE)
		{
			if(generationsBack == 1)
				retVal = "FESupervisorTable";
			else if(generationsBack == 2)
				retVal = _XDAQAPP_BASE_PATH;
		}
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
		{
			if(generationsBack == 1)
				retVal = "DataManagerTable";
			else if(generationsBack == 2)
				retVal = "DataManagerSupervisorTable";
			else if(generationsBack == 3)
				retVal = _XDAQAPP_BASE_PATH;
		}

		if(retVal == "")
			throw("Invalid getParentTable");

		return retVal;
	} //end getParentTable()

	//=====================================================================================
	//getParentType() ~~
	//	based on generationsBack and _recordAlias
	function getParentType(generationsBack)
	{
		if(generationsBack == 0) return _recordAlias;

		var retVal = "";

		if(_recordAlias == _RECORD_TYPE_FE)
		{
			if(generationsBack == 1)
				retVal = "FESupervisorTable";
			else if(generationsBack == 2)
				retVal = "FESupervisor";
		}
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
		{
			if(generationsBack == 1)
				retVal = "Buffer";
			else if(generationsBack == 2)
				retVal = "DataManagerSupervisorTable";
			else if(generationsBack == 3)
				retVal = "DataManagerSupervisor";
		}

		if(retVal == "")
			throw("Invalid getParentType");

		return retVal;
	} //end getParentType()

	//=====================================================================================
	//getParentLinkField() ~~
	//	based on generationsBack and _recordAlias
	function getParentLinkField(generationsBack)
	{
		var retVal = "";

		if(_recordAlias == _RECORD_TYPE_FE)
		{
			if(generationsBack == 1)
				retVal = "LinkToFEInterfaceTable";
			else if(generationsBack == 2)
				retVal = "LinkToSupervisorTable";
		}
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
		{
			if(generationsBack == 1)
				retVal = "LinkToDataProcessorTable";
			else if(generationsBack == 2)
				retVal = "LinkToDataBufferTable";
			else if(generationsBack == 3)
				retVal = "LinkToSupervisorTable";
		}

		if(retVal == "")
			throw("Invalid getParentLinkField");

		return retVal;
	} //end getParentLinkField()

	//=====================================================================================
	//getParentFilter() ~~
	//	based on generationsBack and _recordAlias
	function getParentFilter(generationsBack)
	{
		var retVal = "";

		if(_recordAlias == _RECORD_TYPE_FE)
		{
			if(generationsBack == 1)
				retVal = " ";
			else if(generationsBack == 2)
				retVal = "Class=ots::FESupervisor";
		}
		else if(_recordAlias == _RECORD_TYPE_PROCESSOR)
		{
			if(generationsBack == 1)
				retVal = " ";
			else if(generationsBack == 2)
				retVal = " ";
			else if(generationsBack == 3)
				retVal = "Class=ots::DataManagerSupervisor,ots::ARTDAQDataManagerSupervisor," +
				"ots::VisualSupervisor";
		}

		if(retVal == "")
			throw("Invalid getParentFilter");

		return retVal;
	} //end getParentFilter()


}; //end RecordWiz.createWiz()
