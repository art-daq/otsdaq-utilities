//=====================================================================================
//
//	Created August, 2019
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	ARTDAQConfigurationAPI.js
//
//  Requirements: 
//   1. paste the following: 
//				
//				<script type="text/JavaScript" src="/WebPath/js/Globals.js"></script>	
//				<script type="text/JavaScript" src="/WebPath/js/Debug.js"></script>	
//				<script type="text/JavaScript" src="/WebPath/js/DesktopContent.js"></script>
//				<script type="text/JavaScript" src="/WebPath/js/js_lib/ConfiguraitonAPI.js"></script>
//				<link rel="stylesheet" type="text/css" href="/WebPath/css/ConfigurationAPI.css">
//				<script type="text/JavaScript" src="/WebPath/js/js_lib/ArtdaqConfiguraitonAPI.js"></script>
//
//		...anywhere inside the <head></head> tag of a window content html page
//
//
// Example usage: 	/WebPath/html/ConfigurationGUI_artdaq.html
//
//=====================================================================================

var ARTDAQConfigurationAPI = ARTDAQConfigurationAPI || {}; //define ARTDAQConfigurationAPI namespace

if (typeof ConfigurationAPI == 'undefined') 
	alert('ERROR: ConfigurationAPI is undefined! Must include ConfigurationAPI.js before ARTDAQConfigurationAPI.js');

//"public" function list: 
//	ARTDAQConfigurationAPI.getArtdaqNodes(responseHandler,modifiedTables)
//	ARTDAQConfigurationAPI.saveArtdaqNodes(responseHandler,modifiedTables)
//	ARTDAQConfigurationAPI.getTypeIndex(typeName)
//	ARTDAQConfigurationAPI.getTypeName(typeIndex)
//	ARTDAQConfigurationAPI.getShortTypeName(typeIndex)
//	ARTDAQConfigurationAPI.getFullTypeName(typeIndex)

//"public" helpers:

//"public" members:

//"public" constants:
ARTDAQConfigurationAPI.NODE_TYPE_READER 		= 0;
ARTDAQConfigurationAPI.NODE_TYPE_BUILDER 		= 1;
ARTDAQConfigurationAPI.NODE_TYPE_LOGGER 		= 2;
ARTDAQConfigurationAPI.NODE_TYPE_DISPATCHER 	= 3;
ARTDAQConfigurationAPI.NODE_TYPE_MONITOR 		= 4;
ARTDAQConfigurationAPI.NODE_TYPE_ROUTER 		= 5;
ARTDAQConfigurationAPI.NODE_TYPE_SUPERVISOR 	= 6;
ARTDAQConfigurationAPI.NODE_TYPES 				= ["reader","builder",
												   "logger","dispatcher","monitor","router","artdaqSupervisor"];
ARTDAQConfigurationAPI.NODE_SHORT_TYPE_NAMES 	= ["Reader","Builder",
												   "Logger","Dispatcher","Monitor","Router","ARTDAQSupervisor"];
ARTDAQConfigurationAPI.NODE_FULL_TYPE_NAMES 	= ["Board Reader","Event Builder",
												   "Data Logger","Dispatcher","Monitor","Routing Master","ARTDAQ Supervisor"];
ARTDAQConfigurationAPI.NODE_TYPE_ACRONYM 		= ["BR","EB",
												   "DL","Di","Mo","RM","AS"];
ARTDAQConfigurationAPI.NODE_TYPE_BASE_TABLE		= ["ARTDAQBoardReaderTable","ARTDAQEventBuilderTable",
												   "ARTDAQDataLoggerTable","ARTDAQDispatcherTable",
												   "ARTDAQMonitorTable","ARTDAQRoutingMasterTable","ARTDAQSupervisorTable"];
ARTDAQConfigurationAPI.DAQ_PARAMETER_TABLE		= "ARTDAQDaqParameterTable";
ARTDAQConfigurationAPI.DAQ_METRIC_TABLE			= "ARTDAQMetricTable";

ARTDAQConfigurationAPI.NULL_SUBSYSTEM			= "nullDestinationSubsystem";

//"private" function list:

//"private" constants:


//Function definitions:

