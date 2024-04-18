/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Generic Dialog

  USE:

    <NCCommentStatus message={message} handleMessageUpdate/>

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const NetMessage = require('unisys/common-netmessage-class');
const CMTMGR = require('../comment-mgr');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCCommentStatus';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDATA;
let AppearTimer;
let DisappearTimer;
let ResetTimer;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NCCommentStatus extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: 'delayed',
      messages: [],
      activeCSS: '',
      uiIsExpanded: false
    };
    this.HandleCOMMENTS_UPDATE = this.HandleCOMMENTS_UPDATE.bind(this);
    this.HandleCOMMENT_UPDATE = this.HandleCOMMENT_UPDATE.bind(this);
    this.GetCommentItem = this.GetCommentItem.bind(this);
    this.UIOpen = this.UIOpen.bind(this);
    this.UIClose = this.UIClose.bind(this);
    this.UIMarkAllRead = this.UIMarkAllRead.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.OnAppStateChange('COMMENTCOLLECTION', () => this.forceUpdate()); // respond to close
    UDATA.HandleMessage('COMMENTS_UPDATE', this.HandleCOMMENTS_UPDATE);
    UDATA.HandleMessage('COMMENT_UPDATE', this.HandleCOMMENT_UPDATE);
  }

  HandleCOMMENTS_UPDATE(data) {
    this.forceUpdate();
  }

  HandleCOMMENT_UPDATE(data) {
    const { messages } = this.state;
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
      const message = this.GetCommentItem(comment);
      messages.push(message);

      // Only show status update if it's coming from another
      if (isNotMe) {
        clearTimeout(AppearTimer);
        clearTimeout(DisappearTimer);
        clearTimeout(ResetTimer);
        // clear it first, then appear (so that each new comment triggers the animation)
        this.setState(
          {
            message,
            messages,
            activeCSS: ''
          },
          () => {
            AppearTimer = setTimeout(() => {
              this.setState({ activeCSS: 'appear' });
            }, 250);
            DisappearTimer = setTimeout(() => {
              this.setState({ activeCSS: 'disappear' });
            }, 8000);
            ResetTimer = setTimeout(() => {
              this.setState({ message: '', activeCSS: '' });
            }, 13000); // should equal the `disappeaer` ease-in period + 'disappear' timeout
          }
        );
      } else {
        this.forceUpdate(); // force update to update counts
      }
    }
  }

  GetCommentItem(comment) {
    // HACK Source Name
    const cref = comment ? comment.collection_ref : '';
    const { typeLabel, sourceLabel } = CMTMGR.GetCREFSourceLabel(cref);
    return (
      <div className="comment-item" key={comment.comment_id}>
        <div className="comment-sourcetype">{typeLabel}&nbsp;</div>
        <div className="comment-sourcelabel">{sourceLabel}</div>
        <div className="commenter">: {comment.commenter_id}&nbsp;</div>
        <a href="#">{`#${comment.comment_id}`}</a>&nbsp;&ldquo;
        <div className="comment-text">
          {String(comment.commenter_text.join('|')).trim()}
        </div>
        &rdquo;
      </div>
    );
  }

  UIOpen() {
    clearTimeout(DisappearTimer);
    clearTimeout(ResetTimer);
    this.setState({ activeCSS: 'appear', uiIsExpanded: true });
  }

  UIClose() {
    this.setState({ message: '', activeCSS: '', uiIsExpanded: false });
  }

  UIMarkAllRead() {
    CMTMGR.MarkAllRead();
  }

  render() {
    const isLoggedIn = NetMessage.GlobalGroupID();
    if (!isLoggedIn) return '';

    const { message, messages, activeCSS, uiIsExpanded } = this.state;
    const { countRepliesToMe, countUnread } = CMTMGR.GetCommentStats();
    const unreadRepliesToMe = CMTMGR.GetUnreadRepliesToMe();
    const unreadRepliesToMeItems = unreadRepliesToMe.map(comment =>
      this.GetCommentItem(comment)
    );
    const unreadComments = CMTMGR.GetUnreadComments();
    const unreadCommentItems = unreadComments.map(comment =>
      this.GetCommentItem(comment)
    );

    const UnreadRepliesToMeButtonJSX = (
      <div>
        <div className="commentbtn hasNewComments" onClick={this.UIOnClick}>
          {CMTMGR.COMMENTICON}
          <div className="comment-count">{countRepliesToMe}</div>
        </div>
        <h3>&nbsp;unread replies to me</h3>
      </div>
    );
    const UnreadButtonJSX = (
      <div>
        <div className="commentbtn hasUnreadComments" onClick={this.UIOnClick}>
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
            onClick={this.UIOpen}
          >
            {UnreadRepliesToMeButtonJSX}&nbsp;&nbsp;{UnreadButtonJSX}
          </div>
          <div
            id="comment-panel"
            className={`${uiIsExpanded ? ' expanded' : ''}`}
            onClick={this.UIClose}
          >
            <div className="comments-unread">
              {UnreadRepliesToMeButtonJSX}
              <div className="comment-status-body">{unreadRepliesToMeItems}</div>
              {UnreadButtonJSX}
              <div className="comment-status-body">{unreadCommentItems}</div>
              <div className="commentbar">
                <button className="small" onClick={this.UIMarkAllRead}>
                  Mark All Read
                </button>
                <button className="small" onClick={this.UIClose}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentStatus;
