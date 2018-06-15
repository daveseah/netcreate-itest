/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\


    Node Selector


    OVERVIEW
    --------

    NodeSelector is a form for searching for, viewing, selecting, and editing
    Node information.

    NodeSelector does not modify any data.  It passes all events (text updates,
    highlights, and suggestion selections) up to autocomplete-logic.  ac-l
    should process the events and update the data accordingly.  The
    updated data is then rendered by NodeSelect.


    TO USE
    ------
          <NodeSelector/>


    TECHNICAL DESCRIPTION
    ---------------------

    NodeSelector handles three basic functions:

    1. Display the current SELECTION.nodes[0]
    2. Support input of node fields
    3. Send updated node field data to SOURCE_UPDATE

    As the user edits the form, we locally save the changes and send it to UNISYS
    when the user clicks "SAVE"

    The currently selected/editing node is set via SELECTION.nodes.

    Updates are sent to UNISYS via SOURCE_UPDATE.


    The AutoComplete search field is handled a little differently from the other
    input fields because it is independent of NodeSelector.  In order to keep
    NodeSelector's internal representation of form data up to date, we rely on
    the SELECTION updates' searchLabel field to update the label.



    STATES
    ------

          formData        Node data that is shown in the form

          isEditable      If true, form is enabled for editing
                          If false, form is readonly



    TESTING
    -------

    Edit Existing Node
        1. Type 'ah'
              * Nodes on graph should hilite
              * Suggestions should be displayed
              * "Add New Node" should be shown.
        2. Highlight 'Ah Sing'
              * Ah Sing node detail should be shown
        3. Unhighlight all selections (move mouse out)
              * NodeDetail should disappear
        4. Click 'Ah Sing'
              * 'Ah Sing's details should load in form
              * "Edit Node" button should be shown.
        5. Click "Edit Node"
              * "Save" should be shown
              * All fields should be enabled
        6. Edit 'Ah Sing' to 'Ah Sing A'
              * Form should not change
              * Hilited graph node should go away
        7. Edit fields (add text)
        8. Click "Save"
              * Form should clear
        9. Check 'Ah Sing' contents to make sure changes were saved

    Create New Node
        1. Type 'ah'
              * Nodes on graph should hilite
              * Suggestions should be displayed
              * "Add New Node" should be shown.
        2. Click 'Add New Node'
              * Fields should be enabled
              * A new ID should be added
              * "Save" button should appear
        3. Edit fields
        4. Click "Save"
              * New node should appear in graph
              * The node should have the label you added 'ah'
        5. Select the node to verify the contents


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/


var DBG = true;


/// LIBRARIES /////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const React        = require('react');
const ReactStrap   = require('reactstrap');
const { Button, Col, Form, FormGroup, Label, Input, FormText } = ReactStrap;
const AutoComplete = require('./AutoComplete');
const NodeDetail   = require('./NodeDetail');
const EdgeEditor   = require('./EdgeEditor');

const UNISYS   = require('system/unisys');
var   UDATA    = null;


