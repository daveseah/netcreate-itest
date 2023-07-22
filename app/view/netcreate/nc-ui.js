/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  nc-ui

  General purpose UI components and snippets.
  Used by:
  * NCNode
  * NCEdge

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const React = require('react');
const UNISYS = require('unisys/client');
const MOD = UNISYS.NewModule(module.id);
const UDATA = UNISYS.NewDataLink(MOD);


/// CONSTANTS /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const VIEWMODE = {
  EDIT: 'edit',
  VIEW: 'view'
};


/// METHODS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -




/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// INPUT FORM CHANGE HANDLERS
///

/**
 * This processes the form data before passing it on to the parent handler.
 * The callback function is generally an input state update method in
 * NCNode or NCEdge
 * @param {Object} event
 * @param {function} cb Callback function
 */
function m_UIStringInputUpdate(event, cb) {
  const key = event.target.id;
  const value = event.target.value;
  if (typeof cb === 'function') cb(key, value);
}
/**
 * This processes the form data before passing it on to the parent handler.
 * The callback function is generally an input state update method in
 * NCNode or NCEdge
 * @param {Object} event
 * @param {function} cb Callback function
 */
function m_UINumberInputUpdate(event, cb) {
  const key = event.target.id;
  const value = Number(event.target.value);
  if (typeof cb === 'function') cb(key, value);
}
/**
 * This processes the form data before passing it on to the parent handler.
 * The callback function is generally an input state update method in
 * NCNode or NCEdge
 * @param {Object} event
 * @param {function} cb Callback function
 */
function m_UISelectInputUpdate(event, cb) {
  console.log('uiselect', event)
  const key = event.target.id;
  const value = event.target.value;
  if (typeof cb === 'function') cb(key, value);
}


/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// LAYOUT RENDERERS
///
function RenderTabSelectors(TABS, state, onclick) {
  const { uSelectedTab, uViewMode } = state;
  const columnsDef = `repeat(${Object.keys(TABS).length}, 1fr)`;
  return (
    <div className="tabselectors"
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
            {TABS[k]}
          </button>
        );
      })}
    </div>
  );
}

function RenderAttributesTabView(state, defs) {
  const { attributes } = state;
  const items = [];
  Object.keys(attributes).forEach(k => {
    items.push(RenderLabel(k, defs[k].displayLabel));
    items.push(RenderStringValue(k, attributes[k]));
  });
  return <div className="formview">{items}</div>;
}
function RenderAttributesTabEdit(state, defs, onchange) {
  const { id, attributes } = state;
  const items = [];
  Object.keys(attributes).forEach(k => {
    items.push(RenderLabel(k, defs[k].displayLabel));
    const type = defs[k].type;
    const value = attributes[k] || ''; // catch `undefined` or React will complain about changing from uncontrolled to controlled
    switch (type) {
      case 'string':
        items.push(m_RenderStringInput(k, value, onchange));
        break;
      case 'number':
        items.push(m_RenderNumberInput(k, value, onchange));
        break;
      case 'select':
        items.push(m_RenderOptionsInput(k, value, defs, onchange));
        break;
      default:
        items.push(RenderStringValue(k, value, onchange)); // display unsupported type
    }
  });
  return <div className="formview">{items}</div>;
}

function RenderProvenanceTab(state, defs) {
  const { provenance, degrees, created, updated, revision } = state;
  // FIXME: These will be dynamically generated with the new Provenance template
  return (
    <div className="provenance formview">
      {RenderLabel('provenancelabel', defs.provenance.displayLabel)}
      {RenderStringValue('provenancelabel', provenance)}
      {RenderLabel('createdlabel', defs.created.displayLabel)}
      {RenderStringValue('createdlabel', created)}
      {RenderLabel('updatedlabel', defs.updated.displayLabel)}
      {RenderStringValue('updatedlabel', updated)}
      {RenderLabel('revisionlabel', defs.revision.displayLabel)}
      {RenderStringValue('revisionlabel', revision)}
      {/* {RenderLabel('degreeslabel', defs.degrees.displayLabel)}
      {RenderStringValue('degreeslabel', degrees)} */}
    </div>
  );
}


/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// FORM RENDERERS
///
function RenderLabel(key, label) {
  return <label htmlFor={key} key={`${key}label`}>{label}</label>
}
function RenderStringValue(key, value) {
  return <div id={key} key={`${key}value`} className="viewvalue">{value}</div>
}
/**
 * There are two levels of callbacks necessary here.
 * 1. The `onChange` handler (in this module) processes the input's onChange event, and...
 * 2. ...then passes the resulting value to the `cb` function in the parent module.
 * @param {string} key
 * @param {string} value
 * @param {function} cb
 * @returns
 */
function m_RenderStringInput(key, value, cb) {
  return (
    <input
      id={key}
      key={`${key}input`}
      value={value}
      type="string"
      onChange={event => m_UIStringInputUpdate(event, cb)}
    />
  );
}
/**
 * There are two levels of callbacks necessary here.
 * 1. The `onChange` handler (in this module) processes the input's onChange event, and...
 * 2. ...then passes the resulting value to the `cb` function in the parent module.
 * @param {string} key
 * @param {string} value will be converted to a Number()
 * @param {function} cb
 * @returns
 */
function m_RenderNumberInput(key, value, cb) {
  return (
    <input
      id={key}
      key={`${key}input`}
      value={value}
      type="number"
      onChange={event => m_UINumberInputUpdate(event, cb)}
    />
  );
}
/**
 * There are two levels of callbacks necessary here.
 * 1. The `onChange` handler (in this module) processes the input's onChange event, and...
 * 2. ...then passes the resulting value to the `cb` function in the parent module.
 * @param {string} key
 * @param {string} value
 * @param {function} cb
 * @returns
 */
function m_RenderOptionsInput(key, value, defs, cb) {
  const options = defs[key].options;
  return (
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
  );
}


/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = {
  VIEWMODE,
  RenderTabSelectors,
  RenderAttributesTabView,
  RenderAttributesTabEdit,
  RenderProvenanceTab,
  RenderLabel,
  RenderStringValue
};