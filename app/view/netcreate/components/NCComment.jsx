/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Comment

  USE:

    <NCComment
      key={comment_id}
      cvobj={cvobj}
    />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const NCUI = require('../nc-ui');
const CMTMGR = require('../comment-mgr');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCComment';

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
      uViewMode: NCUI.VIEWMODE.VIEW,
      uIsSelected: cvobj.isSelected,
      uIsBeingEdited: cvobj.isBeingEdited,
      uIsEditable: cvobj.isEditable,
      allowReply: cvobj.allowReply
    };

    this.UIOnEdit = this.UIOnEdit.bind(this);
    this.UIOnSave = this.UIOnSave.bind(this);
    this.UIOnReply = this.UIOnReply.bind(this);
    this.UIOnDelete = this.UIOnDelete.bind(this);
    this.UIOnCancel = this.UIOnCancel.bind(this);
    this.UIOnEditMenuSelect = this.UIOnEditMenuSelect.bind(this);
    this.UIOnSelect = this.UIOnSelect.bind(this);
    this.UIOnInputUpdate = this.UIOnInputUpdate.bind(this);
  }

  UIOnEdit(event) {
    const uViewMode =
      this.state.uViewMode === NCUI.VIEWMODE.EDIT
        ? NCUI.VIEWMODE.VIEW
        : NCUI.VIEWMODE.EDIT;
    this.setState({ uViewMode });
    // pass isBeingEdited to true?
  }

  UIOnSave(event) {
    const { comment_type, commenter_text } = this.state;
    const comment = CMTMGR.GetComment(this.props.cvobj.comment_id);
    comment.comment_type = comment_type;
    comment.commenter_text = commenter_text;
    CMTMGR.SaveComment(comment);
    this.setState({ uViewMode: NCUI.VIEWMODE.VIEW });
  }

  UIOnReply(event) {
    const { cref, cid, comment_id_parent } = this.state;
    if (comment_id_parent === '') {
      // Reply to a root comment
      CMTMGR.AddComment({ cref, comment_id_parent: cid, comment_id_previous: '' });
    } else {
      // Reply to a threaded comment
      CMTMGR.AddComment({ cref, comment_id_parent, comment_id_previous: cid });
    }
  }

  UIOnDelete(event) {
    CMTMGR.DeleteComment(this.props.cvobj.comment_id);
  }

  UIOnCancel(event) {
    const comment = CMTMGR.GetComment(this.props.cvobj.comment_id);
    this.setState({
      commenter_text: comment.commenter_text,
      uViewMode: NCUI.VIEWMODE.VIEW
    });
  }

  UIOnEditMenuSelect(event) {

  render() {
    const {
      commenter,
      modifytime_string,
      cid,
      comment_type,
      commenter_text,
      uViewMode,
      allowReply
    } = this.state;
    const { cvobj } = this.props;

    const commentTypes = CMTMGR.GetCommentTypes();
    const EditBtn = <button onClick={this.uiOnEdit}>Edit</button>;

    const DeleteBtn = <button onClick={this.uiOnDelete}>Delete</button>;
    const SaveBtn = <button onClick={this.uiOnSave}>Comment</button>;
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
        <div className="comment">
          <div>
            <div className="commenter">{commenter}</div>
            <div className="date">{modifytime_string}</div>
          </div>
          <div>
            <div>{TypeSelector}</div>
            {commentTypes.get(comment_type).prompts.map((type, index) => (
              <div key={index}>
                <div className="label">{type.prompt}</div>
                <div className="help">{type.help}</div>
                <textarea
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
      CommentComponent = (
        <div className="comment">
          <div>
            <div className="commenter">{commenter}</div>
            <div className="date">{modifytime_string}</div>
            {EditMenu}
          </div>
          <div>
            <div className="commentId">{cid}</div>
            {commentTypes.get(comment_type).prompts.map((type, index) => (
              <div key={index}>
                <div className="label">{type.prompt}</div>
                <div className="help">{type.help}</div>
                <div className="commenttext">{commenter_text[index]}</div>
                <div className="feedback">{type.feedback}</div>
              </div>
            ))}
            <div className="commentbar">{ReplyBtn}</div>
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
