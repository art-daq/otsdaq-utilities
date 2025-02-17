
/// g++ convert_comments_to_doxygen.cpp -o convert_comments_to_doxygen #to compile
/// Usage: ./convert_comments_to_doxygen myfile.cpp
///
/// The philosophy is that this tool can be used to fix the standard otsdaq 
///	format comments (which are // at first character for functions and classes, 
///	and // at end of line for header member variable/functions)...
///	... and changes them to /// at first character and ///< at end of lines
///	such that Doxygen extracts these comments for the web documentation.
///	
/// This tool can be run multiple times on the same code and is intended to always
///	leave the same result (i.e. it will not touch comments already in the correct format). 
///
/// For example, this tool should be run before a new release, and then
/// 	followed with otsdaq-utilities/tools/OnlineDocPushUpdate.sh
///	to post to otsdaq.fnal.gov.
///
#include <string.h>  //for strstr (not the same as <string>)
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <string>  //for string
#include <vector>

#define __COUT_HDR__ ""

#define Q(X) #X
#define QUOTE(X) Q(X)

#define __FILENAME__ \
	(__builtin_strrchr(__FILE__, '/') ? __builtin_strrchr(__FILE__, '/') + 1 : __FILE__)
#define __MF_SUBJECT__ __FILENAME__
#define __MF_DECOR__ (__MF_SUBJECT__)

#define __COUT_HDR_L__ ":" << std::dec << __LINE__ << " |\t"
#define __COUT_HDR_FL__ __FILENAME__ << "" << __COUT_HDR_L__
#define TLOG(X) std::cout << QUOTE(X) << ": " << __COUT_HDR_FL__  //__LINE__ << ": "
#define __COUT_ERR__ TLOG(TLVL_ERROR) << __COUT_HDR__
#define __COUT_WARN__ TLOG(TLVL_WARN) << __COUT_HDR__
#define __COUT_INFO__ TLOG(TLVL_INFO) << __COUT_HDR__
#define __COUT__ \
	if(1)        \
	TLOG(TLVL_DEBUG) << __COUT_HDR__
#define __COUTT__ \
	if(1)         \
	TLOG(TLVL_TRACE) << __COUT_HDR__

#define __SS__            \
	std::stringstream ss; \
	ss << "|" << __MF_DECOR__ << ": " << __COUT_HDR_FL__ << __COUT_HDR__
#define __SS_THROW__                        \
	{                                       \
		__COUT_ERR__ << "\n" << ss.str();   \
		throw std::runtime_error(ss.str()); \
	}  //put in {}'s to prevent surprises, e.g. if ... else __SS_THROW__;
#define __SS_THROW_ONLY__                   \
	{                                       \
		throw std::runtime_error(ss.str()); \
	}  //put in {}'s to prevent surprises, e.g. if ... else __SS_THROW__;
#define __E__ std::endl

#define __COUTV__(X) __COUT__ << QUOTE(X) << " = " << X << __E__
#define __COUTTV__(X) __COUTT__ << QUOTE(X) << " = " << X << __E__
#define __COUTVS__(LVL, X) \
	TLOG(TLVL_DEBUG + LVL) << __COUT_HDR__ << QUOTE(X) << " = " << X << __E__


//==============================================================================
/// isTypeToFix
bool isTypeToFix(const std::string& extension)
{
	__COUTTV__(extension);
	if(extension == ".cc" ||
		extension == ".icc" ||
		extension == ".cpp" ||
		extension == ".CC" ||
		extension == ".h"  ||
		extension == ".hh" ||
		extension == ".H")
		return true;
	__COUT_INFO__ << "===========================> skipping " << extension << __E__;
	return false;
} //end isTypeToFix()

