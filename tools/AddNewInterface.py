#!/usr/bin/env python
#____________________________________________________________
#
#  addNewFrontEndInterface.py --help
#
#____________________________________________________________
#

#//For example:
#//		./addNewFrontEndInterface.py  -n MyInterface
#//			-- copy FrontEndGenericInterface.cc  MyInterface.cc
#//			-- replace sed /FrontEndGenericInterface/MyInterface/g

import argparse
import os #for isdir abspath dirname

#//Steps:
#// - copy source to destination
#// - swap in new name
#// - Add entry in destination  CMakeLists.txt


print
print "***********************\n"
print "Setting up and Installing...\n" + \
    "Look for 'Success!' at end of print out.\n"
print


parser = argparse.ArgumentParser(description='Setup Firmware Component')

parser.add_argument('-s','--src',
		help='Source path for new Interface')
parser.add_argument('-d','--dest',
		help='Destination path for new Interface')
parser.add_argument('-n','--name',
		help='Name of new Interface')
parser.add_argument('-hw','--hardwareName',
		help='Name of new Interface')
parser.add_argument('-fw','--firmwareName',
		help='Name of new Interface')

args = parser.parse_args()

print
print 'Arguments parsed...'
print args
print
print

########
# at this point call is legal according to argparse

scriptDir = os.path.dirname(os.path.abspath(__file__))


print 'Script directory is:'
print scriptDir
print

##################################
print 'Validating source path...'

source = scriptDir + "/../../otsdaq_demo/" #default destination path
if (args.dest): #if option used, then use args.dest
    dest = args.dest

print 'Destination directory is:'
print  dest
print
print

#validate destination directory
if ((not os.path.isdir(dest + "/"))):
    print "Error!\n Check usage. "
    parser.print_help()
    print
    print "****************"
    exit("Error: Invalid destination path '" + (args.dest) + "')\n\n")

##################################
dest = scriptDir + "/" #default destination path
if (args.dest): #if option used, then use args.dest
    dest = args.dest

print 'Destination directory is:'
print  dest
print
print

#validate destination directory
if ((not os.path.isdir(dest + "/"))):
    print "Error!\n Check usage. "
    parser.print_help()
    print
    print "****************"
    exit("Error: Invalid destination path '" + (args.dest) + "')\n\n")


print  'Copy files...'

srcFile = scriptDir + "/../../otsdaq/otsdaq/DetectorWriter/FrontEndInterfaceTemplate.cc"
os.system("cp " + srcFile + " " + args.dest + "/" + args.name + ".cc");
os.system("sed -i s/FrontEndInterfaceTemplate/" + args.name + "/g " + \
	args.dest + "/" + args.name + ".cc");
os.system("sed -i s/FrontEndHardwareTemplate/" + args.hardwareName + "/g " + \
	args.dest + "/" + args.name + ".cc");
os.system("sed -i s/FrontEndFirmwareTemplate/" + args.firmwareName + "/g " + \
	args.dest + "/" + args.name + ".cc");

srcFile = scriptDir + "/../../otsdaq/otsdaq/DetectorWriter/FrontEndInterfaceTemplate.h"
os.system("cp " + srcFile + " " + args.dest + "/" + args.name + ".h");
os.system("sed -i s/FrontEndInterfaceTemplate/" + args.name + "/g " + \
	args.dest + "/" + args.name + ".h");
os.system("sed -i s/FrontEndHardwareTemplate/" + args.hardwareName + "/g " + \
	args.dest + "/" + args.name + ".h");
os.system("sed -i s/FrontEndFirmwareTemplate/" + args.firmwareName + "/g " + \
	args.dest + "/" + args.name + ".h");





print
print "***********************\n"
print 'Success!'
print
print
