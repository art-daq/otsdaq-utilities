/*===============================================================================*
 * HistogramViewer.js: the javascript code to instantiate a root objects         *
 *                     navigator in the otsdaq framework                         *
 *                                                                               *
 * Copyright (C) 2019                                                            *
 *                                                                               *
 * Authors: Dario Menasce                                                        *
 *                                                                               *
 * INFN: Piazza della Scienza 3, Edificio U2, Milano, Italy 20126                *
 *                                                                               *
 * This program is free software: you can redistribute it and/or modify          *
 * it under the terms of the GNU General Public License as published by          *
 * the Free Software Foundation, either version 3 of the License, or             *
 * (at your option) any later version.                                           *
 *                                                                               *
 * This program is distributed in the hope that it will be useful,               *
 * but WITHOUT ANY WARRANTY; without even the implied warranty of                *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the                 *
 * GNU General Public License for more details.                                  *
 *                                                                               *
 * You should have received a copy of the GNU General Public License             *
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.         *
 ================================================================================*/

//----------------------------- Pre requisites --------------------------------
Ext.require(
			[
			 'Ext.tab.*'    ,
			 'Ext.window.*' ,
			 'Ext.tip.*'    ,
			 'Ext.ux.*',
			 'Ext.layout.container.Border'
			]
	   );

//------------------------- General utility function ---------------------------
// Retrieves the local URN number
var getLocalURN = function(index,name)
{
 var params = (window.location.search.substr(1)).split('&');
 var splitted, vs;
 if(name)
 {
  for(index=0;index<params.length;++index)
  {
   splitted = params[index].indexOf('=');
   if(splitted < 0) continue;
   vs = [params[index].substr(0,splitted),params[index].substr(splitted+1)];
   if(decodeURIComponent(vs[0]) == name) return decodeURIComponent(vs[1]);
  }
  return;
 }

 if(index >= params.length) return;

 splitted = params[index].indexOf('=');
 if(splitted < 0) return;
 vs = [params[index].substr(0,splitted),params[index].substr(splitted+1)];
 return decodeURIComponent(vs[1]);
}

