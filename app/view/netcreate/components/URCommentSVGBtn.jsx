/*//////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  URCommentSVGBtn

  A purely visual button that uses SVG Symbols.
  Relies on props to render.

  USE:
      <URCommentSVGBtn
        uiref={cref}
        count={countRepliesToMe}
        hasUnreadComments={countRepliesToMe > 0}
        hasReadComments={countRepliesToMe === 0}
        selected={false}
        disabled={false}
        small={false}
        onClick={evt_ExpandPanel}
      />

  Used by:
  - URCommentStatus

  Displays three visual states:
  - read/unread status
    - has unread comments (gold color)
    - all comments are read (gray color)
  - is open / selected (displaying comments)
  - the number of comments.


  NOTE: Unlike MEME's implementation, we do not use svgjs

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * //////////////////////////////////////*/

import React, { useRef, useState, useEffect } from 'react';
import CMTMGR from '../comment-mgr';
// import { SVG } from '@svgdotjs/svg.js'; // esm version // MEME implementation
// import './URComment.css'; // MEME implementation

/// REACT FUNCTIONAL COMPONENT ////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function URCommentSVGBtn({
  uiref,
  count,
  hasUnreadComments,
  hasReadComments,
  selected,
  disabled,
  small,
  onClick
}) {
  const svgRef = useRef(null);
  const [label, setLabel] = useState('');
  const [css, setCss] = useState('');
  const [svgClass, setSVGClass] = useState('');

  /// USEEFFECT ///////////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  useEffect(() => {
    // const draw = SVG(svgRef.current);
    c_DrawCommentIcon();

    return () => {
      // draw.remove();
    };
  }, []);

  useEffect(() => {
    c_DrawCommentIcon();
  }, [count, hasUnreadComments, hasReadComments, selected]);

  /// COMPONENT HELPER METHODS ////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function c_DrawCommentIcon() {
    // css
    let css = ' ';
    if (hasUnreadComments) css += 'hasUnreadComments ';
    else if (hasReadComments) css += 'hasReadComments ';
    css += selected ? 'isOpen ' : '';
    css += disabled ? 'disabled ' : '';
    setCss(css);

    // commentCountLabel
    const commentCountLabel = count > 0 ? count : '';
    setLabel(commentCountLabel);

    let SVGClass = 'svgcmt-unread';
    if ((hasReadComments && !hasUnreadComments) || count === '' || count === 0) {
      // it's possible to have both read and unread comments
      // if there's anything unread, we want to mark it unread
      if (selected) SVGClass = 'svgcmt-readSelected';
      else SVGClass = 'svgcmt-read-outlined'; // only vprops use non-outlined
    } else {
      // hasUnreadComments or no comments
      if (selected) SVGClass = 'svgcmt-unreadSelected';
      else SVGClass = 'svgcmt-unread';
    }
    setSVGClass(SVGClass);

    // const draw = SVG(svgRef.current);
    // draw.clear();
    // draw
    //   .group()
    //   .attr('class', svgDefKey)
    //   .add(CMTMGR.COMMENTICON)
    //   // .add(CMTMGR.COMMENTICON(draw).clone())
    //   // .add(SVGDEFS.get('comment').clone())
    //   .transform({
    //     translate: [4, 0], // center within 32,32
    //     origin: 'top left', // seems to default to 'center' if not specified
    //     scale: small ? 0.9 : 1.6
    //   });
  }

  /// COMPONENT RENDER ////////////////////////////////////////////////////////
  /// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  const size = small ? '24' : '32';
  return (
    <div id={uiref} className={'commentbtn' + css} onClick={onClick}>
      <div className="comment-count">{label}</div>
      <svg width={size} height={size}>
        <g className={svgClass}>{CMTMGR.COMMENTICON}</g>
      </svg>
    </div>
  );
}

/// EXPORT REACT COMPONENT ////////////////////////////////////////////////////
/// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
export default URCommentSVGBtn;
