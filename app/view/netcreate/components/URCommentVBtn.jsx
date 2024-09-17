/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentVBtn

  A purely visual button.

  It shows three visual states:
  * read/unread status
    * has unread comments (gold color)
    * all comments are read (gray color)
  * is open / selected (displaying comments)
  * the number of comments.



\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect } from 'react';
import CMTMGR from '../comment-mgr';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URCommentVBtn({ uiref, count, hasUnreadComments, selected, cb }) {
  let icon;
  if (selected) {
    if (hasUnreadComments) icon = CMTMGR.ICN_COMMENT_UNREAD_SELECTED;
    else if (count === 0) icon = CMTMGR.ICN_COMMENT_UNREAD_SELECTED;
    else icon = CMTMGR.ICN_COMMENT_READ_SELECTED;
  } else {
    // not selected
    if (hasUnreadComments) icon = CMTMGR.ICN_COMMENT_UNREAD;
    else if (count === 0) icon = CMTMGR.ICN_COMMENT_UNREAD;
    else icon = CMTMGR.ICN_COMMENT_READ;
  }

  return (
    <button id={uiref} onClick={cb} className="URCommentVBtn">
      {icon}
      <div className={`count ${hasUnreadComments ? 'unread' : ''}`}>
        {count === 0 ? '' : count}
      </div>
    </button>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URCommentVBtn;
