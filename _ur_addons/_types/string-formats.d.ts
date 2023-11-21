/* eslint-disable no-unused-vars */
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  string formats for common patterns
  note: the number declarations 

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// DATE STRINGS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// typescript does not provide regex or pattern-style type declarations
type Year = `${number}`; // year 0000-9999
type Month = `${number}`; // month 01-12
type Day = `${number}`; // day 01-31
type Hour = `${number}`; // hour 00-23
type Minute = `${number}`; // minute 00-59
type Second = `${number}`; // second 00-59

/// INPUT TYPES ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type CC_DateString = `${Year}-${Month}-${Day}`;
type CC_TimeString = `${Hour}:${Minute}:${Second}`;
type CC_DateTimeString = `${CC_DateString}:${CC_TimeString}`;
