//=====================================================================================
//
//	Created Dec, 2012
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	DesktopLogin.js
//
//	This is the desktop code for the user interface for ots. ots is the DAQ
// 		and control software for the Fermi Strips Telescope.
//
//	The desktop consists of a dashboard and an arbitrary amount of windows and a login
//
//=====================================================================================





if (typeof Debug == 'undefined')
	console.log('ERROR: Debug is undefined! Must include Debug.js before Desktop.js');

if (typeof Desktop == 'undefined')
	console.log('ERROR: Desktop is undefined! Must include Desktop.js before DesktopLogin.js');
else {

	////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////
	//define Desktop.login to return dashboard class
	////////////////////////////////////////////////////////////////////
	////////////////////////////////////////////////////////////////////
	Desktop.login = function() {
		if(false === (this instanceof Desktop.login)) {
			//here to correct if called as "var v = Desktop.login();"
			//	instead of "var v = new Desktop.login();"
			return new Desktop.login();
		}

		//------------------------------------------------------------------
		//create private members variables ----------------------
		//------------------------------------------------------------------

		var _DEFAULT_SESSION_STRING_LEN = 512;
		var _DEFAULT_COOKIE_STRING_LEN = 512;
		var _DEFAULT_COOKIE_DURATION_DAYS = 1;
		var _DEFAULT_REMEMBER_ME_DURATION_DAYS = 30;
		var _DEFAULT_PASSWORD_MIN_LEN = 4;
		var _DEFAULT_PASSWORD_MAX_LEN = 50;
		var _DEFAULT_USER_MIN_LEN = 3;
		var _DEFAULT_USER_MAX_LEN = 50;

		var _cookieCodeStr = "otsCookieCode";
		var _cookieUserStr = "otsCookieUser";
		var _cookieRememberMeStr = "otsRememberMeUser";
		var _BLACKOUT_COOKIE_STR = "TEMPORARY_SYSTEM_BLACKOUT";
		var _system_blackout = undefined;
		var _user = "";
		var _displayName = "No-Login";
		var _otsOwner = "";
		var _permissions = 0;
		var _cookieCode = 0;
		var _cookieTime = 0;
		var _sessionId = 0;
		var _uid = 0;
		var _badSessionIdCount = 0;

		var _areLoginInputsValid = false;
		var _killLogoutInfiniteLoop = false;
		var _keepFeedbackText = false;
		var _keptFeedbackText = "";

		var _loginDiv;

		//user preferences
		var _userPref_bgColor, _userPref_dbColor, _userPref_winColor, _userPref_layout, _sysPref_layout;
		var _userPref_aliaslayout, _sysPref_aliaslayout;
		var _applyUserPreferences;
		var _updateCurrentLayoutTimeout = 0;
		var _UPDATE_LAYOUT_TIMEOUT_PERIOD = 2000; //give time for user to stop making changes, in ms

		//------------------------------------------------------------------
		//create public members variables ----------------------
		//------------------------------------------------------------------

		this.loginDiv;

		//------------------------------------------------------------------
		//create PRIVATE members functions ----------------------
		//------------------------------------------------------------------

		//==============================================================================
		//_closeLoginPrompt
		//		pass isLoginSuccess=true if called upon successful login!
		//		if true refresh user display name and desktop icons will be created
		var _closeLoginPrompt = function(isLoginSuccess)
		{

			//remove Login
			var ldiv = document.getElementById("Desktop-loginDiv");
			if(ldiv)
			{ //should not be any login div so delete

				Debug.log("found login div and deleted",Debug.LOW_PRIORITY);
				ldiv.parentNode.removeChild(ldiv);
			}

			if(isLoginSuccess)
			{

				//update display name
				ldiv = document.getElementById("DesktopDashboard-user-displayName");
				let otsAndFolder = "ots" +
					(Desktop.desktop.icons.getFolderFocus()?" - " + Desktop.desktop.icons.getFolderFocus():"");
				let otsAndFolderShort;
				if(otsAndFolder.length > 20)
					otsAndFolderShort = otsAndFolder.substring(0,17) + "...";
				else
					otsAndFolderShort = otsAndFolder;

				var tmpStr = "Welcome to " + _otsOwner + otsAndFolderShort + ", " + _displayName;

				if(ldiv.innerText != "" && //if not first time
						ldiv.innerText.indexOf(otsAndFolder + ", " + _displayName) < 0) //and name is different
				{
					//if _display name is different then close all windows!
					Debug.log("Desktop.desktop.closeAllWindows() for new user",Debug.LOW_PRIORITY);
					Desktop.desktop.closeAllWindows();
				}
				ldiv.innerHTML = tmpStr;
				ldiv.title = "Welcome to " + _otsOwner + otsAndFolder + ", " + _displayName;;

				//reset desktop based on user's permissions
				Desktop.desktop.resetDesktop(_permissions);
			}
		} // end _closeLoginPrompt()

		//==============================================================================
		//_loginPrompt --
		// 		this function brings up login welcome screen
		// 		and logs out. This should be called on manual
		// 		"logout" also.
		var _loginPrompt = function()
		{
			Debug.log("loginPrompt " + _keepFeedbackText,Debug.LOW_PRIORITY);

			if(_attemptedCookieCheck)
				_deleteCookies(); //local logout/reset

			//if login screen already displayed then do nothing more
			if(document.getElementById("Desktop-loginDiv"))
			{
				Debug.log("Login screen already up.");
				if(_keepFeedbackText)
				{
					document.getElementById("loginFeedbackDiv").innerHTML = _keptFeedbackText;
					_keepFeedbackText = false;
				}
				return;
			}

			//refresh screen to nothing and then draw login
			_closeLoginPrompt();

			var ldiv;
			//create prompt functionality
			ldiv = document.createElement("div");
			ldiv.setAttribute("id", "Desktop-loginDiv"); //this div holds everything else and is what is deleted at start
			ldiv.style.width = Desktop.desktop.getDesktopWidth() + "px";
			ldiv.style.height = Desktop.desktop.getDesktopHeight() + "px";

				//create table just to center content easily, especially on window resize
			var str;
			str = "<table width='100%' height='100%'><td valign='middle' align='center'>";
			str += "<b><u>Welcome to " + _otsOwner + "ots!</u></b><br /><br />";
			str += "<table><td align='right'><div id='Desktop-loginContent'></div></td></table></td></table>";
			ldiv.innerHTML = str;

			//reset pointer (seems to get lost somehow)
			Desktop.desktop.login.loginDiv = _loginDiv = document.getElementById("DesktopLoginDiv");

			if(!_loginDiv)
			{
				return; //abandon, no login element being displayed
			}

			_loginDiv.appendChild(ldiv); //add centering elements to page

			//now have centered in page div as ldiv
			ldiv = document.getElementById("Desktop-loginContent");
			if(!ldiv) //should never happen?
			{
				Debug.log("ldiv has no parent!");
				return;
			}

			str = "";
			var rememberMeName = _getCookie(_cookieRememberMeStr); //if remember me cookie exists, then use saved name assume remember me checked
			str += "Username: <input id='loginInput0' type='email' spellcheck='false' value='" +
				(rememberMeName?rememberMeName:"") + "'/>";
			str += "<br />";
			str += "<div id='loginInputRememberMeDiv'>" +
					"<div style='float:left; margin: -5px 0 0 89px;'><input type='checkbox' id='loginInputRememberMe' " +
					(rememberMeName?"checked":"") + " /></div>" +
					"<div style='float: left; margin: -7px -50px 0px 6px;'><a href='#' onclick='var el=document.getElementById(\"loginInputRememberMe\"); el.checked = !el.checked;'>Remember me</a></div></div>";
			str += "Password: <input id='loginInput1' type='password' /><br />";
			str += "<div id='loginRetypeDiv' style='display:none' >Re-type Password: <input id='loginInput2' type='password' /><br /></div>";
			str += "<div id='newAccountCodeDiv' style='display:none' >New Account Code: <input id='loginInput3' type='text' /><br /></div>";
			str += "<a target='_blank' href='" +
				"https://cdcvs.fnal.gov/redmine/projects/otsdaq/wiki/Otsdaq_User_Manual" + //https://docs.google.com/document/d/1Mw4HByYfLo1bO5Hy9npDWkD4CFxa9xNsYZ5pJ7qwaTM/edit?usp=sharing" +
				"' title='Click to open Help documentation' ><img src='/WebPath/images/dashboardImages/icon-Help.png' onerror='this.style.display=\"none\";'></a>";
			str += "<a href='#' onmouseup='Desktop.desktop.login.promptNewUser(this); return false;' style='margin:0 100px 0 50px'>New User?</a>";
			str += "<input type='submit' class='DesktopDashboard-button' value='    Login    ' onmouseup='Desktop.desktop.login.attemptLogin();' /><br />"

			str += "<div id='loginFeedbackDiv'>" + (_keepFeedbackText?_keptFeedbackText:"") + "</div>";
			_keepFeedbackText = false;

			if(!window.chrome)
				str += "<a href='http://www.google.com/chrome'>Note: ots works best in the Chrome web browser.</a>";
			ldiv.innerHTML = str; //add login forms to page

				//if rememberMe then set password as focus
				//else set user name as focus,
				//and capture enter button in the text fields
			if(rememberMeName)
				document.getElementById('loginInput1').focus();
			else
				document.getElementById('loginInput0').focus();

			for(var i=0;i<4;++i)
			{
				document.getElementById('loginInput'+i).onkeydown =
						function(e)
						{
					if(e.keyCode == 13) Desktop.desktop.login.attemptLogin(); //if enter, login
					else if(e.keyCode == 9)
					{		//if tab focus on next box
						var newFocusIndex = parseInt(this.id[this.id.length-1])+(e.shiftKey?-1:1);
						if(newFocusIndex != 0 && newFocusIndex != 1 &&
								document.getElementById('loginRetypeDiv').style.display == "none") //skip 2nd input if not displayed
							newFocusIndex += e.shiftKey?2:-2; //take 2 steps back (from 1 step forward)
						newFocusIndex = (newFocusIndex + 4)%4;
						document.getElementById('loginInput'+newFocusIndex).focus();
					}
					else if((e.keyCode >= 48 && e.keyCode <= 57) || //accept numbers and shifted numbers
						(e.keyCode >= 96 && e.keyCode <= 105) ||	//accept keypad numbers
						(e.keyCode >= 65 && e.keyCode <= 90) || //accept letters and shifted letters
						e.keyCode == 46 || e.keyCode == 8 || //delete, backspace
						e.keyCode == 35 || e.keyCode == 36 ||  //home and end
						(e.keyCode >= 37 && e.keyCode <= 40)) { //arrows are accepted
						return true;
					}
					return false; //to stop tab and enter (and unaccepted chars) from propagating to window
				};

				document.getElementById('loginInput'+i).onkeyup = _checkLoginInputs;
			}
		} //end _loginPrompt()

		//==============================================================================
		//_checkLoginInputs --
		//		verify that the three inputs are valid when creating an account
		// 		if not creating account, let LoginAttempt validate
		var _checkLoginInputs = function()
		{

			var x = [];
			for(var i=0;i<3;++i) x[i] = document.getElementById('loginInput'+i).value;

			document.getElementById('loginFeedbackDiv').style.color = ""; //reset color to default inherited style
			if(document.getElementById('loginRetypeDiv').style.display != "none")
			{ //3 input case, so check

				_areLoginInputsValid = false; //assume invalid

				if(x[1] != x[2])
				{
					document.getElementById('loginFeedbackDiv').innerHTML = "Passwords do not match";
					return;
				}
				else if(x[1].length < _DEFAULT_PASSWORD_MIN_LEN)
				{
					document.getElementById('loginFeedbackDiv').innerHTML = "Passwords must be at least " + _DEFAULT_PASSWORD_MIN_LEN + " characters";
					return;
				}
				else if(x[1].length > _DEFAULT_PASSWORD_MAX_LEN)
				{
					document.getElementById('loginFeedbackDiv').innerHTML = "Passwords must be at most " + _DEFAULT_PASSWORD_MAX_LEN + " characters";
					return;
				}
				else if(x[0].length < _DEFAULT_USER_MIN_LEN)
				{
					document.getElementById('loginFeedbackDiv').innerHTML = "User name must be at least " + _DEFAULT_USER_MIN_LEN + " characters";
					return;
				}
				else if(x[0].length > _DEFAULT_USER_MAX_LEN)
				{
					document.getElementById('loginFeedbackDiv').innerHTML = "User name must be at most " + _DEFAULT_USER_MAX_LEN + " characters";
					return;
				}
				//else logins valid!

				_areLoginInputsValid = true;
				document.getElementById('loginFeedbackDiv').innerHTML = "Passwords are valid!";
				document.getElementById('loginFeedbackDiv').style.color = "RGB(100,255,150)";
			}

		} //end _checkLoginInputs()

		//==============================================================================
		//_setCookie --
		// 		use this as only method for refreshing and setting login cookie!!
		//		sets 2 cookies, cookieCode to code and userName to _user
		var _setCookie = function(code)
		{

			if(code == _BLACKOUT_COOKIE_STR)
			{
				Debug.log("maintaining cookie code = " + _cookieCode);

				//var exdate = new Date();
				//exdate.setDate(exdate.getDate() + _DEFAULT_COOKIE_DURATION_DAYS);
				//var c_value;
				//c_value = escape(code) + ((_DEFAULT_COOKIE_DURATION_DAYS==null) ? "" : "; expires="+exdate.toUTCString());
				//document.cookie= _cookieCodeStr + "=" + c_value;
				localStorage.setItem(_cookieCodeStr, code);

				return;
			}

			if(_user == "" || !code.length || code.length < 2) return; //only refresh/set cookies if valid user and cookie code
			if(!_system_blackout && _cookieCode == code) return; //unchanged do nothing (unless coming out of blackout)

			_cookieCode = code;	//set local cookie code values
			//var exdate = new Date();
			//exdate.setDate(exdate.getDate() + _DEFAULT_COOKIE_DURATION_DAYS);
			//var c_value;
			//c_value = escape(code) + ((_DEFAULT_COOKIE_DURATION_DAYS==null) ? "" : "; expires="+exdate.toUTCString());
			//document.cookie= _cookieCodeStr + "=" + c_value;
			localStorage.setItem(_cookieCodeStr, code);
			//c_value = escape(_user) + ((_DEFAULT_COOKIE_DURATION_DAYS==null) ? "" : "; expires="+exdate.toUTCString());
			//document.cookie= _cookieUserStr + "=" + c_value;
                        localStorage.setItem(_cookieUserStr, _user);

			//Debug.log("set cookie");
			//var ccdiv = document.getElementById("DesktopContent-cookieCodeMailbox");
			//ccdiv.innerHTML = _cookieCode; //place in mailbox for desktop content
			//ccdiv = document.getElementById("DesktopContent-updateTimeMailbox");
			//ccdiv.innerHTML = (new Date()).getTime(); //set last time of cookieCode update
			_cookieTime = (new Date()).getTime();//parseInt(ccdiv.innerHTML);
		} //end _setCookie()

		//==============================================================================
		//_getCookie --
			// get login cookie
		var _getCookie = function(c_name)
		{
			//var i,x,y,ARRcookies=document.cookie.split(";");
			//for (i=0;i<ARRcookies.length;i++)
			//{
			//	x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
			//	y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
			//	x=x.replace(/^\s+|\s+$/g,"");
			//	if (x==c_name)
			//	{
			//		return unescape(y);
			//	}
			//}
			return localStorage.getItem(c_name);
		} //end _getCookie()

		//==============================================================================
		//_deleteCookies --
		// 		delete login cookies, effectively logout
		var _deleteCookies = function()
		{
			_cookieCode = 0;
			Debug.log("Delete cookies",Debug.LOW_PRIORITY);
			localStorage.removeItem(_cookieCodeStr);
			localStorage.removeItem(_cookieUserStr);
                        // legacy, just in case
			var c_value;
			c_value = "; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
			document.cookie= _cookieCodeStr + "=" + c_value;
			c_value = "; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
			document.cookie= _cookieUserStr + "=" + c_value;
		} //end _deleteCookies()

		//==============================================================================
		//_getUniqueUserId --
			//generate a unique user ID (UUID)
		var _getUniqueUserId = function()
		{
			return '4xxx'.replace(/[x]/g, function(c)
					{
				var r = Math.random()*16|0, v = r;
				return v.toString(16);
			});
		} //end _getUniqueUserId()

		//==============================================================================
		//_checkCookieLogin --
			// Can only be called if sessionId is already set
			// if cookie, check with server that it is valid
			// if no cookie open login prompt
		var _checkCookieLogin = function()
		{
			if(_sessionId.length != _DEFAULT_SESSION_STRING_LEN) return; //if no session id, fail

			var code = _getCookie(_cookieCodeStr);
			_user = _getCookie(_cookieUserStr);

			if ((code != null && code != "") &&
				(_user != null && _user != ""))
			{
				Debug.log("Attempting browser cookie login.");

				//if cookie found, submit cookieCode and jumbled user to server to check if valid
				Desktop.XMLHttpRequest("LoginRequest?RequestType=checkCookie",
						"uuid="+_uid+"&ju="+_jumble(_user,_sessionId)+"&cc="+code,
						_handleCookieCheck);
			}
			else
			{
				Debug.log("No cookie found (" + code + ")",Debug.LOW_PRIORITY);

				//attempt CERT login
				if(!_attemptedLoginWithCert)
				{
					Debug.log("Attempting CERT login.");
					_attemptLoginWithCert();
				}
				else
					_loginPrompt();		//no cookie, so prompt user
			}
		} //end _checkCookieLogin()

		//==============================================================================
		//_handleLoginAttempt --
			// handler for login request from server
			// current cookie code and display name is returned on success
			// on failure, go to loginPrompt
		var _handleLoginAttempt = function(req)
		{
			Debug.log("Received login attempt back",Debug.LOW_PRIORITY);

			var error = Desktop.getXMLValue(req,"Error");
			if(error && error != "")
			{
				Debug.err(error);
				return;
			}

			var cookieCode = Desktop.getXMLValue(req,"CookieCode");
			_displayName = Desktop.getXMLValue(req,"DisplayName");

			_otsOwner = Desktop.getXMLValue(req,"ots_owner");
			if(!_otsOwner || _otsOwner.length < 2)
				_otsOwner = "";
			else if(_otsOwner[_otsOwner.length-1] != ' ') //enforce space at end
				_otsOwner += ' ';
			Debug.log("_otsOwner = " + _otsOwner);

			if(Desktop.desktop.security == Desktop.SECURITY_TYPE_NONE)	//make user = display name if no login
				_user = Desktop.getXMLValue(req,"pref_username");
			_permissions = Desktop.getXMLValue(req,"desktop_user_permissions");
			if(cookieCode && _displayName && cookieCode.length == _DEFAULT_COOKIE_STRING_LEN)
			{
				//success!
				Debug.log("Login Successful!",Debug.LOW_PRIORITY);
				_setCookie(cookieCode); //update cookie
				_applyUserPreferences(req);

				// Set user name if logged in using cert
				if (Desktop.getXMLValue(req, "pref_username"))
					_user = Desktop.getXMLValue(req, "pref_username");

				var activeSessionCount = parseInt(Desktop.getXMLValue(req,"user_active_session_count"));
				if(activeSessionCount && _loginDiv) //only if the login div exists
				{
					Debug.log("Found other active sessions: " + activeSessionCount,Debug.LOW_PRIORITY);
					_offerActiveSessionOptions(activeSessionCount);
				}
				else
					_closeLoginPrompt(1); //clear login prompt

				//success!

				//Note: only two places where login successful, in
				//	_handleCookieCheck() and in _handleLoginAttempt()
				DesktopContent._serverUrnLid = urnLid_;
				DesktopContent._serverOrigin = serverOrigin_;
				DesktopContent._cookieCodeMailbox = cookieCode; //init for tooltip call
				DesktopContent._needToLoginMailbox = false;
				DesktopContent._arrayOfFailedHandlers = []; // clear
				Desktop.desktopTooltip();

				_attemptedCookieCheck = false;
				_killLogoutInfiniteLoop = false;

				//notify all windows of login
				var reqObject = {
						"request":		"loginNotify",
						"cookieCode":	cookieCode
				};
				for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i)
				{
					reqObject["windowId"] = Desktop.desktop.getWindowByIndex(i).getWindowId();
					Desktop.desktop.getWindowByIndex(i).getFrame().contentWindow.postMessage(
							reqObject,"*");
				}

				Debug.log("Checking for any shortcut work from get parameters...");
				Desktop.desktop.actOnParameterAction();  //first time, _firstCheckOfMailboxes is true (then it will try again in checkMailboxes)

				return;
			} //end handle login success
			else
			{
				//login failed

				Debug.log("Login failed.");
				//Debug.log("Debug failure... " + cookieCode + " - " +
					//	_displayName + " - _attemptedLoginWithCert " +
						//_attemptedLoginWithCert,Debug.LOW_PRIORITY);

				//set and keep feedback text
				if(!_keepFeedbackText)
				{
					if(cookieCode == "1") //invalid uuid
					{
	//					_keptFeedbackText = "Sorry, your login session was invalid.<br>" +
	//						"A new session is being started - please try again.";

						//instead of giving error, attempt to get new session and relogin

						Debug.log("Attempting auto session renewal");

						//refresh session id
						_uid = _getUniqueUserId();
						Desktop.XMLHttpRequest("LoginRequest?RequestType=sessionId",
								"uuid="+_uid,
								//model handler after _handleGetSessionId()
								function(req)
								{

							_sessionId = 0; //clear
							if(!req || req.responseText.length != _DEFAULT_SESSION_STRING_LEN)
							{ //sessionId failed
								Debug.log("Invalid auto session ID",Debug.HIGH_PRIORITY);
								_keptFeedbackText = "Sorry, your login session was invalid.<br>" +
										"A new session is being started - please try again.";
								_loginPrompt();
								_killLogoutInfiniteLoop = true;
								return;
							}
							//else good sessionId

							Debug.log("Attempting auto re-login");

							_attemptedLoginWithCert = true; //do not attempt CERT again
							_badSessionIdCount = 0; //clear

							//successfully received session ID
							_sessionId = req.responseText;

							Desktop.desktop.login.attemptLogin();

								}); //end sessionId handler

						return;
					} //end handle invalid user id session
					else if(req && document.getElementById('loginInput3') &&
							document.getElementById('loginInput3').value != "")
						_keptFeedbackText = "New Account Code (or Username/Password) not valid.";
					else if(req)
					{
						var err = Desktop.getXMLValue(req,"Error");
						_keptFeedbackText = "Username/Password not correct." + (err?("<br>" + err):"");
					}
					else
						_keptFeedbackText = "ots Server failed.";

					_keepFeedbackText = true;

					if(_attemptedLoginWithCert)
					{
						Debug.log("Hiding feedback after CERT attempt.");
						_keepFeedbackText = false;
					}
				}

				for(var i=1;i<3;++i)
					if(document.getElementById('loginInput'+i))
						document.getElementById('loginInput'+i).value = ""; //clear input boxes

				//refresh session id
				_uid = _getUniqueUserId();
				Desktop.XMLHttpRequest("LoginRequest?RequestType=sessionId",
						"uuid="+_uid,
						_handleGetSessionId);

			} //end handle login failure

		} //end _handleLoginAttempt()

		//==============================================================================
		//_handleCookieCheck --
			// handler for cookie check request from server
			// current cookie code and display name is returned on success
			// on failure, go to loginPrompt
		var _attemptedCookieCheck = false;
		var _handleCookieCheck = function(req)
		{

			var cookieCode = Desktop.getXMLValue(req,"CookieCode");
			_displayName = Desktop.getXMLValue(req,"DisplayName");
			_permissions = Desktop.getXMLValue(req,"desktop_user_permissions");


			if(cookieCode && _displayName && cookieCode.length == _DEFAULT_COOKIE_STRING_LEN)
			{
				//success!

				Debug.log("Cookie is good!",Debug.LOW_PRIORITY);
				_setCookie(cookieCode); //update cookie
				_applyUserPreferences(req);
				_closeLoginPrompt(1); //clear login prompt

				//Note: only two places where login successful,
				//	in _handleCookieCheck() and in _handleLoginAttempt()
				DesktopContent._serverUrnLid = urnLid_;
				DesktopContent._serverOrigin = serverOrigin_;
				DesktopContent._cookieCodeMailbox = cookieCode; //init for tooltip call
				DesktopContent._needToLoginMailbox = false;
				DesktopContent._arrayOfFailedHandlers = []; // clear
				Desktop.desktopTooltip();

				_attemptedCookieCheck = false;
				_killLogoutInfiniteLoop = false;

				//notify all windows of login
				var reqObject = {
						"request":		"loginNotify",
						"cookieCode":	cookieCode
				};
				for(var i=0;i<Desktop.desktop.getNumberOfWindows();++i)
				{
					reqObject["windowId"] = Desktop.desktop.getWindowByIndex(i).getWindowId();
					Desktop.desktop.getWindowByIndex(i).getFrame().contentWindow.postMessage(
							reqObject,"*");
				}
				return;
			}
			else
			{
				Debug.log("Cookie is bad " + cookieCode.length + _displayName,Debug.LOW_PRIORITY);

				//attempt CERT login
				Debug.log("Attempting CERT login.");
				_attemptLoginWithCert();
				//_loginPrompt();		//no cookie, so prompt user
			}
		} //end _handleCookieCheck()

		//==============================================================================
		//_handleGetSessionId --
		//	handler called when session id is returned from server
		//	set _sessionId
		//	the chain is passed on to check cookie login from here
		var _handleGetSessionId = function(req)
		{
			_sessionId = 0; //clear

			if(!req || req.responseText.length != _DEFAULT_SESSION_STRING_LEN)
			{ //sessionId failed
				Debug.log("Invalid session ID");

				if(!req)
				{
					_loginPrompt();
					_killLogoutInfiniteLoop = true;
					return; //do nothing, because server failed
				}
				//try again
				_uid = _getUniqueUserId();

				Debug.log("UUID: " + _uid);
				++_badSessionIdCount;
				if (_badSessionIdCount < 10)
					Desktop.XMLHttpRequest("LoginRequest?RequestType=sessionId",
							"uuid="+_uid,
							_handleGetSessionId); //if disabled, then cookieCode will return 0 to desktop
				else
					Debug.err("Cannot establish session ID - failed 10 times");

				return;
			}
			_badSessionIdCount = 0; //clear

			//successfully received session ID
			_sessionId = req.responseText;

			//check if system blackout exists
			if(!_attemptedCookieCheck &&
					_getCookie(_cookieCodeStr) == _BLACKOUT_COOKIE_STR)
			{
				_loginPrompt();
				Debug.log("There is a system wide blackout! (Attempts to login right now may fail - likely someone is rebooting the system)", Debug.WARN_PRIORITY);
				return;
			}

			if(_attemptedCookieCheck)
			{
				Debug.log("Already tried browser cookie login. Giving up.");
				_loginPrompt();
				return;
			}
			_attemptedCookieCheck = true;

			Debug.log("Attempting browser cookie login with new session ID.");
			_checkCookieLogin();
			_killLogoutInfiniteLoop = false;
		} //end _handleGetSessionId()

		//==============================================================================
		//_offerActiveSessionOptions --
			// prompt user with option to close other sessions
		var _offerActiveSessionOptions = function(cnt) {

			ldiv = document.getElementById("Desktop-loginContent");
			if(!ldiv)
			{
				Debug.log("No login prompt, so not offering active session options.");
				_closeLoginPrompt(1); //clear login prompt
				return;
			}

			str = "";
			str += "<center>Warning! You currently have " + cnt + " other active session" + (cnt > 1?"s":"") + ".<br />";
			str += "<div id='loginFeedbackDiv'>You can opt to force logout the other session" + (cnt > 1?"s":"") + ", " +
				"or alternatively leave your other session" + (cnt > 1?"s":"") + " active and continue.</div><br />";
			str += "<input type='submit' class='DesktopDashboard-button' value=' Logout Other Sessions ' " +
				"onmouseup='Desktop.desktop.login.activeSessionLogoutOption();' />";
			str += "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
			str += "<input type='submit' class='DesktopDashboard-button' value=' Ignore and Continue ' " +
				"onmouseup='Desktop.desktop.login.activeSessionIgnoreOption();' /></center>";
			ldiv.innerHTML = str; //add login forms to page
		}

		//==============================================================================
		var _jumble = function (u,s) {
			if(s.length%2) return "";
			var x = [];
			var l = s.length/2;
			var ss = l;
			var p = 0;
			var c = parseInt(s[p*2]+s[p*2+1],16);
			for(var i=0;i<l;++i) x[i] = 0;
			var i = 0,h;
			var s0 = s[p*2],s1 = s[p*2+1];
			while(l > 0) {
				p = (p + parseInt(s0+s1,16)) % ss;
				while(x[p]) p = (p+1) % ss;
				x[p] = 1; s0 = s[p*2]; s1 = s[p*2+1];
				c = (c + parseInt(s[p*2]+s[p*2+1],16) + parseInt((i==0)?u.length:u.charCodeAt(i-1))) % ss;
				h = c.toString(16); if(h.length == 1) h = "0" + h;
				s = s.substr(0,p*2) + h + s.substr(p*2+2,s.length-p*2-2);
				--l; if(i==u.length) i = 1; else ++i;
			}
			return s;
		}

		//==============================================================================
		var _saveUsernameCookie = function () {
			Debug.log("Desktop _saveUsernameCookie _user " + _user);
			//var exdate = new Date();
			//exdate.setDate(exdate.getDate() + _DEFAULT_REMEMBER_ME_DURATION_DAYS);
			//var c_value;
			//c_value = escape(_user) + ((_DEFAULT_REMEMBER_ME_DURATION_DAYS==null) ? "" : "; expires="+exdate.toUTCString());
			//document.cookie= _cookieRememberMeStr + "=" + c_value;
			localStorage.setItem(_cookieRememberMeStr, _user);
		}

		//==============================================================================
		var _deleteUsernameCookie = function () {
			Debug.log("Desktop _deleteUsernameCookie _user " + _user);
			localStorage.removeItem(_cookieRememberMeStr);
			// legcacy, just in case
			var c_value;
			c_value = "; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
			document.cookie= _cookieRememberMeStr + "=" + c_value;
		}

		//==============================================================================
		//_updateLayoutTimeoutHandler
		//	updates all user preference settings (since that is the only method)
		//	just to update the current window layout for user.
		//
		//	Note: this is very similar to what happens in UserSettings.html/setServerSettings()
		//		They should be changed together.
		var _updateLayoutTimeoutHandler = function() {
			Debug.log("Desktop login _updateLayoutTimeoutHandler");

			var data = "";

			////////////////////////
			//colors
			var colorFields = ["bgcolor","dbcolor","wincolor"];
			var colorPrefVals = [_userPref_bgColor,_userPref_dbColor,_userPref_winColor];
			for(var j=0;j<3;++j)
				data += colorFields[j] + "=" + colorPrefVals[j] + "&";

			////////////////////////
			//layout with updated current layout
			var layoutArray = _userPref_layout.split(";"); //get user layout array
			layoutArray[layoutArray.length-1] = Desktop.desktop.getWindowLayoutStr(); //update extra layout for most recent layout checkpoint

			var layoutStr = "";
			for(var j=0;j<layoutArray.length;++j)
				layoutStr += layoutArray[j] + (j==layoutArray.length-1?"":";");
			data += "layout=" + layoutStr + "&";

			////////////////////////
			//system layout
			layoutArray = _sysPref_layout.split(";");

			layoutStr = "";
			for(var j=0;j<layoutArray.length;++j)
				layoutStr += layoutArray[j] + (j==layoutArray.length-1?"":";");
			data += "syslayout=" + layoutStr + "&";


			////////////////////////
			//send save req
			Debug.log("Desktop Login Settings Save Preferences -- " + data);
			Desktop.XMLHttpRequest("Request?RequestType=setSettings", data);
		}

		//------------------------------------------------------------------
		//create PUBLIC members functions ----------------------
		//------------------------------------------------------------------

		//==============================================================================
		//logout ~
		//	Public logout function. Logs out at server and locally.
		this.logout = function()
		{
			Debug.log("Desktop Logout occured " + _killLogoutInfiniteLoop,Debug.MED_PRIORITY);

			if(_cookieCode && !_killLogoutInfiniteLoop)
				Desktop.XMLHttpRequest("LoginRequest?RequestType=logout"); //server logout
			_deleteCookies(); //local logout

			_keepFeedbackText = true;
			_keptFeedbackText = "You were logged out.";

			//start new session
			if(!_killLogoutInfiniteLoop)
			{
				_uid = _getUniqueUserId();
				Desktop.XMLHttpRequest("LoginRequest?RequestType=sessionId",
					"uuid="+_uid,
					_handleGetSessionId);
				Debug.log("UUID: " + _uid)
			}

			_killLogoutInfiniteLoop = false;  //prevent infinite logout requests, on server failure
			//document.getElementById("Desktop-loginContent")?
			//		false:true; //prevent infinite logout requests, on server failure
		} //end logout()


		//==============================================================================
		//blackout ~
		//	use to blackout all open sessions in the same browser
		//	during known periods of server unavailability
		this.blackout = function(setVal)
		{
			setVal = setVal?true:false;
			if(_system_blackout !== undefined &&
					setVal == _system_blackout)
				return; // do nothing if already setup with value

			if(setVal) //start blackout
			{
				_setCookie(_BLACKOUT_COOKIE_STR);
			}
			else if(_cookieCode) //remove blackout and replace with cookie code
			{
				_setCookie(_cookieCode);
			}
			else //remove blackout if no cookie code
				localStorage.removeItem(_cookieCodeStr);

			_system_blackout = setVal;
			Debug.log("Login blackout " + _system_blackout);
		} //end blackout()

		//==============================================================================
		//isBlackout ~
		//	use to check for existing system blackout from exernal sources
		this.getSystemBlackout = function() { return _system_blackout; }
		this.isBlackout = function()
		{
			if(_system_blackout) return true;

			var cc = _getCookie(_cookieCodeStr);
			if(!cc) return false; //may be undefined
			//Debug.log("Checking for blackout signal = " + cc.substr(0,10));
			return (cc == _BLACKOUT_COOKIE_STR);
		} //end isBlackout()

		//==============================================================================
		//getCookieCode --
		// The public getCookieCode function does not actually check the cookie
		// it is the server which controls if a cookieCode is still valid.
		// This function just refreshes the cookie and returns the local cookieCode value.
		// Note: should only refresh from user activity, not auto
		this.getCookieCode = function(doNotRefresh)
		{
			if(!doNotRefresh)
			{
				if(this.isBlackout())
				{
					Debug.log("Found an external blackout signal.");
					return;
				}

				_setCookie(_cookieCode); //refresh cookies
			}
			return _cookieCode;
		} //end getCookieCode()

		//==============================================================================
		this.updateCookieFromContent = function(newCC, newTime)
		{
			_cookieTime = newTime; //set immediately so timer doesn't trip same issue
			//var ccdiv = Desktop.desktop.cookieCodeMailbox;//document.getElementById("DesktopContent-cookieCodeMailbox");
			_setCookie(newCC);
		} //end updateCookieFromContent()

		//==============================================================================
		this.getCookieTime = function() {return _cookieTime;}
		this.getUserDisplayName = function() {return _displayName;}
		this.getUsername = function() {return _user;}

		//==============================================================================
		this.redrawLogin = function()
		{
			var ldiv = document.getElementById("Desktop-loginDiv");
			if(!ldiv) return;

			ldiv.style.width = Desktop.desktop.getDesktopWidth() + "px";
			ldiv.style.height = Desktop.desktop.getDesktopHeight() + "px";
		} //end redrawLogin()

		//==============================================================================
		//toggle re-type password for new user
		this.promptNewUser = function(linkObj)
		{
			document.getElementById('loginFeedbackDiv').innerHTML = ""; //clear feedback text
			Debug.log("Desktop Login Prompt New User", Debug.LOW_PRIORITY);
			document.getElementById('loginRetypeDiv').style.display =
				document.getElementById('loginRetypeDiv').style.display == "none"?"inline":"none";
			document.getElementById('newAccountCodeDiv').style.display =
				document.getElementById('newAccountCodeDiv').style.display == "none"?"inline":"none";

			for(var i=1;i<4;++i) document.getElementById('loginInput'+i).value = ""; //clear input boxes

			linkObj.innerHTML = document.getElementById('loginRetypeDiv').style.display == "none"?"New User?":"Have an Account?";
		} //end promptNewUser()

		//==============================================================================
		this.attemptLogin = function()
		{
			Debug.log("Desktop Login Prompt Attempt Login", Debug.LOW_PRIORITY);
			_attemptedLoginWithCert = false;

			if(Desktop.desktop.login.isBlackout())
			{
				Debug.log("stopSystemBlackout - assume user expects system to be back");
				Desktop.desktop.login.blackout(false);
			}

			var x = [];
			for(var i=0;i<3;++i)
				x[i] = document.getElementById('loginInput'+i).value;

			if(document.getElementById('loginRetypeDiv').style.display != "none" && !_areLoginInputsValid)
			{
				Debug.log("Invalid Inputs on new login attempt", Debug.LOW_PRIORITY);
				return;
			}

			document.getElementById('loginFeedbackDiv').innerHTML = ""; //clear feedback text
			document.getElementById('loginFeedbackDiv').style.color = ""; //reset color to default inherited style

			if(x[0] == "" || x[1] == "")
			{
				_keptFeedbackText = "Some login fields were left empty.";
				return;
			}
			_user = x[0]; //set local user

			//if remember me checked, refresh cookie.. else delete whatever is there
			if(document.getElementById('loginInputRememberMe').checked)
				_saveUsernameCookie();
			else
				_deleteUsernameCookie();

			Desktop.XMLHttpRequest("LoginRequest?RequestType=login",
					"uuid="+_uid+"&nac="+document.getElementById('loginInput3').value
					+"&ju="+_jumble(x[0],_sessionId)+"&jp="+_jumble(x[1],_sessionId),
					_handleLoginAttempt);
		} //end attemptLogin()

		//==============================================================================
		function getParameterByName(name, url)
		{
			if (!url) url = window.location.href;
			name = name.replace(/[\[\]]/g, "\\$&");
			var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
				results = regex.exec(url);
			if (!results) return null;
			if (!results[2]) return '';
			return decodeURIComponent(results[2].replace(/\+/g, " "));
		}

		//==============================================================================
		var _attemptedLoginWithCert = false;
		var _attemptLoginWithCert = function () {
			Debug.log("Desktop Login Certificate Attempt Login ", Debug.LOW_PRIORITY);

			_attemptedLoginWithCert = true; //mark flag so that now error is displayed in login prompt for CERT failure
			Desktop.XMLHttpRequest("LoginRequest?RequestType=cert", "uuid=" + _uid, _handleLoginAttempt);
		}

		//==============================================================================
		//_applyUserPreferences
		//	apply user preferences based on req if provided
		//		window color should always have alpha of 0.9
		_applyUserPreferences = this.applyUserPreferences = function(req) {

			if (typeof req != 'undefined') {
					//update user pref if req is defined as xml doc
				_userPref_bgColor 	= Desktop.getXMLValue(req,"pref_bgcolor");
				_userPref_dbColor 	= Desktop.getXMLValue(req,"pref_dbcolor");
				_userPref_winColor 	= Desktop.getXMLValue(req,"pref_wincolor");
				_userPref_layout 	= Desktop.getXMLValue(req,"pref_layout");
				_sysPref_layout 	= Desktop.getXMLValue(req,"pref_syslayout");
				_userPref_aliaslayout = Desktop.getXMLValue(req,"pref_aliaslayout");
				_sysPref_aliaslayout = Desktop.getXMLValue(req,"pref_sysalias_layout");
			}

			Desktop.desktop.dashboard.setDefaultDashboardColor(_userPref_dbColor);
			Desktop.desktop.setDefaultWindowColor(_userPref_winColor);
			document.body.style.backgroundColor = _userPref_bgColor;
		}

		//==============================================================================
		//resetCurrentLayoutUpdateTimer
		//	called by DesktopWindow.js any time a window moves
		//	the timeout allows for maintaining the current layout for the user
		//
		// NOTE: This was disabled!! Because what is the point of saving current layout
		//	when users may have multiple logins/multiple instances of the desktop/multiple tabs
		this.resetCurrentLayoutUpdateTimer = function() {
			return; //DISABLE THIS FEATURE

			//Debug.log("Desktop login resetCurrentLayoutUpdateTimer")e;
			if(_updateCurrentLayoutTimeout)
				clearTimeout(_updateCurrentLayoutTimeout);
			_updateCurrentLayoutTimeout = setTimeout(_updateLayoutTimeoutHandler,_UPDATE_LAYOUT_TIMEOUT_PERIOD);
		}

		//==============================================================================
		this.getUserDefaultLayout = function(i) { return _userPref_layout.split(";")[i]; }
		this.getSystemDefaultLayout = function(i) { return _sysPref_layout.split(";")[i]; }

		//==============================================================================
		this.activeSessionLogoutOption = function()
		{
			Debug.log("Desktop login activeSessionLogoutOption");
			Desktop.XMLHttpRequest("LoginRequest?RequestType=logout","LogoutOthers=1"); //server logout of other active sessions
			_closeLoginPrompt(1); //clear login prompt - pass 1 just so it will check new username

		} //end activeSessionLogoutOption()

		//==============================================================================
		this.activeSessionIgnoreOption = function()
		{
			Debug.log("Desktop activeSessionIgnoreOption");
			_closeLoginPrompt(1); //clear login prompt - pass 1 just so it will check new username
		} //end activeSessionIgnoreOption()

		//------------------------------------------------------------------
		//handle class construction ----------------------
		//------------------------------------------------------------------



		//initially
			//submit unique uid and get session ID from server using GetSessionId request
			//check cookie to see if still valid
				//send isStillActive request to server to see if CookieCode is still valid
			//if no valid cookie, prompt user
				//user can login or (if first time) set password
				//user and jumbled password sent to server for login
			//if login successful, loginDiv is removed from desktop and cookieCode used by client

		//==============================================================================
		this.setupLogin = function()
		{
			_uid = _getUniqueUserId();

			Debug.log("UUID: " + _uid + ", " + Desktop.desktop.security);

			if(Desktop.desktop.security == Desktop.SECURITY_TYPE_DIGEST_ACCESS)
			{
				this.loginDiv = _loginDiv = document.createElement("div"); //create holder for anything login
				_loginDiv.setAttribute("id", "DesktopLoginDiv");
				Desktop.XMLHttpRequest("LoginRequest?RequestType=sessionId",
							"uuid="+_uid,
							_handleGetSessionId); //if disabled, then cookieCode will return 0 to desktop
			}
			else if(Desktop.desktop.security == Desktop.SECURITY_TYPE_NONE)	 //straight to login attempt for no security
				Desktop.XMLHttpRequest("LoginRequest?RequestType=login",
						"uuid="+_uid,
						_handleLoginAttempt);
			//else //no login prompt at all

			Debug.log("UUID: " + _uid);
		} //end setupLogin()

		this.setupLogin();
		Debug.log("Desktop Login created",Debug.LOW_PRIORITY);
	}
}