//==============================================================================
/// fixFile
///	convery all start of line // to ///
void fixFile(const std::string& path)
{
	__COUTV__(path);

	std::FILE* fp = std::fopen(path.c_str(), "rb");
	if(!fp)
	{
		__SS__ << "Could not open file at " << path << ". Error: " << errno << " - "
		       << strerror(errno) << __E__;
		__SS_THROW__;
	}

	std::string newContents = "";

	bool isHeaderType = path[path.size()-1] == 'h';
	__COUTV__(isHeaderType);

	//For Doxygen parsing:
	//	- for header files, convert end of line // to ///<
	//	- for source files, convert first character // to ///

	char line[200];
	bool isNewLine = true;
	bool inCommentBlock = false;
	bool inHeaderCommentBlock = false;
	bool inFunctionBlock = false;
	bool skippedLastLine = false; //prevent comment block start with empty comment if previous line was skipped
	size_t lineNum = 0;
	while(fgets(line,200,fp))
	{
		size_t len = strlen(line);
		++lineNum;

		if(isHeaderType)
		{
			//only look for end of line comments
			if(!isNewLine || (len > 10 && line[0] != '/' && line[0] != '#' &&
				!(line[0] == '\t' && line[1] == '/') ))
			{
				bool found = false;
				bool inQuote = false;
				for(size_t c = 0; c < len; ++c)
				{
					newContents += line[c];					

					if(!found && !inQuote && c > 10 && c+2 < len && 
						line[c] == '/' && 
						line[c+1] == '/' && line[c-1] != ':')
					{
						//not-: and !inQuote protects against lines like this
						// const std::string link = "http://xdaq.web.cern.ch";					

						found = true;
						if(line[c+2] != '/') //only apply if needed
						{
							newContents += "//<";
							c += 1; //skip ahead						
						}
					}
					else if(!found && !inQuote && line[c] == '"')
						inQuote = true;
					else if(!found && inQuote && line[c] == '"')
						inQuote = false;
				}

				inHeaderCommentBlock = false;
				inCommentBlock = false;
				inFunctionBlock = false;
				skippedLastLine = false;

				continue;
			}
		}
		
		//do source type behavior for headers as well

		if(1 && path.find("RootFileExplorer.h") != std::string::npos)
			__COUT__ << lineNum << ". " << len << ": " << inFunctionBlock << " " << 
				inCommentBlock << " " <<
				line << __E__;

		// else //source type
		// {
			if(isNewLine && ((len > 2 && 
				line[0] == '/' &&
				line[1] == '/' && 				
				line[2] != '=') || 
				(isHeaderType && len > 3 && 
				line[0] == '\t' && //header might tab in comments
				line[1] == '/' &&
				line[2] == '/' && 				
				line[3] != '='
				)))
			{
				bool headerTab = (isHeaderType && line[0] == '\t');

				if(path.find("RootFileExplorer.h") != std::string::npos)
					__COUT__ << lineNum << ". " << len << ": " << inFunctionBlock << " " << 
						inCommentBlock << " " << inHeaderCommentBlock << " " << headerTab << " " <<
						line << __E__;

				if(isHeaderType && !inHeaderCommentBlock && !inCommentBlock)
				{
					//ignore commented functions in header files
					std::string testStr(line);
					size_t i0a = testStr.find(' ');
					size_t i0b = testStr.find('\t');
					size_t i1 = testStr.find('(');
					size_t i2 = testStr.find(')');
					size_t i3 = testStr.find(';');

					if(path.find("RootFileExplorer.h") != std::string::npos)
					{
						__COUTV__(i0a);
						__COUTV__(i0b);						
					}

					if(i0a != std::string::npos || i0b != std::string::npos) //must have a space or tab in function declaration
					{						
						size_t i0 = (i0b < i0a)?i0b:i0a;

						if(path.find("RootFileExplorer.h") != std::string::npos)
						{
							__COUTV__(i0);
							__COUTV__(i3);						
						}

						if(i1 != std::string::npos && i2 != std::string::npos && i3 != std::string::npos) // ( ); style exists 
						{
							
							if(i0 < i1 && i1 < i2 && i2 < i3)
							{
								__COUT__ << "skipping header commented function delcaration: " << line;
								newContents += line;
								isNewLine = true;
								skippedLastLine = true;
								continue;
							}
						}
						//ignore commented member variable declaraionts in header files
						if(i3 != std::string::npos && i3 == len - 2) //ends with ;
						{
							__COUT__ << "skipping header commented member variable delcaration: " << line;
							newContents += line;
							isNewLine = true;
							skippedLastLine = true;
							continue;
						}
					}
				}

				if(path.find("RootFileExplorer.h") != std::string::npos)
					__COUT__ << lineNum << ". " << len << ": " << inFunctionBlock << " " << 
						inCommentBlock << " " << inHeaderCommentBlock << " " << headerTab << " " <<
						line << __E__;

				if(line[2] == '{')
					inFunctionBlock = true;
				if(len > 3 && line[2] == ' ' && line[3] == '{')
					inFunctionBlock = true;

				if(inFunctionBlock)
				{
					__COUTT__ << "skipping comment block: " << line << __E__;
					inCommentBlock = false;
					newContents += line;
					isNewLine = true;

					if(line[2] == '}')
						inFunctionBlock = false;
					if(len > 3 && line[2] == ' ' && line[3] == '}')
						inFunctionBlock = false;
					if(len > 3 && line[2] == '{' && line[3] == '}')
						inFunctionBlock = false;
					if(len > 4 && line[2] == '{' && line[4] == '}')
						inFunctionBlock = false;
					if(len > 4 && line[3] == '{' && line[4] == '}')
						inFunctionBlock = false;

					if(!inFunctionBlock)
						skippedLastLine = true; //mark in case of gratuitous empty // to follow

					continue;
				}

				if(len > 5) //check for clang-format
				{
					std::string testStr(line);
					if(len < 30 && testStr.find("clang-format") != std::string::npos)
					{
						__COUTT__ << "skipping clang: " << line << __E__;
						newContents += line;
						isNewLine = true;
						skippedLastLine = true;
						continue;
					}
					else if(!inCommentBlock && !inHeaderCommentBlock &&
						testStr.find("#") < 5)
					{
						__COUTT__ << "skipping # pragma: " << line << __E__;
						newContents += line;
						isNewLine = true;
						skippedLastLine = true;
						continue;
					}
					else if(!inCommentBlock && !inHeaderCommentBlock &&
						testStr.find("BOOST_") < 5)
					{
						__COUTT__ << "skipping BOOST: " << line << __E__;
						newContents += line;
						isNewLine = true;
						skippedLastLine = true;
						continue;
					}
					else if(!inCommentBlock && !inHeaderCommentBlock &&
						testStr.find("XDAQ_") < 5)
					{
						__COUTT__ << "skipping XDAQ: " << line << __E__;
						newContents += line;
						isNewLine = true;
						skippedLastLine = true;
						continue;
					}
					else if(!inCommentBlock && !inHeaderCommentBlock &&
						testStr.find("static ") < 5)
					{
						__COUTT__ << "skipping static: " << line << __E__;
						newContents += line;
						isNewLine = true;
						skippedLastLine = true;
						continue;
					}
				}

				if(0 && path.find("JSONDispatcher_module.cc") != std::string::npos)
					__COUT__ << len << ": " << inFunctionBlock << " " << 
						inCommentBlock << " " << headerTab << " " <<
						line << __E__;

				if(len == 3 && skippedLastLine)
				{
					//prevent comment block start with empty comment if previous line was skipped
					__COUTT__ << "skipping gratuitous comment in skipzone: " << line << __E__;
					newContents += line;
					isNewLine = true;
					continue;
				}
				else if(headerTab && len == 4 && skippedLastLine)
				{
					//prevent comment block start with empty comment if previous line was skipped
					__COUTT__ << "skipping gratuitous header comment in skipzone: " << line << __E__;
					newContents += line;
					isNewLine = true;
					continue;
				}
				else 
					skippedLastLine = false;


				if(0 && path.find("JSONDispatcher_module.cc") != std::string::npos)
					__COUT__ << len << ": " << inFunctionBlock << " " << 
						inCommentBlock << " " << headerTab << " " <<
						line << __E__;

				if(!headerTab && line[2] != '/') //dont add if already 3 (but stay in comment block)
					newContents += '/'; //add extra '/'
				else if(headerTab && line[3] != '/')
				{
					inHeaderCommentBlock = true;
					newContents += "\t//";
					newContents += '/'; //add extra '/'
					newContents += (&line[3]);

					if(len && line[len-1] == '\n')
						isNewLine = true;
					else
					{
						__COUT__ << "No new line at size " << len << __E__;
						isNewLine = false;
					}
					continue;
				}
				else if(!headerTab && len > 4 && line[2] == '/' && line[3] == '/' && line[4] == '/')
				{
					//prevent comment block start with empty comment if previous line was skipped
					__COUTT__ << "Ending comment block with /////: " << line << __E__;
					inCommentBlock = false;
					newContents += line;
					if(len && line[len-1] == '\n')
						isNewLine = true;
					else
					{
						__COUT__ << "No new line at size " << len << __E__;
						isNewLine = false;
					}
					continue;
				}

				if(headerTab)
					inHeaderCommentBlock = true;
				else
					inCommentBlock = true;
			}
			else if(isNewLine && inCommentBlock && len == 1) //keep comment block going for empty newlines
			{
				__COUTT__ << "Continue comment block" << __E__;
				newContents += "///"; //add extra '///' to keep comment block going
			}
			else if(isNewLine && inHeaderCommentBlock && len == 1) //keep comment block going for empty newlines
			{
				__COUTT__ << "Continue header comment block" << __E__;
				newContents += "\t///"; //add extra '\t///' to keep comment block going
			}
			else 
			{
				inHeaderCommentBlock = false;
				inCommentBlock = false;
				inFunctionBlock = false;
				skippedLastLine = false;
			}
			
			newContents += line;
		//}

		if(len && line[len-1] == '\n')
			isNewLine = true;
		else
		{
			__COUT__ << "No new line at size " << len << __E__;
			isNewLine = false;
		}

	} //end main loop
	std::fclose(fp);


	fp = std::fopen(path.c_str(), "wb");	
	if(!fp)
	{
		__SS__ << "Could not open file to write at " << path << ". Error: " << errno << " - "
		       << strerror(errno) << __E__;
		__SS_THROW__;
	}
	std::fwrite(&newContents[0], 1, newContents.size(), fp);
	std::fclose(fp);

	// std::string contents;

	// //else standard text read
	// std::fseek(fp, 0, SEEK_END);
	// contents.resize(std::ftell(fp));
	// std::rewind(fp);
	// std::fread(&contents[0], 1, contents.size(), fp);
	// std::fclose(fp);

	//now fix!
	// __COUTV__(contents.size());
}  // end fixFile

