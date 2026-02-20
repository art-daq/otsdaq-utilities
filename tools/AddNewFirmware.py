#!/usr/bin/env python
# ____________________________________________________________
#
#  addNewFirmware.py --help
#
# ____________________________________________________________
#

import argparse
import os  # for isdir abspath dirname

print()
print("***********************\n")
print("Setting up and Installing...\n" + "Look for 'Success!' at end of print out.\n")
print()


parser = argparse.ArgumentParser(description="Setup Firmware Component")

parser.add_argument("-d", "--dest", help="Destination path for new Interface")
parser.add_argument("-n", "--name", help="Name of new Hardware")

args = parser.parse_args()

print()
print("Arguments parsed...")
print(args)
print()
print()

########
# at this point call is legal according to argparse

scriptDir = os.path.dirname(os.path.abspath(__file__))


print("Script directory is:")
print(scriptDir)
print()

dest = scriptDir + "/../hdl"  # default destination path
if args.dest:  # if option used, then use args.dest
    dest = args.dest

print("Destination directory is:")
print(dest)
print()
print()

# validate destination directory
if not os.path.isdir(dest + "/"):
    print("Error!\n Check usage. ")
    parser.print_help()
    print()
    print("****************")
    exit("Error: Invalid destination path '" + (args.dest) + "')\n\n")


print("Copy files...")

srcFile = scriptDir + "/../../otsdaq/otsdaq/DAQHardware/FrontEndFirmwareTemplate.cc"
os.system("cp " + srcFile + " " + args.dest + "/" + args.name + ".cc")
os.system(
    "sed -i s/FrontEndFirmwareTemplate/"
    + args.name
    + "/g "
    + args.dest
    + "/"
    + args.name
    + ".cc"
)

srcFile = scriptDir + "/../../otsdaq/otsdaq/DAQHardware/FrontEndFirmwareTemplate.h"
os.system("cp " + srcFile + " " + args.dest + "/" + args.name + ".h")
os.system(
    "sed -i s/FrontEndFirmwareTemplate/"
    + args.name
    + "/g "
    + args.dest
    + "/"
    + args.name
    + ".h"
)


print()
print("***********************\n")
print("Success!")
print()
print()
