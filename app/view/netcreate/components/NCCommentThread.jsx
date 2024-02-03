/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  CommentThread

  USE:

    <NCComentThread
      cref={collection_ref}
    />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const CMTMGR = require('../comment-mgr');
const NCComment = require('./NCComment');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCCommentThread';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDATA;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NCCommentThread extends React.Component {
  constructor(props) {
    super(props);

    // EVENT HANDLERS
    this.UpdateComments = this.UpdateComments.bind(this);
    // UI HANDLERS
    this.UiOnReply = this.UiOnReply.bind(this);
    this.UiOnClose = this.UiOnClose.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.OnAppStateChange('COMMENTS', this.UpdateComments);
  }

  UpdateComments(data) {}

  UiOnReply(event) {
    CMTMGR.AddComment();
    this.render();
  }

  UiOnClose(event) {}

  render() {
    const ReplyBtn = <button onClick={this.uiOneReply}>Reply</button>;
    const CloseBtn = <button onClick={this.UiOnClose}>Close</button>;

    const commentVObjs = CMTMGR.GetThreadedViewObjects('1'); // HARD CODE first ref!!! HACK!!!

    return (
      <div className="commentThread">
        {commentVObjs.map(cvobj => (
          <NCComment key={cvobj.comment_id} cvobj={cvobj} />
        ))}
        <textarea
          placeholder="Click to add a Comment..."
          onClick={this.UiOnReply}
        ></textarea>
        {/* <div className="commentbar">
          {CloseBtn}
          <div></div>
          {ReplyBtn}
        </div> */}
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentThread;
