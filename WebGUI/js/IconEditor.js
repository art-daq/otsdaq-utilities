var iconTable_wrapper;
var iconDropdown_wrapper;
var save_wrapper;
var currentSelectedValue_;
var megaLibrary_;
var changesMade_ = false;
var saveClicked_ = false;

function init(){
	megaLibrary_ = new Array();
	makeServerRequest("");
}

function finishInit(){

	iconTable_wrapper = document.getElementById("iconTable");
	iconDropdown_wrapper = document.getElementById("iconDropdown");
	save_wrapper = document.getElementById("save");
	currentSelectedValue_ = "";
	chooseIcon();

}

function chooseIcon(){
	iconDropdown_wrapper.innerHTML = "";
	var icon_list = document.createElement("select");
	iconDropdown_wrapper.appendChild(icon_list);

	checkForChanges();

	//Dan, I added the first option to be "Select" so that the user must pick something to call onchange -Ethan
	var iconOption = document.createElement("option");
	icon_list.appendChild(iconOption);
	iconOption.value="select";
	iconOption.innerHTML="Select";

	iconOption = document.createElement("option");
	icon_list.appendChild(iconOption);
	iconOption.value="new";
	iconOption.innerHTML="Create New Icon";
	icon_list.setAttribute("onchange","iconSelected(this.value)");

	for(a = 0; a < megaLibrary_.length; a++)
	{
		iconOption = document.createElement("option");
		icon_list.appendChild(iconOption);
		iconOption.value = a;
		iconOption.innerHTML = megaLibrary_[a][0];
	}


}

function checkForChanges(){

	save_wrapper.innerHTML = "";
	var submitButton = document.createElement("button");
	submitButton.setAttribute("onClick", "submitChangesToServer()");
	submitButton.innerHTML = "Submit Changes to Server";

	if(!saveClicked_){
		submitButton.disabled = "true";
	}

	save_wrapper.appendChild(submitButton);

}

function iconSelected(selectedValue){


	checkForChanges();

	 //Dan, I added the code below -Ethan

	 //If they chose the select option redirect the dropdown to the option they chose before
	 if (selectedValue=="select"){
		var icon_list_options = document.getElementById("iconDropdown").childNodes[0].childNodes;
		for (var opt = 0; opt < icon_list_options.length; opt++){
			if (icon_list_options[opt].value == currentSelectedValue_){
				icon_list_options[opt].selected = true;
				break;
		}
		}
		return;
	}
	//After the selected option gets redirected onchange will be called. Return so that their progress is not lost.
	if (selectedValue == currentSelectedValue_){
		return;
	}

   //End of the code that I added -Ethan

	//Reset all values
	iconTable_wrapper.innerHTML = "";


	console.log("selectedIcon " + selectedValue);

	var altLabel              = document.createElement("td");
	var titleLabel            = document.createElement("td");
	var uniqueLabel           = document.createElement("td");
	var permissionNeededLabel = document.createElement("td");
	var imageLabel            = document.createElement("td");
	var linkLabel             = document.createElement("td");

	altLabel.innerHTML               = "Title"; //swapped.. because the meaning over time was swapped at DesktopIcons.js
	titleLabel.innerHTML             = "Alt";	//swapped.. because the meaning over time was swapped at DesktopIcons.js
	uniqueLabel.innerHTML            = "Unique";
	permissionNeededLabel.innerHTML  = "Permission Needed";
	imageLabel.innerHTML             = "Image";
	linkLabel.innerHTML              = "Link";

	var alt              = document.createElement("td");
	var title            = document.createElement("td");
	var unique           = document.createElement("td");
	var permissionNeeded = document.createElement("td");
	var image            = document.createElement("td");
	var link             = document.createElement("td");


	var alt_tr              = document.createElement("tr");
	var title_tr            = document.createElement("tr");
	var unique_tr           = document.createElement("tr");
	var permissionNeeded_tr = document.createElement("tr");
	var image_tr            = document.createElement("tr");
	var link_tr             = document.createElement("tr");


	var altField              = document.createElement("input");
	var titleField            = document.createElement("input");
	var uniqueField           = document.createElement("input");
	var permissionNeededField = document.createElement("input");
	var imageField            = document.createElement("input");
	var linkField             = document.createElement("input");

	if(selectedValue != "new")
	{
		//console.log(selectedValue);
		altField.value = megaLibrary_[selectedValue][0];
		titleField.value = megaLibrary_[selectedValue][1];
		uniqueField.value = megaLibrary_[selectedValue][2];
		permissionNeededField.value = megaLibrary_[selectedValue][3];
		imageField.value = megaLibrary_[selectedValue][4];
		linkField.value = megaLibrary_[selectedValue][5];

	//console.log("new");
	}

	altField.setAttribute("oninput", "activateSave()");
	titleField.setAttribute("oninput", "activateSave()");
	uniqueField.setAttribute("oninput", "activateSave()");
	permissionNeededField.setAttribute("oninput", "activateSave()");
	imageField.setAttribute("oninput", "activateSave()");
	linkField.setAttribute("oninput", "activateSave()");

	alt.appendChild(altField);
	title.appendChild(titleField);
	unique.appendChild(uniqueField);
	permissionNeeded.appendChild(permissionNeededField);
	image.appendChild(imageField);
	link.appendChild(linkField);

	alt_tr.appendChild(altLabel);
	title_tr.appendChild(titleLabel);
	unique_tr.appendChild(uniqueLabel);
	permissionNeeded_tr.appendChild(permissionNeededLabel);
	image_tr.appendChild(imageLabel);
	link_tr.appendChild(linkLabel);

	alt_tr.appendChild(alt);
	title_tr.appendChild(title);
	unique_tr.appendChild(unique);
	permissionNeeded_tr.appendChild(permissionNeeded);
	image_tr.appendChild(image);
	link_tr.appendChild(link);

	iconTable.appendChild(alt_tr);
	iconTable.appendChild(title_tr);
	iconTable.appendChild(unique_tr);
	iconTable.appendChild(permissionNeeded_tr);
	iconTable.appendChild(image_tr);
	iconTable.appendChild(link_tr);

	var index;

	/*console.log("selected value?:" + selectedValue);
	for(var it = 0; it < megaLibrary_.length; it++)
	{
		console.log("it " + megaLibrary_[it][0] + " " + selectedValue);

		if(megaLibrary_[it][0] == selectedValue)
		{
			index = it;
			console.log("selected:" + index);

		}

	}
	console.log("selected?:" + index);
	*/

	var deleteButton = document.createElement("button");
	deleteButton.setAttribute("onClick", "deleteIcon(" + selectedValue  + ")");
	deleteButton.innerHTML = "Delete";
	var submitRow = document.createElement("tr");

	var button_td = document.createElement("td");
	button_td.appendChild(deleteButton);

	if(selectedValue == "new"){
		var addButton = document.createElement("button");
		addButton.setAttribute("onClick", "addIcon()");
		addButton.innerHTML = "Add";
		addButton.setAttribute("id", "save");
		button_td.appendChild(addButton);
	}else{
		var saveButton = document.createElement("button");
		saveButton.setAttribute("onClick", "saveIcon()");
		saveButton.innerHTML = "Save";
		button_td.appendChild(saveButton);
	}


	submitRow.appendChild(document.createElement("td"));
	submitRow.appendChild(button_td);
	/*  .appendChild(document.createElement("td")
				.appendChild(button)));*/
	iconTable.appendChild(submitRow);
	currentSelectedValue_ = selectedValue;

}

