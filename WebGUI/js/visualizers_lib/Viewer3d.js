//=====================================================================================
//
//	Created Aug, 2013
//	by Ryan Rivera ((rrivera at fnal.gov)) and Dan Parilla
//
//	Viewer3d.js
//
//	requires an omni div, that will be made full window size (window.innerWidth and
//		window.innerHeight) at position 0,0
//
//	note: good tutorial http://learningwebgl.com/blog/?p=28
//		expanded glMatrix library: http://code.google.com/p/glmatrix/source/browse/glMatrix.js?spec=svne5ad8f6975eef038de668914a44ed36e2c611966&r=e5ad8f6975eef038de668914a44ed36e2c611966
//		reference card: http://www.khronos.org/files/webgl/webgl-reference-card-1_0.pdf
//	public function list:
//		Viewer3d.launch()
//
//=====================================================================================

var Viewer3d = Viewer3d || {}; //define namespace


////////////////////////////////////////////////////////////
//public function definitions

// Viewer3d.launch ~~
//		called to start 3d viewer
Viewer3d.launch = function() {

	Debug.log("Viewer3d.launch");

	Viewer3d.omni = document.getElementById("omni");
	Viewer3d.omni.innerHTML = ""; //clear all content

	//initialize with loading message in center
	var w = Viewer3d.w = window.innerWidth;
	var h = Viewer3d.h = window.innerHeight;

	Viewer3d.omni.style.position = "absolute";
	Viewer3d.omni.style.left = 0  + "px";
	Viewer3d.omni.style.top = 0  + "px";
	Viewer3d.omni.style.width = w + "px";
	Viewer3d.omni.style.height = h + "px";
	Viewer3d.omni.style.backgroundColor = "rgb(30,30,30)";

	Viewer3d.omni.innerHTML = "<center><div style='margin-top:" + (h/2-8) + "px'>Loading 3-D...</div></center>";


	//load/insert libraries and shaders into header and setup webgl
	// steps:
	//		- load WebGL libraries
	//		- setup canvas behind "loading..."
	//		- init WebGL
	//		- load WebGL shaders
	//		- setup hud
	//		- get default geometry from server
	//		- bring canvas in front of "loading..."

	Viewer3d.loadScripts();
}

//end public function definitions
////////////////////////////////////////////////////////////


Viewer3d.CANVAS_MIN_SIZE = 300; //dont allow w or h to go less than this
Viewer3d.HUD_WIDTH = 200;
Viewer3d.HUD_MARGIN_RIGHT = 10;
Viewer3d.HUD_DROP_DOWN_SPEED = 10;
Viewer3d.WEBGL_NEAR_CLIPPING_DEPTH = 1000.0;
Viewer3d.WEBGL_FAR_CLIPPING_DEPTH = 10000000.0;
Viewer3d.WEBGL_RESET_CAMERA_POS = [-300000, 50000, -300000];
Viewer3d.WEBGL_RESET_CAMERA_FOCUS = [0, 50000, 0];
Viewer3d.WEBGL_RESET_CAMERA_UP = [0, 1, 0];
Viewer3d.WEBGL_AXES_LENGTH = 1000000; //microns
Viewer3d.WEBGL_GRID_SPACING = 50000; //microns
Viewer3d.WEBGL_GRID_EXPANSE = 1000000; //microns
Viewer3d.WEBGL_GRID_YOFF = -100000; //microns
Viewer3d.TICK_REFRESH_PERIOD = 30; //ms
Viewer3d.KEY_ROT_SPEED_FAST = 0.06;
Viewer3d.KEY_ROT_SPEED_SLOW = 0.01;
Viewer3d.KEY_MOVE_SPEED_FAST = 10000; //incremental size of key navigation in fast mode
Viewer3d.KEY_MOVE_SPEED_SLOW = 1000; //incremental size of key navigation in slow mode
Viewer3d.MOUSE_NAV_SPEED = 0.005;
Viewer3d.MOUSE_WHEEL_SPEED_SLOW = 10000;
Viewer3d.MOUSE_WHEEL_SPEED_FAST = 100000;
Viewer3d.TOUCH_NAV_SPEED = 0.001;
Viewer3d.TOUCH_ZOOM_SPEED = 10000;
Viewer3d.DOUBLE_TAP_RESET_TIME = 600; //ms
Viewer3d.DOUBLE_TAP_HUD_Y_ACCEPT = 300;
Viewer3d.Z_SQUASH_FACTOR = 10.0;

Viewer3d.FLY_BY_ROT_RATE = 0.003;
Viewer3d.FLY_BY_HEIGHT_MAX = 10000; //0
Viewer3d.FLY_BY_HEIGHT_RATE = 0.001;
Viewer3d.FLY_BY_RADIUS_RATE = 0.002;
Viewer3d.FLY_BY_RADIUS_SWING = 100000; //0
Viewer3d.FLY_BY_RADIUS_MIN = 10000;  //0
Viewer3d.FLY_BY_FOCUS = [0,Viewer3d.FLY_BY_HEIGHT_MAX/10,0];
Viewer3d.FLY_BY_EVENT_TIME = 500; //ms for each event
Viewer3d.FLY_BY_ACCUM_TIME = 5000; //ms for alternating between accumulated time individual events


Viewer3d.omni;
Viewer3d.hud;
Viewer3d.canvas;
Viewer3d.textureCanvas;
Viewer3d.textureContext;
Viewer3d.cTexture;
Viewer3d.gl;
Viewer3d.w;
Viewer3d.h;
Viewer3d.tickTimer;

Viewer3d.lastMousePos = [-1,-1];
Viewer3d.lastTwoTouchMag = 0;		//used for pinch zooming
Viewer3d.lastTouchTime = 0;		//used for double tap recognition
Viewer3d.cameraAction = false; //used to redraw if mouse nav occurs
Viewer3d.keysDown = []; //12 keys. 1 pressed, 0 unpressed: Q, W, E, R, A, S, D, F, Up, Left, Down, Right
Viewer3d.cameraPos; //position of camera
Viewer3d.cameraFocus; //3d point for camera focus
Viewer3d.cameraUp; //unit direction vector for camera up
Viewer3d.cameraKeyNavFast = false;

Viewer3d.drawAxesFlag = true;
Viewer3d.drawGridFlag = true;
Viewer3d.drawTracksFlag = true;
Viewer3d.enableMouseNav = true;
Viewer3d.enableFlyBy = true;
Viewer3d.accumulateEvents = true;
Viewer3d.enableFlyByParameter = 0;
Viewer3d.flyByEvent = 0;
Viewer3d.flyByModeAlarm = 0; //to change fly-by mode, 0 is unset
Viewer3d.flyByEventAlarm = 0; //to change fly-by event, 0 is unset
Viewer3d.axes;
Viewer3d.grid;
Viewer3d.geometry;
Viewer3d.events; //array of events, where an event has glBuffer .clusters and .tracks
Viewer3d.eventToDisplay = 0; //index of event to display, -1 is all events
Viewer3d.runNumber = -1; //index of run to display, -1 is no run loaded

Viewer3d.scriptLoadedCount;
Viewer3d.SCRIPTS_TO_LOAD = 2;

Viewer3d.fragmentShader;
Viewer3d.vertexShader;
Viewer3d.shaderProgram;
Viewer3d.perspectiveMatrix;
Viewer3d.modelViewMatrix;
Viewer3d.modelViewMatrixStack = [];

//"private" function list
//Viewer3d.handleScriptLoaded
//Viewer3d.initCanvas
//Viewer3d.tick
//Viewer3d.handleCanvasKeyDown
//Viewer3d.handleCanvasKeyUp
//Viewer3d.checkKeyAction
//Viewer3d.handleCanvasMouseWheel
//Viewer3d.zoomCameraByDelta
//Viewer3d.handleCanvasTouchMove
//Viewer3d.handleCanvasMouseMove
//Viewer3d.handleCanvasTouchStart
//Viewer3d.handleCanvasMouseDown
//Viewer3d.panCameraByDelta
//Viewer3d.handleWindowResize
//Viewer3d.initWebGL
//Viewer3d.resetCamera
//Viewer3d.initShaders
//Viewer3d.createHud
//	this.handleWindowResize
//	this.checkboxUpdate
//	this.update
//	this.handleControlDown
//	this.handleControlUp
//	this.handleRunChange
//Viewer3d.getEvents
//Viewer3d.getEventsHandler
//Viewer3d.getGeometry
//Viewer3d.getGeometryHandler
//Viewer3d.mvPushMatrix
//Viewer3d.mvPopMatrix
//Viewer3d.setMatrixUniforms
//Viewer3d.redraw
//Viewer3d.initForDraw
//Viewer3d.initAxesAndGridBuffers
//Viewer3d.drawAxes
//Viewer3d.drawGrid
//Viewer3d.drawGeometry
//Viewer3d.drawClusters
//Viewer3d.drawTracks

