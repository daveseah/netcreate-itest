/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  COMMENT MANAGER

  <NCCommentThread>
    ...
    <NCComment>
  </NCCommentThread>

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const UNISYS = require('unisys/client');
const UTILS = require('./nc-utils');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'comment-mgr: ';

/// FAKE DATABASE CALLS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Place holder general utility functions -- Move to a date module?
function GetDateString(ms) {
  return new Date(ms).toLocaleString();
}

/// FAKE DATABASE CALLS ///////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// "Load" database data, which are simple arrays

let DB_Users;
let DB_CommentTypes;
let DB_Comments;
let LASTID = -1;

DB_Users = [
  { id: 'Ben32', name: 'BenL' },
  { id: 'Sri64', name: 'SriS' },
  { id: 'Joshua11', name: 'JoshuaD' }
];

DB_CommentTypes = [
  {
    id: 'cmt',
    label: 'COMMENT', // comment type label
    prompts:
      [{
        prompt: 'COMMENT', // prompt label
        help: '',
        feedback: ''
      }]
  },
  {
    id: 'questionresponse',
    label: 'Question or response', // comment type label
    prompts:
      [{
        prompt: 'Question or response', // prompt label
        help: '',
        feedback: ''
      }]
  },
  {
    id: 'consistent',
    label: 'Consistent', // comment type label
    prompts:
      [{
        prompt: 'Consistent', // prompt label
        help: '',
        feedback: ''
      }]
  },
  {
    id: 'understandable',
    label: 'Understandable', // comment type label
    prompts:
      [{
        prompt: 'Understandable', // prompt label
        help: '',
        feedback: ''
      }]
  },
  {
    id: 'understandable',
    label: 'Supported by evidence', // comment type label
    prompts:
      [{
        prompt: 'Supported by evidence', // prompt label
        help: `It is important for a scientific model to be supported by evidence.

Does the evidence we have show that the model works this way?
Is there any contradictory evidence that says the model doesn't work this way?
`,
        feedback: 'Consider pointing out relevant evidence by typing evidence #'
      }]
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
]

DB_Comments = [
  {
    collection_ref: 1,
    comment_id: '1', // thread
    comment_id_parent: '',
    comment_id_previous: '',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: [
      "You're missing a citation."
    ]
  },
  {
    collection_ref: 1,
    comment_id: '2', // reply 1
    comment_id_parent: '1',
    comment_id_previous: '',
    comment_type: 'changereason',
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Joshua11',
    commenter_text: [
      "I switched this to be fish die",
      "Because that's what the graph shows, thanks!"
    ]
  },
  {
    collection_ref: 1,
    comment_id: '3', // reply 2
    comment_id_parent: '1',
    comment_id_previous: '2',
    comment_type: 'understandable', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: [
      "OK nvm."
    ]
  },
  {
    collection_ref: 1,
    comment_id: '4', // thread
    comment_id_parent: '',
    comment_id_previous: '1',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Sri64',
    commenter_text: [
      "I don't think that's a good reason."
    ]
  },
  {
    collection_ref: 1,
    comment_id: '5', // reply 1
    comment_id_parent: '4',
    comment_id_previous: '',
    comment_type: 'three',
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: [
      "I switched this to be fish die",
      "Because that's what the graph shows, thanks!",
      ""
    ]
  },
  {
    collection_ref: 1,
    comment_id: '6', // thread
    comment_id_parent: '',
    comment_id_previous: '4',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: [
      "The last word."
    ]
  },
  {
    collection_ref: 2,
    comment_id: '7', // thread
    comment_id_parent: '',
    comment_id_previous: '',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Joshua11',
    commenter_text: [
      "A different object."
    ]
  }
];

/// INITIALIZE MODULE /////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
var MOD = UNISYS.NewModule(module.id);
var UDATA = UNISYS.NewDataLink(MOD);

const USERS = new Map(); // Map<uid, name>
const COMMENTTYPES = new Map(); // Map<typeId, commentTypeObject>
const COMMENTS = new Map(); // Map<cid, commentObject>

MOD.LoadUsers = dbUsers => {
  dbUsers.forEach(u => USERS.set(u.id, u.name));
}
MOD.LoadCommentTypes = commentTypes => {
  commentTypes.forEach(t => COMMENTTYPES.set(t.id, t));
}
MOD.LoadComments = comments => {
  let lastid = -1;
  comments.forEach(c => {
    COMMENTS.set(c.comment_id, c);
    if (c.comment_id > lastid) lastid = c.comment_id;
  });
  LASTID = lastid;
}



/// DERIVED METHODS ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ROOTS = new Map(); // Map<cref, comment_id> Root comment for a given collection_ref
const REPLY_ROOTS = new Map; // Map<comment_id_parent, comment_id> Root comment_id for any given comment. (thread roots)
const NEXT = new Map(); // Map<comment_id_previous, comment_id> Next comment_id that follows the requested comment_id

MOD.DeriveValues = () => {
  COMMENTS.forEach(c => {
    if (c.comment_id_parent === '' && c.comment_id_previous === '')
      ROOTS.set(c.collection_ref, c.comment_id);
    if (c.comment_id_parent !== '' && c.comment_id_previous === '')
      REPLY_ROOTS.set(c.comment_id_parent, c.comment_id);
    NEXT.set(c.comment_id_previous, c.comment_id);
  })
  if (DBG) console.log('ROOTS', ROOTS);
  if (DBG) console.log('NEXT', NEXT);
}

MOD.Initialize = () => {
  // Load Data!
  MOD.LoadCommentTypes(DB_CommentTypes);
  MOD.LoadUsers(DB_Users);
  MOD.LoadComments(DB_Comments)
  if (DBG) console.log('USERS', USERS)
  if (DBG) console.log('COMMENTTYPES', COMMENTTYPES)
  if (DBG) console.log('COMMENTS', COMMENTS)

  MOD.DeriveValues(); // execute it
}
MOD.Initialize(); // INITIALIZE IT


// /// UNISYS HANDLERS ///////////////////////////////////////////////////////////
// /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
// /** lifecycle INITIALIZE handler
//  */
// MOD.Hook("INITIALIZE", () => {
//   UDATA.HandleMessage('USER_HILITE_NODE', m_UserHighlightNode);
//   UDATA.HandleMessage('AUTOSUGGEST_HILITE_NODE', m_AutoSuggestHiliteNode);
//   UDATA.HandleMessage('TABLE_HILITE_NODE', m_TableHiliteNode);
// }); // end UNISYS_INIT


/// HELPER METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

MOD.GetNextCommentId = () => {
  return ++LASTID;
}

/**
 * Get all the comment ids related to a particular collection_ref
 * based on ROOTS.
 * MOD.DeriveValues needs to be called before this method can be used.
 * @param {string} cref collection_ref id
 * @returns comment_id[]
 */
MOD.DeriveThreadedViewIds = cref => {
  console.log('looking up cref', cref, typeof cref)
  const anchor_comment_ids = [];
  const all_comments_ids = [];
  // 1. Start with Roots
  const rootId = ROOTS.get(cref);
  if (rootId === undefined) return [];
  anchor_comment_ids.push(rootId);
  // 2. Find Next
  // recursively add next
  function getNext(cid) {
    const nextId = NEXT.get(cid);
    if (nextId) return [nextId, ...getNext(nextId)];
    return [];
  }
  anchor_comment_ids.push(...getNext(rootId));
  // 3. Find Replies
  anchor_comment_ids.forEach(cid => {
    // are there replies?
    const reply_root_id = REPLY_ROOTS.get(cid);
    if (reply_root_id) {
      // then recursively find next reply
      all_comments_ids.push(cid, reply_root_id, ...getNext(reply_root_id));
    }
    // else just return the root cid
    else all_comments_ids.push(cid)
  })
  return all_comments_ids;
}
if (DBG) console.log('GetThreadedView', MOD.DeriveThreadedViewIds('1'));
if (DBG) console.log('GetThreadedView', MOD.DeriveThreadedViewIds('2'));


/**
 * Get all the comments related to a particular collection_ref
 * @param {string} cref collection_ref id
 * @returns commentObject[]
 */
MOD.GetThreadedViewData = cref => {
  const all_comments_ids = MOD.DeriveThreadedViewIds(cref);
  // convert ids to comment objects
  return all_comments_ids.map(cid => COMMENTS.get(cid));
}


/// PUBLIC METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.GetUserName = id => {
  const u = USERS.get(id);
  return u !== undefined ? u : 'Not found';
}

