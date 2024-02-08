/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  CommentThread

  USE:

    <NCComentThread
      cref={collection_ref}
    />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const Draggable = require('react-draggable');
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
    this.UpdateCommentVObjs = this.UpdateCommentVObjs.bind(this);
    // UI HANDLERS
    this.UIOnReply = this.UIOnReply.bind(this);
    this.UIOnClose = this.UIOnClose.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.OnAppStateChange('COMMENTVOBJS', this.UpdateCommentVObjs);
  }

  UpdateCommentVObjs(COMMENTVOBJS) {
    this.forceUpdate();
  }

  UIOnReply(event) {
    const { cref } = this.props;
    const commentVObjs = CMTMGR.GetThreadedViewObjects(cref);

    const numComments = commentVObjs.length;
    if (numComments < 1) {
      // Add first root comment
      CMTMGR.AddComment({
        cref,
        comment_id_parent: '',
        comment_id_previous: ''
      });
    } else {
      // Add reply to last comment in thread
      const lastComment = commentVObjs[numComments - 1];
      CMTMGR.AddComment({
        cref,
        comment_id_parent: '',
        comment_id_previous: lastComment.comment_id
      });
    }
  }

  UIOnClose(event) {}

  render() {
    const { cref } = this.props;
    const commentVObjs = CMTMGR.GetThreadedViewObjects(cref);
    const CloseBtn = <button onClick={this.UIOnClose}>Close</button>;

    return (
      <Draggable>
      <div className="commentThread">
          <div className="topbar">X</div>
        {commentVObjs.map(cvobj => (
          <NCComment key={cvobj.comment_id} cvobj={cvobj} />
        ))}
        <textarea
          placeholder="Click to add a Comment..."
          readOnly
          onClick={this.UIOnReply}
        ></textarea>
          <div className="commentbar">{CloseBtn}</div>
      </div>
      </Draggable>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentThread;
