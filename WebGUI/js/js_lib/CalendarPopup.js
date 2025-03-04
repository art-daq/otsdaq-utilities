// ===================================================================
// Author: Ryan Rivera
//	 	Use to create a calendar and get a date selectiong
//			back from user. A handler function is called
//			if the user selects a date. If the user cancels
//			nothing is called.
//
//		Usage:
//----			function calendarPopup(x, y, calendarHandler)
//
//
//			- Calendar pops up at x, y
//			- Date value returned to calendarHandler as number
//				representing days since Jan 1, 1970
//
//
//		Example JS code:
//
//----			function myDateHandler(userDate) { alert(userDate); }
//----			//open calendar at coordinates (10,10)
//----			calendarPopup( 10 , 10 , myDateHandler);
//
//
//		Tips:
//			- override defaults at top of code for personalization
// ===================================================================

var CalendarPopup = CalendarPopup || {}; //define CalendarPopup namespace
if(1 && window.console && console && console.log)
	CalendarPopup.dbg = console.log.bind(window.console);
else
	CalendarPopup.dbg = function(){;} //do nothing

//defaults
//	can be overridden in user code

var calendarPopup_BORDER = "1px solid #aaa";
var calendarPopup_BACKGROUND_COLOR = "rgba(0,0,0,0.8)";
var calendarPopup_FONT_COLOR = "white";

var calendarPopup_Z = 1000000;
var calendarPopup_W = 180;
var calendarPopup_H = 186;
var calendarPopup_CALID = "calendarPopup";
var calendarPopup_MIN_YEAR = 2013;	//0 indicates current year
var calendarPopup_MAX_YEAR = 0;		//0 indicates current year

var calendarPopup_HEADER_H = 35;
var calendarPopup_DATES_H = 110;
var calendarPopup_DATES_OFFY = 28;
var calendarPopup_DATES_HDR_H = 15;

//member variables - do not override
var calendarPopup_HANDLER;

//function list
	//calendarPopup(x, y, calendarHandler)
	//calendarPopupAddHeader()
	//cancelCalendar()
	//calendarPopupAddMonthNav()
	//previousMonth()
	//nextMonth()
	//calendarPopupAddDates()
	//calendarPopupAddFooter()
	//redrawDates()
	//handleSelection()

/////////////////////////////////////////

//==============================================================================
//calendarPopup ~
//	x is integer from left edge of window
//  y is integer from top edge of window
// initDate := int time ==> e.g., parseInt((new Date("Jan 1, 2013")).getTime());
function calendarPopup(x, y, calendarHandler, initDate)
{
	CalendarPopup.dbg("calendarPopup()");

	calendarPopup_HANDLER = calendarHandler;

	//remove calendar if already exists
	cancelCalendar();

	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID);
	el.style.zIndex = calendarPopup_Z;
	el.style.position = "absolute";
	el.style.overflow = "hidden";
	el.style.left = x + "px";
	el.style.top = y + "px";
	el.style.width = calendarPopup_W + "px";
	el.style.height = calendarPopup_H + "px";

	el.style.backgroundColor = calendarPopup_BACKGROUND_COLOR;
	el.style.border = calendarPopup_BORDER;
	el.style.color = calendarPopup_FONT_COLOR;

	document.body.appendChild(el);

	calendarPopupAddHeader(initDate);
	calendarPopupAddMonthNav(initDate);
	calendarPopupAddDates(initDate);
	calendarPopupAddFooter();
} //end calendarPopup()

