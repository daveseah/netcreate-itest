/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

    NodeTable is used to to display a table of nodes for review.

    It displays NCDATA.
    But also checks FILTEREDNCDATA to show highlight/filtered state

  ## TO USE

    NodeTable is self contained and relies on global NCDATA to load.

      <NodeTable/>

  ## 2018-12-07 Update

    Since we're not using tab navigation:
    1. The table isExpanded is now true by default.
    2. The "Show/Hide Table" button is hidden.

    Reset these to restore previous behavior.



\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import { EJSProp } from 'settings';
import UNISYS from 'unisys/client';
import FILTER from './filter/FilterEnums';
import React from 'react';
import ReactStrap from 'reactstrap';
import { BUILTIN_FIELDS_NODE } from 'system/util/enum';
const { Button } = ReactStrap;
import MarkdownNote from './MarkdownNote';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var DBG = false;
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const isLocalHost =
  EJSProp('client').ip === '127.0.0.1' || location.href.includes('admin=true');
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var UDATA = null;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// export a class object for consumption by brunch/require
class NodeTable extends UNISYS.Component {
  constructor(props) {
    super(props);

    this.state = {
      nodeDefs: this.AppState('TEMPLATE').nodeDefs,
      nodes: [],
      filteredNodes: [],
      isLocked: false,
      isExpanded: true,
      sortkey: 'label'
    };

    this.onStateChange_SESSION = this.onStateChange_SESSION.bind(this);
    this.displayUpdated = this.displayUpdated.bind(this);
    this.updateNodeFilterState = this.updateNodeFilterState.bind(this);
    this.handleDataUpdate = this.handleDataUpdate.bind(this);
    this.handleFilterDataUpdate = this.handleFilterDataUpdate.bind(this);
    this.OnTemplateUpdate = this.OnTemplateUpdate.bind(this);
    this.onButtonClick = this.onButtonClick.bind(this);
    this.onToggleExpanded = this.onToggleExpanded.bind(this);
    this.onHighlightRow = this.onHighlightRow.bind(this);
    this.setSortKey = this.setSortKey.bind(this);
    this.sortSymbol = this.sortSymbol.bind(this);

    this.sortDirection = 1; // alphabetical A-Z

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

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
  }

