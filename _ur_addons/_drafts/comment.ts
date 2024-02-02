/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  THINKING OUT LOUD

  Comments attach to a named subsystem like the Project definition area,
  a specific node

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

import { CRITERIA } from './template';

/// COMMENT TYPES /////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
type CommentType = 'project' | 'node' | 'edge' | 'evidence';
type GroupId = string; // part of authentication system
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/*/ Individual comments have an id and several fields. A comment belongs to
    a comment thread
/*/
type Comment = {
  comment_id: UObjectID;
  parent_id: UObjectID;
  comment_createtime: CC_DateTimeString;
  comment_modifytime: CC_DateTimeString;
  commentor_group: GroupId;
  commentor_name: string;
  commentor_text: string;
};
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** helper to see if criteria exists in the templates */
function m_CheckCriteria(criteria: UIDString) {
  const fn = 'CheckCriteria:';
  if (CRITERIA.getEntry(criteria)) return criteria;
  console.error(fn, `invalid criteria: ${criteria}`);
  console.log(fn, 'todo: use a default criteria from template');
  return undefined;
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** Manage a collection of comments in a thread */
class Thread {
  type: CommentType;
  criteria: UIDString;
  comments: Map<UObjectID, Comment>;
  constructor(type: CommentType, criteria: UIDString) {
    if (!['project', 'node', 'edge', 'evidence'].includes(type)) {
      console.error('invalid comment type:', type);
      return;
    }
    this.type = type;
    this.criteria = m_CheckCriteria(criteria);
    this.comments = new Map();
  }

  getComments() {}
  listComments(id: UObjectID, options?: { index?: number; count?: number }) {}
  addComment() {}
  getComment(id: UObjectID) {}
  editComment(id: UObjectID) {}
  search(searchKey: string) {}
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** CommentManager managers collections of comments called 'threads'.
 *  There are threads for the project itself as well as individual
 *  node, edge, and evidence objects. Uses UOBjectID to find the
 *  associated thread, which can then be operated on.
 */
class CommentManager {
  system: Map<CommentType, Thread>; // anchored to main panel (e.g. project)
  threads: Map<UObjectID, Thread>; // anchored to an object (e.g node, edge)

  constructor() {
    this.threads = new Map(); // all threads by anchoring object id
    this.system = new Map(); // special threads by type
  }

  /** given an id like node-123, return the thread for the anchoring
   *  object that owns the thread
   */
  getThread(anchorId: UObjectID): Thread {
    if (this.threads.has(anchorId)) return this.threads.get(anchorId);
    if (this.system.has(anchorId as CommentType))
      return this.system.get(anchorId as CommentType);
    console.error('thread for anchorId:', anchorId, 'not found');
  }

  /** create a new thread for a given anchorId (e.g. for a specific node */
  addThread(anchorId: UObjectID, ctype: CommentType, criteria?: UIDString) {
    if (this.threads.has(anchorId)) {
      console.error('thread for anchorId:', anchorId, 'already exists');
      return;
    }
    const thread = new Thread(ctype, criteria);
    this.threads.set(anchorId, thread);
  }

  /** create a new system thread (e.g. project panel) */
  addSystemThread(ctype: CommentType, criteria?: UIDString) {
    if (this.system.has(ctype)) {
      console.error('thread for content type:', ctype, 'already exists');
      return;
    }
    const thread = new Thread(ctype, criteria);
    this.system.set(ctype, thread);
  }
}
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const COMMENTS = new CommentManager();
COMMENTS.addSystemThread('project');

/// EXPORTS ///////////////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export { COMMENTS };
