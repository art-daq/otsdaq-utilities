//=====================================================================================
//
//	Created Oct, 2026
//	by Ryan Rivera ((rrivera at fnal.gov))
//
//	ViewerWaveform.js
//
//	requires an omni div, that will be made full window size at position 0,0.
//
//	public function list:
//		ViewerWaveform.launch()
//
//=====================================================================================

var ViewerWaveform = ViewerWaveform || {};

ViewerWaveform.POLL_PERIOD     = 200;  //ms
ViewerWaveform.numChannels     = 1;    //emulator default (register 0x1007)
ViewerWaveform.bitWidth        = 16;   //emulator default (register 0x1005)
ViewerWaveform.CHANNEL_COLORS  = [
	"#00ff41", "#ffb300", "#448aff", "#ff1744",
	"#aa00ff", "#ff6d00", "#00e5ff", "#ff4081"
];
ViewerWaveform.BG_COLOR        = "#1a1a2e";
ViewerWaveform.GRID_COLOR      = "#2a2a4a";
ViewerWaveform.TEXT_COLOR       = "#8888aa";

////////////////////////////////////////////////////////////
ViewerWaveform.launch = function() {

	Debug.log("ViewerWaveform.launch: numChannels=" + ViewerWaveform.numChannels +
		" bitWidth=" + ViewerWaveform.bitWidth +
		" pollPeriod=" + ViewerWaveform.POLL_PERIOD + "ms");
	ViewerWaveform.pollCount = 0;
	ViewerWaveform.lastSummary = "";

	var omni = document.getElementById("omni");
	omni.innerHTML = "";

	var w = ViewerWaveform.w = window.innerWidth;
	var h = ViewerWaveform.h = window.innerHeight;

	omni.style.position        = "absolute";
	omni.style.left            = "0px";
	omni.style.top             = "0px";
	omni.style.width           = w + "px";
	omni.style.height          = h + "px";
	omni.style.backgroundColor = ViewerWaveform.BG_COLOR;
	omni.style.overflow        = "hidden";

	// status strip
	var statusEl = document.createElement("div");
	statusEl.id  = "ViewerWaveform-status";
	statusEl.className = "ViewerWaveform-status";
	statusEl.innerHTML = "Waveform Viewer &mdash; waiting for data...";
	omni.appendChild(statusEl);
	ViewerWaveform.statusEl = statusEl;

	// controls
	var ctrlEl = document.createElement("div");
	ctrlEl.className = "ViewerWaveform-controls";

	var pauseBtn = document.createElement("button");
	pauseBtn.className = "ViewerWaveform-btn";
	pauseBtn.textContent = "Pause";
	pauseBtn.onclick = function() {
		ViewerWaveform.paused = !ViewerWaveform.paused;
		pauseBtn.textContent = ViewerWaveform.paused ? "Resume" : "Pause";
	};
	ctrlEl.appendChild(pauseBtn);

	var stackBtn = document.createElement("button");
	stackBtn.className = "ViewerWaveform-btn";
	stackBtn.textContent = "Overlaid";
	stackBtn.onclick = function() {
		ViewerWaveform.stacked = !ViewerWaveform.stacked;
		stackBtn.textContent = ViewerWaveform.stacked ? "Stacked" : "Overlaid";
		ViewerWaveform.render();
	};
	ctrlEl.appendChild(stackBtn);
	ViewerWaveform.stacked = true;
	stackBtn.textContent   = "Stacked";

	var chSel = document.createElement("select");
	chSel.className = "ViewerWaveform-btn";
	chSel.title = "Channels interleaved in each packet";
	[1, 2, 4, 8].forEach(function(n) {
		var opt = document.createElement("option");
		opt.value = n; opt.textContent = n + " ch";
		chSel.appendChild(opt);
	});
	chSel.value = ViewerWaveform.numChannels;
	chSel.onchange = function() {
		ViewerWaveform.numChannels = parseInt(chSel.value);
		Debug.log("ViewerWaveform: numChannels set to " + ViewerWaveform.numChannels);
	};
	ctrlEl.appendChild(chSel);

	var bwSel = document.createElement("select");
	bwSel.className = "ViewerWaveform-btn";
	bwSel.title = "Bits per sample";
	[8, 12, 16, 32].forEach(function(n) {
		var opt = document.createElement("option");
		opt.value = n; opt.textContent = n + "-bit";
		bwSel.appendChild(opt);
	});
	bwSel.value = ViewerWaveform.bitWidth;
	bwSel.onchange = function() {
		ViewerWaveform.bitWidth = parseInt(bwSel.value);
		Debug.log("ViewerWaveform: bitWidth set to " + ViewerWaveform.bitWidth);
	};
	ctrlEl.appendChild(bwSel);

	omni.appendChild(ctrlEl);

	// canvas
	var canvas = document.createElement("canvas");
	canvas.id  = "ViewerWaveform-canvas";
	canvas.width  = w;
	canvas.height = h;
	omni.appendChild(canvas);
	ViewerWaveform.canvas = canvas;
	ViewerWaveform.ctx    = canvas.getContext("2d");

	ViewerWaveform.paused   = false;
	ViewerWaveform.channels = null;
	ViewerWaveform.meta     = {};

	window.onresize = ViewerWaveform.handleResize;

	window.clearInterval(ViewerWaveform.pollTimer);
	ViewerWaveform.pollTimer = window.setInterval(
		ViewerWaveform.poll, ViewerWaveform.POLL_PERIOD);
	ViewerWaveform.poll();
}; //end launch()

