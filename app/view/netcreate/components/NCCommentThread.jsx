/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  CommentThread

  USE:

    <NCCommentThread
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

    this.state = {
      firstUpdate: true,
      isDisabled: false
    };

    // EVENT HANDLERS
    this.UpdatePermissions = this.UpdatePermissions.bind(this);
    this.UpdateCommentVObjs = this.UpdateCommentVObjs.bind(this);
    // UI HANDLERS
    this.UIOnReply = this.UIOnReply.bind(this);
    this.UIOnClose = this.UIOnClose.bind(this);
    this.UIOnReferentClick = this.UIOnReferentClick.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.OnAppStateChange('COMMENTVOBJS', this.UpdateCommentVObjs);
    UDATA.HandleMessage('COMMENT_UPDATE_PERMISSIONS', this.UpdatePermissions);
  }

  componentWillUnmount() {
    UDATA.AppStateChangeOff('COMMENTVOBJS', this.UpdateCommentVObjs);
    UDATA.UnhandleMessage('COMMENT_UPDATE_PERMISSIONS', this.UpdatePermissions);
  }

  componentDidUpdate() {
    const { firstUpdate } = this.state;
    const { cref, uid } = this.props;
    if (firstUpdate) {
      // scroll the last comment into view
      const commentVObjs = CMTMGR.GetThreadedViewObjects(cref, uid);
      const lastCVObj = commentVObjs[commentVObjs.length - 1];
      if (lastCVObj) {
        const lastCommentEl = document.getElementById(lastCVObj.comment_id);
        if (lastCommentEl) lastCommentEl.scrollIntoView({ behavior: 'smooth' });
      }
      this.setState({ firstUpdate: false });
    }
  }

  UpdatePermissions(data) {
    this.setState({ isDisabled: data.commentBeingEditedByMe });
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

  UIOnReferentClick(event, cref) {
    event.preventDefault();
    event.stopPropagation();
    CMTMGR.OpenReferent(cref);
  }

  render() {
    const { uiref, cref, uid, x, y } = this.props;
    const { isDisabled } = this.state;

    const commentVObjs = CMTMGR.GetThreadedViewObjects(cref, uid);
    const CloseBtn = (
      <button onClick={this.UIOnClose} disabled={isDisabled}>
        Close
      </button>
    );

    // HACK: To keep the comment from going off screen:
    const windowHeight = Math.min(screen.height, window.innerHeight); // handle Safari and FireFox differences
    const commentMaxHeight = `${windowHeight - y - 100}px`;

    const { typeLabel, sourceLabel } = CMTMGR.GetCREFSourceLabel(cref);

    return (
      <Draggable>
        <div
          className="commentThread"
          style={{ left: `${x}px`, top: `${y}px`, maxHeight: commentMaxHeight }}
          onClick={e => e.stopPropagation()} // prevent edge deselect
        >
          <div className="topbar">
            <div className="commentTitle">
              Comments on {typeLabel}{' '}
              <a href="#" onClick={event => this.UIOnReferentClick(event, cref)}>
                {sourceLabel}
              </a>
            </div>
            {!isDisabled && (
              <div className="closeBtn" onClick={this.UIOnClose}>
                X
              </div>
            )}
          </div>
          <div className="commentScroller">
            {commentVObjs.map(cvobj => (
              <NCComment key={cvobj.comment_id} cvobj={cvobj} uid={uid} />
            ))}
            {!isDisabled && uid && (
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
          </div>
          <div className="commentbar">{CloseBtn}</div>
        </div>
      </Draggable>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentThread;
