//=====================================================================================
//
//	Created Aug, 2013, Updated to jsroot 7.9.0 in May 2025
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	ViewerRoot.js
//
//	requires an omni div, that will be made full window size (window.innerWidth and
//		window.innerHeight) at position 0,0.
//
//	Note: there are some variables declared outside of the namespace ViewerRoot
//		so take care to avoid naming collisions with:
//			- gFile
//			- source_dir
//			- obj_list
//			- ViewerRoot.objIndex
//			- last_index
//			- function_list
//			- func_list
//			- frame_id
//			- random_id
//
//	public function list:
//		ViewerRoot.launch()
//
//  2025 from web, updating to 7.9.0 from 5.8.0:
//				https://root.cern/js/latest/api.htm#custom_html_th2_src
//				https://github.com/root-project/jsroot/blob/master/docs/JSROOT.md#migration-v6---v7
//
//	2013 from web: 	http://root.cern.ch/js/
//				http://root.cern.ch/drupal/content/trevolutionjs
//				currently using v3.5: https://root.cern.ch/js/3.5/demo/demo.htm
//					-- to change versions, hopefully just replace folder here:
//					-- WebGUI/js/visualizers_lib/ViewerRoot_lib/JsRoot/... tar.gz file unzipped inside JsRoot
//=====================================================================================


var ViewerRoot = ViewerRoot || {}; //define namespace

////////////////////////////////////////////////////////////
//public function definitions
ViewerRoot.launch = function() {

    Debug.log("ViewerRoot.launch");

    document.getElementById("omni").innerHTML = "<div id='omniHistogramViewer'></div>";
    ViewerRoot.omni = document.getElementById("omniHistogramViewer");

    var w = ViewerRoot.w = window.innerWidth;
    var h = ViewerRoot.h = window.innerHeight;

    ViewerRoot.omni.style.position = "absolute";
    ViewerRoot.omni.style.left = "0px";
    ViewerRoot.omni.style.top = "0px";
    ViewerRoot.omni.style.width = w + "px";
    ViewerRoot.omni.style.height = h + "px";
    ViewerRoot.omni.style.backgroundColor = "rgb(30,30,30)";
    ViewerRoot.omni.innerHTML =
        "<center><div id='loaderStatus' style='margin-top:" + (h/2-8) + "px'>Loading Root Viewer...</div></center>";

    var startInit = function() {
        ViewerRoot.init();
    };

    var loadJsroot = function() {
        if (typeof JSROOT !== "undefined") {
            startInit();
            return;
        }
        loadScript(source_dir + 'jsroot-7.9.0/scripts/JSRoot.core.js', startInit);
    };

    if (typeof ViewerRoot.createHud === "function") {
        loadJsroot();
        return;
    }

    loadScript(source_dir + 'ViewerRootHud.js', loadJsroot);
};
//ViewerRoot ~~
//called to start Root viewer
    ///	Drawing Strategy
//   - one tile corresponds to one target div
//   - first object draws the base pad
//   - additional objects in the same tile are overlaid with SAME when supported
//   - Tile creates a new position, Replace reuses a position, Superimpose appends to it
//end public function definitions
////////////////////////////////////////////////////////////


var source_dir = "/WebPath/js/visualizers_lib/ViewerRoot_lib/";
//var gFile;
//var obj_list;
//var last_index;
//var function_list;
//var func_list;
//var frame_id;
//var random_id;

ViewerRoot.STREAMER_INFO_FILE_PATH = "/WebPath/js/visualizers_lib/ViewerRoot_lib/streamerInfo.root";

ViewerRoot.LOAD_STREAMER_INFO_CHECK_PERIOD = 100; //ms
ViewerRoot.DISPLAY_MIN_WIDTH = 450; //dont allow w or h to go less than this
ViewerRoot.DISPLAY_MIN_HEIGHT = 300; //dont allow w or h to go less than this
ViewerRoot.HUD_WIDTH = 300;
ViewerRoot.HUD_MARGIN_RIGHT = 0;
ViewerRoot.HUD_DROP_DOWN_SPEED = 40;
ViewerRoot.ROOT_CONTAINER_OFFY = 20;
ViewerRoot.ROOT_HEADER_HEIGHT = 20;

ViewerRoot.TILE_MODE = 0;
ViewerRoot.REPLACE_MODE = 1;
ViewerRoot.SUPERIMPOSE_MODE = 2;

ViewerRoot.ADMIN_PERMISSIONS_THRESHOLD = 1;
ViewerRoot.userPermissions = 0; //0 is no access, 1 is access

ViewerRoot.omni;
ViewerRoot.rootContainer;

ViewerRoot.objIndex;

ViewerRoot.rootObjTitleArr;
ViewerRoot.rootPosArr;
ViewerRoot.rootObjArr;
ViewerRoot.rootObjIndexArr;
ViewerRoot.rootHeaderElArr;
ViewerRoot.rootObjNameArr;
ViewerRoot.rootIsTransparentArr;
ViewerRoot.rootIsAutoRefreshArr;

ViewerRoot.numPositionsTiled;
ViewerRoot.rootTargetIndex; //targeted object for replace or superimpose
ViewerRoot.w;
ViewerRoot.h;
ViewerRoot.sFile;

ViewerRoot.hudAutoHide = false;
ViewerRoot.nextObjectMode = 1;
ViewerRoot.clearEachRequest = true;
ViewerRoot.autoRefreshDefault = false;
ViewerRoot.autoRefreshPeriod = 1000;
ViewerRoot.pauseRefresh = false;
ViewerRoot.hardRefresh = true;

ViewerRoot.autoRefreshTimer = 0;


