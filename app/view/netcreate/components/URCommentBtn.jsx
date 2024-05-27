/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentBtn

  URCommentBtn is the main UI element for comments.  It can be attached to any
  UI component and provides a place to anchor and display comments.
  * Clicking the CommentBtn will toggle the comment view on and off
  * Closing the comment by clicking the "Close" or "X" button will mark
    the comments "read".
  * "Read/Unread" status is tied to a user id.

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
      isTable
    />

  PROPS:
    * cref    -- collection reference (usu node ide, edge id)
    * isTable -- used to differentiate comment buttons on tables vs nodes/edges
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

import React, { useState, useEffect, useCallback } from 'react';
import UNISYS from 'unisys/client';
import CMTMGR from '../comment-mgr';
import URCommentThread from './URCommentThread';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'URCommentBtn';

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const URCommentBtn = ({ cref, isTable }) => {
  /// CONSTANTS & DECLARATIONS ////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const uid = CMTMGR.GetCurrentUserId();
  const btnid = `${cref}${isTable ? '-isTable' : ''}`;
  const [isOpen, setIsOpen] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [position, setPosition] = useState({ x: '300px', y: '120px' });
  const [dummy, setDummy] = useState(0); // Dummy state variable to force update
  const commentButtonId = `comment-button-${btnid}`;

  /// Initialize UNISYS DATA LINK for functional react component
  const UDATAOwner = { name: 'URCommentThread' };
  const UDATA = UNISYS.NewDataLink(UDATAOwner);

  /// METHODS /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const UpdateCommentCollection = useCallback(
    COMMENTCOLLECTION => {
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
    },
    [commentButtonId, cref]
  );

  const UpdateCommentVObjs = useCallback(() => {
    // This is necessary to force a re-render of the threads
    // when the comment collection changes on the net
    setDummy(dummy => dummy + 1); // Trigger re-render
  }, []);

  const UpdatePermissions = useCallback(data => {
    setIsDisabled(data.commentBeingEditedByMe);
  }, []);

  const HandleCOMMENT_SELECT = useCallback(
    data => {
      if (data.cref === cref) UIOpenComment(true);
    },
    [cref]
  );

  const UIOpenComment = useCallback(
    isOpen => {
      const position = GetCommentThreadPosition();
      setIsOpen(isOpen);
      setPosition(position);
      CMTMGR.UpdateCommentUIState(commentButtonId, { cref, isOpen });
    },
    [GetCommentThreadPosition, commentButtonId, cref]
  );

  const GetCommentThreadPosition = useCallback(() => {
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
  }, [commentButtonId]);

  /// UI HANDLERS //////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const UIOnClick = useCallback(
    event => {
      event.stopPropagation();
      if (!isDisabled) {
        const updatedIsOpen = !isOpen;
        UIOpenComment(updatedIsOpen);
      }
    },
    [isDisabled, isOpen, UIOpenComment]
  );

  const UIOnResize = useCallback(() => {
    const position = GetCommentThreadPosition();
    setPosition(position);
  }, [GetCommentThreadPosition]);

  /// INIT ////////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    UDATA.OnAppStateChange('COMMENTCOLLECTION', UpdateCommentCollection);
    UDATA.OnAppStateChange('COMMENTVOBJS', UpdateCommentVObjs);
    UDATA.HandleMessage('COMMENT_UPDATE_PERMISSIONS', UpdatePermissions);
    UDATA.HandleMessage('COMMENT_SELECT', HandleCOMMENT_SELECT);
    window.addEventListener('resize', UIOnResize);

    setPosition(GetCommentThreadPosition());

    return () => {
      UDATA.AppStateChangeOff('COMMENTCOLLECTION', UpdateCommentCollection);
      UDATA.AppStateChangeOff('COMMENTVOBJS', UpdateCommentVObjs);
      UDATA.UnhandleMessage('COMMENT_UPDATE_PERMISSIONS', UpdatePermissions);
      UDATA.UnhandleMessage('COMMENT_SELECT', HandleCOMMENT_SELECT);
      window.removeEventListener('resize', UIOnResize);
    };
  }, [
    UpdateCommentCollection,
    UpdateCommentVObjs,
    UpdatePermissions,
    HandleCOMMENT_SELECT,
    UIOnResize,
    GetCommentThreadPosition
  ]);

  /// RENDER /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const count = CMTMGR.GetThreadedViewObjectsCount(cref, uid);
  const ccol = CMTMGR.GetCommentCollection(cref) || {};

  let css = 'commentbtn ';
  if (ccol.hasUnreadComments) css += 'hasUnreadComments ';
  else if (ccol.hasReadComments) css += 'hasReadComments ';
  css += isOpen ? 'isOpen ' : '';

  const label = count > 0 ? count : '';

  return (
    <div id={commentButtonId}>
      <div className={css} onClick={UIOnClick}>
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
};

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URCommentBtn;
