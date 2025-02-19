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

Ext.Loader.setConfig({enabled: true});

Ext.Loader.setPath('Ext.ux', '../../../extjsLib-6/classic/ux');

Ext.require(
            [
             'Ext.tip.QuickTipManager',
             'Ext.container.Viewport',
             'Ext.layout.*',
             'Ext.form.Panel',
             'Ext.form.Label',
             'Ext.grid.*',
             'Ext.data.*',
             'Ext.tree.*',
             'Ext.selection.*',
             'Ext.tab.Panel',
             'Ext.ux.layout.Center'
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

//=====================================================================================================================
Ext.onReady(
function()
{
 Ext.tip.QuickTipManager.init();

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

 var fSystemPath_       = ""                                                                      ;
 var fRootPath_         = ""                                                                      ;
 var fFoldersPath_      = ""                                                                      ;
 var fFileName_         = ""                                                                      ;
 var fHistName_         = ""                                                                      ;
 var fRFoldersPath_     = ""                                                                      ;
 var theSources_        = ""                                                                      ;
 var theSourcesCB_      = ""                                                                      ;
 var controlsWindow_    = ""                                                                      ;
 var _cookieCodeMailbox = self.parent.document.getElementById("DesktopContent-cookieCodeMailbox") ;
 var _cookieCode        = _cookieCodeMailbox.innerHTML                                            ;
 var _theWindow         = self                                                                    ;
 var _requestURL        = self.parent.window.location.origin                                     +
                          "/urn:xdaq-application:lid="                                           +
                          getLocalURN(0,"urn")                                                   +
                          "/Request?"                                                             ;

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
 var store            = Ext.create(
                                   'Ext.data.TreeStore',
                                   {
                                    root : {
                                            expanded: true
                                           },
                                    proxy: {
                                            type    : 'ajax',
                                            url     : '../JSONFiles/tree-data.json'
                                           }
                                   }
                                  );

 //-----------------------------------------------------------------------------
 var contentPanel     = Ext.create(
                                   'Ext.panel.Panel',
                                   {
                                    title     : 'Canvas'          ,
                                    id        : 'content-panel'   ,
                                    region    : 'center'          ,
                                    layout    : 'card'            ,
                                    margins   : '2 5 5 0'         ,
                                    activeItem: 0                 ,
                                    border    : true
                                   }
                                  );

 //-----------------------------------------------------------------------------
 var treePanel        = Ext.create(
                                   'Ext.tree.Panel',
                                   {
                                    id         : 'tree-panel'     ,
                                    title      : 'Filesystem view',
                                    region     : 'north'          ,
                                    split      : true             ,
                                    height     : 360              ,
                                    minSize    : 150              ,
                                    rootVisible: false            ,
                                    autoScroll : true             ,
                                    store      : store            ,
                                    columns    : [
                                                  {
                                                   xtype    : 'treecolumn'    ,
                                                   id       : 'provenance'    ,
                                                   text     : 'where'           ,
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
                                    collapsible: true
                                   }
                                  );

 //-----------------------------------------------------------------------------
 var ROOTFilesPanel   = Ext.create(
                                   'Ext.tree.Panel',
                                   {
                                    id         : 'details-panel'                       ,
                                    title      : 'ROOT files contents'                 ,
                                    region     : 'center'                              ,
                                    bodyStyle  : 'padding-bottom:15px;background:#eee;',
                                    autoScroll : true                                  ,
                                    collapsible: true                                  ,
                                    rootVisible: false                                 ,
                                    store      : store                                 ,
                                   }
                                  );

 //-----------------------------------------------------------------------------
//  var activateControls = Ext.create(
//                                    'Ext.Button',
//                                    {
//                                     text   : 'Control buttons',
//                                     region : 'south'          ,
//                                     handler: function()
//                                              {
//                                               createControlsWindow() ;
//                                              }
//                                    }
//                                   );
 var activateControls = Ext.create(
                                   'Ext.panel.Panel',
                                   {
                                    title   : 'Control buttons',
                                    height  : 100,
                                    html    : "quarcheccosa"
                                   }
                                  );

 //-----------------------------------------------------------------------------
 function createControlsWindow()
 {
  controlsWindow_  = Ext.create(
                                'Ext.window.Window',
                                {
                                 title : 'Control panel',
                                 height: 400            ,
                                 width : 500            ,
                                 items : {
                                         }
                                }
                               ).show() ;
 }
 //---------------------------------------------------------------------------------------------------------
 function createSources(dirs)
 {
  STDLINE("") ;
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
                              height      : 25         ,
                              width       : 200        ,
                              //region      : 'west'     ,
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
                            );
  theSourcesCB_.setRawValue(dirs[0].dir) ; // Set default value
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
                               var rootName  = getXMLValue (response,"path"    );
                               var rootJSON  = getXMLValue (response,"rootJSON");
                               var object    = JSROOT.parse(rootJSON           );
                               STDLINE("Launchin displayPlot")                  ;
                               activeObjects_.push(object) ;
//                               displayPlot_() ; // This is to get an immediate response
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

 //---------------------------------------------------------------------------------------------------------
 Ext.create(
            'Ext.Viewport',
            {
             layout: 'border',
             title : "Template of Visualizer layout for FNAL's otsdaq ",
             items : [
                      {
                       title      : 'Controls & Files Views',
                       layout     : 'border'                ,
                       id         : 'layout-browser'        ,
                       region     : 'west'                  ,
                       border     : false                   ,
                       split      : true                    ,
                       margins    : '2 0 5 5'               ,
                       width      : 200                     ,
                       minSize    : 100                     ,
                       maxSize    : 500                     ,
                       collapsible: true                    ,
                       items      : [
                                     activateControls       ,
                                     treePanel              ,
                                     ROOTFilesPanel         ,
                                     //theSourcesCB_
                                    ]
                      },
                      contentPanel
                     ],
                     renderTo     : 'goesHere'
            }
           ).setPosition(0,40);

 theAjaxRequest(
                _requestURL+"RequestType=getDirectoryContents",
                {
                 CookieCode: _cookieCode,
                 Path      : "/"
                },
                ""
               ) ;

});
