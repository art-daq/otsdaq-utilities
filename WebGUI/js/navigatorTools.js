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
                         if(el = getXMLNode(req,name))
                         {
                          var a = el.getAttribute(attribute);
                          return el.getAttribute(attribute);
                         }
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
//------------------------------------------------------------------------------
// Creates the different <div> placeholders for the main components of the page
function generateDIVPlaceholderPos(id,top,left)
{
 var div = document.createElement("div");
 div.id             = id ;
 div.style.position = "absolute";
 div.style.top      = top  + "px";
 div.style.left     = left + "px";

 document.getElementsByTagName("BODY")[0].appendChild(div);
}
//------------------------------------------------------------------------------
// Creates the different <div> placeholders for the main components of the page
function generateDIVPlaceholderSize(id,width,height)
{
 var div = document.createElement("div");
 div.id             = id ;
 div.style.position = "absolute";
 div.style.width    = width  + "px";
 div.style.height   = height + "px";

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
function repositionDiv(id,top,left)
{
 var div = document.getElementById(id);
 if( top  != "" ) div.style.top  = top  + "px";
 if( left != "" ) div.style.left = left + "px";
}
//-----------------------------------------------------------------------------
// Resize the div signed by id to width/height sizes
function changeDivSize(id,width,height)
{
 var div = document.getElementById(id);

 if( top  != "" ) div.style.width    = width  + "px";
 if( left != "" ) div.style.height   = height + "px";
}
//-----------------------------------------------------------------------------
// Get name of calling function
function getCalleName(argc)
{
  return argc.toString().match(/function ([^\(]+)/)[1];
}
