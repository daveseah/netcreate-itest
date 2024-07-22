/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URDateField

  A general date input field that can support a variety of calendar formats
  for historical projects, e.g. 1000 AD, 10,000 BCE.

  The intent is to provide a unstructured input field that allows users to
  enter arbitrary date-related strings that can be parsed by the application
  well enough to support filtering and sorting.

  This is primarily used for data input rather than timestamping.

  The input field itself is intended to be flexible, using the `chrono-node`
  library to parse a wide variety of date formats.
  1. The user inputs a raw date-related string, e.g. "circa 1492"
  2. The component then interprets the parsed date and offers a selection of
     formats for the user to choose from.  The user has the option to select
     the format "as entered" or to choose from a list of suggested formats
     based on the parsed date.
  3. The selected format is then displayed in the field.
  4. When the user clicks "Save", the date is saved as
      {value: "raw date string", format: "selected format"}

  Formats are dynamically generated based on the available parsed date,
  displaying only formats that match the the parsed dimensions. For example, if
  the parsed data includes a year, month, and day, the component will offer
  a variety of formats including "April 1, 2024" and "2024/4/1". If the parsed
  date only includes a year and month, the component will offer formats like
  "April 2024" and "2024/4", but not "April 1, 2024" if the day is missing.
  If the parsed date only includes a year, the component will offer formats
  like "2024" and "2024 CE", etc.

  Eras are handled via a template setting. The user can set the era to BCE/CE or BC/AD.
  Dates can be entered in any format, e.g. "2024 BCE", "2024 BC", "2024 CE",
  but the selected format will use the format defined in the template, e.g.
  if the eras format is set to "BCE/CE", entering "1024 ad" will be formatted
  as "1024 CE".  (If you select "as entered" as the format you can still use "1024 ad")

  For ambiguous years, adding a "CE" or "AD" to the end of the date can
  clarify the era. For example, "102" can't be parsed, but "102 ad"
  will parse the input as a year.

  You can add extra descriptive text to the field.  As long as the field can
  interpret the date, the exact text doesn't matter.  So you can add other
  descriptive text as part of the field and sorting and filtering should still
  work.  This doesn't work if the input can't be interpreted.  And you do have
  to make sure the interpretation is correct.

  The stored value of a historical date field includes:
  - The raw input string (`value`)
  - The selected format ('format')
  - The formatted date string (`formattedDateString`)
  The final output is then dynamically generated based on the selection.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect } from 'react';
import * as chrono from 'chrono-node';
// import * as Temporal from 'temporal-polyfill';
import 'temporal-polyfill/global';

import UNISYS from 'unisys/client';

