#ifndef __ECLCONNECTION_HPP_
#define __ECLCONNECTION_HPP_

#include <curl/curl.h>
#include <iostream>
#include <string>

#include <otsdaq-utilities/ECLWriter/ECL.hxx>

/**
 * Interface to write forms to ECL
 *
 * @author Jonathan Paley
 * @version $Id: ECLConnection.h,v 1.3 2012/03/22 19:57:32 jpaley Exp $
 */

class ECLConnection
{
  public:
	ECLConnection(std::string user, std::string password, std::string url);
	~ECLConnection(){};

	bool Post(ECLEntry_t& e);
	bool Get(std::string, std::string&);
	bool Search(std::string);

	static std::string EscapeECLString(std::string input = "");

	static Attachment_t MakeAttachmentImage(std::string const& imageFileName);

	static Attachment_t MakeAttachmentFile(std::string const& fileName);

  private:
	std::string   MakeSaltString();
	static size_t WriteMemoryCallback(char*, size_t, size_t, std::string*);

	std::string _user;
	std::string _pwd;
	std::string _url, _safe_url;
};

#endif
