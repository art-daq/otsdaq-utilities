//=====================================================================================
//
//	Created Dec, 2013
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	Viewer2d.js
//
//	requires an omni div, that will be made full window size (window.innerWidth and
//		window.innerHeight) at position 0,0
//
//	public function list:
//		Viewer2d.launch()
//
//=====================================================================================

var Viewer2d = Viewer2d || {}; //define namespace


////////////////////////////////////////////////////////////
//public function definitions

// Viewer2d.launch ~~
//		called to start 2d viewer
Viewer2d.launch = function() {

	Debug.log("Viewer2d.launch");

	Viewer2d.omni = document.getElementById("omni");
	Viewer2d.omni.innerHTML = ""; //clear all content

	//initialize with loading message in center
	var w = Viewer2d.w = window.innerWidth;
	var h = Viewer2d.h = window.innerHeight;

	Viewer2d.omni.style.position = "absolute";
	Viewer2d.omni.style.left = 0  + "px";
	Viewer2d.omni.style.top = 0  + "px";
	Viewer2d.omni.style.width = w + "px";
	Viewer2d.omni.style.height = h + "px";
	Viewer2d.omni.style.backgroundColor = "rgb(30,30,30)";

	Viewer2d.omni.innerHTML = "<center><div style='margin-top:" + (h/2-8) + "px'>Loading 2-D...</div></center>";


	//load/insert libraries and setup canvas
	// steps:
	//		- setup canvas behind "loading..."
	//		- setup hud
	//		- get default configuration from server
	//		- get default geometry from server
	//		- bring canvas in front of "loading..."

	Viewer2d.initCanvas();
}

//end public function definitions
////////////////////////////////////////////////////////////


Viewer2d.CANVAS_COLOR = "rgb(102,0,51)";
Viewer2d.CANVAS_MIN_SIZE = 300; //dont allow w or h to go less than this
Viewer2d.HUD_WIDTH = 200;
Viewer2d.HUD_MARGIN_RIGHT = 10;
Viewer2d.HUD_DROP_DOWN_SPEED = 10;
Viewer2d.TICK_REFRESH_PERIOD = 30; //ms

Viewer2d.omni;
Viewer2d.hud;
Viewer2d.canvas;
Viewer2d.context;
Viewer2d.w;
Viewer2d.h;
Viewer2d.tickTimer;

Viewer2d.drawGridFlag = true;
Viewer2d.globalAccumulate = true;



//station consists one or two planes, only can be two planes if they are strip planes
//	[station 0, (optional station 1)]

//a plane consists of strips or pixels
//	[cols, rows, cell width, cell height]  //microns

Viewer2d.stations = [];


//"private" function list
//	Viewer2d.initCanvas
//	Viewer2d.handleWindowResize
//	Viewer2d.createHud
//	Viewer2d.redraw
//	Viewer2d.getConfiguration
//	Viewer2d.getConfigurationHandler


Viewer2d.initCanvas = function() {

	Viewer2d.canvas = document.createElement('canvas');
	Viewer2d.canvas.style.position = "absolute";
	Viewer2d.canvas.style.left = 0  + "px";
	Viewer2d.canvas.style.top = 0  + "px";
	Viewer2d.canvas.style.zIndex = -1;  //-1 is not visible.. change to 0 to bring to front
	Viewer2d.canvas.style.backgroundColor = Viewer2d.CANVAS_COLOR;
	Viewer2d.context = Viewer2d.canvas.getContext('2d');

	Viewer2d.omni.appendChild(Viewer2d.canvas);

	Viewer2d.hud = new Viewer2d.createHud();

	window.onresize = Viewer2d.handleWindowResize;
	Viewer2d.handleWindowResize();

	Viewer2d.getConfiguration();

	//if(Viewer2d.tickTimer) clearInterval(Viewer2d.tickTimer);
	//Viewer2d.tickTimer = setInterval(Viewer2d.tick, Viewer2d.TICK_REFRESH_PERIOD);
}

//Viewer2d.tick ~~
//	periodically check for data
Viewer2d.tick = function() {
	Viewer2d.redraw();
}

