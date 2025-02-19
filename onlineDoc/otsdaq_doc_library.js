// ==============================
//
// Note: this code is the main javascript library for the otsdaq online documentation
//
//	created by rrivera at fnal dot gov, May 2019
// ==============================


var ots = ots || {}; //define ots namespace

ots.otsdaqFeatures_ = {};

ots.initFeatures = function()
{
	console.log("ots.initFeatures()");

	ots.HttpRequest("../contentData/otsdaq_features.json","",
			function(req)
			{
		console.log("Request text",req.responseText);
		ots.otsdaqFeatures_ = JSON.parse(req.responseText);
		console.log("json features",ots.otsdaqFeatures_);

		//jumpe to anchor in url.. now that it is not iframe
		var anchori = window.location.href.indexOf('#');
		if(anchori > 0)
			location.href = window.location.href.substr(anchori);

			});
}

window.addEventListener("load",ots.initFeatures);



//=====================================================================================
//ots.HttpRequest ~~
// forms request properly for ots server, POSTs data
// and when request is returned, returnHandler is called with
// req result on success, if failure do to bad url called with 0
//
// reqIndex is used to give the returnHandler an index to route responses to.
//
ots.HttpRequest = function(requestURL, data, returnHandler, reqIndex) {

	var errStr = "";
	var req = new XMLHttpRequest();

	req.onreadystatechange = function() {
		if (req.readyState==4) {  //when readyState=4 return complete, status=200 for success, status=400 for fail
			if(req.status==200)
			{
				//response received
				console.log("Request Response Text " + req.responseText);
			}
			else
			{
				//response failure

				console.log("Request Failed!");
			}

			if(returnHandler) returnHandler(req,reqIndex,errStr);
		}
	}

	//requestURL = "/urn:xdaq-application:lid="+urnLid+"/"+requestURL;
	//Debug.log("Post " + requestURL + "\n\tData: " + data);
	req.open("POST",requestURL,true);
	//req.setRequestHeader("Content-type","application/x-www-form-urlencoded");
	req.setRequestHeader("Content-Type", "text/plain;charset=UTF-8");
	req.send(data);
} //end ots.HttpRequest()