//------------------------- General utility function ---------------------------
// Creates the different <div> placeholders for the main components of the page
function generateDIVPlaceholder(id,top,left)
{
 var div = document.createElement("div");
 div.id             = id ;
 div.style.position = "absolute";
 div.style.top      = top  + "px";
 div.style.left     = left + "px";

 document.getElementsByTagName("BODY")[0].appendChild(div);
}
//------------------------------------------------------------------------------
function generateDIVPlaceholderUnder(id,idUnder,top,left,width,height)
{
 var div = document.createElement("div");
 div.id             = id ;
 div.style.position = "absolute";
 div.style.top      = top    + "px";
 div.style.left     = left   + "px";
 div.style.width    = width  + "px";
 div.style.height   = height + "px";

 document.getElementById(idUnder).appendChild(div);
}
//-----------------------------------------------------------------------------
// Reposition the div signed by id to top/left positions
// If either top or left is blank, it is ginred in the movement
function repositionDiv(id,top,left)
{
 var div = document.getElementById(id);
 if( top  != "" ) div.style.top  = top  + "px";
 if( left != "" ) div.style.left = left + "px";
}
//==============================================================================
Ext.onReady(function()
{
  function xmlKeysPrintout(fromWhere)
  {
	   const e = new Error();
	   const a = e.stack.split("\n")[1] ;
	   const w = a.split("/") ;
	   const s = w.length -1 ;
	   const l = w[s].split(":")[1] ;
	   STDLINE("----------- Line: " + l + "-----------")  ;
	   STDLINE("From: '"+fromWhere+"'"                 )  ;
	   STDLINE("   --> fSystemPath_  : "+fSystemPath_  )  ;
	   STDLINE("   --> fRootPath_    : "+fRootPath_    )  ;
	   STDLINE("   --> fFoldersPath_ : "+fFoldersPath_ )  ;
	   STDLINE("   --> fFileName_    : "+fFileName_    )  ;
	   STDLINE("   --> fRFoldersPath_: "+fRFoldersPath_)  ;
	   STDLINE("   --> fHistName_    : "+fHistName_    )  ;
	   STDLINE("--------------------------------------")  ;
  }

 var currentDirectory_  = ""                                                                        ;
 var currentRootObject_ = ""                                                                        ;
 var currentTree_       = ""                                                                        ;
 var grid_              = ""                                                                        ;
 var selectedItem_      = "getDirectories";                                                         ;
 var theStore_          = ""                                                                        ;
 var theCanvas_         = ""                                                                        ;
 var fSystemPath_       = ""                                                                        ;
 var fRootPath_         = ""                                                                        ;
 var fFoldersPath_      = ""                                                                        ;
 var fFileName_         = ""                                                                        ;
 var fHistName_         = ""                                                                        ;
 var fRFoldersPath_     = ""                                                                        ;
 var theSources_        = ""                                                                        ;
 var theControls_       = ""                                                                        ;
 var thetheSourcesCB__  = ""                                                                        ;
 var dataModel_         = ""                                                                        ;
 var displayPlot_       = ""                                                                        ;
 var periodicPlotID_    = ""                                                                        ;
 var mdi_               = ""                                                                        ;
 var treeDisplayField_  = "fDisplayName"                                                            ;
 var doReset_           = true                                                                      ;
 var _cookieCodeMailbox = 0; //RAR must get from desktop messages now to survive cross-origin browser restrictions//self.parent.document.getElementById("DesktopContent-cookieCodeMailbox") ;
 var _cookieCode        = 0; //RAR must get from desktop messages now to survive cross-origin browser restrictions //_cookieCodeMailbox.innerHTML                                            ;
 var _theWindow         = self                                                                    ;

 //NOTE: RAR must get _requestURL from desktop messages now to survive cross-origin browser restrictions
 var _requestURL        = self.parent.window.location.origin                                     +
						  "/urn:xdaq-application:lid="                                           +
						  getLocalURN(0,"urn")                                                   +
						  "/Request?"                                                             ;
 var viewportW          = window.innerWidth                                                       ;
 var viewportH          = window.innerHeight                                                      ;

 var topMargin_         = 28
 var bottomMargin_      = 5                                                                         ;
 var decorationH        = 0                                                                         ;
 var sourceT            = 0                                                                         ;
 var sourceL            = 0                                                                         ;
 var sourceW            = 200                                                                       ;
 var sourceH            = 25                                                                        ;
 var navigatorT         = topMargin_                                                                ;
 var navigatorL         =   0                                                                       ;
 var navigatorW         = 200                                                                       ;
 var navigatorH         = viewportH  - (topMargin_ + bottomMargin_) - decorationH                   ;
 var controlsT          = 460               ;
 var controlsL          = navigatorW + 5                                                            ;
 var controlsW          = viewportW  - navigatorW - 20                                              ;
 var controlsH          = 80                                                                        ;
 var canvasT            = navigatorT                                                                ;
 var canvasL            = navigatorW + 5                                                            ;
 var canvasW            = viewportW  - navigatorW - 20                                              ;
 var canvasH            = viewportH  - (topMargin_ + bottomMargin_) - decorationH - controlsH       ;
 var canvasPos_         = 0                                                                         ;
 var gridDivision_      = "grid1x1"                                                                 ;
 var timeoutInterval_   = 0                                                                         ;
 var activeObjects_     = []                                                                        ;
 var backButton         = ""                                                                        ;

 generateDIVPlaceholder     ("sourceDiv"                   , 0         , 0                        ) ;
 generateDIVPlaceholder     ("navigatorDiv"                , navigatorT, navigatorL               ) ;
 generateDIVPlaceholder     ("histogramDiv"                , topMargin_, navigatorW + 5           ) ;
 generateDIVPlaceholderUnder("histogram1"  , "histogramDiv", 0         , 0              , 400, 400) ;
 generateDIVPlaceholder     ("controlsDiv"                 , controlsT , controlsL                ) ;

 //-----------------------------------------------------------------------------
 function STDLINE(str)
 {
   const e = new Error()            ;
   const a = e.stack.split("\n")[1] ;
   const w = a.split("/")           ;
   const s = w.length -1            ;
   const l = w[s].split(":")[1]     ;
   const n = w[s].split(":")[0]     ;
   const m = l+"] ["+n+"] "+str     ;
   console.log(m)                   ;
 }
 //-----------------------------------------------------------------------------
 getXMLValue          = function(req, name)
						{
						 if(!name) return req.getAttribute("value");
						 return getXMLAttributeValue(req,name,"value");
						}

 //-----------------------------------------------------------------------------
 getXMLAttributeValue = function(req, name, attribute)
						{
						 var el;
						 if(el = getXMLNode(req,name)) return el.getAttribute(attribute);
						 else if((name == "Error" )&& (!req || !req.responseXML))
						  return "Unknown error occured "               +
								 "(XML response may have been illegal)!";
						 else
						  return undefined;
						}

 //-----------------------------------------------------------------------------
 getXMLNode           = function(req, name)
						{
						 var els;
						 if(req && req.responseXML)
								 req = req.responseXML;
						 if(req)
						 {
						  var i;
						  els = req.getElementsByTagName(name);
						  if(els.length) return els[0];
						 }

						 return undefined;
						}

 //-----------------------------------------------------------------------------
 getXMLNodes          = function(req, name)
						{
						 var els;
						 if(req && req.responseXML)
								 req = req.responseXML;
						 if(req)
						 {
						  return req.getElementsByTagName(name);
						 }

						 return undefined;
						}

 //-----------------------------------------------------------------------------
 dataModel_ = Ext.define(
						 'DirectoriesDataModel',
						 {
						  extend: 'Ext.data.Model',
						  fields: [
								   {name: 'nChilds'      , type: 'int'   , convert: null},
								   {name: 'fSystemPath'  , type: 'string', convert: null},
								   {name: 'fRootPath'    , type: 'string', convert: null},
								   {name: 'fFoldersPath' , type: 'string', convert: null},
								   {name: 'fFileName'    , type: 'string', convert: null},
								   {name: 'fHistName'    , type: 'string', convert: null},
								   {name: 'fRFoldersPath', type: 'string', convert: null},
								   {name: 'fDisplayName' , type: 'string', convert: null}
								  ]
						 }
						);
 //-----------------------------------------------------------------------------
 // This panel represents the canvas to contain ROOT objects
 theCanvas_ = Ext.create(
						 'Ext.panel.Panel',
						 {
						  renderTo  : 'histogramDiv',
						  fullscreen: true          ,
						  height    : canvasH       ,
						  width     : canvasW       ,
						  draggable : false         ,
						  defaults  : {
									   styleHtmlContent: true
									  },
						  items     : [
									   {
										style : 'background-color: #5E99CC'                              ,
										id    : 'histogram1'                                             ,
										itemId: 'canvas'                                                 ,
									   //html  : '<p><p><center><h1>Canvas to display plots</h1></center>',
										height: 1                                                        ,
										width : 1
									   }
									  ]
						 }
						).setPosition(0,0) ;

//-----------------------------------------------------------------------------
 function createSources(dirs)
 {
  theSources_ = Ext.create  (
							 'Ext.data.Store',
							 {
							  fields: ['abbr', 'dir'],
							  data  : dirs
							 }
							);
  theSourcesCB_ = Ext.create(
							 'Ext.form.ComboBox',
							 {
							  id          : 'source'   ,
							  fieldLabel  : 'Source:'  ,
							  labelWidth  : 45         ,
							  height      : sourceH    ,
							  width       : sourceW    ,
							  store       : theSources_,
							  queryMode   : 'local'    ,
							  displayField: 'dir'      ,
							  valueField  : 'abbr'     ,
							  renderTo    : 'sourceDiv',
							  listeners   : {
											 select    : function(thisCombo, record, eOpts)
														 {
														  fRootPath_        = record.data.dir            ;
														  STDLINE("fRootPath_: "+fRootPath_)             ;
														  makeStore(fRootPath_, 'RequestType=getMeDirs') ;
														  makeGrid (fRootPath_, 'Directories and files') ;
														 },
											 focusleave: function (thisCombo)
														 {
														  STDLINE('remove  selection listener') ;
														  thisCombo.suspendEvent('select')      ;
														  STDLINE('removed selection listener') ;
														 },
											 focusenter: function (thisCombo)
														 {
														  STDLINE('reinstate  selection listener') ;
														  thisCombo.resumeEvent('select')          ;
														  STDLINE('reinstated selection listener') ;
														 }
											}
							 }
							).setPosition(sourceT,sourceL);
  theSourcesCB_.setRawValue(dirs[0].dir) ; // Set default value
 }

 //-----------------------------------------------------------------------------
 var resetCanvasB = Ext.create (
								'Ext.Button',
								{
								 cls     : 'controlButtons',
								 text    : 'Reset'         ,
								 renderTo: 'controlsDiv'   ,
								 margin  : 2               ,
								 border  : 1               ,
								 style   : {
											borderColor: 'blue',
											borderStyle: 'solid'
										   },
								 handler : function()
										   {
											JSROOT.cleanup('histogram1');
											mdi_ = new JSROOT.GridDisplay('histogram1', gridDivision_); // gridi2x2
											activeObjects_ = [] ;
										   }
								}
							   );
 var clearCanvasB = Ext.create (
								'Ext.Button',
								{
								 text    : 'Clear'         ,
								 renderTo: 'controlsDiv'   ,
								 margin  : 2               ,
								 border  : 1               ,
								 style   : {
											borderColor: 'blue',
											borderStyle: 'solid'
										   },
								 handler : function()
										   {
											//theCanvas_.items.item[0].initialConfig.html = 'Display cleared' ;
											//theCanvas_.update() ;
											clearInterval(periodicPlotID_) ;
											JSROOT.cleanup('histogram1');
											mdi_ = new JSROOT.GridDisplay('histogram1', gridDivision_); // gridi2x2
											activeObjects_ = [] ;
										  }
								}
							   );
 var freezeCanvasB = Ext.create(
								'Ext.Button',
								{
								 text    : 'Freeze'        ,
								 renderTo: 'controlsDiv'   ,
								 margin  : 2               ,
								 border  : 1               ,
								 style   : {
											borderColor: 'blue',
											borderStyle: 'solid'
										   },
								 handler : function()
										   {
											clearInterval(periodicPlotID_) ;
										   }
								}
							   );
 timeoutInterval_ = Ext.create (
								'Ext.form.field.Number',
								{
								 name         : 'timeout'         ,
								 width        : 160               ,
								 height       : 10                ,
								 fieldLabel   : 'Refresh interval',
								 step         : 1                 ,
								 value        : 5.0               ,
								 minValue     : 5.0               ,
								 maxValue     : 60                ,
								 allowDecimals: true
								}
							   ) ;
 zonX_ = Ext.create            (
								'Ext.form.field.Number',
								{
								 name         : 'zonX'            ,
								 width        : 40                ,
								 height       : 10                ,
								 step         : 1                 ,
								 value        : 1                 ,
								 minValue     : 1                 ,
								 maxValue     : 10                ,
								 allowDecimals: false             ,
								 listeners    : {
												 spinend: function(thisSpin, eOpts)
														  {
														   gridDivision_ = "grid" + thisSpin.value + "x" + zonY_.value ;
														   JSROOT.cleanup('histogram1');
														   mdi_ = new JSROOT.GridDisplay('histogram1', gridDivision_); // gridi2x2
														   STDLINE("gridDivision_: " +gridDivision_) ;
														  }
												}
								}
							   ) ;
 zonY_ = Ext.create            (
								'Ext.form.field.Number',
								{
								 name         : 'zonY'            ,
								 width        : 40                ,
								 height       : 10                ,
								 step         : 1                 ,
								 value        : 1                 ,
								 minValue     : 1                 ,
								 maxValue     : 10                ,
								 allowDecimals: false             ,
								 listeners    : {
												 spinend: function( thisSpin, eOpt)
														  {
														   gridDivision_ = "grid" + zonX_.value + "x" + thisSpin.value ;
														   JSROOT.cleanup('histogram1');
														   mdi_ = new JSROOT.GridDisplay('histogram1', gridDivision_); // gridi2x2
														   STDLINE("gridDivision_: " +gridDivision_) ;
														  }
												}
								}
							   ) ;
 theControls_ = Ext.create     (
								'Ext.panel.Panel',
								{
								 title    : 'Canvas controls'     ,
								 width    : controlsW             ,
								 height   : controlsH             ,
								 renderTo : 'controlsDiv'         ,
								 draggable: true                  ,
								 layout   : 'hbox'           ,
								 items    : [
											 resetCanvasB         ,
											 clearCanvasB         ,
											 freezeCanvasB        ,
											 zonX_                ,
											 zonY_                ,
											 timeoutInterval_
											]
								}
							   ).setPosition(0,0);
 //-----------------------------------------------------------------------------
 function makeGrid(where,what)
 {
  if( grid_ ) grid_.destroy()     ;
  theStore_.sort(treeDisplayField_, 'ASC');

  //mdi_ = new JSROOT.GridDisplay('histogram1', gridDivision_); // gridi2x2

  grid_ = Ext.create(
					 'Ext.tree.Panel',
					 {
					  title      : what          ,
					  id         : 'navigator'   ,
					  store      : theStore_     ,
					  draggable  : true          ,
					  resizable  : true          ,
					  border     : true          ,
					  renderTo   : "navigatorDiv",
					  rootVisible: false         ,
					  useArrows  : true          ,
					  width      : navigatorW    ,
					  height     : navigatorH    ,
					  selModel   : {
									mode : 'MULTI' // SIMPLE or MULTI
								   },
					  plugins    : [
									{
									 ptype: 'bufferedrenderer'
									}
								   ],
					  buttons    : [
									//backButton
									{
									  xtype    : 'button'             ,
									  text     : '<<'                 ,
									  margin   : 2                    ,
									  style    : {
												  borderColor: 'blue' ,
												  borderStyle: 'solid'
												 }                    ,
									  minWidth : 10                   ,
									  height   : 25                   ,
									  width    : 30                   ,
									  listeners: {
												  click: function()
														 {
														  if( currentTree_ = 'fileContent' )
														  {
														   selectedItem_ = "getDirectories"               ;
														   makeStore(fRootPath_, 'RequestType=getMeDirs') ;
														   makeGrid (fRootPath_, 'Directories and files') ;
														  }
														 }
												 }
									}
								   ],
					  columns    : [
									{
									 xtype    : 'treecolumn'    ,
									 id       : 'provenance'    ,
									 text     : where           ,
									 flex     : 1               ,
									 dataIndex: 'fDisplayName'
									},
									{
									 xtype    : 'treecolumn'    ,
									 hidden   : false           ,
									 text     : 'type'          ,
									 width    : 1               ,
									 dataIndex: 'leaf'
									},
									{
									 xtype    : 'treecolumn'    ,
									 hidden   : false           ,
									 text     : 'fSystemPath'   ,
									 width    : 1               ,
									 dataIndex: 'fSystemPath'
									},
									{
									 xtype    : 'treecolumn'    ,
									 hidden   : false           ,
									 text     : 'fRootPath'     ,
									 width    : 1               ,
									 dataIndex: 'fRootPath'
									},
									{
									 xtype    : 'treecolumn'    ,
									 hidden   : false           ,
									 text     : 'fFoldersPath'  ,
									 width    : 1               ,
									 dataIndex: 'fFoldersPath'
									},
									{
									  xtype    : 'treecolumn'   ,
									  hidden   : false          ,
									  text     : 'fFileName'    ,
									  width    : 1              ,
									  dataIndex: 'fFileName'
									 },
									 {
									  xtype    : 'treecolumn'   ,
									  hidden   : false          ,
									  text     : 'fRFoldersPath',
									  width    : 1              ,
									  dataIndex: 'fRFoldersPath'
									 },
									{
									  xtype    : 'treecolumn'  ,
									  hidden   : false         ,
									  text     : 'fHistName'   ,
									  width    : 1             ,
									  dataIndex: 'fHistName'
									 }
								   ],
					  listeners  : {
									expand    : function(expandedItem, options)  // for some reason doesn't trigegr
												{
												 STDLINE("expanded") ;
												},
									itemclick : function(thisItem, record, item, index, e, eOpts)
												{
												 var selection = this.getSelection()                                ;
												 STDLINE("Selected "+selection.length+" items")                     ;
												 for(var i=0; i<selection.length; i++)
												 {
												  fSystemPath_   = selection[i].data.fSystemPath                    ;
												  fRootPath_     = selection[i].data.fRootPath                      ;
												  fFoldersPath_  = selection[i].data.fFoldersPath                   ;
												  fFileName_     = selection[i].data.fFileName                      ;
												  fRFoldersPath_ = selection[i].data.fRFoldersPath                  ;
												  fHistName_     = selection[i].data.fHistName                      ;
												  if( typeof fFoldersPath_  === "undefined" ) fFoldersPath_  = ""   ;
												  if( typeof fRFoldersPath_ === "undefined" ) fRFoldersPath_ = ""   ;
												  xmlKeysPrintout("Clicked on a tree item")
												}
												 STDLINE("Selected "+selection.length+" items")                     ;
												 //clearInterval(periodicPlotID_)                                   ;
												 var itemSplit     = item.innerText.split("\n\t\n")                 ;
												 var isLeaf        = itemSplit[1].replace("\n","").replace("\t","") ;
												 if( isLeaf == "true" )
												 {
												  if( selectedItem_ == "getDirectories" )
												  {
												   treeDisplayField_  = 'fDisplayName'                              ;
												   selectedItem_      = "getRootObject"                             ;
												   currentTree_       = 'fileContent'                               ;
												   currentDirectory_ = fSystemPath_                                +
																	   '/'                                         +
																	   fRootPath_                                  +
																	   "/"                                         +
																	   fFoldersPath_                               +
																	   "/"                                         +
																	   fFileName_                                   ;
												   STDLINE('RequestType      : getMeRootFile'     )                 ;
												   xmlKeysPrintout("Getting directories in particular")
												   STDLINE('currentDirectory_: '+currentDirectory_)                 ;
												   makeStore(currentDirectory_,'RequestType=getMeRootFile')         ;
												   makeGrid (currentDirectory_,'ROOT file content'        )         ;
												  }
												  else if( selectedItem_ == "getRootObject" )
												  {
												   xmlKeysPrintout("Getting object (getRootObject)")
												   currentRootObject_  = "/"                                       +
																		 fRootPath_                                +
																		 "/"                                       +
																		 fFoldersPath_                             +
																		 fFileName_                                +
																		 "/"                                       +
																		 fRFoldersPath_                            +
																		 "/"                                       +
																		 fHistName_  ;
												   STDLINE('RequestType       : getRootObject'      )               ;
												   STDLINE('currentRootObject_: '+currentRootObject_)               ;
												   theAjaxRequest(
																  _requestURL+"RequestType=getRoot",
																  {
																   CookieCode: _cookieCode,
																   RootPath  : currentRootObject_
																  },
																  ""
																 )
												   var tOut = Math.round(timeoutInterval_.getValue() * 1000);
												//    periodicPlotID_ = setInterval(
												//                                  function()
												//                                  {
												//                                   STDLINE("Launching Ajax Request with refresh time: "+tOut) ;
												//                                   theAjaxRequest(
												//                                                  _requestURL+"RequestType=getRoot",
												//                                                  {
												//                                                   CookieCode: _cookieCode,
												//                                                   RootPath  : currentRootObject_
												//                                                  },
												//                                                  ""
												//                                                 )
												//                                  },
												//                                  tOut
												//                                 )
												  }
												 }
												},
									headerclick: function(ct, column, e, t, eOpts)
												 {
												  var a = column ;
												  STDLINE("header clicked") ;
												 }
								   }
					 }
					).setPosition(0,0);

  var objectProvenance = Ext.create(
									'Ext.tip.ToolTip',
									{
									 target: 'provenance',
									 html  : 'Object provenance: ' + where
									}
								   );
 }
 //-----------------------------------------------------------------------------
 function makeStore(path, reqType)
 {
  xmlKeysPrintout("Sending parameters block to server")
  theStore_ = Ext.create(
						 'Ext.data.TreeStore',
						 {
						  model    : 'DirectoriesDataModel',
						  id       : 'theStore',
						  autoLoad : false,
						  root     : {
									  expanded     : true
									 },
						  proxy    : {
									  type         : 'ajax',
									  actionMethods: {
													  read          : 'POST'
													 },
									  extraParams  : {
													  "CookieCode"  : _cookieCode   ,
													  "Path"        : path          , // used by Ryan's part
													  "fRootPath"   : fRootPath_    ,
													  "fFoldersPath": fFoldersPath_ ,
													  "fHistName"   : fHistName_    ,
													  "fFileName"   : fFileName_
													 },
									  url          : _requestURL + reqType,
									  reader       : {
													  type          : 'xml',
													  root          : 'nodes',
													  record        : '> node'
													 },
									 },
						  listeners: {
									  beforeload : function(thisStore, operation, eOpts)
												   {
													STDLINE("Request: "+_requestURL + reqType) ;
												   },
									  load       : function( thisStore, records, successful, operation, node, eOpts )
												   {
													STDLINE("Load was succesful? "+successful) ;
												   }

									 }
						 }
						);
  theStore_.load() ;
 }

 //-----------------------------------------------------------------------------
 // This function serves two different purposes:
 // 1 - retrieve the heads of the filesystem directories where ROOT files reside
 // 2 - retrieve a specific ROOT file object to display on an Extjs canvas

 function theAjaxRequest(theRequestURL,theParams,theRawData)
 {
  var today = new Date();
  var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
  STDLINE("Ajax request issued to "+theRequestURL+ " at " + time) ;
  Ext.Ajax.request(
				   {
					url    : theRequestURL,
					method : 'POST'       ,
					headers: {
							  'Content-Type': 'text/plain;charset=UTF-8'
							 }            ,
					params : theParams    ,
					rawData: theRawData   ,
					timeout: 50000        ,
					success: function(response, request)
							 {
							  STDLINE("Successful") ;
							  if(getXMLValue(response,"headOfSearch") == 'located') // Returns the list of available fRooPaths
							  { // Get list of head-points
								var dirs     = [] ;
							   var theNodes = getXMLNodes(response,'dir') ;
							   for(var i=0; i<theNodes.length; ++i)
							   {
								var theDir = theNodes[i].getAttribute("value")
								STDLINE("Adding "+theDir+" to the list of enty points") ;
								dirs.push({"abbr":  theDir, "dir": theDir}) ;
							   }

							   createSources(dirs) ;
							   var a = 0 ;
							  }
							  else if(!(typeof getXMLValue(response,"rootType") == 'undefined')) // Returns the plot to display
							  { // get specific ROOT Object and display
							   canvasPos_++ ;
						//        if( periodicPlotID_ != "" )
						//        {
						//         clearInterval(periodicPlotID_) ;
						//         periodicPlotID_ = "" ;
						//         doReset_ = true ;
						//        }
							   var rootName  = getXMLValue (response,"path"    );
							   var rootJSON  = getXMLValue (response,"rootJSON");
							   var object    = JSROOT.parse(rootJSON           );
							   STDLINE("Launchin displayPlot: "+object         );
							   activeObjects_.push(object) ;
							   displayPlot_() ; // This is to get an immediate response
								//                              JSROOT.RegisterForResize(theFrame);
						//        if( object._typename != "TCanvas")
						//        {
						//         periodicPlotID_ = setInterval(
						//                                       function()
						//                                       {
						//                                        displayPlot_(object) ; // This is delayed
						//                                       },
						//                                       2000
						//                                      ) ;
						//         }
							  }
							 },
					failure: function(response, options)
							 {
							  var a = response ;
							  Ext.MessageBox.alert(
												   'Something went wrong:',
												   'Response: ' + response.responseText
												  );
							 }
				   }
		   );
 } ;
 //-----------------------------------------------------------------------------
 displayPlot_ = function()
				{
				 STDLINE("gridDivision_: "+gridDivision_) ;
				 if( gridDivision_ == "grid1x1")
				 {
				  JSROOT.cleanup('histogram1');
				  mdi_ = new JSROOT.GridDisplay('histogram1', gridDivision_); // gridi2x2
				  STDLINE("cleared...") ;
				 }

				 for(var i=0; i<activeObjects_.length; i++)
				 {
				  var index = canvasPos_ % mdi_.NumGridFrames() ;
				  if( index > mdi_.NumGridFrames()) {index = 0}
				  var pos = "item" + index ;

				  if (mdi_!=null) theFrame = mdi_.FindFrame(pos, true);
				  STDLINE("Item: " + i ) ;
				  var rootTitle = activeObjects_[i].fTitle     ;
				  if( doReset_ )
				  {
				   STDLINE("-------> Resetting " + rootTitle);
				   JSROOT.redraw (
								  theFrame         ,
								  activeObjects_[i],
								  ""
								 );
				   doReset_ = false ;
				  }
				  else
				  {
				   STDLINE("-------> Updating " + rootTitle) ;
				   JSROOT.redraw (
								theFrame         ,
								activeObjects_[i],
								""
							   );
				  }
				 }
				}
 //-----------------------------------------------------------------------------
 self.onresize = function()
				 {
				  var w = window.innerWidth;
				  var h = window.innerHeight;
				  theCanvas_.setSize(w,h) ;
				  theCanvas_.width                 = w - navigatorW - 20 ;
				  theCanvas_.height                = h - (topMargin_ + bottomMargin_) - decorationH - controlsH ;
				  theCanvas_.items.items[0].width  = theCanvas_.width  ;
				  theCanvas_.items.items[0].height = theCanvas_.height ;
				  repositionDiv(
								"controlsDiv",
								theCanvas_.height + topMargin_,
								"" // No horizontal repositioning
							   ) ;
				  theCanvas_.update() ;
				  displayPlot_();
				 };
 //=================================== Begin operations ==================================================
 // This is where the whole action starts

 currentTree_ = 'files' ;
 STDLINE("The job begins") ;
 theAjaxRequest(
				_requestURL+"RequestType=getDirectoryContents",
				{
				 CookieCode: _cookieCode,
				 Path      : "/"
				},
				""
			   ) ;

});
