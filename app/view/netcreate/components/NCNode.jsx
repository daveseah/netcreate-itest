/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Prototype Simple NetCreate Node Editor

  Built for Version 2.0 ITEST.

  Provides a viewer and editor for the currently selected node.

  USAGE

    <NCNode />

  Main changes for 2.0:
  * Node data is made up of built-in parameters (e.g. label, provenance),
    and arbitrary custom parameters defined via the template.  This Node
    editor can support wide variety of data.

  DATA UPDATES
  * Updates are triggered mostly by:
    1.  SELECTION state updates when nodes and edges change
    2.  PERMISSION state updates when locks are set and released.

  Data is currently in a transitional state.
  Currently all properties are saved in a flat list.
  Eventually we might want to differentiate between
  built-in properties (e.g. id, created), and template-defined custom
  `attributes`.  There is an awkward translation between these two
  representations during data load, update, and save.


  PERMISSIONS
  Editting is restricted by:
  * User must be logged in
  * Template is not being edited
  * Data is not being imported
  * Someone else is not editing the node (and has placed a lock on it)

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const EDGEMGR = require('../edge-mgr'); // handles edge synthesis
const CMTMGR = require('../comment-mgr');
const { EDITORTYPE, BUILTIN_FIELDS_NODE } = require('system/util/enum');
const { EDGE_NOT_SET_LABEL, ARROW_RIGHT } = require('system/util/constant');
const NCLOGIC = require('../nc-logic');
const NCUI = require('../nc-ui');
const NCEdge = require('./NCEdge');
const NCDialogCitation = require('./NCDialogCitation');
const SETTINGS = require('settings');
import URCommentVBtn from './URCommentVBtn';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCNode';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const isAdmin = SETTINGS.IsAdmin();
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const TABS = {
  // Also used as labels
  ATTRIBUTES: 'ATTRIBUTES',
  EDGES: 'EDGES',
  PROVENANCE: 'PROVENANCE'
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDATA;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class NCNode extends UNISYS.Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoggedIn: false
    }; // initialized on componentDidMount and clearSelection

    // STATE MANAGEMENT
    this.ResetState = this.ResetState.bind(this);
    this.UpdateSession = this.UpdateSession.bind(this);
    this.UpdateNCData = this.UpdateNCData.bind(this);
    this.SetPermissions = this.SetPermissions.bind(this);
    this.UpdatePermissions = this.UpdatePermissions.bind(this);

    // EVENT HANDLERS
    this.CheckUnload = this.CheckUnload.bind(this);
    this.DoUnload = this.DoUnload.bind(this);
    this.ClearSelection = this.ClearSelection.bind(this);
    this.UpdateSelection = this.UpdateSelection.bind(this);
    this.SelectEdgeAndEdit = this.SelectEdgeAndEdit.bind(this);
    this.SelectEdge = this.SelectEdge.bind(this);
    this.DeselectEdge = this.DeselectEdge.bind(this);
    // DATA LOADING
    this.LoadNode = this.LoadNode.bind(this);
    this.LoadEdges = this.LoadEdges.bind(this);
    this.LoadAttributes = this.LoadAttributes.bind(this);
    this.LockNode = this.LockNode.bind(this);
    this.UnlockNode = this.UnlockNode.bind(this);
    this.IsNodeLocked = this.IsNodeLocked.bind(this);
    // DATA SAVING
    this.SaveNode = this.SaveNode.bind(this);
    this.DeleteNode = this.DeleteNode.bind(this);
    // HELPER METHODS
    this.SetBackgroundColor = this.SetBackgroundColor.bind(this);
    this.UpdateMatchingList = this.UpdateMatchingList.bind(this);
    // UI HANDLERS
    this.UISelectTab = this.UISelectTab.bind(this);
    this.UIRequestEditNode = this.UIRequestEditNode.bind(this);
    this.UIReplacementNodeIdUpdate = this.UIReplacementNodeIdUpdate.bind(this);
    this.UIAddEdge = this.UIAddEdge.bind(this);
    this.UIEnableEditMode = this.UIEnableEditMode.bind(this);
    this.UICancelEditMode = this.UICancelEditMode.bind(this);
    this.UIDisableEditMode = this.UIDisableEditMode.bind(this);
    this.UIInputUpdate = this.UIInputUpdate.bind(this);
    this.UIProvenanceInputUpdate = this.UIProvenanceInputUpdate.bind(this);
    this.UILabelInputUpdate = this.UILabelInputUpdate.bind(this);
    this.UIViewEdge = this.UIViewEdge.bind(this);
    this.UIEditEdge = this.UIEditEdge.bind(this);
    this.UICitationShow = this.UICitationShow.bind(this);
    this.UICitationClose = this.UICitationClose.bind(this);
    // RENDERERS -- Main
    this.RenderView = this.RenderView.bind(this);
    this.RenderEdit = this.RenderEdit.bind(this);
    // RENDER HELPERS
    this.RenderEdgesTab = this.RenderEdgesTab.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.OnAppStateChange('SESSION', this.UpdateSession);
    UDATA.OnAppStateChange('NCDATA', this.UpdateNCData);
    UDATA.OnAppStateChange('SELECTION', this.UpdateSelection);
    UDATA.HandleMessage('EDIT_PERMISSIONS_UPDATE', this.SetPermissions);
    UDATA.HandleMessage('NODE_EDIT', this.UIRequestEditNode); // Node Table request
    UDATA.HandleMessage('EDGE_SELECT_AND_EDIT', this.SelectEdgeAndEdit);
    UDATA.HandleMessage('EDGE_SELECT', this.SelectEdge);
    UDATA.HandleMessage('EDGE_DESELECT', this.DeselectEdge);
  }

  componentDidMount() {
    this.ResetState(); // Initialize State
    window.addEventListener('beforeunload', this.CheckUnload);
    window.addEventListener('unload', this.DoUnload);
  }
  componentWillUnmount() {
    UDATA.AppStateChangeOff('SESSION', this.UpdateSession);
    UDATA.AppStateChangeOff('NCDATA', this.UpdateNCData);
    UDATA.AppStateChangeOff('SELECTION', this.UpdateSelection);
    UDATA.UnhandleMessage('EDIT_PERMISSIONS_UPDATE', this.SetPermissions);
    UDATA.UnhandleMessage('NODE_EDIT', this.UIRequestEditNode);
    UDATA.UnhandleMessage('EDGE_SELECT_AND_EDIT', this.SelectEdgeAndEdit);
    UDATA.UnhandleMessage('EDGE_SELECT', this.SelectEdge);
    UDATA.UnhandleMessage('EDGE_DESELECT', this.DeselectEdge);
    window.removeEventListener('beforeunload', this.CheckUnload);
    window.removeEventListener('unload', this.DoUnload);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// STATE MANAGEMENT
  ///
  ResetState() {
    const TEMPLATE = this.AppState('TEMPLATE');
    this.setState({
      // NODE DEFS
      id: null,
      label: '',
      type: '',
      degrees: null,
      attributes: {},
      provenance: {},
      created: undefined,
      createdBy: undefined,
      updated: undefined,
      updatedBy: undefined,
      revision: 0,
      // EDGES
      edges: [], // selected nodes' edges not ALL edges
      // SYSTEM STATE
      // isLoggedIn: false, // don't clear session state!
      // isAdmin: false,
      previousState: {},
      // UI State
      uEditBtnDisable: false,
      uEditBtnHide: false,
      uViewMode: NCUI.VIEWMODE.VIEW,
      uSelectedTab: TABS.ATTRIBUTES,
      selectedEdgeId: null,
      uBackgroundColor: 'transparent',
      uIsLockedByDB: false, // shows db lock message next to Edit Node button
      uIsLockedByTemplate: false,
      uIsLockedByImport: false,
      uIsLockedByComment: false,
      uEditLockMessage: '',
      uHideDeleteNodeButton: TEMPLATE.hideDeleteNodeButton,
      uReplacementNodeId: '',
      uIsValidReplacementNodeID: true,
      uShowMatchlist: false,
      uShowCitationDialog: false
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// EVENT HANDLERS
  ///
  CheckUnload(event) {
    if (this.state.uViewMode === NCUI.VIEWMODE.EDIT) {
      event.preventDefault();
      (event || window.event).returnValue = null;
    } else {
      Reflect.deleteProperty(event, 'returnValue');
    }
    return event;
  }
  DoUnload(event) {
    if (this.state.uViewMode === NCUI.VIEWMODE.EDIT) {
      UDATA.NetCall('SRV_DBUNLOCKNODE', { nodeID: this.state.id });
      UDATA.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.NODE });
    }
  }

  /**
   * Handle change in SESSION data
   * SESSION is called by SessionShell when the ID changes
   * set system-wide. data: { classId, projId, hashedId, groupId, isValid }
   * Called both by componentWillMount() and AppStateChange handler.
   * The 'SESSION' state change is triggered in two places in SessionShell during
   * its handleChange() when active typing is occuring, and also during
   * SessionShell.componentWillMount()
   */
  UpdateSession(decoded) {
    this.setState({ isLoggedIn: decoded.isValid }, () => this.UpdatePermissions());
  }
  /*
      Called by NCDATA AppState updates
  */
  UpdateNCData(data) {
    // If NCDATA is updated, reload the node AND the edges b/c db has changed
    const updatedNode = data.nodes.find(n => n.id === this.state.id);
    this.LoadNode(updatedNode);
    this.LoadEdges(this.state.id);
  }
  SetPermissions(data) {
    UDATA.NetCall('SRV_GET_EDIT_STATUS').then(data => {
      // someone else might be editing a template or importing or editing node or edge
      const { id } = this.state;
      const nodeIsLocked = data.lockedNodes.includes(id);

      // skip updates if there are no changes in values to optimize renders
      const newState = {
        uIsLockedByDB: nodeIsLocked,
        uIsLockedByTemplate: data.templateBeingEdited,
        uIsLockedByImport: data.importActive,
        uIsLockedByComment: data.commentBeingEditedByMe
      };
      if (
        newState.uIsLockedByDB === this.state.uIsLockedByDB &&
        newState.uIsLockedByTemplate === this.state.uIsLockedByTemplate &&
        newState.uIsLockedByImport === this.state.uIsLockedByImport &&
        newState.uIsLockedByComment === this.state.uIsLockedByComment
      ) {
        return;
      }
      this.setState(newState, () => this.UpdatePermissions());
    });
  }
  UpdatePermissions() {
    const {
      isLoggedIn,
      uIsLockedByDB,
      uIsLockedByTemplate,
      uIsLockedByImport,
      uIsLockedByComment
    } = this.state;
    const TEMPLATE = UDATA.AppState('TEMPLATE');
    let uEditLockMessage = '';
    let uEditBtnDisable = false;
    let uEditBtnHide = true;
    if (isLoggedIn) uEditBtnHide = false;
    if (uIsLockedByDB) {
      uEditBtnDisable = true;
      uEditLockMessage += TEMPLATE.nodeIsLockedMessage;
    }
    if (uIsLockedByTemplate) {
      uEditBtnDisable = true;
      uEditLockMessage += TEMPLATE.templateIsLockedMessage;
    }
    if (uIsLockedByImport) {
      uEditBtnDisable = true;
      uEditLockMessage += TEMPLATE.importIsLockedMessage;
    }
    if (uIsLockedByComment) {
      uEditBtnDisable = true;
      uEditLockMessage += '';
    }
    this.setState({ uEditBtnDisable, uEditBtnHide, uEditLockMessage });
  }
  ClearSelection() {
    this.ResetState();
  }
  UpdateSelection(data) {
    if (!data.nodes) return; // SELECTION cleared?
    const node = data.nodes[0]; // select the first node
    this.LoadNode(node);
  }
  /**
   * In order to edit an edge, we must first select the source
   * 1. (this assumes SOURCE_SELECT was already called)
   * 2. select the Edges tab
   * 3. open the edge (load the edge data into NCEdge)
   * 4. trigger edge edit mode
   * @param {Object} data
   * @param {string} data.edgeId
   */
  SelectEdgeAndEdit(data) {
    const { edgeId } = data;
    this.setState({ uSelectedTab: TABS.EDGES, selectedEdgeId: edgeId }, () => {
      const { edges } = this.state;
      const edge = edges.find(e => e.id === Number(edgeId));
      this.setState({ selectedEdgeId: edgeId });
      UDATA.LocalCall('EDGE_OPEN', { edge }).then(() => {
        UDATA.LocalCall('EDGE_EDIT', { edgeId });
      });
    });
  }
  SelectEdge(data) {
    const { edgeId } = data;
    this.setState({ uSelectedTab: TABS.EDGES, selectedEdgeId: edgeId }, () => {
      const { edges } = this.state;
      const edge = edges.find(e => e.id === Number(edgeId));
      this.setState({ selectedEdgeId: edgeId });
      UDATA.LocalCall('EDGE_OPEN', { edge });
    });
  }
  DeselectEdge() {
    this.setState({ selectedEdgeId: null });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// DATA LOADING
  ///
  LoadNode(node) {
    const { id, uViewMode } = this.state;

    // If we're editing, ignore the select!
    if (uViewMode === NCUI.VIEWMODE.EDIT) return;

    // If no node was selected, deselect
    if (!node) {
      this.ClearSelection();
      return;
    }

    // if we're loading a new node, close any open edges
    if (node.id !== id) UDATA.LocalCall('EDGE_DESELECT');

    // Load the node
    const attributes = this.LoadAttributes(node);
    const provenance = this.LoadProvenance(node);
    this.setState(
      {
        id: node.id,
        label: node.label,
        type: node.type,
        degrees: node.degrees,
        attributes: attributes,
        provenance: provenance,
        created: node.meta ? new Date(node.meta.created).toLocaleString() : '',
        createdBy: node.createdBy,
        updated: node.meta ? new Date(node.meta.updated).toLocaleString() : '',
        updatedBy: node.updatedBy,
        revision: node.meta ? node.meta.revision : ''
      },
      () => {
        this.SetBackgroundColor();
        this.UpdateMatchingList(node.label);
        this.LoadEdges(node.id);
        this.IsNodeLocked(nodeIsLocked => {
          this.setState(
            {
              uIsLockedByDB: nodeIsLocked
            },
            () => this.UpdatePermissions()
          );
        });
      }
    );
  }
  LoadEdges(id) {
    // -- First, sort edges by source, then target
    const NCDATA = UDATA.AppState('NCDATA');
    const linkedEdges = NCDATA.edges.filter(e => e.source === id || e.target === id);
    linkedEdges.sort((a, b) => {
      // same source label, sort on target
      if (a.sourceLabel === b.sourceLabel) {
        if (a.targetLabel < b.targetLabel) return -1;
        if (a.targetLabel > b.targetLabel) return 1;
      }
      // Always list `this` node first
      if (a.source === id) return -1;
      if (b.source === id) return 1;
      // Otherwise sort on source
      if (a.sourceLabel < b.sourceLabel) return -1;
      if (a.sourceLabel > b.sourceLabel) return 1;
      return 0;
    });
    this.setState({ edges: linkedEdges });
  }
  /**
   * Loads up the `attributes` object defined by the TEMPLATE
   * Will skip
   *   * BUILTIN fields
   *   * attributes that are `hidden` by the template
   * REVIEW: Currently the parameters will show up in random object order.
   * @param {Object} node
   * @returns {Object} { ...attr-key: attr-value }
   */
  LoadAttributes(node) {
    const NODEDEFS = UDATA.AppState('TEMPLATE').nodeDefs;
    const attributes = {};
    Object.keys(NODEDEFS).forEach(k => {
      if (BUILTIN_FIELDS_NODE.includes(k)) return; // skip built-in fields
      const attr_def = NODEDEFS[k];
      if (attr_def.hidden) return; // skip hidden fields
      if (attr_def.isProvenance) return; // skip fields that are marked as provenance
      attributes[k] = node[k];
    });
    return attributes;
  }
  /**
   * Loads up the `provenance` object defined by the TEMPLATE
   * Will skip
   *   * BUILTIN fields
   *   * attributes that are `hidden` by the template
   * REVIEW: Currently the parameters will show up in random object order.
   * @param {Object} node
   * @returns {Object} { ...attr-key: attr-value }
   */
  LoadProvenance(node) {
    const NODEDEFS = UDATA.AppState('TEMPLATE').nodeDefs;
    const provenance = {};
    Object.keys(NODEDEFS).forEach(k => {
      if (BUILTIN_FIELDS_NODE.includes(k)) return; // skip built-in fields
      const provenance_def = NODEDEFS[k];
      if (provenance_def.hidden) return; // skip hidden fields
      if (!provenance_def.isProvenance) return; // skip fields that are not marked as provenance
      provenance[k] = node[k];
    });
    return provenance;
  }

  /**
   * Tries to lock the node for editing.
   * If the lock fails, then it means the node was already locked
   * previously and we're not allowed to edit
   * @param {function} cb callback function
   * @returns {boolean} true if lock was successful
   */
  LockNode(cb) {
    const { id } = this.state;
    let lockSuccess = false;
    UDATA.NetCall('SRV_DBLOCKNODE', { nodeID: id }).then(data => {
      if (data.NOP) {
        console.log(`SERVER SAYS: ${data.NOP} ${data.INFO}`);
      } else if (data.locked) {
        console.log(`SERVER SAYS: lock success! you can edit Node ${data.nodeID}`);
        console.log(`SERVER SAYS: unlock the node after successful DBUPDATE`);
        lockSuccess = true;
        // When a node is being edited, lock the Template from being edited
        UDATA.NetCall('SRV_REQ_EDIT_LOCK', { editor: EDITORTYPE.NODE });
      }
      if (typeof cb === 'function') cb(lockSuccess);
    });
  }
  UnlockNode(cb) {
    const { id } = this.state;
    let unlockSuccess = false;
    UDATA.NetCall('SRV_DBUNLOCKNODE', { nodeID: id }).then(data => {
      if (data.NOP) {
        console.log(`SERVER SAYS: ${data.NOP} ${data.INFO}`);
      } else if (data.unlocked) {
        console.log(
          `SERVER SAYS: unlock success! you have released Node ${data.nodeID}`
        );
        unlockSuccess = true;
        // Release Template lock
        UDATA.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.NODE });
      }
      if (typeof cb === 'function') cb(unlockSuccess);
    });
  }
  IsNodeLocked(cb) {
    const { id } = this.state;
    let nodeIsLocked = false;
    UDATA.NetCall('SRV_DBISNODELOCKED', { nodeID: id }).then(data => {
      if (data.NOP) {
        console.log(`SERVER SAYS: ${data.NOP} ${data.INFO}`);
      } else if (data.locked) {
        console.log(
          `SERVER SAYS: Node is locked! You cannot edit Node ${data.nodeID}`
        );
        nodeIsLocked = true;
      }
      if (typeof cb === 'function') cb(nodeIsLocked);
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// DATA SAVING
  ///
  SaveNode() {
    const { id, label, type, attributes, provenance, created, updated, revision } =
      this.state;
    const uid = NCLOGIC.GetCurrentUserId();
    const node = {
      id,
      label,
      type,
      updatedBy: uid
    };
    Object.keys(attributes).forEach(k => (node[k] = attributes[k]));
    Object.keys(provenance).forEach(k => (node[k] = provenance[k]));

    // Exit Edit mode first, then send the update
    // (This is necessary otherwise the db update will trigger a
    // NCDATA update followed by LoadNode, which will skip loading because
    // it's still in edit mode)
    this.setState(
      {
        uViewMode: NCUI.VIEWMODE.VIEW
      },
      () => {
        // write data to database
        // setting dbWrite to true will distinguish this update
        // from a remote one
        this.AppCall('DB_UPDATE', { node }).then(() => {
          this.UnlockNode(() => {
            this.setState({ uIsLockedByDB: false });
          });
        });
      }
    );
    UNISYS.Log('click save node', id, label, JSON.stringify(node));
  }
  DeleteNode() {
    const { id, uReplacementNodeId } = this.state;

    // Re-link edges or delete edges?
    // `NaN` is not valid JSON, so we need to pass -1
    const replacementNodeID =
      uReplacementNodeId === '' ? -1 : parseInt(uReplacementNodeId); // '' = Delete edges by default

    this.ResetState();
    this.AppCall('DB_UPDATE', {
      nodeID: id,
      replacementNodeID: replacementNodeID
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// HELPER METHODS
  /**
   * Sets the background color of the node editor via `uBackgroundColor` state.
   * Currently the background color is determined by the template node type
   * color mapping.  This will eventually be replaced with a color manager.
   */
  SetBackgroundColor() {
    const { type } = this.state;
    const COLORMAP = UDATA.AppState('COLORMAP');
    const uBackgroundColor = COLORMAP.nodeColorMap[type] || '#555555';
    this.setState({ uBackgroundColor });
  }

  UpdateMatchingList(value) {
    const { id } = this.state;
    UDATA.LocalCall('FIND_MATCHING_NODES', { searchString: value }).then(data => {
      const matchingNodes = data.nodes.filter(n => n.id !== id); // don't include self
      this.setState({ matchingNodes });
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// UI EVENT HANDLERS

  UISelectTab(event) {
    const { id, label } = this.state;
    const uSelectedTab = event.target.value;
    this.setState({ uSelectedTab });
    if (event.target.value !== TABS.EDGES) UDATA.LocalCall('EDGE_DESELECT');
    UNISYS.Log('select node tab', id, label, uSelectedTab);
  }

  /**
   * If `lockNode` is not successful, then that means the node was
   * already locked, so we can't edit.
   */
  UIRequestEditNode() {
    const { isLoggedIn } = this.state;
    if (!isLoggedIn) return;
    this.LockNode(lockSuccess => {
      this.setState({ uIsLockedByDB: !lockSuccess }, () => {
        if (lockSuccess) this.UIEnableEditMode();
      });
    });
  }

  UIReplacementNodeIdUpdate(event) {
    const replacementNodeId = parseInt(event.target.value);
    let isValid = false;
    // Allow `` because we use a a blank field to indicate delete node without relinking edges.
    if (
      event.target.value === '' ||
      UDATA.AppState('NCDATA').nodes.find(node => {
        return node.id === replacementNodeId;
      })
    ) {
      isValid = true;
    }
    this.setState({
      uReplacementNodeId: replacementNodeId,
      uIsValidReplacementNodeID: isValid
    });
  }

  UIAddEdge(event) {
    event.preventDefault();
    UDATA.LocalCall('EDGE_CREATE', { nodeId: this.state.id }).then(edge => {
      // enable editing right away
      this.UIEditEdge(edge.id);
    });
  }

  UIEnableEditMode() {
    const { uSelectedTab, id, label, type, attributes, provenance } = this.state;
    // If user was on Edges tab while requesting edit (e.g. from Node Table), then
    // switch to Attributes tab first.
    const editableTab = uSelectedTab === TABS.EDGES ? TABS.ATTRIBUTES : uSelectedTab;
    const previousState = {
      label,
      type,
      attributes: Object.assign({}, attributes)
      // provenance: Object.assign({}, provenance) // uncomment after provenence is implemented
    };
    this.setState({
      uViewMode: NCUI.VIEWMODE.EDIT,
      uSelectedTab: editableTab,
      previousState
    });

    const node = {
      id,
      label,
      type,
      provenance
    };
    Object.keys(attributes).forEach(k => (node[k] = attributes[k]));
    Object.keys(provenance).forEach(k => (node[k] = provenance[k]));
    UNISYS.Log('edit node', id, label, JSON.stringify(node));
  }

  UICancelEditMode() {
    const { id, label, revision, previousState } = this.state;

    // if user is cancelling a newly created unsaved node, delete the node instead
    // Initial Node creation is rev 0, saving it for the first time bumps it to rev 1
    if (revision < 1) {
      this.UIDisableEditMode();
      this.DeleteNode();
      return;
    }

    // restore previous state
    this.setState(
      {
        label: previousState.label,
        type: previousState.type,
        attributes: previousState.attributes
        // provenance: previousState.provenance // uncomment after provenence is implemented
      },
      () => this.UIDisableEditMode()
    );
    UNISYS.Log('cancel edit node', id, label);
  }

  UIDisableEditMode() {
    this.UnlockNode(() => {
      this.setState({
        uViewMode: NCUI.VIEWMODE.VIEW
      });
      UDATA.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.NODE });
    });
  }
  UIInputUpdate(key, value) {
    if (BUILTIN_FIELDS_NODE.includes(key)) {
      const data = {};
      data[key] = value;
      this.setState(data);
    } else {
      const { attributes } = this.state;
      attributes[key] = value;
      this.setState({ attributes }, () => this.SetBackgroundColor());
    }
  }
  UIProvenanceInputUpdate(key, value) {
    if (BUILTIN_FIELDS_NODE.includes(key)) {
      const data = {};
      data[key] = value;
      this.setState(data);
    } else {
      const { provenance } = this.state;
      provenance[key] = value;
      this.setState({ provenance }, () => this.SetBackgroundColor());
    }
  }
  UILabelInputUpdate(key, value) {
    const data = {};
    data[key] = value;
    this.setState(data);
    this.UpdateMatchingList(value);
  }

  UIViewEdge(edgeId) {
    const { edges } = this.state;
    const edge = edges.find(e => e.id === Number(edgeId));
    this.setState({ selectedEdgeId: edgeId });
    UDATA.LocalCall('EDGE_OPEN', { edge });
  }

  UIEditEdge(edgeId) {
    const { edges } = this.state;
    const edge = edges.find(e => e.id === Number(edgeId));
    this.setState({ selectedEdgeId: edgeId });
    UDATA.LocalCall('EDGE_OPEN', { edge }).then(() =>
      UDATA.LocalCall('EDGE_EDIT', { edge })
    );
  }

  UICitationShow() {
    this.setState({ uShowCitationDialog: true });
  }
  UICitationClose() {
    this.setState({ uShowCitationDialog: false });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// RENDER METHODS
  RenderView() {
    const {
      uSelectedTab,
      uBackgroundColor,
      uEditBtnDisable,
      uEditBtnHide,
      uEditLockMessage,
      uHideDeleteNodeButton,
      uReplacementNodeId,
      uIsValidReplacementNodeID,
      uShowCitationDialog,
      id,
      label,
      type
    } = this.state;
    const TEMPLATE = UDATA.AppState('TEMPLATE');
    const defs = TEMPLATE.nodeDefs;
    const uShowCitationButton = TEMPLATE.citation && !TEMPLATE.citation.hidden;
    const bgcolor = uBackgroundColor + '44'; // hack opacity
    const citation =
      `NetCreate ${TEMPLATE.name} network, ` +
      `Node: "${label}" (ID ${id}). ` +
      (TEMPLATE.citation && TEMPLATE.citation.text
        ? `${TEMPLATE.citation.text}. `
        : '') +
      `Last accessed at ${NCUI.DateFormatted()}.`;
    const collection_ref = CMTMGR.GetNodeCREF(id);
    return (
      <div className="--NCNode_View nccomponent">
        <div className="view" style={{ background: bgcolor }}>
          {/* BUILT-IN - - - - - - - - - - - - - - - - - */}
          <div className="titlebar">
            <div className="nodenumber">NODE {id}</div>
            <div className="nodelabel">{NCUI.RenderLabel('label', label)}</div>
            <URCommentVBtn cref={collection_ref} />
            {/* using key resets with a new URComment <URCommentBtn cref={collection_ref} key={collection_ref} /> */}
          </div>
          {/* Special handling for `type` field */}
          {defs['type'] && !defs['type'].hidden && (
            <div className="formview typeview">
              {NCUI.RenderLabel('type', defs['type'].displayLabel, defs['type'].help)}
              {NCUI.RenderStringValue('type', type)}
            </div>
          )}
          {/* TABS - - - - - - - - - - - - - - - - - - - */}
          <div className="--NCNode_View_Tabs tabcontainer">
            {NCUI.RenderTabSelectors(TABS, this.state, this.UISelectTab)}
            <div className="tabview">
              {uSelectedTab === TABS.ATTRIBUTES &&
                NCUI.RenderAttributesTabView(this.state, defs)}
              {uSelectedTab === TABS.EDGES && this.RenderEdgesTab()}
              {uSelectedTab === TABS.PROVENANCE &&
                NCUI.RenderProvenanceTabView(this.state, defs)}
            </div>
          </div>
          {/* CONTROL BAR - - - - - - - - - - - - - - - - */}
          {!uEditBtnHide && uEditLockMessage && (
            <div className="message warning" style={{ marginTop: '1em' }}>
              <p>{uEditLockMessage}</p>
              <p hidden={!isAdmin}>
                <b>ADMINISTRATOR ONLY</b>: If you are absolutely sure this is an
                error, you can force the unlock.
                <button onClick={this.UIDisableEditMode} style={{ marginLeft: 0 }}>
                  Force Unlock
                </button>
              </p>
            </div>
          )}
          <div className="--NCNode_View_Controls controlbar">
            {uShowCitationButton && (
              <button
                id="citationbtn"
                className="citationbutton"
                onClick={this.UICitationShow}
              >
                Cite Node
              </button>
            )}
            <div style={{ flexGrow: 1 }}></div>
            {!uEditBtnHide && uSelectedTab !== TABS.EDGES && (
              <button
                id="editbtn"
                onClick={this.UIRequestEditNode}
                disabled={uEditBtnDisable}
              >
                Edit
              </button>
            )}
          </div>
          {isAdmin && !uEditBtnDisable && !uHideDeleteNodeButton && (
            <div className="controlbar deletenode">
              <div className="message">
                Re-link edges to this Node ID (leave blank to delete edge)
              </div>
              <div>
                <input
                  type="number"
                  id="replacementNodeID"
                  className={`deleteinput ${
                    uIsValidReplacementNodeID ? '' : 'invalid'
                  }`}
                  value={uReplacementNodeId || ''}
                  onChange={this.UIReplacementNodeIdUpdate}
                />
                {!uIsValidReplacementNodeID && (
                  <div className="message warning">Invalid Node ID!</div>
                )}
              </div>
              <button onClick={this.DeleteNode}>Delete</button>
            </div>
          )}
        </div>
        {uShowCitationDialog && (
          <NCDialogCitation message={citation} onClose={this.UICitationClose} />
        )}
      </div>
    );
  }

  RenderEdit() {
    const {
      uSelectedTab,
      uBackgroundColor,
      uShowMatchlist,
      matchingNodes,
      id,
      label,
      type
    } = this.state;
    const defs = UDATA.AppState('TEMPLATE').nodeDefs;
    const bgcolor = uBackgroundColor + '66'; // hack opacity
    const matchList = matchingNodes
      ? matchingNodes.map(n => (
          <div key={`${n.label}${n.id}`} value={n.id}>
            {n.label} <span className="id">#{n.id}</span>
          </div>
        ))
      : undefined;
    const isDuplicate = matchingNodes && matchingNodes.find(n => n.label === label);
    const duplicateWarning = UDATA.AppState('TEMPLATE').duplicateWarning;
    return (
      <div className="--NCNode_Edit">
        <div className="screen"></div>
        <div className="nccomponent">
          <div
            className="edit"
            style={{
              background: bgcolor,
              borderColor: uBackgroundColor
            }}
          >
            {/* BUILT-IN - - - - - - - - - - - - - - - - - */}
            <div className="nodelabel">
              {NCUI.RenderStringInput(
                'label',
                label,
                this.UILabelInputUpdate,
                '',
                () => this.setState({ uShowMatchlist: true }),
                () => this.setState({ uShowMatchlist: false })
              )}
              {uShowMatchlist && matchList && (
                <div className="matchlist">
                  {isDuplicate && <div className="warning">{duplicateWarning}</div>}
                  {matchList}
                </div>
              )}
              {isDuplicate && <div className="message">{duplicateWarning}</div>}
            </div>
            {/* Special handling for `type` field */}
            {defs['type'] && !defs['type'].hidden && (
              <div className="formview typeview">
                {NCUI.RenderLabel(
                  'type',
                  defs['type'].displayLabel,
                  defs['type'].help
                )}
                {NCUI.RenderOptionsInput(
                  'type',
                  type,
                  defs,
                  this.UIInputUpdate,
                  defs['type'].help
                )}
              </div>
            )}
            {/* TABS - - - - - - - - - - - - - - - - - - - */}
            <div className="tabcontainer">
              {NCUI.RenderTabSelectors(TABS, this.state, this.UISelectTab)}
              <div className="tabview">
                {uSelectedTab === TABS.ATTRIBUTES &&
                  NCUI.RenderAttributesTabEdit(this.state, defs, this.UIInputUpdate)}
                {uSelectedTab === TABS.EDGES && this.RenderEdgesTab()}
                {uSelectedTab === TABS.PROVENANCE &&
                  NCUI.RenderProvenanceTabEdit(
                    this.state,
                    defs,
                    this.UIProvenanceInputUpdate
                  )}
              </div>
            </div>
            {/* CONTROL BAR - - - - - - - - - - - - - - - - */}
            <div className="controlbar">
              <button className="cancelbtn" onClick={this.UICancelEditMode}>
                Cancel
              </button>
              <button onClick={this.SaveNode}>Save</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// RENDER HELPERS
  ///
  RenderEdgesTab() {
    const {
      uSelectedTab,
      selectedEdgeId,
      uEditBtnDisable,
      uEditBtnHide,
      id,
      label,
      edges
    } = this.state;
    const NCDATA = UDATA.AppState('NCDATA');
    const TEMPLATE = UDATA.AppState('TEMPLATE');
    const me = (
      <span style={{ color: 'rgba(0,0,0,0.2)', fontStyle: 'italic' }}>this node</span>
    );
    return (
      <div className="edges">
        {edges.map(e => {
          const sourceNode = NCDATA.nodes.find(n => n.id === e.source) || {
            label: EDGE_NOT_SET_LABEL
          };
          const targetNode = NCDATA.nodes.find(n => n.id === e.target) || {
            label: EDGE_NOT_SET_LABEL
          };
          const color = EDGEMGR.LookupEdgeColor(e, TEMPLATE);
          const bgcolor = color + '33'; // opacity hack
          if (e.id === selectedEdgeId) {
            return <NCEdge edgeId={e.id} parentNodeId={id} key={e.id} />;
          } else {
            return (
              <div key={e.id}>
                <button
                  className="edgebutton"
                  onClick={() => this.UIViewEdge(e.id)}
                  style={{ backgroundColor: bgcolor }}
                >
                  {id === e.source ? me : sourceNode.label}
                  &nbsp;<span title={e.type}>{ARROW_RIGHT}</span>&nbsp;
                  {id === e.target ? me : targetNode.label}
                </button>
              </div>
            );
          }
        })}
        {!uEditBtnHide && uSelectedTab === TABS.EDGES && (
          <button
            className="addedgebutton"
            onClick={this.UIAddEdge}
            disabled={uEditBtnDisable}
          >
            New Edge
          </button>
        )}
      </div>
    );
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// MAIN RENDER
  render() {
    const { id, uViewMode } = this.state;
    if (!id) return ''; // nothing selected
    if (uViewMode === NCUI.VIEWMODE.VIEW) {
      return this.RenderView();
    } else {
      return this.RenderEdit();
    }
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCNode;
