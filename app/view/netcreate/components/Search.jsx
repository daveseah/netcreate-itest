/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

      This provides a search field for looking up nodes.

      1. Users type in the field.
      2. The field will suggest matching nodes.
      3. User selects something from the suggestion list.
      4. The node will get loaded in NodeSelector.

  ## USAGE

    <Search/>

  ## TECHNICAL DESCRIPTION

      This provides a simple wrapper around AutoSuggest to handle
      messaging and data passing.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React from 'react';
import ReactStrap from 'reactstrap';
import AutoComplete from './AutoComplete';
import UNISYS from 'unisys/client';
const { Col, FormGroup, Label } = ReactStrap;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const thisIdentifier = 'search'; // SELECTION identifier

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class Search extends UNISYS.Component {
  constructor(props) {
    super(props);
    this.state = {
      searchString: ''
    };
    this.OnStart(() => {
      // always wrap UNISYS calls in a lifescycle hook otherwise you may try to execute a call
      // before it has been declared in another module
      if (DBG)
        console.log(
          'Search.OnStart: Setting active autocomplete id to',
          thisIdentifier
        );
      this.AppCall('AUTOCOMPLETE_SELECT', {
        id: thisIdentifier,
        value: this.state.searchString
      });
    });
  } // constructor

  /// UI EVENT HANDLERS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /// REACT LIFECYCLE ///////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  componentWillMount() {}
  /** REACT calls this to receive the component layout and data sources
   */
  render() {
    return (
      <FormGroup row>
        <Col>
          <AutoComplete
            identifier={thisIdentifier}
            disabledValue={this.state.searchString}
            inactiveMode={'disabled'}
          />
          <Label className="small text-muted">Type to search or add a node:</Label>
        </Col>
      </FormGroup>
    );
  }
} // class Search

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default Search;
