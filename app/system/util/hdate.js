/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Historical Date Utilities

  Used by the URDateField component to parse and format historical dates.
  Also used in NodeTablea nd EdgeTable for sorting and filtering.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/
import * as chrono from 'chrono-node';

const HDATE = {};

/// HISTORICAL CHRONO /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Create a custom parser for BCE/CE dates
///   ex: erasChrono.parseDate("I'll arrive at 2.30AM tomorrow");
HDATE.erasChrono = chrono.casual.clone();
HDATE.erasChrono.parsers.push({
  pattern: () => {
    return /(\d+)\s*(BCE|CE|BC|AD)/i;
  },
  extract: (context, match) => {
    const year = parseInt(match[1], 10);
    const era = match[2].toUpperCase();
    // Adjust the year based on the era
    const adjustedYear = era === 'BCE' || era === 'BC' ? -year : year;
    return { year: adjustedYear };
  }
});

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Use template to define other values, e.g. BC/AD
// Other ERAS are not currently defined
HDATE.ERAS = {
  pre: 'BCE',
  post: 'CE'
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// `CALENDAR` is not currently used.
HDATE.CALENDAR = {
  ISO: 'iso8601',
  GREGORIAN: 'gregory',
  JULIAN: 'julian',
  ISLAMIC: 'islamic',
  HEBREW: 'hebrew',
  CHINESE: 'chinese'
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
HDATE.DATEFORMAT = {
  AS_ENTERED: 'As Entered',

  // MONTH
  MONTH_ABBR: 'MMM',
  MONTH_FULL: 'Month',
  MONTH_NUM: 'M',
  MONTH_PAD: 'MM',

  // MONTHDAY
  MONTHDAY_ABBR: 'MMM D',
  MONTHDAY_FULL: 'Month D',
  MONTHDAY_NUM: 'M/D',
  MONTHDAY_PAD: 'MM/DD',

  // YEARMONTHDAY
  MONTHDAYYEAR_ABBR: 'MMM D, YYYY',
  MONTHDAYYEAR_FULL: 'Month D, YYYY',
  MONTHDAYYEAR_NUM: 'M/D/YYYY',
  MONTHDAYYEAR_PAD: 'MM/DD/YYYY',
  YEARMONTHDAY_ABBR: 'YYYY MMM D',
  YEARMONTHDAY_FULL: 'YYYY Month D',
  YEARMONTHDAY_NUM: 'YYYY/M/D',
  YEARMONTHDAY_PAD: 'YYYY/MM/DD',
  HISTORICAL_MONTHDAYYEAR_ABBR: 'MMM D, YYYY CE',
  HISTORICAL_MONTHDAYYEAR_FULL: 'Month D, YYYY CE',
  HISTORICAL_MONTHDAYYEAR_NUM: 'M/D/YYYY CE',
  HISTORICAL_MONTHDAYYEAR_PAD: 'MM/DD/YYYY CE',
  HISTORICAL_YEARMONTHDAY_ABBR: 'YYYY MMM D CE',
  HISTORICAL_YEARMONTHDAY_FULL: 'YYYY Month D CE',
  HISTORICAL_YEARMONTHDAY_NUM: 'YYYY/M/D CE',
  HISTORICAL_YEARMONTHDAY_PAD: 'YYYY/MM/DD CE',

  // YEARMONTH
  MONTHYEAR_ABBR: 'MMM YYYY',
  MONTHYEAR_FULL: 'Month YYYY',
  MONTHYEAR_NUM: 'M/YYYY',
  MONTHYEAR_PAD: 'MM/YYYY',
  YEARMONTH_ABBR: 'YYYY MMM',
  YEARMONTH_FULL: 'YYYY Month',
  YEARMONTH_NUM: 'YYYY/M',
  YEARMONTH_PAD: 'YYYY/MM',
  HISTORICAL_MONTHYEAR_ABBR: 'MMM YYYY CE',
  HISTORICAL_MONTHYEAR_FULL: 'Month YYYY CE',
  HISTORICAL_MONTHYEAR_NUM: 'M/YYYY CE',
  HISTORICAL_MONTHYEAR_PAD: 'MM/YYYY CE',
  HISTORICAL_YEARMONTH_ABBR: 'YYYY MMM CE',
  HISTORICAL_YEARMONTH_FULL: 'YYYY Month CE',
  HISTORICAL_YEARMONTH_NUM: 'YYYY/M CE',
  HISTORICAL_YEARMONTH_PAD: 'YYYY/MM CE',

  // YEAR
  YEAR: 'YYYY',
  HISTORICALYEAR: 'YYYY CE'
};

/// UTILITIES //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
HDATE.u_pad = num => {
  if (!num) return '';
  return num.toString().padStart(2, '0');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
HDATE.u_monthAbbr = num => {
  const date = new Date(2000, num - 1, 1);
  return date.toLocaleDateString('default', { month: 'short' });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
HDATE.u_monthName = num => {
  const date = new Date(2000, num - 1, 1);
  return date.toLocaleDateString('default', { month: 'long' });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Sorting routines
 *  @param {ParsingResult} date1 - a ParsingResult
 *  @param {ParsingResult} date2 - a ParsingResult
 */
HDATE.gt = (date1, date2) => {
  console.log('dates:', date1, '>', date2);
  if (!date1 || !date2) return '';
  const d1 = date1[0].start.knownValues;
  const d2 = date2[0].start.knownValues;
  if (d1.year && d2.year && d1.year > d2.year) return true;
  if (d1.month && d2.month && d1.month > d2.month) return true;
  if (d1.day && d2.day && d1.day > d2.day) return true;
  if (d1.hour && d2.hour && d1.hour > d2.hour) return true;
  if (d1.minute && d2.minute && d1.minute > d2.minute) return true;
  if (d1.second && d2.second && d1.second > d2.second) return true;
  return false
}
HDATE.lt = (date1, date2) => {
  console.log('dates:', date1, '<', date2);
  if (!date1 || !date2) return '';
  const d1 = date1[0].start.knownValues;
  const d2 = date2[0].start.knownValues;
  if (d1.year && d2.year && d1.year < d2.year) return true;
  if (d1.month && d2.month && d1.month < d2.month) return true;
  if (d1.day && d2.day && d1.day < d2.day) return true;
  if (d1.hour && d2.hour && d1.hour < d2.hour) return true;
  if (d1.minute && d2.minute && d1.minute < d2.minute) return true;
  if (d1.second && d2.second && d1.second < d2.second) return true;
  return false;
}

/// HDATE METHODS //////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
HDATE.Parse = dateInputStr => {
  return HDATE.erasChrono.parse(dateInputStr);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Show how the raw input string is parsed into date information by breaking
  *  down the known values (e.g. `day`, and `month`) into a human-readable string.
  *  @param {Array} ParsedResult - a chrono array of parsed date objects
  */
HDATE.ShowValidationResults = ParsedResult => {
  // Show interpreted values
  if (ParsedResult.length > 0) {
    const knownValues = ParsedResult[0].start.knownValues;
    const dateValidationStr = knownValues
      ? Object.keys(knownValues).map(k => `${k}:${knownValues[k]}`)
      : ["result: 'cannot interpret'"];
    // TODO show HDATE.ERAS TOO?
    return dateValidationStr;
  }
  return undefined;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Show the list of available format types with previews based on the values
 *  parsed from the input string. e.g. `April 1, 2024` will show formats
 *  that include a month, day, and year.
 *  @param {Array} ParsedResult - a chrono array of parsed date objects
 *  @return {Array} formatMenuOptions - an array of format objects with `value` and `preview` keys
 */
HDATE.ShowMatchingFormats = (ParsedResult, dateFormat, allowFormatSelection) => {
  let options = [{ value: 'AS_ENTERED', preview: 'as entered' }];
  if (ParsedResult.length < 1) {
    if (allowFormatSelection) return options;
    else return [
      { value: dateFormat, preview: HDATE.DATEFORMAT[dateFormat] }
    ];
  }

  let matchingTypes = [];
  let additionalOptions = [];
  const knownValues = ParsedResult[0].start.knownValues;
  const knownTypes = Object.keys(ParsedResult[0].start.knownValues);
  const dateInputStr = ParsedResult[0].text;

  if (!allowFormatSelection) {
    // force the format to use the defined format
    const options = [
      { value: dateFormat, preview: HDATE.GetPreviewStr(dateInputStr, knownValues, dateFormat) }
    ];
    return options;
  }

  // Figure out which formats are eligible based on the known values
  if (knownTypes.includes('year')) {
    if (knownTypes.includes('month')) {
      if (knownTypes.includes('day')) {
        // year month day
        matchingTypes = [
          'MONTHDAYYEAR_ABBR',
          'MONTHDAYYEAR_FULL',
          'MONTHDAYYEAR_NUM',
          'MONTHDAYYEAR_PAD',
          'YEARMONTHDAY_ABBR',
          'YEARMONTHDAY_FULL',
          'YEARMONTHDAY_NUM',
          'YEARMONTHDAY_PAD',
          'HISTORICAL_MONTHDAYYEAR_ABBR',
          'HISTORICAL_MONTHDAYYEAR_FULL',
          'HISTORICAL_MONTHDAYYEAR_NUM',
          'HISTORICAL_MONTHDAYYEAR_PAD',
          'HISTORICAL_YEARMONTHDAY_ABBR',
          'HISTORICAL_YEARMONTHDAY_FULL',
          'HISTORICAL_YEARMONTHDAY_NUM',
          'HISTORICAL_YEARMONTHDAY_PAD'
        ];
      } else {
        // year month only
        matchingTypes = [
          'MONTHYEAR_ABBR',
          'MONTHYEAR_FULL',
          'MONTHYEAR_NUM',
          'MONTHYEAR_PAD',
          'YEARMONTH_ABBR',
          'YEARMONTH_FULL',
          'YEARMONTH_NUM',
          'YEARMONTH_PAD',
          'HISTORICAL_MONTHYEAR_ABBR',
          'HISTORICAL_MONTHYEAR_FULL',
          'HISTORICAL_MONTHYEAR_NUM',
          'HISTORICAL_MONTHYEAR_PAD',
          'HISTORICAL_YEARMONTH_ABBR',
          'HISTORICAL_YEARMONTH_FULL',
          'HISTORICAL_YEARMONTH_NUM',
          'HISTORICAL_YEARMONTH_PAD'
        ];
      }
    } else {
      // year only
      matchingTypes = ['YEAR', 'HISTORICALYEAR'];
    }
  } else if (knownTypes.includes('month')) {
    if (knownTypes.includes('day')) {
      matchingTypes = [
        'MONTHDAY_ABBR',
        'MONTHDAY_FULL',
        'MONTHDAY_NUM',
        'MONTHDAY_PAD'
      ];
    } else {
      matchingTypes = ['MONTH_ABBR', 'MONTH_FULL', 'MONTH_NUM', 'MONTH_PAD'];
    }
  }

  additionalOptions = matchingTypes.map(type => {
    return { value: type, preview: HDATE.GetPreviewStr(dateInputStr, knownValues, type) };
  });
  options = [...additionalOptions, ...options];
  return options;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Show the formatted date string using the parsed result information
 *  @param {String} dateInputStr - the raw input string
 *  @param {Object} knownValues - the parsed date values
 *  @param {String} format - the selected format
 *  @returns {String} - the formatted date string
 */
HDATE.GetPreviewStr = (dateInputStr, knownValues, format) => {
  const month = knownValues.month || 'M?';
  const day = knownValues.day || 'D?';
  const year = knownValues.year || 'Y?';
  switch (format) {
    case 'MONTH_ABBR':
      return `${HDATE.u_monthAbbr(month)}`;
    case 'MONTH_FULL':
      return `${HDATE.u_monthName(month)}`;
    case 'MONTH_NUM':
      return `${month}`;
    case 'MONTH_PAD':
      return `${HDATE.u_pad(month)}`;
    case 'MONTHDAY_ABBR':
      return `${HDATE.u_monthAbbr(month)} ${day}`;
    case 'MONTHDAY_FULL':
      return `${HDATE.u_monthName(month)} ${day}`;
    case 'MONTHDAY_NUM':
      return `${month}/${day}`;
    case 'MONTHDAY_PAD':
      return `${HDATE.u_pad(month)}/${HDATE.u_pad(day)}`;
    case 'MONTHDAYYEAR_ABBR':
      return `${HDATE.u_monthAbbr(month)} ${day}, ${year}`;
    case 'MONTHDAYYEAR_FULL':
      return `${HDATE.u_monthName(month)} ${day}, ${year}`;
    case 'MONTHDAYYEAR_NUM':
      return `${month}/${day}/${year}`;
    case 'MONTHDAYYEAR_PAD':
      return `${HDATE.u_pad(month)}/${HDATE.u_pad(day)}/${year}`;
    case 'YEARMONTHDAY_ABBR':
      return `${year} ${HDATE.u_monthAbbr(month)} ${day}`;
    case 'YEARMONTHDAY_FULL':
      return `${year} ${HDATE.u_monthName(month)} ${day}`;
    case 'YEARMONTHDAY_NUM':
      return `${year}/${month}/${day}`;
    case 'YEARMONTHDAY_PAD':
      return `${year}/${HDATE.u_pad(month)}/${HDATE.u_pad(day)}`;
    case 'HISTORICAL_MONTHDAYYEAR_ABBR':
      return year < 1
        ? `${HDATE.u_monthAbbr(month)} ${day}, ${Math.abs(year)} ${HDATE.ERAS.pre}`
        : `${HDATE.u_monthAbbr(month)} ${day}, ${year} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_MONTHDAYYEAR_FULL':
      return year < 1
        ? `${HDATE.u_monthName(month)} ${day}, ${Math.abs(year)} ${HDATE.ERAS.pre}`
        : `${HDATE.u_monthName(month)} ${day}, ${year} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_MONTHDAYYEAR_NUM':
      return year < 1
        ? `${month}/${day}/${Math.abs(year)} ${HDATE.ERAS.pre}`
        : `${month}/${day}/${year} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_MONTHDAYYEAR_PAD':
      return year < 1
        ? `${HDATE.u_pad(month)}/${HDATE.u_pad(day)}/${Math.abs(year)} ${HDATE.ERAS.pre}`
        : `${HDATE.u_pad(month)}/${HDATE.u_pad(day)}/${year} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_YEARMONTHDAY_ABBR':
      return year < 1
        ? `${Math.abs(year)} ${HDATE.u_monthAbbr(month)} ${day} ${HDATE.ERAS.pre}`
        : `${year} ${HDATE.u_monthAbbr(month)} ${day} ${HDATE.ERAS.post} `;
    case 'HISTORICAL_YEARMONTHDAY_FULL':
      return year < 1
        ? `${Math.abs(year)} ${HDATE.u_monthName(month)} ${day} ${HDATE.ERAS.pre}`
        : `${year} ${HDATE.u_monthName(month)} ${day} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_YEARMONTHDAY_NUM':
      return year < 1
        ? `${Math.abs(year)}/${month}/${day} ${HDATE.ERAS.pre}`
        : `${year}/${month}/${day} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_YEARMONTHDAY_PAD':
      return year < 1
        ? `${Math.abs(year)}/${HDATE.u_pad(month)}/${HDATE.u_pad(day)} ${HDATE.ERAS.pre}`
        : `${year}/${HDATE.u_pad(month)}/${HDATE.u_pad(day)} ${HDATE.ERAS.post}`;
    case 'MONTHYEAR_ABBR':
      return `${HDATE.u_monthAbbr(month)} ${year}`;
    case 'MONTHYEAR_FULL':
      return `${HDATE.u_monthName(month)} ${year}`;
    case 'MONTHYEAR_NUM':
      return `${month}/${year}`;
    case 'MONTHYEAR_PAD':
      return `${HDATE.u_pad(month)}/${year}`;
    case 'YEARMONTH_ABBR':
      return `${year} ${HDATE.u_monthAbbr(month)}`;
    case 'YEARMONTH_FULL':
      return `${year} ${HDATE.u_monthName(month)}`;
    case 'YEARMONTH_NUM':
      return `${year}/${month}`;
    case 'YEARMONTH_PAD':
      return `${year}/${HDATE.u_pad(month)}`;
    case 'HISTORICAL_MONTHYEAR_ABBR':
      return year < 1
        ? `${HDATE.u_monthAbbr(month)} ${Math.abs(year)} ${HDATE.ERAS.pre}`
        : `${HDATE.u_monthAbbr(month)} ${year} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_MONTHYEAR_FULL':
      return year < 1
        ? `${HDATE.u_monthName(month)} ${Math.abs(year)} ${HDATE.ERAS.pre}`
        : `${HDATE.u_monthName(month)} ${year} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_MONTHYEAR_NUM':
      return year < 1
        ? `${month}/${Math.abs(year)} ${HDATE.ERAS.pre}`
        : `${month}/${year} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_MONTHYEAR_PAD':
      return year < 1
        ? `${HDATE.u_pad(month)}/${Math.abs(year)} ${HDATE.ERAS.pre}`
        : `${HDATE.u_pad(month)}/${year} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_YEARMONTH_ABBR':
      return year < 1
        ? `${Math.abs(year)} ${HDATE.u_monthAbbr(month)} ${HDATE.ERAS.pre}`
        : `${year} ${HDATE.u_monthAbbr(month)} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_YEARMONTH_FULL':
      return year < 1
        ? `${Math.abs(year)} ${HDATE.u_monthName(month)} ${HDATE.ERAS.pre}`
        : `${year} ${HDATE.u_monthName(month)} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_YEARMONTH_NUM':
      return year < 1
        ? `${Math.abs(year)}/${month} ${HDATE.ERAS.pre}`
        : `${year}/${month} ${HDATE.ERAS.post}`;
    case 'HISTORICAL_YEARMONTH_PAD':
      return year < 1
        ? `${Math.abs(year)}/${HDATE.u_pad(month)} ${HDATE.ERAS.pre}`
        : `${year}/${HDATE.u_pad(month)} ${HDATE.ERAS.post}`;
    case 'YEAR':
      return `${year}`;
    case 'HISTORICALYEAR':
      return year < 1 ? `${Math.abs(year)} ${HDATE.ERAS.pre}` : `${year} ${HDATE.ERAS.post}`;
    case 'AS_ENTERED':
    default:
      // console.log('showprevieow...showing as entered', dateInputStr);
      return `${dateInputStr}` || '...';
  }
}

/// MODULE EXPORTS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = HDATE;