ViewerRoot.iterLoading = false;
ViewerRoot.iterNumberRemaining;
ViewerRoot.iterNumPositionsTiled;
ViewerRoot.iterRunWildcard;
ViewerRoot.iterRootObjNameArr;
ViewerRoot.iterRootPosArr;
ViewerRoot.iterRootIsTransparentArr;
ViewerRoot.iterRootIsAutoRefreshArr;
ViewerRoot.iterSaveNextObjectMode;
ViewerRoot.iterSaveAutoRefreshDefault;



//"private" function list
//ViewerRoot.init
//ViewerRoot.autoRefreshTick
//ViewerRoot.prepareNextLocation
//ViewerRoot.removeAllAtPosition
//ViewerRoot.manageRootHeaders
//ViewerRoot.toggleAllAtPositionAutoRefresh
//ViewerRoot.handleRootPositionSelect
//ViewerRoot.clearAll
//ViewerRoot.handleWindowResize
//ViewerRoot.resizeRootObjects
//ViewerRoot.refreshTransparency
//ViewerRoot.checkStreamerInfoLoaded
//ViewerRoot.getDirectoryContents
//ViewerRoot.getDirContentsHandler
//ViewerRoot.rootReq
//ViewerRoot.rootConfigReq
//ViewerRoot.getRootConfigHandler
//ViewerRoot.iterativeConfigLoader
//ViewerRoot.currStateRequestHandler
//ViewerRoot.haltRefresh
//ViewerRoot.getRootDataHandler
//ViewerRoot.interpretObjectBuffer

//=====================================================================================
ViewerRoot.init = function () {
    Debug.log("ViewerRoot.init");

    ViewerRoot.posElArr = [];
    ViewerRoot.posTargetElArr = [];
    ViewerRoot.posTargetSerial = 0;

    ViewerRoot.rootPosArr = [];
    ViewerRoot.rootObjArr = [];
    ViewerRoot.rootObjIndexArr = [];
    ViewerRoot.rootObjNameArr = [];
    ViewerRoot.rootObjTitleArr = [];
    ViewerRoot.rootHeaderElArr = [];
    ViewerRoot.rootIsTransparentArr = [];
    ViewerRoot.rootIsAutoRefreshArr = [];

    ViewerRoot.numPositionsTiled = 0;
    ViewerRoot.rootTargetIndex = -1;

    obj_list = new Array();
    ViewerRoot.objIndex = 0;
    last_index = 0;
    function_list = new Array();
    func_list = new Array();
    frame_id = 0;
    random_id = 0;

    ViewerRoot.rootContainer = document.createElement('div');
    ViewerRoot.rootContainer.setAttribute("id","reportContainer");
    ViewerRoot.rootContainer.onmouseup = function(){
	Debug.log("Deselect all root containers");
	ViewerRoot.rootTargetIndex = -1;
	ViewerRoot.resizeRootObjects(false);
    };
    ViewerRoot.omni.appendChild(ViewerRoot.rootContainer);

    ViewerRoot.hud = new ViewerRoot.createHud();
    window.onresize = ViewerRoot.handleWindowResize;
    ViewerRoot.handleWindowResize();

    window.clearInterval(ViewerRoot.autoRefreshTimer);
    ViewerRoot.autoRefreshTimer = window.setInterval(
	ViewerRoot.autoRefreshTick,
	ViewerRoot.autoRefreshPeriod
    );

    document.getElementById("loaderStatus").innerHTML =
	"Root Viewer Loaded.<br>Use drop-down to make selections.";
    ViewerRoot.getDirectoryContents("/");
}; //end init()

ViewerRoot.autoRefreshMatchArr = []; //use array to match request returns to index

//=====================================================================================
// ViewerRoot.autoRefreshTick ~~
//	handle autorefreshes
//	Strategy:
//		For each root object that is in refresh mode, push index,path to an array
//		and send req. When req returns match path to array and remove entry.
//		When array is empty auto refresh complete.
ViewerRoot.autoRefreshTick = function () {
    //Debug.log("ViewerRoot autoRefreshTick pause=" + ViewerRoot.pauseRefresh);
    if(ViewerRoot.pauseRefresh) return;

	if(ViewerRoot.autoRefreshMatchArr.length) //not done yet with previous refresh!
	{
		Debug.log("ViewerRoot autoRefreshTick not done yet! Refresh period too short.");
		ViewerRoot.autoRefreshPeriod += 500; //walk up more delay

		//reset interval if here
		window.clearInterval(ViewerRoot.autoRefreshTimer);
		ViewerRoot.autoRefreshTimer = window.setInterval(
				ViewerRoot.autoRefreshTick,
				ViewerRoot.autoRefreshPeriod);
		return;
	}

	ViewerRoot.autoRefreshMatchArr = []; //insert [<index>, <path>] tuples
	for(var j=0;j<ViewerRoot.rootPosArr.length;++j)
		if (ViewerRoot.rootIsAutoRefreshArr[j]) {
			Debug.log("ViewerRoot autoRefreshTick " + j + " " + ViewerRoot.rootObjNameArr[j]);
			ViewerRoot.autoRefreshMatchArr.push([j, ViewerRoot.rootObjNameArr[j]]);
			ViewerRoot.rootReq(ViewerRoot.rootObjNameArr[j],j);
		}

	//reset interval if here
	window.clearInterval(ViewerRoot.autoRefreshTimer);
	ViewerRoot.autoRefreshTimer = window.setInterval(
	    ViewerRoot.autoRefreshTick,
	    ViewerRoot.autoRefreshPeriod);
} //end autoRefreshTick

ViewerRoot.getPositionObjectIndices = function(posi) {
    let out = [];
    for (let i = 0; i < ViewerRoot.rootPosArr.length; ++i)
	if (ViewerRoot.rootPosArr[i] === posi)
	    out.push(i);
    return out;
};

