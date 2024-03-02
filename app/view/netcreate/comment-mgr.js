/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  COMMENT MANAGER

  See UR ADDONS / Comment


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const { COMMENT } = require('@ursys/addons');
const DATASTORE = require('system/datastore');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const PR = 'comment-mgr: ';

/// INITIALIZE MODULE /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let MOD = UNISYS.NewModule(module.id);
let UDATA = UNISYS.NewDataLink(MOD);

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
  UDATA.HandleMessage('LOAD_COMMENT_DATACORE', data => {
    COMMENT.LoadDB(data);
  });
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


/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

MOD.COMMENTICON = (
  <svg id="comment-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42">
    <path
      d="M21,0C9.4,0,0,9.4,0,21c0,4.12,1.21,7.96,3.26,11.2l-2.26,9.8,11.56-1.78c2.58,1.14,5.44,1.78,8.44,1.78,11.6,0,21-9.4,21-21S32.6,0,21,0Z"
    />
  </svg>
);

function m_UpdateStateCommentCollections() {
  const COMMENTCOLLECTION = COMMENT.GetCommentCollections();
  UDATA.SetAppState('COMMENTCOLLECTION', COMMENTCOLLECTION);
}

function m_UpdateStateCommentVObjs() {
  const COMMENTVOBJS = COMMENT.GetCOMMENTVOBJS();
  UDATA.SetAppState('COMMENTVOBJS', COMMENTVOBJS);
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// Collection Reference Generators
MOD.GetNodeCREF = nodeId => `n${nodeId}`;
MOD.GetEdgeCREF = edgeId => `e${edgeId}`;
MOD.GetProjectCREF = projectId => `p${projectId}`;

MOD.GetCurrentUserId = () => {
  const session = UDATA.AppState('SESSION');
  const uid = session.token;
  return uid;
}

MOD.GetUserName = (uid) => {
  return COMMENT.GetUserName(uid);
}

MOD.GetCommentCollection = (cref) => {
  return COMMENT.GetCommentCollection(cref);
}

/**
 *
 * @param {Object} ccol CommentCollection
 */
MOD.UpdateCommentCollection = (ccol) => {
  COMMENT.UpdateCommentCollection(ccol);
  m_UpdateStateCommentCollections();
}

/**
 * Marks a comment as read, and closes the component.
 * @param {Object} cref collection_ref
 */
MOD.CloseCommentCollection = (cref, uid) => {
  m_DBUpdateReadBy(cref, uid);
  COMMENT.CloseCommentCollection(cref, uid);
  m_UpdateStateCommentCollections();
}

MOD.GetCommentTypes = () => {
  return COMMENT.GetCommentTypes();
}

MOD.GetComment = (cid) => {
  return COMMENT.GetComment(cid);
}

MOD.GetThreadedViewObjects = (cref, uid) => {
  return COMMENT.GetThreadedViewObjects(cref, uid);
}

MOD.GetThreadedViewObjectsCount = (cref, uid) => {
  return COMMENT.GetThreadedViewObjectsCount(cref, uid);
}

MOD.GetCommentVObj = (cref, cid) => {
  return COMMENT.GetCommentVObj(cref, cid);
}

/**
 *
 * @param {Object} cobj Comment Object
 */
MOD.AddComment = (cobj) => {
  // This just generates a new ID, but doesn't update the DB
  DATASTORE.PromiseNewCommentID().then(newCommentID => {
    cobj.comment_id = newCommentID;
    COMMENT.AddComment(cobj); // creates a comment vobject
    m_UpdateStateCommentVObjs();
  });

}

MOD.UpdateComment = (cobj) => {
  m_DBUpdateComment(cobj);
  COMMENT.UpdateComment(cobj);
  m_UpdateStateCommentVObjs();
}

MOD.RemoveComment = (cid) => {
  COMMENT.RemoveComment(cid);
  m_UpdateStateCommentVObjs();
}

MOD.UpdateComment = (cobj) => {
  m_DBUpdateComment(cobj);
  COMMENT.UpdateComment(cobj);
  m_UpdateStateCommentVObjs();
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// DB Calls

function m_DBUpdateComment(cobj, cb) {
  const comment = {
    collection_ref: cobj.collection_ref,
    comment_id: cobj.comment_id,
    comment_id_parent: cobj.comment_id_parent,
    comment_id_previous: cobj.comment_id_previous,
    comment_type: cobj.comment_type,
    comment_createtime: cobj.comment_createtime,
    comment_modifytime: cobj.comment_modifytime,
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
  })
  UDATA.LocalCall('DB_UPDATE', { readbys }).then(data => {
    if (typeof cb === 'function') cb(data);
  });
}

/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = MOD;
