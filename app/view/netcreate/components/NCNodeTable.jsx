/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

    NCNodeTable is used to to display a table of nodes for review.

    It checks FILTEREDNCDATA to show highlight/filtered state

    It uses URTable for rendering and sorting.

  ## PROPS

    * tableHeight -- sets height based on InfoPanel dragger
    * isOpen -- whether the table is visible

  ## TO USE

    NCNodeTable is self contained and relies on global FILTEREDNCDATA to load.

      <NCNodeTable tableHeight isOpen/>


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect } from 'react';
import UNISYS from 'unisys/client';
import NCUI from '../nc-ui';
import UTILS from '../nc-utils';
import FILTER from './filter/FilterEnums';
import CMTMGR from '../comment-mgr';

import URTable from './URTable';
import URCommentVBtn from './URCommentVBtn';

import { BUILTIN_FIELDS_NODE } from 'system/util/enum';
import { ICON_PENCIL, ICON_VIEW } from 'system/util/constant';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Initialize UNISYS DATA LINK for functional react component
const UDATAOwner = { name: 'NCNodeTable' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);

const DBG = false;

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function NCNodeTable({ tableHeight, isOpen }) {
  const [state, setState] = useState({});

  /// USEEFFECT ///////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    const TEMPLATE = UDATA.AppState('TEMPLATE');
    const SESSION = UDATA.AppState('SESSION');
    setState({
      nodeDefs: TEMPLATE.nodeDefs,
      nodes: [],
      disableEdit: false,
      isLocked: !SESSION.isValid
    });

    UDATA.OnAppStateChange('FILTEREDNCDATA', urstate_FILTEREDNCDATA);
    UDATA.OnAppStateChange('SESSION', urstate_SESSION);
    UDATA.OnAppStateChange('TEMPLATE', urstate_TEMPLATE);
    return () => {
      UDATA.AppStateChangeOff('FILTEREDNCDATA', urstate_FILTEREDNCDATA);
      UDATA.AppStateChangeOff('SESSION', urstate_SESSION);
      UDATA.AppStateChangeOff('TEMPLATE', urstate_TEMPLATE);
    };
  }, []);

  /// UR HANDLERS /////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urstate_FILTEREDNCDATA(data) {
    if (data.nodes) {
      // If we're transitioning from "COLLAPSE" or "FOCUS" to "HILIGHT/FADE", then we
      // also need to add back in nodes that are not in filteredNodes
      // (because "COLLAPSE" and "FOCUS" removes nodes that are not matched)
      const NCDATA = UDATA.AppState('NCDATA');
      const FILTERDEFS = UDATA.AppState('FILTERDEFS');
      if (FILTERDEFS.filterAction === FILTER.ACTION.FADE) {
        // show ALL nodes
        m_updateNodeFilterState(NCDATA.nodes);
      } else {
        // show only filtered nodes from the filter update
        m_updateNodeFilterState(data.nodes);
      }
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function m_updateNodeFilterState(nodes) {
    const filteredNodes = m_deriveFilteredNodes(nodes);
    setState(prevState => ({ ...prevState, nodes: filteredNodes }));
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Set node filtered status based on current filteredNodes
  function m_deriveFilteredNodes(nodes) {
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
  function urstate_SESSION(decoded) {
    const isLocked = !decoded.isValid;
    if (isLocked === this.state.isLocked) {
      return;
    }
    setState(prevState => ({ ...prevState, isLocked }));
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urstate_TEMPLATE(data) {
    setState(prevState => ({
      ...prevState,
      nodeDefs: data.nodeDefs,
      selectedNodeColor: data.sourceColor,
      hilitedNodeColor: data.searchColor
    }));
  }

  /// COLUMN DEFINTION GENERATION /////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function DeriveColumnDefs(incomingNodeDefs) {
    const { nodeDefs, disableEdit, isLocked } = state;
    const defs = incomingNodeDefs || nodeDefs;

    // Only include built in fields
    // Only include non-hidden fields
    // Only include non-provenance fields
    const attributeDefs = Object.keys(defs).filter(
      k =>
        !BUILTIN_FIELDS_NODE.includes(k) && !defs[k].isProvenance && !defs[k].hidden
    );
    const provenanceDefs = Object.keys(defs).filter(
      k => !BUILTIN_FIELDS_NODE.includes(k) && defs[k].isProvenance && !defs[k].hidden
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
    /// RENDERERS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function col_RenderViewOrEdit(key, tdata, coldef) {
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
    function col_RenderNode(key, tdata, coldef) {
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
          <span>{value}</span>
        </button>
      );
    }
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function col_RenderCommentBtn(key, tdata, coldef) {
      const value = tdata[key];
      return <URCommentVBtn cref={value.cref} />;
    }
    /// CUSTOM SORTERS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function col_SortCommentsByCount(key, tdata, order) {
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
      return {
        title: defs[key].displayLabel,
        type: defs[key].type,
        data: key
      };
    });
    const PROVENANCE_COLUMNDEFS = provenanceDefs.map(key => {
      return {
        title: defs[key].displayLabel,
        type: defs[key].type,
        data: key
      };
    });
    const COLUMNDEFS = [
      {
        title: '', // View/Edit
        data: 'id',
        type: 'number',
        width: 45, // in px
        renderer: col_RenderViewOrEdit,
        sortDisabled: true,
        tipDisabled: true
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
        width: 200, // in px
        renderer: col_RenderNode
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
    COLUMNDEFS.push(...ATTRIBUTE_COLUMNDEFS);
    COLUMNDEFS.push(...PROVENANCE_COLUMNDEFS);
    // History
    if (defs['createdBy'] && !defs['createdBy'].hidden)
      COLUMNDEFS.push({
        title: 'Created By',
        type: 'text-case-insensitive',
        width: 60, // in px
        data: 'createdBy'
      });
    if (defs['created'] && !defs['created'].hidden)
      COLUMNDEFS.push({
        title: 'Created On',
        type: 'timestamp-short',
        width: 60, // in px
        data: 'created'
      });
    if (defs['updatedBy'] && !defs['updatedBy'].hidden)
      COLUMNDEFS.push({
        title: 'Updated By',
        type: 'text-case-insensitive',
        width: 60, // in px
        data: 'updatedBy'
      });
    if (defs['updated'] && !defs['updated'].hidden)
      COLUMNDEFS.push({
        title: 'Updated On',
        type: 'timestamp-short',
        width: 60, // in px
        data: 'updated'
      });
    // Comment is last
    COLUMNDEFS.push({
      title: ' ',
      data: 'commentVBtnDef',
      width: 40, // in px
      renderer: col_RenderCommentBtn,
      sorter: col_SortCommentsByCount,
      tipDisabled: true
    });
    return COLUMNDEFS;
  }

  /// TABLE DATA GENERATION ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function DeriveTableData({ nodeDefs, nodes }) {
    // Only include built in fields
    // Only include non-hidden fields
    // Only include non-provenance fields
    const attributeDefs = Object.keys(nodeDefs).filter(
      k =>
        !BUILTIN_FIELDS_NODE.includes(k) &&
        !nodeDefs[k].hidden &&
        !nodeDefs[k].isProvenance
    );
    const provenanceDefs = Object.keys(nodeDefs).filter(
      k => nodeDefs[k].isProvenance
    );

    return nodes.map((node, i) => {
      const { id, label, type, degrees } = node;

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
        } else if (nodeDefs[key].type === 'hdate') {
          data = node[key] && node[key].formattedDateString;
        } else if (nodeDefs[key].type === 'infoOrigin') {
          data =
            node[key] === undefined || node[key] === ''
              ? UTILS.DeriveInfoOriginString(node.createdBy, node.created)
              : node[key];
        } else data = node[key];
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

      // provenance
      const provenance = {};
      provenanceDefs.forEach((key, i) => {
        let data = {};
        if (nodeDefs[key].type === 'markdown') {
          // for markdown:
          // a. provide the raw markdown string
          // b. provide the HTML string
          data.html = NCUI.Markdownify(node[key]);
          data.raw = node[key];
        } else if (nodeDefs[key].type === 'hdate') {
          data = node[key] && node[key].formattedDateString;
        } else if (nodeDefs[key].type === 'infoOrigin') {
          data =
            node[key] === undefined || node[key] === ''
              ? UTILS.DeriveInfoOriginString(node.createdBy, node.created)
              : node[key];
        } else data = node[key] || '';
        provenance[key] = data;
      });

      // history
      const history = {
        createdBy: node.createdBy,
        created: node.meta ? node.meta.created : '', // meta may not be defined when a new node is creatd
        updatedBy: node.updatedBy,
        updated: node.meta ? node.meta.updated : '' // meta may not be defined when a new node is creatd
      };

      return {
        id,
        label,
        type,
        degrees,
        ...attributes,
        commentVBtnDef,
        ...provenance,
        ...history,
        meta: {
          filteredTransparency: node.filteredTransparency
        }
      };
    });
  }

  /// COMPONENT RENDER ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  if (state.nodes === undefined) return `loading...waiting for nodes ${state.nodes}`;
  if (state.nodeDefs === undefined)
    return `loading...waiting for nodeDefs ${state.nodeDefs}`;
  const COLUMNDEFS = DeriveColumnDefs();
  const TABLEDATA = DeriveTableData({ nodeDefs: state.nodeDefs, nodes: state.nodes });
  return (
    <div className="NCNodeTable" style={{ height: tableHeight }}>
      <URTable isOpen={isOpen} data={TABLEDATA} columns={COLUMNDEFS} />
    </div>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NCNodeTable;
