//////////////////////////////////////////////////////////////////////////
//////// Functions and variables to be included by other pages ///////////
//////////////////////////////////////////////////////////////////////////
//
// To make a Multi-Select Box
//  	create a div element and call in JavaScript...
//
//	MultiSelectBox.createSelectBox(el,name,title,vals)
//
//	This function is called by user to actually create the multi select box
// 	These parameters are optional and can be omitted or set to 0:
//		keys, types, handler, noMultiSelect,mouseOverHandler,iconURLs,mouseDownHandler,
//		mouseUpHandler,
//		requireCtrlMultiClick,titles
// 	Note: handler is the string name of the function (put in quotes).
//	Note: requireCtrlMultiClick enables CONTROL or SHIFT key selections
//		- sometimes CONTROL forces right click in browser, so SHIFT is needed
//
// 	Can use MultiSelectBox.initMySelectBoxes after manually setting the mySelects_ array
//
//
//
// Example selection handler:
//
//        function exampleSelectionHandler(el)
//        {
//            var splits = el.id.split('_');
//            var i = splits[splits.length-1] | 0;
//            MultiSelectBox.dbg("Chosen element index:",i,
//            		" key:",el.getAttribute("key-value"),
//            		" type:",el.getAttribute("type-value"));
//            for(var s in MultiSelectBox.mySelects_[el.parentElement.id])
//                MultiSelectBox.dbg("selected: ",MultiSelectBox.mySelects_[el.parentElement.id][s]);
//
//        }
//
// Example usage: /WebPath/html/MultiSelectBoxTest.html
//
//////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////


//function list:
//	createSelectBox(el,name,title,vals,keys,types,
//		handler,noMultiSelect,mouseOverHandler,iconURLs,mouseDownHandler,
//		mouseUpHandler,
//		requireCtrlMultiClick,titles,mouseMoveHandler)
//	initMySelectBoxes(clearPreviousSelections, targetId)
//
//	hasClass(ele,cls)
//	addClass(ele,cls)
//	removeClass(ele,cls)
//	toggleClass(ele,cls)
//
//	getSelectedIndex(el)
//	getSelectionArray(el)
//	getSelectedCount(el)
//	getSelectionElementByIndex(el,i)
//	setSelectionElementByIndex(el,i,selected)
//	myOptionSelect(option, index, isSingleSelect, event)
//
// 	showSearch(boxid)
//	searchSelect(id,el,altstr)
//	performSearchSelect(id,el,altstr)
//	makeSearchBar(id)

var selected = [];
var MultiSelectBox = MultiSelectBox || {}; //define MultiSelectBox namespace

if (0 && window.console && console && console.log)
    MultiSelectBox.dbg = console.log.bind(window.console);
else
    MultiSelectBox.dbg = function () { ; } //do nothing

//var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;

function $(id) { return document.getElementById(id); }

/////////////////////////////////////////////////////////////////////////
//global variables

MultiSelectBox.mySelects_ = {};
MultiSelectBox.omnis_ = {};
MultiSelectBox.isSingleSelect_ = {};
MultiSelectBox.lastOptSelect_ = {};  //maintain last opt clicked

MultiSelectBox.selInitBoxHeight_ = {}; //init with first showing of search box in showSearch()
MultiSelectBox.SEL_INIT_PADDING = 5;

MultiSelectBox.requireCtrlMultiClick_ = {};

/////////////////////////////////////////////////////////////////////////
//function definitions

MultiSelectBox.hasClass = function (ele, cls) {
    return !!ele.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
} //end hasClass()

MultiSelectBox.addClass = function (ele, cls) {
    if (!MultiSelectBox.hasClass(ele, cls)) ele.className += " " + cls;
} //end addClass()

MultiSelectBox.removeClass = function (ele, cls) {
    if (MultiSelectBox.hasClass(ele, cls)) {
        var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        ele.className = ele.className.replace(reg, '');
    }
} //end removeClass()

MultiSelectBox.toggleClass = function (ele, cls) {
    //returns true if the element had the class
    if (MultiSelectBox.hasClass(ele, cls)) {
        var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
        ele.className = ele.className.replace(reg, '');
        return true;
    }
    else {
        ele.className += " " + cls;
        return false;
    }
} //end toggleClass()