//==============================================================================
//calendarPopupAddHeader
//	add drop down and month display
function calendarPopupAddHeader(initDate)
{
	var calEl = document.getElementById(calendarPopup_CALID);
	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID + "-header");
	el.style.position = "absolute";
	el.style.left = 0 + "px";
	el.style.top = 0 + "px";
	el.style.width = calendarPopup_W + "px";
	el.style.height = calendarPopup_HEADER_H + "px";
	el.style.borderBottom = calendarPopup_BORDER;

	calEl = calEl.appendChild(el);
	var subCalEl;

	//add month select -----------------
	el = document.createElement("select");
	el.setAttribute("id", calendarPopup_CALID + "-monthSelect");
	el.style.color = "black";
	el.setAttribute("title", "Select a month from the dropdown");
	el.style.margin = "5px";
	el.style.cssFloat = "left";
	el.style.width = 70 + "px";
	el.onchange = handleSelection;

	subCalEl = calEl.appendChild(el);

	el = document.createElement("option");
	el.style.color = "black";

	var thisDate = initDate?(new Date(initDate)):(new Date());
	// el.text = "Month";
	var thisMonth = thisDate.toDateString().split(" ")[1]; //init to this month

	subCalEl.add(el,null); //insert at end of list

	var mDate = parseInt((new Date("Jan 1, 2013")).getTime()); //init to jan, arbitrary year
	for(var i=0;i<12;++i, mDate += 1000*60*60*24*32) //add 32 days to get all months
	{
		el = document.createElement("option");
		el.style.color = "black";
		el.text = (new Date(mDate)).toDateString().split(" ")[1];
		if(el.text == thisMonth)
			el.selected = true;
		subCalEl.add(el,null); //insert at end of list
	}

	//add year select -------------
	el = document.createElement("select");
	el.setAttribute("id", calendarPopup_CALID + "-yearSelect");
	el.style.color = "black";
	el.setAttribute("title", "Select a year from the dropdown");
	el.style.margin = "5px";
	el.style.cssFloat = "left";
	el.style.width = 70 + "px";
	el.onchange = handleSelection;

	subCalEl = calEl.appendChild(el);

	el = document.createElement("option");

	var yDate = parseInt(thisDate.getFullYear()); //init to this year

	var yMin = parseInt(calendarPopup_MIN_YEAR)?parseInt(calendarPopup_MIN_YEAR):yDate;
	var yMax = parseInt(calendarPopup_MAX_YEAR)?parseInt(calendarPopup_MAX_YEAR):yDate;
	for(var i=yMin;i<=yMax;++i) //add all years in range and select current year
	{
		el = document.createElement("option");
		el.style.color = "black";
		el.text = i;
		subCalEl.add(el,null); //insert at end of list
		if(yDate == i) el.defaultSelected = true;
	}

	//add cancel -------------
	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID + "-cancel");
	el.setAttribute("title", "Cancel date select");
	el.style.margin = "5px";
	el.style.cssFloat = "left";
	el.style.width = 10 + "px";
	el.style.height = 10 + "px";
	el.innerHTML = "<b>X</b>";
	el.style.fontFamily = "arial";
	el.style.cursor = "pointer";

	el.onmouseup = cancelCalendar;
	calEl.appendChild(el);
} //end calendarPopupAddHeader()

//==============================================================================
//cancelCalendar
//	close calendar do not call handler
function cancelCalendar()
{
	var el = document.getElementById(calendarPopup_CALID);
	if(el)
		el.parentNode.removeChild(el);
} //end cancelCalendar()

//==============================================================================
//calendarPopupAddMonthNav
function calendarPopupAddMonthNav(initDate)
{
	var calEl = document.getElementById(calendarPopup_CALID);

	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID + "-monthNav");
	el.style.position = "absolute";
	el.style.left = 0 + "px";
	el.style.top = calendarPopup_HEADER_H + "px";
	el.style.width = calendarPopup_W + "px";

	calEl = calEl.appendChild(el);

	var navW = 25;

	//add left arrows
	el = document.createElement("div");
	el.setAttribute("title", "Prev Month");
	el.style.margin = "5px";
	el.style.cssFloat = "left";
	el.style.width = navW + "px";
	el.innerHTML = "<b>&lt&lt&lt</b>";
	el.style.fontFamily = "arial";
	el.style.cursor = "pointer";
	el.style.textAlign = "center";

	el.onmouseup = previousMonth;
	calEl.appendChild(el);

	//add current month, year
	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID + "-monthYearDisplay");
	el.style.cssFloat = "left";
	el.style.width = (calendarPopup_W - navW*2 - 20) + "px";

	var thisDate = initDate?(new Date(initDate)):(new Date());
	var todayArr = thisDate.toDateString().split(" ");
	el.innerHTML = todayArr[1] + " " + todayArr[3];  //init to current month
	el.style.fontWeight = "800";
	el.style.textAlign = "center";
	el.style.cursor = "default";
	el.style.marginTop = "5px";

	calEl.appendChild(el);

	//add right arrows
	el = document.createElement("div");
	el.setAttribute("title", "Prev Month");
	el.style.margin = "5px";
	el.style.cssFloat = "right";
	el.style.width = navW + "px";
	el.innerHTML = "<b>&gt&gt&gt</b>";
	el.style.fontFamily = "arial";
	el.style.cursor = "pointer";
	el.style.textAlign = "center";

	el.onmouseup = nextMonth;
	calEl.appendChild(el);

	//add hidden current month and year displayed
	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID + "-currMonth");
	el.style.display = "none";
	el.innerHTML = thisDate.getMonth();  //init to current month
	calEl.appendChild(el);
	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID + "-currYear");
	el.style.display = "none";
	el.innerHTML = thisDate.getFullYear();  //init to current month
	calEl.appendChild(el);

} //end calendarPopupAddMonthNav()

