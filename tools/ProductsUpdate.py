#!/usr/bin/env python

#THIS IS DEPRECATED (according to me, RAR -- sept 2017.. Parilla made this a while ago)

import os
import subprocess

otsdaqVersion = "s64-e15 prof";

try:
	os.path.isdir(os.environ['PRODUCTS']);
except KeyError:
	print("PRODUCTS variable not set.");
	print("Example:");
	print("export PRODUCTS=`pwd`");
	exit(1);

########################################################################
#get pull products
########################################################################
cmd=os.environ['PRODUCTS'];
print(cmd)
os.chdir(cmd);

if(os.path.isfile('pullProducts')):
	os.remove('pullProducts');

######################################################################
cmd='curl -O http://scisoft.fnal.gov/scisoft/bundles/tools/pullProducts';
print(cmd)
os.system(cmd);

######################################################################
cmd='chmod +x pullProducts';
print(cmd)
os.system(cmd);

########################################################################
#pull the latest version of artdaq_demo from scisoft
########################################################################
cmd = 'curl -s http://scisoft.fnal.gov/scisoft/bundles/otsdaq/ | grep id=\\"v | grep -oP \'(?<=id=\\")[^\\">]*\'';
print(cmd);
process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE);
otsdaq_version,err = process.communicate();
if(err != '' and not err.find('Total')):
	print("There was an error executing \"" + cmd + "\"");
	print("Error:\n" + err);

otsdaq_versions = otsdaq_version.rstrip().split();

#print otsdaq_versions;

########################################################################
#detect operating system
########################################################################
cmd = "uname -r";
print(cmd)
process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE);
operatingSystem,err = process.communicate();
if(err != ''):
	print("There was an error executing \"" + cmd + "\"");
	print("Error:\n" + err);
#print out
if "el6" in operatingSystem:
	host_os = "slf6"
	xerces_os = "slf6"
elif "el7" in operatingSystem:
	host_os = "slf7"
	xerces_os = "sl7"


cmd='cd $Products';
print(cmd)
os.system(cmd)

for otsdaq_version in reversed(otsdaq_versions):
	print("Fetching products for otsdaq_version: " + otsdaq_version);
	print("This step might take longer than you wish so be patient...")
	cmd = "./pullProducts . " + host_os + " otsdaq-" + otsdaq_version + " " + otsdaqVersion;
	print(cmd);
	process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE);
	operatingSystem,err = process.communicate();
	if(err != ''):
		print("There was an error executing \"" + cmd + "\"");
		print("Error:\n" + err);
		if( err.find('MANIFEST') == -1):
			break;
		print("Trying to fetch an older otsdaq_version...")
	else:
		break;

########################################################################
# Removing all tar files
########################################################################
cmd="rm -f *.bz2 *.txt";
print(cmd)
os.system(cmd)
