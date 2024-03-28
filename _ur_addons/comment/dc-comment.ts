/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  dc-comments
  
  Data Care Comments
      
  DATA
  
    COMMENTS
    --------
    COMMENTS are a flat array of the raw comment data.
    aka a "comment object" or "cobj"
    Used by the Comment component to render the text in each comment.
    
      interface Comment {
        collection_ref: any;
        comment_id: any;
        comment_id_parent: any;
        comment_id_previous: any;
        comment_type: string;
        comment_createtime: number;
        comment_modifytime: number;

        commenter_id: any;
        commenter_text: string[];
      };

    READBY
    ------
    READBY keeps track of which user id has "read" which comment id.
    This can get rather long over time.
    
      interface ReadBy {
        comment_id: any;
        commenter_ids: any[];
      }

      
    DERIVED DATA
    ------------
    dc-comments keeps track of various indices for constructing threads:
    * ROOTS       -- Root comment for a collection
    * REPLY_ROOTS -- Root for a reply thread (the first comment in a child thread)
    * NEXT        -- Points to the next comment in a thread
    These need to be updated whenever a comment is added, updated, or deleted
    with a call to `deriveValues()`

    EXAMPLE
    
       COMMENT OBJECT                                    DERIVED DATA
       --------------------------------------------      ----------------
       parnt prev                                        NEXT  REPLY-ROOT
                   "r1 First Comment"                    r2    r1.1
       r1            "r1.1 Reply to First Comment"       r1.2
       r1    r1.1    "r1.2 Reply to First Comment"       
             r1    "r2 Second Comment"                   r3    r2.1
       r2            "r2.1 Reply to Second Comment"      r2.2
       r2    r2.1    "r2.2 Reply to Second Comment"      r2.3
       r2    r2.2    "r2.3 Reply to Second Comment"
             r2    "r3 Third Comment"                    r4
             r4    "r4 Fourth Comment"                   

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;

/// CORE DATA
const USERS = new Map(); // Map<uid, name>
const COMMENTTYPES = new Map(); // Map<typeId, commentTypeObject>
const COMMENTS = new Map(); // Map<cid, commentObject>
const READBY = new Map(); // Map<cid, readbyObject[]>
/// DERIVED DATA
const ROOTS = new Map(); // Map<cref, comment_id> Root comment for a given collection_ref
const REPLY_ROOTS = new Map(); // Map<comment_id_parent, comment_id> Root comment_id for any given comment. (thread roots)
const NEXT = new Map(); // Map<comment_id_previous, comment_id> Next comment_id that follows the requested comment_id

/// DEFAULTS //////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// TODO This is temporarily hard-coded until we have a new Template Editor
const DEFAULT_CommentTypes = [
  {
    id: 'cmt',
    label: 'COMMENT', // comment type label
    prompts: [
      {
        prompt: 'COMMENT', // prompt label
        help: '',
        feedback: ''
      }
    ]
  },
  {
    id: 'questionresponse',
    label: 'Question or response', // comment type label
    prompts: [
      {
        prompt: 'Question or response', // prompt label
        help: '',
        feedback: ''
      }
    ]
  },
  {
    id: 'consistent',
    label: 'Consistent', // comment type label
    prompts: [
      {
        prompt: 'Consistent', // prompt label
        help: '',
        feedback: ''
      }
    ]
  },
  {
    id: 'understandable',
    label: 'Understandable', // comment type label
    prompts: [
      {
        prompt: 'Understandable', // prompt label
        help: '',
        feedback: ''
      }
    ]
  },
  {
    id: 'understandable',
    label: 'Supported by evidence', // comment type label
    prompts: [
      {
        prompt: 'Supported by evidence', // prompt label
        help: `It is important for a scientific model to be supported by evidence.

Does the evidence we have show that the model works this way?
Is there any contradictory evidence that says the model doesn't work this way?
`,
        feedback: 'Consider pointing out relevant evidence by typing evidence #'
      }
    ]
  },
  {
    id: 'changereason',
    label: 'Change + Reason', // comment type label
    prompts: [
      {
        prompt: 'Change',
        help: 'What change do you want to make?',
        feedback: ''
      },
      {
        prompt: 'Reason',
        help: 'Why do you want to make that change',
        feedback: ''
      }
    ]
  },
  {
    id: 'three',
    label: 'Three Points', // comment type label
    prompts: [
      {
        prompt: 'Point 1',
        help: 'What change do you want to make?',
        feedback: ''
      },
      {
        prompt: 'Point 2',
        help: 'Why do you want to make that change',
        feedback: ''
      },
      {
        prompt: 'Point 3',
        help: 'Why do you want to make that change',
        feedback: ''
      }
    ]
  }
];