MultiSelectBox.getSelectedIndex = function (el) {
    try //try to treat as selection box element first
    {
        var selects = MultiSelectBox.mySelects_[el.getElementsByClassName("mySelect")[0].id];
        for (var i = 0; i < selects.length; ++i)
            if (selects[i]) return i;
        return -1; //no index selected
    }
    catch (e) { } // ignore error and treat as selected element now

    var splits = el.id.split('_');
    return splits[splits.length - 1] | 0;
} //end getSelectedIndex()

MultiSelectBox.getSelectionArray = function (el) {
    if (!el) return [];

    //console.log(el.id);
    if (el.parentElement.id.indexOf("selbox-") == 0)
        return MultiSelectBox.mySelects_[el.parentElement.id];
    else {
        var els = el.getElementsByClassName("mySelect");
        if (!els.length || !els[0].id) return [];
        return MultiSelectBox.mySelects_[els[0].id];
    }
} //end getSelectionArray()


MultiSelectBox.getSelectedCount = function (el) {
    try //try to treat as selection box element first
    {
        var selects = MultiSelectBox.mySelects_[el.getElementsByClassName("mySelect")[0].id];
        var cnt = 0;
        for (var i = 0; i < selects.length; ++i)
            if (selects[i]) ++cnt;
        return cnt;
    }
    catch (e) { } // ignore error and treat as selected element now

    return 0;
} //end getSelectedIndex()

MultiSelectBox.getSelectionElementByIndex = function (el, i) {
    if (el.parentElement.id.indexOf("selbox-") == 0)
        return document.getElementById(el.parentElement.parentElement.
            getElementsByClassName("mySelect")[0].id +
            "-option_" + i);
    else
        return document.getElementById(el.getElementsByClassName("mySelect")[0].id +
            "-option_" + i);
} //end getSelectionElementByIndex()

MultiSelectBox.setSelectionElementByIndex = function (el, i, selected) {
    var name = el.getElementsByClassName("mySelect")[0].id;

    if (!MultiSelectBox.isSingleSelect_[name] &&
        i == -1) //apply to all
    {
        var size = MultiSelectBox.mySelects_[name].length;
        for (var opt = 0; opt < size; opt++)
            MultiSelectBox.mySelects_[name][opt] = selected ? 1 : 0;
        return;
    }

    if (MultiSelectBox.isSingleSelect_[name] &&
        selected) //if true, only allow one select at a time, so deselect others
    {
        var size = MultiSelectBox.mySelects_[name].length;
        for (var opt = 0; opt < size; opt++)
            MultiSelectBox.mySelects_[name][opt] = 0;
    }
    MultiSelectBox.mySelects_[name][i] = selected ? 1 : 0;
} //end setSelectionElementByIndex()

//for multiple selects to behave like checkboxes
MultiSelectBox.myOptionSelect = function (option, index, isSingleSelect, event) {
    var select = option.parentElement;
    var id = select.getAttribute("id");
    var selectList = MultiSelectBox.mySelects_[id];
    var size = select.childNodes.length;

    if (event)
        MultiSelectBox.dbg("Shift click = " + event.shiftKey);

    if (event)
        MultiSelectBox.dbg("Control click = " + event.ctrlKey +
            "," + event.metaKey);

    //if shift.. then select or deselect
    //	(based on value at MultiSelectBox.lastOptSelect_[id]) from
    //	MultiSelectBox.lastOptSelect_[id]
    //	to this click

    //MultiSelectBox.dbg(selectList);
    if (!selectList || selectList.length != size) { //first time, populate select list
        MultiSelectBox.mySelects_[id] = [];
        MultiSelectBox.lastOptSelect_[id] = -1;
        selectList = MultiSelectBox.mySelects_[id];
        for (var opt = 0; opt < size; opt++)
            selectList.push(0);
    }

    //toggle highlighted style and global array
    MultiSelectBox.toggleClass(option, "optionhighlighted");
    selectList[index] ^= 1;

    if (isSingleSelect ||   //if true, only allow one select at a time, so deselect others
        (MultiSelectBox.requireCtrlMultiClick_[id] &&
            !event.ctrlKey && !event.metaKey && !event.shiftKey))
        for (var opt = 0; opt < size; opt++) {
            //fixed, now works for any order option IDs. Goes by index only.
            var cindex = select.childNodes[opt].id.split("_");
            cindex = cindex[cindex.length - 1];

            if (cindex == index) continue;
            else if (selectList[cindex] == 1) {
                MultiSelectBox.toggleClass(select.childNodes[opt], "optionhighlighted");
                selectList[cindex] = 0;
            }
        }
    else if (event.shiftKey &&
        MultiSelectBox.lastOptSelect_[id] != -1) {
        //if shift.. then select or deselect
        //	(based on value at MultiSelectBox.lastOptSelect_[id]) from
        //	MultiSelectBox.lastOptSelect_[id]
        //	to this click

        var lo = MultiSelectBox.lastOptSelect_[id] < index ?
            MultiSelectBox.lastOptSelect_[id] : index;
        var hi = MultiSelectBox.lastOptSelect_[id] < index ?
            index : MultiSelectBox.lastOptSelect_[id];

        //MultiSelectBox.dbg("lo ",lo," hi ",hi);
        //handle multi shift click
        for (var opt = lo; opt <= hi; opt++) {
            //MultiSelectBox.dbg(selectList[opt]," vs ",
            //		selectList[MultiSelectBox.lastOptSelect_[id]]);
            if (selectList[opt] !=
                selectList[MultiSelectBox.lastOptSelect_[id]]) //if not matching selected value
            {
                //MultiSelectBox.dbg("flip");
                //toggle highlighted style and global array
                MultiSelectBox.toggleClass(select.childNodes[opt], "optionhighlighted");
                selectList[opt] ^= 1;
            }
        }
    }

    MultiSelectBox.dbg(selectList);
    selected = selectList;
    MultiSelectBox.lastOptSelect_[id] = index; //save selection
} //end myOptionSelect()

