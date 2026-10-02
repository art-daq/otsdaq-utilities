#include "otsdaq-utilities/RunDbViewer/RunDbViewerSupervisor.h"

#include "otsdaq/FiniteStateMachine/MakeRunInfo.h"        // for Run Info plugin macro
#include "otsdaq/FiniteStateMachine/RunInfoVInterface.h"  // for Run Info plugins

#include <chrono>

using namespace ots;

#define XML_ADMIN_STATUS "rundbviewer_admin_status"
#define XML_STATUS "rundbviewer_status"
#define XML_MOST_RECENT_DAY "most_recent_day"
#define XML_RUNTYPE_LIST "run_type_list"
#define XML_ACTIVE_RUNTYPE "active_runtype"

#define XML_RUNDBVIEWER_ENTRY "rundbviewer_entry"
#define XML_RUNDBVIEWER_ENTRY_RUN_NUMBER "rundbviewer_entry_run_number"
#define XML_RUNDBVIEWER_ENTRY_RUN_TIME "rundbviewer_entry_run_time"
#define XML_RUNDBVIEWER_ENTRY_RUN_TYPE "rundbviewer_entry_run_type"
#define XML_RUNDBVIEWER_ENTRY_RUN_ARTDAQ_PARTITION \
	"rundbviewer_entry_run_artdaq_partition"
#define XML_RUNDBVIEWER_ENTRY_RUN_HOST_NAME "host_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONDIOTION_ID "condition_id"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_NAME "configuration_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_VERSION "configuration_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_NAME "context_name"
#define XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_VERSION "context_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_ONLINE_SOFTWARE_VERSION "online_software_version"
#define XML_RUNDBVIEWER_ENTRY_RUN_SHIFTER_NOTE "shifter_note"
#define XML_RUNDBVIEWER_ENTRY_RUN_START_TIME "start_time"
#define XML_RUNDBVIEWER_ENTRY_RUN_STOP_TIME "stop_time"
#define XML_RUNDBVIEWER_ENTRY_RUN_STATUS "run_status"
#define XML_RUNDBVIEWER_ENTRY_RUN_END_NOTE "end_note"
#define XML_RUNDBVIEWER_ENTRY_SUBSYSTEM_CONFIG_RECORD "subsystem_config_record"

XDAQ_INSTANTIATOR_IMPL(RunDbViewerSupervisor)

#undef __MF_SUBJECT__
#define __MF_SUBJECT__ "RunDbViewer"

//==============================================================================
RunDbViewerSupervisor::RunDbViewerSupervisor(xdaq::ApplicationStub* stub)
    : CoreSupervisorBase(stub)
{
	INIT_MF("." /*directory used is USER_DATA/LOG/.*/);

	// xgi::bind (this, &RunDbViewerSupervisor::Default,                	"Default" );
	// xgi::bind (this, &RunDbViewerSupervisor::Log,                		"Log" );
	// xgi::bind (this, &RunDbViewerSupervisor::LogImage,               	"LogImage" );
	// xgi::bind (this, &RunDbViewerSupervisor::LogReport,             	"LogReport" );

	init();

	// TODO allow admins to subscribe to active category alerts using System messages
	// (and email)
}  // end constructor()

//==============================================================================
RunDbViewerSupervisor::~RunDbViewerSupervisor(void) { destroy(); }

//==============================================================================
void RunDbViewerSupervisor::init(void)
{
	// called by constructor
	mostRecentDayIndex_ = 0;
}  //end init()

//==============================================================================
void RunDbViewerSupervisor::destroy(void)
{
	// called by destructor
}  //end destroy()

//==============================================================================
/// setSupervisorPropertyDefaults
///		override to set defaults for supervisor property values (before user settings
/// override)
void RunDbViewerSupervisor::setSupervisorPropertyDefaults()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.UserPermissionsThreshold,
	    std::string() +
	        "*=1 | CreateCategory=-1 | RemoveCategory=-1 | GetCategoryListAdmin=-1 "
	        "| SetActiveCategory=-1" +
	        " | AdminRemoveRestoreEntry=-1");
}  //end setSupervisorPropertyDefaults()

