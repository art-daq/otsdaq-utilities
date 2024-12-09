var selectedSecurityChoice_ = "";
var IDs_ = ['NoSecurity', 'DigestAccessAuthentication'];//, 'ResetSecurityUserData'];//'Kerberos','ResetSecurityUserData'];
var selection_ = [];
INTERVAL_ = 1;
state_ = document.getElementById("state");
//////////////////////////
nonSelectedRed = 2;
nonSelectedGreen = 2;
nonSelectedBlue = 2;
//////////////////////////
var nonSelectedTargetRed;
var nonSelectedTargetGreen;
var nonSelectedtargetBlue;
//////////////////////////
selectedRed = 2;
selectedGreen = 2;
selectedBlue = 2;
//////////////////////////
var selectedTargetRed;
var selectedTargetGreen;
var selectedtargetBlue;
//////////////////////////



//=====================================================================================
function init()
{
	var windowTooltip = "This is an introduction into the Wiz-Mode Security!" +
		"\n\n" +
		"There are currently two options for otsdaq Security:" +
		"\n\t- <b>No Security:</b>\n<INDENT>" +
		"Just as it sounds, there will be no login required, and all requests " +
		"will be treated as though they come from fully priveleged administrators. " +
		"The only security is afforded by keeping your URL unknown (like on a private network)." +
		"\n\n" +
		"This mode is usually convenient during development or when there are only a few users, and " +
		"there is no need for permissions restrictions or tracking individual user activity." +
		"</INDENT>" +
		"\n\t- <b>Digest Access Authentication:</b>\n<INDENT>" +
		"This is a straightforward username and password approach to security. " +		
		"Users can be assigned different levels of access individually. " +
		"If users associate an email address with their username, then alerts, alarms, and system messages can be sent to a selection of users." +
		"\n\n" +
		"This mode is the recommended <i>otsdaq</i> security approach to enable individual user access and accountability." +
		"</INDENT>";
	console.log("init()");
	DesktopContent.tooltip("Security in the Wiz-Mode",
		windowTooltip  
	);
	DesktopContent.setWindowTooltip(windowTooltip);

	for(var index = 0; index < IDs_.length; index++)
			selection_[index] = IDs_[index];
	//Added all of the IDs into the selection_ array and position the selection at the end
	
	colorFade('orange', "all");
	state_= document.getElementById("state");
	state_.innerHTML = "Loading...";

	var setSelection=setTimeout(makeServerRequest, 1000);
} //end init()


//=====================================================================================
function colorFade(secondColor, which)
{


	//Added all of the IDs into the selection_ array and position the selection at the end
	
	if(which == "selected" || which == "all")
	{

		if(secondColor == 'orange')
		{
			selectedTargetRed = 255;
			selectedTargetGreen = 188;
			selectedTargetBlue = 18;				
		}
		else if(secondColor == 'red')
		{
			selectedTargetRed = 242;
			selectedTargetGreen = 5;
			selectedTargetBlue = 5;					
		}
		else if(secondColor == 'green')
		{
			selectedTargetRed = 56;
			selectedTargetGreen = 224;
			selectedTargetBlue = 56;					
		}
		else if(secondColor == 'current')
		{
			
		}
		
	}
	
	
	if(which == "notSelected" || which == "all")
	{
	
		if(secondColor == 'orange')
		{
			nonSelectedTargetRed = 255;
			nonSelectedTargetGreen = 188;
			nonSelectedTargetBlue = 18;				
		}
		else if(secondColor == 'red')
		{
			nonSelectedTargetRed = 242;
			nonSelectedTargetGreen = 5;
			nonSelectedTargetBlue = 5;					
		}
		else if(secondColor == 'green')
		{
			nonSelectedTargetRed = 56;
			nonSelectedTargetGreen = 224;
			nonSelectedTargetBlue = 56;					
		}
		else if(secondColor == 'current')
		{
			
		}
	}    
	
	//console.log(selectedRed, selectedGreen, selectedBlue, nonSelectedRed, nonSelectedGreen, nonSelectedBlue);
	
	var colorChanger=setTimeout(decreaseColor, INTERVAL_);


} //end colorFade()


//=====================================================================================
function decreaseColor()
{
	if(selectedRed > 0)
		--selectedRed;
	if(selectedGreen > 0)
		--selectedGreen;
	if(selectedBlue > 0)
		--selectedBlue;
	if(nonSelectedRed > 0)
		--nonSelectedRed;
	if(nonSelectedGreen > 0)
		--nonSelectedGreen;
	if(nonSelectedBlue > 0)
		--nonSelectedBlue;
	//console.log("Called");
	setDivGlow();
	
	if((selectedRed + selectedGreen + selectedBlue + 
			nonSelectedRed + nonSelectedGreen + nonSelectedBlue) > 0)
		colorChanger = setTimeout(decreaseColor, INTERVAL_);
	else
	{
		restructure();
		colorChanger = setTimeout(increaseColor, INTERVAL_);

	}
} //end decreaseColor()


//=====================================================================================
function increaseColor()
{
	if(selectedRed < selectedTargetRed)
		++selectedRed;
	if(selectedGreen < selectedTargetGreen)
		++selectedGreen;
	if(selectedBlue < selectedTargetBlue)
		++selectedBlue;
	if(nonSelectedRed < nonSelectedTargetRed)
		++nonSelectedRed;
	if(nonSelectedGreen < nonSelectedTargetGreen)
		++nonSelectedGreen;
	if(nonSelectedBlue < nonSelectedTargetBlue)
		++nonSelectedBlue;	
	setDivGlow();
	
	if((selectedRed + selectedGreen + selectedBlue + 
			nonSelectedRed + nonSelectedGreen + nonSelectedBlue) < 
			(selectedTargetRed + selectedTargetGreen + selectedTargetBlue + 
					nonSelectedTargetRed + nonSelectedTargetGreen + nonSelectedTargetBlue))
		colorChanger = setTimeout(increaseColor, INTERVAL_);
	
} //end increaseColor()