MOD.GetCurrentUser = () => {
  // TODO Placeholder
  return 'Ben32'
}

MOD.DCAddComment = data => {
  if (data.cref === undefined) throw new Error('Comments must have a collection ref!');

  const comment_id_parent = data.comment_id_parent || '';
  const comment_id_previous = data.comment_id_previous || '';

  const comment = {
    collection_ref: data.cref,
    comment_id: MOD.GetNextCommentId(), // thread
    comment_id_parent,
    comment_id_previous,
    comment_type: 'cmt', // default type, no prompts
    comment_createtime: new Date(),
    comment_modifytime: '',

    commenter_id: MOD.GetCurrentUser(),
    commenter_text: []
  }
  COMMENTS.set(comment.comment_id, comment);
  return comment;
}

MOD.GetComments = () => {
  return COMMENTS;
}

MOD.GetComment = cid => {
  return COMMENTS.get(cid);
}

MOD.DeleteComment = cid => {
  // TODO Remove parent references
  // TODO Remove previous references
  COMMENTS.delete(cid);
  MOD.DeriveValues();
  // TODO: Add DB Call round trip
}

MOD.GetCommentTypes = () => {
  return COMMENTTYPES;
}

/**
 *
 * @param {Object} cobj commentObject
 */
MOD.SaveComment = cobj => {
  COMMENTS.set(cobj.comment_id, cobj);
  UDATA.SetAppState('COMMENTS', COMMENTS);
  // TODO: Add DB Call round trip
}




