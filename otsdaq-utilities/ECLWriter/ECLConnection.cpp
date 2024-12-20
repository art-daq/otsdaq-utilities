#include <openssl/md5.h>
#include <otsdaq-utilities/ECLWriter/ECLConnection.h>
#include <boost/algorithm/string.hpp>
#include <cstring>
#include <fstream>
#include <iomanip>
#include <sstream>
#include "otsdaq/Macros/CoutMacros.h"
#include "otsdaq/Macros/StringMacros.h" 
#include "otsdaq/MessageFacility/MessageFacility.h"

//==============================================================================
ECLConnection::ECLConnection(std::string user, std::string pwd, std::string url)
{
	_user = user;
	_pwd  = pwd;
	_url  = url;

	if(!Get("/secureURL", _safe_url))
	{
		__SS__ << "Could not retrieve safe URL from input url '" << _url << "'" << __E__;
		__SS_THROW__;
	}
	__COUTTV__(_safe_url);

	srand(time(NULL));
} //end ECLConnection()

//==============================================================================
size_t ECLConnection::WriteMemoryCallback(char*        data,
                                          size_t       size,
                                          size_t       nmemb,
                                          std::string* buffer)
{
	size_t realsize = 0;

	if(buffer != NULL)
	{
		buffer->append(data, size * nmemb);
		realsize = size * nmemb;
	}

	return realsize;
} //end WriteMemoryCallback()

//==============================================================================
//Note: make sure GET url parameter 's' is URI encoded
bool ECLConnection::Get(std::string s, std::string& response)
{	
	response = "NULL";

	std::string rndString = MakeSaltString();
	std::string mySalt  = "salt=" + rndString;
	std::string fullURL;
	bool needSignature = false;
	if(s != "/secureURL") //add salt
	{
		needSignature = true;
		//in case of dynamic server downtime, if safe_url is blank, get safe_url

		if(time(0) - _lastOperationTime > 5*60 /* 5 minutes */)
		{
			__COUTT__ << "Clearing safe URL and re-requesting..." << __E__;
			_safe_url = "";
		}

		__COUTTV__(_safe_url);
		if(_safe_url == "" && !Get("/secureURL", _safe_url))
		{
			__SS__ << "Could not retrieve safe URL from input url '" << _url << "'" << __E__;
			__SS_THROW__;
		}
		__COUTTV__(_safe_url);
		
		fullURL = _safe_url + s;
		if(s.size() && s[s.size()-1] == '?')
			; //do nothing
		else if(fullURL.find('?') != std::string::npos)
			fullURL += '&';
		else 
			fullURL += '?';
		fullURL += mySalt;
	}
	else 
		fullURL = _url + s;

	__COUT__ << "ECL GET request to " << fullURL << std::endl;
	__COUTVS__(20,needSignature);


	std::string xSig;
	if(needSignature)
	{
		std::string myData = fullURL.substr(fullURL.find('?')+1);	
		__COUTTV__(myData);	
		myData += ":" + _pwd + ":";
		// myData is now the ECL Hash string -- DO NOT PRINT contains pw

		unsigned char resultMD5[MD5_DIGEST_LENGTH];
		MD5((unsigned char*)myData.c_str(), myData.size(), resultMD5);

		char        buf[3];
		for(auto i = 0; i < MD5_DIGEST_LENGTH; i++)
		{
			sprintf(buf, "%02x", resultMD5[i]);
			xSig.append(buf);
		}
		__COUT_TYPE__(TLVL_DEBUG+20) << __COUT_HDR__ << "ECL MD5 Signature is: " << xSig << std::endl;
	}


	
	char        errorBuffer[CURL_ERROR_SIZE];
	std::string responseBuffer;
	CURL*       curl_handle;

	curl_global_init(CURL_GLOBAL_ALL);

	/* init the curl session */
	curl_handle = curl_easy_init();

	curl_easy_setopt(curl_handle, CURLOPT_ERRORBUFFER, errorBuffer);


	/* specify URL to get */

	if(needSignature)
	{
		struct curl_slist* headers = NULL;
		std::string        buff    = "X-User: " + _user;
		headers                    = curl_slist_append(headers, buff.c_str());
		headers                    = curl_slist_append(headers, "Content-type: text/xml");
		headers                    = curl_slist_append(headers, "X-Signature-Method: md5");
		buff                       = "X-Signature: " + xSig;
		headers                    = curl_slist_append(headers, buff.c_str());

		curl_easy_setopt(curl_handle, CURLOPT_HTTPHEADER, headers);
	}
	curl_easy_setopt(curl_handle, CURLOPT_URL, fullURL.c_str());
	curl_easy_setopt(curl_handle, CURLOPT_FOLLOWLOCATION, 1); // Allow redirects

	/* send all data to this function  */
	curl_easy_setopt(
	    curl_handle, CURLOPT_WRITEFUNCTION, ECLConnection::WriteMemoryCallback);

	/* we pass our 'chunk' struct to the callback function */
	curl_easy_setopt(curl_handle, CURLOPT_WRITEDATA, &responseBuffer);

	/* some servers don't like requests that are made without a user-agent
   field, so we provide one */
	curl_easy_setopt(curl_handle, CURLOPT_USERAGENT, "libcurl-agent/1.0");

	/* get it! */
	CURLcode result = curl_easy_perform(curl_handle);

	if(result != CURLE_OK)
	{
		_safe_url = ""; //clear on error
		__SS__ << "Error: [" << result << "] - " << errorBuffer << std::endl;

		__COUT_TYPE__(TLVL_DEBUG+20) << __COUT_HDR__ << "ECL Cleanup" << std::endl;
		// cleanup curl stuff
		curl_easy_cleanup(curl_handle);
		// curl_slist_free_all(headers);
		curl_global_cleanup();
		__SS_THROW__;
	}
	
	__COUT_TYPE__(TLVL_DEBUG+20) << __COUT_HDR__ << "ECL Cleanup" << std::endl;
	// cleanup curl stuff
	curl_easy_cleanup(curl_handle);
	// curl_slist_free_all(headers);
	curl_global_cleanup();
	
	if(responseBuffer.find("Error") != std::string::npos || 
		responseBuffer.find("301 Moved Permanently") != std::string::npos)
	{
		_safe_url = ""; //clear on error
		__SS__ << "Error found in request: " << responseBuffer << __E__;
		__SS_THROW__;
	}

	__COUTVS__(2,responseBuffer);
	response = responseBuffer;

	_lastOperationTime = time(0);
	return true;
} //end Get()

