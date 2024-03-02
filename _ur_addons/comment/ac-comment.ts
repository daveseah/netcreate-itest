/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ac-comments
  
  App Core Comments
  
  DATA
  
    COMMENTCOLLECTION
    -----------------
    A COMENTCOLLECTION is the main data source for the CommentBtn.
    It primarily shows summary information for the three states of the button:
    * has no comments
    * has unread comments
    * has read comments
    It passes on the collection_ref to the CommentThread components.
    
      interface CommentCollection {
        collection_ref: any;
        hasUnreadComments: boolean;
        hasReadComments: boolean;
        isOpen: boolean;
      }
    
    COMMENTVOBJS
    ------------
    COMMENTVOBJS are a flat array of data sources for CommentThread ojects.
    It handles the UI view state of the each comment in the thread.
    
      interface CommentVObj {
        comment_id: any;
        
        createtime_string: string;
        modifytime_string: string;
        
        level: number;
        
        isSelected: boolean;
        isBeingEdited: boolean;
        isEditable: boolean;
        isMarkedRead: boolean;
        allowReply: boolean;
        
        markedRead: boolean;
      }

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import DCCOMMENTS from './dc-comment.ts';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;

const COMMENTCOLLECTION = new Map();
const COMMENTVOBJS = new Map();

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Init() {
  if (DBG) console.log('ac-comments Init');
  DCCOMMENTS.Init();
}

function LoadDB(data) {
  DCCOMMENTS.LoadDB(data);
}

/**
 *  @param {number} ms
 *  @returns string "MM/DD/YY, HH:MM:SS: PM"
 */
function GetDateString(ms) {
  return new Date(ms).toLocaleString();
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// COMMENT COLLECTIONS

function GetCommentCollections() {
  return COMMENTCOLLECTION;
}

function GetCommentCollection(cref) {
  const collection = COMMENTCOLLECTION.get(cref);
  return collection;
}

function UpdateCommentCollection(updatedCCol) {
  const ccol = COMMENTCOLLECTION.get(updatedCCol.cref);
  ccol.isOpen = updatedCCol.isOpen;
  COMMENTCOLLECTION.set(ccol.cref, ccol);
}

function CloseCommentCollection(cref, uid) {
  const ccol = COMMENTCOLLECTION.get(cref);
  ccol.isOpen = false;
  COMMENTCOLLECTION.set(ccol.cref, ccol);
  // Mark Read
  const commentVObjs = COMMENTVOBJS.get(cref);
  commentVObjs.forEach(c => DCCOMMENTS.MarkCommentRead(c.comment_id, uid));
  // Update Derived Lists to update Marked status
  m_DeriveThreadedViewObjects(cref, uid);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// COMMENT THREAD VIEW OBJECTS

/**
 * Returns flat array of comment view objects
 * @param {string} cref collection_ref id
 * @returns commentVOjb[]
 */
function m_DeriveThreadedViewObjects(cref, uid) {
  if (cref === undefined)
    throw new Error(`m_DeriveThreadedViewObjects cref: "${cref}" must be defined!`);
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
      isMarkedRead: DCCOMMENTS.IsMarkedRead(cid, uid),
      allowReply: undefined // will be defined next
    });
  });

  // Figure out which comment can add a reply:
  // * any top level comment or
  // * for threads, only the last comment in a thread is allowed to reply
  const reversedCommentVObjs = commentVObjs.reverse();
  const commentReplyVObj = [];
  let prevLevel = -1;
  reversedCommentVObjs.forEach(cvobj => {
    if (
      (cvobj.level === 0 && cvobj.level >= prevLevel) || // is top level without a reply thread
      cvobj.level > prevLevel // or is a thread
    )
      cvobj.allowReply = true;
    commentReplyVObj.push(cvobj);
    prevLevel = cvobj.level;
  });
  COMMENTVOBJS.set(cref, commentReplyVObj.reverse());

  // Derive COMMENTCOLLECTION
  const hasReadComments = commentReplyVObj.length > 0;
  let hasUnreadComments = false;
  commentReplyVObj.forEach(c => {
    if (!c.isMarkedRead) hasUnreadComments = true;
  });
  const ccol = {
    collection_ref: cref,
    hasUnreadComments,
    hasReadComments,
    isOpen: false
  };
  COMMENTCOLLECTION.set(cref, ccol);
  return commentReplyVObj;
}

