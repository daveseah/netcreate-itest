/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentBtn

  URCommentBtn is the main UI element for comments.  It can be attached to any
  UI component and provides a place to anchor and display comments.
  * Clicking the CommentBtn will toggle the comment view on and off
  * Closing the comment by clicking the "Close" or "X" button will mark
    the comments "read".
  * "Read/Unread" status is tied to a user id.
  * Any open URCommentThread windows will be positioned close to the
    URCommentBtn that opened it upon a window resize.

  It displays a summary of the comment status:
  * count of number of comments
  * has unread comments (gold color)
  * all comments are read (gray color)

  During Edit
  While a comment is being edited, we need to catch events to prevent
  the comment from inadvertently being closed, e.g. for Net.Create:
  * prevent NodeTable or EdgeTable view/edit actions from triggering
    (handled by selection-mgr)
  * prevent NCNode from being able to click "Edit"
  * prevent URCommentBtn close toggles (handled by URCommentBtn)
  * prevent NCGraphRenderer events from selecting another node
    (handled by selection-mgr)
  This is handled via comment-mgr.LockComment.

  USE:

    <URCommentBtn
      cref={collection_ref}
      uuiid={uuiid}
    />

  PROPS:
    * cref    -- collection reference (usu node id, edge id)
    * uuiid   -- unique user interface id
                 used to differentiate comment buttons on tables vs nodes/edges
                 ensures that each comment button id is unique

  STATES:
    * Empty             -- No comments.  Empty chat bubble.
    * HasUnreadComments -- Gold comment icon with count of comments in red
    * HasReadComments   -- Gray comment icon with count of comments in white

    * isOpen            -- Corresponding comment window is open.  Comment icon outlined.
    * x, y              -- position of CommentThread window
    * commentButtonId   -- unique id for each button
                           allows showing open/closed status for the same comment

  STRUCTURE

    <URCommentBtn>
      <URCommentThread>
        <URComment />
        <URComment />
        ...
      </URCommentThread>
    </URCommentBtn>

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect } from 'react';
import UNISYS from 'unisys/client';
import CMTMGR from '../comment-mgr';
import URCommentThread from './URCommentThread';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Initialize UNISYS DATA LINK for functional react component
const UDATAOwner = { name: 'URCommentThread' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);
/// Debug Flags
const DBG = false;
const PR = 'URCommentBtn';

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/** URCommentBtn renders the comment icon button on objects that can support
 *  comments.  It displays the number of comments and the "read" status.
 *  @param {string} cref - Collection reference
 *  @param {boolean} [uuiid] - Optional secondary identifier for comment button
 *  @returns {React.Component} - URCommentBtn
 */
