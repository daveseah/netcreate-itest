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
      activeCSS: ''
    };
    this.HandleCOMMENT_UPDATE = this.HandleCOMMENT_UPDATE.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.HandleMessage('COMMENT_UPDATE', this.HandleCOMMENT_UPDATE);
  }

  HandleCOMMENT_UPDATE(data, extras) {
    const { comment } = data;
    console.error('COMMENT_UPDATE', data);
    console.log('EXTRAS', extras);
    if (comment && comment.commenter_text.length > 0) {
      let source;
      if (comment.comment_id_parent) {
        source = `${comment.commenter_id} replied: `;
      } else {
        source = `${comment.commenter_id} commented: `;
      }
      const message = (
        <div>
          <span className="commenter">{source}</span>
          &ldquo;{String(comment.commenter_text.join('|')).trim()}&rdquo;
        </div>
      );
      console.log('========>update');
      clearTimeout(AppearTimer);
      clearTimeout(DisappearTimer);
      clearTimeout(ResetTimer);
      // clear it first, then appear (so that each new comment triggers the animation)
      this.setState(
        {
          message,
          activeCSS: ''
        },
        () => {
          AppearTimer = setTimeout(() => {
            console.log('========>appear');
            this.setState({ activeCSS: 'appear' });
          }, 250);
          DisappearTimer = setTimeout(() => {
            console.log('========>disappear');
            this.setState({ activeCSS: 'disappear' });
          }, 5000);
          ResetTimer = setTimeout(() => {
            console.log('========>reset');
            this.setState({ message: '', activeCSS: '' });
          }, 8000); // should equal the `disappeaer` ease-in period + 'disappear' timeout
        }
      );
    }
  }

  render() {
    const { message, activeCSS } = this.state;
    return (
      <div id="comment-status" className={activeCSS}>
        <div className="comment-status-body">{message}</div>
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentStatus;