/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class NodeSelector extends React.Component {

  constructor (props) {
    super(props);
    this.state = {
      formData: {
          label:     '',
          type:      '',
          info:      '',
          notes:     '',
          id:        '',
          isNewNode: true
      },
      edges: [],
      isEditable:      false,
      autoCompleteFieldMode: 'active' // by default
    };

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    UDATA.OnStateChange('SELECTION',(data)=>{
      this.handleSelection(data);
    });

    this.clearForm                             = this.clearForm.bind(this);
    this.getNewNodeID                          = this.getNewNodeID.bind(this);
    this.handleSelection                       = this.handleSelection.bind(this);
    this.loadFormFromNode                      = this.loadFormFromNode.bind(this);
    this.onLabelChange                         = this.onLabelChange.bind(this);
    this.onTypeChange                          = this.onTypeChange.bind(this);
    this.onNotesChange                         = this.onNotesChange.bind(this);
    this.onInfoChange                          = this.onInfoChange.bind(this);
    this.onEditButtonClick                     = this.onEditButtonClick.bind(this);
    this.onSubmit                              = this.onSubmit.bind(this);

  }



  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// UTILITIES
  ///
  /// Clear the form with optional label
  clearForm ( label='' ) {
    this.setState({
      formData: {
          label:     label,
          type:      '',
          info:      '',
          notes:     '',
          id:        '',
          isNewNode: true
      },
      edges: [],
      isEditable:      false
    });
  }
  /// Return a new unique ID
  /// REVIEW: Should this be in autocomplete-logic?
  getNewNodeID () {
    let data = UDATA.State('D3DATA');
    let ids  = data.nodes.map( node => { return node.id } );
    let highestID = ids.reduce( (a,b) => { return Math.max(a,b) } );
    return highestID+1;
  }
  /// Handle updated SELECTION
  handleSelection ( data ) {
    if (DBG) console.log('NodeSelector: got state SELECTION',data);

    // Only update if we are the active autoComplete field
    if (data.activeAutoCompleteId!=='nodeSelector') {
      // We aren't active, so disable!
      if (DBG) console.log('NodeSelector: handleSelection: Disabling ')
      this.setState({ autoCompleteFieldMode: 'disabled' });
      return;
    }

    if (!this.state.isEditable) {
      if (data.nodes && data.nodes.length>0) {
        // A node was selected, so load it
        // We're not editing, so it's OK to update the form
        // grab the first node
        let node = data.nodes[0];
        this.loadFormFromNode( node );

        // Load edges
        this.setState({
          edges: data.edges
        })
      } else {
        if (DBG) console.log('NodeSelector: No data.nodes, so clearing form');
        this.clearForm();
      }
    } else {
      // Always update the search label
      // Update the form's node label because that data is only passed via SELECTION
      // AutoComplete calls SELECTION whenever the input field changes
      let formData = this.state.formData;
      formData.label = data.searchLabel;
      this.setState({
        formData: formData
      });
    }

  }
  /// Coppy the node data passed via SELECTION in the form
  loadFormFromNode ( newNode ) {
    if (DBG) console.log('NodeSelector.loadFormFromNode',newNode);
    if (newNode===undefined) {
      throw "NodeSelector.loadFormFromNode called with undefined newNode!";
    }
    // Clean data
    // REVIEW: Basic data structure probably needs updating
    let node = {attributes:{}};
    if (newNode.attributes===undefined) { newNode.attributes = {} };
    node.label                    = newNode.label || '';
    node.id                       = newNode.id    || '';
    node.attributes["Node_Type"]  = newNode.attributes["Node_Type"]  || '';
    node.attributes["Extra Info"] = newNode.attributes["Extra Info"] || '';
    node.attributes["Notes"]      = newNode.attributes["Notes"]      || '';

    // Copy to form
    this.setState({
      formData: {
        label:     node.label,
        type:      node.attributes["Node_Type"],     // HACK This needs to be updated when
        info:      node.attributes["Extra Info"],    // the data format is updated
        notes:     node.attributes["Notes"],         // These were bad keys from Fusion Tables.
        id:        node.id,
        isNewNode: false
      },
      isEditable: false,
    });
  }





  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// UI EVENT HANDLERS
  ///
  /// REVIEW: Do we really need to manage each input field change with a state update
  ///         or can we just grab the final text during the "SAVE"?
  onLabelChange (label) {
    let node = this.state.formData;
    node.label = label;
    this.setState({ formData: node });
  }
  onTypeChange  (event) {
    let node = this.state.formData;
    node.type = event.target.value;
    this.setState({ formData: node });
  }
  onNotesChange (event) {
    let node = this.state.formData;
    node.notes = event.target.value;
    this.setState({ formData: node });
  }
  onInfoChange  (event) {
    let node = this.state.formData;
    node.info = event.target.value;
    this.setState({ formData: node });
  }
  onEditButtonClick (event) {
    event.preventDefault();

    // console.log('NodeSelector.onEditButtonClick')
    this.setState({ isEditable: true });

    // Add ID if one isn't already defined
    let formData = this.state.formData;
    if (formData.id == '') formData.id = this.getNewNodeID();
    this.setState({ formData: formData });

  }
  onSubmit ( event ) {
    event.preventDefault();

    // Update the data with the selectedNode
    let newNodeData = this.state.formData;
    console.log('NodeSelector.onSubmit label is',newNodeData.label)
    let node = {
        label: newNodeData.label,
        id:    newNodeData.id,
        type:  newNodeData.type,
        info:  newNodeData.info,
        notes: newNodeData.notes
    };

    UDATA.Call('SOURCE_UPDATE', {node: node});

    // Clear form data
    this.clearForm();

  }



  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// REACT LIFECYCLE
  ///

  // componentWillReceiveProps has been deprectaed by React.  Don't use!
  // componentWillReceiveProps (nextProps) {
  // }

  shouldComponentUpdate () { return true }
  componentWillUpdate () {}
  render () {
    return (
      <div>
        <Form className='nodeEntry' style={{minHeight:'300px',backgroundColor:'#c7f1f1',padding:'5px',marginBottom:'10px'}}
          onSubmit={this.onSubmit}>
          <FormText>NODE SELECTOR (RF)</FormText>
          <hr/>
          <FormGroup>
            <Label for="nodeLabel" className="small text-muted">LABEL</Label>
            <AutoComplete
              identifier={'nodeSelector'}
              disabledValue={this.state.formData.label}
              mode={this.state.autoCompleteFieldMode}
            />
          </FormGroup>
          <div style={{position:'absolute',left:'300px',maxWidth:'300px'}}>
            <NodeDetail/>
          </div>
          <FormGroup>
            <Label for="type" className="small text-muted">TYPE</Label>
            <Input type="select" name="type" id="typeSelect"
              value={this.state.formData.type||''}
              onChange={this.onTypeChange}
              disabled={!this.state.isEditable}
              >
              <option>Person</option>
              <option>Group</option>
              <option>Place</option>
              <option>Thing</option>
              <option>Event</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label for="notes" className="small text-muted">NOTES</Label>
            <Input type="textarea" name="note" id="notesText"
              value={this.state.formData.notes||''}
              onChange={this.onNotesChange}
              readOnly={!this.state.isEditable}
              />
          </FormGroup>
          <FormGroup>
            <Label for="info" className="small text-muted">GEOCODE or DATE</Label>
            <Input type="text" name="info" id="info"
              value={this.state.formData.info||''}
              onChange={this.onInfoChange}
              readOnly={!this.state.isEditable}
              />
          </FormGroup>
          <FormGroup row>
            <Label for="id" sm={2} className="small text-muted">ID</Label>
            <Col sm={10}>
              <Input type="text" name="id" id="id"
                value={this.state.formData.id||''}
                readOnly={true}
              />
            </Col>
          </FormGroup>
          <hr/>
          <FormGroup className="text-right" style={{paddingRight:'5px'}}>
            <Button outline size="sm"
              hidden={this.state.isEditable}
              onClick={this.onEditButtonClick}
            >{this.state.formData.id===''?"Add New Node":"Edit Node"}</Button>
            <Button color="primary" size="sm"
              hidden={!this.state.isEditable}
            >Save</Button>
          </FormGroup>
          <hr/>
        </Form>
        <div style={{backgroundColor:'#c7f1f1',padding:'5px',marginBottom:'10px'}}>
          <FormText>EDGES</FormText>
          {this.state.edges.map( (edge,i) =>
            <EdgeEditor key={i}
              edgeID={edge.id}
              parentNodeLabel={this.state.formData.label}
            />
          )}
          <FormGroup className="text-right">
            <Button outline size="sm">Add New Edge</Button>
          </FormGroup>
        </div>
      </div>
    )
  }


  // Called after initial render on mount
  componentDidMount () {
    // console.log('componentDidMount')
    // Register as the active autoComplete Component when we first start up
    UDATA.Call('AUTOCOMPLETE_SELECT',{id:'nodeSelector'});

  }


}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NodeSelector;