//This function is called by user to actually create the multi select box
// These parameters are optional and can be omitted or set to 0:
//		keys, types, handler, noMultiSelect, mouseOverHandler,
//		iconURLs, mouseDownHandler, mouseUpHandler,
//		requireCtrlMultiClick, titles, mouseMoveHandler, titleHeightOffset
// Note: handler is the string name of the function
MultiSelectBox.createSelectBox = function (el, name, title, vals, keys, types,
    handler, noMultiSelect, mouseOverHandler, iconURLs, mouseDownHandler,
    mouseUpHandler,
    requireCtrlMultiClick, titles,
    mouseMoveHandler, titleHeightOffset) {
    if (!el) {
        MultiSelectBox.dbg("Invalid Element given to MultiSelectBox: " + el);
        throw new Error("Invalid Element given to MultiSelectBox: " + el); return;
    }

    console.log("el.style.width", el.style.width,"el.offsetWidth", el.offsetWidth);
    if (!el.offsetWidth)
        el.style.width = "400px";

    el.innerHTML = ""; //delete current contents

    name = "selbox-" + name;
    MultiSelectBox.addClass(el, "multiselectbox"); //add multiselectbox class to div

    MultiSelectBox.omnis_[name] = el;
    MultiSelectBox.isSingleSelect_[name] = noMultiSelect;
    MultiSelectBox.lastOptSelect_[name] = -1; //default to nothing selected
    MultiSelectBox.selInitBoxHeight_[name] = 0; //init with first showing of search box in showSearch()
    MultiSelectBox.requireCtrlMultiClick_[name] = requireCtrlMultiClick;

    //searchglass=28x28, margin=5, vscroll=16, border=1
    var msW = (!el.offsetWidth ? el.style.width.split('p')[0] : el.offsetWidth) - 28 - 5 - 16 - 2;
    var msH = (!el.offsetHeight ? el.style.height.split('p')[0] : el.offsetHeight) - 40 - 2;
    if (msH <= 0) msH = 200; //default to 200px if no height specified

    el = document.createElement("div"); //create element within element
    MultiSelectBox.omnis_[name].appendChild(el);

    var str = "";

    if (title) {
        if (!titleHeightOffset) titleHeightOffset = 0;
        str += "<div id='" + name + "header' " +
            "style='margin-top:20px; width:100%; white-space:nowrap; height:" +
            (21 + titleHeightOffset) + "px'><b>"; //had to add height for new Chrome bug
        str += title;
        str += "</b></div>";
    }

    if (!keys) keys = vals;
    if (!types) types = vals;

    //make selbox
    str += "<div id='" + name + "-anchorDiv' style='position:relative'><table cellpadding='0' cellspacing='0'>";
    str += "<tr><td>";
    str += "<div class='mySelect' unselectable='on' id='" +
        name + "' style='float:left;" +
        "width: " + (msW) + "px;" +
        "height: " + (msH) + "px;" +
        "' name='" + name + "' ";

    str += "onmousemove='";
    if (mouseMoveHandler && (typeof mouseMoveHandler) == "string") //if mouseMoveHandler supplied as string
        str += mouseMoveHandler + "(this,event);"; //user selection mouseMoveHandler
    else if (mouseMoveHandler) //assume it is a function
        str += mouseMoveHandler.name + "(this,event);"; //user selection mouseMoveHandler
    str += "' ";
    str += ">";

    for (var i = 0; i < keys.length; ++i)//cactus length
    {
        str += "<div  class='myOption' " +
            "id='" + name + "-option_" + i + "' " +
            "onclick='MultiSelectBox.myOptionSelect(this, " + i + "," +
            noMultiSelect + ", event); ";
        if (handler && (typeof handler) == "string") //if handler supplied as string
            str += handler + "(this,event);"; //user selection handler
        else if (handler) //assume it is a function
            str += handler.name + "(this,event);"; //user selection handler
        str += "' ";

        str += "onmouseover='";
        if (mouseOverHandler && (typeof mouseOverHandler) == "string") //if mouseOverHandler supplied as string
            str += mouseOverHandler + "(this,event);"; //user selection mouseOverHandler
        else if (mouseOverHandler) //assume it is a function
            str += mouseOverHandler.name + "(this,event);"; //user selection mouseOverHandler
        str += "' ";

        str += "onmousedown='";
        if (mouseDownHandler && (typeof mouseDownHandler) == "string") //if mouseDownHandler supplied as string
            str += mouseDownHandler + "(this,event);"; //user selection mouseDownHandler
        else if (mouseDownHandler) //assume it is a function
            str += mouseDownHandler.name + "(this,event);"; //user selection mouseDownHandler
        str += "' ";

        str += "onmouseup='";
        if (mouseUpHandler && (typeof mouseUpHandler) == "string") //if mouseUpHandler supplied as string
            str += mouseUpHandler + "(this,event);"; //user selection mouseUpHandler
        else if (mouseUpHandler) //assume it is a function
            str += mouseUpHandler.name + "(this,event);"; //user selection mouseUpHandler
        str += "' ";

        if (titles)
            str += "title='" + titles[i] + "' ";

        str += "key-value='" + keys[i] + "' type-value='" +
            types[i] + "'>";  //index, key, ids available as attributes
        if (iconURLs && iconURLs[i]) //add image if available
        {
            if (iconURLs[i][0] != '=')
                str += "<img style='width:32px; height:32px; margin: 0px 5px -8px 0;' " +
                    "src='" +
                    iconURLs[i] + "' />";
            else //alt text (like an icon)
                str += "<div style='width:32px; height:32px; margin: 0px 5px -12px 0; overflow: hidden; background-color: rgba(255, 255, 255, .2);" +
                    " font-size: 10px; white-space: normal; display: inline-block; text-align: center; padding-top: 4px;' " +
                    ">" + iconURLs[i].substr(1) + "</div>";
        }

        str += vals[i];
        str += "</div>";
    }
    str += "</div>";
    //close selbox

    str += "</td><td valign='top'>";
    // append search bar
    str += MultiSelectBox.makeSearchBar(name);
    // str = "<img src='/WebPath/images/windowContentImages/multiselectbox-magnifying-glass.jpg' " +
    // 			" style='float:left' height='28' width='28' alt='&#128269;' ";
    // str += "onclick = 'MultiSelectBox.showSearch(\"" + name + "\");' title='Search' class='searchimg'>";

    str += "</td></table>";
    str += "<input id='" + name + "search'></input></div>";
    el.innerHTML = str;
    // el.style.position = "relative";

    //setup search box
    var searchBox = el.getElementsByTagName('input')[0];//document.getElementById(name + "search"); //document.createElement(name + "search");

    if (msH > 200) {	//provide a minimum width for looks (to avoid long and skinny)
        var el = document.getElementById(name);
        if (msW < 200)
            el.style.width = 200 + "px";
    }

    var onchange = 'MultiSelectBox.searchSelect("' + name + '",this)';

    searchBox.setAttribute("class", "hidden");
    searchBox.setAttribute('type', 'text');
    searchBox.setAttribute('id', name + "search");
    searchBox.setAttribute("onpaste", onchange);
    searchBox.setAttribute("oncut", onchange);
    searchBox.setAttribute("onkeydown", onchange);
    searchBox.setAttribute("onkeyup", onchange);
    searchBox.setAttribute("onkeypress", onchange);
    searchBox.setAttribute("onselect", onchange);



} //end createSelectBox()

