/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  COMMENT MANAGER

  <NCCommentThread>
    ...
    <NCComment>
  </NCCommentThread>

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const UNISYS = require('unisys/client');

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
    collection_ref: '1',
    comment_id: 't_abc', // thread
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
    collection_ref: '1',
    comment_id: 'r_def', // reply 1
    comment_id_parent: 't_abc',
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
    collection_ref: '1',
    comment_id: 'r_ghi', // reply 2
    comment_id_parent: 't_abc',
    comment_id_previous: 'r_def',
    comment_type: 'understandable', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: [
      "OK nvm."
    ]
  },
  {
    collection_ref: '1',
    comment_id: 't_jkl', // thread
    comment_id_parent: '',
    comment_id_previous: 't_abc',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Sri64',
    commenter_text: [
      "I don't think that's a good reason."
    ]
  },
  {
    collection_ref: '1',
    comment_id: 'r_mno', // reply 1
    comment_id_parent: 't_jkl',
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
    collection_ref: '1',
    comment_id: 't_pqr', // thread
    comment_id_parent: '',
    comment_id_previous: 't_jkl',
    comment_type: 'cmt', // no prompts
    comment_createtime: new Date(),
    comment_modifytime: new Date(),

    commenter_id: 'Ben32',
    commenter_text: [
      "The last word."
    ]
  },
  {
    collection_ref: '2',
    comment_id: 't_xyz', // thread
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
  comments.forEach(c => COMMENTS.set(c.comment_id, c));
}



/// DERIVED METHODS ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const ROOTS = new Map(); // Map<cref, comment_id> Root comment for a given collection_ref
const REPLY_ROOTS = new Map; // Map<comment_id_parent, comment_id> Root comment_id for any given comment
const NEXT = new Map(); // Map<comment_id_previous, comment_id> Next comment_id that follows the requested comment_id

MOD.DeriveValues = () => {
  DB_Comments.forEach(c => {
    if (c.comment_id_parent === '' && c.comment_id_previous === '')
      ROOTS.set(c.collection_ref, c.comment_id);
    if (c.comment_id_parent !== '' && c.comment_id_previous === '')
      REPLY_ROOTS.set(c.comment_id_parent, c.comment_id);
    NEXT.set(c.comment_id_previous, c.comment_id);
  })
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
  if (DBG) console.log('ROOTS', ROOTS);
  if (DBG) console.log('NEXT', NEXT);
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

/**
 * Get all the comment ids related to a particular collection_ref
 * @param {string} cref collection_ref id
 * @returns comment_id[]
 */
MOD.GetThreadedViewIds = cref => {
  const anchor_comment_ids = [];
  const all_comments_ids = [];
  // 1. Start with Roots
  const rootId = ROOTS.get(cref);
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
if (DBG) console.log('GetThreadedView', MOD.GetThreadedViewIds('1'));
if (DBG) console.log('GetThreadedView', MOD.GetThreadedViewIds('2'));


/**
 * Get all the comments related to a particular collection_ref
 * @param {string} cref collection_ref id
 * @returns commentObject[]
 */
MOD.GetThreadedViewData = cref => {
  const all_comments_ids = MOD.GetThreadedViewIds(cref);
  // convert ids to comment objects
  return all_comments_ids.map(cid => COMMENTS.get(cid));
}



/// COMMENT VIEW OBJECT METHODS ///////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/**
 * Returns flat array of comment view objects
 * @param {string} cref collection_ref id
 * @returns commentVOjb[]
 */
MOD.GetThreadedViewObjects = cref => {
  const commentVObjs = []
  const threadIds = MOD.GetThreadedViewIds(cref);
  threadIds.forEach(cid => {
    const comment = MOD.GetComment(cid);
    const level = comment.comment_id_parent === '' ? 0 : 1;
    commentVObjs.push({
      comment_id: cid,
      createtime_string: GetDateString(comment.comment_createtime),
      modifytime_string: GetDateString(comment.comment_modifytime),
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

  return commentReplyVObj.reverse();
}


/// PUBLIC METHODS ////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
MOD.GetUserName = id => {
  const u = USERS.get(id);
  return u !== undefined ? u : 'Not found';
}

MOD.GetComments = () => {
  return COMMENTS;
}

MOD.GetComment = cid => {
  return COMMENTS.get(cid);
}

MOD.DeleteComment = cid => {
  COMMENTS.delete(cid);
  MOD.DeriveValues();
  // TODO: Add DB Call round trip
}

MOD.GetCommentTypes = () => {
  return COMMENTTYPES;
}

MOD.AddComment = () => {
}


/// EXPORT CLASS DEFINITION ///////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = MOD;
