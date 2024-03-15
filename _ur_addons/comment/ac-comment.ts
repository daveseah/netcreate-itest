/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  ac-comments
  
  App Core Comments
  
  DATA
  
    COMMENTCOLLECTION ccol
    -----------------
    A COMENTCOLLECTION is the main data source for the CommentBtn.
    It primarily shows summary information for the three states of the button:
    * has no comments
    * has unread comments
    * has read comments
    It passes on the collection_ref to the CommentThread components.
    
      interface CommentCollection {
        cref: any; // collection_ref
        hasUnreadComments: boolean;
        hasReadComments: boolean;
      }

      
    COMMENTUISTATE cui
    --------------
    A COMMENTUISTATE object can be opened and closed from multiple UI elements.
    COMMENTUI keeps track of the `isOpen` status based on the UI element.
    e.g. a comment button in a node can open a comment but the same comment can
    be opeend from the node table view.
    
      COMMENTUISTATE Map<uiref, {cref, isOpen}>
    
    
    OPENCOMMENTS
    ------------
    OPENCOMMENTS keeps track of currently open comment buttons.  This is 
    used prevent two comment buttons from opening the same comment collection,
    e.g. if the user opens a node and a node table comment at the same time.
    
      OPENCOMMENTS Map<cref, uiref>

      
    EDITABLECOMMENTS
    ----------------
    EDITABLECOMMENTS keeps track of which comment is currently open for 
    editing.  This is used to prevent close requests coming from NCCOmmentThreads
    from closing a NCComment that is in the middle of being edited.
    Tracked locally only.
    
      EDITABLECOMMENTS Map<cid, cid>

      
    COMMENTVOBJS cvobj
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
const COMMENTUISTATE = new Map();
const OPENCOMMENTS = new Map();
const EDITABLECOMMENTS = new Map();
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

/**
 *
 * @param {Object} data
 * @param {Object} data.uiref
 * @param {Object} data.cref
 * @param {Object} data.isOpen
 */
function UpdateCommentUIState(data) {
  if (!data.uiref) throw new Error('UpdateCommentUIState "uiref" must be defined!');
  COMMENTUISTATE.set(data.uiref, { cref: data.cref, isOpen: data.isOpen });
  OPENCOMMENTS.set(data.cref, data.uiref);
}

function CloseCommentCollection(uiref, cref, uid) {
  // Set isOpen status
  COMMENTUISTATE.set(uiref, { cref, isOpen: false });
  OPENCOMMENTS.set(cref, undefined);

  // Mark Read
  const commentVObjs = COMMENTVOBJS.get(cref);
  commentVObjs.forEach(c => DCCOMMENTS.MarkCommentRead(c.comment_id, uid));

  // Update Derived Lists to update Marked status
  m_DeriveThreadedViewObjects(cref, uid);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// COMMENT UI STATE

function GetCommentUIState(uiref) {
  return COMMENTUISTATE.get(uiref);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// OPENCOMMENTS

function GetOpenComments(cref) {
  return OPENCOMMENTS.get(cref);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// EDITABLECOMMENTS

function m_RegisterEditableComment(cid) {
  EDITABLECOMMENTS.set(cid, cid);
}
function m_DeRegisterEditableComment(cid) {
  EDITABLECOMMENTS.delete(cid);
}

function GetEditableComment(cid) {
  return EDITABLECOMMENTS.get(cid);
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
  const ccol = COMMENTCOLLECTION.get(cref) || { collection_ref: cref };
  const hasReadComments = commentReplyVObj.length > 0;
  let hasUnreadComments = false;
  commentReplyVObj.forEach(c => {
    if (!c.isMarkedRead) hasUnreadComments = true;
  });
  ccol.hasUnreadComments = hasUnreadComments;
  ccol.hasReadComments = hasReadComments;
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
  m_RegisterEditableComment(comment.comment_id);

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
 * Add changed comment to DCCOMMENTS and generate derived objects
 * @param {Object} cobj commentObject
 */
function UpdateComment(cobj) {
  if (cobj.collection_ref === undefined)
    throw new Error('UpdateComment cref is undefined', cobj);

  DCCOMMENTS.UpdateComment(cobj);

  m_DeriveThreadedViewObjects(cobj.collection_ref, cobj.commenter_id);
  // Disable editable and update modify time
  let commentVObjs = GetThreadedViewObjects(cobj.collection_ref, cobj.commenter_id);
  const cvobj = GetCommentVObj(cobj.collection_ref, cobj.comment_id);
  if (cvobj === undefined)
    throw new Error(
      `ac-comment.UpdateComment could not find cobj ${cobj.comment_id}.  Maybe it hasn't been created yet? ${COMMENTVOBJS}`
    );
  cvobj.isBeingEdited = false;
  m_DeRegisterEditableComment(cobj.comment_id);
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
  UpdateCommentUIState,
  CloseCommentCollection,
  // Comment UI State
  GetCommentUIState,
  // Open Comments
  GetOpenComments,
  // Editable Comments
  GetEditableComment,
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