//==============================================================================
/// forceSupervisorPropertyValues
///		override to force supervisor property values (and ignore user settings)
void RunDbViewerSupervisor::forceSupervisorPropertyValues()
{
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.AutomatedRequestTypes,
	    "RefreshRunDbViewer | getRunConditionByID");
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.NonXMLRequestTypes,
	    "RunConditionReport");
	CorePropertySupervisorBase::setSupervisorProperty(
	    CorePropertySupervisorBase::SUPERVISOR_PROPERTIES.RequireUserLockRequestTypes,
	    "CreateCategory | RemoveCategory | PreviewEntry | AdminRemoveRestoreEntry");
}  //end forceSupervisorPropertyValues()

//==============================================================================
///	request
///		Handles Web Interface requests to RunDbViewer supervisor.
///		Does not refresh cookie for automatic update checks.
void RunDbViewerSupervisor::request(const std::string&               requestType,
                                    cgicc::Cgicc&                    cgiIn,
                                    HttpXmlDocument&                 xmlOut,
                                    const WebUsers::RequestUserInfo& userInfo)
{
	__COUTTV__(requestType);

	// Commands
	//	getRunTypeList
	//	RefreshRunDbViewer

	// to report to RunDbViewer admin status use
	// xmlOut.addTextElementToData(XML_ADMIN_STATUS,tempStr);

	if(requestType == "GetRunTypeList")
	{
		getRunTypeList(&xmlOut);
	}
	else if(requestType == "RefreshRunDbViewer")
	{
		// returns RunDbViewer for currently active category based on date and duration
		// parameters

		std::string Date     = CgiDataUtilities::postData(cgiIn, "Date");
		uint32_t    Duration = CgiDataUtilities::postDataAsInt(cgiIn, "Duration");

		time_t date;
		sscanf(Date.c_str(), "%li", &date);  // scan for unsigned long

		__COUT__ << "User name " << userInfo.username_ << " date " << date << " duration "
		         << Duration << std::endl;

		std::stringstream str;
		std::string       runType = StringMacros::decodeURIComponent(
            CgiDataUtilities::postData(cgiIn, "runTypeFilter"));
		std::string pluginName = CgiDataUtilities::postData(cgiIn, "runInfoPluginName");
		std::string runInfoUID = CgiDataUtilities::postData(cgiIn, "runInfoPluginUID");
		refreshRunDbViewer(date,
		                   Duration,
		                   &xmlOut,
		                   (std::ostringstream*)&str,
		                   runType,
		                   pluginName,
		                   runInfoUID);
		__COUT__ << str.str() << std::endl;
	}
	else if(requestType == "getRunConditionByID")
	{
		// returns Run conditions for currently condition_ID
		uint64_t condition_ID =
		    CgiDataUtilities::postDataAsUint64_t(cgiIn, "condition_ID");
		std::string pluginName = CgiDataUtilities::postData(cgiIn, "runInfoPluginName");
		std::string runInfoUID = CgiDataUtilities::postData(cgiIn, "runInfoPluginUID");
		getRunConditionByID(condition_ID, &xmlOut, pluginName, runInfoUID);
	}
	else
		__COUT__ << "requestType request not recognized." << std::endl;
}  //end request()

