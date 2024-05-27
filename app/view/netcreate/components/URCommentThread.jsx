/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentThread

  USE:

    <URCommentThread
      uiref
      cref={collection_ref}
      uid
      x
      y
    />

  PROPS:
    * uiref   -- reference to the comment button id, usu commentButtonId
    * cref    -- collection reference (usu node ide, edge id)
    * uid     -- user id of active user viewing or changing comment
    * x,y     -- position of open comment thread used to set proximity to
                 comment button


\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect } from 'react';
import Draggable from 'react-draggable';
import UNISYS from 'unisys/client';
import CMTMGR from '../comment-mgr';
import URComment from './URComment';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'URCommentThread';

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const URCommentThread = ({ uiref, cref, uid, x, y }) => {
  const [firstUpdate, setFirstUpdate] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);

  /// Initialize UNISYS DATA LINK for react component
  const UDATAOwner = { name: 'URCommentThread' };
  const UDATA = UNISYS.NewDataLink(UDATAOwner);

  /// INIT ////////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    const handleUpdatePermissions = data => {
      setIsDisabled(data.commentBeingEditedByMe);
    };

    UDATA.HandleMessage('COMMENT_UPDATE_PERMISSIONS', handleUpdatePermissions);

    return () => {
      UDATA.UnhandleMessage('COMMENT_UPDATE_PERMISSIONS', handleUpdatePermissions);
    };
  }, []);

  useEffect(() => {
    if (firstUpdate) {
      const commentVObjs = CMTMGR.GetThreadedViewObjects(cref, uid);
      const lastCVObj = commentVObjs[commentVObjs.length - 1];
      if (lastCVObj) {
        const lastCommentEl = document.getElementById(lastCVObj.comment_id);
        if (lastCommentEl) lastCommentEl.scrollIntoView({ behavior: 'smooth' });
      }
      setFirstUpdate(false);
    }
  }, [firstUpdate, cref, uid]);

  /// UI HANDLERS //////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const UIOnReply = () => {
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
  };

  const UIOnClose = () => {
    CMTMGR.CloseCommentCollection(uiref, cref, uid);
  };

  const UIOnReferentClick = (event, cref) => {
    event.preventDefault();
    event.stopPropagation();
    CMTMGR.OpenReferent(cref);
  };

  /// RENDER /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const commentVObjs = CMTMGR.GetThreadedViewObjects(cref, uid);
  const CloseBtn = (
    <button onClick={UIOnClose} disabled={isDisabled}>
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
            <a href="#" onClick={event => UIOnReferentClick(event, cref)}>
              {sourceLabel}
            </a>
          </div>
          {!isDisabled && (
            <div className="closeBtn" onClick={UIOnClose}>
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
              onClick={UIOnReply}
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
};

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URCommentThread;
