//=====================================================================================
//
//	Created April, 2026
//
//	ContextToggle.js
//
//	Description:
//		A GUI for enabling and disabling Contexts using the Configuration API.
//		Fetches all XDAQContextTable records, displays their Status (On/Off)
//		with toggle switches, and allows saving changes back through the
//		Configuration API (save modified tables, bump groups, activate).
//
//	Requirements:
//		<script type="text/JavaScript" src="/WebPath/js/Globals.js"></script>
//		<script type="text/JavaScript" src="/WebPath/js/Debug.js"></script>
//		<script type="text/JavaScript" src="/WebPath/js/DesktopContent.js"></script>
//		<script type="text/JavaScript" src="/WebPath/js/js_lib/ConfigurationAPI.js"></script>
//		<script type="text/JavaScript" src="/WebPath/js/ContextToggle.js"></script>
//		<link rel="stylesheet" type="text/css" href="/WebPath/css/ConfigurationAPI.css">
//
//=====================================================================================

var ContextToggle = ContextToggle || {}; //define ContextToggle namespace

if (typeof Debug == 'undefined')
	throw('ERROR: Debug is undefined! Must include Debug.js before ContextToggle.js');
else if (typeof Globals == 'undefined')
	throw('ERROR: Globals is undefined! Must include Globals.js before ContextToggle.js');
else if (typeof ConfigurationAPI == 'undefined')
	throw('ERROR: ConfigurationAPI is undefined! Must include ConfigurationAPI.js before ContextToggle.js');


