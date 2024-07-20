/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Console colors for both browser and terminal environments

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// TYPE DECLARATIONS /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type ColorDict = { [key: string]: string };

/// COLORS BY NAME ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const COLOR_NAMES = [
  'Black',
  'White',
  'Red',
  'Orange',
  'Yellow',
  'Green',
  'Cyan',
  'Blue',
  'Purple',
  'Pink',
  'Gray'
];
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const TERM_COLORS: ColorDict = {
  // TOUT = makeTerminalOut(str); TOUT('hi')
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Underscore: '\x1b[4m',
  Blink: '\x1b[5m',
  Reverse: '\x1b[7m',
  Hidden: '\x1b[8m',
  //
  Black: '\x1b[30m',
  White: '\x1b[37m',
  Red: '\x1b[31m',
  Orange: '\x1b[38;5;202m',
  Yellow: '\x1b[33m',
  Green: '\x1b[32m',
  Cyan: '\x1b[36m',
  Blue: '\x1b[34m',
  Purple: '\x1b[35m',
  //
  BgBlack: '\x1b[40m',
  BgGray: '\x1b[100m',
  BgWhite: '\x1b[47m',
  BgRed: '\x1b[41m',
  BgOrange: '\x1b[48;5;202m',
  BgYellow: '\x1b[43m',
  BgCyan: '\x1b[46m',
  BgGreen: '\x1b[42m',
  BgBlue: '\x1b[44m',
  BgPurple: '\x1b[45m',
  BgPink: '\x1b[105m',

  // FORMATS
  TagBlack: '\x1b[30;1m',
  TagWhite: '\x1b[37;1m',
  TagRed: '\x1b[41;37m',
  TagOrange: '\x1b[43;37m',
  TagYellow: '\x1b[43;30m',
  TagGreen: '\x1b[42;30m',
  TagCyan: '\x1b[46;37m',
  TagBlue: '\x1b[44;37m',
  TagPurple: '\x1b[45;37m',
  TagPink: '\x1b[105;1m',
  TagGray: '\x1b[100;37m',
  TagNull: '\x1b[2;37m'
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const CSS_COMMON = 'padding:3px 5px;border-radius:2px;';
const CSS_COLORS: ColorDict = {
  Reset: 'color:auto;background-color:auto',
  // COLOR FOREGROUND
  Black: 'color:black',
  White: 'color:white',
  Red: 'color:red',
  Orange: 'color:orange',
  Yellow: 'color:orange',
  Green: 'color:green',
  Cyan: 'color:cyan',
  Blue: 'color:blue',
  Magenta: 'color:magenta',
  Pink: 'color:pink',
  // COLOR BACKGROUND
  TagRed: `color:#000;background-color:#f66;${CSS_COMMON}`,
  TagOrange: `color:#000;background-color:#fa4;${CSS_COMMON}`,
  TagYellow: `color:#000;background-color:#fd4;${CSS_COMMON}`,
  TagGreen: `color:#000;background-color:#5c8;${CSS_COMMON}`,
  TagCyan: `color:#000;background-color:#2dd;${CSS_COMMON}`,
  TagBlue: `color:#000;background-color:#2bf;${CSS_COMMON}`,
  TagPurple: `color:#000;background-color:#b6f;${CSS_COMMON}`,
  TagPink: `color:#000;background-color:#f9f;${CSS_COMMON}`,
  TagGray: `color:#fff;background-color:#999;${CSS_COMMON}`,
  TagNull: `color:#999;border:1px solid #ddd;${CSS_COMMON}`,
  // COLOR BACKGROUND DARK (BROWSER ONLY)
  TagDkRed: `color:white;background-color:maroon;${CSS_COMMON}`,
  TagDkOrange: `color:white;background-color:burntorange;${CSS_COMMON}`,
  TagDkYellow: `color:white;background-color:brown;${CSS_COMMON}`,
  TagDkGreen: `color:white;background-color:forestgreen;${CSS_COMMON}`,
  TagDkCyan: `color:white;background-color:cerulean;${CSS_COMMON}`,
  TagDkBlue: `color:white;background-color:darkblue;${CSS_COMMON}`,
  TagDkPurple: `color:white;background-color:indigo;${CSS_COMMON}`,
  TagDkPink: `color:white;background-color:fuchsia;${CSS_COMMON}`
};

/// COLORS BY MEANING /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const SEMANTIC_FORMATS = [
  'Build',
  'Error',
  'Alert',
  'Test',
  // system startup and components
  'System',
  'Server',
  'Database',
  'Network',
  // urnet framework
  'UR',
  'URNET',
  'URMOD',
  // application
  'AppMain',
  'AppModule',
  'AppState',
  'AppCore',
  'DataCore',
  // user interface
  'UI',
  // events
  'Phase',
  'Event',
  'Stream'
];
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
TERM_COLORS.TagBuild = TERM_COLORS.TagGray;
TERM_COLORS.TagError = TERM_COLORS.TagRed;
TERM_COLORS.TagAlert = TERM_COLORS.TagOrange;
TERM_COLORS.TagTest = TERM_COLORS.TagRed;
//
TERM_COLORS.TagSystem = TERM_COLORS.TagGray;
TERM_COLORS.TagServer = TERM_COLORS.TagGray;
TERM_COLORS.TagDatabase = TERM_COLORS.TagCyan;
TERM_COLORS.TagNetwork = TERM_COLORS.TagCyan;
//
TERM_COLORS.TagUR = TERM_COLORS.TagBlue;
TERM_COLORS.TagURNET = TERM_COLORS.TagBlue;
TERM_COLORS.TagURMOD = TERM_COLORS.TagBlue;
//
TERM_COLORS.TagAppMain = TERM_COLORS.TagGreen;
TERM_COLORS.TagAppModule = TERM_COLORS.TagGreen;
TERM_COLORS.TagAppState = TERM_COLORS.TagGreen;
TERM_COLORS.TagAppCore = TERM_COLORS.TagGreen;
TERM_COLORS.TagDataCore = TERM_COLORS.TagGreen;
//
TERM_COLORS.TagUI = TERM_COLORS.TagPurple;
//
TERM_COLORS.TagPhase = TERM_COLORS.TagPink;
TERM_COLORS.TagEvent = TERM_COLORS.TagPink;
TERM_COLORS.TagStream = TERM_COLORS.TagPink;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
CSS_COLORS.TagDebug = `color:#fff;background-color:IndianRed;${CSS_COMMON}`;
CSS_COLORS.TagWarning = `color:#fff;background:linear-gradient(
  -45deg,
  rgb(29,161,242),
  rgb(184,107,107),
  rgb(76,158,135)
);${CSS_COMMON}`;
CSS_COLORS.TagTest = CSS_COLORS.TagRed;
//
CSS_COLORS.TagSystem = CSS_COLORS.TagGray;
CSS_COLORS.TagServer = CSS_COLORS.TagGray;
CSS_COLORS.TagDatabase = CSS_COLORS.TagCyan;
CSS_COLORS.TagNetwork = CSS_COLORS.TagCyan;
//
CSS_COLORS.TagUR = `color:CornflowerBlue;border:1px solid CornflowerBlue;${CSS_COMMON}`;
CSS_COLORS.TagURNET = `color:#fff;background-color:MediumSlateBlue;${CSS_COMMON}`;
CSS_COLORS.TagURMOD = `color:#fff;background:linear-gradient(
  -45deg,
  CornflowerBlue 0%,
  LightSkyBlue 25%,
  RoyalBlue 100%
);${CSS_COMMON}`;
CSS_COLORS.TagAppMain = CSS_COLORS.TagGreen;
CSS_COLORS.TagAppModule = CSS_COLORS.TagGreen;
CSS_COLORS.TagAppState = `color:#fff;background-color:Navy;${CSS_COMMON}`;
CSS_COLORS.TagUI = CSS_COLORS.TagDkOrange;
CSS_COLORS.TagEvent = CSS_COLORS.TagDkOrange;
CSS_COLORS.TagStream = CSS_COLORS.TagDkOrange;
CSS_COLORS.TagPhase = `color:#fff;background-color:MediumVioletRed;${CSS_COMMON}`;

/// CONVENENICE CONSTANTS /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** these are used for direct color output with console.log in node */
const ANSI_COLORS = {
  BLU: '\x1b[34;1m',
  YEL: '\x1b[33;1m',
  RED: '\x1b[31m',
  DIM: '\x1b[2m',
  BLD: '\x1b[1m',
  NRM: '\x1b[0m'
};

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { TERM_COLORS, CSS_COLORS, ANSI_COLORS };
