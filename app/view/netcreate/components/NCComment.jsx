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
      commenter: CMTMGR.GetUserName(comment.commenter_id),
      selectedType: comment.comment_type,
      createtime_string: cvobj.createtime_string,
      modifytime_string: cvobj.modifytime_string,
      commenter_text: comment.commenter_text,
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

  uiOnSelect(event) {
    this.setState({ selectedType: event.target.value });
  }

  uiOnSave(event) {}

  UIOnReply(event) {

  UIOnDelete(event) {
    CMTMGR.DeleteComment(this.props.cvobj.comment_id);
  }

  UIOnCancel(event) {

  render() {
    const {
      commenter,
      modifytime_string,
      selectedType,
      commenter_text,
      uViewMode,
      allowReply
    } = this.state;
    const { cvobj } = this.props;

    const commentTypes = CMTMGR.GetCommentTypes();
    const EditBtn = <button onClick={this.uiOnEdit}>Edit</button>;

    const DeleteBtn = <button onClick={this.uiOnDelete}>Delete</button>;
    const SaveBtn = <button onClick={this.uiOnSave}>Comment</button>;
    const ReplyBtn = allowReply ? (
      <button onClick={this.uiOnReply}>Reply</button>
    ) : (
      ''
    );
    const CancelBtn = <button onClick={this.uiOnCancel}>Cancel</button>;
    const TypeSelector = (
      <select value={selectedType} onChange={this.uiOnSelect}>
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
            {commentTypes.get(selectedType).prompts.map((type, index) => (
              <div key={index}>
                <div className="label">{type.prompt}</div>
                <div className="help">{type.help}</div>
                <textarea value={commenter_text[index]} />
                <div className="feedback">{type.feedback}</div>
              </div>
            ))}
            <div className="editbar">
              {DeleteBtn}
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
          </div>
          <div>
            {commentTypes.get(selectedType).prompts.map((type, index) => (
              <div key={index}>
                <div className="label">{type.prompt}</div>
                <div className="help">{type.help}</div>
                <div className="commenttext">{commenter_text[index]}</div>
                <div className="feedback">{type.feedback}</div>
              </div>
            ))}
            <div className="commentbar">
              {DeleteBtn}
              {EditBtn}
              {ReplyBtn}
            </div>
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