ViewerRoot.makePositionContainer = function(posi) {
    let el = document.createElement('div');
    el.setAttribute("class", "rootObjectContainer");

    let target = document.createElement('div');
    target.setAttribute("class", "rootObjectContainerTarget");
    target.id = "positionTarget" + (ViewerRoot.posTargetSerial++);
    target._vrPos = posi;
    target._vrChain = Promise.resolve();

    el.appendChild(target);
    ViewerRoot.rootContainer.appendChild(el);

    ViewerRoot.posElArr[posi] = el;
    ViewerRoot.posTargetElArr[posi] = target;
};

ViewerRoot.removeObjectsAtPosition = function(posi) {
    for (let i = 0; i < ViewerRoot.rootPosArr.length; ++i) {
	if (ViewerRoot.rootPosArr[i] !== posi) continue;

	ViewerRoot.rootPosArr.splice(i, 1);
	ViewerRoot.rootObjArr.splice(i, 1);
	ViewerRoot.rootObjIndexArr.splice(i, 1);
	ViewerRoot.rootObjNameArr.splice(i, 1);
	ViewerRoot.rootObjTitleArr.splice(i, 1);
	ViewerRoot.rootIsTransparentArr.splice(i, 1);
	ViewerRoot.rootIsAutoRefreshArr.splice(i, 1);
	--i;
    }
};

ViewerRoot.isOverlay1DLike = function(obj) {
    let t = (obj && obj._typename) || "";
    return (
	t.indexOf("TH1") === 0 ||
	    t.indexOf("TProfile") === 0 ||
	    t.indexOf("TGraph") === 0
    );
};

ViewerRoot.getBaseDrawOpt = function(obj) {
    let t = (obj && obj._typename) || "";

    if (t === "TNtuple")
	return "px:py::pz>5";

    if (t === "THMu2eCaloDisk" || t.indexOf("TH2") === 0)
	return "colz";

    return "";
};

ViewerRoot.getOverlayDrawOpt = function(baseObj, obj) {
    if (ViewerRoot.isOverlay1DLike(baseObj) && ViewerRoot.isOverlay1DLike(obj))
	return "same";

    return null;
};

ViewerRoot.renderPosition = async function(target) {
    if (!target || !target.isConnected) return;

    let posi = target._vrPos;
    let indices = ViewerRoot.getPositionObjectIndices(posi);

    if (JSROOT.cleanup)
	JSROOT.cleanup(target.id);

    target.innerHTML = "";

    if (!indices.length) return;

    let firstIdx = indices[0];
    let firstObj = ViewerRoot.rootObjArr[firstIdx];
    if (!firstObj) return;

    try {
	await JSROOT.draw(target.id, firstObj, ViewerRoot.getBaseDrawOpt(firstObj));

	for (let k = 1; k < indices.length; ++k) {
	    let idx = indices[k];
	    let obj = ViewerRoot.rootObjArr[idx];
	    if (!obj) continue;

	    let opt = ViewerRoot.getOverlayDrawOpt(firstObj, obj);
	    if (opt === null) {
		Debug.log(
		    "Overlay skipped for unsupported SAME combination: " +
			(firstObj._typename || "unknown") + " + " +
			(obj._typename || "unknown"),
		    Debug.WARN_PRIORITY
		);
		continue;
	    }

	    await JSROOT.draw(target.id, obj, opt);
	}
    }
    catch (err) {
	Debug.log("ViewerRoot.renderPosition failed: " + err, Debug.HIGH_PRIORITY);
	target.textContent =
	    firstObj.JSON ? firstObj.JSON : String(err);
    }
};

// Queue redraws per position to keep sequential overlay rendering stable
ViewerRoot.queueRenderPosition = function(posi) {
    let target = ViewerRoot.posTargetElArr[posi];
    if (!target) return;

    target._vrChain = (target._vrChain || Promise.resolve())
	.then(() => ViewerRoot.renderPosition(target))
	.catch(err =>
	    Debug.log("queueRenderPosition error: " + err, Debug.HIGH_PRIORITY)
	);
};

//=====================================================================================
// ViewerRoot.prepareNextLocation ~~
//		Prepares next div location for root js library drawing
//		based on RADIO: Tile, Replace, Superimpose. The div id
//		will be "histogram"+ViewerRoot.objIndex.. this is the div
//		the root js library will draw to.
ViewerRoot.prepareNextLocation = function (objName, objTitle) {
    Debug.log("ViewerRoot prepareNextLocation mode=" + ViewerRoot.nextObjectMode +
	      " obj=" + objName);

    if (ViewerRoot.rootTargetIndex >= ViewerRoot.numPositionsTiled)
	ViewerRoot.rootTargetIndex = -1;

    let posi = -1;
    let drawAsOverlay = false;

    if (!ViewerRoot.numPositionsTiled || ViewerRoot.nextObjectMode == ViewerRoot.TILE_MODE) {
	posi = ViewerRoot.numPositionsTiled;
	ViewerRoot.makePositionContainer(posi);
	ViewerRoot.numPositionsTiled++;
    }
    else if (ViewerRoot.nextObjectMode == ViewerRoot.REPLACE_MODE) {
	posi = (ViewerRoot.rootTargetIndex == -1) ?
	    (ViewerRoot.numPositionsTiled - 1) : ViewerRoot.rootTargetIndex;

	ViewerRoot.removeObjectsAtPosition(posi);
    }
    else if (ViewerRoot.nextObjectMode == ViewerRoot.SUPERIMPOSE_MODE) {
	posi = (ViewerRoot.rootTargetIndex == -1) ?
	    (ViewerRoot.numPositionsTiled - 1) : ViewerRoot.rootTargetIndex;
	drawAsOverlay = true;
    }

    ViewerRoot.rootPosArr.push(posi);
    ViewerRoot.rootIsTransparentArr.push(drawAsOverlay);
    ViewerRoot.rootIsAutoRefreshArr.push(ViewerRoot.autoRefreshDefault);
    ViewerRoot.rootObjNameArr.push(objName);

    let prependName = "";
    {
	let splitPath = objName.split('/');
	for (let i = 0; i < splitPath.length; ++i) {
	    let ii = splitPath[i].indexOf(".root");
	    if (ii > 0) {
		prependName = splitPath[i].substr(0, ii) + ": ";
		break;
	    }
	}
    }
    ViewerRoot.rootObjTitleArr.push(prependName + objTitle);

    ViewerRoot.manageRootHeaders();
    ViewerRoot.resizeRootObjects(false);
};
//=====================================================================================
// ViewerRoot.removeAllAtPosition ~~
//		Remove all histogram div elements and associated root object data structures
//		for the given position i.
//		If isClosingPosition then redraw after and update tiled positions and renumber all above
//		position i.
ViewerRoot.removeAllAtPosition = function(posi, isClosingPosition) {
    Debug.log("ViewerRoot removeAllAtPosition " + posi);

    ViewerRoot.removeObjectsAtPosition(posi);

    let el = ViewerRoot.posElArr[posi];
    if (el && el.parentNode)
	el.parentNode.removeChild(el);

    ViewerRoot.posElArr.splice(posi, 1);
    ViewerRoot.posTargetElArr.splice(posi, 1);
    if (isClosingPosition) {
	--ViewerRoot.numPositionsTiled;

	for (let i = 0; i < ViewerRoot.rootPosArr.length; ++i)
	    if (ViewerRoot.rootPosArr[i] > posi)
		--ViewerRoot.rootPosArr[i];

	for (let i = posi; i < ViewerRoot.posTargetElArr.length; ++i)
	    if (ViewerRoot.posTargetElArr[i])
		ViewerRoot.posTargetElArr[i]._vrPos = i;

	ViewerRoot.manageRootHeaders();

	if (ViewerRoot.rootTargetIndex > posi) --ViewerRoot.rootTargetIndex;
	else if (ViewerRoot.rootTargetIndex >= ViewerRoot.numPositionsTiled)
	    ViewerRoot.rootTargetIndex = -1;

	ViewerRoot.resizeRootObjects(true);
    }
};

