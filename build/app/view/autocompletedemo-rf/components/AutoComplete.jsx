/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

      OVERVIEW
      --------

      AutoComplete is the text input field for entering node labels to:
      * search for nodes,
      * edit existing nodes,
      * and add new nodes.

      Main features:

      * It interactively provides a list of suggestions that match the current
        input, e.g. typing "ah" will display a list of suggestions including "Ah
        Long", "Ah Seung", and "Oahu Railroad Station".

      * Users can highlight suggestions (via mouseover or with keyboard arrows)

      * Users can select a suggestion (via clicking or hitting return)

      * Only one AutoComplete component can be active at a time in an app.
        Since there can be multiple AutoComplete components on a single page
        (e.g. multiple edges along with the source), we disable the component
        when it isn't active.

      * When the AutoComplete component is disabled, it will ignore SELECTION
        updates.

      * When the AutoComplete component is disabled, it will display a
        generic INPUT component instead of the Autosuggest component.

      * When the AutoComplete component is disabled, since it will not
        receive SELECTION updates, we need to pass it the current field
        value via the this.props.disabledValue.

      AutoComplete is a wrapper class for the open source AutoSuggest component,
      which handles the actual rendering of the suggestions list.  AutoComplete
      provides an interface to NodeSelector and EdgeEntry.  AutoComplete also
      provides the handler routines for generating the suggestions list and
      handling highlights and selections.



      This relies on the react-autosuggest component.
      See documentation:  https://github.com/moroshko/react-autosuggest


      TO USE
      ------

          <AutoComplete
            isDisabled={this.state.canEdit}
            disabledValue={this.state.formData.label}
          />




      TECHNICAL DESCRIPTION
      ---------------------

      AutoComplete handles five basic functions:

      1. Show suggestions when the user types in the input search field.
      2. Mark nodes on graph when the user changes the search field.
      3. Set selection when user clicks on a suggestion.
      4. Show the label if the node is selected externally
         (via a click on the graph)
      5. Provide an edit field for the label when the user is editing a node
         (during edit, show suggestions, but don't select anything?)

      The Autosuggest input field is a controlled field.  It is controlled via this.state.value.


      Sequence of Events

      1. When the user types in the Autosuggest input field,
      2. AutoComplete makes a UDATA SOURCE_SEARCH call
      3. autocomplete-logic handles the call and returns a SELECTION state update
      4. AutoComplete then sets the Autosuggest input field value via
         this.state.value.
      5. The updated SELECTION state also contains a list of
         suggestedNodeLabels that is used by Autosuggest whenever it
         requests a list of suggestions.



      INPUTS
      ------

      disableSuggesions

            This is mapped to this.props.disabled
            Set to true to stop making suggestions



      Based on example code from https://codepen.io/moroshko/pen/vpBzMr

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/


var DBG = true;


/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const React       = require('react');
const ReactStrap  = require('reactstrap');
const { Input }   = ReactStrap;
const Autosuggest = require('react-autosuggest');

const UNISYS      = require('system/unisys');
var   UDATA       = null;

const MODE_STATIC   = 'static';   // Can't be edited ever
const MODE_DISABLED = 'disabled'; // Can be edited, but not at the moment
const MODE_ACTIVE   = 'active';   // Currently able to edit



/// React Component ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class AutoComplete extends React.Component {
  constructor() {
    super();
    this.state = {
      value: '',
      suggestions: [],
      id: '',
      mode: MODE_ACTIVE
    };


    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);


    UDATA.OnStateChange('SELECTION',(data)=>{
      if (DBG) console.log('AutoComplete got state SELECTION',data);
      if (this.props.mode===MODE_ACTIVE && data.activeAutoCompleteId===this.state.id) {
        // This is the currently active AutoComplete field
        // Update the autosuggest input field's value with the current search data
        if (data.searchLabel!==undefined) {
          this.setState({
            value: data.searchLabel
          });
        }
      } else {
        // This is not the active AutoComplete field
        // Use the disabledValue prop to display
        this.setState({
          mode: MODE_DISABLED,
          value: this.props.disabledValue
        });
      }
    });


    this.onInputChange               = this.onInputChange.bind(this);
    this.getSuggestionValue          = this.getSuggestionValue.bind(this);
    this.renderSuggestion            = this.renderSuggestion.bind(this);
    this.onSuggestionsFetchRequested = this.onSuggestionsFetchRequested.bind(this);
    this.onSuggestionsClearRequested = this.onSuggestionsClearRequested.bind(this);
    this.onSuggestionSelected        = this.onSuggestionSelected.bind(this);
    this.onSuggestionHighlighted     = this.onSuggestionHighlighted.bind(this);
    this.shouldRenderSuggestions     = this.shouldRenderSuggestions.bind(this);
  };





  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// AUTOSUGGEST HANDLERS
  ///


  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Handle Autosuggest's input event trigger
  /// User has typed something new into the field
  onInputChange (event, { newValue, method }) {
    if (DBG) console.log('AutoComplete:onInputChange',newValue);

    // Pass the input value (node label search string) to UDATA
    // which will in turn pass the searchLabel back to the SELECTION
    // state handler in the constructor, which will in turn set the stae
    // of the input value to be passed on to AutoSuggest
    UDATA.Call('SOURCE_SEARCH', { searchString: newValue });

  };
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Handle Autosuggest's request to set the value of the input field when
  /// a selection is clicked.
  getSuggestionValue (suggestion) {
    if (suggestion.isAddNew) {
      return this.state.value;
    }
    return suggestion;
  };
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Handle Autosuggest's request for HTML rendering of suggestions
  renderSuggestion (suggestion) {
    if (suggestion.isAddNew) {
      // Don't show "Add New" because when you're adding a new item that partially
      // matches an existing item, you'll have a list of suggestions.  Better to
      // have the user always click "Add New Node" button.
      //
      // return (
      //   <span>
      //     [+] Add new: <strong>{this.state.value}</strong>
      //   </span>
      // );
      //
      // Instead, just show a blank
      return (<span></span>);
    }

    return suggestion;
  };
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Handle Autosuggest's request for list of suggestions
  /*/
      lexicon =  string array of node labels

      lexicon is a one-dimensional string array that represents the complete list
      of all possible suggestions that are then filtered based on the user typing
      for suggestions.

      We construct the list on the fly based on the D3DATA data.  If the data model
      changes, we'll need to update this lexicon constructor.
  /*/
  onSuggestionsFetchRequested () {
    let data = UDATA.State('SELECTION');
    if (data.suggestedNodeLabels) {
      this.setState({
        suggestions: (data.suggestedNodeLabels)
      });
    } else {
      if (DBG) console.log('AutoComplete.onSuggestionsFetchRequested: No suggestions.');
    }
  };
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Handle Autosuggest's request to clear list of suggestions
  onSuggestionsClearRequested () {
    this.setState({
      suggestions: []
    });
  };
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Autosuggest's callback when a selection is made
  /// If a new value is suggested, we call SOURCE_SELECT.
  /// Autocomplete-logic should handle the creation of a new data object.
  onSuggestionSelected (event, { suggestion }) {
    if (suggestion.isAddNew) {
      // User selected the "Add New Node" item in the suggestion list
      // console.log('Add new:', this.state.value, 'suggestion',suggestion);
      UDATA.Call('SOURCE_SELECT',{ nodeLabels: [this.state.value] });
    } else {
      // User selected an existing node in the suggestion list
      UDATA.Call('SOURCE_SELECT',{ nodeLabels: [suggestion] });
    }
  };
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Autosuggest calls this whenever the user has highlighted a different suggestion
  onSuggestionHighlighted ({ suggestion }) {
    UDATA.Call('SOURCE_HILITE',{ nodeLabel: suggestion });
  };
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Autosuggest checks this before rendering suggestions
  /// Set the prop to turn off suggestions
  shouldRenderSuggestions (value) {
    return this.state.mode===MODE_ACTIVE;
  }






  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// REACT LIFECYCLE
  ///