//=====================================================================================
ViewerWaveform.handleResize = function() {
	var w = ViewerWaveform.w = window.innerWidth;
	var h = ViewerWaveform.h = window.innerHeight;
	var omni = document.getElementById("omni");
	omni.style.width  = w + "px";
	omni.style.height = h + "px";
	ViewerWaveform.canvas.width  = w;
	ViewerWaveform.canvas.height = h;
	ViewerWaveform.render();
};

//=====================================================================================
ViewerWaveform.poll = function() {
	if(ViewerWaveform.paused) return;
	if(ViewerWaveform.pollInFlight) return;
	ViewerWaveform.pollInFlight = true;

	DesktopContent.XMLHttpRequest(
		"Request?RequestType=getWaveformData" +
			"&numChannels=" + ViewerWaveform.numChannels +
			"&bitWidth=" + ViewerWaveform.bitWidth, "",
		ViewerWaveform.handleData,
		0, 0, true, true);
};

//=====================================================================================
ViewerWaveform.handleData = function(req, reqParam, errStr) {
	ViewerWaveform.pollInFlight = false;
	ViewerWaveform.pollCount++;

	if(errStr || !req || !req.responseXML) {
		Debug.log("ViewerWaveform poll #" + ViewerWaveform.pollCount +
			" no response: errStr='" + errStr + "' status=" +
			(req ? req.status : "none") + " responseXML=" +
			(req && req.responseXML ? "yes" : "no"), Debug.HIGH_PRIORITY);
		ViewerWaveform.statusEl.innerHTML =
			"Waveform Viewer &mdash; <span style='color:#ff4444'>no response</span>";
		return;
	}

	var xml          = req.responseXML;
	var source       = ViewerWaveform.getXmlVal(xml, "source")      || "demo";
	var numChannels  = parseInt(ViewerWaveform.getXmlVal(xml, "numChannels")) || 0;
	var bitWidth     = parseInt(ViewerWaveform.getXmlVal(xml, "bitWidth"))    || 12;
	var timestamp    = ViewerWaveform.getXmlVal(xml, "timestamp")   || "";

	var channels = [];
	for(var ch = 0; ch < numChannels; ch++) {
		var csv = ViewerWaveform.getXmlVal(xml, "channel_" + ch);
		if(!csv) { channels.push([]); continue; }
		var vals = csv.split(",");
		var arr  = new Array(vals.length);
		for(var i = 0; i < vals.length; i++)
			arr[i] = parseInt(vals[i]) || 0;
		channels.push(arr);
	}

	ViewerWaveform.channels = channels;
	ViewerWaveform.meta     = {
		source:      source,
		numChannels: numChannels,
		bitWidth:    bitWidth,
		maxVal:      Math.pow(2, bitWidth) - 1,
		timestamp:   timestamp
	};

	var label = source == "live" ? "LIVE" : "DEMO";
	var color = source == "live" ? "#00ff41" : "#ffb300";
	var nSamp = channels.length > 0 ? channels[0].length : 0;

	// log when the shape of the data changes, plus a heartbeat every ~5s
	var summary = source + " " + numChannels + "ch " + bitWidth + "bit " + nSamp + "samp";
	var heartbeat = (ViewerWaveform.pollCount % 25) == 0;
	if(summary != ViewerWaveform.lastSummary || heartbeat) {
		var ch0 = channels.length > 0 ? channels[0] : [];
		var mn = ch0.length ? Math.min.apply(null, ch0) : "-";
		var mx = ch0.length ? Math.max.apply(null, ch0) : "-";
		Debug.log("ViewerWaveform poll #" + ViewerWaveform.pollCount +
			(summary != ViewerWaveform.lastSummary ? " CHANGED" : " heartbeat") +
			": " + summary + " ts=" + timestamp +
			" ch0[min,max]=[" + mn + "," + mx + "]" +
			" ch0[0..7]=" + ch0.slice(0, 8).join(","));
		ViewerWaveform.lastSummary = summary;
	}
	ViewerWaveform.statusEl.innerHTML =
		"Waveform Viewer &mdash; <span style='color:" + color + "'>" + label +
		"</span> &bull; " + numChannels + " ch &bull; " +
		bitWidth + "-bit &bull; " + nSamp + " samples";

	ViewerWaveform.render();
};