//==============================================================================
///	request
///		Handles Web Interface requests to RunDbViewer supervisor.
///		Does not refresh cookie for automatic update checks.
void RunDbViewerSupervisor::nonXmlRequest(const std::string& requestType,
                                          cgicc::Cgicc&      cgiIn,
                                          std::ostream&      out,
                                          const WebUsers::RequestUserInfo& /*userInfo*/)
{
	// Commands
	// RunConditionReport

	if(requestType == "RunConditionReport")
	{
		// Served as plain HTML: the per-subsystem condition blobs are ~1 MB of JSON,
		// far too large to push through the XML response escaper.
		uint64_t    runNumber  = CgiDataUtilities::getDataAsInt(cgiIn, "run");
		std::string pluginName = CgiDataUtilities::getData(cgiIn, "runInfoPluginName");
		std::string runInfoUID = CgiDataUtilities::getData(cgiIn, "runInfoPluginUID");

		auto htmlEscape = [](const std::string& s) {
			std::string o;
			o.reserve(s.size() + s.size() / 16);
			for(char c : s)
				switch(c)
				{
				case '&':
					o += "&amp;";
					break;
				case '<':
					o += "&lt;";
					break;
				case '>':
					o += "&gt;";
					break;
				default:
					o += c;
				}
			return o;
		};

		// JSON goes into <script type=application/json> blocks; '<' is escaped as
		// < (valid JSON) so a blob can never terminate the script element.
		auto jsonForScript = [](const std::string& s) {
			std::string o;
			o.reserve(s.size() + 64);
			for(char c : s)
				if(c == '<')
					o += "\\u003c";
				else
					o += c;
			return o;
		};

		out << "<!DOCTYPE HTML><html lang='en'><head><meta charset='utf-8'><title>Run "
		    << runNumber
		    << " conditions</title><style>"
		       "body{background:#5a4d3f;color:rgb(255,230,204);font-family:sans-serif;"
		       "padding:12px}"
		       "h1{margin:0 0 12px 0}h2{color:orange;margin:24px 0 4px 0}"
		       "h2 span{font-size:14px;color:rgb(255,230,204)}"
		       "nav a{color:rgb(180,207,237);margin-right:14px}"
		       "a.top,a.tool{color:rgb(180,207,237);font-size:13px;font-weight:normal;"
		       "margin-left:14px;text-decoration:none;cursor:pointer}"
		       "a.tool:hover,a.top:hover{text-decoration:underline}"
		       ".tree{background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:6px;"
		       "font-family:monospace;font-size:12px;line-height:1.5}"
		       ".tree details{margin-left:0}"
		       ".tree details>div{margin-left:1.6em;border-left:1px solid "
		       "rgba(255,230,204,0.15);"
		       "padding-left:6px}"
		       ".tree summary{cursor:pointer;list-style:none}"
		       ".tree summary::before{content:'\\25B8';display:inline-block;width:1.1em;"
		       "color:rgb(180,207,237)}"
		       ".tree details[open]>summary::before{content:'\\25BE'}"
		       ".tree .k{color:rgb(255,183,74)}"
		       ".tree .n{color:#9fd3ff}.tree .s{color:#d8e8a8}.tree .b{color:#f3a6ff}"
		       ".tree .z{color:#999;font-style:italic}"
		       ".tree .c{color:#aaa;font-size:11px;margin-left:6px}"
		       ".tree .leaf{padding-left:1.1em;word-break:break-all;white-space:pre-wrap}"
		       ".tree pre.raw{white-space:pre-wrap;word-break:break-all;margin:0}"
		       "</style></head><body>";
		out << "<h1 id='top'>Run " << runNumber << " conditions</h1>";

		std::vector<std::vector<std::string>> conditionRecords;
		try
		{
			std::unique_ptr<RunInfoVInterface> runInfoInterface(
			    makeRunInfo(pluginName, runInfoUID));
			if(runInfoInterface == nullptr)
			{
				__SS__ << "runInfo Db interface plugin construction failed of "
				       << pluginName << __E__;
				__SS_THROW__;
			}
			conditionRecords = runInfoInterface->getRunConditionByID(runNumber);
		}
		catch(const std::exception& e)
		{
			out << "<p style='color:#f66'>Error: " << htmlEscape(e.what())
			    << "</p></body></html>";
			return;
		}

		out << "<nav>";
		for(const auto& rec : conditionRecords)
			out << "<a href='#" << htmlEscape(rec[0]) << "'>" << htmlEscape(rec[0])
			    << "</a>";
		out << "</nav>";

		for(const auto& rec : conditionRecords)
		{
			const std::string sub = htmlEscape(rec[0]);
			out << "<h2 id='" << sub << "'>" << sub << " <span>" << htmlEscape(rec[1])
			    << "</span>"
			    << "<a class='top' href='#top' title='Back to top'>&#8679; top</a>"
			    << "<a class='tool' onclick=\"expandAll('" << sub << "')\">expand all</a>"
			    << "<a class='tool' onclick=\"collapseAll('" << sub
			    << "')\">collapse all</a>"
			    << "<a class='tool' onclick=\"toggleRaw('" << sub << "')\">raw</a></h2>"
			    << "<script type='application/json' id='json-" << sub << "'>"
			    << jsonForScript(rec[2]) << "</script>"
			    << "<div class='tree' id='tree-" << sub << "'></div>";
		}

		// Collapsible JSON tree. Children are built lazily on first open so the
		// ~1 MB trigger blob does not create 100k DOM nodes up front.
		out << R"JS(<script>
function fmtLeaf(v){
  if(v===null) return "<span class='z'>null</span>";
  switch(typeof v){
    case 'number': return "<span class='n'>"+v+"</span>";
    case 'boolean': return "<span class='b'>"+v+"</span>";
    default: return "<span class='s'>"+JSON.stringify(v).replace(/&/g,'&amp;').replace(/</g,'&lt;')+"</span>";
  }
}
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function buildNode(key, val, depth){
  var isObj = val!==null && typeof val==='object';
  var keyHtml = key===null ? '' : "<span class='k'>"+esc(key)+"</span>: ";
  if(!isObj){
    var d=document.createElement('div'); d.className='leaf';
    d.innerHTML = keyHtml + fmtLeaf(val); return d;
  }
  var isArr = Array.isArray(val), keys = isArr ? null : Object.keys(val);
  var n = isArr ? val.length : keys.length;
  var det=document.createElement('details');
  var sum=document.createElement('summary');
  sum.innerHTML = keyHtml + (isArr?'[':'{') + "<span class='c'>"+n+(isArr?' items':' keys')+"</span>" + (isArr?']':'}');
  det.appendChild(sum);
  var body=document.createElement('div'); det.appendChild(body);
  det._built=false; det._val=val; det._isArr=isArr; det._depth=depth;
  det.addEventListener('toggle', function(){ if(det.open) fillNode(det); });
  if(depth<1){ det.open=true; fillNode(det); }
  return det;
}
function fillNode(det){
  if(det._built) return; det._built=true;
  var val=det._val, body=det.lastChild, frag=document.createDocumentFragment();
  if(det._isArr){ for(var i=0;i<val.length;++i) frag.appendChild(buildNode(i,val[i],det._depth+1)); }
  else { Object.keys(val).sort().forEach(function(k){ frag.appendChild(buildNode(k,val[k],det._depth+1)); }); }
  body.appendChild(frag);
}
function renderTree(sub){
  var tree=document.getElementById('tree-'+sub);
  var txt=document.getElementById('json-'+sub).textContent;
  var obj; try{ obj=JSON.parse(txt); }catch(e){ tree.innerHTML="<pre class='raw'>"+esc(txt)+"</pre>"; return; }
  tree._obj=obj; tree._raw=false; tree.innerHTML='';
  tree.appendChild(buildNode(null,obj,0));
}
function setAll(sub, open){
  var tree=document.getElementById('tree-'+sub);
  if(tree._raw) return;
  var pending=[tree], d;
  while(pending.length){
    d=pending.pop();
    var dets=d.querySelectorAll(':scope > details, :scope > div > details');
    for(var i=0;i<dets.length;++i){
      if(open){ fillNode(dets[i]); dets[i].open=true; pending.push(dets[i].lastChild); }
      else { dets[i].open=false; pending.push(dets[i].lastChild); }
    }
  }
}
function expandAll(sub){ setAll(sub,true); }
function collapseAll(sub){ setAll(sub,false); var t=document.getElementById('tree-'+sub); var top=t.querySelector(':scope > details'); if(top) top.open=true; }
function toggleRaw(sub){
  var tree=document.getElementById('tree-'+sub);
  if(tree._raw){ renderTree(sub); return; }
  tree._raw=true; tree.innerHTML="<pre class='raw'>"+esc(JSON.stringify(tree._obj,null,2))+"</pre>";
}
document.querySelectorAll("script[type='application/json']").forEach(function(s){ renderTree(s.id.substr(5)); });
</script>)JS";

		out << "</body></html>";
		__COUT__ << "RunConditionReport for run " << runNumber
		         << " records = " << conditionRecords.size() << __E__;
	}
	else
		__COUT__ << "requestType request not recognized." << std::endl;
}  //end nonXmlRequest()

