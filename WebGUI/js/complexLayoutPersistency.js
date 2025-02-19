/*===============================================================================*
 * complexLayout.js:   the javascript code to instantiate a root objects         *
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

Ext.namespace('perWin','perWin.js') ;

perWin.theConfigWin_     = 0 ;
perWin.theRequestURL_    = 0 ;
perWin.theConfigPayload_ = 0 ;

perWin.init = function thePersistency(theRequestURL, theCanvasModel, theViewPort)
			  {
			   perWin.theRequestURL_ = theRequestURL ;
			   Ext.define(
						  'configFileModel',
						  {
						   extend: 'Ext.data.Model',
						   fields: [
									{name: 'displayName', type: 'string'},
									{name: 'name'       , type: 'string'},
									{name: 'value'      , type: 'string'},
									{name: 'description', type: 'string'}
								   ]
						  }
						 );

			   var canvasNumber = 0 ;
			   var mainBlock    = [] ;
			   var objectBlock  = [] ;
			   theCanvasModel.canvases.forEach(
											   function (canvas)
											   {
												objectBlock    = [] ;
												canvas.objects.forEach(
																	   function(object)
																	   {
																		var provenanceArray = [] ;
																		provenanceArray[0]  = {
																							   displayName  : "Data directory",
																							   "name"       : "fSystemPath_"  ,
																							   "value"      : object.provenance.getSystemPath  (canvasNumber,object.pad),
																							   "description": "..."           ,
																							   "leaf"       : true
																							  } ;
																		provenanceArray[1]  = {
																							   displayName  : "Specific directory",
																							   "name"       : "fRootPath_",
																							   "value"      : object.provenance.getRootPath    (canvasNumber,object.pad),
																							   "description": "...",
																							   "leaf"       : true
																							  } ;
																		provenanceArray[2]  = {
																							   displayName  : "System folders path",
																							   "name"       : "fFoldersPath_",
																							   "value"      : object.provenance.getFoldersPath (canvasNumber,object.pad),
																							   "description": "...",
																							   "leaf"       : true
																							  } ;
																		provenanceArray[3]  = {
																							   displayName  : "File folders path",
																							   "name"       : "fRFoldersPath_",
																							   "value"      : object.provenance.getRFoldersPath(canvasNumber,object.pad),
																							   "description": "...",
																							   "leaf"       : true
																							  } ;
																		provenanceArray[4]  = {
																							   displayName  : "File name",
																							   "name"       : "fFileName_",
																							   "value"      : object.provenance.getFileName    (canvasNumber,object.pad),
																							   "description": "...",
																							   "leaf"       : true
																							  } ;
																		provenanceArray[5]  = {
																							   displayName  : "ROOT object name",
																							   "name"       : "fHistName_",
																							   "value"      : object.provenance.getHistName    (canvasNumber,object.pad),
																							   "description": "...",
																							   "leaf"       : true
																							  } ;
																		provenanceArray[6]  = {
																							   displayName  : "Provenance URL",
																							   "name"       : "fRequestURL_",
																							   "value"      : object.provenance.getRequestURL  (canvasNumber,object.pad),
																							   "description": "...",
																							   "leaf"       : true
																							  } ;
																		provenanceArray[7]  = {
																							   displayName  : "URL path",
																							   "name"       : "RootPath_",
																							   "value"      : object.provenance.getParams      (canvasNumber,object.pad).RootPath,
																							   "description": "...",
																							   "leaf"       : true
																							  } ;
																		objectBlock[object.pad] = {
																								   displayName  : "pad" + object.pad,
																								   "name"       : "pad" + object.pad,
																								   "value"      : object.pad        ,
																								   "description": "The pad number where this TObject is displayed",
																								   "leaf"       : false     ,
																								   children     : provenanceArray
																								  } ;
																	   }
																	  );
												var canvasArray = [] ;
												canvasArray[0]  = {
																   displayName  : "nDivX"       ,
																   "name"       : "nDivX"       ,
																   "value"      :  canvas.nDivX ,
																   "description": "Number of pads along X in the current canvas",
																   "leaf"       : true
																  } ;
												canvasArray[1]  = {
																   displayName  : "nDivY"       ,
																   "name"       : "nDivY"       ,
																   "value"      :  canvas.nDivY ,
																   "description": "Number of pads along Y in the current canvas",
																   "leaf"       : true
																  } ;
												canvasArray[2]  = {
																   displayName  : "Current Xpad"      ,
																   "name"       : "currentDivX"       ,
																   "value"      :  canvas.currentDivX ,
																   "description": "Number of pads along X in the current canvas",
																   "leaf"       : true
																  } ;
												canvasArray[3]  = {
																   displayName  : "Current Ypad"      ,
																   "name"       : "currentDivY"       ,
																   "value"      :  canvas.currentDivY ,
																   "description": "Number of pads along Y in the current canvas",
																   "leaf"       : true
																  } ;
												canvasArray[4]  = {
																   displayName  : "Pads"              ,
																   "name"       : "currentPad"        ,
																   "value"      :  canvas.currentPad  ,
																   "description": "Current pad number",
																   "leaf"       : false               ,
																   children     : objectBlock
																  } ;
												mainBlock[canvasNumber] = {
																		   displayName  : "Canvas" + canvasNumber,
																		   "name"       : "canvas" + canvasNumber,
																		   "description": "A canvas"             ,
																		   children     : canvasArray
																		  }
												canvasNumber++ ;
											   }
											  );
			   perWin.theConfigData_ = {
										children: mainBlock
									   } ;

			   try        {
						   perWin.theConfigPayload_ = JSON.stringify(perWin.theConfigData_) ;
						   STDLINE("|"+perWin.theConfigPayload_+"|") ;
						   var JSONBlock            = JSON.parse(perWin.theConfigPayload_ ) ;
						  }
			   catch(err) {
						   Ext.MessageBox.alert(
												'Something went wrong:',
												'Response: ' + err
											   );
						  } ;

			   perWin.store_ = Ext.create(
										  'Ext.data.TreeStore',
										  {
										   model: 'configFileModel',
										   root : perWin.theConfigData_
										  }
										 );

			   var valueWidth = theViewPort.getWidth() - 400 ;

			   perWin.configPanel_ = Ext.create(
												'Ext.tree.Panel',
												{
												 header     : false                           ,
												 width      : theViewPort.getWidth()          ,
												 height     : theViewPort.getHeight() -150    ,
												 split      : true                            ,
												 rootVisible: false                           ,
												 renderTo   : 'perWinDiv'                     ,
												 collapsible: true                            ,
												 useArrows  : true                            ,
												 rootVisible: false                           ,
												 store      : perWin.store_                   ,
												 multiSelect: true                            ,
												 columns    : [
															   {
																xtype    : 'treecolumn'       ,
																text     : 'The configuration',
																width    : 180                ,
																sortable : true               ,
																dataIndex: 'displayName'      ,
																locked   : true
															   },
															   {
																text     : 'Variable name'    ,
																width    : 150                ,
																hidden   : true               ,
																sortable : true               ,
																dataIndex: 'name'             ,
																align    : 'center'
															   },
															   {
																text     : 'Value'            ,
																width    : valueWidth         ,
																sortable : true               ,
																dataIndex: 'value'            ,
																align    : 'center'
															   },
															   {
																text     : 'Description'      ,
																width    : 350                ,
																hidden   : true               ,
																sortable : true               ,
																dataIndex: 'description'      ,
																align    : 'center'
															   }
															  ]
												}
											   );
			   Ext.getCmp('saveConfig-ID').setDisabled(true);
			   if( perWin.theConfigWin_ ) perWin.theConfigWin_.destroy() ;
			   perWin.theConfigWin_ = Ext.create(
												 'Ext.window.Window',
												 {
												  title    : 'The configuration manager'                       ,
												  width    : theViewPort.getWidth()                            ,
												  height   : theViewPort.getHeight()- 100                      ,
												  margins  : '5 5 5 5'                                         ,
												  padding  : '5 5 5 5'                                         ,
												  tbar     : [
															  {
															   xtype  : 'button'                               ,
															   text   : 'Save'                                 ,
															   pressed: true                                   ,
															   tooltip: 'Save configuration to file'           ,
															   handler: function()
																		{
																		 perWin.sendRequest("saveConfiguration");
																		}
															  },
															  {
															   xtype  : 'button'                               ,
															   text   : 'Retrieve'                             ,
															   pressed: true                                   ,
															   tooltip: 'Retrieve configuration from archive'  ,
															   handler: function()
																		{
																		 perWin.sendRequest("getConfiguration" );
																		}
															  },
															 ],
												  items    : perWin.configPanel_                               ,
												  listeners: {
															  beforedestroy: function()
																			 {
																			  Ext.getCmp('saveConfig-ID').setDisabled(false);
																			  if(perWin.store_       ) {perWin.store_.destroy()        ;}
																			  if(perWin.configPanel_ ) {perWin.configPanel_.destroy()  ;}
																			 }
															 }
												 }
												) ;
			   perWin.theConfigWin_.setPosition(0,52) ;
			   perWin.theConfigWin_.show()            ;

			  }

//==============================================================================================================
perWin.sendRequest = function sendRequest(whichOne)
					 {
					  perWin.theRequestURL_ += "RequestType=" + whichOne ;
					  var theParams = {
									   configPayload: perWin.theConfigPayload_
									  } ;
					  STDLINE(perWin.theRequestURL_) ;
					  Ext.Ajax.request(
									   {
										url    : perWin.theRequestURL_,
										method : 'POST'               ,
										headers: {
												  'Content-Type': 'text/plain;charset=UTF-8'
												 }                    ,
										params : theParams            ,
										timeout: 50000                ,
										success: function(response, request)
												 {
												  if(whichOne  == "getConfiguration" )
												  {
												   var block       = getXMLNode(response, 'DATA').innerHTML ;
												   var subblock    = block.replace("\n\t\t<JSONPayLoad value=\"","") ;
												   var JSONPayLoad = subblock.replace("\"/>\n\t","") ;
												   STDLINE("|"+JSONPayLoad+"|") ;
												   var JSONBlock   = "" ;
												   try        {
															   JSONBlock = JSON.parse(JSONPayLoad) ;
															  }
												   catch(err) {
															   Ext.MessageBox.alert(
																					'Something went wrong:',
																					'Response: ' + err
																				   );
															  } ;
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
					 }
//==============================================================================================================
perWin.destroy = function destroy()
				 {
				  if(perWin.theConfigWin_) {perWin.theConfigWin_.destroy() ;}
				 }
//==============================================================================================================
perWin.setSize = function setSize(xpos)
				 {
				  STDLINE("x: " + xpos ) ;
				 }
//==============================================================================================================
perWin.resize  = function resize(w, h)
				 {
				  STDLINE("w: " + w + " h: " + h ) ;
				  if( perWin.theConfigWin_) {perWin.theConfigWin_.setSize(w, h) ;}
				 }