/*/////////////////////////////// APPCORE \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  COMMENT APPCORE
  Move this to a new module?

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const COMMENTVOBJS = new Map();


/// COMMENT APPCORE VIEW OBJECT METHODS ///////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/**
 * Returns flat array of comment view objects
 * @param {string} cref collection_ref id
 * @returns commentVOjb[]
 */
MOD.DeriveThreadedViewObjects = cref => {
  const commentVObjs = []
  const threadIds = MOD.DeriveThreadedViewIds(cref);
  threadIds.forEach(cid => {
    const comment = MOD.GetComment(cid);
    if (comment === undefined) console.error('GetThreadedViewObjects for cid not found', cid, 'in', threadIds)
    const level = comment.comment_id_parent === '' ? 0 : 1;
    commentVObjs.push({
      comment_id: cid,
      createtime_string: GetDateString(comment.comment_createtime),
      modifytime_string: comment.comment_modifytime ? GetDateString(comment.comment_modifytime) : '',
      level,
      isSelected: false,
      isBeingEdited: false,
      isEditable: false,
      allowReply: undefined // will be defined next
    });
  })

  // Figure out which comment can add a reply
  // only the last comment in a thread is allowed to reply
  const reversedCommentVObjs = commentVObjs.reverse();
  const commentReplyVObj = [];
  let prevLevel = -1;
  reversedCommentVObjs.forEach(cvobj => {
    if (cvobj.level > prevLevel) cvobj.allowReply = true;
    commentReplyVObj.push(cvobj)
    prevLevel = cvobj.level;
  })

  COMMENTVOBJS.set(cref, commentReplyVObj.reverse());
  return commentReplyVObj;
}

MOD.GetThreadedViewObjects = cref => {
  const commentVObjs = COMMENTVOBJS.get(cref);
  return commentVObjs === undefined
    ? MOD.DeriveThreadedViewObjects(cref)
    : commentVObjs
}

MOD.GetCommentVObj = (cref, cid) => {
  console.log('COMMENTVOBJS', cref, cid, JSON.stringify(COMMENTVOBJS))
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
MOD.AddComment = data => {
  if (data.cref === undefined) throw new Error('Comments must have a collection ref!');

  const comment = MOD.DCAddComment(data);
  MOD.DeriveValues();
  MOD.DeriveThreadedViewObjects(data.cref);

  // Make it editable
  let commentVObjs = MOD.GetThreadedViewObjects(data.cref);
  const cvobj = MOD.GetCommentVObj(comment.collection_ref, comment.comment_id);
  cvobj.isBeingEdited = true;
  commentVObjs = commentVObjs.map(c => c.comment_id === cvobj.comment_id ? cvobj : c)
  COMMENTVOBJS.set(data.cref, commentVObjs);

  // Update State
  UDATA.SetAppState('COMMENTVOBJS', COMMENTVOBJS);
  return comment;
}


/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = MOD;