//==============================================================================
/// getRunTypeList
///		if xmlOut, then output categories to xml
///		if out, then output to stream
void RunDbViewerSupervisor::getRunTypeList(HttpXmlDocument*    xmlOut,
                                           std::ostringstream* out)
{
	std::vector<std::string> exps;

	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_RUNTYPE, activeRunType_);

	for(unsigned int i = 0; i < exps.size(); ++i)  // loop categories
	{
		if(xmlOut)
			xmlOut->addTextElementToData(XML_RUNTYPE_LIST, exps[i]);
		if(out)
			*out << exps[i] << std::endl;
	}
}  //end getRunTypeList()

//==============================================================================
///	refreshRunDbViewer
///		returns all the rundbviewer data for active category from starting date and back in
/// time for 			duration total number of days.
///		e.g. date = today, and duration = 1 returns rundbviewer for today from active
/// category 		The entries are returns from oldest to newest
void RunDbViewerSupervisor::refreshRunDbViewer(time_t              date,
                                               uint32_t            duration,
                                               HttpXmlDocument*    xmlOut,
                                               std::ostringstream* out,
                                               std::string         runType,
                                               const std::string&  pluginName,
                                               const std::string&  runInfoUID)
{
	if(xmlOut)
		xmlOut->addTextElementToData(XML_ACTIVE_RUNTYPE, runType);  // for success

	char dayIndexStr[20];

	if(xmlOut)
		xmlOut->addTextElementToData(XML_STATUS, "1");  // for success
	if(out)
		*out << __COUT_HDR_FL__ << "Today: " << date << std::endl;

	if(date == 0)
		date = time(NULL);
	unsigned int endTime   = date;
	unsigned int startTime = endTime - (60 * 60 * 24) * duration;
	__COUT__ << "Start time " << startTime << " End time " << endTime << __E__;
	__COUT__ << "Today: " << date << __E__;

	sprintf(dayIndexStr, "%lu", date * 0);
	if(xmlOut)
		xmlOut->addTextElementToData(XML_MOST_RECENT_DAY,
		                             dayIndexStr);  // send most recent day index

	std::unique_ptr<RunInfoVInterface> runInfoInterface = nullptr;

	auto runInfo = makeRunInfo(pluginName, runInfoUID);

	if(runInfo == nullptr)
	{
		__SS__ << "runInfo Db interface plugin construction failed of " << pluginName
		       << __E__;
		__SS_THROW__;
	}

	try
	{
		runInfoInterface.reset(runInfo);
	}
	catch(...)
	{
		;
	}

	if(runInfoInterface == nullptr)
	{
		__SS__ << "runInfo Db interface plugin construction failed of " << pluginName
		       << __E__;
		__SS_THROW__;
	}

	auto                                  dbStart = std::chrono::steady_clock::now();
	std::vector<std::vector<std::string>> runRecords =
	    runInfoInterface->getRunRecords(startTime, endTime, "", runType);
	__COUT__ << "getRunRecords: " << runRecords.size() << " runs in "
	         << std::chrono::duration<double>(std::chrono::steady_clock::now() - dbStart)
	                .count()
	         << " s" << __E__;

	if(xmlOut)
	{
		int i = 0;
		for(const auto& runData : runRecords)
		{
			auto entryEl =
			    xmlOut->addTextElementToData(XML_RUNDBVIEWER_ENTRY, runData[0]);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_NUMBER, runData[0], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_TIME, runData[1], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_TYPE, runData[2], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_ARTDAQ_PARTITION, runData[3], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_HOST_NAME, runData[4], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_CONDIOTION_ID, runData[5], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_NAME, runData[6], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_CONFIGURATION_VERSION, runData[7], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_NAME, runData[8], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_CONTEXT_VERSION, runData[9], entryEl);
			// xmlOut->addTextElementToParent(
			//     XML_RUNDBVIEWER_ENTRY_RUN_ONLINE_SOFTWARE_VERSION, runData[10], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_SHIFTER_NOTE, runData[6], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_START_TIME, runData[7], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_STOP_TIME, runData[8], entryEl);
			xmlOut->addTextElementToParent(
			    XML_RUNDBVIEWER_ENTRY_RUN_STATUS, runData[9], entryEl);
			if(runData.size() > 11)
				xmlOut->addTextElementToParent(
				    XML_RUNDBVIEWER_ENTRY_RUN_END_NOTE, runData[11], entryEl);
			i++;

			// runData[10] (if the plugin supplies it): ';'-separated subsystems, each
			// 'sub|alias|cfgName|cfgKey|ctxName|ctxKey|bbName|bbKey'. One compact node
			// per subsystem keeps the XML node count (and output time) low.
			if(runData.size() > 10 && !runData[10].empty())
			{
				const std::string& all = runData[10];
				size_t             b   = 0;
				while(b < all.size())
				{
					size_t e = all.find(';', b);
					if(e == std::string::npos)
						e = all.size();
					if(e > b)
						xmlOut->addTextElementToParent(
						    XML_RUNDBVIEWER_ENTRY_SUBSYSTEM_CONFIG_RECORD,
						    all.substr(b, e - b),
						    entryEl);
					b = e + 1;
				}
			}
		}
		__COUT__ << "refreshRunDbViewer built xml for " << i << " runs; total "
		         << std::chrono::duration<double>(std::chrono::steady_clock::now() -
		                                          dbStart)
		                .count()
		         << " s" << __E__;
	}
}  //end refreshRunDbViewer()

