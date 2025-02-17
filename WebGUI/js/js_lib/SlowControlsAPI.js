////////////////////////////////////////////////////////////////////////////////////////////
//////// Functions and variables to be included by other online monitoring pages ///////////        
////////////////////////////////////////////////////////////////////////////////////////////
//
//  functions:
//
//	setWidgetToolTip(pvName, pvValue, pvTime, pvSettings)
//	checkPvTime(widget, pvName, pvTime)
//	setWidgetPvInfo(widget, pvName, pvValue, pvTime, pvStatus, pvSeverity, showLabel, foregroundColor, bkgColor, border)
//
//=====================================================================================

var SlowControlsAPI = SlowControlsAPI || {}; //define SlowControlsAPI namespace

/////////////////////////////////////////////////////////////////////////
//global variables
SlowControlsAPI._datalist;

/////////////////////////////////////////////////////////////////////////
//function definitions

//=====================================================================================
SlowControlsAPI.setWidgetToolTip = function (pvName, pvValue, pvTime, pvStatus, pvSeverity, pvSettings)
{
    var toolTip =
    pvName
    + "\nLast value: "
    + Number.parseFloat(pvValue).toFixed(2)
    + " "
    + pvSettings[pvName].Units
    
    + "\nTime: "
    + ConfigurationAPI.getDateString(new Date((pvTime | 0) * 1000))
    + "\nStatus: "
    + pvStatus
    + "\nSeverity: "
    + pvSeverity
    + "\nLower Warning Limit:  " + Number.parseFloat(pvSettings[pvName].Lower_Warning_Limit) + "\n"
    + "Upper Warning Limit:  "   + Number.parseFloat(pvSettings[pvName].Upper_Warning_Limit) + "\n"
    + "Lower Alarm Limit:    "   + Number.parseFloat(pvSettings[pvName].Lower_Alarm_Limit)   + "\n"
    + "Upper Alarm Limit:    "   + Number.parseFloat(pvSettings[pvName].Upper_Alarm_Limit)   + "\n"
    + "Lower Control Limit:   "  + Number.parseFloat(pvSettings[pvName].Lower_Control_Limit) + "\n"
    + "Upper Control Limit:   "  + Number.parseFloat(pvSettings[pvName].Upper_Control_Limit) + "\n"
    + "Lower Display Limit:   "  + Number.parseFloat(pvSettings[pvName].Lower_Display_Limit) + "\n"
    + "Upper Display Limit:   "  + Number.parseFloat(pvSettings[pvName].Upper_Display_Limit) + "\n";
    return toolTip;
} //end setWidgetToolTip()

//=====================================================================================
SlowControlsAPI.checkPvTime = function (widget, pvName, pvTime)
{
    var actualTime = Math.floor(Date.now())/1000;
    var time2compare = pvTime*1. + 86400;//24 hours more;
    console.log(
                    "Date now: "
                + actualTime
                + " pvtime: "
                + pvTime
                + " time2compare - actualTime: "
                + (time2compare - actualTime)
                + " refresh rate: "
                + page_.widgets[widget].pvList[pvName]
                );

    if ((pvTime !== undefined) && (time2compare > actualTime)) return true;
    return false;
} //end checkPVTime()