//first step is to load webGl libraries
Viewer3d.loadScripts = function() {

	Viewer3d.scriptLoadedCount = 0;

	var head = document.getElementsByTagName('head')[0];
	var script;

	//webgl libraries
	script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = '/WebPath/js/js_lib/glMatrix-0.9.5.min.js';
	script.onload = Viewer3d.handleScriptLoaded;
	head.appendChild(script);

	script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = '/WebPath/js/js_lib/webgl-utils.js';
	script.onload = Viewer3d.handleScriptLoaded;
	head.appendChild(script);
}

Viewer3d.handleScriptLoaded = function() {
	++Viewer3d.scriptLoadedCount;
	Debug.log("Viewer3d.handleScriptLoaded " + Viewer3d.scriptLoadedCount);
	if(Viewer3d.SCRIPTS_TO_LOAD == Viewer3d.scriptLoadedCount) //done, goto next step
		Viewer3d.initCanvas();
}

Viewer3d.initCanvas = function() {

	Viewer3d.canvas = document.createElement('canvas');
	Viewer3d.canvas.style.position = "absolute";
	Viewer3d.canvas.style.left = 0  + "px";
	Viewer3d.canvas.style.top = 0  + "px";
	Viewer3d.canvas.style.zIndex = -1;  //-1 is not visible.. change to 0 to bring to front
	Viewer3d.omni.appendChild(Viewer3d.canvas);

	Viewer3d.textureCanvas = document.createElement('canvas');
	Viewer3d.textureContext = Viewer3d.textureCanvas.getContext('2d');

	Viewer3d.textureCanvas.width = 128;	//must be power of 2 (?)
	Viewer3d.textureCanvas.height = 128;
	Viewer3d.textureContext.fillStyle = "#FF33FF"; 	// This determines the text colour, it can take a hex value or rgba value (e.g. rgba(255,0,0,0.5))
	Viewer3d.textureContext.textAlign = "center";	// This determines the alignment of text, e.g. left, center, right
	Viewer3d.textureContext.textBaseline = "middle";	// This determines the baseline of the text, e.g. top, middle, bottom
	Viewer3d.textureContext.font = "12px monospace";	// This determines the size of the text and the font family used
	Viewer3d.textureContext.fillText("3D Pixel Sensor",Viewer3d.textureCanvas.width/2, Viewer3d.textureCanvas.height/2);

	Viewer3d.initWebGL();

	initBuffers();

	Viewer3d.initTexture();


	Viewer3d.hud = new Viewer3d.createHud();

	window.onresize = Viewer3d.handleWindowResize;
	Viewer3d.handleWindowResize();

	Viewer3d.getGeometry();
	Viewer3d.getEvents();

	if(Viewer3d.tickTimer) clearInterval(Viewer3d.tickTimer);
	Viewer3d.tickTimer = setInterval(Viewer3d.tick, Viewer3d.TICK_REFRESH_PERIOD);

	Viewer3d.canvas.onmousedown = Viewer3d.handleCanvasMouseDown;
	Viewer3d.canvas.onmousemove = Viewer3d.handleCanvasMouseMove;
	Viewer3d.canvas.onmousewheel = Viewer3d.handleCanvasMouseWheel;
	Viewer3d.canvas.addEventListener('touchstart',Viewer3d.handleCanvasTouchStart);
	Viewer3d.canvas.addEventListener('touchmove',Viewer3d.handleCanvasTouchMove);
	window.onkeydown = Viewer3d.handleCanvasKeyDown;
	window.onkeyup = Viewer3d.handleCanvasKeyUp;
	Viewer3d.redraw();
}

function handleLoadedTexture(texture, textureCanvas) {
	Debug.log("Viewer3d handleLoadedTexture");
	var gl = Viewer3d.gl;
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);

	gl.bindTexture(gl.TEXTURE_2D, null);
}

//Viewer3d.tick ~~
//	always check keys and periodically check for data
//	and animate camera for fly by
Viewer3d.initTexture = function() {
	Debug.log("Viewer3d initTexture");
	Viewer3d.cTexture = Viewer3d.gl.createTexture();
	handleLoadedTexture(Viewer3d.cTexture, Viewer3d.textureCanvas);
}


//Viewer3d.tick ~~
//	always check keys and periodically check for data
// 	and animate camera for fly by
Viewer3d.tick = function() {

	if(Viewer3d.enableFlyBy)
	{
		var radius = Math.sin(Viewer3d.enableFlyByParameter*Viewer3d.FLY_BY_RADIUS_RATE)*Viewer3d.FLY_BY_RADIUS_SWING/2 +
			Viewer3d.FLY_BY_RADIUS_SWING/2 + Viewer3d.FLY_BY_RADIUS_MIN;
		var height = Math.cos(Viewer3d.enableFlyByParameter*Viewer3d.FLY_BY_HEIGHT_RATE)*Viewer3d.FLY_BY_HEIGHT_MAX;// + Viewer3d.FLY_BY_HEIGHT_MAX;

		vec3.set([Math.cos(Viewer3d.enableFlyByParameter*Viewer3d.FLY_BY_ROT_RATE)*radius,
				  height,
				  Math.sin(Viewer3d.enableFlyByParameter*Viewer3d.FLY_BY_ROT_RATE)*radius],
				Viewer3d.cameraPos);
		vec3.set(Viewer3d.FLY_BY_FOCUS, Viewer3d.cameraFocus);



		//select event to display
		if(!Viewer3d.flyByModeAlarm || //reset alarm and switch mode
				(new Date()).getTime() > Viewer3d.flyByModeAlarm)
		{
			if(Viewer3d.eventToDisplay < 0) //now in accum mode, switch to individual event
			{
				Viewer3d.eventToDisplay = Viewer3d.flyByEvent;
				//reset event timer
				Viewer3d.flyByEventAlarm = (new Date()).getTime() + Viewer3d.FLY_BY_EVENT_TIME;

				Debug.log("Viewer3d tick Fly-by Mode: Individual");
			}
			else	//now in individual event mode, switch to accum mode
			{
				Viewer3d.eventToDisplay = -1;
				Viewer3d.drawTracksFlag = !Viewer3d.drawTracksFlag; //alternate with/without tracks

				Debug.log("Viewer3d tick Fly-by Mode: Accum");
			}

			//reset mode timer
			Viewer3d.flyByModeAlarm = (new Date()).getTime() + Viewer3d.FLY_BY_ACCUM_TIME;
		}

		if(Viewer3d.eventToDisplay >= 0 &&  //then in individual event mode, so check for timer update
				(new Date()).getTime() > Viewer3d.flyByEventAlarm)
		{
			++Viewer3d.flyByEvent;
			if(!Viewer3d.events || Viewer3d.flyByEvent >= Viewer3d.events.length)
				Viewer3d.flyByEvent = 0;
			Viewer3d.eventToDisplay = Viewer3d.flyByEvent;

			//reset event timer
			Viewer3d.flyByEventAlarm = (new Date()).getTime() + Viewer3d.FLY_BY_EVENT_TIME;

			Debug.log("Viewer3d tick Fly-by Event: " + Viewer3d.eventToDisplay);
		}

		//select event to display DONE





		Viewer3d.redraw();

		++Viewer3d.enableFlyByParameter;
	}
	else 	//keys deactivated during fly by
	{
		if(Viewer3d.checkKeyAction() || Viewer3d.cameraAction) //if active key, redraw scene
			Viewer3d.redraw();
	}
}

Viewer3d.handleCanvasKeyDown = function(event) {
	var c = String.fromCharCode(event.keyCode);
	//Debug.log(event.keyCode + " handleKeyDown " + c);
	if((
			c == "A" ||	c == "S" || c == "D" ||	c == "W" ||
			c == "Q" ||	c == "E" || c == "R" ||	c == "F" ||
			c == "%" ||	c == "(" || c == "'" ||	c == "&")	//Left, Down, Right, Up
			&& !Viewer3d.keysDown[c])
		Viewer3d.keysDown[c] = 1;
}