function URCommentBtn({ cref, uuiid }) {
  const uid = CMTMGR.GetCurrentUserId();
  const btnid = c_GenerateBtnId(cref, uuiid);
  const [commentButtonId, setCommentButtonId] = useState(
    c_GenerateCommentButtonId(btnid)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [position, setPosition] = useState({ x: '300px', y: '120px' });
  const [dummy, setDummy] = useState(0); // Dummy state variable to force update

  /** Component Effect - set up listeners on mount */
  useEffect(() => {
    UDATA.OnAppStateChange('COMMENTCOLLECTION', urstate_UpdateCommentCollection);
    UDATA.OnAppStateChange('COMMENTVOBJS', urstate_UpdateCommentVObjs);
    UDATA.HandleMessage('COMMENT_UPDATE_PERMISSIONS', urmsg_UpdatePermissions);
    UDATA.HandleMessage('COMMENT_SELECT', urmsg_COMMENT_SELECT);
    window.addEventListener('resize', evt_OnResize);

    setPosition(c_GetCommentThreadPosition());

    return () => {
      UDATA.AppStateChangeOff('COMMENTCOLLECTION', urstate_UpdateCommentCollection);
      UDATA.AppStateChangeOff('COMMENTVOBJS', urstate_UpdateCommentVObjs);
      UDATA.UnhandleMessage('COMMENT_UPDATE_PERMISSIONS', urmsg_UpdatePermissions);
      UDATA.UnhandleMessage('COMMENT_SELECT', urmsg_COMMENT_SELECT);
      window.removeEventListener('resize', evt_OnResize);
    };
  }, []);

  /// UR HANDLERS /////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urstate_UpdateCommentCollection(COMMENTCOLLECTION) {
    const uistate = CMTMGR.GetCommentUIState(commentButtonId);
    const openuiref = CMTMGR.GetOpenComments(cref);
    if (uistate) {
      if (openuiref !== commentButtonId) {
        // close this comment if someone else is trying to open the same comment
        setIsOpen(false);
      } else {
        setIsOpen(uistate.isOpen);
      }
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urstate_UpdateCommentVObjs() {
    // This is necessary to force a re-render of the threads
    // when the comment collection changes on the net
    setDummy(dummy => dummy + 1); // Trigger re-render
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urmsg_UpdatePermissions(data) {
    setIsDisabled(data.commentBeingEditedByMe);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urmsg_COMMENT_SELECT(data) {
    if (data.cref === cref) c_OpenComment(true);
  }

  /// COMPONENT HELPER METHODS ////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function c_GenerateBtnId(cref, uuiid) {
    return `${cref}${uuiid ? uuiid : ''}`;
  }
  function c_GenerateCommentButtonId(btnid) {
    return `comment-button-${btnid}`;
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function c_OpenComment(isOpen) {
    const position = c_GetCommentThreadPosition();
    setIsOpen(isOpen);
    setPosition(position);
    CMTMGR.UpdateCommentUIState(commentButtonId, { cref, isOpen });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function c_GetCommentThreadPosition() {
    const btn = document.getElementById(commentButtonId);
    const cmtbtnx = btn.getBoundingClientRect().left;
    const windowWidth = Math.min(screen.width, window.innerWidth);
    let x;
    if (windowWidth - cmtbtnx < 500) {
      x = cmtbtnx - 405;
    } else {
      x = cmtbtnx + 35;
    }
    const y = btn.getBoundingClientRect().top + window.scrollY;
    return { x, y };
  }

  /// COMPONENT UI HANDLERS ///////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** handle URCommentBtn click, which opens and closes the URCommentThread */
  function evt_OnClick(event) {
    event.stopPropagation();
    if (!isDisabled) {
      const updatedIsOpen = !isOpen;
      c_OpenComment(updatedIsOpen);
    }
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** handles window resize, which will adjust the URCommentThread window
   *  position relative to the resized location of the URCommentBtn
   */
  function evt_OnResize() {
    const position = c_GetCommentThreadPosition();
    setPosition(position);
  }

  /// COMPONENT RENDER ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /** URCommentBtn displays:
   *  - the number of comments in the thread
   *  - the "read" status of all comments: unread (gold) or read (gray)
   *  - isOpen - click on the button to display threads in a new window
   */
  const count = CMTMGR.GetThreadedViewObjectsCount(cref, uid);
  const ccol = CMTMGR.GetCommentCollection(cref) || {};

  let css = 'commentbtn ';
  if (ccol.hasUnreadComments) css += 'hasUnreadComments ';
  else if (ccol.hasReadComments) css += 'hasReadComments ';
  css += isOpen ? 'isOpen ' : '';

  const label = count > 0 ? count : '';

  return (
    <div id={commentButtonId}>
      <div className={css} onClick={evt_OnClick}>
        {CMTMGR.COMMENTICON}
        <div className="comment-count">{label}</div>
      </div>
      {isOpen && (
        <URCommentThread
          uiref={commentButtonId}
          cref={cref}
          uid={uid}
          x={position.x}
          y={position.y}
        />
      )}
    </div>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URCommentBtn;
