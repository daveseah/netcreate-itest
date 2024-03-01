/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  dc-comments
  
  Data Care Comments
      
  DATA
  
    COMMENTS are a flat array of the raw comment data.
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

    READBY keeps track of which user id has "read" which comment id.
    This can get rather long over time.
    
      interface ReadBy {
        comment_id: any;
        commenter_ids: any[];
      }

    EXAMPLE
    
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
  COMMENTS.forEach(c => {
    if (c.comment_id_parent === '' && c.comment_id_previous === '')
      ROOTS.set(c.collection_ref, c.comment_id);
    if (c.comment_id_parent !== '' && c.comment_id_previous === '') {
      REPLY_ROOTS.set(c.comment_id_parent, c.comment_id);
    }
    if (c.comment_id_previous !== '') NEXT.set(c.comment_id_previous, c.comment_id);
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

function RemoveComment(cid) {
  // TODO Remove parent references
  // TODO Remove previous references
  COMMENTS.delete(cid);
  m_DeriveValues();
  // TODO: Add DB Call round trip
}

/**
 *
 * @param {Object} cobj commentObject
 */
function UpdateComment(cobj) {
  // TODO: Add DB Call round trip
  // Fake modify date until we get DB roundtrip
  cobj.comment_modifytime = new Date();
  COMMENTS.set(cobj.comment_id, cobj);
  console.log('...modify time', cobj.comment_modifytime);
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
  RemoveComment,
  UpdateComment,
  MarkCommentRead,
  IsMarkedRead,
  GetThreadedCommentIds,
  GetThreadedCommentData,
  // READBY
  GetReadby
};