Viewer3d.handleCanvasKeyUp = function(event) {
	var c = String.fromCharCode(event.keyCode);
	if(
			c == "A" ||	c == "S" || c == "D" ||	c == "W" ||
			c == "Q" ||	c == "E" || c == "R" ||	c == "F" ||
			c == "%" ||	c == "(" || c == "'" ||	c == "&")	//Left, Down, Right, Up
		Viewer3d.keysDown[c] = 0;
	else if(c == " " || event.keyCode == 16) //space or shift change speed mode
	{
		Viewer3d.cameraKeyNavFast = !Viewer3d.cameraKeyNavFast;
		Viewer3d.hud.update(); //update hud
	}
	else if(c == "Z") //Z reset camera
	{
		Viewer3d.resetCamera();
		Viewer3d.redraw();
	}
}

Viewer3d.checkKeyAction = function(event) {

   // Debug.log("Viewer3d.checkKeyAction ");
	var actionTaken = false;

	if(Viewer3d.keysDown["Q"] || Viewer3d.keysDown["E"]) //rotate left or right
	{
		var dir = [];
		vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);

		var left = [];
		vec3.cross(Viewer3d.cameraUp,dir,left);
		vec3.normalize(left);
		vec3.scale(left,Viewer3d.cameraKeyNavFast?Viewer3d.KEY_ROT_SPEED_FAST:Viewer3d.KEY_ROT_SPEED_SLOW);

		if(Viewer3d.keysDown["Q"]) vec3.add(Viewer3d.cameraFocus, left, Viewer3d.cameraFocus);
		else vec3.subtract(Viewer3d.cameraFocus, left, Viewer3d.cameraFocus);

		vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);
		vec3.normalize(dir);
		vec3.add(Viewer3d.cameraPos, dir, Viewer3d.cameraFocus);

		actionTaken = true;
	}

	if(Viewer3d.keysDown["R"] || Viewer3d.keysDown["F"]) //rotate down or up
	{
		var dir = [];
		vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);

		var up = [];
		vec3.set(Viewer3d.cameraUp,up);
		vec3.normalize(up);
		vec3.scale(up,Viewer3d.cameraKeyNavFast?Viewer3d.KEY_ROT_SPEED_FAST:Viewer3d.KEY_ROT_SPEED_SLOW);

		if(Viewer3d.keysDown["R"]) vec3.add(Viewer3d.cameraFocus, up, Viewer3d.cameraFocus);
		else vec3.subtract(Viewer3d.cameraFocus, up, Viewer3d.cameraFocus);

		vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);
		vec3.normalize(dir);
		vec3.add(Viewer3d.cameraPos, dir, Viewer3d.cameraFocus);

		actionTaken = true;
	}

	if(Viewer3d.keysDown["A"] || Viewer3d.keysDown["D"] ||
			Viewer3d.keysDown["%"] || Viewer3d.keysDown["'"]) //slide left or right
	{
		var dir = [];
		vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);

		var left = [];
		vec3.cross(Viewer3d.cameraUp,dir,left);
		vec3.normalize(left);
		vec3.scale(left,Viewer3d.cameraKeyNavFast?Viewer3d.KEY_MOVE_SPEED_FAST:Viewer3d.KEY_MOVE_SPEED_SLOW);

		if(Viewer3d.keysDown["%"] || Viewer3d.keysDown["A"]) vec3.add(Viewer3d.cameraPos, left);
		else vec3.subtract(Viewer3d.cameraPos, left);

		vec3.normalize(dir);
		vec3.add(Viewer3d.cameraPos, dir, Viewer3d.cameraFocus);
		actionTaken = true;
	}

	if(Viewer3d.keysDown["("] || Viewer3d.keysDown["&"]) //slide up or down
	{
		var dir = [];
		vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);

		var up = [];
		vec3.set(Viewer3d.cameraUp,up);
		vec3.normalize(up);
		vec3.scale(up,Viewer3d.cameraKeyNavFast?Viewer3d.KEY_MOVE_SPEED_FAST:Viewer3d.KEY_MOVE_SPEED_SLOW);

		if(Viewer3d.keysDown["&"]) vec3.add(Viewer3d.cameraPos, up);
		else vec3.subtract(Viewer3d.cameraPos, up);

		vec3.normalize(dir);
		vec3.add(Viewer3d.cameraPos, dir, Viewer3d.cameraFocus);
		actionTaken = true;
	}

	if(Viewer3d.keysDown["W"] || Viewer3d.keysDown["S"]) //move forward or backward
	{
		var dir = [];
		vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);
		vec3.normalize(dir);
		vec3.scale(dir,Viewer3d.cameraKeyNavFast?Viewer3d.KEY_MOVE_SPEED_FAST:Viewer3d.KEY_MOVE_SPEED_SLOW);

		if(Viewer3d.keysDown["W"]) vec3.add(Viewer3d.cameraPos, dir);
		else vec3.subtract(Viewer3d.cameraPos, dir);

		vec3.normalize(dir);
		vec3.add(Viewer3d.cameraPos, dir, Viewer3d.cameraFocus);
		actionTaken = true;
	}

	if(Viewer3d.keysDown["W"] || Viewer3d.keysDown["S"]) //move forward or backward
	{
		actionTaken = true;
	}

	return actionTaken;
}

Viewer3d.handleCanvasMouseWheel = function(event) {
	var delta = event.wheelDelta/120;
	Viewer3d.zoomCameraByDelta(delta,
			Viewer3d.cameraKeyNavFast?Viewer3d.MOUSE_WHEEL_SPEED_FAST:Viewer3d.MOUSE_WHEEL_SPEED_SLOW);
}

Viewer3d.zoomCameraByDelta = function(delta, speed) {
	if(!delta) return; //0 delta do nothing

	var dir = [];
	vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);
	vec3.normalize(dir);
	vec3.scale(dir,speed);

	if(delta > 0) vec3.add(Viewer3d.cameraPos, dir);
	else vec3.subtract(Viewer3d.cameraPos, dir);

	vec3.normalize(dir);
	vec3.add(Viewer3d.cameraPos, dir, Viewer3d.cameraFocus);

	Viewer3d.cameraAction = true;
}

Viewer3d.handleCanvasTouchMove = function(touchEvent) {

	touchEvent.preventDefault(); //fix chrome issue of only 2 fires
	touchEvent.cancelBubble=true; //eat event away so scrolling doesnt happen
	Viewer3d.lastTouchTime = 0; //prevent a moving finger from firing double tap reset camera view

	var touch = touchEvent.targetTouches[0];
	var newMousePos = [touch.pageX, touch.pageY];
	var touch2 = touchEvent.targetTouches[1];
	if(touch2) //second finger detected, so do zoom action
	{
		var mag = Math.sqrt((touch2.pageX-touch.pageX)*(touch2.pageX-touch.pageX) +
			(touch2.pageY-touch.pageY)*(touch2.pageY-touch.pageY));
		//Debug.log("Viewer3d touch2 " + touch2.pageX + "-" + touch2.pageY + "=" + mag);
		if(Viewer3d.lastTwoTouchMag)
			Viewer3d.zoomCameraByDelta(mag-Viewer3d.lastTwoTouchMag, Viewer3d.TOUCH_ZOOM_SPEED);
		Viewer3d.lastTwoTouchMag = mag;
		Viewer3d.lastMousePos = [-1,-1];	 //prevent weird jumps in transition from zoom to move
		return;
	}

	var delta = [Viewer3d.lastMousePos[0] - newMousePos[0],
				  Viewer3d.lastMousePos[1] - newMousePos[1]];
	if(Viewer3d.lastMousePos[0] > 0) //prevent weird jumps in transition from zoom to move
		Viewer3d.panCameraByDelta(delta,Viewer3d.TOUCH_NAV_SPEED);
	Viewer3d.lastMousePos = newMousePos;
}

