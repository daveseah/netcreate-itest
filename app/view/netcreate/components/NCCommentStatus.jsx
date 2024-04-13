/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Generic Dialog

  USE:

    <NCCommentStatus message={message} handleMessageUpdate/>

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');

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
    this.HandleCOMMENT_UPDATE = this.HandleCOMMENT_UPDATE.bind(this);
    this.UIKeepOpen = this.UIKeepOpen.bind(this);
    this.UIClose = this.UIClose.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.HandleMessage('COMMENT_UPDATE', this.HandleCOMMENT_UPDATE);
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
      const message = (
        <div className="comment-item">
          <span className="commenter">{source}</span>
          &ldquo;{String(comment.commenter_text.join('|')).trim()}&rdquo;{' '}
          <a href="#">{`#${comment.comment_id}`}</a>
        </div>
      );
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
    }
  }
  }

  UIKeepOpen() {
    clearTimeout(DisappearTimer);
    clearTimeout(ResetTimer);
    this.setState({ activeCSS: 'appear', uiIsExpanded: true });
  }

  UIClose() {
    this.setState({ message: '', activeCSS: '', uiIsExpanded: false });
  }

  render() {
    const { message, messages, activeCSS, uiIsExpanded } = this.state;
    return (
      <div
        id="comment-status"
        className={`${activeCSS} ${uiIsExpanded ? ' expanded' : ''}`}
      >
        {!uiIsExpanded && (
          <div className="comment-status-body">
            {message}{' '}
            <button className="small" onClick={this.UIKeepOpen}>
              Recent Comments...
            </button>
          </div>
        )}

        {messages.map((message, index) => (
          <div className="comment-status-body" key={index}>
            {message}
          </div>
        ))}
        <button className="small" onClick={this.UIClose}>
          Close
        </button>
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentStatus;