//==============================================================================
//previousMonth
function previousMonth()
{
	var el = document.getElementById(calendarPopup_CALID + "-currMonth");
	var newMo = parseInt(el.innerHTML)-1;  //subtract 1 from month (0-11)
	var yel = document.getElementById(calendarPopup_CALID + "-currYear");
	if(newMo < 0) //decrement year
	{
		newMo = 11;
		yel.innerHTML = parseInt(yel.innerHTML)-1;
	}
	el.innerHTML = newMo;
	el = document.getElementById(calendarPopup_CALID + "-monthYearDisplay");
	var dayArr = (new Date(yel.innerHTML,newMo,1)).toDateString().split(" ");
	el.innerHTML = dayArr[1] + " " + dayArr[3]; //display updated month
	redrawDates();
} //end previousMonth()

//==============================================================================
//nextMonth
function nextMonth()
{
	var el = document.getElementById(calendarPopup_CALID + "-currMonth");
	var newMo = parseInt(el.innerHTML)+1;  //add 1 from month (0-11)
	var yel = document.getElementById(calendarPopup_CALID + "-currYear");
	if(newMo > 11) //increment year
	{
		newMo = 0;
		yel.innerHTML = parseInt(yel.innerHTML)+1;
	}
	el.innerHTML = newMo;
	el = document.getElementById(calendarPopup_CALID + "-monthYearDisplay");
	var dayArr = (new Date(yel.innerHTML,newMo,1)).toDateString().split(" ");
	el.innerHTML = dayArr[1] + " " + dayArr[3]; //display updated month
	redrawDates();
} //end nextMonth()

//==============================================================================
//calendarPopupAddDates
function calendarPopupAddDates(initDate)
{
	var calEl = document.getElementById(calendarPopup_CALID);

	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID + "-dates");
	el.style.position = "absolute";
	el.style.left = 0 + "px";
	el.style.top = calendarPopup_HEADER_H + calendarPopup_DATES_OFFY +
		calendarPopup_DATES_HDR_H + "px";
	el.style.width = calendarPopup_W + "px";
	el.style.height = calendarPopup_DATES_H + "px";
	el.style.paddingTop = "2px";

	calEl.appendChild(el);

	el = document.createElement("div");
	el.setAttribute("id", calendarPopup_CALID + "-datesHeader");
	el.style.position = "absolute";
	el.style.left = 0 + "px";
	el.style.top = calendarPopup_HEADER_H + calendarPopup_DATES_OFFY + "px";
	el.style.width = calendarPopup_W + "px";
	el.style.height = calendarPopup_DATES_HDR_H + "px";
	el.style.borderBottom = '1px solid #aaa';

	calEl = calEl.appendChild(el);

	var w = parseInt(calendarPopup_W/7);
	var firstMargin = parseInt((calendarPopup_W - w*7)/2); //acount for fractional acccumulation of error
	var x = 0;
	var day = new Date("Jun 9, 2013"); //any Sunday
	for(var i=0;i<7;++i, day = new Date(day.getTime() + 1000*60*60*24)) //draw day headers, day by day
	{
		el = document.createElement("div");
		el.setAttribute("class", calendarPopup_CALID + "-dayHdr");
		el.style.cssFloat = "left";
		el.style.width = w + "px";
		el.style.height = calendarPopup_DATES_HDR_H + "px";
		el.style.color = "white";
		el.style.textAlign = "center";
		if(!i) el.style.marginLeft = firstMargin + "px";
		el.innerHTML = day.toDateString()[0]; //get first letter of day
		calEl.appendChild(el);
	}

	redrawDates(initDate);
} //end calendarPopupAddDates()

