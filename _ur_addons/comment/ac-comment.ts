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

      
    COMMENTVOBJS
    ------------
    COMMENTVOBJS are a flat array of data sources (cvobj) for CommentThread ojects.
    
      COMMENTVOBJS Map(cref, cvobj[])

      
    CommentVObj cvobj
    -----------
    CommentVObj a handles the UI view state of the each comment in the thread.
    cvobjs are a unique to each user id.
      
      interface CommentVObj {
        comment_id: any;
        
        createtime_string: string;
        modifytime_string: string;
        
        level: number;
        
        isSelected: boolean;
        isBeingEdited: boolean;
        isEditable: boolean;
        isMarkedRead: boolean;
        isReplyToMe: boolean;
        allowReply: boolean;
        
        markedRead: boolean;
      }

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import DCCOMMENTS, {
  TComment,
  TCollectionRef,
  TCommentID,
  TUserID,
  CType,
  TCommentType,
  TCommentTypeMap,
  TCommentMap,
  TCommentQueueActions
} from './dc-comment.ts';

const DBG = true;
const PR = 'ac-comments';

/// TYPE DEFINITIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

type TCommentCollection = {
  collection_ref: TCollectionRef;
  hasUnreadComments?: boolean;
  hasReadComments?: boolean;
};

type TCommentUIRef = string; // comment button id, e.g. `n32-isTable`, not just TCollectionRef
type TCommentOpenState = {
  cref: TCollectionRef;
  isOpen: boolean;
};

type TCommentVisualObject = {
  comment_id: TCommentID;
  createtime_string: string;
  modifytime_string: string;
  level: number;
  isSelected: boolean;
  isBeingEdited: boolean;
  isEditable: boolean;
  isMarkedRead: boolean;
  isReplyToMe: boolean;
  allowReply: boolean;
  markedRead: boolean;
};

type TCommentCollectionMap = Map<TCollectionRef, TCommentCollection>;
type TCommentUIStateMap = Map<TCommentUIRef, TCommentOpenState>;
type TOpenCommentsMap = Map<TCollectionRef, TCommentUIRef>;
type TCommentsBeingEditedMap = Map<TCommentID, TCommentID>;
type TCommentVisualObjectsMap = Map<TCollectionRef, TCommentVisualObject[]>;

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const COMMENTCOLLECTION: TCommentCollectionMap = new Map(); // Map<cref, ccol>
const COMMENTUISTATE: TCommentUIStateMap = new Map(); // Map<uiref, {cref, isOpen}>
const OPENCOMMENTS: TOpenCommentsMap = new Map(); // Map<cref, uiref>
const COMMENTS_BEING_EDITED: TCommentsBeingEditedMap = new Map(); // Map<cid, cid>
const COMMENTVOBJS: TCommentVisualObjectsMap = new Map(); // Map<cref, cvobj[]>

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Init() {
  if (DBG) console.log('ac-comments Init');
  DCCOMMENTS.Init();
}

/**
 * @param {any} data JSON data
 */
function LoadDB(data) {
  if (DBG) console.log(PR, 'LoadDB', data);
  DCCOMMENTS.LoadDB(data);
}

/**
 *  @param {number} ms
 *  @returns string "MM/DD/YY, HH:MM:SS: PM"
 */
