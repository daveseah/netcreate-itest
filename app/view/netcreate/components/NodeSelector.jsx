/* eslint-disable complexity */
/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

  NodeSelector is a form for searching for, viewing, selecting, and editing
  Node information.

  NodeSelector does not modify any data.  It passes all events (text updates,
  highlights, and suggestion selections) up to nc-logic. it
  should process the events and update the data accordingly.  The
  updated data is then rendered by NodeSelector.

  ## USAGE

    <NodeSelector/>

  ## TECHNICAL DESCRIPTION

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
  NodeSelector's internal representation of form data up-to-date, we rely on
  the SELECTION updates' searchLabel field to update the label.

  There are different levels of write-access:

    isLocked        Nodes can be selected for viewing, but editing
                    cannot be enabled.

    isStandalone    Nodes can be selected for viewing, but editing
                    cannot be enabled.

    disableEdit     Template is being edited, disable "Edit Node" button

    isBeingEdited   The form fields are active and text can be changed.


  Delete Button
  The Delete button is only displayed for an admin user.  Right now we are detecting
  this by displaying it only when the user is on `localhost`,


  ## STATES

    formData        Node data that is shown in the form

    isLocked        If true (defauilt), nodes can be displayed, but
                    "Add New Node" and "Edit Node" buttons are hidden.
                    The state is unlocked when the user logs in.

    isEditable      If true, form fields are enabled for editing
                    If false, form is readonly

    dbIsLocked
                    If someone else has selected the node for editing,
                    this flag will cause the dbIsLockedMessage
                    to be displayed.  This is only checked when
                    the user clicks "Edit".


  ## TESTING

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

import mdReact from 'markdown-react-js';
import emoji from 'markdown-it-emoji';
import React from 'react';
import ReactStrap from 'reactstrap';
const { Button, Col, Form, FormGroup, FormFeedback, FormText, Label, Input } =
  ReactStrap;
import AutoComplete from './AutoComplete';
import NodeDetail from './NodeDetail';
import EdgeEditor from './EdgeEditor';

