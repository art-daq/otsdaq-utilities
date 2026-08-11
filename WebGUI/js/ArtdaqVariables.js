var ArtdaqVars = ArtdaqVars || {};

(function() {
	"use strict";

	//=====================================================================================
	ArtdaqVars.init = function() {
		Debug.log("ArtdaqVars.init() localUrnLid=" + DesktopContent._localUrnLid +
			" localOrigin=" + DesktopContent._localOrigin);
		ArtdaqVars.loadVariables();
		ArtdaqVars.loadJsonDocuments();
	}; //end init()

	//=====================================================================================
	ArtdaqVars.loadVariables = function() {
		var container = document.getElementById("av-variables");
		if (!container) return;

		DesktopContent.XMLHttpRequest(
			"Request?RequestType=getArtdaqSystemVariables",
			"",
			function(req) {
				if (!req) {
					showStatus("Error loading variables", "error");
					return;
				}

				var dataEl = req.responseXML.getElementsByTagName("DATA")[0];
				if (!dataEl) {
					showStatus("Error loading variables: no data", "error");
					return;
				}

				container.innerHTML = "";
				var count = 0;
				var children = dataEl.childNodes;
				for (var i = 0; i < children.length; i++) {
					var node = children[i];
					if (node.nodeType !== 1) continue;
					var tagName = node.nodeName || node.tagName;
					if (!tagName || tagName.indexOf("artdaq_") !== 0) continue;

					var varName = tagName.substring(7);
					var value = node.getAttribute("value") || node.textContent || "";

					var row = document.createElement("div");
					row.className = "av-row";
					row.innerHTML =
						'<label>${OTS.artdaq.' + escapeHtml(varName) + '}</label>' +
						'<input type="text" id="av-val-' + escapeHtml(varName) +
						'" value="' + escapeAttr(value) + '">' +
						'<a onclick="ArtdaqVars.saveVariable(\'' +
						escapeAttr(varName) + '\')" title="Save this variable">Save</a>';
					container.appendChild(row);
					count++;
				}

				if (count === 0) {
					container.innerHTML =
						'<div class="av-hint">No variables defined yet.</div>';
				}
			},
			undefined, undefined, true,
			true
		);
	}; //end loadVariables()

	//=====================================================================================
	ArtdaqVars.saveVariable = function(key) {
		var input = document.getElementById("av-val-" + key);
		if (!input) return;
		var value = input.value;

		DesktopContent.XMLHttpRequest(
			"Request?RequestType=setArtdaqSystemVariable",
			"key=" + encodeURIComponent(key) +
			"&value=" + encodeURIComponent(value),
			function(req) {
				if (!req) {
					showStatus("Error saving variable", "error");
					return;
				}
				var errStr = DesktopContent.getXMLValue(req, "Error");
				if (errStr) {
					showStatus(errStr, "error");
				} else {
					showStatus("Saved " + key + " = " + value, "success");
				}
			},
			undefined, undefined, true,
			true
		);
	}; //end saveVariable()

	//=====================================================================================
	ArtdaqVars.addVariable = function() {
		var keyInput   = document.getElementById("av-new-key");
		var valueInput = document.getElementById("av-new-value");
		if (!keyInput || !valueInput) return;

		var key   = keyInput.value.trim();
		var value = valueInput.value;

		if (!key) {
			showStatus("Variable name cannot be empty.", "error");
			return;
		}
		if (!/^[a-zA-Z0-9_]+$/.test(key)) {
			showStatus("Variable name must be alphanumeric and underscores only.",
			           "error");
			return;
		}

		DesktopContent.XMLHttpRequest(
			"Request?RequestType=setArtdaqSystemVariable",
			"key=" + encodeURIComponent(key) +
			"&value=" + encodeURIComponent(value),
			function(req) {
				if (!req) {
					showStatus("Error adding variable", "error");
					return;
				}
				var errStr = DesktopContent.getXMLValue(req, "Error");
				if (errStr) {
					showStatus(errStr, "error");
				} else {
					showStatus("Added " + key + " = " + value, "success");
					keyInput.value = "";
					valueInput.value = "";
					ArtdaqVars.loadVariables();
				}
			},
			undefined, undefined, true,
			true
		);
	}; //end addVariable()

	//=====================================================================================
	ArtdaqVars.loadJsonDocuments = function() {
		var container = document.getElementById("av-json-docs");
		if (!container) return;

		DesktopContent.XMLHttpRequest(
			"Request?RequestType=getJsonDocuments",
			"",
			function(req) {
				if (!req) {
					container.innerHTML = "Error loading documents.";
					return;
				}

				var dataEl = req.responseXML.getElementsByTagName("DATA")[0];
				if (!dataEl) {
					container.innerHTML = "No JSON documents found.";
					return;
				}

				var nameNodes    = dataEl.getElementsByTagName("jsonDoc_name");
				var versionNodes = dataEl.getElementsByTagName("jsonDoc_versions");

				if (!nameNodes.length) {
					container.innerHTML = "No JSON documents found.";
					return;
				}

				var html = '<table><tr><th>Document Name</th><th>Versions</th></tr>';
				for (var i = 0; i < nameNodes.length; i++) {
					var name = nameNodes[i].getAttribute("value") ||
					           nameNodes[i].textContent || "";
					var vers = versionNodes[i] ?
						(versionNodes[i].getAttribute("value") ||
						 versionNodes[i].textContent || "") : "";
					html += '<tr><td>' + escapeHtml(name) +
					        '</td><td>' + escapeHtml(vers) + '</td></tr>';
				}
				html += '</table>';
				container.innerHTML = html;
			},
			undefined, undefined, true,
			true
		);
	}; //end loadJsonDocuments()

	//=====================================================================================
	function showStatus(message, type) {
		var el = document.getElementById("statusBar");
		if (!el) return;
		el.textContent = message;
		el.className = type || "";
		if (type === "success") {
			setTimeout(function() {
				el.textContent = "";
				el.className = "";
			}, 5000);
		}
	} //end showStatus()

	//=====================================================================================
	function escapeHtml(s) {
		var div = document.createElement("div");
		div.appendChild(document.createTextNode(s));
		return div.innerHTML;
	} //end escapeHtml()

	//=====================================================================================
	function escapeAttr(s) {
		return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
		        .replace(/'/g, "&#39;").replace(/</g, "&lt;")
		        .replace(/>/g, "&gt;");
	} //end escapeAttr()

})();