//=====================================================================================
// ViewerRoot.manageRootHeaders ~~
//	handle adding/removing/drawing of root object headers
ViewerRoot.manageRootHeaders = function () {
    Debug.log("ViewerRoot manageRootHeaders");

    var tmpdiv;
    while(ViewerRoot.numPositionsTiled > ViewerRoot.rootHeaderElArr.length) //add header elements
    {
	tmpdiv = document.createElement('div'); //make target div
	tmpdiv.setAttribute("id","rootContainerHeader-"+ViewerRoot.rootHeaderElArr.length);
	tmpdiv.setAttribute("class","rootContainerHeader");
	tmpdiv.onmouseup = ViewerRoot.handleRootPositionSelect;
	ViewerRoot.rootContainer.appendChild(tmpdiv);
	ViewerRoot.rootHeaderElArr.push(tmpdiv);
    }

    while(ViewerRoot.numPositionsTiled < ViewerRoot.rootHeaderElArr.length) //remove header elements
    {
	tmpdiv = ViewerRoot.rootHeaderElArr[ViewerRoot.rootHeaderElArr.length-1];
	tmpdiv.parentNode.removeChild(tmpdiv);
	ViewerRoot.rootHeaderElArr.splice(ViewerRoot.rootHeaderElArr.length-1,1);
    }

	//give name to headers by position
	var found;
	var name, fullPath;
	var str;
	var isAtLeastOneRefreshing;
	for (var i = 0; i < ViewerRoot.rootHeaderElArr.length; ++i) {
		found = 0;
		isAtLeastOneRefreshing = false;
		for(var j=0;j<ViewerRoot.rootPosArr.length;++j)
			if (ViewerRoot.rootPosArr[j] == i) {
				++found; fullPath = ViewerRoot.rootObjNameArr[j];
				//name = (fullPath.length > 20)?("..." + fullPath.substr(fullPath.length-18)):fullPath;
				name=ViewerRoot.rootObjTitleArr[j];
				if(ViewerRoot.rootIsAutoRefreshArr[j]) isAtLeastOneRefreshing = true; //this root object is set to autorefresh
			}

	str = "";

	//add title
	str += "<div title='" + fullPath + "' class='rootContainerHeader-name'>" + (found == 1?name:"Multiple Files...") + "</div>";

	//add close button
	str += "<a title='Close' href='Javascript:ViewerRoot.removeAllAtPosition("+i+",true);' onmouseup='event.cancelBubble=true;' " +
	    "class='rootContainerHeader-closeBtn'>X</a>";

	//add auto refresh icon
	//if at least one root object is refreshing show icon as on

	//Below is original
	str += "<a title='Close' href='Javascript:ViewerRoot.toggleAllAtPositionAutoRefresh(" + i +
	    ");' onmouseup='event.cancelBubble=true;' " +
	    "class='rootContainerHeader-refreshBtn'><img id='rootContainerHeaderRefreshImg" + i +
	    "'src='/WebPath/images/iconImages/icon-rootAutoRefresh" + (isAtLeastOneRefreshing?"On":"Off") + ".png'></a>";


	//Making the refresh button do the same thing as respective histograph name
        //		str += "<a title='Refresh' href='Javascript:ViewerRoot.rootReq(\"" + fullPath +
        //			"\");' onmouseup='event.cancelBubble=true;' " +
        //			"class='rootContainerHeader-refreshBtn'><img id='rootContainerHeaderRefreshImg" + i +
        //			"'src='/WebPath/images/iconImages/icon-rootAutoRefresh" + (isAtLeastOneRefreshing?"On":"Off") + ".png'></a>";
        //
	ViewerRoot.rootHeaderElArr[i].innerHTML = str;
    }
} //end manageRootHeaders()

