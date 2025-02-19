#!/usr/bin/env python
#____________________________________________________________
#
#  addNewInterface.py --help
#
#____________________________________________________________
#

#//./addnewFEWInterface.py  -n MyInterface
#//-- copy FrontEndGenericInterface.cc  MyInterface.cc
#//-- replace sed /FrontEndGenericInterface/MyInterface/g

import argparse
import os #for isdir abspath dirname

print
print "***********************\n"
print "Copying <Interface>.h and <Interface>_interface.cc and renaming...\n" + \
	"Look for 'Success!' at end of print out.\n"
print


parser = argparse.ArgumentParser(description='Setup Firmware Component')


parser.add_argument('-s','--src',
		help='Source path to directory of <Interface>.h  and <Interface>_interface.cc to copy')
parser.add_argument('-o','--old',required=True,
		help='Name of old Interface')
parser.add_argument('-d','--dest',
		help='Destination path for new Interface')
parser.add_argument('-n','--new',required=True,
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

if (args.src): #if option used, then use args.src
	src = args.src
else:
	exit("Error: Must give a path to source interface (arg: --src).\n\n");

print 'Source directory is:'
print  src
print
print

#validate source directory
if ((not os.path.isdir(src + "/"))):
	print "Error!\n Check usage. "
	parser.print_help()
	print
	print "****************"
	exit("Error: Invalid source path '" + (src) + "'\n\n")

dest = src + "/" #default destination path to source path
if (args.dest): #if option used, then use args.dest
	dest = args.dest
else:
	print "No dest argument - assuming same as source path."

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
	exit("Error: Invalid destination path '" + (dest) + "'\n\n")


print  'Copy files and replace name...'

os.system("cp " + src + "/" + args.old + "_interface.cc " + dest + "/" + args.new + "_interface.cc");
os.system("sed -i s/" + args.old + "/" + args.new + "/g " + \
	dest + "/" + args.new + "_interface.cc");

os.system("cp " + src + "/" + args.old + ".h " + dest + "/" + args.new + ".h");
os.system("sed -i s/" + args.old + "/" + args.new + "/g " + \
	dest + "/" + args.new + ".h");




print
print "***********************\n"
print 'Success!'
print
print
