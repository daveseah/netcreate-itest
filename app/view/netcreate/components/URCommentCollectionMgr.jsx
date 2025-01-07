/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentCollectionMgr

  Comment collection components are dynamically created and destroyed in the
  DOM as the user requests opening and closing comment collection windows.
  The URCommentCollectionMgr handles the insertion and removal of these
  components.

  UR MESSAGES
  *  CMT_COLLECTION_SHOW {cref, position}
  *  CMT_COLLECTION_HIDE {cref}
  *  CMT_COLLECTION_HIDE_ALL

  USE:

    <URCommentCollectionMgr message={message} handleMessageUpdate/>


  HISTORY
  Originally, URCommentBtn were designed to handle comment opening
  in Net.Create from two types componets: nodes/edges and
  NodeTables/EdgeTables.  Since the requests could come
  from different components, we had to keep track of which component
  was requesting the opening, so they could close the corresponding
  comment.  In order to do this, we used a reference that combined
  the comment id reference (collection reference, or cref)
  with a unique user interface id (uuiid).

  MEME doesn't need that so we simply use `cref` as the
  comment id.

  That simplifies the comment references, but there was a second
  challenge:

  Since the SVG props and mechanisms are NOT react components, we
  cannot use URCommentBtn to manage opening and editing comments.
  Moreover, URCommentBtns opened inside Evidence Links are embedded
  inside the Evidence Library and comments created inside the library
  end up hidden due to layers of overflow divs.

  To get around this, URCommentCollectionMgr essentially replaces the
  functionality of URCommentBtn with three pieces, acting as a middle
  man and breaking out the...
  * visual display    -- URCommentSVGBtn
  * UI click requests -- URCommentVBtn
  * thread opening / closing requests -- URCommentCollectionMgr
  ...into different functions handled by different components.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect, useCallback } from 'react';
import UNISYS from 'unisys/client';
// import UR from '../../../system/ursys';
// const STATE = require('../lib/client-state');

import CMTMGR from '../comment-mgr';
import URCommentThread from './URCommentThread';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = true;
const PR = 'URCommentCollectionMgr';

const UDATAOwner = { name: 'URCommentCollectionMgr' };
const UDATA = UNISYS.NewDataLink(UDATAOwner);

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URCommentCollectionMgr(props) {
  const uid = CMTMGR.GetCurrentUserId();
  const [cmtBtns, setCmtBtns] = useState([]);
  const [dummy, setDummy] = useState(0); // Dummy state variable to force update

  /** Component Effect - register listeners on mount */
  useEffect(() => {
    UDATA.OnAppStateChange('COMMENTVOBJS', redraw, UDATAOwner);
    UDATA.HandleMessage('CMT_COLLECTION_SHOW', urmsg_COLLECTION_SHOW);
    UDATA.HandleMessage('CMT_COLLECTION_HIDE', urmsg_COLLECTION_HIDE);
    UDATA.HandleMessage('CMT_COLLECTION_HIDE_ALL', urmsg_COLLECTION_HIDE_ALL);

    return () => {
      UDATA.AppStateChangeOff('COMMENTVOBJS', redraw);
      UDATA.UnhandleMessage('CMT_COLLECTION_SHOW', urmsg_COLLECTION_SHOW);
      UDATA.UnhandleMessage('CMT_COLLECTION_HIDE', urmsg_COLLECTION_HIDE);
      UDATA.UnhandleMessage('CMT_COLLECTION_HIDE_ALL', urmsg_COLLECTION_HIDE_ALL);
    };
  }, []);

  /// COMPONENT HELPER METHODS ////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /// UR HANDLERS /////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function redraw(data) {
    // This is necessary to force a re-render of the threads
    // when the comment collection changes on the net
    // especially when a new comment is added.
    setDummy(dummy => dummy + 1); // Trigger re-render
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  /**
   * Handle urmsg_COLLECTION_SHOW message
   * 1. Register the button, and
   * 2. Open the URCommentBtn
   * @param {Object} data
   * @param {string} data.cref - Collection reference
   * @param {Object} data.position - Position of the button
   */
  function urmsg_COLLECTION_SHOW(data) {
    if (DBG) console.log(PR, 'CMT_COLLECTION_SHOW', data);
    setCmtBtns(prevBtns => [...prevBtns, data]);
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urmsg_COLLECTION_HIDE(data) {
    if (DBG) console.log(PR, 'CMT_COLLECTION_HIDE', data);
    setCmtBtns(prevBtns => prevBtns.filter(btn => btn.cref !== data.cref));
  }
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function urmsg_COLLECTION_HIDE_ALL(data) {
    if (DBG) console.log(PR, 'CMT_COLLECTION_HIDE_ALL', data);
    setCmtBtns([]);
  }

  /// COMPONENT RENDER ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  return (
    <div className="URCommentCollectionMgr">
      {cmtBtns.map(btn => (
        <URCommentThread
          key={btn.cref}
          uiref={btn.cref}
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
export default URCommentCollectionMgr;