Viewer2d.handleWindowResize = function() {

	var w = window.innerWidth < Viewer2d.CANVAS_MIN_SIZE? Viewer2d.CANVAS_MIN_SIZE:window.innerWidth;
	var h = window.innerHeight < Viewer2d.CANVAS_MIN_SIZE? Viewer2d.CANVAS_MIN_SIZE:window.innerHeight;

	Debug.log("Viewer2d.handleWindowResize " + w + "-" + h);

	Viewer2d.omni.style.width = w + "px";
	Viewer2d.omni.style.height = h + "px";
	Viewer2d.canvas.style.width = w + "px";
	Viewer2d.canvas.style.height = h + "px";
	Viewer2d.canvas.width = w;
	Viewer2d.canvas.height = h;

	//reposition HUD
	Viewer2d.hud.handleWindowResize();

	//redraw 2d world
	Viewer2d.redraw();
}

Viewer2d.createHud = function() {

	var hudMouseOverDiv;
	var animationTargetTop, isDropDownAnimating, isDropDownDown;
	var controlMouseIsDown = false;
	var controlMouseTimeout = 0;
	var getEventsTimeout = 0;

	this.isInMotion = function() { return isDropDownAnimating; }

	this.handleWindowResize = function() {
		Debug.log("Viewer2d Hud handleWindowResize");
		this.hudMouseOverDiv.style.left = window.innerWidth - this.hudMouseOverDiv.offsetWidth - Viewer2d.HUD_MARGIN_RIGHT + "px";

		this.hudNavSpeedDiv.style.left = 5 + "px";
		this.hudNavSpeedDiv.style.top = window.innerHeight - 95 + "px";
	}

	this.checkboxUpdate = function(i) {
		var chk = document.getElementById("hudCheckbox" + i);
		Debug.log("Viewer2d Hud checkboxUpdate " + i + "=" + chk.checked);

		if(i==0) Viewer2d.drawGridFlag = chk.checked; //grid
		else if(i==1) Viewer2d.globalAccumulate = chk.checked; //globalAccumulate

		Viewer2d.redraw();
	}

	// animateDropDown ~~
	var animateDropDown = function() {
		var dir = (animationTargetTop - hudMouseOverDiv.offsetTop > 0)? 1: -1;

		var tmpTop = hudMouseOverDiv.offsetTop + dir*Viewer2d.HUD_DROP_DOWN_SPEED;
		if(Math.abs(tmpTop - animationTargetTop) <= Viewer2d.HUD_DROP_DOWN_SPEED) //done
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
			controlMouseTimeout = window.setTimeout(function() {Viewer2d.hud.handleControlDown(i)},to);
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
				Viewer2d.eventToDisplay += (i==0?-1:1)*parseInt(Viewer2d.events.length/5+1);
			else
				Viewer2d.eventToDisplay += (i==1?-1:1);

			if(Viewer2d.eventToDisplay < 0)
				Viewer2d.eventToDisplay = 0;
			if(Viewer2d.eventToDisplay >= Viewer2d.events.length)
				Viewer2d.eventToDisplay = Viewer2d.events.length - 1;
			break;
		case 4: //dec run #
		case 5: //inc run #
			Viewer2d.hud.hudRunNumberInput.value = parseInt(Viewer2d.hud.hudRunNumberInput.value) + (i*2-9);
			if(Viewer2d.hud.hudRunNumberInput.value < 0) Viewer2d.hud.hudRunNumberInput.value = 0;
			if(getEventsTimeout) window.clearTimeout(getEventsTimeout);
			getEventsTimeout = window.setTimeout(Viewer2d.getEvents,1000);
			break;
		default:
			Debug.log("hud doControlAction unknown action" + i);
			return;
		}

		Viewer2d.hud.update();
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
	this.hudNavSpeedDiv.setAttribute("id", "Viewer2d-hudNavSpeedOverlay");
	this.hudNavSpeedDiv.style.position = "absolute";
	this.hudNavSpeedDiv.style.zIndex = 100;
	Viewer2d.omni.appendChild(this.hudNavSpeedDiv);


	hudMouseOverDiv = this.hudMouseOverDiv = document.createElement('div');
	hudMouseOverDiv.setAttribute("id", "Viewer2d-hudMouseOver");
	hudMouseOverDiv.style.position = "absolute";
	hudMouseOverDiv.style.zIndex = 100;

	this.hudDiv = document.createElement('div');
	this.hudDiv.setAttribute("id", "Viewer2d-hud");
	var chkLabels = ["Show Axes","Show Grid","Show Tracks", "Mouse Nav","Fly-By","Accumulated"];
	var chkDefaults = ["checked","checked","checked","checked",Viewer2d.enableFlyBy?"checked":"",Viewer2d.accumulateEvents?"checked":""];
	var str = "";
	for(var i=0;i<chkLabels.length;++i)
		str += "<input type='checkbox' id='hudCheckbox" + i + "' onchange='Viewer2d.hud.checkboxUpdate(" + i +
					");' " + chkDefaults[i] + "><label for='hudCheckbox" + i + "'>" + chkLabels[i] + "</label><br>";

	//add event controls
	str += "<center><div id='Viewer2d-hudEventNumberControls'><div id='Viewer2d-hudEventNumber'></div>";
	var evtNumBtns = ["<<","<",">",">>"];
	for(var i=0;i<evtNumBtns.length;++i)
		str += "<input type='button' onmousedown='Viewer2d.hud.handleControlDown(" + i + ",event);' " +
			"onmouseup='Viewer2d.hud.handleControlUp(" + i + ");' " +
			"onmouseout='Viewer2d.hud.handleControlUp(" + i + ");' " +
			"value='" + evtNumBtns[i] + "' />";
	str += "</div></center>";

	//add run controls
	if(DesktopContent._theDesktopWindow) //only add if successful login
	{
		str += "<div id='Viewer2d-hudRunNumberControls'>Run #: " +
				"<input id='Viewer2d-hudRunNumberControls-textInput' oninput='Viewer2d.hud.handleRunChange();' type='text' value='40' > ";
		evtNumBtns = ["<",">"];
		for(var i=0;i<evtNumBtns.length;++i)
			str += "<input type='button' onmousedown='Viewer2d.hud.handleControlDown(" + (i+4) + ",event);' " +
				"onmouseup='Viewer2d.hud.handleControlUp(" + (i+4) + ");' " +
				"onmouseout='Viewer2d.hud.handleControlUp(" + (i+4) + ");' " +
				"value='" + evtNumBtns[i] + "' />";
		str += "</div>";
	}
	else
	{
		str += "<input id='Viewer2d-hudRunNumberControls-textInput' type='hidden' value='40' >";

		this.hudUrlOverlay = document.createElement('div');
		this.hudUrlOverlay.setAttribute("id", "Viewer2d-hudUrlOverlay");
		this.hudUrlOverlay.style.position = "absolute";
		this.hudUrlOverlay.style.zIndex = 100;
		this.hudUrlOverlay.style.left = 5 + "px";
		this.hudUrlOverlay.style.top = 5 + "px";
		this.hudUrlOverlay.innerHTML = "Try on your own mobile device!<br>http://tinyurl.com/q6lhdrm";
		Viewer2d.omni.appendChild(this.hudUrlOverlay);
	}

	this.hudDiv.innerHTML = str;

//	_historyEl.onmousewheel = handleUserInputScroll;
//	_historyEl.onmousedown = handleUserInputScroll;
//	this.hudEventScrollbar.onscroll = this.handleEventScroll;
//	_historyEl.onmousemove = handleMouseMoveScroll;

	hudMouseOverDiv.appendChild(this.hudDiv);

	hudMouseOverDiv.style.top = hudMouseOverDiv.offsetHeight - 15 + "px";
	hudMouseOverDiv.style.width = Viewer2d.HUD_WIDTH + "px";
	hudMouseOverDiv.onmouseover = mouseOverDropDown;
	hudMouseOverDiv.onmouseout = mouseOutDropDown;
	Viewer2d.omni.appendChild(hudMouseOverDiv);

	this.hudEventNumber = document.getElementById('Viewer2d-hudEventNumber'); //get reference
	this.hudEventNumberControls = document.getElementById('Viewer2d-hudEventNumberControls'); //get reference
	this.hudRunNumberInput = document.getElementById('Viewer2d-hudRunNumberControls-textInput'); //get reference

	//setup dropdown effect
	isDropDownDown = false;
	isDropDownAnimating = true;
	animationTargetTop = 15 - hudMouseOverDiv.offsetHeight;
	window.setTimeout(animateDropDown,30);
	this.handleWindowResize();
}


