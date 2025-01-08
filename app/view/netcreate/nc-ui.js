/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  nc-ui

  General purpose re-usable UI components and snippets.

  Used by:
  * NCNode
  * NCEdge

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const UTILS = require('./nc-utils');
const MD = require('markdown-it')();
const MDEMOJI = require('markdown-it-emoji');
MD.use(MDEMOJI);
const MDPARSE = require('html-react-parser').default;
const NCDialogInsertImageURL = require('./components/NCDialogInsertImageURL');
import URDateField from './components/URDateField';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const VIEWMODE = {
  EDIT: 'edit',
  VIEW: 'view'
};

/// MODULE INITIALIZATION /////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const MOD = UNISYS.NewModule(module.id);
const UDATA = UNISYS.NewDataLink(MOD);

/// UTILITIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function DateFormatted() {
  var today = new Date();
  var year = String(today.getFullYear());
  var date =
    today.getMonth() + 1 + '/' + today.getDate() + '/' + year.substring(2, 4);
  var time = today.toTimeString().substring(0, 5);
  var dateTime = time + ' on ' + date;
  return dateTime;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Converts a markdown string to HTML
 *  And does extra HACK processing as needed:
 *  -- Supports emojis
 *  -- add `_blank` to `a` tags.
 */
function Markdownify(str = '') {
  const htmlString = MD.render(str);
  // HACK!!! MDPARSE does not give us direct access to the dom elements, so just
  // hack it by adding to the parsed html string
  const hackedHtmlString = htmlString.replace(/<a href/g, `<a target="_blank" href`);
  return MDPARSE(hackedHtmlString);
}
/// INPUT FORM CHANGE HANDLERS ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** This processes the form data before passing it on to the parent handler.
 *  The callback function is generally an input state update method in
 *  NCNode or NCEdge
 *  Emulates m_UIStringInputUpdate but adds error checking on markdown text.
 *  @param {Object} event
 *  @param {function} cb Callback function
 */
