/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  Comment

  USE:

    <URComment
      cref={cref}
      cid={cvobj.comment_id}
      uid={uid}
      key={cvobj.comment_id} // part of thread array
    />

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useState, useEffect } from 'react';
import UNISYS from 'unisys/client';
import CMTMGR from '../comment-mgr';
import URCommentPrompt from './URCommentPrompt';

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'URComment';

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const URComment = ({ cref, cid, uid }) => {
  const [state, setState] = useState({
    commenter: '',
    createtime_string: '',
    modifytime_string: '',
    selected_comment_type: '',
    commenter_text: ['hah'],
    comment_error: '',
    uViewMode: CMTMGR.VIEWMODE.VIEW,
    uIsSelected: false,
    uIsBeingEdited: false,
    uIsEditable: false,
    uIsDisabled: false,
    uAllowReply: false
  });

  /// Initialize UNISYS DATA LINK for react component
  const UDATAOwner = { name: 'URComment' };
  const UDATA = UNISYS.NewDataLink(UDATAOwner);

  /// INIT ////////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    const updatePermissions = data => {
      setState(prevState =>
        Object.assign({}, prevState, { uIsDisabled: data.commentBeingEditedByMe })
      );
    };

    const updateCommentVObjs = () => {
      LoadCommentVObj();
    };

    UDATA.OnAppStateChange('COMMENTVOBJS', updateCommentVObjs);
    UDATA.HandleMessage('COMMENT_UPDATE_PERMISSIONS', updatePermissions);

    return () => {
      if (state.uIsBeingEdited) CMTMGR.UnlockComment(state.cid);
      UDATA.AppStateChangeOff('COMMENTVOBJS', updateCommentVObjs);
      UDATA.UnhandleMessage('COMMENT_UPDATE_PERMISSIONS', updatePermissions);
    };
  }, [state.uIsBeingEdited]);

  useEffect(
    () => {
      LoadCommentVObj();
    },
    [] // run once
  );

  const LoadCommentVObj = () => {
    const cvobj = CMTMGR.GetCommentVObj(cref, cid);
    const comment = CMTMGR.GetComment(cid);

    // When deleting, COMMENTVOBJS state change will trigger a load and render
    // before the component is unmounted.  So catch it and skip the state update.
    if (!cvobj || !comment) {
      console.error('LoadCommentVObj: comment or cvobj not found!');
      return;
    }

    // Error check: verify that comment types exist, if not, fall back gracefully to default type
    let selected_comment_type = comment.comment_type;
    let comment_error = '';
    if (!CMTMGR.GetCommentType(selected_comment_type)) {
      const defaultCommentTypeObject = CMTMGR.GetDefaultCommentType();
      comment_error = `Comment type "${selected_comment_type}" not found: Falling back to default  "${defaultCommentTypeObject.label}"`;
      console.warn(comment_error);
      selected_comment_type = defaultCommentTypeObject.slug;
    }

    setState({
      // Data
      comment_id_parent: comment.comment_id_parent,
      commenter: CMTMGR.GetUserName(comment.commenter_id),
      selected_comment_type,
      commenter_text: [...comment.commenter_text],
      createtime_string: cvobj.createtime_string,
      modifytime_string: cvobj.modifytime_string,
      // Messaging
      comment_error,
      // UI State
      uViewMode: cvobj.isBeingEdited ? CMTMGR.VIEWMODE.EDIT : CMTMGR.VIEWMODE.VIEW,
      uIsSelected: cvobj.isSelected,
      uIsBeingEdited: cvobj.isBeingEdited,
      uIsEditable: cvobj.isEditable,
      uAllowReply: cvobj.allowReply
    });

    // Lock edit upon creation of a new comment or a new reply
    if (cvobj.isBeingEdited) CMTMGR.LockComment(comment.comment_id);
  };

  /// UI HANDLERS //////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const UIOnEdit = () => {
    const uViewMode =
      state.uViewMode === CMTMGR.VIEWMODE.EDIT
        ? CMTMGR.VIEWMODE.VIEW
        : CMTMGR.VIEWMODE.EDIT;

    setState(prevState => Object.assign({}, prevState, { uViewMode }));

    CMTMGR.LockComment(state.cid);
  };

  const UIOnSave = () => {
    const { selected_comment_type, commenter_text } = state;
    const comment = CMTMGR.GetComment(cid);
    comment.comment_type = selected_comment_type;
    comment.commenter_text = [...commenter_text]; // clone, not byref
    comment.commenter_id = uid;
    CMTMGR.UpdateComment(comment);
    CMTMGR.UnlockComment(cid);

    setState(prevState =>
      Object.assign({}, prevState, { uViewMode: CMTMGR.VIEWMODE.VIEW })
    );
  };

  const UIOnReply = () => {
    const { comment_id_parent } = state;
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
  };

  const UIOnDelete = () => {
    CMTMGR.RemoveComment({
      collection_ref: cref,
      comment_id: cid,
      uid
    });
  };

  const UIOnCancel = () => {
    const { commenter_text } = state;
    let savedCommentIsEmpty = true;
    commenter_text.forEach(t => {
      if (t !== '') savedCommentIsEmpty = false;
    });

    const cb = () => CMTMGR.UnlockComment(cid);

    if (savedCommentIsEmpty) {
      // "Cancel" will always remove the comment if the comment is empty
      // - usually because it's a newly created comment
      // - but also if the user clears all the text fields
      // We don't care if the user entered any text
      CMTMGR.RemoveComment(
        {
          collection_ref: cref,
          comment_id: cid,
          uid,
          showCancelDialog: true
        },
        cb
      );
    } else {
      // revert to previous text if current text is empty
      const comment = CMTMGR.GetComment(cid);
      setState(prevState =>
        Object.assign({}, prevState, {
          commenter_text: [...comment.commenter_text], // restore previous text clone, not by ref
          uViewMode: CMTMGR.VIEWMODE.VIEW
        })
      );

      cb();
    }
  };

  const UIOnSelect = event => {
    const selection = event.target.value;
    setState(prevState =>
      Object.assign({}, prevState, { selected_comment_type: selection })
    );
  };

  const UIOnInputUpdate = (index, event) => {
    const { commenter_text } = state;
    commenter_text[index] = event.target.value;
    setState(prevState =>
      Object.assign({}, prevState, {
        commenter_text: [...commenter_text]
      })
    );
  };

  /// RENDER /////////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  const {
    commenter,
    selected_comment_type,
    commenter_text,
    createtime_string,
    modifytime_string,
    comment_error,
    uViewMode,
    uIsDisabled,
    uAllowReply
  } = state;

  const isAdmin = CMTMGR.IsAdmin();
  const comment = CMTMGR.GetComment(cid);
  const commentTypes = CMTMGR.GetCommentTypes();

  if (!comment) {
    if (DBG)
      console.log(`URComment rendering skipped because comment ${cid} was removed`);
    return '';
  }
  if (!commenter) return null; // not ready

  // TODO Allow admins
  const isAllowedToEditOwnComment = uid === comment.commenter_id;

  // SUB COMPONENTS
  const EditBtn = (
    <button className="outline small" onClick={UIOnEdit}>
      Edit
    </button>
  );
  const DeleteBtn = (
    <button className="outline small danger" onClick={UIOnDelete}>
      Delete
    </button>
  );
  const SaveBtn = <button onClick={UIOnSave}>Save</button>;
  const ReplyBtn = uAllowReply ? (
    <button onClick={UIOnReply}>Reply</button>
  ) : (
    <div></div> // empty div to keep layout consistent
  );
  const CancelBtn = (
    <button className="secondary" onClick={UIOnCancel}>
      Cancel
    </button>
  );
  const TypeSelector = (
    <select value={selected_comment_type} onChange={UIOnSelect}>
      {[...commentTypes.entries()].map(type => (
        <option key={type[0]} value={type[0]}>
          {type[1].label}
        </option>
      ))}
    </select>
  );
  // Alternative three-dot menu approach to hide "Edit" and "Delete"
  // const UIOnEditMenuSelect = event => {
  //   switch (event.target.value) {
  //     case 'edit':
  //       UIOnEdit();
  //       break;
  //     case 'delete':
  //       UIOnDelete();
  //       break;
  //     default:
  //       break;
  //   }
  // };
  // const EditMenu = (
  //   <select className="editmenu" onChange={this.UIOnEditMenuSelect}>
  //     <option>...</option>
  //     <option value="edit">EDIT</option>
  //     <option value="delete">DELETE</option>
  //   </select>
  // );

  const cvobj = CMTMGR.GetCommentVObj(cref, cid);

  let CommentComponent;
  if (uViewMode === CMTMGR.VIEWMODE.EDIT) {
    // EDIT mode
    CommentComponent = (
      <div
        id={cid}
        className={`comment ${comment.comment_isMarkedDeleted && 'deleted'}`}
        onMouseDown={e => e.stopPropagation()}
      >
        <div>
          <div className="commenter">{commenter}</div>
          <div className="date">{modifytime_string || createtime_string}</div>
        </div>
        <div>
          <div className="commentId">#{cid}</div>
          <div>{TypeSelector}</div>
          <URCommentPrompt
            cref={cref}
            commentType={selected_comment_type}
            commenterText={commenter_text}
            isMarkedDeleted={comment.comment_isMarkedDeleted}
            isMarkedRead={cvobj.isMarkedRead}
            viewMode={CMTMGR.VIEWMODE.EDIT}
            onChange={UIOnInputUpdate}
            errorMessage={comment_error}
          />
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
      <div
        id={cid}
        className={`comment ${comment.comment_isMarkedDeleted ? 'deleted' : ''}`}
      >
        <div>
          <div className="commenter">{commenter}</div>
          <div className="date">{modifytime_string || createtime_string}</div>
        </div>
        <div>
          <div className="commentId">#{cid}</div>
          <URCommentPrompt
            cref={cref}
            commentType={selected_comment_type}
            commenterText={commenter_text}
            isMarkedDeleted={comment.comment_isMarkedDeleted}
            isMarkedRead={cvobj.isMarkedRead}
            viewMode={CMTMGR.VIEWMODE.VIEW}
            onChange={UIOnInputUpdate}
            errorMessage={comment_error}
          />
          {uid && (
            <div className="commentbar">
              {!uIsDisabled && !comment.comment_isMarkedDeleted && ReplyBtn}
              {(!uIsDisabled &&
                isAllowedToEditOwnComment &&
                !comment.comment_isMarkedDeleted &&
                EditBtn) || <div></div>}
              {(((!uIsDisabled &&
                isAllowedToEditOwnComment &&
                !comment.comment_isMarkedDeleted) ||
                isAdmin) &&
                DeleteBtn) || <div></div>}
            </div>
          )}
        </div>
      </div>
    );
  }
  // Simple show threads -- if comment has a parent, indent it
  return cvobj.level > 0 ? (
    <div className="commentIndented">{CommentComponent}</div>
  ) : (
    CommentComponent
  );
};

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URComment;