Viewer3d.handleCanvasMouseMove = function(event) {

	if(Viewer3d.enableMouseNav && event.which == 1) //left mouse button
	{
		var newMousePos = [event.clientX, event.clientY];

		var delta = [newMousePos[0] - Viewer3d.lastMousePos[0],
					 newMousePos[1] - Viewer3d.lastMousePos[1]];

		Viewer3d.panCameraByDelta(delta,Viewer3d.MOUSE_NAV_SPEED);
		Viewer3d.lastMousePos = newMousePos;
	}
}

Viewer3d.handleCanvasTouchStart = function(touchEvent) {
	var touchTime = new Date().getTime();
	var touch = touchEvent.targetTouches[0];
	Viewer3d.lastMousePos = [touch.pageX, touch.pageY];
	if(Viewer3d.lastTouchTime && !touchEvent.targetTouches[1] && //test if single-finger double tap occured
			touchTime - Viewer3d.lastTouchTime < Viewer3d.DOUBLE_TAP_RESET_TIME)
	{	//double tap detected!!

		touchEvent.preventDefault(); //prevent native zoom action

		if(touch.pageY < Viewer3d.DOUBLE_TAP_HUD_Y_ACCEPT && 	//expand 3d hud!
				touch.pageX > window.innerWidth - Viewer3d.hud.hudMouseOverDiv.offsetWidth - 2*Viewer3d.HUD_MARGIN_RIGHT)
		{
			Viewer3d.hud.mouseOverDropDown();
			return;
		}

		if(touch.pageY < Viewer3d.DOUBLE_TAP_HUD_Y_ACCEPT && 	//expand top level visualization hud!
				touch.pageX < Viewer3d.hud.hudMouseOverDiv.offsetWidth + 2*Viewer3d.HUD_MARGIN_RIGHT)
		{
			mouseOverDropDown();
			return;
		}

		//else reset camera view
		Debug.log("Viewer3d handleCanvasTouchStart Double Tap Reset Camera! " + (touchTime - Viewer3d.lastTouchTime));
		Viewer3d.resetCamera();
		Viewer3d.redraw();
		return;
	}

	Viewer3d.lastTouchTime = touchTime;
	Viewer3d.hud.mouseOutDropDown();	//elevate drop downs if touches going on
	mouseOutDropDown(); //top level visualization drop down hud
}

Viewer3d.handleCanvasMouseDown = function(event) {
	Debug.log("Viewer3d handleCanvasMouseDown ");
	Viewer3d.lastMousePos = [event.clientX, event.clientY];
	window.focus(); //manual focus since return false
	if(Viewer3d.hud)	//manual remove focus from any text inputs!
		Viewer3d.hud.hudRunNumberInput.blur();
	return false; //return false to cancel drag and drop action
}

Viewer3d.panCameraByDelta = function(delta, speed) {
	if(!delta[0] && !delta[1]) return;

	//rotate left/right
	var dir = [];
	vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);

	var left = [];
	vec3.cross(Viewer3d.cameraUp,dir,left);
	vec3.normalize(left);
	vec3.scale(left,-delta[0]*speed);

	vec3.add(Viewer3d.cameraFocus, left, Viewer3d.cameraFocus);

	vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);
	vec3.normalize(dir);
	vec3.add(Viewer3d.cameraPos, dir, Viewer3d.cameraFocus);

	//rotate up/down
	var up = [];
	vec3.set(Viewer3d.cameraUp,up);
	vec3.normalize(up);
	vec3.scale(up,-delta[1]*speed);

	vec3.add(Viewer3d.cameraFocus, up, Viewer3d.cameraFocus);
	vec3.subtract(Viewer3d.cameraFocus,Viewer3d.cameraPos,dir);
	vec3.normalize(dir);
	vec3.add(Viewer3d.cameraPos, dir, Viewer3d.cameraFocus);

	Viewer3d.cameraAction = true;
}

Viewer3d.handleWindowResize = function() {

	var w = window.innerWidth < Viewer3d.CANVAS_MIN_SIZE? Viewer3d.CANVAS_MIN_SIZE:window.innerWidth;
	var h = window.innerHeight < Viewer3d.CANVAS_MIN_SIZE? Viewer3d.CANVAS_MIN_SIZE:window.innerHeight;

	Debug.log("Viewer3d.handleWindowResize " + w + "-" + h);

	Viewer3d.omni.style.width = w + "px";
	Viewer3d.omni.style.height = h + "px";
	Viewer3d.canvas.style.width = w + "px";
	Viewer3d.canvas.style.height = h + "px";
	Viewer3d.canvas.width = w;
	Viewer3d.canvas.height = h;

	//resize webGL
	var gl = Viewer3d.gl;
	gl.viewportWidth = Viewer3d.canvas.width;
	gl.viewportHeight = Viewer3d.canvas.height;
	gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
	gl.enable(Viewer3d.gl.DEPTH_TEST);           // Enable depth testing
	gl.depthFunc(Viewer3d.gl.LEQUAL);            // Near things obscure far things
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, Viewer3d.WEBGL_NEAR_CLIPPING_DEPTH, Viewer3d.WEBGL_FAR_CLIPPING_DEPTH, Viewer3d.perspectiveMatrix);

	//reposition HUD
	Viewer3d.hud.handleWindowResize();

	//redraw 3d world
	Viewer3d.redraw();
}

// Viewer3d.initWebGL ~~
//		warns user that their browser is incompatible
Viewer3d.initWebGL = function() {
	try {
		Viewer3d.gl = Viewer3d.canvas.getContext("webgl") || Viewer3d.canvas.getContext("experimental-webgl");
	}
	catch (e) {   alert("Could not initialize WebGL, sorry :-("); return;		}

	if (!Viewer3d.gl) {   alert("Could not initialize WebGL! sorry :-("); return;		}

	Viewer3d.initShaders();

	Viewer3d.perspectiveMatrix = mat4.create();
	Viewer3d.modelViewMatrix = mat4.create();

	Viewer3d.resetCamera();
	Viewer3d.initAxesAndGridBuffers();
}

Viewer3d.resetCamera = function() {
	Viewer3d.cameraPos = [];
	Viewer3d.cameraUp = [];
	Viewer3d.cameraFocus = [];
	vec3.set(Viewer3d.WEBGL_RESET_CAMERA_POS, Viewer3d.cameraPos);
	vec3.set(Viewer3d.WEBGL_RESET_CAMERA_UP, Viewer3d.cameraUp);
	vec3.set(Viewer3d.WEBGL_RESET_CAMERA_FOCUS, Viewer3d.cameraFocus);

	//gaurantee vectors are normalized
	vec3.normalize(Viewer3d.cameraUp);

	Debug.log("Viewer3d.resetCamera to pos: " + Viewer3d.cameraPos + " focus: " + Viewer3d.cameraFocus + " up: " + Viewer3d.cameraUp);

}