//=====================================================================================
//getTypeIndex ~~
ARTDAQConfigurationAPI.getTypeIndex = function(typeName)
{
	Debug.log("getTypeIndex " + typeName);
	t = typeName == ARTDAQConfigurationAPI.NODE_TYPES[ARTDAQConfigurationAPI.NODE_TYPE_READER]			? ARTDAQConfigurationAPI.NODE_TYPE_READER:
			(typeName == ARTDAQConfigurationAPI.NODE_TYPES[ARTDAQConfigurationAPI.NODE_TYPE_BUILDER]	? ARTDAQConfigurationAPI.NODE_TYPE_BUILDER:
			(typeName == ARTDAQConfigurationAPI.NODE_TYPES[ARTDAQConfigurationAPI.NODE_TYPE_LOGGER]		? ARTDAQConfigurationAPI.NODE_TYPE_LOGGER:
			(typeName == ARTDAQConfigurationAPI.NODE_TYPES[ARTDAQConfigurationAPI.NODE_TYPE_DISPATCHER]	? ARTDAQConfigurationAPI.NODE_TYPE_DISPATCHER:
			(typeName == ARTDAQConfigurationAPI.NODE_TYPES[ARTDAQConfigurationAPI.NODE_TYPE_ROUTER]		? ARTDAQConfigurationAPI.NODE_TYPE_ROUTER:
			(typeName == ARTDAQConfigurationAPI.NODE_TYPES[ARTDAQConfigurationAPI.NODE_TYPE_SUPERVISOR]	? ARTDAQConfigurationAPI.NODE_TYPE_SUPERVISOR:
			(typeName == ARTDAQConfigurationAPI.NODE_TYPES[ARTDAQConfigurationAPI.NODE_TYPE_MONITOR]	? ARTDAQConfigurationAPI.NODE_TYPE_MONITOR:-1))))));
	
	if(t < 0)
	{	
		Debug.log("Illegal type name " + typeName + 
				". Tell admins how you got here!", Debug.HIGH_PRIORITY);
		return; 
	}
	return t;
} //end getTypeIndex()

//=====================================================================================
//getTypeName ~~
ARTDAQConfigurationAPI.getTypeName = function(typeIndex)
{
	//Debug.log("getTypeName " + typeIndex);
	
	if(ARTDAQConfigurationAPI.NODE_TYPES[typeIndex] === undefined)
	{	
		Debug.log("Illegal type index " + typeIndex + 
				". Tell admins how you got here!", Debug.HIGH_PRIORITY);
		return; 
	}
	return ARTDAQConfigurationAPI.NODE_TYPES[typeIndex];
} //end getTypeName()

//=====================================================================================
//getShortTypeName ~~
ARTDAQConfigurationAPI.getShortTypeName = function(typeIndex)
{
	//Debug.log("getShortTypeName " + typeIndex);
	
	if(ARTDAQConfigurationAPI.NODE_SHORT_TYPE_NAMES[typeIndex] === undefined)
	{	
		Debug.log("Illegal type index " + typeIndex + 
				". Tell admins how you got here!", Debug.HIGH_PRIORITY);
		return; 
	}
	return ARTDAQConfigurationAPI.NODE_SHORT_TYPE_NAMES[typeIndex];
} //end getShortTypeName()

//=====================================================================================
//getFullTypeName ~~
ARTDAQConfigurationAPI.getFullTypeName = function(typeIndex)
{
	//Debug.log("getFullTypeName " + typeIndex);
	
	if(ARTDAQConfigurationAPI.NODE_FULL_TYPE_NAMES[typeIndex] === undefined)
	{	
		Debug.log("Illegal type index " + typeIndex + 
				". Tell admins how you got here!", Debug.HIGH_PRIORITY);
		return; 
	}
	return ARTDAQConfigurationAPI.NODE_FULL_TYPE_NAMES[typeIndex];
} //end getFullTypeName()