/// HISTORICAL CHRONO /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Create a custom parser for BCE/CE dates
///   ex: erasChrono.parseDate("I'll arrive at 2.30AM tomorrow");
const erasChrono = chrono.casual.clone();
erasChrono.parsers.push({
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
/// Initialize UNISYS DATA LINK for functional react component
const UDATAOwner = { name: 'URDateField' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);
const DBG = false;
const PR = 'URDateField';

// Use template to define other values, e.g. BC/AD
// Other eras are not currently defined
let ERAS = {
  pre: 'BCE',
  post: 'CE'
};

// `CALENDAR` is not currently used.
let CALENDAR = {
  ISO: 'iso8601',
  GREGORIAN: 'gregory',
  JULIAN: 'julian',
  ISLAMIC: 'islamic',
  HEBREW: 'hebrew',
  CHINESE: 'chinese'
};

export const DATEFORMAT = {
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
function u_pad(num) {
  if (!num) return '';
  return num.toString().padStart(2, '0');
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function u_monthAbbr(num) {
  const date = new Date(2000, num - 1, 1);
  return date.toLocaleDateString('default', { month: 'short' });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function u_monthName(num) {
  const date = new Date(2000, num - 1, 1);
  return date.toLocaleDateString('default', { month: 'long' });
}

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URDateField({
  id,
  value = '', // string or {value, format}
  dateFormat = 'AS_ENTERED',
  allowFormatSelection = false,
  readOnly,
  onChange,
  helpText
}) {
  /// CONSTANTS + STATES
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// `value` could be a string (if allowFormatSelect is false, so the default format is used)
  /// or an object { value, format } that stores the raw date string and the selected format.
  /// if {value, format} is passed for `value`, use the format to override dateFormat
  const c_value = value.value || value;
  const c_dateFormat = value.format || dateFormat;

  /// formatMenuOptions is a list of formats that are possible given the current input
  const [formatMenuOptions, setFormatMenuOptions] = useState([
    {
      value: 'AS_ENTERED',
      preview: 'as entered'
    }
  ]);
  const [selectedDateFormat, setSelectedDateFormat] = useState(c_dateFormat); // format currently selected in the format menu
  const [dateInputStr, setDateInputStr] = useState(c_value); // raw date as entered by the user
  const [dateValidationStr, setDateValidationStr] = useState('...'); // human-readable verification e.g. 'month:2024'
  const [dateDisplayStr, setDateDisplayStr] = useState(''); // final rendered date in selected format

  /// Component Effect - set up listeners on mount */
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    const ParsedResult = erasChrono.parse(dateInputStr);
    c_ShowValidationResults(ParsedResult);
    c_ShowMatchingFormats(ParsedResult);
    c_SetSelectedFormatResult();
  }, [selectedDateFormat, dateInputStr, dateDisplayStr]);

  /// COMPONENT HELPER METHODS ////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Show how the raw input string is parsed into date information by breaking
   *  down the known values (e.g. `day`, and `month`) into a human-readable string.
   *  @param {Array} ParsedResult - a chrono array of parsed date objects
   */
  function c_ShowValidationResults(ParsedResult) {
    // Show interpreted values
    if (ParsedResult.length > 0) {
      const knownValues = ParsedResult[0].start.knownValues;
      const dateValidationStr = knownValues
        ? Object.keys(knownValues).map(k => `${k}:${knownValues[k]}`)
        : ["result: 'cannot interpret'"];

      // TODO show ERAS TOO?

      setDateValidationStr(dateValidationStr.join(' '));
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Show the list of available format types with previews based on the values
   *  parsed from the input string. e.g. `April 1, 2024` will show formats
   *  that include a month, day, and year.
   *  @param {Array} ParsedResult - a chrono array of parsed date objects
   */
  function c_ShowMatchingFormats(ParsedResult) {
    let options = [{ value: 'AS_ENTERED', preview: 'as entered' }];
    if (ParsedResult.length < 1) {
      if (allowFormatSelection) setFormatMenuOptions(options);
      else
        setFormatMenuOptions([
          { value: dateFormat, preview: DATEFORMAT[dateFormat] }
        ]);
      return;
    }

    let matchingTypes = [];
    let additionalOptions = [];
    const knownValues = ParsedResult[0].start.knownValues;
    const knownTypes = Object.keys(ParsedResult[0].start.knownValues);

    if (!allowFormatSelection) {
      // force the format to use the defined format
      const options = [
        { value: dateFormat, preview: c_GetPreviewStr(knownValues, dateFormat) }
      ];
      setFormatMenuOptions(options);
      return;
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
      return { value: type, preview: c_GetPreviewStr(knownValues, type) };
    });
    options = [...additionalOptions, ...options];
    setFormatMenuOptions(options);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Show the formatted date string using the parsed result information
   *  @param {Object} knownValues - the parsed date values
   *  @param {String} format - the selected format
   */
  function c_GetPreviewStr(knownValues, format) {
    const month = knownValues.month || 'M?';
    const day = knownValues.day || 'D?';
    const year = knownValues.year || 'Y?';
    switch (format) {
      case 'MONTH_ABBR':
        return `${u_monthAbbr(month)}`;
      case 'MONTH_FULL':
        return `${u_monthName(month)}`;
      case 'MONTH_NUM':
        return `${month}`;
      case 'MONTH_PAD':
        return `${u_pad(month)}`;
      case 'MONTHDAY_ABBR':
        return `${u_monthAbbr(month)} ${day}`;
      case 'MONTHDAY_FULL':
        return `${u_monthName(month)} ${day}`;
      case 'MONTHDAY_NUM':
        return `${month}/${day}`;
      case 'MONTHDAY_PAD':
        return `${u_pad(month)}/${u_pad(day)}`;
      case 'MONTHDAYYEAR_ABBR':
        return `${u_monthAbbr(month)} ${day}, ${year}`;
      case 'MONTHDAYYEAR_FULL':
        return `${u_monthName(month)} ${day}, ${year}`;
      case 'MONTHDAYYEAR_NUM':
        return `${month}/${day}/${year}`;
      case 'MONTHDAYYEAR_PAD':
        return `${u_pad(month)}/${u_pad(day)}/${year}`;
      case 'YEARMONTHDAY_ABBR':
        return `${year} ${u_monthAbbr(month)} ${day}`;
      case 'YEARMONTHDAY_FULL':
        return `${year} ${u_monthName(month)} ${day}`;
      case 'YEARMONTHDAY_NUM':
        return `${year}/${month}/${day}`;
      case 'YEARMONTHDAY_PAD':
        return `${year}/${u_pad(month)}/${u_pad(day)}`;
      case 'HISTORICAL_MONTHDAYYEAR_ABBR':
        return year < 1
          ? `${u_monthAbbr(month)} ${day}, ${Math.abs(year)} ${ERAS.pre}`
          : `${u_monthAbbr(month)} ${day}, ${year} ${ERAS.post}`;
      case 'HISTORICAL_MONTHDAYYEAR_FULL':
        return year < 1
          ? `${u_monthName(month)} ${day}, ${Math.abs(year)} ${ERAS.pre}`
          : `${u_monthName(month)} ${day}, ${year} ${ERAS.post}`;
      case 'HISTORICAL_MONTHDAYYEAR_NUM':
        return year < 1
          ? `${month}/${day}/${Math.abs(year)} ${ERAS.pre}`
          : `${month}/${day}/${year} ${ERAS.post}`;
      case 'HISTORICAL_MONTHDAYYEAR_PAD':
        return year < 1
          ? `${u_pad(month)}/${u_pad(day)}/${Math.abs(year)} ${ERAS.pre}`
          : `${u_pad(month)}/${u_pad(day)}/${year} ${ERAS.post}`;
      case 'HISTORICAL_YEARMONTHDAY_ABBR':
        return year < 1
          ? `${Math.abs(year)} ${u_monthAbbr(month)} ${day} ${ERAS.pre}`
          : `${year} ${u_monthAbbr(month)} ${day} ${ERAS.post} `;
      case 'HISTORICAL_YEARMONTHDAY_FULL':
        return year < 1
          ? `${Math.abs(year)} ${u_monthName(month)} ${day} ${ERAS.pre}`
          : `${year} ${u_monthName(month)} ${day} ${ERAS.post}`;
      case 'HISTORICAL_YEARMONTHDAY_NUM':
        return year < 1
          ? `${Math.abs(year)}/${month}/${day} ${ERAS.pre}`
          : `${year}/${month}/${day} ${ERAS.post}`;
      case 'HISTORICAL_YEARMONTHDAY_PAD':
        return year < 1
          ? `${Math.abs(year)}/${u_pad(month)}/${u_pad(day)} ${ERAS.pre}`
          : `${year}/${u_pad(month)}/${u_pad(day)} ${ERAS.post}`;
      case 'MONTHYEAR_ABBR':
        return `${u_monthAbbr(month)} ${year}`;
      case 'MONTHYEAR_FULL':
        return `${u_monthName(month)} ${year}`;
      case 'MONTHYEAR_NUM':
        return `${month}/${year}`;
      case 'MONTHYEAR_PAD':
        return `${u_pad(month)}/${year}`;
      case 'YEARMONTH_ABBR':
        return `${year} ${u_monthAbbr(month)}`;
      case 'YEARMONTH_FULL':
        return `${year} ${u_monthName(month)}`;
      case 'YEARMONTH_NUM':
        return `${year}/${month}`;
      case 'YEARMONTH_PAD':
        return `${year}/${u_pad(month)}`;
      case 'HISTORICAL_MONTHYEAR_ABBR':
        return year < 1
          ? `${u_monthAbbr(month)} ${Math.abs(year)} ${ERAS.pre}`
          : `${u_monthAbbr(month)} ${year} ${ERAS.post}`;
      case 'HISTORICAL_MONTHYEAR_FULL':
        return year < 1
          ? `${u_monthName(month)} ${Math.abs(year)} ${ERAS.pre}`
          : `${u_monthName(month)} ${year} ${ERAS.post}`;
      case 'HISTORICAL_MONTHYEAR_NUM':
        return year < 1
          ? `${month}/${Math.abs(year)} ${ERAS.pre}`
          : `${month}/${year} ${ERAS.post}`;
      case 'HISTORICAL_MONTHYEAR_PAD':
        return year < 1
          ? `${u_pad(month)}/${Math.abs(year)} ${ERAS.pre}`
          : `${u_pad(month)}/${year} ${ERAS.post}`;
      case 'HISTORICAL_YEARMONTH_ABBR':
        return year < 1
          ? `${Math.abs(year)} ${u_monthAbbr(month)} ${ERAS.pre}`
          : `${year} ${u_monthAbbr(month)} ${ERAS.post}`;
      case 'HISTORICAL_YEARMONTH_FULL':
        return year < 1
          ? `${Math.abs(year)} ${u_monthName(month)} ${ERAS.pre}`
          : `${year} ${u_monthName(month)} ${ERAS.post}`;
      case 'HISTORICAL_YEARMONTH_NUM':
        return year < 1
          ? `${Math.abs(year)}/${month} ${ERAS.pre}`
          : `${year}/${month} ${ERAS.post}`;
      case 'HISTORICAL_YEARMONTH_PAD':
        return year < 1
          ? `${Math.abs(year)}/${u_pad(month)} ${ERAS.pre}`
          : `${year}/${u_pad(month)} ${ERAS.post}`;
      case 'YEAR':
        return `${year}`;
      case 'HISTORICALYEAR':
        return year < 1 ? `${Math.abs(year)} ${ERAS.pre}` : `${year} ${ERAS.post}`;
      case 'AS_ENTERED':
      default:
        // console.log('showprevieow...showing as entered', dateInputStr);
        return `${dateInputStr}` || '...';
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**  Set dateDisplayStr to the formatted date string using the selected format
   */
  function c_SetSelectedFormatResult() {
    // Show date in selected format
    const ParsedResult = erasChrono.parse(dateInputStr);
    let formattedDateString;
    if (ParsedResult.length < 1) {
      formattedDateString = c_GetPreviewStr(dateInputStr, 'AS_ENTERED');
    } else {
      const knownValues = ParsedResult[0].start.knownValues;
      formattedDateString = c_GetPreviewStr(knownValues, selectedDateFormat);
    }
    setDateDisplayStr(formattedDateString);
  }

  /// COMPONENT UI HANDLERS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle user text input updates, parse and format the date string based
   *  on the input values.
   */
  function evt_OnInputUpdate(event) {
    setDateInputStr(event.target.value);

    const ParsedResult = erasChrono.parse(event.target.value);
    c_ShowValidationResults(ParsedResult);
    c_ShowMatchingFormats(ParsedResult);
    c_SetSelectedFormatResult();

    // stuff date format and formattedDateString into result
    const eventWithFormat = { target: {} };
    eventWithFormat.target.id = id;
    eventWithFormat.target.value = {
      value: event.target.value,
      format: selectedDateFormat,
      formattedDateString: dateDisplayStr
    };
    onChange(eventWithFormat);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle user selection of a datea format.  Formats the current date field
   *  with the selected format.
   */
  function evt_OnFormatSelect(event) {
    setSelectedDateFormat(event.target.value);

    const ParsedResult = erasChrono.parse(dateInputStr);
    c_ShowMatchingFormats(ParsedResult);
    c_SetSelectedFormatResult();

    // stuff date format and formattedDateString into result
    const eventWithFormat = { target: {} };
    eventWithFormat.target.id = id;
    eventWithFormat.target.value = {
      value: dateInputStr,
      format: event.target.value,
      formattedDateString: dateDisplayStr
    };
    onChange(eventWithFormat);
  }

  /// RENDER /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  return readOnly ? (
    <div>{dateDisplayStr}</div>
  ) : (
    <div className="urdate">
      <div className="help">{helpText}</div>
      <div className="help">Enter a date</div>
      <input id={id} onChange={evt_OnInputUpdate} value={dateInputStr} />
      <div className="validator">{dateValidationStr}</div>
      <div className="help">Display as</div>
      {allowFormatSelection ? (
        <select
          onChange={evt_OnFormatSelect}
          value={selectedDateFormat}
          disabled={!allowFormatSelection}
        >
          {formatMenuOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.preview}
            </option>
          ))}
        </select>
      ) : (
        <div>{dateDisplayStr}</div>
      )}
    </div>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URDateField;