/// HELPER FUNCTIONS //////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function m_LoadUsers(dbUsers) {
  dbUsers.forEach(u => USERS.set(u.id, u.name));
}
function m_LoadCommentTypes(commentTypes) {
  commentTypes.forEach(t => COMMENTTYPES.set(t.id, t));
}
function m_LoadComments(comments) {
  comments.forEach(c => COMMENTS.set(c.comment_id, c));
}
function m_LoadReadBy(readby) {
  readby.forEach(r => READBY.set(r.comment_id, r.commenter_ids));
}

/// API METHODS ///////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function Init() {
  console.log('dc-comments Init');
  // Load Defaults
  m_LoadCommentTypes(DEFAULT_CommentTypes);
}

/**
 * @param {Object} data
 * @param {Object} data.users
 * @param {Object} data.commenttypes
 * @param {Object} data.comments
 * @param {Object} data.readby
 */
function LoadDB(data) {
  // Load Data!
  if (data.commenttypes) m_LoadCommentTypes(data.commenttypes);
  if (data.users) m_LoadUsers(data.users);
  if (data.comments) m_LoadComments(data.comments);
  if (data.readby) m_LoadReadBy(data.readby);
  if (DBG) console.log('USERS', USERS);
  if (DBG) console.log('COMMENTTYPES', COMMENTTYPES);
  if (DBG) console.log('COMMENTS', COMMENTS);
  if (DBG) console.log('READBY', READBY);
  // Derive Secondary Values
  m_DeriveValues();
}

function GetUsers() {
  return USERS;
}
function GetUser(uid) {
  return USERS.get(uid);
}
function GetUserName(uid) {
  const u = USERS.get(uid);
  return u !== undefined ? u : uid; // fallback to using `uid` if there's no record
}
function GetCurrentUser() {
  // TODO Placeholder
  return 'Ben32';
}

function GetCommentTypes() {
  return COMMENTTYPES;
}
function GetCommentType(typeid) {
  return COMMENTTYPES.get(typeid);
}

function GetComments() {
  return COMMENTS;
}
function GetComment(cid) {
  return COMMENTS.get(cid);
}

function m_DeriveValues() {
  ROOTS.clear();
  REPLY_ROOTS.clear();
  NEXT.clear();
  COMMENTS.forEach(c => {
    if (c.comment_id_parent === '' && c.comment_id_previous === '')
      ROOTS.set(c.collection_ref, c.comment_id);
    if (c.comment_id_parent !== '' && c.comment_id_previous === '') {
      REPLY_ROOTS.set(c.comment_id_parent, c.comment_id);
    }
    if (c.comment_id_previous !== '') {
      NEXT.set(c.comment_id_previous, c.comment_id);
    }
  });
  if (DBG) console.log('ROOTS', ROOTS);
  if (DBG) console.log('REPLY_ROOTS', REPLY_ROOTS);
  if (DBG) console.log('NEXT', NEXT);
}

function AddComment(data) {
  if (data.cref === undefined)
    throw new Error('Comments must have a collection ref!');

  const comment_id_parent = data.comment_id_parent || '';
  const comment_id_previous = data.comment_id_previous || '';

  const comment = {
    collection_ref: data.cref,
    comment_id: data.comment_id, // thread
    comment_id_parent,
    comment_id_previous,
    comment_type: 'cmt', // default type, no prompts
    comment_createtime: new Date(),
    comment_modifytime: '',

    commenter_id: data.commenter_id,
    commenter_text: []
  };

  COMMENTS.set(comment.comment_id, comment);
  m_DeriveValues();

  return comment;
}

