/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

    EdgeTable is used to to display a table of edges for review.

    It displays NCDATA.
    But also read FILTEREDNCDATA to show highlight/filtered state


  ## TO USE

    EdgeTable is self contained and relies on global NCDATA to load.

      <EdgeTable/>


    Set `DBG` to true to show the `ID` column.

  ## 2018-12-07 Update

    Since we're not using tab navigation:
    1. The table isExpanded is now true by default.
    2. The "Show/Hide Table" button is hidden.

    Reset these to restore previous behavior.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const ReactStrap = require('reactstrap');
const NCUI = require('../nc-ui');
const CMTMGR = require('../comment-mgr');
const SETTINGS = require('settings');
const FILTER = require('./filter/FilterEnums');
const { BUILTIN_FIELDS_EDGE } = require('system/util/enum');
const { ICON_PENCIL, ICON_VIEW } = require('system/util/constant');
const { Button } = ReactStrap;
const UNISYS = require('unisys/client');
import HDATE from 'system/util/hdate';
import URCommentBtn from './URCommentBtn';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const isAdmin = SETTINGS.IsAdmin();
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var UDATA = null;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class EdgeTable extends UNISYS.Component {
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
      sortkey: 'Relationship'
    };

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
    this.setSortKey = this.setSortKey.bind(this);
    this.sortSymbol = this.sortSymbol.bind(this);
    this.lookupNodeLabel = this.lookupNodeLabel.bind(this);

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
        edges = edges.filter(edge => {
          const filteredEdge = filteredEdges.find(n => n.id === edge.id);
          return filteredEdge; // keep if it's in the list of filtered edges
        });
      } else {
        edges = edges.map(edge => {
          const filteredEdge = filteredEdges.find(n => n.id === edge.id);
          edge.isFiltered = !filteredEdge;
          return edge;
        });
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
        // ...   sort it also
        edges = this.sortTable(this.state.sortkey, edges);
        // ...1. So we need to save nodes for dereferencing.
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
            const edges = this.sortTable(this.state.sortkey, NCDATA.edges);
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
            const edges = this.sortTable(this.state.sortkey, filteredEdges);
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

  /// UTILITIES /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByID(edges) {
    if (edges) {
      return edges.sort((a, b) => {
        let akey = a.id,
          bkey = b.id;
        if (akey < bkey) return -1 * Number(this.sortDirection);
        if (akey > bkey) return 1 * Number(this.sortDirection);
        return 0;
      });
    }
    return undefined;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortBySourceLabel(edges) {
    if (edges) {
      return edges.sort((a, b) => {
        let akey = a.sourceLabel,
          bkey = b.sourceLabel;
        return akey.localeCompare(bkey) * this.sortDirection;
      });
    }
    return undefined;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByTargetLabel(edges) {
    if (edges) {
      return edges.sort((a, b) => {
        let akey = a.targetLabel,
          bkey = b.targetLabel;

        return akey.localeCompare(bkey) * this.sortDirection;
      });
    }
    return undefined;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** DEPRECATED -- 'attributes' is no longer being used
   */
  sortByAttribute(edges, key) {
    if (edges) {
      return edges.sort((a, b) => {
        let akey = a.attributes[key],
          bkey = b.attributes[key];
        if (akey < bkey) return -1 * Number(this.sortDirection);
        if (akey > bkey) return 1 * Number(this.sortDirection);
        if (akey === bkey) {
          // Secondary sort on Source label
          let source_a = a.sourceLabel;
          let source_b = b.sourceLabel;
          if (source_a < source_b) return -1 * Number(this.sortDirection);
          if (source_a > source_b) return 1 * Number(this.sortDirection);
        }
        return 0;
      });
    }
    return undefined;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByKey(edges, key, type) {
    if (edges) {
      return edges.sort((a, b) => {
        let akey, bkey;
        if (type === FILTER.TYPES.STRING) {
          akey = a[key] || ''; // fall back to blank if a[key] is not defined
          // a[key] might be undefined if the template/db
          // was changed but the full db wasn't updated
          bkey = b[key] || '';
        } else if (type === FILTER.TYPES.NUMBER) {
          akey = Number(a[key] || ''); // force number for sorting
          bkey = Number(b[key] || '');
        } else if (type === FILTER.TYPES.HDATE) {
          if (!a[key] || !b[key]) return 0;
          akey = HDATE.Parse(a[key].value); // parseResult
          bkey = HDATE.Parse(b[key].value);
          if (akey.length < 1 || bkey.length < 1) return '';
          const da = akey[0].start.knownValues;
          const db = bkey[0].start.knownValues;
          let order;
          if (da.year !== db.year) {
            order = da.year - db.year;
          } else if (da.month !== db.month) {
            order = da.month - db.month;
          } else if (da.day !== db.day) {
            order = da.day - db.day;
          } else if (da.hour !== db.hour) {
            order = da.hour - db.hour;
          } else if (da.minute !== db.minute) {
            order = da.minute - db.minute;
          } else if (da.second !== db.second) {
            order = da.second - db.second;
          }
          return order * Number(this.sortDirection);
        } else {
          /* some other type */
          akey = a[key];
          bkey = b[key];
        }
        if (akey < bkey) return -1 * Number(this.sortDirection);
        if (akey > bkey) return 1 * Number(this.sortDirection);
        if (akey === bkey) {
          // Secondary sort on Source label
          let source_a = a.sourceLabel;
          let source_b = b.sourceLabel;
          if (source_a < source_b) return -1 * Number(this.sortDirection);
          if (source_a > source_b) return 1 * Number(this.sortDirection);
        }
        return 0;
      });
    }
    return undefined;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByUpdated(edges) {
    if (edges) {
      return edges.sort((a, b) => {
        let akey = a.meta.revision > 0 ? a.meta.updated : a.meta.created,
          bkey = b.meta.revision > 0 ? b.meta.updated : b.meta.created;
        if (akey < bkey) return -1 * Number(this.sortDirection);
        if (akey > bkey) return 1 * Number(this.sortDirection);
        return 0;
      });
    }
    return undefined;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByComment(edges) {
    // stuff the count into edges for calculation
    const uid = CMTMGR.GetCurrentUserId();
    const countededges = edges.map(e => {
      const cref = CMTMGR.GetEdgeCREF(e.id);
      e.commentcount = CMTMGR.GetThreadedViewObjectsCount(cref, uid);
      return e;
    });
    if (countededges) {
      return countededges.sort((a, b) => {
        let akey = a.commentcount || 0,
          bkey = b.commentcount || 0;
        // sort descending
        if (akey > bkey) return 1 * Number(this.sortDirection);
        if (akey < bkey) return -1 * Number(this.sortDirection);
        return 0;
      });
    }
    return 0;
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** If no `sortkey` is passed, the sort will use the existing state.sortkey
   */
  sortTable(sortkey = this.state.sortkey, edges, type) {
    switch (sortkey) {
      case 'id':
        return this.sortByID(edges);
      case 'source':
        return this.sortBySourceLabel(edges);
      case 'target':
        return this.sortByTargetLabel(edges);
      case 'commentbtn':
        return this.sortByComment(edges);
      // case 'Updated':
      //   return this.sortByUpdated(edges);
      default:
        return this.sortByKey(edges, sortkey, type);
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortSymbol(key) {
    if (key !== this.state.sortkey) return '';
    // this is not the current sort, so don't show anything
    else return this.sortDirection === 1 ? '▼' : '▲'; // default to "decreasing" and flip if clicked again
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
    let { edgeDefs, selectedEdgeId, selectedEdgeColor, disableEdit, isLocked } =
      this.state;
    if (edgeDefs.category === undefined) {
      // for backwards compatability
      edgeDefs.category = {};
      edgeDefs.category.label = '';
      edgeDefs.category.hidden = true;
    }
    const { tableHeight } = this.props;
    const styles = `thead, tbody { font-size: 0.8em }
                    .table {
                      display: table; /* override bootstrap for fixed header */
                      border-spacing: 0;
                    }
                    .table th {
                      position: -webkit-sticky;
                      position: sticky;
                      top: 0;
                      background-color: #eafcff;
                      border-top: none;
                    }
                    xtbody { overflow: auto; }
                    .btn-sm { font-size: 0.6rem; padding: 0.1rem 0.2rem }
                    `;
    let attributes = Object.keys(edgeDefs).filter(
      k => !BUILTIN_FIELDS_EDGE.includes(k)
    );

    // show 'type' between 'source' and 'target' if `type` has been defined
    // if it isn't defined, just show attribute fields after `source` and 'target`
    const hasTypeField = edgeDefs['type'];
    if (hasTypeField) attributes = attributes.filter(a => a !== 'type');

    return (
      <div
        onMouseLeave={() => this.onHighlightNode(undefined)}
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
        <style>{styles}</style>
        <Button size="sm" outline hidden onClick={this.onToggleExpanded}>
          {this.state.isExpanded ? 'Hide Edge Table' : 'Show Edge Table'}
        </Button>
        <table
          hidden={!this.state.isExpanded}
          // size="sm" hover responsive striped // ReactStrap properties
          // Need to use a standard 'table' not ReactStrap so that we can set
          // the container div height and support non-scrolling headers
          className="table table-striped table-responsive table-hover table-sm edgetable w-auto"
        >
          <thead>
            <tr>
              <th width="4%" hidden={!DBG}>
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('id', edgeDefs.id.type)}
                >
                  ID {this.sortSymbol('id')}
                </Button>
              </th>
              <th hidden={!DBG}>Size</th>
              <th width="4%">
                <div style={{ color: '#f3f3ff' }}>_Edit_</div>
              </th>
              <th hidden={!DBG}>Src ID</th>
              <th width="10%">
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('source', edgeDefs.source.type)}
                >
                  {edgeDefs.source.displayLabel} {this.sortSymbol('source')}
                </Button>
              </th>
              {hasTypeField && (
                <th hidden={edgeDefs.type.hidden} width="10%">
                  <Button
                    size="sm"
                    onClick={() =>
                      this.setSortKey('Relationship', edgeDefs.type.type)
                    }
                  >
                    {edgeDefs.type.displayLabel} {this.sortSymbol('Relationship')}
                  </Button>
                </th>
              )}
              <th hidden={!DBG}>Target ID</th>
              <th width="10%">
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('target', edgeDefs.target.type)}
                >
                  {edgeDefs.target.displayLabel} {this.sortSymbol('target')}
                </Button>
              </th>
              {attributes.map(a => (
                <th hidden={edgeDefs[a].hidden} key={a}>
                  <Button
                    size="sm"
                    onClick={() => this.setSortKey(a, edgeDefs[a].type)}
                  >
                    {edgeDefs[a].displayLabel} {this.sortSymbol(a)}
                  </Button>
                </th>
              ))}
              <th style={{ zIndex: 1 }}>
                <div
                  className="comment-icon-inline comment-intable"
                  onClick={() => this.setSortKey('commentbtn')}
                >
                  {CMTMGR.COMMENTICON}
                  {this.sortSymbol('commentbtn')}
                </div>
              </th>
              {/*
              <th width="7%" hidden={!isAdmin}>
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('Updated', FILTER.TYPES.STRING)}
                >
                  Updated {this.sortSymbol('Updated')}
                </Button>
              </th>
              <th width="10%" hidden={edgeDefs.comments.hidden}>
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('comments', edgeDefs.comments.type)}
                >
                  {edgeDefs.comments.displayLabel} {this.sortSymbol('comments')}
                </Button>
              </th>
              */}
            </tr>
          </thead>
          <tbody style={{ maxHeight: tableHeight, fontSize: '12px' }}>
            {this.state.edges.map((edge, i) => (
              <tr
                key={i}
                style={{
                  color: edge.isFiltered ? 'red' : 'black',
                  // edge default transparency is 0.7
                  // but for tables, we want to show opaque unless the edge has been Faded via filter
                  opacity:
                    edge.filteredTransparency > 0.5 ? 1 : edge.filteredTransparency,
                  border:
                    selectedEdgeId === edge.id
                      ? `3px solid ${selectedEdgeColor}`
                      : 'none'
                }}
              >
                <td hidden={!DBG}>{edge.id}</td>
                <td hidden={!DBG}>{edge.size}</td>
                <td>
                  {!disableEdit && (
                    <button
                      className="small outline"
                      onClick={event => this.onViewButtonClick(event, edge.id)}
                    >
                      {ICON_VIEW}
                    </button>
                  )}
                  {!disableEdit && !isLocked && (
                    <button
                      className="small outline"
                      onClick={event => this.onEditButtonClick(event, edge.id)}
                    >
                      {ICON_PENCIL}
                    </button>
                  )}
                </td>
                {/* Cast to string for edge.target where target is undefined */}
                <td hidden={!DBG}>{String(edge.source)}</td>
                <td>
                  {!disableEdit ? (
                    <a
                      href="#"
                      onClick={e => this.selectNode(edge.source, e)}
                      onMouseOver={() => this.onHighlightNode(edge.source)}
                    >
                      {edge.sourceLabel}
                    </a>
                  ) : (
                    edge.sourceLabel
                  )}
                </td>
                {hasTypeField && <td hidden={edgeDefs.type.hidden}>{edge.type}</td>}
                {/* Cast to string for edge.target where target is undefined */}
                <td hidden={!DBG}>{String(edge.target)}</td>
                <td>
                  {!disableEdit ? (
                    <a
                      href="#"
                      onClick={e => this.selectNode(edge.target, e)}
                      onMouseOver={() => this.onHighlightNode(edge.target)}
                    >
                      {edge.targetLabel}
                    </a>
                  ) : (
                    edge.targetLabel
                  )}
                </td>
                {attributes.map(a => (
                  <td hidden={edgeDefs[a].hidden} key={`${edge.id}${a}`}>
                    {edgeDefs[a].type === 'markdown'
                      ? NCUI.Markdownify(edge[a])
                      : edgeDefs[a].type === 'hdate'
                      ? (edge[a] && edge[a].formattedDateString) || ''
                      : edge[a]}
                  </td>
                ))}
                <td>
                  <URCommentBtn
                    cref={CMTMGR.GetEdgeCREF(edge.id)}
                    uuiid={'edgetable'}
                  />
                </td>
                {/*
                <td hidden={!isAdmin} style={{ fontSize: '9px' }}>
                  {this.displayUpdated(edge)}
                </td>
                <td
                  hidden={edgeDefs.comments.hidden}
                  style={{ backgroundColor: '#ffff6633' }}
                >
                  {edge.comments}
                </td>
                */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
} // class EdgeTable

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = EdgeTable;