//=====================================================================================
// ViewerRoot.toggleAllAtPositionAutoRefresh ~~
//	toggle auto refresh for position i
//	Superimposed position is a special case
//		if any of superimposed are true, then all should go false
//		else all go true
ViewerRoot.toggleAllAtPositionAutoRefresh = function (i) {
	Debug.log("ViewerRoot toggleAllAtPositionAutoRefresh " + i);
	var found = 0;
	var v = true, lastv;
	var doover = false;
	do {
		for(var j=0;j<ViewerRoot.rootPosArr.length;++j)
			if (ViewerRoot.rootPosArr[j] == i) {
				if(!doover && ViewerRoot.rootIsAutoRefreshArr[j]) v = false;
				ViewerRoot.rootIsAutoRefreshArr[j] = v;                       //---------------------------------------->This is all this function does!

		Debug.log("ViewerRoot toggleAllAtPositionAutoRefresh rootObj " + j + " to " + v);

		var tmp = document.getElementById("rootContainerHeaderRefreshImg" + i );
		tmp.src = "/WebPath/images/iconImages/icon-rootAutoRefresh" + (v?"On":"Off") + ".png";
		if(lastv != v ){++found; lastv = v;}
	    }
	if(!doover && found>1) doover = true;
	else doover = false;
    } while(doover); //may need to do it over again, because values of superimposed root objects could be wrong

} //end toggleAllAtPositionAutoRefresh()

//=====================================================================================
// ViewerRoot.handleRootPositionSelect ~~
ViewerRoot.handleRootPositionSelect = function (event) {
    event.cancelBubble = true;
    var i = parseInt(this.id.substr(this.id.indexOf("-")+1))
    Debug.log("ViewerRoot handleRootPositionSelect " + i);
    ViewerRoot.rootTargetIndex = i;
    ViewerRoot.resizeRootObjects();
} //end handleRootPositionSelect()

//=====================================================================================
// ViewerRoot.clearAll ~~
//		remove all root objects
ViewerRoot.clearAll = function () {
    Debug.log("ViewerRoot clearAll");

    ViewerRoot.rootTargetIndex = -1;

    while (ViewerRoot.numPositionsTiled > 0)
	ViewerRoot.removeAllAtPosition(ViewerRoot.numPositionsTiled - 1, true);

    ViewerRoot.manageRootHeaders();
    ViewerRoot.resizeRootObjects(false);
};

//=====================================================================================
// ViewerRoot.handleWindowResize ~~
ViewerRoot.handleWindowResize = function() {

    var w = ViewerRoot.w = window.innerWidth < ViewerRoot.DISPLAY_MIN_WIDTH? ViewerRoot.DISPLAY_MIN_WIDTH:window.innerWidth;
    var h = ViewerRoot.h = window.innerHeight < ViewerRoot.DISPLAY_MIN_HEIGHT? ViewerRoot.DISPLAY_MIN_HEIGHT:window.innerHeight;

    if(!ViewerRoot.hudAutoHide) //force w smaller
	ViewerRoot.w = w -= ViewerRoot.HUD_WIDTH + ViewerRoot.HUD_MARGIN_RIGHT + (5*2); //5 is padding of mouseover region in css

    Debug.log("ViewerRoot handleWindowResize " + w + "-" + h);

    ViewerRoot.omni.style.width = w + "px";
    ViewerRoot.omni.style.height = h + "px";
    
    if (ViewerRoot.hud && ViewerRoot.hud.handleWindowResize)
        ViewerRoot.hud.handleWindowResize();
    ViewerRoot.resizeRootObjects(true);
}

//=====================================================================================
// ViewerRoot.resizeRootObjects ~~
//		Resize all root objects based on positions and tile arrangement
//		if isForNewObject = true, then redraw all reports except last(new) report
//		OLD: do not need to redraw for normal window resize, because obj's handler handles
//		NEW: now on window resize the object is not redrawn.. the <svg class=root_canvas> size
//			does not get updated.. So just redraw for normal window resize case.
ViewerRoot.resizeRootObjects = function(needToRedraw) {

    ViewerRoot.rootContainer.style.width = ViewerRoot.w + "px";
    ViewerRoot.rootContainer.style.height = ViewerRoot.h + "px";

	if (ViewerRoot.numPositionsTiled < 1) { 	//if no rootObjects, invisible container
		ViewerRoot.rootContainer.style.backgroundColor = "rgba(0,0,0,0)";
		return;
	}
	ViewerRoot.rootContainer.style.backgroundColor = "white";

    let w = ViewerRoot.w;
    let h = ViewerRoot.h - ViewerRoot.ROOT_CONTAINER_OFFY;

    let aspect = 3/4;
    let r = Math.round(Math.sqrt(h * ViewerRoot.numPositionsTiled / aspect / w));
    if (r < 1) r = 1;
    let c = Math.ceil(ViewerRoot.numPositionsTiled / r);

    w = Math.floor(w / c);
    h = Math.floor(h / r);

    let rootAspect = 3/4;
    let rootw = (h / w < rootAspect) ? (h / rootAspect) : w;

    for (let i = 0; i < ViewerRoot.numPositionsTiled; ++i) {
	let el = ViewerRoot.posElArr[i];
	let target = ViewerRoot.posTargetElArr[i];
	if (!el || !target) continue;

	target._vrPos = i;

	el.style.width = rootw + "px";
	el.style.height = (h - ViewerRoot.ROOT_HEADER_HEIGHT) + "px";
	el.style.left = w * (i % c) + (w - rootw) / 2 + "px";
	el.style.top = ViewerRoot.ROOT_CONTAINER_OFFY + ViewerRoot.ROOT_HEADER_HEIGHT +
	    h * Math.floor(i / c) + "px";
	el.style.zIndex = i;

	if (needToRedraw)
	    ViewerRoot.queueRenderPosition(i);
    }

    for (let i = 0; i < ViewerRoot.rootHeaderElArr.length; ++i) {
	ViewerRoot.rootHeaderElArr[i].style.width = w - 2 + "px";
	ViewerRoot.rootHeaderElArr[i].style.height = ViewerRoot.ROOT_HEADER_HEIGHT + "px";
	ViewerRoot.rootHeaderElArr[i].style.left = w * (i % c) + "px";
	ViewerRoot.rootHeaderElArr[i].style.top =
	    ViewerRoot.ROOT_CONTAINER_OFFY + h * Math.floor(i / c) + "px";

	ViewerRoot.rootHeaderElArr[i].style.borderColor =
	    ViewerRoot.rootTargetIndex == i ? 'rgb(68,156,44)' : 'black';
	ViewerRoot.rootHeaderElArr[i].style.backgroundColor =
	    ViewerRoot.rootTargetIndex == i ? 'rgb(178,222,166)' : 'rgba(0,0,0,0)';
    }
}; //end resizeRootObjects()

