/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentThread displays all of the comments and replies for a given referent
  object.  It is a draggable window that can be opened and closed by the user
  via the URCommentBtn.  Clickin "X" or close will mark all comments as "read".

  USE:

    <URCommentThread
      uiref
      cref={collection_ref}
      uid
      x
      y
    />

  PROPS:
    * uiref   -- reference to the ui component that opened the thread, usu commentButtonId
    * cref    -- collection reference (usu node id, edge id)
    * uid     -- user id of current active user viewing or changing comment
    * x,y     -- position of open comment thread used to set proximity to
                 comment button


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect, useCallback } from 'react';
import Draggable from 'react-draggable';
import UNISYS from 'unisys/client';
import CMTMGR from '../comment-mgr';
import URComment from './URComment';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Initialize UNISYS DATA LINK for react component
const UDATAOwner = { name: 'URCommentThread' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);
/// Debug Flags
const DBG = false;
const PR = 'URCommentThread';

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** URCommentThread renders the set of individual comments and replies
 *  (URComment) in a single window.  Handles marking comments as "read"
 *  when the thread is closed.
 */
function URCommentThread({ uiref, cref, uid, x, y }) {
  const [isDisabled, setIsDisabled] = useState(false);

  /** Component Effect - set up listeners on mount */
  useEffect(() => {
    function urmsg_UpdatePermissions(data) {
      setIsDisabled(data.commentBeingEditedByMe);
    }

    UDATA.HandleMessage('COMMENT_UPDATE_PERMISSIONS', urmsg_UpdatePermissions);

    return () => {
      UDATA.UnhandleMessage('COMMENT_UPDATE_PERMISSIONS', urmsg_UpdatePermissions);
    };
  }, []);

  /// COMPONENT UI HANDLERS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** handles clicking the "Click to add a Comment" textarea to create a new
   *  coment.
   */
  function evt_OnAddComment() {
    const commentVObjs = CMTMGR.GetThreadedViewObjects(cref, uid);
    const numComments = commentVObjs.length;
    if (numComments < 1) {
      // Add first root comment
      CMTMGR.AddComment({
        cref,
        comment_id_parent: '',
        comment_id_previous: '',
        commenter_id: uid
      });
    } else {
      // Add reply to last ROOT comment in thread (last comment at level 0)
      const lastComment = commentVObjs.reverse().find(cvobj => cvobj.level === 0);
      CMTMGR.AddComment({
        cref,
        comment_id_parent: '',
        comment_id_previous: lastComment.comment_id,
        commenter_id: uid
      });
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** handles the "X" or "Close" button click, marks all comments "read" */
  function evt_OnClose() {
    CMTMGR.CloseCommentCollection(uiref, cref, uid);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** handles clicking on the name of the object being commented on
   *  opens the object -- useful for finding the source object if the
   *  thread window has moved.
   */
  function evt_OnReferentClick(event, cref) {
    event.preventDefault();
    event.stopPropagation();
    CMTMGR.OpenReferent(cref);
  }

  /// COMPONENT RENDER ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const commentVObjs = CMTMGR.GetThreadedViewObjects(cref, uid);

  /// SUB COMPONENTS
  const CloseBtn = (
    <button onClick={evt_OnClose} disabled={isDisabled}>
      Close
    </button>
  );

  // HACK: To keep the comment from going off screen:
  const windowHeight = Math.min(screen.height, window.innerHeight);
  const commentMaxHeight = `${windowHeight - y - 100}px`;

  const { typeLabel, sourceLabel } = CMTMGR.GetCREFSourceLabel(cref);

  return (
    <Draggable>
      <div
        className="commentThread"
        style={{ left: `${x}px`, top: `${y}px`, maxHeight: commentMaxHeight }}
        onClick={e => e.stopPropagation()}
      >
        <div className="topbar">
          <div className="commentTitle">
            Comments on {typeLabel}{' '}
            <a href="#" onClick={event => evt_OnReferentClick(event, cref)}>
              {sourceLabel}
            </a>
          </div>
          {!isDisabled && (
            <div className="closeBtn" onClick={evt_OnClose}>
              X
            </div>
          )}
        </div>
        <div className="commentScroller">
          {commentVObjs.map(cvobj => (
            <URComment
              cref={cref}
              cid={cvobj.comment_id}
              uid={uid}
              key={cvobj.comment_id}
            />
          ))}
          {!isDisabled && uid && (
            <textarea
              className="add"
              placeholder="Click to add a Comment..."
              readOnly
              onClick={evt_OnAddComment}
            ></textarea>
          )}
          {!uid && commentVObjs.length < 1 && (
            <div className="label" style={{ textAlign: 'center' }}>
              No comments
            </div>
          )}
        </div>
        <div className="commentbar">{CloseBtn}</div>
      </div>
    </Draggable>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URCommentThread;
