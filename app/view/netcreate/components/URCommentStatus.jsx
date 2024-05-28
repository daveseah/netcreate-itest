/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentStatus

  Displays network comment status messages in navbar.

  USE:

    <URCommentStatus message={message} handleMessageUpdate/>

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect } from 'react';
import UNISYS from 'unisys/client';
import NetMessage from 'unisys/common-netmessage-class';
import CMTMGR from '../comment-mgr';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'URCommentStatus';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let AppearTimer;
let DisappearTimer;
let ResetTimer;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const URCommentStatus = props => {
  const [message, setMessage] = useState('delayed');
  const [messages, setMessages] = useState([]);
  const [activeCSS, setActiveCSS] = useState('');
  const [uiIsExpanded, setUiIsExpanded] = useState(false);
  const [dummy, setDummy] = useState(0); // Dummy state variable to force update

  /// Initialize UNISYS DATA LINK for functional react component
  const UDATAOwner = { name: 'URCommentThread' };
  const UDATA = UNISYS.NewDataLink(UDATAOwner);

  /// URSYS HANDLERS //////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const HandleCOMMENTS_UPDATE = () => {
    // This is necessary to force a re-render of the comment summaries
    // when the comment collection changes on the net
    setDummy(dummy => dummy + 1); // Trigger re-render
  };

  const HandleCOMMENT_UPDATE = data => {
    const { comment, uaddr } = data;

    const my_uaddr = UNISYS.SocketUADDR();
    const isNotMe = my_uaddr !== uaddr;

    if (comment && comment.commenter_text.length > 0) {
      let source;
      if (comment.comment_id_parent) {
        source = `${comment.commenter_id} replied: `;
      } else {
        source = `${comment.commenter_id} commented: `;
      }
      comment.commenter_id = source;
      const message = GetCommentItem(comment);
      setMessages(prevMessages => [...prevMessages, message]);

      // Only show status update if it's coming from another
      if (isNotMe) {
        clearTimeout(AppearTimer);
        clearTimeout(DisappearTimer);
        clearTimeout(ResetTimer);
        // clear it first, then appear (so that each new comment triggers the animation)
        setMessage(message);
        setActiveCSS('');
        AppearTimer = setTimeout(() => {
          setActiveCSS('appear');
        }, 250);
        DisappearTimer = setTimeout(() => {
          setActiveCSS('disappear');
        }, 8000);
        ResetTimer = setTimeout(() => {
          setMessage('');
          setActiveCSS('');
        }, 13000); // should equal the `disappear` ease-in period + 'disappear' timeout
      } else {
        setDummy(dummy => dummy + 1); // force update to update counts
      }
    }
  };

  /// METHODS /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const GetCommentItem = comment => {
    if (comment.comment_isMarkedDeleted) return ''; // was marked deleted, so skip
    const cref = comment ? comment.collection_ref : '';
    const { typeLabel, sourceLabel } = CMTMGR.GetCREFSourceLabel(cref);
    if (sourceLabel === undefined) return ''; // source was deleted, so skip
    return (
      <div className="comment-item" key={comment.comment_id}>
        <div className="comment-sourcetype">{typeLabel}&nbsp;</div>
        <a
          href="#"
          className="comment-sourcelabel"
          onClick={event => UIOpenReferent(event, cref)}
        >
          {sourceLabel}
        </a>
        <div className="commenter">: {comment.commenter_id}&nbsp;</div>
        <a
          href="#"
          onClick={event => UIOpenComment(event, cref, comment.comment_id)}
        >{`#${comment.comment_id}`}</a>
        &nbsp;&ldquo;
        <div className="comment-text">
          {String(comment.commenter_text.join('|')).trim()}
        </div>
        &rdquo;
      </div>
    );
  };

  /// UI HANDLERS //////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const UIExpandPanel = () => {
    clearTimeout(DisappearTimer);
    clearTimeout(ResetTimer);
    setActiveCSS('appear');
    setUiIsExpanded(true);
  };

  const UIClose = () => {
    setMessage('');
    setActiveCSS('');
    setUiIsExpanded(false);
  };

  const UIMarkAllRead = () => {
    CMTMGR.MarkAllRead();
  };

  const UIOpenReferent = (event, cref) => {
    event.preventDefault();
    event.stopPropagation();
    CMTMGR.OpenReferent(cref);
  };

  const UIOpenComment = (event, cref, cid) => {
    event.preventDefault();
    event.stopPropagation();
    CMTMGR.OpenComment(cref, cid);
  };

  /// INIT ////////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    /// REGISTER LISTENERS
    UDATA.OnAppStateChange('COMMENTCOLLECTION', () => setDummy(dummy => dummy + 1)); // respond to close
    UDATA.HandleMessage('COMMENTS_UPDATE', HandleCOMMENTS_UPDATE);
    UDATA.HandleMessage('COMMENT_UPDATE', HandleCOMMENT_UPDATE);

    return () => {
      UDATA.AppStateChangeOff('COMMENTCOLLECTION', () =>
        setDummy(dummy => dummy + 1)
      ); // respond to close
      UDATA.UnhandleMessage('COMMENTS_UPDATE', HandleCOMMENTS_UPDATE);
      UDATA.UnhandleMessage('COMMENT_UPDATE', HandleCOMMENT_UPDATE);
    };
  }, []);

  /// RENDER /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const isLoggedIn = NetMessage.GlobalGroupID();
  if (!isLoggedIn) return '';

  const { countRepliesToMe, countUnread } = CMTMGR.GetCommentStats();
  const unreadRepliesToMe = CMTMGR.GetUnreadRepliesToMe();
  const unreadRepliesToMeItems = unreadRepliesToMe.map(comment =>
    GetCommentItem(comment)
  );
  const unreadComments = CMTMGR.GetUnreadComments();
  const unreadCommentItems = unreadComments.map(comment => GetCommentItem(comment));

  const UnreadRepliesToMeButtonJSX = (
    <div>
      <div
        className={`commentbtn ${
          countRepliesToMe ? 'hasNewComments' : 'hasReadComments'
        }`}
        onClick={UIExpandPanel}
      >
        {CMTMGR.COMMENTICON}
        <div className="comment-count">{countRepliesToMe}</div>
      </div>
      <h3>&nbsp;unread replies to me</h3>
    </div>
  );
  const UnreadButtonJSX = (
    <div>
      <div
        className={`commentbtn ${
          countUnread ? 'hasUnreadComments' : 'hasReadComments'
        }`}
        onClick={UIExpandPanel}
      >
        {CMTMGR.COMMENTICON}
        <div className="comment-count">{countUnread}</div>
      </div>
      <h3>&nbsp;unread</h3>
    </div>
  );

  return (
    <div id="comment-bar">
      <div
        id="comment-alert"
        className={`${activeCSS} ${uiIsExpanded ? ' expanded' : ''}`}
      >
        {!uiIsExpanded && <div className="comment-status-body">{message}</div>}
      </div>
      <div>
        <div
          id="comment-summary"
          className={`${uiIsExpanded ? ' expanded' : ''}`}
          onClick={UIExpandPanel}
        >
          {UnreadRepliesToMeButtonJSX}&nbsp;&nbsp;{UnreadButtonJSX}
        </div>
        <div
          id="comment-panel"
          className={`${uiIsExpanded ? ' expanded' : ''}`}
          onClick={UIClose}
        >
          <div className="comments-unread">
            {UnreadRepliesToMeButtonJSX}
            <div className="comment-status-body">{unreadRepliesToMeItems}</div>
            {UnreadButtonJSX}
            <div className="comment-status-body">{unreadCommentItems}</div>
            <div className="commentbar">
              <button className="small" onClick={UIClose}>
                Close
              </button>
              <button className="small" onClick={UIMarkAllRead}>
                Mark All Read
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URCommentStatus;