import UNISYS from 'unisys/client';
import { PromiseNewNodeID, PromiseNewEdgeID } from 'system/datastore';
import { IsAdmin } from 'settings';
import { EDITORTYPE } from 'system/util/enum';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NodeSelector';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const thisIdentifier = 'nodeSelector'; // SELECTION identifier
const isAdmin = IsAdmin();
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var UDATA = null;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class NodeSelector extends UNISYS.Component {
  constructor(props) {
    super(props);
    const TEMPLATE = this.AppState('TEMPLATE');
    this.state = {
      nodeDefs: TEMPLATE.nodeDefs,
      citation: TEMPLATE.citation,
      duplicateWarning: TEMPLATE.duplicateWarning,
      nodeIsLockedMessage: TEMPLATE.nodeIsLockedMessage,
      editLockMessage: '',
      hideDeleteNodeButton: TEMPLATE.hideDeleteNodeButton,
      formData: {
        label: '',
        type: '',
        info: '',
        provenance: '',
        comments: '',
        notes: '',
        degrees: 0,
        id: '', // Always convert this to a Number
        isNewNode: true
      },
      edges: [],
      isLocked: true,
      isStandalone: false,
      edgesAreLocked: false,
      dbIsLocked: false,
      disableEdit: false,
      isBeingEdited: false,
      isValid: false,
      isDuplicateNodeLabel: false,
      duplicateNodeID: '',
      replacementNodeID: '',
      isValidReplacementNodeID: true,
      hideModal: true
    };
    // Bind functions to this component's object context
    this.clearForm = this.clearForm.bind(this);
    this.setTemplate = this.setTemplate.bind(this);
    this.updateEditState = this.updateEditState.bind(this);
    this.setEditState = this.setEditState.bind(this);
    this.releaseOpenEditor = this.releaseOpenEditor.bind(this);
    this.getNewNodeID = this.getNewNodeID.bind(this);
    this.handleSelection = this.handleSelection.bind(this);
    this.onStateChange_SEARCH = this.onStateChange_SEARCH.bind(this);
    this.onStateChange_SESSION = this.onStateChange_SESSION.bind(this);
    this.loadFormFromNode = this.loadFormFromNode.bind(this);
    this.validateForm = this.validateForm.bind(this);
    this.onLabelChange = this.onLabelChange.bind(this);
    this.onTypeChange = this.onTypeChange.bind(this);
    this.onNotesChange = this.onNotesChange.bind(this);
    this.onInfoChange = this.onInfoChange.bind(this);
    this.onProvenanceChange = this.onProvenanceChange.bind(this);
    this.onCommentsChange = this.onCommentsChange.bind(this);
    this.onReplacementNodeIDChange = this.onReplacementNodeIDChange.bind(this);
    this.onNewNodeButtonClick = this.onNewNodeButtonClick.bind(this);
    this.onDeleteButtonClick = this.onDeleteButtonClick.bind(this);
    this.onEditButtonClick = this.onEditButtonClick.bind(this);
    this.onCiteButtonClick = this.onCiteButtonClick.bind(this);
    this.onCloseCiteClick = this.onCloseCiteClick.bind(this);
    this.dateFormatted = this.dateFormatted.bind(this);
    this.requestEditNode = this.requestEditNode.bind(this);
    this.editNode = this.editNode.bind(this);
    this.onAddNewEdgeButtonClick = this.onAddNewEdgeButtonClick.bind(this);
    this.onCancelButtonClick = this.onCancelButtonClick.bind(this);
    this.onEditOriginal = this.onEditOriginal.bind(this);
    this.onCloseDuplicateDialog = this.onCloseDuplicateDialog.bind(this);
    this.onSubmit = this.onSubmit.bind(this);
    this.checkUnload = this.checkUnload.bind(this);
    this.doUnload = this.doUnload.bind(this);
    this.onForceUnlock = this.onForceUnlock.bind(this);

    // NOTE: assign UDATA handlers AFTER functions have been bind()'ed
    // otherwise they will lose context

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /** SESSION is called by SessionSHell when the ID changes
      set system-wide. data: { classId, projId, hashedId, groupId, isValid }
   */
    this.OnAppStateChange('SESSION', this.onStateChange_SESSION);
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    this.OnAppStateChange('SELECTION', this.handleSelection);
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    this.OnAppStateChange('SEARCH', this.onStateChange_SEARCH);
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // Handle Template updates
    this.OnAppStateChange('TEMPLATE', this.setTemplate);
    UDATA.HandleMessage('EDIT_PERMISSIONS_UPDATE', this.setEditState);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /** If someone on the network updates a node or edge, SOURCE_UPDATE is broadcast.
      We catch it here and update the selection if the node we're displaying matches
      the updated node.
      This basically handles updated Node labels in both the main node and in related
      edges.
    */
    UDATA.HandleMessage('SOURCE_UPDATE', data => {
      let needsUpdate = false;
      let currentNodeID = this.state.formData.id;
      let updatedNodeID = data.node.id;
      if (currentNodeID === updatedNodeID) needsUpdate = true;
      this.state.edges.forEach(edge => {
        if (edge.source === updatedNodeID || edge.target === updatedNodeID)
          needsUpdate = true;
      });
      if (needsUpdate) {
        if (DBG)
          console.log(
            'NodeSelector.SOURCE_UPDATE triggering SOURCE_SELECT with',
            currentNodeID
          );
        UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [currentNodeID] });
      }
    });
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /** NODE_EDIT is usually requested by NodeTable. Only allow edit if the
     *  request has a valid nodeID Ignore the request if we're already editing
     *  a node.
     */
    UDATA.HandleMessage('NODE_EDIT', data => {
      const { isBeingEdited, isLocked } = this.state;
      if (
        data.nodeID !== undefined &&
        typeof data.nodeID === 'number' &&
        !isBeingEdited &&
        !isLocked
      ) {
        this.requestEditNode(data.nodeID);
      } else {
        if (typeof data.nodeID !== 'number')
          console.warn(
            'NodeSelector.NODE_EDIT called with bad data.nodeID:',
            data.nodeID
          );
        if (isBeingEdited)
          console.warn(
            'NodeSelector.NODE_EDIT denied because isBeingEdited',
            isBeingEdited
          );
        if (isLocked)
          console.warn('NodeSelector.NODE_EDIT denied because isLocked', isLocked);
      }
    });
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /** This will add any new edges that have links to the currently selected node
      to the list of edges in the NodeSelector.
      IMPORTANT: We ignore edge updates if an edge is currently being edited to
      prevent edge updates from clobbering the edit.  The list of edges is
      updated after the edit is completed, so new edges are added then.
    */
    UDATA.HandleMessage('EDGE_UPDATE', data => {
      if (DBG)
        console.log(
          'NodeSelector: Received EDGE_UPDATE edgesAreLocked',
          this.state.edgesAreLocked,
          data
        );
      let currentNodeID = this.state.formData.id;
      /* EDGE_UPDATES are triggered under two circumnstances:
           a. When an existing edge is updated
           b. When a new edge is created
           The call sequence is:
           1. EdgeEditor.Submit calls datastore.DB_UPDATE
           2. datastore.DB_UPDATE calls server.SRV_DBUPDATE
           3. server.SRV_DBUPDATE broadcasts EDGE_UPDATE
              At this point, edge.source and edge.target are broadcast as Numbers.
           4. EDGE_UPDATE is handled by:
              a. nc-logic.handleMessage("EDGE_UPDATE"), and
              b. NodeSelector.handlemMessage("EDGE_UPDATE") (this method)
           5. nc-logic.handleMessage("EDGE_UPDATE") processes the data and
              actually adds a new edge or updates the existing edge in D3DATA.
              *** The key is that there is a difference in how it's handled.
              For updates, the edge is simply updated.
              But for new edges, the edge object is updated and then pushed to D3DATA.
           6. When the edge object is pushed to D3DATA, D3 processes it and converts
              edge.source and edge.target into node objects.
              *** By the time NodeSelector receives the edge data, edge.source and
              edge.target are node objects, not numbers.
           So this method needs to account for the fact that edge.source and edge.target might be
           received as either numbers or objects.
        */
      let sourceID =
        typeof data.edge.source === 'number' ? data.edge.source : data.edge.source.id;
      let targetID =
        typeof data.edge.target === 'number' ? data.edge.target : data.edge.target.id;
      let updatedNodeIDs = [sourceID, targetID];
      if (updatedNodeIDs.includes(currentNodeID) && !this.state.edgesAreLocked) {
        if (DBG) console.log('NodeSelector: EDGE UPDATE: Calling SOURCE_SELECT!');
        UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [currentNodeID] });
      }
    });
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /** Handler for canceling a new edge
      Called by EdgeEditor
      Normally we would just use SOURCE_SELECT to reload the node.
      There are two issues with just using SOURCE_SELECT:
      1. This special handler is necessary because the newly added edge
         component is not affected by updates to this.state.edges.  Its key
         is not in the this.state.edges array, so it is not properly cleared
         even if we use SOURCE_SELECT to reset the node.
      2. In order for `handleSelection` to properly reload all the edges,
         two states have to be cleared first: this node needs to NOT be
         the ACTIVEAUTOCOMPLETE field, and this node's edges need to be
         EDGEEDIT_UNLOCKed.  The problem is that these states are set
         asynchronously, so `handleSelection` ends up getting called
         before the states are updated.
      To fix this, we use setState's callback to trigger the reload.

      Call this with no data object to trigger deselect.  Used when
      source is deleted by admin user.
    */
    UDATA.HandleMessage('EDGE_NEW_CANCEL', data => {
      if (data.nodeID === this.state.formData.id) {
        this.setState({ edgesAreLocked: false }, () => {
          // Do this in callback, otherwise, edges are not unlocked
          // and the source_select never triggers an update
          UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [this.state.formData.id] });
        });
      } else {
        // Edge is requesting a SOURCE deselect because the source
        // node was deleted by admin
        this.setState({ edgesAreLocked: false }, () => {
          // Do this in callback, otherwise, edges are not unlocked
          // and the source_select never triggers an update
          UDATA.LocalCall('SOURCE_SELECT'); // Deselect
        });
      }
    });
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // This handler is not necessary because SELECTION event clears the form
    // UDATA.HandleMessage("NODE_DELETE", (data) => {
    // });
    // This handler is not necessary because SELECTION event will update the edges
    // UDATA.HandleMessage("EDGE_DELETE", (data) => {
    // });
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /** This keeps track of whether an edge is being edited to prevent network
      updates from clobbering an in-process edit.
    */
    UDATA.HandleMessage('EDGEEDIT_LOCK', data => {
      this.setState({ edgesAreLocked: true });
    });
    UDATA.HandleMessage('EDGEEDIT_UNLOCK', data => {
      this.setState({ edgesAreLocked: false });
    });

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /** Prevent editing if server is disconnected.
      This is necessary to hide the "Add New Node" button.
    */
    this.OnDisconnect(() => {
      console.log('NodeSelector got disconnect');
      this.setState({ isLocked: true });
    });
  } // constructor

  /// UTILITIES /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Clear the form with optional label
   */
  clearForm(label = '') {
    this.releaseOpenEditor();
    this.setState({
      formData: {
        label,
        type: '',
        info: '',
        provenance: '',
        comments: '',
        notes: '',
        degrees: 0,
        id: '', // Always convert this to a Number
        isNewNode: true
      },
      edges: [],
      dbIsLocked: false,
      isBeingEdited: false,
      isValid: false,
      isDuplicateNodeLabel: false,
      duplicateNodeID: '',
      replacementNodeID: '',
      isValidReplacementNodeID: true,
      hideModal: true
    });
  } // clearFform

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  setTemplate(data) {
    this.setState({ nodeDefs: data.nodeDefs });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Disable Node Edit if a Template is being edited
   */
  updateEditState() {
    // disable edit if template is being edited
    this.NetCall('SRV_GET_EDIT_STATUS').then(data => {
      this.setEditState(data);
    });
  }
  setEditState(data) {
    const disableEdit = data.templateBeingEdited || data.importActive;
    const TEMPLATE = this.AppState('TEMPLATE');
    let editLockMessage = '';
    if (data.templateBeingEdited) editLockMessage = TEMPLATE.templateIsLockedMessage;
    if (data.importActive) editLockMessage = TEMPLATE.importIsLockedMessage;
    this.setState({ disableEdit, editLockMessage });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Deregister as an open editor
    Remove 'node' from OPENEDITORS
  */
  releaseOpenEditor() {
    // NOTE: We only deregister if we're currently actively editing
    //       otherwise we might inadvertently deregister
    if (this.state.isBeingEdited)
      this.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.NODE });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Return a new unique ID
    REVIEW: Should this be in nc-logic?
    ANSWER: YES. There shouldn't be ANY data-synthesis code in a component!
    HACK: Replace this code with a server call
  */ getNewNodeID() {
    throw new Error("Don't use getNewNodeID() because it is not network safe");
    /*/
      let highestID = 0;
      let ids  = this.AppState('D3DATA').nodes.map( node => { return Number(node.id) } );
      if (ids.length>0) {
        highestID = ids.reduce( (a,b) => { return Math.max(a,b) } );
      }
      // REVIEW: Should ids be strings or numbers?
      // Right now most edge ids are strings
      return (highestID+1).toString();
      /*/
  } // getNewNodeID
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Return a new unique ID
   */
  getNewEdgeID() {
    throw new Error("Don't use getNewEdgeID() because it is not network safe");
    /*/
      let highestID = 0;
      let ids  = this.AppState('D3DATA').edges.map( edge => { return Number(edge.id) } )
      if (ids.length>0) {
        highestID = ids.reduce( (a,b) => { return Math.max(a,b) } );
      }
      // REVIEW: Should ids be strings or numbers?
      // Right now most edge ids are strings
      return (highestID+1).toString();
      /*/
  } // getNewEdgeID
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle updated SELECTION
   */
  handleSelection(data) {
    if (DBG) console.log('NodeSelector: got state SELECTION', data);

    // Only update if we are the currently active field
    // otherwise an Edge might be active
    let { activeAutoCompleteId } = this.AppState('ACTIVEAUTOCOMPLETE');
    if (activeAutoCompleteId !== thisIdentifier && activeAutoCompleteId !== 'search')
      return;

    if (!this.state.isBeingEdited && !this.state.edgesAreLocked) {
      if (data.nodes && data.nodes.length > 0) {
        // A node was selected, so load it
        // We're not editing, so it's OK to update the form
        if (DBG) console.log('NodeSelector: updating selection', data.nodes[0]);
        // grab the first node
        let node = data.nodes[0];
        this.loadFormFromNode(node);

        // Load edges
        let thisId = this.state.formData.id;
        // -- First, sort edges by source, then target
        data.edges.sort((a, b) => {
          // same source label, sort on target
          if (a.sourceLabel === b.sourceLabel) {
            if (a.targetLabel < b.targetLabel) {
              return -1;
            }
            if (a.targetLabel > b.targetLabel) {
              return 1;
            }
          }
          // Always list `this` node first
          if (a.source === thisId) {
            return -1;
          }
          if (b.source === thisId) {
            return 1;
          }
          // Otherwise sort on source
          if (a.sourceLabel < b.sourceLabel) {
            return -1;
          }
          if (a.sourceLabel > b.sourceLabel) {
            return 1;
          }

          return 0;
        });
        this.setState({
          edges: data.edges
        });
        // Exit now because we just selected a node and don't want to
        // override the form label with form updates.  Otherwise, the
        // the form label is overriden with old form data.
        return;
      } else {
        if (DBG) console.log('NodeSelector: No data.nodes, so clearing form');
        this.clearForm();
      }
    } else {
      // We're already editing, and another selection has come in.
      // What should we do?
      // * force exit?
      // * prevent load?
      // * prevent selection?
      if (DBG) console.log('NodeSelector: Already editing, ignoring SELECTION');
    }

    this.validateForm();
  } // handleSelection
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle change in SESSION data
    Called both by componentWillMount() and AppStateChange handler.
    The 'SESSION' state change is triggered in two places in SessionShell during
    its handleChange() when active typing is occuring, and also during
    SessionShell.componentWillMount()
  */
  onStateChange_SESSION(decoded) {
    let update = { isLocked: !decoded.isValid };
    this.setState(update);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle updated SEARCH
    AutoComplete handles its internal updates, but we do need to validate the form
    When AutoComplete's input field is updated, it sends a SOURCE_SEARCH to ACL
    which returns the updated value in SEARCH state.  AutoComplete updates
    the input field using SEARCH.  We need to update the form data here
    and validate it for NodeSelector.
  */
  onStateChange_SEARCH(data) {
    // Only update if we are the currently active field
    // otherwise an Edge might be active
    let { activeAutoCompleteId } = this.AppState('ACTIVEAUTOCOMPLETE');
    if (activeAutoCompleteId !== thisIdentifier) return;
    let formData = this.state.formData;
    formData.label = data.searchLabel;

    // "Duplicate Node Label" is only a warning, not an error.
    // We want to allow students to enter a duplicate label if necessary
    // This is a case insensitive search
    var isDuplicateNodeLabel = false;
    var duplicateNodeID = void 0;
    if (
      formData.label !== '' &&
      this.AppState('NCDATA').nodes.find(function (node) {
        if (node.id !== formData.id) {
          if (node.label) {
            if (
              node.label.localeCompare(formData.label, 'en', {
                usage: 'search',
                sensitivity: 'base'
              }) === 0
            ) {
              duplicateNodeID = node.id;
              return true;
            }
            return false;
          } else {
            console.log('error processing node: ' + node.id + ' in netc-app.js\n');
            return false;
          }
        }
      })
    ) {
      isDuplicateNodeLabel = true;
    }

    this.setState({
      formData,
      isDuplicateNodeLabel,
      duplicateNodeID
    });

    this.validateForm();
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Copy the node data passed via SELECTION in the form
   */
  loadFormFromNode(newNode) {
    if (DBG) console.log('NodeSelector.loadFormFromNode', newNode);
    if (newNode === undefined) {
      throw 'NodeSelector.loadFormFromNode called with undefined newNode!';
    }
    // Clean data
    // REVIEW: Basic data structure probably needs updating
    let node = { attributes: {} };
    if (newNode.attributes === undefined) {
      newNode.attributes = {};
    }
    // Backward Compatibility: Always convert ids to a Number or loki lookups will fail.
    if (isNaN(newNode.id)) {
      newNode.id = parseInt(newNode.id);
    }
    //
    node.label = newNode.label || '';
    node.id = newNode.id || '';
    node.type = newNode.type;
    node.info = newNode.info;
    node.provenance = newNode.provenance;
    node.comments = newNode.comments;
    node.notes = newNode.notes;
    node.degrees = newNode.degrees;

    // Copy to form
    this.releaseOpenEditor();
    this.setState({
      formData: {
        label: node.label,
        type: node.type,
        info: node.info,
        provenance: node.provenance,
        comments: node.comments,
        notes: node.notes,
        degrees: node.degrees,
        id: node.id,
        isNewNode: false
      },
      dbIsLocked: false,
      isBeingEdited: false,
      isDuplicateNodeLabel: false,
      hideModal: true
    });

    this.validateForm();
  } // loadFormFromNode

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  validateForm() {
    let isValid = false;
    let formData = this.state.formData;

    if (formData.label !== '' && formData.label !== undefined) isValid = true;
    if (DBG)
      console.log(
        'NodeSElector.validateForm: Validating',
        isValid,
        'because label is',
        formData.label,
        '!'
      );
    this.setState({
      isValid: isValid
    });
  }

  /// UI EVENT HANDLERS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// REVIEW: Do we really need to manage each input field change with a state update
  /// or can we just grab the final text during the "SAVE"?
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onLabelChange(label) {
    // REVIEW: Currently this is not being called because AutoComplete
    // doesn't have a change handler
    let node = this.state.formData;
    node.label = label;
    this.setState({ formData: node });
    this.validateForm();
  } // onLabelChange
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onTypeChange(event) {
    let node = this.state.formData;
    node.type = event.target.value;
    this.setState({ formData: node });
  } // onTypeChange
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onNotesChange(event) {
    let node = this.state.formData;
    node.notes = event.target.value;
    this.setState({ formData: node });
  } // onNotesChange
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onInfoChange(event) {
    let node = this.state.formData;
    node.info = event.target.value;
    this.setState({ formData: node });
  } // onInfoChange
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onProvenanceChange(event) {
    let node = this.state.formData;
    node.provenance = event.target.value;
    this.setState({ formData: node });
  } // onProvenanceChange
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onCommentsChange(event) {
    let node = this.state.formData;
    node.comments = event.target.value;
    this.setState({ formData: node });
  } // onCommentsChange
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onReplacementNodeIDChange(event) {
    let replacementNodeID = parseInt(event.target.value);
    let isValid = false;
    // Allow `` because we use a a blank field to indicate delete node without relinking edges.
    if (
      event.target.value === '' ||
      this.AppState('NCDATA').nodes.find(node => {
        return node.id === replacementNodeID;
      })
    ) {
      isValid = true;
    }
    this.setState({
      replacementNodeID: replacementNodeID,
      isValidReplacementNodeID: isValid
    });
  } // onReplacementNodeIDChange
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onNewNodeButtonClick(event) {
    event.preventDefault();

    // Save the search label to re-insert into the new node
    let label = this.AppState('SEARCH').searchLabel;

    // claim the AutoComplete form and populate it with the
    // current search term
    this.AppCall('AUTOCOMPLETE_SELECT', { id: thisIdentifier }).then(() => {
      this.AppCall('SOURCE_SEARCH', { searchString: label });
    });

    // provenance
    const session = this.AppState('SESSION');
    const timestamp = new Date().toLocaleDateString('en-US');
    const provenance_str = `Added by ${session.token} on ${timestamp}`;

    // HACK: call server to retrieve an unused node ID
    // FIXME: this kind of data manipulation should not be in a GUI component
    PromiseNewNodeID().then(newNodeID => {
      this.setState({
        formData: {
          label: label,
          type: '',
          info: '',
          provenance: provenance_str,
          comments: '',
          notes: '',
          degrees: 0,
          id: newNodeID,
          isNewNode: true
        },
        edges: [],
        isBeingEdited: true,
        isValid: false
      });

      this.validateForm();
    });
  } // onNewNodeButtonClick
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onDeleteButtonClick() {
    // nodeID needs to be a Number.  It should have been set in loadFormFromNode
    let nodeID = this.state.formData.id;

    // Re-link edges or delete edges?
    // `NaN` is not valid JSON, so we need to pass -1
    let replacementNodeID =
      this.state.replacementNodeID === ''
        ? -1
        : parseInt(this.state.replacementNodeID); // '' = Delete edges by default

    this.clearForm();
    this.AppCall('DB_UPDATE', {
      nodeID: nodeID,
      replacementNodeID: replacementNodeID
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  // this is an admin only function to allow unlocking of locked nodes without having to reload
  onForceUnlock() {
    // nodeID needs to be a Number.  It should have been set in loadFormFromNode
    let nodeID = this.state.formData.id;

    this.NetCall('SRV_DBUNLOCKNODE', { nodeID: this.state.formData.id }).then(
      data => {
        if (data.NOP) {
          if (DBG) console.log(`SERVER SAYS: ${data.NOP} ${data.INFO}`);
        } else if (data.unlocked) {
          if (DBG)
            console.log(
              `SERVER SAYS: unlock success! you have released Node ${data.nodeID}`
            );
          this.setState({ dbIsLocked: false });
        }
      }
    );
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onEditButtonClick(event) {
    event.preventDefault();

    // hide the modal window if it is open (probably this can be handled better)
    this.setState({ hideModal: true });

    // nodeID needs to be a Number.  It should have been set in loadFormFromNode
    let nodeID = this.state.formData.id;
    this.requestEditNode(nodeID);
  } // onEditButtonClick
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onCiteButtonClick(event) {
    event.preventDefault();

    this.setState({ hideModal: false });
  } // onCiteButtonClick

  onCloseCiteClick(event) {
    event.preventDefault();

    this.setState({ hideModal: true });
  } //   this.onCloseCiteClick

  dateFormatted() {
    var today = new Date();
    var year = '' + today.getFullYear();
    var date = today.getMonth() + 1 + '/' + today.getDate() + '/' + year.substr(2, 4);
    var time = today.toTimeString().substr(0, 5);
    var dateTime = time + ' on ' + date;
    return dateTime;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  requestEditNode(nodeID) {
    this.NetCall('SRV_DBLOCKNODE', { nodeID: nodeID }).then(data => {
      if (data.NOP) {
        console.log(`SERVER SAYS: ${data.NOP} ${data.INFO}`);
        this.setState({ dbIsLocked: true });
      } else if (data.locked) {
        console.log(`SERVER SAYS: lock success! you can edit Node ${data.nodeID}`);
        console.log(`SERVER SAYS: unlock the node after successful DBUPDATE`);
        this.setState({ dbIsLocked: false });
        this.editNode();
      }
    });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  editNode() {
    // Add ID if one isn't already defined
    let formData = this.state.formData;
    if (formData.id === '') {
      throw Error(
        "NodeSelector.onEditButtonClick trying to edit a node with no id!  This shouldn't happen!"
      );
    }
    this.AppCall('AUTOCOMPLETE_SELECT', { id: thisIdentifier }).then(() => {
      // Set AutoComplete field to current data, otherwise, previously canceled label
      // might be displayed
      // this.AppCall('SOURCE_SEARCH', { searchString: formData.label }); // JD removed because I think it is redundant and slowing things down?
    });
    this.setState({
      formData,
      isBeingEdited: true
    });
    this.validateForm();

    // When a node is being edited, lock the Template from being edited
    this.NetCall('SRV_REQ_EDIT_LOCK', { editor: EDITORTYPE.NODE }).then(data => {
      const disableEdit = data.isBeingEdited;
      this.setState({ disableEdit });
    });
  } // editNode
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onAddNewEdgeButtonClick(event) {
    event.preventDefault();
    /*
            When creating a new edge, we first
            1. Add a bare bones edge object with a new ID to the local state.edges
            2. Pass it to render, so that a new EdgeEditor will be created.
            3. In EdgeEditor, we create a dummy edge object
      */

    // HACK: call server to retrieve an unused edge ID
    // FIXME: this kind of data manipulation should not be in a GUI component
    PromiseNewEdgeID().then(newEdgeID => {
      // Add it to local state for now
      let edge = {
        id: newEdgeID,
        source: undefined,
        target: undefined,
        attributes: {}
      };
      let edges = this.state.edges;
      edges.push(edge);
      this.setState({ edges: edges });
    });
  } // onAddNewEdgeButtonClick
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onCancelButtonClick() {
    // If we were editing, then revert and exit
    if (this.state.isBeingEdited) {
      let originalNode = this.AppState('NCDATA').nodes.filter(node => {
        return node.id === this.state.formData.id;
      })[0];
      if (originalNode === undefined) {
        // user abandoned editing a new node that was never saved
        this.clearForm();
      } else {
        // restore original node
        this.loadFormFromNode(originalNode);
        this.releaseOpenEditor();
        this.setState({ isBeingEdited: false });
        // unlock
        this.NetCall('SRV_DBUNLOCKNODE', { nodeID: this.state.formData.id }).then(
          data => {
            if (data.NOP) {
              console.log(`SERVER SAYS: ${data.NOP} ${data.INFO}`);
            } else if (data.unlocked) {
              console.log(
                `SERVER SAYS: unlock success! you have released Node ${data.nodeID}`
              );
              this.setState({ dbIsLocked: false });
            }
          }
        );
      }
      this.AppCall('AUTOCOMPLETE_SELECT', { id: 'search' });
      this.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.NODE });
    }
  } // onCancelButtonClick
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Select the node for editing
   */
  onEditOriginal(event) {
    event.preventDefault();
    let duplicateNodeID = parseInt(this.state.duplicateNodeID);
    this.clearForm();
    this.releaseOpenEditor();
    this.setState(
      {
        isBeingEdited: false,
        isDuplicateNodeLabel: false
      },
      () => {
        // Wait for the edit state to clear, then open up the original node
        if (DBG)
          console.log(
            'NodeSelector.onEditOriginal triggering SOURCE_SELECT with',
            duplicateNodeID
          );
        UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [duplicateNodeID] });
      }
    );
    this.AppCall('AUTOCOMPLETE_SELECT', { id: 'search' });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** User confirms they want to edit the existing node.
   */
  onCloseDuplicateDialog() {
    this.setState({ isDuplicateNodeLabel: false });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onSubmit(event) {
    event.preventDefault();
    // Update the data with the selectedNode
    let formData = this.state.formData;
    let node = {
      label: formData.label ? formData.label : '',
      id: formData.id,
      type: formData.type,
      info: formData.info,
      provenance: formData.provenance,
      comments: formData.comments,
      notes: formData.notes,
      degrees: formData.degrees
    };
    this.releaseOpenEditor();
    this.setState({ isBeingEdited: false });
    // clear AutoComplete form
    this.AppCall('AUTOCOMPLETE_SELECT', { id: 'search' }).then(() => {
      // Reselect the saved node
      this.AppCall('SOURCE_SEARCH', { searchString: node.label });
    });
    // write data to database
    // setting dbWrite to true will distinguish this update
    // from a remote one
    this.AppCall('DB_UPDATE', { node }).then(() => {
      this.NetCall('SRV_DBUNLOCKNODE', { nodeID: formData.id }).then(data => {
        if (data.NOP) {
          console.log(`SERVER SAYS: ${data.NOP} ${data.INFO}`);
        } else if (data.unlocked) {
          console.log(
            `SERVER SAYS: unlock success! you have released Node ${data.nodeID}`
          );
          this.setState({ dbIsLocked: false });
        }
      });
    });
    // probably should unlock the node:
    this.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.NODE });
  } // onSubmit

  /// REACT LIFECYCLE ///////////////////////////////////////////////////////////
  /** REACT calls this to receive the component layout and data sources
   */
  render() {
    const {
      nodeDefs,
      duplicateWarning,
      nodeIsLockedMessage,
      editLockMessage,
      hideDeleteNodeButton,
      formData,
      isLocked,
      isStandalone,
      disableEdit,
      isBeingEdited
    } = this.state;
    let { citation } = this.state;
    if (citation == undefined) {
      citation = {};
      citation.hidden = true;
    }
    return (
      <div>
        <FormGroup
          className="text-right"
          style={{ marginTop: '10px', paddingRight: '5px' }}
        >
          <Button
            outline
            size="sm"
            disabled={disableEdit}
            hidden={isLocked || isBeingEdited}
            onClick={this.onNewNodeButtonClick}
          >
            {'Add New Node'}
          </Button>
        </FormGroup>
        <Form
          className="nodeEntry"
          style={{
            minHeight: '300px',
            backgroundColor: '#B8EDFF',
            padding: '5px',
            marginBottom: '0px'
          }}
          onSubmit={this.onSubmit}
        >
          <FormText>
            <b>NODE {formData.id || ''}</b>
          </FormText>
          <FormGroup row>
            <Col sm={3} style={{ hyphens: 'auto' }} className="pr-0">
              <Label for="nodeLabel" className="tooltipAnchor small text-muted">
                {nodeDefs.label.displayLabel}
                <span className="tooltiptext">{this.helpText(nodeDefs.label)}</span>
              </Label>
            </Col>
            <Col sm={9}>
              <AutoComplete
                identifier={thisIdentifier}
                disabledValue={formData.label}
                inactiveMode={'disabled'}
                shouldIgnoreSelection={isBeingEdited}
              />
            </Col>
            <div
              hidden={!this.state.isDuplicateNodeLabel}
              style={{
                width: '200px',
                height: '150px',
                backgroundColor: '#B8EDFF',
                position: 'fixed',
                left: '350px',
                zIndex: '1000',
                padding: '10px'
              }}
            >
              <p className="text-danger small">{duplicateWarning}</p>
              <Button size="sm" onClick={this.onEditOriginal}>
                View Existing
              </Button>
              <Button outline size="sm" onClick={this.onCloseDuplicateDialog}>
                Continue
              </Button>
            </div>
          </FormGroup>
          <div style={{ position: 'absolute', left: '300px', maxWidth: '300px' }}>
            <NodeDetail />
          </div>
          <FormGroup row hidden={nodeDefs.type.hidden}>
            <Col sm={3} style={{ hyphens: 'auto' }} className="pr-0">
              <Label for="type" className="tooltipAnchor small text-muted">
                {nodeDefs.type.displayLabel}
                <span className="tooltiptext">{this.helpText(nodeDefs.type)}</span>
              </Label>
            </Col>
            <Col sm={9}>
              <Input
                type="select"
                name="type"
                id="typeSelect"
                value={formData.type || ''}
                onChange={this.onTypeChange}
                disabled={!isBeingEdited}
              >
                {nodeDefs.type.options.map(option => (
                  <option key={option.label}>{option.label}</option>
                ))}
              </Input>
            </Col>
          </FormGroup>
          <FormGroup row hidden={nodeDefs.notes.hidden}>
            <Col sm={3} style={{ hyphens: 'auto' }} className="pr-0">
              <Label for="notes" className="tooltipAnchor small text-muted">
                {nodeDefs.notes.displayLabel}
                <span className="tooltiptext">{this.helpText(nodeDefs.notes)}</span>
              </Label>
            </Col>
            <Col sm={9}>
              <Input
                type="textarea"
                name="note"
                id="notesText"
                style={{ display: isBeingEdited ? 'block' : 'none' }}
                value={formData.notes || ''}
                onChange={this.onNotesChange}
                readOnly={!isBeingEdited}
              />
              {this.markdownDisplay(formData.notes || '')}
            </Col>
          </FormGroup>
          <FormGroup row hidden={nodeDefs.info.hidden}>
            <Col sm={3} style={{ hyphens: 'auto' }} className="pr-0">
              <Label for="info" className="tooltipAnchor small text-muted">
                {nodeDefs.info.displayLabel}
                <span className="tooltiptext">{this.helpText(nodeDefs.info)}</span>
              </Label>
            </Col>
            <Col sm={9}>
              <Input
                type="text"
                name="info"
                id="info"
                value={formData.info || ''}
                onChange={this.onInfoChange}
                readOnly={!isBeingEdited}
              />
            </Col>
          </FormGroup>
          <FormGroup row hidden={nodeDefs.provenance.hidden}>
            <Col sm={3} style={{ hyphens: 'auto' }} className="pr-0">
              <Label for="provenance" className="tooltipAnchor small text-muted">
                {nodeDefs.provenance.displayLabel}
                <span className="tooltiptext">
                  {this.helpText(nodeDefs.provenance)}
                </span>
              </Label>
            </Col>
            <Col sm={9}>
              <Input
                type="textarea"
                name="provenance"
                id="provenance"
                value={formData.provenance || ''}
                onChange={this.onProvenanceChange}
                readOnly={!isBeingEdited}
              />
            </Col>
          </FormGroup>
          <FormGroup row hidden={nodeDefs.comments.hidden}>
            <Col sm={3} style={{ hyphens: 'auto' }} className="pr-0">
              <Label for="comments" className="tooltipAnchor small text-muted">
                {nodeDefs.comments.displayLabel}
                <span className="tooltiptext">
                  {this.helpText(nodeDefs.comments)}
                </span>
              </Label>
            </Col>
            <Col sm={9}>
              <Input
                type="textarea"
                name="comments"
                id="comments"
                className="comments"
                value={formData.comments || ''}
                onChange={this.onCommentsChange}
                readOnly={!isBeingEdited}
                disabled={!isBeingEdited}
              />
            </Col>
          </FormGroup>

          <div
            id="citationWindow"
            hidden={this.state.hideModal}
            className="modal-content"
          >
            <span className="close" onClick={this.onCloseCiteClick}>
              &times;
            </span>
            <p>
              <em>Copy the text below:</em>
              <br />
              <br />
              NetCreate {this.AppState('TEMPLATE').name} network, Node:{' '}
              {formData.label} (ID {formData.id}). {citation.text}. Last accessed at{' '}
              {this.dateFormatted()}.
            </p>
          </div>
          <br />

          <FormGroup className="text-right" style={{ paddingRight: '5px' }}>
            <Button
              outline
              size="sm"
              hidden={citation.hidden || formData.id === ''}
              onClick={this.onCiteButtonClick}
            >
              Cite Node
            </Button>
            &nbsp;&nbsp;
            <div
              hidden={isLocked || isStandalone || isBeingEdited || formData.id === ''}
              style={{ display: 'inline' }}
            >
              <Button
                outline
                size="sm"
                disabled={disableEdit}
                onClick={this.onEditButtonClick}
              >
                Edit Node
              </Button>
              <p
                hidden={!this.state.dbIsLocked}
                className="small text-danger warning"
              >
                {nodeIsLockedMessage}
                <span hidden={!isAdmin}>
                  &nbsp;<b>ADMINISTRATOR ONLY</b>: If you are absolutely sure this is
                  an error, you can force the unlock:
                  <br />
                  <Button
                    className="small btn btn-outline-light warning"
                    size="sm"
                    onClick={this.onForceUnlock}
                  >
                    Force Unlock
                  </Button>
                </span>
              </p>
              <p hidden={!disableEdit} className="small text-danger warning">
                {editLockMessage}
              </p>
            </div>
          </FormGroup>
          <FormGroup className="text-right" style={{ paddingRight: '5px' }}>
            <Button
              outline
              size="sm"
              hidden={!isBeingEdited}
              onClick={this.onCancelButtonClick}
            >
              {isBeingEdited ? 'Cancel' : 'Close'}
            </Button>
            &nbsp;
            <Button
              color="primary"
              size="sm"
              disabled={!this.state.isValid}
              hidden={!isBeingEdited}
            >
              Save
            </Button>
          </FormGroup>
          <FormGroup
            row
            className="text-left"
            style={{
              padding: '10px 5px',
              margin: '0 -4px',
              backgroundColor: '#c5e0ef'
            }}
            hidden={
              !isAdmin || isLocked || formData.id === '' || hideDeleteNodeButton
            }
          >
            <Col sm={6}>
              <FormText>
                Re-link edges to this Node ID (leave blank to delete edge)
              </FormText>
            </Col>
            <Col sm={6}>
              <Input
                type="text"
                name="replacementNodeID"
                id="replacementNodeID"
                value={this.state.replacementNodeID || ''}
                onChange={this.onReplacementNodeIDChange}
                className=""
                style={{ width: `4em` }}
                bsSize="sm"
                invalid={!this.state.isValidReplacementNodeID}
              />
              <FormFeedback>Invalid Node ID!</FormFeedback>
              <Button
                className="small btn btn-outline-light"
                size="sm"
                onClick={this.onDeleteButtonClick}
              >
                Delete
              </Button>
            </Col>
          </FormGroup>
        </Form>
        <div
          style={{ backgroundColor: '#B9DFFF', padding: '5px', marginBottom: '10px' }}
        >
          <FormText>EDGES</FormText>
          {/* `key` is needed during edge deletion so EdgeEditors are properly
                 removed when an edge is deleted.
                 REVIEW: Can we replace edgeID with key?  */}
          {this.state.edges.map((edge, i) => (
            <EdgeEditor
              edgeID={edge.id}
              key={edge.id}
              parentNodeLabel={formData.label}
              parentNodeIsLocked={isLocked}
            />
          ))}
          <FormGroup className="text-right">
            <Button
              outline
              size="sm"
              disabled={disableEdit}
              hidden={isLocked || formData.id === '' || isBeingEdited}
              onClick={this.onAddNewEdgeButtonClick}
            >
              Add New Edge
            </Button>
          </FormGroup>
        </div>
      </div>
    );
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  helpText(obj) {
    if (!obj) return;
    var text = '';

    if (obj.help == undefined || obj.help == '') text = obj.label;
    else text = obj.help;
    return text;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  markdownDisplay(text) {
    if (!this.state.isBeingEdited)
      return mdReact({
        onIterate: this.markdownIterate,
        markdownOptions: { typographer: true, linkify: true },
        plugins: [emoji]
      })(text);
  }

  markdownIterate(Tag, props, children, level) {
    if (Tag === 'a') {
      props.target = '_blank';
    }

    return <Tag {...props}>{children}</Tag>;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */ componentDidMount() {
    this.onStateChange_SESSION(this.AppState('SESSION'));
    this.validateForm();
    this.updateEditState();
    this.setState({
      // hide Edit button if in standalone mode
      isStandalone: UNISYS.IsStandaloneMode()
    });
    window.addEventListener('beforeunload', this.checkUnload);
    window.addEventListener('unload', this.doUnload);
  }

  checkUnload(e) {
    e.preventDefault();
    if (this.state.isBeingEdited) {
      (e || window.event).returnValue = null;
    } else {
      Reflect.deleteProperty(e, 'returnValue');
    }
    return e;
  }

  doUnload(e) {
    if (this.state.isBeingEdited) {
      this.NetCall('SRV_DBUNLOCKNODE', { nodeID: this.state.formData.id });
      this.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.NODE });
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Release the lock if we're unmounting
   */ componentWillUnmount() {
    if (DBG) console.log('NodeEditor.componentWillUnMount!');
    if (this.state.isBeingEdited) {
      this.NetCall('SRV_DBUNLOCKNODE', { nodeID: this.state.formData.id }).then(
        data => {
          if (data.NOP) {
            if (DBG) console.log(`SERVER SAYS: ${data.NOP} ${data.INFO}`);
          } else if (data.unlocked) {
            if (DBG)
              console.log(
                `SERVER SAYS: unlock success! you have released Node ${data.nodeID}`
              );
            this.setState({ dbIsLocked: false });
          }
        }
      );
      this.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.NODE });
    }
    // deregister ACTIVEAUTOMPLETE when component unmounts
    // otherwise state updates trigger a setState on unmounted component error
    this.AppStateChangeOff('SESSION', this.onStateChange_SESSION);
    this.AppStateChangeOff('SELECTION', this.handleSelection);
    this.AppStateChangeOff('SEARCH', this.onStateChange_SEARCH);
    this.AppStateChangeOff('TEMPLATE', this.setTemplate);
    UDATA.UnhandleMessage('EDIT_PERMISSIONS_UPDATE', this.setEditState);
    window.removeEventListener('beforeunload', this.checkUnload);
    window.removeEventListener('unload', this.doUnload);
  }
} // class NodeSelector

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NodeSelector;