//==============================================================================
///	getRunConditionByID
///		returns run conditions by condition_ID
void RunDbViewerSupervisor::getRunConditionByID(uint64_t           condition_ID,
                                                HttpXmlDocument*   xmlOut,
                                                const std::string& pluginName,
                                                const std::string& runInfoUID)
{
	std::unique_ptr<RunInfoVInterface> runInfoInterface = nullptr;
	try
	{
		runInfoInterface.reset(makeRunInfo(pluginName, runInfoUID));
	}
	catch(...)
	{
		;
	}

	if(runInfoInterface == nullptr)
	{
		__SS__ << "runInfo Db interface plugin construction failed of " << pluginName
		       << __E__;
		__SS_THROW__;
	}

	if(xmlOut)
	{
		xmlOut->addTextElementToData("condition_id", std::to_string(condition_ID));

		// Mu2e: one record per subsystem [subsystem, create_time, settings JSON]
		std::vector<std::vector<std::string>> conditionRecords =
		    runInfoInterface->getRunConditionByID(condition_ID);
		int i = 0;
		for(const auto& rec : conditionRecords)
		{
			auto recEl = xmlOut->addTextElementToData("condition_record", rec[0]);
			xmlOut->addTextElementToParent("subsystem", rec[0], recEl);
			xmlOut->addTextElementToParent("commit_time", rec[1], recEl);
			xmlOut->addTextElementToParent("blob", rec[2], recEl);
			i++;
		}

		__COUT__ << "getRunConditionByID - records = " << i << __E__;
	}
}  //end getRunConditionByID()
