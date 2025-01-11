/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ## OVERVIEW

    EdgeTable is used to to display a table of edges for review.

    It checks FILTEREDNCDATA to show highlight/filtered state

    It uses URTable for rendering and sorting.

  ## PROPS

    * tableHeight -- sets height based on InfoPanel dragger
    * isOpen -- whether the table is visible

  ## TO USE

    EdgeTable is self contained and relies on global NCDATA to load.

      <EdgeTable tableHeight isOpen />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect } from 'react';
import UNISYS from 'unisys/client';
import NCUI from '../nc-ui';
import UTILS from '../nc-utils';
import FILTER from './filter/FilterEnums';
import CMTMGR from '../comment-mgr';

import URTable from './URTable';
import URCommentVBtn from './URCommentVBtn';

import { BUILTIN_FIELDS_EDGE } from 'system/util/enum';
import { ICON_PENCIL, ICON_VIEW } from 'system/util/constant';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Initialize UNISYS DATA LINK for functional react component
const UDATAOwner = { name: 'NCEdgeTable' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);

const DBG = false;

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function NCEdgeTable({ tableHeight, isOpen }) {
  const [state, setState] = useState({});

  /// USEEFFECT ///////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    const TEMPLATE = UDATA.AppState('TEMPLATE');
    const SESSION = UDATA.AppState('SESSION');
    setState({
      edgeDefs: TEMPLATE.edgeDefs,
      edges: [],
      nodes: [], // needed for dereferencing source/target
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
    if (data.edges) {
      // If we're transitioning from "COLLAPSE" or "FOCUS" to "HILIGHT/FADE", then we
      // also need to add back in edges that are not in filteredEdges
      // (because "COLLAPSE" and "FOCUS" removes edges that are not matched)
      const FILTERDEFS = UDATA.AppState('FILTERDEFS');
      if (FILTERDEFS.filterAction === FILTER.ACTION.FADE) {
        const NCDATA = UDATA.AppState('NCDATA');
        m_updateEdgeFilterState(NCDATA.edges);
      } else {
        m_updateEdgeFilterState(data.edges);
      }
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function m_updateEdgeFilterState(edges) {
    const filteredEdges = m_deriveFilteredEdges(edges);
    setState(prevState => ({ ...prevState, edges: filteredEdges }));
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /// Set node filtered status based on current filteredNodes
  function m_deriveFilteredEdges(edges) {
    // set filter status
    let filteredEdges = [];
    // If we're transitioning from "HILIGHT/FADE" to "COLLAPSE" or "FOCUS", then we
    // also need to remove edges that are not in filteredEdges
    const FILTERDEFS = UDATA.AppState('FILTERDEFS');
    if (
      FILTERDEFS.filterAction === FILTER.ACTION.REDUCE ||
      FILTERDEFS.filterAction === FILTER.ACTION.FOCUS
    ) {
      // Reduce (remove) or Focus
      filteredEdges = edges.filter(edge => {
        const filteredEdge = filteredEdges.find(e => e.id === edge.id);
        return filteredEdge; // keep if it's in the list of filtered edges
      });
    } else {
      // Fade
      // Fading is handled by setting edge.filteredTransparency which is
      // directly handled by the filter now.  So no need to process it
      // here in the table.
      filteredEdges = edges;
    }
    // }
    return filteredEdges;
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
      edgeDefs: data.edgeDefs,
      selectedEdgeColor: data.sourceColor
    }));
  }

  /// COLUMN DEFINTION GENERATION /////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function DeriveColumnDefs(incomingEdgeDefs) {
    const { edges, edgeDefs, disableEdit, isLocked } = state;
    const defs = incomingEdgeDefs || edgeDefs;

    // Only include built in fields
    // Only include non-hidden fields
    // Only include non-provenance fields
    const attributeDefs = Object.keys(defs).filter(
      k =>
        !BUILTIN_FIELDS_EDGE.includes(k) && !defs[k].isProvenance && !defs[k].hidden
    );
    const provenanceDefs = Object.keys(defs).filter(
      k => !BUILTIN_FIELDS_EDGE.includes(k) && defs[k].isProvenance && !defs[k].hidden
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
    /// RENDERERS
    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    function col_RenderViewOrEdit(key, tdata, coldef) {
      const value = tdata[key];
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
          onClick={event => ui_ClickViewNode(event, value.id)}
        >
          <span>{value.label}</span>
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
    /// tdata = TTblNodeObject[] = { id: String, label: String }
    function col_SortNodes(key, tdata, order) {
      const sortedData = [...tdata].sort((a, b) => {
        if (a[key].label < b[key].label) return order;
        if (a[key].label > b[key].label) return order * -1;
        return 0;
      });
      return sortedData;
    }
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
        width: 50, // in px
        renderer: col_RenderViewOrEdit,
        sortDisabled: true,
        tipDisabled: true
      },
      {
        title: defs['source'].displayLabel,
        width: 130, // in px
        data: 'sourceDef',
        renderer: col_RenderNode,
        sorter: col_SortNodes
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
    COLUMNDEFS.push(
      {
        title: defs['target'].displayLabel,
        width: 130, // in px
        data: 'targetDef',
        renderer: col_RenderNode,
        sorter: col_SortNodes
      },
      ...ATTRIBUTE_COLUMNDEFS,
      ...PROVENANCE_COLUMNDEFS
    );
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
      }); // Comment is last
    COLUMNDEFS.push({
      title: ' ',
      data: 'commentVBtnDef',
      type: 'text',
      width: 50, // in px
      renderer: col_RenderCommentBtn,
      sorter: col_SortCommentsByCount,
      tipDisabled: true
    });
    return COLUMNDEFS;
  }

  /// TABLE DATA GENERATION ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function DeriveTableData({ edgeDefs, edges }) {
    // Only include built in fields
    // Only include non-hidden fields
    // Only include non-provenance fields
    let attributeDefs = Object.keys(edgeDefs).filter(
      k =>
        !BUILTIN_FIELDS_EDGE.includes(k) &&
        !edgeDefs[k].hidden &&
        !edgeDefs[k].isProvenance
    );
    const provenanceDefs = Object.keys(edgeDefs).filter(
      k => edgeDefs[k].isProvenance
    );

    return edges.map((edge, i) => {
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
        } else if (edgeDefs[key].type === 'hdate') {
          data = edge[key] && edge[key].formattedDateString;
        } else if (edgeDefs[key].type === 'infoOrigin') {
          data =
            edge[key] === undefined || edge[key] === ''
              ? UTILS.DeriveInfoOriginString(edge.createdBy, edge.created)
              : edge[key];
        } else data = edge[key];
        attributes[key] = data;
      });

      // comment button definition
      const cref = CMTMGR.GetEdgeCREF(id);
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
        if (edgeDefs[key].type === 'markdown') {
          // for markdown:
          // a. provide the raw markdown string
          // b. provide the HTML string
          data.html = NCUI.Markdownify(edge[key]);
          data.raw = edge[key];
        } else if (edgeDefs[key].type === 'hdate') {
          data = edge[key] && edge[key].formattedDateString;
        } else if (edgeDefs[key].type === 'infoOrigin') {
          data =
            edge[key] === undefined || edge[key] === ''
              ? UTILS.DeriveInfoOriginString(edge.createdBy, edge.created)
              : edge[key];
        } else data = edge[key] || '';
        provenance[key] = data;
      });

      // history
      const history = {
        createdBy: edge.createdBy,
        created: edge.meta ? edge.meta.created : '', // meta may not be defined when a new node is creatd
        updatedBy: edge.updatedBy,
        updated: edge.meta ? edge.meta.updated : '' // meta may not be defined when a new node is creatd
      };

      return {
        id: { edgeId: id, sourceId: source }, // { edgeId, sourceId} for click handler
        sourceDef, // { id: String, label: String }
        targetDef, // { id: String, label: String }
        type,
        ...attributes,
        commentVBtnDef,
        ...provenance,
        ...history,
        meta: {
          filteredTransparency: edge.filteredTransparency
        }
      };
    });
  }

  /// COMPONENT RENDER ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  if (state.edges === undefined) return `loading...waiting for edges ${state.edges}`;
  if (state.edgeDefs === undefined)
    return `loading...waiting for nodeDefs ${state.edgeDefs}`;
  const COLUMNDEFS = DeriveColumnDefs();
  const TABLEDATA = DeriveTableData({ edgeDefs: state.edgeDefs, edges: state.edges });
  return (
    <div className="NCNodeTable" style={{ height: tableHeight }}>
      <URTable isOpen={isOpen} data={TABLEDATA} columns={COLUMNDEFS} />
    </div>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default NCEdgeTable;