//==============================================================================
//calendarPopupAddFooter
function calendarPopupAddFooter()
{
	var calEl = document.getElementById(calendarPopup_CALID);
} //end calendarPopupAddFooter()

//==============================================================================
//redrawDates
function redrawDates(initDate)
{
	var calEl = document.getElementById(calendarPopup_CALID + "-dates");
	calEl.innerHTML = ""; //clear old dates

	//draw 6 weeks of dates always

	//start from 1st of the curr month/year
	var mo = document.getElementById(calendarPopup_CALID + "-currMonth").innerHTML;
	var day = new Date(
			document.getElementById(calendarPopup_CALID + "-currYear").innerHTML,
			mo,1);
	//walk back dayOne until it is a Sunday (day 0)
	while(day.getDay()) day = new Date(day.getTime() - 1000*60*60*24); //subtract a day

	//now have first day in dates, loop through 7*6
	var w = parseInt(calendarPopup_W/7);
	var h = parseInt(calendarPopup_DATES_H/6);
	var x = 0, y = 0;
	var firstMargin = parseInt((calendarPopup_W - w*7)/2); //acount for fractional acccumulation of error

	var thisDate = initDate?(new Date(initDate)):(new Date());
	var todayDate = thisDate.getDate(); //to color today
	var todayMonth = thisDate.getMonth(); //to color today
	var todayYear = thisDate.getFullYear(); //to color today
	for(var i=0;i<7*6;++i, day = new Date(day.getTime() + 1000*60*60*24)) //draw dates, day by day
	{
		el = document.createElement("div");
		el.setAttribute("class", calendarPopup_CALID + "-day");
		//store in ID, days since Jan 1, 1970
		el.setAttribute("id", calendarPopup_CALID + "-day-" + parseInt(day.getTime()/(1000*60*60*24)));

		el.style.cssFloat = "left";
		el.style.width = w + "px";
		el.style.height = h + "px";
		el.style.textAlign = "center";
		el.style.cursor = "pointer";
		el.style.color = mo == day.getMonth()?"white":"gray";
		el.style.backgroundColor = (
				todayYear == day.getFullYear() &&
				todayMonth == day.getMonth() &&
				todayDate == day.getDate())?"#458":"auto";

		if(!(i%7)) el.style.marginLeft = firstMargin + "px";
		el.innerHTML = day.getDate();  //get day number

		el.onmouseup = selectDate;

		calEl.appendChild(el);
	}

	//add hover color for day
	var head = document.getElementsByTagName('head')[0];
	var style = document.createElement('style');
	var declarations = document.createTextNode("." + calendarPopup_CALID + "-day:hover { background-color: #A10 }");
	style.type = 'text/css';
	if (style.styleSheet) {
	  style.styleSheet.cssText = declarations.nodeValue;
	} else {
	  style.appendChild(declarations);
	}

	head.appendChild(style);
} //end redrawDates()

//==============================================================================
//handleSelection
//	handle selection change from month or year drop down
function handleSelection()
{
	var el = document.getElementById(calendarPopup_CALID + "-monthSelect");
	var newMo = el.value;
	el = document.getElementById(calendarPopup_CALID + "-monthYearDisplay");	//display updated month
	el.innerHTML = newMo;
	newMo = (new Date(newMo + " 1 2013")).getMonth();	//get new month in 0-11 format
	el = document.getElementById(calendarPopup_CALID + "-currMonth");
	el.innerHTML = newMo;

	el = document.getElementById(calendarPopup_CALID + "-yearSelect");
	newMo = el.value;
	el = document.getElementById(calendarPopup_CALID + "-monthYearDisplay");	//display updated month
	el.innerHTML += " " + newMo;
	el = document.getElementById(calendarPopup_CALID + "-currYear");
	el.innerHTML = newMo;

	redrawDates();
} //end handleSelection()

//==============================================================================
function selectDate()
{
	calendarPopup_HANDLER(parseInt(this.id.split("-")[2])+1); //pass days since Jan 1, 1970
	cancelCalendar();
} //end selectDate()