Viewer3d.initShaders = function() {

	//get fragment shader
	var req = new XMLHttpRequest();
	req.open("GET",'/WebPath/js/js_lib/webgl_shader-fs.shader', false);
	req.send(null);
	var fsCode = (req.status == 200) ? req.responseText : null;
	if(!fsCode) {   alert("Could not initialize WebGL fs shaders, sorry :-("); return;		}
	Viewer3d.fragmentShader = Viewer3d.gl.createShader(Viewer3d.gl.FRAGMENT_SHADER);
	//Debug.log("fragmentShader" + fsCode);
	Viewer3d.gl.shaderSource(Viewer3d.fragmentShader, fsCode);
	Viewer3d.gl.compileShader(Viewer3d.fragmentShader);
	if (!Viewer3d.gl.getShaderParameter(Viewer3d.fragmentShader, Viewer3d.gl.COMPILE_STATUS))
	{
		alert("An error occurred compiling the fragment shader: " + Viewer3d.gl.getShaderInfoLog(Viewer3d.fragmentShader));
		return;
	}

	//get vertex shader
	req = new XMLHttpRequest();
	req.open("GET",'/WebPath/js/js_lib/webgl_shader-vs.shader', false);
	req.send(null);
	var vsCode = (req.status == 200) ? req.responseText : null;
	if(!vsCode) {   alert("Could not initialize WebGL vs shaders, sorry :-("); return;		}
	Viewer3d.vertexShader = Viewer3d.gl.createShader(Viewer3d.gl.VERTEX_SHADER);
	//Debug.log("vertexShader" + vsCode);
	Viewer3d.gl.shaderSource(Viewer3d.vertexShader, vsCode);
	Viewer3d.gl.compileShader(Viewer3d.vertexShader);
	if (!Viewer3d.gl.getShaderParameter(Viewer3d.vertexShader, Viewer3d.gl.COMPILE_STATUS))
	{
		alert("An error occurred compiling the vertex shader: " + Viewer3d.gl.getShaderInfoLog(Viewer3d.vertexShader));
		return;
	}

	//setup shader progam
	Viewer3d.shaderProgram = Viewer3d.gl.createProgram();
	Viewer3d.gl.attachShader(Viewer3d.shaderProgram, Viewer3d.vertexShader);
	Viewer3d.gl.attachShader(Viewer3d.shaderProgram, Viewer3d.fragmentShader);
	Viewer3d.gl.linkProgram(Viewer3d.shaderProgram);

	if (!Viewer3d.gl.getProgramParameter(Viewer3d.shaderProgram, Viewer3d.gl.LINK_STATUS))
	{    alert("Could not initialize shader program"); return;	}

	Viewer3d.gl.useProgram(Viewer3d.shaderProgram);

	Viewer3d.shaderProgram.vertexPositionAttribute = Viewer3d.gl.getAttribLocation(Viewer3d.shaderProgram, "aVertexPosition");
	Viewer3d.gl.enableVertexAttribArray(Viewer3d.shaderProgram.vertexPositionAttribute);

	Viewer3d.shaderProgram.vertexColorAttribute = Viewer3d.gl.getAttribLocation(Viewer3d.shaderProgram, "aVertexColor");
	Viewer3d.gl.enableVertexAttribArray(Viewer3d.shaderProgram.vertexColorAttribute);

	Viewer3d.shaderProgram.pMatrixUniform = Viewer3d.gl.getUniformLocation(Viewer3d.shaderProgram, "uPMatrix");
	Viewer3d.shaderProgram.mvMatrixUniform = Viewer3d.gl.getUniformLocation(Viewer3d.shaderProgram, "uMVMatrix");
}

Viewer3d.createHud = function() {

	var hudMouseOverDiv;
	var animationTargetTop, isDropDownAnimating, isDropDownDown;
	var controlMouseIsDown = false;
	var controlMouseTimeout = 0;
	var getEventsTimeout = 0;

	this.isInMotion = function() { return isDropDownAnimating; }

	this.handleWindowResize = function() {
		Debug.log("Viewer3d Hud handleWindowResize");
		this.hudMouseOverDiv.style.left = window.innerWidth - this.hudMouseOverDiv.offsetWidth - Viewer3d.HUD_MARGIN_RIGHT + "px";

		this.hudNavSpeedDiv.style.left = 5 + "px";
		this.hudNavSpeedDiv.style.top = window.innerHeight - 95 + "px";

		this.update();
	}

	this.checkboxUpdate = function(i) {
		var chk = document.getElementById("hudCheckbox" + i);
		Debug.log("Viewer3d Hud checkboxUpdate " + i + "=" + chk.checked);

		if(i==0) Viewer3d.drawAxesFlag = chk.checked; //axes
		else if(i==1) Viewer3d.drawGridFlag = chk.checked; //grid
		else if(i==2) Viewer3d.drawTracksFlag = chk.checked; //tracks
		else if(i==3) Viewer3d.enableMouseNav = chk.checked; //mouse nav
		else if(i==4) Viewer3d.enableFlyBy = chk.checked; //fly-by
		else if(i==5) Viewer3d.accumulateEvents = chk.checked; //accumulate

		Viewer3d.redraw();
		this.update();
	}

	this.update = function() {

		this.hudNavSpeedDiv.innerHTML = "Tests of radiation-hard sensors for the SLHC<br>";
		this.hudNavSpeedDiv.innerHTML += "at the Fermi Test Beam Facility.<br>";
		this.hudNavSpeedDiv.innerHTML += "Devices under test for this run were 3D Pixel Sensors.<br>";
		if(Viewer3d.enableFlyBy)
			this.hudNavSpeedDiv.innerHTML += "Fly-by Mode";
		else
			this.hudNavSpeedDiv.innerHTML += "Nav Speed: " + (Viewer3d.cameraKeyNavFast?"Fast":"Slow");

		var str = "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + ((Viewer3d.accumulateEvents && Viewer3d.eventToDisplay<0)?"Events Accumulated":("Event: " +
				(Viewer3d.eventToDisplay<0?"All":Viewer3d.eventToDisplay)));
		str += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + "Run: " + (Viewer3d.runNumber < 0?"Not found":Viewer3d.runNumber);
		this.hudNavSpeedDiv.innerHTML += str;

		this.hudEventNumber.innerHTML = "Event #: " + (Viewer3d.eventToDisplay<0?"All":Viewer3d.eventToDisplay);

		if(Viewer3d.accumulateEvents)
			this.hudEventNumberControls.style.display = "none";
		else
			this.hudEventNumberControls.style.display = "block";
	}

	// animateDropDown ~~
	var animateDropDown = function() {
		var dir = (animationTargetTop - hudMouseOverDiv.offsetTop > 0)? 1: -1;

		var tmpTop = hudMouseOverDiv.offsetTop + dir*Viewer3d.HUD_DROP_DOWN_SPEED;
		if(Math.abs(tmpTop - animationTargetTop) <= Viewer3d.HUD_DROP_DOWN_SPEED) //done
		{
			hudMouseOverDiv.style.top = animationTargetTop + "px";
			isDropDownAnimating = false;
			return;
		}
		//else still going towards target
		hudMouseOverDiv.style.top = tmpTop + "px";
		window.setTimeout(animateDropDown,30);
	}

	// mouseOverDropDown ~~
	var mouseOverDropDown = this.mouseOverDropDown = function() {
		if(isDropDownAnimating) return; //do nothing if animating currently

		if(!isDropDownDown) //start animation
		{
			isDropDownDown = true;
			isDropDownAnimating = true;
			animationTargetTop = -15;
			window.setTimeout(animateDropDown,30);
		}
	}

	// mouseOutDropDown ~~
	var mouseOutDropDown = this.mouseOutDropDown = function(event) {
		if(isDropDownAnimating) return; //do nothing if animating currently

		if(event)
		{
			var e = event.toElement || event.relatedTarget;
			while(e)	//if moving within drop down menu ignore
			{
				if(e == this) return;
				e = e.parentNode;
			}
		}

		if(isDropDownDown) //start animation
		{
			isDropDownDown = false;
			isDropDownAnimating = true;
			animationTargetTop = 15 - hudMouseOverDiv.offsetHeight;
			window.setTimeout(animateDropDown,30);
		}
	}

	//for event and run number buttons
	this.handleControlDown = function(i,evt) {
		//Debug.log("hud control down " + i);

		var to = 500;
		if(controlMouseIsDown) //already mouse down, so do action
		{
			to = 10;
			doControlAction(i);
		}
		else if(evt)
			controlMouseIsDown = true;

		if(controlMouseIsDown)
		{
			if(controlMouseTimeout) window.clearTimeout(controlMouseTimeout);
			controlMouseTimeout = window.setTimeout(function() {Viewer3d.hud.handleControlDown(i)},to);
		}
	}

	//for event and run number buttons
	this.handleControlUp = function(i) {
		if(!controlMouseIsDown) return;

		//Debug.log("hud control up " + i);

		if(controlMouseTimeout) window.clearTimeout(controlMouseTimeout);
		controlMouseIsDown = false;
		doControlAction(i);		//do action on mouse up
	}

	//for event and run number buttons
	var doControlAction = function(i) {
		switch(i)
		{
		case 0:
		case 1:
		case 2:
		case 3:
			if(i!=1 && i!=2)
				Viewer3d.eventToDisplay += (i==0?-1:1)*parseInt(Viewer3d.events.length/5+1);
			else
				Viewer3d.eventToDisplay += (i==1?-1:1);

			if(Viewer3d.eventToDisplay < 0)
				Viewer3d.eventToDisplay = 0;
			if(Viewer3d.eventToDisplay >= Viewer3d.events.length)
				Viewer3d.eventToDisplay = Viewer3d.events.length - 1;
			break;
		case 4: //dec run #
		case 5: //inc run #
			Viewer3d.hud.hudRunNumberInput.value = parseInt(Viewer3d.hud.hudRunNumberInput.value) + (i*2-9);
			if(Viewer3d.hud.hudRunNumberInput.value < 0) Viewer3d.hud.hudRunNumberInput.value = 0;
			if(getEventsTimeout) window.clearTimeout(getEventsTimeout);
			getEventsTimeout = window.setTimeout(Viewer3d.getEvents,1000);
			break;
		default:
			Debug.log("hud doControlAction unknown action" + i);
			return;
		}

		Viewer3d.hud.update();
	}

	//only allow positive integers, remove all non numbers and parse as int
	this.handleRunChange = function() {
		//Debug.log("hud handleRunChange " );
		var s = this.hudRunNumberInput.value;
		for(var i=0;i<s.length;++i)
		{
			if(!(parseInt(s[i])+1)) //remove non numbers
			{
				s = s.substr(0,i) + s.substr(i+1);
				--i; //rewind
			}
		}
		s = parseInt(s);
		if(s+"" != this.hudRunNumberInput.value) //string comparison
		{
			this.hudRunNumberInput.value = s;
			Debug.log("hud handleRunChange " + s);
		}
	}


	this.hudNavSpeedDiv = document.createElement('div');
	this.hudNavSpeedDiv.setAttribute("id", "Viewer3d-hudNavSpeedOverlay");
	this.hudNavSpeedDiv.style.position = "absolute";
	this.hudNavSpeedDiv.style.zIndex = 100;
	Viewer3d.omni.appendChild(this.hudNavSpeedDiv);


	hudMouseOverDiv = this.hudMouseOverDiv = document.createElement('div');
	hudMouseOverDiv.setAttribute("id", "Viewer3d-hudMouseOver");
	hudMouseOverDiv.style.position = "absolute";
	hudMouseOverDiv.style.zIndex = 100;

	this.hudDiv = document.createElement('div');
	this.hudDiv.setAttribute("id", "Viewer3d-hud");
	var chkLabels = ["Show Axes","Show Grid","Show Tracks", "Mouse Nav","Fly-By","Accumulated"];
	var chkDefaults = ["checked","checked","checked","checked",Viewer3d.enableFlyBy?"checked":"",Viewer3d.accumulateEvents?"checked":""];
	var str = "";
	for(var i=0;i<chkLabels.length;++i)
		str += "<input type='checkbox' id='hudCheckbox" + i + "' onchange='Viewer3d.hud.checkboxUpdate(" + i +
					");' " + chkDefaults[i] + "><label for='hudCheckbox" + i + "'>" + chkLabels[i] + "</label><br>";

	//add event controls
	str += "<center><div id='Viewer3d-hudEventNumberControls'><div id='Viewer3d-hudEventNumber'></div>";
	var evtNumBtns = ["<<","<",">",">>"];
	for(var i=0;i<evtNumBtns.length;++i)
		str += "<input type='button' onmousedown='Viewer3d.hud.handleControlDown(" + i + ",event);' " +
			"onmouseup='Viewer3d.hud.handleControlUp(" + i + ");' " +
			"onmouseout='Viewer3d.hud.handleControlUp(" + i + ");' " +
			"value='" + evtNumBtns[i] + "' />";
	str += "</div></center>";

	//add run controls
	if(DesktopContent._theDesktopWindow) //only add if successful login
	{
		str += "<div id='Viewer3d-hudRunNumberControls'>Run #: " +
				"<input id='Viewer3d-hudRunNumberControls-textInput' oninput='Viewer3d.hud.handleRunChange();' type='text' value='40' > ";
		evtNumBtns = ["<",">"];
		for(var i=0;i<evtNumBtns.length;++i)
			str += "<input type='button' onmousedown='Viewer3d.hud.handleControlDown(" + (i+4) + ",event);' " +
				"onmouseup='Viewer3d.hud.handleControlUp(" + (i+4) + ");' " +
				"onmouseout='Viewer3d.hud.handleControlUp(" + (i+4) + ");' " +
				"value='" + evtNumBtns[i] + "' />";
		str += "</div>";
	}
	else
	{
		str += "<input id='Viewer3d-hudRunNumberControls-textInput' type='hidden' value='40' >";

		this.hudUrlOverlay = document.createElement('div');
		this.hudUrlOverlay.setAttribute("id", "Viewer3d-hudUrlOverlay");
		this.hudUrlOverlay.style.position = "absolute";
		this.hudUrlOverlay.style.zIndex = 100;
		this.hudUrlOverlay.style.left = 5 + "px";
		this.hudUrlOverlay.style.top = 5 + "px";
		this.hudUrlOverlay.innerHTML = "Try on your own mobile device!<br>http://tinyurl.com/q6lhdrm";
		Viewer3d.omni.appendChild(this.hudUrlOverlay);
	}

	this.hudDiv.innerHTML = str;

