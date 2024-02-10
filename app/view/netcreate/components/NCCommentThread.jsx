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
    const { cref, uid } = this.props;

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
      // Add reply to last comment in thread
      const lastComment = commentVObjs[numComments - 1];
      CMTMGR.AddComment({
        cref,
        comment_id_parent: '',
        comment_id_previous: lastComment.comment_id,
        commenter_id: uid
      });
    }
  }

  UIOnClose(event) {
    const { cref, uid } = this.props;
    CMTMGR.CloseCommentCollection(cref, uid);
  }

  render() {
    const { cref, uid } = this.props;

    const commentVObjs = CMTMGR.GetThreadedViewObjects(cref, uid);
    const CloseBtn = <button onClick={this.UIOnClose}>Close</button>;

    return (
      <Draggable>
        <div className="commentThread">
          <div className="topbar">X</div>
          {commentVObjs.map(cvobj => (
            <NCComment key={cvobj.comment_id} cvobj={cvobj} uid={uid} />
          ))}
          {uid && (
            <textarea
              placeholder="Click to add a Comment..."
              readOnly
              onClick={this.UIOnReply}
            ></textarea>
          )}
          {!uid && commentVObjs.length < 1 && (
            <div className="label" style={{ textAlign: 'center' }}>
              No comments
            </div>
          )}
          <div className="commentbar">{CloseBtn}</div>
        </div>
      </Draggable>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentThread;
