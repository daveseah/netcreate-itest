/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ac-comments
  
  App Core
  
  Methods
  

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import DCCOMMENTS from './dc-comment.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;

const COMMENTVOBJS = new Map();

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Init() {
  console.log('ac-comments Init');
  DCCOMMENTS.Init();
}

/**
 *  @param {number} ms
 *  @returns string "MM/DD/YY, HH:MM:SS: PM"
 */
function GetDateString(ms) {
  return new Date(ms).toLocaleString();
}

/**
 * Returns flat array of comment view objects
 * @param {string} cref collection_ref id
 * @returns commentVOjb[]
 */
function m_DeriveThreadedViewObjects(cref) {
  const commentVObjs = [];
  const threadIds = DCCOMMENTS.GetThreadedCommentIds(cref);
  threadIds.forEach(cid => {
    const comment = DCCOMMENTS.GetComment(cid);
    if (comment === undefined)
      console.error('GetThreadedViewObjects for cid not found', cid, 'in', threadIds);
    const level = comment.comment_id_parent === '' ? 0 : 1;
    commentVObjs.push({
      comment_id: cid,
      createtime_string: GetDateString(comment.comment_createtime),
      modifytime_string: comment.comment_modifytime
        ? GetDateString(comment.comment_modifytime)
        : '',
      level,
      isSelected: false,
      isBeingEdited: false,
      isEditable: false,
      allowReply: undefined // will be defined next
    });

    const meta = {
      isVisible: false,
      hasUnreadComments: false,
      hasReadComments: true
    };
  });

  // Figure out which comment can add a reply
  // only the last comment in a thread is allowed to reply
  const reversedCommentVObjs = commentVObjs.reverse();
  const commentReplyVObj = [];
  let prevLevel = -1;
  reversedCommentVObjs.forEach(cvobj => {
    if (cvobj.level > prevLevel) cvobj.allowReply = true;
    commentReplyVObj.push(cvobj);
    prevLevel = cvobj.level;
  });

  COMMENTVOBJS.set(cref, commentReplyVObj.reverse());
  return commentReplyVObj;
}

function GetThreadedViewObjects(cref) {
  const commentVObjs = COMMENTVOBJS.get(cref);
  return commentVObjs === undefined
    ? m_DeriveThreadedViewObjects(cref)
    : commentVObjs;
}

function GetCommentVObj(cref, cid) {
  console.log('COMMENTVOBJS', cref, cid, JSON.stringify(COMMENTVOBJS));
  const thread = COMMENTVOBJS.get(cref);
  const comment = thread.find(c => c.comment_id === cid);
  return comment;
}

/**
 * Add a new comment and trigger COMMENTVOBJS state change
 * @param {Object} data
 * @param {Object} data.cref // collection_ref
 * @param {Object} data.comment_id_parent
 * @param {Object} data.comment_id_previous
 * @returns commentObject
 */
function AddComment(data) {
  if (data.cref === undefined)
    throw new Error('Comments must have a collection ref!');

  const comment = DCCOMMENTS.AddComment(data);
  m_DeriveThreadedViewObjects(data.cref);

  // Make it editable
  let commentVObjs = GetThreadedViewObjects(data.cref);
  const cvobj = GetCommentVObj(comment.collection_ref, comment.comment_id);
  cvobj.isBeingEdited = true;
  commentVObjs = commentVObjs.map(c =>
    c.comment_id === cvobj.comment_id ? cvobj : c
  );
  COMMENTVOBJS.set(data.cref, commentVObjs);

  return comment;
}

function RemoveComment(cid) {
  DCCOMMENTS.RemoveComment(cid);
}

/**
 *
 * @param {Object} cobj commentObject
 */
function UpdateComment(cobj) {
  DCCOMMENTS.UpdateComment(cobj);

  // Disable editable and update modify time
  let commentVObjs = GetThreadedViewObjects(cobj.collection_ref);
  const cvobj = GetCommentVObj(cobj.collection_ref, cobj.comment_id);
  cvobj.isBeingEdited = false;
  cvobj.modifytime_string = GetDateString(cobj.comment_modifytime);
  console.log('......cvobj.modifytime_string', cvobj.modifytime_string);
  commentVObjs = commentVObjs.map(c =>
    c.comment_id === cvobj.comment_id ? cvobj : c
  );
  COMMENTVOBJS.set(cobj.collection_ref, commentVObjs);
  console.log('........COMMENTVOBJS', COMMENTVOBJS);
}

/// PASS-THROUGH METHODS //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetUserName(uid) {
  return DCCOMMENTS.GetUserName(uid);
}
function GetCommentTypes() {
  return DCCOMMENTS.GetCommentTypes();
}
function GetComment(cid) {
  return DCCOMMENTS.GetComment(cid);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  Init,
  GetDateString,
  GetThreadedViewObjects,
  GetCommentVObj,
  AddComment,
  RemoveComment,
  UpdateComment,
  // PASS THROUGH
  GetUserName,
  GetCommentTypes,
  GetComment
};