  componentWillUnmount() {
    this.AppStateChangeOff('SESSION', this.onStateChange_SESSION);
    this.AppStateChangeOff('NCDATA', this.handleDataUpdate);
    this.AppStateChangeOff('FILTEREDNCDATA', this.handleFilterDataUpdate);
    this.AppStateChangeOff('TEMPLATE', this.OnTemplateUpdate);
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
  /** Handle updated SELECTION
   */
  handleDataUpdate(data) {
    if (DBG) console.log('handle data update');
    if (data.nodes) {
      const nodes = this.sortTable(this.state.sortkey, data.nodes);
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
            const nodes = this.sortTable(this.state.sortkey, NCDATA.nodes);
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
            const nodes = this.sortTable(this.state.sortkey, filteredNodes);
            this.updateNodeFilterState(nodes, filteredNodes);
          }
        );
      }
    }
  }

  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  OnTemplateUpdate(data) {
    this.setState({ nodeDefs: data.nodeDefs });
  }

  /// UTILITIES /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByID(nodes) {
    if (nodes) {
      return nodes.sort((a, b) => {
        let akey = a.id,
          bkey = b.id;
        if (akey < bkey) return -1 * Number(this.sortDirection);
        if (akey > bkey) return 1 * Number(this.sortDirection);
        return 0;
      });
    }
    return 0;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByEdgeCount(nodes) {
    if (nodes) {
      return nodes.sort((a, b) => {
        let akey = a.degrees || 0,
          bkey = b.degrees || 0;
        // sort descending
        if (akey > bkey) return 1 * Number(this.sortDirection);
        if (akey < bkey) return -1 * Number(this.sortDirection);
        return 0;
      });
    }
    return 0;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByLabel(nodes) {
    if (nodes) {
      return nodes.sort((a, b) => {
        let akey = a.label ? a.label : '',
          bkey = b.label ? b.label : '';
        return akey.localeCompare(bkey) * this.sortDirection;
      });
    }
    return 0;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** DEPRECATED -- 'attributes' is no longer being used
   */
  sortByAttribute(nodes, key) {
    if (nodes) {
      return nodes.sort((a, b) => {
        let akey = a.attributes[key],
          bkey = b.attributes[key];
        if (akey < bkey) return -1 * Number(this.sortDirection);
        if (akey > bkey) return 1 * Number(this.sortDirection);
        return 0;
      });
    }
    return 0;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByKey(nodes, key, type) {
    if (nodes) {
      return nodes.sort((a, b) => {
        let akey, bkey;
        if (type === FILTER.TYPES.STRING) {
          akey = a[key] || ''; // fall back to blank if a[key] is not defined
          // a[key] might be undefined if the template/db
          // was changed but the full db wasn't updated
          bkey = b[key] || '';
        } else if (type === FILTER.TYPES.NUMBER) {
          akey = Number(a[key] || ''); // force number for sorting
          bkey = Number(b[key] || '');
        } /* some other type */ else {
          akey = a[key];
          bkey = b[key];
        }
        if (akey < bkey) return -1 * Number(this.sortDirection);
        if (akey > bkey) return 1 * Number(this.sortDirection);
        return 0;
      });
    }
    return 0;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  sortByUpdated(nodes) {
    if (nodes) {
      return nodes.sort((a, b) => {
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
  /** If no `sortkey` is passed, the sort will use the existing state.sortkey
    Returns the sorted nodes so that the calling function can handle
    state updates all at once.
   */
  sortTable(sortkey = this.state.sortkey, nodes, type) {
    switch (sortkey) {
      case 'id':
        return this.sortByID(nodes);
      case 'edgeCount':
        return this.sortByEdgeCount(nodes);
      // case 'updated':
      //   return this.sortByUpdated(nodes);
      case 'label':
        return this.sortByLabel(nodes);
      default:
        return this.sortByKey(nodes, sortkey, type);
    }
  }

  sortSymbol(key) {
    if (key !== this.state.sortkey)
      return ''; // this is not the current sort, so don't show anything
    else return this.sortDirection === 1 ? '▼' : '▲'; // default to "decreasing" and flip if clicked again
  }

  /// UI EVENT HANDLERS /////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   */
  onButtonClick(event) {
    event.preventDefault();

    // REVIEW: For some reason React converts the integer IDs into string
    // values when returned in event.target.value.  So we have to convert
    // it here.
    let nodeID = parseInt(event.target.value);
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
  setSortKey(key, type) {
    if (key === this.state.sortkey) this.sortDirection = -1 * this.sortDirection;
    // if this was already the key, flip the direction
    else this.sortDirection = 1;

    const nodes = this.sortTable(key, this.state.nodes, type);
    this.setState({ sortkey: key, nodes });
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
    if (this.state.nodes === undefined) return '';
    const { nodeDefs, isLocked } = this.state;
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
    const attributes = Object.keys(nodeDefs).filter(
      k => !BUILTIN_FIELDS_NODE.includes(k)
    );
    return (
      <div
        onMouseLeave={() => this.onHighlightRow(undefined)}
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
        <table
          hidden={!this.state.isExpanded}
          // size="sm" hover responsive striped // ReactStrap properties
          // Need to use a standard 'table' not ReactStrap so that we can set
          // the container div height and support non-scrolling headers
          className="table table-striped table-responsive table-hover table-sm nodetable w-auto"
        >
          <thead>
            <tr>
              <th width="4%">
                <div style={{ color: '#f3f3ff' }}>_Edit_</div>
              </th>
              <th width="4%" hidden={!DBG}>
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('id', nodeDefs.id.type)}
                >
                  ID
                </Button>
              </th>
              <th width="4%">
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('edgeCount', nodeDefs.degrees.type)}
                >
                  {nodeDefs.degrees.displayLabel} {this.sortSymbol('edgeCount')}
                </Button>
              </th>
              <th width="15%">
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('label', nodeDefs.label.type)}
                >
                  {nodeDefs.label.displayLabel} {this.sortSymbol('label')}
                </Button>
              </th>
              {attributes.map(a => (
                <th hidden={nodeDefs[a].hidden} key={a}>
                  <Button
                    size="sm"
                    onClick={() => this.setSortKey(a, nodeDefs[a].type)}
                  >
                    {nodeDefs[a].displayLabel} {this.sortSymbol(a)}
                  </Button>
                </th>
              ))}
              {/*
              <th width="10%" hidden={!isLocalHost}>
                <Button
                  size="sm"
                  onClick={() => this.setSortKey('updated', FILTER.TYPES.STRING)}
                >
                  Updated {this.sortSymbol('updated')}
                </Button>
              </th>
              */}
            </tr>
          </thead>
          <tbody style={{ maxHeight: tableHeight, fontSize: '12px' }}>
            {this.state.nodes.map((node, i) => (
              <tr
                key={i}
                style={{
                  color: node.isFiltered ? 'red' : 'black',
                  opacity: node.filteredTransparency
                }}
                onMouseOver={() => this.onHighlightRow(node.id)}
              >
                <td>
                  <Button
                    size="sm"
                    outline
                    value={node.id}
                    onClick={this.onButtonClick}
                  >
                    {isLocked ? 'View' : 'Edit'}
                  </Button>
                </td>
                <td hidden={!DBG}>{node.id}</td>
                <td>{node.degrees}</td>
                <td>
                  <a href="#" onClick={e => this.selectNode(node.id, e)}>
                    {node.label}
                  </a>
                </td>
                {attributes.map(a => (
                  <td hidden={nodeDefs[a].hidden} key={`${node.id}${a}`}>
                    {node[a]}
                  </td>
                ))}
                {/*
                <td hidden={!isLocalHost} style={{ fontSize: '9px' }}>
                  {this.displayUpdated(node)}
                </td>
                <td
                  hidden={nodeDefs.comments.hidden}
                  style={{ backgroundColor: '#ffff6633' }}
                >
                  {node.comments}
                </td>
                */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
} // class NodeTable

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NodeTable;