//=====================================================================================
// ViewerRoot.refreshTransparency ~~
//		refresh the transparency state of histogram i and svg components
ViewerRoot.refreshTransparency = function(i) {
    // no-op: real overlay is done with SAME in one pad
};

//=====================================================================================
// ViewerRoot.checkStreamerInfoLoaded ~~
//	periodically check to usee if the streamer info, giving information on root types has completely loaded
//	this is a critical step before attempting to draw any root objects
ViewerRoot.checkStreamerInfoLoaded = function() {
    if(ViewerRoot.sFile &&
       ViewerRoot.sFile.fStreamerInfo &&
       gFile.fStreamerInfo.fClassMap &&
       gFile.fStreamerInfo.fClassMap.length > 0) //done
    {
	document.getElementById("loaderStatus").innerHTML = "Root Viewer Loaded.<br>Use drop-down to make selections.";
	ViewerRoot.getDirectoryContents("/");
    }
    else //not done, wait longer
	window.setTimeout(ViewerRoot.checkStreamerInfoLoaded,ViewerRoot.LOAD_STREAMER_INFO_CHECK_PERIOD);
}

//=====================================================================================
// ViewerRoot.getDirectoryContents ~~
//	request directory contents from server for path
ViewerRoot.getDirectoryContents = function(path) {

    Debug.log("ViewerRoot getDirectoryContents " + path);

    if(path.indexOf(".root/") >=0)
	DesktopContent.XMLHttpRequest("Request?RequestType=getRoot", "RootPath="+path, ViewerRoot.getDirContentsHandler,
				      0 /*reqParam*/,
				      0 /*progressHandler*/,
				      0 /*callHandlerOnErr*/,
				      false /*doNoShowLoadingOverlay*/);
    else
	DesktopContent.XMLHttpRequest("Request?RequestType=getDirectoryContents", "Path="+path, ViewerRoot.getDirContentsHandler,
				      0 /*reqParam*/,
				      0 /*progressHandler*/,
				      0 /*callHandlerOnErr*/,
				      true /*doNoShowLoadingOverlay*/);
}

//=====================================================================================
// ViewerRoot.getDirContentsHandler ~~
ViewerRoot.getDirContentsHandler = function(req) {
    Debug.log("ViewerRoot getDirContentsHandler " + req.responseText);

    var permissions = DesktopContent.getXMLValue(req,'permissions');
    if(!permissions)
	Debug.log("ViewerRoot getDirContentsHandler permissions missing");
    else if (ViewerRoot.userPermissions != permissions) {
	Debug.log("ViewerRoot getDirContentsHandler user permissions = " + permissions);
	ViewerRoot.userPermissions = permissions;
	ViewerRoot.hud.handleWindowResize();
    }
    ViewerRoot.hud.handleDirContents(req);
}

//=====================================================================================
// ViewerRoot.rootReq ~~
//	if refreshIndex, then request is meant to replace root object at index
ViewerRoot.rootReq = function(rootPath,refreshIndex) {

    if(refreshIndex === undefined) refreshIndex = -1;

    var objHandler = [rootPath,refreshIndex];

    Debug.log("ViewerRoot.rootReq " + rootPath );
    DesktopContent.XMLHttpRequest("Request?RequestType=getRoot",
			          "RootPath="+rootPath,
			          ViewerRoot.getRootDataHandler,
			          objHandler /*reqParam*/,
			          0 /*progressHandler*/,
			          0 /*callHandlerOnErr*/,
			          refreshIndex<0?false:true /*doNoShowLoadingOverlay*/);
} //end rootReq()

//=====================================================================================
//ViewerRoot.rootConfigReq ~~
ViewerRoot.rootConfigReq = function (rootConfigPath) {
    //Debug.log("ViewerRoot.rootReq");
    DesktopContent.XMLHttpRequest("Request?RequestType=getRootConfig",
			          "RootConfigPath="+rootConfigPath,
			          ViewerRoot.getRootConfigHandler,
			          0 /*reqParam*/,
			          0 /*progressHandler*/,
			          0 /*callHandlerOnErr*/,
			          true /*doNoShowLoadingOverlay*/);
} //end rootConfigReq()