//for initializing the highlights if selects are made "manually" (without clicking)
MultiSelectBox.initMySelectBoxes = function (clearPreviousSelections, targetId) {
    var divs = document.getElementsByClassName('mySelect');
    for (var el = 0; el < divs.length; el++) {
        var select = divs[el];

        var id = select.getAttribute("id");

        if (targetId && targetId != "" && targetId != id &&
            ("selbox-" + targetId) != id) continue; //skip non-targets

        var options = select.childNodes;
        MultiSelectBox.lastOptSelect_[id] = -1;
        if (!MultiSelectBox.mySelects_[id] ||
            MultiSelectBox.mySelects_[id].length > options.length) {//if first time drawing select box OR size was reduced
            if (!MultiSelectBox.mySelects_[id] || clearPreviousSelections)
                MultiSelectBox.mySelects_[id] = [];
            for (var opt = 0; opt < options.length; opt++) {
                if (clearPreviousSelections || opt >= MultiSelectBox.mySelects_.length)
                    MultiSelectBox.mySelects_[id].push(0);
                options[opt].setAttribute("unselectable", "on");//make not selectable for ie<10
            }
            //remove any extras
            while (MultiSelectBox.mySelects_[id].length > options.length)
                MultiSelectBox.mySelects_[id].splice(options.length, 1);
        }
        else { 	//if repaint: set highlighted options
            MultiSelectBox.dbg("repaint");

            //if more elements were added, expand the selects array
            for (var opt = MultiSelectBox.mySelects_[id].length; opt < options.length; opt++) {
                MultiSelectBox.mySelects_[id].push(0);
                options[opt].setAttribute("unselectable", "on");//make not selectable for ie<10
            }

            //highlight properly according to mySelects_ array
            for (var opt = 0; opt < options.length; opt++) {
                if (clearPreviousSelections)
                    MultiSelectBox.mySelects_[id][opt] = 0; //clear

                if (MultiSelectBox.mySelects_[id][opt]) {
                    //MultiSelectBox.dbg(opt);
                    MultiSelectBox.addClass(options[opt], "optionhighlighted");
                    // previously used: block: 'nearest', inline: 'start' (broke desktop window scrolling)
                    options[opt].scrollIntoView({
                        // ensure highlighted options are visible to the user
                        block: "nearest",
                        inline: "nearest",
                        behavior: "instant"
                    });
                }
                else
                    MultiSelectBox.removeClass(options[opt], "optionhighlighted");
            }
        }
    }
} //end initMySelectBoxes()