//==============================================================================
bool ECLConnection::Search(std::string /*s*/) { return false; }

//==============================================================================
std::string ECLConnection::MakeSaltString()
{
	std::string rndString = "";

	std::string chars(
	    "abcdefghijklmnopqrstuvwxyz"
	    //			"ABCDEFGHIJKLMNOPQRSTUVWXYZ"
	    "1234567890");
	for(int i = 0; i < 10; ++i)
	{
		rndString += chars[rand() % chars.size()];
	}

	return rndString;
} //end MakeSaltString()

//==============================================================================
bool ECLConnection::Post(ECLEntry_t& e)
{
	//in case of dynamic server downtime, get safe_url for each POST
	if(!Get("/secureURL", _safe_url))
	{
		__SS__ << "Could not retrieve safe URL from input url '" << _url << "'" << __E__;
		__SS_THROW__;
	}
	__COUTTV__(_safe_url);

	std::string rndString = MakeSaltString();

	std::string myURL   = "/E/xml_post?";
	std::string mySalt  = "salt=" + rndString;
	std::string fullURL = _safe_url + myURL + mySalt;

	std::string myData = mySalt + ":" + _pwd + ":";

	// create text from xml form, but need to remove all \n's
	std::ostringstream oss;
	entry(oss, e);
	std::string eclString = oss.str();
	__COUT__ << "ECL XML is: " << eclString << std::endl;
	// std::string eclString = e.entry();
	eclString = eclString.substr(eclString.find_first_of(">") + 2);

	while(eclString.find('\n') != std::string::npos)
	{
		eclString = eclString.erase(eclString.find('\n'), 1);
	}
	while(eclString.find('\r') != std::string::npos)
	{
		eclString = eclString.erase(eclString.find('\r'), 1);
	}
	while(eclString.find(" <") != std::string::npos)
	{
		eclString = eclString.erase(eclString.find(" <"), 1);
	}
	boost::trim(eclString);
	myData += eclString;

	// myData is now the ECL Hash string -- DO NOT PRINT contains pw

	unsigned char resultMD5[MD5_DIGEST_LENGTH];
	MD5((unsigned char*)myData.c_str(), myData.size(), resultMD5);

	std::string xSig;
	char        buf[3];
	for(auto i = 0; i < MD5_DIGEST_LENGTH; i++)
	{
		sprintf(buf, "%02x", resultMD5[i]);
		xSig.append(buf);
	}
	__COUT__ << "ECL MD5 Signature is: " << xSig << std::endl;

	CURL* curl_handle;
	char  errorBuffer[CURL_ERROR_SIZE];

	curl_global_init(CURL_GLOBAL_ALL);

	/* init the curl session */

	curl_handle = curl_easy_init();

	curl_easy_setopt(curl_handle, CURLOPT_ERRORBUFFER, errorBuffer);

	/* specify URL to get */

	struct curl_slist* headers = NULL;
	std::string        buff    = "X-User: " + _user;
	headers                    = curl_slist_append(headers, buff.c_str());
	headers                    = curl_slist_append(headers, "Content-type: text/xml");
	headers                    = curl_slist_append(headers, "X-Signature-Method: md5");
	buff                       = "X-Signature: " + xSig;
	headers                    = curl_slist_append(headers, buff.c_str());

	const char* estr = eclString.c_str();

	__COUT__ << "ECL Setting message headers" << std::endl;
	curl_easy_setopt(curl_handle, CURLOPT_POSTFIELDS, estr);
	curl_easy_setopt(curl_handle, CURLOPT_HTTPHEADER, headers);
	curl_easy_setopt(curl_handle, CURLOPT_URL, fullURL.c_str());
	curl_easy_setopt(curl_handle, CURLOPT_FOLLOWLOCATION, 1); // Allow redirects
	//      curl_easy_setopt(curl_handle, CURLOPT_VERBOSE,1);

	// send all data to this function
	std::string responseBuffer;
	curl_easy_setopt(
	    curl_handle, CURLOPT_WRITEFUNCTION, ECLConnection::WriteMemoryCallback);
	// we pass our 'memoryspace' struct to the callback function
	curl_easy_setopt(curl_handle, CURLOPT_WRITEDATA, (void*)&responseBuffer);

	// post it!

	__COUT__ << "ECL Posting message to " << fullURL << std::endl;
	CURLcode result = curl_easy_perform(curl_handle);

	if(result != CURLE_OK)
	{
		_safe_url = ""; //clear on error
		__SS__ << "Error: [" << result << "] - " << errorBuffer << std::endl;

		__COUTT__ << "ECL Cleanup" << std::endl;
		// cleanup curl stuff
		curl_easy_cleanup(curl_handle);
		curl_slist_free_all(headers);
		curl_global_cleanup();
		__SS_THROW__;
	}
	
	__COUTT__ << "ECL Cleanup" << std::endl;
	// cleanup curl stuff
	curl_easy_cleanup(curl_handle);
	curl_slist_free_all(headers);
	curl_global_cleanup();
	
	if(responseBuffer.find("Error") != std::string::npos || 
		responseBuffer.find("301 Moved Permanently") != std::string::npos)
	{
		_safe_url = ""; //clear on error
		__SS__ << "Error found in request: " << responseBuffer << __E__;
		__SS_THROW__;
	}

	__COUTTV__(responseBuffer);

	return true;
} //end Post()