//	_historyEl.onmousewheel = handleUserInputScroll;
//	_historyEl.onmousedown = handleUserInputScroll;
//	this.hudEventScrollbar.onscroll = this.handleEventScroll;
//	_historyEl.onmousemove = handleMouseMoveScroll;

	hudMouseOverDiv.appendChild(this.hudDiv);

	hudMouseOverDiv.style.top = hudMouseOverDiv.offsetHeight - 15 + "px";
	hudMouseOverDiv.style.width = Viewer3d.HUD_WIDTH + "px";
	hudMouseOverDiv.onmouseover = mouseOverDropDown;
	hudMouseOverDiv.onmouseout = mouseOutDropDown;
	Viewer3d.omni.appendChild(hudMouseOverDiv);

	this.hudEventNumber = document.getElementById('Viewer3d-hudEventNumber'); //get reference
	this.hudEventNumberControls = document.getElementById('Viewer3d-hudEventNumberControls'); //get reference
	this.hudRunNumberInput = document.getElementById('Viewer3d-hudRunNumberControls-textInput'); //get reference

	//setup dropdown effect
	isDropDownDown = false;
	isDropDownAnimating = true;
	animationTargetTop = 15 - hudMouseOverDiv.offsetHeight;
	window.setTimeout(animateDropDown,30);
	this.handleWindowResize();
}


Viewer3d.getEvents = function() {
	Debug.log("Viewer3d getEvents for run " + Viewer3d.hud.hudRunNumberInput.value);
	DesktopContent.XMLHttpRequest("Request?RequestType=getEvents&run=" +
			parseInt(Viewer3d.hud.hudRunNumberInput.value), "", Viewer3d.getEventsHandler);
}

