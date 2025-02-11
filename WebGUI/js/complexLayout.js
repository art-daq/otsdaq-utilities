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

/*________________________________________________________________________________/
/   The execution path of this asynchronous program starts at the end of this file
/ _______________________________________________________________________________*/
    
Ext.require(['*']);
Ext.QuickTips.init();

Ext.state.Manager.setProvider(Ext.create('Ext.state.CookieProvider'));


//---------------------------- Execute noly once head has been fully loaded -------------------------
Ext.onReady(
function() 
{
 var buttonStyle_         = 'margin-left  : 2px;'             +
                            'margin-right : 2px;'             +
                            'margin-top   : 2px;'             +
                            'margin-bottom: 2px;'             +
                            'padding      : 2px;'              ;
 var canvasTabs_          = []                                 ;
 var configStore_         = 0                                  ;
 var configPanel_         = 0                                  ;
 var currentCanvas_       = 0                                  ;
 var dataModel_           = ""                                 ;
 var enableDebug_         = true                               ;
 var globalCanvas_        = 0                                  ;
 var gridDivision_        = "grid1x1"                          ;
 var doReset_             = true                               ;
 var grid_                = ""                                 ;
 var mdi_                 = ""                                 ;
 var nxPlots_             = 1                                  ;
 var nyPlots_             = 1                                  ;
 var periodicPlotID_      = []                                 ;
 var ROOTControlsPanel_   = 0                                  ;
 var selectedItem_        = "getDirectories";                  ;
 var superimposeFlag_     = false                              ;
 var theCanvasModel_      = 0                                  ;
 var theConfigWin_        = 0                                  ;
 var theInformationPanel_ = 0                                  ;
 var theNavigatorPanel_   = 0                                  ;
 var theProvenance_       = 0                                  ;
 var theSourcesComboBox_  = 0                                  ;
 var theStore_            = 0                                  ;
 var theViewPort_         = 0                                  ;
 var timeoutInterval_     = 2                                  ;
 var treeDisplayField_    = "fDisplayName"                     ;
 var options1D_           = []                                 ;
 var options2D_           = []                                 ;
 var options3D_           = []                                 ;
 var optionsBodies1D_     = []                                 ;
 var optionsBodies2D_     = []                                 ;
 var optionsBodies3D_     = []                                 ;
 var options1DText_       = []                                 ;
 var options2DText_       = []                                 ;
 var options3DText_       = []                                 ;
 var LIVERunning_         = false                              ;

 var _theWindow           = self                               ;
 var _requestURL          = self.parent.window.location.origin+
                            "/urn:xdaq-application:lid="      +
                            getLocalURN(0,"urn")              +
                            "/Request?"                        ;

 // Options for 1D only
 options1D_[ 0] = ''          ; options1DText_[ 0] = 'Default' ;
 options1D_[ 1] = 'AH'        ; options1DText_[ 1] = 'Draw histogram without axis. "A" can be combined with any drawing option. For instance, "AC" draws the histogram as a smooth Curve without axis.' ; 
 options1D_[ 2] = ']['        ; options1DText_[ 2] = 'When this option is selected the first and last vertical lines of the histogram are not drawn. ' ;
 options1D_[ 3] = 'B'         ; options1DText_[ 3] = 'Bar chart option.' ;
 options1D_[ 4] = 'BAR'       ; options1DText_[ 4] = 'Like option "B", but bars can be drawn with a 3D effect.' ; 
 options1D_[ 5] = 'HBAR'      ; options1DText_[ 5] = 'Like option "BAR", but bars are drawn horizontally. ' ; 
 options1D_[ 6] = 'C'         ; options1DText_[ 6] = 'Draw a smooth Curve through the histogram bins. ' ;
 options1D_[ 7] = 'E0'        ; options1DText_[ 7] = 'Draw error bars. Markers are drawn for bins with 0 contents.  ' ;
 options1D_[ 8] = 'E1'        ; options1DText_[ 8] = 'Draw error bars with perpendicular lines at the edges. ' ;
 options1D_[ 9] = 'E2'        ; options1DText_[ 9] = 'Draw error bars with rectangles.  ' ;
 options1D_[10] = 'E3'        ; options1DText_[10] = 'Draw a fill area through the end points of the vertical error bars.' ;
 options1D_[11] = 'E4'        ; options1DText_[11] = 'Draw a smoothed filled area through the end points of the error bars.' ;
 options1D_[12] = 'E5'        ; options1DText_[12] = 'Like E3 but ignore the bins with 0 contents.  ' ;
 options1D_[13] = 'E6'        ; options1DText_[13] = 'Like E4 but ignore the bins with 0 contents.' ;
 options1D_[14] = 'X0'        ; options1DText_[14] = 'When used with one of the "E" option, it suppress the error bar along X as gStyle->SetErrorX(0) would do. ' ;
 options1D_[15] = 'L'         ; options1DText_[15] = 'Draw a line through the bin contents. ' ;
 options1D_[16] = 'P'         ; options1DText_[16] = 'Draw current marker at each bin except empty bins.  ' ;
 options1D_[17] = 'P0'        ; options1DText_[17] = 'Draw current marker at each bin including empty bins. ' ;
 options1D_[18] = 'PIE'       ; options1DText_[18] = 'Draw histogram as a Pie Chart. ' ;
 options1D_[19] = 'H'         ; options1DText_[19] = 'Draw histogram with a * at each bin. ' ;
 options1D_[20] = 'LF2'       ; options1DText_[20] = 'Draw histogram like with option "L" but with a fill area. Note that "L" draws also a fill area if the hist fill color is set but the fill area corresponds to the histogram contour. ' ;

 // Options for 1D AND 2D
 options1D_[21] = 'E'         ; options1DText_[21] = 'Draw error bars. ' ;
 options1D_[22] = 'AXIS'      ; options1DText_[22] = 'Draw only axis. ' ;
 options1D_[23] = 'AXIG'      ; options1DText_[23] = 'Draw only grid (if the grid is requested). ' ;
 options1D_[24] = 'HIST'      ; options1DText_[24] = 'When an histogram has errors it is visualized by default with error bars. To visualize it without errors use the option "HIST" together with the required option (eg "hist same c"). The "HIST" option can also be used to plot only the histogram and not the associated function(s). ' ;
 options1D_[25] = 'FUNC'      ; options1DText_[25] = 'When an histogram has a fitted function, this option allows to draw the fit result only. ' ;
 options1D_[26] = 'SAME'      ; options1DText_[26] = 'Superimpose on previous picture in the same pad. ' ;
 options1D_[27] = 'SAMES'     ; options1DText_[27] = 'Same as "SAME" and draw the statistics box ' ;
 options1D_[28] = 'PFC'       ; options1DText_[28] = "Palette Fill Color: histogram's fill color is taken in the current palette. " ;
 options1D_[29] = 'PLC'       ; options1DText_[29] = "Palette Line Color: histogram's line color is taken in the current palette. " ;
 options1D_[30] = 'PMC'       ; options1DText_[30] = "Palette Marker Color: histogram's marker color is taken in the current palette. " ;
 options1D_[31] = 'LEGO'      ; options1DText_[31] = 'Draw a lego plot with hidden line removal. ' ;
 options1D_[32] = 'LEGO1'     ; options1DText_[32] = 'Draw a lego plot with hidden surface removal. ' ;
 options1D_[33] = 'LEGO2'     ; options1DText_[33] = 'Draw a lego plot using colors to show the cell contents When the option "0" is used with any LEGO option, the empty bins are not drawn. ' ;
 options1D_[34] = 'LEGO3'     ; options1DText_[34] = 'Draw a lego plot with hidden surface removal, like LEGO1 but the border lines of each lego-bar are not drawn. ' ;
 options1D_[35] = 'LEGO4'     ; options1DText_[35] = 'Draw a lego plot with hidden surface removal, like LEGO1 but without the shadow effect on each lego-bar. ' ;
 options1D_[36] = 'TEXT'      ; options1DText_[36] = 'Draw bin contents as text (format set via gStyle->SetPaintTextFormat). ' ;
 options1D_[37] = 'TEXT90'    ; options1DText_[37] = 'Draw bin contents as text at angle 90. ' ;
 options1D_[38] = 'X+'        ; options1DText_[38] = 'The X-axis is drawn on the top side of the plot. ' ;
 options1D_[39] = 'Y+'        ; options1DText_[39] = 'The Y-axis is drawn on the top side of the plot. ' ;
 options1D_[40] = 'MIN0'      ; options1DText_[40] = 'Set minimum value for the Y axis to 0, equivalent to gStyle->SetHistMinimumZero(). ' ;

 options2D_[ 0] = ''          ; options2DText_[ 0] = 'Default (scatter plot)';
 options2D_[ 1] = 'ARR'       ; options2DText_[ 1] = 'Arrow mode. Shows gradient between adjacent cells.';
 options2D_[ 2] = 'BOX'       ; options2DText_[ 2] = "A box is drawn for each cell with surface proportional to the content's absolute value. A negative content is marked with a X.'";
 options2D_[ 3] = 'BOX1'      ; options2DText_[ 3] = "A button is drawn for each cell with surface proportional to content's absolute value. A sunken button is drawn for negative values a raised one for positive.";
 options2D_[ 4] = 'COL'       ; options2DText_[ 4] = 'A box is drawn for each cell with a color scale varying with contents. All the none empty bins are painted.';
 options2D_[ 5] = 'COLZ'      ; options2DText_[ 5] = 'Same as "COL". In addition the color palette is also drawn.';
 options2D_[ 6] = 'COL2'      ; options2DText_[ 6] = 'Alternative rendering algorithm to "COL". Can significantly improve rendering performance for large, non-sparse 2-D histograms.';
 options2D_[ 7] = 'COLZ2'     ; options2DText_[ 7] = 'Same as "COL2". In addition the color palette is also drawn.';
 options2D_[ 8] = 'ZCJUST'    ; options2DText_[ 8] = 'In combination with colored options "COL","CONT0" etc: Justify labels in the color palette at color boudaries. For more details see TPaletteAxis';
 options2D_[ 9] = 'CANDLE'    ; options2DText_[ 9] = 'Draw a candle plot along X axis.';
 options2D_[10] = 'CANDLEX'   ; options2DText_[10] = 'Same as "CANDLE".';
 options2D_[11] = 'CANDLEY'   ; options2DText_[11] = 'Draw a candle plot along Y axis.';
 options2D_[12] = 'CANDLEX1'  ; options2DText_[12] = 'Draw a candle plot along X axis with style 1.';
 options2D_[13] = 'CANDLEX2'  ; options2DText_[13] = 'Draw a candle plot along X axis with style 2.';
 options2D_[14] = 'CANDLEX3'  ; options2DText_[14] = 'Draw a candle plot along X axis with style 3.';
 options2D_[15] = 'CANDLEX4'  ; options2DText_[15] = 'Draw a candle plot along X axis with style 4.';
 options2D_[16] = 'CANDLEX5'  ; options2DText_[16] = 'Draw a candle plot along X axis with style 5.';
 options2D_[17] = 'CANDLEX6'  ; options2DText_[17] = 'Draw a candle plot along X axis with style 6.';
 options2D_[18] = 'CANDLEY1'  ; options2DText_[18] = 'Draw a candle plot along Y axis with style 1.';
 options2D_[19] = 'CANDLEY2'  ; options2DText_[19] = 'Draw a candle plot along Y axis with style 2.';
 options2D_[20] = 'CANDLEY3'  ; options2DText_[20] = 'Draw a candle plot along Y axis with style 3.';
 options2D_[21] = 'CANDLEY4'  ; options2DText_[21] = 'Draw a candle plot along Y axis with style 4.';
 options2D_[22] = 'CANDLEY5'  ; options2DText_[22] = 'Draw a candle plot along Y axis with style 5.';
 options2D_[23] = 'CANDLEY6'  ; options2DText_[23] = 'Draw a candle plot along Y axis with style 6.';
 options2D_[24] = 'VIOLIN'    ; options2DText_[24] = 'Draw a violin plot along X axis. ';
 options2D_[25] = 'VIOLINX'   ; options2DText_[25] = 'Same as "VIOLIN"';
 options2D_[26] = 'VIOLINY'   ; options2DText_[26] = 'Draw a violin plot along Y axis. ';
 options2D_[27] = 'VIOLINX1'  ; options2DText_[27] = 'Draw a violin plot along X axis with style 1';
 options2D_[28] = 'VIOLINX2'  ; options2DText_[28] = 'Draw a violin plot along X axis with style 2';
 options2D_[29] = 'VIOLINY1'  ; options2DText_[29] = 'Draw a violin plot along Y axis with style 1';
 options2D_[30] = 'VIOLINY2'  ; options2DText_[30] = 'Draw a violin plot along Y axis with style 2';
 options2D_[31] = 'CONT'      ; options2DText_[31] = 'Draw a contour plot (same as CONT0).';
 options2D_[32] = 'CONT0'     ; options2DText_[32] = 'Draw a contour plot using surface colors to distinguish contours.';
 options2D_[33] = 'CONT1'     ; options2DText_[33] = 'Draw a contour plot using line styles to distinguish contours.';
 options2D_[34] = 'CONT2'     ; options2DText_[34] = 'Draw a contour plot using the same line style for all contours.';
 options2D_[35] = 'CONT3'     ; options2DText_[35] = 'Draw a contour plot using fill area colors.';
 options2D_[36] = 'CONT4'     ; options2DText_[36] = 'Draw a contour plot using surface colors (SURF option at theta = 0).';
 options2D_[37] = 'CONT5'     ; options2DText_[37] = '(TGraph2D only) Draw a contour plot using Delaunay triangles.';
 options2D_[38] = 'LIST'      ; options2DText_[38] = 'Generate a list of TGraph objects for each contour.';
 options2D_[39] = 'CYL'       ; options2DText_[39] = 'Use Cylindrical coordinates. The X coordinate is mapped on the angle and the Y coordinate on the cylinder length.';
 options2D_[40] = 'POL'       ; options2DText_[40] = 'Use Polar coordinates. The X coordinate is mapped on the angle and the Y coordinate on the radius.';
 options2D_[41] = 'SAME0'     ; options2DText_[41] = 'Same as "SAME" but do not use the z-axis range of the first plot.';
 options2D_[42] = 'SAMES0'    ; options2DText_[42] = 'Same as "SAMES" but do not use the z-axis range of the first plot.';
 options2D_[43] = 'SPH'       ; options2DText_[43] = 'Use Spherical coordinates. The X coordinate is mapped on the latitude and the Y coordinate on the longitude.';
 options2D_[44] = 'PSR'       ; options2DText_[44] = 'Use PseudoRapidity/Phi coordinates. The X coordinate is mapped on Phi.';
 options2D_[45] = 'SURF'      ; options2DText_[45] = 'Draw a surface plot with hidden line removal.';
 options2D_[46] = 'SURF1'     ; options2DText_[46] = 'Draw a surface plot with hidden surface removal.';
 options2D_[47] = 'SURF2'     ; options2DText_[47] = 'Draw a surface plot using colors to show the cell contents.';
 options2D_[48] = 'SURF3'     ; options2DText_[48] = 'Same as SURF with in addition a contour view drawn on the top.';
 options2D_[49] = 'SURF4'     ; options2DText_[49] = 'Draw a surface using Gouraud shading.';
 options2D_[50] = 'SURF5'     ; options2DText_[50] = 'Same as SURF3 but only the colored contour is drawn. Used with option CYL, SPH or PSR it allows to draw colored contours on a sphere, a cylinder or a in pseudo rapidity space. In cartesian or polar coordinates, option SURF3 is used.';
 options2D_[51] = 'LEGO9'     ; options2DText_[51] = 'Draw the 3D axis only. Mainly needed for internal use';
 options2D_[52] = 'FB'        ; options2DText_[52] = 'With LEGO or SURFACE, suppress the Front-Box.';
 options2D_[53] = 'BB'        ; options2DText_[53] = 'With LEGO or SURFACE, suppress the Back-Box.';
 options2D_[54] = 'A'         ; options2DText_[54] = 'With LEGO or SURFACE, suppress the axis.';
 options2D_[55] = 'SCAT'      ; options2DText_[55] = 'Draw a scatter-plot (default).';

 options3D_[ 0] = ''          ; options3DText_[ 0] = 'Default (scatter plot)';
 options3D_[ 1] = 'ISO'       ; options3DText_[ 1] = 'Draw a Gouraud shaded 3d iso surface through a 3d histogram. It paints one surface at the value computed as follow: SumOfWeights/(NbinsX*NbinsY*NbinsZ). ';
 options3D_[ 2] = 'BOX'       ; options3DText_[ 2] = "Draw a for each cell with volume proportional to the content's absolute value. An hidden line removal algorithm is used";
 options3D_[ 3] = 'BOX1'      ; options3DText_[ 3] = 'Same as BOX but an hidden surface removal algorithm is used ';
 options3D_[ 4] = 'BOX2'      ; options3DText_[ 4] = "The boxes' colors are picked in the current palette according to the bins' contents";
 options3D_[ 5] = 'BOX2Z'     ; options3DText_[ 5] = 'Same as "BOX2". In addition the color palette is also drawn. ';
 options3D_[ 6] = 'BOX3'      ; options3DText_[ 6] = 'Same as BOX1, but the border lines of each lego-bar are not drawn. ';
 options3D_[ 7] = 'LEGO'      ; options3DText_[ 7] = 'Same as BOX';
// options3D_[ 8] = 'GLBOX'     ; options3DText_[ 8] = '';
// options3D_[ 9] = 'GLBOX1'    ; options3DText_[ 9] = '';
// options3D_[10] = 'GLBOX2'    ; options3DText_[10] = '';
// options3D_[11] = 'GLBOX3'    ; options3DText_[11] = '';
// options3D_[12] = 'GLCOL'     ; options3DText_[12] = '';
         
//  var thisOne = self ;
//  var theParentWindow   = thisOne.parent ;
//  var this_ih = thisOne.innerHeight          ; 
//  var this_iw = thisOne.innerWidth           ; 
//  var pare_ih = theParentWindow.innerHeight  ; 
//  var pare_iw = theParentWindow.innerWidth   ; 
//  var this_oh = thisOne.outerHeight          ; 
//  var this_ow = thisOne.outerWidth           ; 
//  var pare_oh = theParentWindow.outerHeight  ; 
//  var pare_ow = theParentWindow.outerWidth   ; 
//  var a = 0 ;
//  window.outerWidth  = 1600 ;
//  window.outerHeight = 1000  ;
//--------------------------------------------------------------------------------------------------
 function initializeOptions(dim, theBody, theArray, theText)
 {
  for(var i=0; i< theArray.length; i++)
  {
   var v = theArray[i] ;   
   //STDLINE("    v: "+v) ;
   theBody.push(
                {
                 xtype   : 'checkbox'                          ,
                 id      : 'ID-' + dim + '-' + v + '_CB'       ,
                 boxLabel:                     v + ' <font color="red">- ' + theText[i] + '</font>'              ,
                 name    :                     v               ,
                 value   :                     v               ,
                 tooltip : 'Set option '     + v + ' for plots'      
                }
               )
  }
 }

 //--------------------------------------------------------------------------------------------------
 setButtonColor = function(color)
 {
  buttonStyle_ = 'margin-left  : 2px;' +
                 'margin-right : 2px;' +
                 'margin-top   : 2px;' +
                 'margin-bottom: 2px;' +
                 'padding      : 2px;' +
                 'background   : '     + 
                 color + ";"     ;
  return buttonStyle_ ;
 }
 //--------------------------------------------------------------------------------------------------
 getCanvasDiv_ = function(number)
                 {
                  return 'canvas' + number ;
                 }
 
 //--------------------------------------------------------------------------------------------------
 /* Hash elements are addressed by an index of type canvasx_y where x is the currentCanvas_ and y is currentPad_

    A provenance record has the following structure:
    
    {
     fSystemPath_   : {},                                                 
     fRootPath_     : {},                                                 
     fFoldersPath_  : {},                                                 
     fRFoldersPath_ : {},                                                 
     fFileName_     : {},                                                 
     fHistName_     : {},
     fRequestURL_   : {},
     fParams_       : {}
    }                                                 
 */
 
 theProvenance_ = {
                   fSystemPath_   : [],                                                 
                   fRootPath_     : [],                                                 
                   fFoldersPath_  : [],                                                 
                   fRFoldersPath_ : [],
                   fFileName_     : [],                                                 
                   fHistName_     : [],                                                 
                   fRequestURL_   : [],
                   fParams_       : [],
                   clearAll       : function(theCanvas, thePad)
                                    {
                                     var addr = 'canvas'+ theCanvas + "_" + thePad;
                                     this.fSystemPath_  [addr]="" ;
                                     this.fRootPath_    [addr]="" ;                          
                                     this.fFoldersPath_ [addr]="" ;                          
                                     this.fRFoldersPath_[addr]="" ; 
                                     this.fFileName_    [addr]="" ;                          
                                     this.fHistName_    [addr]="" ;                          
                                     this.fRequestURL_  [addr]="" ; 
                                     this.fParams_      [addr]="" ; 
                                    },                                                               
                   setSystemPath  : function(SystemPath  , theCanvas, thePad)                                
                                    {  
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     if( typeof SystemPath   === "undefined" ) this.fSystemPath_  [addr]=""
                                     else                                      this.fSystemPath_  [addr]=SystemPath  ;
                                    },                                                   
                   setRootPath    : function(RootPath    , theCanvas, thePad)                                     
                                    {                                                    
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; STDLINE("RootPath: "+RootPath);
                                     if( typeof RootPath     === "undefined" ) this.fRootPath_    [addr]="" 
                                     else                                      this.fRootPath_    [addr]=RootPath    ; 
                                    },                                                   
                   setFoldersPath : function(FoldersPath , theCanvas, thePad)                                
                                    {                                                    
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     if( typeof FoldersPath  === "undefined" ) this.fFoldersPath_ [addr]="" 
                                     else                                      this.fFoldersPath_ [addr]=FoldersPath ;                   
                                    },                                                   
                   setRFoldersPath: function(RFoldersPath, theCanvas, thePad)                              
                                    {                                                    
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     if( typeof RFoldersPath === "undefined" ) this.fRFoldersPath_[addr]="" 
                                     else                                      this.fRFoldersPath_[addr]=RFoldersPath;                   
                                    },                                                  
                   setFileName    : function(FileName    , theCanvas, thePad)                                    
                                    {                                                    
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     if( typeof FileName     === "undefined" ) this.fFileName_    [addr]=""           
                                     else                                      this.fFileName_    [addr]=FileName    ;             
                                    },                                                   
                   setHistName    : function(HistName    , theCanvas, thePad)                                    
                                    {                                                    
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     if( typeof HistName     === "undefined" ) this.fHistName_    [addr]="" 
                                     else                                      this.fHistName_    [addr]=HistName    ;             
                                    },                                                   
                   setRequestURL  : function(requestURL, theCanvas, thePad) 
                                    {
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     if( typeof requestURL   === "undefined" ) this.fRequestURL_  [addr]="" 
                                     else                                      this.fRequestURL_  [addr]=requestURL   ;             
                                    },
                   setParams      : function(params, theCanvas, thePad) 
                                    {
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     if( typeof params       === "undefined" ) this.fParams_      [addr]="" 
                                     else                                      this.fParams_      [addr]=params   ;         
                                    },
                   getPathsNumber : function()
                                    {
                                     return Object.keys(this.fSystemPath_).length ;
                                    },
                   getSystemPath  : function(theCanvas, thePad)                              
                                    {  
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     return this.fSystemPath_  [addr] ;                    
                                    },                                            
                   getRootPath    : function(theCanvas, thePad)                          
                                    {                                             
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     return this.fRootPath_    [addr] ;                    
                                    },                                            
                   getFoldersPath : function(theCanvas, thePad)                       
                                    {                                             
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     return this.fFoldersPath_ [addr] ;                     
                                    },                                             
                   getRFoldersPath: function(theCanvas, thePad)                       
                                    {                                             
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     return this.fRFoldersPath_[addr] ;                      
                                    },                                                  
                   getFileName    : function(theCanvas, thePad)                           
                                    {                                             
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     return this.fFileName_    [addr] ;                     
                                    },                                            
                   getHistName    : function(theCanvas, thePad)                           
                                    {                                             
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     return this.fHistName_    [addr] ;                     
                                    },                                            
                   getRequestURL  : function(theCanvas, thePad) 
                                    {
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     return this.fRequestURL_  [addr] ;                     
                                    },
                   getParams      : function(theCanvas, thePad) 
                                    {
                                     var addr = 'canvas'+ theCanvas + "_" + thePad; 
                                     return this.fParams_      [addr] ;                     
                                    },
                   dumpAll        : function(fromWhere)                                 
                                    { 
                                     STDLINE("<<=========== From: "+fromWhere+" ===========<<"           );                                  
                                     for(var j in this.fSystemPath_)
                                     {
                                      if( j.match(/undefined/) || j.match(/canvas\d+_canvas/) )
                                      {
                                      }
                                      else
                                      { 
                                       this.dump(fromWhere, j                                            );
                                      }
                                     }
                                     STDLINE(">>===================================>>"                   );
                                    },                                                   
                   dump           : function(fromWhere, i)                                 
                                    {                                                   
                                     STDLINE("   ------------------------------------------------------" );
                                     STDLINE("   From: '"+fromWhere+"' ("+i+ ")"                         );
                                     STDLINE("   --> fSystemPath_     : "+this.fSystemPath_  [i]         );
                                     STDLINE("   --> fRootPath_       : "+this.fRootPath_    [i]         );
                                     STDLINE("   --> fFoldersPath_    : "+this.fFoldersPath_ [i]         );
                                     STDLINE("   --> fFileName_       : "+this.fFileName_    [i]         );
                                     STDLINE("   --> fRFoldersPath_   : "+this.fRFoldersPath_[i]         );
                                     STDLINE("   --> fHistName_       : "+this.fHistName_    [i]         );
                                     STDLINE("   --> fRequestURL_     : "+this.fRequestURL_  [i]         );
                                     if( typeof this.fParams_[i] !== "undefined" ) 
                                     {
                                      STDLINE("   --> fParams_.RootPath: "+this.fParams_     [i].RootPath); 
                                     }
                                     STDLINE("   ------------------------------------------------------" );
                                      
                                    }                                                   
                  } ;                                                                   

 //--------------------------------------------------------------------------------------------------
 /* This is a class to handle the canvases displayed on the GUI as distinct tabs.
    A canvasModel record structure is the following:

    {
     canvasName : 'canvasX'       ,
     nDivX      : 1               ,
     nDivY      : 1               ,
     currentDivX: 0               ,
     currentDivY: 0               ,
     currentPad : 0               ,
     objects    : [
                   {
                    pad       : p            ,
                    object    : theObject    ,
                    provenance: theProvenance
                   }                                              
                  ]                   
    }                              
 */
 theCanvasModel_ = {
                    currentCanvas  : 0  ,
                    currentWidth   : 350,
                    currentHeight  : 440,
                    canvases       : [
                                      {
                                       canvasName : 'canvas0'       ,
                                       nDivX      : 1               ,
                                       nDivY      : 1               ,
                                       currentDivX: 0               ,
                                       currentDivY: 0               ,
                                       currentPad : 0               ,
                                       objects    : []                // objects[i] = {       
                                      },                              //               pad       : x
                                      {                               //               object    : y
                                       canvasName : 'canvas1'       , //               provenance: z
                                       nDivX      : 1               , //              }
                                       nDivY      : 1               ,
                                       currentDivX: 0               ,
                                       currentDivY: 0               ,
                                       currentPad : 0               ,
                                       objects    : []         
                                      }
                                     ],
                    addCanvas      : function()
                                     {
                                      var l = this.canvases.length - 1;
                                      this.canvases[l] = {
                                                          canvasName : 'canvas' + l    ,
                                                          nDivX      : 1               ,
                                                          nDivY      : 1               ,
                                                          currentDivX: 0               ,
                                                          currentDivY: 0               ,
                                                          currentPad : 0               ,
                                                          objects    : []         
                                                         }
                                     },  
                    addROOTObject  : function(canvasNumber, theObject, theProvenance)
                                     {
                                      if( canvasNumber > this.canvases.length-1 ) return        ;
                                      var t = this.canvases[canvasNumber]                       ;
                                      var p = this.canvases[canvasNumber].objects.length        ;
                                      STDLINE("currentPad: "                                   +
                                              p                                                +
                                              " on canvasNumber: "                             +
                                              canvasNumber                                     );
                                      var obj = {
                                                 pad       : p                                 ,
                                                 object    : theObject                         ,
                                                 provenance: theProvenance
                                                }                                               ;
                                      this.canvases[canvasNumber].objects.push(obj)             ;      
                                     },
                    nextPad        : function(canvasNumber)
                                     {
                                      if( canvasNumber > this.canvases.length-1 ) return        ;
                                      var t = this.canvases[canvasNumber]                       ;
                                      var currentPad = t.currentPad                             ;
                                      var newPad = currentPad + 1                               ;
                                      if( newPad >= t.nDivX * t.nDivY ) newPad = 0              ;
                                      this.canvases[canvasNumber].currentPad = newPad           ;
                                      STDLINE("newPad: "+this.canvases[canvasNumber].currentPad);
                                     },
                    populate       : function(canvasNumber, theRequestURL,theParams,object)
                                     {
                                      if( canvasNumber > this.canvases.length-1 ) return        ;
                                      var thePad = this.canvases[canvasNumber].currentPad       ;
                                      var rowcol = this.getDivXDivY(canvasNumber,thePad)        ;
                                     },
                    resetCurrentPad: function(canvasNumber)
                                     {
                                      if(canvasNumber< 0 || canvasNumber>this.canvases.length-1) 
                                        return                                                  ;
                                      this.canvases[canvasNumber].currentPad = 0                ;  
                                      STDLINE("pad reset: "+this.canvases[canvasNumber].currentPad) ;
                                     },
                    getCurrentPad  : function(canvasNumber)
                                     {
                                      if(canvasNumber< 0 || canvasNumber>this.canvases.length-1) 
                                        return                                                  ;
                                      var t = this.canvases[canvasNumber]                       ;
                                      if( t.currentPad >= t.nDivX * t.nDivY ) 
                                          this.canvases[canvasNumber].currentPad = 0            ;
                                      STDLINE("currentPad: "+
                                              t.currentPad  +
                                              " on canvas: "+
                                              canvasNumber)                                     ;
                                      return t.currentPad                                       ;
                                     },                
                    getCurrentPadC : function(canvasNumber)
                                     {
                                      var thePad ="canvas"      +
                                                   canvasNumber +
                                                   "_"          +
                                                   this.getCurrentPad(canvasNumber)             ;
                                      return thePad                                             ;
                                     },                
                    getDivXDivY    : function(canvasNumber, thePad)
                                     {
                                      if( canvasNumber > this.canvases.length-1 ) return        ;
                                      var divX = this.canvases[canvasNumber].nDivX              ;
                                      var divY = this.canvases[canvasNumber].nDivY              ;
                                      var row  = Math.floor(thePad / divX)                      ;
                                      var col  = thePad % divX                                  ;
                                      STDLINE("currentCanvas: " + canvasNumber +
                                              " pad: "          + thePad       +
                                              " row: "          + row          +
                                              " col: "          + col          ) ;
                                      return [row,col]                                          ;
                                     },
                    getROOTObjects : function(canvasNumber)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      return this.canvases[canvasNumber].objects                ;
                                     },
                    getROOTObject:   function(canvasNumber,padNumber)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      return this.canvases[canvasNumber].objects[padNumber]     ;
                                     },
                    clearCanvas    : function(canvasNumber)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      var l = canvasNumber                                      ;
                                      var divX = this.canvases[canvasNumber].nDivX              ;
                                      var divY = this.canvases[canvasNumber].nDivY              ;
                                      JSROOT.cleanup(getCanvasDiv_(currentCanvas_))             ;
                                      this.canvases[canvasNumber] = {
                                                                     canvasName : 'canvas' + l ,
                                                                     nDivX      : divX         ,
                                                                     nDivY      : divY         ,
                                                                     currentDivX: 0            ,
                                                                     currentDivY: 0            ,
                                                                     currentPad : 0            ,
                                                                     objects    : []         
                                                                    }
                                      STDLINE("Remaining: " +  this.canvases[canvasNumber].objects.length) ;                            
                                     },  
                    removeCanvas   : function(canvasNumber)
                                     {
                                      var index = this.canvases.indexOf(canvasNumber)           ;
                                      this.canvases.splice(index,1)                             ;
                                     },  
                    changenDivX    : function(canvasNumber, newnDivX)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      this.clearCanvas(canvasNumber)                            ;
                                      this.canvases[canvasNumber].nDivX = newnDivX              ;
                                     },
                    changenDivY    : function(canvasNumber, newnDivY)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      this.clearCanvas(canvasNumber)                            ;
                                      this.canvases[canvasNumber].nDivY = newnDivY              ;
                                     },
                    setnDivX       : function(canvasNumber, newValue)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      STDLINE("setting divX: "+newValue)                        ;
                                      this.clearCanvas(canvasNumber)                            ;
                                      this.canvases[canvasNumber].nDivX   = newValue            ;
                                      this.canvases[canvasNumber].objects = []                  ;
                                     },                
                    getnDivX       : function(canvasNumber)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      STDLINE("divX: "+this.canvases[canvasNumber].nDivX)       ;
                                      return this.canvases[canvasNumber].nDivX                  ;
                                     },                
                    setnDivY       : function(canvasNumber, newValue)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      STDLINE("setting divY: "+newValue)                        ;
                                      this.clearCanvas(canvasNumber)                            ;
                                      this.canvases[canvasNumber].nDivY   = newValue            ;
                                      this.canvases[canvasNumber].objects = []                  ;
                                     },                
                    getnDivY       : function(canvasNumber)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      STDLINE("divY: "+this.canvases[canvasNumber].nDivY)       ;
                                      return this.canvases[canvasNumber].nDivY                  ;
                                     },                
                    setDivPosition : function(canvasNumber, posX, posY)
                                     {
                                      if( canvasNumber > this.canvases.length-1      ) return   ;
                                      var nx   = this.canvases[canvasNumber].nDivX              ;
                                      var ny   = this.canvases[canvasNumber].nDivY              ;
                                      if( posX > nx || posY > ny ) return                       ;
                                      var modY = posY%nx                                        ;
                                      var pos  = modY * nx + posX                               ;
                                      this.canvases[canvasNumber].currentPad = pos              ;
                                     },
                    dump           : function(theCanvas, what)
                                     {
                                      var theC = this.canvases[theCanvas] ;
                                      STDLINE(" <<______ "     + what             + " _______________<<" ) ;
                                      STDLINE(" -------- "     + theC.canvasName  + " ---------"         ) ;
                                      STDLINE(" name      : "  + theC.canvasName                         ) ;
                                      STDLINE(" divs      : "  + theC.nDivX + "x" + theC.nDivY           ) ;
                                      STDLINE(" nDivX     : "  + theC.nDivX                              ) ;
                                      STDLINE(" nDivY     : "  + theC.nDivY                              ) ;
                                      STDLINE(" currentPad: "  + theC.currentPad                         ) ;
                                      STDLINE(" objects   : "  + Object.keys(theC.objects).length        ) ;
                                      for( var j in theC.objects)
                                      {
                                       var o      = theC.objects[j]                                        ;
                                       var pad    = o.pad                                                  ;
                                       var obj    = o.object                                               ;
                                       var fTitle = obj.fTitle                                             ;
                                       var fName  = obj.fName                                              ;
                                       var pad    = 'canvas' + theCanvas + '_' + j                         ;
                                       STDLINE("   object #  : " + j                                     ) ;
                                       STDLINE("   fTitle    : " + fTitle                                ) ;
                                       STDLINE("   fName     : " + fName                                 ) ;
                                       STDLINE("   pad       : " + pad                                   ) ;
                                       theC.objects[j].provenance.dump("provenance: "+fTitle ,pad        ) ;
                                      }
                                      STDLINE(" >>______ "     + what             + " _______________>>" ) ;
                                     }, 
                    dumpContent    : function(where)
                                     {
                                      STDLINE(">>================== " + where + " =====================>>") ;
                                      STDLINE("Size: " + this.currentWidth + "x" + this.currentHeight     ) ;
                                      STDLINE("Number of canvases: "+this.canvases.length                 ) ;
                                      for(var i=0; i<this.canvases.length; i++)
                                      {
                                       this.dump(i, where) ;
                                      }
                                      STDLINE("<<======================================================<<") ;
                                     }
                   } ;

 //-----------------------------------------------------------------------------
 // Resize the div signed by id to width/height sizes
 function changeHistogramPanelSize(thisPanel, width, height, from)      
 {
  var div = document.getElementById(getCanvasDiv_(currentCanvas_));
  var w = width  * 1.5 ; w = "width:"  + w + "px;" ; 
  var h = height * 0.9 ; h = "height:" + h + "px;" ; 
  div.setAttribute("style",w) ;
  div.setAttribute("style",h) ;
 } 
             
 //-----------------------------------------------------------------------------------------------
 function createCanvasTab(tabNumber)
 {
  var closable = false ;
  if(tabNumber>0) closable = true ;
  canvasTabs_.push(Ext.create(
                              'Ext.panel.Panel',
                              {
                               contentEl : 'canvas' +tabNumber,
                               title     : 'Canvas '+tabNumber,
                               closable  : closable           ,
                               border    : true               ,
                               autoScroll: true
                              }
                             ) 
                  );
  STDLINE("New tab created") ;
 }

 //-----------------------------------------------------------------------------------------------
 var nDivXCB = Ext.create(
                          'Ext.form.field.Number',
                          {
                           xtype     : 'numberfield'          ,
                           id        : 'nPlotsX'              , 
                           name      : 'hzon'                 ,
                           labelWidth: 50                     ,
                           flex      : 0                      ,
                           width     : 100                    ,
                           height    : 18                     ,
                           fieldLabel: 'PlotsX'               ,
                           value     : 1                      ,
                           minValue  : 1                      ,
                           maxValue  : 20                     ,
                           style     : setButtonColor('white'),
                           listeners : {
                                        change: function( thisSpinner, newValue, oldValue, eOpts )
                                                {
                                                 theCanvasModel_.setnDivX(currentCanvas_, newValue) ;
                                                }
                                       }
                          }
                         ) ;
 //-----------------------------------------------------------------------------------------------
 var nDivYCB = Ext.create(
                          'Ext.form.field.Number',
                          {
                           xtype     : 'numberfield'         ,
                           id        : 'nPlotsY'              , 
                           name      : 'vzon'                ,
                           labelWidth: 50                    ,
                           flex      : 0                     ,
                           width     : 100                   ,
                           height    : 18                    ,
                           fieldLabel: 'PlotsY'              ,
                           value     : 1                     ,
                           minValue  : 1                     ,
                           maxValue  : 20                    ,
                           style     : setButtonColor('white'),      
                           listeners : {
                                        change: function( thisSpinner, newValue, oldValue, eOpts )
                                                {
                                                 theCanvasModel_.setnDivY(currentCanvas_, newValue);
                                                }
                                       }
                          }
                         ) ;
 //-----------------------------------------------------------------------------------------------
 var refreshIntervalSpinbox = Ext.create(
                                         'Ext.form.field.Number',
                                         {
                                          xtype           : 'numberfield'     ,
                                          width           : 100               ,
                                          height          : 10                ,
                                          fieldLabel      : 'Interval'        ,
                                          labelWidth      : 45                ,
                                          name            : 'updateInterval'  ,
                                          value           : 2.000             ,
                                          minValue        : 0.50              ,
                                          maxValue        : 90.000            ,
                                          allowDecimals   : true              ,
                                          tooltip         : 'Refresh interval',
                                          decimalPrecision: 2
                                         }
                                        );                                                         
 //-----------------------------------------------------------------------------------------------
 function makeROOTControlsPanel()
 {
  if( ROOTControlsPanel_ ) ROOTControlsPanel_.destroy() ;
  ROOTControlsPanel_ = Ext.create(
                                  'Ext.panel.Panel',
                                  {
                                   region      : 'east'              ,
                                   id          : 'east-panel'        ,
                                   title       : 'ROOT Controls'     ,
                                   split       : true                ,
                                   width       : 110                 ,
                                   minWidth    : 100                 ,
                                   maxWidth    : 400                 ,
                                   collapsible : true                ,
                                   collapsed   : true                ,
                                   animCollapse: true                ,
                                   margins     : '0 0 0 5'           ,
                                   layout      : 'accordion'         ,
                                   items       : [
                                                  {
                                                   title     : 'Canvas'                                      ,
                                                   autoScroll: true                                          ,
                                                   layout    : 'vbox'                                        ,
                                                   tooltip   : 'Canvas controls'                             ,
                                                   tools     : [
                                                                {
                                                                 type      : 'next'                          ,  
                                                                 tooltip   : 'Maximize canvas size'          ,
                                                                 handler   : function()
                                                                             {
                                                                              STDLINE("Collapsing") ;
                                                                              theNavigatorPanel_  .collapse() ; 
                                                                              ROOTControlsPanel_  .collapse() ; 
                                                                              theInformationPanel_.collapse() ; 
                                                                             }
                                                                }
                                                               ],
                                                   items     : [
                                                                {
                                                                 xtype     : 'button'               ,
                                                                 text      : 'Add canvas'           ,
                                                                 tooltip   : 'Add a new canvas'     ,
                                                                 width     : 100                    ,
                                                                 height    : 20                     ,
                                                                 pressed   : true                   ,
                                                                 border    : true                   ,
                                                                 style     : setButtonColor('white'), 
                                                                 handler   : function()
                                                                             {
                                                                              var addIndex   = globalCanvas_.items.length                      ;
                                                                              currentCanvas_ = addIndex  + 1                                   ;
                                                                              theCanvasModel_.addCanvas()                                      ;
                                                                              generateDIVPlaceholderSize(getCanvasDiv_(currentCanvas_),350,440);          
                                                                              changeHistogramPanelSize(
                                                                                                       'canvas'+currentCanvas_      , 
                                                                                                       theCanvasModel_.currentWidth , 
                                                                                                       theCanvasModel_.currentHeight, 
                                                                                                       "resized"
                                                                                                      ) ;
                                                                              globalCanvas_.insert(
                                                                                                   addIndex,
                                                                                                   {
                                                                                                    contentEl : getCanvasDiv_(currentCanvas_),
                                                                                                    title     : 'Canvas ' +  currentCanvas_  ,
                                                                                                    closable  : true                         ,
                                                                                                    border    : true                         ,
                                                                                                    autoScroll: true
                                                                                                   }
                                                                                                  );
                                                                              globalCanvas_.setActiveTab(addIndex)                            ;
                                                                              STDLINE("Adding new canvas tab")                                ;
                                                                             }
                                                                }, {
                                                                 xtype     : 'button'                                       ,
                                                                 text      : 'Clear canvas'                                 ,
                                                                 pressed   : true                                           ,
                                                                 width     : 100                                            ,
                                                                 height    : 20                                             ,
                                                                 tooltip   : 'Clear the current canvas content but do not'  +
                                                                             ' reset the list of displayed plots'           ,
                                                                 border    : true                                           ,
                                                                 style     : setButtonColor('white')                        , 
                                                                 handler   : function()  
                                                                             {
                                                                              JSROOT.cleanup(getCanvasDiv_(   currentCanvas_));
                                                                              theCanvasModel_.resetCurrentPad(currentCanvas_ );
                                                                              theCanvasModel_.dump(          (currentCanvas_ ),
                                                                                                              "Clear canvas" );
                                                                             }
                                                                }, {
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Reset canvas'                               ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Clear the canvas container in memory AND '  +
                                                                             'the canvas display'                         ,
                                                                 border    : true                                         ,
                                                                 style     : setButtonColor('white')                      ,   
                                                                 handler   : function()  
                                                                             {
                                                                              JSROOT.cleanup(getCanvasDiv_(currentCanvas_));
                                                                              theCanvasModel_.clearCanvas (currentCanvas_) ;
                                                                              theCanvasModel_.dumpContent ("Reset canvas") ;
                                                                             }
                                                                }, {
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Redraw canvas'                              ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Clear the canvas container in memory but '  +
                                                                             'not the canvas display'                     ,
                                                                 border    : true                                         ,
                                                                 style     : setButtonColor('white')                      ,   
                                                                 handler   : function()  
                                                                             {
                                                                              redrawCanvas() ;
                                                                             }
                                                                }, {
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Dump canvas'                                ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Clear the current canvas content'           ,
                                                                 border    : true                                         ,
                                                                 style     : setButtonColor('white')                      ,  
                                                                 handler   : function()  
                                                                             {
                                                                              theCanvasModel_.dump(currentCanvas_         ,
                                                                                                   "Dump canvas"         ) ;
                                                                             }
                                                                },                             
                                                                nDivXCB,
                                                                nDivYCB,
                                                                {
                                                                 defaultType: 'checkbox'                                  ,
                                                                 border     : false                                       ,  
                                                                 style      : setButtonColor('white')                     ,    
                                                                 items      : [
                                                                               {
                                                                                boxLabel  : 'Superimpose'                 ,  
                                                                                name      : 'superimpose'                 ,  
                                                                                inputValue: superimposeFlag_              ,  
                                                                                id        : 'superimpose'                 ,  
                                                                                checked   : superimposeFlag_              ,  
                                                                                handler   : function(thisCheckbox,status)
                                                                                            {
                                                                                             superimposeFlag_ = status     ; 
                                                                                             STDLINE("Superimpose: "+
                                                                                                     superimposeFlag_)     ; 
                                                                                            } 
                                                                               }
                                                                              ]
                                                                },{
                                                                 xtype     : 'button'                                     ,
                                                                 text      : 'Normalize'                                  ,
                                                                 pressed   : true                                         ,
                                                                 width     : 100                                          ,
                                                                 height    : 20                                           ,
                                                                 tooltip   : 'Set Y axis to highest number of entires '   +
                                                                             '(+10%) of selected histograms'              ,
                                                                 border    : true                                         ,
                                                                 style     : setButtonColor('white')                      ,  
                                                                 handler   : function()  
                                                                             {
                                                                              STDLINE("Going to normalize")               ;
                                                                              theCanvasModel_.dumpContent ("Normalize")   ;
                                                                             }
                                                                }
                                                               ]
                                                  }, {
                                                   title     : 'Timing'                                                   ,
                                                   html      : '<p>Controls the periodic update/refresh of canvases.</p>' ,
                                                   autoScroll: true                                                       ,
                                                   //padding   : '5 5 5 5'                                                  ,
                                                   iconCls   : 'info'                                                     ,
                                                   items     : [
                                                                refreshIntervalSpinbox                                    ,
                                                                {
                                                                 xtype       : 'button'                                   ,
                                                                 text        : 'Start'                                    ,
                                                                 pressed     : true                                       ,
                                                                 style       : setButtonColor('white')                    ,  
                                                                 tooltip     : 'Start periodic update of histograms'      ,
                                                                 border      : true                                       ,
                                                                 handler     : function()
                                                                               {
                                                                                var t = refreshIntervalSpinbox.getValue() ;
                                                                                t *= 1000                                 ; // From msec to sec
                                                                                LIVERunning_ = true                       ;
                                                                                redrawCanvas()                            ;
                                                                                periodicPlotID_[currentCanvas_] = setInterval(
                                                                                                                              function()
                                                                                                                              {
                                                                                                                               STDLINE("Launching Ajax Request with refresh time: "+t) ;
                                                                                                                               redrawCanvas() ;
                                                                                                                              },
                                                                                                                              t
                                                                                                                             ) ;
                                                                               }
                                                                },
                                                                {
                                                                 xtype       : 'button'                                       ,
                                                                 text        : 'Stop'                                         ,
                                                                 pressed     : true                                           ,
                                                                 style       : setButtonColor('white')                        ,  
                                                                 tooltip     : 'Stop refreshing of histograms'                ,
                                                                 border      : true                                           ,
                                                                 handler     : function()
                                                                               {
                                                                                var v = refreshIntervalSpinbox.getValue()     ;
                                                                                STDLINE("Clearing timeout: "+v) ;
                                                                                clearInterval(periodicPlotID_[currentCanvas_]);
                                                                                LIVERunning_ = false                          ;
                                                                                var thisB = Ext.getCmp('liveDQM-ID')          ;
                                                                                thisB.getEl().setStyle('background', 'red')   ;
                                                                               }
                                                                }
                                                               ]
                                                  }, {
                                                   title     : 'Navigator'                                                   ,
                                                   autoScroll: true                                                          ,
                                                   //padding   : '5 5 5 5'                                                     ,
                                                   iconCls   : 'info'                                                        ,
                                                   items     : [
                                                                {
                                                                 defaultType: 'checkbox'                                     ,
                                                                 border     : false                                          ,
                                                                 style      : setButtonColor('white')                        , 
                                                                 items      : [
                                                                               {
                                                                                boxLabel  : 'Debugger'                       ,
                                                                                name      : 'debugger'                       ,
                                                                                inputValue: enableDebug_                     ,
                                                                                id        : 'debugger'                       ,
                                                                                checked   : enableDebug_                     ,
                                                                                handler   : function(thisCheckbox,status)
                                                                                            {
                                                                                             enableDebug_ = status            ;
                                                                                             enableSTDLINE(enableDebug_)      ;
                                                                                            } 
                                                                               }
                                                                              ]
                                                                }
                                                               ]
                                                  }
                                                 ]
                                  }
                                 );
//                                  );               

 } ; 
 
 //-----------------------------------------------------------------------------------------------
 function makeGlobalCanvas()
 {
  STDLINE("Creating central panel (with canvas tabs)" ) ;
  if( globalCanvas_ ) globalCanvas_.destroy() ;
  globalCanvas_ = Ext.create(
                             'Ext.tab.Panel', 
                             {
                              id            : 'globalCanvas',
                              region        : 'center'      ,
                              deferredRender: false         ,
                              activeTab     : 0             ,
                              items         : canvasTabs_   ,
                              listeners     : {
                                               tabchange : function(thisPanel, newCard, oldCard, eOpts ) 
                                                           {
                                                            var matches    = newCard.title.match(/Canvas (\d+)/)      ; 
                                                            currentCanvas_ = matches[1]                               ; 
                                                            changeHistogramPanelSize(
                                                                                     newCard                          , 
                                                                                     newCard.getWidth()               , 
                                                                                     newCard.getHeight()              , 
                                                                                     "resized"
                                                                                    ) ;
                                                           },
                                               resize    : function(thisPanel, width, height, oldWidth, oldHeight, eOpt)
                                                           {                                                           ;
                                                            STDLINE("Resizing "+getCanvasDiv_(currentCanvas_))         ;
                                                            theCanvasModel_.currentWidth  = width                      ;
                                                            theCanvasModel_.currentHeight = height                     ;
                                                            changeHistogramPanelSize(
                                                                                     thisPanel                        ,
                                                                                     width                            ,
                                                                                     height                           ,
                                                                                     "resized"
                                                                                    )                                  ;
                                                            redrawCanvas()                                             ;
                                                           }
                                              }
                             }
                            )
 }
 
 //-----------------------------------------------------------------------------------------------
 function makeNavigatorPanel()
 {

  if( theNavigatorPanel_ ) theNavigatorPanel_.destroy() ;
  theNavigatorPanel_ = Ext.create(
                                  'Ext.panel.Panel',
                                  {
                                   region      : 'west'               ,
                                   stateId     : 'navigation-panel'   ,
                                   id          : 'west-panel'         ,
                                   title       : 'The navigator'      ,
                                   split       : true                 ,
                                   width       : 200                  ,
                                   minWidth    : 175                  ,
                                   maxWidth    : 1000                 ,
                                   collapsible : true                 ,
                                   animCollapse: true                 ,
                                   margins     : '0 0 0 5'            ,
                                   layout      : {
                                                  type   : 'accordion',
                                                  multi  : true       ,
                                                  animate: true       ,
                                                  fill   : true
                                                 },
                                   tools       : [
                                                  {
                                                   type   : 'maximize'                      ,
                                                   tooltip: 'Expand all auxuliary panels'   ,
                                                   handler: function()
                                                            {
                                                             STDLINE("Expanding")           ;
                                                             theNavigatorPanel_  .expand()  ;
                                                             ROOTControlsPanel_  .expand()  ;
                                                             theInformationPanel_.expand()  ;
                                                            }
                                                  },
                                                  {
                                                   type   : 'minimize'                      ,
                                                   tooltip: 'Collapse all auxuliary panels' ,
                                                   handler: function()
                                                            {
                                                             STDLINE("Expanding")           ;
                                                             theNavigatorPanel_  .collapse();
                                                             ROOTControlsPanel_  .collapse();
                                                             theInformationPanel_.collapse();
                                                            }
                                                  }
                                                 ],
                                   items       : [
                                                  {
                                                   title      : 'FileSystem navigation'                                                    ,
                                                   id         : 'navigatorDiv'                                                             ,
                                                   autoScroll : true                                                                       ,
                                                   collapsible: true                                                                       ,
                                                   collapsed  : false                                                                      ,
                                                   tools      : [
                                                                 {
                                                                  type   : 'prev'                                                          ,
                                                                  tooltip: 'Go back to list of folders and files'                          ,
                                                                  handler: function()
                                                                           {
                                                                            if( currentTree_ = 'fileContent' )
                                                                            {
                                                                             selectedItem_ = "getDirectories"                               ;
                                                                             var thePad    = theCanvasModel_.getCurrentPadC(currentCanvas_) ;
                                                                             makeStore(
                                                                                       theProvenance_.getRootPath(
                                                                                                                  currentCanvas_           ,
                                                                                                                  thePad
                                                                                                                 ),
                                                                                       'RequestType=getMeDirs'  
                                                                                      ) ;
                                                                             makeGrid (
                                                                                       theProvenance_.getRootPath(
                                                                                                                  currentCanvas_           ,
                                                                                                                  thePad
                                                                                                                 ),
                                                                                       'Directories and files'    
                                                                                      ) ;
                                                                            }
                                                                           }
                                                                 },
                                                                 {
                                                                  type   : 'down'                 ,
                                                                  tooltip: 'Expand folders'       ,
                                                                  handler: function()
                                                                           {
                                                                            grid_.expandAll()     ;
                                                                           }
                                                                 },
                                                                 {
                                                                  type   : 'up'                   ,
                                                                  tooltip: 'Collapse folders'     ,
                                                                  handler: function()
                                                                           {
                                                                            grid_.collapseAll()   ;
                                                                           }
                                                                 }
                                                                ]
                                                  }, 
                                                  {
                                                   title      : 'Plot options (1D)'                                  ,
                                                   html       : '<p>Options available for 1D histogramming.</p>'     ,
                                                   autoScroll : true                                                 ,
                                                   collapsible: true                                                 ,
                                                   collapsed  : true                                                 ,
                                                   iconCls    : 'settings'                                           ,
                                                   items      : optionsBodies1D_                                   
                                                  }, 
                                                  {
                                                   title      : 'Plot options (2D)'                                  ,
                                                   html       : '<p>Options available for 2D histogramming.</p>'     ,
                                                   autoScroll : true                                                 ,
                                                   collapsible: true                                                 ,
                                                   collapsed  : true                                                 ,
                                                   iconCls    : 'info'                                               ,
                                                   items      : optionsBodies2D_                                   
                                                  }, 
                                                  {
                                                   title      : 'Plot options (3D)'                                  ,
                                                   html       : '<p>Options available for 3D histogramming.</p>'     ,
                                                   autoScroll : true                                                 ,
                                                   collapsible: true                                                 ,
                                                   collapsed  : true                                                 ,
                                                   iconCls    : 'info'                                               ,
                                                   items      : optionsBodies3D_                                   
                                                  }
                                                 ],
                                   listeners   : {
                                                  collapse    : function() 
                                                                {
                                                                 STDLINE("Collapse!!!");
                                                                },
                                                  expand      : function() 
                                                                {
                                                                 STDLINE("Expand!!!"  );
                                                                }
                                                 }
                                  },
                                 ) ;
 }
 
 //-----------------------------------------------------------------------------------------------
 var theStatusBar_ = Ext.create(
                                'Ext.ux.StatusBar', 
                                {
                                 id            : 'my-status'   ,
                                 defaultText   : 'Ready'       ,
                                 text          : 'Ready'       ,
                                 iconCls       : 'x-status-valid'  
//                                  items         : [
//                                                   {
//                                                     text: 'A Button'
//                                                   }, 
//                                                   '-', 
//                                                   'Current canvas'
//                                                  ]
                                }
                               );
 //-----------------------------------------------------------------------------------------------
 function displayStatus(message) 
 {
  theStatusBar_.clearStatus({useDefaults:true}); 
  theStatusBar_.showBusy() ;
  theStatusBar_.setStatus(
                          {
                           text   : message  ,
                           //icon   : '../images/load.gif',
                           //iconCls: 'ok-icon',
                           //clear  : true      // auto-clear after a set interval
                          }
                         );
 }
 //-----------------------------------------------------------------------------------------------
 function makeInformationPanel()
 {
  if( theInformationPanel_ ) theInformationPanel_.destroy() ;
  theInformationPanel_ = Ext.create(
                                    'Ext.panel.Panel',
                                    {
                                     region      : 'south'            ,
                                     contentEl   : 'south'            ,
                                     split       : true               ,
                                     height      : 50                 ,
                                     minSize     : 20                 ,
                                     maxSize     : 200                ,
                                     collapsible : true               ,
                                     collapsed   : false              ,
                                     bbar        : theStatusBar_      ,
                                     html        : 'Panel initialized',
                                     title       : 'Status bar'       ,
                                     margins     : '0 0 0 0'
                                    },
                                   ) ;
 }

 //-----------------------------------------------------------------------------
 function makeConfigStore()
 {
  if( configStore_ ) configStore_.destroy() ;
  var nc = theCanvasModel_.canvases.length ;
  configStore_ = Ext.create(
                            'Ext.data.Store', 
                            {
                             storeId:'configDataStore',
                             fields :['Parameter', 'Component', 'value'],
                             data   :{
                                      'items': [
                                                {'Parameter': 'Number of canvases', "Component":"canvas",  "value": nc  },
                                                {'Parameter': '# of plots (X)'    , "Component":"canvas",  "value": "1" },
                                                {'Parameter': '# of plots (Y)'    , "Component":"canvas",  "value": "1" }
                                               ]
                                     },
                             proxy : {
                                      type  : 'memory',
                                      reader: {
                                               type: 'json',
                                               root: 'items'
                                              }
                                     }
                            }
                           );

  if( configPanel_ ) configPanel_.destroy() ;
  configPanel_ = Ext.create(
                            'Ext.grid.Panel', 
                            {
                             title   : 'Current configuration parameters',
                             store   : Ext.data.StoreManager.lookup('configDataStore'),
                             columns : [
                                        { text: 'Parameter', dataIndex: 'Parameter'          },
                                        { text: 'Component', dataIndex: 'Component', flex: 1 },
                                        { text: 'value'    , dataIndex: 'value'              }
                                       ],
                            }
                           );
 }
 
 //-----------------------------------------------------------------------------
 function makeConfigWin() 
 {
  makeConfigStore() ;
  Ext.getCmp('saveConfig-ID').setDisabled(true);
  if( theConfigWin_ ) theConfigWin_.destroy() ;
  theConfigWin_ = Ext.create(
                             'Ext.window.Window', 
                             {
                              title    : 'The configuration manager',
                              height   : 486                        ,
                              width    : 606                        ,
                              //layout   : 'fit'                      ,
                              margins  : '5 5 5 5'                  ,
                              padding  : '5 5 5 5'                  ,
                              items    : [
                                          {
                                           xtype  : 'button'            ,
                                           name   : 'cucu'              ,
                                           text   : 'Dump configuration',
                                           pressed: 'true'              ,
                                          },
                                          configPanel_
                                         ],
                              listeners: {
                                          beforedestroy: function()
                                                         {
                                                          Ext.getCmp('saveConfig-ID').setDisabled(false);
                                                         }
                                         }
                             }
                            ) ;
  theConfigWin_.setPosition(0,52) ;
  theConfigWin_.show()            ;      
 }
 
 //-----------------------------------------------------------------------------
 function createSources(dirs)
 {
  theSources_   = Ext.create(
                             'Ext.data.Store', 
                             {
                              fields: ['abbr', 'dir'],
                              data  : dirs
                             }
                            );
  theSourcesCB_ = Ext.create(
                             'Ext.form.ComboBox', 
                             {
                              id          : 'source'    ,
                              fieldLabel  : 'Source:'   ,
                              labelWidth  : 45          ,
                              height      : 25          ,
                              width       : 200         ,
                              store       : theSources_ ,
                              queryMode   : 'local'     ,
                              displayField: 'dir'       ,
                              valueField  : 'abbr'      ,
                              renderTo    : 'sourcesDiv',
                              listeners   : {
                                             select    : function(thisCombo, record, eOpts)
                                                         {
                                                          Ext.getCmp('navigatorDiv').expand()                              ;
                                                          var thisRootPath = record.data.dir                               ;
                                                          var thePad       = theCanvasModel_.getCurrentPadC(currentCanvas_);
                                                          var flag         = ''                                            ;
                                                          if( theConfigWin_ ) theConfigWin_.destroy()                      ;
                                                          theProvenance_.clearAll(currentCanvas_,thePad                   );
                                                          theProvenance_.setRootPath(thisRootPath,
                                                                                     currentCanvas_                       ,
                                                                                     thePad                               );
                                                          if(thisRootPath == "LIVE_DQM.root")
                                                          {
                                                           makeStore(thisRootPath, 
                                                                     'RequestType=getMeLIVE-DQMFile'                      );
                                                          }
                                                          else
                                                          {
                                                           selectedItem_ = "getDirectories"                                ;
                                                           makeStore(thisRootPath, 
                                                                     'RequestType=getMeDirs'                              );
                                                          }
                                                          makeGrid (
                                                                    thisRootPath                                          ,              
                                                                    'Directories and files'                               
                                                                   )                                                       ;
                                                         },
                                             focusleave: function (thisCombo) 
                                                         {
                                                          theSourcesCB_.suspendEvent('select'                             );
                                                         },
                                             focusenter: function (thisCombo) 
                                                         {
                                                          thisCombo.resumeEvent('select'                                  );
                                                          theSourcesCB_.resumeEvent('select'                              );
                                                         }
                                            }
                             }
                            );
 
  theSourcesCB_.setRawValue(dirs[0].dir) ; // Set default value
 
  if( theSourcesComboBox_ ) theSourcesComboBox_.destroy() ;
  theSourcesComboBox_ = Ext.create(
                                   'Ext.panel.Panel',
                                   {
                                    region      : 'north'                ,
                                    stateId     : 'sources-panel'        ,
                                    id          : 'north-panel'          ,
                                    title       : 'Please, select a '    +
                                                  'histogram repository '+
                                                  'from the "source" '   +
                                                  'combo box below'      ,
                                    split       : true                   ,
                                    width       : 200                    ,
                                    minWidth    : 175                    ,
                                    maxWidth    : 3000                   ,
                                    collapsible : false                  ,
                                    animCollapse: true                   ,
                                    multi       : true                   ,
                                    layout      : 'hbox'                 ,
                                    items       : [ 
                                                   theSourcesCB_,
                                                   {
                                                    xtype     : 'button'                  ,
                                                    id        : 'saveConfig-ID'           ,
                                                    text      : 'Configuration manager'   ,
                                                    tooltip   : 'A window with all the '  +
                                                                'tools to manage the '    +
                                                                ' current visualizer '    +
                                                                'aspect and functionality',
                                                    width     : 130                       ,
                                                    height    : 20                        ,
                                                    pressed   : true                      ,
                                                    border    : true                      ,
                                                    style     : setButtonColor('white')   ,  
                                                    handler   : makeConfigWin
                                                   },
                                                   {
                                                    xtype     : 'button'                  ,
                                                    id        : 'help-ID'                 ,
                                                    text      : 'Help'                    ,
                                                    tooltip   : 'Help window'             ,
                                                    width     : 40                        ,
                                                    height    : 20                        ,
                                                    pressed   : true                      ,
                                                    border    : true                      ,
                                                    style     : setButtonColor('white')   ,
                                                    handler   : function()
                                                                {
                                                                 if( theConfigWin_ ) theConfigWin_.destroy();
                                                                 alert("Sorry, not implemented yet");
                                                                }
                                                   },
                                                   {
                                                    xtype     : 'button'                  ,
                                                    id        : 'liveDQM-ID'              ,
                                                    text      : 'LIVE'                    ,
                                                    tooltip   : 'Toggle from static to '  +
                                                                'automatic refresh'       ,
                                                    width     : 40                        ,
                                                    height    : 20                        ,
                                                    pressed   : true                      ,
                                                    border    : true                      ,
                                                    style     : setButtonColor('red')     ,
                                                    listeners : {
                                                                 click: function() 
                                                                        {
                                                                         var thisB = Ext.getCmp('liveDQM-ID');
                                                                         if( LIVERunning_ )
                                                                         {
                                                                          clearInterval(periodicPlotID_[currentCanvas_]);
                                                                          thisB.getEl().setStyle('background', 'red');
                                                                          LIVERunning_ = false                       ;
                                                                         }
                                                                         else
                                                                         {
                                                                          var t = refreshIntervalSpinbox.getValue() ;
                                                                          t *= 1000                                 ; // From msec to sec
                                                                          LIVERunning_ = true                       ;
                                                                          redrawCanvas()                            ;
                                                                          periodicPlotID_[currentCanvas_] = setInterval(
                                                                                                                        function()
                                                                                                                        {
                                                                                                                         STDLINE("Launching Ajax Request with refresh time: "+t) ;
                                                                                                                         redrawCanvas() ;
                                                                                                                        },
                                                                                                                        t
                                                                                                                       ) ;
                                                                          thisB.getEl().setStyle('background', 'green');
                                                                         }
                                                                        }
                                                                }
                                                   },
                                                   {
                                                    xtype     : 'button'                       ,
                                                    id        : 'resetButton'                  ,
                                                    text      : 'Reset'                        ,
                                                    tooltip   : 'Reset canvas divisions to 1x1',
                                                    width     : 45                             ,
                                                    height    : 20                             ,
                                                    pressed   : true                           ,
                                                    border    : true                           ,
                                                    style     : setButtonColor('green')        ,
                                                    listeners : {
                                                                 click: function() 
                                                                        {
                                                                         displayZones(1) ;
                                                                        }
                                                                }
                                                   }
                                                  ]
                                   }
                                  ) ;
 }
 //-----------------------------------------------------------------------------------------------
 function makeViewPort() 
 {
  if( theViewPort_ ) theViewPort_.destroy() ;
  var calleName = getCalleName(arguments.callee) ;
  STDLINE("Creating viewport for "+calleName) ;
  theViewPort_ = Ext.create(
                            'Ext.Viewport'                            , 
                            {
                             id    : 'border-example'                 ,
                             layout: 'border'                         ,
                             items : [
                                      theSourcesComboBox_             ,
                                      theInformationPanel_            ,
                                      ROOTControlsPanel_              ,
                                      theNavigatorPanel_              ,
                                      globalCanvas_ 
                                     ]
                            }
                           );
  theViewPort_.setPosition(0,0) ;
 } ;
 //-----------------------------------------------------------------------------
 function displayZones(total)
 {
  var nx = 1 ;
  var ny = 1 ;
  if( total ==  1 ) {nx =  1; ny =  1;}
  if( total ==  2 ) {nx =  2; ny =  1;}
  if( total ==  3 ) {nx =  3; ny =  1;}
  if( total ==  4 ) {nx =  2; ny =  2;}
  if( total ==  5 ) {nx =  3; ny =  2;}
  if( total ==  6 ) {nx =  3; ny =  2;}
  if( total ==  7 ) {nx =  3; ny =  3;}
  if( total ==  8 ) {nx =  3; ny =  3;}
  if( total ==  9 ) {nx =  3; ny =  3;}
  if( total == 10 ) {nx =  4; ny =  3;}
  if( total == 11 ) {nx =  4; ny =  3;}
  if( total == 12 ) {nx =  4; ny =  3;}
  theCanvasModel_.setnDivX(currentCanvas_, nx) ;
  theCanvasModel_.setnDivY(currentCanvas_, ny) ;
  Ext.getCmp('nPlotsX').setValue(nx) ;
  Ext.getCmp('nPlotsY').setValue(ny) ;
 }
 //-----------------------------------------------------------------------------
 function makeGrid(where,what)
 { 
  STDLINE("===> makeGrid <============") ;
  STDLINE("makeGrid("+where+","+what+")") ;
  if( grid_ ) grid_.destroy()     ;
  theStore_.sort(treeDisplayField_, 'ASC');

  STDLINE("Creating grid") ;
  grid_ = Ext.create(
                     'Ext.tree.Panel', 
                     {
                      title      : what                  ,
                      width      : 1200                  ,
                      header     : false                 ,
                      id         : 'navigator'           ,
                      store      : theStore_             ,
                      resizable  : true                  ,
                      border     : true                  ,
                      renderTo   : "navigatorDiv-innerCt",
                      rootVisible: false                 ,
                      useArrows  : true                  ,
                      scrollable : true                  ,
                      selModel   : {
                                    mode : 'MULTI' // SIMPLE or MULTI
                                   },
                      plugins    : [
                                    {
                                     ptype: 'bufferedrenderer'
                                    }
                                   ],
                      columns    : [
                                    {
                                     xtype    : 'treecolumn'    ,
                                     id       : 'provenance'    ,
                                     text     : what            ,
                                     flex     : 1               ,
                                     dataIndex: 'fDisplayName'  ,                                     
                                     listeners: {
                                                 focus: function()
                                                        {
                                                         alert(what) ;
                                                        }
                                                }
                                    }, 
                                    { 
                                     xtype    : 'treecolumn'    ,
                                     hidden   : false           ,
                                     text     : 'type'          ,
                                     width    : 1               ,
                                     dataIndex: 'leaf'          ,
//                                      renderer : function (value, metaData, record, rowIndex, colIndex, theStore, view) 
//                                                 {
//                                                  if( value )
//                                                  {
//                                                   metaData.style = 'background-image: url(../images/histogram2d.gif)';
//                                                  }
//                                                  return view.panel.columns[colIndex].defaultRenderer(value, metaData, record); ;
//                                                 }
//         
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
                                     xtype    : 'treecolumn'    ,
                                     hidden   : false           ,
                                     text     : 'fFileName'     ,
                                     width    : 1               ,
                                     dataIndex: 'fFileName'                
                                    }, 
                                    { 
                                     xtype    : 'treecolumn'    ,
                                     hidden   : false           ,
                                     text     : 'fRFoldersPath' ,
                                     width    : 1               ,
                                     dataIndex: 'fRFoldersPath'                
                                    }, 
                                    { 
                                      xtype    : 'treecolumn'   ,
                                      hidden   : false          ,
                                      text     : 'fHistName'    ,
                                      width    : 1              ,
                                      dataIndex: 'fHistName'                
                                     }
                                   ],
                      listeners  : {
                                    render         : function(thisPanel, eOpt)
                                                     {
                                                      //alert("rendering...") ;
                                                     },
                                    cellcontextmenu: function(thisTree, td, cellIndex, record, tr, rowIndex, e, eOpts)
                                                     {
                                                      if(!(selectedItem_.match(/getMeLIVE|getRootObject/))) 
                                                      {
                                                       e.stopEvent() ; // Stop propagation to the browser 
                                                       return ;
                                                      }
                                                      var nPlots=0;
                                                      for(var i=0; i<record.childNodes.length; i++)
                                                      {
                                                       if(record.childNodes[i].data.leaf) nPlots++ ;
                                                      }
                                                      displayZones(nPlots) ;
                                                      var thePad = theCanvasModel_.getCurrentPad(currentCanvas_);
                                                      var pad = 0 ;
                                                      theProvenance_.clearAll() ;
                                                      for(var i=0; i<record.childNodes.length; i++)
                                                      {
                                                       if(!record.childNodes[i].data.leaf) {continue;}
                                                       var r = record.childNodes[i].data ;
                                                       var fullPath = "" ;
                                                       if(selectedItem_.match(/getMeLIVE/))
                                                       {
                                                        fullPath = "/" +
                                                                   r.fRootPath     +
                                                                   "/"             +
                                                                   r.fRFoldersPath +
                                                                   r.fHistName     ;
                                                       }
                                                       else
                                                       {
                                                        if (typeof r.fFoldersPath === 'undefined') {r.fFoldersPath="";}
                                                        fullPath = "/" +
                                                                   r.fRootPath     +
                                                                   "/"             +
                                                                   r.fFoldersPath  +
                                                                   r.fFileName     + 
                                                                   "/"             +
                                                                   r.fRFoldersPath +
                                                                   r.fHistName     ;
                                                       }
                                                       theProvenance_.setSystemPath  (r.fSystemPath  ,
                                                                                      currentCanvas_ ,
                                                                                      pad             );
                                                       theProvenance_.setRootPath    (r.fRootPath    ,
                                                                                      currentCanvas_ ,
                                                                                      pad             );
                                                       theProvenance_.setFoldersPath (r.fFoldersPath ,
                                                                                      currentCanvas_ ,
                                                                                      pad             );
                                                       theProvenance_.setRFoldersPath(r.fRFoldersPath,
                                                                                      currentCanvas_ ,
                                                                                      pad             );
                                                       theProvenance_.setHistName    (r.fHistName    ,
                                                                                      currentCanvas_ ,
                                                                                      pad             );
                                                       theProvenance_.setFileName    (r.fFileName    ,
                                                                                      currentCanvas_ ,
                                                                                      pad             );
                                                       theAjaxRequest(
                                                                      _requestURL+"RequestType=getRoot",
                                                                      {                                                       
                                                                       CookieCode: DesktopContent._cookieCodeMailbox,         
                                                                       RootPath  : fullPath                                 
                                                                      }, 
                                                                      "",
                                                                      pad ,
                                                                      true
                                                                     ) ;
                                                       pad++ ;
                                                      }
                                                      e.stopEvent() ; // Stop propagation to the browser                                                      
                                                     },
                                    expand         : function(expandedItem, options) 
                                                     {
                                                      STDLINE("expanded") ;
                                                     },  
                                    itemmouseenter : function(thisObj, record, item, index, e, eOpts )
                                                     {
                                                      displayStatus("Ci entro:") ;
                                                     },                                 
                                    itemclick      : function(thisItem, record, item, index, e, eOpts)
                                                     {
                                                      var selection = this.getSelection()                                    ;
                                                      STDLINE("Selected "+selection.length+" items")                         ;
                                                      var thePad = theCanvasModel_.getCurrentPad(currentCanvas_)             ;
                                                      STDLINE("thePad       : "+thePad                   )                   ;     
                                                      STDLINE("selectedItem_: "+selectedItem_            )                   ;     
                                                      STDLINE("Selected     : "+selection.length+" items")                   ;
                                                      theProvenance_.clearAll(currentCanvas_,thePad) ;
                                                      for(var i=0; i<selection.length; i++)  
                                                      {  
                                                       theProvenance_.setSystemPath  (selection[i].data.fSystemPath        ,
                                                                                      currentCanvas_                       ,
                                                                                      thePad                                );
                                                       theProvenance_.setRootPath    (selection[i].data.fRootPath          ,
                                                                                      currentCanvas_                       ,
                                                                                      thePad                                );
                                                       theProvenance_.setFoldersPath (selection[i].data.fFoldersPath       ,
                                                                                      currentCanvas_                       ,
                                                                                      thePad                                );
                                                       theProvenance_.setFileName    (selection[i].data.fFileName          ,
                                                                                      currentCanvas_                       ,
                                                                                      thePad                                );
                                                       theProvenance_.setRFoldersPath(selection[i].data.fRFoldersPath      ,
                                                                                      currentCanvas_                       ,
                                                                                      thePad                                );
                                                       theProvenance_.setHistName    (selection[i].data.fHistName          ,
                                                                                      currentCanvas_                       ,
                                                                                      thePad                                );
                                                      } 
                                                      theProvenance_.dumpAll("Selected plot to display") ; 
//                                                      theCanvasModel_.dumpContent("Clicked on item "+selectedItem_)                                     ;
                                                      var itemSplit     = item.innerText.split("\n\t\n")                     ;     
                                                      var isLeaf        = itemSplit[1].replace("\n","").replace("\t","")     ;     
                                                      if( isLeaf == "true" ) 
                                                      {
                                                       if( selectedItem_ == "getDirectories" )
                                                       {
                                                        treeDisplayField_  = 'fDisplayName'                                  ;     
                                                        selectedItem_      = "getRootObject"                                 ;     
                                                        currentTree_       = 'fileContent'                                   ;     
                                                        STDLINE("Paths: "+  theProvenance_.getPathsNumber(thePad))           ;     
                                                        currentDirectory_ = theProvenance_.getSystemPath (currentCanvas_,
                                                                                                          thePad)           +      
                                                                            '/'                                             +      
                                                                            theProvenance_.getRootPath   (currentCanvas_,
                                                                                                          thePad)           +      
                                                                            "/"                                             +      
                                                                            theProvenance_.getFoldersPath(currentCanvas_,
                                                                                                          thePad)           +      
                                                                            "/"                                             +      
                                                                            theProvenance_.getFileName   (currentCanvas_,
                                                                                                          thePad)            ;     
//                                                        STDLINE('RequestType      : getMeRootFile'     )                     ;   
//                                                        STDLINE('currentDirectory_: '+currentDirectory_)                     ;   
                                                        makeStore(currentDirectory_,'RequestType=getMeRootFile')             ;     
                                                        makeGrid (currentDirectory_,'ROOT file content')    ; 
                                                       }
                                                       else if( selectedItem_ == "getRootObject" || 
                                                                selectedItem_ == "getMeLIVE-DQMFile" )
                                                       { 
//                                                        theProvenance_.dumpAll("getRootObject")                              ;
                                                        STDLINE("Request for thePad: " + thePad)                             ;
                                                        if( selectedItem_ == "getMeLIVE-DQMFile" ) 
                                                        {
                                                         theProvenance_.setFileName  (""                                    ,
                                                                                      currentCanvas_                        ,
                                                                                      thePad                                );
                                                        }
                                                        currentRootObject_  = "/"                                           +      
                                                                              theProvenance_.getRootPath    (currentCanvas_,
                                                                                                             thePad)        +    
                                                                              "/"                                           +      
                                                                              theProvenance_.getFoldersPath (currentCanvas_,
                                                                                                             thePad)        +    
                                                                              theProvenance_.getFileName    (currentCanvas_,
                                                                                                             thePad)        +    
                                                                              "/"                                           +      
                                                                              theProvenance_.getRFoldersPath(currentCanvas_,
                                                                                                             thePad)        +    
                                                                              "/"                                           +      
                                                                              theProvenance_.getHistName    (currentCanvas_,+
                                                                                                             thePad)         ;
                                                        currentRootObject_  = currentRootObject_.replace(/\/\//g, '/' )      ;
                                                        STDLINE('RequestType       : getRootObject'      )                   ;     
                                                        STDLINE('currentRootObject_: '+currentRootObject_)                   ;     
                                                        STDLINE('_requestURL       : '+_requestURL       )                   ;     
//("currentRootObject_: "+currentRootObject_) ;
                                                        theAjaxRequest(
                                                                       _requestURL+"RequestType=getRoot",
                                                                       {                                                           
                                                                        CookieCode: DesktopContent._cookieCodeMailbox,                             
                                                                        RootPath  : currentRootObject_                                
                                                                       }                                             ,
                                                                       ""                                            ,
                                                                       thePad                                        ,
                                                                       true
                                                                      ) ;
                                                       }
                                                      }
                                                      else
                                                      {
                                                       alert("Just clicked on a folder: no function implemented yet") ;
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

 //-----------------------------------------------------------------------------
//   var objectProvenance = Ext.create(
//                                     'Ext.tip.ToolTip', 
//                                     {
//                                      target: 'provenance',
//                                      html  : 'Object provenance: ' + where
//                                     }
//                                    );
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
 function makeStore(path, reqType)
 { 
  STDLINE("===> makeStore <============") ;
  STDLINE("path       : " + path       ) ;
  STDLINE("reqType    : " + reqType    ) ;
  STDLINE("_requestURL: " + _requestURL) ;
  theProvenance_.dumpAll("makeStore"   ) ;
  var thePad = theCanvasModel_.getCurrentPad(currentCanvas_);
  theStore_ = Ext.create(
                         'Ext.data.TreeStore', 
                         {
                          model    : 'DirectoriesDataModel',
                          id       : 'theStore'            ,
                          autoLoad : false                 ,
                          root     : {
                                      expanded     : true
                                     },
                          proxy    : {
                                      type         : 'ajax',
                                      actionMethods: {
                                                      read           : 'POST'
                                                     }, 
                                      extraParams  : { 
                                                      "CookieCode"   : DesktopContent._cookieCodeMailbox                                          ,
                                                      "Path"         : path                                                  ,
                                                      "fRootPath"    : theProvenance_.getRootPath    (currentCanvas_, thePad),
                                                      "fFoldersPath" : theProvenance_.getFoldersPath (currentCanvas_, thePad),
                                                      "fHistName"    : theProvenance_.getHistName    (currentCanvas_, thePad),
                                                      "fRFoldersPath": theProvenance_.getRFoldersPath(currentCanvas_, thePad),
                                                      "fFileName"    : theProvenance_.getFileName    (currentCanvas_, thePad)
                                                     },
                                      url          : _requestURL + reqType,
                                      reader       : {
                                                      type           : 'xml'   ,
                                                      root           : 'nodes' ,
                                                      record         : '> node'
                                                     },
                                     },
                          listeners: {
                                      beforeload   : function(thisStore, operation, eOpts) 
                                                     {
                                                      STDLINE("Request: "+_requestURL + reqType) ;
                                                     },
                                      load         : function( thisStore, records, successful, operation, node, eOpts )
                                                     {
                                                      STDLINE("Load was succesful? "+successful) ;
                                                      if( !successful ) {alert("The state machine returned an error!") ;}
                                                     }
                                     }
                         }
                        );
  STDLINE("Going to load...") ;
  theStore_.load() ;
 }
 
 //-----------------------------------------------------------------------------
 function theAjaxRequest(theRequestURL,
                         theParams,
                         theRawData, 
                         thePad, 
                         updateProvenance)                                                                   
 { 
  displayStatus("Loading data...") ;
  var today = new Date();
  var time  = today.getHours() + ":" + today.getMinutes() + ": "  + today.getSeconds();
  var pad   = 0 ;
  if( updateProvenance )
  {
   pad = theCanvasModel_.getCurrentPad(currentCanvas_);
  }
  else
  {
   pad = theParams.pad ;
  }
  theRequestURL = theRequestURL.replace(/\/\//g, "/") ;
  theRequestURL = theRequestURL.replace(/http:\//, "http://") ;
  STDLINE("====================== AJAX Request begin ===============================");
  STDLINE("Ajax request issued to " + theRequestURL      + " at " + time);
  STDLINE("theParams.RootPath: "    + theParams.RootPath                );
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
                              if( response.responseText.match("An error was encountered"))
                              {
                               var errMsg = response.responseText.match(/<Error value='(.*)?'\/>/) ;
                               Ext.MessageBox.alert(                                                                                      
                                                    'Oops! Something went wrong:',                                                              
                                                    errMsg                                                
                                                   );                                                                                     
                               return ;
                              }
                              if(getXMLValue(response,"headOfSearch") == 'located') // This preforms a request to get the list of data sources.                                                                     
                              {                                                     // Data sources are static directories and/or LIVE_DQM  
                               var dirs     = [] ;                                  // Returns the list of available data sources (fRooPaths)
                               var theNodes = getXMLNodes(response,'dir') ;
                               for(var i=0; i<theNodes.length; ++i)
                               {
                                var theDir = theNodes[i].getAttribute("value")
                                dirs.push({"abbr":  theDir, "dir": theDir}) ;
                               }

                               createSources(dirs) ;
                               makeStore("where","what") ;
                               makeViewPort() ;
                              }                                                                                                         
                              else if(!(typeof getXMLValue(response,"rootType") === 'undefined')) // Returns the plot to display                                                                     
                              { // get specific ROOT Object and display
                               var rootName  = getXMLValue (response,"path"    );              
                               var rootJSON  = getXMLValue (response,"rootJSON");
                               var object    = JSROOT.parse(rootJSON           );
                               if( updateProvenance ) 
                               {
                                theProvenance_.setRequestURL ( theRequestURL ,
                                                               currentCanvas_,
                                                               thePad        );
                                theProvenance_.setParams     ( theParams     ,
                                                               currentCanvas_,
                                                               thePad        );
                                theCanvasModel_.addROOTObject( currentCanvas_,
                                                               object        ,
                                                               theProvenance_);
                               }
                               displayPlot_                  (object, thePad );
                               STDLINE("====================== AJAX Request end ===============================");
                               return ;
                              }
                              if(getXMLValue(response,"dir") == 'LIVE_DQM.root') // Populate the widget with the content of the LIVE_DQM
                              {                                                  // This can be folders, canvases and/or histograms
                               selectedItem_ = "getMeLIVE-DQMFile" ;
                               makeStore('LIVE_DQM.root', 'RequestType=getMeLIVE-DQMFile');
                               makeGrid ('LIVE_DQM.root', 'LIVE_DQM'                     );
                              }                                                                    
                              displayStatus("Done loading data!") ;
                              STDLINE("====================== AJAX Request end ===============================");
                             },                                                                                                           
                    failure: function(response, options)                                                                                  
                             {                                                                                                            
                              var errMsg = response.responseText ;                                                                                          
                              displayStatus("Data loading failed!") ;
                              theStatusBbar_.setStatus(
                                                       {
                                                        text   : 'Oops! Something went wrong:'+errMsg,
                                                        iconCls: 'x-status-error',
                                                        clear  : true 
                                                       }
                                                      );
                              Ext.MessageBox.alert(                                                                                       
                                                   'Oops! Something went wrong:',                                                               
                                                   'Response: ' + errMsg                                                   
                                                  );                                                                                      
                             }                                                                                                            
                   }                                                                                                                      
           );
  STDLINE("Ajax request formed") ;                                                                                                
 } ; 
 
 //-----------------------------------------------------------------------------
 function applyOptions(hType)
 {
  var opts = "" ;
  var idx = 0 ;
  if( hType.match(/TH1/))
  {
   for(var i=0; i<options1D_.length-1; i++)
   {
    idx = 'ID-1-' + options1D_[i] + '_CB' ;
    if(Ext.getCmp(idx).getValue()) 
    {
     opts += Ext.getCmp(idx).getName()
     opts += "," ;
    }
   }
  }
  if( hType.match(/TH2/))
  {
   for(var i=0; i<options2D_.length-1; i++) 
   {                                        
    idx = 'ID-2-' + options2D_[i] + '_CB' ; 
    if(Ext.getCmp(idx).getValue())          
    {                                       
     opts += Ext.getCmp(idx).getName()      
     opts += "," ;                          
    }                                       
   }
  }                                        
  if( hType.match(/TH3/))
  {
   for(var i=0; i<options3D_.length-1; i++)
   {
    idx = 'ID-3-' + options3D_[i] + '_CB' ;
    if(Ext.getCmp(idx).getValue()) 
    {
     opts += Ext.getCmp(idx).getName()
     opts += "," ;
    }
   }
  }
  opts = opts.replace(/,$/,"") ;
  return opts ;
 }
 
 //-----------------------------------------------------------------------------
 displayPlot_ = function(object, currentPad)
                {
                 if( ! object ) 
                 {
                  alert("No object found to display") ;
                  return ;
                 }
                 var nx        = theCanvasModel_.getnDivX   (currentCanvas_) ;
                 var ny        = theCanvasModel_.getnDivY   (currentCanvas_) ;
                 displayStatus("Plot: "                                     + 
                               object.fTitle                                + 
                               ' on pad: '                                  + 
                               currentPad    )                               ;

                 gridDivision_ = "gridi" + nx + "x" + ny ;
                 mdi_ = new JSROOT.GridDisplay(getCanvasDiv_(currentCanvas_), 
                                                             gridDivision_ ) ;
//                  if (mdi_!=null) theFrame = mdi_.FindFrame  (currentPad     , 
//                                                              false         ) ;
                 if( nx == 1 && ny == 1 ) 
                 {
                  theFrame = 'canvas' + currentCanvas_                       ;
                  JSROOT.cleanup(getCanvasDiv_(   currentCanvas_))           ;
                  theCanvasModel_.resetCurrentPad(currentCanvas_)            ;
                 } else {
                  theFrame = 'canvas' + currentCanvas_ + '_' + currentPad    ;
                 }
                 options = applyOptions(object._typename)                    ;
                 if( superimposeFlag_ )
                 {
                   JSROOT.draw (
                                theFrame,
                                object  ,
                                options
                               ); 
                 } else {
                  JSROOT.redraw(
                                theFrame,
                                object  ,
                                options
                               ); 
                 } 
                 theCanvasModel_.nextPad(currentCanvas_) ;
                }
 //-----------------------------------------------------------------------------
 function redrawCanvas()
 {
//  theCanvasModel_.resetCurrentPad(          currentCanvas_) ;
//  theCanvasModel_.dump(currentCanvas_,"Redrawing canvas"  ) ;
  var objs = theCanvasModel_.getROOTObjects(currentCanvas_) ;
  STDLINE("") ;
  var thisB = Ext.getCmp('liveDQM-ID');
  if( LIVERunning_ )
  {
   thisB.getEl().setStyle('background', 'green');
  }
  else
  {
   thisB.getEl().setStyle('background', 'red'  );
  }
  STDLINE("^^^^^^^^^^^ Redrawing canvas "+currentCanvas_ + " periodicPlot_ID_: "+ periodicPlotID_[currentCanvas_] ) ;
  for(var i=0; i<objs.length; ++i)
  {
   var obj  = objs[i].object                                                            ;
   var pro  = objs[i].provenance                                                        ;
   var pad = i                                                                          ;
   var padC = 'canvas' + currentCanvas_ + '_' + i                                       ;
   STDLINE("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ >>>>> |"+pro.fRootPath_[padC]+"|")       ;
   pro.dumpAll("Redraw canvas")                                                         ;
   STDLINE("  Object: "+i                                                              );
   STDLINE("  padC  : "+padC                                                           );
   STDLINE("  pad   : "+padC+" fSystemPath_       : "+pro.fSystemPath_[padC]           );                          
   STDLINE("  pad   : "+padC+" fRootPath_         : "+pro.fRootPath_  [padC]           );
   STDLINE("  pad   : "+padC+" fRequestURL_       : "+pro.fRequestURL_[padC]           );
   STDLINE("  pad   : "+padC+" fParams_.CookieCode: "+pro.fParams_    [padC].CookieCode); 
   STDLINE("  pad   : "+padC+" fParams_.RootPath  : "+pro.fParams_    [padC].RootPath  ); 
   if( pro.fRootPath_[padC] == 'LIVE_DQM.root') 
   {
    theAjaxRequest(pro.fRequestURL_[padC], 
                   pro.fParams_[padC], 
                   "", 
                   pad, 
                   false );
   }
   else
   {                                           
    displayPlot_(obj, pad);
   }
  }
//  theCanvasModel_.dump(currentCanvas_,"Just after redraw"                          ); 
 }
 
 //-----------------------------------------------------------------------------//
 //                                                                             //
 //             H e r e    t h e   a c t i o n    b e g i n s                   //
 //                                                                             //
 //-----------------------------------------------------------------------------//

 // Send a request to the server to initialize the "Source" combobox of the Visualizer window
 // with the list of available data sources (histograms and/or canvases)
 enableSTDLINE             (enableDebug_                   ) ;

 initializeOptions         (1,optionsBodies1D_, options1D_, options1DText_ ) ;               
 initializeOptions         (2,optionsBodies2D_, options2D_, options2DText_ ) ;               
 initializeOptions         (3,optionsBodies3D_, options3D_, options3DText_ ) ;               
 generateDIVPlaceholderSize('canvas0'         , 350, 440                   ) ;
 generateDIVPlaceholderSize('canvas1'         , 350, 440                   ) ;

 createCanvasTab(0)      ;
 createCanvasTab(1)      ;

 makeROOTControlsPanel() ; 
 makeGlobalCanvas()      ;
 makeNavigatorPanel()    ; 
 makeInformationPanel()  ;
 makeConfigStore()       ;
 
 theAjaxRequest(
                _requestURL+"RequestType=getDirectoryContents",
                {                                                            
                 CookieCode: DesktopContent._cookieCodeMailbox,                                   
                 Path      : "/"                                 
                }, 
                "",
                0 ,
                true
               ) ;                                                          

});
