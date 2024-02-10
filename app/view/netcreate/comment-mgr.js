/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  COMMENT MANAGER

  <NCCommentThread>
    ...
    <NCComment>
  </NCCommentThread>

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const UNISYS = require('unisys/client');
const { COMMENT } = require('@ursys/addons');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const PR = 'comment-mgr: ';

/// INITIALIZE MODULE /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let MOD = UNISYS.NewModule(module.id);
let UDATA = UNISYS.NewDataLink(MOD);

COMMENT.Init();

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function m_UpdateCommentCollectionsState() {
  const COMMENTCOLLECTION = COMMENT.GetCommentCollections();
  UDATA.SetAppState('COMMENTCOLLECTION', COMMENTCOLLECTION);
}

function m_UpdateCommentVObjsState() {
  const COMMENTVOBJS = COMMENT.GetThreadedViewObjects();
  UDATA.SetAppState('COMMENTVOBJS', COMMENTVOBJS);
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

MOD.GetCommentCollection = (cref) => {
  return COMMENT.GetCommentCollection(cref);
}

/**
 *
 * @param {Object} ccol CommentCollection
 */
MOD.UpdateCommentCollection = (ccol) => {
  COMMENT.UpdateCommentCollection(ccol);
  m_UpdateCommentCollectionsState();
}

/**
 * Marks a comment as read, and closes the component.
 * @param {Object} cref collection_ref
 */
MOD.CloseCommentCollection = (cref, uid) => {
  COMMENT.CloseCommentCollection(cref, uid);
  m_UpdateCommentCollectionsState();
}

MOD.GetUserName = (uid) => {
  return COMMENT.GetUserName(uid);
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

MOD.GetCommentVObj = (cref, cid) => {
  return COMMENT.GetCommentVObj(cref, cid);
}

MOD.AddComment = (cobj) => {
  COMMENT.AddComment(cobj);
  m_UpdateCommentVObjsState();
}

MOD.RemoveComment = (cid) => {
  COMMENT.RemoveComment(cid);
  m_UpdateCommentVObjsState();
}

MOD.UpdateComment = (cobj) => {
  COMMENT.UpdateComment(cobj);
  m_UpdateCommentVObjsState();
}

/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = MOD;