/**
 * API Call to processes a single update
 * @param {Object} cobj commentObject
 */
function UpdateComment(cobj) {
  m_UpdateComment(cobj);
  m_DeriveValues();
}
/**
 * Processes a single update
 * @param {Object} cobj commentObject
 */
function m_UpdateComment(cobj) {
  // Fake modify date until we get DB roundtrip
  cobj.comment_modifytime = new Date();
  console.log(
    'REVIEW: UpdateComment...modify time should use loki time???',
    cobj.comment_modifytime
  );
  COMMENTS.set(cobj.comment_id, cobj);
}
/**
 * API Call to batch updates an array of updated comments
 * @param {Object[]} cobjs cobj[]
 */
function HandleUpdatedComments(cobjs) {
  cobjs.forEach(cobj => m_UpdateComment(cobj));
  m_DeriveValues();
}

/**
 * @param {Object} parms
 * @param {Object} parms.collection_ref
 * @param {Object} parms.comment_id
 * @param {Object} parms.uid
 * @param {Object} parms.isAdmin
 * @returns {(any|Array)} if {comment: cobj} updates the comment
 *                        if {comment_id: id} deletes the comment
 */
function RemoveComment(parms) {
  const { collection_ref, comment_id, uid, isAdmin } = parms;
  const retvals = [];

  const cobj = COMMENTS.get(comment_id);

  const next_comment_id = NEXT.get(comment_id);
  const prev = COMMENTS.get(cobj.comment_id_previous);
  const isRoot = cobj.comment_id_parent === ''; // does not have parent
  const hasReplies = REPLY_ROOTS.get(comment_id);

  if (isAdmin) {
    // A. if admin, force delete all children
    console.warn('ADMIN DELETING COMPLETE THREAD!');

    // -- 1. delete the comment
    if (DBG) console.log('...ADMIN deleting root', comment_id);
    COMMENTS.delete(comment_id);
    retvals.push({ commentID: comment_id });

    // -- 2. delete all child replies
    const childThreadIds = [];
    COMMENTS.forEach((cobj, cid) => {
      if (DBG) console.log('      --working on', cobj, 'for', comment_id);
      if (cobj.comment_id_parent === comment_id) childThreadIds.push(cobj.comment_id);
    });
    childThreadIds.forEach(id => {
      if (DBG) console.log('......ADMIN deleting child thread', id);
      COMMENTS.delete(id);
      retvals.push({ commentID: id });
    });

    // -- 3. if there's a NEXT comment that is a root, relink PREVIOUS to the next's NEXT
    //    ... and move up (next's previous is set to previous)
    const nextCobj = COMMENTS.get(next_comment_id);
    if (nextCobj) {
      nextCobj.comment_id_previous = prev ? prev.comment_id : ''; // if there's no prev, this is the first root
      if (DBG) console.log('...ADMIN next is now', nextCobj.comment_id);
      COMMENTS.set(nextCobj.comment_id, nextCobj);
      retvals.push({ comment: nextCobj });
    }
  } else if (isRoot && !next_comment_id) {
    // B. Root Orphan, OK to delete
    // -- Root orphan has no `next` && has no `parent`
    if (DBG) console.log('!!! COMMENTS deleting root orphan', comment_id);
    COMMENTS.delete(comment_id);
    retvals.push({ commentID: comment_id });
  } else {
    if (isRoot && !hasReplies) {
      // C. Root with no reply threads, OK to delete
      if (DBG) console.log('!!! COMMENTS deleting thread item', comment_id);
      COMMENTS.delete(comment_id);
      retvals.push({ commentID: comment_id });

      // ... and move up (next's previous is set to previous)
      const nextCobj = COMMENTS.get(next_comment_id);
      nextCobj.comment_id_previous = prev ? prev.comment_id : ''; // if there's no prev, this is the first root
      COMMENTS.set(nextCobj.comment_id, nextCobj);
      retvals.push({ comment: nextCobj });
    } else if (!isRoot && !next_comment_id) {
      // D. Reply Thread Orphan, OK to delete -- last item in a thread
      if (DBG) console.log('!!! COMMENTS deleting last thread item', comment_id);
      COMMENTS.delete(comment_id);
      retvals.push({ commentID: comment_id });

      // -- if the thread's root is also deleted, then also delete the root
      console.warn(
        '!!! TODO: NEED TO DELETE whole collection if all items are deleted'
      );
    } else {
      // E. Root with a reply thread...
      //    ...or part of a reply thread with more replies: mark[DELETED] only
      if (DBG) console.log('!!! COMMENTS just marking DELETED', comment_id);
      cobj.comment_type = DEFAULT_CommentTypes[0].id; // revert to default comment type
      cobj.commenter_text = ['[DELETED]'];
      COMMENTS.set(cobj.comment_id, cobj);
      retvals.push({ comment: cobj });
    }
  }
  m_DeriveValues();
  return retvals;
}

