/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Comment

  USE:

    <NCComment
      key={comment_id}
      cvobj={cvobj}
    />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const NCUI = require('../nc-ui');
const CMTMGR = require('../comment-mgr');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCComment';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDATA;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NCComment extends React.Component {
  constructor(props) {
    super(props);

    const cvobj = props.cvobj;
    const comment = CMTMGR.GetComment(cvobj.comment_id);

    this.state = {
      // Data
      cref: comment.collection_ref,
      cid: comment.comment_id,
      comment_id_parent: comment.comment_id_parent,
      commenter: CMTMGR.GetUserName(comment.commenter_id),
      comment_type: comment.comment_type,
      commenter_text: [...comment.commenter_text],
      createtime_string: cvobj.createtime_string,
      modifytime_string: cvobj.modifytime_string,
      // UI State
      uViewMode: cvobj.isBeingEdited ? NCUI.VIEWMODE.EDIT : NCUI.VIEWMODE.VIEW,
      uIsSelected: cvobj.isSelected,
      uIsBeingEdited: cvobj.isBeingEdited,
      uIsEditable: cvobj.isEditable,
      allowReply: cvobj.allowReply
    };

    // EVENT HANDLERS
    this.UpdateCommentVObjs = this.UpdateCommentVObjs.bind(this);
    this.LoadCommentVObj = this.LoadCommentVObj.bind(this);
    // UI HANDLERS
    this.UIOnEdit = this.UIOnEdit.bind(this);
    this.UIOnSave = this.UIOnSave.bind(this);
    this.UIOnReply = this.UIOnReply.bind(this);
    this.UIOnDelete = this.UIOnDelete.bind(this);
    this.UIOnCancel = this.UIOnCancel.bind(this);
    this.UIOnEditMenuSelect = this.UIOnEditMenuSelect.bind(this);
    this.UIOnSelect = this.UIOnSelect.bind(this);
    this.UIOnInputUpdate = this.UIOnInputUpdate.bind(this);

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
    this.LoadCommentVObj();
  }
  LoadCommentVObj() {
    const { cref, cid } = this.state;

    const cvobj = CMTMGR.GetCommentVObj(cref, cid);
    const comment = CMTMGR.GetComment(cid);

    this.setState({
      // Data
      cref: comment.collection_ref,
      cid: comment.comment_id,
      comment_id_parent: comment.comment_id_parent,
      commenter: CMTMGR.GetUserName(comment.commenter_id),
      comment_type: comment.comment_type,
      commenter_text: [...comment.commenter_text],
      createtime_string: cvobj.createtime_string,
      modifytime_string: cvobj.modifytime_string,
      // UI State
      uViewMode: cvobj.isBeingEdited ? NCUI.VIEWMODE.EDIT : NCUI.VIEWMODE.VIEW,
      uIsSelected: cvobj.isSelected,
      uIsBeingEdited: cvobj.isBeingEdited,
      uIsEditable: cvobj.isEditable,
      allowReply: cvobj.allowReply
    });
  }

  UIOnEdit(event) {
    const uViewMode =
      this.state.uViewMode === NCUI.VIEWMODE.EDIT
        ? NCUI.VIEWMODE.VIEW
        : NCUI.VIEWMODE.EDIT;
    this.setState({ uViewMode });
  }

  UIOnSave(event) {
    const { uid } = this.props;
    const { comment_type, commenter_text } = this.state;

    const comment = CMTMGR.GetComment(this.props.cvobj.comment_id);
    comment.comment_type = comment_type;
    comment.commenter_text = commenter_text;
    comment.commenter_id = uid;
    CMTMGR.UpdateComment(comment);
    this.setState({ uViewMode: NCUI.VIEWMODE.VIEW });
  }

  UIOnReply(event) {
    const { uid } = this.props;
    const { cref, cid, comment_id_parent } = this.state;

    if (comment_id_parent === '') {
      // Reply to a root comment
      CMTMGR.AddComment({
        cref,
        comment_id_parent: cid,
        comment_id_previous: '',
        commenter_id: uid
      });
    } else {
      // Reply to a threaded comment
      CMTMGR.AddComment({
        cref,
        comment_id_parent,
        comment_id_previous: cid,
        commenter_id: uid
      });
    }
  }

  UIOnDelete(event) {
    CMTMGR.RemoveComment(this.props.cvobj.comment_id);
  }

  UIOnCancel(event) {
    const comment = CMTMGR.GetComment(this.props.cvobj.comment_id);
    this.setState({
      commenter_text: comment.commenter_text,
      uViewMode: NCUI.VIEWMODE.VIEW
    });
  }

  UIOnEditMenuSelect(event) {
    switch (event.target.value) {
      case 'edit':
        this.UIOnEdit();
        break;
      case 'delete':
        this.UIOnDelete();
        break;
      default:
        break;
    }
  }

  UIOnSelect(event) {
    this.setState({ comment_type: event.target.value });
  }

  UIOnInputUpdate(index, event) {
    const { commenter_text } = this.state;
    commenter_text[index] = event.target.value;
    this.setState({ commenter_text });
  }

  render() {
    const { cvobj, uid } = this.props;
    const {
      commenter,
      createtime_string,
      modifytime_string,
      cid,
      comment_type,
      commenter_text,
      uViewMode,
      allowReply
    } = this.state;

    const comment = CMTMGR.GetComment(cvobj.comment_id);
    const commentTypes = CMTMGR.GetCommentTypes();

    // TODO Allow admins
    const isAllowedToEditOwnComment = uid === comment.commenter_id;

    // OLD BUTTON STYLE -- replced by EditMenu.  Revert?
    // const EditBtn = (
    //   <button className="outline small" onClick={this.UIOnEdit}>
    //     Edit
    //   </button>
    // );
    // const DeleteBtn = (
    //   <button className="outline small" onClick={this.UIOnDelete}>
    //     Delete
    //   </button>
    // );
    const EditMenu = (
      <select className="editmenu" onChange={this.UIOnEditMenuSelect}>
        <option>...</option>
        <option value="edit">EDIT</option>
        <option value="delete">DELETE</option>
      </select>
    );

    const SaveBtn = <button onClick={this.UIOnSave}>Save</button>;
    const ReplyBtn = allowReply ? (
      <button onClick={this.UIOnReply}>Reply</button>
    ) : (
      ''
    );
    const CancelBtn = (
      <button className="secondary" onClick={this.UIOnCancel}>
        Cancel
      </button>
    );
    const TypeSelector = (
      <select value={comment_type} onChange={this.UIOnSelect}>
        {[...commentTypes.entries()].map(type => {
          return (
            <option key={type[0]} value={type[0]}>
              {type[1].label}
            </option>
          );
        })}
      </select>
    );

    let CommentComponent;
    if (uViewMode === NCUI.VIEWMODE.EDIT) {
      // EDIT mode
      CommentComponent = (
        <div
          className="comment"
          onMouseDown={e => e.stopPropagation()} // allow text drag, stops Draggable
        >
          <div>
            <div className="commenter">{commenter}</div>
            <div className="date">{modifytime_string || createtime_string}</div>
          </div>
          <div>
            <div>{TypeSelector}</div>
            {commentTypes.get(comment_type).prompts.map((type, index) => (
              <div key={index}>
                <div className="label">{type.prompt}</div>
                <div className="help">{type.help}</div>
                <textarea
                  autoFocus
                  onChange={event => this.UIOnInputUpdate(index, event)}
                  value={commenter_text[index]}
                />
                <div className="feedback">{type.feedback}</div>
              </div>
            ))}
            <div className="editbar">
              {CancelBtn}
              {SaveBtn}
            </div>
          </div>
        </div>
      );
    } else {
      // VIEW mode
      const markedUnRead = cvobj.isMarkedRead ? '' : 'markedUnRead';
      CommentComponent = (
        <div className="comment">
          <div>
            <div className="commenter">{commenter}</div>
            <div className="date">{modifytime_string || createtime_string}</div>
            {isAllowedToEditOwnComment && EditMenu}
          </div>
          <div>
            <div className="commentId">#{cid}</div>
            {commentTypes.get(comment_type).prompts.map((type, index) => (
              <div key={index} className="comment-item">
                <div className="label">
                  <div className="comment-icon-inline">
                    {!cvobj.isMarkedRead && CMTMGR.COMMENTICON}
                  </div>
                  {type.prompt}
                </div>
                <div className="help">{type.help}</div>
                <div className="commenttext">{commenter_text[index]}</div>
                <div className="feedback">{type.feedback}</div>
              </div>
            ))}
            {uid && <div className="commentbar">{ReplyBtn}</div>}
          </div>
        </div>
      );
    }

    // Simple show threads -- if comment has a parent, indent it
    if (cvobj.level > 0) {
      return <div className="commentIndented">{CommentComponent}</div>;
    } else {
      return CommentComponent;
    }
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCComment;
