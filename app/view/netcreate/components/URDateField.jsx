/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URDateField

  A general date input field that can support a variety of calendar formats
  for historical projects, e.g. 1000 AD, 10,000 BCE.

  This is primarily used for data input rather than timestamping.

  The input field itself is intended to be flexible, using the `chrono-node`
  library to parse a wide variety of date formats. The component then
  interprets the parsed date and offers a selection of formats for the user
  to choose from. The selected format is then displayed in the field.  The
  user has the option to select the format "as entered" or to choose from a
  list of suggested formats based on the parsed date.

  Formats are dynamically generated based on the parsed date. For example, if
  the parsed data includes a year, month, and day, the component will offer
  a variety of formats including "April 1, 2024" and "2024/4/1". If the parsed
  date only includes a year and month, the component will offer formats like
  "April 2024" and "2024/4". If the parsed date only includes a year, the
  component will offer formats like "2024" and "2024 CE".

  Eras is handled via a template. The user can set the era to BCE/CE or BC/AD.
  Dates can be entered in any format, e.g. "2024 BCE", "2024 BC", "2024 CE",
  but the selected format will use the format defined in the template, e.g.
  if the eras format is set to "BCE/CE", entering "1024 ad" will be formatted
  as "1024 CE".

  For abmiguous years, adding a "CE" or "AD" to the end of the date will
  clarify the era. For example, "102" can't be parsed, but "102 ad"
  will parse the input as a year.

  TEST DATES
    2024 BC
    2024
    apr 10 (year = 10) doesn't work but 'apr 10 ad' does

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect, useCallback } from 'react';
import * as chrono from 'chrono-node';
import 'temporal-polyfill/global';

import UNISYS from 'unisys/client';

/// HISTORICAL CHRONO /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// Create a custom parser for BCE/CE dates
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

// Use template to define other values, e.g.
//   BC/AD
let ERAS = {
  pre: 'BCE',
  post: 'CE'
};

// Not currently used.
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
  MONTH_ABBR: 'Apr',
  MONTH_FULL: 'April',
  MONTH_NUM: '4',
  MONTH_PAD: '04',

  // MONTHDAY
  MONTHDAY_ABBR: 'Apr 1',
  MONTHDAY_FULL: 'April 1',
  MONTHDAY_NUM: '4/1',
  MONTHDAY_PAD: '04/01',

  // YEARMONTHDAY
  MONTHDAYYEAR_ABBR: 'Apr 1, 2024',
  MONTHDAYYEAR_FULL: 'April 1, 2024',
  MONTHDAYYEAR_NUM: '4/1/2024',
  MONTHDAYYEAR_PAD: '04/01/2024',
  YEARMONTHDAY_ABBR: '2024 Apr 1',
  YEARMONTHDAY_FULL: '2024 April 1',
  YEARMONTHDAY_NUM: '2024/4/1',
  YEARMONTHDAY_PAD: '2024/04/01',
  HISTORICAL_MONTHDAYYEAR_ABBR: 'Apr 1, 2024 CE',
  HISTORICAL_MONTHDAYYEAR_FULL: 'April 1, 2024 CE',
  HISTORICAL_MONTHDAYYEAR_NUM: '4/1/2024 CE',
  HISTORICAL_MONTHDAYYEAR_PAD: '04/01/2024 CE',
  HISTORICAL_YEARMONTHDAY_ABBR: '2024 Apr 1 CE',
  HISTORICAL_YEARMONTHDAY_FULL: '2024 April 1 CE',
  HISTORICAL_YEARMONTHDAY_NUM: '2024/4/1 CE',
  HISTORICAL_YEARMONTHDAY_PAD: '2024/04/01 CE',

  // YEARMONTH
  MONTHYEAR_ABBR: 'Apr 2024',
  MONTHYEAR_FULL: 'April 2024',
  MONTHYEAR_NUM: '4/2024',
  MONTHYEAR_PAD: '04/2024',
  YEARMONTH_ABBR: '2024 Apr',
  YEARMONTH_FULL: '2024 April',
  YEARMONTH_NUM: '2024/4',
  YEARMONTH_PAD: '2024/04',
  HISTORICAL_MONTHYEAR_ABBR: 'Apr 2024 CE',
  HISTORICAL_MONTHYEAR_FULL: 'April 2024 CE',
  HISTORICAL_MONTHYEAR_NUM: '4/2024 CE',
  HISTORICAL_MONTHYEAR_PAD: '04/2024 CE',
  HISTORICAL_YEARMONTH_ABBR: '2024 Apr CE',
  HISTORICAL_YEARMONTH_FULL: '2024 April CE',
  HISTORICAL_YEARMONTH_NUM: '2024/4 CE',
  HISTORICAL_YEARMONTH_PAD: '2024/04 CE',

  // YEAR
  YEAR: '2024',
  HISTORICALYEAR: '2024 CE'
};