Viewer2d.getConfiguration = function() {
	Debug.log("Viewer2d getConfiguration ");
	//DesktopContent.XMLHttpRequest("Request?RequestType=get2dConfiguration", "", Viewer2d.getConfigurationHandler);
	Viewer2d.getConfigurationHandler();
}

// Viewer2d.getConfigurationHandler ~~
Viewer2d.getConfigurationHandler = function (req) {
	Debug.log("Viewer2d getConfigurationHandler " );


	Viewer2d.stations= [];

	var cnt = 0;
	Viewer2d.stations[cnt++] = [[1024, 1, 60, 90000]];
	Viewer2d.stations[cnt++] = [[1024, 1, 60, 90000],[512, 1, 60, 90000]];

	//var objects = req.responseXML.getElementsByTagName("object");

//	Viewer2d.geometry = [];
//	var gi;
//	var gl = Viewer2d.gl;
//	var locPoints, xyzPoints, objectType;
//	for(var i=0;i<objects.length;++i)
//	{
//		//TODO if different geometries, use object type
//		//objectType = objects[i].getElementsByTagName("object_type");
//	    //Debug.log("Rotating3d getGeometry objectType " + objectType[0].getAttribute("value"));
//
//		xyzPoints = objects[i].getElementsByTagName("xyz_point");
//
//		locPoints = [];
//	    for(var j=0;j<xyzPoints.length;++j)
//	    	locPoints[locPoints.length] = xyzPoints[j].getAttribute("value")/(j%3==2?Viewer2d.Z_SQUASH_FACTOR:1.0);
//
//
//	    gi = Viewer2d.geometry.length;
//	    Viewer2d.geometry[gi] = gl.createBuffer();
//	    gl.bindBuffer(gl.ARRAY_BUFFER, Viewer2d.geometry[gi]);
//	    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(locPoints), gl.STATIC_DRAW);
//	    Viewer2d.geometry[gi].itemSize = 3;
//	    Viewer2d.geometry[gi].numItems = locPoints.length/3;
//	}
//
//	Debug.log("Viewer2d getGeometryHandler  geometry objects " + Viewer2d.geometry.length);
	Viewer2d.canvas.style.zIndex = 0; //Bring canvas to front, above "Loading..." if not already there
//
//	Viewer2d.cameraAction = true;

	Viewer2d.redraw();
}

