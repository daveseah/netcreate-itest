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

function m_UpdateCommentVObjs() {
  const COMMENTVOBJS = COMMENT.GetThreadedViewObjects();
  UDATA.SetAppState('COMMENTVOBJS', COMMENTVOBJS);
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

MOD.GetUserName = (uid) => {
  return COMMENT.GetUserName(uid);
}

MOD.GetCommentTypes = () => {
  return COMMENT.GetCommentTypes();
}

MOD.GetComment = (cid) => {
  return COMMENT.GetComment(cid);
}

MOD.GetThreadedViewObjects = (cref) => {
  return COMMENT.GetThreadedViewObjects(cref);
}

MOD.GetCommentVObj = (cref, cid) => {
  return COMMENT.GetCommentVObj(cref, cid);
}

MOD.AddComment = (cobj) => {
  COMMENT.AddComment(cobj);
  m_UpdateCommentVObjs();
}

MOD.RemoveComment = (cid) => {
  COMMENT.RemoveComment(cid);
  m_UpdateCommentVObjs();
}

MOD.UpdateComment = (cobj) => {
  COMMENT.UpdateComment(cobj);
  m_UpdateCommentVObjs();
}

/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = MOD;
