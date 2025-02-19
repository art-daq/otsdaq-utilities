
var test_numSet_ = [1, 34, 500, 432, 098, 124, 234, 3464, 12];
var barValue_;
var updateTimeout_;
var test_numSetIndex = 0;
var switchValue_;

var pvNames_ = new Array(2);

function init()
{
	console.log("init called");
	switchValue_ = false;
	barValue_ = 0;
	drawSwitch();
	drawBar();
	window.parent.setupWidget(window.frameElement.id);

	//window.setInterval(updateSwitch, 1000);

	//barValue_ = 0;
	//updateTimeout_ = window.setInterval(updateBar, 20);

	//updateTimeout_ = window.setInterval(updateBar2, 1000)
}

function newWidget(widget)
{
	console.log(widget);
	for(var pvi=0;pvi< Object.keys(widget.PVList).length && pvi< 2;++pvi)
	{
		console.log(pvi);

		pvNames_[pvi] = Object.keys(widget.PVList)[pvi];

	}

}

function setupPVs(settings)
{
	console.log("setupPVs() : " + settings);
}

function newValue(pvName, pvValue, pvTime, pvStatus, pvSeverity)
{
	var pvi = 0;
	for(;pvi<pvNames_.length;++pvi)
	{
		if(pvNames_[pvi] == pvName)
			break;
	}

	if(pvi == pvNames_.length)
	{
		console.log("Invalid new value for PV name:" + pvName);
		return;
	}

	//console.log("Found valid value for PV:" + pvName + " pvi: " + pvi + " value: " + pvValue);

	if(pvi == 0) //use as switch
	{
		switchValue_ = ((pvValue>>1)|0)%2;
		drawSwitch();
	}
	else if(pvi == 1) //use as bar
	{
		barValue_ = (pvValue|0)%100;
		drawBar();
	}

}



function updateSwitch()
{
	switchValue_ = !switchValue_;
	drawSwitch();
}

function drawSwitch()
{
	//console.log("switchValue called " + switchValue_);
	var elem = document.getElementById("switch_rounded");
	if (switchValue_)
	{

		elem.checked = true;

	}
	else
	{
		elem.checked = false;
	}
}

function updateBar()
{
	console.log("updateBar called " + barValue_);
	drawBar();
	if (barValue_ == 100)
	{
		window.clearInterval(updateTimeout_);
		return;
	}
	++barValue_;
}

function updateBar2() {
	//console.log("updateBar called " + barValue_);
	barValue_ = test_numSet_[test_numSetIndex];
	test_numSetIndex++;
	drawBar();
	if (test_numSetIndex == test_numSet_.length) {
		// window.clearInterval(updateTimeout_);
		test_numSetIndex = 0;
		return;
	}

}

function drawBar()
{
	//console.log("drawBar() called " + barValue_);
	var elem = document.getElementById("weather_bar");
	var elem2 = document.getElementById("weatherBar_bg");
	var width = 100 - barValue_;


	if(barValue_ < 0 || barValue_ > 100)
	{
	   // console.log("illegal value");
		elem.innerHTML = 'Illegal';
		elem.style.width = 100 + "%";
		elem.style.left = 0 + "%";
		elem.style.backgroundColor = "red";
	}
	else
	{
		elem.style.width = width + '%';
		elem.style.left = barValue_ + '%';
		elem2.innerHTML = barValue_ + '%';
		elem.innerHTML = "";
		elem.style.backgroundColor = "white";

	}
}