function deleteIcon(index){

	saveClicked_ = true; //overload usage so "Submit" button is enabled

	console.log(index);
	console.log(megaLibrary_);

	megaLibrary_.splice(index, 1);
	console.log(megaLibrary_);
	currentSelectedValue_ = ""; // nothing currently selected now

	chooseIcon();
	iconTable_wrapper.innerHTML = "";

}

function addIcon(){

	changesMade_ = true;
	//console.log("addIcon()");
	//console.log(megaLibrary_.length);

	var currentIcon =[document.getElementsByTagName("input")[0].value,
					  document.getElementsByTagName("input")[1].value,
					  document.getElementsByTagName("input")[2].value,
					  document.getElementsByTagName("input")[3].value,
					  document.getElementsByTagName("input")[4].value,
					  document.getElementsByTagName("input")[5].value];

	megaLibrary_.push(currentIcon);
	//console.log(megaLibrary_.length);

	chooseIcon();

	//console.log(megaLibrary_[megaLibrary_.length-1][1]);
//    //console.log(megaLibrary_[megaLibrary_.length][1]);
	iconSelected(megaLibrary_.length-1);



}

function saveIcon(){

   //Called by Save()
	if(!changesMade_)
	{
	alert("No changes have been made!");
	return;
	}
	//console.log("saveIcon()");
	//console.log(megaLibrary_);
	saveClicked_ = true;
	checkForChanges();
	var currentIcon =[document.getElementsByTagName("input")[0].value,
					  document.getElementsByTagName("input")[1].value,
					  document.getElementsByTagName("input")[2].value,
					  document.getElementsByTagName("input")[3].value,
					  document.getElementsByTagName("input")[4].value,
					  document.getElementsByTagName("input")[5].value];

	var icon_list_options = document.getElementById("iconDropdown").childNodes[0].childNodes;
	for (var opt = 0; opt < icon_list_options.length; opt++){
		if (icon_list_options[opt].value == currentSelectedValue_){
			icon_list_options[opt].selected = true;
			break;
		}
	}
	//console.log(opt);
	megaLibrary_[opt-2] = currentIcon;
	//console.log(megaLibrary_);

}

function submitChangesToServer(){

	//console.log("SubmitChangesToServer()");
	var iconList = "iconList=";

	//console.log("Mega Library Size: " + megaLibrary_.length-1);
	//console.log("Mega Library 0 Size: " + megaLibrary_[0].length-1);

	for(var icon = 0; icon < (megaLibrary_.length); icon++)
	{
		for(var details=0; details < (megaLibrary_[icon].length); details++)
		{
			//console.log(megaLibrary_[icon][details]);
			iconList += (megaLibrary_[icon][details] + ",");
		}
	}
		//console.log(iconList);

	iconList = iconList.substring(0, iconList.length - 1);

	console.log(iconList);
	makeServerRequest(iconList);
}

function activateSave(){

	//Called by oninput() from input fields
	//console.log("activateSave()");
	changesMade_ = true;

}


function makeServerRequest(data){

	DesktopContent.XMLHttpRequest("iconEditor", data, iconEditorHandler, undefined, undefined);
}

var iconEditorHandler = function(req){

	var iconArray = req.responseText.split(",");
	console.log(iconArray);
	var numberOfIconFields = 6;
	megaLibrary_.length = 0;

	for(var i=0;i<(iconArray.length-1);i+=numberOfIconFields) //add icons
		megaLibrary_.push([iconArray[i], iconArray[i+1], iconArray[i+2], iconArray[i+3], iconArray[i+4], iconArray[i+5]]);
	console.log(megaLibrary_);

	finishInit();
	return;
}