//=====================================================================================
//ViewerRoot.getRootConfigHandler ~~
//	receives saved configuration and rebuilds the view based on the configuration
ViewerRoot.getRootConfigHandler = function (req) {
    Debug.log("ViewerRoot getRootConfigHandler " + req.responseText );

	var status = DesktopContent.getXMLValue(req,"status");
	if (status != "1") {
		alert("Loading Root Pre-Made Configuration Failed: " + status);
		return;
	}

    ViewerRoot.iterNumPositionsTiled = DesktopContent.getXMLValue(req,"numPositionsTiled");
    ViewerRoot.iterRunWildcard = DesktopContent.getXMLValue(req,"runNumWildcard");  //TODO replace obj names with current run number!

    //copy NodeList to just normal arrays

    var tmp = req.responseXML.getElementsByTagName("rootObjName");
    ViewerRoot.iterRootObjNameArr = [];
    for(var i=0;i<tmp.length;++i) ViewerRoot.iterRootObjNameArr[i] = tmp[i].getAttribute("value");

    tmp = req.responseXML.getElementsByTagName("rootPos");
    ViewerRoot.iterRootPosArr = [];
    for(var i=0;i<tmp.length;++i) ViewerRoot.iterRootPosArr[i] = tmp[i].getAttribute("value") | 0; //parse as int

    tmp = req.responseXML.getElementsByTagName("rootIsTransparent");
    ViewerRoot.iterRootIsTransparentArr = [];
    for(var i=0;i<tmp.length;++i) ViewerRoot.iterRootIsTransparentArr[i] = tmp[i].getAttribute("value") | 0; //parse as int

    tmp = req.responseXML.getElementsByTagName("rootIsAutoRefresh");
    ViewerRoot.iterRootIsAutoRefreshArr = [];
    for(var i=0;i<tmp.length;++i) ViewerRoot.iterRootIsAutoRefreshArr[i] = tmp[i].getAttribute("value") | 0; //parse as int

    ViewerRoot.clearAll();

    ViewerRoot.iterLoading = true;
    ViewerRoot.iterNumberRemaining = ViewerRoot.iterRootObjNameArr.length;
    ViewerRoot.iterSaveNextObjectMode = ViewerRoot.nextObjectMode;
    ViewerRoot.iterSaveAutoRefreshDefault = ViewerRoot.autoRefreshDefault;

    ViewerRoot.iterativeConfigLoader();
} //end getRootConfigHandler()

//=====================================================================================
//ViewerRoot.iterativeConfigLoader ~~
//	goes through every iterRootObj and loads sequentially to display
ViewerRoot.iterativeConfigLoader = function() {
    //Debug.log("ViewerRoot iterativeConfigLoader " + ViewerRoot.iterNumberRemaining);
    if(!ViewerRoot.iterNumberRemaining)  //done
    {
	ViewerRoot.autoRefreshDefault = ViewerRoot.iterSaveAutoRefreshDefault;
	ViewerRoot.nextObjectMode = ViewerRoot.iterSaveNextObjectMode;
	ViewerRoot.iterLoading = false;
	return;
    }

    --ViewerRoot.iterNumberRemaining;

    //next is always the lowest position left
    var min = -1;
    for(var i=0;i<ViewerRoot.iterRootPosArr.length;++i)
	if(min == -1 || ViewerRoot.iterRootPosArr[i] < ViewerRoot.iterRootPosArr[min]) min = i;

    ViewerRoot.nextObjectMode = ViewerRoot.iterRootIsTransparentArr[min]?ViewerRoot.SUPERIMPOSE_MODE:ViewerRoot.TILE_MODE;
    ViewerRoot.autoRefreshDefault = ViewerRoot.iterRootIsAutoRefreshArr[min];

    ViewerRoot.rootReq(ViewerRoot.iterRootObjNameArr[min]);

    //remove from iter array
    ViewerRoot.iterRootObjNameArr.splice(min,1);
    ViewerRoot.iterRootPosArr.splice(min,1);
    ViewerRoot.iterRootIsTransparentArr.splice(min,1);
    ViewerRoot.iterRootIsAutoRefreshArr.splice(min,1);

} //end iterativeConfigLoader()

//=====================================================================================
// ViewerRoot.currStateRequestHandler ~~
ViewerRoot.currStateRequestHandler = function(req, rootName)
{
    Debug.log("ViewerRoot Hud currStateRequestHandler");

    if(!req) //error! stop handler
    {
	window.clearTimeout(_verifyStateTimeout);
	window.clearInterval(_timeUpdateTimeout);
	Debug.log("Error: " + err, Debug.HIGH_PRIORITY);
	return;
    }

    var cs = DesktopContent.getXMLValue(req,"current_state");
    var in_transition = DesktopContent.getXMLValue(req,"in_transition");

    if(cs != "Running" || in_transition == "1") {
	Debug.log("State needs to be Running to use Live DQM.", Debug.WARN_PRIORITY);
	ViewerRoot.haltRefresh(rootName, Debug.WARN_PRIORITY);
    }
}//end currStateRequestHandler()

//=====================================================================================
// ViewerRoot.haltRefresh ~~
ViewerRoot.haltRefresh = function(rootName, debugLevel) {
    Debug.log("Pausing auto-refresh! \n\nPlease resolve the errors or resumme run. Then uncheck the 'Pause Refresh' in the bottom right.", debugLevel);
    var chk = document.getElementById("hudCheckbox" + 2); //pause refresh checkbox
    chk.checked = true;
    ViewerRoot.pauseRefresh = true;

    Debug.log("Error reading Root object from server - Name: " + rootName, debugLevel);
    ViewerRoot.autoRefreshMatchArr = [];	//clearing the array so that future refreshes work
}//end haltRefresh()