////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
//call create to create the ContextToggle GUI
////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////
ContextToggle.create = function() {

	//	functions:
	//		init()
	//		fetchContextRecords()
	//		fetchContextStatuses(records)
	//		buildUI()
	//		handleToggle(contextIndex)
	//		handleEnableAll()
	//		handleDisableAll()
	//		handleSave()
	//		setStatus(msg, type)
	//		showLoading(show)
	//		setControlsEnabled(enabled)

	var _SUBSET_BASE_PATH = "XDAQContextTable";

	var _contextRecords  = [];   // array of context UID strings
	var _contextStatuses = [];   // array of booleans (true=On)
	var _pendingChanges  = {};   // map: contextIndex -> new boolean value
	var _modifiedTables  = undefined; // tracks modified temporary table versions
	var _isSaving        = false;

	//=====================================================================================
	//init ~~
	function init()
	{
		var windowTooltip = "Welcome to the <b>Context Toggle</b> interface. " +
			"Use the toggle switches to turn Contexts on or off, " +
			"then press <b>Save Changes</b> to persist your changes through the Configuration API." +
			"\n\n" +
			"Use <b>Enable All</b> or <b>Disable All</b> for bulk operations.";
		Debug.log("ContextToggle init");
		DesktopContent.tooltip("Context Toggle", windowTooltip);
		DesktopContent.setWindowTooltip(windowTooltip);

		//reset state
		_contextRecords  = [];
		_contextStatuses = [];
		_pendingChanges  = {};
		_modifiedTables  = undefined;
		_isSaving        = false;

		//initialize ConfigurationAPI (fetches member names)
		ConfigurationAPI.init();

		//begin loading context data
		showLoading(true);
		fetchContextRecords();
	} //end init()


	//=====================================================================================
	//fetchContextRecords ~~
	//	get all context UIDs from XDAQContextTable
	function fetchContextRecords()
	{
		Debug.log("fetchContextRecords");

		ConfigurationAPI.getSubsetRecords(
			_SUBSET_BASE_PATH,
			"", //filterList - empty to get all
			function(records) {
				if(!records || records.length == 0)
				{
					showLoading(false);
					setStatus("No contexts found in the active configuration.", "warning");
					buildUI();
					return;
				}

				_contextRecords = records;
				Debug.log("Found " + _contextRecords.length + " context records: " + _contextRecords);

				//now fetch their Status field values
				fetchContextStatuses();
			}
		);
	} //end fetchContextRecords()


	//=====================================================================================
	//fetchContextStatuses ~~
	//	get Status field value for each context record
	function fetchContextStatuses()
	{
		Debug.log("fetchContextStatuses");

		ConfigurationAPI.getFieldValuesForRecords(
			_SUBSET_BASE_PATH,
			_contextRecords,
			["Status"],
			function(recFieldValues, err) {
				showLoading(false);

				if(err)
				{
					setStatus("Error reading context statuses: " + err, "error");
					buildUI();
					return;
				}

				_contextStatuses = [];
				for(var i = 0; i < recFieldValues.length; ++i)
					_contextStatuses.push(recFieldValues[i].fieldValue == "On");

				Debug.log("Context statuses loaded: " + _contextStatuses);

				//update active group info display
				updateActiveGroupInfo();

				buildUI();
			}
		);
	} //end fetchContextStatuses()


	//=====================================================================================
	//updateActiveGroupInfo ~~
	//	display the currently active Context group name and key
	function updateActiveGroupInfo()
	{
		var infoEl = document.getElementById("activeGroupInfo");
		if(!infoEl) return;

		function renderActiveGroupInfo()
		{
			var ag = ConfigurationAPI._activeGroups;
			if(ag && ag.Context && ag.Context.groupName)
			{
				infoEl.innerHTML = "Active Context Group: <b>" +
					ag.Context.groupName + "</b> (Key: <b>" +
					ag.Context.groupKey + "</b>)";
			}
			else
			{
				infoEl.innerHTML = "Active Context Group: <b>None</b>";
			}
		}

		var ag = ConfigurationAPI._activeGroups;
		if(ag && ag.Context && ag.Context.groupName)
		{
			renderActiveGroupInfo();
			return;
		}

		infoEl.innerHTML = "Active Context Group: <b>Loading...</b>";
		ConfigurationAPI.getActiveGroups(function(activeGroups, err) {
			if(err)
			{
				Debug.log("Error reading active groups: " + err);
				infoEl.innerHTML = "Active Context Group: <b>None</b>";
				return;
			}

			if(activeGroups)
				ConfigurationAPI._activeGroups = activeGroups;

			renderActiveGroupInfo();
		});
	} //end updateActiveGroupInfo()


	//=====================================================================================
	//buildUI ~~
	//	construct or update the full UI
	function buildUI()
	{
		Debug.log("buildUI with " + _contextRecords.length + " contexts");

		var cel = document.getElementById("content");
		if(!cel)
		{
			cel = document.createElement("div");
			cel.setAttribute("id", "content");
			document.body.appendChild(cel);
		}

		//clear content
		cel.innerHTML = "";

		//--- Header ---
		var headerDiv = document.createElement("div");
		headerDiv.setAttribute("id", "headerDiv");
		headerDiv.innerHTML = "<h2>Context Toggle</h2>" +
			"<span class='subtitle'>Enable or disable Contexts using the Configuration API</span>";
		cel.appendChild(headerDiv);

		//--- Active Group Info ---
		var groupInfoDiv = document.createElement("div");
		groupInfoDiv.setAttribute("id", "activeGroupInfo");
		cel.appendChild(groupInfoDiv);
		updateActiveGroupInfo();

		//--- Toolbar ---
		var toolbarDiv = document.createElement("div");
		toolbarDiv.setAttribute("id", "toolbarDiv");

		var refreshBtn = document.createElement("span");
		refreshBtn.setAttribute("id", "refreshBtn");
		refreshBtn.setAttribute("class", "toolbar-btn");
		refreshBtn.innerHTML = "Refresh";
		refreshBtn.onclick = function() {
			if(_isSaving) return;
			init();
		};
		toolbarDiv.appendChild(refreshBtn);

		var enableAllBtn = document.createElement("span");
		enableAllBtn.setAttribute("id", "enableAllBtn");
		enableAllBtn.setAttribute("class", "toolbar-btn");
		enableAllBtn.innerHTML = "Enable All";
		enableAllBtn.onclick = function() { handleEnableAll(); };
		toolbarDiv.appendChild(enableAllBtn);

		var disableAllBtn = document.createElement("span");
		disableAllBtn.setAttribute("id", "disableAllBtn");
		disableAllBtn.setAttribute("class", "toolbar-btn");
		disableAllBtn.innerHTML = "Disable All";
		disableAllBtn.onclick = function() { handleDisableAll(); };
		toolbarDiv.appendChild(disableAllBtn);

		var saveBtn = document.createElement("span");
		saveBtn.setAttribute("id", "saveBtn");
		saveBtn.setAttribute("class", "toolbar-btn");
		saveBtn.innerHTML = "Save Changes";
		saveBtn.onclick = function() { handleSave(); };
		toolbarDiv.appendChild(saveBtn);

		cel.appendChild(toolbarDiv);

		//--- Context List ---
		var listDiv = document.createElement("div");
		listDiv.setAttribute("id", "contextListDiv");

		if(_contextRecords.length == 0)
		{
			listDiv.innerHTML = "<div style='text-align:center; color: rgb(140,140,160); " +
				"padding:40px; font-size:15px;'>No context records found.</div>";
		}
		else
		{
			for(var i = 0; i < _contextRecords.length; ++i)
			{
				var isOn = getEffectiveStatus(i);
				var hasPending = (i in _pendingChanges);

				var row = document.createElement("div");
				row.setAttribute("class", "context-row" + (hasPending ? " pending-change" : ""));
				row.setAttribute("id", "context-row-" + i);

				//context info (name + badge)
				var infoDiv = document.createElement("div");
				infoDiv.setAttribute("class", "context-info");

				var nameSpan = document.createElement("span");
				nameSpan.setAttribute("class", "context-name");
				nameSpan.setAttribute("title", _contextRecords[i]);
				nameSpan.textContent = _contextRecords[i];
				infoDiv.appendChild(nameSpan);

				var badge = document.createElement("span");
				badge.setAttribute("class", "context-status-badge " + (isOn ? "status-on" : "status-off"));
				badge.setAttribute("id", "context-badge-" + i);
				badge.textContent = isOn ? "ON" : "OFF";
				infoDiv.appendChild(badge);

				row.appendChild(infoDiv);

				//toggle switch
				var toggleLabel = document.createElement("label");
				toggleLabel.setAttribute("class", "toggle-switch");

				var toggleInput = document.createElement("input");
				toggleInput.setAttribute("type", "checkbox");
				toggleInput.setAttribute("id", "context-toggle-" + i);
				if(isOn) toggleInput.checked = true;
				toggleInput.setAttribute("data-index", "" + i);
				toggleInput.onchange = function() {
					var idx = parseInt(this.getAttribute("data-index"));
					handleToggle(idx);
				};
				toggleLabel.appendChild(toggleInput);

				var sliderSpan = document.createElement("span");
				sliderSpan.setAttribute("class", "toggle-slider");
				toggleLabel.appendChild(sliderSpan);

				row.appendChild(toggleLabel);
				listDiv.appendChild(row);
			}
		}

		cel.appendChild(listDiv);

		//--- Status Bar ---
		var statusBar = document.createElement("div");
		statusBar.setAttribute("id", "statusBar");
		cel.appendChild(statusBar);

		//update save button state
		updateSaveButton();

	} //end buildUI()


	//=====================================================================================
	//getEffectiveStatus ~~
	//	return the effective on/off status considering pending changes
	function getEffectiveStatus(contextIndex)
	{
		if(contextIndex in _pendingChanges)
			return _pendingChanges[contextIndex];
		return _contextStatuses[contextIndex];
	} //end getEffectiveStatus()


	//=====================================================================================
	//handleToggle ~~
	//	called when a toggle switch is changed
	function handleToggle(contextIndex)
	{
		if(_isSaving) return;

		var newValue = !getEffectiveStatus(contextIndex);

		//check if this returns to original value
		if(newValue === _contextStatuses[contextIndex])
			delete _pendingChanges[contextIndex];
		else
			_pendingChanges[contextIndex] = newValue;

		Debug.log("Toggle context[" + contextIndex + "] '" + _contextRecords[contextIndex] +
			"' to " + (newValue ? "On" : "Off"));

		//update the row visual without full rebuild
		updateRowVisual(contextIndex);
		updateSaveButton();

		var pendingCount = Object.keys(_pendingChanges).length;
		if(pendingCount > 0)
			setStatus(pendingCount + " unsaved change" + (pendingCount > 1 ? "s" : ""), "info");
		else
			setStatus("", "info");

	} //end handleToggle()


	//=====================================================================================
	//updateRowVisual ~~
	//	update a single row's visual state without rebuilding the whole UI
	function updateRowVisual(contextIndex)
	{
		var isOn = getEffectiveStatus(contextIndex);
		var hasPending = (contextIndex in _pendingChanges);

		var row = document.getElementById("context-row-" + contextIndex);
		if(row)
		{
			row.className = "context-row" + (hasPending ? " pending-change" : "");
		}

		var badge = document.getElementById("context-badge-" + contextIndex);
		if(badge)
		{
			badge.className = "context-status-badge " + (isOn ? "status-on" : "status-off");
			badge.textContent = isOn ? "ON" : "OFF";
		}

		var toggle = document.getElementById("context-toggle-" + contextIndex);
		if(toggle)
		{
			toggle.checked = isOn;
		}
	} //end updateRowVisual()


	//=====================================================================================
	//handleEnableAll ~~
	function handleEnableAll()
	{
		if(_isSaving) return;
		Debug.log("handleEnableAll");

		for(var i = 0; i < _contextRecords.length; ++i)
		{
			if(_contextStatuses[i] === true)
				delete _pendingChanges[i]; //already on, no change
			else
				_pendingChanges[i] = true;

			updateRowVisual(i);
		}

		updateSaveButton();
		var pendingCount = Object.keys(_pendingChanges).length;
		if(pendingCount > 0)
			setStatus(pendingCount + " unsaved change" + (pendingCount > 1 ? "s" : ""), "info");
		else
			setStatus("All contexts are already enabled.", "info");

	} //end handleEnableAll()


	//=====================================================================================
	//handleDisableAll ~~
	function handleDisableAll()
	{
		if(_isSaving) return;
		Debug.log("handleDisableAll");

		for(var i = 0; i < _contextRecords.length; ++i)
		{
			if(_contextStatuses[i] === false)
				delete _pendingChanges[i]; //already off, no change
			else
				_pendingChanges[i] = false;

			updateRowVisual(i);
		}

		updateSaveButton();
		var pendingCount = Object.keys(_pendingChanges).length;
		if(pendingCount > 0)
			setStatus(pendingCount + " unsaved change" + (pendingCount > 1 ? "s" : ""), "info");
		else
			setStatus("All contexts are already disabled.", "info");

	} //end handleDisableAll()


	//=====================================================================================
	//updateSaveButton ~~
	//	enable/disable save button based on pending changes
	function updateSaveButton()
	{
		var saveBtn = document.getElementById("saveBtn");
		if(!saveBtn) return;

		var pendingCount = Object.keys(_pendingChanges).length;
		if(pendingCount > 0 && !_isSaving)
		{
			saveBtn.removeAttribute("disabled");
			saveBtn.innerHTML = "Save Changes <span class='pending-count'>" +
				pendingCount + "</span>";
		}
		else
		{
			saveBtn.setAttribute("disabled", "true");
			saveBtn.innerHTML = "Save Changes";
		}
	} //end updateSaveButton()


	//=====================================================================================
	//handleSave ~~
	//	apply all pending changes via the Configuration API
	//	Uses sequential setFieldValuesForRecords calls (one per changed context),
	//	then pops up the standard save dialog.
	function handleSave()
	{
		var pendingKeys = Object.keys(_pendingChanges);
		if(pendingKeys.length == 0 || _isSaving) return;

		Debug.log("handleSave: " + pendingKeys.length + " changes to apply");

		_isSaving = true;
		setControlsEnabled(false);
		setStatus("Applying changes...", "info");

		//build arrays of records and values to set sequentially
		var recordsToSet = [];
		var valuesToSet   = [];
		for(var i = 0; i < pendingKeys.length; ++i)
		{
			var idx = parseInt(pendingKeys[i]);
			recordsToSet.push(_contextRecords[idx]);
			valuesToSet.push(_pendingChanges[idx] ? "1" : "0");
		}

		var recordIndex = 0;
		var localModifiedTables = undefined;

		//sequentially set each record's Status field
		localSetNextRecord();

		//===========================
		function localSetNextRecord()
		{
			setStatus("Applying change " + (recordIndex + 1) + " of " +
				recordsToSet.length + "...", "info");

			ConfigurationAPI.setFieldValuesForRecords(
				_SUBSET_BASE_PATH,
				recordsToSet[recordIndex],
				"Status", //fieldArr
				valuesToSet[recordIndex], //valueArr
				function(modifiedTables, err)
				{
					if(err)
					{
						Debug.log("Error setting field value: " + err, Debug.HIGH_PRIORITY);
						setStatus("Error: " + err, "error");
						_isSaving = false;
						setControlsEnabled(true);
						return;
					}

					if(!modifiedTables || modifiedTables.length == 0)
					{
						Debug.log("No modified tables returned. Something went wrong.",
							Debug.HIGH_PRIORITY);
						setStatus("Error: No modified tables returned.", "error");
						_isSaving = false;
						setControlsEnabled(true);
						return;
					}

					Debug.log("Record " + (recordIndex + 1) + " applied. " +
						"Modified tables: " + modifiedTables.length);

					localModifiedTables = modifiedTables;
					++recordIndex;

					if(recordIndex < recordsToSet.length)
					{
						//more records to set
						localSetNextRecord();
					}
					else
					{
						//all records set, now present save dialog
						Debug.log("All changes applied. Presenting save dialog...");
						setStatus("All changes applied. Complete the save dialog...", "info");

						ConfigurationAPI.popUpSaveModifiedTablesForm(
							localModifiedTables,
							function(savedTables, savedGroups, savedAliases)
							{
								_isSaving = false;

								if(!savedTables || savedTables.length == 0)
								{
									setStatus("Save was cancelled or failed.", "warning");
									setControlsEnabled(true);
									return;
								}

								Debug.log("Save complete! Tables saved: " + savedTables.length +
									", Groups saved: " + savedGroups.length, Debug.INFO_PRIORITY);
								setStatus("Changes saved and activated successfully!", "success");

								//clear pending changes and re-init to get fresh state
								_pendingChanges = {};
								_modifiedTables = undefined;

								//brief delay before refreshing so user sees success message
								window.setTimeout(function() {
									init();
								}, 1500);

							} //end popUpSaveModifiedTablesForm handler
						); //end popUpSaveModifiedTablesForm
					}

				} //end setFieldValuesForRecords handler
				, localModifiedTables); //pass in accumulated modified tables

		} //end localSetNextRecord()

	} //end handleSave()


	//=====================================================================================
	//setControlsEnabled ~~
	//	enable or disable all interactive controls during save
	function setControlsEnabled(enabled)
	{
		//toggles
		for(var i = 0; i < _contextRecords.length; ++i)
		{
			var toggle = document.getElementById("context-toggle-" + i);
			if(toggle)
			{
				if(enabled)
					toggle.removeAttribute("disabled");
				else
					toggle.setAttribute("disabled", "true");
			}
		}

		//buttons
		var btns = ["refreshBtn", "enableAllBtn", "disableAllBtn"];
		for(var b = 0; b < btns.length; ++b)
		{
			var btn = document.getElementById(btns[b]);
			if(btn)
			{
				if(enabled)
				{
					btn.style.opacity = "1";
					btn.style.pointerEvents = "auto";
				}
				else
				{
					btn.style.opacity = "0.4";
					btn.style.pointerEvents = "none";
				}
			}
		}

		updateSaveButton();
	} //end setControlsEnabled()


	//=====================================================================================
	//setStatus ~~
	//	update the status bar message
	//	type: "info", "success", "error", "warning"
	function setStatus(msg, type)
	{
		var statusBar = document.getElementById("statusBar");
		if(!statusBar) return;
		statusBar.className = type || "info";
		statusBar.textContent = msg;
	} //end setStatus()


	//=====================================================================================
	//showLoading ~~
	//	show or hide a loading overlay
	function showLoading(show)
	{
		var overlay = document.getElementById("loadingOverlay");

		if(show)
		{
			if(!overlay)
			{
				overlay = document.createElement("div");
				overlay.setAttribute("id", "loadingOverlay");
				overlay.innerHTML = "<span class='spinner'>Loading contexts...</span>";
				document.body.appendChild(overlay);
			}
			overlay.style.display = "flex";
		}
		else
		{
			if(overlay)
				overlay.style.display = "none";
		}
	} //end showLoading()


	//=====================================================================================
	// start!
	init();

}; //end ContextToggle.create()
