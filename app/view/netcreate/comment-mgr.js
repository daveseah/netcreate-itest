/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  COMMENT MANAGER

  <NCCommentThread>
    ...
    <NCComment>
  </NCCommentThread>

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
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

MOD.COMMENTICON = (
  <svg id="comment-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 42">
    <path
      d="M21,0C9.4,0,0,9.4,0,21c0,4.12,1.21,7.96,3.26,11.2l-2.26,9.8,11.56-1.78c2.58,1.14,5.44,1.78,8.44,1.78,11.6,0,21-9.4,21-21S32.6,0,21,0Z"
    />
  </svg>
);

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
