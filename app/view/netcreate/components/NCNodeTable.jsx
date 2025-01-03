/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

    NCNodeTable is used to to display a table of nodes for review.

    It displays NCDATA.
    But also checks FILTEREDNCDATA to show highlight/filtered state

    This is intended to be a generic table implementation that enables
    swapping in different table implementations.

    This is an abstraction of the original NodeTable component to make
    it easier to swap in custom table components.


  ## PROPS

    * tableHeight -- sets height based on InfoPanel dragger
    * isOpen -- whether the table is visible

  ## TO USE

    NCNodeTable is self contained and relies on global NCDATA to load.

      <NCNodeTable tableHeight isOpen/>


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const NCUI = require('../nc-ui');
const CMTMGR = require('../comment-mgr');
const FILTER = require('./filter/FilterEnums');
const { BUILTIN_FIELDS_NODE } = require('system/util/enum');
const UNISYS = require('unisys/client');
import HDATE from 'system/util/hdate';
import URCommentVBtn from './URCommentVBtn';
import URTable from './URTable';
const { ICON_PENCIL, ICON_VIEW } = require('system/util/constant');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
let UDATA = null;

/// UTILITY METHODS ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Comment Button ID based on cref
/// NOTE: This is different from the commenButtonID of URComentBtn,
/// which is simply `comment-button-${cref}` so that we can distinguish
/// clicks from the NCNodeTable from clicks from Node/Edges.
function u_GetButtonId(cref) {
  return `table-comment-button-${cref}`;
}

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class NCNodeTable extends UNISYS.Component {
  constructor(props) {
    super(props);

    const TEMPLATE = this.AppState('TEMPLATE');
    this.state = {
      nodeDefs: TEMPLATE.nodeDefs,
      nodes: [],
      selectedNodeId: undefined,
      hilitedNodeId: undefined,
      selectedNodeColor: TEMPLATE.sourceColor,
      hilitedNodeColor: TEMPLATE.searchColor,
      disableEdit: false,
      isLocked: false,
      isExpanded: true,
      dummy: 0, // used to force render update

      COLUMNDEFS: []
    };

    this.onUpdateCommentUI = this.onUpdateCommentUI.bind(this);
    this.onStateChange_SESSION = this.onStateChange_SESSION.bind(this);
    this.onStateChange_SELECTION = this.onStateChange_SELECTION.bind(this);
    this.onStateChange_HILITE = this.onStateChange_HILITE.bind(this);
    this.displayUpdated = this.displayUpdated.bind(this);
    this.deriveFilteredNodes = this.deriveFilteredNodes.bind(this);
    this.updateNodeFilterState = this.updateNodeFilterState.bind(this);
    this.urmsg_EDIT_PERMISSIONS_UPDATE =
      this.urmsg_EDIT_PERMISSIONS_UPDATE.bind(this);
    this.updateEditState = this.updateEditState.bind(this);
    this.onStateChange_NCDATA = this.onStateChange_NCDATA.bind(this);
    this.onStateChange_FILTEREDNCDATA = this.onStateChange_FILTEREDNCDATA.bind(this);
    this.onStateChange_TEMPLATE = this.onStateChange_TEMPLATE.bind(this);
    this.onViewButtonClick = this.onViewButtonClick.bind(this);
    this.onEditButtonClick = this.onEditButtonClick.bind(this);
    this.onToggleExpanded = this.onToggleExpanded.bind(this);
    this.onHighlightRow = this.onHighlightRow.bind(this);

    this.SetColumnDefs = this.SetColumnDefs.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    UDATA.HandleMessage(
      'EDIT_PERMISSIONS_UPDATE',
      this.urmsg_EDIT_PERMISSIONS_UPDATE
    );

    // SESSION is called by SessionSHell when the ID changes
    //  set system-wide. data: { classId, projId, hashedId, groupId, isValid }
    this.OnAppStateChange('SESSION', this.onStateChange_SESSION);

    // Always make sure class methods are bind()'d before using them
    // as a handler, otherwise object context is lost
    this.OnAppStateChange('NCDATA', this.onStateChange_NCDATA);

    // Track Filtered Data Updates too
    this.OnAppStateChange('FILTEREDNCDATA', this.onStateChange_FILTEREDNCDATA);

    // Handle Template updates
    this.OnAppStateChange('TEMPLATE', this.onStateChange_TEMPLATE);

    this.OnAppStateChange('SELECTION', this.onStateChange_SELECTION);
    this.OnAppStateChange('HILITE', this.onStateChange_HILITE);

    // Comment Message Handlers
    // Force update whenever threads are opened or closed
    UDATA.HandleMessage('CMT_COLLECTION_SHOW', this.onUpdateCommentUI);
    UDATA.HandleMessage('CMT_COLLECTION_HIDE', this.onUpdateCommentUI);
    UDATA.HandleMessage('CMT_COLLECTION_HIDE_ALL', this.onUpdateCommentUI);
  } // constructor

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  componentDidMount() {
    if (DBG) console.log('NodeTable.componentDidMount!');
    this.onStateChange_SESSION(this.AppState('SESSION'));

    // Explicitly retrieve data because we may not have gotten a NCDATA
    // update while we were hidden.
    let NCDATA = this.AppState('NCDATA');
    this.onStateChange_NCDATA(NCDATA);

    const COLUMNDEFS = this.SetColumnDefs();
    this.setState({ COLUMNDEFS });
  }

  componentWillUnmount() {
    UDATA.UnhandleMessage(
      'EDIT_PERMISSIONS_UPDATE',
      this.urmsg_EDIT_PERMISSIONS_UPDATE
    );
    this.AppStateChangeOff('SESSION', this.onStateChange_SESSION);
    this.AppStateChangeOff('NCDATA', this.onStateChange_NCDATA);
    this.AppStateChangeOff('FILTEREDNCDATA', this.onStateChange_FILTEREDNCDATA);
    this.AppStateChangeOff('TEMPLATE', this.onStateChange_TEMPLATE);
    this.AppStateChangeOff('SELECTION', this.onStateChange_SELECTION);
    this.AppStateChangeOff('HILITE', this.onStateChange_HILITE);
    UDATA.UnhandleMessage('CMT_COLLECTION_SHOW', this.onUpdateCommentUI);
    UDATA.UnhandleMessage('CMT_COLLECTION_HIDE', this.onUpdateCommentUI);
    UDATA.UnhandleMessage('CMT_COLLECTION_HIDE_ALL', this.onUpdateCommentUI);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Force update so that URCommentVBtn selection state is updated
  onUpdateCommentUI(data) {
    this.setState({ dummy: this.state.dummy + 1 });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  onStateChange_SELECTION(data) {
    if (data === undefined) return;

    const selectedNodeId = data.nodes.length > 0 ? data.nodes[0].id : undefined;
    if (selectedNodeId === this.state.selectedNodeId) {
      return;
    }
    this.setState({ selectedNodeId });
  }

  onStateChange_HILITE(data) {
    const { userHighlightNodeId, autosuggestHiliteNodeId } = data; // ignores `tableHiliteNodeId`
    let hilitedNodeId;
    if (autosuggestHiliteNodeId !== undefined)
      hilitedNodeId = autosuggestHiliteNodeId;
    if (userHighlightNodeId !== undefined) hilitedNodeId = userHighlightNodeId;
    if (hilitedNodeId === this.state.hilitedNodeId) {
      return;
    }
    this.setState({ hilitedNodeId });
  }

  /** Handle change in SESSION data
    Called both by componentWillMount() and AppStateChange handler.
    The 'SESSION' state change is triggered in two places in SessionShell during
    its handleChange() when active typing is occuring, and also during
    SessionShell.componentWillMount()
   */
  onStateChange_SESSION(decoded) {
    const isLocked = !decoded.isValid;
    if (isLocked === this.state.isLocked) {
      return;
    }
    this.setState({ isLocked });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  displayUpdated(nodeEdge) {
    // Prevent error if `meta` info is not defined yet, or not properly imported

    // this does not ever fire, revert!
    console.error('NodeTable meta not defined yet', nodeEdge);
    if (!nodeEdge.meta) {
      return '';
    }
    var d = new Date(
      nodeEdge.meta.revision > 0 ? nodeEdge.meta.updated : nodeEdge.meta.created
    );

    var year = String(d.getFullYear());
    var date = d.getMonth() + 1 + '/' + d.getDate() + '/' + year.substr(2, 4);
    var time = d.toTimeString().substr(0, 5);
    var dateTime = date + ' at ' + time;
    var titleString = 'v' + nodeEdge.meta.revision;
    if (nodeEdge._nlog)
      titleString += ' by ' + nodeEdge._nlog[nodeEdge._nlog.length - 1];
    var tag = <span title={titleString}> {dateTime} </span>;

    return tag;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Set node filtered status based on current filteredNodes
  deriveFilteredNodes(nodes) {
    // set filter status
    let filteredNodes = [];
    // If we're transitioning from "HILIGHT/FADE" to "COLLAPSE" or "FOCUS", then we
    // also need to remove nodes that are not in filteredNodes
    const FILTERDEFS = UDATA.AppState('FILTERDEFS');
    if (
      FILTERDEFS.filterAction === FILTER.ACTION.REDUCE ||
      FILTERDEFS.filterAction === FILTER.ACTION.FOCUS
    ) {
      // Reduce (remove) or Focus
      filteredNodes = nodes.filter(node => {
        const filteredNode = filteredNodes.find(n => n.id === node.id);
        return filteredNode; // keep if it's in the list of filtered nodes
      });
    } else {
      // Fade
      // Fading is handled by setting node.filteredTransparency which is
      // directly handled by the filter now.  So no need to process it
      // here in the table.
      filteredNodes = nodes;
    }
    // }
    return filteredNodes;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Set node filtered status based on current filteredNodes
  updateNodeFilterState(nodes) {
    const filteredNodes = this.deriveFilteredNodes(nodes);
    this.setState({ nodes: filteredNodes });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Hide/Show "View" and "Edit" buttons in table based on template edit state
  urmsg_EDIT_PERMISSIONS_UPDATE() {
    // Update COLUMNDEFS after permissions update so disabledState is shown
    const cb = () => {
      // Update COLUMNDEFS to update buttons
      const COLUMNDEFS = this.SetColumnDefs();
      this.setState({ COLUMNDEFS });
    };
    this.updateEditState(cb);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Disable edit if someone else is editing a template
  updateEditState(cb) {
    let disableEdit = false;
    UDATA.NetCall('SRV_GET_EDIT_STATUS').then(data => {
      // someone else might be editing a template or importing or editing node or edge
      disableEdit = data.templateBeingEdited || data.importActive;
      // REVIEW: Only disableEdit if template is being updated, otherwise allow edits
      // || data.nodeOrEdgeBeingEdited ||
      // REVIEW: commentBeingEditedByMe shouldn't affect table?
      // data.commentBeingEditedByMe; // only lock out if this user is the one editing comments, allow network commen edits

      // optimize, skip render if no change
      if (disableEdit === this.state.disableEdit) {
        return;
      }

      this.setState({ disableEdit }, () => {
        if (typeof cb === 'function') cb();
      });
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle updated SELECTION
   */
  onStateChange_NCDATA(data) {
    if (DBG) console.log('handle data update');
    if (data.nodes) {
      const filteredNodes = this.deriveFilteredNodes(data.nodes);
      // REVIEW DO SOMETHING.  SELECTION update is not currently being handled.
    }
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  onStateChange_FILTEREDNCDATA(data) {
    if (data.nodes) {
      // If we're transitioning from "COLLAPSE" or "FOCUS" to "HILIGHT/FADE", then we
      // also need to add back in nodes that are not in filteredNodes
      // (because "COLLAPSE" and "FOCUS" removes nodes that are not matched)
      const NCDATA = UDATA.AppState('NCDATA');
      const FILTERDEFS = UDATA.AppState('FILTERDEFS');
      if (FILTERDEFS.filterAction === FILTER.ACTION.FADE) {
        // show ALL nodes
        this.updateNodeFilterState(NCDATA.nodes);
      } else {
        // show only filtered nodes from the filter update
        this.updateNodeFilterState(data.nodes);
      }
    }
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  onStateChange_TEMPLATE(data) {
    const COLUMNDEFS = this.SetColumnDefs(data.nodeDefs);
    this.setState({
      nodeDefs: data.nodeDefs,
      selectedNodeColor: data.sourceColor,
      hilitedNodeColor: data.searchColor,
      COLUMNDEFS
    });
  }

  /// UI EVENT HANDLERS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onViewButtonClick(event, nodeId) {
    event.preventDefault();
    event.stopPropagation();
    let nodeID = parseInt(nodeId);
    UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [nodeID] });
  }
  /**
   */
  onEditButtonClick(event, nodeId) {
    event.preventDefault();
    event.stopPropagation();
    let nodeID = parseInt(nodeId);
    UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [nodeID] }).then(() => {
      if (DBG) console.error('NodeTable: Calling NODE_EDIT', nodeID);
      UDATA.LocalCall('NODE_EDIT', { nodeID: nodeID });
    });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onToggleExpanded(event) {
    this.setState({
      isExpanded: !this.state.isExpanded
    });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onHighlightRow(nodeId) {
    UDATA.LocalCall('TABLE_HILITE_NODE', { nodeId });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  selectNode(id, event) {
    event.preventDefault();

    // REVIEW: For some reason React converts the integer IDs into string
    // values when returned in event.target.value.  So we have to convert
    // it here.
    // Load Source
    UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [parseInt(id)] });
  }

  /// URTABLE COLUMN DEFS /////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  SetColumnDefs(incomingNodeDefs) {
    const { nodeDefs, disableEdit, isLocked } = this.state;

    const defs = incomingNodeDefs || nodeDefs;

    // Only include built in fields
    // Only include non-hidden fields
    const attributeDefs = Object.keys(defs).filter(
      k => !BUILTIN_FIELDS_NODE.includes(k) && !defs[k].hidden
    );

    /// CLICK HANDLERS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function ui_ClickViewNode(event, nodeId) {
      event.preventDefault();
      event.stopPropagation();
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [parseInt(nodeId)] });
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function ui_ClickEditNode(event, nodeId) {
      event.preventDefault();
      event.stopPropagation();
      const nodeID = parseInt(nodeId);
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [nodeID] }).then(() => {
        if (DBG) console.error('NodeTable: Calling NODE_EDIT', nodeID);
        UDATA.LocalCall('NODE_EDIT', { nodeID: nodeID });
      });
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function ui_ClickCommentBtn(cref) {
      const position = CMTMGR.GetCommentThreadPosition(u_GetButtonId(cref));
      const uiref = u_GetButtonId(cref);
      CMTMGR.ToggleCommentCollection(uiref, cref, position);
    }
    /// RENDERERS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function RenderViewOrEdit(key, tdata, coldef) {
      const value = tdata[key];
      return (
        <div>
          {!disableEdit && (
            <button
              className="outline"
              onClick={event => ui_ClickViewNode(event, value)}
            >
              {ICON_VIEW}
            </button>
          )}
          {!disableEdit && !isLocked && (
            <button
              className="outline"
              onClick={event => ui_ClickEditNode(event, value)}
            >
              {ICON_PENCIL}
            </button>
          )}
        </div>
      );
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // interface TTblNodeObject {
    //   id: String;
    //   label: String;
    // }
    function RenderNode(key, tdata, coldef) {
      const value = tdata[key];
      if (!value) return; // skip if not defined yet
      if (tdata.id === undefined)
        throw new Error(`RenderNode: id is undefined. tdata=${tdata}`);
      if (value === undefined)
        throw new Error(`RenderNode: label is undefined. value=${value}`);
      return (
        <button
          className="outline"
          onClick={event => ui_ClickViewNode(event, tdata.id)}
        >
          <span style={{ color: 'blue' }}>{value}</span>
        </button>
      );
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function RenderCommentBtn(key, tdata, coldef) {
      const value = tdata[key];
      return (
        <URCommentVBtn cref={value.cref} />
      );
    }
    /// CUSTOM SORTERS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// tdata = TTblNodeObject[] = { id: String, label: String }
    function SortNodes(key, tdata, order) {
      const sortedData = [...tdata].sort((a, b) => {
        if (a[key].label < b[key].label) return order;
        if (a[key].label > b[key].label) return order * -1;
        return 0;
      });
      return sortedData;
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function SortCommentsByCount(key, tdata, order) {
      const sortedData = [...tdata].sort((a, b) => {
        if (a[key].count < b[key].count) return order;
        if (a[key].count > b[key].count) return order * -1;
        return 0;
      });
      return sortedData;
    }
    /// COLUMN DEFINITIONS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    // column definitions for custom attributes
    // (built in columns are: view, degrees, label)
    const ATTRIBUTE_COLUMNDEFS = attributeDefs.map(key => {
      const title = defs[key].displayLabel;
      const type = defs[key].type;
      return {
        title,
        type,
        data: key
      };
    });
    const COLUMNDEFS = [
      {
        title: '', // View/Edit
        data: 'id',
        type: 'number',
        width: 45, // in px
        renderer: RenderViewOrEdit,
        sortDisabled: true
      },
      {
        title: defs['degrees'].displayLabel,
        type: 'number',
        width: 50, // in px
        data: 'degrees'
      },
      {
        title: defs['label'].displayLabel,
        data: 'label',
        width: 300, // in px
        renderer: RenderNode
      }
    ];
    if (defs['type'] && !defs['type'].hidden) {
      COLUMNDEFS.push({
        title: defs['type'].displayLabel,
        type: 'text-case-insensitive',
        width: 130, // in px
        data: 'type'
      });
    }
    COLUMNDEFS.push(...ATTRIBUTE_COLUMNDEFS, {
      title: 'Comments',
      data: 'commentVBtnDef',
      width: 50, // in px
      renderer: RenderCommentBtn,
      sorter: SortCommentsByCount
    });
    return COLUMNDEFS;
  }

  /// REACT LIFECYCLE METHODS /////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  render() {
    const {
      nodes,
      nodeDefs,
      selectedNodeId,
      hilitedNodeId,
      selectedNodeColor,
      hilitedNodeColor,
      disableEdit,
      isLocked,
      COLUMNDEFS
    } = this.state;
    if (nodes === undefined) return '';
    const { isOpen, tableHeight } = this.props;

    // skip rendering if COLUMNDEFS is not defined yet
    // This ensures that URTable is inited only AFTER data has been loaded.
    if (COLUMNDEFS.length < 1) return '';

    const uid = CMTMGR.GetCurrentUserId();

    const attributeDefs = Object.keys(nodeDefs).filter(
      k => !BUILTIN_FIELDS_NODE.includes(k) && !nodeDefs[k].hidden
    );

    /// TABLE DATA GENERATION
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    const TABLEDATA = nodes.map((node, i) => {
      const { id, label, type, degrees } = node;

      const sourceDef = { id, label };

      // custom attributes
      const attributes = {};
      attributeDefs.forEach((key, i) => {
        let data = {};
        if (nodeDefs[key].type === 'markdown') {
          // for markdown:
          // a. provide the raw markdown string
          // b. provide the HTML string
          data.html = NCUI.Markdownify(node[key]);
          data.raw = node[key];
        } else if (nodeDefs[key].type === 'hdate')
          data = node[key] && node[key].formattedDateString;
        else data = node[key];
        attributes[key] = data;
      });

      // comment button definition
      const cref = CMTMGR.GetNodeCREF(id);
      const commentCount = CMTMGR.GetCommentCollectionCount(cref);
      const ccol = CMTMGR.GetCommentCollection(cref) || {};
      const hasUnreadComments = ccol.hasUnreadComments;
      const selected = CMTMGR.GetOpenComments(cref);
      const commentVBtnDef = {
        cref,
        count: commentCount,
        hasUnreadComments,
        selected
      };

      return {
        id,
        label,
        type,
        degrees,
        ...attributes,
        commentVBtnDef,
        meta: {
          filteredTransparency: node.filteredTransparency
        }
      };
    });

    return (
      <div className="NCNodeTable" style={{ height: tableHeight }}>
        <URTable isOpen={isOpen} data={TABLEDATA} columns={COLUMNDEFS} />
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCNodeTable;