//=====================================================================================
// ViewerRoot.getRootDataHandler ~~
//	receives streamed root object from server and prepares it for js structures
ViewerRoot.getRootDataHandler = function(req, objHandler)
{

    //Debug.log("ViewerRoot getRootDataHandler " + req.responseText );

    var rootType = DesktopContent.getXMLValue(req,"rootType");
    var rootName = DesktopContent.getXMLValue(req,"path");//
    //"my" + rootType + ViewerRoot.objIndex;// DesktopContent.getXMLValue(req,"path");// + ViewerRoot.objIndex;
    //if(rootName.length > 20) rootName = "..." + rootName.substr(rootName.length-18);

    const rootPath = objHandler[0];
    let refreshIndex = objHandler[1];

    var rootJSON = DesktopContent.getXMLValue(req,"rootJSON");

    //Debug.log("ViewerRoot tmpRootDataHandler JSON \n\n" + rootJSON );

    var object = JSROOT.parse(rootJSON);

    if(!object || !rootType || !rootName)
    {
	if(rootPath.includes("LIVE_DQM.root"))
	{
	    DesktopContent.XMLHttpRequest(
		"Request?RequestType=getState",
		"",
		ViewerRoot.currStateRequestHandler,
		rootName /*reqParam*/,
		0 /*progressHandler*/,
		0 /*callHandlerOnErr*/,
		true /*doNotShowLoadingOverlay*/,
		0 /*targetGatewaySupervisor*/,
		true /*ignoreSystemBlock*/
	    );
	}
	else
	{
	    ViewerRoot.haltRefresh(rootName, Debug.HIGH_PRIORITY);
	}
	return;
    }

    var rootTitle = object.fTitle;
    object.JSON = rootJSON;

    if(refreshIndex === undefined) refreshIndex = -1;

    if(ViewerRoot.autoRefreshMatchArr.length &&
       refreshIndex >= 0) //check if request matches auto refresh entry
    {
        for (var i = 0; i < ViewerRoot.autoRefreshMatchArr.length; ++i) {
            if (refreshIndex == ViewerRoot.autoRefreshMatchArr[i][0]) {
		Debug.log("ViewerRoot handling refresh " +
			  refreshIndex + " " + rootName);

		//since handled, remove from auto refresh array
		ViewerRoot.autoRefreshMatchArr[i] = 0;
		ViewerRoot.autoRefreshMatchArr.splice(i,1);
				//if name in js structures has changed,
				//	assume it is users fault and throw out this refreshed object
				if(refreshIndex >= ViewerRoot.rootObjNameArr.length ||
					ViewerRoot.rootObjNameArr[refreshIndex] != rootName) {
					Debug.log("ViewerRoot getRootDataHandler weird unmatch!?#$@%");
					return; //throw out object, since incomplete match
				}

				if (ViewerRoot.autoRefreshMatchArr.length == 0) {
					//reset interval if, all requests handled now
					window.clearInterval(ViewerRoot.autoRefreshTimer);
					ViewerRoot.autoRefreshTimer = window.setInterval(
							ViewerRoot.autoRefreshTick,
							ViewerRoot.autoRefreshPeriod);
				}

				break;
			}
		}
	//if not found, assume it is a new object
    }

    console.log("refreshIndex=" + refreshIndex +
		" ViewerRoot.rootTargetIndex=" + ViewerRoot.rootTargetIndex);

	if(refreshIndex < 0) ViewerRoot.prepareNextLocation(rootName, rootTitle);
	else {
		//refreshIndex is the location to target
		//prepare a new location as though it is replace with auto-refresh on
		//
		// e.g.
		//	 globalset = replace/on
		//	ViewerRoot.prepareNextLocation(rootName);
		//   globalset = gui settings
	// tmpHLI = HIGHLIGHT_INDEX;
	// HIGHLIGHT_INDEX = refreshIndex
	//refreshIndex = -1;
	//	do it
	//	HIGHLIGHT_INDEX = tmpHLI;



        //		var tmpRootTargetIndex = ViewerRoot.rootTargetIndex;
        //		ViewerRoot.rootTargetIndex = refreshIndex;
        //
        //		var tmpRefreshIndex = refreshIndex;
        //		refreshIndex = -1;
        //
        //		var tmpNextObjectMode = ViewerRoot.nextObjectMode;
        //		var tmpAutoRefreshDefault = ViewerRoot.autoRefreshDefault;
        //
        //		ViewerRoot.nextObjectMode = ViewerRoot.REPLACE_MODE;
        //		ViewerRoot.autoRefreshDefault = true;
        //
        //
        //		ViewerRoot.prepareNextLocation(rootName);
        //
        //
        //		ViewerRoot.rootTargetIndex = tmpRootTargetIndex;
        //		ViewerRoot.nextObjectMode = tmpNextObjectMode;
        //		ViewerRoot.autoRefreshDefault = tmpAutoRefreshDefault;
    }

    ViewerRoot.interpretObjectJSON(object,rootType,rootName,refreshIndex);
    if(ViewerRoot.iterLoading) ViewerRoot.iterativeConfigLoader();
} //end getRootDataHandler()


//=====================================================================================
// ViewerRoot.interpretObjectJSON ~~
//	interpret and draw
ViewerRoot.interpretObjectJSON = function (object, rootType, objName, refreshIndex) {

    if (refreshIndex === undefined) refreshIndex = -1;

    let objIndex;

    if (refreshIndex < 0) {
	ViewerRoot.rootObjArr.push(object);
	ViewerRoot.rootObjIndexArr.push(ViewerRoot.objIndex++);
	objIndex = ViewerRoot.rootObjArr.length - 1;
    }
    else {
	ViewerRoot.rootObjArr[refreshIndex] = object;
	ViewerRoot.rootObjTitleArr[refreshIndex] = object.fTitle;
	objIndex = refreshIndex;
    }

    let posi = ViewerRoot.rootPosArr[objIndex];
    ViewerRoot.queueRenderPosition(posi);
    ViewerRoot.manageRootHeaders();
}; //end interpretObjectJSON()

//=====================================================================================
function loadScript(url, callback) {
    // dynamic script loader using callback
    // (as loading scripts may be asynchronous)
    var script = document.createElement("script")
    script.type = "text/javascript";
    if (script.readyState) { // Internet Explorer specific
	script.onreadystatechange = function() {
	    if (script.readyState == "loaded" ||
		script.readyState == "complete") {
		script.onreadystatechange = null;
		callback();
	    }
	};
    } else { // Other browsers
	script.onload = function(){
	    callback();
	};
    }
    //var rnd = Math.floor(Math.random()*80000); //keeping in case we need to bring back cache breaking behavior in the future
    script.src = url;//+ "?r=" + rnd;
    document.getElementsByTagName("head")[0].appendChild(script);
} //end loadScript()