//=====================================================================================
function setDivGlow()
{	
	for(var index = 0; index < (selection_.length); index++)
	{
		var div = document.getElementById(selection_[index]);
		if(index < (selection_.length-1))
		{
			div.style.boxShadow = "0px 0px 64px 20px rgba(" + nonSelectedRed + 
					"," + nonSelectedGreen + "," + nonSelectedBlue + ",1)";
			div.style.webkitBoxShadow = "0px 0px 64px 20px rgba(" + nonSelectedRed +
					"," + nonSelectedGreen + "," + nonSelectedBlue + ",1)";
			div.style.mozBoxShadow = "0px 0px 64px 20px rgba(" + nonSelectedRed + 
					"," + nonSelectedGreen + "," + nonSelectedBlue + ",1)";
		}
		else
		{
			div.style.boxShadow = "0px 0px 64px 20px rgba(" + selectedRed + 
					"," + selectedGreen + "," + selectedBlue + ",1)";
			div.style.webkitBoxShadow = "0px 0px 64px 20px rgba(" + selectedRed + 
					"," + selectedGreen + "," + selectedBlue + ",1)";
			div.style.mozBoxShadow = "0px 0px 64px 20px rgba(" + selectedRed + 
					"," + selectedGreen + "," + selectedBlue + ",1)";	
		}
	}
	
} //end setDivGlow()


//=====================================================================================
function showVisualSelection()
{

	
	state_.innerHTML = "&nbsp";

	//set selected to green
	colorFade('green', 'selected');
	//set selected to green
	colorFade('red', 'notSelected');

} //end showVisualSelection()


//=====================================================================================
function confirm(description)
{
	var randomNumber = Math.floor(Math.random() * 99999999);
	if(prompt("Are you sure? "+ description + " Type " + 
			randomNumber + " to continue:") == randomNumber)
	{
		if(prompt("I know exactly what I'm doing. Type 'I Do':") == "I Do")
		{
			setSecurity('ResetSecurityUserData');
		}
		else
			alert("You did not type 'I Do.' Mission aborted!");
	}
	else
		alert("You did not type the correct number. Mission aborted!");
} //end confirm()

//=====================================================================================
function setSecurity(id)
{
	
	if(id == 'NoSecurity')
	{
		console.log("No Security selected.")
		selectedSecurityChoice_ = 'NoSecurity';
	}
	else if(id == 'DigestAccessAuthentication')
	{
		console.log("Digest Access Authentication selcted.")
		selectedSecurityChoice_= 'DigestAccessAuthentication';
	}
	else if(id == 'Kerberos')
	{
		console.log("Kerberos selected.")
		selectedSecurityChoice_= 'Kerberos';
	}
	else if(id == 'ResetSecurityUserData')
	{
		console.log("Reset Data selected.")
		selectedSecurityChoice_= 'ResetSecurityUserData';
	}
	else{
		console.log("Selection not recognized!");
		return;
	}
	
	
	var serverRequest = "selection=" + selectedSecurityChoice_;
	console.log(serverRequest);
	makeServerRequest(serverRequest);
} //end setSecurity()


//=====================================================================================
function makeServerRequest(data)
{
	DesktopContent.XMLHttpRequest("editSecurity", data, editSecurityHandler, 
			undefined /*reqParam*/, 
			undefined /*progressHandler*/,
			true /*callHandlerOnErr*/);
	
} //end makeServerRequest()


//=====================================================================================
function restructure()
{

	for(var index = 0; index < IDs_.length; index++)
	{
		if(selectedSecurityChoice_ != "")
		{
			if(selectedSecurityChoice_ != IDs_[index])
				selection_[index] = IDs_[index];	
		}	
	}
	if(selectedSecurityChoice_ != "")
		selection_[selection_.length] = selectedSecurityChoice_;
	
} //end restructure()


//=====================================================================================
//Note: not an xml response, just text
function editSecurityHandler(req)
{
	
	if(!req || !req.responseText.length || 
			req.responseText.indexOf("Error") >= 0)
	{
		Debug.log("Action Failed. Invalid Verify Code!", Debug.HIGH_PRIORITY);
		selectedSecurityChoice_ = "NoSecurity"; //default to NoSecurity
		showVisualSelection();
		return;
	}

	console.log("req.responseText",req.responseText);
	
	if(selectedSecurityChoice_ == "DigestAccessAuthentication")
		Debug.log("<b>Digest Access Authentication</b> was enabled successfully!" + 
				"\n\n NOTE: If this is the first time you are enabling users and passwords, " +
				"then you must get the <b>New Account Code (NAC)</b> for the admin account from " +
				"the Edit User Accounts window (in User Settings folder of wiz mode) or " +
				"the printouts in normal mode. In verbose mode ('ots -v'), the admin <b>New Account Code (NAC)</b> will be in the linux console; " +
				"otherwise ('ots'), the admin <b>NAC</b> can be retrieved in the Gateway log file. " +
				"\n\nAfter the admin account has been setup, new accounts can be made and " +
				"the admin account will have access to the New Account Codes in the settings " +
				"web GUI.", 
				Debug.INFO_PRIORITY);
	else if(selectedSecurityChoice_ == "NoSecurity")
		Debug.log("Security was disabled successfully! " +
				"\n\nNow anyone with the ots normal mode URL will have admin privileges.", 
				Debug.INFO_PRIORITY);
	
	selectedSecurityChoice_ = req.responseText; 
	console.log(selectedSecurityChoice_);
	showVisualSelection();
	
} //end editSecurityHandler()



