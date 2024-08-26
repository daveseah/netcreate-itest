/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

    NCNodeTable is used to to display a table of nodes for review.

    It displays NCDATA.
    But also checks FILTEREDNCDATA to show highlight/filtered state

    This is intended to be a generic table implementation that enables
    swapping in different table implementations.

    This is an abstraction of the original NodeTable component to make
    it easier to swap in custom table components.


  ## TO USE

    NCNodeTable is self contained and relies on global NCDATA to load.

      <NCNodeTable/>


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const NCUI = require('../nc-ui');
const CMTMGR = require('../comment-mgr');
const SETTINGS = require('settings');
const FILTER = require('./filter/FilterEnums');
const { BUILTIN_FIELDS_NODE } = require('system/util/enum');
const UNISYS = require('unisys/client');
import HDATE from 'system/util/hdate';
import URTable from './URTable';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const isLocalHost =
  SETTINGS.EJSProp('client').ip === '127.0.0.1' ||
  location.href.includes('admin=true');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var UDATA = null;

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
      filteredNodes: [],
      disableEdit: false,
      isLocked: false,
      isExpanded: true,
      sortkey: 'label'
    };

    this.onStateChange_SESSION = this.onStateChange_SESSION.bind(this);
    this.onStateChange_SELECTION = this.onStateChange_SELECTION.bind(this);
    this.onStateChange_HILITE = this.onStateChange_HILITE.bind(this);
    this.displayUpdated = this.displayUpdated.bind(this);
    this.updateNodeFilterState = this.updateNodeFilterState.bind(this);
    this.updateEditState = this.updateEditState.bind(this);
    this.handleDataUpdate = this.handleDataUpdate.bind(this);
    this.handleFilterDataUpdate = this.handleFilterDataUpdate.bind(this);
    this.OnTemplateUpdate = this.OnTemplateUpdate.bind(this);
    this.onViewButtonClick = this.onViewButtonClick.bind(this);
    this.onEditButtonClick = this.onEditButtonClick.bind(this);
    this.onToggleExpanded = this.onToggleExpanded.bind(this);
    this.onHighlightRow = this.onHighlightRow.bind(this);

    this.sortDirection = 1; // alphabetical A-Z

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    UDATA.HandleMessage('EDIT_PERMISSIONS_UPDATE', this.updateEditState);

    // SESSION is called by SessionSHell when the ID changes
    //  set system-wide. data: { classId, projId, hashedId, groupId, isValid }
    this.OnAppStateChange('SESSION', this.onStateChange_SESSION);

    // Always make sure class methods are bind()'d before using them
    // as a handler, otherwise object context is lost
    this.OnAppStateChange('NCDATA', this.handleDataUpdate);

    // Track Filtered Data Updates too
    this.OnAppStateChange('FILTEREDNCDATA', this.handleFilterDataUpdate);

    // Handle Template updates
    this.OnAppStateChange('TEMPLATE', this.OnTemplateUpdate);

    this.OnAppStateChange('SELECTION', this.onStateChange_SELECTION);
    this.OnAppStateChange('HILITE', this.onStateChange_HILITE);
  } // constructor

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  componentDidMount() {
    if (DBG) console.error('NodeTable.componentDidMount!');

    this.onStateChange_SESSION(this.AppState('SESSION'));

    // Explicitly retrieve data because we may not have gotten a NCDATA
    // update while we were hidden.
    // filtered data needs to be set before D3Data
    const FILTEREDNCDATA = UDATA.AppState('FILTEREDNCDATA');
    this.setState({ filteredNodes: FILTEREDNCDATA.nodes }, () => {
      let NCDATA = this.AppState('NCDATA');
      this.handleDataUpdate(NCDATA);
    });

    // Request edit state too because the update may have come
    // while we were hidden
    this.updateEditState();
  }

  componentWillUnmount() {
    UDATA.UnhandleMessage('EDIT_PERMISSIONS_UPDATE', this.updateEditState);
    this.AppStateChangeOff('SESSION', this.onStateChange_SESSION);
    this.AppStateChangeOff('NCDATA', this.handleDataUpdate);
    this.AppStateChangeOff('FILTEREDNCDATA', this.handleFilterDataUpdate);
    this.AppStateChangeOff('TEMPLATE', this.OnTemplateUpdate);
    this.AppStateChangeOff('SELECTION', this.onStateChange_SELECTION);
    this.AppStateChangeOff('HILITE', this.onStateChange_HILITE);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  onStateChange_SELECTION(data) {
    this.setState({
      selectedNodeId: data.nodes.length > 0 ? data.nodes[0].id : undefined
    });
  }

  onStateChange_HILITE(data) {
    const { userHighlightNodeId, autosuggestHiliteNodeId } = data; // ignores `tableHiliteNodeId`
    let hilitedNodeId;
    if (autosuggestHiliteNodeId !== undefined)
      hilitedNodeId = autosuggestHiliteNodeId;
    if (userHighlightNodeId !== undefined) hilitedNodeId = userHighlightNodeId;
    this.setState({ hilitedNodeId });
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
  updateNodeFilterState(nodes, filteredNodes) {
    // set filter status
    if (filteredNodes.length > 0) {
      // If we're transitioning from "HILIGHT/FADE" to "COLLAPSE" or "FOCUS", then we
      // also need to remove nodes that are not in filteredNodes
      const FILTERDEFS = UDATA.AppState('FILTERDEFS');
      if (
        FILTERDEFS.filterAction === FILTER.ACTION.REDUCE ||
        FILTERDEFS.filterAction === FILTER.ACTION.FOCUS
      ) {
        nodes = nodes.filter(node => {
          const filteredNode = filteredNodes.find(n => n.id === node.id);
          return filteredNode; // keep if it's in the list of filtered nodes
        });
      } else {
        nodes = nodes.map(node => {
          const filteredNode = filteredNodes.find(n => n.id === node.id);
          node.isFiltered = !filteredNode; // not in filteredNode, so it's been removed
          return node;
        });
      }
    }
    this.setState({ nodes, filteredNodes });
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
  /** Handle updated SELECTION
   */
  handleDataUpdate(data) {
    if (DBG) console.log('handle data update');
    if (data.nodes) {
      // const nodes = this.sortTable(this.state.sortkey, data.nodes);
      const nodes = data.nodes;
      const { filteredNodes } = this.state;
      this.updateNodeFilterState(nodes, filteredNodes);
    }
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  handleFilterDataUpdate(data) {
    if (data.nodes) {
      const filteredNodes = data.nodes;
      // If we're transitioning from "COLLAPSE" or "FOCUS" to "HILIGHT/FADE", then we
      // also need to add back in nodes that are not in filteredNodes
      // (because "COLLAPSE" and "FOCUS" removes nodes that are not matched)
      const FILTERDEFS = UDATA.AppState('FILTERDEFS');
      if (FILTERDEFS.filterAction === FILTER.ACTION.FADE) {
        const NCDATA = UDATA.AppState('NCDATA');
        this.setState(
          {
            nodes: NCDATA.nodes,
            filteredNodes
          },
          () => {
            // FIXME: how to handle sorting?
            // const nodes = this.sortTable(this.state.sortkey, NCDATA.nodes);
            const nodes = NCDATA.nodes;
            this.updateNodeFilterState(nodes, filteredNodes);
          }
        );
      } else {
        this.setState(
          {
            nodes: filteredNodes,
            filteredNodes
          },
          () => {
            // FIXME: how to handle sorting?
            // const nodes = this.sortTable(this.state.sortkey, filteredNodes);
            const nodes = NCDATA.nodes;
            this.updateNodeFilterState(nodes, filteredNodes);
          }
        );
      }
    }
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  OnTemplateUpdate(data) {
    this.setState({
      nodeDefs: data.nodeDefs,
      selectedNodeColor: data.sourceColor,
      hilitedNodeColor: data.searchColor
    });
  }

  /// UTILITIES /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

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

  /// REACT LIFECYCLE METHODS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /*/ This is not yet implemented as of React 16.2.  It's implemented in 16.3.
    getDerivedStateFromProps (props, state) {
      console.error('getDerivedStateFromProps!!!');
    }
  /*/
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  render() {
    const {
      nodes,
      nodeDefs,
      selectedNodeId,
      hilitedNodeId,
      selectedNodeColor,
      hilitedNodeColor,
      disableEdit,
      isLocked
    } = this.state;
    if (nodes === undefined) return '';
    const { tableHeight } = this.props;

    const uid = CMTMGR.GetCurrentUserId();

    const attributeDefs = Object.keys(nodeDefs).filter(
      k => !BUILTIN_FIELDS_NODE.includes(k)
    );

    const TABLEDATA = nodes.map((node, i) => {
      const { id, label, degrees } = node;

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
      const commentCount = CMTMGR.GetThreadedViewObjectsCount(cref, uid);
      const ccol = CMTMGR.GetCommentCollection(cref) || {};
      const hasUnreadComments = ccol.hasUnreadComments;
      const selected = selectedNodeId === id;
      const commentVBtnDef = {
        cref,
        count: commentCount,
        hasUnreadComments,
        selected
      };

      return {
        id,
        label,
        degrees,
        ...attributes,
        commentVBtnDef
      };
    });

    // column definitions for custom attributes
    // (built in columns are: view, degrees, label)
    const ATTRIBUTE_COLUMNDEFS = attributeDefs.map(key => {
      let title = String(key);
      title = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
      let type = nodeDefs[key].type;
      return {
        title,
        type,
        data: key
      };
    });

    return (
      <div
        className="NCNodeTable"
        style={{
          overflow: 'auto',
          position: 'relative',
          display: 'block',
          left: '1px',
          right: '10px',
          height: tableHeight,
          backgroundColor: '#eafcff'
        }}
      >
        <URTable data={TABLEDATA} attributeColumndefs={ATTRIBUTE_COLUMNDEFS} />
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCNodeTable;