//for searching selectboxes (works for standard "selects" and "mySelects")
MultiSelectBox.showSearch = function (boxid) {
    var searchBox = $(boxid + "search");

    function localPlaceSearchBox() {
        //Goal: place searchBox search input correctly in table content
        //	irregardless of user div having style.position = normal/static, absolute, relative

        var margin = 5;
        var offsety = 0; //$(boxid + "header")?20:0;
        var offsetx = 0;
        var selRect = $(boxid).getBoundingClientRect();

        searchBox.style.position = "absolute";
        searchBox.style.top = (offsety + margin) + "px";
        searchBox.style.left = (offsetx + margin) + "px";
        searchBox.style.width = (selRect.width - margin * 2 - 30) + "px";//(selRect.width-margin*2-14)+"px";

    } //end localPlaceSearchBox()

    if (!MultiSelectBox.selInitBoxHeight_[boxid])	//init if not yet defined
    {
        MultiSelectBox.selInitBoxHeight_[boxid] = $(boxid).clientHeight; //as soon as hidden is toggled H changes

        localPlaceSearchBox();
    }



    //RAR decided on 2/2/2017 to not show er
    //MultiSelectBox.toggleClass($(boxid+"searchErr"),"hidden");
    // $(boxid+"searchErr").innerHTML = "";

    if (MultiSelectBox.toggleClass(searchBox, "hidden")) {
        $(boxid).style.height = (MultiSelectBox.selInitBoxHeight_[boxid] - 47) + "px";
        $(boxid).style.paddingTop = "42px";
        //$(boxid).childNodes[0].style.marginTop="42px";
        //searchBox.style.left = ($(boxid).offsetLeft-8) + "px"
        searchBox.focus();
        MultiSelectBox.searchSelect(boxid, searchBox);
    }
    else {
        MultiSelectBox.searchSelect(boxid, null, '');
        $(boxid).style.paddingTop = MultiSelectBox.SEL_INIT_PADDING + "px";
        $(boxid).style.height = (MultiSelectBox.selInitBoxHeight_[boxid] - 10) + "px";
        //$(boxid).childNodes[0].style.marginTop="initial";
    }
} //end showSearch()

