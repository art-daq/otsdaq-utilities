#!/usr/bin/python
# Author: Daniel Parilla
# September 26, 2017
# Version: 1.00

import sys, getopt, os

def main(argv):
    inputFile= ''
    outputFile=''
    inputClassName= ''
    outputClassName=''


    inputHeaderExtension=''
    extensionsToCheck=['.h', '.c', '.hh', '.cc', '.cpp']
    inputFileProvided =False
    outputFileProvided=False

    currentDirectory = os.getcwd()
    inputDirectory = currentDirectory
    outputDirectory= currentDirectory #FIXME should default to OTS directory


    try:
        options, args = getopt.getopt(argv, "o:d:r:i:h", ["output=", "input=", "help"])
    except getopt.GetoptError:
        print 'importer.py <source path to .h or .c>'

    for option, arg in options:
        if option == '-i':
         #check if the input file is a valid extension
            if not any(extension in arg for extension in extensionsToCheck):# not in arg: #check if it points to a file
                print "No .h, .hh, .c, .cc, .cpp file provided."
                sys.exit(2)
            inputFile=arg
            inputFileProvided=True
        elif option == '-h' or option == '--help':
            print 'usage: ', sys.argv[0], ' -i <source path to .h or .c> -r '
            print ''
            print 'Optional Arguments:'
            print '-d <path to input directory>'
            print '-o <output/destination directory>'
            print '-r <rename class>'
            print ''
            print ''
            sys.exit()
        elif option == '-o':
            outputDirectory=arg
        elif option == '-d':
            inputDirectory=arg
        elif option == '-r':
            outputFile=arg
            outputFileProvided = True

    if len(sys.argv) < 3:
        print 'Not enough inputs provided. Please type "-h" for help'
        sys.exit(2)

    #Error Checks
    print inputFile
    if not inputFileProvided :
        print 'Input file not provided!'
        print 'Please type -h for help.'
        sys.exit(2)

    inputClassName = os.path.splitext(inputFile)[0]             #Take off the extension
    inputClassName = inputClassName.split("_interface",1)[0]    #Remove the '_interface' nomenclature

    if not outputFileProvided :
        print 'No new filename provided... using ', inputFile, '.'
        outputClassName = inputClassName
        outputFile = inputFile
    else :
        outputClassName = os.path.splitext(outputFile)[0]
        #Check to see if the new filename already exists
        if os.path.exists(outputDirectory + "/" + outputFile):
            print 'File with name: ', outputFile, ' already exists!'
            print 'Cannot create new file!'

    print 'input and output class names'
    print inputClassName #FIXME take off _interface if it has it
    print outputClassName


    #check if the input file is valid
    if not os.path.exists(inputDirectory + "/" + inputFile):
        print currentDirectory + '/' + inputFile + ' does not exist!'
        print 'Please type -h for help.'
        sys.exit(2)

    #need to check if the header file is .h, .hh, .hpp
    inputHeaderExtension=''
    foundHeader=False
    if os.path.exists(inputDirectory + "/" + inputClassName + ".h"):
        inputHeaderExtension='.h'
    elif os.path.exists(inputDirectory + "/" + inputClassName + ".hh"):
        inputHeaderExtension='.hh'
    elif os.path.exists(inputDirectory + "/" + inputClassName + ".hpp"):
        inputHeaderExtension='.hpp'
    else :
        print 'Could not find header with name ', inputClassName, '!'
        print 'Tried these extensions: .h, .hh, .hpp'
        sys.exit(2)

    #FIXME? Will it break if we change a .c to a .cpp
    #replace the old class name with the new one in the source file
    with open(inputDirectory + '/' + inputFile, "rt") as fin:
        with open(outputDirectory + '/' + outputClassName + '_interface.cpp', "wt") as fout:
            for line in fin:
                fout.write(line.replace(inputClassName, outputClassName))

    #replace the old class name with the new one in the header file
    with open(inputDirectory + '/' + inputClassName + inputHeaderExtension, "rt") as fin:
        with open(outputDirectory + '/' + outputClassName + inputHeaderExtension, "wt") as fout:
            for line in fin:
                fout.write(line.replace(inputClassName, outputClassName))

    #Grab CMake and make changes
    cMakeListsCopyBuffer=''
    foundCMakeListsEntry=False
    if os.path.exists(inputDirectory + "/" + "CMakeLists.txt"):
        print 'Found a CMakeLists in this directory!'

        #looking for the line "simple_plugin(/*Interface Name*/Interface "interface"
        firstLine = "simple_plugin(" + inputClassName + " \"interface\""
        lastLine  = ")"
        finishedWithReading = True
        with open(inputDirectory + "/" + "CMakeLists.txt", "rt") as fin:
            for line in fin:
                if firstLine in line:
                    print 'Located the plugin ', inputClassName, ' in the CMakeLists!'
                    cMakeListsCopyBuffer += line.replace(inputClassName, outputClassName)
                    finishedWithReading = False
                    foundCMakeListsEntry= True
                elif lastLine in line and not finishedWithReading:
                    cMakeListsCopyBuffer += line
                    finishedWithReading = True
                elif not finishedWithReading :
                    cMakeListsCopyBuffer += line

            #print cMakeListsCopyBuffer


    else:
        print 'No CMakeLists found in this directory: ', inputDirectory

    if not foundCMakeListsEntry:
        #Add in default behavior for CMakeLists
        cMakeListsCopyBuffer  = "   simple_plugin(" + inputClassName + " \"interface\""
        cMakeListsCopyBuffer += "   )"

        print 'No previous entries in the CMake List were found'

    with open(inputDirectory + "/" + "CMakeLists.txt", "a") as cMakeLists:
        cMakeLists.write(cMakeListsCopyBuffer)





if __name__ == "__main__":
   main(sys.argv[1:])