//=====================================================================================
//getArtdaqNodes ~~
//	get currently active artdaq nodes
//
//	when complete, the responseHandler is called with an object parameter.
//		on failure, the object will be empty.
//		on success, the object of Active artdaq nodes
//		retObj := {}
//			retObj.<nodeType> = {}
//			retObj.<nodeType>.<nodeName> = {hostname,subsystemId}
//			...
//			retObj.subsystems = {}
//			retObj.subsystems.<subsystemId> = {label,sourcesCount,destination}
//
//		<nodeType> = ARTDAQConfigurationAPI.NODE_TYPES := reader, builder, aggregator, dispatcher, monitor
//
//		
ARTDAQConfigurationAPI.getArtdaqNodes = function(responseHandler,
		modifiedTables)
{	
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}
	
	//get active configuration group
	DesktopContent.XMLHttpRequest("Request?RequestType=getArtdaqNodes",
			"modifiedTables=" + modifiedTablesListStr, //end post data, 
			function(req) 
			{
		var errArr = DesktopContent.getXMLRequestErrors(req);
		var errStr = "";
		for(var i=0;i<errArr.length;++i)
		{
			errStr += (i?"\n\n":"") + errArr[i];
			Debug.log("Error: " + errArr[i], Debug.HIGH_PRIORITY);
		}
		
		responseHandler(localExtractActiveArtdaqNodes(req));
			},
			0,0,true  //reqParam, progressHandler, callHandlerOnErr
	); //end of getActiveTableGroups handler
	
	return;
	
	//=================
	function localExtractActiveArtdaqNodes(req)
	{
		Debug.log("localExtractActiveArtdaqNodes");
		
		//Example xml response:
		//		<artdaqSupervisor value='ARTDAQSupervisor'>
		//			<artdaqSupervisor-contextAddress value='http://correlator2.fnal.gov'/>
		//			<artdaqSupervisor-contextPort value='2016'/>
		//			<subsystem value='nullDestinationSubsystem'/>
		//			<subsystem-id value='0'/>
		//			<subsystem-sourcesCount value='1'/>
		//			<subsystem-destination value='0'/>
		//			<subsystem value='subsystem1'/>
		//			<subsystem-id value='2'/>
		//			<subsystem-sourcesCount value='0'/>
		//			<subsystem-destination value='3'/>
		//			<subsystem value='subsystem2'/>
		//			<subsystem-id value='3'/>
		//			<subsystem-sourcesCount value='1'/>
		//			<subsystem-destination value='0'/>
		//			<reader value='reader0'/>
		//			<reader-hostname value='localhost'/>
		//			<reader-subsystem value='2'/>
		//			<builder value='builder*'>
		//				<builder-multinode value='0'/>
		//				<builder-hostfixedwidth value='3-6'/>
		//				<builder-hostarray value='2'/>
		//			</builder>
		//			<builder value='builder1'/>
		//			<builder-hostname value='localhost'/>
		//			<builder-subsystem value='3'/>
		//			<logger value='logger0'/>
		//			<logger-hostname value='localhost'/>
		//			<logger-subsystem value='3'/>
		//			<dispatcher value='dispatcher0'/>
		//			<dispatcher-hostname value='localhost'/>
		//			<dispatcher-subsystem value='3'/>
		//		</artdaqSupervisor>
		
		//can call this at almost all API handlers
		try
		{
			var types = ARTDAQConfigurationAPI.NODE_TYPES;
			
			var i,j;
			var retObj = {};	
			

			retObj.nodeCount = 0;
			
			var artdaqSupervisor = DesktopContent.getXMLNode(
					req.responseXML,
					types[ARTDAQConfigurationAPI.NODE_TYPE_SUPERVISOR]);
			
			if(artdaqSupervisor)
			{
				//extract all nodes from the artdaq supervisor object		
				
				for(i=0;i<types.length;++i)
				{
					Debug.log("Extracting " + types[i]);
					
					retObj[types[i]] = {};
					
					if(i == ARTDAQConfigurationAPI.NODE_TYPE_SUPERVISOR)
					{
						//handle artdaq Supervisor node in a special way
						//	because field types are different
						
						//add artdaq supervisor object
						var artdaqSupervisorName = artdaqSupervisor.getAttribute('value');

						retObj[types[i]][artdaqSupervisorName] = {
								"status" : DesktopContent.getXMLValue(artdaqSupervisor, 
										types[i] + "-status") | 0, //integer 0 or 1
								"contextAddress" : DesktopContent.getXMLValue(artdaqSupervisor, 
										types[i] + "-contextAddress"),
								"contextPort" : DesktopContent.getXMLValue(artdaqSupervisor, 
										types[i] + "-contextPort"),
						};
						continue;
					}
					
					var nodes = artdaqSupervisor.getElementsByTagName(
							types[i]);
					var statuses = artdaqSupervisor.getElementsByTagName(
							types[i] + "-status");
					var hostnames = artdaqSupervisor.getElementsByTagName(
							types[i] + "-hostname");
					var subsystemIds = artdaqSupervisor.getElementsByTagName(
							types[i] + "-subsystem");
	
	
					for(j=0;j<nodes.length;++j)
					{
						var multiNodeString = nodes[j].getElementsByTagName(types[i] + "-multinode");
						var nodeFixedWidth = nodes[j].getElementsByTagName(types[i] + "-nodefixedwidth");
						var hostArrayString = nodes[j].getElementsByTagName(types[i] + "-hostarray");
						var hostFixedWidth = nodes[j].getElementsByTagName(types[i] + "-hostfixedwidth");
						
						console.log("parameters",multiNodeString,
								nodeFixedWidth,hostArrayString,hostFixedWidth);
						
						var nodeName = nodes[j].getAttribute('value');
						retObj[types[i]][nodeName] = 
							{
								"status": 		statuses[j].getAttribute('value') | 0, //integer 0 or 1
								"hostname": 	decodeURIComponent(hostnames[j].getAttribute('value')),
								"subsystemId": 	subsystemIds[j].getAttribute('value') | 0, //integer
							};
							
						if(multiNodeString.length)
							retObj[types[i]][nodeName].multiNodeString = multiNodeString[0].getAttribute('value');


						if(nodeFixedWidth.length)
							retObj[types[i]][nodeName].nodeFixedWidth = nodeFixedWidth[0].getAttribute('value') | 0;
							

						if(hostArrayString.length)
							retObj[types[i]][nodeName].hostArrayString = hostArrayString[0].getAttribute('value');
							

						if(hostFixedWidth.length)
							retObj[types[i]][nodeName].hostFixedWidth = hostFixedWidth[0].getAttribute('value') | 0;
							
					}
					
					Debug.log("Extracted " + 
							nodes.length + " " +
							types[i]);
					
					retObj.nodeCount += nodes.length;
					
				} //end type extraction loop
				
				//extract all subsystems
				retObj.subsystems = {};
				var subsystems = artdaqSupervisor.getElementsByTagName("subsystem");
				var subsystemIds = artdaqSupervisor.getElementsByTagName(
						"subsystem" + "-id");
				var subsystemSourcesCount = artdaqSupervisor.getElementsByTagName(
						"subsystem" + "-sourcesCount");
				var subsystemDestination = artdaqSupervisor.getElementsByTagName(
						"subsystem" + "-destination");

				for(j=0;j<subsystems.length;++j)
				{				
					retObj.subsystems[subsystemIds[j].getAttribute('value') | 0 /*integer*/] = 
						{
							"label":			subsystems[j].getAttribute('value'),
							"sourcesCount":		subsystemSourcesCount[j].getAttribute('value'),
							"destinationId":	(subsystemDestination[j].getAttribute('value') | 0) /*integer*/,
						};
				}
				
				
			} //end artdaq Supervisor extraction
			else
				Debug.log("No artdaq Supervisor found (or there were more than one conflicting). You can manually setup one artdaq Supervisor in the Configuration Tree, " +
						"or it will be created for you the first time you save your artdaq node configuration.", Debug.WARN_PRIORITY);
			
			Debug.log("Total nodes extracted " +
					retObj.nodeCount);
			
			if(retObj.nodeCount == 0)
				Debug.log("Successful node extraction, but no artdaq nodes found!", Debug.WARN_PRIORITY);
			
		}
		catch(e)
		{
			Debug.log("Error extracting active artdaq nodes: " + e, Debug.HIGH_PRIORITY);
			return undefined;
		}

		return retObj;
	} // end localExtractActiveArtdaqNodes()
	
} // end getArtdaqNodes()

