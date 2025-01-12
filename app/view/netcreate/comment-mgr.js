/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  COMMENT MANAGER

  See UR ADDONS / Comment


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const ReactDOM = require('react-dom');
const UNISYS = require('unisys/client');
const { COMMENT } = require('@ursys/addons');
const DATASTORE = require('system/datastore');
const { ARROW_RIGHT } = require('system/util/constant');
const { EDITORTYPE } = require('system/util/enum');
const NCUI = require('./nc-ui');
const NCDialog = require('./components/NCDialog');
const SETTINGS = require('settings');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const PR = 'comment-mgr: ';

const CMTBTNOFFSET = 10;

/// INITIALIZE MODULE /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let MOD = UNISYS.NewModule(module.id);
let UDATA = UNISYS.NewDataLink(MOD);
const dialogContainerId = 'dialog-container'; // used to inject dialogs into NetCreate.jsx

let UID; // user id, cached.  nc-logic updates this on INITIALIZE and SESSION

/// UNISYS LIFECYCLE HOOKS ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** lifecycle INITIALIZE handler
 */
MOD.Hook('INITIALIZE', () => {
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - inside hook
  /** LOAD_COMMENT_DATACORE
   *  Called by nc-logic.m_PromiseLoadDB
   *  Primarily after LOADASSETS
   *  Loads comments from the database into dc-comments
   *  @param {Object} data
   *  @param {Object} data.users
   *  @param {Object} data.commenttypes
   *  @param {Object} data.comments
   */
  // Comment AddOn Handlers
  UDATA.HandleMessage('LOAD_COMMENT_DATACORE', MOD.LoadDB);
  /// STATE UPDATES and Message Handlers
  UDATA.HandleMessage('COMMENTS_UPDATE', MOD.HandleCOMMENTS_UPDATE);
  UDATA.HandleMessage('COMMENT_UPDATE', MOD.HandleCOMMENT_UPDATE);
  UDATA.HandleMessage('READBY_UPDATE', MOD.HandleREADBY_UPDATE);
  // Net.Create Handlers
  UDATA.HandleMessage('EDIT_PERMISSIONS_UPDATE', m_UpdatePermissions);

  // Currently not used
  // UDATA.OnAppStateChange('COMMENTCOLLECTION', COMMENTCOLLECTION => console.log('comment-mgr.COMMENTCOLLECTION state updated:', COMMENTCOLLECTION));
  // UDATA.OnAppStateChange('COMMENTVOBJS', COMMENTVOBJS => console.error('comment-mgr.COMMENTVOBJS state updated', COMMENTVOBJS));
}); // end INITIALIZE Hook
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** CONFIGURE fires after LOADASSETS, so this is a good place to put TEMPLATE
 *  validation.
 */
MOD.Hook('CONFIGURE', () => {
  if (DBG) console.log('comment-mgr CONFIGURE');
}); // end CONFIGURE Hook

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** The APP_READY hook is fired after all initialization phases have finished
 *  and may also fire at other times with a valid info packet
 */
