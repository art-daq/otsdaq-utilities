//=====================================================================================
//
//	Created Dec, 2012
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	DesktopWindow.js
//
//	This is the desktop code for the user interface for ots. ots is the DAQ
// 		and control software for the Fermi Strips Telescope.
//
//	The desktop consists of a dashboard and an arbitrary amount of windows
//
//=====================================================================================

if (typeof Debug == 'undefined') 
	console.log('ERROR: Debug is undefined! Must include Debug.js before Desktop.js');
	
if (typeof Desktop == 'undefined') 
	console.log('ERROR: Desktop is undefined! Must include Desktop.js before DesktopWindow.js');
else {

		
	////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////
	//define Desktop.createWindow to return window class	
	////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////
	Desktop.createWindow = function(id,z,name,subname,url,w,h,x,y) {
	
		if(false === (this instanceof Desktop.createWindow)) {
			//here to correct if called as "var v = Desktop.createDesktop();"
			//	instead of "var v = new Desktop.createDesktop();"
	        return new Desktop.createWindow(id,z,name,subname,url,w,h,x,y);
	    }
		
		//------------------------------------------------------------------
		//create private members variables ----------------------
		//------------------------------------------------------------------
				
		
		//all units in pixels unless otherwise specified
		
		var _defaultWindowMinWidth = 140;	
		var _defaultWindowMinHeight = 100;	
		
		var _defaultHeaderHeight = 30;  	
		var _defaultHeaderLeftMargin = 10;	
		var _defaultHeaderFontSize = 16;
		var _defaultButtonSize = 20;
		var _defaultButtonLeftMargin = 2;
		var _defaultButtonTopMargin = 1;
		
		var _defaultFrameBorder = 6;	
				
		var _name;
		var _subname;

		var _url;
		function _urlHandler()
		{
			_url = url; //default to full copy
			Debug.log("Handling window url",url);	

			//find port colon
			var hostColonIndex = window.location.href.indexOf(':');
			if(hostColonIndex < 5) //from http: or https:, then look again
				hostColonIndex = window.location.href.indexOf(':',hostColonIndex+1);
			if(hostColonIndex < 0) return;
			if(url.indexOf("http://") != 0) return;
			var urlColonIndex = url.indexOf(':',7); //7 because look after http://
			if(urlColonIndex < 0) return;

			var gatewayURL = window.location.href.substr(0, hostColonIndex);
			Debug.log("Handling window url",url,gatewayURL);
			if(gatewayURL == "localhost" || 
			gatewayURL == "http://localhost" || 
			gatewayURL.indexOf("https://") == 0)
			{
				_url = gatewayURL + url.substr(urlColonIndex);
				Debug.log("Manipulating address based on gateway url from",
					url,"to",_url);				
			}
			else
				_url = url;	
		} //end url handling
		_urlHandler(); //call url handler
		
		var _id = id; //unique window id, cannot change! Used as link between html div container and object

		var _winhdr,_winfrm,_winfrmHolder;
		
		var _w,_h,_x,_y; //position and size members
		var _isMaximized = false;
		var _isMinimized = false;
		var _z = z;
		
		//------------------------------------------------------------------
		//create public members variables ----------------------
		//------------------------------------------------------------------
		this.windiv;
        
		//------------------------------------------------------------------
		//create PRIVATE members functions ----------------------
		//------------------------------------------------------------------
				
		//==============================================================================
		//_refreshHeader() ~~~
		//	private function to refresh header name based on window size
		// 	clip text if too long
		var _refreshHeader = function() 
		{
			var hdrW = _w-2*_defaultHeaderLeftMargin-5*(_defaultButtonSize+_defaultButtonLeftMargin)-1;
			_winhdr.style.width = hdrW +"px"; 
			_winhdr.innerHTML = _name + (_subname==""?"":" - ") + _subname;
			while(_winhdr.scrollWidth > hdrW && _winhdr.innerHTML.length > 4)
				_winhdr.innerHTML = _winhdr.innerHTML.substr(0,_winhdr.innerHTML.length-4)+"...";
		} //end _refreshHeader()
		
		//==============================================================================
		var _handleWindowContentLoading = function(e) {
			
			Debug.log("Server desktop sending first message to window: ",_id,e);
			
			//remove the "Loading" once iframe loads
			if(_winfrmHolder.childNodes.length > 1) 
				_winfrmHolder.removeChild(
						document.getElementById("DesktopWindowFrameLoadingDiv-"+_id));

			//To overcome same-origin policy
			//The first message is initiated by the Desktop once the window frame has been loaded.
			//	The window content listener is defined in DesktopContent.js
			
			var initObject = {
					"windowId":			_id,
					"windowTitle": 		(_name + (_subname==""?"":" - ") + _subname),
					"gatewayURN":  		urnLid_,
					"gatewayOrigin":  	serverOrigin_,
					"userDisplayName":	Desktop.desktop.login.getUserDisplayName(),
					"cookieCode":  		Desktop.desktop.login.getCookieCode(),
					"dashboardColor": 	Desktop.desktop.dashboard.getDefaultDashboardColor(),
					"desktopColor": 	document.body.style.backgroundColor,
					"windowFrameColor": Desktop.desktop.defaultWindowFrameColor					
			};
			
			_winfrm.contentWindow.postMessage(
					initObject,"*");			
		} //end _handleWindowContentLoading()


		//------------------------------------------------------------------
		//create PUBLIC members functions ----------------------
		//------------------------------------------------------------------
		//setWindowNameAndSubName
		//setWindowSizeAndPosition
		//moveWindowByOffset
		//resizeAndPositionWindow(x,y,w,h)
		//maximize
		//minimize
		
		//==============================================================================
		//member variable access functions ~~~
		this.getWindowName = function() { return _name; }
		this.getWindowSubName = function() { return _subname; }
		this.getWindowUrl = function() { return _url; }
		this.getWindowId = function() { return _id; }
		this.getWindowX = function() { return _x; }
		this.getWindowY = function() { return _y; }
		this.getWindowZ = function() { return parseInt(this.windiv.style.zIndex);} //return integer
		this.getWindowWidth = function() { return _w; }
		this.getWindowHeight = function() { return _h; }
		this.getWindowHeaderHeight = function() { return _defaultHeaderHeight; }
		this.isMaximized = function() {return _isMaximized && !_isMinimized;} //make sure the maximized window is visible
		this.isMinimized = function() {return _isMinimized;}


		//==============================================================================
		// bringing window to foreground then back to original location for refresh
		this.setWindowZ = function(z) 
		{ 
			//console.log("z",z,this.getWindowName());
			_z = z; this.windiv.style.zIndex = _z; 
		} //end setWindowZ()
		
		//==============================================================================
		this.showFrame = function() { _winfrm.style.display = "inline"; }
		this.hideFrame = function() { _winfrm.style.display = "none"; }
		this.getFrame = function() { return _winfrm; }
		
		//==============================================================================
		//setWindowNameAndSubName() ~~~
		//	set name and subname
		this.setWindowNameAndSubName = function(name,subname) 
		{
			_name = name; _subname = subname;
			_refreshHeader();			
			Debug.log("Desktop Window name=" + name + " and subname=" + subname);
		} //end setWindowNameAndSubName()
		
		//==============================================================================
		//setWindowSizeAndPosition() ~~~
		//	set size and position of window and its elements
		this.setWindowSizeAndPosition = function(x,y,w,h) 
		{		
			x = parseInt(x);
			y = parseInt(y);		
			w = parseInt(w);
			h = parseInt(h);
			//Debug.log("set size",_x-x,_y-y,_w-w,_h-h,x,y,w,h,_defaultWindowMinWidth,_defaultWindowMinHeight);	
			
			//apply minimum size requirements and maximized state
			_w = _isMaximized?Desktop.desktop.getDesktopContentWidth():(w < _defaultWindowMinWidth?_defaultWindowMinWidth:w);
			_h = _isMaximized?Desktop.desktop.getDesktopContentHeight():(h < _defaultWindowMinHeight?_defaultWindowMinHeight:h);
			_x = _isMaximized?Desktop.desktop.getDesktopContentX()+4:x;
			_y = _isMaximized?Desktop.desktop.getDesktopContentY():y;
			
			//keep window within desktop content bounds
			if(_x + _w > Desktop.desktop.getDesktopContentX() + Desktop.desktop.getDesktopContentWidth())
				_w = Desktop.desktop.getDesktopContentX() + Desktop.desktop.getDesktopContentWidth() - _x;
			if(_y + _h > Desktop.desktop.getDesktopContentY() + Desktop.desktop.getDesktopContentHeight())
				_h = Desktop.desktop.getDesktopContentY() + Desktop.desktop.getDesktopContentHeight() - _y;
			
            this.windiv.style.width = _w +"px";
		   	this.windiv.style.height = _h+"px"; 
			this.windiv.style.left = _x+"px"; 
		   	this.windiv.style.top = _y+"px";    	
		   		
			_refreshHeader();			
			
			_winfrm.style.width = (_w-2*_defaultFrameBorder-2)+"px";  //extra 2 for border pixels
			_winfrm.style.height = (_h-_defaultHeaderHeight-_defaultFrameBorder-2)+"px"; 	//extra 2 for border pixels		  
			_winfrmHolder.style.width = (_w-2*_defaultFrameBorder-2)+"px";  //extra 2 for border pixels 
			_winfrmHolder.style.height = (_h-_defaultHeaderHeight-_defaultFrameBorder-2)+"px"; 	//extra 2 for border pixels	
			
            //Debug.log("Desktop Window position to " + _x + "," +
            //           _y + " size to " + _w + "," + _h);
					
            if(_isMaximized){ //keep proper dimensions
                _winfrm.style.position = "absolute";
                _winfrm.style.zIndex = _z + 1;
                _winfrm.style.width = _w + "px";
                _winfrm.style.height = _h + "px";
                _winfrm.style.left ="-1px";
                _winfrm.style.top = "-1px";
                _winfrmHolder.style.position = "absolute";
                _winfrmHolder.style.width = (_w)+"px";  //extra 2 for border pixels 
                _winfrmHolder.style.height = (_h)+"px"; 	//extra 2 for border pixels
                _winfrmHolder.style.left =(-_defaultFrameBorder-2) + "px";
                _winfrmHolder.style.top = "-1px";	
                			

                _w = w < _defaultWindowMinWidth?_defaultWindowMinWidth:w;
                _h = h < _defaultWindowMinHeight?_defaultWindowMinHeight:h;
                _x = x;
                _y = y;
                
                //hide window header (in case user page is transparent)
                var hdrs = this.windiv.getElementsByClassName("DesktopWindowButton");
                for(var h=0;hdrs && h<hdrs.length;++h)
                	hdrs[h].style.display = "none";
                hdrs = this.windiv.getElementsByClassName("DesktopWindowHeader");
                for(var h=0;hdrs && h<hdrs.length;++h)
					hdrs[h].style.display = "none";
            }
            else {
                _winfrm.style.zIndex = _z;
                _winfrm.style.position = "static";
                _winfrmHolder.style.position = "static";

                //show window header (for case user page is transparent)
                var hdrs = this.windiv.getElementsByClassName("DesktopWindowButton");
                for(var h=0;hdrs && h<hdrs.length;++h)
                	hdrs[h].style.display = "block";
                hdrs = this.windiv.getElementsByClassName("DesktopWindowHeader");
                for(var h=0;hdrs && h<hdrs.length;++h)
					hdrs[h].style.display = "block";
            }
			
            Desktop.desktop.login.resetCurrentLayoutUpdateTimer();
		} //end setWindowSizeAndPosition()

		//==============================================================================
		//moveWindowByOffset() ~~~
		//	move position of window and its elements by an offset
		this.moveWindowByOffset = function(dx,dy) 
		{
			_x += dx;
			_y += dy;
            //if(_x < Desktop.desktop.getDesktopContentX()) _x = Desktop.desktop.getDesktopContentX();
            if(_y < Desktop.desktop.getDesktopContentY()) _y = Desktop.desktop.getDesktopContentY();
			this.windiv.style.left = _x+"px"; 
		   	this.windiv.style.top = _y+"px";    
		   	
			//Debug.log("Desktop Window position to " + _x + "," +
			//	_y );
		   	
		   	//reset current layout update timer if a window moves
		   	Desktop.desktop.login.resetCurrentLayoutUpdateTimer();
		} //end moveWindowByOffset()

		//==============================================================================
		//resizeAndPositionWindow(x,y,w,h) ~~~
		//	resize and position of window and its elements
		//	do not allow weird re-size effects
		//		+1 because of borders, and content width vs set value
		//	return difference between set values and actual values
		this.resizeAndPositionWindow = function(x,y,w,h) 
		{					
			// if((_x-x) == 0 && (_w-w))
			// Debug.log("Resizing","'" + _name + "'",_x-x,_y-y,_w-w,_h-h,x,y,w,h,_defaultWindowMinWidth,_defaultWindowMinHeight);			
			if((w <= _defaultWindowMinWidth + 1 && x > _x) ||
				(h <= _defaultWindowMinHeight + 1 && y > _y)) return [x-_x,y-_y,w-_w,h-_h];
            if(x < _x && x < Desktop.desktop.getDesktopContentX()) return [x-_x,y-_y,w-_w,h-_h];//x = Desktop.desktop.getDesktopContentX();
            if(y < _y && y < Desktop.desktop.getDesktopContentY()) return [x-_x,y-_y,w-_w,h-_h];//y = Desktop.desktop.getDesktopContentY();            
			
			this.setWindowSizeAndPosition(x,y,w,h);
			
			return [x-_x,y-_y,w-_w,h-_h];
		} //end resizeAndPositionWindow()
				
		//==============================================================================
		//maximize() ~~~
		//	maximize window toggle fulls screen mode
		this.maximize = function() 
		{			 
			if(_isMinimized) this.unminimize(); //untoggle minimize flag
			_isMaximized = true;
			
			this.windiv.style.display = "inline"; //make sure is visible
			this.setWindowSizeAndPosition(_x+10,_y,_w,_h);
			window.parent.document.title = _name;
			// console.log(document.title, _name, "Maximize()");			
		} //end maximize()

		//==============================================================================
		this.unmaximize = function()
		{
			_isMaximized = false;
			
			this.windiv.style.display = "inline"; //make sure is visible
			this.setWindowSizeAndPosition(_x,_y,_w,_h);
			window.parent.document.title = Desktop.isWizardMode()?"ots wiz":"ots";
		} //end unmaximize()

		//==============================================================================
		//minimize() ~~~
		//	minimize window toggles visible or not (does not affect current position/size)
		this.minimize = function() 
		{
		    
		    if(_isMaximized)
		    	window.parent.document.title = _name;
		    else
		    	window.parent.document.title = Desktop.isWizardMode()?"ots wiz":"ots";
		    
		    _isMinimized = true;
		    this.windiv.style.display = "none";
		    Debug.log(_name,"this.windiv.style.display now is " + this.windiv.style.display);
		} //end minimize()

		//==============================================================================
		this.unminimize = function()
		{
		    
		    if(_isMaximized)
		    	window.parent.document.title = _name;
		    else
		    	window.parent.document.title = Desktop.isWizardMode()?"ots wiz":"ots";
		   
		    _isMinimized = false;
		    this.windiv.style.display = "inline";
		    Debug.log(_name,"this.windiv.style.display now is " + this.windiv.style.display);
		} //end unminimize()

		//------------------------------------------------------------------
		//handle class construction ----------------------
		//------------------------------------------------------------------
		
			//create holding container
		this.windiv = document.createElement("div"); 
		this.windiv.setAttribute("class", "DesktopWindow");   	
		this.windiv.setAttribute("id", "DesktopWindow-" + _id); //setup ids
		this.windiv.style.backgroundColor = Desktop.desktop.defaultWindowFrameColor;
	   	this.windiv.style.position = "absolute";
	   	this.windiv.style.zIndex = _z;
	   	
		//same color code as Desktop.js this.setDefaultWindowColor = function(color) L1000
		//check if color is dark or light to determine text color
		//assume rgba format (.9 alpha)
		var rgbArr = Desktop.desktop.defaultWindowFrameColor.split('(')[1].split(',');
		var brightVal = rgbArr[0]*rgbArr[0] + rgbArr[1]*rgbArr[1] + rgbArr[2]*rgbArr[2];
		var blueVal = (rgbArr[2]-rgbArr[0]) + 
			(rgbArr[2]-rgbArr[1]);
		Debug.logv({brightVal});
		Debug.logv({blueVal});
		var lightText = false;
		//if too dark or too blue, make text light
		if(brightVal < 40000 || blueVal > 90)
			lightText = true;

			//create header
		_winhdr = document.createElement("div"); 
		_winhdr.setAttribute("class", "DesktopWindowHeader");
		_winhdr.setAttribute("id", "DesktopWindowHeader-" + _id);	   		
	   	_winhdr.style.height = _defaultHeaderHeight+"px";
	   	_winhdr.style.marginLeft = _defaultHeaderLeftMargin+"px";
	   	_winhdr.style.marginRight = (-100)+"px";
		_winhdr.style.fontSize = _defaultHeaderFontSize+"px"; 
		_winhdr.style.color = lightText?"white":"#0f2269";	 		
	   	this.setWindowNameAndSubName(name, subname); // set name and subname		   	
	   	this.windiv.appendChild(_winhdr); //add header to window	   	
	   	
			//create buttons


		var tmpContainer = document.createElement("div");
		tmpContainer.setAttribute("style", "float:right;margin-right:" + 
			_defaultButtonLeftMargin + "px;white-space:nowrap;height:" + 
			_defaultHeaderHeight + "px;overflow:auto;");
		var tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopWindowButton");
		tmpBtn.setAttribute("id", "DesktopWindowButtonRefresh-" + _id);
		tmpBtn.style.width = (_defaultButtonSize) +"px";
		tmpBtn.style.height = (_defaultButtonSize) +"px";
		tmpBtn.style.marginLeft = (_defaultButtonLeftMargin) +"px";
		tmpBtn.style.marginTop = (_defaultButtonTopMargin) +"px";
		tmpBtn.onmouseup = Desktop.handleWindowRefresh;
		tmpBtn.onmousedown = Desktop.handleWindowButtonDown;
		var tmpEl = document.createElement("div");
		tmpEl.setAttribute("class", "DesktopWindowButtonGraphicRefresh");
		if(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_FIREFOX &&
				Debug.OS_TYPE == Debug.OS_TYPE_LINUX) //Linux firefox
		{
			//firefox linux shows circle-arrow character slightly bigger than other firefox
			tmpEl.innerHTML = 
					"<div style='font-size:21px; margin: -1px 0 0 -3px; color:inherit;' " +
					"title='Click to refresh only this window'>↻</div>";   
		}
		else if(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_CHROME &&
				Debug.OS_TYPE == Debug.OS_TYPE_MAC) //Mac chrome
		{
			//chrome on Mac shows circle-arrow smaller than Windows and Linux
			tmpEl.innerHTML = 
					"<div style='font-size:22px; margin: -3px 0 0 1px; color:inherit;' " +
					"title='Click to refresh only this window'>↻</div>";  
		}
		else if(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_FIREFOX)// &&
				// Debug.OS_TYPE == Debug.OS_TYPE_WINDOWS) //Windows firefox
			//As of Sept 2021: Mac firefox now shows circle-arrow bigger like windows 
		{
			//windows shows circle-arrow bigger
			tmpEl.innerHTML = 
					"<div style='font-size:19px; margin: -3px 0 0 -2px; color:inherit;' " +
					"title='Click to refresh only this window'>↻</div>";    
		}
		// else if(Debug.BROWSER_TYPE == Debug.BROWSER_TYPE_FIREFOX) //firefox
		// {
		// 	//firefox shows circle-arrow character smaller
		// 	tmpEl.innerHTML = 
		// 			"<div style='font-size:28px; margin: -4px 0 0 -1px; color:inherit;' " +
		// 			"title='Click to refresh only this window'>↻</div>";   
		// }		
		else //chrome
		{
			tmpEl.innerHTML = 
					"<div style='font-size:19px; margin: 0 0 0 0; color:inherit;' " +
					"title='Click to refresh only this window'>↻</div>";   
		}

		//tmpEl.innerHTML = "↻";
		tmpBtn.appendChild(tmpEl);
		tmpContainer.appendChild(tmpBtn); //add button to window 

		//create new window element next to the refresh button with the question mark
		var tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopWindowButton");
		tmpBtn.setAttribute("id", "DesktopWindowButtonHelp-" + _id);
		tmpBtn.style.width = (_defaultButtonSize) +"px";
		tmpBtn.style.height = (_defaultButtonSize) +"px";
		tmpBtn.style.marginLeft = (_defaultButtonLeftMargin) +"px";
		tmpBtn.style.marginTop = (_defaultButtonTopMargin) +"px";
		tmpBtn.onmouseup = Desktop.handleWindowHelp;
		tmpBtn.onmousedown = Desktop.handleWindowButtonDown;
		var tmpEl = document.createElement("div");
		tmpEl.setAttribute("class", "DesktopWindowButtonGraphicHelp");
		tmpEl.innerHTML = 
			"<div style='font-size:18px; color:inherit;' " +
			"title='Click to show the help tooltip for this window'>?</div>";   //"?";
		tmpBtn.appendChild(tmpEl);
		tmpContainer.appendChild(tmpBtn); //add button to window 


		var tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopWindowButton");
		tmpBtn.setAttribute("id", "DesktopWindowButtonMin-" + _id);
		tmpBtn.style.width = (_defaultButtonSize) +"px"; 
		tmpBtn.style.height = (_defaultButtonSize) +"px";                         
		tmpBtn.style.marginLeft = (_defaultButtonLeftMargin) +"px";         
		tmpBtn.style.marginTop = (_defaultButtonTopMargin) +"px";  
		tmpBtn.onmouseup = Desktop.handleWindowMinimize;         
		tmpBtn.onmousedown = Desktop.handleWindowButtonDown;
		var tmpEl = document.createElement("div");
		tmpEl.setAttribute("class", "DesktopWindowButtonGraphicMin");
		tmpBtn.appendChild(tmpEl);                
		tmpContainer.appendChild(tmpBtn); //add button to window 

		tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopWindowButton");
		tmpBtn.setAttribute("id", "DesktopWindowButtonMax-" + _id);
		tmpBtn.style.width = (_defaultButtonSize) +"px"; 
		tmpBtn.style.height = (_defaultButtonSize) +"px";                         
		tmpBtn.style.marginLeft = (_defaultButtonLeftMargin) +"px";         
		tmpBtn.style.marginTop = (_defaultButtonTopMargin) +"px";  
		tmpBtn.onmouseup = Desktop.handleWindowMaximize;         
		tmpBtn.onmousedown = Desktop.handleWindowButtonDown;
		var tmpEl = document.createElement("div");
		tmpEl.setAttribute("class", "DesktopWindowButtonGraphicMax");
		tmpBtn.appendChild(tmpEl);                
		tmpContainer.appendChild(tmpBtn); //add button to window   
		
		tmpBtn = document.createElement("div");
		tmpBtn.setAttribute("class", "DesktopWindowButton");
		tmpBtn.setAttribute("id", "DesktopWindowButtonClose-" + _id);
		tmpBtn.style.width = (_defaultButtonSize) +"px"; 
		tmpBtn.style.height = (_defaultButtonSize) +"px"; 			
		tmpBtn.style.marginLeft = (_defaultButtonLeftMargin) +"px"; 	
		tmpBtn.style.marginTop = (_defaultButtonTopMargin) +"px";  
	   	tmpBtn.onmouseup = Desktop.handleWindowClose; 	
		tmpBtn.onmousedown = Desktop.handleWindowButtonDown;
		var tmpEl = document.createElement("div");
		tmpEl.setAttribute("class", "DesktopWindowButtonGraphicClose");
		tmpEl.innerHTML = "x";
		tmpBtn.appendChild(tmpEl);		
		tmpContainer.appendChild(tmpBtn); //add button to window	  
	   	

		this.windiv.appendChild(tmpContainer); //add button container to window 
		  	
	   		//create iframe holder for displaying during window manipulations
	   	_winfrmHolder = document.createElement("div"); 
		_winfrmHolder.setAttribute("class", "DesktopWindowFrameHolder");
		_winfrmHolder.setAttribute("id", "DesktopWindowFrameHolder-" + _id);
		_winfrmHolder.style.marginLeft = _defaultFrameBorder+"px";	
		_winfrmHolder.innerHTML = 
				"<div class='DesktopWindowHeader' id='DesktopWindowFrameLoadingDiv-"+
				_id + "' style='width:100px;height:50px;position:relative;top:50%;left:50%;margin-top:-25px;margin-left:-50px;text-align:center;margin-bottom:-50px;'>" + 
				"Loading..." + "</div>";
		
	   		//create iframe
	   	_winfrm = document.createElement("iframe"); 
		_winfrm.setAttribute("class", "DesktopWindowFrame");
		_winfrm.setAttribute("id", "DesktopWindowFrame-" + _id);
		_winfrm.setAttribute("name", "DesktopWindowFrame-" + _id);
		_winfrm.setAttribute("allow", "autoplay"); //allow sounds without user clicking page first
		_winfrm.onload = _handleWindowContentLoading; //event to delete "Loading"
		_winfrm.onerror = _handleWindowContentLoading; //event to delete "Loading"
		_winfrm.setAttribute("src", _url);
		_winfrmHolder.appendChild(_winfrm); //add frame to holder	 
		this.windiv.appendChild(_winfrmHolder); //add holder to window  
		
		this.setWindowSizeAndPosition(x,y,w,h); //setup size and position
			   	   	
	   		//add mouse handlers
	   	this.windiv.onmousedown = Desktop.handleWindowMouseDown;
	   	this.windiv.onmouseup   = Desktop.handleWindowMouseUp;
	   	this.windiv.onmousemove = Desktop.handleWindowMouseMove;
		this.windiv.ondblclick  = Desktop.handleWindowMaximize;
	   	
	   		//add touch handlers (for mobile devices)
	   	this.windiv.addEventListener('touchstart',Desktop.handleTouchStart);
	   	this.windiv.addEventListener('touchend',Desktop.handleTouchEnd);
	   	this.windiv.addEventListener('touchmove',Desktop.handleTouchMove);
	   	   	
	   		   	
		Debug.log("Desktop Window Created");
	
	} //end createWindow "constructor"
} //end DesktopWindow definition scope