function m_UIMarkdownInputUpdate(event, cb) {
  console.warn(
    'WARNNIG: Markdown text is not being error checked!  Use with caution!'
  );
  const key = event.target.id;
  const value = event.target.value;
  if (typeof cb === 'function') cb(key, value);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** This processes the form data before passing it on to the parent handler.
 *  The callback function is generally an input state update method in
 *  NCNode or NCEdge
 *  @param {Object} event
 *  @param {function} cb Callback function
 */
function m_UIStringInputUpdate(event, cb) {
  const key = event.target.id;
  const value = event.target.value;
  if (typeof cb === 'function') cb(key, value);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** This processes the form data before passing it on to the parent handler.
 *  The callback function is generally an input state update method in
 *  NCNode or NCEdge
 *  @param {Object} event
 *  @param {function} cb Callback function
 */
function m_UINumberInputUpdate(event, cb) {
  const key = event.target.id;
  const value = Number(event.target.value);
  if (typeof cb === 'function') cb(key, value);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** This processes the form data before passing it on to the parent handler.
 *  The callback function is generally an input state update method in
 *  NCNode or NCEdge
 *  @param {Object} event
 *  @param {function} cb Callback function
 */
function m_UISelectInputUpdate(event, cb) {
  const key = event.target.id;
  const value = event.target.value;
  if (typeof cb === 'function') cb(key, value);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** This processes the form data before passing it on to the parent handler.
 *  The callback function is generally an input state update method in
 *  NCNode or NCEdge
 *  @param {Object} event
 *  @param {function} cb Callback function
 */
function m_UIDateInputUpdate(event, cb) {
  const key = event.target.id;
  const value = event.target.value;
  if (typeof cb === 'function') cb(key, value);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Insert a URL into the current input
 *  This processes the form data before passing it on to the parent handler.
 *  The callback function is generally an input state update method in
 *  NCNode or NCEdge
 *  @param {Object} event
 *  @param {function} cb Callback function
 */
function m_UIInsertImageURL(url, parentId, cb) {
  const inputEl = document.getElementById(parentId);
  const selectionStart = inputEl.selectionStart;
  const currentValue = String(inputEl.value);
  // fake an event to emulate m_UIStringInputUpdate so markdown is treated as string
  const event = {
    target: {
      id: parentId,
      value:
        currentValue.substring(0, selectionStart) +
        `![image](${url})` +
        currentValue.substring(selectionStart)
    }
  };
  m_UIMarkdownInputUpdate(event, cb);
}
function m_UICancelInsertImageURL() {
  // FUTURE ENHANCEMENT: Allow removing URL???
}

/// LAYOUT RENDERERS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderTabSelectors(TABS, state, onclick) {
  const { uSelectedTab, uViewMode, degrees } = state;
  const columnsDef = `repeat(${Object.keys(TABS).length}, 1fr)`;
  return (
    <div
      className="tabselectors"
      style={{ color: 'red', gridTemplateColumns: columnsDef }}
    >
      {Object.keys(TABS).map(k => {
        return (
          <button
            id={k}
            key={k}
            type="button"
            className={uSelectedTab === TABS[k] ? 'selected' : ''}
            onClick={onclick}
            value={TABS[k]}
            disabled={uViewMode === VIEWMODE.EDIT}
          >
            {TABS[k] === 'EDGES' ? `${TABS[k]} (${degrees})` : TABS[k]}
          </button>
        );
      })}
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderAttributesTabView(state, defs) {
  const { attributes, degrees } = state;
  const items = [];
  Object.keys(attributes).forEach(k => {
    items.push(RenderLabel(k, defs[k].displayLabel, defs[k].help));
    const type = defs[k].type;
    switch (type) {
      case 'markdown':
        items.push(RenderMarkdownValue(k, attributes[k]));
        break;
      case 'hdate':
        items.push(
          RenderDateValue(
            k,
            attributes[k],
            defs[k].format,
            defs[k].allowFormatSelection
          )
        );
        break;
      case 'infoOrigin':
        items.push(RenderInfoOriginValue(k, attributes[k], state, defs));
        break;
      case 'string':
      default:
        items.push(RenderStringValue(k, attributes[k]));
        break;
    }
  });

  // degrees hack -- `degrees` is a built-in field, but is displayed in attributes
  if (defs['degrees']) {
    // only if defined, e.g. for nodeDefs
    items.push(RenderLabel('degrees', defs['degrees'].displayLabel));
    items.push(RenderStringValue('degrees', degrees));
  }

  return <div className="formview">{items}</div>;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderAttributesTabEdit(state, defs, onchange) {
  const { attributes, degrees } = state;
  const items = [];
  Object.keys(attributes).forEach(k => {
    items.push(RenderLabel(k, defs[k].displayLabel));
    const type = defs[k].type;
    const value = attributes[k] || ''; // catch `undefined` or React will complain about changing from uncontrolled to controlled
    const helpText = defs[k].help;
    switch (type) {
      case 'markdown':
        items.push(RenderMarkdownInput(k, value, onchange, helpText));
        break;
      case 'hdate':
        items.push(
          RenderDateInput(
            k,
            value,
            defs[k].format,
            defs[k].allowFormatSelection,
            onchange,
            helpText
          )
        );
        break;
      case 'string':
        items.push(RenderStringInput(k, value, onchange, helpText));
        break;
      case 'infoOrigin':
        items.push(RenderInfoOriginInput(k, value, onchange, helpText, state));
        break;
      case 'number':
        items.push(m_RenderNumberInput(k, value, onchange, helpText));
        break;
      case 'select':
        items.push(RenderOptionsInput(k, value, defs, onchange, helpText));
        break;
      default:
        items.push(RenderStringValue(k, value, onchange)); // display unsupported type
    }
  });

  // degrees hack -- `degrees` is a built-in field, but is displayed in attributes
  if (defs['degrees']) {
    // only if defined, e.g. for nodeDefs
    items.push(RenderLabel('degrees', defs['degrees'].displayLabel));
    items.push(RenderStringValue('degrees', degrees));
  }

  return <div className="formview">{items}</div>;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderProvenanceItemsView(state, defs) {
  const { provenance } = state;
  const items = [];
  Object.keys(provenance).forEach(k => {
    items.push(RenderLabel(k, defs[k].displayLabel, defs[k].help));
    const type = defs[k].type;
    switch (type) {
      case 'markdown':
        items.push(RenderMarkdownValue(k, provenance[k]));
        break;
      case 'hdate':
        items.push(
          RenderDateValue(
            k,
            provenance[k],
            defs[k].format,
            defs[k].allowFormatSelection
          )
        );
        break;
      case 'infoOrigin':
        items.push(RenderInfoOriginValue(k, provenance[k], state, defs));
        break;
      case 'string':
      case 'number':
      default:
        items.push(RenderStringValue(k, provenance[k]));
        break;
    }
  });
  return items;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderProvenanceItemsEdit(state, defs, onchange) {
  const { provenance, degrees } = state;
  const items = [];
  Object.keys(provenance).forEach(k => {
    items.push(RenderLabel(k, defs[k].displayLabel));
    const type = defs[k].type;
    const value = provenance[k] || ''; // catch `undefined` or React will complain about changing from uncontrolled to controlled
    const helpText = defs[k].help;
    switch (type) {
      case 'markdown':
        items.push(RenderMarkdownInput(k, value, onchange, helpText));
        break;
      case 'hdate':
        items.push(
          RenderDateInput(
            k,
            value,
            defs[k].format,
            defs[k].allowFormatSelection,
            onchange,
            helpText
          )
        );
        break;
      case 'string':
        items.push(RenderStringInput(k, value, onchange, helpText));
        break;
      case 'infoOrigin':
        items.push(RenderInfoOriginInput(k, value, onchange, helpText, state));
        break;
      case 'number':
        items.push(m_RenderNumberInput(k, value, onchange, helpText));
        break;
      case 'select':
        items.push(RenderOptionsInput(k, value, defs, onchange, helpText));
        break;
      default:
        items.push(RenderStringValue(k, value, onchange)); // display unsupported type
    }
  });
  return items;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderProvenanceTabView(state, defs) {
  const { provenance, degrees, created, createdBy, updated, updatedBy, revision } =
    state;
  return (
    <div className="provenance formview">
      <div className="category">PROVENANCE</div>
      {RenderProvenanceItemsView(state, defs)}
      <div className="category">HISTORY</div>
      {!defs.created.hidden && RenderLabel('createdlabel', defs.created.displayLabel)}
      {!defs.created.hidden &&
        RenderProvenanceByline(created, createdBy, defs.createdBy)}
      {!defs.updated.hidden && RenderLabel('createdlabel', defs.updated.displayLabel)}
      {!defs.updated.hidden &&
        RenderProvenanceByline(updated, updatedBy, defs.updatedBy)}
      {!defs.revision.hidden &&
        RenderLabel('revisionlabel', defs.revision.displayLabel)}
      {!defs.revision.hidden && RenderStringValue('revisionlabel', revision)}
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderProvenanceTabEdit(state, defs, onchange) {
  const { provenance, degrees, created, createdBy, updated, updatedBy, revision } =
    state;
  return (
    <div className="provenance formview">
      <div className="category">PROVENANCE</div>
      {RenderProvenanceItemsEdit(state, defs, onchange)}
      <div className="category">HISTORY</div>
      {!defs.created.hidden && RenderLabel('createdlabel', defs.created.displayLabel)}
      {!defs.created.hidden &&
        RenderProvenanceByline(created, createdBy, defs.createdBy)}
      {!defs.updated.hidden && RenderLabel('createdlabel', defs.updated.displayLabel)}
      {!defs.updated.hidden &&
        RenderProvenanceByline(updated, updatedBy, defs.updatedBy)}
      {!defs.revision.hidden &&
        RenderLabel('revisionlabel', defs.revision.displayLabel)}
      {!defs.revision.hidden && RenderStringValue('revisionlabel', revision)}
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderProvenanceByline(date, author, defAuthor) {
  let result = '';
  if (defAuthor.hidden) result = date;
  else {
    const by = author ? `${author}` : `(not recorded)`; // leave author blank for older templates
    result = `${by}, ${date}`;
  }
  return <div className="viewvalue">{result}</div>;
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// FORM RENDERERS
///
function RenderLabel(key, label, helpText) {
  return (
    <label htmlFor={key} key={`${key}label`} title={helpText}>
      {label}
    </label>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderMarkdownValue(key, value = '') {
  const val = String(value);
  return (
    <div id={key} key={`${key}value`} className="viewvalue">
      {Markdownify(val)}
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderInfoOriginValue(key, value, state) {
  const val = value || UTILS.DeriveInfoOriginString(state.createdBy, state.created);
  return (
    <div id={key} key={`${key}value`} className="viewvalue">
      {val}
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderStringValue(key, value) {
  return (
    <div id={key} key={`${key}value`} className="viewvalue">
      {value}
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderDateValue(key, value, dateFormat, allowFormatSelection) {
  return (
    <URDateField
      id={key}
      key={`${key}value`}
      value={value}
      dateFormat={dateFormat}
      allowFormatSelection={allowFormatSelection}
      readOnly
    />
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Markdown String Input
 * There are two levels of callbacks necessary here.
 * 1. The `onChange` handler (in this module) processes the input's onChange event, and...
 * 2. ...then passes the resulting value to the `cb` function in the parent module.
 * @param {string} key
 * @param {string} value
 * @param {function} cb
 * @returns
 */
function RenderMarkdownInput(key, value, cb, helpText) {
  const rows = String(value).length > 35 ? 3 : 1;
  return (
    <div key={`${key}div`}>
      <div className="help">{helpText}</div>
      <button
        className="stylebutton"
        onClick={() => UDATA.LocalCall('IMAGE_URL_DIALOG_OPEN', { id: key })}
      >
        Insert Image URL...
      </button>
      <textarea
        id={key}
        key={`${key}input`}
        type="string"
        value={value}
        onChange={event => m_UIMarkdownInputUpdate(event, cb)}
        autoComplete="off" // turn off Chrome's default autocomplete, which conflicts
        className={rows > 1 ? `long` : ''}
        rows={rows}
      />
      <NCDialogInsertImageURL
        id={key}
        message="Paste image URL:"
        okmessage="Insert"
        onOK={url => m_UIInsertImageURL(url, key, cb)}
        cancelmessage="Cancel"
        onCancel={m_UICancelInsertImageURL}
      />
    </div>
  );
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Injects `Created by <createdBy> on <created>` if nothing is defined
 * Otherwise it's treated as a string field
 */
function RenderInfoOriginInput(key, value, cb, helpText, state, onFocus, onBlur) {
  const newValue =
    value || UTILS.DeriveInfoOriginString(state.createdBy, state.created);
  return RenderStringInput(key, newValue, cb, helpText, onFocus, onBlur);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * There are two levels of callbacks necessary here.
 * 1. The `onChange` handler (in this module) processes the input's onChange event, and...
 * 2. ...then passes the resulting value to the `cb` function in the parent module.
 * @param {string} key
 * @param {string} value
 * @param {function} cb
 * @param {string} helpText
 * @param {function} onFocus Handles showing autosuggest matchlist
 * @param {function} onBlur Handles hiding autosuggest matchlist
 * @returns
 */
function RenderStringInput(key, value, cb, helpText, onFocus, onBlur) {
  const rows = String(value).length > 35 ? 3 : 1;
  return (
    <div key={`${key}div`}>
      <div className="help">{helpText}</div>
      <textarea
        id={key}
        key={`${key}input`}
        type="string"
        value={value}
        onChange={event => m_UIStringInputUpdate(event, cb)}
        onFocus={() => typeof onFocus === 'function' && onFocus()}
        onBlur={() => typeof onBlur === 'function' && onBlur()}
        autoComplete="off" // turn off Chrome's default autocomplete, which conflicts
        className={rows > 1 ? `long` : ''}
        rows={rows}
      />
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** There are two levels of callbacks necessary here.
 *  1. The `onChange` handler (in this module) processes the input's onChange event, and...
 *  2. ...then passes the resulting value to the `cb` function in the parent module.
 *  @param {string} key
 *  @param {string} value will be converted to a Number()
 *  @param {function} cb
 *  @returns
 */
function m_RenderNumberInput(key, value, cb, helpText) {
  return (
    <div key={`${key}div`}>
      <div className="help">{helpText}</div>
      <input
        id={key}
        key={`${key}input`}
        value={value ? value : 0}
        type="number"
        onChange={event => m_UINumberInputUpdate(event, cb)}
      />
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** There are two levels of callbacks necessary here.
 *  1. The `onChange` handler (in this module) processes the input's onChange event, and...
 *  2. ...then passes the resulting value to the `cb` function in the parent module.
 *  @param {string} key
 *  @param {string} value
 *  @param {function} cb
 *  @returns
 */
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function RenderOptionsInput(key, value, defs, cb, helpText) {
  const options = defs[key].options;
  return (
    <div key={`${key}div`}>
      <div className="help">{helpText}</div>
      <select
        id={key}
        key={`${key}select`}
        value={value}
        onChange={event => m_UISelectInputUpdate(event, cb)}
      >
        {options.map(o => (
          <option key={o.label} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** There are two levels of callbacks necessary here.
 *  1. The `onChange` handler (in this module) processes the input's onChange event, and...
 *  2. ...then passes the resulting value to the `cb` function in the parent module.
 *  @param {string} key
 *  @param {string} value Can be string or {value, format} object
 *  @param {string} dateFormat Format that the input string will be converted to
 *  @param {boolean} allowFormatSelection When true, user can select date format
 *                                        otherwise, the format is fixed.
 *  @param {function} cb Callback function
 *  @param {string} helpText
 *  @returns
 */
function RenderDateInput(key, value, dateFormat, allowFormatSelection, cb, helpText) {
  return (
    <URDateField
      id={key}
      key={`${key}value`}
      value={value}
      dateFormat={dateFormat}
      allowFormatSelection={allowFormatSelection}
      onChange={event => m_UIDateInputUpdate(event, cb)}
      helpText={helpText}
    />
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = {
  VIEWMODE,
  DateFormatted,
  Markdownify,
  RenderTabSelectors,
  RenderAttributesTabView,
  RenderAttributesTabEdit,
  RenderProvenanceTabView,
  RenderProvenanceTabEdit,
  RenderLabel,
  RenderMarkdownValue,
  RenderStringValue,
  RenderMarkdownInput,
  RenderStringInput,
  RenderOptionsInput
};