#include <dirent.h>    //DIR and dirent
//==============================================================================
/// recursiveFixPathContent
///		return empty vector if path can not be opened as directory.
void recursiveFixPathContent(const std::string& path)
{
	__COUTV__(path);

	DIR*           pDIR;
	struct dirent* entry;
	bool           isDir;
	std::string    name;
	int            type;

	if(!(pDIR = opendir((path).c_str())))
	{
		__COUT__ << "Path '" << path << "' could not be opened!" << __E__;

		if(isTypeToFix(path.substr(path.rfind('.'))))
		{
			__COUT__ << "Interpreting as file: '" << path << "'" << __E__;
			fixFile(path);
		}

		return;
	}


	// else directory good, get all folders, .h, .cc, .txt files
	while((entry = readdir(pDIR)))
	{
		name = std::string(entry->d_name);
		type = int(entry->d_type);

		__COUT__ << "\t" << type << " " << name << std::endl;

		if(name[0] != '.' &&
		   (type == 0 ||  // 0 == UNKNOWN (which can happen - seen in SL7 VM)
		    type == 4 ||  // directory type
		    type == 8 ||  // file type
		    type == 10    // 10 == link (could be directory or file, treat as unknown)
		    ))
		{
			isDir = false;

			if(type == 0 || type == 10)
			{
				// unknown type .. determine if directory
				DIR* pTmpDIR = opendir((path + "/" + name).c_str());
				if(pTmpDIR)
				{
					isDir = true;
					closedir(pTmpDIR);
				}
				else  //assume file
					__COUT__ << "Unable to open path as directory: "
					    << (path + "/" + name) << __E__;
			}

			if(type == 4)
				isDir = true;  // flag directory types

			// handle directories

			if(isDir)
			{
				__COUT__ << "Directory: " << type << " " << name << __E__;

				recursiveFixPathContent(path + "/" + name);
			}
			else  // type 8 or 0 is file
			{
				__COUT__ << "File: " << type << " " << name << std::endl;

				try
				{
					if(isTypeToFix(name.substr(name.rfind('.'))))
					{
						__COUTT__ << "Fixing file: " << name << __E__;
						fixFile(path + "/" + name);
					}
				}
				catch(...)
				{
					__COUT_WARN__ << "Invalid file extension, skipping '" << name << "' ..."
					          << __E__;
				}
			}
		}
	}  // end directory traversal

	closedir(pDIR);

}  // end recursiveFixPathContent()

//==============================================================================
int main(int argc, char* argv[])
try
{
	if(argc < 2)
	{
		fprintf(stderr,
		        "Usage: $0 <path>.\n");
		exit(1);
	}

	std::string path   = argv[1];

	__COUTV__(path);

	recursiveFixPathContent(path);

	__COUT_INFO__ << "Done." << __E__;
	return 0;
}
catch(const std::runtime_error& e)
{
	__COUT_ERR__ << "Error caught during test execution: \n" << e.what() << __E__;
	return 1;
}