//Viewer3d.getEventsHandler ~~
Viewer3d.getEventsHandler = function (req) {
	//Debug.log("Viewer3d getEventsHandler " + req.responseText.substr(1000));
	Viewer3d.runNumber = Viewer3d.hud.hudRunNumberInput.value; //update loaded run number
	var events = req.responseXML.getElementsByTagName("event");

	Viewer3d.events = [];
	var evt, cnt;
	var gl = Viewer3d.gl;
	var locPoints, xyzPoints, slopes, intercepts;
	var locSlope = [];
	var locIntcpt = [];
	var pixelSz = 200;
	var trackSz = 1000000;
	for(var i=0;i<events.length;++i)
	{
		xyzPoints = events[i].getElementsByTagName("xyz_point");

		//create a new event to hold clusters and tracks
		evt = Viewer3d.events.length;
		Viewer3d.events[evt] = Viewer3d.events[evt] || {};
		Viewer3d.events[evt].clusters = [];

		//clusters
		locPoints = [];
		for(var j=0;j<xyzPoints.length;++j) //for each cluster point, make a square
		{
			if(j%3==2) //have the x,y of cluster point started, finish it
			{
				locPoints[locPoints.length] = xyzPoints[j].getAttribute("value")/Viewer3d.Z_SQUASH_FACTOR;

				for(var k=0;k<3;++k) //make the 3 other points of square, original point is top left, and then two adj, and then opposite for TRIANGLE_STRIP
				{
					locPoints[locPoints.length] = locPoints[locPoints.length-3*(k+1)] + (k==0?pixelSz:(k==1?0:pixelSz));
					locPoints[locPoints.length] = locPoints[locPoints.length-3*(k+1)] + (k==0?0:(k==1?pixelSz:pixelSz));
					locPoints[locPoints.length] = locPoints[locPoints.length-3*(k+1)];
				}

				//a new cluster is complete

				cnt = Viewer3d.events[evt].clusters.length;
				Viewer3d.events[evt].clusters[cnt] = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.events[evt].clusters[cnt]);
				gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(locPoints), gl.STATIC_DRAW);
				Viewer3d.events[evt].clusters[cnt].itemSize = 3;
				Viewer3d.events[evt].clusters[cnt].numItems = locPoints.length/3;
				locPoints = [];
			}
			else //get x and y
				locPoints[locPoints.length] = xyzPoints[j].getAttribute("value") - pixelSz/2;
		}

		//tracks
		slopes = events[i].getElementsByTagName("slope");
		intercepts = events[i].getElementsByTagName("intcpt");
		locPoints = [];
		for(var j=0;j<slopes.length;j+=2) //for each track, make a line
		{
			locSlope[0] = parseInt(slopes[j].getAttribute("value"))/Viewer3d.Z_SQUASH_FACTOR;
			locSlope[1] = parseInt(slopes[j+1].getAttribute("value"))/Viewer3d.Z_SQUASH_FACTOR;
			locIntcpt[0] = parseInt(intercepts[j].getAttribute("value"));
			locIntcpt[1] = parseInt(intercepts[j+1].getAttribute("value"));
			locPoints[locPoints.length] = locSlope[0]*-trackSz + locIntcpt[0]; 		//x
			locPoints[locPoints.length] = locSlope[1]*-trackSz + locIntcpt[1]; 		//y
			locPoints[locPoints.length] = -trackSz; 								//z
			locPoints[locPoints.length] = locSlope[0]*trackSz + locIntcpt[0]; 		//x
			locPoints[locPoints.length] = locSlope[1]*trackSz + locIntcpt[1]; 		//y
			locPoints[locPoints.length] = trackSz; 									//z
		}
		//Debug.log("Viewer3d getEventsHandler event locPoints " + locPoints);

		Viewer3d.events[evt].tracks = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.events[evt].tracks);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(locPoints), gl.STATIC_DRAW);
		Viewer3d.events[evt].tracks.itemSize = 3;
		Viewer3d.events[evt].tracks.numItems = locPoints.length/3;
	}

	Debug.log("Viewer3d getEventsHandler event count " + Viewer3d.events.length);
	Viewer3d.cameraAction = true;
}

Viewer3d.getGeometry = function() {
	Debug.log("Viewer3d.getGeometry ");
	DesktopContent.XMLHttpRequest("Request?RequestType=getGeometry", "", Viewer3d.getGeometryHandler);
}

// Viewer3d.getGeometryHandler ~~
Viewer3d.getGeometryHandler = function (req) {
	//Debug.log("Viewer3d getGeometryHandler " + req.responseText);

	var objects = req.responseXML.getElementsByTagName("object");

	Viewer3d.geometry = [];
	var gi;
	var gl = Viewer3d.gl;
	var locPoints, xyzPoints, objectType;
	for(var i=0;i<objects.length;++i)
	{
		//TODO if different geometries, use object type
		//objectType = objects[i].getElementsByTagName("object_type");
		//Debug.log("Rotating3d getGeometry objectType " + objectType[0].getAttribute("value"));

		xyzPoints = objects[i].getElementsByTagName("xyz_point");

		locPoints = [];
		for(var j=0;j<xyzPoints.length;++j)
			locPoints[locPoints.length] = xyzPoints[j].getAttribute("value")/(j%3==2?Viewer3d.Z_SQUASH_FACTOR:1.0);


		gi = Viewer3d.geometry.length;
		Viewer3d.geometry[gi] = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.geometry[gi]);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(locPoints), gl.STATIC_DRAW);
		Viewer3d.geometry[gi].itemSize = 3;
		Viewer3d.geometry[gi].numItems = locPoints.length/3;
	}

	Debug.log("Viewer3d getGeometryHandler  geometry objects " + Viewer3d.geometry.length);
	Viewer3d.canvas.style.zIndex = 0; //Bring canvas to front, above "Loading..." if not already there

	Viewer3d.cameraAction = true;
}

Viewer3d.mvPushMatrix = function() {
	copy = mat4.create();
	mat4.set(Viewer3d.modelViewMatrix, copy);
	Viewer3d.modelViewMatrixStack.push(copy);
}

Viewer3d.mvPopMatrix = function() {
	if (Viewer3d.modelViewMatrixStack.length == 0) {
		throw "Invalid popMatrix!";
	}
	Viewer3d.modelViewMatrix = Viewer3d.modelViewMatrixStack.pop();
}

//Viewer3d.setMatrixUniforms ~~
//	pushes the shader matrices to the from js to webgl world
//	need to call any time matrices are modified
Viewer3d.setMatrixUniforms = function() {
	Viewer3d.gl.uniformMatrix4fv(Viewer3d.shaderProgram.pMatrixUniform, false, Viewer3d.perspectiveMatrix);
	Viewer3d.gl.uniformMatrix4fv(Viewer3d.shaderProgram.mvMatrixUniform, false, Viewer3d.modelViewMatrix);
}


//Viewer3d.redraw ~~
//	called to redraw 3d objects
Viewer3d.redraw = function () {

	if(Viewer3d.hud.isInMotion()) return;

	Viewer3d.initForDraw();
	if(Viewer3d.drawAxesFlag) Viewer3d.drawAxes();
	if(Viewer3d.drawGridFlag) Viewer3d.drawGrid();
	Viewer3d.drawGeometry();

	//drawScene();

	Viewer3d.drawClusters((Viewer3d.accumulateEvents && !Viewer3d.enableFlyBy)?-1:Viewer3d.eventToDisplay);
	if(Viewer3d.drawTracksFlag) Viewer3d.drawTracks((Viewer3d.accumulateEvents && !Viewer3d.enableFlyBy)?-1:Viewer3d.eventToDisplay);
	Viewer3d.hud.update(); //update hud
}

Viewer3d.initForDraw = function() {

	var gl = Viewer3d.gl;
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	mat4.identity(Viewer3d.modelViewMatrix);

	//generate camera lookAt matrix and apply
	var tmpLookAtMatrix = [];
	mat4.lookAt(Viewer3d.cameraPos, Viewer3d.cameraFocus, Viewer3d.cameraUp, tmpLookAtMatrix);
	mat4.multiply(Viewer3d.modelViewMatrix,tmpLookAtMatrix);   //apply camera rotation
	Viewer3d.setMatrixUniforms();
}

Viewer3d.initAxesAndGridBuffers = function() {
	var gl = Viewer3d.gl;

	//for axes
	var tmpArray = [ //for gl.LINE
		0,0,0,
		Viewer3d.WEBGL_AXES_LENGTH,0,0,
		0,0,0,
		0,Viewer3d.WEBGL_AXES_LENGTH,0,
		0,0,0,
		0,0,Viewer3d.WEBGL_AXES_LENGTH            ]

	Viewer3d.axes = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.axes);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tmpArray), gl.STATIC_DRAW);
	Viewer3d.axes.itemSize = 3;
	Viewer3d.axes.numItems = tmpArray.length/3;

	//for grid
	tmpArray = [];
	var ti = 0;
	for(var x = 0; x <= 2; x+=2) //lines parallel to x axis and then to z axis
		for(var i = -Viewer3d.WEBGL_GRID_EXPANSE; i <= Viewer3d.WEBGL_GRID_EXPANSE; i += Viewer3d.WEBGL_GRID_SPACING)
			for(var j = -Viewer3d.WEBGL_GRID_EXPANSE; j <= Viewer3d.WEBGL_GRID_EXPANSE; j += Viewer3d.WEBGL_GRID_EXPANSE*2, ++ti)
			{
				tmpArray[ti*3 + x] = j; //first time this is x coord, second time z
				tmpArray[ti*3 + 2 - x] = i; //first time this is z coord, second time x
				tmpArray[ti*3 + 1] = Viewer3d.WEBGL_GRID_YOFF;
			}

	Viewer3d.grid = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.grid);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tmpArray), gl.STATIC_DRAW);
	Viewer3d.grid.itemSize = 3;
	Viewer3d.grid.numItems = tmpArray.length/3;

	//Debug.log(tmpArray);
}

