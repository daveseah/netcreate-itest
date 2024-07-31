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

import React, { useState, useRef, useEffect } from 'react';
import HDATE from 'system/util/hdate';
import UNISYS from 'unisys/client';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Initialize UNISYS DATA LINK for functional react component
const UDATAOwner = { name: 'URDateField' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);
const DBG = false;
const PR = 'URDateField';

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URDateField({
  id,
  value = '', // string or {value, format, formattedDateString}
  dateFormat = 'AS_ENTERED',
  allowFormatSelection = false,
  readOnly,
  onChange,
  helpText,
  isFilter = false,
  disabled = false
}) {
  /// CONSTANTS + STATES
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const inputRef = useRef(null);
  const cursorPos = useRef(0);

  const [hdate, setHDate] = useState({
    value: typeof value === 'object' ? value.value : value,
    format: allowFormatSelection ? value.format || dateFormat : dateFormat,
    formattedDateString: value.formattedDateString || ''
  });
  const [dateValidationStr, setValidationStr] = useState(); // human-readable verification e.g. 'month:2024'
  const [formatMenuOptions, setFormatMenuOptions] = useState([
    { value: 'AS_ENTERED', preview: 'as entered' }
  ]);

  /// Component Effect - set up listeners on mount */
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    // 1. Copy state to local variables
    const result = { ...hdate };
    result.value = typeof value === 'object' ? value.value : value;
    result.format = allowFormatSelection ? value.format || dateFormat : dateFormat;

    // 2. Parse and format the date based on selected format
    const ParsingResult = HDATE.Parse(result.value);
    const knownValues =
      ParsingResult.length > 0 ? ParsingResult[0].start.knownValues : {};
    result.formattedDateString = HDATE.GetPreviewStr(
      result.value,
      knownValues,
      result.format
    );

    // 3. Save derived values
    const dateValidationResults = HDATE.ShowValidationResults(ParsingResult);
    setValidationStr(dateValidationResults ? dateValidationResults.join(' ') : '');
    setFormatMenuOptions(
      HDATE.ShowMatchingFormats(ParsingResult, result.format, allowFormatSelection)
    );

    // 4. Save State
    setHDate(result);

    // 5. Force change so that the current format is changed when the field is opened
    if (onChange && hdate.formattedDateString !== result.formattedDateString)
      c_HandleChange(result);
  }, [value, dateFormat]);
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Retain cursor position across updates
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.selectionStart = cursorPos.current;
      inputRef.current.selectionEnd = cursorPos.current;
    }
  }, [hdate.value]);

  /// COMPONENT UI HANDLERS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function c_HandleChange(result) {
    // 2. Parse and format the date based on selected format
    const ParsingResult = HDATE.Parse(result.value);
    const knownValues =
      ParsingResult.length > 0 ? ParsingResult[0].start.knownValues : {};
    result.formattedDateString = HDATE.GetPreviewStr(
      result.value,
      knownValues,
      result.format
    );

    // 3. Send input string, format, and formattedDateString to onChange handler
    const eventWithFormat = { target: {} };
    eventWithFormat.target.id = id;
    eventWithFormat.target.value = result;
    onChange(eventWithFormat);
  }

  /** Handle user text input updates, parse and format the date string based
   *  on the input values, and trigger the onChange handler.
   */
  function evt_OnInputUpdate(event) {
    // Copy state to local variables
    const result = { ...hdate };
    result.value = event.target.value;
    cursorPos.current = event.target.selectionStart;
    c_HandleChange(result);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle user selection of a date format.  Formats the current date field
   *  with the selected format, and trigger the onChange handler.
   */
  function evt_OnFormatSelect(event) {
    // Copy state to local variables
    const result = { ...hdate };
    result.format = event.target.value;
    c_HandleChange(result);
  }

  /// RENDER /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const READONLY = <div>{hdate.formattedDateString}</div>;

  const FILTER = (
    <div className="urdate">
      <div className="filter">
        <input
          ref={inputRef}
          id={id}
          className={dateValidationStr === '' ? 'not-validated' : ''}
          onChange={evt_OnInputUpdate}
          value={hdate.value}
          placeholder="..."
          disabled={disabled}
        />
        <div className="validator">{dateValidationStr}</div>
      </div>
    </div>
  );

  const NORMAL = (
    <div className="urdate">
      <div className="help">{helpText}</div>
      <div className="help">Enter a date</div>
      <input
        ref={inputRef}
        id={id}
        className={dateValidationStr === '' ? 'not-validated' : ''}
        onChange={evt_OnInputUpdate}
        value={hdate.value}
        disabled={disabled}
      />
      <div className="validator">{dateValidationStr}</div>
      <div className="help">Display as</div>
      {allowFormatSelection ? (
        <select
          onChange={evt_OnFormatSelect}
          value={hdate.format}
          disabled={!allowFormatSelection}
        >
          {formatMenuOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.preview}
            </option>
          ))}
        </select>
      ) : (
        <div>{hdate.formattedDateString}</div>
      )}
    </div>
  );

  if (readOnly) return READONLY;
  if (isFilter) return FILTER;
  return NORMAL;
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URDateField;