MultiSelectBox.searchTimeout_ = null;

MultiSelectBox.searchSelect = function (id, el, altstr) {
    //wait 100ms so that it does not keep constantly searching as user types only when they are done typing
    if (MultiSelectBox.searchTimeout_) {
        clearTimeout(MultiSelectBox.searchTimeout_);
    }
    MultiSelectBox.searchTimeout_ = setTimeout(function () { MultiSelectBox.performSearchSelect(id, el, altstr); }, 100);
} //end searchSelect()

MultiSelectBox.performSearchSelect = function (id, el, altstr) {
    var searchstr;
    if (altstr !== undefined) {
        searchstr = altstr;
    }
    else {
        searchstr = el.value;
    }
    MultiSelectBox.searchTimeout_ = null;
    var select = $(id).childNodes;

    // MultiSelectBox.dbg("END OF TIMEOUT FOR   : "+searchstr);

    var re; //regular expression
    // $(id+"searchErr").innerHTML = "";
    try {
        re = new RegExp(searchstr, 'i');
    }
    catch (err) {		//invalid regular expression
        // $(id+"searchErr").innerHTML = err.message +
        // 		" <a href='https://regex101.com/' target='_blank'>(help)</a>";
        re = "";
    }

    for (var opt = 0; opt < select.length; opt++) {
        var option = select[opt];

        //MultiSelectBox.dbg("opt: " + opt);

        if (option.tagName == 'INPUT') { continue; }
        var html = option.innerHTML;

        //MultiSelectBox.dbg("tagName: " + option.tagName);

        //first set the hidden to unhidden and unbold the bolded
        if (MultiSelectBox.hasClass(option, "hidden"))
            MultiSelectBox.removeClass(option, "hidden");
        else
            option.innerHTML = html = html.replace("<b><u>", "").replace("</u></b>", "");

        if (searchstr == "") continue; //show all if no search str

        var text = option.textContent; //search only the text (assume that is val
        var endOfImgIndex = html.indexOf(">");
        var index = text.search(re);
        var matchedText = (text.match(re) || [[]])[0]; //returns the matched string within an array or null (when null take [[]])
        var len = matchedText.length; // so we want length of element 0
        //MultiSelectBox.dbg(text+' '+index);
        index = html.indexOf(matchedText, endOfImgIndex);	//try to find in html text

        if (!len) 		//if searchstr not in option innerHTML
            MultiSelectBox.addClass(option, "hidden");
        else if (index != -1)		//make searched string bold (if possible - must be contiguous)
            option.innerHTML = html.slice(0, index) + "<b><u>" +
                html.slice(index, index + len) +
                "</u></b>" + html.slice(index + len);
    }
} //end performSearchSelect()

MultiSelectBox.makeSearchBar = function (id) {
    var interval;
    function addSearchBox() {
        var select = $(id);
        if (select) {
            if (!MultiSelectBox.mySelects_[id])
                MultiSelectBox.mySelects_[id] = []; //initialize to empty the selected items

            clearInterval(interval);
        }
    }

    interval = setInterval(addSearchBox, 50);

    imgstr = "<img src='/WebPath/images/windowContentImages/multiselectbox-magnifying-glass.jpg' " +
        " style='float:left' height='28' width='28' alt='&#128269;' ";
    imgstr += "onclick = 'MultiSelectBox.showSearch(\"" + id + "\");' title='Search' class='searchimg'>";
    return imgstr;
} //end makeSearchBar()