//==============================================================================
std::string ECLConnection::EscapeECLString(std::string input)
{
	std::string output = input;
	size_t      pos    = output.find('&');
	while(pos != std::string::npos)
	{
		output = output.replace(pos, 1, "&amp;");
		pos    = output.find('&', pos + 2);
	}

	pos = output.find('"');
	while(pos != std::string::npos)
	{
		output = output.replace(pos, 1, "&quot;");
		pos    = output.find('"', pos + 1);
	}

	pos = output.find('\'');
	while(pos != std::string::npos)
	{
		output = output.replace(pos, 1, "&apos;");
		pos    = output.find('\'', pos + 1);
	}

	pos = output.find('<');
	while(pos != std::string::npos)
	{
		output = output.replace(pos, 1, "&lt;");
		pos    = output.find('<', pos + 1);
	}

	pos = output.find('>');
	while(pos != std::string::npos)
	{
		output = output.replace(pos, 1, "&gt;");
		pos    = output.find('>', pos + 1);
	}

	return output;
} //end EscapeECLString()

//==============================================================================
Attachment_t ECLConnection::MakeAttachmentImage(std::string const& imageFileName)
{
	Attachment_t attachment;
	std::string  fileNameShort = imageFileName;
	if(fileNameShort.rfind('/') != std::string::npos)
	{
		fileNameShort = fileNameShort.substr(imageFileName.rfind('/'));
	}
	std::ifstream fin(imageFileName, std::ios::in | std::ios::binary);
	fin.seekg(0, std::ios::end);
	std::streamsize size = fin.tellg();
	fin.seekg(0, std::ios::beg);
	std::vector<char> buffer(size);
	if(!fin.read(buffer.data(), size))
	{
		__COUT__ << "ECLConnection: Error reading file: " << imageFileName << std::endl;
		attachment = Attachment_t("Image=none", fileNameShort);
	}
	else
	{
		attachment = Attachment_t(
		    ::xml_schema::base64_binary(&buffer[0], size), "image", fileNameShort);
	}
	return attachment;
} //end MakeAttachmentImage()

//==============================================================================
Attachment_t ECLConnection::MakeAttachmentFile(std::string const& fileName)
{
	Attachment_t attachment;
	std::string  fileNameShort = fileName;
	if(fileNameShort.rfind('/') != std::string::npos)
	{
		fileNameShort = fileNameShort.substr(fileName.rfind('/'));
	}
	std::ifstream fin(fileName, std::ios::in | std::ios::binary);
	fin.seekg(0, std::ios::end);
	std::streamsize size = fin.tellg();
	fin.seekg(0, std::ios::beg);

	std::vector<char> buffer(size);
	if(!fin.read(buffer.data(), size))
	{
		__COUT__ << "ECLConnection: Error reading file: " << fileName;
		attachment = Attachment_t("File=none", fileNameShort);
	}
	else
	{
		attachment = Attachment_t(
		    ::xml_schema::base64_binary(&buffer[0], size), "file", fileNameShort);
	}
	return attachment;
} //end MakeAttachmentFile()