//Viewer2d.redraw ~~
//	called to redraw 2d objects
Viewer2d.redraw = function () {
	Debug.log("Viewer2d redraw " );


	Viewer2d.context.save();

	Viewer2d.context.clearRect(0, 0, Viewer2d.canvas.width, Viewer2d.canvas.height);

	//


	Viewer2d.context.fillStyle="RGBA(255,0,0,.2)";
	Viewer2d.context.strokeStyle = 'RGBA(255,0,0,.1)';
	Viewer2d.context.lineWidth = 100;

	Viewer2d.context.translate(300,300);
	Viewer2d.context.rotate(45*Math.PI/180);

	Viewer2d.context.beginPath();
	Viewer2d.context.moveTo(-200,0);
	Viewer2d.context.lineTo(200,0);
	Viewer2d.context.stroke();


	//Viewer2d.context.fillRect(-100,-50,200,100);

	Viewer2d.context.restore();


	Viewer2d.context.save();

	Viewer2d.context.fillStyle="RGBA(255,0,0,.2)";
	Viewer2d.context.strokeStyle = 'RGBA(255,0,0,.1)';
	Viewer2d.context.lineWidth = 100;

	Viewer2d.context.translate(300,300);
	Viewer2d.context.rotate(-45*Math.PI/180);

	Viewer2d.context.beginPath();
	Viewer2d.context.moveTo(-200,0);
	Viewer2d.context.lineTo(200,0);
	Viewer2d.context.stroke();
	//Viewer2d.context.fillRect(-100,-50,200,100);

	Viewer2d.context.restore();

//	if(Viewer2d.hud.isInMotion()) return;
//
//	Viewer2d.initForDraw();
//	if(Viewer2d.drawAxesFlag) Viewer2d.drawAxes();
//	if(Viewer2d.drawGridFlag) Viewer2d.drawGrid();
//	Viewer2d.drawGeometry();
//
//    //drawScene();
//
//	Viewer2d.drawClusters((Viewer2d.accumulateEvents && !Viewer2d.enableFlyBy)?-1:Viewer2d.eventToDisplay);
//	if(Viewer2d.drawTracksFlag) Viewer2d.drawTracks((Viewer2d.accumulateEvents && !Viewer2d.enableFlyBy)?-1:Viewer2d.eventToDisplay);
//	Viewer2d.hud.update(); //update hud
}

Viewer2d.initForDraw = function() {

}

Viewer2d.drawGrid = function() {

}
