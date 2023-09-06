/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  STRINGFILTER

  StringFilter provides the UI for entering search strings for string-based
  node and edge properties.

  Two String operators are supported:
  * contains
  * not contains

  Matches will SHOW the resulting node or edge.
  Any nodes/edges not matching will be hidden.

  The filter definition is passed in via props.

    props
      {
        group       // "nodes" or "edges"
        filter: {
          id,       // numeric id used for unique React key
          type,     // filter type, e.g "string" vs "number"
          key,      // node field key from the template
          keylabel, // human friendly display name for the key.  This can be customized in the template.
          operator, // the comparison function, e.g. 'contains' or '>'
          value     // the search value to be used for matching
        },
        onChangeHandler // callback function for parent component
      }

  The `onChangeHandler` callback function is not currently used.  Instead,
  selection changes directly trigger a UDATA.LocalCall('FILTER_DEFINE',...).

  The `id` variable allows us to potentially support multiple search filters
  using the same key, e.g. we could have two 'Label' filters.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import FILTER from './FilterEnums';
import React from 'react';
import ReactStrap from 'reactstrap';
import UNISYS from 'unisys/client';
const { Form, FormGroup, Input, Label } = ReactStrap;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var UDATA = null;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const OPERATORS = [
  FILTER.OPERATORS.NO_OP,
  FILTER.OPERATORS.CONTAINS,
  FILTER.OPERATORS.NOT_CONTAINS,
  FILTER.OPERATORS.IS_EMPTY,
  FILTER.OPERATORS.IS_NOT_EMPTY
];

/// CLASS DECLARATION /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class StringFilter extends React.Component {
  constructor({
    group,
    filter: { id, type, ey, keylabel, operator, value },
    onChangeHandler
  }) {
    super();
    this.OnChangeOperator = this.OnChangeOperator.bind(this);
    this.OnChangeValue = this.OnChangeValue.bind(this);
    this.TriggerChangeHandler = this.TriggerChangeHandler.bind(this);
    this.OnSubmit = this.OnSubmit.bind(this);

    this.state = {
      operator: FILTER.OPERATORS.NO_OP, // Used locally to define result
      value: '' // Used locally to define result
    };

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);
  }

  OnChangeOperator(e) {
    this.setState(
      {
        operator: e.target.value
      },
      this.TriggerChangeHandler
    );
  }

  OnChangeValue(e) {
    this.setState(
      {
        value: e.target.value
      },
      this.TriggerChangeHandler
    );
  }

  TriggerChangeHandler() {
    const { filterAction } = this.props;
    const { id, type, key, keylabel } = this.props.filter;
    const filter = {
      id,
      type,
      key,
      keylabel,
      operator: this.state.operator,
      value: this.state.value
    };
    if (UDATA)
      UDATA.LocalCall('FILTER_DEFINE', {
        group: this.props.group,
        filter,
        filterAction
      }); // set a SINGLE filter
  }

  OnSubmit(e) {
    // Prevent "ENTER" from triggering form submission!
    e.preventDefault();
    e.stopPropagation();
  }

  render() {
    const { filterAction } = this.props;
    const { id, key, keylabel, operator, value } = this.props.filter;
    return (
      <Form inline className="filter-item" key={id} onSubmit={this.OnSubmit}>
        {/* FormGroup needs to unset flexFlow or fields will overflow
            https://getbootstrap.com/docs/4.5/utilities/flex/
         */}
        <FormGroup className="flex-nowrap">
          <Label
            size="sm"
            className="small text-muted"
            style={{
              fontSize: '0.75em',
              lineHeight: '1em',
              width: `6em`,
              justifyContent: 'flex-end'
            }}
          >
            {keylabel}&nbsp;
          </Label>
          <Input
            type="select"
            value={operator}
            style={{ maxWidth: '12em', height: '1.5em', padding: '0' }}
            onChange={this.OnChangeOperator}
            bsSize="sm"
          >
            {OPERATORS.map(op => (
              <option value={op.key} key={`${id}${op.key}`} size="sm">
                {op.label}
              </option>
            ))}
          </Input>
          <Input
            type="text"
            value={value}
            placeholder="..."
            style={{ maxWidth: '12em', height: '1.5em' }}
            onChange={this.OnChangeValue}
            bsSize="sm"
            disabled={operator === FILTER.OPERATORS.NO_OP.key}
            hidden={
              operator === FILTER.OPERATORS.IS_EMPTY.key ||
              operator === FILTER.OPERATORS.IS_NOT_EMPTY.key
            }
          />
        </FormGroup>
      </Form>
    );
  }
}

/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default StringFilter;