/**
 *  @param {string} cref
 *  @param {string} uid -- User ID is needed to determine read/unread status
 */
function GetThreadedViewObjects(cref, uid) {
  const commentVObjs = COMMENTVOBJS.get(cref);
  return commentVObjs === undefined
    ? m_DeriveThreadedViewObjects(cref, uid)
    : commentVObjs;
}

/**
 *  @param {string} cref
 *  @param {string} uid -- User ID is needed to determine read/unread status
 */
function GetThreadedViewObjectsCount(cref, uid) {
  return GetThreadedViewObjects(cref, uid).length;
}

function GetCOMMENTVOBJS() {
  return COMMENTVOBJS;
}

function GetCommentVObj(cref, cid) {
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
 * @param {Object} data.commenter_id
 * @returns commentObject
 */
function AddComment(data) {
  if (data.cref === undefined)
    throw new Error('Comments must have a collection ref!');

  const comment = DCCOMMENTS.AddComment(data);
  m_DeriveThreadedViewObjects(data.cref, data.commenter_id);

  // Make it editable
  let commentVObjs = GetThreadedViewObjects(data.cref, data.commenter_id);
  const cvobj = GetCommentVObj(comment.collection_ref, comment.comment_id);
  if (cvobj === undefined)
    console.error(
      'ac-comment:Could not find CommentVObj',
      comment.collection_ref,
      comment.comment_id,
      COMMENTVOBJS
    );
  cvobj.isBeingEdited = true;
  commentVObjs = commentVObjs.map(c =>
    c.comment_id === cvobj.comment_id ? cvobj : c
  );
  COMMENTVOBJS.set(data.cref, commentVObjs);

  // Mark it Open
  let ccol = GetCommentCollection(data.cref);
  ccol.isOpen = true;
  COMMENTCOLLECTION.set(data.cref, ccol);

  return comment;
}

/**
 *
 * @param {Object} cobj commentObject
 */
function UpdateComment(cobj) {
  if (cobj.collection_ref === undefined)
    throw new Error('UpdateComment cref is undefined', cobj);
  DCCOMMENTS.UpdateComment(cobj);

  // Disable editable and update modify time
  let commentVObjs = GetThreadedViewObjects(cobj.collection_ref, cobj.commenter_id);
  const cvobj = GetCommentVObj(cobj.collection_ref, cobj.comment_id);
  cvobj.isBeingEdited = false;
  cvobj.modifytime_string = GetDateString(cobj.comment_modifytime);
  commentVObjs = commentVObjs.map(c =>
    c.comment_id === cvobj.comment_id ? cvobj : c
  );
  COMMENTVOBJS.set(cobj.collection_ref, commentVObjs);
}

function RemoveComment(cid) {
  DCCOMMENTS.RemoveComment(cid);
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
function GetReadby(cid) {
  return DCCOMMENTS.GetReadby(cid);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export {
  Init,
  // DB
  LoadDB,
  GetDateString,
  // Comment Collection
  GetCommentCollections,
  GetCommentCollection,
  UpdateCommentCollection,
  CloseCommentCollection,
  // Comment Thread View Object
  GetThreadedViewObjects,
  GetThreadedViewObjectsCount,
  GetCOMMENTVOBJS,
  GetCommentVObj,
  AddComment,
  RemoveComment,
  UpdateComment,
  // PASS THROUGH
  GetUserName,
  GetCommentTypes,
  GetComment,
  GetReadby
};
