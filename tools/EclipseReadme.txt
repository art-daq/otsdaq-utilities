########################################################################
Problem: C++11
Project properties -> C/C++ General -> Preprocessor Include Paths, Macros etc. -> tab Providers -> CDT GCC Builtin Compiler Settings ().

Under C/C++ Build (at project settings),
find the Preprocessor Include Path and go to the Providers Tab.
Deselect all except CDT GCC Builtin Compiler Settings.
Then untag Share settings entries...
Add the option -std=c++11 to the text box called Command to get compiler specs.

########################################################################
Problem: function 'to_string' could not be resolved

C++ General -> Preprocessor Include Paths ->
in the left pane under the Entries tab highlight GNU C++,
then on the right pane highlight CDT User Settings,
then click add off to the right.
In the resulting pop-up,
select #preprocessor Macro,
for name use __cplusplus,
and for value use 201103L.
Once complete right click the project under
Project Explorer -> select Index -> Rebuild.
Then wait, the red line under std::to_string

########################################################################
INVALID OVERLOAD:
If you like, you can avoid this message by completely disabling the check for invalid overloads:

Open Preferences Window (from main menu Window\Preferences)
Go to C/C++ -> Code Analysis
At the right pane see "Syntax and Semantic Errors" | "Invalid Overload"
Un-check the check-box
Press OK