//====================================================================================
//saveArtdaqNodes ~~
//	save artdaq nodes and subsystems to active groups (with modified tables)
//		nodeObj := {}
//			nodeObj.<nodeType> = {}
//			nodeObj.<nodeType>.<nodeName> = 
//				{originalName,status,hostname,subsystemName,
//				(nodeArrString),(hostnameArrString),(nodeNameFixedWidth),(hostnameFixedWidth)}
//
// <nodeType> = ARTDAQConfigurationAPI.NODE_TYPES := reader, builder, aggregator, dispatcher, monitor
//
//		subsystemObj = {}
//			subsystemObj.<subsystemName> = {destinationName}
//
ARTDAQConfigurationAPI.saveArtdaqNodes = function(nodesObject, subsystemsObject, responseHandler,
		modifiedTables)
{	
	console.log("nodesObject",nodesObject);
	console.log("subsystemsObject",subsystemsObject);
	
	var modifiedTablesListStr = "";
	for(var i=0;modifiedTables && i<modifiedTables.length;++i)
	{
		if(i) modifiedTablesListStr += ",";
		modifiedTablesListStr += modifiedTables[i].tableName + "," +
				modifiedTables[i].tableVersion;
	}
	
	var nodeString = "";
	var subsystemString = "";
	
	for(var i in nodesObject)
	{
		if(i == ARTDAQConfigurationAPI.NODE_TYPES[ARTDAQConfigurationAPI.NODE_TYPE_SUPERVISOR])
			continue; //skip supervisor type.. it is handled automatically
		
		nodeString += encodeURIComponent(i) + ":";
		for(var j in nodesObject[i])
		{
			nodeString += encodeURIComponent(j) + "=";
			
			//map undefined to "" so it is not confused with an actual record UID
			nodeString += encodeURIComponent(nodesObject[i][j].originalName === undefined?"":nodesObject[i][j].originalName) + ",";

			nodeString += (nodesObject[i][j].status?1:0) + ",";
			nodeString += encodeURIComponent(nodesObject[i][j].hostname) + ",";
			nodeString += encodeURIComponent(nodesObject[i][j].subsystemName) + "";

			//now optional node parameters
			if(nodesObject[i][j].nodeArrString)
				nodeString += "," + encodeURIComponent(nodesObject[i][j].nodeArrString);
			if(nodesObject[i][j].nodeNameFixedWidth)
				nodeString += "," + encodeURIComponent("nnfw," + nodesObject[i][j].nodeNameFixedWidth);
			if(nodesObject[i][j].hostnameArrString)
				nodeString += "," + encodeURIComponent(nodesObject[i][j].hostnameArrString);
			if(nodesObject[i][j].hostnameFixedWidth)
				nodeString += "," + encodeURIComponent("hnfw," + nodesObject[i][j].hostnameFixedWidth);
			
			nodeString += ";"; //end node
		}
		nodeString += "|"; //end artdaq type		
	}
	for(var i in subsystemsObject)
	{
		subsystemString += encodeURIComponent(i) + ":";
		subsystemString += encodeURIComponent(subsystemsObject[i].destinationName);
		subsystemString += ";"; //end subsystem 	
	}
	
	console.log("nodeString",nodeString);
	console.log("subsystemStr",subsystemString);

	//save nodes and subsystems to server
	DesktopContent.XMLHttpRequest("Request?RequestType=saveArtdaqNodes",			
			"modifiedTables=" + modifiedTablesListStr + 
			"&nodeString=" + nodeString +
			"&subsystemString=" + subsystemString, //end post data, 
			function(req) 
			{
		console.log("response",req);
		
		var errArr = DesktopContent.getXMLRequestErrors(req);
		var errStr = "";
		for(var i=0;i<errArr.length;++i)
		{
			errStr += (i?"\n\n":"") + errArr[i];
			Debug.log("Error: " + errArr[i], Debug.HIGH_PRIORITY);
		}
		
		if(errArr.length) return; // do not proceed on error
		//else call response handler
		responseHandler(req);
		
			},
			0,0,true  //reqParam, progressHandler, callHandlerOnErr
	); //end of getActiveTableGroups handler

	return;
	
} // end saveArtdaqNodes()



















