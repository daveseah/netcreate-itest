/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentThreadMgr

  URCommentThreadMgr handles the opening and closing of URCommentThreads
  being requested from three sources:
  * Evidence Links -- via URCOmmentBtnAlias
  * SVG props      -- in class-vbadge via UR.Publish(`CTHREADMGR_THREAD_OPENED`) calls
  * SVG Mechanisms -- in class-vbadge via UR.Publish(`CTHREADMGR_THREAD_OPENED`) calls

  URCommentVBtn is a visual component that passes clicks
  to URCommentThreadMgr via UR.Publish(`CTHREADMGR_THREAD_OPENED`) calls


  HOW IT WORKS
    When an EVLink, SVG prop, or SVG mechanism clicks on the
    URCommentVBtn, URCommentThreadMgr will:
    * Add the requested Thread to the URCommentThreadMgr
    * Open the URCommentThread
    * When the URCommentThread is closed, it will be removed from the URCommentThreadMgr

  See [Whimsical Comment Data Structures](https://whimsical.com/comment-data-structures-3zPhDYLVsEKt2gY7xyMMKS) for how the current system is implemented.

  UR MESSAGES
    *  CTHREADMGR_THREAD_OPENED {cref, position}
    *  CTHREADMGR_THREAD_CLOSED {cref}            Just closed, update views
    *  CTHREADMGR_THREAD_CLOSED_ALL


  NOTES

  * Differences with URCommentBtn

    URCommentBtn displays Comment Collections (e.g. URCommentThread) as children
    of the URCommentBtn.
    In contrast, URCommentThread are displayed as children of URCommentTHreadMgr.
    This gets around the problem of URCommentBtns beimg hidden inside Evidence Links.

    To get around this, URCommentThreadMgr essentially replaces the
    functionality of URCommentBtn with three pieces, acting as a middle
    man and breaking out the...
    * visual display    -- URCommentBtnAlias
    * UI click requests -- UR messages
    * thread opening / closing requests -- URCommentThreadMgr
    ...into different functions handled by different components.

  USE:

    <URCommentThreadMgr message={message} handleMessageUpdate/>



\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect, useCallback } from 'react';
import UNISYS from 'unisys/client';

import CMTMGR from '../comment-mgr';
import URCommentThread from './URCommentThread';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
/// Initialize UNISYS DATA LINK for functional react component
const UDATAOwner = { name: 'URCommentThreadMgr' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);
//
const DBG = true;
const PR = 'URCommentThreadMgr';

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URCommentThreadMgr() {
  const uid = CMTMGR.GetCurrentUserId();
  const [cmtBtns, setCmtBtns] = useState([]); // { uiref, cref, position }
  const [dummy, setDummy] = useState(100);

  /** Component Effect - register listeners on mount */
  useEffect(() => {
    UDATA.OnAppStateChange('COMMENTVOBJS', urstate_UpdateCommentVObjs);
    UDATA.HandleMessage('CTHREADMGR_THREAD_OPENED', urmsg_THREAD_OPEN);
    UDATA.HandleMessage('CTHREADMGR_THREAD_CLOSED', urmsg_THREAD_CLOSE);
    UDATA.HandleMessage('CTHREADMGR_THREAD_CLOSED_ALL', urmsg_THREAD_CLOSE_ALL);

    return () => {
      UDATA.AppStateChangeOff('COMMENTVOBJS', urstate_UpdateCommentVObjs);
      UDATA.UnhandleMessage('CTHREADMGR_THREAD_OPENED', urmsg_THREAD_OPEN);
      UDATA.UnhandleMessage('CTHREADMGR_THREAD_CLOSED', urmsg_THREAD_CLOSE);
      UDATA.UnhandleMessage('CTHREADMGR_THREAD_CLOSED_ALL', urmsg_THREAD_CLOSE_ALL);
    };
  }, []);

  /// COMPONENT HELPER METHODS ////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /// UR HANDLERS /////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urstate_UpdateCommentVObjs(data) {
    // This is necessary to force a re-render of the threads
    // when the comment collection changes on the net
    // especially when a new comment is added.
    setDummy(dummy => dummy + 1); // Trigger re-render
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   * Handle CTHREADMGR_THREAD_OPENED message
   * 1. Register the button, and
   * 2. Open the URCommentBtn
   * @param {Object} data
   * @param {string} data.uiref - ID of UI component initiating the request
   * @param {string} data.cref - Collection reference
   * @param {Object} data.position - Position of the button
   */
  function urmsg_THREAD_OPEN(data) {
    if (DBG) console.log(PR, 'urmsg_THREAD_OPEN', data);
    // Validate
    if (data.uiref === undefined)
      throw new Error(
        `URCommentThreadMgr: urmsg_THREAD_OPEN: missing uiref ${JSON.stringify(data)}`
      );
    if (
      data.position === undefined ||
      data.position.x === undefined ||
      data.position.y === undefined
    )
      throw new Error(
        `URCommentThreadMgr: urmsg_THREAD_OPEN: missing position data ${JSON.stringify(
          data
        )}`
      );
    // 1. Register the button
    setCmtBtns(prevBtns => [...prevBtns, data]);
    // 2. Open the URCommentThread
    // NOTE: Call is to data.uiref, not data.cref
    CMTMGR.UpdateCommentUIState(data.uiref, { cref: data.cref, isOpen: true });
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urmsg_THREAD_CLOSE(data) {
    if (DBG) console.log('urmsg_THREAD_CLOSE', data);
    setCmtBtns(prevBtns => prevBtns.filter(btn => btn.cref !== data.cref));
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urmsg_THREAD_CLOSE_ALL(data) {
    if (DBG) console.log('urmsg_THREAD_CLOSE_ALL', data);
    setCmtBtns([]);
  }

  /// COMPONENT RENDER ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  return (
    <div className="URCommentThreadMgr">
      {cmtBtns.map(btn => (
        <URCommentThread
          key={btn.cref}
          uiref={btn.uiref}
          cref={btn.cref}
          uid={uid}
          x={btn.position.x}
          y={btn.position.y}
        />
      ))}
    </div>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URCommentThreadMgr;
