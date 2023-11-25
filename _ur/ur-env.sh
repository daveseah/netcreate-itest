# PATH SETTINGS
UR_BUILD="./"
CLI_BUILD="./npm-scripts"
MODS_BUILD="../_ur_mods"
TEST_BUILD="../_ur_addons"

# Use --max-old-space-size to limit memory (values are in MB, so 128 is 128MB)
DEBUG="--inspect-brk" # use --inspect-brk to break on first line
OPTS="--trace-warnings" # use --trace-warnings to show deprecation warnings

# $IFS -  Internal Field Separator variable = field delimiters (e.g. default space, tab, newline) 
# $LINENO -  current line number in the script where this variable is used.
# $SHELL -  This variable contains the path to the default shell (e.g., /bin/bash, /bin/sh) used to execute the script.
# $0 - name of script or shell currently running

# $# - number of arguments (positional parameters) passed to the script.
# $* - ($*) all parameters as string
# $@ - ($@)an array of strings  
# $1, $2, ... $n - the individual positional parameters
# shift - shift positional parameters to the left by one (e.g. $2 becomes $1)
# $? -  exit status of the last executed command (0 = success is convention)
# $$ -  process ID (PID) of the currently running script or shell.
# $! - the PID of the last background command that was executed.

