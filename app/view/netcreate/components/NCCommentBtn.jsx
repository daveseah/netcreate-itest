/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  CommentBtn

  USE:

    <NCCommentBtn
      cref={collection_ref}
    />

  STATES:

    * Empty -- No comments.  Empty chat bubble.
    * HasUnreadComments -- Gold comment icon with count of comments in red
    * HasReadComments -- Gray comment icon with count of comments in white
    * IsOpen -- Corresponding comment window is open.  Comment icon outlined.

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
      uid,
      isOpen: false,
      x: '300px',
      y: '120px'
    };

    // EVENT HANDLERS
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
    const { cref } = this.props;

    // figure out comment thread position based on comment button
    const btn = document.getElementById(`comment-button-${cref}`);
    const cmtbtnx = btn.getBoundingClientRect().left;
    let x;
    if (window.screen.width - cmtbtnx - 400 < 500) {
      x = cmtbtnx - 405;
    } else {
      x = cmtbtnx + 35;
    }
    const y = btn.getBoundingClientRect().top;
    this.setState({ x: `${x}px`, y });
  }

  componentWillUnmount() {
    UDATA.AppStateChangeOff('COMMENTCOLLECTION', this.UpdateCommentCollection);
    UDATA.AppStateChangeOff('COMMENTVOBJS', this.UpdateCommentVObjs);
  }

  UpdateCommentCollection(COMMENTCOLLECTION) {
    const { cref } = this.props;
    const ccol = COMMENTCOLLECTION.get(cref);
    this.setState({
      isOpen: ccol.isOpen
    });
  }

  UpdateCommentVObjs(COMMENTVOBJS) {
    this.forceUpdate();
  }

  UIOnClick(event) {
    event.stopPropagation(); // prevent Edge deselect

    const updatedIsOpen = !this.state.isOpen;
    this.setState({ isOpen: updatedIsOpen }, () => {
      CMTMGR.UpdateCommentCollection({
        cref: this.props.cref,
        isOpen: updatedIsOpen
      });
    });
  }

  render() {
    const { cref } = this.props;
    const { uid, isOpen, x, y } = this.state;

    const count = CMTMGR.GetThreadedViewObjectsCount(cref, uid); // also used to seed the collection
    const ccol = CMTMGR.GetCommentCollection(cref) || {};

    let css = 'commentbtn ';
    if (ccol.hasUnreadComments) css += 'hasUnreadComments ';
    else if (ccol.hasReadComments) css += 'hasReadComments ';
    css += ccol.isOpen ? 'isOpen ' : '';

    const label = count > 0 ? count : '';

    return (
      <div id={`comment-button-${cref}`}>
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