/// UTILITIES //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function u_pad(num) {
  if (!num) return '';
  return num.toString().padStart(2, '0');
}
function u_monthAbbr(num) {
  const date = new Date(2000, num - 1, 1);
  return date.toLocaleDateString('default', { month: 'short' });
}
function u_monthName(num) {
  const date = new Date(2000, num - 1, 1);
  return date.toLocaleDateString('default', { month: 'long' });
}

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URDateField({ value, dateFormat = 'AS_ENTERED', readOnly }) {
  const [formatMenuOptions, setFormatMenuOptions] = useState([
    {
      value: 'AS_ENTERED',
      preview: 'as entered'
    }
  ]); // formats available given the current input
  // FIX: This should be a controlled input -- so we don't need it?
  // but keep this for now for demo purposes and testing
  const [selectedDateFormat, setSelectedDateFormat] = useState(dateFormat); // format currently selected in the format menu
  const [dateInputStr, setDateInputStr] = useState(value); // raw date as entered by the user
  const [dateValidationStr, setDateValidationStr] = useState('...'); // human-readable verification e.g. 'month:2024'
  const [dateDisplayStr, setDateDisplayStr] = useState(''); // final rendered date in selected format

  /** Component Effect - set up listeners on mount */

  useEffect(() => {
    const ParsedResult = erasChrono.parse(dateInputStr);
    c_ShowMatchingFormats(ParsedResult);
    c_SetSelectedFormatResult();
  }, [selectedDateFormat, dateInputStr, dateDisplayStr]);

  /// COMPONENT HELPER METHODS ////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  function c_ShowMatchingFormats(ParsedResult) {
    let options = [{ value: 'AS_ENTERED', preview: 'as entered' }];

    if (ParsedResult.length < 1) {
      setFormatMenuOptions(options);
      return;
    }

    let matchingTypes = [];
    let additionalOptions = [];
    const knownValues = ParsedResult[0].start.knownValues;
    const knownTypes = Object.keys(ParsedResult[0].start.knownValues);

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

  function c_GetPreviewStr(knownValues, format) {
    const { month, day, year } = knownValues;
    let preview = '';
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
        console.log('showprevieow...showing as entered', dateInputStr);
        return `${dateInputStr}`;
    }
  }

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

  function evt_OnInputUpdate(event) {
    setDateInputStr(event.target.value);
    const ParsedResult = erasChrono.parse(event.target.value);
    const ParsedResultDate = erasChrono.parseDate(event.target.value);
    let dateValidationStr = ['...'];

    // Show interpreted values
    if (ParsedResult.length > 0) {
      const knownValues = ParsedResult[0].start.knownValues;
      dateValidationStr = knownValues
        ? Object.keys(knownValues).map(k => `${k}:${knownValues[k]}`)
        : ["result: 'cannot interpret'"];
    }
    setDateValidationStr(dateValidationStr.join(' '));


    c_ShowMatchingFormats(ParsedResult);
    c_SetSelectedFormatResult();
  }

  function evt_OnFormatSelect(event) {
    setSelectedDateFormat(event.target.value);
    const ParsedResult = erasChrono.parse(dateInputStr);
    c_ShowMatchingFormats(ParsedResult);
    c_SetSelectedFormatResult();
  }

  /// RENDER /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -


  return readOnly ? (
    <div>{dateDisplayStr}</div>
  ) : (
    <div className="urdate">
      <input onChange={evt_OnInputUpdate} value={dateInputStr} />
      <div className="validator">{dateValidationStr}</div>
      <div className="formfields">
        <label>Format:&nbsp;</label>
        <select onChange={evt_OnFormatSelect} value={selectedDateFormat}>
          {formatMenuOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.preview}
            </option>
          ))}
        </select>
      </div>
      <div className="formfields">
        <label>Result:&nbsp;</label>
        <input readOnly value={dateDisplayStr} />
      </div>
    </div>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URDateField;