//=====================================================================================
ViewerWaveform.getXmlVal = function(xml, tag) {
	var els = xml.getElementsByTagName(tag);
	if(!els || !els.length) return "";
	return els[0].getAttribute("value") || "";
};

//=====================================================================================
ViewerWaveform.render = function() {
	var ctx = ViewerWaveform.ctx;
	var w   = ViewerWaveform.w;
	var h   = ViewerWaveform.h;
	var ch  = ViewerWaveform.channels;
	var m   = ViewerWaveform.meta;

	if(!ctx) return;

	ctx.fillStyle = ViewerWaveform.BG_COLOR;
	ctx.fillRect(0, 0, w, h);

	if(!ch || ch.length === 0) return;

	var marginL   = 60;
	var marginR   = 20;
	var marginT   = 40;
	var marginB   = 30;
	var plotW     = w - marginL - marginR;
	var plotH     = h - marginT - marginB;

	if(plotW < 10 || plotH < 10) return;

	var nCh     = ch.length;
	var maxVal  = m.maxVal || 4095;

	if(ViewerWaveform.stacked) {
		var chH    = plotH / nCh;
		var gap    = 4;

		for(var c = 0; c < nCh; c++) {
			var yOff = marginT + c * chH;
			var drawH = chH - gap;

			// grid
			ViewerWaveform.drawGrid(ctx, marginL, yOff, plotW, drawH, ch[c].length, maxVal);

			// channel label
			ctx.fillStyle = ViewerWaveform.CHANNEL_COLORS[c % ViewerWaveform.CHANNEL_COLORS.length];
			ctx.font = "12px monospace";
			ctx.fillText("CH" + c, marginL + 4, yOff + 14);

			// trace
			ViewerWaveform.drawTrace(ctx, ch[c], marginL, yOff, plotW, drawH, maxVal,
				ViewerWaveform.CHANNEL_COLORS[c % ViewerWaveform.CHANNEL_COLORS.length]);
		}
	} else {
		// overlaid
		ViewerWaveform.drawGrid(ctx, marginL, marginT, plotW, plotH,
			ch[0] ? ch[0].length : 0, maxVal);

		for(var c = 0; c < nCh; c++) {
			ViewerWaveform.drawTrace(ctx, ch[c], marginL, marginT, plotW, plotH, maxVal,
				ViewerWaveform.CHANNEL_COLORS[c % ViewerWaveform.CHANNEL_COLORS.length]);
		}

		// legend
		for(var c = 0; c < nCh; c++) {
			ctx.fillStyle = ViewerWaveform.CHANNEL_COLORS[c % ViewerWaveform.CHANNEL_COLORS.length];
			ctx.font = "12px monospace";
			ctx.fillText("CH" + c, marginL + 8 + c * 60, marginT + 14);
		}
	}
};

//=====================================================================================
ViewerWaveform.drawGrid = function(ctx, x, y, w, h, nSamples, maxVal) {
	ctx.strokeStyle = ViewerWaveform.GRID_COLOR;
	ctx.lineWidth   = 1;

	// horizontal lines (5 divisions)
	for(var i = 0; i <= 4; i++) {
		var yy = y + (i / 4) * h;
		ctx.beginPath();
		ctx.moveTo(x, yy);
		ctx.lineTo(x + w, yy);
		ctx.stroke();

		// Y label
		var val = Math.round(maxVal * (1 - i / 4));
		ctx.fillStyle = ViewerWaveform.TEXT_COLOR;
		ctx.font = "10px monospace";
		ctx.textAlign = "right";
		ctx.fillText(val, x - 4, yy + 4);
	}

	// vertical lines
	if(nSamples > 0) {
		var nDiv = Math.min(10, nSamples);
		for(var i = 0; i <= nDiv; i++) {
			var xx = x + (i / nDiv) * w;
			ctx.beginPath();
			ctx.moveTo(xx, y);
			ctx.lineTo(xx, y + h);
			ctx.stroke();
		}
	}

	ctx.textAlign = "left";
};

//=====================================================================================
ViewerWaveform.drawTrace = function(ctx, samples, x, y, w, h, maxVal, color) {
	if(!samples || samples.length < 2) return;

	var n = samples.length;
	ctx.strokeStyle = color;
	ctx.lineWidth   = 1.5;
	ctx.beginPath();

	for(var i = 0; i < n; i++) {
		var px = x + (i / (n - 1)) * w;
		var py = y + h - (samples[i] / maxVal) * h;
		if(i === 0)
			ctx.moveTo(px, py);
		else
			ctx.lineTo(px, py);
	}
	ctx.stroke();
};