function GetDateString(ms): string {
  return new Date(ms).toLocaleString();
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// COMMENT COLLECTIONS

function GetCommentCollections(): TCommentCollectionMap {
  return COMMENTCOLLECTION;
}

function GetCommentCollection(cref: TCollectionRef): TCommentCollection {
  const collection = COMMENTCOLLECTION.get(cref);
  return collection;
}

function UpdateCommentUIState(uiref: TCommentUIRef, openState: TCommentOpenState) {
  if (!uiref) throw new Error('UpdateCommentUIState "uiref" must be defined!');
  COMMENTUISTATE.set(uiref, { cref: openState.cref, isOpen: openState.isOpen });
  OPENCOMMENTS.set(openState.cref, uiref);
}

function CloseCommentCollection(
  uiref: TCommentUIRef,
  cref: TCollectionRef,
  uid: TUserID
) {
  // Set isOpen status
  COMMENTUISTATE.set(uiref, { cref, isOpen: false });
  OPENCOMMENTS.set(cref, undefined);

  MarkRead(cref, uid);

  // Update Derived Lists to update Marked status
  DeriveThreadedViewObjects(cref, uid);
}

function MarkRead(cref: TCollectionRef, uid: TUserID) {
  // Mark Read
  const commentVObjs = COMMENTVOBJS.get(cref);
  commentVObjs.forEach(cvobj => DCCOMMENTS.MarkCommentRead(cvobj.comment_id, uid));
}

function GetCommentStats(uid: TUserID): {
  countRepliesToMe: number;
  countUnread: number;
} {
  let countRepliesToMe = 0;
  let countUnread = 0;
  DeriveAllThreadedViewObjects(uid);

  // find replies to me
  const crefs = DCCOMMENTS.GetCrefs();
  let rootCidsWithRepliesToMe = [];
  crefs.forEach(cref => {
    const cvobjs = COMMENTVOBJS.get(cref);
    cvobjs.find(cvobj => {
      const comment = DCCOMMENTS.GetComment(cvobj.comment_id);
      if (comment.commenter_id === uid && comment.comment_id_parent !== '')
        rootCidsWithRepliesToMe.push(comment.comment_id_parent);
    });
  });

  COMMENTVOBJS.forEach(cvobjs => {
    cvobjs.forEach(cvobj => {
      if (!cvobj.isMarkedRead) {
        // count unread
        countUnread++;
        // count repliesToMe
        const comment = DCCOMMENTS.GetComment(cvobj.comment_id);
        if (rootCidsWithRepliesToMe.includes(comment.comment_id_parent)) {
          // HACK: Update cvobj by reference!
          cvobj.isReplyToMe = true;
          countRepliesToMe++;
        }
      }
    });
  });

  return { countRepliesToMe, countUnread };
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// COMMENT UI STATE

function GetCommentUIState(uiref: TCommentUIRef): TCommentOpenState {
  return COMMENTUISTATE.get(uiref);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// OPEN COMMENTS

function GetOpenComments(cref: TCollectionRef): TCommentUIRef {
  return OPENCOMMENTS.get(cref);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// EDITABLE COMMENTS

function m_RegisterCommentBeingEdited(cid: TCommentID) {
  COMMENTS_BEING_EDITED.set(cid, cid);
}
function m_DeRegisterCommentBeingEdited(cid: TCommentID) {
  COMMENTS_BEING_EDITED.delete(cid);
}

function GetCommentBeingEdited(cid: TCommentID): TCommentID {
  return COMMENTS_BEING_EDITED.get(cid);
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// UNREAD COMMENTS

function GetUnreadRepliesToMe(): TComment[] {
  const comments = [];
  COMMENTVOBJS.forEach(cvobjs => {
    cvobjs.forEach(cvobj => {
      if (cvobj.isReplyToMe) comments.push(DCCOMMENTS.GetComment(cvobj.comment_id));
    });
  });
  return comments;
}
function GetUnreadComments(): TComment[] {
  const comments = [];
  COMMENTVOBJS.forEach(cvobjs => {
    cvobjs.forEach(cvobj => {
      if (!cvobj.isMarkedRead) comments.push(DCCOMMENTS.GetComment(cvobj.comment_id));
    });
  });
  return comments;
}

/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// COMMENT THREAD VIEW OBJECTS

function DeriveAllThreadedViewObjects(uid: TUserID) {
  const crefs = DCCOMMENTS.GetCrefs();
  crefs.forEach(cref => DeriveThreadedViewObjects(cref, uid));
}

/**
 * Returns flat array of comment view objects
 * @param {string} cref collection_ref id
 * @returns commentVOjb[]
 */
function DeriveThreadedViewObjects(
  cref: TCollectionRef,
  uid: TUserID
): TCommentVisualObject[] {
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
  const commentReplyVObjs = [];
  let prevLevel = -1;
  reversedCommentVObjs.forEach(cvobj => {
    if (
      (cvobj.level === 0 && cvobj.level >= prevLevel) || // is top level without a reply thread
      cvobj.level > prevLevel // or is a thread
    )
      cvobj.allowReply = true;
    commentReplyVObjs.push(cvobj);
    prevLevel = cvobj.level;
  });
  COMMENTVOBJS.set(cref, commentReplyVObjs.reverse());

  // Derive COMMENTCOLLECTION
  const ccol: TCommentCollection = COMMENTCOLLECTION.get(cref) || {
    collection_ref: cref
  };
  const hasReadComments = commentReplyVObjs.length > 0;
  let hasUnreadComments = false;
  commentReplyVObjs.forEach(c => {
    if (!c.isMarkedRead) hasUnreadComments = true;
  });
  ccol.hasUnreadComments = hasUnreadComments;
  ccol.hasReadComments = hasReadComments;
  COMMENTCOLLECTION.set(cref, ccol);
  return commentReplyVObjs;
}

/**
 * @param {string} cref
 * @param {string} uid -- User ID is used to determine read/unread status
 */
function GetThreadedViewObjects(
  cref: TCollectionRef,
  uid: TUserID
): TCommentVisualObject[] {
  const commentVObjs = COMMENTVOBJS.get(cref);
  return commentVObjs === undefined
    ? DeriveThreadedViewObjects(cref, uid)
    : commentVObjs;
}

/**
 * @param {string} cref
 * @param {string} uid -- User ID is used to determine read/unread status
 * @returns {number} Returns the number of comments in a collection
 */
function GetThreadedViewObjectsCount(cref: TCollectionRef, uid: TUserID): number {
  return GetThreadedViewObjects(cref, uid).length;
}

function GetCOMMENTVOBJS(): TCommentVisualObjectsMap {
  return COMMENTVOBJS;
}

function GetCommentVObj(cref: TCollectionRef, cid: TCommentID): TCommentVisualObject {
  const thread = COMMENTVOBJS.get(cref);
  const cvobj = thread.find(c => c.comment_id === cid);
  return cvobj;
}

/// Add a new comment and trigger COMMENTVOBJS state change
function AddComment(data: {
  cref: TCollectionRef;
  comment_id_parent: TCommentID;
  comment_id_previous: TCommentID;
  commenter_id: TUserID;
}): TComment {
  if (data.cref === undefined)
    throw new Error('Comments must have a collection ref!');

  const comment = DCCOMMENTS.AddComment(data);
  DeriveThreadedViewObjects(data.cref, data.commenter_id);

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
  m_RegisterCommentBeingEdited(comment.comment_id);

  commentVObjs = commentVObjs.map(c =>
    c.comment_id === cvobj.comment_id ? cvobj : c
  );
  COMMENTVOBJS.set(data.cref, commentVObjs);

  return comment;
}

/**
 * Add changed comment to DCCOMMENTS and generate derived objects
 * @param {Object} cobj commentObject
 * @param {string} uid ID of the current user for "marked read" status
 */
function UpdateComment(cobj: TComment, uid: TUserID) {
  if (cobj.collection_ref === undefined)
    throw new Error(`UpdateComment cref is undefined ${cobj}`);

  DCCOMMENTS.UpdateComment(cobj);
  DeriveThreadedViewObjects(cobj.collection_ref, uid);
  // Disable editable and update modify time
  let commentVObjs = GetThreadedViewObjects(cobj.collection_ref, uid);
  const cvobj = GetCommentVObj(cobj.collection_ref, cobj.comment_id);
  if (cvobj === undefined)
    throw new Error(
      `ac-comment.UpdateComment could not find cobj ${cobj.comment_id}.  Maybe it hasn't been created yet? ${COMMENTVOBJS}`
    );

  // mark it unread
  cvobj.isMarkedRead = false; // clear read status
  DCCOMMENTS.MarkCommentUnread(cvobj.comment_id, uid);

  cvobj.isBeingEdited = false;
  m_DeRegisterCommentBeingEdited(cobj.comment_id);
  cvobj.modifytime_string = GetDateString(cobj.comment_modifytime);
  commentVObjs = commentVObjs.map(c =>
    c.comment_id === cvobj.comment_id ? cvobj : c
  );
  COMMENTVOBJS.set(cobj.collection_ref, commentVObjs);
}
/**
 * Batch updates an array of updated comments
 * This updates the local browser's comment state to match the server.
 * Triggered by COMMENTS_UPDATE network call after someone else on the network removes a comment.
 * Does NOT trigger a database update
 * (Contrast this with UpdateComment above)
 */
function HandleUpdatedComments(comments: TComment[]) {
  DCCOMMENTS.HandleUpdatedComments(comments);
}

/**
 * Processes the comment removal triggered by the local user, including relinking logic
 * This is called BEFORE the database update.
 * (Contrast this with UpdateRemovedComment below)
 */
function RemoveComment(parms: {
  collection_ref: TCollectionRef;
  comment_id: TCommentID;
  uid: TUserID;
  isAdmin: boolean;
}): TCommentQueueActions[] {
  if (parms.collection_ref === undefined)
    throw new Error(`RemoveComment collection_ref is undefined ${parms}`);
  const queuedActions = DCCOMMENTS.RemoveComment(parms);
  DeriveThreadedViewObjects(parms.collection_ref, parms.uid);
  // Add an action to update the collection_ref, which forces an update after removal
  // otherwise the comment would have been removed and we no longer have a reference to the cref
  queuedActions.push({ collection_ref: parms.collection_ref });
  return queuedActions;
}
/// Processes comment removal triggered by deletion of a source (e.g. node or edge)
function RemoveAllCommentsForCref(parms: {
  collection_ref: TCollectionRef;
  uid: TUserID;
}): TCommentQueueActions[] {
  if (parms.collection_ref === undefined)
    throw new Error(`RemoveAllCommentsForCref collection_ref is undefined ${parms}`);
  const queuedActions = DCCOMMENTS.RemoveAllCommentsForCref(parms);
  DeriveThreadedViewObjects(parms.collection_ref, parms.uid);
  // Add an action to update the collection_ref, which forces an update after removal
  // otherwise the comment would have been removed and we no longer have a reference to the cref
  queuedActions.push({ collection_ref: parms.collection_ref });
  return queuedActions;
}
/**
 * Batch updates a list of removed comment ids
 * This updates the local browser's comment state to match the server.
 * Triggered by COMMENTS_UPDATE network call after someone else on the network removes a comment.
 * This assumes that it is safe to simply delete the comment.  Any relinking
 * should have been handled by UpdateComment
 * Does NOT trigger a database update
 * (Contrast this with RemoveComment above)
 */
function HandleRemovedComments(comment_ids: TCommentID[]) {
  DCCOMMENTS.HandleRemovedComments(comment_ids);
}

/// PASS-THROUGH METHODS //////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function GetUserName(uid: TCommentID): string {
  return DCCOMMENTS.GetUserName(uid);
}
function GetCommentTypes(): TCommentTypeMap {
  return DCCOMMENTS.GetCommentTypes();
}
function GetCommentType(slug: CType): TCommentType {
  return DCCOMMENTS.GetCommentType(slug);
}
function GetDefaultCommentType(): TCommentType {
  return DCCOMMENTS.GetDefaultCommentType();
}
function GetCOMMENTS(): TCommentMap {
  return DCCOMMENTS.GetCOMMENTS();
}
function GetComment(cid: TCommentID): TComment {
  return DCCOMMENTS.GetComment(cid);
}
function GetReadby(cid: TCommentID): TUserID[] {
  return DCCOMMENTS.GetReadby(cid);
}
function GetCrefs(): TCollectionRef[] {
  return DCCOMMENTS.GetCrefs();
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
  MarkRead,
  GetCommentStats,
  // Comment UI State
  GetCommentUIState,
  // Open Comments
  GetOpenComments,
  // Editable Comments
  GetCommentBeingEdited,
  // Unread Comments
  GetUnreadRepliesToMe,
  GetUnreadComments,
  // Comment Thread View Object
  DeriveAllThreadedViewObjects,
  DeriveThreadedViewObjects,
  GetThreadedViewObjects,
  GetThreadedViewObjectsCount,
  GetCOMMENTVOBJS,
  GetCommentVObj,
  // Comment Objects
  AddComment,
  UpdateComment,
  HandleUpdatedComments,
  RemoveComment,
  RemoveAllCommentsForCref,
  HandleRemovedComments,
  // PASS THROUGH
  GetUserName,
  GetCommentTypes,
  GetCommentType,
  GetDefaultCommentType,
  GetCOMMENTS,
  GetComment,
  GetReadby,
  GetCrefs
};
