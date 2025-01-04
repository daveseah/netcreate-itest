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
  COMMENT.LoadTemplate(TEMPLATE.COMMENTTYPES);
  COMMENT.LoadDB(data);
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

function m_SetAppStateCommentCollections() {
  const COMMENTCOLLECTION = COMMENT.GetCommentCollections();
  UDATA.SetAppState('COMMENTCOLLECTION', COMMENTCOLLECTION);
}

function m_SetAppStateCommentVObjs() {
  const COMMENTVOBJS = COMMENT.GetCOMMENTVOBJS();
  UDATA.SetAppState('COMMENTVOBJS', COMMENTVOBJS);
}

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

function m_UpdatePermissions(data) {
  UDATA.NetCall('SRV_GET_EDIT_STATUS').then(data => {
    // disable comment button if someone is editing a comment
    UDATA.LocalCall('COMMENT_UPDATE_PERMISSIONS', data);
  });
}
/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

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
      typeLabel = 'Project';
      sourceLabel = id;
      break;
  }
  return { typeLabel, sourceLabel };
};

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
    case 'p':
      // do something?
      break;
  }
};

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
    case 'p':
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

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Comment Collections
MOD.GetCommentCollection = uiref => {
  return COMMENT.GetCommentCollection(uiref);
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.OpenCommentCollection = (uiref, cref, position) => {
  MOD.UpdateCommentUIState(uiref, { cref, isOpen: true });
  UDATA.LocalCall('CTHREADMGR_THREAD_OPENED', { uiref, cref, position });
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/**
 * Used by NCNodeTable and NCEdgeTable to open/close the comment thread
 * If a comment is already opened by one button (e.g. node), and the user
 * clicks on another comment button (e.g. NodeTable), the new one will open,
 * and the old one closed.
 * Called by URCommentBtn, NCNodeTable, and NCEdgeTable
 * @param {TCommentUIRef} uiref comment button id
 * @param {TCollectionRef} cref collection_ref
 * @param {Object} position x, y position of the comment button
 */
MOD.ToggleCommentCollection = (uiref, cref, position) => {
  const uid = MOD.GetCurrentUserId();
  // is the comment already open?
  const open_uiref = MOD.GetOpenComments(cref);
  if (open_uiref === uiref) {
    // already opened by THIS uiref, so toggle it closed.
    MOD.CloseCommentCollection(uiref, cref, uid);
  } else if (open_uiref !== undefined) {
    // already opened by SOMEONE ELSE, so close it, then open the new one
    MOD.CloseCommentCollection(open_uiref, cref, uid);
    MOD.OpenCommentCollection(uiref, cref, position);
  } else {
    // no comment is open, so open the new one
    MOD.OpenCommentCollection(uiref, cref, position);
  }
};
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
  m_DBUpdateReadBy(cref, uid);
  COMMENT.CloseCommentCollection(uiref, cref, uid);
  m_SetAppStateCommentCollections();
  // call to broadcast state AFTER derived state changes
  UDATA.LocalCall('CTHREADMGR_THREAD_CLOSED', { cref });
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
MOD.DeRegisterCommentBeingEdited = cid => {
  return COMMENT.DeRegisterCommentBeingEdited(cid);
};

/// Are ANY comments being edited?
/// Returns True if ANY comment is being edited
/// * Used by comment status when user clicks on a comment id to view a saved comment
///   to prevent closing the comment collection if a comment is being edited.
/// * Also used by URCommentThread to determine whether "Click to add" is displayed
MOD.GetCommentsAreBeingEdited = () => {
  return COMMENT.GetCommentsAreBeingEdited();
};

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
MOD.GetUnreadRepliesToMe = uid => {
  return COMMENT.GetUnreadRepliesToMe(uid);
};
MOD.GetUnreadComments = () => {
  return COMMENT.GetUnreadComments();
};
/**
 *
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
/**
 * Removing a comment can affect multiple comments, so this is done
 * via a batch operation.  We queue up all of the comment changes
 * using the logic for removing/re-arranging the comments in
 * ac-comments/dc-comments, then write out the db updates. This way
 * the db updates can be blindly accomplished in a single operation.
 *
 * Removing is a two step process:
 * 1. Show confirmation dialog
 * 2. Execute the remova
 * @param {Object} parms
 * @param {string} parms.collection_ref
 * @param {string} parms.comment_id
 * @param {string} parms.uid
 * @param {boolean} parms.showCancelDialog
 * @param {function} cb CallBack
 */
MOD.RemoveComment = (parms, cb) => {
  let confirmMessage, okmessage, cancelmessage;
  if (parms.showCancelDialog) {
    // Are you sure you want to cancel?
    confirmMessage = `Are you sure you want to cancel editing this comment #${parms.comment_id}?`;
    okmessage = 'Cancel Editing and Delete';
    cancelmessage = 'Go Back to Editing';
  } else {
    // Are you sure you want to delete?
    parms.isAdmin = SETTINGS.IsAdmin();
    confirmMessage = parms.isAdmin
      ? `Are you sure you want to delete this comment #${parms.comment_id} and ALL related replies (admin only)?`
      : `Are you sure you want to delete this comment #${parms.comment_id}?`;
    okmessage = 'Delete';
    cancelmessage = "Don't Delete";
  }
  const dialog = (
    <NCDialog
      message={confirmMessage}
      okmessage={okmessage}
      onOK={event => m_ExecuteRemoveComment(event, parms, cb)}
      cancelmessage={cancelmessage}
      onCancel={m_CloseRemoveCommentDialog}
    />
  );
  const container = document.getElementById(dialogContainerId);
  ReactDOM.render(dialog, container);
};
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
function m_CloseRemoveCommentDialog() {
  const container = document.getElementById(dialogContainerId);
  ReactDOM.unmountComponentAtNode(container);
}

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
  const { comment } = data;
  m_UpdateComment(comment);
  // and broadcast a state change
  m_SetAppStateCommentCollections();
  m_SetAppStateCommentVObjs();
};
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
