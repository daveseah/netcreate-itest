/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  CommentThread

  USE:

    <NCComentThread
      uiref
      cref={collection_ref}
      uid
      x
      y
    />

  PROPS:
    * uiref   -- reference to the comment button id, usu commentButtonId
    * cref    -- collection reference (usu node ide, edge id)
    * uid     -- user id of active user viewing or changing comment
    * x,y     -- position of open comment thread used to set proximity to
                 comment button


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

  componentWillUnmount() {
    UDATA.AppStateChangeOff('COMMENTVOBJS', this.UpdateCommentVObjs);
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
      // Add reply to last ROOT comment in thread (last comment at level 0)
      const lastComment = commentVObjs.reverse().find(cvobj => cvobj.level === 0);
      CMTMGR.AddComment({
        cref,
        comment_id_parent: '',
        comment_id_previous: lastComment.comment_id,
        commenter_id: uid
      });
    }
  }

  UIOnClose(event) {
    const { uiref, cref, uid } = this.props;
    CMTMGR.CloseCommentCollection(uiref, cref, uid);
  }

  render() {
    const { uiref, cref, uid, x, y } = this.props;

    const commentVObjs = CMTMGR.GetThreadedViewObjects(cref, uid);
    const CloseBtn = <button onClick={this.UIOnClose}>Close</button>;

    return (
      <Draggable>
        <div
          className="commentThread"
          style={{ left: x, top: y }}
          onClick={e => e.stopPropagation()} // prevent edge deselect
        >
          <div className="topbar">
            <div className="closeBtn" onClick={this.UIOnClose}>
              X
            </div>
          </div>
          {commentVObjs.map(cvobj => (
            <NCComment key={cvobj.comment_id} cvobj={cvobj} uid={uid} />
          ))}
          {uid && (
            <textarea
              className="add"
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
