/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  CommentBtn

  USE:

    <NCCommentBtn
      cref={collection_ref}
      isTable
    />

  PROPS:
    * isTable -- used to differentiate comment buttons on tables vs nodes/edges
                 ensures that each comment button id is unique

  STATES:
    * Empty -- No comments.  Empty chat bubble.
    * HasUnreadComments -- Gold comment icon with count of comments in red
    * HasReadComments -- Gray comment icon with count of comments in white

    * isOpen -- Corresponding comment window is open.  Comment icon outlined.
    * openNext -- Used to differentiate a comment window open click request
                  from local comment button vs the same cref button from
                  another source (e.g. table vs node/edge)
    * x, y -- position of CommentThread window
    * commentButtonId -- unique id for each button
                         allows showing open/closed status for the same comment

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

const React = require('react');
const UNISYS = require('unisys/client');
const CMTMGR = require('../comment-mgr');
const NCCommentThread = require('./NCCommentThread');

/// CONSTANTS & DECLARATIONS //////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
const DBG = false;
const PR = 'NCCommentBtn';
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
let UDATA;

/// REACT COMPONENT ///////////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
class NCCommentBtn extends React.Component {
  constructor(props) {
    super(props);

    const uid = CMTMGR.GetCurrentUserId();

    this.state = {
      uid, // empty uid is allowed for non-logged in users
      isOpen: false,
      openNext: false, // delays opening until after state update from click
      x: '300px',
      y: '120px',
      commentButtonId: `comment-button-${props.cref}-${props.isTable}`
    };

    // EVENT HANDLERS
    this.GetCommentThreadPosition = this.GetCommentThreadPosition.bind(this);
    this.UpdateCommentCollection = this.UpdateCommentCollection.bind(this);
    this.UpdateCommentVObjs = this.UpdateCommentVObjs.bind(this);
    // UI HANDLERS
    this.UIOnClick = this.UIOnClick.bind(this);

    /// Initialize UNISYS DATA LINK for REACT
    UDATA = UNISYS.NewDataLink(this);

    /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    /// REGISTER LISTENERS
    UDATA.OnAppStateChange('COMMENTCOLLECTION', this.UpdateCommentCollection);
    UDATA.OnAppStateChange('COMMENTVOBJS', this.UpdateCommentVObjs);
  }

  componentDidMount() {
    this.setState(this.GetCommentThreadPosition());
  }

  componentWillUnmount() {
    UDATA.AppStateChangeOff('COMMENTCOLLECTION', this.UpdateCommentCollection);
    UDATA.AppStateChangeOff('COMMENTVOBJS', this.UpdateCommentVObjs);
  }

  GetCommentThreadPosition() {
    const { cref } = this.props;
    const { commentButtonId } = this.state;

    // figure out comment thread position based on comment button
    const btn = document.getElementById(commentButtonId);
    const cmtbtnx = btn.getBoundingClientRect().left;
    let x;
    if (window.screen.width - cmtbtnx - 400 < 500) {
      x = cmtbtnx - 405;
    } else {
      x = cmtbtnx + 35;
    }
    const y = btn.getBoundingClientRect().top + window.scrollY;
    return { x: `${x}px`, y: `${y}px` };
  }

  UpdateCommentCollection(COMMENTCOLLECTION) {
    const { cref } = this.props;
    const { openNext } = this.state;
    const ccol = COMMENTCOLLECTION.get(cref);
    if (openNext && ccol.isOpen) {
      // only open if user just clicked open and state update is open
      this.setState({ isOpen: true, openNext: false });
    } else this.setState({ isOpen: false, openNext: false });
  }

  UpdateCommentVObjs(COMMENTVOBJS) {
    this.forceUpdate();
  }

  UIOnClick(event) {
    event.stopPropagation(); // prevent Edge deselect

    const updatedIsOpen = !this.state.isOpen;
    const position = this.GetCommentThreadPosition();
    const updatedState = {
      isOpen: updatedIsOpen,
      openNext: updatedIsOpen,
      x: position.x,
      y: position.y
    };
    this.setState(updatedState, () => {
      CMTMGR.UpdateCommentCollection({
        cref: this.props.cref,
        isOpen: updatedIsOpen
      });
    });
  }

  render() {
    const { cref } = this.props;
    const { uid, isOpen, x, y, commentButtonId } = this.state;

    const count = CMTMGR.GetThreadedViewObjectsCount(cref, uid); // also used to seed the collection
    const ccol = CMTMGR.GetCommentCollection(cref) || {};

    let css = 'commentbtn ';
    if (ccol.hasUnreadComments) css += 'hasUnreadComments ';
    else if (ccol.hasReadComments) css += 'hasReadComments ';
    css += ccol.isOpen ? 'isOpen ' : '';

    const label = count > 0 ? count : '';

    return (
      <div id={commentButtonId}>
        <div className={css} onClick={this.UIOnClick}>
          {CMTMGR.COMMENTICON}
          <div className="comment-count">{label}</div>
        </div>
        {isOpen && <NCCommentThread cref={cref} uid={uid} x={x} y={y} />}
      </div>
    );
  }
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = NCCommentBtn;