MOD.Hook('APP_READY', function (info) {
  if (DBG) console.log('comment-mgr APP_READY');
}); // end APP_READY Hook

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.LoadDB = data => {
  const TEMPLATE = UDATA.AppState('TEMPLATE');
  COMMENT.LoadTemplate(TEMPLATE.commentTypes);
  COMMENT.LoadDB(data);

  // After loading db, derive the view objects
  // This is needed to force update of the project comment count
  const uid = MOD.GetCurrentUserId();
  COMMENT.DeriveAllThreadedViewObjects(uid);
  const COMMENTCOLLECTION = COMMENT.GetCommentCollections();
  UDATA.SetAppState('COMMENTCOLLECTION', COMMENTCOLLECTION);
};

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// From Evan O'Neil https://drive.google.com/drive/folders/1fJ5WiLMVQxxaqghrCOFwegmnYoOvst7E
MOD.COMMENTICON = (
  <g transform="matrix(1.6,0,0,1.6,4,0)">
    <path
      className="svg-fill"
      d="M8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1C4.13401 1 1 4.13401 1 8C1 9.15705 1.28072 10.2485 1.77778 11.21V15H8Z"
    ></path>
    <path
      className="svg-outline"
      d="M3.17778 10.8696V13.6H8C11.0928 13.6 13.6 11.0928 13.6 8C13.6 4.90721 11.0928 2.4 8 2.4C4.90721 2.4 2.4 4.90721 2.4 8C2.4 8.92813 2.62469 9.79968 3.02143 10.5671L3.17778 10.8696ZM15 8C15 11.866 11.866 15 8 15H1.77778V11.21C1.28072 10.2485 1 9.15705 1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8Z"
    ></path>
    <path fill="none" d="M0 0h24v24H0z"></path>
  </g>
);
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SetAppStateCommentCollections() {
  const COMMENTCOLLECTION = COMMENT.GetCommentCollections();
  UDATA.SetAppState('COMMENTCOLLECTION', COMMENTCOLLECTION);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_SetAppStateCommentVObjs() {
  const COMMENTVOBJS = COMMENT.GetCOMMENTVOBJS();
  UDATA.SetAppState('COMMENTVOBJS', COMMENTVOBJS);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_UpdateComment(comment) {
  const cobj = {
    collection_ref: comment.collection_ref,
    comment_id: comment.comment_id,
    comment_id_parent: comment.comment_id_parent,
    comment_id_previous: comment.comment_id_previous,
    comment_type: comment.comment_type,
    comment_createtime: comment.comment_createtime,
    comment_modifytime: comment.comment_modifytime,
    comment_isMarkedDeleted: comment.comment_isMarkedDeleted,
    commenter_id: comment.commenter_id,
    commenter_text: comment.commenter_text
  };
  const uid = MOD.GetCurrentUserId();
  COMMENT.UpdateComment(cobj, uid);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_UpdatePermissions(data) {
  UDATA.NetCall('SRV_GET_EDIT_STATUS').then(data => {
    // disable comment button if someone is editing a comment
    UDATA.LocalCall('COMMENT_UPDATE_PERMISSIONS', data);
  });
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// CONSTANTS
MOD.VIEWMODE = NCUI.VIEWMODE;

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Collection Reference Generators
/// e.g. converts node id to "n32"
MOD.GetNodeCREF = nodeId => `n${nodeId}`;
MOD.GetEdgeCREF = edgeId => `e${edgeId}`;
MOD.GetProjectCREF = projectId => `p${projectId}`;

/// deconstructs "n32" into {type: "n", id: 32}
MOD.DeconstructCREF = cref => {
  const type = cref.substring(0, 1);
  const id = cref.substring(1);
  return { type, id };
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Generate a human friendly label based on the cref (e.g. `n21`, `e4`)
 * e.g. "n32" becomes {typeLabel "Node", sourceLabel: "32"}
 * @param {string} cref
 * @returns { typeLabel, sourceLabel } sourceLabel is undefined if the source has been deleted
 */
MOD.GetCREFSourceLabel = cref => {
  const { type, id } = MOD.DeconstructCREF(cref);
  let typeLabel;
  let node, edge, nodes, sourceNode, targetNode;
  let sourceLabel; // undefined if not found
  switch (type) {
    case 'n':
      typeLabel = 'Node';
      node = UDATA.AppState('NCDATA').nodes.find(n => n.id === Number(id));
      if (!node) break; // node might be missing if comment references a node that was removed
      if (node) sourceLabel = node.label;
      break;
    case 'e':
      typeLabel = 'Edge';
      edge = UDATA.AppState('NCDATA').edges.find(e => e.id === Number(id));
      if (!edge) break; // edge might be missing if the comment references an edge that was removed
      nodes = UDATA.AppState('NCDATA').nodes;
      sourceNode = nodes.find(n => n.id === Number(edge.source));
      targetNode = nodes.find(n => n.id === Number(edge.target));
      if (edge && sourceNode && targetNode)
        sourceLabel = `${sourceNode.label}${ARROW_RIGHT}${targetNode.label}`;
      break;
    case 'p':
      typeLabel = 'Project'; // reserve for future use
      sourceLabel = id;
      break;
  }
  return { typeLabel, sourceLabel };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Returns the position for the comment button
 * Adjusting for window position is done via GetCommentCollectionPosition
 */
MOD.GetCommentBtnPosition = cref => {
  const btn = document.getElementById(cref);
  if (!btn)
    throw new Error(`${PR}GetCommentCollectionPosition: Button not found ${cref}`);
  const bbox = btn.getBoundingClientRect();
  return { x: bbox.left, y: bbox.top };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Returns the comment window position for the comment button
 * shifting the window to the left if it's too close to the edge of the screen.
 * or shifting it up if it's too close to the bottom of the screen.
 * x,y is the position of the comment button, offsets are then caclulated
 */
MOD.GetCommentCollectionPosition = ({ x, y }, isExpanded) => {
  const windowWidth = Math.min(screen.width, window.innerWidth);
  const windowHeight = Math.min(screen.height, window.innerHeight);
  let newX;
  if (windowWidth - x < 500) {
    newX = x - 410;
  } else {
    newX = x + CMTBTNOFFSET * 2;
  }
  let newY = y + window.scrollY;
  if (windowHeight - y < 250) {
    if (isExpanded) newY = y - 250;
    else newY = y - 150;
  } else {
    newY = y - CMTBTNOFFSET;
  }
  return { x: newX, y: newY };
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Open the object that the comment refers to
/// e.g. in Net.Create it's a node or edge object
MOD.OpenReferent = cref => {
  const { type, id } = MOD.DeconstructCREF(cref);
  let edge;
  switch (type) {
    case 'n':
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [parseInt(id)] });
      break;
    case 'e':
      edge = UDATA.AppState('NCDATA').edges.find(e => e.id === Number(id));
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [edge.source] }).then(() => {
        UDATA.LocalCall('EDGE_SELECT', { edgeId: edge.id });
      });
      break;
    case 'p': // reserve for future use
      // do something?
      break;
  }
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Open comment using a comment id
MOD.OpenComment = (cref, cid) => {
  const { type, id } = MOD.DeconstructCREF(cref);
  let edge;
  switch (type) {
    case 'n':
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [parseInt(id)] }).then(() => {
        UDATA.LocalCall('COMMENT_SELECT', { cref }).then(() => {
          const commentEl = document.getElementById(cid);
          commentEl.scrollIntoView({ behavior: 'smooth' });
        });
      });
      break;
    case 'e':
      edge = UDATA.AppState('NCDATA').edges.find(e => e.id === Number(id));
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [edge.source] }).then(() => {
        UDATA.LocalCall('EDGE_SELECT', { edgeId: edge.id }).then(() => {
          UDATA.LocalCall('COMMENT_SELECT', { cref }).then(() => {
            const commentEl = document.getElementById(cid);
            commentEl.scrollIntoView({ behavior: 'smooth' });
          });
        });
      });
      break;
    case 'p': // reserve for future use
      // do something?
      break;
  }
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// User Id
MOD.SetCurrentUserId = uid => (UID = uid);
MOD.GetCurrentUserId = () => UID; // called by other comment classes
MOD.GetUserName = uid => {
  return COMMENT.GetUserName(uid);
};
MOD.IsAdmin = () => {
  return SETTINGS.IsAdmin();
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Comment Type
MOD.GetCommentTypes = () => {
  return COMMENT.GetCommentTypes();
};
MOD.GetCommentType = slug => {
  return COMMENT.GetCommentType(slug);
};
MOD.GetDefaultCommentType = () => {
  return COMMENT.GetDefaultCommentType();
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Global Operations
MOD.MarkAllRead = () => {
  const uid = MOD.GetCurrentUserId();
  const crefs = COMMENT.GetCrefs();
  crefs.forEach(cref => {
    m_DBUpdateReadBy(cref, uid);
    COMMENT.MarkRead(cref, uid);
  });
  COMMENT.DeriveAllThreadedViewObjects(uid);
  m_SetAppStateCommentCollections();
};

/// COMMENT COLLECTIONS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Comment Collections
MOD.GetCommentCollection = uiref => {
  return COMMENT.GetCommentCollection(uiref);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*
  OpenCommentCollection

  The requests come from four sources:
    * Node Editor
    * Edge Editor
    * Node Table
    * Edge Table

  URCommentVBtn is a UI component that passes clicks
  to URCommentCollectionMgr via UR.Publish(`CMT_COLLECTION_SHOW`) calls

  URCommentSVGBtn is a purely visual component that renders SVG buttons
  as symbols and displays the comment count and selection status.
  It pases the click events to URCommentVBtn.

  MAP
    * URCommentStatus
      > URCommentCollectionMgr
        > URCommentThread
          > URCommentVBtn
            > URCommentSVGBtn


  HOW IT WORKS
  When a Node Editor, Edge Editor, Node Table, or Edge Table clicks on the
  URCommentVBtn, URCommentCollectionMgr will:
  * Add the requested Thread to the URCommentCollectionMgr
  * Open the URCommentThread
  * When the URCommentThread is closed, it will be removed from the URCommentCollectionMgr

*/
MOD.OpenCommentCollection = (cref, position) => {
  // Validate
  if (cref === undefined)
    throw new Error(
      `comment-mgr.OpenCommentCollection: missing cref data ${JSON.stringify(cref)}`
    );
  if (position === undefined || position.x === undefined || position.y === undefined)
    throw new Error(
      `comment-mgr.OpenCommentCollection: missing position data ${JSON.stringify(
        position
      )}`
    );
  position.x = parseInt(position.x); // handle net call data
  position.y = parseInt(position.y);
  // 0. If the comment is already open, do nothing
  const openComments = MOD.GetOpenComments(cref);
  if (openComments) {
    MOD.CloseCommentCollection(cref, cref, MOD.GetCurrentUserId());
    return; // already open, close it
  }
  // 1. Position the window to the right of the click
  const commentThreadWindowIsExpanded = MOD.GetCommentCollectionCount(cref);
  const collectionPosition = MOD.GetCommentCollectionPosition(
    position,
    commentThreadWindowIsExpanded
  );

  // 2. Update the state
  MOD.UpdateCommentUIState(cref, { cref, isOpen: true });
  // 3. Open the collection in the collection manager
  UDATA.LocalCall('CMT_COLLECTION_SHOW', { cref, position: collectionPosition });
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Called by URCommentVBtn
 * @param {string} cref
 */
MOD.OpenCommentCollectionByCref = cref => {
  const cmtPosition = MOD.GetCommentBtnPosition(cref);
  MOD.OpenCommentCollection(cref, {
    x: cmtPosition.x + CMTBTNOFFSET,
    y: cmtPosition.y + CMTBTNOFFSET
  });
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Open comment inside a collection using a comment id
/// NOTE this is NOT used by SVGButtons
MOD.OpenCommentStatusComment = (cref, cid) => {
  const { type, id } = MOD.DeconstructCREF(cref);
  let parms;

  // if a comment is being edited...
  // - don't close all comments
  // - don't open a new one
  if (MOD.GetCommentsAreBeingEdited()) {
    UR.Publish('DIALOG_OPEN', {
      text: `Please finish editing your comment before opening a different comment!`
    });
    return;
  }

  MOD.CloseAllCommentCollectionsWithoutMarkingRead();

  let edge;
  switch (type) {
    case 'p': // project (from MEME, currently not used) reserved for future use
      MOD.OpenCommentCollectionByCref('projectcmt');
      break;
    case 'n':
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [parseInt(id)] }).then(() => {
        MOD.OpenCommentCollectionByCref(cref);
        // wait for the comment to open before scrolling to the current comment
        // REVIEW: Do this as a callback?
        //         Problem is that this is a long chain for the callback
        //         - OpenCommentCollectionByCref
        //         - OpenCommentCollection
        //         - UpdateCommentUIState
        //         - m_SetAppStateCommentCollections
        //         - UDATA.SetAppState('COMMENTCOLLECTION)
        setTimeout(() => {
          const commentEl = document.getElementById(cid);
          commentEl.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
      break;
    case 'e':
      edge = UDATA.AppState('NCDATA').edges.find(e => e.id === Number(id));
      UDATA.LocalCall('SOURCE_SELECT', { nodeIDs: [edge.source] }).then(() => {
        UDATA.LocalCall('EDGE_SELECT', { edgeId: edge.id }).then(() => {
          MOD.OpenCommentCollectionByCref(cref);
          // wait for the comment to open before scrolling to the current comment
          // REVIEW: Do this as a callback?
          setTimeout(() => {
            const commentEl = document.getElementById(cid);
            commentEl.scrollIntoView({ behavior: 'smooth' });
          });
        });
      });
      break;
  }
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// DEPRECATED -- URCommentVBtn handles this currently
///               But we might want to restore the ability to toggle in place.
// /**
//  * Used by NCNodeTable and NCEdgeTable to open/close the comment thread
//  * If a comment is already opened by one button (e.g. node), and the user
//  * clicks on another comment button (e.g. NodeTable), the new one will open,
//  * and the old one closed.
//  * Called by URCommentBtn, NCNodeTable, and NCEdgeTable
//  * @param {TCommentUIRef} uiref comment button id
//  * @param {TCollectionRef} cref collection_ref
//  * @param {Object} position x, y position of the comment button
//  */
// MOD.ToggleCommentCollection = (uiref, cref, position) => {
//   const uid = MOD.GetCurrentUserId();
//   // is the comment already open?
//   const open_uiref = MOD.GetOpenComments(cref);
//   if (open_uiref === uiref) {
//     // already opened by THIS uiref, so toggle it closed.
//     MOD.CloseCommentCollection(uiref, cref, uid);
//   } else if (open_uiref !== undefined) {
//     // already opened by SOMEONE ELSE, so close it, then open the new one
//     MOD.CloseCommentCollection(open_uiref, cref, uid);
//     // REVIEW remove uiref?
//     MOD.OpenCommentCollection(uiref, cref, position);
//   } else {
//     // no comment is open, so open the new one
//     // REVIEW remove uiref?
//     MOD.OpenCommentCollection(uiref, cref, position);
//   }
// };
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Marks a comment as read, and closes the component.
 * Called by NCCommentBtn when clicking "Close"
 * @param {Object} uiref comment button id
 * @param {Object} cref collection_ref
 * @param {Object} uid user id
 */
MOD.CloseCommentCollection = (uiref, cref, uid) => {
  if (!MOD.OKtoClose(cref)) {
    // Comment is still being edited, prevent close
    alert(
      'This comment is still being edited!  Please Save or Cancel before closing the comment.'
    );
    return;
  }
  // OK to close
  UDATA.LocalCall('CMT_COLLECTION_HIDE', { cref });
  COMMENT.CloseCommentCollection(uiref, cref, uid);
  m_SetAppStateCommentCollections();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Marks a comment as read, and closes the component.
 * Called by NCCommentBtn when clicking "Close"
 * @param {Object} uiref comment button id (note kept for Net.Create compatibility)
 * @param {Object} cref collection_ref
 * @param {Object} uid user id
 */
MOD.CloseCommentCollectionAndMarkRead = (uiref, cref, uid) => {
  if (!MOD.OKtoClose(cref)) {
    // Comment is still being edited, prevent close
    alert(
      'This comment is still being edited!  Please Save or Cancel before closing the comment.'
    );
    return;
  }
  // OK to close
  UDATA.LocalCall('CMT_COLLECTION_HIDE', { cref });
  // Update the readby
  m_DBUpdateReadBy(cref, uid);
  COMMENT.CloseCommentCollection(uiref, cref, uid);
  m_SetAppStateCommentCollections();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Closes all comment collections without marking them as read.
 * Used by comment status when user clicks on status updates to display
 * updated comments.
 * @param {*} uid
 */
MOD.CloseAllCommentCollectionsWithoutMarkingRead = () => {
  const uid = MOD.GetCurrentUserId();
  UDATA.LocalCall('CMT_COLLECTION_HIDE_ALL');
  COMMENT.CloseAllCommentCollections(uid);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.GetCommentCollectionCount = cref => {
  const ccol = COMMENT.GetCommentCollection(cref);
  return ccol ? ccol.commentCount : '';
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.GetCommentStats = () => {
  const uid = MOD.GetCurrentUserId();
  return COMMENT.GetCommentStats(uid);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.GetCommentThreadPosition = commentButtonId => {
  const btn = document.getElementById(commentButtonId);
  const cmtbtnx = btn.getBoundingClientRect().left;
  const windowWidth = Math.min(screen.width, window.innerWidth);
  let x;
  if (windowWidth - cmtbtnx < 500) {
    x = cmtbtnx - 405;
  } else {
    x = cmtbtnx + 35;
  }
  const y = btn.getBoundingClientRect().top + window.scrollY;
  return { x, y };
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Comment UI State
 * @param {string} uiref
 * @returns {TCommentOpenState} {isOpen: boolean, cref: string}
 */
MOD.GetCommentUIState = uiref => {
  return COMMENT.GetCommentUIState(uiref);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Used to open/close the comment thread
 * @param {string} uiref
 * @param {TCommentOpenState} openState
 */
MOD.UpdateCommentUIState = (uiref, openState) => {
  COMMENT.UpdateCommentUIState(uiref, openState);
  m_SetAppStateCommentCollections();
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Open Comments
MOD.GetOpenComments = cref => COMMENT.GetOpenComments(cref);

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Editable Comments (comments being edited)
MOD.RegisterCommentBeingEdited = cid => {
  COMMENT.RegisterCommentBeingEdited(cid);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.DeRegisterCommentBeingEdited = cid => {
  return COMMENT.DeRegisterCommentBeingEdited(cid);
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Are ANY comments being edited?
/// Returns True if ANY comment is being edited
/// * Used by comment status when user clicks on a comment id to view a saved comment
///   to prevent closing the comment collection if a comment is being edited.
/// * Also used by URCommentThread to determine whether "Click to add" is displayed
MOD.GetCommentsAreBeingEdited = () => {
  return COMMENT.GetCommentsAreBeingEdited();
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.OKtoClose = cref => {
  const cvobjs = MOD.GetThreadedViewObjects(cref);
  let isBeingEdited = false;
  cvobjs.forEach(cvobj => {
    if (COMMENT.GetCommentBeingEdited(cvobj.comment_id)) isBeingEdited = true;
  });
  return !isBeingEdited;
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Threaded View Objects
MOD.GetThreadedViewObjects = (cref, uid) => {
  return COMMENT.GetThreadedViewObjects(cref, uid);
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Comment View Objects
MOD.GetCommentVObj = (cref, cid) => {
  return COMMENT.GetCommentVObj(cref, cid);
};

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Comments
MOD.GetComment = cid => {
  return COMMENT.GetComment(cid);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.GetUnreadRepliesToMe = uid => {
  return COMMENT.GetUnreadRepliesToMe(uid);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.GetUnreadComments = () => {
  return COMMENT.GetUnreadComments();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * @param {Object} cobj Comment Object
 */
MOD.AddComment = cobj => {
  // This just generates a new ID, but doesn't update the DB
  DATASTORE.PromiseNewCommentID().then(newCommentID => {
    cobj.comment_id = newCommentID;
    COMMENT.AddComment(cobj); // creates a comment vobject
    m_SetAppStateCommentVObjs();
  });
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** User clicks Edit on a comment
 *  @param {TCommentID} comment_id
 */
MOD.UIEditComment = comment_id => {
  MOD.RegisterCommentBeingEdited(comment_id);
  MOD.LockComment(comment_id);
  UDATA.NetCall('COMMENT_UPDATE_PERMISSIONS');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** User clicks Cancel on a comment
 *  @param {TCommentID} comment_id
 */
MOD.UICancelComment = comment_id => {
  MOD.DeRegisterCommentBeingEdited(comment_id);
  MOD.UnlockComment(comment_id);
  UDATA.NetCall('COMMENT_UPDATE_PERMISSIONS');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** User clicks Save coment
 *  @param {TComment} cobj
 */
MOD.UISaveComment = cobj => {
  MOD.UnlockComment(cobj.comment_id);
  MOD.DeRegisterCommentBeingEdited(cobj.comment_id);
  MOD.UpdateComment(cobj);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Update the ac/dc comments, then save it to the db
 * This will also broadcast COMMENT_UPDATE so other clients on the network
 * update the data to match the server.
 * @param {Object} cobj
 */
MOD.UpdateComment = cobj => {
  COMMENT.UpdateComment(cobj);
  m_DBUpdateComment(cobj);
  m_SetAppStateCommentVObjs();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Removing a comment can affect multiple comments, so this is done
 * via a batch operation.  We queue up all of the comment changes
 * using the logic for removing/re-arranging the comments in
 * ac-comments/dc-comments, then write out the db updates. This way
 * the db updates can be blindly accomplished in a single operation.
 *
 * Removing is a two step process:
 * 1. Show confirmation dialog
 * 2. Execute the removal
 *
 * Also used by "Cancel" button to remove a comment being edited
 * @param {Object} parms
 * @param {string} parms.collection_ref
 * @param {string} parms.comment_id
 * @param {string} parms.id
 * @param {string} parms.uid
 * @param {boolean} parms.isAdmin
 * @param {boolean} parms.showCancelDialog
 * @param {boolean} parms.skipDialog
 */
MOD.RemoveComment = parms => {
  let confirmMessage, okmessage, cancelmessage;
  if (parms.showCancelDialog) {
    // Are you sure you want to cancel?
    confirmMessage = `Are you sure you want to cancel editing this comment #${parms.id}?`;
    okmessage = 'Cancel Editing and Delete';
    cancelmessage = 'Go Back to Editing';
  } else {
    // show delete confirmaiton dialog
    // Are you sure you want to delete?
    parms.isAdmin = SETTINGS.IsAdmin();
    confirmMessage = parms.isAdmin
      ? `Are you sure you want to delete this comment #${parms.id} and ALL related replies (admin only)?`
      : `Are you sure you want to delete this comment #${parms.id}?`;
    okmessage = 'Delete';
    cancelmessage = "Don't Delete";
  }

  const CMTSTATUS = UDATA.AppState('CMTSTATUS');
  if (parms.skipDialog) {
    m_ExecuteRemoveComment(event, parms);
  } else {
    CMTSTATUS.dialog = {
      isOpen: true,
      message: confirmMessage,
      okmessage,
      onOK: event => m_ExecuteRemoveComment(event, parms),
      cancelmessage,
      onCancel: m_CloseRemoveCommentDialog
    };
  }
  UDATA.SetAppState('CMTSTATUS', CMTSTATUS);

  MOD.DeRegisterCommentBeingEdited(parms.comment_id);
  MOD.UnlockComment(parms.comment_id);

  UDATA.LocalCall('COMMENT_UPDATE_PERMISSIONS');
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * The db call is made AFTER ac/dc handles the removal and the logic of
 * relinking comments.  The db call is dumb, all the logic is in dc-comments.
 * @param {Object} event
 * @param {Object} parms
 * @param {Object} parms.collection_ref
 * @param {Object} parms.comment_id
 * @param {Object} parms.uid
 */
function m_ExecuteRemoveComment(event, parms, cb) {
  const queuedActions = COMMENT.RemoveComment(parms);
  m_DBRemoveComment(queuedActions);
  m_SetAppStateCommentVObjs();
  m_CloseRemoveCommentDialog();
  if (typeof cb === 'function') cb();
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_CloseRemoveCommentDialog() {
  const CMTSTATUS = UDATA.AppState('CMTSTATUS');
  CMTSTATUS.dialog = { isOpen: false };
  UDATA.SetAppState('CMTSTATUS', CMTSTATUS);
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Requested when a node/edge is deleted
 * @param {string} cref
 */
MOD.RemoveAllCommentsForCref = cref => {
  const uid = MOD.GetCurrentUserId();
  const parms = { uid, collection_ref: cref };
  const queuedActions = COMMENT.RemoveAllCommentsForCref(parms);
  m_DBRemoveComment(queuedActions);
  m_SetAppStateCommentVObjs();
};

/// EVENT HANDLERS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Respond to network COMMENTS_UPDATE Messages
 * Usually used after a comment deletion to handle a batch of comment updates
 * This can include
 *   * updates to existing comments (marked DELETE or re-linked to other removed comment)
 *   * removal of comment altogether
 * This a network call that is used to update local state for other browsers
 * (does not trigger another DB update)
 * @param {Object[]} dataArray
 */
MOD.HandleCOMMENTS_UPDATE = dataArray => {
  if (DBG) console.log('COMMENTS_UPDATE======================', dataArray);
  const updatedComments = [];
  const removedComments = [];
  const updatedCrefs = new Map();
  dataArray.forEach(data => {
    if (data.comment) {
      updatedComments.push(data.comment);
      updatedCrefs.set(data.comment.collection_ref, 'flag');
    }
    if (data.commentID) removedComments.push(data.commentID);
    if (data.collection_ref) updatedCrefs.set(data.collection_ref, 'flag');
  });
  const uid = MOD.GetCurrentUserId();
  COMMENT.HandleRemovedComments(removedComments, uid);
  COMMENT.HandleUpdatedComments(updatedComments, uid);

  const crefs = [...updatedCrefs.keys()];
  crefs.forEach(cref => COMMENT.DeriveThreadedViewObjects(cref, uid));

  // and broadcast a state change
  m_SetAppStateCommentCollections();
  m_SetAppStateCommentVObjs();
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Respond to COMMENT_UPDATE Messages from the network
 * After the server/db saves the new/updated comment, COMMENT_UPDATE is
 * broadcast across the network.  This a network call that is used to update
 * the local state to match the server's comments.
 * (does not trigger another DB update)
 * @param {Object} data
 * @param {Object} data.comment cobj
 */
MOD.HandleCOMMENT_UPDATE = data => {
  if (DBG) console.log('COMMENT_UPDATE======================', data);

  // If a new comment is sent over the network
  // and the incoming comment conflicts with a comment being edited
  // then re-link the editing comment to point to the incoming comment

  const { comment: incomingComment } = data;
  const editingCommentId = COMMENT.GetCommentsBeingEdited().values().next().value;
  const editingComment = COMMENT.GetComment(editingCommentId);

  if (editingComment) {
    // conflict if both think they're the root
    if (
      incomingComment.comment_id_parent === '' &&
      incomingComment.comment_id_previous === '' &&
      editingComment.comment_id_parent === '' &&
      editingComment.comment_id_previous === ''
    ) {
      if (DBG) console.error('CONFLICT! both think they are root');
      // Re-link the comment to the incoming
      editingComment.comment_id_previous = incomingComment.comment_id;
    }
    // conflict if previous of both are the same
    if (incomingComment.comment_id_previous === editingComment.comment_id_previous) {
      if (DBG) console.error('CONFLICT! both think they are reply to same previous');
      // Re-link the comment to the incoming
      editingComment.comment_id_previous = incomingComment.comment_id;
    }
    // conflict if parent of both are the same and previous are blank (new reply root)
    if (
      incomingComment.comment_id_parent === editingComment.comment_id_parent &&
      incomingComment.comment_id_previous === '' &&
      editingComment.comment_id_previous === ''
    ) {
      if (DBG) console.error('CONFLICT! both think they are reply to same parent');
      // Re-link the comment to the incoming
      editingComment.comment_id_previous = incomingComment.comment_id;
    }
  }

  const updatedComments = [{ comment: incomingComment }, { comment: editingComment }];
  MOD.HandleCOMMENTS_UPDATE(updatedComments);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.HandleREADBY_UPDATE = data => {
  if (DBG) console.log('READBY_UPDATE======================');
  // Not used currently
  // Use this if we need to update READBY status from another user.
  // Since "read" status is only displayed for the current user,
  // we don't need to worry about "read" status updates from other users
  // across the network.
  //
  // The exception to this would be if we wanted to support a single user
  // logged in to multiple browsers.
};

/// DB CALLS //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.LockComment = comment_id => {
  UDATA.NetCall('SRV_DBLOCKCOMMENT', { commentID: comment_id }).then(() => {
    UDATA.NetCall('SRV_REQ_EDIT_LOCK', { editor: EDITORTYPE.COMMENT });
    UDATA.LocalCall('SELECTMGR_SET_MODE', { mode: 'comment_edit' });
  });
};
MOD.UnlockComment = comment_id => {
  UDATA.NetCall('SRV_DBUNLOCKCOMMENT', { commentID: comment_id }).then(() => {
    UDATA.NetCall('SRV_RELEASE_EDIT_LOCK', { editor: EDITORTYPE.COMMENT });
    UDATA.LocalCall('SELECTMGR_SET_MODE', { mode: 'normal' });
  });
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_DBUpdateComment(cobj, cb) {
  const comment = {
    collection_ref: cobj.collection_ref,
    comment_id: cobj.comment_id,
    comment_id_parent: cobj.comment_id_parent,
    comment_id_previous: cobj.comment_id_previous,
    comment_type: cobj.comment_type,
    comment_createtime: cobj.comment_createtime,
    comment_modifytime: cobj.comment_modifytime,
    comment_isMarkedDeleted: cobj.comment_isMarkedDeleted,
    commenter_id: cobj.commenter_id,
    commenter_text: cobj.commenter_text
  };
  UDATA.LocalCall('DB_UPDATE', { comment }).then(data => {
    if (typeof cb === 'function') cb(data);
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_DBUpdateReadBy(cref, uid) {
  // Get existing readby
  const cvobjs = COMMENT.GetThreadedViewObjects(cref, uid);
  const readbys = [];
  cvobjs.forEach(cvobj => {
    const commenter_ids = COMMENT.GetReadby(cvobj.comment_id) || [];
    // Add uid if it's not already marked
    if (!commenter_ids.includes(uid)) commenter_ids.push(uid);
    const readby = {
      comment_id: cvobj.comment_id,
      commenter_ids
    };
    readbys.push(readby);
  });
  UDATA.LocalCall('DB_UPDATE', { readbys }).then(data => {
    if (typeof cb === 'function') cb(data);
  });
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Executes multiple database operations via a batch of commands:
 * - `cobjs` will be updated
 * - `commentIDs` will be deleted
 * @param {Object[]} items [ ...cobj, ...commentID ]
 * @param {function} cb callback
 */
function m_DBRemoveComment(items, cb) {
  UDATA.LocalCall('DB_BATCHUPDATE', { items }).then(data => {
    if (typeof cb === 'function') cb(data);
  });
}

/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = MOD;