Viewer3d.drawAxes = function() {
	var gl = Viewer3d.gl;

	var geometryColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, geometryColorBuffer);
	var colors = [];
	for (var i=0; i < Viewer3d.axes.numItems; i++)
		 colors = colors.concat([1.0, 1.0, 1.0, 1.0]);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, geometryColorBuffer);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	gl.lineWidth(2.0);
	gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.axes);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexPositionAttribute, Viewer3d.axes.itemSize, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.LINES, 0, Viewer3d.axes.numItems);
}

Viewer3d.drawGrid = function() {
	var gl = Viewer3d.gl;


	var geometryColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, geometryColorBuffer);
	var colors = [];
	for (var i=0; i < Viewer3d.grid.numItems; i++)
		 colors = colors.concat([0.5, 0.5, 0.5, 1.0]);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, geometryColorBuffer);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	gl.lineWidth(1.0);
	gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.grid);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexPositionAttribute, Viewer3d.grid.itemSize, gl.FLOAT, false, 0, 0);
	gl.drawArrays(gl.LINES, 0, Viewer3d.grid.numItems);
}

Viewer3d.drawGeometry = function() {

	if(!Viewer3d.geometry) return;

	var gl = Viewer3d.gl;
	gl.lineWidth(4.0);

	var geometryColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, geometryColorBuffer);
	var colors = [];
	for (var i=0; i < 4; i++)
		 colors = colors.concat([0.0, 0.0, 1.0, 1.0]);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, geometryColorBuffer);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	for(var i=0;i<Viewer3d.geometry.length;++i)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.geometry[i]);
		gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexPositionAttribute, Viewer3d.geometry[i].itemSize, gl.FLOAT, false, 0, 0);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, Viewer3d.cTexture);

		//gl.drawArrays(gl.TRIANGLE_STRIP, 0, Viewer3d.geometry[i].numItems);
		gl.drawArrays(gl.LINE_LOOP, 0, Viewer3d.geometry[i].numItems);
	}

}


Viewer3d.drawClusters = function(evt) {

	if(!Viewer3d.events) return;

	var gl = Viewer3d.gl;
	gl.lineWidth(2.0);

	var clusterColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, clusterColorBuffer);
	var colors = [];
	for (var i=0; i < 4; i++)
		 colors = colors.concat([1.0, 0.0, 0.0, 1.0]);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, clusterColorBuffer);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);

	var lo = evt < 0?0:evt;
	var hi = evt < 0?Viewer3d.events.length:(evt+1);
	for(var i=lo;i<hi && i<Viewer3d.events.length;++i)
	{
		for(var c=0;c<Viewer3d.events[i].clusters.length;++c) //clusters
		{
			gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.events[i].clusters[c]);
			gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexPositionAttribute,
					Viewer3d.events[i].clusters[c].itemSize, gl.FLOAT, false, 0, 0);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, Viewer3d.events[i].clusters[c].numItems);
		}
	}
}


Viewer3d.drawTracks = function(evt) {

	if(!Viewer3d.events) return;

	var gl = Viewer3d.gl;
	gl.lineWidth(2.0);

	var clusterColorBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, clusterColorBuffer);
	var colors = [];
	for (var i=0; i < 4; i++)
		 colors = colors.concat([1%2, 1.0, 0.0, 1.0]);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, clusterColorBuffer);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexColorAttribute, 2, gl.FLOAT, false, 0, 0);

	var lo = evt < 0?0:evt;
	var hi = evt < 0?Viewer3d.events.length:(evt+1);
	for(var i=lo;i<hi && i<Viewer3d.events.length;++i)
	{
		gl.bindBuffer(gl.ARRAY_BUFFER, Viewer3d.events[i].tracks);
		gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexPositionAttribute,
				Viewer3d.events[i].tracks.itemSize, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.LINES, 0, Viewer3d.events[i].tracks.numItems);
	}
}

var cubeVertexPositionBuffer;
var cubeVertexNormalBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

function initBuffers() {
	var gl = Viewer3d.gl;
	cubeVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	vertices = [
		// Front face
		-1.0, -1.0,  1.0,
		 1.0, -1.0,  1.0,
		 1.0,  1.0,  1.0,
		-1.0,  1.0,  1.0,

		// Back face
		-1.0, -1.0, -1.0,
		-1.0,  1.0, -1.0,
		 1.0,  1.0, -1.0,
		 1.0, -1.0, -1.0,

		// Top face
		-1.0,  1.0, -1.0,
		-1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0,
		 1.0,  1.0, -1.0,

		// Bottom face
		-1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0,
		 1.0, -1.0,  1.0,
		-1.0, -1.0,  1.0,

		// Right face
		 1.0, -1.0, -1.0,
		 1.0,  1.0, -1.0,
		 1.0,  1.0,  1.0,
		 1.0, -1.0,  1.0,

		// Left face
		-1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		-1.0,  1.0,  1.0,
		-1.0,  1.0, -1.0,
	];
	//for(var i = 0;i<vertices.length;++i)
	//	vertices[i] *= 1.0;//10000;
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	cubeVertexPositionBuffer.itemSize = 3;
	cubeVertexPositionBuffer.numItems = 24;

	cubeVertexNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
	var vertexNormals = [
		// Front face
		 0.0,  0.0,  1.0,
		 0.0,  0.0,  1.0,
		 0.0,  0.0,  1.0,
		 0.0,  0.0,  1.0,

		// Back face
		 0.0,  0.0, -1.0,
		 0.0,  0.0, -1.0,
		 0.0,  0.0, -1.0,
		 0.0,  0.0, -1.0,

		// Top face
		 0.0,  1.0,  0.0,
		 0.0,  1.0,  0.0,
		 0.0,  1.0,  0.0,
		 0.0,  1.0,  0.0,

		// Bottom face
		 0.0, -1.0,  0.0,
		 0.0, -1.0,  0.0,
		 0.0, -1.0,  0.0,
		 0.0, -1.0,  0.0,

		// Right face
		 1.0,  0.0,  0.0,
		 1.0,  0.0,  0.0,
		 1.0,  0.0,  0.0,
		 1.0,  0.0,  0.0,

		// Left face
		-1.0,  0.0,  0.0,
		-1.0,  0.0,  0.0,
		-1.0,  0.0,  0.0,
		-1.0,  0.0,  0.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
	cubeVertexNormalBuffer.itemSize = 3;
	cubeVertexNormalBuffer.numItems = 24;

	cubeVertexTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
	var textureCoords = [
		// Front face
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,

		// Back face
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,

		// Top face
		0.0, 1.0,
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,

		// Bottom face
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,
		1.0, 0.0,

		// Right face
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0,
		0.0, 0.0,

		// Left face
		0.0, 0.0,
		1.0, 0.0,
		1.0, 1.0,
		0.0, 1.0
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	cubeVertexTextureCoordBuffer.itemSize = 2;
	cubeVertexTextureCoordBuffer.numItems = 24;

	cubeVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	var cubeVertexIndices = [
		0, 1, 2,      0, 2, 3,    // Front face
		4, 5, 6,      4, 6, 7,    // Back face
		8, 9, 10,     8, 10, 11,  // Top face
		12, 13, 14,   12, 14, 15, // Bottom face
		16, 17, 18,   16, 18, 19, // Right face
		20, 21, 22,   20, 22, 23  // Left face
	];
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
	cubeVertexIndexBuffer.itemSize = 1;
	cubeVertexIndexBuffer.numItems = 36;
}

//http://delphic.me.uk/webgltext.html
function drawScene() {
	var gl = Viewer3d.gl;


	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.vertexNormalAttribute, cubeVertexNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
	gl.vertexAttribPointer(Viewer3d.shaderProgram.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, Viewer3d.cTexture);
	gl.uniform1i(Viewer3d.shaderProgram.samplerUniform, 0);
	var lighting = true;
	gl.uniform1i(Viewer3d.shaderProgram.useLightingUniform, lighting);
	if (lighting) {
		gl.uniform3f(Viewer3d.shaderProgram.ambientColorUniform, 0.2, 0.2, 0.2);

		var lightingDirection = [ -0.25, -0.25, -1 ];
		var adjustedLD = vec3.create();
		vec3.normalize(lightingDirection, adjustedLD);
		vec3.scale(adjustedLD, -1);
		gl.uniform3fv(Viewer3d.shaderProgram.lightingDirectionUniform, adjustedLD);
		gl.uniform3f(Viewer3d.shaderProgram.directionalColorUniform, 0.8, 0.8, 0.8);
	}

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	Viewer3d.setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}
