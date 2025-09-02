[![otsdaq](https://github.com/art-daq/otsdaq/blob/develop/doc/logo.png?raw=true)](https://otsdaq.fnal.gov/)

_otsdaq_ is a Ready-to-Use data-acquisition (DAQ) solution aimed at scaling down to test-beam, detector development, and other rapid-deployment scenarios; and scaling up through the development cycle to fullscale production and operation.   _otsdaq_ uses the _artdaq_ DAQ framework under-the-hood, providing flexibility and scalability to meet evolving DAQ needs.

_otsdaq_ provides a library of supported front-end boards and firmware modules which implement a custom UDP protocol.   Additionally, an integrated Run Control GUI and readout software are provided, preconfigured to communicate with _otsdaq_ firmware.

otsdaq-utilities provides some feature extensions built off of the base classes in _otsdaq_ including Configuration, Chat, and Logbook utilities. otsdaq-utilities also includes all of the client side web interface code (i.e., html, css, and JavaScript).

# Code Documentation {#topicList}


Below are some helpful links to _otsdaq_ C++ classes organized by topic. The topics are as follows:  
  
*   [Supervisor Base Classes](#supervisor)
*   [_otsdaq_ Core Supervisors](#coreSupervisors)
*   [Configuration Primer](https://otsdaq.fnal.gov/tutorials/first_demo/topics/configuration_primer.html)
*   [Web Desktop Login and Requests](#access)
*   [Front-ends](#frontends)
*   [Data Managers](#dataManagers)
*   [_artdaq_](#artdaq)
*   [Visualization and DQM](#visualization)
*   [Slow Controls](#slowControls)

  
  
_otsdaq_ is composed of three core repositories (otsdaq, otsdaq-utilities, and otsdaq-components) and one example user repository (otsdaq-demo). The intention is for users to clone otsdaq-demo into one or many of their own repositories for their own specific applications. Here are the links to the source code documentation for each respository:  
  

*   [otsdaq](https://art-daq.github.io/otsdaq_doxygen/otsdaq/)
*   [otsdaq-utilities](https://art-daq.github.io/otsdaq_doxygen/otsdaq-utilities/)
*   [otsdaq-components](https://art-daq.github.io/otsdaq_doxygen/otsdaq-components/)
*   [otsdaq-demo](https://art-daq.github.io/otsdaq_doxygen/otsdaq-demo/)

  
  
_otsdaq_ is built on top of the _artdaq_ toolkit and the XDAQ toolkit:  
  

*   [_artdaq_ homepage](https://artdaq.fnal.gov)
*   [XDAQ homepage](https://twiki.cern.ch/twiki/bin/view/CMSPublic/CMSOS)
*   [_otsdaq_ homepage](https://otsdaq.fnal.gov)

  