//=====================================================================================
SlowControlsAPI.setWidgetPvInfo = function (widget, pvName, pvValue, pvTime, pvStatus, pvSeverity, timeCheck, showLabel, foregroundColor, bkgColor, border)
{
    var widgetNameElement = page_.widgets[widget].el.parentElement.children[0];
    var widgetValueElement = page_.widgets[widget].el;

    var actualTime = Math.floor(Date.now())/1000;

    if (widgetNameElement !== null && widgetNameElement !== undefined)
        if (showLabel == true)
        {
            if(pvSeverity == "MAJOR" )
                widgetNameElement.innerHTML = "<center style = 'color: red'>" + pvName + "<br>Status: " + pvStatus + "<br>Severity: " + pvSeverity + "</center>";
            else if(pvSeverity == "MINOR")
                widgetNameElement.innerHTML = "<center style = 'color: orange'>" + pvName + "<br>Status: " + pvStatus + "<br>Severity: " + pvSeverity + "</center>";
            else if (!SlowControlsAPI.checkPvTime(widget, pvName, pvTime))
                widgetNameElement.innerHTML = "<center style = 'color:" + foregroundColor + "'>"
                                            + pvName
                                            + "<br><i>(Not updated for more than " + parseInt((actualTime - pvTime*1.)/60) + " minutes)</i></center>";
            else
                widgetNameElement.innerHTML = pvName;

        }

    if (widgetValueElement !== null && widgetValueElement !== undefined)
    {
        if (timeCheck && SlowControlsAPI.checkPvTime(widget, pvName, pvTime))
        { 
            if(pvSeverity == "NO_ALARM" )
            {
                    widgetValueElement.style.border = "4px solid green";
                    widgetValueElement.style.backgroundColor = 'green';
            }
            else if(pvSeverity == "MINOR" )
            {
                widgetValueElement.style.border = "4px solid orange";
                widgetValueElement.style.backgroundColor = 'orange';
            }
            else if(pvSeverity == "MAJOR" )
            {
                widgetValueElement.style.border = "4px solid red";
                widgetValueElement.style.backgroundColor = 'red';
            }
            else
            {
                widgetValueElement.style.border = "4px solid darkslategray";
                widgetValueElement.style.backgroundColor = 'darkslategray';
            }
       }
        else
        {
            widgetValueElement.style.border = "4px solid " + bkgColor;
            widgetValueElement.style.backgroundColor = bkgColor;
        }
    }
    else
        console.log("setWidgetPVinfo(): widgetValueElement is null or not defined!");
} //end setWidgetPVinfo()


//=====================================================================================
SlowControlsAPI.getAllPvList = function ()
{
    DesktopContent.XMLHttpRequest(
            "Request?RequestType=getList",
            "", 
            pvListReqHandler /*returnHandler*/, 
            0 /*reqParam*/, 
            0 /*progressHandler*/, 
            0 /*callHandlerOnErr*/, 
            false /*doNoShowLoadingOverlay*/);

} //end getAllPvList()


//=====================================================================================
SlowControlsAPI.pvListReqHandler = function (req)
{
    console.log("pvListReqHandler: response received!");	
    console.log(req.responseText);
    SlowControlsAPI._datalist = document.createElement('datalist');
    SlowControlsAPI._datalist.id = "pvDatalist";
    SlowControlsAPI._datalist.innerHTML = "";

    var jsonStr = DesktopContent.getXMLValue(req, "JSON");
    if(!jsonStr || jsonStr == "") return;				
    var pvListJSON;

    try {pvListJSON = JSON.parse(jsonStr); }
    catch(e){console.log("Invalid JSON!"); return;}

    console.log("pvListJSON:", pvListJSON);
    for (var x in pvListJSON)
    {
        var option = document.createElement("option");
        option.value = pvListJSON[x];
        SlowControlsAPI._datalist.appendChild(option);
    }
} //end pvListReqHandler()


//=====================================================================================
//	expecting id as 'widget-#' ..and this function extracts the 
//	widget UID as integer #
SlowControlsAPI.setupPvParams = function (id, widget)
{
    console.log("setting up widget!");

    var pvListCSV = "";

    for(var pv in widget.pvList)
    {
        pvListCSV += pv + ",";
    }

    DesktopContent.XMLHttpRequest("Request?RequestType=getPVSettings",
                //post data 
                "pvList=" + pvListCSV + 
                "&id=" + id,
                SlowControlsAPI.settingsReqHandler /*handler*/,
                widget /*parameter*/);

} //end setupPvParams()


//=====================================================================================
SlowControlsAPI.settingsReqHandler = function (req, widget)
{
    widget.pvSettings = JSON.parse(DesktopContent.getXMLValue(req, "JSON"));				

    console.log(req);
    console.log("pvSettings: ", widget.pvSettings);
} //end settingsReqHandler()