// componentWillReceiveProps is deprecateD
//  https://reactjs.org/docs/react-component.html#defaultprops
//  https://reactjs.org/blog/2018/03/27/update-on-async-rendering.html
//  componentWillReceiveProps (nextProps) {
//  }

  render() {
    const { value, suggestions } = this.state;
    const inputProps = {
      placeholder: "Type node name...",
      value,
      onChange: this.onInputChange
    };

    if (this.state.mode===MODE_DISABLED) {
      // Show generic Input component
      return (
        <Input type="text" value={this.state.value} readOnly={true}/>
      );
    } else {
      // Show AutoSuggest
      return (
      /*STYLE*/// this passing of handlers down the chain is exactly what we'd like to avoid, right?
              /// it makes wiring components together very cumbersome when writing new code
              /// BL: In this case, it's unavoidable as the Autosuggest component requires these handlers.
        <Autosuggest
          suggestions={suggestions}
          shouldRenderSuggestions={this.shouldRenderSuggestions}
          // Map to Local Handlers for Autosuggest event triggers (requests)
          onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
          onSuggestionsClearRequested={this.onSuggestionsClearRequested}
          getSuggestionValue={this.getSuggestionValue}
          renderSuggestion={this.renderSuggestion}
          // Receive Data from Autosuggest
          onSuggestionHighlighted={this.onSuggestionHighlighted}
          onSuggestionSelected={this.onSuggestionSelected}
          // Pass Data to Autosuggest
          inputProps={inputProps}
        />
      );
    }
  }
}


/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = AutoComplete;



