/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

    EdgeTable is used to to display a table of edges for review.

    It displays NCDATA.
    But also read FILTEREDNCDATA to show highlight/filtered state


  ## PROPS

    * tableHeight -- sets height based on InfoPanel dragger
    * isOpen -- whether the table is visible


  ## TO USE

    EdgeTable is self contained and relies on global NCDATA to load.

      <EdgeTable tableHeight isOpen />


    Set `DBG` to true to show the `ID` column.

  ## 2018-12-07 Update

    Since we're not using tab navigation:
    1. The table isExpanded is now true by default.
    2. The "Show/Hide Table" button is hidden.

    Reset these to restore previous behavior.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const NCUI = require('../nc-ui');
const CMTMGR = require('../comment-mgr');
const SETTINGS = require('settings');
const FILTER = require('./filter/FilterEnums');
const UNISYS = require('unisys/client');
import HDATE from 'system/util/hdate';
import URCommentVBtn from './URCommentVBtn';
import URTable from './URTable';
const { BUILTIN_FIELDS_EDGE } = require('system/util/enum');
const { ICON_PENCIL, ICON_VIEW } = require('system/util/constant');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const isAdmin = SETTINGS.IsAdmin();
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var UDATA = null;

/// UTILITY METHODS ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function u_GetButtonId(cref) {
  return `table-comment-button-${cref}`;
}

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class NCEdgeTable extends UNISYS.Component {
  constructor(props) {
    super(props);

    const TEMPLATE = this.AppState('TEMPLATE');
    this.state = {
      edgeDefs: TEMPLATE.edgeDefs,
      edges: [],
      selectedEdgeId: undefined,
      selectedEdgeColor: TEMPLATE.sourceColor,
      filteredEdges: [],
      nodes: [], // needed for dereferencing source/target
      disableEdit: false,
      isLocked: false,
      isExpanded: true,
      sortkey: 'Relationship',
      dummy: 0, // used to force render update

      COLUMNDEFS: []
    };

    this.onUpdateCommentUI = this.onUpdateCommentUI.bind(this);
    this.onStateChange_SESSION = this.onStateChange_SESSION.bind(this);
    this.onStateChange_SELECTION = this.onStateChange_SELECTION.bind(this);
    this.onEDGE_OPEN = this.onEDGE_OPEN.bind(this);
    this.updateEdgeFilterState = this.updateEdgeFilterState.bind(this);
    this.handleDataUpdate = this.handleDataUpdate.bind(this);
    this.handleFilterDataUpdate = this.handleFilterDataUpdate.bind(this);
    this.updateEditState = this.updateEditState.bind(this);
    this.OnTemplateUpdate = this.OnTemplateUpdate.bind(this);
    this.onViewButtonClick = this.onViewButtonClick.bind(this);
    this.onEditButtonClick = this.onEditButtonClick.bind(this);
    this.onToggleExpanded = this.onToggleExpanded.bind(this);
    this.onHighlightNode = this.onHighlightNode.bind(this);
    this.m_FindMatchingObjsByProp = this.m_FindMatchingObjsByProp.bind(this);
    this.m_FindMatchingEdgeByProp = this.m_FindMatchingEdgeByProp.bind(this);
    this.m_FindEdgeById = this.m_FindEdgeById.bind(this);
    this.lookupNodeLabel = this.lookupNodeLabel.bind(this);

    this.SetColumnDefs = this.SetColumnDefs.bind(this);

    this.sortDirection = 1;

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    UDATA.HandleMessage('EDGE_OPEN', this.onEDGE_OPEN);
    UDATA.HandleMessage('EDIT_PERMISSIONS_UPDATE', this.updateEditState);

    // SESSION is called by SessionSHell when the ID changes
    //  set system-wide. data: { classId, projId, hashedId, groupId, isValid }
    this.OnAppStateChange('SESSION', this.onStateChange_SESSION);

    // Always make sure class methods are bind()'d before using them
    // as a handler, otherwise object context is lost
    this.OnAppStateChange('NCDATA', this.handleDataUpdate);

    // Handle Template updates
    this.OnAppStateChange('TEMPLATE', this.OnTemplateUpdate);

    // Track Filtered Data Updates too
    this.OnAppStateChange('FILTEREDNCDATA', this.handleFilterDataUpdate);

    this.OnAppStateChange('SELECTION', this.onStateChange_SELECTION);

    // Comment Message Handlers
    // Force update whenever threads are opened or closed
    UDATA.HandleMessage('CTHREADMGR_THREAD_OPENED', this.onUpdateCommentUI);
    UDATA.HandleMessage('CTHREADMGR_THREAD_CLOSED', this.onUpdateCommentUI);
    UDATA.HandleMessage('CTHREADMGR_THREAD_CLOSED_ALL', this.onUpdateCommentUI);
  } // constructor

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  componentDidMount() {
    if (DBG) console.log('EdgeTable.componentDidMount!');

    this.onStateChange_SESSION(this.AppState('SESSION'));

    // Explicitly retrieve data because we may not have gotten a NCDATA
    // update while we were hidden.
    // filtered data needs to be set before D3Data
    const FILTEREDNCDATA = UDATA.AppState('FILTEREDNCDATA');
    this.setState({ filteredEdges: FILTEREDNCDATA.edges }, () => {
      let NCDATA = this.AppState('NCDATA');
      this.handleDataUpdate(NCDATA);
      this.SetColumnDefs();
    });

    // Request edit state too because the update may have come
    // while we were hidden
    this.updateEditState();
  }

  componentWillUnmount() {
    UDATA.UnhandleMessage('EDGE_OPEN', this.onEDGE_OPEN);
    UDATA.UnhandleMessage('EDIT_PERMISSIONS_UPDATE', this.updateEditState);
    this.AppStateChangeOff('SESSION', this.onStateChange_SESSION);
    this.AppStateChangeOff('NCDATA', this.handleDataUpdate);
    this.AppStateChangeOff('FILTEREDNCDATA', this.handleFilterDataUpdate);
    this.AppStateChangeOff('TEMPLATE', this.OnTemplateUpdate);
    this.AppStateChangeOff('SELECTION', this.onStateChange_SELECTION);
    UDATA.UnhandleMessage('CTHREADMGR_THREAD_OPENED', this.onUpdateCommentUI);
    UDATA.UnhandleMessage('CTHREADMGR_THREAD_CLOSED', this.onUpdateCommentUI);
    UDATA.UnhandleMessage('CTHREADMGR_THREAD_CLOSED_ALL', this.onUpdateCommentUI);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Force update so that URCommentVBtn selection state is updated
  onUpdateCommentUI(data) {
    this.setState({ dummy: this.state.dummy + 1 });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  onStateChange_SELECTION(data) {
    this.setState({
      selectedEdgeId: data.edges.length > 0 ? data.edges[0].id : undefined
    });
  }
  /** Handle change in SESSION data
    Called both by componentWillMount() and AppStateChange handler.
    The 'SESSION' state change is triggered in two places in SessionShell during
    its handleChange() when active typing is occuring, and also during
    SessionShell.componentWillMount()
   */
  onStateChange_SESSION(decoded) {
    this.setState({ isLocked: !decoded.isValid });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  displayUpdated(nodeEdge) {
    // Prevent error if `meta` info is not defined yet, or not properly imported
    if (!nodeEdge.meta) return '';

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
  /// User selected edge usu by clicking NCNode's edge item in Edges tab
  onEDGE_OPEN(data) {
    this.setState({ selectedEdgeId: data.edge.id });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Set edge filtered status based on current filteredNodes
  updateEdgeFilterState(edges, filteredEdges) {
    // add highlight/filter status
    if (filteredEdges.length > 0) {
      // If we're transitioning from "HILIGHT/FADE" to "COLLAPSE" or "FOCUS", then we
      // also need to remove edges that are not in filteredEdges
      const FILTERDEFS = UDATA.AppState('FILTERDEFS');
      if (
        FILTERDEFS.filterAction === FILTER.ACTION.REDUCE ||
        FILTERDEFS.filterAction === FILTER.ACTION.FOCUS
      ) {
        // Reduce (remove) or Focus
        edges = edges.filter(edge => {
          const filteredEdge = filteredEdges.find(e => e.id === edge.id);
          return filteredEdge; // keep if it's in the list of filtered edges
        });
      } else {
        // Fade
        // Fading is handled by setting node.filteredTransparency which is
        // directly handled by the filter now.  So no need to process it
        // here in the table.
      }
    }
    this.setState({ edges });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle updated SELECTION: NCDATA updates
   */
  handleDataUpdate(data) {
    if (data && data.edges && data.nodes) {
      // NCDATA.edges no longer uses source/target objects
      // ...1. So we need to save nodes for dereferencing.
      this.setState({ nodes: data.nodes }, () => {
        // ...2. So we stuff 'sourceLabel' and 'targetLabel' into the local edges array
        let edges = data.edges.map(e => {
          e.sourceLabel = this.lookupNodeLabel(e.source); // requires `state.nodes` be set
          e.targetLabel = this.lookupNodeLabel(e.target);
          return e;
        });
        this.setState({ edges });
        const { filteredEdges } = this.state;
        this.updateEdgeFilterState(edges, filteredEdges);
      });
    }
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Handle FILTEREDNCDATA updates sent by filters-logic.m_FiltersApply
      Note that edge.soourceLabel and edge.targetLabel should already be set
      by filter-mgr.
   */
  handleFilterDataUpdate(data) {
    if (data.edges) {
      const filteredEdges = data.edges;
      // If we're transitioning from "COLLAPSE" or "FOCUS" to "HILIGHT/FADE", then we
      // also need to add back in edges that are not in filteredEdges
      // (because "COLLAPSE" and "FOCUS" removes edges that are not matched)
      const FILTERDEFS = UDATA.AppState('FILTERDEFS');
      if (FILTERDEFS.filterAction === FILTER.ACTION.FADE) {
        const NCDATA = UDATA.AppState('NCDATA');
        this.setState(
          {
            edges: NCDATA.edges,
            filteredEdges
          },
          () => {
            const edges = NCDATA.edges;
            this.updateEdgeFilterState(edges, filteredEdges);
          }
        );
      } else {
        this.setState(
          {
            edges: filteredEdges,
            filteredEdges
          },
          () => {
            const edges = filteredEdges;
            this.updateEdgeFilterState(edges, filteredEdges);
          }
        );
      }
    }
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  updateEditState() {
    // disable edit if someone else is editing a template, node, or edge
    let disableEdit = false;
    UDATA.NetCall('SRV_GET_EDIT_STATUS').then(data => {
      // someone else might be editing a template or importing or editing node or edge
      disableEdit =
        data.templateBeingEdited ||
        data.importActive ||
        data.nodeOrEdgeBeingEdited ||
        data.commentBeingEditedByMe; // only lock out if this user is the one editing comments, allow network commen edits
      this.setState({ disableEdit });
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  OnTemplateUpdate(data) {
    this.setState({
      edgeDefs: data.edgeDefs,
      selectedEdgeColor: data.sourceColor
    });
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Look up the Node label for source / target ids
   */
  lookupNodeLabel(nodeId) {
    const node = this.state.nodes.find(n => n.id === nodeId);
    if (node === undefined) return '...';
    // if (node === undefined) throw new Error('EdgeTable: Could not find node', nodeId);
    return node.label;
  }

  /// UI EVENT HANDLERS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onViewButtonClick(event, edgeId) {
    event.preventDefault();
    event.stopPropagation();
    let edgeID = parseInt(edgeId);
    let edge = this.m_FindEdgeById(edgeID);
    if (DBG) console.log('EdgeTable: Edge id', edge.id, 'selected for viewing');
    // Load Source Node then Edge
    UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [edge.source] }).then(() => {
      UDATA.LocalCall('EDGE_SELECT', { edgeId: edge.id });
    });
  }
  onEditButtonClick(event, edgeId) {
    event.preventDefault();
    event.stopPropagation();
    let edgeID = parseInt(edgeId);
    let edge = this.m_FindEdgeById(edgeID);
    if (DBG) console.log('EdgeTable: Edge id', edge.id, 'selected for editing');
    // Load Source Node then Edge
    UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [edge.source] }).then(() => {
      UDATA.LocalCall('EDGE_SELECT_AND_EDIT', { edgeId: edge.id });
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
  /*/
  onHighlightNode(nodeId) {
    UDATA.LocalCall('TABLE_HILITE_NODE', { nodeId });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /*/
   */
  setSortKey(key, type) {
    if (key === this.state.sortkey) this.sortDirection = -1 * this.sortDirection;
    // if this was already the key, flip the direction
    else this.sortDirection = 1;

    const edges = this.sortTable(key, this.state.edges, type);
    this.setState({
      edges,
      sortkey: key
    });
    UNISYS.Log('sort edge table', key, this.sortDirection);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  selectNode(id, event) {
    event.preventDefault();

    // Load Source
    if (DBG) console.log('EdgeTable: Edge id', id, 'selected for editing');
    UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [id] });
  }

  /// URTABLE COLUMN DEFS /////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  SetColumnDefs() {
    const { edges, edgeDefs, disableEdit, isLocked } = this.state;
    let attributeDefs = Object.keys(edgeDefs).filter(
      k => !BUILTIN_FIELDS_EDGE.includes(k)
    );

    /// CLICK HANDLERS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function ui_ClickViewEdge(event, value) {
      event.preventDefault();
      event.stopPropagation();
      const { edgeId, sourceId } = value;
      // Load Source Node then Edge
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [sourceId] }).then(() => {
        UDATA.LocalCall('EDGE_SELECT', { edgeId });
      });
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function ui_ClickEditEdge(event, value) {
      event.preventDefault();
      event.stopPropagation();
      const { edgeId, sourceId } = value;
      // Load Source Node then Edge
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [sourceId] }).then(() => {
        UDATA.LocalCall('EDGE_SELECT_AND_EDIT', { edgeId });
      });
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function ui_ClickViewNode(event, nodeId) {
      event.preventDefault();
      event.stopPropagation();
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [parseInt(nodeId)] });
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// Toggle Comment Button on and off
    function ui_ClickComment(cref) {
      const position = CMTMGR.GetCommentThreadPosition(u_GetButtonId(cref));
      const uiref = u_GetButtonId(cref);
      CMTMGR.ToggleCommentCollection(uiref, cref, position);
    }
    /// RENDERERS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function RenderViewOrEdit(value) {
      return (
        <div>
          {!disableEdit && (
            <button
              className="outline"
              onClick={event => ui_ClickViewEdge(event, value)}
            >
              {ICON_VIEW}
            </button>
          )}
          {!disableEdit && !isLocked && (
            <button
              className="outline"
              onClick={event => ui_ClickEditEdge(event, value)}
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
    function RenderNode(value) {
      if (!value) return; // skip if not defined yet
      if (value.id === undefined || value.label === undefined) {
        // During Edge creation, source/target may not be defined yet
        return <span style={{ color: 'red' }}>...</span>;
      }
      return (
        <button
          className="outline"
          onClick={event => ui_ClickViewNode(event, value.id)}
        >
          <span style={{ color: 'blue' }}>{value.label}</span>
        </button>
      );
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function RenderCommentBtn(value) {
      return (
        <URCommentVBtn
          uiref={u_GetButtonId(value.cref)}
          count={value.count}
          hasUnreadComments={value.hasUnreadComments}
          selected={value.selected}
          cb={e => ui_ClickComment(value.cref)}
        />
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
      let title = String(key);
      title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
      let type = edgeDefs[key].type;
      return {
        title,
        type,
        data: key
      };
    });
    const COLUMNDEFS = [
      {
        title: '-', // View/Edit
        data: 'id',
        type: 'number',
        width: 50, // in px
        renderer: RenderViewOrEdit
      },
      {
        title: 'Source',
        width: 130, // in px
        data: 'sourceDef',
        renderer: RenderNode,
        sorter: SortNodes
      },
      {
        title: 'Type',
        type: 'text',
        width: 130, // in px
        data: 'type'
      },
      {
        title: 'Target',
        width: 130, // in px
        data: 'targetDef',
        renderer: RenderNode,
        sorter: SortNodes
      },
      ...ATTRIBUTE_COLUMNDEFS,
      {
        title: 'Comments',
        data: 'commentVBtnDef',
        type: 'text',
        width: 50, // in px
        renderer: RenderCommentBtn,
        sorter: SortCommentsByCount
      }
    ];
    23;

    this.setState({ COLUMNDEFS });
  }

  /// OBJECT HELPERS ////////////////////////////////////////////////////////////
  /// these probably should go into a utility class
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Return array of objects that match the match_me object keys/values
    NOTE: make sure that strings are compared with strings, etc
   */
  m_FindMatchingObjsByProp(obj_list, match_me = {}) {
    // operate on arrays only
    if (!Array.isArray(obj_list))
      throw Error('FindMatchingObjectsByProp arg1 must be array');
    let matches = obj_list.filter(obj => {
      let pass = true;
      for (let key in match_me) {
        if (match_me[key] !== obj[key]) pass = false;
        break;
      }
      return pass;
    });
    // return array of matches (can be empty array)
    return matches;
  }

  /// EDGE HELPERS //////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Return array of nodes that match the match_me object keys/values
    NOTE: make sure that strings are compared with strings, etc
   */
  m_FindMatchingEdgeByProp(match_me = {}) {
    return this.m_FindMatchingObjsByProp(this.state.edges, match_me);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** Convenience function to retrieve edge by ID
   */
  m_FindEdgeById(id) {
    return this.m_FindMatchingEdgeByProp({ id })[0];
  }

  /// REACT LIFECYCLE METHODS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** This is not yet implemented as of React 16.2.  It's implemented in 16.3.
      getDerivedStateFromProps (props, state) {
        console.error('getDerivedStateFromProps!!!');
      }
   */
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  render() {
    const { edges, edgeDefs, disableEdit, isLocked, COLUMNDEFS } = this.state;
    const { isOpen, tableHeight } = this.props;
    const uid = CMTMGR.GetCurrentUserId();

    // Only include built in fields
    // Only include non-hidden fields
    let attributeDefs = Object.keys(edgeDefs).filter(
      k => !BUILTIN_FIELDS_EDGE.includes(k) && !edgeDefs[k].hidden
    );

    // show 'type' between 'source' and 'target' if `type` has been defined
    // if it isn't defined, just show attribute fields after `source` and 'target`
    const hasTypeField = edgeDefs['type'];
    if (hasTypeField) attributeDefs = attributeDefs.filter(a => a !== 'type');

    /// TABLE DATA GENERATION
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    const TABLEDATA = edges.map((edge, i) => {
      const { id, source, target, sourceLabel, targetLabel, type } = edge;

      const sourceDef = { id: source, label: sourceLabel };
      const targetDef = { id: target, label: targetLabel };

      // custom attributes
      const attributes = {};
      attributeDefs.forEach((key, i) => {
        let data = {};
        if (edgeDefs[key].type === 'markdown') {
          // for markdown:
          // a. provide the raw markdown string
          // b. provide the HTML string
          data.html = NCUI.Markdownify(edge[key]);
          data.raw = edge[key];
        } else if (edgeDefs[key].type === 'hdate')
          data = edge[key] && edge[key].formattedDateString;
        else data = edge[key];
        attributes[key] = data;
      });

      // comment button definition
      const cref = CMTMGR.GetNodeCREF(id);
      const commentCount = CMTMGR.GetThreadedViewObjectsCount(cref, uid);
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
        id: { edgeId: id, sourceId: source }, // { edgeId, sourceId} for click handler
        sourceDef, // { id: String, label: String }
        targetDef, // { id: String, label: String }
        type,
        ...attributes,
        commentVBtnDef,
        meta: {
          filteredTransparency: edge.filteredTransparency
        }
      };
    });
    return (
      <div className="NCEdgeTable" style={{ height: tableHeight }}>
        <URTable isOpen={isOpen} data={TABLEDATA} columns={COLUMNDEFS} />
      </div>
    );
  }
} // class EdgeTable

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCEdgeTable;