/**
 * Batch updates an array of removed comment ids
 * @param {number[]} comment_ids
 */
function HandleRemovedComments(comment_ids) {
  comment_ids.forEach(comment_id => {
    if (DBG) console.log('...removing', comment_id);
    COMMENTS.delete(comment_id);
  });
  console.log('...remaining COMMENTS', COMMENTS);
  m_DeriveValues();
}

/**
 * `uid` can be undefined if user is not logged in
 */
function MarkCommentRead(cid, uid) {
  // Mark the comment read
  const readby = READBY.get(cid) || [];
  if (!readby.includes(uid)) readby.push(uid);
  READBY.set(cid, readby);
}

function IsMarkedRead(cid, uid) {
  const readby = READBY.get(cid) || [];
  return readby.includes(uid);
}

/**
 * Get all the comment ids related to a particular collection_ref
 * based on ROOTS.
 * DeriveValues needs to be called before this method can be used.
 * @param {string} cref collection_ref id
 * @returns comment_id[]
 */
function GetThreadedCommentIds(cref) {
  const all_comments_ids = [];

  // recursively add replies and next
  // 1. Adds nested children reply threads first
  // 2. Then adds the next younger sibling
  function getRepliesAndNext(cid) {
    const results = [];

    // are there "replies"?
    const reply_root_id = REPLY_ROOTS.get(cid);
    if (reply_root_id) {
      // then recursively find next reply
      results.push(reply_root_id, ...getRepliesAndNext(reply_root_id));
    }

    // are there "next" items?
    const nextId = NEXT.get(cid);
    if (nextId) {
      // then recursively find next reply
      results.push(nextId, ...getRepliesAndNext(nextId));
    }

    return results;
  }

  // 1. Start with Roots
  const rootId = ROOTS.get(cref);
  if (rootId === undefined) return [];

  // 2. Find Replies (children) followed by Next (younger siblings)
  all_comments_ids.push(rootId, ...getRepliesAndNext(rootId));
  return all_comments_ids;
}
if (DBG) console.log('GetThreadedView', GetThreadedCommentIds('1'));
if (DBG) console.log('GetThreadedView', GetThreadedCommentIds('2'));

/**
 * [Currently not used]
 * Get all the comments related to a particular collection_ref
 * @param {string} cref collection_ref id
 * @returns commentObject[]
 */
function GetThreadedCommentData(cref) {
  const all_comments_ids = GetThreadedCommentIds(cref);
  // convert ids to comment objects
  return all_comments_ids.map(cid => COMMENTS.get(cid));
}

function GetReadby(cid) {
  return READBY.get(cid);
}

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default {
  Init,
  // DB
  LoadDB,
  // USERS
  GetUsers,
  GetUser,
  GetUserName,
  GetCurrentUser,
  // COMMENT TYPES
  GetCommentTypes,
  GetCommentType,
  // COMMENTS
  GetComments,
  GetComment,
  AddComment,
  UpdateComment,
  HandleUpdatedComments,
  RemoveComment,
  HandleRemovedComments,
  MarkCommentRead,
  IsMarkedRead,
  GetThreadedCommentIds,
  GetThreadedCommentData,
  // READBY
  GetReadby
};
